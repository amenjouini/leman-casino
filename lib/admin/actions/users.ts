"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import { sessions, users } from "../../db/schema";
import { actorOf, requireUser } from "../../auth/session";
import { hashPassword, passwordProblem } from "../../auth/password";
import { createUser } from "../../users";
import { writeAudit } from "../../audit";
import { isUniqueViolation } from "../../bookings";
import { runAction, str, bool, FormError, type ActionState } from "../action";

const role = z.enum(["owner", "manager", "staff"]);

export async function createUserAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const me = await requireUser("users.manage");
    const data = z
      .object({ name: z.string().trim().min(2, "Nom requis").max(100), email: z.email("E-mail invalide").max(200), role, password: z.string() })
      .parse({ name: str(fd, "name"), email: str(fd, "email").trim().toLowerCase(), role: str(fd, "role"), password: str(fd, "password") });
    const problem = passwordProblem(data.password);
    if (problem) throw new FormError(problem, { password: problem });
    try {
      const u = await createUser(data);
      const db = await getDb();
      await writeAudit(db, actorOf(me), { action: "user.created", entityType: "user", entityId: u.id, details: { email: u.email, role: u.role } });
    } catch (err) {
      if (isUniqueViolation(err)) throw new FormError("Un compte existe déjà avec cet e-mail.", { email: "Déjà utilisé" });
      throw err;
    }
    revalidatePath("/admin/utilisateurs");
    return `Compte créé pour ${data.email}. Transmettez-lui son mot de passe de façon sécurisée.`;
  });
}

export async function updateUserAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const me = await requireUser("users.manage");
    const id = z.uuid().parse(str(fd, "id"));
    const newRole = role.parse(str(fd, "role"));
    const active = bool(fd, "active");
    const db = await getDb();
    if (id === me.id && (newRole !== "owner" || !active)) throw new FormError("Vous ne pouvez pas retirer vos propres droits d'administration.");
    if (newRole !== "owner" || !active) {
      const [{ n }] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(users)
        .where(and(eq(users.role, "owner"), eq(users.active, true), ne(users.id, id)));
      if (Number(n) === 0) throw new FormError("Il doit rester au moins un propriétaire actif.");
    }
    await db.update(users).set({ role: newRole, active, updatedAt: new Date() }).where(eq(users.id, id));
    if (!active) await db.delete(sessions).where(eq(sessions.userId, id));
    const password = str(fd, "password");
    if (password) {
      const problem = passwordProblem(password);
      if (problem) throw new FormError(problem, { password: problem });
      await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, id));
      await db.delete(sessions).where(eq(sessions.userId, id));
    }
    await writeAudit(db, actorOf(me), { action: "user.updated", entityType: "user", entityId: id, details: { role: newRole, active, passwordReset: !!password } });
    revalidatePath("/admin/utilisateurs");
    return "Utilisateur mis à jour.";
  });
}
