"use client";

import Link from "next/link";
import { useEffect } from "react";
import { t } from "@/lib/i18n";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center bg-night-950">
      <div className="container-x text-center">
        <p className="eyebrow">Erreur</p>
        <h1 className="mt-4 text-4xl text-ivory sm:text-5xl">{t.error.title}</h1>
        <p className="mx-auto mt-4 max-w-md text-mist">{t.error.text}</p>
        {error.digest && <p className="mt-2 font-mono text-xs text-fog">Réf. {error.digest}</p>}
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={reset} className="btn btn-gold">
            {t.error.retry}
          </button>
          <Link href="/" className="btn btn-outline">
            {t.notFound.home}
          </Link>
        </div>
      </div>
    </main>
  );
}
