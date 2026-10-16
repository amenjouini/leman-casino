/** Client-safe helpers describing a tournament's entry structure. */
export type EntryType = "reentry" | "freezeout";

type EntryInput = { reentryCount: number | null; format: string; bountyCents?: number | null; buyInCents: number | null };

/** Re-entry / freezeout, from the explicit count when set, otherwise from the format name. */
export function entryType(t: EntryInput): EntryType | null {
  if (t.reentryCount != null) return t.reentryCount > 0 ? "reentry" : "freezeout";
  if (/re-?entry/i.test(t.format)) return "reentry";
  if (/freeze/i.test(t.format)) return "freezeout";
  return null;
}

export const isBounty = (t: EntryInput) => (t.bountyCents ?? 0) > 0 || /bounty|knockout|pko/i.test(t.format);

/** Buy-in including the bounty part, excluding the fee (as players compare entries). */
export const buyInWithBounty = (t: EntryInput) => (t.buyInCents ?? 0) + (t.bountyCents ?? 0);
