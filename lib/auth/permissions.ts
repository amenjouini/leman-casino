import type { UserRole } from "../db/schema";

export const PERMISSIONS = {
  "dashboard.view": ["owner", "manager", "staff"],
  "bookings.view": ["owner", "manager", "staff"],
  "bookings.checkin": ["owner", "manager", "staff"],
  "bookings.manage": ["owner", "manager"],
  "bookings.export": ["owner", "manager"],
  "tournaments.view": ["owner", "manager", "staff"],
  "tournaments.manage": ["owner", "manager"],
  "players.view": ["owner", "manager"],
  "players.manage": ["owner", "manager"],
  "emails.view": ["owner", "manager"],
  "audit.view": ["owner", "manager"],
  "settings.manage": ["owner"],
  "users.manage": ["owner"],
} as const satisfies Record<string, readonly UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: UserRole | null | undefined, permission: Permission): boolean {
  return !!role && (PERMISSIONS[permission] as readonly UserRole[]).includes(role);
}
