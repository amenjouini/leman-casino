import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePageUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getPlayerDetail } from "@/lib/admin/queries";
import { updatePlayerAction } from "@/lib/admin/actions/bookings";
import { formatDateShort, formatDateTime } from "@/lib/format";
import { AdminPageHeader, BookingPill, EmptyState, Panel, StatCard, tableWrap, th, td, rowClass } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";

export const metadata = { title: "Fiche joueur" };

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser("players.view");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const d = await getPlayerDetail(id);
  if (!d) notFound();
  const { player: p, history } = d;
  const count = (s: string[]) => history.filter((h) => s.includes(h.booking.status)).length;

  return (
    <>
      <AdminPageHeader title={p.fullName} description={`${p.email} · fiche créée le ${formatDateTime(p.createdAt)}`} back={{ href: "/admin/joueurs", label: "Joueurs" }} />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Réservations" value={history.length} />
        <StatCard label="Présences" value={count(["attended"])} tone="ok" />
        <StatCard label="No-shows" value={count(["no_show"])} tone={count(["no_show"]) ? "danger" : "default"} />
        <StatCard label="Annulées / refusées" value={count(["cancelled", "rejected"])} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div>
          <h2 className="mb-3 font-sans text-sm font-semibold uppercase tracking-[0.14em] text-ivory-dim">Participation</h2>
          {history.length ? (
            <div className={tableWrap}>
              <table className="w-full min-w-[36rem]">
                <thead>
                  <tr>
                    <th className={th}>Tournoi</th>
                    <th className={th}>Date</th>
                    <th className={th}>Places</th>
                    <th className={th}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.booking.id} className={rowClass}>
                      <td className={td}>
                        <Link href={`/admin/reservations/${h.booking.id}`} className="text-ivory hover:text-gold-300">
                          {h.tournamentName}
                        </Link>
                        <p className="font-mono text-xs text-fog">{h.booking.reference}</p>
                      </td>
                      <td className={`${td} text-ivory-dim`}>{formatDateShort(h.startsAt)}</td>
                      <td className={`${td} text-ivory-dim`}>{h.booking.places}</td>
                      <td className={td}>
                        <BookingPill status={h.booking.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState>Aucune réservation.</EmptyState>
          )}
        </div>
        {can(user.role, "players.manage") && (
          <Panel title="Coordonnées">
            <ActionForm key={p.updatedAt.toISOString()} action={updatePlayerAction} hidden={{ playerId: p.id }} label="Enregistrer" buttonClass="btn btn-gold btn-sm mt-4" className="space-y-4">
              <div>
                <label htmlFor="p-name" className="field-label">
                  Nom complet
                </label>
                <input id="p-name" name="fullName" defaultValue={p.fullName} className="field" />
              </div>
              <div>
                <label htmlFor="p-phone" className="field-label">
                  Téléphone
                </label>
                <input id="p-phone" name="phone" defaultValue={p.phone ?? ""} className="field" />
              </div>
              <div>
                <label htmlFor="p-notes" className="field-label">
                  Notes internes
                </label>
                <textarea id="p-notes" name="notes" defaultValue={p.notes} className="field min-h-28" />
              </div>
              <p className="text-xs text-fog">L’e-mail identifie le joueur ; pour le corriger, modifiez-le sur la réservation concernée.</p>
            </ActionForm>
          </Panel>
        )}
      </div>
    </>
  );
}
