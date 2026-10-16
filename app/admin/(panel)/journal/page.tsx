import Link from "next/link";
import { requirePageUser } from "@/lib/auth/session";
import { listAudit } from "@/lib/admin/queries";
import { AUDIT_ACTION_LABELS } from "@/lib/audit";
import { formatDateTime } from "@/lib/format";
import { AdminPageHeader, EmptyState, Pagination, tableWrap, th, td, rowClass } from "@/components/admin/ui";

export const metadata = { title: "Journal d'activité" };

const ENTITIES = [
  ["", "Tout"],
  ["booking", "Réservations"],
  ["tournament", "Tournois"],
  ["player", "Joueurs"],
  ["settings", "Paramètres"],
  ["user", "Utilisateurs"],
];

function summary(details: Record<string, unknown>) {
  const text = JSON.stringify(details);
  return text === "{}" ? "" : text.length > 160 ? `${text.slice(0, 160)}…` : text;
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ type?: string; page?: string }> }) {
  await requirePageUser("audit.view");
  const sp = await searchParams;
  const entity = ENTITIES.some(([k]) => k === sp.type) ? (sp.type ?? "") : "";
  const { rows, page, pages } = await listAudit(Math.max(1, Number(sp.page) || 1), entity);

  return (
    <>
      <AdminPageHeader title="Journal d’activité" description="Toutes les actions qui modifient les réservations, tournois, paramètres et accès." />
      <nav className="mb-4 flex flex-wrap gap-1" aria-label="Filtrer">
        {ENTITIES.map(([k, label]) => (
          <Link
            key={k}
            href={k ? `/admin/journal?type=${k}` : "/admin/journal"}
            aria-current={k === entity ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm ${k === entity ? "bg-gold-400 text-night-950" : "text-ivory-dim hover:bg-white/[0.05]"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {rows.length ? (
        <div className={tableWrap}>
          <table className="w-full min-w-[52rem]">
            <thead>
              <tr>
                <th className={th}>Date</th>
                <th className={th}>Action</th>
                <th className={th}>Auteur</th>
                <th className={th}>Détails</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className={rowClass}>
                  <td className={`${td} whitespace-nowrap text-xs text-fog`}>{formatDateTime(a.createdAt)}</td>
                  <td className={td}>
                    {a.bookingId ? (
                      <Link href={`/admin/reservations/${a.bookingId}`} className="text-ivory hover:text-gold-300">
                        {AUDIT_ACTION_LABELS[a.action] ?? a.action}
                      </Link>
                    ) : a.entityType === "tournament" && a.entityId ? (
                      <Link href={`/admin/tournois/${a.entityId}`} className="text-ivory hover:text-gold-300">
                        {AUDIT_ACTION_LABELS[a.action] ?? a.action}
                      </Link>
                    ) : (
                      <span className="text-ivory">{AUDIT_ACTION_LABELS[a.action] ?? a.action}</span>
                    )}
                  </td>
                  <td className={`${td} text-xs text-mist`}>{a.actorLabel}</td>
                  <td className={`${td} max-w-md break-all font-mono text-xs text-fog`}>{summary(a.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>Aucune activité enregistrée.</EmptyState>
      )}
      <Pagination page={page} pages={pages} href={(p) => `/admin/journal?${new URLSearchParams({ ...(entity ? { type: entity } : {}), page: String(p) })}`} />
    </>
  );
}
