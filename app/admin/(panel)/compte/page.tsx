import { requirePageUser } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/constants";
import { changeOwnPasswordAction } from "@/lib/admin/actions/auth";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { ActionForm } from "@/components/admin/ActionForm";

export const metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const user = await requirePageUser("dashboard.view");
  return (
    <>
      <AdminPageHeader title="Mon compte" description={`${user.name} · ${user.email} · ${ROLE_LABELS[user.role]}`} />
      <Panel title="Changer mon mot de passe" className="max-w-xl">
        <ActionForm action={changeOwnPasswordAction} label="Modifier le mot de passe" buttonClass="btn btn-gold btn-sm mt-4" className="space-y-4" resetOnSuccess>
          <div>
            <label htmlFor="pw-current" className="field-label">
              Mot de passe actuel
            </label>
            <input id="pw-current" name="current" type="password" autoComplete="current-password" required className="field" />
          </div>
          <div>
            <label htmlFor="pw-next" className="field-label">
              Nouveau mot de passe
            </label>
            <input id="pw-next" name="next" type="password" autoComplete="new-password" required minLength={10} className="field" />
          </div>
          <div>
            <label htmlFor="pw-confirm" className="field-label">
              Confirmer
            </label>
            <input id="pw-confirm" name="confirm" type="password" autoComplete="new-password" required minLength={10} className="field" />
          </div>
        </ActionForm>
      </Panel>
    </>
  );
}
