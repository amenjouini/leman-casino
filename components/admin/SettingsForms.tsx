"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { BookingSettings, EmailSettings, LegalSettings, SiteSettings } from "@/lib/settings";
import { saveBookingSettingsAction, saveEmailSettingsAction, saveLegalSettingsAction, saveSiteSettingsAction, sendTestEmailAction } from "@/lib/admin/actions/settings";
import { EMAIL_PLACEHOLDERS, EMAIL_TEMPLATE_KEYS, EMAIL_TEMPLATE_LABELS } from "@/lib/email/templates-meta";
import { ActionForm, FormMessage, SubmitButton, useFormAction } from "./ActionForm";
import { ImageUpload } from "./ImageUpload";

type Errors = Record<string, string>;

function Text({ name, label, value, errors, type = "text", hint, placeholder }: { name: string; label: string; value: string; errors: Errors; type?: string; hint?: string; placeholder?: string }) {
  return (
    <div>
      <label htmlFor={`s-${name}`} className="field-label">
        {label}
      </label>
      <input id={`s-${name}`} name={name} type={type} defaultValue={value} placeholder={placeholder} className="field" aria-invalid={!!errors[name]} />
      {errors[name] ? <p className="field-error">{errors[name]}</p> : hint && <p className="mt-1 text-xs text-fog">{hint}</p>}
    </div>
  );
}

function Area({ name, label, value, errors, rows = 4, hint }: { name: string; label: string; value: string; errors: Errors; rows?: number; hint?: string }) {
  return (
    <div className="sm:col-span-2">
      <label htmlFor={`s-${name}`} className="field-label">
        {label}
      </label>
      <textarea id={`s-${name}`} name={name} rows={rows} defaultValue={value} className="field" aria-invalid={!!errors[name]} />
      {errors[name] ? <p className="field-error">{errors[name]}</p> : hint && <p className="mt-1 text-xs text-fog">{hint}</p>}
    </div>
  );
}

function Group({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <fieldset className="rounded-2xl border border-white/[0.08] bg-night-850 p-5 sm:p-6">
      <legend className="sr-only">{title}</legend>
      <h2 className="font-sans text-sm font-semibold uppercase tracking-[0.14em] text-ivory-dim">{title}</h2>
      {hint && <p className="mt-1 text-xs text-fog">{hint}</p>}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function SaveBar({ pending, state }: { pending: boolean; state: Parameters<typeof FormMessage>[0]["state"] }) {
  return (
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-4 rounded-2xl border border-white/[0.08] bg-night-900/95 px-4 py-4 backdrop-blur">
      <SubmitButton pending={pending} className="btn btn-gold">
        Enregistrer
      </SubmitButton>
      <FormMessage state={state} />
    </div>
  );
}

export function SiteSettingsForm({ value }: { value: SiteSettings }) {
  const [state, onSubmit, pending] = useFormAction(saveSiteSettingsAction);
  const [highlights, setHighlights] = useState(() =>
    (value.highlights.length ? value.highlights : [{ title: "", text: "" }]).map((h, i) => ({ ...h, id: `h${i}` })),
  );
  const [logo, setLogo] = useState(value.logoUrl);
  const [hero, setHero] = useState(value.heroImageUrl);
  const e = state.fields ?? {};

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <form onSubmit={onSubmit} className="space-y-6">
        <Group title="Identité">
          <Text name="casinoName" label="Nom de l’établissement" value={value.casinoName} errors={e} />
          <Text name="tagline" label="Signature" value={value.tagline} errors={e} />
          <Area name="aboutIntro" label="Présentation (accueil et page « Le casino »)" value={value.aboutIntro} errors={e} rows={4} />
          <div>
            <label htmlFor="s-logoUrl" className="field-label">
              Logo (URL)
            </label>
            <input id="s-logoUrl" name="logoUrl" value={logo} onChange={(ev) => setLogo(ev.target.value)} className="field" placeholder="Vide = logo actuel du site" />
            {e.logoUrl && <p className="field-error">{e.logoUrl}</p>}
          </div>
          <div>
            <label htmlFor="s-heroImageUrl" className="field-label">
              Image principale de l’accueil (URL)
            </label>
            <input id="s-heroImageUrl" name="heroImageUrl" value={hero} onChange={(ev) => setHero(ev.target.value)} className="field" placeholder="Vide = image par défaut" />
            {e.heroImageUrl && <p className="field-error">{e.heroImageUrl}</p>}
          </div>
        </Group>

        <Group title="Coordonnées" hint="Affichées sur le site et dans les e-mails. Laissez vide ce qui n’est pas confirmé.">
          <Text name="phone" label="Téléphone" value={value.phone} errors={e} />
          <Text name="email" label="E-mail de contact" value={value.email} errors={e} type="email" />
          <Text name="addressLine" label="Adresse (rue et numéro)" value={value.addressLine} errors={e} />
          <Text name="postalCode" label="NPA" value={value.postalCode} errors={e} />
          <Text name="city" label="Localité" value={value.city} errors={e} />
          <Text name="country" label="Pays" value={value.country} errors={e} />
          <Area name="openingHours" label="Horaires d’ouverture" value={value.openingHours} errors={e} rows={3} hint="Une ligne par jour ou plage horaire." />
          <Area name="mapEmbedUrl" label="Carte Google Maps (lien d’intégration)" value={value.mapEmbedUrl} errors={e} rows={2} hint="Google Maps › Partager › Intégrer une carte › copier l’URL du src (https://www.google.com/maps/embed?…)." />
          <Text name="mapsLink" label="Lien d’itinéraire" value={value.mapsLink} errors={e} placeholder="https://maps.app.goo.gl/…" />
        </Group>

        <Group title="Réseaux sociaux">
          <Text name="instagramUrl" label="Instagram" value={value.instagramUrl} errors={e} />
          <Text name="facebookUrl" label="Facebook" value={value.facebookUrl} errors={e} />
          <Text name="linkedinUrl" label="LinkedIn" value={value.linkedinUrl} errors={e} />
        </Group>

        <Group title="Annonce en haut du site">
          <label className="flex items-center gap-3 text-sm text-ivory-dim sm:col-span-2">
            <input type="checkbox" name="announcementEnabled" defaultChecked={value.announcementEnabled} className="h-4 w-4 accent-[var(--color-gold-400)]" />
            Afficher l’annonce
          </label>
          <Text name="announcementText" label="Texte" value={value.announcementText} errors={e} />
          <Text name="announcementLink" label="Lien (facultatif)" value={value.announcementLink} errors={e} placeholder="/tournois/…" />
        </Group>

        <fieldset className="rounded-2xl border border-white/[0.08] bg-night-850 p-5 sm:p-6">
          <legend className="sr-only">Points forts</legend>
          <h2 className="font-sans text-sm font-semibold uppercase tracking-[0.14em] text-ivory-dim">Points forts (« Pourquoi le Léman »)</h2>
          <p className="mt-1 text-xs text-fog">N’indiquez que des informations vérifiées sur l’établissement.</p>
          <ul className="mt-5 space-y-4">
            {highlights.map((h, i) => (
              <li key={h.id} className="grid gap-3 rounded-xl border border-white/[0.06] p-4 sm:grid-cols-[1fr_auto]">
                <div className="space-y-3">
                  <input name="highlightTitle" defaultValue={h.title} placeholder="Titre" className="field" aria-label={`Titre du point fort ${i + 1}`} />
                  <textarea name="highlightText" defaultValue={h.text} placeholder="Description" rows={2} className="field" aria-label={`Description du point fort ${i + 1}`} />
                </div>
                <button type="button" onClick={() => setHighlights((list) => list.filter((x) => x.id !== h.id))} className="btn btn-ghost btn-sm self-start text-danger" aria-label="Supprimer">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          {highlights.length < 8 && (
            <button type="button" onClick={() => setHighlights((list) => [...list, { title: "", text: "", id: `n${Date.now()}` }])} className="btn btn-outline btn-sm mt-4">
              <Plus className="h-4 w-4" aria-hidden /> Ajouter
            </button>
          )}
          {e.highlights && <p className="field-error">{e.highlights}</p>}
        </fieldset>

        <SaveBar pending={pending} state={state} />
      </form>
      <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
        <div className="rounded-2xl border border-white/[0.08] bg-night-850 p-5">
          <ImageUpload onUploaded={setLogo} label="Importer un logo" />
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-night-850 p-5">
          <ImageUpload onUploaded={setHero} label="Importer l’image d’accueil" />
          {hero && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero} alt="Aperçu" className="mt-4 aspect-[4/5] w-full rounded-xl object-cover" />
          )}
        </div>
        <p className="px-1 text-xs text-fog">Après l’import, cliquez sur « Enregistrer » pour appliquer l’image.</p>
      </aside>
    </div>
  );
}

export function BookingSettingsForm({ value }: { value: BookingSettings }) {
  const [state, onSubmit, pending] = useFormAction(saveBookingSettingsAction);
  const e = state.fields ?? {};
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Group title="Formulaire de réservation">
        <label className="flex items-start gap-3 text-sm text-ivory-dim sm:col-span-2">
          <input type="checkbox" name="requirePhone" defaultChecked={value.requirePhone} className="mt-0.5 h-4 w-4 accent-[var(--color-gold-400)]" />
          <span>
            Téléphone obligatoire
            <span className="block text-xs text-fog">Sinon, le champ reste facultatif.</span>
          </span>
        </label>
        <Text name="minimumAge" label="Âge minimum affiché" value={String(value.minimumAge)} errors={e} type="number" />
      </Group>
      <Group title="Textes affichés aux joueurs">
        <Area name="bookingTerms" label="Conditions de réservation" value={value.bookingTerms} errors={e} rows={4} hint="Affichées au récapitulatif et sur la page Poker." />
        <Area name="cancellationPolicy" label="Politique d’annulation" value={value.cancellationPolicy} errors={e} rows={4} hint="Vide = non affichée. Insérée dans les e-mails via {{politique_annulation}}." />
      </Group>
      <SaveBar pending={pending} state={state} />
    </form>
  );
}

export function LegalSettingsForm({ value }: { value: LegalSettings }) {
  const [state, onSubmit, pending] = useFormAction(saveLegalSettingsAction);
  const e = state.fields ?? {};
  const hint = "Paragraphes séparés par une ligne vide. « ## » en début de ligne pour un titre, « - » pour une liste. Les liens https:// deviennent cliquables.";
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Group title="Pages légales" hint="Contenu à fournir par l’établissement ; aucun texte légal n’est inventé par défaut.">
        <Text name="companyName" label="Raison sociale" value={value.companyName} errors={e} />
        <div />
        <Area name="legalNotice" label="Mentions légales" value={value.legalNotice} errors={e} rows={8} hint={hint} />
        <Area name="privacyPolicy" label="Politique de confidentialité" value={value.privacyPolicy} errors={e} rows={10} hint={hint} />
        <Area name="responsibleGaming" label="Jeu responsable" value={value.responsibleGaming} errors={e} rows={8} hint={hint} />
      </Group>
      <SaveBar pending={pending} state={state} />
    </form>
  );
}

export function EmailSettingsForm({ value, smtpConfigured }: { value: EmailSettings; smtpConfigured: boolean }) {
  const [state, onSubmit, pending] = useFormAction(saveEmailSettingsAction);
  const e = state.fields ?? {};
  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-6">
        <Group title="Expédition & notifications">
          <Text name="ownerNotificationEmail" label="Notifications de nouvelles demandes à" value={value.ownerNotificationEmail} errors={e} type="email" hint="Vide = e-mail de contact du site." />
          <Text name="senderName" label="Nom d’expéditeur" value={value.senderName} errors={e} />
          <Text name="senderAddress" label="Adresse d’expédition" value={value.senderAddress} errors={e} type="email" hint="Doit être autorisée par votre fournisseur SMTP. Vide = SMTP_FROM." />
          <Text name="replyTo" label="Adresse de réponse" value={value.replyTo} errors={e} type="email" hint="Vide = e-mail de contact du site." />
          <label className="flex items-start gap-3 text-sm text-ivory-dim">
            <input type="checkbox" name="remindersEnabled" defaultChecked={value.remindersEnabled} className="mt-0.5 h-4 w-4 accent-[var(--color-gold-400)]" />
            <span>
              Rappels automatiques
              <span className="block text-xs text-fog">Envoyés aux réservations confirmées (tâche planifiée, voir la documentation).</span>
            </span>
          </label>
          <Text name="reminderHoursBefore" label="Envoyer le rappel (heures avant le début)" value={String(value.reminderHoursBefore)} errors={e} type="number" />
        </Group>

        <fieldset className="rounded-2xl border border-white/[0.08] bg-night-850 p-5 sm:p-6">
          <legend className="sr-only">Modèles</legend>
          <h2 className="font-sans text-sm font-semibold uppercase tracking-[0.14em] text-ivory-dim">Modèles d’e-mails</h2>
          <details className="mt-3 text-sm text-mist">
            <summary className="cursor-pointer text-gold-300">Variables disponibles</summary>
            <ul className="mt-3 grid gap-1 sm:grid-cols-2">
              {EMAIL_PLACEHOLDERS.map(([k, d]) => (
                <li key={k}>
                  <code className="font-mono text-ivory-dim">{k}</code> — {d}
                </li>
              ))}
            </ul>
          </details>
          <div className="mt-5 space-y-4">
            {EMAIL_TEMPLATE_KEYS.map((k) => (
              <details key={k} className="rounded-xl border border-white/[0.06] p-4">
                <summary className="cursor-pointer text-sm font-medium text-ivory">{EMAIL_TEMPLATE_LABELS[k]}</summary>
                <div className="mt-4 space-y-3">
                  <div>
                    <label htmlFor={`t-${k}-s`} className="field-label">
                      Objet
                    </label>
                    <input id={`t-${k}-s`} name={`${k}.subject`} defaultValue={value.templates[k].subject} className="field" />
                  </div>
                  <div>
                    <label htmlFor={`t-${k}-b`} className="field-label">
                      Message
                    </label>
                    <textarea id={`t-${k}-b`} name={`${k}.body`} defaultValue={value.templates[k].body} rows={12} className="field font-mono text-sm" />
                  </div>
                </div>
              </details>
            ))}
          </div>
        </fieldset>
        <SaveBar pending={pending} state={state} />
      </form>
      <div className="rounded-2xl border border-white/[0.08] bg-night-850 p-5">
        <h2 className="font-sans text-sm font-semibold uppercase tracking-[0.14em] text-ivory-dim">Tester l’envoi</h2>
        <p className="mt-1 text-sm text-mist">{smtpConfigured ? "Envoie un e-mail de test à votre adresse." : "SMTP non configuré : le test échouera tant que les variables d’environnement ne sont pas définies."}</p>
        <ActionForm action={sendTestEmailAction} label="Envoyer un e-mail de test" buttonClass="btn btn-outline btn-sm mt-3" />
      </div>
    </div>
  );
}
