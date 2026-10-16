"use client";

import { memo, useState } from "react";
import { pocketColor } from "@/lib/roulette";
import { COMBO_SPOTS, SPOT_BY_ID, TABLE_HEIGHT, TABLE_WIDTH, numberRect, outsideRect, spotAnchor, type Bets } from "@/lib/roulette-bets";
import { TokenShape, chipFor, compactAmount } from "./Token";

const FELT = "#0d3d2f";
const LINE = "rgba(244,239,228,0.55)";
const NUM_FILL = { red: "#a8171f", black: "#121317", green: "#0c6c3d" } as const;

type Props = {
  bets: Bets;
  vertical: boolean;
  disabled: boolean;
  winningNumber: number | null;
  winners: Set<string>;
  onPlace: (spotId: string, remove: boolean) => void;
};

const OUTSIDE = ["dozen:1", "dozen:2", "dozen:3", "col:1", "col:2", "col:3", "low", "even", "red", "black", "odd", "high"];
const OUTSIDE_TEXT: Record<string, string> = {
  "dozen:1": "1re 12",
  "dozen:2": "2e 12",
  "dozen:3": "3e 12",
  "col:1": "2 à 1",
  "col:2": "2 à 1",
  "col:3": "2 à 1",
  low: "1 – 18",
  even: "PAIR",
  odd: "IMPAIR",
  high: "19 – 36",
};

function BettingTableImpl({ bets, vertical, disabled, winningNumber, winners, onPlace }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const highlighted = new Set(hover ? (SPOT_BY_ID.get(hover)?.numbers ?? []) : []);
  const W = vertical ? TABLE_HEIGHT : TABLE_WIDTH;
  const H = vertical ? TABLE_WIDTH : TABLE_HEIGHT;
  // In vertical mode the horizontal layout is rotated 90° clockwise (zero on top, 1-2-3 across).
  const outer = vertical ? `translate(${TABLE_HEIGHT} 0) rotate(90)` : undefined;
  const upright = (x: number, y: number) => (vertical ? `rotate(-90 ${x} ${y})` : undefined);

  const interact = (id: string) => ({
    onClick: (e: React.MouseEvent) => {
      if (!disabled) onPlace(id, e.shiftKey || e.altKey);
    },
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      if (!disabled) onPlace(id, true);
    },
    onMouseEnter: () => setHover(id),
    onMouseLeave: () => setHover((h) => (h === id ? null : h)),
    style: { cursor: disabled ? "not-allowed" : "pointer" } as React.CSSProperties,
  });
  const keyboard = (id: string, label: string) => ({
    role: "button",
    tabIndex: disabled ? -1 : 0,
    "aria-label": `${label}${bets[id] ? ` — mise ${bets[id]} jetons` : ""}`,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onPlace(id, false);
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        onPlace(id, true);
      }
    },
    onFocus: () => setHover(id),
    onBlur: () => setHover(null),
  });

  return (
    <svg
      viewBox={`-6 -6 ${W + 12} ${H + 12}`}
      className="h-auto w-full select-none"
      role="group"
      aria-label="Tapis de mise de la roulette européenne"
      style={{ touchAction: "manipulation" }}
    >
      <defs>
        <radialGradient id="felt" cx="50%" cy="40%" r="75%">
          <stop offset="0%" stopColor="#13503e" />
          <stop offset="100%" stopColor="#0a2c22" />
        </radialGradient>
      </defs>
      <rect x={-6} y={-6} width={W + 12} height={H + 12} rx={14} fill="url(#felt)" stroke="#7b6235" strokeWidth={3} />
      <g transform={outer}>
        {/* Numbers */}
        {Array.from({ length: 37 }, (_, n) => {
          const r = numberRect(n);
          const id = `n:${n}`;
          const col = pocketColor(n);
          const cx = r.x + r.w / 2;
          const cy = r.y + r.h / 2;
          const win = winningNumber === n;
          return (
            <g key={id} {...interact(id)} {...keyboard(id, `Numéro ${n}`)}>
              {n === 0 ? (
                <path d={`M${r.x + r.w} ${r.y} L${r.x + 18} ${r.y} L${r.x} ${r.y + r.h / 2} L${r.x + 18} ${r.y + r.h} L${r.x + r.w} ${r.y + r.h} Z`} fill={FELT} stroke={LINE} strokeWidth={1.5} />
              ) : (
                <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={FELT} stroke={LINE} strokeWidth={1.5} />
              )}
              {(highlighted.has(n) || win) && <rect x={r.x + 2} y={r.y + 2} width={r.w - 4} height={r.h - 4} rx={4} fill={win ? "rgba(239,226,192,0.35)" : "rgba(213,185,127,0.22)"} />}
              <g transform={upright(cx, cy)}>
                {n === 0 ? (
                  <text x={cx + 4} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={26} fontWeight={600} fill="#f4efe4" fontFamily="var(--font-display), Georgia, serif">
                    0
                  </text>
                ) : (
                  <>
                    <ellipse cx={cx} cy={cy} rx={18} ry={22} fill={NUM_FILL[col]} stroke="rgba(244,239,228,0.25)" />
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={20} fontWeight={600} fill="#f4efe4" fontFamily="var(--font-display), Georgia, serif" style={{ fontVariantNumeric: "lining-nums" }}>
                      {n}
                    </text>
                  </>
                )}
              </g>
              {win && <circle cx={cx} cy={r.y + 10} r={6} fill="#efe2c0" stroke="#7b6235" strokeWidth={1.5} />}
            </g>
          );
        })}

        {/* Outside bets */}
        {OUTSIDE.map((id) => {
          const r = outsideRect(id)!;
          const cx = r.x + r.w / 2;
          const cy = r.y + r.h / 2;
          const isCol = id.startsWith("col:");
          return (
            <g key={id} {...interact(id)} {...keyboard(id, SPOT_BY_ID.get(id)!.label)}>
              <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={hover === id ? "rgba(213,185,127,0.16)" : FELT} stroke={LINE} strokeWidth={1.5} />
              {id === "red" || id === "black" ? (
                <path d={`M${cx} ${cy - 16} L${cx + 26} ${cy} L${cx} ${cy + 16} L${cx - 26} ${cy} Z`} fill={id === "red" ? NUM_FILL.red : NUM_FILL.black} stroke="rgba(244,239,228,0.5)" />
              ) : (
                <g transform={isCol ? upright(cx, cy) : undefined}>
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={isCol ? 13 : 15} fontWeight={600} letterSpacing={1} fill="#f4efe4" fontFamily="var(--font-sans), sans-serif">
                    {OUTSIDE_TEXT[id]}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Inside combination hotspots (splits, corners, streets, six-lines, trios) */}
        {COMBO_SPOTS.map((s) => {
          const a = spotAnchor(s);
          return (
            <circle
              key={s.id}
              cx={a.x}
              cy={a.y}
              r={13}
              fill={hover === s.id ? "rgba(239,226,192,0.35)" : "transparent"}
              stroke={hover === s.id ? "#efe2c0" : "none"}
              {...interact(s.id)}
            >
              <title>{s.label}</title>
            </circle>
          );
        })}

        {/* Chips */}
        {Object.entries(bets).map(([id, amount]) => {
          const spot = SPOT_BY_ID.get(id);
          if (!spot || !(amount > 0)) return null;
          const a = spotAnchor(spot);
          const won = winners.has(id);
          const lost = winningNumber !== null && !won;
          const layers = Math.min(3, Math.ceil(amount / chipFor(amount)));
          return (
            <g key={id} transform={`translate(${a.x} ${a.y})`} style={{ pointerEvents: "none" }}>
              {/* Animated wrapper has no transform attribute, so CSS transforms don't fight SVG ones. */}
              <g className={won ? "token-win" : lost ? "token-lose" : "token-drop"}>
              <g transform={vertical ? "rotate(-90)" : undefined}>
                {Array.from({ length: layers - 1 }, (_, i) => (
                  <g key={i} transform={`translate(0 ${(layers - 1 - i) * 3})`}>
                    <TokenShape value={chipFor(amount)} r={15} label="" />
                  </g>
                ))}
                <TokenShape value={chipFor(amount)} r={15} label={compactAmount(amount)} highlight={won} />
              </g>
              </g>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export const BettingTable = memo(BettingTableImpl);
