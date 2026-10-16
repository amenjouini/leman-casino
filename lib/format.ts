import { LOCALE, TIME_ZONE } from "./constants";

/** Amount in minor units → "CHF 130.–" style string. */
export function formatMoney(cents: number | null | undefined, currency = "CHF"): string {
  if (cents == null) return "";
  const value = cents / 100;
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Buy-in display: "100 + 30 CHF" when a fee is configured, otherwise the total. */
export function formatBuyIn(buyInCents: number | null, feeCents: number | null, currency = "CHF"): string {
  if (buyInCents == null && feeCents == null) return "Entrée libre";
  if (feeCents) {
    const n = (c: number) => new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 }).format(c / 100);
    return `${currency} ${n(buyInCents ?? 0)} + ${n(feeCents)}`;
  }
  return formatMoney(buyInCents ?? 0, currency);
}

export function totalEntryCents(buyInCents: number | null, feeCents: number | null, bountyCents: number | null = null): number | null {
  if (buyInCents == null && feeCents == null && bountyCents == null) return null;
  return (buyInCents ?? 0) + (feeCents ?? 0) + (bountyCents ?? 0);
}

type EntryParts = { buyInCents: number | null; feeCents: number | null; bountyCents?: number | null; currency: string };

/** Poker-style entry: "CHF 100 + 30", or "CHF 90 + 60 + 35" with a bounty (buy-in + bounty + fee). */
export function formatEntry(t: EntryParts): string {
  const parts = [t.buyInCents, t.bountyCents, t.feeCents].filter((v): v is number => v != null && v > 0);
  if (parts.length === 0) return t.buyInCents === 0 || t.feeCents === 0 ? "Entrée libre" : "Entrée libre";
  if (parts.length === 1) return formatMoney(parts[0], t.currency);
  const n = (c: number) => new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 }).format(c / 100);
  return `${t.currency} ${parts.map(n).join(" + ")}`;
}

/** "30K", "1.5M" for chip stacks. */
export function formatStack(n: number | null): string {
  if (n == null) return "";
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return "";
  return new Intl.NumberFormat(LOCALE).format(n);
}

const dateFmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, ...opts });

export const formatDateLong = (d: Date) => dateFmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d).replace(",", "");
export const formatDateShort = (d: Date) => dateFmt({ weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
export const formatDayMonth = (d: Date) => dateFmt({ day: "numeric", month: "short" }).format(d);
export const formatTime = (d: Date) => dateFmt({ hour: "2-digit", minute: "2-digit" }).format(d);
export const formatDateTime = (d: Date) =>
  dateFmt({ day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
export const formatWeekday = (d: Date) => dateFmt({ weekday: "short" }).format(d);
export const formatDayNumber = (d: Date) => dateFmt({ day: "numeric" }).format(d);
export const formatMonthShort = (d: Date) => dateFmt({ month: "short" }).format(d);
export const formatMonthYear = (d: Date) => dateFmt({ month: "long", year: "numeric" }).format(d);

/** Calendar parts of an instant as seen in Zurich. */
export function zonedParts(d: Date, timeZone = TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

/** "YYYY-MM-DD" of an instant in Zurich. */
export function zonedDateKey(d: Date): string {
  const p = zonedParts(d);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Value for <input type="datetime-local"> in Zurich time. */
export function toDateTimeLocalValue(d: Date | null | undefined): string {
  if (!d) return "";
  const p = zonedParts(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * Interprets a wall-clock "YYYY-MM-DDTHH:mm" in Zurich and returns the UTC instant.
 * Handles DST by correcting with the zone offset observed at the guessed instant.
 */
export function zonedLocalToUtc(value: string, timeZone = TIME_ZONE): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h = "00", mi = "00"] = m;
  const asUtc = Date.UTC(+y, +mo - 1, +d, +h, +mi);
  let guess = asUtc;
  for (let i = 0; i < 2; i++) {
    const p = zonedParts(new Date(guess), timeZone);
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    guess += asUtc - shown;
  }
  const result = new Date(guess);
  return Number.isNaN(result.getTime()) ? null : result;
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
