import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePageUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getBookingDetail } from "@/lib/admin/queries";
import { allowedTransitions, countsTowardCapacity } from "@/lib/bookings";
import { templateForStatus, seatLabel } from "@/lib/email/notifications";
import { AUDIT_ACTION_LABELS } from "@/lib/audit";
import { BOOKING_STATUS_LABELS } from "@/lib/constants";
import { EMAIL_TEMPLATE_LABELS, type EmailTemplateKey } from "@/lib/settings";
import { formatDateLong, formatDateTime, formatTime } from "@/lib/format";
import { AdminPageHeader, BookingPill, EmptyState, Panel } from "@/components/admin/ui";
import { StatusActions } from "@/components/admin/StatusActions";
import { BookingEditForm, ResendEmailForm, SeatPickerAdmin } from "@/components/admin/BookingEditor";

export const metadata = { title: "Réservation" };

function describeAudit(action: string, details: Record<string, unknown>) {
  if (action === "booking.status_changed") {
    const from = BOOKING_STATUS_LABELS[details.from as keyof typeof BOOKING_STATUS_LABELS] ?? details.from;
    const to = BOOKING_STATUS_LABELS[details.to as keyof typeof BOOKING_STATUS_LABELS] ?? details.to;
    return `${from} → ${to}${details.note ? ` — « ${details.note} »` : ""}`;
  }
  if (action === "booking.email_sent") {
    return `${EMAIL_TEMPLATE_LABELS[details.template as EmailTemplateKey] ?? details.template} : ${details.status === "sent" ? "envoyé" : details.status === "failed" ? "échec" : "non envoyé"}`;
  }
  if (action === "booking.updated") return `Champs : ${Object.keys(details).join(", ") || "—"}`;
  if (action === "booking.seats_changed") {
    const to = (details.to as { table: number; seat: number }[] | undefined) ?? [];
    return to.length ? `Sièges : ${to.map((s) => `T${s.table}·${s.seat}`).join(", ")}` : "Sièges libérés";
  }
  if (action === "booking.created") return `Statut initial : ${BOOKING_STATUS_LABELS[details.status as keyof typeof BOOKING_STATUS_LABELS] ?? details.status}`;
  return "";
}

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser("bookings.view");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const d = await getBookingDetail(id);
  if (!d) notFound();
  const { booking: b, tournament: t } = d;
  const manage = can(user.role, "bookings.manage");
  const allowed = allowedTransitions(b.status, user.role);

  return (
    <>
      <AdminPageHeader
        title={b.fullName}
        description={`Réservation ${b.reference} · reçue le ${formatDateTime(b.createdAt)}`}
        back={{ href: "/admin/reservations", label: "Réservations" }}
        actions={<BookingPill status={b.status} />}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel title="Statut">
            <p className="mb-4 text-sm text-mist">
              Statut actuel : <strong className="text-ivory">{BOOKING_STATUS_LABELS[b.status]}</strong>
              {b.confirmedAt && ` · confirmée le ${formatDateTime(b.confirmedAt)}`}
              {b.checkedInAt && ` · pointée le ${formatDateTime(b.checkedInAt)}`}
              {b.cancelledAt && ` · clôturée le ${formatDateTime(b.cancelledAt)}`}
            </p>
            <StatusActions bookingId={b.id} allowed={allowed} canNotify={manage} />
          </Panel>

          <Panel title="Détails">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-fog">Tournoi</dt>
                <dd>
                  <Link href={`/admin/tournois/${t.id}`} className="text-ivory hover:text-gold-300">
                    {t.name}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-fog">Date</dt>
                <dd className="text-ivory first-letter:uppercase">
                  {formatDateLong(t.startsAt)} · {formatTime(t.startsAt)}
                </dd>
              </div>
              <div>
                <dt className="text-fog">E-mail</dt>
                <dd>
                  <a href={`mailto:${b.email}`} className="break-all text-ivory hover:text-gold-300">
                    {b.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-fog">Téléphone</dt>
                <dd className="text-ivory">{b.phone ? <a href={`tel:${b.phone.replace(/[^+0-9]/g, "")}`}>{b.phone}</a> : "—"}</dd>
              </div>
              <div>
                <dt className="text-fog">Places</dt>
                <dd className="text-ivory">{b.places}</dd>
              </div>
              <div>
                <dt className="text-fog">Sièges</dt>
                <dd className="text-ivory">{d.seats.length ? d.seats.map((s) => seatLabel(t, s.tableNumber, s.seatNumber)).join(", ") : "Non attribués"}</dd>
              </div>
              {b.message && (
                <div className="sm:col-span-2">
                  <dt className="text-fog">Message du joueur</dt>
                  <dd className="whitespace-pre-line text-ivory-dim">{b.message}</dd>
                </div>
              )}
              {b.staffNote && (
                <div className="sm:col-span-2">
                  <dt className="text-fog">Note interne</dt>
                  <dd className="whitespace-pre-line text-ivory-dim">{b.staffNote}</dd>
                </div>
              )}
              <div>
                <dt className="text-fog">Fiche joueur</dt>
                <dd>
                  {can(user.role, "players.view") ? (
                    <Link href={`/admin/joueurs/${b.playerId}`} className="text-gold-300 hover:underline">
                      Historique du joueur
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
          </Panel>

          {manage && (
            <Panel title="Modifier la réservation">
              <BookingEditForm
                key={b.updatedAt.toISOString()}
                booking={{ id: b.id, fullName: b.fullName, email: b.email, phone: b.phone ?? "", places: b.places, message: b.message, staffNote: b.staffNote }}
              />
            </Panel>
          )}

          {manage && countsTowardCapacity(b.status) && (
            <Panel title="Sièges">
              <SeatPickerAdmin
                key={d.seats.map((s) => s.id).join()}
                bookingId={b.id}
                places={b.places}
                tableCount={t.tableCount}
                seatsPerTable={t.seatsPerTable}
                labels={t.tableLabels}
                current={d.seats.map((s) => ({ table: s.tableNumber, seat: s.seatNumber }))}
                occupiedByOthers={d.occupied.filter((o) => o.bookingId !== b.id)}
              />
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          {manage && (
            <Panel title="Envoyer un e-mail">
              <ResendEmailForm bookingId={b.id} suggested={templateForStatus(b.status)} />
            </Panel>
          )}

          <Panel title="E-mails">
            {d.emails.length ? (
              <ul className="space-y-3 text-sm">
                {d.emails.map((e) => (
                  <li key={e.id} className="rounded-xl border border-white/[0.06] p-3">
                    <p className="flex items-center justify-between gap-3">
                      <span className="text-ivory-dim">{EMAIL_TEMPLATE_LABELS[e.template as EmailTemplateKey] ?? e.template}</span>
                      <span className={e.status === "sent" ? "text-ok" : e.status === "failed" ? "text-danger" : "text-warn"}>
                        {e.status === "sent" ? "Envoyé" : e.status === "failed" ? "Échec" : "Non envoyé"}
                      </span>
                    </p>
                    <p className="text-xs text-fog">
                      {formatDateTime(e.createdAt)} → {e.recipient}
                    </p>
                    {e.error && <p className="mt-1 text-xs text-danger">{e.error}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState>Aucun e-mail.</EmptyState>
            )}
          </Panel>

          <Panel title="Historique">
            {d.audit.length ? (
              <ol className="space-y-4 border-l border-white/10 pl-4 text-sm">
                {d.audit.map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full bg-gold-500" aria-hidden />
                    <p className="text-ivory-dim">{AUDIT_ACTION_LABELS[a.action] ?? a.action}</p>
                    <p className="text-xs text-mist">{describeAudit(a.action, a.details)}</p>
                    <p className="text-xs text-fog">
                      {formatDateTime(a.createdAt)} · {a.actorLabel}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState>Aucun historique.</EmptyState>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
