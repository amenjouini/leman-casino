import type { Tournament } from "./db/schema";

export type RegistrationState =
  | "open"
  | "almost_full"
  | "waitlist"
  | "full"
  | "not_yet_open"
  | "closed"
  | "finished";

export type Availability = {
  state: RegistrationState;
  capacity: number;
  taken: number;
  seatsLeft: number;
  fillRatio: number;
  /** Whether the public may submit a request (possibly onto the waitlist). */
  canRequest: boolean;
  /** Whether a new request would be placed on the waitlist. */
  waitlistOnly: boolean;
  opensAt: Date | null;
  closesAt: Date;
};

type AvailabilityInput = Pick<
  Tournament,
  "capacity" | "startsAt" | "endsAt" | "registrationOpensAt" | "registrationClosesAt" | "registrationMode" | "waitlistEnabled"
>;

export function almostFullThreshold(capacity: number) {
  return Math.max(2, Math.ceil(capacity * 0.15));
}

export function computeAvailability(t: AvailabilityInput, taken: number, now = new Date()): Availability {
  const capacity = t.capacity;
  const seatsLeft = Math.max(0, capacity - taken);
  const fillRatio = capacity > 0 ? Math.min(1, taken / capacity) : 1;
  const closesAt = t.registrationClosesAt ?? t.startsAt;
  const base = { capacity, taken, seatsLeft, fillRatio, opensAt: t.registrationOpensAt, closesAt };

  const finishedAt = t.endsAt ?? t.startsAt;
  if (finishedAt.getTime() <= now.getTime() && t.startsAt.getTime() <= now.getTime()) {
    return { ...base, state: "finished", canRequest: false, waitlistOnly: false };
  }

  if (t.registrationMode === "closed") {
    return { ...base, state: "closed", canRequest: false, waitlistOnly: false };
  }
  if (t.registrationMode === "auto") {
    if (t.registrationOpensAt && t.registrationOpensAt.getTime() > now.getTime()) {
      return { ...base, state: "not_yet_open", canRequest: false, waitlistOnly: false };
    }
    if (closesAt.getTime() <= now.getTime()) {
      return { ...base, state: "closed", canRequest: false, waitlistOnly: false };
    }
  }

  if (seatsLeft <= 0) {
    return t.waitlistEnabled
      ? { ...base, state: "waitlist", canRequest: true, waitlistOnly: true }
      : { ...base, state: "full", canRequest: false, waitlistOnly: false };
  }
  if (seatsLeft <= almostFullThreshold(capacity)) {
    return { ...base, state: "almost_full", canRequest: true, waitlistOnly: false };
  }
  return { ...base, state: "open", canRequest: true, waitlistOnly: false };
}

export const REGISTRATION_STATE_LABELS: Record<RegistrationState, string> = {
  open: "Inscriptions ouvertes",
  almost_full: "Presque complet",
  waitlist: "Complet · liste d'attente",
  full: "Complet",
  not_yet_open: "Ouverture prochaine",
  closed: "Inscriptions closes",
  finished: "Terminé",
};
