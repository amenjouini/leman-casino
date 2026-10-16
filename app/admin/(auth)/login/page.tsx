import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { countUsers } from "@/lib/users";
import { LoginForm } from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getSessionUser()) redirect("/admin");
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
      <LoginForm next={typeof next === "string" ? next : undefined} />
      <p className="mt-6 text-center text-xs text-fog">
        <Link href="/" className="hover:text-gold-300">
          ← Retour au site
        </Link>
      </p>
    </>
  );
}
