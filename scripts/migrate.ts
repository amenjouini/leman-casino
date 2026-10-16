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
    // On Vercel the build filesystem is thrown away: migrating an embedded DB there would
    // silently do nothing useful while the deployed app has no database at all.
    if (process.env.VERCEL && process.env.DEMO_MODE === "true") {
      // Demo without Postgres: each instance creates its embedded DB in /tmp and applies
      // the migrations itself at startup (lib/db createPglite), then seeds demo data.
      console.log("✓ Mode démo sans PostgreSQL : migrations appliquées au démarrage de chaque instance.");
      return;
    }
    if (process.env.VERCEL) {
      throw new Error("DATABASE_URL est requis sur Vercel : les migrations doivent viser la base PostgreSQL de production.");
    }
    const { createPglite } = await import("../lib/db");
    const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
    const db = await createPglite(dir);
    // Close cleanly (checkpoint) before exiting, otherwise PGlite leaves the directory "interrupted".
    await (db as unknown as { $client: { close: () => Promise<void> } }).$client.close();
    console.log(`✓ Migrations appliquées à la base embarquée (${dir}).`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
  console.error("✗ Échec des migrations :", err);
  process.exit(1);
});
