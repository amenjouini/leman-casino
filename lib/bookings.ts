import { randomInt } from "node:crypto";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { getDb, type DbOrTx, type Tx } from "./db";
import { bookings, players, seatAssignments, tournaments, type Booking, type BookingStatus, type Tournament, type UserRole } from "./db/schema";
import { ACTIVE_REQUEST_STATUSES, BOOKING_STATUS_LABELS, CAPACITY_STATUSES } from "./constants";
import { computeAvailability } from "./availability";
import { writeAudit, PUBLIC_ACTOR, type Actor } from "./audit";
import { getSettings } from "./settings";
import type { BookingRequest, SeatInput } from "./validation";

export type BookingErrorCode =
  | "NOT_FOUND"
  | "CLOSED"
  | "FULL"
  | "NOT_ENOUGH_SEATS"
  | "DUPLICATE"
  | "SEAT_TAKEN"
  | "SEAT_INVALID"
  | "SEATS_REQUIRED"
  | "TOO_MANY_PLACES"
  | "PHONE_REQUIRED"
  | "INVALID_TRANSITION"
  | "FORBIDDEN"
  | "IDEMPOTENCY_MISMATCH";

export class BookingError extends Error {
  constructor(
    public code: BookingErrorCode,
    message: string,
    public details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "BookingError";
  }
}

/* ────────────────────────────────── Helpers ───────────────────────────────── */

const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function generateReference(): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return `LM-${s.slice(0, 4)}-${s.slice(4)}`;
}

export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  const candidates = [err, (err as { cause?: unknown })?.cause];
  return candidates.some((e) => {
    const x = e as { code?: string; constraint?: string; message?: string } | undefined;
    if (!x || x.code !== "23505") return false;
    return !constraint || x.constraint === constraint || (x.message ?? "").includes(constraint);
  });
}

export const countsTowardCapacity = (s: BookingStatus) => CAPACITY_STATUSES.includes(s);

export async function takenPlaces(db: DbOrTx, tournamentId: string, excludeBookingId?: string): Promise<number> {
  const conditions = [eq(bookings.tournamentId, tournamentId), inArray(bookings.status, CAPACITY_STATUSES)];
  if (excludeBookingId) conditions.push(ne(bookings.id, excludeBookingId));
  const [row] = await db
    .select({ n: sql<number>`coalesce(sum(${bookings.places}), 0)::int` })
    .from(bookings)
    .where(and(...conditions));
  return Number(row?.n ?? 0);
}

async function lockTournament(tx: Tx, tournamentId: string): Promise<Tournament | undefined> {
  const [t] = await tx.select().from(tournaments).where(eq(tournaments.id, tournamentId)).for("update").limit(1);
  return t;
}

export function validateSeats(t: Pick<Tournament, "tableCount" | "seatsPerTable">, seats: SeatInput[]) {
  const seen = new Set<string>();
  for (const s of seats) {
    if (s.table < 1 || s.table > t.tableCount || s.seat < 1 || s.seat > t.seatsPerTable) {
      throw new BookingError("SEAT_INVALID", `Le siège ${s.seat} de la table ${s.table} n'existe pas pour ce tournoi.`);
    }
    const key = `${s.table}:${s.seat}`;
    if (seen.has(key)) throw new BookingError("SEAT_INVALID", "Le même siège a été sélectionné plusieurs fois.");
    seen.add(key);
  }
}

async function insertSeats(tx: Tx, tournamentId: string, bookingId: string, seats: SeatInput[]) {
  if (!seats.length) return;
  const keys = seats.map((s) => sql`(${s.table}, ${s.seat})`);
  const clash = await tx
    .select({ table: seatAssignments.tableNumber, seat: seatAssignments.seatNumber })
    .from(seatAssignments)
    .where(
      and(
        eq(seatAssignments.tournamentId, tournamentId),
        ne(seatAssignments.bookingId, bookingId),
        sql`(${seatAssignments.tableNumber}, ${seatAssignments.seatNumber}) in (${sql.join(keys, sql`, `)})`,
      ),
    );
  if (clash.length) {
    throw new BookingError("SEAT_TAKEN", `Le siège ${clash[0].seat} de la table ${clash[0].table} vient d'être réservé. Veuillez en choisir un autre.`, {
      seats: clash,
    });
  }
  await tx.insert(seatAssignments).values(seats.map((s) => ({ tournamentId, bookingId, tableNumber: s.table, seatNumber: s.seat })));
}

/** Occupied seats of a tournament, without any personal data (public seat picker). */
export async function occupiedSeats(tournamentId: string): Promise<SeatInput[]> {
  const db = await getDb();
  const rows = await db
    .select({ table: seatAssignments.tableNumber, seat: seatAssignments.seatNumber })
    .from(seatAssignments)
    .where(eq(seatAssignments.tournamentId, tournamentId));
  return rows;
}

/* ───────────────────────────── Public: create request ─────────────────────── */

export type CreateBookingResult = { booking: Booking; tournament: Tournament; seats: SeatInput[]; replayed: boolean };

export async function createBooking(input: BookingRequest, now = new Date()): Promise<CreateBookingResult> {
  const db = await getDb();
  const bookingSettings = await getSettings("booking", db);
  if (bookingSettings.requirePhone && !input.phone) {
    throw new BookingError("PHONE_REQUIRED", "Le numéro de téléphone est requis.");
  }

  const replay = async (): Promise<CreateBookingResult | null> => {
    const [existing] = await db.select().from(bookings).where(eq(bookings.idempotencyKey, input.idempotencyKey)).limit(1);
    if (!existing) return null;
    if (existing.tournamentId !== input.tournamentId || existing.email !== input.email) {
      throw new BookingError("IDEMPOTENCY_MISMATCH", "Cette demande a déjà été envoyée. Rechargez la page pour en créer une nouvelle.");
    }
    const [t] = await db.select().from(tournaments).where(eq(tournaments.id, existing.tournamentId));
    const seats = await db
      .select({ table: seatAssignments.tableNumber, seat: seatAssignments.seatNumber })
      .from(seatAssignments)
      .where(eq(seatAssignments.bookingId, existing.id));
    return { booking: existing, tournament: t, seats, replayed: true };
  };

  const previous = await replay();
  if (previous) return previous;

  try {
    return await db.transaction(async (tx) => {
      // Serialises all reservations of this tournament: capacity checks below cannot race.
      const t = await lockTournament(tx, input.tournamentId);
      if (!t || t.status !== "published") throw new BookingError("NOT_FOUND", "Ce tournoi n'est pas disponible.");
      if (t.externalBookingUrl) throw new BookingError("CLOSED", "Les inscriptions à ce tournoi se font sur la plateforme indiquée sur la fiche du tournoi.");

      const [sameKey] = await tx.select({ id: bookings.id }).from(bookings).where(eq(bookings.idempotencyKey, input.idempotencyKey));
      if (sameKey) throw new BookingError("IDEMPOTENCY_MISMATCH", "__replay__");

      const taken = await takenPlaces(tx, t.id);
      const availability = computeAvailability(t, taken, now);
      if (!availability.canRequest) {
        throw new BookingError(availability.state === "full" ? "FULL" : "CLOSED", availability.state === "full" ? "Ce tournoi est complet." : "Les inscriptions à ce tournoi ne sont pas ouvertes.");
      }
      if (input.places > t.maxPlacesPerBooking) {
        throw new BookingError("TOO_MANY_PLACES", `Vous pouvez réserver au maximum ${t.maxPlacesPerBooking} place(s) pour ce tournoi.`);
      }

      const [duplicate] = await tx
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(eq(bookings.tournamentId, t.id), eq(bookings.email, input.email), inArray(bookings.status, ACTIVE_REQUEST_STATUSES)))
        .limit(1);
      if (duplicate) {
        throw new BookingError("DUPLICATE", "Une demande est déjà enregistrée pour ce tournoi avec cette adresse e-mail. Contactez-nous pour la modifier.");
      }

      let status: BookingStatus;
      if (availability.seatsLeft >= input.places) status = "pending";
      else if (availability.seatsLeft > 0) {
        throw new BookingError("NOT_ENOUGH_SEATS", `Il ne reste que ${availability.seatsLeft} place(s) disponible(s).`, { seatsLeft: availability.seatsLeft });
      } else if (t.waitlistEnabled) status = "waitlisted";
      else throw new BookingError("FULL", "Ce tournoi est complet.");

      let seats: SeatInput[] = [];
      if (t.seatSelection === "player" && status === "pending") {
        if (input.seats.length !== input.places) {
          throw new BookingError("SEATS_REQUIRED", `Veuillez choisir ${input.places} siège(s).`);
        }
        validateSeats(t, input.seats);
        seats = input.seats;
      }

      const [player] = await tx
        .insert(players)
        .values({ email: input.email, fullName: input.fullName, phone: input.phone || null })
        .onConflictDoUpdate({
          target: players.email,
          set: {
            fullName: input.fullName,
            phone: input.phone ? input.phone : sql`${players.phone}`,
            updatedAt: new Date(),
          },
        })
        .returning();

      let reference = generateReference();
      for (let i = 0; i < 5; i++) {
        const [clash] = await tx.select({ id: bookings.id }).from(bookings).where(eq(bookings.reference, reference));
        if (!clash) break;
        reference = generateReference();
      }

      const [booking] = await tx
        .insert(bookings)
        .values({
          reference,
          tournamentId: t.id,
          playerId: player.id,
          fullName: input.fullName,
          email: input.email,
          phone: input.phone || null,
          places: input.places,
          message: input.message,
          status,
          idempotencyKey: input.idempotencyKey,
          publicName: input.publicName || null,
          showPublicly: input.showPublicly && !!input.publicName,
        })
        .returning();

      await insertSeats(tx, t.id, booking.id, seats);
      await writeAudit(tx, PUBLIC_ACTOR, {
        action: "booking.created",
        entityType: "booking",
        entityId: booking.id,
        bookingId: booking.id,
        details: { status, places: input.places, seats, tournament: t.name },
      });
      return { booking, tournament: t, seats, replayed: false };
    });
  } catch (err) {
    if ((err instanceof BookingError && err.message === "__replay__") || isUniqueViolation(err, "bookings_idempotency_key_unique")) {
      const again = await replay();
      if (again) return again;
    }
    if (isUniqueViolation(err, "seat_unique_per_tournament")) {
      throw new BookingError("SEAT_TAKEN", "Un des sièges choisis vient d'être réservé. Veuillez en choisir un autre.");
    }
    throw err;
  }
}

/* ───────────────────────────── Staff: status changes ──────────────────────── */

const ATTENDANCE: BookingStatus[] = ["attended", "no_show"];

export function allowedTransitions(from: BookingStatus, role: UserRole): BookingStatus[] {
  const checkIn: BookingStatus[] = from === "confirmed" ? ["attended", "no_show"] : ATTENDANCE.includes(from) ? (["confirmed", "attended", "no_show"] as BookingStatus[]).filter((s) => s !== from) : [];
  if (role === "staff") return checkIn;
  switch (from) {
    case "pending":
      return ["confirmed", "waitlisted", "rejected", "cancelled"];
    case "waitlisted":
      return ["confirmed", "pending", "rejected", "cancelled"];
    case "confirmed":
      return ["attended", "no_show", "waitlisted", "cancelled"];
    case "attended":
    case "no_show":
      return checkIn;
    case "cancelled":
    case "rejected":
      return ["pending", "confirmed", "waitlisted"];
  }
}

export async function changeBookingStatus(
  bookingId: string,
  to: BookingStatus,
  actor: Actor & { role: UserRole },
  opts: { note?: string; now?: Date } = {},
): Promise<{ booking: Booking; from: BookingStatus }> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!current) throw new BookingError("NOT_FOUND", "Réservation introuvable.");
    const t = await lockTournament(tx, current.tournamentId);
    if (!t) throw new BookingError("NOT_FOUND", "Tournoi introuvable.");
    // Re-read under the tournament lock to avoid acting on a stale status.
    const [b] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (b.status === to) return { booking: b, from: b.status };

    if (!allowedTransitions(b.status, actor.role).includes(to)) {
      throw new BookingError(
        actor.role === "staff" ? "FORBIDDEN" : "INVALID_TRANSITION",
        `Passage de « ${BOOKING_STATUS_LABELS[b.status]} » à « ${BOOKING_STATUS_LABELS[to]} » non autorisé.`,
      );
    }

    if (!countsTowardCapacity(b.status) && countsTowardCapacity(to)) {
      const taken = await takenPlaces(tx, t.id);
      if (taken + b.places > t.capacity) {
        throw new BookingError("FULL", `Capacité atteinte (${taken}/${t.capacity}). Augmentez la capacité ou libérez des places avant de confirmer.`, {
          taken,
          capacity: t.capacity,
        });
      }
    }

    if (countsTowardCapacity(b.status) && !countsTowardCapacity(to)) {
      await tx.delete(seatAssignments).where(eq(seatAssignments.bookingId, b.id));
    }

    const now = opts.now ?? new Date();
    const patch: Partial<Booking> = { status: to, updatedAt: now };
    if (to === "confirmed" && !b.confirmedAt) patch.confirmedAt = now;
    if (to === "cancelled" || to === "rejected") patch.cancelledAt = now;
    if (to === "attended") patch.checkedInAt = now;
    if (to === "pending" || to === "waitlisted") patch.cancelledAt = null;
    if (to === "confirmed" && ATTENDANCE.includes(b.status)) patch.checkedInAt = null;

    const [updated] = await tx.update(bookings).set(patch).where(eq(bookings.id, b.id)).returning();
    await writeAudit(tx, actor, {
      action: "booking.status_changed",
      entityType: "booking",
      entityId: b.id,
      bookingId: b.id,
      details: { from: b.status, to, note: opts.note || undefined },
    });
    return { booking: updated, from: b.status };
  });
}

/* ─────────────────────────────── Staff: editing ───────────────────────────── */

export type BookingEdit = { fullName: string; email: string; phone: string; places: number; message: string; staffNote: string };

export async function updateBookingDetails(bookingId: string, edit: BookingEdit, actor: Actor) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!current) throw new BookingError("NOT_FOUND", "Réservation introuvable.");
    const t = await lockTournament(tx, current.tournamentId);
    if (!t) throw new BookingError("NOT_FOUND", "Tournoi introuvable.");

    if (edit.places !== current.places && countsTowardCapacity(current.status)) {
      const others = await takenPlaces(tx, t.id, current.id);
      if (others + edit.places > t.capacity) {
        throw new BookingError("FULL", `Capacité insuffisante : ${t.capacity - others} place(s) disponible(s) pour cette réservation.`);
      }
    }
    const seatCount = await tx.select({ id: seatAssignments.id }).from(seatAssignments).where(eq(seatAssignments.bookingId, current.id));
    if (seatCount.length > edit.places) {
      throw new BookingError("SEAT_INVALID", "Libérez d'abord les sièges en trop avant de réduire le nombre de places.");
    }

    if (edit.email !== current.email && ACTIVE_REQUEST_STATUSES.includes(current.status)) {
      const [dup] = await tx
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(eq(bookings.tournamentId, t.id), eq(bookings.email, edit.email), inArray(bookings.status, ACTIVE_REQUEST_STATUSES), ne(bookings.id, current.id)))
        .limit(1);
      if (dup) throw new BookingError("DUPLICATE", "Une autre réservation active utilise déjà cet e-mail pour ce tournoi.");
    }

    let playerId = current.playerId;
    if (edit.email !== current.email) {
      const [p] = await tx
        .insert(players)
        .values({ email: edit.email, fullName: edit.fullName, phone: edit.phone || null })
        .onConflictDoUpdate({ target: players.email, set: { updatedAt: new Date() } })
        .returning();
      playerId = p.id;
    }

    const [updated] = await tx
      .update(bookings)
      .set({ ...edit, phone: edit.phone || null, playerId, updatedAt: new Date() })
      .where(eq(bookings.id, current.id))
      .returning();

    const changed = Object.fromEntries(
      (Object.keys(edit) as (keyof BookingEdit)[])
        .filter((k) => (current[k] ?? "") !== (edit[k] ?? ""))
        .map((k) => [k, { from: current[k], to: edit[k] }]),
    );
    await writeAudit(tx, actor, { action: "booking.updated", entityType: "booking", entityId: current.id, bookingId: current.id, details: changed });
    return updated;
  });
}

export async function setBookingSeats(bookingId: string, seats: SeatInput[], actor: Actor) {
  const db = await getDb();
  try {
    return await db.transaction(async (tx) => {
      const [current] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
      if (!current) throw new BookingError("NOT_FOUND", "Réservation introuvable.");
      const t = await lockTournament(tx, current.tournamentId);
      if (!t) throw new BookingError("NOT_FOUND", "Tournoi introuvable.");
      if (!countsTowardCapacity(current.status)) {
        throw new BookingError("INVALID_TRANSITION", "Seules les réservations actives peuvent recevoir un siège.");
      }
      if (seats.length > current.places) {
        throw new BookingError("SEAT_INVALID", `Cette réservation compte ${current.places} place(s) seulement.`);
      }
      validateSeats(t, seats);
      const before = await tx
        .select({ table: seatAssignments.tableNumber, seat: seatAssignments.seatNumber })
        .from(seatAssignments)
        .where(eq(seatAssignments.bookingId, current.id));
      await tx.delete(seatAssignments).where(eq(seatAssignments.bookingId, current.id));
      await insertSeats(tx, t.id, current.id, seats);
      await writeAudit(tx, actor, {
        action: "booking.seats_changed",
        entityType: "booking",
        entityId: current.id,
        bookingId: current.id,
        details: { from: before, to: seats },
      });
    });
  } catch (err) {
    if (isUniqueViolation(err, "seat_unique_per_tournament")) throw new BookingError("SEAT_TAKEN", "Ce siège est déjà occupé.");
    throw err;
  }
}

/**
 * Random seat draw for confirmed players without a seat, filling free seats
 * table by table in random order (balanced across tables).
 */
export async function drawSeats(tournamentId: string, actor: Actor): Promise<{ assigned: number; unassigned: number }> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const t = await lockTournament(tx, tournamentId);
    if (!t) throw new BookingError("NOT_FOUND", "Tournoi introuvable.");
    const active = await tx
      .select({ id: bookings.id, places: bookings.places })
      .from(bookings)
      .where(and(eq(bookings.tournamentId, t.id), eq(bookings.status, "confirmed")))
      .orderBy(asc(bookings.createdAt));
    const taken = await tx
      .select({ bookingId: seatAssignments.bookingId, table: seatAssignments.tableNumber, seat: seatAssignments.seatNumber })
      .from(seatAssignments)
      .where(eq(seatAssignments.tournamentId, t.id));
    const occupied = new Set(taken.map((s) => `${s.table}:${s.seat}`));
    const seatedPerBooking = new Map<string, number>();
    for (const s of taken) seatedPerBooking.set(s.bookingId, (seatedPerBooking.get(s.bookingId) ?? 0) + 1);

    // Free seats ordered round-robin across tables so tables fill evenly, then shuffled within rounds.
    const free: SeatInput[] = [];
    for (let seat = 1; seat <= t.seatsPerTable; seat++) {
      const round: SeatInput[] = [];
      for (let table = 1; table <= t.tableCount; table++) if (!occupied.has(`${table}:${seat}`)) round.push({ table, seat });
      for (let i = round.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [round[i], round[j]] = [round[j], round[i]];
      }
      free.push(...round);
    }
    // Shuffle seat numbers within each table so the draw is not "seat 1 first".
    const perTable = new Map<number, number[]>();
    for (const f of free) perTable.set(f.table, [...(perTable.get(f.table) ?? []), f.seat]);
    for (const seats of perTable.values()) {
      for (let i = seats.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [seats[i], seats[j]] = [seats[j], seats[i]];
      }
    }
    const cursor = new Map<number, number>();
    const pool = free.map((f) => {
      const idx = cursor.get(f.table) ?? 0;
      cursor.set(f.table, idx + 1);
      return { table: f.table, seat: perTable.get(f.table)![idx] };
    });

    const toInsert: { tournamentId: string; bookingId: string; tableNumber: number; seatNumber: number }[] = [];
    let unassigned = 0;
    for (const b of active) {
      const missing = b.places - (seatedPerBooking.get(b.id) ?? 0);
      for (let i = 0; i < missing; i++) {
        const s = pool.shift();
        if (!s) {
          unassigned++;
          continue;
        }
        toInsert.push({ tournamentId: t.id, bookingId: b.id, tableNumber: s.table, seatNumber: s.seat });
      }
    }
    if (toInsert.length) await tx.insert(seatAssignments).values(toInsert);
    await writeAudit(tx, actor, {
      action: "tournament.seats_drawn",
      entityType: "tournament",
      entityId: t.id,
      details: { assigned: toInsert.length, unassigned },
    });
    return { assigned: toInsert.length, unassigned };
  });
}

/* ────────────────────────── Player self-service (private link) ─────────────────── */

export const PLAYER_CANCELLABLE: BookingStatus[] = ["pending", "confirmed", "waitlisted"];

/** Whether the player may still cancel online (until the tournament starts). */
export function playerCanCancel(b: Pick<Booking, "status">, t: Pick<Tournament, "startsAt">, now = new Date()) {
  return PLAYER_CANCELLABLE.includes(b.status) && t.startsAt.getTime() > now.getTime();
}

export async function cancelByPlayer(bookingId: string, now = new Date()) {
  const db = await getDb();
  const [row] = await db
    .select({ booking: bookings, tournament: tournaments })
    .from(bookings)
    .innerJoin(tournaments, eq(bookings.tournamentId, tournaments.id))
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!row) throw new BookingError("NOT_FOUND", "Réservation introuvable.");
  if (!playerCanCancel(row.booking, row.tournament, now)) {
    throw new BookingError("INVALID_TRANSITION", "Cette réservation ne peut plus être annulée en ligne. Contactez-nous.");
  }
  return changeBookingStatus(bookingId, "cancelled", { id: null, label: `Joueur (${row.booking.email})`, role: "owner" }, { note: "Annulée par le joueur via son lien personnel", now });
}

export async function updatePublicProfile(bookingId: string, publicName: string, showPublicly: boolean) {
  const db = await getDb();
  const name = publicName.trim();
  const [b] = await db
    .update(bookings)
    .set({ publicName: name || null, showPublicly: showPublicly && !!name, updatedAt: new Date() })
    .where(eq(bookings.id, bookingId))
    .returning();
  if (!b) throw new BookingError("NOT_FOUND", "Réservation introuvable.");
  await writeAudit(db, { id: null, label: `Joueur (${b.email})` }, {
    action: "booking.updated",
    entityType: "booking",
    entityId: b.id,
    bookingId: b.id,
    details: { publicName: name, showPublicly: b.showPublicly },
  });
  return b;
}

/** Public counters and opted-in pseudonyms for a tournament (no personal data otherwise). */
export async function publicParticipants(tournamentId: string) {
  const db = await getDb();
  const rows = await db
    .select({
      status: bookings.status,
      places: bookings.places,
      publicName: bookings.publicName,
      showPublicly: bookings.showPublicly,
      at: bookings.confirmedAt,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .where(and(eq(bookings.tournamentId, tournamentId), inArray(bookings.status, ["pending", "confirmed", "attended", "no_show", "waitlisted"])))
    .orderBy(asc(bookings.confirmedAt), asc(bookings.createdAt));
  const registered = rows.filter((r) => r.status === "confirmed" || r.status === "attended" || r.status === "no_show");
  const sum = (list: typeof rows) => list.reduce((n, r) => n + r.places, 0);
  return {
    registered: sum(registered),
    reserved: sum(rows.filter((r) => r.status === "pending")),
    waiting: sum(rows.filter((r) => r.status === "waitlisted")),
    anonymous: sum(registered.filter((r) => !(r.showPublicly && r.publicName))),
    names: registered
      .filter((r) => r.showPublicly && r.publicName)
      .map((r) => (r.places > 1 ? `${r.publicName} (+${r.places - 1})` : r.publicName!)),
  };
}
