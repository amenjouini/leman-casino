/** European single-zero wheel, clockwise from zero. */
export const WHEEL_SEQUENCE = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3,
  26,
] as const;

export const POCKET_COUNT = WHEEL_SEQUENCE.length; // 37
export const POCKET_ANGLE = 360 / POCKET_COUNT;

export const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export type PocketColor = "green" | "red" | "black";

export function pocketColor(n: number): PocketColor {
  if (n === 0) return "green";
  return RED_NUMBERS.has(n) ? "red" : "black";
}

export const COLOR_LABELS: Record<PocketColor, string> = { green: "Vert", red: "Rouge", black: "Noir" };

/** Index of a number on the wheel. */
export function pocketIndex(n: number): number {
  const i = WHEEL_SEQUENCE.indexOf(n as (typeof WHEEL_SEQUENCE)[number]);
  if (i < 0) throw new RangeError(`Numéro hors roue : ${n}`);
  return i;
}

/** Angle (degrees, clockwise from 12 o'clock) of a pocket's centre in the wheel's own frame. */
export function pocketCenterAngle(n: number): number {
  return pocketIndex(n) * POCKET_ANGLE;
}

/** Which pocket lies under a given angle of the wheel frame (degrees, clockwise from 12 o'clock). */
export function numberAtWheelAngle(angle: number): number {
  const a = ((angle % 360) + 360) % 360;
  return WHEEL_SEQUENCE[Math.round(a / POCKET_ANGLE) % POCKET_COUNT];
}

/** Unbiased random pocket using the Web Crypto API (rejection sampling). */
export function randomPocket(rand: (buf: Uint32Array) => Uint32Array = (b) => crypto.getRandomValues(b)): number {
  const limit = Math.floor(0x1_0000_0000 / POCKET_COUNT) * POCKET_COUNT;
  const buf = new Uint32Array(1);
  for (;;) {
    rand(buf);
    if (buf[0] < limit) return buf[0] % POCKET_COUNT;
  }
}

/** Adjacent numbers of the result (for the "voisins" info in the result panel). */
export function neighbours(n: number, span = 2): number[] {
  const i = pocketIndex(n);
  const out: number[] = [];
  for (let d = -span; d <= span; d++) if (d !== 0) out.push(WHEEL_SEQUENCE[(i + d + POCKET_COUNT) % POCKET_COUNT]);
  return out;
}

export function describe(n: number) {
  return {
    number: n,
    color: pocketColor(n),
    parity: n === 0 ? null : n % 2 === 0 ? "Pair" : "Impair",
    range: n === 0 ? null : n <= 18 ? "Manque (1–18)" : "Passe (19–36)",
    dozen: n === 0 ? null : n <= 12 ? "1re douzaine" : n <= 24 ? "2e douzaine" : "3e douzaine",
  };
}
