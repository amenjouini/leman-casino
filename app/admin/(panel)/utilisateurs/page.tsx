import { requirePageUser } from "@/lib/auth/session";
import { listUsers } from "@/lib/admin/queries";
import { ROLE_LABELS } from "@/lib/constants";
import { createUserAction, updateUserAction } from "@/lib/admin/actions/users";
import { formatDateTime } from "@/lib/format";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";

export const metadata = { title: "Équipe & accès" };

const ROLE_HELP = {
  owner: "Accès complet : paramètres, comptes, tournois, réservations.",
  manager: "Tournois, réservations, placement, joueurs, e-mails.",
  staff: "Consultation des réservations et pointage (présent / absent).",
};

function RoleSelect({ id, value }: { id: string; value?: string }) {
  return (
    <select id={id} name="role" defaultValue={value ?? "staff"} className="field">
      {(Object.keys(ROLE_LABELS) as (keyof typeof ROLE_LABELS)[]).map((r) => (
        <option key={r} value={r}>
          {ROLE_LABELS[r]}
        </option>
      ))}
    </select>
  );
}

export default async function UsersPage() {
  const me = await requirePageUser("users.manage");
  const users = await listUsers();

  return (
    <>
      <AdminPageHeader title="Équipe & accès" description="Comptes du personnel et niveaux d’accès. Chaque action sensible est vérifiée côté serveur." />
      <ul className="mb-8 grid gap-3 md:grid-cols-3">
        {(Object.keys(ROLE_HELP) as (keyof typeof ROLE_HELP)[]).map((r) => (
          <li key={r} className="rounded-2xl border border-white/[0.08] bg-night-850 p-4">
            <p className="text-sm font-medium text-ivory">{ROLE_LABELS[r]}</p>
            <p className="mt-1 text-xs text-mist">{ROLE_HELP[r]}</p>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {users.map((u) => (
            <Panel key={u.id} title={`${u.name}${u.id === me.id ? " (vous)" : ""}`}>
              <p className="mb-4 text-sm text-mist">
                {u.email} · dernière connexion : {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "jamais"}
              </p>
              <ActionForm action={updateUserAction} hidden={{ id: u.id }} label="Mettre à jour" buttonClass="btn btn-outline btn-sm mt-4" className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={`r-${u.id}`} className="field-label">
                    Rôle
                  </label>
                  <RoleSelect id={`r-${u.id}`} value={u.role} />
                </div>
                <div>
                  <label htmlFor={`pw-${u.id}`} className="field-label">
                    Nouveau mot de passe (facultatif)
                  </label>
                  <input id={`pw-${u.id}`} name="password" type="password" autoComplete="new-password" className="field" />
                </div>
                <label className="flex items-center gap-3 text-sm text-ivory-dim sm:col-span-2">
                  <input type="checkbox" name="active" defaultChecked={u.active} className="h-4 w-4 accent-[var(--color-gold-400)]" />
                  Compte actif
                </label>
              </ActionForm>
            </Panel>
          ))}
        </div>
        <Panel title="Ajouter un membre" className="self-start">
          <ActionForm action={createUserAction} label="Créer le compte" buttonClass="btn btn-gold btn-sm mt-4" className="space-y-4" resetOnSuccess>
            <div>
              <label htmlFor="nu-name" className="field-label">
                Nom
              </label>
              <input id="nu-name" name="name" required className="field" />
            </div>
            <div>
              <label htmlFor="nu-email" className="field-label">
                E-mail
              </label>
              <input id="nu-email" name="email" type="email" required className="field" />
            </div>
            <div>
              <label htmlFor="nu-role" className="field-label">
                Rôle
              </label>
              <RoleSelect id="nu-role" />
            </div>
            <div>
              <label htmlFor="nu-pw" className="field-label">
                Mot de passe initial (10 caractères min., lettres et chiffres)
              </label>
              <input id="nu-pw" name="password" type="password" required minLength={10} autoComplete="new-password" className="field" />
            </div>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
