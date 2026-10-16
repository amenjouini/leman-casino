"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import { users } from "../../db/schema";
import { authenticate, countUsers, createUser } from "../../users";
import { actorOf, createSession, destroySession, requireUser } from "../../auth/session";
import { hashPassword, passwordProblem, verifyPassword } from "../../auth/password";
import { rateLimit } from "../../rate-limit";
import { clientIp } from "../../request";
import { writeAudit } from "../../audit";
import { runAction, str, type ActionState, FormError } from "../action";

export async function loginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email").trim().toLowerCase();
  const password = str(fd, "password");
  const ip = await clientIp();
  const [byIp, byEmail] = await Promise.all([rateLimit(`login-ip:${ip}`, 20, 15 * 60), rateLimit(`login-email:${email}`, 8, 15 * 60)]);
  if (!byIp.ok || !byEmail.ok) {
    return { ok: false, error: "Trop de tentatives. Réessayez dans quelques minutes.", at: Date.now() };
  }
  if (!email || !password) return { ok: false, error: "E-mail et mot de passe requis.", at: Date.now() };
  const user = await authenticate(email, password);
  if (!user) return { ok: false, error: "Identifiants incorrects.", at: Date.now() };
  await createSession(user.id);
  const db = await getDb();
  await writeAudit(db, { id: user.id, label: `${user.name} <${user.email}>` }, { action: "user.login", entityType: "user", entityId: user.id });
  const next = str(fd, "next");
  redirect(next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

const setupSchema = z.object({
  token: z.string().min(1, "Jeton requis"),
  name: z.string().trim().min(2, "Nom requis").max(100),
  email: z.email("E-mail invalide").max(200),
  password: z.string().min(1),
});

/** One-time creation of the first owner account, protected by ADMIN_SETUP_TOKEN. */
export async function setupOwnerAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const expected = process.env.ADMIN_SETUP_TOKEN ?? "";
    if (expected.length < 16) throw new FormError("La configuration initiale est désactivée (ADMIN_SETUP_TOKEN absent ou trop court).");
    const ip = await clientIp();
    if (!(await rateLimit(`setup:${ip}`, 10, 3600)).ok) throw new FormError("Trop de tentatives.");
    const data = setupSchema.parse({ token: str(fd, "token"), name: str(fd, "name"), email: str(fd, "email"), password: str(fd, "password") });
    const a = Buffer.from(data.token);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new FormError("Jeton de configuration invalide.", { token: "Jeton invalide" });
    const problem = passwordProblem(data.password);
    if (problem) throw new FormError(problem, { password: problem });
    if ((await countUsers()) > 0) throw new FormError("Un compte existe déjà. Connectez-vous.");
    const user = await createUser({ email: data.email, name: data.name, password: data.password, role: "owner" });
    await createSession(user.id);
    redirect("/admin");
  });
}

export async function changeOwnPasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const me = await requireUser("dashboard.view");
    const db = await getDb();
    const [u] = await db.select().from(users).where(eq(users.id, me.id)).limit(1);
    if (!(await verifyPassword(str(fd, "current"), u.passwordHash))) throw new FormError("Mot de passe actuel incorrect.", { current: "Incorrect" });
    const next = str(fd, "next");
    const problem = passwordProblem(next);
    if (problem) throw new FormError(problem, { next: problem });
    if (next !== str(fd, "confirm")) throw new FormError("Les mots de passe ne correspondent pas.", { confirm: "Différent" });
    await db.update(users).set({ passwordHash: await hashPassword(next), updatedAt: new Date() }).where(eq(users.id, me.id));
    await writeAudit(db, actorOf(me), { action: "user.updated", entityType: "user", entityId: me.id, details: { password: "changed" } });
    return "Mot de passe modifié.";
  });
}
