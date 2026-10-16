import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { AuthError } from "../auth/session";
import { BookingError } from "../bookings";
import { fieldErrors } from "../validation";

export type ActionState = {
  ok: boolean;
  message?: string;
  error?: string;
  fields?: Record<string, string>;
  /** Changes on every call so the UI can re-show identical messages. */
  at?: number;
};

export const initialActionState: ActionState = { ok: false };

export class FormError extends Error {
  constructor(
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

/** Runs a server action body and converts known errors into user-facing messages. */
export async function runAction(fn: () => Promise<string | void>): Promise<ActionState> {
  try {
    const message = await fn();
    return { ok: true, message: message || "Enregistré.", at: Date.now() };
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof AuthError || err instanceof BookingError) return { ok: false, error: err.message, at: Date.now() };
    if (err instanceof FormError) return { ok: false, error: err.message, fields: err.fields, at: Date.now() };
    if (err instanceof ZodError) return { ok: false, error: "Certains champs sont invalides.", fields: fieldErrors(err), at: Date.now() };
    console.error("[admin] action error", err);
    return { ok: false, error: "Une erreur inattendue est survenue.", at: Date.now() };
  }
}

export const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};
export const bool = (fd: FormData, key: string) => fd.get(key) === "on" || fd.get(key) === "true";
export const intOrNull = (fd: FormData, key: string): number | null => {
  const v = str(fd, key).trim().replace(/['\s]/g, "");
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
};
