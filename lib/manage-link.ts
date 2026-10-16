import { createHmac, timingSafeEqual } from "node:crypto";
import { siteUrl } from "./request";

/**
 * Private "manage my booking" links, signed with APP_SECRET (HMAC-SHA256).
 * Nothing secret is stored in the database, so staff can resend a link at any time.
 * Changing APP_SECRET invalidates every link previously sent.
 */
function secret(): string | null {
  const s = process.env.APP_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV !== "production") return "dev-only-insecure-secret-change-me-0123456789";
  return null;
}

export const manageLinksEnabled = () => secret() !== null;

function sign(bookingId: string): string | null {
  const key = secret();
  if (!key) return null;
  return createHmac("sha256", key).update(`manage:${bookingId}`).digest("base64url").slice(0, 32);
}

/** Opaque token "<bookingId>.<signature>" used in the URL. */
export function manageToken(bookingId: string): string | null {
  const sig = sign(bookingId);
  return sig ? `${bookingId}.${sig}` : null;
}

export function manageUrl(bookingId: string): string | null {
  const token = manageToken(bookingId);
  return token ? `${siteUrl()}/reservation/${token}` : null;
}

/** Returns the booking id when the token is authentic. */
export function verifyManageToken(token: string): string | null {
  const m = /^([0-9a-f-]{36})\.([A-Za-z0-9_-]{32})$/.exec(token);
  if (!m) return null;
  const expected = sign(m[1]);
  if (!expected) return null;
  const a = Buffer.from(m[2]);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? m[1] : null;
}
