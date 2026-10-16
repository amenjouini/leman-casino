"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db";
import { players, type BookingStatus } from "../../db/schema";
import { BOOKING_STATUSES } from "../../constants";
import { changeBookingStatus, drawSeats, setBookingSeats, updateBookingDetails } from "../../bookings";
import { actorOf, requireUser } from "../../auth/session";
import { sendBookingEmail, sendDueReminders, templateForStatus } from "../../email/notifications";
import { EMAIL_TEMPLATE_KEYS, type EmailTemplateKey } from "../../settings";
import { writeAudit } from "../../audit";
import { PHONE_REGEX, cleanText } from "../../validation";
import { runAction, str, bool, FormError, type ActionState } from "../action";

const uuid = z.uuid();
const EMAIL_RESULT = { sent: "E-mail envoyé.", failed: "Échec de l'envoi de l'e-mail (voir le journal des e-mails).", skipped: "E-mail non envoyé : envoi non configuré." } as const;

export async function changeStatusAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUser("bookings.checkin");
    const bookingId = uuid.parse(str(fd, "bookingId"));
    const status = str(fd, "status") as BookingStatus;
    if (!BOOKING_STATUSES.includes(status)) throw new FormError("Statut inconnu.");
    const note = cleanText(str(fd, "note")).slice(0, 1000);
    const { booking, from } = await changeBookingStatus(bookingId, status, actorOf(user), { note });
    let message = "Statut mis à jour.";
    const template = templateForStatus(status);
    if (from !== status && bool(fd, "notify") && template && user.role !== "staff") {
      const res = await sendBookingEmail(booking.id, template, { note, actor: actorOf(user) });
      message += ` ${EMAIL_RESULT[res.status]}`;
    }
    revalidatePath("/admin", "layout");
    return message;
  });
}

export async function resendEmailAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUser("bookings.manage");
    const bookingId = uuid.parse(str(fd, "bookingId"));
    const template = str(fd, "template") as EmailTemplateKey;
    if (!EMAIL_TEMPLATE_KEYS.includes(template) || template.startsWith("owner_")) throw new FormError("Modèle inconnu.");
    const res = await sendBookingEmail(bookingId, template, { note: cleanText(str(fd, "note")).slice(0, 1000), actor: actorOf(user) });
    revalidatePath(`/admin/reservations/${bookingId}`);
    if (res.status !== "sent") throw new FormError(EMAIL_RESULT[res.status]);
    return EMAIL_RESULT.sent;
  });
}

export async function updateBookingAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUser("bookings.manage");
    const bookingId = uuid.parse(str(fd, "bookingId"));
    const schema = z.object({
      fullName: z.string().transform(cleanText).pipe(z.string().min(2, "Nom requis").max(100)),
      email: z.string().trim().toLowerCase().pipe(z.email("E-mail invalide")),
      phone: z
        .string()
        .trim()
        .max(25)
        .refine((v) => v === "" || PHONE_REGEX.test(v), "Téléphone invalide"),
      places: z.coerce.number().int().min(1, "Au moins 1").max(20),
      message: z.string().max(1000).transform(cleanText),
      staffNote: z.string().max(2000).transform(cleanText),
    });
    const data = schema.parse({
      fullName: str(fd, "fullName"),
      email: str(fd, "email"),
      phone: str(fd, "phone"),
      places: str(fd, "places"),
      message: str(fd, "message"),
      staffNote: str(fd, "staffNote"),
    });
    await updateBookingDetails(bookingId, data, actorOf(user));
    revalidatePath("/admin", "layout");
    return "Réservation mise à jour.";
  });
}

export async function setSeatsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUser("bookings.manage");
    const bookingId = uuid.parse(str(fd, "bookingId"));
    const seats = str(fd, "seats")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((pair) => {
        const [table, seat] = pair.split(":").map(Number);
        if (!Number.isInteger(table) || !Number.isInteger(seat)) throw new FormError("Format de siège invalide.");
        return { table, seat };
      });
    await setBookingSeats(bookingId, seats, actorOf(user));
    revalidatePath("/admin", "layout");
    return seats.length ? "Sièges enregistrés." : "Sièges libérés.";
  });
}

export async function drawSeatsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUser("bookings.manage");
    const tournamentId = uuid.parse(str(fd, "tournamentId"));
    const res = await drawSeats(tournamentId, actorOf(user));
    revalidatePath(`/admin/tournois/${tournamentId}/places`);
    if (res.assigned === 0 && res.unassigned === 0) return "Tous les joueurs confirmés ont déjà un siège.";
    return `${res.assigned} siège(s) attribué(s) par tirage au sort${res.unassigned ? `, ${res.unassigned} sans place disponible` : ""}.`;
  });
}

export async function updatePlayerAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUser("players.manage");
    const id = uuid.parse(str(fd, "playerId"));
    const data = z
      .object({
        fullName: z.string().transform(cleanText).pipe(z.string().min(2, "Nom requis").max(100)),
        phone: z
          .string()
          .trim()
          .max(25)
          .refine((v) => v === "" || PHONE_REGEX.test(v), "Téléphone invalide"),
        notes: z.string().max(4000).transform(cleanText),
      })
      .parse({ fullName: str(fd, "fullName"), phone: str(fd, "phone"), notes: str(fd, "notes") });
    const db = await getDb();
    await db
      .update(players)
      .set({ fullName: data.fullName, phone: data.phone || null, notes: data.notes, updatedAt: new Date() })
      .where(eq(players.id, id));
    await writeAudit(db, actorOf(user), { action: "player.updated", entityType: "player", entityId: id, details: { fullName: data.fullName } });
    revalidatePath(`/admin/joueurs/${id}`);
    return "Fiche joueur mise à jour.";
  });
}

export async function sendRemindersAction(): Promise<ActionState> {
  return runAction(async () => {
    await requireUser("bookings.manage");
    const res = await sendDueReminders();
    revalidatePath("/admin/emails");
    if (res.disabled) throw new FormError("Les rappels sont désactivés dans les paramètres e-mail.");
    return `Rappels : ${res.sent} envoyé(s), ${res.failed} échec(s), ${res.skipped} non envoyé(s).`;
  });
}
