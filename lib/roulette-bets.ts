import { RED_NUMBERS } from "./roulette";

/**
 * European roulette betting model for the entertainment table (symbolic tokens only).
 * Payouts are the standard "x to 1" odds; a winning bet returns its stake plus stake × payout.
 */
export type BetKind =
  | "straight"
  | "split"
  | "street"
  | "trio"
  | "corner"
  | "sixline"
  | "dozen"
  | "column"
  | "red"
  | "black"
  | "even"
  | "odd"
  | "low"
  | "high";

export const PAYOUT: Record<BetKind, number> = {
  straight: 35,
  split: 17,
  street: 11,
  trio: 11,
  corner: 8,
  sixline: 5,
  dozen: 2,
  column: 2,
  red: 1,
  black: 1,
  even: 1,
  odd: 1,
  low: 1,
  high: 1,
};

export const KIND_LABELS: Record<BetKind, string> = {
  straight: "Plein",
  split: "Cheval",
  street: "Transversale",
  trio: "Trio",
  corner: "Carré",
  sixline: "Sixain",
  dozen: "Douzaine",
  column: "Colonne",
  red: "Rouge",
  black: "Noir",
  even: "Pair",
  odd: "Impair",
  low: "Manque (1–18)",
  high: "Passe (19–36)",
};

export type BetSpot = { id: string; kind: BetKind; numbers: number[]; label: string };

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
/** Table column (0..11) and row-in-column (0 = 1st number, 2 = 3rd number) of 1..36. */
export const cellOf = (n: number) => ({ c: Math.floor((n - 1) / 3), k: (n - 1) % 3 });

function buildSpots(): BetSpot[] {
  const spots: BetSpot[] = [];
  const add = (id: string, kind: BetKind, numbers: number[], label: string) => spots.push({ id, kind, numbers: [...numbers].sort((a, b) => a - b), label });

  for (const n of range(0, 36)) add(`n:${n}`, "straight", [n], `Plein ${n}`);
  for (const n of range(1, 36)) {
    const { c, k } = cellOf(n);
    if (c < 11) add(`split:${n}-${n + 3}`, "split", [n, n + 3], `Cheval ${n}/${n + 3}`);
    if (k < 2) add(`split:${n}-${n + 1}`, "split", [n, n + 1], `Cheval ${n}/${n + 1}`);
    if (k < 2 && c < 11) add(`corner:${n}-${n + 4}`, "corner", [n, n + 1, n + 3, n + 4], `Carré ${n}/${n + 1}/${n + 3}/${n + 4}`);
  }
  for (const n of [1, 2, 3]) add(`split:0-${n}`, "split", [0, n], `Cheval 0/${n}`);
  add("trio:0-1-2", "trio", [0, 1, 2], "Trio 0/1/2");
  add("trio:0-2-3", "trio", [0, 2, 3], "Trio 0/2/3");
  for (let c = 0; c < 12; c++) {
    const first = 3 * c + 1;
    add(`street:${first}`, "street", [first, first + 1, first + 2], `Transversale ${first}–${first + 2}`);
    if (c < 11) add(`six:${first}`, "sixline", range(first, first + 5), `Sixain ${first}–${first + 5}`);
  }
  for (const d of [1, 2, 3]) add(`dozen:${d}`, "dozen", range(12 * (d - 1) + 1, 12 * d), `${d}${d === 1 ? "re" : "e"} douzaine`);
  for (const col of [1, 2, 3]) add(`col:${col}`, "column", range(1, 36).filter((n) => cellOf(n).k === col - 1), `Colonne ${col}`);
  add("red", "red", [...RED_NUMBERS], "Rouge");
  add("black", "black", range(1, 36).filter((n) => !RED_NUMBERS.has(n)), "Noir");
  add("even", "even", range(1, 36).filter((n) => n % 2 === 0), "Pair");
  add("odd", "odd", range(1, 36).filter((n) => n % 2 === 1), "Impair");
  add("low", "low", range(1, 18), "Manque 1–18");
  add("high", "high", range(19, 36), "Passe 19–36");
  return spots;
}

export const SPOTS: BetSpot[] = buildSpots();
export const SPOT_BY_ID: Map<string, BetSpot> = new Map(SPOTS.map((s) => [s.id, s]));

export type Bets = Record<string, number>;

export type Settlement = {
  staked: number;
  /** Tokens returned to the player (winning stakes + winnings). */
  returned: number;
  net: number;
  winners: { id: string; stake: number; payout: number; returned: number }[];
  losers: string[];
};

export function settle(bets: Bets, result: number): Settlement {
  let staked = 0;
  let returned = 0;
  const winners: Settlement["winners"] = [];
  const losers: string[] = [];
  for (const [id, stake] of Object.entries(bets)) {
    if (!(stake > 0)) continue;
    const spot = SPOT_BY_ID.get(id);
    if (!spot) continue;
    staked += stake;
    if (spot.numbers.includes(result)) {
      const back = stake * (PAYOUT[spot.kind] + 1);
      returned += back;
      winners.push({ id, stake, payout: PAYOUT[spot.kind], returned: back });
    } else {
      losers.push(id);
    }
  }
  return { staked, returned, net: returned - staked, winners, losers };
}

export const totalStake = (bets: Bets) => Object.values(bets).reduce((a, b) => a + (b > 0 ? b : 0), 0);

/* ───────────────────────────── Table geometry ───────────────────────────── */

export const TABLE = { W: 60, H: 76, HD: 52, ZERO: 60 } as const;
export const TABLE_WIDTH = TABLE.ZERO + 12 * TABLE.W + TABLE.W; // zero + 12 columns + "2 to 1"
export const TABLE_HEIGHT = 3 * TABLE.H + 2 * TABLE.HD;

export type Rect = { x: number; y: number; w: number; h: number };
const centerOf = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/** Rectangles of the clickable areas in the horizontal layout (zero on the left). */
export function numberRect(n: number): Rect {
  if (n === 0) return { x: 0, y: 0, w: TABLE.ZERO, h: 3 * TABLE.H };
  const { c, k } = cellOf(n);
  return { x: TABLE.ZERO + c * TABLE.W, y: (2 - k) * TABLE.H, w: TABLE.W, h: TABLE.H };
}

export function outsideRect(id: string): Rect | null {
  const x0 = TABLE.ZERO;
  const yDoz = 3 * TABLE.H;
  const yOut = yDoz + TABLE.HD;
  if (id.startsWith("dozen:")) {
    const d = Number(id.split(":")[1]) - 1;
    return { x: x0 + d * 4 * TABLE.W, y: yDoz, w: 4 * TABLE.W, h: TABLE.HD };
  }
  if (id.startsWith("col:")) {
    const col = Number(id.split(":")[1]) - 1;
    return { x: x0 + 12 * TABLE.W, y: (2 - col) * TABLE.H, w: TABLE.W, h: TABLE.H };
  }
  const order = ["low", "even", "red", "black", "odd", "high"];
  const i = order.indexOf(id);
  if (i < 0) return null;
  return { x: x0 + i * 2 * TABLE.W, y: yOut, w: 2 * TABLE.W, h: TABLE.HD };
}

/** Where the chip of a spot is drawn (and the hotspot for inside combinations). */
export function spotAnchor(spot: BetSpot): { x: number; y: number } {
  const rect = outsideRect(spot.id);
  if (rect) return centerOf(rect);
  const nums = spot.numbers;
  const centers = nums.map((n) => centerOf(numberRect(n)));
  const avg = (pts: { x: number; y: number }[]) => ({ x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: pts.reduce((a, p) => a + p.y, 0) / pts.length });
  switch (spot.kind) {
    case "straight":
      return centers[0];
    case "corner":
      return avg(centers);
    case "split":
      if (nums[0] === 0) {
        const c = centerOf(numberRect(nums[1]));
        return { x: TABLE.ZERO, y: c.y };
      }
      return avg(centers);
    case "trio": {
      const mid = avg(centers.slice(1));
      return { x: TABLE.ZERO, y: mid.y };
    }
    case "street": {
      const r = numberRect(nums[0]);
      return { x: r.x + r.w / 2, y: 3 * TABLE.H };
    }
    case "sixline": {
      const r = numberRect(nums[0]);
      return { x: r.x + r.w, y: 3 * TABLE.H };
    }
    default:
      return avg(centers);
  }
}

/** Every inside combination (split, corner, street, six-line, trio) — small round hotspots. */
export const COMBO_SPOTS = SPOTS.filter((s) => ["split", "corner", "street", "sixline", "trio"].includes(s.kind));
