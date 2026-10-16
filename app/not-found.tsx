import Link from "next/link";
import { t } from "@/lib/i18n";
import { LakeLines } from "@/components/site/LakeLines";

export default function NotFound() {
  return (
    <main className="grain relative flex min-h-screen items-center overflow-hidden bg-night-950">
      <LakeLines className="pointer-events-none absolute inset-x-0 top-1/2 h-[40rem] w-full -translate-y-1/2 text-gold-400/[0.07]" />
      <div className="container-x relative text-center">
        <p className="font-display text-[8rem] leading-none text-gold-400/80 sm:text-[11rem]">404</p>
        <h1 className="mt-2 text-4xl text-ivory sm:text-5xl">{t.notFound.title}</h1>
        <p className="mx-auto mt-4 max-w-md text-mist">{t.notFound.text}</p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="btn btn-gold">
            {t.notFound.home}
          </Link>
          <Link href="/tournois" className="btn btn-outline">
            {t.nav.calendar}
          </Link>
        </div>
      </div>
    </main>
  );
}
