/**
 * DEVELOPMENT ONLY — inserts sample tournaments (clearly marked as demo) into the
 * local embedded database so the public site can be previewed.
 *
 *   npm run db:seed-demo
 *
 * Refuses to run against a DATABASE_URL (production/staging) unless --force is passed.
 * Never creates bookings, players or statistics.
 */
import { like } from "drizzle-orm";
import { getDb } from "../lib/db";
import { tournaments } from "../lib/db/schema";
import { createTournament } from "../lib/tournaments";
import { zonedLocalToUtc, zonedDateKey } from "../lib/format";
import type { TournamentFields } from "../lib/validation";

async function main() {
  if (process.env.DATABASE_URL && !process.argv.includes("--force")) {
    throw new Error("DATABASE_URL est défini : le jeu de démonstration n'est destiné qu'à la base locale. Ajoutez --force si c'est voulu.");
  }
  const db = await getDb();
  const existing = await db.select({ id: tournaments.id }).from(tournaments).where(like(tournaments.description, "[Démo]%"));
  if (existing.length) {
    console.log(`Le jeu de démonstration est déjà présent (${existing.length} tournois).`);
    process.exit(0);
  }

  const day = (offset: number, time: string) => {
    const d = new Date(Date.now() + offset * 24 * 3600 * 1000);
    return zonedLocalToUtc(`${zonedDateKey(d)}T${time}`)!;
  };
  const base: Omit<TournamentFields, "name" | "startsAt" | "format" | "buyInCents" | "feeCents" | "capacity"> = {
    description: "[Démo] Tournoi de démonstration généré pour prévisualiser le site. À supprimer ou archiver avant la mise en ligne.",
    gameVariant: "No Limit Hold'em",
    endsAt: null,
    registrationOpensAt: null,
    registrationClosesAt: null,
    registrationMode: "auto",
    currency: "CHF",
    guaranteeCents: null,
    bountyCents: null,
    reentryCount: null,
    externalBookingUrl: null,
    reentryPriceCents: null,
    reentryFeeCents: null,
    levels: [
      { sb: 100, bb: 200, ante: null, minutes: 20 },
      { sb: 200, bb: 300, ante: 300, minutes: 20 },
      { sb: 200, bb: 400, ante: 400, minutes: 20 },
      { sb: 300, bb: 600, ante: 600, minutes: 20 },
      { sb: 0, bb: 0, ante: null, minutes: 15, isBreak: true, label: "Pause" },
      { sb: 400, bb: 800, ante: 800, minutes: 20 },
      { sb: 500, bb: 1000, ante: 1000, minutes: 20 },
      { sb: 600, bb: 1200, ante: 1200, minutes: 20 },
    ],
    startingStack: 30000,
    blindLevelMinutes: 20,
    blindStructure: "",
    lateRegistration: "Jusqu'à la fin du niveau 6",
    reentryPolicy: "",
    rules: "Règles TDA. Pièce d'identité obligatoire.",
    venue: "Salle principale",
    coverImageUrl: null,
    tableCount: 4,
    seatsPerTable: 9,
    tableLabels: [],
    maxPlacesPerBooking: 2,
    seatSelection: "owner",
    waitlistEnabled: true,
    featured: false,
    status: "published",
  };
  const actor = { id: null, label: "Script de démonstration" };
  const samples: Partial<TournamentFields>[] = [
    { name: "Le Royal", format: "Re-entry", startsAt: day(3, "14:00"), buyInCents: 10000, feeCents: 3000, capacity: 36, featured: true, reentryCount: 1, reentryPriceCents: 10000, reentryFeeCents: 3000, reentryPolicy: "1 re-entry jusqu'à la pause" },
    { name: "Road to Vegas — LP Series", format: "Re-entry", startsAt: day(6, "19:00"), buyInCents: 9000, feeCents: 2500, capacity: 27, reentryCount: 2 },
    { name: "Double-Chance", format: "Championnat", startsAt: day(8, "19:00"), buyInCents: 10000, feeCents: 3000, capacity: 9, seatSelection: "player", tableCount: 1 },
    { name: "Master Freezeout", format: "Freezeout", startsAt: day(16, "17:30"), buyInCents: 20000, feeCents: 4000, capacity: 36, featured: true, reentryCount: 0 },
    { name: "Bounty du jeudi", format: "Bounty", startsAt: day(21, "19:30"), buyInCents: 4000, bountyCents: 2000, feeCents: 1500, capacity: 18, tableCount: 2, reentryCount: 1 },
  ];
  for (const s of samples) {
    await createTournament({ ...base, ...s } as TournamentFields, actor);
  }
  console.log(`✓ ${samples.length} tournois de démonstration créés (description préfixée « [Démo] »).`);
  process.exit(0);
}

main().catch((err) => {
  console.error("✗", err instanceof Error ? err.message : err);
  process.exit(1);
});
