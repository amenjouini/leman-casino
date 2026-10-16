import Link from "next/link";
import { requirePageUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { listEmailLog } from "@/lib/admin/queries";
import { getSettings, EMAIL_TEMPLATE_LABELS, type EmailTemplateKey } from "@/lib/settings";
import { emailDriver } from "@/lib/email/mailer";
import { sendRemindersAction } from "@/lib/admin/actions/bookings";
import { formatDateTime } from "@/lib/format";
import { AdminPageHeader, EmptyState, Pagination, Panel, tableWrap, th, td, rowClass } from "@/components/admin/ui";
import { EmailSettingsForm } from "@/components/admin/SettingsForms";
import { ActionForm } from "@/components/admin/ActionForm";

export const metadata = { title: "E-mails" };

const STATUS = { sent: ["Envoyé", "text-ok"], failed: ["Échec", "text-danger"], skipped: ["Non envoyé", "text-warn"] } as const;

export default async function EmailsPage({ searchParams }: { searchParams: Promise<{ statut?: string; page?: string }> }) {
  const user = await requirePageUser("emails.view");
  const sp = await searchParams;
  const status = sp.statut ?? "";
  const [log, settings] = await Promise.all([listEmailLog(status, Math.max(1, Number(sp.page) || 1)), getSettings("email")]);
  const driver = emailDriver();
  const configured = driver !== "none";
  const vars = [
    ["SMTP_HOST", !!process.env.SMTP_HOST],
    ["SMTP_PORT", !!process.env.SMTP_PORT],
    ["SMTP_USER", !!process.env.SMTP_USER],
    ["SMTP_PASSWORD", !!process.env.SMTP_PASSWORD],
    ["SMTP_FROM", !!process.env.SMTP_FROM],
  ] as const;

  return (
    <>
      <AdminPageHeader title="E-mails" description="Configuration, modèles et journal des envois." />

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Panel title="État de l’envoi">
          <p className={`text-sm ${configured ? "text-ok" : "text-warn"}`}>
            {configured ? `Envoi actif (${driver === "smtp" ? "SMTP" : "mode test en mémoire"}).` : "Envoi désactivé : aucun e-mail n’est envoyé (les demandes restent enregistrées)."}
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-xs">
            {vars.map(([k, set]) => (
              <li key={k} className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${set ? "bg-ok" : "bg-fog"}`} aria-hidden />
                <code className="font-mono text-ivory-dim">{k}</code>
                <span className="text-fog">{set ? "défini" : "absent"}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-fog">Les identifiants SMTP se définissent dans les variables d’environnement du serveur et ne sont jamais affichés ici.</p>
        </Panel>
        <Panel title="Rappels">
          <p className="text-sm text-mist">
            {settings.remindersEnabled
              ? `Activés : envoi aux réservations confirmées ${settings.reminderHoursBefore} h avant le début (tâche planifiée quotidienne).`
              : "Désactivés. Activez-les dans les paramètres ci-dessous."}
          </p>
          {can(user.role, "bookings.manage") && <ActionForm action={sendRemindersAction} label="Envoyer les rappels dus maintenant" buttonClass="btn btn-outline btn-sm mt-4" />}
        </Panel>
      </div>

      <h2 className="mb-3 font-sans text-sm font-semibold uppercase tracking-[0.14em] text-ivory-dim">Journal des envois</h2>
      <nav className="mb-4 flex flex-wrap gap-1" aria-label="Filtrer">
        {[
          ["", "Tous"],
          ["sent", "Envoyés"],
          ["failed", "Échecs"],
          ["skipped", "Non envoyés"],
        ].map(([k, label]) => (
          <Link
            key={k}
            href={k ? `/admin/emails?statut=${k}` : "/admin/emails"}
            aria-current={k === status ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm ${k === status ? "bg-gold-400 text-night-950" : "text-ivory-dim hover:bg-white/[0.05]"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {log.rows.length ? (
        <div className={tableWrap}>
          <table className="w-full min-w-[52rem]">
            <thead>
              <tr>
                <th className={th}>Date</th>
                <th className={th}>Modèle</th>
                <th className={th}>Destinataire</th>
                <th className={th}>Réservation</th>
                <th className={th}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {log.rows.map(({ log: l, reference }) => (
                <tr key={l.id} className={rowClass}>
                  <td className={`${td} whitespace-nowrap text-xs text-fog`}>{formatDateTime(l.createdAt)}</td>
                  <td className={`${td} text-ivory-dim`}>
                    {EMAIL_TEMPLATE_LABELS[l.template as EmailTemplateKey] ?? l.template}
                    <p className="text-xs text-fog">{l.subject}</p>
                  </td>
                  <td className={`${td} break-all text-ivory-dim`}>{l.recipient}</td>
                  <td className={td}>
                    {l.bookingId && reference ? (
                      <Link href={`/admin/reservations/${l.bookingId}`} className="font-mono text-gold-300 hover:underline">
                        {reference}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={td}>
                    <span className={STATUS[l.status][1]}>{STATUS[l.status][0]}</span>
                    {l.error && <p className="max-w-xs text-xs text-fog">{l.error}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>Aucun e-mail dans ce journal.</EmptyState>
      )}
      <Pagination page={log.page} pages={log.pages} href={(p) => `/admin/emails?${new URLSearchParams({ ...(status ? { statut: status } : {}), page: String(p) })}`} />

      {can(user.role, "settings.manage") && (
        <div className="mt-12">
          <h2 className="mb-4 text-3xl text-ivory">Paramètres e-mail</h2>
          <EmailSettingsForm value={settings} smtpConfigured={configured} />
        </div>
      )}
    </>
  );
}
