"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bookmark, SlidersHorizontal, X } from "lucide-react";
import { t } from "@/lib/i18n";

const STORAGE_KEY = "leman-tournament-filters";
const FILTER_KEYS = ["type", "bmin", "bmax", "jmin", "jmax", "format", "du", "au", "dispo"] as const;

export type FilterValues = Partial<Record<(typeof FILTER_KEYS)[number] | "q" | "vue" | "mois", string>>;

function readSaved(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function TournamentFilters({ formats, values, activeCount }: { formats: string[]; values: FilterValues; activeCount: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [type, setType] = useState(values.type ?? "");
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(false);

  // Apply the visitor's saved filters when arriving on the calendar without any filter.
  useEffect(() => {
    const saved = readSaved();
    setHasSaved(!!saved);
    const hasFilter = FILTER_KEYS.some((k) => params.get(k));
    let applied = false;
    try {
      applied = sessionStorage.getItem(`${STORAGE_KEY}-applied`) === "1";
      sessionStorage.setItem(`${STORAGE_KEY}-applied`, "1");
    } catch {
      /* storage unavailable */
    }
    if (saved && !hasFilter && !applied) {
      const merged = new URLSearchParams(saved);
      for (const k of ["q", "vue", "mois"]) if (params.get(k)) merged.set(k, params.get(k)!);
      router.replace(`${pathname}?${merged.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filterQuery = () => {
    const fd = new FormData(formRef.current!);
    const q = new URLSearchParams();
    for (const k of FILTER_KEYS) {
      const v = fd.get(k);
      if (typeof v === "string" && v.trim()) q.set(k, v.trim());
    }
    return q;
  };

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, filterQuery().toString());
      setHasSaved(true);
      setSavedNote("Filtres enregistrés sur cet appareil.");
    } catch {
      setSavedNote("Impossible d’enregistrer sur cet appareil.");
    }
  };

  const forget = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setHasSaved(false);
    setSavedNote("Filtres enregistrés supprimés.");
  };

  const reset = () => {
    formRef.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input:not([type=hidden]), select").forEach((el) => {
      if (el instanceof HTMLInputElement && el.type === "checkbox") el.checked = false;
      else el.value = "";
    });
    setType("");
  };

  const segment = (value: string, label: string) => (
    <label className={`flex-1 cursor-pointer rounded-lg border px-3 py-2.5 text-center text-sm transition-colors ${type === value ? "border-gold-400 bg-gold-400/15 text-gold-200" : "border-white/10 text-ivory-dim hover:border-white/25"}`}>
      <input type="radio" name="type" value={value} checked={type === value} onChange={() => setType(value)} className="sr-only" />
      {label}
    </label>
  );

  const range = (minName: "bmin" | "jmin", maxName: "bmax" | "jmax", legend: string, unit?: string) => (
    <fieldset>
      <legend className="eyebrow mb-3 !text-[0.66rem]">{legend}</legend>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs text-fog">Min{unit ? ` (${unit})` : ""}</span>
          <input name={minName} type="number" min={0} inputMode="numeric" defaultValue={values[minName]} placeholder="0" className="field" />
        </label>
        <span className="pb-3 text-fog" aria-hidden>
          —
        </span>
        <label className="block">
          <span className="mb-1 block text-xs text-fog">Max{unit ? ` (${unit})` : ""}</span>
          <input name={maxName} type="number" min={0} inputMode="numeric" defaultValue={values[maxName]} placeholder="∞" className="field" />
        </label>
      </div>
    </fieldset>
  );

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className="btn btn-outline btn-sm h-[2.85rem]" aria-haspopup="dialog">
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        {t.calendar.filters}
        {activeCount > 0 && <span className="rounded-full bg-gold-400 px-1.5 text-[0.65rem] font-bold text-night-950">{activeCount}</span>}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="filtres-titre"
        className="m-0 ml-auto h-full max-h-none w-full max-w-md bg-transparent p-0 text-ivory backdrop:bg-night-950/70 backdrop:backdrop-blur-sm open:animate-fade-up"
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <form ref={formRef} method="get" action="/tournois" className="flex h-full flex-col border-l border-white/10 bg-night-900">
          {values.q && <input type="hidden" name="q" value={values.q} />}
          {values.vue && <input type="hidden" name="vue" value={values.vue} />}
          {values.mois && <input type="hidden" name="mois" value={values.mois} />}

          <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
            <h2 id="filtres-titre" className="text-2xl text-ivory">
              {t.calendar.filters}
            </h2>
            <div className="flex items-center gap-3">
              <button type="button" onClick={reset} className="text-sm text-mist hover:text-gold-300">
                {t.calendar.reset}
              </button>
              <button type="button" onClick={() => dialogRef.current?.close()} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 hover:border-gold-400" aria-label="Fermer">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-7 overflow-y-auto px-5 py-6 scrollbar-thin">
            <fieldset>
              <legend className="eyebrow mb-3 !text-[0.66rem]">Type</legend>
              <div className="flex gap-2">
                {segment("", "Tous")}
                {segment("reentry", "Re-entry")}
                {segment("freezeout", "Freezeout")}
              </div>
            </fieldset>

            {range("bmin", "bmax", "Buy-in (+ bounty)", "CHF")}
            {range("jmin", "jmax", "Joueurs inscrits")}

            <div>
              <label htmlFor="f-format" className="eyebrow mb-3 block !text-[0.66rem]">
                {t.calendar.format}
              </label>
              <select id="f-format" name="format" defaultValue={values.format ?? ""} className="field">
                <option value="">{t.calendar.allFormats}</option>
                {formats.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {values.vue !== "calendrier" && (
              <fieldset>
                <legend className="eyebrow mb-3 !text-[0.66rem]">Dates</legend>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs text-fog">{t.calendar.from}</span>
                    <input name="du" type="date" defaultValue={values.du} className="field" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-fog">{t.calendar.to}</span>
                    <input name="au" type="date" defaultValue={values.au} className="field" />
                  </label>
                </div>
              </fieldset>
            )}

            <label className="flex cursor-pointer items-center gap-3 text-sm text-ivory-dim">
              <input type="checkbox" name="dispo" value="1" defaultChecked={values.dispo === "1"} className="h-4 w-4 accent-[var(--color-gold-400)]" />
              {t.calendar.onlyAvailable}
            </label>
          </div>

          <div className="space-y-3 border-t border-white/[0.08] px-5 py-4">
            {savedNote && (
              <p className="text-xs text-ok" role="status">
                {savedNote}
              </p>
            )}
            <div className="grid grid-cols-[auto_1fr_1fr] gap-2">
              <button type="button" onClick={() => dialogRef.current?.close()} className="btn btn-ghost btn-sm">
                Fermer
              </button>
              <button type="button" onClick={save} className="btn btn-outline btn-sm">
                <Bookmark className="h-3.5 w-3.5" aria-hidden /> Sauver
              </button>
              <button type="submit" className="btn btn-gold btn-sm">
                Appliquer
              </button>
            </div>
            {hasSaved && (
              <button type="button" onClick={forget} className="text-xs text-fog underline-offset-2 hover:text-gold-300 hover:underline">
                Oublier mes filtres enregistrés
              </button>
            )}
          </div>
        </form>
      </dialog>
    </>
  );
}
