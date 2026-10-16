/**
 * Applies pending SQL migrations from ./drizzle. Safe to run on every deploy:
 * migrations are additive and already-applied ones are skipped. Never drops data.
 *
 *   npm run db:migrate
 */
import path from "node:path";

async function main() {
  const folder = path.join(process.cwd(), "drizzle");
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const pool = new Pool({
      connectionString: url,
      ssl: /sslmode=require|neon\.tech|supabase/.test(url) ? { rejectUnauthorized: false } : undefined,
    });
    await migrate(drizzle({ client: pool }), { migrationsFolder: folder });
    await pool.end();
    console.log("✓ Migrations PostgreSQL appliquées.");
  } else {
    const { createPglite } = await import("../lib/db");
    const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
    await createPglite(dir);
    console.log(`✓ Migrations appliquées à la base embarquée (${dir}).`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
  console.error("✗ Échec des migrations :", err);
  process.exit(1);
});
