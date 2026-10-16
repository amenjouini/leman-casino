"use client";

import { useState } from "react";
import { ClipboardPaste, Coffee, Plus, Trash2 } from "lucide-react";
import type { BlindLevel } from "@/lib/db/schema";
import { parseLevelsText } from "@/lib/levels";

type Row = BlindLevel & { key: string };
let seq = 0;
const withKey = (l: BlindLevel): Row => ({ ...l, key: `l${seq++}` });

/** Suggests the next level from the previous ones (≈ +25–50 %, rounded to tidy chip values). */
function nextLevel(rows: Row[]): BlindLevel {
  const last = [...rows].reverse().find((r) => !r.isBreak);
  if (!last) return { sb: 100, bb: 200, ante: null, minutes: 20 };
  const tidy = (n: number) => {
    const step = n >= 10000 ? 1000 : n >= 1000 ? 100 : n >= 200 ? 50 : 25;
    return Math.round(n / step) * step;
  };
  const bb = tidy(last.bb * (last.bb < 1000 ? 1.5 : 1.33));
  return { sb: tidy(bb / 2), bb, ante: last.ante ? bb : null, minutes: last.minutes };
}

export function LevelsEditor({ initial, error }: { initial: BlindLevel[]; error?: string }) {
  const [rows, setRows] = useState<Row[]>(() => initial.map(withKey));
  const [paste, setPaste] = useState<string | null>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);

  const update = (key: string, patch: Partial<BlindLevel>) => setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const numberInput = (r: Row, k: "sb" | "bb" | "ante" | "minutes", label: string) => (
    <input
      type="number"
      min={0}
      inputMode="numeric"
      aria-label={label}
      value={r[k] ?? ""}
      onChange={(e) => update(r.key, { [k]: e.target.value === "" ? (k === "ante" ? null : 0) : Number(e.target.value) })}
      className="field !min-h-9 !px-2 !py-1 text-right font-mono text-sm"
    />
  );

  const serialised = JSON.stringify(rows.map(({ key: _k, ...l }) => (void _k, l)));
  let levelNo = 0;

  return (
    <div>
      <input type="hidden" name="levels" value={serialised} />
      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-white/[0.08] scrollbar-thin">
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="text-[0.66rem] uppercase tracking-[0.14em] text-fog">
                <th className="px-2 py-2 text-left">Niv.</th>
                <th className="px-2 py-2 text-right">SB</th>
                <th className="px-2 py-2 text-right">BB</th>
                <th className="px-2 py-2 text-right">Ante</th>
                <th className="px-2 py-2 text-right">Min.</th>
                <th className="px-2 py-2">
                  <span className="sr-only">Supprimer</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                if (!r.isBreak) levelNo++;
                return (
                  <tr key={r.key} className={`border-t border-white/[0.06] ${r.isBreak ? "bg-gold-400/[0.05]" : ""}`}>
                    <td className="px-2 py-1.5 font-mono text-ivory-dim">{r.isBreak ? "☕" : levelNo}</td>
                    {r.isBreak ? (
                      <td colSpan={3} className="px-2 py-1.5">
                        <input
                          aria-label="Nom de la pause"
                          value={r.label ?? "Pause"}
                          onChange={(e) => update(r.key, { label: e.target.value.slice(0, 40) })}
                          className="field !min-h-9 !py-1 text-sm"
                        />
                      </td>
                    ) : (
                      <>
                        <td className="px-1 py-1.5">{numberInput(r, "sb", `Petite blind niveau ${levelNo}`)}</td>
                        <td className="px-1 py-1.5">{numberInput(r, "bb", `Grosse blind niveau ${levelNo}`)}</td>
                        <td className="px-1 py-1.5">{numberInput(r, "ante", `Ante niveau ${levelNo}`)}</td>
                      </>
                    )}
                    <td className="w-20 px-1 py-1.5">{numberInput(r, "minutes", "Durée en minutes")}</td>
                    <td className="w-10 px-1 py-1.5 text-right">
                      <button type="button" onClick={() => setRows((l) => l.filter((x) => x.key !== r.key))} className="rounded p-1.5 text-fog hover:text-danger" aria-label="Supprimer la ligne">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-mist">Aucun niveau. Ajoutez-les un par un ou collez une structure existante.</p>
      )}
      {error && <p className="field-error">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setRows((l) => [...l, withKey(nextLevel(l))])}>
          <Plus className="h-3.5 w-3.5" aria-hidden /> Niveau
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setRows((l) => [...l, withKey({ sb: 0, bb: 0, ante: null, minutes: 15, isBreak: true, label: "Pause" })])}>
          <Coffee className="h-3.5 w-3.5" aria-hidden /> Pause
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPaste(paste === null ? "" : null)}>
          <ClipboardPaste className="h-3.5 w-3.5" aria-hidden /> Coller une structure
        </button>
      </div>

      {paste !== null && (
        <div className="mt-3 space-y-2 rounded-xl border border-white/[0.08] p-3">
          <label htmlFor="levels-paste" className="field-label">
            Une ligne par niveau : « niveau SB BB ante minutes » (ex. « 4 300 600 300 18 » ou « 300/600 · 18 min »), « Pause 15 » pour une pause.
          </label>
          <textarea id="levels-paste" rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} className="field font-mono text-sm" />
          {pasteError && <p className="field-error">{pasteError}</p>}
          <button
            type="button"
            className="btn btn-gold btn-sm"
            onClick={() => {
              const { levels, errors } = parseLevelsText(paste);
              if (errors.length) {
                setPasteError(`Lignes illisibles : ${errors.join(", ")}`);
                return;
              }
              setRows(levels.map(withKey));
              setPaste(null);
              setPasteError(null);
            }}
          >
            Remplacer le tableau
          </button>
        </div>
      )}
    </div>
  );
}
