import { z } from "zod";

/** Removes control characters (keeps line breaks and tabs) and trims. */
export function cleanText(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

const text = (min: number, max: number, msg?: string) =>
  z
    .string({ error: msg ?? "Champ requis" })
    .transform(cleanText)
    .pipe(z.string().min(min, msg ?? `Au moins ${min} caractères`).max(max, `Maximum ${max} caractères`));

export const PHONE_REGEX = /^\+?[0-9 ().\/-]{6,25}$/;

export const seatSchema = z.object({
  table: z.number().int().min(1).max(200),
  seat: z.number().int().min(1).max(20),
});
export type SeatInput = z.infer<typeof seatSchema>;

export const bookingRequestSchema = z.object({
  tournamentId: z.uuid("Tournoi invalide"),
  fullName: text(2, 100, "Veuillez indiquer votre nom complet"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(200)
    .pipe(z.email("Adresse e-mail invalide")),
  phone: z
    .string()
    .trim()
    .max(25)
    .refine((v) => v === "" || PHONE_REGEX.test(v), "Numéro de téléphone invalide")
    .optional()
    .default(""),
  places: z.number().int().min(1, "Au moins une place").max(20),
  message: z.string().max(1000, "Message trop long (1000 caractères max.)").transform(cleanText).optional().default(""),
  seats: z.array(seatSchema).max(20).optional().default([]),
  // Optional pseudonym for the public list of registered players (opt-in).
  publicName: z
    .string()
    .transform(cleanText)
    .pipe(z.string().max(30, "Pseudo : 30 caractères maximum").regex(/^[\p{L}\p{N} ._'’-]*$/u, "Pseudo : lettres, chiffres, espaces, . _ - uniquement"))
    .optional()
    .default(""),
  showPublicly: z.boolean().optional().default(false),
  idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{16,100}$/, "Clé de soumission invalide"),
  acceptTerms: z.literal(true, { error: "Veuillez accepter les conditions de réservation" }),
  // Honeypot: real visitors never see nor fill this field.
  website: z.string().max(0).optional().default(""),
});
export type BookingRequest = z.infer<typeof bookingRequestSchema>;
export type BookingRequestInput = z.input<typeof bookingRequestSchema>;

/* ──────────────────────────── Admin: tournaments ──────────────────────────── */

export const levelSchema = z.object({
  sb: z.number().int().min(0).max(100_000_000),
  bb: z.number().int().min(0).max(100_000_000),
  ante: z.number().int().min(0).max(100_000_000).nullable(),
  minutes: z.number().int().min(1).max(240),
  isBreak: z.boolean().optional(),
  label: z.string().max(40).optional(),
});

/** "130", "130.50", "130,50" → 13050; "" → null. */
export function parseMoneyToCents(value: string): number | null | "invalid" {
  const v = value.trim().replace(/['\s]/g, "").replace(",", ".");
  if (v === "") return null;
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(v)) return "invalid";
  return Math.round(Number(v) * 100);
}

export const tournamentFieldsSchema = z
  .object({
    name: text(3, 120, "Nom du tournoi requis (3 caractères min.)"),
    description: z.string().max(5000).transform(cleanText),
    gameVariant: text(1, 80, "Variante requise"),
    format: text(1, 80, "Format requis"),
    startsAt: z.date({ error: "Date de début invalide" }),
    endsAt: z.date().nullable(),
    registrationOpensAt: z.date().nullable(),
    registrationClosesAt: z.date().nullable(),
    registrationMode: z.enum(["auto", "open", "closed"]),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Devise ISO à 3 lettres (ex. CHF)"),
    buyInCents: z.number().int().min(0).max(100_000_00).nullable(),
    feeCents: z.number().int().min(0).max(100_000_00).nullable(),
    guaranteeCents: z.number().int().min(0).max(100_000_000_00).nullable(),
    bountyCents: z.number().int().min(0).max(100_000_00).nullable(),
    reentryCount: z.number().int().min(0, "0 ou plus").max(50).nullable(),
    reentryPriceCents: z.number().int().min(0).max(100_000_00).nullable(),
    reentryFeeCents: z.number().int().min(0).max(100_000_00).nullable(),
    levels: z.array(levelSchema).max(120),
    externalBookingUrl: z
      .string()
      .trim()
      .max(2000)
      .refine((v) => v === "" || /^https:\/\//i.test(v), "Lien https:// attendu")
      .transform((v) => (v === "" ? null : v)),
    startingStack: z.number().int().min(1).max(100_000_000).nullable(),
    blindLevelMinutes: z.number().int().min(1).max(240).nullable(),
    blindStructure: z.string().max(10000).transform(cleanText),
    lateRegistration: z.string().max(300).transform(cleanText),
    reentryPolicy: z.string().max(300).transform(cleanText),
    rules: z.string().max(10000).transform(cleanText),
    venue: z.string().max(160).transform(cleanText),
    coverImageUrl: z
      .string()
      .trim()
      .max(2000)
      .refine((v) => v === "" || /^https:\/\//i.test(v) || v.startsWith("/"), "URL https:// ou chemin /… attendu")
      .transform((v) => (v === "" ? null : v)),
    tableCount: z.number().int().min(1, "Au moins une table").max(100),
    seatsPerTable: z.number().int().min(2, "Au moins 2 sièges").max(12, "12 sièges maximum"),
    tableLabels: z.array(z.string().trim().max(40)).max(100),
    capacity: z.number().int().min(1, "Capacité minimale : 1").max(2000),
    maxPlacesPerBooking: z.number().int().min(1).max(20),
    seatSelection: z.enum(["owner", "player"]),
    waitlistEnabled: z.boolean(),
    featured: z.boolean(),
    status: z.enum(["draft", "published", "archived"]),
  })
  .superRefine((t, ctx) => {
    if (t.capacity > t.tableCount * t.seatsPerTable) {
      ctx.addIssue({
        code: "custom",
        path: ["capacity"],
        message: `La capacité (${t.capacity}) dépasse le nombre de sièges disponibles (${t.tableCount} × ${t.seatsPerTable} = ${t.tableCount * t.seatsPerTable}).`,
      });
    }
    if (t.endsAt && t.endsAt <= t.startsAt) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "La fin doit être postérieure au début." });
    }
    if (t.registrationOpensAt && t.registrationClosesAt && t.registrationOpensAt >= t.registrationClosesAt) {
      ctx.addIssue({ code: "custom", path: ["registrationClosesAt"], message: "La clôture doit suivre l'ouverture des inscriptions." });
    }
    if (t.registrationOpensAt && t.registrationOpensAt >= t.startsAt) {
      ctx.addIssue({ code: "custom", path: ["registrationOpensAt"], message: "L'ouverture des inscriptions doit précéder le début du tournoi." });
    }
    if (t.registrationClosesAt && t.registrationClosesAt.getTime() > (t.endsAt ?? t.startsAt).getTime() + 12 * 3600 * 1000) {
      ctx.addIssue({ code: "custom", path: ["registrationClosesAt"], message: "La clôture des inscriptions est trop tardive." });
    }
    if (t.maxPlacesPerBooking > t.capacity) {
      ctx.addIssue({ code: "custom", path: ["maxPlacesPerBooking"], message: "Ne peut pas dépasser la capacité." });
    }
  });
export type TournamentFields = z.infer<typeof tournamentFieldsSchema>;

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
