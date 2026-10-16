import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { createPglite, setDbForTests, type Database } from "@/lib/db";
import { tournaments, type NewTournament } from "@/lib/db/schema";
import { memoryOutbox } from "@/lib/email/mailer";
import type { BookingRequest } from "@/lib/validation";

export async function setupTestDb(): Promise<Database> {
  const db = await createPglite();
  setDbForTests(db);
  return db;
}

export async function resetDb(db: Database) {
  await db.execute(
    sql`truncate table tournament_results, seat_assignments, email_log, audit_log, bookings, players, tournaments, settings, sessions, users, rate_limits, media restart identity cascade`,
  );
  memoryOutbox().length = 0;
}

export async function makeTournament(db: Database, overrides: Partial<NewTournament> = {}) {
  const startsAt = overrides.startsAt ?? new Date(Date.now() + 7 * 24 * 3600 * 1000);
  const [t] = await db
    .insert(tournaments)
    .values({
      slug: `t-${randomUUID().slice(0, 8)}`,
      name: "Tournoi test",
      startsAt,
      capacity: 4,
      tableCount: 1,
      seatsPerTable: 9,
      maxPlacesPerBooking: 3,
      status: "published",
      ...overrides,
    })
    .returning();
  return t;
}

export function request(tournamentId: string, overrides: Partial<BookingRequest> = {}): BookingRequest {
  return {
    tournamentId,
    fullName: "Jeanne Test",
    email: `joueur-${randomUUID().slice(0, 8)}@example.ch`,
    phone: "",
    places: 1,
    message: "",
    seats: [],
    idempotencyKey: randomUUID(),
    acceptTerms: true,
    website: "",
    publicName: "",
    showPublicly: false,
    ...overrides,
  };
}

export const owner = { id: null, label: "Test owner", role: "owner" as const };
export const staff = { id: null, label: "Test staff", role: "staff" as const };
