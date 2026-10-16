import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { z } from "zod";
import { requirePageUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getTournamentById } from "@/lib/tournaments";
import { tournamentToForm } from "@/lib/admin/tournament-values";
import { duplicateTournamentAction, tournamentStatusAction } from "@/lib/admin/actions/tournaments";
import { AdminPageHeader } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";
import { TournamentForm } from "@/components/admin/TournamentForm";
import { StatusBadge } from "@/components/tournaments/StatusBadge";
import { ResultsEditor } from "@/components/admin/ResultsEditor";
import { Panel } from "@/components/admin/ui";
import { getResults } from "@/lib/results";
import { tournamentRoster } from "@/lib/admin/queries";

export const metadata = { title: "Modifier le tournoi" };

export default async function EditTournamentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ cree?: string; copie?: string }> }) {
  const user = await requirePageUser("tournaments.view");
  const { id } = await params;
  const sp = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const t = await getTournamentById(id);
  if (!t) notFound();
  const manage = can(user.role, "tournaments.manage");
  const started = t.startsAt.getTime() <= Date.now();
  const [results, roster] = started && manage ? await Promise.all([getResults(t.id), tournamentRoster(t.id)]) : [[], []];
  const candidates = roster
    .filter((b) => ["attended", "confirmed", "no_show"].includes(b.status))
    .map((b) => ({ bookingId: b.id, label: b.publicName || b.fullName }));

  return (
    <>
      <AdminPageHeader
        title={t.name}
        back={{ href: "/admin/tournois", label: "Tournois" }}
        actions={
          <>
            <Link href={`/admin/reservations?tournoi=${t.id}`} className="btn btn-outline btn-sm">
              Réservations ({t.availability.taken}/{t.capacity})
            </Link>
            <Link href={`/admin/tournois/${t.id}/places`} className="btn btn-outline btn-sm">
              Placement
            </Link>
            {t.status === "published" && (
              <Link href={`/tournois/${t.slug}`} target="_blank" className="btn btn-outline btn-sm">
                <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Page publique
              </Link>
            )}
            {manage && <ActionForm action={duplicateTournamentAction} hidden={{ id: t.id }} label="Dupliquer" buttonClass="btn btn-outline btn-sm" messageClass="hidden" />}
            {manage && (
              <ActionForm
                action={tournamentStatusAction}
                hidden={{ id: t.id, status: t.status === "published" ? "draft" : "published" }}
                label={t.status === "published" ? "Dépublier" : "Publier"}
                buttonClass={t.status === "published" ? "btn btn-outline btn-sm" : "btn btn-gold btn-sm"}
              />
            )}
          </>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge state={t.availability.state} />
        <span className="text-sm text-mist">{{ draft: "Brouillon (non visible)", published: "Publié sur le site", archived: "Archivé" }[t.status]}</span>
      </div>
      {sp.cree && <p className="mb-6 rounded-xl border border-ok/30 bg-ok/[0.07] p-4 text-sm text-ok">Tournoi créé. Vérifiez les informations puis publiez-le.</p>}
      {sp.copie && <p className="mb-6 rounded-xl border border-info/30 bg-info/[0.07] p-4 text-sm text-info">Copie créée en brouillon, une semaine plus tard. Ajustez le nom et les dates.</p>}
      {started && manage && (
        <Panel title="Résultats du tournoi" className="mb-8">
          <ResultsEditor
            key={t.updatedAt.toISOString()}
            tournamentId={t.id}
            currency={t.currency}
            entriesCount={t.entriesCount}
            published={t.resultsPublished}
            candidates={candidates}
            initial={results.map((r) => ({ displayName: r.displayName, prizeCents: r.prizeCents, deal: r.deal, bookingId: r.bookingId }))}
          />
        </Panel>
      )}
      {manage ? (
        <TournamentForm key={t.updatedAt.toISOString()} initial={tournamentToForm(t)} />
      ) : (
        <p className="text-mist">Vous pouvez consulter ce tournoi mais pas le modifier.</p>
      )}
    </>
  );
}
