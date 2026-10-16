import Link from "next/link";
import { Download, Search } from "lucide-react";
import { requirePageUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { listBookings, tournamentOptions } from "@/lib/admin/queries";
import { BOOKING_STATUSES, BOOKING_STATUS_LABELS } from "@/lib/constants";
import { formatDateShort, formatDateTime, formatTime } from "@/lib/format";
import { AdminPageHeader, BookingPill, EmptyState, Pagination, tableWrap, th, td, rowClass } from "@/components/admin/ui";

export const metadata = { title: "Réservations" };

type SP = { q?: string; statut?: string; tournoi?: string; du?: string; au?: string; page?: string };

export default async function BookingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePageUser("bookings.view");
  const sp = await searchParams;
  const filters = {
    q: (sp.q ?? "").slice(0, 100),
    status: sp.statut ?? "",
    tournament: sp.tournoi ?? "",
    from: /^\d{4}-\d{2}-\d{2}$/.test(sp.du ?? "") ? sp.du : "",
    to: /^\d{4}-\d{2}-\d{2}$/.test(sp.au ?? "") ? sp.au : "",
    page: Math.max(1, Number(sp.page) || 1),
  };
  const [{ rows, total, page, pages }, options] = await Promise.all([listBookings(filters), tournamentOptions()]);
  const qs = (extra: Record<string, string | number>) => {
    const p = new URLSearchParams();
    const all = { q: filters.q, statut: filters.status, tournoi: filters.tournament, du: filters.from ?? "", au: filters.to ?? "", ...extra };
    for (const [k, v] of Object.entries(all)) if (v) p.set(k, String(v));
    return p.toString();
  };

  return (
    <>
      <AdminPageHeader
        title="Réservations"
        description={`${total} réservation(s) correspondant aux filtres.`}
        actions={
          can(user.role, "bookings.export") && (
            <a href={`/api/admin/export/bookings?${qs({})}`} className="btn btn-outline btn-sm">
              <Download className="h-4 w-4" aria-hidden /> Export CSV
            </a>
          )
        }
      />

      <form method="get" className="mb-6 grid gap-3 rounded-2xl border border-white/[0.08] bg-night-850 p-4 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1.3fr_0.8fr_0.8fr_auto] xl:items-end" role="search">
        <div>
          <label htmlFor="q" className="field-label">
            Recherche
          </label>
          <input id="q" name="q" type="search" defaultValue={filters.q} placeholder="Nom, e-mail, référence, tournoi…" className="field !min-h-10" />
        </div>
        <div>
          <label htmlFor="statut" className="field-label">
            Statut
          </label>
          <select id="statut" name="statut" defaultValue={filters.status} className="field !min-h-10">
            <option value="">Tous</option>
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {BOOKING_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tournoi" className="field-label">
            Tournoi
          </label>
          <select id="tournoi" name="tournoi" defaultValue={filters.tournament} className="field !min-h-10">
            <option value="">Tous les tournois</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {formatDateShort(o.startsAt)} · {o.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="du" className="field-label">
            Tournoi du
          </label>
          <input id="du" name="du" type="date" defaultValue={filters.from} className="field !min-h-10" />
        </div>
        <div>
          <label htmlFor="au" className="field-label">
            au
          </label>
          <input id="au" name="au" type="date" defaultValue={filters.to} className="field !min-h-10" />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-gold btn-sm h-10">
            <Search className="h-4 w-4" aria-hidden /> Filtrer
          </button>
          <Link href="/admin/reservations" className="btn btn-ghost btn-sm h-10">
            Effacer
          </Link>
        </div>
      </form>

      {rows.length ? (
        <div className={tableWrap}>
          <table className="w-full min-w-[56rem]">
            <thead>
              <tr>
                <th className={th}>Référence</th>
                <th className={th}>Joueur</th>
                <th className={th}>Tournoi</th>
                <th className={th}>Places</th>
                <th className={th}>Sièges</th>
                <th className={th}>Statut</th>
                <th className={th}>Reçue</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ booking: b, tournamentName, startsAt, seats }) => (
                <tr key={b.id} className={rowClass}>
                  <td className={`${td} whitespace-nowrap`}>
                    <Link href={`/admin/reservations/${b.id}`} className="font-mono text-gold-300 hover:underline">
                      {b.reference}
                    </Link>
                  </td>
                  <td className={td}>
                    <Link href={`/admin/reservations/${b.id}`} className="font-medium text-ivory hover:text-gold-300">
                      {b.fullName}
                    </Link>
                    <p className="text-xs text-fog">{b.email}</p>
                  </td>
                  <td className={td}>
                    <span className="text-ivory-dim">{tournamentName}</span>
                    <p className="text-xs text-fog">
                      {formatDateShort(startsAt)} · {formatTime(startsAt)}
                    </p>
                  </td>
                  <td className={`${td} text-ivory-dim`}>{b.places}</td>
                  <td className={`${td} text-xs text-mist`}>
                    {seats
                      ? seats
                          .split(",")
                          .map((s) => `T${s.split(":")[0]}·${s.split(":")[1]}`)
                          .join(" ")
                      : "—"}
                  </td>
                  <td className={td}>
                    <BookingPill status={b.status} />
                  </td>
                  <td className={`${td} whitespace-nowrap text-xs text-fog`}>{formatDateTime(b.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>Aucune réservation ne correspond à ces critères.</EmptyState>
      )}
      <Pagination page={page} pages={pages} href={(p) => `/admin/reservations?${qs({ page: p })}`} />
    </>
  );
}
