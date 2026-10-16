import { auditLog } from "./db/schema";
import type { DbOrTx } from "./db";

export type Actor = { id: string | null; label: string };

export const PUBLIC_ACTOR: Actor = { id: null, label: "Site public" };
export const SYSTEM_ACTOR: Actor = { id: null, label: "Système" };

export async function writeAudit(
  db: DbOrTx,
  actor: Actor,
  entry: { action: string; entityType: string; entityId?: string | null; bookingId?: string | null; details?: Record<string, unknown> },
) {
  await db.insert(auditLog).values({
    actorId: actor.id,
    actorLabel: actor.label,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    bookingId: entry.bookingId ?? null,
    details: entry.details ?? {},
  });
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "booking.created": "Demande de réservation créée",
  "booking.status_changed": "Statut modifié",
  "booking.updated": "Réservation modifiée",
  "booking.seats_changed": "Places assignées",
  "booking.email_sent": "Notification e-mail",
  "tournament.created": "Tournoi créé",
  "tournament.updated": "Tournoi modifié",
  "tournament.duplicated": "Tournoi dupliqué",
  "tournament.status_changed": "Publication modifiée",
  "tournament.seats_drawn": "Tirage des places",
  "tournament.results_saved": "Résultats enregistrés",
  "player.updated": "Joueur modifié",
  "settings.updated": "Paramètres modifiés",
  "user.created": "Utilisateur créé",
  "user.updated": "Utilisateur modifié",
  "user.login": "Connexion",
  "media.uploaded": "Image importée",
};
