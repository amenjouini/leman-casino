import Link from "next/link";
import { AlertTriangle, ArrowRight, Plus } from "lucide-react";
import { requirePageUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { dashboardData } from "@/lib/admin/queries";
import { allowedTransitions } from "@/lib/bookings";
import { AUDIT_ACTION_LABELS } from "@/lib/audit";
import { BOOKING_STATUS_LABELS } from "@/lib/constants";
import { formatDateShort, formatDateTime, formatTime } from "@/lib/format";
import { isEmailConfigured } from "@/lib/email/mailer";
import { demoEnabled } from "@/lib/demo";
import { resetDemoAction } from "@/lib/admin/actions/settings";
import { ActionForm } from "@/components/admin/ActionForm";
import { AdminPageHeader, EmptyState, Panel, StatCard, tableWrap, th, td, rowClass } from "@/components/admin/ui";
import { StatusActions } from "@/components/admin/StatusActions";
import { StatusBadge } from "@/components/tournaments/StatusBadge";

export const metadata = { title: "Tableau de bord" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ refus?: string }> }) {
  const user = await requirePageUser("dashboard.view");
  const { refus } = await searchParams;
  const d = await dashboardData();
  const manage = can(user.role, "bookings.manage");

  return (
    <>
      <AdminPageHeader
        title={`Bonjour ${user.name.split(" ")[0]}`}
        description="Vue d’ensemble des tournois à venir et des réservations à traiter."
        actions={
          can(user.role, "tournaments.manage") && (
            <Link href="/admin/tournois/nouveau" className="btn btn-gold btn-sm">
              <Plus className="h-4 w-4" aria-hidden /> Nouveau tournoi
            </Link>
          )
        }
      />

      {demoEnabled() && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-gold-500/30 bg-gold-400/[0.06] p-4 text-sm text-ivory-dim md:flex-row md:items-center md:justify-between">
          <p>
            <strong className="text-gold-200">Mode démonstration.</strong> Toutes les données sont fictives et générées automatiquement ; les e-mails ne sont pas envoyés.
          </p>
          {can(user.role, "settings.manage") && (
            <ActionForm
              action={resetDemoAction}
              label="Réinitialiser la démo"
              buttonClass="btn btn-outline btn-sm"
              confirm="Effacer toutes les réservations et tournois et régénérer une démo neuve ?"
              className="shrink-0"
            />
          )}
        </div>
      )}
      {refus && <p className="mb-6 rounded-xl border border-danger/30 bg-danger/[0.07] p-4 text-sm text-danger">Vous n’avez pas accès à cette page avec votre rôle.</p>}
      {!isEmailConfigured() && (
        <p className="mb-6 flex gap-3 rounded-xl border border-warn/30 bg-warn/[0.07] p-4 text-sm text-warn">
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
          L’envoi d’e-mails n’est pas configuré (variables SMTP manquantes) : aucun e-mail n’est envoyé aux joueurs ni à l’équipe. Voir la page E-mails.
        </p>
      )}
      {d.failedEmails > 0 && (
        <p className="mb-6 rounded-xl border border-danger/30 bg-danger/[0.07] p-4 text-sm text-danger">
          {d.failedEmails} e-mail(s) en échec ces 7 derniers jours.{" "}
          <Link href="/admin/emails?statut=failed" className="underline">
            Consulter
          </Link>
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Tournois (30 j)" value={d.upcomingCount} href="/admin/tournois" />
        <StatCard label="À confirmer" value={d.pendingCount} tone={d.pendingCount ? "warn" : "default"} href="/admin/reservations?statut=pending" />
        <StatCard label="Joueurs confirmés" value={d.confirmedPlayers} hint="tournois à venir" tone="ok" href="/admin/reservations?statut=confirmed" />
        <StatCard label="Places libres" value={d.seatsAvailable} hint="30 prochains jours" />
        <StatCard label="Liste d'attente" value={d.waitlisted} href="/admin/reservations?statut=waitlisted" />
        <StatCard
          label="Présences (90 j)"
          value={d.attended}
          hint={d.noShowRate == null ? "Aucun pointage" : `${d.noShows} no-show · ${Math.round(d.noShowRate * 100)} %`}
          tone={d.noShowRate != null && d.noShowRate > 0.15 ? "danger" : "default"}
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Demandes en attente"
          actions={
            <Link href="/admin/reservations?statut=pending" className="inline-flex items-center gap-1 text-sm text-gold-300 hover:underline">
              Tout voir <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          }
        >
          {d.pendingList.length ? (
            <ul className="divide-y divide-white/[0.06]">
              {d.pendingList.map((b) => (
                <li key={b.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <Link href={`/admin/reservations/${b.id}`} className="font-medium text-ivory hover:text-gold-300">
                      {b.fullName}
                    </Link>
                    <span className="ml-2 font-mono text-xs text-fog">{b.reference}</span>
                    <p className="text-sm text-mist">
                      {b.tournamentName} · {formatDateShort(b.startsAt)} {formatTime(b.startsAt)} · {b.places} place(s)
                    </p>
                  </div>
                  {manage && <StatusActions bookingId={b.id} allowed={allowedTransitions("pending", user.role).filter((s) => s === "confirmed" || s === "rejected")} canNotify compact />}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>Aucune demande en attente.</EmptyState>
          )}
        </Panel>

        <Panel title="Activité récente">
          {d.activity.length ? (
            <ul className="space-y-3 text-sm">
              {d.activity.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-ivory-dim">
                      {AUDIT_ACTION_LABELS[a.action] ?? a.action}
                      {a.action === "booking.status_changed" && typeof a.details.to === "string" ? ` → ${BOOKING_STATUS_LABELS[a.details.to as keyof typeof BOOKING_STATUS_LABELS] ?? a.details.to}` : ""}
                      {a.action === "booking.email_sent" ? ` : ${a.details.status === "sent" ? "envoyé" : a.details.status === "failed" ? "échec" : "non envoyé"}` : ""}
                      {a.bookingId && (
                        <Link href={`/admin/reservations/${a.bookingId}`} className="ml-1 text-gold-300 hover:underline">
                          (voir)
                        </Link>
                      )}
                    </p>
                    <p className="truncate text-xs text-fog">
                      {formatDateTime(a.createdAt)} · {a.actorLabel}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>Aucune activité pour l’instant.</EmptyState>
          )}
        </Panel>
      </div>

      <h2 className="mb-4 mt-10 font-sans text-sm font-semibold uppercase tracking-[0.14em] text-ivory-dim">Prochains tournois</h2>
      {d.upcoming.length ? (
        <div className={tableWrap}>
          <table className="w-full min-w-[44rem]">
            <thead>
              <tr>
                <th className={th}>Date</th>
                <th className={th}>Tournoi</th>
                <th className={th}>Remplissage</th>
                <th className={th}>Statut</th>
                <th className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {d.upcoming.map((t) => (
                <tr key={t.id} className={rowClass}>
                  <td className={`${td} whitespace-nowrap text-ivory-dim`}>
                    {formatDateShort(t.startsAt)} · {formatTime(t.startsAt)}
                  </td>
                  <td className={td}>
                    <Link href={`/admin/tournois/${t.id}`} className="font-medium text-ivory hover:text-gold-300">
                      {t.name}
                    </Link>
                  </td>
                  <td className={`${td} text-ivory-dim`}>
                    {t.availability.taken} / {t.capacity}
                  </td>
                  <td className={td}>
                    <StatusBadge state={t.availability.state} />
                  </td>
                  <td className={`${td} text-right`}>
                    <Link href={`/admin/tournois/${t.id}/places`} className="text-sm text-gold-300 hover:underline">
                      Placement
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>
          Aucun tournoi publié à venir.{" "}
          {can(user.role, "tournaments.manage") && (
            <Link href="/admin/tournois/nouveau" className="text-gold-300 underline">
              Créer un tournoi
            </Link>
          )}
        </EmptyState>
      )}
    </>
  );
}
