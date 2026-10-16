"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { saveResultsAction } from "@/lib/admin/actions/results";
import { FormMessage, SubmitButton, useFormAction } from "./ActionForm";

type Row = { key: string; displayName: string; prize: string; deal: boolean; bookingId: string | null };
export type ResultsInitial = { displayName: string; prizeCents: number | null; deal: boolean; bookingId: string | null }[];
export type Candidate = { bookingId: string; label: string };

let seq = 0;
const key = () => `r${seq++}`;

export function ResultsEditor({
  tournamentId,
  initial,
  entriesCount,
  published,
  candidates,
  currency,
}: {
  tournamentId: string;
  initial: ResultsInitial;
  entriesCount: number | null;
  published: boolean;
  candidates: Candidate[];
  currency: string;
}) {
  const [state, onSubmit, pending] = useFormAction(saveResultsAction);
  const [rows, setRows] = useState<Row[]>(() =>
    initial.map((r) => ({ key: key(), displayName: r.displayName, prize: r.prizeCents != null ? String(r.prizeCents / 100) : "", deal: r.deal, bookingId: r.bookingId })),
  );
  const [error, setError] = useState<string | null>(null);

  const patch = (k: string, p: Partial<Row>) => setRows((l) => l.map((r) => (r.key === k ? { ...r, ...p } : r)));
  const move = (i: number, d: -1 | 1) =>
    setRows((l) => {
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      const c = [...l];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  const serialise = () => {
    const out = [];
    for (const [i, r] of rows.entries()) {
      const v = r.prize.trim().replace(/['\s]/g, "").replace(",", ".");
      if (v !== "" && !/^\d{1,9}(\.\d{1,2})?$/.test(v)) {
        setError(`Ligne ${i + 1} : gain invalide.`);
        return null;
      }
      out.push({ displayName: r.displayName, prizeCents: v === "" ? null : Math.round(Number(v) * 100), deal: r.deal, bookingId: r.bookingId });
    }
    setError(null);
    return JSON.stringify(out);
  };

  return (
    <form
      onSubmit={(e) => {
        const json = serialise();
        if (json === null) {
          e.preventDefault();
          return;
        }
        (e.currentTarget.elements.namedItem("rows") as HTMLInputElement).value = json;
        onSubmit(e);
      }}
      className="space-y-4"
    >
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <input type="hidden" name="rows" defaultValue="[]" />
      <datalist id="result-candidates">
        {candidates.map((c) => (
          <option key={c.bookingId} value={c.label} />
        ))}
      </datalist>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="entriesCount" className="field-label">
            Entrées (re-entries inclus)
          </label>
          <input id="entriesCount" name="entriesCount" type="number" min={0} defaultValue={entriesCount ?? ""} className="field" />
        </div>
        <label className="flex items-end gap-3 pb-3 text-sm text-ivory-dim">
          <input type="checkbox" name="published" defaultChecked={published} className="h-4 w-4 accent-[var(--color-gold-400)]" />
          Publier le classement sur la page Résultats
        </label>
      </div>

      {rows.length ? (
        <ol className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.key} className="grid grid-cols-[2rem_minmax(0,1fr)_7rem_auto_auto] items-center gap-2 rounded-xl border border-white/[0.06] p-2">
              <span className="text-center font-mono text-sm text-gold-300">{i + 1}</span>
              <input
                aria-label={`Nom affiché, rang ${i + 1}`}
                value={r.displayName}
                list="result-candidates"
                placeholder="Pseudo ou nom (vide = anonyme)"
                onChange={(e) => {
                  const match = candidates.find((c) => c.label === e.target.value);
                  patch(r.key, { displayName: e.target.value, bookingId: match ? match.bookingId : null });
                }}
                className="field !min-h-9 !py-1 text-sm"
              />
              <input
                aria-label={`Gain (${currency}), rang ${i + 1}`}
                value={r.prize}
                inputMode="decimal"
                placeholder={currency}
                onChange={(e) => patch(r.key, { prize: e.target.value })}
                className="field !min-h-9 !py-1 text-right font-mono text-sm"
              />
              <label className="flex items-center gap-1.5 text-xs text-mist" title="Gain issu d’un deal">
                <input type="checkbox" checked={r.deal} onChange={(e) => patch(r.key, { deal: e.target.checked })} className="h-3.5 w-3.5 accent-[var(--color-gold-400)]" />
                deal
              </label>
              <span className="flex">
                <button type="button" onClick={() => move(i, -1)} className="rounded p-1 text-fog hover:text-ivory" aria-label="Monter">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => move(i, 1)} className="rounded p-1 text-fog hover:text-ivory" aria-label="Descendre">
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setRows((l) => l.filter((x) => x.key !== r.key))} className="rounded p-1 text-fog hover:text-danger" aria-label="Supprimer">
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-mist">Aucun classement saisi.</p>
      )}
      <button type="button" className="btn btn-outline btn-sm" onClick={() => setRows((l) => [...l, { key: key(), displayName: "", prize: "", deal: false, bookingId: null }])}>
        <Plus className="h-3.5 w-3.5" aria-hidden /> Ajouter une place payée
      </button>
      <p className="text-xs text-fog">Ne publiez un nom ou un pseudo qu’avec l’accord du joueur. Laissez vide pour afficher « Anonyme ».</p>
      {error && <p className="field-error">{error}</p>}
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton pending={pending}>Enregistrer le classement</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
