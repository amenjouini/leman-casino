import Link from "next/link";
import { countUsers } from "@/lib/users";
import { SetupForm } from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const hasUsers = (await countUsers()) > 0;
  const enabled = (process.env.ADMIN_SETUP_TOKEN ?? "").length >= 16;
  return (
    <>
      <h1 className="text-3xl text-ivory">Configuration initiale</h1>
      {hasUsers ? (
        <p className="mt-4 text-sm text-mist">
          Le compte propriétaire existe déjà.{" "}
          <Link href="/admin/login" className="text-gold-300 underline">
            Se connecter
          </Link>
        </p>
      ) : !enabled ? (
        <p className="mt-4 text-sm leading-relaxed text-mist">
          Cette page est désactivée. Créez le premier compte avec <code className="font-mono text-ivory-dim">npm run admin:create -- --email … --name …</code>, ou définissez
          la variable d’environnement <code className="font-mono text-ivory-dim">ADMIN_SETUP_TOKEN</code> (16 caractères minimum) puis rechargez cette page.
        </p>
      ) : (
        <>
          <p className="mb-6 mt-1 text-sm text-mist">Créez le compte propriétaire. Cette page se désactive automatiquement ensuite.</p>
          <SetupForm />
        </>
      )}
    </>
  );
}
