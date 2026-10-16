"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Shuffle } from "lucide-react";
import type { BookingStatus } from "@/lib/db/schema";
import { drawSeatsAction, setSeatsAction } from "@/lib/admin/actions/bookings";
import type { ActionState } from "@/lib/admin/action";
import { TableLayout, tableLabel } from "@/components/booking/TableLayout";
import { BookingPill } from "./ui";
import { FormMessage } from "./ActionForm";

export type RosterEntry = {
  id: string;
  reference: string;
  fullName: string;
  places: number;
  status: BookingStatus;
  seats: { table: number; seat: number }[];
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export function SeatingBoard({
  tournamentId,
  tableCount,
  seatsPerTable,
  labels,
  roster,
  readOnly,
}: {
  tournamentId: string;
  tableCount: number;
  seatsPerTable: number;
  labels: string[];
  roster: RosterEntry[];
  readOnly: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unseated">("all");
  const [result, setResult] = useState<ActionState>({ ok: false });
  const [pending, startTransition] = useTransition();

  const bySeat = useMemo(() => {
    const m = new Map<string, RosterEntry>();
    for (const r of roster) for (const s of r.seats) m.set(`${s.table}:${s.seat}`, r);
    return m;
  }, [roster]);
  const current = roster.find((r) => r.id === selected) ?? null;
  const visible = roster.filter((r) => filter === "all" || r.seats.length < r.places);
  const unseatedConfirmed = roster.filter((r) => r.status === "confirmed" && r.seats.length < r.places).length;

  const save = (bookingId: string, seats: { table: number; seat: number }[]) => {
    const fd = new FormData();
    fd.set("bookingId", bookingId);
    fd.set("seats", seats.map((s) => `${s.table}:${s.seat}`).join(","));
    startTransition(async () => setResult(await setSeatsAction({ ok: false }, fd)));
  };

  const onSeat = (table: number, seat: number) => {
    const occupant = bySeat.get(`${table}:${seat}`);
    if (!current) {
      if (occupant) setSelected(occupant.id);
      return;
    }
    if (occupant && occupant.id !== current.id) {
      setSelected(occupant.id);
      return;
    }
    if (occupant?.id === current.id) {
      save(current.id, current.seats.filter((s) => !(s.table === table && s.seat === seat)));
      return;
    }
    const next = current.seats.length < current.places ? [...current.seats, { table, seat }] : [...current.seats.slice(1), { table, seat }];
    save(current.id, next);
  };

  const draw = () => {
    if (!window.confirm(`Attribuer par tirage au sort un siège aux ${unseatedConfirmed} joueur(s) confirmé(s) sans place ?`)) return;
    const fd = new FormData();
    fd.set("tournamentId", tournamentId);
    startTransition(async () => setResult(await drawSeatsAction({ ok: false }, fd)));
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-mist" aria-live="polite">
            {readOnly
              ? "Lecture seule."
              : current
                ? `Sélection : ${current.fullName} (${current.seats.length}/${current.places} siège(s)). Cliquez un siège libre pour l'attribuer, un de ses sièges pour le libérer.`
                : "Sélectionnez un joueur dans la liste (ou un siège occupé), puis cliquez sur un siège libre."}
          </p>
          {!readOnly && (
            <button type="button" onClick={draw} disabled={pending || unseatedConfirmed === 0} className="btn btn-outline btn-sm">
              <Shuffle className="h-4 w-4" aria-hidden /> Tirage au sort ({unseatedConfirmed})
            </button>
          )}
        </div>
        <FormMessage state={result} className="mb-4" />
        <div className={pending ? "pointer-events-none opacity-70 transition-opacity" : ""}>
          <TableLayout
            compact
            tableCount={tableCount}
            seatsPerTable={seatsPerTable}
            labels={labels}
            onSeatClick={readOnly ? undefined : onSeat}
            footer={(table) => {
              const n = Array.from({ length: seatsPerTable }, (_, i) => bySeat.has(`${table}:${i + 1}`)).filter(Boolean).length;
              return <p className="mt-2 text-center text-xs text-fog">{n} / {seatsPerTable} occupés</p>;
            }}
            seat={(table, seat) => {
              const occ = bySeat.get(`${table}:${seat}`);
              const name = `${tableLabel(labels, table)}, siège ${seat}`;
              if (!occ) return { status: "free", title: `${name} — libre` };
              const mine = occ.id === selected;
              return { status: mine ? "highlight" : "assigned", text: initials(occ.fullName), title: `${name} — ${occ.fullName} (${occ.reference})` };
            }}
          />
        </div>
      </div>

      <aside className="rounded-2xl border border-white/[0.08] bg-night-850 xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)] xl:self-start xl:overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] p-4">
          <h2 className="font-sans text-sm font-semibold uppercase tracking-[0.14em] text-ivory-dim">Joueurs ({roster.length})</h2>
          <select value={filter} onChange={(e) => setFilter(e.target.value as "all" | "unseated")} className="field !min-h-0 !w-auto !py-1.5 text-xs" aria-label="Filtrer">
            <option value="all">Tous</option>
            <option value="unseated">Sans siège</option>
          </select>
        </div>
        {visible.length ? (
          <ul className="divide-y divide-white/[0.06]">
            {visible.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setSelected(r.id === selected ? null : r.id)}
                  aria-pressed={r.id === selected}
                  className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors ${r.id === selected ? "bg-gold-400/10" : "hover:bg-white/[0.03]"}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ivory">{r.fullName}</span>
                    <span className="block text-xs text-fog">
                      {r.seats.length ? r.seats.map((s) => `${tableLabel(labels, s.table)} · ${s.seat}`).join(", ") : "Sans siège"}
                      {r.places > 1 && ` · ${r.places} places`}
                    </span>
                  </span>
                  <BookingPill status={r.status} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-4 text-sm text-mist">Aucun joueur.</p>
        )}
        {current && (
          <div className="border-t border-white/[0.06] p-4 text-sm">
            <Link href={`/admin/reservations/${current.id}`} className="text-gold-300 hover:underline">
              Ouvrir la réservation {current.reference}
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
