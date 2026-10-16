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
  try {
    await client.waitReady;
  } catch (err) {
    // Release file handles (Windows keeps the folder locked otherwise).
    await client.close().catch(() => undefined);
    // A Postgres PANIC inside WASM surfaces as "RuntimeError: Aborted()".
    throw new Error(
      `La base embarquée (${dataDir ?? "mémoire"}) ne peut pas démarrer : elle n'a pas été fermée proprement ` +
        `et son journal (WAL) est endommagé. Ne supprimez pas le dossier ; voir DEPLOYMENT.md « Base embarquée endommagée ».`,
      { cause: err },
    );
  }
  if (dataDir) closeOnExit(client);
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db as unknown as Database;
}

/**
 * PGlite writes its files from WASM memory: a process killed while the database is open
 * can leave a corrupt checkpoint. Close it (which checkpoints) when the process stops.
 */
function closeOnExit(client: { close: () => Promise<void>; closed?: boolean }) {
  let closing: Promise<void> | null = null;
  const close = () => (closing ??= client.closed ? Promise.resolve() : client.close().catch(() => undefined));
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
    process.once(signal, () => {
      void close().finally(() => process.exit(0));
    });
  }
  process.once("beforeExit", () => void close());
}

/** Closes the embedded database if one is open (scripts must call this before exiting). */
export async function closeDb(): Promise<void> {
  const pending = globalForDb.__lemanDb;
  globalForDb.__lemanDb = undefined;
  const db = pending ? await pending.catch(() => null) : null;
  const client = (db as unknown as { $client?: { close?: () => Promise<void>; end?: () => Promise<void>; closed?: boolean } } | null)?.$client;
  if (client?.close && !client.closed) await client.close();
  else if (client?.end) await client.end();
}

export function getDb(): Promise<Database> {
  if (!globalForDb.__lemanDb) {
    const url = process.env.DATABASE_URL;
    if (url) {
      globalForDb.__lemanDb = createPostgres(url);
    } else {
      if (process.env.NODE_ENV === "production" && process.env.ALLOW_EMBEDDED_DB !== "true" && process.env.DEMO_MODE !== "true") {
        throw new Error(
          "DATABASE_URL n'est pas défini. Configurez une base PostgreSQL (voir DEPLOYMENT.md) " +
            "ou définissez ALLOW_EMBEDDED_DB=true pour un serveur unique avec stockage persistant.",
        );
      }
      // On Vercel only /tmp is writable (per instance, ephemeral): fine for a self-seeding demo.
      const dir = process.env.PGLITE_DIR ?? (process.env.VERCEL ? "/tmp/leman-pglite" : path.join(process.cwd(), ".data", "pglite"));
      globalForDb.__lemanDb = createPglite(dir).catch(async (err) => {
        // Demo data is disposable: if an abrupt stop damaged the embedded DB, keep the old
        // folder aside (never deleted) and start a fresh, self-seeding demo database.
        const demo = process.env.DEMO_MODE === "true" || (process.env.DEMO_MODE !== "false" && process.env.NODE_ENV !== "production");
        if (!demo || !fs.existsSync(dir)) throw err;
        const aside = `${dir}-damaged-${new Date().toISOString().replace(/[:.]/g, "-")}`;
        try {
          fs.renameSync(dir, aside);
          console.warn(`[db] Base démo endommagée déplacée vers ${aside} ; nouvelle base créée.`);
          return createPglite(dir);
        } catch {
          // Folder still locked by the OS: start the fresh demo next to it instead.
          console.warn(`[db] Base démo endommagée (${dir}) laissée en place ; nouvelle base dans ${dir}-fresh.`);
          return createPglite(`${dir}-fresh`);
        }
      });
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
