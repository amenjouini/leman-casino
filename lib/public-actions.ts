"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "./db";
import { bookings } from "./db/schema";
import { cancelByPlayer, updatePublicProfile } from "./bookings";
import { manageToken, verifyManageToken } from "./manage-link";
import { notifyOwnerOfBooking, sendBookingEmail } from "./email/notifications";
import { rateLimit } from "./rate-limit";
import { clientIp } from "./request";
import { runAction, str, bool, FormError, type ActionState } from "./admin/action";
import { bookingRequestSchema } from "./validation";

function bookingFromToken(fd: FormData): string {
  const id = verifyManageToken(str(fd, "token"));
  if (!id) throw new FormError("Lien invalide ou expiré.");
  return id;
}

export async function playerCancelAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ip = await clientIp();
    if (!(await rateLimit(`manage:${ip}`, 30, 3600)).ok) throw new FormError("Trop de tentatives. Réessayez plus tard.");
    const id = bookingFromToken(fd);
    await cancelByPlayer(id);
    await sendBookingEmail(id, "booking_cancelled", { note: "Annulation effectuée depuis votre lien personnel." });
    await notifyOwnerOfBooking(id, "owner_booking_cancelled");
    revalidatePath("/reservation/[token]", "page");
    return "Votre réservation a été annulée. Merci d’avoir libéré votre place.";
  });
}

export async function playerProfileAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const id = bookingFromToken(fd);
    const parsed = bookingRequestSchema.shape.publicName.safeParse(str(fd, "publicName"));
    if (!parsed.success) throw new FormError(parsed.error.issues[0]?.message ?? "Pseudo invalide.");
    await updatePublicProfile(id, parsed.data, bool(fd, "showPublicly"));
    revalidatePath("/reservation/[token]", "page");
    return "Préférences enregistrées.";
  });
}

/** "Retrouver ma réservation": reference + email → private page (no data shown on mismatch). */
export async function lookupBookingAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let target: string | null = null;
  const result = await runAction(async () => {
    const ip = await clientIp();
    if (!(await rateLimit(`lookup:${ip}`, 10, 3600)).ok) throw new FormError("Trop de tentatives. Réessayez dans une heure.");
    const reference = str(fd, "reference").trim().toUpperCase().replace(/\s+/g, "");
    const email = str(fd, "email").trim().toLowerCase();
    if (!/^LM-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(reference) || !email) throw new FormError("Référence ou e-mail invalide.");
    const db = await getDb();
    const [b] = await db.select({ id: bookings.id }).from(bookings).where(and(eq(bookings.reference, reference), eq(bookings.email, email))).limit(1);
    if (!b) throw new FormError("Aucune réservation ne correspond à ces informations.");
    const token = manageToken(b.id);
    if (!token) throw new FormError("Le suivi en ligne n’est pas disponible. Contactez-nous.");
    target = `/reservation/${token}`;
  });
  if (target) redirect(target);
  return result;
}
