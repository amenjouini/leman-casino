import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requirePageUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { listAdminTournaments, type AdminTournamentView } from "@/lib/tournaments";
import { duplicateTournamentAction, tournamentStatusAction } from "@/lib/admin/actions/tournaments";
import { formatDateShort, formatTime } from "@/lib/format";
import { AdminPageHeader, EmptyState, tableWrap, th, td, rowClass } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { StatusBadge } from "@/components/tournaments/StatusBadge";

export const metadata = { title: "Tournois" };

const VIEWS: [AdminTournamentView, string][] = [
  ["upcoming", "À venir"],
  ["draft", "Brouillons"],
  ["past", "Passés"],
  ["archived", "Archivés"],
  ["all", "Tous"],
];
const PUB: Record<string, string> = { draft: "Brouillon", published: "Publié", archived: "Archivé" };

export default async function AdminTournamentsPage({ searchParams }: { searchParams: Promise<{ vue?: string; q?: string }> }) {
  const user = await requirePageUser("tournaments.view");
  const sp = await searchParams;
  const view = (VIEWS.find(([v]) => v === sp.vue)?.[0] ?? "upcoming") as AdminTournamentView;
  const q = (sp.q ?? "").slice(0, 80);
  const list = await listAdminTournaments(view, q);
  const manage = can(user.role, "tournaments.manage");

  return (
    <>
      <AdminPageHeader
        title="Tournois"
        description="Créez, publiez et gérez les tournois et leur capacité."
        actions={
          manage && (
            <Link href="/admin/tournois/nouveau" className="btn btn-gold btn-sm">
              <Plus className="h-4 w-4" aria-hidden /> Nouveau tournoi
            </Link>
          )
        }
      />
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <nav className="flex flex-wrap gap-1" aria-label="Filtrer les tournois">
          {VIEWS.map(([v, label]) => (
            <Link
              key={v}
              href={`/admin/tournois?vue=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              aria-current={v === view ? "page" : undefined}
              className={`rounded-full px-3.5 py-1.5 text-sm ${v === view ? "bg-gold-400 text-night-950" : "text-ivory-dim hover:bg-white/[0.05]"}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <form method="get" className="flex gap-2" role="search">
          <input type="hidden" name="vue" value={view} />
          <label htmlFor="tq" className="sr-only">
            Rechercher
          </label>
          <input id="tq" name="q" type="search" defaultValue={q} placeholder="Rechercher un tournoi" className="field !min-h-10 md:w-64" />
          <button type="submit" className="btn btn-outline btn-sm" aria-label="Rechercher">
            <Search className="h-4 w-4" />
          </button>
        </form>
      </div>

      {list.length ? (
        <div className={tableWrap}>
          <table className="w-full min-w-[60rem]">
            <thead>
              <tr>
                <th className={th}>Date</th>
                <th className={th}>Tournoi</th>
                <th className={th}>Inscrits</th>
                <th className={th}>À traiter</th>
                <th className={th}>Inscriptions</th>
                <th className={th}>Publication</th>
                <th className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => (
                <tr key={t.id} className={rowClass}>
                  <td className={`${td} whitespace-nowrap text-ivory-dim`}>
                    {formatDateShort(t.startsAt)}
                    <br />
                    <span className="text-fog">{formatTime(t.startsAt)}</span>
                  </td>
                  <td className={td}>
                    <Link href={`/admin/tournois/${t.id}`} className="font-medium text-ivory hover:text-gold-300">
                      {t.name}
                    </Link>
                    {t.featured && <span className="ml-2 text-xs text-gold-400">★ à la une</span>}
                    <p className="text-xs text-fog">{t.format}</p>
                  </td>
                  <td className={`${td} whitespace-nowrap text-ivory-dim`}>
                    {t.availability.taken} / {t.capacity}
                  </td>
                  <td className={`${td} whitespace-nowrap`}>
                    {t.pendingCount > 0 ? (
                      <Link href={`/admin/reservations?tournoi=${t.id}&statut=pending`} className="text-warn hover:underline">
                        {t.pendingCount} en attente
                      </Link>
                    ) : (
                      <span className="text-fog">—</span>
                    )}
                    {t.waitlistCount > 0 && <p className="text-xs text-info">{t.waitlistCount} en liste d’attente</p>}
                  </td>
                  <td className={td}>
                    <StatusBadge state={t.availability.state} />
                  </td>
                  <td className={`${td} text-ivory-dim`}>{PUB[t.status]}</td>
                  <td className={`${td} text-right`}>
                    <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-sm">
                      <Link href={`/admin/reservations?tournoi=${t.id}`} className="text-gold-300 hover:underline">
                        Réservations
                      </Link>
                      <Link href={`/admin/tournois/${t.id}/places`} className="text-gold-300 hover:underline">
                        Placement
                      </Link>
                      {manage && (
                        <>
                          <ActionForm
                            action={tournamentStatusAction}
                            hidden={{ id: t.id, status: t.status === "published" ? "draft" : "published" }}
                            label={t.status === "published" ? "Dépublier" : "Publier"}
                            buttonClass="text-gold-300 hover:underline"
                            confirm={t.status === "published" ? "Retirer ce tournoi du site public ?" : undefined}
                            messageClass="hidden"
                          />
                          <ActionForm action={duplicateTournamentAction} hidden={{ id: t.id }} label="Dupliquer" buttonClass="text-gold-300 hover:underline" messageClass="hidden" />
                          {t.status !== "archived" && (
                            <ActionForm
                              action={tournamentStatusAction}
                              hidden={{ id: t.id, status: "archived" }}
                              label="Archiver"
                              buttonClass="text-mist hover:text-danger hover:underline"
                              confirm="Archiver ce tournoi ? Il ne sera plus visible sur le site."
                              messageClass="hidden"
                            />
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>
          Aucun tournoi dans cette vue.{" "}
          {manage && (
            <Link href="/admin/tournois/nouveau" className="text-gold-300 underline">
              Créer un tournoi
            </Link>
          )}
        </EmptyState>
      )}
    </>
  );
}
