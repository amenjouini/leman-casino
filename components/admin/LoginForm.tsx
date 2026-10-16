"use client";

import { loginAction, setupOwnerAction } from "@/lib/admin/actions/auth";
import { FormMessage, SubmitButton, useFormAction } from "./ActionForm";

export function LoginForm({ next }: { next?: string }) {
  const [state, onSubmit, pending] = useFormAction(loginAction);
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label htmlFor="email" className="field-label">
          E-mail
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className="field" />
      </div>
      <div>
        <label htmlFor="password" className="field-label">
          Mot de passe
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-gold w-full" pendingLabel="Connexion…" pending={pending}>
        Se connecter
      </SubmitButton>
    </form>
  );
}

export function SetupForm() {
  const [state, onSubmit, pending] = useFormAction(setupOwnerAction);
  const err = (k: string) => state.fields?.[k] && <p className="field-error">{state.fields[k]}</p>;
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="token" className="field-label">
          Jeton de configuration (ADMIN_SETUP_TOKEN)
        </label>
        <input id="token" name="token" type="password" required className="field" autoComplete="off" />
        {err("token")}
      </div>
      <div>
        <label htmlFor="name" className="field-label">
          Nom
        </label>
        <input id="name" name="name" required className="field" autoComplete="name" />
        {err("name")}
      </div>
      <div>
        <label htmlFor="email" className="field-label">
          E-mail
        </label>
        <input id="email" name="email" type="email" required className="field" autoComplete="username" />
        {err("email")}
      </div>
      <div>
        <label htmlFor="password" className="field-label">
          Mot de passe (10 caractères min., lettres et chiffres)
        </label>
        <input id="password" name="password" type="password" required minLength={10} className="field" autoComplete="new-password" />
        {err("password")}
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn btn-gold w-full" pending={pending}>Créer le compte propriétaire</SubmitButton>
    </form>
  );
}
