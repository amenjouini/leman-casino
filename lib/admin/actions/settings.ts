"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "../../db";
import { media } from "../../db/schema";
import { actorOf, requireUser } from "../../auth/session";
import { getSettings, parseSettings, saveSettings, EMAIL_TEMPLATE_KEYS, type SettingsKey } from "../../settings";
import { writeAudit } from "../../audit";
import { sendEmail } from "../../email/mailer";
import { renderEmailHtml } from "../../email/render";
import { fieldErrors } from "../../validation";
import { runAction, str, bool, FormError, type ActionState } from "../action";
import { demoEnabled, resetDemo } from "../../demo";

async function persist(key: SettingsKey, value: unknown) {
  const user = await requireUser("settings.manage");
  const parsed = parseSettings(key, value);
  if (!parsed.success) throw new FormError("Veuillez corriger les champs signalés.", fieldErrors(parsed.error));
  await saveSettings(key, parsed.data, user.id);
  const db = await getDb();
  await writeAudit(db, actorOf(user), { action: "settings.updated", entityType: "settings", entityId: key });
  revalidatePath("/", "layout");
}

export async function saveSiteSettingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const titles = fd.getAll("highlightTitle").map(String);
    const texts = fd.getAll("highlightText").map(String);
    const highlights = titles.map((title, i) => ({ title: title.trim(), text: (texts[i] ?? "").trim() })).filter((h) => h.title);
    await persist("site", {
      casinoName: str(fd, "casinoName"),
      tagline: str(fd, "tagline"),
      phone: str(fd, "phone"),
      email: str(fd, "email"),
      addressLine: str(fd, "addressLine"),
      postalCode: str(fd, "postalCode"),
      city: str(fd, "city"),
      country: str(fd, "country"),
      mapEmbedUrl: str(fd, "mapEmbedUrl"),
      mapsLink: str(fd, "mapsLink"),
      openingHours: str(fd, "openingHours"),
      facebookUrl: str(fd, "facebookUrl"),
      instagramUrl: str(fd, "instagramUrl"),
      linkedinUrl: str(fd, "linkedinUrl"),
      announcementEnabled: bool(fd, "announcementEnabled"),
      announcementText: str(fd, "announcementText"),
      announcementLink: str(fd, "announcementLink"),
      logoUrl: str(fd, "logoUrl"),
      heroImageUrl: str(fd, "heroImageUrl"),
      aboutIntro: str(fd, "aboutIntro"),
      highlights,
    });
    return "Paramètres du site enregistrés.";
  });
}

export async function saveBookingSettingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    await persist("booking", {
      requirePhone: bool(fd, "requirePhone"),
      bookingTerms: str(fd, "bookingTerms"),
      cancellationPolicy: str(fd, "cancellationPolicy"),
      confirmationNote: str(fd, "confirmationNote"),
      minimumAge: Number(str(fd, "minimumAge") || 18),
    });
    return "Règles de réservation enregistrées.";
  });
}

export async function saveLegalSettingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    await persist("legal", {
      companyName: str(fd, "companyName"),
      legalNotice: str(fd, "legalNotice"),
      privacyPolicy: str(fd, "privacyPolicy"),
      responsibleGaming: str(fd, "responsibleGaming"),
    });
    return "Textes légaux enregistrés.";
  });
}

export async function saveEmailSettingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const current = await getSettings("email");
    const templates = Object.fromEntries(
      EMAIL_TEMPLATE_KEYS.map((k) => [k, { subject: str(fd, `${k}.subject`) || current.templates[k].subject, body: str(fd, `${k}.body`) || current.templates[k].body }]),
    );
    await persist("email", {
      ownerNotificationEmail: str(fd, "ownerNotificationEmail"),
      senderName: str(fd, "senderName"),
      senderAddress: str(fd, "senderAddress"),
      replyTo: str(fd, "replyTo"),
      remindersEnabled: bool(fd, "remindersEnabled"),
      reminderHoursBefore: Number(str(fd, "reminderHoursBefore") || 24),
      templates,
    });
    return "Paramètres e-mail enregistrés.";
  });
}

export async function sendTestEmailAction(): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUser("settings.manage");
    const [site, email] = await Promise.all([getSettings("site"), getSettings("email")]);
    const body = `Bonjour ${user.name},\n\nCeci est un e-mail de test envoyé depuis l’espace d’administration. Si vous le recevez, la configuration SMTP fonctionne.`;
    const res = await sendEmail({
      to: user.email,
      subject: `Test d’envoi — ${site.casinoName}`,
      text: body,
      html: renderEmailHtml({ title: "Test", body, casinoName: site.casinoName, footer: site.casinoName }),
      fromName: email.senderName || site.casinoName,
      fromAddress: email.senderAddress || undefined,
    });
    if (res.status !== "sent") throw new FormError(`Échec : ${res.error}`);
    return `E-mail de test envoyé à ${user.email}.`;
  });
}

const ALLOWED_IMAGES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

function sniffImage(buf: Buffer): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (buf.subarray(4, 12).toString("ascii").startsWith("ftypavi")) return "image/avif";
  return null;
}

/** Stores an image in the database and returns its public URL (SVG is refused). */
export async function uploadImageAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUser("tournaments.manage");
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) throw new FormError("Choisissez une image.");
    if (file.size > MAX_IMAGE_BYTES) throw new FormError("Image trop lourde (3 Mo maximum).");
    const buf = Buffer.from(await file.arrayBuffer());
    const mime = sniffImage(buf);
    if (!mime || !ALLOWED_IMAGES[mime]) throw new FormError("Format non pris en charge (JPEG, PNG, WebP ou AVIF).");
    const db = await getDb();
    const [m] = await db
      .insert(media)
      .values({ filename: file.name.slice(0, 200), mimeType: mime, size: buf.length, data: buf, uploadedBy: user.id })
      .returning({ id: media.id });
    await writeAudit(db, actorOf(user), { action: "media.uploaded", entityType: "media", entityId: m.id, details: { filename: file.name } });
    return `/api/media/${m.id}`;
  });
}

export async function resetDemoAction(): Promise<ActionState> {
  return runAction(async () => {
    await requireUser("settings.manage");
    if (!demoEnabled()) throw new FormError("Disponible uniquement en mode démonstration.");
    await resetDemo();
    revalidatePath("/", "layout");
    return "Démo réinitialisée : nouveaux tournois, réservations et résultats générés.";
  });
}
