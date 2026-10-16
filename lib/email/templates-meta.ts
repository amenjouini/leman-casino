/** Client-safe metadata about email templates (no server imports). */
export const EMAIL_TEMPLATE_KEYS = [
  "booking_received",
  "booking_waitlisted",
  "booking_confirmed",
  "booking_rejected",
  "booking_cancelled",
  "booking_reminder",
  "owner_new_booking",
  "owner_booking_cancelled",
] as const;
export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number];

export const EMAIL_TEMPLATE_LABELS: Record<EmailTemplateKey, string> = {
  booking_received: "Demande reçue (joueur)",
  booking_waitlisted: "Liste d'attente (joueur)",
  booking_confirmed: "Réservation confirmée (joueur)",
  booking_rejected: "Demande refusée (joueur)",
  booking_cancelled: "Réservation annulée (joueur)",
  booking_reminder: "Rappel avant le tournoi (joueur)",
  owner_new_booking: "Nouvelle demande (notification interne)",
  owner_booking_cancelled: "Annulation par un joueur (notification interne)",
};

export const EMAIL_PLACEHOLDERS: [string, string][] = [
  ["{{nom}}", "Nom du joueur"],
  ["{{reference}}", "Référence de réservation"],
  ["{{tournoi}}", "Nom du tournoi"],
  ["{{date}}", "Date du tournoi"],
  ["{{heure}}", "Heure de début"],
  ["{{places}}", "Nombre de places"],
  ["{{sieges}}", "Sièges attribués"],
  ["{{lieu}}", "Salle et adresse"],
  ["{{droit_entree}}", "Buy-in"],
  ["{{statut}}", "Statut de la réservation"],
  ["{{note}}", "Note saisie par l'équipe"],
  ["{{lien_reservation}}", "Lien personnel du joueur (voir / annuler sa réservation)"],
  ["{{politique_annulation}}", "Conditions d'annulation"],
  ["{{casino}}", "Nom de l'établissement"],
  ["{{telephone_casino}}", "Téléphone de l'établissement"],
  ["{{email_casino}}", "E-mail de l'établissement"],
  ["{{email_joueur}}", "E-mail du joueur (interne)"],
  ["{{telephone_joueur}}", "Téléphone du joueur (interne)"],
  ["{{message}}", "Message du joueur (interne)"],
  ["{{lien_admin}}", "Lien vers la réservation (interne)"],
];
