import { and, asc, desc, eq, gte, ilike, inArray, lt, or, sql } from "drizzle-orm";
import { getDb, type DbOrTx } from "./db";
import { bookings, seatAssignments, tournaments, type Tournament } from "./db/schema";
import { CAPACITY_STATUSES } from "./constants";
import { computeAvailability, type Availability, type RegistrationState } from "./availability";
import { writeAudit, type Actor } from "./audit";
import { slugify, zonedDateKey } from "./format";
import { BookingError, takenPlaces } from "./bookings";
import type { TournamentFields } from "./validation";
import { buyInWithBounty, entryType, type EntryType } from "./tournament-meta";

export type TournamentWithAvailability = Tournament & { availability: Availability };

export async function takenByTournament(db: DbOrTx, ids: string[]): Promise<Map<string, number>> {
  if (!ids.length) return new Map();
  const rows = await db
    .select({ id: bookings.tournamentId, n: sql<number>`coalesce(sum(${bookings.places}), 0)::int` })
    .from(bookings)
    .where(and(inArray(bookings.tournamentId, ids), inArray(bookings.status, CAPACITY_STATUSES)))
    .groupBy(bookings.tournamentId);
  return new Map(rows.map((r) => [r.id, Number(r.n)]));
}

export function withAvailability(list: Tournament[], taken: Map<string, number>, now = new Date()): TournamentWithAvailability[] {
  return list.map((t) => ({ ...t, availability: computeAvailability(t, taken.get(t.id) ?? 0, now) }));
}

/* ─────────────────────────────────── Public ───────────────────────────────── */

export type PublicFilters = {
  q?: string;
  format?: string;
  from?: string; // YYYY-MM-DD (Zurich)
  to?: string;
  availability?: "available" | "all";
  type?: EntryType;
  /** Buy-in + bounty bounds, in cents. */
  buyInMin?: number;
  buyInMax?: number;
  playersMin?: number;
  playersMax?: number;
  limit?: number;
};

/** Upcoming (and currently running) published tournaments, soonest first. */
export async function listPublicTournaments(filters: PublicFilters = {}, now = new Date()): Promise<TournamentWithAvailability[]> {
  const db = await getDb();
  // Keep tournaments that started in the last 12 hours (still running today).
  const lowerBound = new Date(now.getTime() - 12 * 3600 * 1000);
  const conditions = [eq(tournaments.status, "published"), gte(tournaments.startsAt, lowerBound)];
  if (filters.q?.trim()) {
    const q = `%${filters.q.trim().replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    conditions.push(or(ilike(tournaments.name, q), ilike(tournaments.format, q), ilike(tournaments.gameVariant, q))!);
  }
  if (filters.format) conditions.push(eq(tournaments.format, filters.format));
  const rows = await db
    .select()
    .from(tournaments)
    .where(and(...conditions))
    .orderBy(asc(tournaments.startsAt))
    .limit(Math.min(filters.limit ?? 200, 500));

  const taken = await takenByTournament(db, rows.map((r) => r.id));
  let list = withAvailability(rows, taken, now).filter((t) => t.availability.state !== "finished");
  if (filters.from) list = list.filter((t) => zonedDateKey(t.startsAt) >= filters.from!);
  if (filters.to) list = list.filter((t) => zonedDateKey(t.startsAt) <= filters.to!);
  if (filters.availability === "available") list = list.filter((t) => t.availability.canRequest);
  if (filters.type) list = list.filter((t) => entryType(t) === filters.type);
  if (filters.buyInMin != null) list = list.filter((t) => buyInWithBounty(t) >= filters.buyInMin!);
  if (filters.buyInMax != null) list = list.filter((t) => buyInWithBounty(t) <= filters.buyInMax!);
  if (filters.playersMin != null) list = list.filter((t) => t.availability.taken >= filters.playersMin!);
  if (filters.playersMax != null) list = list.filter((t) => t.availability.taken <= filters.playersMax!);
  return list;
}

export async function listPublicFormats(): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .selectDistinct({ format: tournaments.format })
    .from(tournaments)
    .where(and(eq(tournaments.status, "published"), gte(tournaments.startsAt, new Date(Date.now() - 12 * 3600 * 1000))))
    .orderBy(asc(tournaments.format));
  return rows.map((r) => r.format);
}

export async function getPublicTournament(slug: string, now = new Date()): Promise<TournamentWithAvailability | null> {
  const db = await getDb();
  const [t] = await db
    .select()
    .from(tournaments)
    .where(and(eq(tournaments.slug, slug), eq(tournaments.status, "published")))
    .limit(1);
  if (!t) return null;
  const taken = await takenPlaces(db, t.id);
  return { ...t, availability: computeAvailability(t, taken, now) };
}

export const BOOKABLE_STATES: RegistrationState[] = ["open", "almost_full", "waitlist"];

/* ─────────────────────────────────── Admin ────────────────────────────────── */

export type AdminTournamentView = "upcoming" | "past" | "draft" | "archived" | "all";

export async function listAdminTournaments(view: AdminTournamentView, q = "", now = new Date()) {
  const db = await getDb();
  const conditions = [];
  if (view === "upcoming") conditions.push(gte(tournaments.startsAt, new Date(now.getTime() - 12 * 3600 * 1000)), inArray(tournaments.status, ["published", "draft"]));
  if (view === "past") conditions.push(lt(tournaments.startsAt, now), inArray(tournaments.status, ["published", "draft"]));
  if (view === "draft") conditions.push(eq(tournaments.status, "draft"));
  if (view === "archived") conditions.push(eq(tournaments.status, "archived"));
  if (q.trim()) conditions.push(ilike(tournaments.name, `%${q.trim().replace(/[%_\\]/g, (c) => `\\${c}`)}%`));
  const rows = await db
    .select()
    .from(tournaments)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(view === "past" || view === "archived" ? desc(tournaments.startsAt) : asc(tournaments.startsAt))
    .limit(300);
  const ids = rows.map((r) => r.id);
  const taken = await takenByTournament(db, ids);
  const pendingRows = ids.length
    ? await db
        .select({ id: bookings.tournamentId, status: bookings.status, n: sql<number>`count(*)::int` })
        .from(bookings)
        .where(and(inArray(bookings.tournamentId, ids), inArray(bookings.status, ["pending", "waitlisted"])))
        .groupBy(bookings.tournamentId, bookings.status)
    : [];
  return withAvailability(rows, taken, now).map((t) => ({
    ...t,
    pendingCount: Number(pendingRows.find((p) => p.id === t.id && p.status === "pending")?.n ?? 0),
    waitlistCount: Number(pendingRows.find((p) => p.id === t.id && p.status === "waitlisted")?.n ?? 0),
  }));
}

export async function getTournamentById(id: string): Promise<TournamentWithAvailability | null> {
  const db = await getDb();
  const [t] = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
  if (!t) return null;
  return { ...t, availability: computeAvailability(t, await takenPlaces(db, t.id)) };
}

async function uniqueSlug(db: DbOrTx, base: string, excludeId?: string): Promise<string> {
  const root = base || "tournoi";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const [hit] = await db.select({ id: tournaments.id }).from(tournaments).where(eq(tournaments.slug, candidate)).limit(1);
    if (!hit || hit.id === excludeId) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

const slugFor = (name: string, startsAt: Date) => slugify(`${name} ${zonedDateKey(startsAt)}`);

export async function createTournament(fields: TournamentFields, actor: Actor): Promise<Tournament> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const slug = await uniqueSlug(tx, slugFor(fields.name, fields.startsAt));
    const [t] = await tx.insert(tournaments).values({ ...fields, slug }).returning();
    await writeAudit(tx, actor, { action: "tournament.created", entityType: "tournament", entityId: t.id, details: { name: t.name } });
    return t;
  });
}

export async function updateTournament(id: string, fields: TournamentFields, actor: Actor): Promise<Tournament> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(tournaments).where(eq(tournaments.id, id)).for("update").limit(1);
    if (!current) throw new BookingError("NOT_FOUND", "Tournoi introuvable.");
    const taken = await takenPlaces(tx, id);
    if (fields.capacity < taken) {
      throw new BookingError("FULL", `La capacité ne peut pas être inférieure aux ${taken} place(s) déjà réservée(s) ou en attente.`);
    }
    const [outOfRange] = await tx
      .select({ table: seatAssignments.tableNumber, seat: seatAssignments.seatNumber })
      .from(seatAssignments)
      .where(
        and(
          eq(seatAssignments.tournamentId, id),
          or(sql`${seatAssignments.tableNumber} > ${fields.tableCount}`, sql`${seatAssignments.seatNumber} > ${fields.seatsPerTable}`),
        ),
      )
      .limit(1);
    if (outOfRange) {
      throw new BookingError(
        "SEAT_INVALID",
        `Le siège ${outOfRange.seat} de la table ${outOfRange.table} est occupé : libérez-le avant de réduire le nombre de tables ou de sièges.`,
      );
    }
    const slug =
      current.status === "draft" && (current.name !== fields.name || current.startsAt.getTime() !== fields.startsAt.getTime())
        ? await uniqueSlug(tx, slugFor(fields.name, fields.startsAt), id)
        : current.slug;
    const [t] = await tx
      .update(tournaments)
      .set({ ...fields, slug, updatedAt: new Date() })
      .where(eq(tournaments.id, id))
      .returning();
    const changed = (Object.keys(fields) as (keyof TournamentFields)[]).filter(
      (k) => JSON.stringify(current[k]) !== JSON.stringify(fields[k]),
    );
    await writeAudit(tx, actor, { action: "tournament.updated", entityType: "tournament", entityId: id, details: { fields: changed } });
    return t;
  });
}

export async function setTournamentStatus(id: string, status: Tournament["status"], actor: Actor) {
  const db = await getDb();
  const [t] = await db.update(tournaments).set({ status, updatedAt: new Date() }).where(eq(tournaments.id, id)).returning();
  if (!t) throw new BookingError("NOT_FOUND", "Tournoi introuvable.");
  await writeAudit(db, actor, { action: "tournament.status_changed", entityType: "tournament", entityId: id, details: { status } });
  return t;
}

/** Copies a tournament as a draft one week later (dates shifted together). */
export async function duplicateTournament(id: string, actor: Actor): Promise<Tournament> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [src] = await tx.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
    if (!src) throw new BookingError("NOT_FOUND", "Tournoi introuvable.");
    const week = 7 * 24 * 3600 * 1000;
    const shift = (d: Date | null) => (d ? new Date(d.getTime() + week) : null);
    const { id: _id, slug: _slug, createdAt: _c, updatedAt: _u, ...rest } = src;
    void _id;
    void _slug;
    void _c;
    void _u;
    const startsAt = new Date(src.startsAt.getTime() + week);
    const name = `${src.name} (copie)`;
    const [copy] = await tx
      .insert(tournaments)
      .values({
        ...rest,
        name,
        startsAt,
        endsAt: shift(src.endsAt),
        registrationOpensAt: shift(src.registrationOpensAt),
        registrationClosesAt: shift(src.registrationClosesAt),
        status: "draft",
        featured: false,
        slug: await uniqueSlug(tx, slugFor(name, startsAt)),
      })
      .returning();
    await writeAudit(tx, actor, { action: "tournament.duplicated", entityType: "tournament", entityId: copy.id, details: { source: src.id } });
    return copy;
  });
}
