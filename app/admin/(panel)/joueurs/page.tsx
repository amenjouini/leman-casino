import Link from "next/link";
import { Download, Search } from "lucide-react";
import { requirePageUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { listPlayers } from "@/lib/admin/queries";
import { formatDateShort } from "@/lib/format";
import { AdminPageHeader, EmptyState, Pagination, tableWrap, th, td, rowClass } from "@/components/admin/ui";

export const metadata = { title: "Joueurs" };

export default async function PlayersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const user = await requirePageUser("players.view");
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 100);
  const { rows, total, page, pages } = await listPlayers(q, Math.max(1, Number(sp.page) || 1));

  return (
    <>
      <AdminPageHeader
        title="Joueurs"
        description={`${total} joueur(s) — fiches créées automatiquement à partir des réservations.`}
        actions={
          can(user.role, "bookings.export") && (
            <a href={`/api/admin/export/players${q ? `?q=${encodeURIComponent(q)}` : ""}`} className="btn btn-outline btn-sm">
              <Download className="h-4 w-4" aria-hidden /> Export CSV
            </a>
          )
        }
      />
      <form method="get" className="mb-6 flex max-w-lg gap-2" role="search">
        <label htmlFor="pq" className="sr-only">
          Rechercher
        </label>
        <input id="pq" name="q" type="search" defaultValue={q} placeholder="Nom, e-mail ou téléphone" className="field !min-h-10" />
        <button type="submit" className="btn btn-gold btn-sm h-10">
          <Search className="h-4 w-4" aria-hidden /> Rechercher
        </button>
      </form>
      {rows.length ? (
        <div className={tableWrap}>
          <table className="w-full min-w-[52rem]">
            <thead>
              <tr>
                <th className={th}>Joueur</th>
                <th className={th}>Téléphone</th>
                <th className={th}>Réservations</th>
                <th className={th}>Présences</th>
                <th className={th}>No-shows</th>
                <th className={th}>Annulées/refusées</th>
                <th className={th}>Dernière demande</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.player.id} className={rowClass}>
                  <td className={td}>
                    <Link href={`/admin/joueurs/${r.player.id}`} className="font-medium text-ivory hover:text-gold-300">
                      {r.player.fullName}
                    </Link>
                    <p className="text-xs text-fog">{r.player.email}</p>
                  </td>
                  <td className={`${td} text-ivory-dim`}>{r.player.phone ?? "—"}</td>
                  <td className={`${td} text-ivory-dim`}>
                    {r.total} {r.active > 0 && <span className="text-xs text-ok">({r.active} active(s))</span>}
                  </td>
                  <td className={`${td} text-ivory-dim`}>{r.attended}</td>
                  <td className={`${td} ${r.noShows > 0 ? "text-danger" : "text-ivory-dim"}`}>{r.noShows}</td>
                  <td className={`${td} text-ivory-dim`}>{r.cancelled}</td>
                  <td className={`${td} text-xs text-fog`}>{r.lastBooking ? formatDateShort(new Date(r.lastBooking)) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>{q ? "Aucun joueur ne correspond à cette recherche." : "Aucun joueur pour l’instant : les fiches apparaissent avec les premières réservations."}</EmptyState>
      )}
      <Pagination page={page} pages={pages} href={(p) => `/admin/joueurs?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`} />
    </>
  );
}
