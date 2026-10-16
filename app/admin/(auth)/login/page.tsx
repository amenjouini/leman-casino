import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { countUsers } from "@/lib/users";
import { LoginForm } from "@/components/admin/LoginForm";
import { DEMO_ACCOUNTS, demoEnabled, ensureDemoData } from "@/lib/demo";
import { ROLE_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getSessionUser()) redirect("/admin");
  const demo = demoEnabled();
  if (demo) await ensureDemoData();
  const { next } = await searchParams;
  const noUsers = (await countUsers()) === 0;
  return (
    <>
      <h1 className="text-3xl text-ivory">Connexion</h1>
      <p className="mb-6 mt-1 text-sm text-mist">Accès réservé à l’équipe du casino.</p>
      {noUsers && (
        <p className="mb-6 rounded-lg border border-info/30 bg-info/[0.07] p-3 text-sm text-info">
          Aucun compte n’existe encore. Créez le compte propriétaire avec <code className="font-mono">npm run admin:create</code> ou via{" "}
          <Link href="/admin/setup" className="underline">
            la configuration initiale
          </Link>
          .
        </p>
      )}
      {demo && (
        <div className="mb-6 rounded-lg border border-gold-500/30 bg-gold-400/[0.06] p-3 text-sm">
          <p className="font-semibold text-gold-200">Mode démonstration — comptes de test</p>
          <ul className="mt-2 space-y-1 text-xs text-ivory-dim">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <span className="text-mist">{ROLE_LABELS[a.role]} :</span> <code className="font-mono text-ivory">{a.email}</code>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-mist">
            Mot de passe : <code className="font-mono text-ivory">{DEMO_ACCOUNTS[0].password}</code>
          </p>
        </div>
      )}
      <LoginForm next={typeof next === "string" ? next : undefined} />
      <p className="mt-6 text-center text-xs text-fog">
        <Link href="/" className="hover:text-gold-300">
          ← Retour au site
        </Link>
      </p>
    </>
  );
}
