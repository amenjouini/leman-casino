import path from "node:path";
import fs from "node:fs";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

/**
 * Database access.
 *
 * - Production: PostgreSQL through `DATABASE_URL` (migrations applied with
 *   `npm run db:migrate`, never automatically reset).
 * - Local development / tests: when `DATABASE_URL` is absent, an embedded
 *   PostgreSQL (PGlite) stored in `.data/pglite` is used and migrated on start.
 *
 * Both drivers share the same schema and SQL dialect, so the rest of the
 * application only sees a `Database`.
 */
export type Database = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DbOrTx = Database | Tx;

export const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

type GlobalDb = { __lemanDb?: Promise<Database> };
const globalForDb = globalThis as unknown as GlobalDb;

async function createPostgres(url: string): Promise<Database> {
  const { Pool } = await import("pg");
  const pool = new Pool({
    connectionString: url,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    ssl: process.env.DATABASE_SSL === "false" ? undefined : /sslmode=require|neon\.tech|supabase/.test(url) ? { rejectUnauthorized: false } : undefined,
  });
  return drizzlePg({ client: pool, schema });
}

export async function createPglite(dataDir?: string): Promise<Database> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  if (dataDir) fs.mkdirSync(dataDir, { recursive: true });
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db as unknown as Database;
}

export function getDb(): Promise<Database> {
  if (!globalForDb.__lemanDb) {
    const url = process.env.DATABASE_URL;
    if (url) {
      globalForDb.__lemanDb = createPostgres(url);
    } else {
      if (process.env.NODE_ENV === "production" && process.env.ALLOW_EMBEDDED_DB !== "true") {
        throw new Error(
          "DATABASE_URL n'est pas défini. Configurez une base PostgreSQL (voir DEPLOYMENT.md) " +
            "ou définissez ALLOW_EMBEDDED_DB=true pour un serveur unique avec stockage persistant.",
        );
      }
      const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
      globalForDb.__lemanDb = createPglite(dir);
    }
    globalForDb.__lemanDb.catch(() => {
      globalForDb.__lemanDb = undefined;
    });
  }
  return globalForDb.__lemanDb;
}

/** Test helper: replace the shared database instance (e.g. with an in-memory PGlite). */
export function setDbForTests(db: Database | undefined) {
  globalForDb.__lemanDb = db ? Promise.resolve(db) : undefined;
}

export { schema };
