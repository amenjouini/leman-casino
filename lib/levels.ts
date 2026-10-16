import type { BlindLevel } from "./db/schema";

/** Client-safe helpers for structured blind levels. */

/** "18 min", "17-20 min" (range when durations vary, breaks excluded). */
export function levelDurationLabel(levels: BlindLevel[], fallbackMinutes: number | null): string {
  const mins = levels.filter((l) => !l.isBreak).map((l) => l.minutes).filter((m) => m > 0);
  if (!mins.length) return fallbackMinutes ? `${fallbackMinutes}` : "";
  const lo = Math.min(...mins);
  const hi = Math.max(...mins);
  return lo === hi ? `${lo}` : `${lo}-${hi}`;
}

const num = (s: string) => Number(s.replace(/['’\s]/g, "").replace(/k$/i, "000"));

/**
 * Parses pasted structures, one level per line, e.g.
 *   "1  100 200 — 18"   "4 300/600 300 18m"   "Pause 15"
 * Returns the levels or the 1-based line numbers that could not be read.
 */
export function parseLevelsText(text: string): { levels: BlindLevel[]; errors: number[] } {
  const levels: BlindLevel[] = [];
  const errors: number[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const brk = /^(pause|break)\b\D*(\d+)?/i.exec(line);
    if (brk) {
      levels.push({ sb: 0, bb: 0, ante: null, minutes: brk[2] ? Number(brk[2]) : 10, isBreak: true, label: "Pause" });
      return;
    }
    const cleaned = line.replace(/(\d)\s*(min|m)\b/gi, "$1");
    // Tab/|/; separated columns (copied tables) may contain spaces as thousands separators ("1 000").
    const columns = /[\t|;]/.test(cleaned)
      ? cleaned.split(/[\t|;]+/).flatMap((col) => col.split("/")).map((col) => col.replace(/[\s  ']/g, ""))
      : cleaned.replace(/[·,/]/g, " ").split(/\s+/);
    const tokens = columns.filter(Boolean).map((tk) => (/^[—–-]+$/.test(tk) ? "0" : tk));
    const values = tokens.map(num).filter((v) => Number.isFinite(v));
    // With a level number: [n, sb, bb, ante?, minutes]; without: [sb, bb, ante?, minutes]
    let v = values;
    if (v.length >= 5 || (v.length === 4 && v[0] < v[1] && v[1] < v[2] && v[0] <= 200)) v = v.slice(1);
    if (v.length < 3) return errors.push(i + 1);
    const [sb, bb] = v;
    const minutes = v[v.length - 1];
    const ante = v.length >= 4 ? v[2] || null : null;
    if (!(sb >= 0 && bb > 0 && minutes > 0 && minutes <= 240)) return errors.push(i + 1);
    levels.push({ sb, bb, ante, minutes });
  });
  return { levels, errors };
}
