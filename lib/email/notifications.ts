import { and, asc, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { getDb } from "../db";
import { bookings, emailLog, seatAssignments, tournaments, type Booking, type Tournament } from "../db/schema";
import { BOOKING_STATUS_LABELS } from "../constants";
import { formatEntry, formatDateLong, formatTime } from "../format";
import { getSettings, type EmailTemplateKey } from "../settings";
import { siteUrl } from "../request";
import { writeAudit, SYSTEM_ACTOR, type Actor } from "../audit";
import { sendEmail, type SendResult } from "./mailer";
import { manageUrl } from "../manage-link";
import { fillTemplate, renderEmailHtml } from "./render";

export function seatLabel(t: Pick<Tournament, "tableLabels">, table: number, seat: number) {
  const label = t.tableLabels[table - 1]?.trim() || `Table ${table}`;
  return `${label} · siège ${seat}`;
}

async function loadContext(bookingId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ booking: bookings, tournament: tournaments })
    .from(bookings)
    .innerJoin(tournaments, eq(bookings.tournamentId, tournaments.id))
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!row) return null;
  const seats = await db
    .select()
    .from(seatAssignments)
    .where(eq(seatAssignments.bookingId, bookingId))
    .orderBy(asc(seatAssignments.tableNumber), asc(seatAssignments.seatNumber));
  const [site, booking, email] = await Promise.all([getSettings("site"), getSettings("booking"), getSettings("email")]);
  return { ...row, seats, site, bookingSettings: booking, emailSettings: email };
}

function buildVars(ctx: NonNullable<Awaited<ReturnType<typeof loadContext>>>, note?: string): Record<string, string> {
  const { booking: b, tournament: t, seats, site, bookingSettings } = ctx;
  const address = [site.addressLine, [site.postalCode, site.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return {
    nom: b.fullName,
    reference: b.reference,
    tournoi: t.name,
    date: formatDateLong(t.startsAt),
    heure: formatTime(t.startsAt),
    places: String(b.places),
    sieges: seats.length ? seats.map((s) => seatLabel(t, s.tableNumber, s.seatNumber)).join(", ") : "attribués sur place par notre équipe",
    lieu: [t.venue, site.casinoName, address].filter(Boolean).join(" — "),
    droit_entree: formatEntry(t),
    casino: site.casinoName,
    telephone_casino: site.phone,
    email_casino: site.email,
    politique_annulation: bookingSettings.cancellationPolicy ? `Conditions d’annulation : ${bookingSettings.cancellationPolicy}` : "",
    statut: BOOKING_STATUS_LABELS[b.status],
    email_joueur: b.email,
    telephone_joueur: b.phone ?? "—",
    message: b.message || "—",
    note: note ?? "",
    lien_admin: `${siteUrl()}/admin/reservations/${b.id}`,
    lien_reservation: manageUrl(b.id) ?? "contactez-nous en indiquant votre référence",
  };
}

async function deliver(
  ctx: NonNullable<Awaited<ReturnType<typeof loadContext>>>,
  template: EmailTemplateKey,
  to: string,
  note: string | undefined,
  actor: Actor,
): Promise<SendResult> {
  const tpl = ctx.emailSettings.templates[template];
  const vars = buildVars(ctx, note);
  const subject = fillTemplate(tpl.subject, vars).replace(/\s+/g, " ");
  const text = fillTemplate(tpl.body, vars);
  const footer = [ctx.site.casinoName, ctx.site.city, ctx.site.phone, ctx.site.email].filter(Boolean).join(" · ");
  const result = await sendEmail({
    to,
    subject,
    text,
    html: renderEmailHtml({ title: subject, body: text, casinoName: ctx.site.casinoName, footer }),
    fromName: ctx.emailSettings.senderName || ctx.site.casinoName,
    fromAddress: ctx.emailSettings.senderAddress || undefined,
    replyTo: template.startsWith("owner_") ? ctx.booking.email : ctx.emailSettings.replyTo || ctx.site.email || undefined,
  });
  const db = await getDb();
  await db.insert(emailLog).values({
    bookingId: ctx.booking.id,
    template,
    recipient: to,
    subject,
    status: result.status,
    error: result.status === "sent" ? null : result.error,
    providerMessageId: result.status === "sent" ? result.messageId : null,
  });
  if (!template.startsWith("owner_")) {
    await writeAudit(db, actor, {
      action: "booking.email_sent",
      entityType: "booking",
      entityId: ctx.booking.id,
      bookingId: ctx.booking.id,
      details: { template, status: result.status, error: result.status === "sent" ? undefined : result.error },
    });
  }
  return result;
}

/** Sends a player-facing template for a booking. Never throws: failures are logged. */
export async function sendBookingEmail(
  bookingId: string,
  template: EmailTemplateKey,
  opts: { note?: string; actor?: Actor } = {},
): Promise<SendResult> {
  try {
    const ctx = await loadContext(bookingId);
    if (!ctx) return { status: "failed", error: "Réservation introuvable" };
    return await deliver(ctx, template, ctx.booking.email, opts.note, opts.actor ?? SYSTEM_ACTOR);
  } catch (err) {
    console.error("[email] erreur inattendue", err);
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}

/** Notifies the owner / staff address about a new request. Never throws. */
export async function notifyOwnerOfBooking(bookingId: string, template: "owner_new_booking" | "owner_booking_cancelled" = "owner_new_booking"): Promise<SendResult> {
  try {
    const ctx = await loadContext(bookingId);
    if (!ctx) return { status: "failed", error: "Réservation introuvable" };
    const to = ctx.emailSettings.ownerNotificationEmail || ctx.site.email;
    if (!to) return { status: "skipped", error: "Aucune adresse de notification configurée." };
    return await deliver(ctx, template, to, undefined, SYSTEM_ACTOR);
  } catch (err) {
    console.error("[email] erreur inattendue", err);
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}

export function templateForStatus(status: Booking["status"]): EmailTemplateKey | null {
  switch (status) {
    case "pending":
      return "booking_received";
    case "confirmed":
      return "booking_confirmed";
    case "waitlisted":
      return "booking_waitlisted";
    case "rejected":
      return "booking_rejected";
    case "cancelled":
      return "booking_cancelled";
    default:
      return null;
  }
}

/** Sends reminders for confirmed bookings of tournaments starting within the configured window. */
export async function sendDueReminders(now = new Date()): Promise<{ sent: number; failed: number; skipped: number; disabled?: boolean }> {
  const emailSettings = await getSettings("email");
  if (!emailSettings.remindersEnabled) return { sent: 0, failed: 0, skipped: 0, disabled: true };
  const db = await getDb();
  const horizon = new Date(now.getTime() + emailSettings.reminderHoursBefore * 3600 * 1000);
  const due = await db
    .select({ id: bookings.id })
    .from(bookings)
    .innerJoin(tournaments, eq(bookings.tournamentId, tournaments.id))
    .where(
      and(
        inArray(bookings.status, ["confirmed"]),
        isNull(bookings.reminderSentAt),
        gte(tournaments.startsAt, now),
        lte(tournaments.startsAt, horizon),
        eq(tournaments.status, "published"),
      ),
    );
  const totals = { sent: 0, failed: 0, skipped: 0 };
  for (const { id } of due) {
    const result = await sendBookingEmail(id, "booking_reminder");
    totals[result.status]++;
    if (result.status === "sent") {
      await db.update(bookings).set({ reminderSentAt: new Date() }).where(eq(bookings.id, id));
    }
  }
  return totals;
}
