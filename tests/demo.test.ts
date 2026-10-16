import { beforeAll, describe, expect, it } from "vitest";
import { count } from "drizzle-orm";
import { bookings, tournaments, tournamentResults, users } from "@/lib/db/schema";
import { ensureDemoData, resetDemo } from "@/lib/demo";
import { listPublicTournaments } from "@/lib/tournaments";
import { authenticate } from "@/lib/users";
import { setupTestDb } from "./helpers";
import type { Database } from "@/lib/db";

let db: Database;
beforeAll(async () => {
  db = await setupTestDb();
});
const n = async (t: typeof users | typeof tournaments | typeof bookings | typeof tournamentResults) => Number((await db.select({ n: count() }).from(t))[0].n);

describe("mode démo", () => {
  it("génère une démo complète et ne la duplique pas", async () => {
    await ensureDemoData();
    expect(await n(users)).toBe(3);
    expect(await authenticate("proprietaire@demo.ch", "LemanDemo2026")).not.toBeNull();
    const upcoming = await listPublicTournaments();
    expect(upcoming.length).toBeGreaterThanOrEqual(6);
    expect(upcoming.some((t) => t.availability.state === "waitlist")).toBe(true);
    expect(upcoming.some((t) => t.availability.state === "not_yet_open")).toBe(true);
    expect(await n(bookings)).toBeGreaterThan(50);
    expect(await n(tournamentResults)).toBe(9);
    const before = await n(tournaments);
    await ensureDemoData();
    expect(await n(tournaments)).toBe(before);
  });
  it("se réinitialise en gardant les comptes", async () => {
    await resetDemo();
    expect(await n(users)).toBe(3);
    expect(await n(tournamentResults)).toBe(9);
  });
});
