import { and, asc, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "./db";
import { tournamentResults, tournaments, type Tournament, type TournamentResult } from "./db/schema";
import { writeAudit, type Actor } from "./audit";
import { BookingError } from "./bookings";
import { cleanText } from "./validation";

export const resultRowSchema = z.object({
  displayName: z.string().transform(cleanText).pipe(z.string().max(60, "Nom : 60 caractères max.")),
  prizeCents: z.number().int().min(0).max(100_000_000_00).nullable(),
  deal: z.boolean(),
  bookingId: z.uuid().nullable(),
});
export type ResultRowInput = z.infer<typeof resultRowSchema>;

export async function getResults(tournamentId: string): Promise<TournamentResult[]> {
  const db = await getDb();
  return db.select().from(tournamentResults).where(eq(tournamentResults.tournamentId, tournamentId)).orderBy(asc(tournamentResults.rank));
}

/** Replaces the ranking of a tournament (rows are ranked in the given order). */
export async function saveResults(
  tournamentId: string,
  input: { entriesCount: number | null; published: boolean; rows: ResultRowInput[] },
  actor: Actor,
) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [t] = await tx.select().from(tournaments).where(eq(tournaments.id, tournamentId)).for("update").limit(1);
    if (!t) throw new BookingError("NOT_FOUND", "Tournoi introuvable.");
    await tx.delete(tournamentResults).where(eq(tournamentResults.tournamentId, tournamentId));
    if (input.rows.length) {
      await tx.insert(tournamentResults).values(input.rows.map((r, i) => ({ ...r, tournamentId, rank: i + 1 })));
    }
    await tx
      .update(tournaments)
      .set({ entriesCount: input.entriesCount, resultsPublished: input.published && input.rows.length > 0, updatedAt: new Date() })
      .where(eq(tournaments.id, tournamentId));
    await writeAudit(tx, actor, {
      action: "tournament.results_saved",
      entityType: "tournament",
      entityId: tournamentId,
      details: { rows: input.rows.length, published: input.published, entries: input.entriesCount },
    });
  });
}

export type PublishedResult = Tournament & { results: TournamentResult[] };

/** Published rankings, most recent tournaments first. */
export async function listPublishedResults(opts: { q?: string; page?: number; pageSize?: number } = {}) {
  const db = await getDb();
  const pageSize = opts.pageSize ?? 10;
  const page = Math.max(1, opts.page ?? 1);
  const where = and(
    eq(tournaments.resultsPublished, true),
    eq(tournaments.status, "published"),
    opts.q?.trim() ? ilike(tournaments.name, `%${opts.q.trim().replace(/[%_\\]/g, (c) => `\\${c}`)}%`) : undefined,
  );
  const list = await db
    .select()
    .from(tournaments)
    .where(where)
    .orderBy(desc(tournaments.startsAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(tournaments).where(where);
  const ids = list.map((t) => t.id);
  const rows = ids.length
    ? await db.select().from(tournamentResults).where(inArray(tournamentResults.tournamentId, ids)).orderBy(asc(tournamentResults.rank))
    : [];
  return {
    items: list.map((t) => ({ ...t, results: rows.filter((r) => r.tournamentId === t.id) })) as PublishedResult[],
    page,
    pages: Math.max(1, Math.ceil(Number(n) / pageSize)),
  };
}
