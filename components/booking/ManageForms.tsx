"use client";

import { useState } from "react";
import { lookupBookingAction, playerCancelAction, playerProfileAction } from "@/lib/public-actions";
import { FormMessage, SubmitButton, useFormAction } from "@/components/admin/ActionForm";

export function CancelBookingForm({ token }: { token: string }) {
  const [state, onSubmit, pending] = useFormAction(playerCancelAction, {
    confirm: () => "Annuler votre réservation ? Votre place sera libérée et proposée à d’autres joueurs.",
  });
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <SubmitButton pending={pending} className="btn btn-sm border border-danger/50 text-danger hover:bg-danger/10">
        Annuler ma réservation
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function PublicProfileForm({ token, publicName, showPublicly }: { token: string; publicName: string; showPublicly: boolean }) {
  const [state, onSubmit, pending] = useFormAction(playerProfileAction);
  const [name, setName] = useState(publicName);
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="pp-name" className="field-label">
          Pseudo
        </label>
        <input id="pp-name" name="publicName" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} className="field" />
      </div>
      <label className="flex items-start gap-3 text-sm text-ivory-dim">
        <input type="checkbox" name="showPublicly" defaultChecked={showPublicly} disabled={!name.trim()} className="mt-0.5 h-4 w-4 accent-[var(--color-gold-400)]" />
        Afficher mon pseudo dans la liste publique des inscrits
      </label>
      <SubmitButton pending={pending} className="btn btn-outline btn-sm">
        Enregistrer
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function LookupForm() {
  const [state, onSubmit, pending] = useFormAction(lookupBookingAction);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="lk-ref" className="field-label">
          Référence de réservation
        </label>
        <input id="lk-ref" name="reference" required placeholder="LM-XXXX-XXXX" autoCapitalize="characters" className="field font-mono uppercase" />
      </div>
      <div>
        <label htmlFor="lk-email" className="field-label">
          E-mail utilisé pour la réservation
        </label>
        <input id="lk-email" name="email" type="email" required autoComplete="email" className="field" />
      </div>
      <SubmitButton pending={pending} className="btn btn-gold w-full">
        Retrouver ma réservation
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
