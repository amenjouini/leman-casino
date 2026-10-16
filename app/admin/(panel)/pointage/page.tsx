import Link from "next/link";
import { requirePageUser } from "@/lib/auth/session";
import { checkinTournaments, tournamentRoster } from "@/lib/admin/queries";
import { allowedTransitions } from "@/lib/bookings";
import { tableLabel } from "@/lib/seating";
import { formatDateLong, formatTime } from "@/lib/format";
import { AdminPageHeader, BookingPill, EmptyState } from "@/components/admin/ui";
import { StatusActions } from "@/components/admin/StatusActions";

export const metadata = { title: "Pointage" };

export default async function CheckinPage({ searchParams }: { searchParams: Promise<{ tournoi?: string }> }) {
  const user = await requirePageUser("bookings.checkin");
  const { tournoi } = await searchParams;
  const tournaments = await checkinTournaments();
  const selected = tournaments.find((t) => t.id === tournoi) ?? tournaments[0];
  const roster = selected ? (await tournamentRoster(selected.id)).filter((b) => ["confirmed", "attended", "no_show"].includes(b.status)) : [];
  const labels = selected?.tableLabels ?? [];
  const present = roster.filter((r) => r.status === "attended").reduce((n, r) => n + r.places, 0);
  const expected = roster.reduce((n, r) => n + r.places, 0);

  return (
    <>
      <AdminPageHeader title="Pointage" description="Marquez les joueurs présents ou absents le jour du tournoi. Seules les réservations confirmées apparaissent." />
      {tournaments.length === 0 ? (
        <EmptyState>Aucun tournoi publié aujourd’hui ou à venir.</EmptyState>
      ) : (
        <>
          <nav className="mb-6 flex flex-wrap gap-2" aria-label="Choisir le tournoi">
            {tournaments.map((t) => (
              <Link
                key={t.id}
                href={`/admin/pointage?tournoi=${t.id}`}
                aria-current={t.id === selected?.id ? "page" : undefined}
                className={`rounded-xl border px-4 py-2 text-sm ${t.id === selected?.id ? "border-gold-400 bg-gold-400/10 text-gold-200" : "border-white/10 text-ivory-dim hover:border-white/25"}`}
              >
                <span className="block font-medium">{t.name}</span>
                <span className="block text-xs text-fog first-letter:uppercase">
                  {formatDateLong(t.startsAt)} · {formatTime(t.startsAt)}
                </span>
              </Link>
            ))}
          </nav>
          <p className="mb-4 text-sm text-mist">
            <strong className="text-ivory">{present}</strong> présent(s) sur <strong className="text-ivory">{expected}</strong> place(s) confirmée(s).
          </p>
          {roster.length ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {roster.map((r) => (
                <li key={r.id} className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-night-850 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-medium text-ivory">{r.fullName}</p>
                      <p className="text-xs text-fog">
                        <span className="font-mono">{r.reference}</span> · {r.places} place(s)
                        {r.seats.length > 0 && ` · ${r.seats.map((s) => `${tableLabel(labels, s.table)} · siège ${s.seat}`).join(", ")}`}
                      </p>
                    </div>
                    <BookingPill status={r.status} />
                  </div>
                  <StatusActions bookingId={r.id} allowed={allowedTransitions(r.status, user.role).filter((s) => ["attended", "no_show", "confirmed"].includes(s))} canNotify={false} compact />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>Aucune réservation confirmée pour ce tournoi.</EmptyState>
          )}
        </>
      )}
    </>
  );
}
