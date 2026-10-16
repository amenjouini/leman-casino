import { and, asc, desc, eq, gte, ilike, inArray, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "../db";
import { auditLog, bookings, emailLog, players, seatAssignments, tournaments, users, type BookingStatus } from "../db/schema";
import { BOOKING_STATUSES, CAPACITY_STATUSES } from "../constants";
import { takenByTournament, withAvailability } from "../tournaments";
import { zonedLocalToUtc } from "../format";

const like = (q: string) => `%${q.trim().replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
export const PAGE_SIZE = 50;

/* ──────────────────────────────── Dashboard ──────────────────────────────── */

export async function dashboardData(now = new Date()) {
  const db = await getDb();
  const in30 = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
  const since90 = new Date(now.getTime() - 90 * 24 * 3600 * 1000);

  const upcoming = await db
    .select()
    .from(tournaments)
    .where(and(eq(tournaments.status, "published"), gte(tournaments.startsAt, new Date(now.getTime() - 12 * 3600 * 1000))))
    .orderBy(asc(tournaments.startsAt))
    .limit(100);
  const taken = await takenByTournament(db, upcoming.map((t) => t.id));
  const upcomingWithAvail = withAvailability(upcoming, taken, now).filter((t) => t.availability.state !== "finished");
  const upcomingIds = upcomingWithAvail.map((t) => t.id);

  const statusCounts = upcomingIds.length
    ? await db
        .select({ status: bookings.status, n: sql<number>`count(*)::int`, places: sql<number>`coalesce(sum(${bookings.places}),0)::int` })
        .from(bookings)
        .where(inArray(bookings.tournamentId, upcomingIds))
        .groupBy(bookings.status)
    : [];
  const count = (s: BookingStatus) => statusCounts.find((r) => r.status === s);

  const [allPending] = await db.select({ n: sql<number>`count(*)::int` }).from(bookings).where(eq(bookings.status, "pending"));

  const attendance = await db
    .select({ status: bookings.status, n: sql<number>`coalesce(sum(${bookings.places}),0)::int` })
    .from(bookings)
    .innerJoin(tournaments, eq(bookings.tournamentId, tournaments.id))
    .where(and(inArray(bookings.status, ["attended", "no_show"]), gte(tournaments.startsAt, since90), lte(tournaments.startsAt, now)))
    .groupBy(bookings.status);
  const attended = Number(attendance.find((a) => a.status === "attended")?.n ?? 0);
  const noShows = Number(attendance.find((a) => a.status === "no_show")?.n ?? 0);

  const pendingList = await db
    .select({
      id: bookings.id,
      reference: bookings.reference,
      fullName: bookings.fullName,
      email: bookings.email,
      places: bookings.places,
      status: bookings.status,
      createdAt: bookings.createdAt,
      tournamentName: tournaments.name,
      startsAt: tournaments.startsAt,
    })
    .from(bookings)
    .innerJoin(tournaments, eq(bookings.tournamentId, tournaments.id))
    .where(eq(bookings.status, "pending"))
    .orderBy(asc(tournaments.startsAt), asc(bookings.createdAt))
    .limit(10);

  const activity = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(12);

  const [failedEmails] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(emailLog)
    .where(and(eq(emailLog.status, "failed"), gte(emailLog.createdAt, new Date(now.getTime() - 7 * 24 * 3600 * 1000))));

  const next30 = upcomingWithAvail.filter((t) => t.startsAt <= in30);
  return {
    upcomingCount: next30.length,
    pendingCount: Number(allPending?.n ?? 0),
    confirmedPlayers: Number(count("confirmed")?.places ?? 0),
    seatsAvailable: next30.reduce((sum, t) => sum + t.availability.seatsLeft, 0),
    waitlisted: Number(count("waitlisted")?.places ?? 0),
    attended,
    noShows,
    noShowRate: attended + noShows > 0 ? noShows / (attended + noShows) : null,
    failedEmails: Number(failedEmails?.n ?? 0),
    upcoming: upcomingWithAvail.slice(0, 8),
    pendingList,
    activity,
  };
}

/* ───────────────────────────────── Bookings ──────────────────────────────── */

export type BookingFilters = { q?: string; status?: string; tournament?: string; from?: string; to?: string; page?: number };

function bookingConditions(f: BookingFilters): SQL[] {
  const c: SQL[] = [];
  if (f.q?.trim()) {
    const p = like(f.q);
    c.push(or(ilike(bookings.fullName, p), ilike(bookings.email, p), ilike(bookings.reference, p), ilike(tournaments.name, p), ilike(bookings.phone, p))!);
  }
  if (f.status && (BOOKING_STATUSES as string[]).includes(f.status)) c.push(eq(bookings.status, f.status as BookingStatus));
  if (f.tournament && /^[0-9a-f-]{36}$/i.test(f.tournament)) c.push(eq(bookings.tournamentId, f.tournament));
  const from = f.from ? zonedLocalToUtc(f.from) : null;
  const to = f.to ? zonedLocalToUtc(f.to) : null;
  if (from) c.push(gte(tournaments.startsAt, from));
  if (to) c.push(lt(tournaments.startsAt, new Date(to.getTime() + 24 * 3600 * 1000)));
  return c;
}

export async function listBookings(f: BookingFilters, opts: { all?: boolean } = {}) {
  const db = await getDb();
  const where = and(...bookingConditions(f));
  const page = Math.max(1, f.page ?? 1);
  const base = db
    .select({
      booking: bookings,
      tournamentName: tournaments.name,
      tournamentId: tournaments.id,
      startsAt: tournaments.startsAt,
      tableLabels: tournaments.tableLabels,
      seats: sql<string>`coalesce((select string_agg(${seatAssignments.tableNumber} || ':' || ${seatAssignments.seatNumber}, ',' order by ${seatAssignments.tableNumber}, ${seatAssignments.seatNumber}) from ${seatAssignments} where ${seatAssignments.bookingId} = ${bookings.id}), '')`,
    })
    .from(bookings)
    .innerJoin(tournaments, eq(bookings.tournamentId, tournaments.id))
    .where(where)
    .orderBy(desc(bookings.createdAt));
  const rows = opts.all ? await base.limit(10000) : await base.limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(bookings)
    .innerJoin(tournaments, eq(bookings.tournamentId, tournaments.id))
    .where(where);
  return { rows, total: Number(n), page, pages: Math.max(1, Math.ceil(Number(n) / PAGE_SIZE)) };
}

export async function getBookingDetail(id: string) {
  const db = await getDb();
  const [row] = await db
    .select({ booking: bookings, tournament: tournaments })
    .from(bookings)
    .innerJoin(tournaments, eq(bookings.tournamentId, tournaments.id))
    .where(eq(bookings.id, id))
    .limit(1);
  if (!row) return null;
  const [seats, emails, audit, occupied] = await Promise.all([
    db.select().from(seatAssignments).where(eq(seatAssignments.bookingId, id)).orderBy(asc(seatAssignments.tableNumber), asc(seatAssignments.seatNumber)),
    db.select().from(emailLog).where(eq(emailLog.bookingId, id)).orderBy(desc(emailLog.createdAt)),
    db.select().from(auditLog).where(eq(auditLog.bookingId, id)).orderBy(desc(auditLog.createdAt)),
    db
      .select({ table: seatAssignments.tableNumber, seat: seatAssignments.seatNumber, bookingId: seatAssignments.bookingId })
      .from(seatAssignments)
      .where(eq(seatAssignments.tournamentId, row.tournament.id)),
  ]);
  return { ...row, seats, emails, audit, occupied };
}

export async function tournamentOptions() {
  const db = await getDb();
  return db
    .select({ id: tournaments.id, name: tournaments.name, startsAt: tournaments.startsAt })
    .from(tournaments)
    .where(inArray(tournaments.status, ["published", "draft"]))
    .orderBy(desc(tournaments.startsAt))
    .limit(200);
}

/** Bookings of one tournament with their seats (seating screen & check-in). */
export async function tournamentRoster(tournamentId: string) {
  const db = await getDb();
  const list = await db
    .select()
    .from(bookings)
    .where(eq(bookings.tournamentId, tournamentId))
    .orderBy(asc(bookings.fullName));
  const seats = await db.select().from(seatAssignments).where(eq(seatAssignments.tournamentId, tournamentId));
  return list.map((b) => ({ ...b, seats: seats.filter((s) => s.bookingId === b.id).map((s) => ({ table: s.tableNumber, seat: s.seatNumber })) }));
}

/* ───────────────────────────────── Players ───────────────────────────────── */

export async function listPlayers(q = "", page = 1, opts: { all?: boolean } = {}) {
  const db = await getDb();
  const where = q.trim() ? or(ilike(players.fullName, like(q)), ilike(players.email, like(q)), ilike(players.phone, like(q))) : undefined;
  const agg = (status: BookingStatus[]) =>
    sql<number>`count(${bookings.id}) filter (where ${inArray(bookings.status, status)})::int`;
  const base = db
    .select({
      player: players,
      total: sql<number>`count(${bookings.id})::int`,
      active: agg(CAPACITY_STATUSES.filter((s) => s === "pending" || s === "confirmed")),
      attended: agg(["attended"]),
      noShows: agg(["no_show"]),
      cancelled: agg(["cancelled", "rejected"]),
      lastBooking: sql<Date | null>`max(${bookings.createdAt})`,
    })
    .from(players)
    .leftJoin(bookings, eq(bookings.playerId, players.id))
    .where(where)
    .groupBy(players.id)
    .orderBy(desc(sql`max(${bookings.createdAt})`), asc(players.fullName));
  const rows = opts.all ? await base.limit(20000) : await base.limit(PAGE_SIZE).offset((Math.max(1, page) - 1) * PAGE_SIZE);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(players).where(where);
  return { rows, total: Number(n), page, pages: Math.max(1, Math.ceil(Number(n) / PAGE_SIZE)) };
}

export async function getPlayerDetail(id: string) {
  const db = await getDb();
  const [player] = await db.select().from(players).where(eq(players.id, id)).limit(1);
  if (!player) return null;
  const history = await db
    .select({ booking: bookings, tournamentName: tournaments.name, startsAt: tournaments.startsAt })
    .from(bookings)
    .innerJoin(tournaments, eq(bookings.tournamentId, tournaments.id))
    .where(eq(bookings.playerId, id))
    .orderBy(desc(tournaments.startsAt));
  return { player, history };
}

/* ───────────────────────────── Emails, audit, users ──────────────────────── */

export async function listEmailLog(status = "", page = 1) {
  const db = await getDb();
  const where = status === "sent" || status === "failed" || status === "skipped" ? eq(emailLog.status, status) : undefined;
  const rows = await db
    .select({ log: emailLog, reference: bookings.reference })
    .from(emailLog)
    .leftJoin(bookings, eq(emailLog.bookingId, bookings.id))
    .where(where)
    .orderBy(desc(emailLog.createdAt))
    .limit(PAGE_SIZE)
    .offset((Math.max(1, page) - 1) * PAGE_SIZE);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(emailLog).where(where);
  return { rows, total: Number(n), page, pages: Math.max(1, Math.ceil(Number(n) / PAGE_SIZE)) };
}

export async function listAudit(page = 1, entity = "") {
  const db = await getDb();
  const where = entity ? eq(auditLog.entityType, entity) : undefined;
  const rows = await db
    .select()
    .from(auditLog)
    .where(where)
    .orderBy(desc(auditLog.createdAt))
    .limit(PAGE_SIZE)
    .offset((Math.max(1, page) - 1) * PAGE_SIZE);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(auditLog).where(where);
  return { rows, total: Number(n), page, pages: Math.max(1, Math.ceil(Number(n) / PAGE_SIZE)) };
}

export async function listUsers() {
  const db = await getDb();
  return db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role, active: users.active, lastLoginAt: users.lastLoginAt, createdAt: users.createdAt })
    .from(users)
    .orderBy(asc(users.name));
}

/** Today's (Zurich) tournaments for the check-in screen, plus the next upcoming ones. */
export async function checkinTournaments(now = new Date()) {
  const db = await getDb();
  return db
    .select({ id: tournaments.id, name: tournaments.name, startsAt: tournaments.startsAt, tableLabels: tournaments.tableLabels })
    .from(tournaments)
    .where(and(eq(tournaments.status, "published"), gte(tournaments.startsAt, new Date(now.getTime() - 24 * 3600 * 1000))))
    .orderBy(asc(tournaments.startsAt))
    .limit(10);
}
