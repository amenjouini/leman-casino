"use client";

import { tableLabel } from "@/lib/seating";

export type SeatVisual = {
  status: "free" | "taken" | "selected" | "assigned" | "highlight";
  /** Short text inside the seat (seat number by default, initials in the admin). */
  text?: string;
  title: string;
  disabled?: boolean;
};

const SEAT_CLASS: Record<SeatVisual["status"], string> = {
  free: "border-gold-500/50 bg-night-900 text-ivory-dim hover:border-gold-300 hover:text-gold-200",
  taken: "border-white/10 bg-white/[0.06] text-fog line-through decoration-fog/60",
  selected: "border-gold-300 bg-gold-400 text-night-950 shadow-[0_0_0_3px_rgba(213,185,127,0.25)]",
  assigned: "border-info/50 bg-info/15 text-ivory",
  highlight: "border-gold-300 bg-gold-400/90 text-night-950 ring-2 ring-gold-200",
};

export { tableLabel };

/** Positions seats around an oval poker table (seat 1 at the top-left, clockwise). */
function seatPosition(i: number, n: number) {
  const angle = (-Math.PI / 2 - Math.PI / n) + ((i + 0.5) * 2 * Math.PI) / n;
  return { left: 50 + 46 * Math.cos(angle), top: 50 + 40 * Math.sin(angle) };
}

export function TableLayout({
  tableCount,
  seatsPerTable,
  labels,
  seat,
  onSeatClick,
  footer,
  compact = false,
}: {
  tableCount: number;
  seatsPerTable: number;
  labels: string[];
  seat: (table: number, seat: number) => SeatVisual;
  onSeatClick?: (table: number, seat: number) => void;
  footer?: (table: number) => React.ReactNode;
  compact?: boolean;
}) {
  return (
    <ul className={`grid gap-4 ${compact ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2"}`}>
      {Array.from({ length: tableCount }, (_, ti) => {
        const table = ti + 1;
        const name = tableLabel(labels, table);
        return (
          <li key={table} className="rounded-2xl border border-white/[0.07] bg-night-950/60 p-4">
            <div className="relative mx-auto aspect-[1.6/1] w-full max-w-sm">
              <div className="absolute inset-[16%_14%] rounded-[999px] border-[6px] border-[#3d2414] bg-[radial-gradient(ellipse_at_center,#14503d,#0b2c22)] shadow-[inset_0_0_30px_rgba(0,0,0,0.6)]">
                <span className="absolute inset-0 flex items-center justify-center font-display text-lg text-gold-200/90">{name}</span>
              </div>
              {Array.from({ length: seatsPerTable }, (_, si) => {
                const s = si + 1;
                const v = seat(table, s);
                const pos = seatPosition(si, seatsPerTable);
                const interactive = !!onSeatClick && !v.disabled;
                const common = `absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[0.7rem] font-semibold transition-colors sm:h-10 sm:w-10 ${SEAT_CLASS[v.status]}`;
                return interactive ? (
                  <button
                    key={s}
                    type="button"
                    className={common}
                    style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
                    title={v.title}
                    aria-label={v.title}
                    aria-pressed={v.status === "selected" || v.status === "highlight"}
                    onClick={() => onSeatClick(table, s)}
                  >
                    {v.text ?? s}
                  </button>
                ) : (
                  <span key={s} className={`${common} cursor-default`} style={{ left: `${pos.left}%`, top: `${pos.top}%` }} title={v.title} aria-label={v.title} role="img">
                    {v.text ?? s}
                  </span>
                );
              })}
            </div>
            {footer?.(table)}
          </li>
        );
      })}
    </ul>
  );
}
