import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { auditLog, bookings, players, seatAssignments } from "@/lib/db/schema";
import { BookingError, changeBookingStatus, createBooking, drawSeats, setBookingSeats, takenPlaces, updateBookingDetails } from "@/lib/bookings";
import { listPublicTournaments, updateTournament } from "@/lib/tournaments";
import { saveSettings, BOOKING_DEFAULTS } from "@/lib/settings";
import { bookingRequestSchema } from "@/lib/validation";
import { makeTournament, owner, request, resetDb, setupTestDb, staff } from "./helpers";

let db: Database;
beforeAll(async () => {
  db = await setupTestDb();
});
beforeEach(async () => {
  await resetDb(db);
});

const codeOf = async (p: Promise<unknown>) => {
  try {
    await p;
    return null;
  } catch (e) {
    return e instanceof BookingError ? e.code : (e as Error).message;
  }
};

describe("création de réservation", () => {
  it("crée une réservation persistante, en attente, avec référence et joueur", async () => {
    const t = await makeTournament(db);
    const { booking, replayed } = await createBooking(request(t.id, { email: "a@example.ch", places: 2 }));
    expect(replayed).toBe(false);
    expect(booking.status).toBe("pending");
    expect(booking.reference).toMatch(/^LM-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    const [row] = await db.select().from(bookings).where(eq(bookings.id, booking.id));
    expect(row.places).toBe(2);
    const [p] = await db.select().from(players).where(eq(players.email, "a@example.ch"));
    expect(p.fullName).toBe("Jeanne Test");
    const audit = await db.select().from(auditLog).where(eq(auditLog.bookingId, booking.id));
    expect(audit.map((a) => a.action)).toContain("booking.created");
  });

  it("rejoue une soumission répétée (même clé) sans créer de doublon", async () => {
    const t = await makeTournament(db);
    const req = request(t.id);
    const first = await createBooking(req);
    const second = await createBooking(req);
    expect(second.replayed).toBe(true);
    expect(second.booking.id).toBe(first.booking.id);
    expect(await db.select().from(bookings)).toHaveLength(1);
  });

  it("gère des soumissions simultanées identiques sans doublon", async () => {
    const t = await makeTournament(db);
    const req = request(t.id);
    const results = await Promise.all([createBooking(req), createBooking(req), createBooking(req)]);
    expect(new Set(results.map((r) => r.booking.id)).size).toBe(1);
    expect(await db.select().from(bookings)).toHaveLength(1);
  });

  it("refuse une deuxième demande active avec le même e-mail", async () => {
    const t = await makeTournament(db);
    await createBooking(request(t.id, { email: "dup@example.ch" }));
    expect(await codeOf(createBooking(request(t.id, { email: "dup@example.ch" })))).toBe("DUPLICATE");
  });

  it("ne dépasse jamais la capacité, même en concurrence, puis bascule en liste d'attente", async () => {
    const t = await makeTournament(db, { capacity: 3, maxPlacesPerBooking: 1 });
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => createBooking(request(t.id))));
    const ok = results.filter((r) => r.status === "fulfilled").map((r) => (r as PromiseFulfilledResult<Awaited<ReturnType<typeof createBooking>>>).value);
    expect(ok.filter((r) => r.booking.status === "pending")).toHaveLength(3);
    expect(ok.filter((r) => r.booking.status === "waitlisted")).toHaveLength(5);
    expect(await takenPlaces(db, t.id)).toBe(3);
  });

  it("refuse quand c'est complet et que la liste d'attente est désactivée", async () => {
    const t = await makeTournament(db, { capacity: 1, waitlistEnabled: false });
    await createBooking(request(t.id));
    expect(await codeOf(createBooking(request(t.id)))).toBe("FULL");
  });

  it("refuse plus de places que celles restantes", async () => {
    const t = await makeTournament(db, { capacity: 3 });
    await createBooking(request(t.id, { places: 2 }));
    expect(await codeOf(createBooking(request(t.id, { places: 2 })))).toBe("NOT_ENOUGH_SEATS");
  });

  it("refuse un nombre de places supérieur au maximum par réservation", async () => {
    const t = await makeTournament(db, { capacity: 10, maxPlacesPerBooking: 2 });
    expect(await codeOf(createBooking(request(t.id, { places: 3 })))).toBe("TOO_MANY_PLACES");
  });

  it("refuse les tournois non publiés, clos ou pas encore ouverts", async () => {
    const draft = await makeTournament(db, { status: "draft" });
    expect(await codeOf(createBooking(request(draft.id)))).toBe("NOT_FOUND");
    const closed = await makeTournament(db, { registrationMode: "closed" });
    expect(await codeOf(createBooking(request(closed.id)))).toBe("CLOSED");
    const later = await makeTournament(db, { registrationOpensAt: new Date(Date.now() + 3 * 24 * 3600 * 1000) });
    expect(await codeOf(createBooking(request(later.id)))).toBe("CLOSED");
    const past = await makeTournament(db, { startsAt: new Date(Date.now() - 3600 * 1000) });
    expect(await codeOf(createBooking(request(past.id)))).toBe("CLOSED");
  });

  it("exige le téléphone lorsque le propriétaire l'a rendu obligatoire", async () => {
    await saveSettings("booking", { ...BOOKING_DEFAULTS, requirePhone: true }, null, db);
    const t = await makeTournament(db);
    expect(await codeOf(createBooking(request(t.id)))).toBe("PHONE_REQUIRED");
    const ok = await createBooking(request(t.id, { phone: "+41 21 000 00 00" }));
    expect(ok.booking.phone).toBe("+41 21 000 00 00");
  });
});

describe("validation des entrées", () => {
  it("rejette les requêtes invalides", () => {
    const base = request("00000000-0000-4000-8000-000000000000");
    expect(bookingRequestSchema.safeParse({ ...base, email: "pas-un-email" }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...base, fullName: "A" }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...base, places: 0 }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...base, acceptTerms: false }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...base, website: "spam" }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...base, tournamentId: "1; drop table" }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...base, phone: "<script>" }).success).toBe(false);
  });

  it("normalise l'e-mail et retire les caractères de contrôle", () => {
    const parsed = bookingRequestSchema.parse({
      ...request("00000000-0000-4000-8000-000000000000"),
      email: "  Joueur@Example.CH ",
      fullName: "  Jean\u0000 Dupont ",
    });
    expect(parsed.email).toBe("joueur@example.ch");
    expect(parsed.fullName).toBe("Jean Dupont");
  });
});

describe("sièges", () => {
  it("le joueur choisit ses sièges ; deux réservations ne peuvent pas partager un siège", async () => {
    const t = await makeTournament(db, { seatSelection: "player", tableCount: 2, seatsPerTable: 6, capacity: 12 });
    await createBooking(request(t.id, { seats: [{ table: 1, seat: 3 }] }));
    expect(await codeOf(createBooking(request(t.id, { seats: [{ table: 1, seat: 3 }] })))).toBe("SEAT_TAKEN");
    expect(await codeOf(createBooking(request(t.id, { seats: [] })))).toBe("SEATS_REQUIRED");
    expect(await codeOf(createBooking(request(t.id, { seats: [{ table: 3, seat: 1 }] })))).toBe("SEAT_INVALID");
  });

  it("conflits de sièges simultanés : un seul gagnant", async () => {
    const t = await makeTournament(db, { seatSelection: "player", capacity: 9 });
    const results = await Promise.allSettled(Array.from({ length: 5 }, () => createBooking(request(t.id, { seats: [{ table: 1, seat: 5 }] }))));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.select().from(seatAssignments)).toHaveLength(1);
  });

  it("l'équipe assigne des sièges sans conflit et les libère à l'annulation", async () => {
    const t = await makeTournament(db, { capacity: 4 });
    const a = await createBooking(request(t.id));
    const b = await createBooking(request(t.id));
    await setBookingSeats(a.booking.id, [{ table: 1, seat: 2 }], owner);
    expect(await codeOf(setBookingSeats(b.booking.id, [{ table: 1, seat: 2 }], owner))).toBe("SEAT_TAKEN");
    await changeBookingStatus(a.booking.id, "cancelled", owner);
    expect(await db.select().from(seatAssignments)).toHaveLength(0);
    await setBookingSeats(b.booking.id, [{ table: 1, seat: 2 }], owner);
  });

  it("le tirage au sort assigne les joueurs confirmés sans doublon", async () => {
    const t = await makeTournament(db, { capacity: 6, tableCount: 2, seatsPerTable: 3 });
    for (let i = 0; i < 5; i++) {
      const r = await createBooking(request(t.id));
      await changeBookingStatus(r.booking.id, "confirmed", owner);
    }
    const res = await drawSeats(t.id, owner);
    expect(res).toEqual({ assigned: 5, unassigned: 0 });
    const seats = await db.select().from(seatAssignments);
    expect(new Set(seats.map((s) => `${s.tableNumber}:${s.seatNumber}`)).size).toBe(5);
    const perTable = [1, 2].map((n) => seats.filter((s) => s.tableNumber === n).length);
    expect(Math.abs(perTable[0] - perTable[1])).toBeLessThanOrEqual(1);
  });
});

describe("gestion des statuts", () => {
  it("confirme, refuse et journalise chaque changement", async () => {
    const t = await makeTournament(db);
    const a = await createBooking(request(t.id));
    const res = await changeBookingStatus(a.booking.id, "confirmed", owner);
    expect(res.booking.status).toBe("confirmed");
    expect(res.booking.confirmedAt).toBeInstanceOf(Date);
    const b = await createBooking(request(t.id));
    await changeBookingStatus(b.booking.id, "rejected", owner, { note: "Test" });
    const audit = await db.select().from(auditLog).where(eq(auditLog.action, "booking.status_changed"));
    expect(audit).toHaveLength(2);
    expect(audit.find((x) => x.bookingId === b.booking.id)?.details).toMatchObject({ from: "pending", to: "rejected", note: "Test" });
  });

  it("ne confirme pas une liste d'attente si la capacité est atteinte", async () => {
    const t = await makeTournament(db, { capacity: 1 });
    await createBooking(request(t.id));
    const w = await createBooking(request(t.id));
    expect(w.booking.status).toBe("waitlisted");
    expect(await codeOf(changeBookingStatus(w.booking.id, "confirmed", owner))).toBe("FULL");
  });

  it("libère une place à l'annulation, ce qui permet de confirmer la liste d'attente", async () => {
    const t = await makeTournament(db, { capacity: 1 });
    const a = await createBooking(request(t.id));
    const w = await createBooking(request(t.id));
    await changeBookingStatus(a.booking.id, "cancelled", owner);
    const res = await changeBookingStatus(w.booking.id, "confirmed", owner);
    expect(res.booking.status).toBe("confirmed");
  });

  it("le personnel d'accueil ne peut que pointer la présence", async () => {
    const t = await makeTournament(db);
    const a = await createBooking(request(t.id));
    expect(await codeOf(changeBookingStatus(a.booking.id, "confirmed", staff))).toBe("FORBIDDEN");
    await changeBookingStatus(a.booking.id, "confirmed", owner);
    const res = await changeBookingStatus(a.booking.id, "attended", staff);
    expect(res.booking.status).toBe("attended");
    expect(res.booking.checkedInAt).toBeInstanceOf(Date);
    const noShow = await changeBookingStatus(a.booking.id, "no_show", staff);
    expect(noShow.booking.status).toBe("no_show");
  });

  it("refuse les transitions incohérentes", async () => {
    const t = await makeTournament(db);
    const a = await createBooking(request(t.id));
    expect(await codeOf(changeBookingStatus(a.booking.id, "attended", owner))).toBe("INVALID_TRANSITION");
  });

  it("modification : respecte la capacité et journalise les changements", async () => {
    const t = await makeTournament(db, { capacity: 3 });
    const a = await createBooking(request(t.id));
    await createBooking(request(t.id, { places: 2 }));
    expect(
      await codeOf(updateBookingDetails(a.booking.id, { fullName: "X Y", email: a.booking.email, phone: "", places: 2, message: "", staffNote: "" }, owner)),
    ).toBe("FULL");
    const u = await updateBookingDetails(a.booking.id, { fullName: "Nom Corrigé", email: a.booking.email, phone: "", places: 1, message: "", staffNote: "VIP" }, owner);
    expect(u.fullName).toBe("Nom Corrigé");
  });
});

describe("tournois", () => {
  it("interdit de réduire la capacité sous les places prises", async () => {
    const t = await makeTournament(db, { capacity: 4 });
    await createBooking(request(t.id, { places: 3 }));
    const fields = {
      name: t.name,
      description: "",
      gameVariant: t.gameVariant,
      format: t.format,
      startsAt: t.startsAt,
      endsAt: null,
      registrationOpensAt: null,
      registrationClosesAt: null,
      registrationMode: "auto" as const,
      currency: "CHF",
      buyInCents: null,
      feeCents: null,
      guaranteeCents: null,
      bountyCents: null,
      reentryCount: null,
      externalBookingUrl: null,
      reentryPriceCents: null,
      reentryFeeCents: null,
      levels: [],
      startingStack: null,
      blindLevelMinutes: null,
      blindStructure: "",
      lateRegistration: "",
      reentryPolicy: "",
      rules: "",
      venue: "",
      coverImageUrl: null,
      tableCount: 1,
      seatsPerTable: 9,
      tableLabels: [],
      capacity: 2,
      maxPlacesPerBooking: 1,
      seatSelection: "owner" as const,
      waitlistEnabled: true,
      featured: false,
      status: "published" as const,
    };
    expect(await codeOf(updateTournament(t.id, fields, owner))).toBe("FULL");
    const ok = await updateTournament(t.id, { ...fields, capacity: 5 }, owner);
    expect(ok.capacity).toBe(5);
  });
});

describe("inscriptions externes et filtres", () => {
  it("refuse les demandes quand le tournoi est géré sur une plateforme externe", async () => {
    const t = await makeTournament(db, { externalBookingUrl: "https://check-raise.ch/" });
    expect(await codeOf(createBooking(request(t.id)))).toBe("CLOSED");
  });

  it("filtre par type, buy-in (+ bounty) et joueurs inscrits", async () => {
    const a = await makeTournament(db, { name: "RE", reentryCount: 2, buyInCents: 10000, feeCents: 3000, capacity: 10 });
    await makeTournament(db, { name: "FO", reentryCount: 0, buyInCents: 20000, feeCents: 4000, capacity: 10 });
    await makeTournament(db, { name: "KO", format: "Bounty", buyInCents: 4000, bountyCents: 4000, feeCents: 1000, capacity: 10 });
    await createBooking(request(a.id, { places: 3 }));
    const names = async (f: Parameters<typeof listPublicTournaments>[0]) => (await listPublicTournaments(f)).map((t) => t.name).sort();
    expect(await names({ type: "reentry" })).toEqual(["RE"]);
    expect(await names({ type: "freezeout" })).toEqual(["FO"]);
    expect(await names({ buyInMin: 8000, buyInMax: 10000 })).toEqual(["KO", "RE"]);
    expect(await names({ playersMin: 1 })).toEqual(["RE"]);
    expect(await names({ playersMax: 0 })).toEqual(["FO", "KO"]);
  });
});
