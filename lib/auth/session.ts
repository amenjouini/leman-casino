import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, lt } from "drizzle-orm";
import { getDb } from "../db";
import { sessions, users, type User } from "../db/schema";
import { can, type Permission } from "./permissions";
import type { Actor } from "../audit";

export const SESSION_COOKIE = "leman_session";
const SESSION_TTL_MS = 7 * 24 * 3600 * 1000;

export type SessionUser = Pick<User, "id" | "email" | "name" | "role">;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string): Promise<void> {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const ua = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt, userAgent: ua });
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  }
  jar.delete(SESSION_COOKIE);
}

/** Current staff user, validated against the database on every call. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 200) return null;
  const db = await getDb();
  const [row] = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role, active: users.active })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!row || !row.active) return null;
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

/** For pages: redirects to login (or the dashboard when the role is insufficient). */
export async function requirePageUser(permission: Permission = "dashboard.view"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (!can(user.role, permission)) redirect("/admin?refus=1");
  return user;
}

export class AuthError extends Error {
  constructor(message = "Accès refusé.") {
    super(message);
    this.name = "AuthError";
  }
}

/** For server actions and route handlers: throws instead of redirecting. */
export async function requireUser(permission: Permission): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("Session expirée. Veuillez vous reconnecter.");
  if (!can(user.role, permission)) throw new AuthError("Vous n'avez pas les droits nécessaires pour cette action.");
  return user;
}

export const actorOf = (u: SessionUser): Actor & { role: SessionUser["role"] } => ({ id: u.id, label: `${u.name} <${u.email}>`, role: u.role });
