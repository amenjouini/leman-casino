import { eq, sql } from "drizzle-orm";
import { getDb, type DbOrTx } from "./db";
import { users, type UserRole } from "./db/schema";
import { hashPassword, verifyPassword } from "./auth/password";

// Constant work for unknown accounts, so response time does not reveal which emails exist.
const DUMMY_HASH = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" + Buffer.alloc(64).toString("base64");

export async function countUsers(db?: DbOrTx): Promise<number> {
  const conn = db ?? (await getDb());
  const [row] = await conn.select({ n: sql<number>`count(*)::int` }).from(users);
  return Number(row?.n ?? 0);
}

export async function createUser(input: { email: string; name: string; password: string; role: UserRole }, db?: DbOrTx) {
  const conn = db ?? (await getDb());
  const [u] = await conn
    .insert(users)
    .values({
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      role: input.role,
      passwordHash: await hashPassword(input.password),
    })
    .returning({ id: users.id, email: users.email, name: users.name, role: users.role });
  return u;
}

export async function authenticate(email: string, password: string) {
  const db = await getDb();
  const [u] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1);
  if (!u) {
    await verifyPassword(password, DUMMY_HASH);
    return null;
  }
  const ok = await verifyPassword(password, u.passwordHash);
  if (!ok || !u.active) return null;
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, u.id));
  return u;
}
