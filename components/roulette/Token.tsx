/** Symbolic "LÉMAN" tokens — no monetary value. */
export const DENOMINATIONS = [1, 5, 25, 100, 500] as const;
export type Denomination = (typeof DENOMINATIONS)[number];

const COLORS: Record<Denomination, { body: string; edge: string; text: string }> = {
  1: { body: "#e9e4d8", edge: "#7d6334", text: "#1d2230" },
  5: { body: "#b0222c", edge: "#f4efe4", text: "#f4efe4" },
  25: { body: "#0f7a46", edge: "#f4efe4", text: "#f4efe4" },
  100: { body: "#15171c", edge: "#d5b97f", text: "#e4cf9d" },
  500: { body: "#5b2a86", edge: "#e4cf9d", text: "#efe2c0" },
};

export function compactAmount(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1_000) return `${+(n / 1000).toFixed(1)}K`;
  return String(n);
}

/** The highest denomination not exceeding the amount (for the chip colour of a stack). */
export function chipFor(amount: number): Denomination {
  return [...DENOMINATIONS].reverse().find((d) => amount >= d) ?? 1;
}

/** SVG token drawn around (0,0). Use inside an <svg> or <g>. */
export function TokenShape({ value, r = 18, label, highlight = false }: { value: Denomination; r?: number; label?: string; highlight?: boolean }) {
  const c = COLORS[value];
  const notches = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <g>
      <circle r={r + 1.5} fill="#000" opacity="0.35" transform="translate(1 2)" />
      <circle r={r} fill={c.body} stroke={highlight ? "#efe2c0" : c.edge} strokeWidth={highlight ? 2.5 : 1} />
      {notches.map((a) => (
        <rect key={a} x={-r * 0.14} y={-r} width={r * 0.28} height={r * 0.26} fill={c.edge} opacity="0.95" transform={`rotate(${a})`} rx={1} />
      ))}
      <circle r={r * 0.68} fill="none" stroke={c.edge} strokeWidth="0.8" strokeDasharray="2 2" opacity="0.8" />
      <text y={-r * 0.22} textAnchor="middle" fontSize={r * 0.3} fill={c.text} fontFamily="var(--font-display), Georgia, serif" letterSpacing="0.5" fontWeight="600">
        LÉMAN
      </text>
      <text y={r * 0.34} textAnchor="middle" fontSize={r * (String(label ?? value).length > 3 ? 0.42 : 0.55)} fontWeight="700" fill={c.text} fontFamily="var(--font-sans), sans-serif">
        {label ?? value}
      </text>
    </g>
  );
}

/** Standalone token (HTML context), e.g. for the chip tray. */
export function Token({ value, size = 52, highlight = false }: { value: Denomination; size?: number; highlight?: boolean }) {
  return (
    <svg viewBox="-24 -24 48 48" width={size} height={size} aria-hidden>
      <TokenShape value={value} r={21} highlight={highlight} />
    </svg>
  );
}
