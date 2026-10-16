import { randomUUID } from "node:crypto";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { tournaments, users, type BlindLevel } from "./db/schema";
import { createTournament } from "./tournaments";
import { changeBookingStatus, createBooking, drawSeats } from "./bookings";
import { saveResults } from "./results";
import { createUser } from "./users";
import { zonedDateKey, zonedLocalToUtc } from "./format";
import type { TournamentFields } from "./validation";

/**
 * Demo mode: the site fills itself with realistic sample data so a client can try
 * everything (public booking, admin, seating, results) without any setup.
 * Enabled with DEMO_MODE=true, and by default for the local embedded database.
 */
export function demoEnabled(): boolean {
  if (process.env.DEMO_MODE === "true") return true;
  if (process.env.DEMO_MODE === "false") return false;
  return !process.env.DATABASE_URL && process.env.NODE_ENV !== "production";
}

export const DEMO_ACCOUNTS = [
  { email: "proprietaire@demo.ch", name: "Propriétaire Démo", role: "owner" as const, password: "LemanDemo2026" },
  { email: "manager@demo.ch", name: "Responsable Démo", role: "manager" as const, password: "LemanDemo2026" },
  { email: "accueil@demo.ch", name: "Accueil Démo", role: "staff" as const, password: "LemanDemo2026" },
];

const actor = { id: null, label: "Démo automatique", role: "owner" as const };

const LEVELS: BlindLevel[] = [
  [100, 200, null, 20],
  [100, 300, null, 20],
  [200, 400, null, 20],
  [300, 600, 600, 20],
  [400, 800, 800, 20],
  [500, 1000, 1000, 20],
  "break",
  [600, 1200, 1200, 20],
  [800, 1600, 1600, 20],
  [1000, 2000, 2000, 20],
  [1500, 3000, 3000, 20],
  [2000, 4000, 4000, 20],
].map((l) => (l === "break" ? { sb: 0, bb: 0, ante: null, minutes: 15, isBreak: true, label: "Pause" } : { sb: l[0] as number, bb: l[1] as number, ante: l[2] as number | null, minutes: l[3] as number }));

const at = (daysFromNow: number, time: string) => zonedLocalToUtc(`${zonedDateKey(new Date(Date.now() + daysFromNow * 86400_000))}T${time}`)!;

function fields(over: Partial<TournamentFields> & Pick<TournamentFields, "name" | "startsAt">): TournamentFields {
  return {
    description: "Tournoi de démonstration : toutes les données de ce site sont fictives.",
    gameVariant: "No Limit Hold'em",
    format: "Re-entry",
    endsAt: null,
    registrationOpensAt: null,
    registrationClosesAt: null,
    registrationMode: "auto",
    currency: "CHF",
    buyInCents: 10000,
    feeCents: 3000,
    guaranteeCents: null,
    bountyCents: null,
    reentryCount: 1,
    reentryPriceCents: null,
    reentryFeeCents: null,
    externalBookingUrl: null,
    levels: LEVELS,
    startingStack: 30000,
    blindLevelMinutes: 20,
    blindStructure: "",
    lateRegistration: "Niv. 8",
    reentryPolicy: "",
    rules: "Règles TDA. Pièce d'identité obligatoire à l'accueil.",
    venue: "Salle principale",
    coverImageUrl: null,
    tableCount: 4,
    seatsPerTable: 9,
    tableLabels: [],
    capacity: 36,
    maxPlacesPerBooking: 2,
    seatSelection: "owner",
    waitlistEnabled: true,
    featured: false,
    status: "published",
    ...over,
  };
}

const FIRST = ["Luca", "Emma", "Noah", "Léa", "Matteo", "Chloé", "Julien", "Sara", "Yann", "Inès", "Marco", "Nina", "David", "Elena", "Rafael", "Zoé", "Hugo", "Lina", "Samuel", "Maya"];
const LAST = ["Rochat", "Favre", "Bonvin", "Perret", "Gilliéron", "Monnier", "Rossi", "Dubois", "Meylan", "Cretton", "Blanc", "Morel"];
const PSEUDOS = ["AceDuLac", "RiverKing", "Kingston", "LaCagoule", "BluffMaster", "ChipLeader", "LémanShark", "PocketRockets", "Darkasad", "Nuts", "", "", ""];

/** Creates `n` requests, confirming the first `confirm` and leaving the rest pending/waitlisted. */
async function fillTournament(tournamentId: string, n: number, confirm: number, offset: number, playerSeats = false) {
  for (let i = 0; i < n; i++) {
    const k = offset + i;
    const first = FIRST[k % FIRST.length];
    const last = LAST[(k * 7) % LAST.length];
    const pseudo = PSEUDOS[k % PSEUDOS.length];
    try {
      const r = await createBooking({
        tournamentId,
        fullName: `${first} ${last}`,
        email: `${first}.${last}.${k}@exemple-demo.ch`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""),
        phone: `+41 79 ${String(100 + k).padStart(3, "0")} ${String(10 + (k % 89)).padStart(2, "0")} ${String(20 + (k % 79)).padStart(2, "0")}`,
        places: 1,
        message: k % 6 === 0 ? "Première participation, merci !" : "",
        seats: playerSeats ? [{ table: 1, seat: i + 1 }] : [],
        idempotencyKey: randomUUID(),
        acceptTerms: true,
        website: "",
        publicName: pseudo,
        showPublicly: !!pseudo,
      });
      if (i < confirm && r.booking.status === "pending") await changeBookingStatus(r.booking.id, "confirmed", actor);
    } catch {
      /* full tournament without waitlist, etc. */
    }
  }
}

async function seedTournaments() {
  const created = [
    await createTournament(fields({ name: "Le Royal", startsAt: at(1, "19:00"), featured: true, guaranteeCents: 300000 }), actor),
    await createTournament(fields({ name: "Bounty du jeudi", format: "Bounty", startsAt: at(2, "19:30"), buyInCents: 5000, bountyCents: 4000, feeCents: 2000, capacity: 27, tableCount: 3 }), actor),
    await createTournament(fields({ name: "Double-Chance", format: "Championnat", startsAt: at(4, "19:00"), capacity: 9, tableCount: 1, seatSelection: "player", reentryCount: 2 }), actor),
    await createTournament(fields({ name: "Sunday Deepstack", format: "Deepstack", startsAt: at(6, "15:00"), startingStack: 50000, buyInCents: 15000, feeCents: 3000, capacity: 45, tableCount: 5, featured: true }), actor),
    await createTournament(fields({ name: "Master Freezeout", format: "Freezeout", reentryCount: 0, startsAt: at(9, "17:30"), buyInCents: 20000, feeCents: 4000 }), actor),
    await createTournament(fields({ name: "Turbo du mardi", format: "Turbo", startsAt: at(12, "20:00"), buyInCents: 4000, feeCents: 1000, capacity: 27, tableCount: 3, levels: LEVELS.map((l) => ({ ...l, minutes: l.isBreak ? 10 : 12 })) }), actor),
    await createTournament(fields({ name: "Léman Main Event", format: "Championnat", startsAt: at(20, "14:00"), buyInCents: 30000, feeCents: 5000, startingStack: 60000, capacity: 72, tableCount: 8, guaranteeCents: 1500000, registrationOpensAt: at(3, "10:00"), featured: true }), actor),
  ];
  // Realistic filling: almost full, full with waitlist, half full…
  await fillTournament(created[0].id, 30, 26, 0);
  await fillTournament(created[1].id, 11, 8, 30);
  await fillTournament(created[2].id, 11, 9, 41, true);
  await fillTournament(created[3].id, 14, 10, 52);
  await fillTournament(created[4].id, 6, 3, 66);
  await drawSeats(created[0].id, actor);
  return created;
}

async function seedPastResults() {
  const past = await createTournament(fields({ name: "Sunday Friends", startsAt: at(-3, "15:00"), reentryCount: 2, buyInCents: 7500, feeCents: 2500, capacity: 60, tableCount: 7, seatsPerTable: 9 }), actor);
  await saveResults(
    past.id,
    {
      entriesCount: 74,
      published: true,
      rows: [
        { displayName: "PandaPower", prizeCents: 152000, deal: true, bookingId: null },
        { displayName: "RiverKing", prizeCents: 152000, deal: true, bookingId: null },
        { displayName: "Mario V.", prizeCents: 98000, deal: false, bookingId: null },
        { displayName: "", prizeCents: 64000, deal: false, bookingId: null },
        { displayName: "Rive", prizeCents: 42000, deal: false, bookingId: null },
        { displayName: "LémanShark", prizeCents: 30000, deal: false, bookingId: null },
      ],
    },
    actor,
  );
  const past2 = await createTournament(fields({ name: "Bounty Night", format: "Bounty", startsAt: at(-8, "19:30"), buyInCents: 5000, bountyCents: 4000, feeCents: 2000, capacity: 27, tableCount: 3 }), actor);
  await saveResults(
    past2.id,
    {
      entriesCount: 31,
      published: true,
      rows: [
        { displayName: "BluffMaster", prizeCents: 86000, deal: false, bookingId: null },
        { displayName: "Nuts", prizeCents: 52000, deal: false, bookingId: null },
        { displayName: "Chloé M.", prizeCents: 31000, deal: false, bookingId: null },
      ],
    },
    actor,
  );
}

let running: Promise<void> | null = null;

/**
 * Idempotent: creates demo accounts if no account exists, and tournaments whenever the
 * calendar has nothing coming up (so a long-running demo never looks empty).
 */
export function ensureDemoData(): Promise<void> {
  running ??= (async () => {
    const db = await getDb();
    const [{ n: userCount }] = await db.select({ n: count() }).from(users);
    if (Number(userCount) === 0) for (const a of DEMO_ACCOUNTS) await createUser(a);
    const [{ n: upcoming }] = await db
      .select({ n: count() })
      .from(tournaments)
      .where(and(eq(tournaments.status, "published"), gte(tournaments.startsAt, new Date())));
    if (Number(upcoming) === 0) {
      const [{ n: any }] = await db.select({ n: count() }).from(tournaments);
      await seedTournaments();
      if (Number(any) === 0) await seedPastResults();
    }
  })().finally(() => {
    running = null;
  });
  return running;
}

/** Wipes every booking, tournament, player and log, then re-seeds (accounts are kept). */
export async function resetDemo() {
  const db = await getDb();
  await db.execute(
    sql`truncate table tournament_results, seat_assignments, email_log, audit_log, bookings, players, tournaments, rate_limits, media restart identity cascade`,
  );
  await ensureDemoData();
}
