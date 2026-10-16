import type { RegistrationState } from "@/lib/availability";
import { t } from "@/lib/i18n";

const STYLES: Record<RegistrationState, { dot: string; text: string; ring: string }> = {
  open: { dot: "bg-ok", text: "text-ok", ring: "border-ok/30 bg-ok/[0.07]" },
  almost_full: { dot: "bg-warn", text: "text-warn", ring: "border-warn/35 bg-warn/[0.08]" },
  waitlist: { dot: "bg-danger", text: "text-danger", ring: "border-danger/35 bg-danger/[0.08]" },
  full: { dot: "bg-danger", text: "text-danger", ring: "border-danger/35 bg-danger/[0.08]" },
  not_yet_open: { dot: "bg-info", text: "text-info", ring: "border-info/30 bg-info/[0.07]" },
  closed: { dot: "bg-fog", text: "text-mist", ring: "border-white/15 bg-white/[0.04]" },
  finished: { dot: "bg-fog", text: "text-mist", ring: "border-white/15 bg-white/[0.04]" },
};

export function StatusBadge({ state, className = "" }: { state: RegistrationState; className?: string }) {
  const s = STYLES[state];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] ${s.ring} ${s.text} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${state === "open" || state === "almost_full" ? "animate-pulse" : ""}`} aria-hidden />
      {t.status[state]}
    </span>
  );
}

export function CapacityBar({ taken, capacity, state }: { taken: number; capacity: number; state: RegistrationState }) {
  const pct = capacity > 0 ? Math.min(100, Math.round((taken / capacity) * 100)) : 100;
  const color = state === "almost_full" ? "bg-warn" : state === "full" || state === "waitlist" ? "bg-danger" : "bg-gold-400";
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-xs">
        <span className="text-mist">{t.common.registered(taken, capacity)}</span>
        <span className="font-semibold text-ivory-dim">{t.common.seatsLeft(capacity - taken)}</span>
      </div>
      <div
        className="h-1 overflow-hidden rounded-full bg-white/[0.08]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={taken}
        aria-label="Taux de remplissage"
      >
        <div className={`h-full rounded-full ${color} transition-[width] duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
