import { fr, type Dictionary } from "./fr";

export const LOCALES = ["fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";

const dictionaries: Record<Locale, Dictionary> = { fr };

/** Returns the dictionary for a locale (French only for now). */
export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return dictionaries[locale] ?? fr;
}

/** Shorthand used across components while the site is French-only. */
export const t = fr;
export type { Dictionary };
