/**
 * Creates a staff account (the first owner, typically).
 *
 *   npm run admin:create -- --email owner@example.ch --name "Prénom Nom" [--role owner|manager|staff]
 *
 * The password is read from ADMIN_PASSWORD or prompted interactively (never passed on the command line).
 */
import { createInterface } from "node:readline/promises";
import { closeDb, getDb } from "../lib/db";
import { createUser } from "../lib/users";
import { passwordProblem } from "../lib/auth/password";
import type { UserRole } from "../lib/db/schema";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email");
  const name = arg("name") ?? "Administrateur";
  const role = (arg("role") ?? "owner") as UserRole;
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("--email valide requis");
  if (!["owner", "manager", "staff"].includes(role)) throw new Error("--role doit valoir owner, manager ou staff");

  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    password = await rl.question("Mot de passe (10 caractères min., lettres et chiffres) : ");
    rl.close();
  }
  const problem = passwordProblem(password);
  if (problem) throw new Error(problem);

  await getDb();
  const user = await createUser({ email, name, password, role });
  console.log(`✓ Compte créé : ${user.email} (${user.role})`);
  await closeDb();
  process.exit(0);
}

main().catch((err) => {
  console.error("✗", err instanceof Error ? err.message : err);
  process.exit(1);
});
