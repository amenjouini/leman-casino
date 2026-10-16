import type { BookingStatus, UserRole } from "./db/schema";

export const TIME_ZONE = "Europe/Zurich";
export const LOCALE = "fr-CH";

export const BOOKING_STATUSES: BookingStatus[] = [
  "pending",
  "confirmed",
  "waitlisted",
  "cancelled",
  "rejected",
  "attended",
  "no_show",
];

/** Statuses that occupy capacity (and may hold seats). */
export const CAPACITY_STATUSES: BookingStatus[] = ["pending", "confirmed", "attended", "no_show"];
/** Statuses considered "open" when detecting duplicate requests. */
export const ACTIVE_REQUEST_STATUSES: BookingStatus[] = ["pending", "confirmed", "waitlisted"];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "En attente de confirmation",
  confirmed: "Confirmée",
  waitlisted: "Liste d'attente",
  cancelled: "Annulée",
  rejected: "Refusée",
  attended: "Présent",
  no_show: "Absent (no-show)",
};

export const BOOKING_STATUS_SHORT: Record<BookingStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  waitlisted: "Attente",
  cancelled: "Annulée",
  rejected: "Refusée",
  attended: "Présent",
  no_show: "No-show",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Propriétaire / Administrateur",
  manager: "Responsable tournois",
  staff: "Accueil / Check-in",
};

export const TOURNAMENT_FORMAT_SUGGESTIONS = [
  "Freezeout",
  "Re-entry",
  "Bounty",
  "Progressive Knockout",
  "Deepstack",
  "Turbo",
  "Championnat",
  "Satellite",
  "Sit & Go",
];

export const GAME_VARIANT_SUGGESTIONS = [
  "No Limit Hold'em",
  "Pot Limit Omaha",
  "Pot Limit Omaha 5",
  "Mixed Games",
  "Short Deck",
];
