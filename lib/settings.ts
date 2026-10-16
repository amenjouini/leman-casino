import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, type DbOrTx } from "./db";
import { settings } from "./db/schema";
import { EMAIL_TEMPLATE_KEYS, EMAIL_TEMPLATE_LABELS, type EmailTemplateKey } from "./email/templates-meta";

const str = (max: number) => z.string().trim().max(max);
const optionalUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === "" || /^https:\/\//i.test(v) || v.startsWith("/"), "URL https:// ou chemin /… attendu");
const optionalEmail = z
  .string()
  .trim()
  .max(200)
  .refine((v) => v === "" || z.email().safeParse(v).success, "Adresse e-mail invalide");

/* ─────────────────────────────── Site settings ────────────────────────────── */

export const highlightSchema = z.object({ title: str(120).min(1), text: str(600) });

export const siteSettingsSchema = z.object({
  casinoName: str(80).min(1),
  tagline: str(160),
  phone: str(40),
  email: optionalEmail,
  addressLine: str(160),
  postalCode: str(20),
  city: str(80),
  country: str(80),
  mapEmbedUrl: z
    .string()
    .trim()
    .max(2000)
    .refine((v) => v === "" || /^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed/i.test(v), "Lien d'intégration Google Maps attendu"),
  mapsLink: optionalUrl,
  openingHours: str(1000),
  facebookUrl: optionalUrl,
  instagramUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  announcementEnabled: z.boolean(),
  announcementText: str(240),
  announcementLink: optionalUrl,
  logoUrl: optionalUrl,
  heroImageUrl: optionalUrl,
  aboutIntro: str(2000),
  highlights: z.array(highlightSchema).max(8),
});
export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export const SITE_DEFAULTS: SiteSettings = {
  casinoName: "Léman Poker & Casino",
  tagline: "Formation · Poker club · Événementiel",
  phone: "+41 21 553 00 80",
  email: "event.relation@lemon-casino.com",
  addressLine: "",
  postalCode: "",
  city: "Lausanne",
  country: "Suisse",
  mapEmbedUrl:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d352235.414911131!2d6.003625997103758!3d46.39241466843236!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x478c335cd5230951%3A0xc9a5a0c852b5ab3e!2sL%C3%A9man%20Poker%20%26%20Casino%20Formation!5e0!3m2!1sen!2stn!4v1761584625631!5m2!1sen!2stn",
  mapsLink: "",
  openingHours: "",
  facebookUrl: "https://www.facebook.com/profile.php?id=61550649364939",
  instagramUrl: "https://www.instagram.com/lemanpokercasino/",
  linkedinUrl: "",
  announcementEnabled: false,
  announcementText: "",
  announcementLink: "",
  logoUrl: "",
  heroImageUrl: "",
  aboutIntro:
    "Le Léman Poker Club vous accueille dans un cadre unique, mêlant convivialité, professionnalisme et passion du jeu. Que vous soyez amateur ou joueur confirmé, notre club est l’endroit idéal pour vivre pleinement votre passion du poker.",
  // Taken from the venue copy already published on the previous version of the site.
  highlights: [
    {
      title: "Un espace de jeu haut de gamme",
      text: "10 tables de poker de qualité supérieure, dans une ambiance chaleureuse et encadrée. Chaque table est vidéo-surveillée, garantissant un environnement sécurisé et transparent.",
    },
    {
      title: "Des tournois autorisés et réglementés",
      text: "Nos événements sont encadrés par les autorités compétentes, pour des conditions de jeu justes et conformes à la législation.",
    },
    {
      title: "Une équipe professionnelle",
      text: "Un personnel accueillant et expérimenté veille à ce que chaque joueur vive une expérience mémorable, dans le respect et la bonne humeur.",
    },
    {
      title: "Bien plus qu’un club, une communauté",
      text: "Un lieu de rencontre, de partage et de plaisir où chaque visite devient l’occasion de créer des souvenirs.",
    },
  ],
};

/* ───────────────────────────── Booking settings ───────────────────────────── */

export const bookingSettingsSchema = z.object({
  requirePhone: z.boolean(),
  bookingTerms: str(4000),
  cancellationPolicy: str(4000),
  confirmationNote: str(1000),
  minimumAge: z.number().int().min(0).max(25),
});
export type BookingSettings = z.infer<typeof bookingSettingsSchema>;

export const BOOKING_DEFAULTS: BookingSettings = {
  requirePhone: false,
  bookingTerms:
    "Votre demande est enregistrée avec le statut « en attente ». Elle ne devient définitive qu’après confirmation par notre équipe, par e-mail.",
  cancellationPolicy: "",
  confirmationNote: "",
  minimumAge: 18,
};

/* ────────────────────────────── Legal settings ────────────────────────────── */

export const legalSettingsSchema = z.object({
  companyName: str(200),
  legalNotice: str(20000),
  privacyPolicy: str(20000),
  responsibleGaming: str(20000),
});
export type LegalSettings = z.infer<typeof legalSettingsSchema>;

export const LEGAL_DEFAULTS: LegalSettings = {
  companyName: "",
  legalNotice: "",
  privacyPolicy: "",
  responsibleGaming:
    "Le jeu doit rester un divertissement. Fixez-vous des limites de temps et de budget avant de jouer, ne jouez jamais pour vous refaire et faites des pauses régulières.\n\nSi le jeu devient une source d’inquiétude pour vous ou pour un proche, des services d’aide gratuits et confidentiels existent en Suisse.",
};

/* ─────────────────────────────── Email settings ───────────────────────────── */

export { EMAIL_TEMPLATE_KEYS, EMAIL_TEMPLATE_LABELS, type EmailTemplateKey };

const templateSchema = z.object({ subject: str(200).min(1), body: str(8000).min(1) });
export type EmailTemplate = z.infer<typeof templateSchema>;

export const emailSettingsSchema = z.object({
  ownerNotificationEmail: optionalEmail,
  senderName: str(80),
  senderAddress: optionalEmail,
  replyTo: optionalEmail,
  remindersEnabled: z.boolean(),
  reminderHoursBefore: z.number().int().min(1).max(168),
  templates: z.object(
    Object.fromEntries(EMAIL_TEMPLATE_KEYS.map((k) => [k, templateSchema])) as Record<EmailTemplateKey, typeof templateSchema>,
  ),
});
export type EmailSettings = z.infer<typeof emailSettingsSchema>;

const SIGNATURE = "\n\nÀ bientôt,\n{{casino}}\n{{telephone_casino}} · {{email_casino}}";

export const EMAIL_DEFAULTS: EmailSettings = {
  ownerNotificationEmail: "",
  senderName: "Léman Poker & Casino",
  senderAddress: "",
  replyTo: "",
  remindersEnabled: false,
  reminderHoursBefore: 24,
  templates: {
    booking_received: {
      subject: "Demande reçue · {{tournoi}} ({{reference}})",
      body:
        "Bonjour {{nom}},\n\nNous avons bien reçu votre demande de réservation pour « {{tournoi}} » le {{date}} à {{heure}}.\n\nRéférence : {{reference}}\nPlaces demandées : {{places}}\nSièges : {{sieges}}\nDroit d’entrée : {{droit_entree}}\n\nVotre demande est EN ATTENTE DE CONFIRMATION. Votre place n’est pas encore garantie : vous recevrez un e-mail dès que notre équipe l’aura validée.\n\nSuivre ou annuler votre demande : {{lien_reservation}}\n\n{{politique_annulation}}" +
        SIGNATURE,
    },
    booking_waitlisted: {
      subject: "Liste d’attente · {{tournoi}} ({{reference}})",
      body:
        "Bonjour {{nom}},\n\nLe tournoi « {{tournoi}} » du {{date}} est actuellement complet. Votre demande a été placée sur LISTE D’ATTENTE.\n\nRéférence : {{reference}}\nPlaces demandées : {{places}}\n\nNous vous contacterons si une place se libère. Votre place n’est pas garantie tant que vous n’avez pas reçu de confirmation.\n\nSuivre ou annuler votre demande : {{lien_reservation}}" +
        SIGNATURE,
    },
    booking_confirmed: {
      subject: "Réservation confirmée · {{tournoi}} ({{reference}})",
      body:
        "Bonjour {{nom}},\n\nBonne nouvelle : votre réservation pour « {{tournoi}} » est CONFIRMÉE.\n\nDate : {{date}} à {{heure}}\nLieu : {{lieu}}\nRéférence : {{reference}}\nPlaces : {{places}}\nSièges : {{sieges}}\nDroit d’entrée : {{droit_entree}}\n\nMerci de vous présenter à l’accueil avec une pièce d’identité.\n\nEn cas d’empêchement, annulez en un clic pour libérer votre place : {{lien_reservation}}\n\n{{politique_annulation}}" +
        SIGNATURE,
    },
    booking_rejected: {
      subject: "Votre demande pour {{tournoi}} ({{reference}})",
      body:
        "Bonjour {{nom}},\n\nNous sommes désolés : nous ne pouvons pas donner suite à votre demande de réservation pour « {{tournoi}} » du {{date}}.\n\n{{note}}\n\nN’hésitez pas à consulter nos prochains tournois." +
        SIGNATURE,
    },
    booking_cancelled: {
      subject: "Réservation annulée · {{tournoi}} ({{reference}})",
      body:
        "Bonjour {{nom}},\n\nVotre réservation {{reference}} pour « {{tournoi}} » du {{date}} a été annulée.\n\n{{note}}\n\nPour toute question, contactez-nous." + SIGNATURE,
    },
    booking_reminder: {
      subject: "Rappel · {{tournoi}} le {{date}}",
      body:
        "Bonjour {{nom}},\n\nPetit rappel : vous êtes inscrit·e au tournoi « {{tournoi}} » le {{date}} à {{heure}}.\n\nLieu : {{lieu}}\nRéférence : {{reference}}\nSièges : {{sieges}}\n\nEn cas d’empêchement, merci de libérer votre place : {{lien_reservation}}" +
        SIGNATURE,
    },
    owner_new_booking: {
      subject: "[Réservation] {{tournoi}} · {{nom}} ({{statut}})",
      body:
        "Nouvelle demande de réservation.\n\nTournoi : {{tournoi}} — {{date}} {{heure}}\nJoueur : {{nom}}\nE-mail : {{email_joueur}}\nTéléphone : {{telephone_joueur}}\nPlaces : {{places}}\nSièges : {{sieges}}\nStatut : {{statut}}\nRéférence : {{reference}}\n\nMessage :\n{{message}}\n\nGérer la réservation : {{lien_admin}}",
    },
    owner_booking_cancelled: {
      subject: "[Annulation] {{tournoi}} · {{nom}} ({{reference}})",
      body: "Un joueur a annulé sa réservation depuis son lien personnel.\n\nTournoi : {{tournoi}} — {{date}} {{heure}}\nJoueur : {{nom}} ({{email_joueur}})\nPlaces libérées : {{places}}\nRéférence : {{reference}}\n\nPensez à la liste d’attente : {{lien_admin}}",
    },
  },
};

/* ──────────────────────────────── Persistence ─────────────────────────────── */

const registry = {
  site: { schema: siteSettingsSchema, defaults: SITE_DEFAULTS },
  booking: { schema: bookingSettingsSchema, defaults: BOOKING_DEFAULTS },
  legal: { schema: legalSettingsSchema, defaults: LEGAL_DEFAULTS },
  email: { schema: emailSettingsSchema, defaults: EMAIL_DEFAULTS },
} as const;

export type SettingsKey = keyof typeof registry;
type SettingsOf<K extends SettingsKey> = K extends "site"
  ? SiteSettings
  : K extends "booking"
    ? BookingSettings
    : K extends "legal"
      ? LegalSettings
      : EmailSettings;

/** Merge stored values over defaults, falling back field-by-field when invalid. */
function merge<K extends SettingsKey>(key: K, stored: unknown): SettingsOf<K> {
  const { schema, defaults } = registry[key];
  const obj = (stored && typeof stored === "object" ? stored : {}) as Record<string, unknown>;
  const candidate: Record<string, unknown> = { ...defaults };
  for (const [field, value] of Object.entries(obj)) {
    if (!(field in defaults)) continue;
    if (field === "templates" && value && typeof value === "object") {
      candidate.templates = { ...(defaults as EmailSettings).templates, ...(value as object) };
    } else {
      candidate[field] = value;
    }
  }
  const parsed = (schema as z.ZodType).safeParse(candidate);
  if (parsed.success) return parsed.data as SettingsOf<K>;
  // Drop the invalid fields only.
  const bad = new Set(parsed.error.issues.map((i) => String(i.path[0])));
  for (const f of bad) candidate[f] = (defaults as Record<string, unknown>)[f];
  const retry = (schema as z.ZodType).safeParse(candidate);
  return (retry.success ? retry.data : defaults) as SettingsOf<K>;
}

export async function getSettings<K extends SettingsKey>(key: K, db?: DbOrTx): Promise<SettingsOf<K>> {
  const conn = db ?? (await getDb());
  const rows = await conn.select().from(settings).where(eq(settings.key, key)).limit(1);
  return merge(key, rows[0]?.value);
}

export async function getAllPublicSettings() {
  const db = await getDb();
  const rows = await db.select().from(settings);
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  return {
    site: merge("site", byKey.get("site")),
    booking: merge("booking", byKey.get("booking")),
    legal: merge("legal", byKey.get("legal")),
  };
}

export function parseSettings<K extends SettingsKey>(key: K, input: unknown) {
  return (registry[key].schema as z.ZodType).safeParse(input) as z.ZodSafeParseResult<SettingsOf<K>>;
}

export async function saveSettings<K extends SettingsKey>(key: K, value: SettingsOf<K>, userId: string | null, db?: DbOrTx) {
  const conn = db ?? (await getDb());
  await conn
    .insert(settings)
    .values({ key, value, updatedBy: userId, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedBy: userId, updatedAt: new Date() } });
}
