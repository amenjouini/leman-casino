import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "@/lib/db";
import { PAYOUT, SPOTS, SPOT_BY_ID, TABLE, numberRect, settle, spotAnchor, totalStake } from "@/lib/roulette-bets";
import { RED_NUMBERS } from "@/lib/roulette";
import { levelDurationLabel, parseLevelsText } from "@/lib/levels";
import { manageToken, verifyManageToken } from "@/lib/manage-link";
import { cancelByPlayer, changeBookingStatus, createBooking, publicParticipants, takenPlaces, updatePublicProfile } from "@/lib/bookings";
import { listPublishedResults, saveResults } from "@/lib/results";
import { makeTournament, owner, request, resetDb, setupTestDb } from "./helpers";

describe("tapis de roulette", () => {
  it("contient toutes les mises standard européennes", () => {
    const count = (k: string) => SPOTS.filter((s) => s.kind === k).length;
    expect(count("straight")).toBe(37);
    expect(count("split")).toBe(60); // 57 + 3 avec le zéro
    expect(count("street")).toBe(12);
    expect(count("corner")).toBe(22);
    expect(count("sixline")).toBe(11);
    expect(count("trio")).toBe(2);
    expect(count("dozen")).toBe(3);
    expect(count("column")).toBe(3);
    expect(SPOT_BY_ID.get("red")!.numbers.every((n) => RED_NUMBERS.has(n))).toBe(true);
    expect(SPOT_BY_ID.get("col:1")!.numbers).toEqual([1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]);
    expect(SPOT_BY_ID.get("corner:1-5")!.numbers).toEqual([1, 2, 4, 5]);
  });

  it("paie correctement chaque type de mise", () => {
    expect(settle({ "n:17": 10 }, 17)).toMatchObject({ staked: 10, returned: 360, net: 350 });
    expect(settle({ "split:17-20": 10 }, 20).returned).toBe(180);
    expect(settle({ "street:16": 10 }, 18).returned).toBe(120);
    expect(settle({ "corner:17-21": 10 }, 21).returned).toBe(90);
    expect(settle({ "six:16": 10 }, 21).returned).toBe(60);
    expect(settle({ "dozen:2": 10, "col:2": 10 }, 17).returned).toBe(60);
    expect(settle({ red: 10, black: 10 }, 0)).toMatchObject({ returned: 0, net: -20 });
    expect(settle({ "split:0-2": 5, "trio:0-1-2": 5 }, 0).returned).toBe(5 * 18 + 5 * 12);
    const mixed = settle({ red: 25, "n:3": 5, even: 10 }, 3);
    expect(mixed.winners.map((w) => w.id).sort()).toEqual(["n:3", "red"]);
    expect(mixed.losers).toEqual(["even"]);
    expect(totalStake({ a: 5, b: 25 })).toBe(30);
    expect(PAYOUT.straight).toBe(35);
  });

  it("place chaque mise combinée sur la ligne ou l'intersection correcte", () => {
    const c = (n: number) => {
      const r = numberRect(n);
      return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
    };
    expect(spotAnchor(SPOT_BY_ID.get("split:1-4")!)).toEqual({ x: (c(1).x + c(4).x) / 2, y: c(1).y });
    expect(spotAnchor(SPOT_BY_ID.get("corner:1-5")!)).toEqual({ x: TABLE.ZERO + TABLE.W, y: 2 * TABLE.H });
    expect(spotAnchor(SPOT_BY_ID.get("street:1")!).y).toBe(3 * TABLE.H);
    expect(spotAnchor(SPOT_BY_ID.get("split:0-3")!).x).toBe(TABLE.ZERO);
    // Hotspots never overlap (≥ 26 units apart, hotspot radius 13).
    const anchors = SPOTS.filter((s) => ["split", "corner", "street", "sixline", "trio"].includes(s.kind)).map(spotAnchor);
    for (let i = 0; i < anchors.length; i++)
      for (let j = i + 1; j < anchors.length; j++) expect(Math.hypot(anchors[i].x - anchors[j].x, anchors[i].y - anchors[j].y)).toBeGreaterThanOrEqual(26);
  });
});

describe("structures de blinds", () => {
  it("lit une structure collée (style check-raise)", () => {
    const { levels, errors } = parseLevelsText("1\t100\t200\t—\t18m\n2 100 300 — 18m\n4 300/600 300 18\nPause 15\n5\t500\t1 000\t500\t20m");
    expect(errors).toEqual([]);
    expect(levels[0]).toEqual({ sb: 100, bb: 200, ante: null, minutes: 18 });
    expect(levels[2]).toEqual({ sb: 300, bb: 600, ante: 300, minutes: 18 });
    expect(levels[3].isBreak).toBe(true);
    expect(levelDurationLabel(levels, null)).toBe("18-20");
    expect(levelDurationLabel([], 20)).toBe("20");
    expect(parseLevelsText("blabla").errors).toEqual([1]);
  });
});

describe("liens personnels", () => {
  it("signe et vérifie le lien de gestion", () => {
    const id = "6c1f7e0a-1b2c-4d5e-8f90-123456789abc";
    const token = manageToken(id)!;
    expect(verifyManageToken(token)).toBe(id);
    expect(verifyManageToken(token.slice(0, -1) + (token.endsWith("A") ? "B" : "A"))).toBeNull();
    expect(verifyManageToken(`6c1f7e0a-1b2c-4d5e-8f90-123456789abd.${token.split(".")[1]}`)).toBeNull();
    expect(verifyManageToken("n'importe quoi")).toBeNull();
  });
});

describe("inscrits publics, annulation joueur et résultats", () => {
  let db: Database;
  beforeAll(async () => {
    db = await setupTestDb();
  });
  beforeEach(async () => {
    await resetDb(db);
  });

  it("n'affiche que les pseudos des joueurs confirmés qui l'ont accepté", async () => {
    const t = await makeTournament(db, { capacity: 10 });
    const a = await createBooking(request(t.id, { publicName: "AceDuLac", showPublicly: true }));
    const b = await createBooking(request(t.id, { publicName: "Secret", showPublicly: false, fullName: "Nom Privé" }));
    await createBooking(request(t.id, { publicName: "EnAttente", showPublicly: true }));
    await changeBookingStatus(a.booking.id, "confirmed", owner);
    await changeBookingStatus(b.booking.id, "confirmed", owner);
    const p = await publicParticipants(t.id);
    expect(p).toMatchObject({ registered: 2, reserved: 1, waiting: 0, anonymous: 1, names: ["AceDuLac"] });
    expect(JSON.stringify(p)).not.toContain("Nom Privé");
    await updatePublicProfile(b.booking.id, "Secret", true);
    expect((await publicParticipants(t.id)).names).toEqual(["AceDuLac", "Secret"]);
  });

  it("le joueur annule via son lien tant que le tournoi n'a pas commencé", async () => {
    const t = await makeTournament(db, { capacity: 1 });
    const a = await createBooking(request(t.id));
    await changeBookingStatus(a.booking.id, "confirmed", owner);
    const res = await cancelByPlayer(a.booking.id);
    expect(res.booking.status).toBe("cancelled");
    expect(await takenPlaces(db, t.id)).toBe(0);
    await expect(cancelByPlayer(a.booking.id)).rejects.toThrow();
    const past = await makeTournament(db, { startsAt: new Date(Date.now() + 3600_000) });
    const b = await createBooking(request(past.id));
    await expect(cancelByPlayer(b.booking.id, new Date(Date.now() + 2 * 3600_000))).rejects.toThrow();
  });

  it("enregistre et publie un classement", async () => {
    const t = await makeTournament(db, { startsAt: new Date(Date.now() - 86400_000) });
    await saveResults(
      t.id,
      {
        entriesCount: 39,
        published: true,
        rows: [
          { displayName: "L'Apiculteur", prizeCents: 111000, deal: false, bookingId: null },
          { displayName: "", prizeCents: 68000, deal: true, bookingId: null },
        ],
      },
      owner,
    );
    const { items } = await listPublishedResults();
    expect(items).toHaveLength(1);
    expect(items[0].entriesCount).toBe(39);
    expect(items[0].results.map((r) => [r.rank, r.displayName, r.prizeCents, r.deal])).toEqual([
      [1, "L'Apiculteur", 111000, false],
      [2, "", 68000, true],
    ]);
    await saveResults(t.id, { entriesCount: 39, published: false, rows: [] }, owner);
    expect((await listPublishedResults()).items).toHaveLength(0);
  });
});
