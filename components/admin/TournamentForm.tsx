"use client";

import { useState } from "react";
import { saveTournamentAction } from "@/lib/admin/actions/tournaments";
import { GAME_VARIANT_SUGGESTIONS, TOURNAMENT_FORMAT_SUGGESTIONS } from "@/lib/constants";
import { FormMessage, SubmitButton, useFormAction } from "./ActionForm";
import { ImageUpload } from "./ImageUpload";
import { LevelsEditor } from "./LevelsEditor";
import type { BlindLevel } from "@/lib/db/schema";

export type TournamentFormValues = {
  id?: string;
  name: string;
  description: string;
  gameVariant: string;
  format: string;
  startsAt: string;
  endsAt: string;
  registrationOpensAt: string;
  registrationClosesAt: string;
  registrationMode: "auto" | "open" | "closed";
  currency: string;
  buyIn: string;
  fee: string;
  guarantee: string;
  bounty: string;
  reentryCount: string;
  externalBookingUrl: string;
  reentryPrice: string;
  reentryFee: string;
  levels: BlindLevel[];
  startingStack: string;
  blindLevelMinutes: string;
  blindStructure: string;
  lateRegistration: string;
  reentryPolicy: string;
  rules: string;
  venue: string;
  coverImageUrl: string;
  tableCount: string;
  seatsPerTable: string;
  tableLabels: string;
  capacity: string;
  maxPlacesPerBooking: string;
  seatSelection: "owner" | "player";
  waitlistEnabled: boolean;
  featured: boolean;
  status: "draft" | "published" | "archived";
};

function Section({ title, children, hint }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-white/[0.08] bg-night-850 p-5 sm:p-6">
      <legend className="sr-only">{title}</legend>
      <h2 className="font-sans text-sm font-semibold uppercase tracking-[0.14em] text-ivory-dim">{title}</h2>
      {hint && <p className="mt-1 text-xs text-fog">{hint}</p>}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function TournamentForm({ initial }: { initial: TournamentFormValues }) {
  const [state, onSubmit, pending] = useFormAction(saveTournamentAction);
  const [cover, setCover] = useState(initial.coverImageUrl);
  const [tables, setTables] = useState(initial.tableCount);
  const [seats, setSeats] = useState(initial.seatsPerTable);
  const e = state.fields ?? {};

  const field = (
    name: keyof TournamentFormValues,
    label: string,
    opts: { type?: string; required?: boolean; span?: boolean; placeholder?: string; list?: string; hint?: string; inputMode?: "numeric" | "decimal" } = {},
  ) => (
    <div className={opts.span ? "sm:col-span-2" : ""}>
      <label htmlFor={`f-${name}`} className="field-label">
        {label} {opts.required && <span className="text-gold-400">*</span>}
      </label>
      <input
        id={`f-${name}`}
        name={name}
        type={opts.type ?? "text"}
        defaultValue={String(initial[name] ?? "")}
        required={opts.required}
        placeholder={opts.placeholder}
        list={opts.list}
        inputMode={opts.inputMode}
        className="field"
        aria-invalid={!!e[name]}
        aria-describedby={e[name] ? `e-${name}` : undefined}
      />
      {opts.hint && !e[name] && <p className="mt-1 text-xs text-fog">{opts.hint}</p>}
      {e[name] && (
        <p id={`e-${name}`} className="field-error">
          {e[name]}
        </p>
      )}
    </div>
  );
  const area = (name: keyof TournamentFormValues, label: string, rows = 4, hint?: string) => (
    <div className="sm:col-span-2">
      <label htmlFor={`f-${name}`} className="field-label">
        {label}
      </label>
      <textarea id={`f-${name}`} name={name} rows={rows} defaultValue={String(initial[name] ?? "")} className="field" aria-invalid={!!e[name]} />
      {hint && <p className="mt-1 text-xs text-fog">{hint}</p>}
      {e[name] && <p className="field-error">{e[name]}</p>}
    </div>
  );
  const select = (name: keyof TournamentFormValues, label: string, options: [string, string][], hint?: string) => (
    <div>
      <label htmlFor={`f-${name}`} className="field-label">
        {label}
      </label>
      <select id={`f-${name}`} name={name} defaultValue={String(initial[name])} className="field">
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1 text-xs text-fog">{hint}</p>}
      {e[name] && <p className="field-error">{e[name]}</p>}
    </div>
  );
  const check = (name: "waitlistEnabled" | "featured", label: string, hint: string) => (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.08] p-4">
      <input type="checkbox" name={name} defaultChecked={initial[name]} className="mt-0.5 h-4 w-4 accent-[var(--color-gold-400)]" />
      <span>
        <span className="block text-sm font-medium text-ivory">{label}</span>
        <span className="block text-xs text-fog">{hint}</span>
      </span>
    </label>
  );

  const seatTotal = (Number(tables) || 0) * (Number(seats) || 0);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        {initial.id && <input type="hidden" name="id" value={initial.id} />}
        <datalist id="formats">
          {TOURNAMENT_FORMAT_SUGGESTIONS.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
        <datalist id="variants">
          {GAME_VARIANT_SUGGESTIONS.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>

        <Section title="Informations">
          {field("name", "Nom du tournoi", { required: true, span: true })}
          {field("format", "Format", { required: true, list: "formats", hint: "Choisissez une suggestion ou saisissez un format libre." })}
          {field("gameVariant", "Variante", { required: true, list: "variants" })}
          {field("venue", "Salle / lieu", { placeholder: "ex. Salle principale" })}
          <div>
            <label htmlFor="f-coverImageUrl" className="field-label">
              Image de couverture (URL)
            </label>
            <input id="f-coverImageUrl" name="coverImageUrl" value={cover} onChange={(ev) => setCover(ev.target.value)} className="field" placeholder="https://… ou /api/media/…" aria-invalid={!!e.coverImageUrl} />
            {e.coverImageUrl && <p className="field-error">{e.coverImageUrl}</p>}
          </div>
          {area("description", "Description", 4)}
        </Section>

        <Section title="Dates" hint="Heures de Suisse (Europe/Zurich).">
          {field("startsAt", "Début", { type: "datetime-local", required: true })}
          {field("endsAt", "Fin estimée", { type: "datetime-local" })}
          {field("registrationOpensAt", "Ouverture des inscriptions", { type: "datetime-local", hint: "Vide = ouvertes dès la publication." })}
          {field("registrationClosesAt", "Clôture des inscriptions", { type: "datetime-local", hint: "Vide = clôture à l'heure de début." })}
          {select(
            "registrationMode",
            "Statut des inscriptions",
            [
              ["auto", "Automatique (selon les dates)"],
              ["open", "Forcer : ouvertes"],
              ["closed", "Forcer : fermées"],
            ],
            "« Forcer » ignore les dates d'ouverture et de clôture.",
          )}
        </Section>

        <Section title="Tarifs & structure" hint="Laissez vide ce qui ne s'applique pas.">
          {field("buyIn", "Buy-in", { inputMode: "decimal", placeholder: "ex. 100" })}
          {field("fee", "Frais (rake)", { inputMode: "decimal", placeholder: "ex. 30" })}
          {field("currency", "Devise", { placeholder: "CHF" })}
          {field("bounty", "Bounty (part prime)", { inputMode: "decimal", hint: "Affiché « buy-in + bounty + frais »." })}
          {field("guarantee", "Prix garanti", { inputMode: "decimal" })}
          {field("reentryCount", "Nombre de re-entries", { inputMode: "numeric", hint: "0 = freezeout ; vide = non précisé." })}
          {field("reentryPrice", "Prix du re-entry", { inputMode: "decimal", hint: "Vide = identique au buy-in." })}
          {field("reentryFee", "Rake du re-entry", { inputMode: "decimal" })}
          {field("startingStack", "Tapis de départ (jetons)", { inputMode: "numeric" })}
          {field("blindLevelMinutes", "Durée des niveaux (min)", { inputMode: "numeric" })}
          {field("lateRegistration", "Inscription tardive", { placeholder: "ex. jusqu'au niveau 6" })}
          {field("reentryPolicy", "Re-entry", { placeholder: "ex. 1 re-entry jusqu'à la pause" })}
        </Section>

        <fieldset className="rounded-2xl border border-white/[0.08] bg-night-850 p-5 sm:p-6">
          <legend className="sr-only">Structure des blinds</legend>
          <h2 className="font-sans text-sm font-semibold uppercase tracking-[0.14em] text-ivory-dim">Structure des blinds</h2>
          <p className="mt-1 text-xs text-fog">Affichée en tableau sur la fiche du tournoi (Niv. · SB · BB · Ante · Durée), comme sur check-raise.</p>
          <div className="mt-5">
            <LevelsEditor initial={initial.levels} error={e.levels} />
          </div>
          {initial.blindStructure && (
            <div className="mt-5">{area("blindStructure", "Ancienne structure (texte libre, affichée si le tableau est vide)", 4)}</div>
          )}
        </fieldset>

        <Section title="Capacité & placement">
          <div>
            <label htmlFor="f-tableCount" className="field-label">
              Nombre de tables <span className="text-gold-400">*</span>
            </label>
            <input id="f-tableCount" name="tableCount" inputMode="numeric" value={tables} onChange={(ev) => setTables(ev.target.value)} className="field" aria-invalid={!!e.tableCount} />
            {e.tableCount && <p className="field-error">{e.tableCount}</p>}
          </div>
          <div>
            <label htmlFor="f-seatsPerTable" className="field-label">
              Sièges par table <span className="text-gold-400">*</span>
            </label>
            <input id="f-seatsPerTable" name="seatsPerTable" inputMode="numeric" value={seats} onChange={(ev) => setSeats(ev.target.value)} className="field" aria-invalid={!!e.seatsPerTable} />
            {e.seatsPerTable && <p className="field-error">{e.seatsPerTable}</p>}
          </div>
          {field("capacity", "Capacité maximale (joueurs)", { required: true, inputMode: "numeric", hint: seatTotal ? `${seatTotal} sièges au total.` : undefined })}
          {field("maxPlacesPerBooking", "Places max. par réservation", { inputMode: "numeric" })}
          {select(
            "seatSelection",
            "Choix des sièges",
            [
              ["owner", "Attribués par l'équipe (recommandé)"],
              ["player", "Choisis par le joueur à la réservation"],
            ],
          )}
          {check("waitlistEnabled", "Liste d'attente", "Quand le tournoi est complet, les nouvelles demandes passent en liste d'attente.")}
          {area("tableLabels", "Noms des tables (facultatif)", 3, "Une ligne par table, dans l'ordre (ex. « Table Lavaux »). Vide = « Table 1 », « Table 2 »…")}
        </Section>

        <Section title="Règlement">{area("rules", "Règles et conditions", 6)}</Section>

        <Section title="Inscriptions externes" hint="Facultatif : si ce tournoi est géré sur une autre plateforme (ex. check-raise.ch), les joueurs y seront redirigés et le formulaire du site sera désactivé pour ce tournoi.">
          {field("externalBookingUrl", "Lien d’inscription externe", { span: true, placeholder: "https://check-raise.ch/…" })}
        </Section>

        <Section title="Publication">
          {select("status", "Visibilité", [
            ["draft", "Brouillon (invisible au public)"],
            ["published", "Publié"],
            ["archived", "Archivé"],
          ])}
          {check("featured", "À la une", "Mis en avant sur la page d'accueil.")}
        </Section>

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-4 border-t border-white/[0.08] bg-night-900/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
          <SubmitButton className="btn btn-gold" pendingLabel="Enregistrement…" pending={pending}>
            {initial.id ? "Enregistrer les modifications" : "Créer le tournoi"}
          </SubmitButton>
          <FormMessage state={state} />
        </div>
      </form>

      <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
        <div className="rounded-2xl border border-white/[0.08] bg-night-850 p-5">
          <ImageUpload onUploaded={setCover} label="Importer une couverture" />
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="Aperçu de la couverture" className="mt-4 aspect-video w-full rounded-xl object-cover" />
          )}
        </div>
      </aside>
    </div>
  );
}
