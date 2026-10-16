import type { Metadata } from "next";
import Link from "next/link";
import { listPublicTournaments } from "@/lib/tournaments";
import { t } from "@/lib/i18n";
import { PageHero } from "@/components/site/Section";
import { DayBoard } from "@/components/tournaments/DayBoard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: t.nav.book,
  description: "Choisissez votre tournoi et envoyez votre demande de réservation en ligne au Léman Poker & Casino.",
};

export default async function ReservePage() {
  const list = await listPublicTournaments({ availability: "available" });
  return (
    <>
      <PageHero eyebrow={t.home.howEyebrow} title={t.nav.book} lead="Sélectionnez un tournoi ouvert aux inscriptions. Votre demande sera confirmée par notre équipe par e-mail." />
      <section className="py-12 lg:py-16">
        <div className="container-x">
          <ol className="mb-12 grid gap-6 sm:grid-cols-3">
            {t.home.howSteps.map((s, i) => (
              <li key={s.title} className="surface p-6">
                <span className="font-display text-4xl text-gold-400/80">0{i + 1}</span>
                <h2 className="mt-2 font-sans text-sm font-semibold uppercase tracking-[0.16em] text-ivory">{s.title}</h2>
                <p className="mt-2 text-sm text-mist">{s.text}</p>
              </li>
            ))}
          </ol>
          {list.length ? (
            <DayBoard tournaments={list} />
          ) : (
            <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center">
              <p className="text-mist">Aucun tournoi n’est ouvert aux réservations pour le moment.</p>
              <Link href="/tournois" className="btn btn-outline btn-sm mt-5">
                {t.cta.viewCalendar}
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
