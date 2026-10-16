import { describe, expect, it } from "vitest";
import { computeAvailability } from "@/lib/availability";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/auth/password";
import { can } from "@/lib/auth/permissions";
import { formatBuyIn, formatEntry, formatStack, zonedLocalToUtc, toDateTimeLocalValue, slugify } from "@/lib/format";
import { entryType, isBounty } from "@/lib/tournament-meta";
import { escapeHtml, fillTemplate } from "@/lib/email/render";
import { parseMoneyToCents } from "@/lib/validation";
import { toCsv } from "@/lib/csv";

const base = {
  capacity: 10,
  startsAt: new Date("2030-06-01T17:00:00Z"),
  endsAt: null,
  registrationOpensAt: null,
  registrationClosesAt: null,
  registrationMode: "auto" as const,
  waitlistEnabled: true,
};
const now = new Date("2030-05-20T10:00:00Z");

describe("disponibilité", () => {
  it("ouvert / presque complet / liste d'attente / complet", () => {
    expect(computeAvailability(base, 0, now).state).toBe("open");
    expect(computeAvailability(base, 8, now).state).toBe("almost_full");
    expect(computeAvailability(base, 10, now)).toMatchObject({ state: "waitlist", canRequest: true, waitlistOnly: true });
    expect(computeAvailability({ ...base, waitlistEnabled: false }, 10, now)).toMatchObject({ state: "full", canRequest: false });
  });
  it("fenêtres d'inscription et mode manuel", () => {
    expect(computeAvailability({ ...base, registrationOpensAt: new Date("2030-05-25T00:00:00Z") }, 0, now).state).toBe("not_yet_open");
    expect(computeAvailability({ ...base, registrationClosesAt: new Date("2030-05-19T00:00:00Z") }, 0, now).state).toBe("closed");
    expect(computeAvailability({ ...base, registrationMode: "closed" }, 0, now).state).toBe("closed");
    expect(computeAvailability({ ...base, registrationMode: "open", registrationClosesAt: new Date("2030-05-19T00:00:00Z") }, 0, now).state).toBe("open");
    expect(computeAvailability(base, 0, new Date("2030-06-02T00:00:00Z")).state).toBe("finished");
  });
});

describe("authentification", () => {
  it("hache et vérifie les mots de passe", async () => {
    const h = await hashPassword("motdepasse123");
    expect(h).not.toContain("motdepasse123");
    expect(await verifyPassword("motdepasse123", h)).toBe(true);
    expect(await verifyPassword("mauvais12345", h)).toBe(false);
    expect(passwordProblem("court1")).not.toBeNull();
    expect(passwordProblem("unbonmotdepasse2")).toBeNull();
  });
  it("droits par rôle", () => {
    expect(can("owner", "settings.manage")).toBe(true);
    expect(can("manager", "settings.manage")).toBe(false);
    expect(can("manager", "tournaments.manage")).toBe(true);
    expect(can("staff", "bookings.checkin")).toBe(true);
    expect(can("staff", "bookings.manage")).toBe(false);
    expect(can("staff", "bookings.export")).toBe(false);
    expect(can(null, "dashboard.view")).toBe(false);
  });
});

describe("formats", () => {
  it("convertit l'heure de Zurich en UTC (été et hiver)", () => {
    expect(zonedLocalToUtc("2030-07-01T19:00")?.toISOString()).toBe("2030-07-01T17:00:00.000Z");
    expect(zonedLocalToUtc("2030-01-15T19:00")?.toISOString()).toBe("2030-01-15T18:00:00.000Z");
    expect(toDateTimeLocalValue(new Date("2030-07-01T17:00:00Z"))).toBe("2030-07-01T19:00");
    expect(zonedLocalToUtc("n'importe quoi")).toBeNull();
  });
  it("montants et slugs", () => {
    expect(parseMoneyToCents("130")).toBe(13000);
    expect(parseMoneyToCents("12,50")).toBe(1250);
    expect(parseMoneyToCents("")).toBeNull();
    expect(parseMoneyToCents("-3")).toBe("invalid");
    expect(formatBuyIn(10000, 3000, "CHF")).toBe("CHF 100 + 30");
    expect(slugify("Le Royal – 100k Élite!")).toBe("le-royal-100k-elite");
  });
  it("modèles d'e-mails et échappement", () => {
    expect(fillTemplate("Bonjour {{nom}}, {{inconnu}}réf. {{reference}}", { nom: "Ana", reference: "LM-1" })).toBe("Bonjour Ana, réf. LM-1");
    expect(escapeHtml(`<img src=x onerror="alert(1)">`)).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });
  it("CSV : échappe les guillemets et neutralise les formules", () => {
    const csv = toCsv(["a", "b"], [["x,y", '=HYPERLINK("evil")'], ['dit "oui"', "+41 21"]]);
    expect(csv).toContain('"x,y"');
    expect(csv).toContain(`"'=HYPERLINK(""evil"")"`);
    expect(csv).toContain('"dit ""oui"""');
    expect(csv).toContain("'+41 21");
  });
});

describe("structure d'entrée (style check-raise)", () => {
  it("affiche buy-in + bounty + frais et les tapis", () => {
    expect(formatEntry({ buyInCents: 9000, bountyCents: 6000, feeCents: 3500, currency: "CHF" })).toBe("CHF 90 + 60 + 35");
    expect(formatEntry({ buyInCents: 10000, feeCents: 3000, currency: "CHF" })).toBe("CHF 100 + 30");
    expect(formatEntry({ buyInCents: null, feeCents: null, currency: "CHF" })).toBe("Entrée libre");
    expect(formatStack(30000)).toBe("30K");
    expect(formatStack(1500000)).toBe("1.5M");
  });
  it("déduit re-entry / freezeout / bounty", () => {
    expect(entryType({ reentryCount: 2, format: "Freezeout", buyInCents: 1 })).toBe("reentry");
    expect(entryType({ reentryCount: 0, format: "Re-entry", buyInCents: 1 })).toBe("freezeout");
    expect(entryType({ reentryCount: null, format: "Re-entry", buyInCents: 1 })).toBe("reentry");
    expect(entryType({ reentryCount: null, format: "Deepstack", buyInCents: 1 })).toBeNull();
    expect(isBounty({ reentryCount: null, format: "Deepstack", bountyCents: 2000, buyInCents: 1 })).toBe(true);
  });
});
