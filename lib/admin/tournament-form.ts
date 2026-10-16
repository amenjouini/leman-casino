import { parseMoneyToCents, tournamentFieldsSchema, fieldErrors, type TournamentFields } from "../validation";
import { zonedLocalToUtc } from "../format";
import { bool, intOrNull, str } from "./action";

function parseLevelsJson(raw: string, errors: Record<string, string>) {
  if (!raw.trim()) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    errors.levels = "Structure des blinds illisible.";
    return [];
  }
}

const trimTrailingEmpty = (list: string[]) => {
  const out = [...list];
  while (out.length && out[out.length - 1] === "") out.pop();
  return out;
};

/** Converts the admin tournament form into validated fields (or field errors). */
export function parseTournamentForm(fd: FormData): { fields: TournamentFields } | { errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  const date = (key: string, required = false) => {
    const raw = str(fd, key);
    if (!raw) {
      if (required) errors[key] = "Date requise";
      return null;
    }
    const d = zonedLocalToUtc(raw);
    if (!d) errors[key] = "Date invalide";
    return d;
  };
  const money = (key: string) => {
    const v = parseMoneyToCents(str(fd, key));
    if (v === "invalid") {
      errors[key] = "Montant invalide (ex. 130 ou 12.50)";
      return null;
    }
    return v;
  };
  const integer = (key: string, fallback?: number) => {
    const v = intOrNull(fd, key);
    if (v !== null && Number.isNaN(v)) {
      errors[key] = "Nombre entier attendu";
      return fallback ?? null;
    }
    return v ?? fallback ?? null;
  };

  const candidate = {
    name: str(fd, "name"),
    description: str(fd, "description"),
    gameVariant: str(fd, "gameVariant"),
    format: str(fd, "format"),
    startsAt: date("startsAt", true),
    endsAt: date("endsAt"),
    registrationOpensAt: date("registrationOpensAt"),
    registrationClosesAt: date("registrationClosesAt"),
    registrationMode: str(fd, "registrationMode") || "auto",
    currency: str(fd, "currency") || "CHF",
    buyInCents: money("buyIn"),
    feeCents: money("fee"),
    guaranteeCents: money("guarantee"),
    bountyCents: money("bounty"),
    reentryCount: integer("reentryCount"),
    externalBookingUrl: str(fd, "externalBookingUrl"),
    reentryPriceCents: money("reentryPrice"),
    reentryFeeCents: money("reentryFee"),
    levels: parseLevelsJson(str(fd, "levels"), errors),
    startingStack: integer("startingStack"),
    blindLevelMinutes: integer("blindLevelMinutes"),
    blindStructure: str(fd, "blindStructure"),
    lateRegistration: str(fd, "lateRegistration"),
    reentryPolicy: str(fd, "reentryPolicy"),
    rules: str(fd, "rules"),
    venue: str(fd, "venue"),
    coverImageUrl: str(fd, "coverImageUrl"),
    tableCount: integer("tableCount", 1),
    seatsPerTable: integer("seatsPerTable", 9),
    tableLabels: trimTrailingEmpty(
      str(fd, "tableLabels")
        .split("\n")
        .map((s) => s.trim()),
    ),
    capacity: integer("capacity"),
    maxPlacesPerBooking: integer("maxPlacesPerBooking", 1),
    seatSelection: str(fd, "seatSelection") || "owner",
    waitlistEnabled: bool(fd, "waitlistEnabled"),
    featured: bool(fd, "featured"),
    status: str(fd, "status") || "draft",
  };

  const parsed = tournamentFieldsSchema.safeParse(candidate);
  if (!parsed.success) Object.assign(errors, Object.fromEntries(Object.entries(fieldErrors(parsed.error)).filter(([k]) => !errors[k])));
  // Map schema keys back to form input names.
  const rename: Record<string, string> = { buyInCents: "buyIn", feeCents: "fee", guaranteeCents: "guarantee", bountyCents: "bounty", reentryPriceCents: "reentryPrice", reentryFeeCents: "reentryFee" };
  for (const [from, to] of Object.entries(rename)) {
    if (errors[from]) {
      errors[to] ??= errors[from];
      delete errors[from];
    }
  }
  for (const k of Object.keys(errors)) if (k.startsWith("levels.")) {
    errors.levels ??= `Niveau ${Number(k.split(".")[1]) + 1} : ${errors[k]}`;
    delete errors[k];
  }
  if (Object.keys(errors).length || !parsed.success) return { errors };
  return { fields: parsed.data };
}
