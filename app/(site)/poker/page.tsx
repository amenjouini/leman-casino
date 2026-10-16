import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listPublicTournaments } from "@/lib/tournaments";
import { getSettings } from "@/lib/settings";
import { t } from "@/lib/i18n";
import { PageHero, SectionHeading } from "@/components/site/Section";
import { TournamentCard } from "@/components/tournaments/TournamentCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tournois de poker",
  description: "Tournois de poker live à Lausanne : formats, déroulement et réservation de places au Léman Poker & Casino.",
  alternates: { canonical: "/poker" },
};

/** General poker vocabulary (not venue claims), shown only for formats actually scheduled. */
const FORMAT_GLOSSARY: Record<string, string> = {
  Freezeout: "Une seule entrée par joueur : une fois votre tapis perdu, votre tournoi est terminé.",
  "Re-entry": "Possibilité de vous réinscrire après élimination, selon les conditions annoncées pour le tournoi.",
  Bounty: "Une prime est placée sur la tête de chaque joueur : éliminer un adversaire rapporte sa prime.",
  "Progressive Knockout": "Variante du bounty : une partie de la prime gagnée s’ajoute à la vôtre au fil des éliminations.",
  Deepstack: "Tapis de départ généreux et niveaux plus longs, pour davantage de jeu post-flop.",
  Turbo: "Niveaux de blinds plus courts : un tournoi plus rapide et plus dynamique.",
  Championnat: "Un événement phare au format soigné, souvent sur plusieurs niveaux de jeu.",
  Satellite: "Les gagnants obtiennent une place pour un tournoi plus important.",
  "Sit & Go": "Le tournoi démarre dès que la table est complète.",
};

export default async function PokerPage() {
  const [list, booking] = await Promise.all([listPublicTournaments({ limit: 60 }), getSettings("booking")]);
  const highlighted = [...list].sort((a, b) => Number(b.featured) - Number(a.featured) || a.startsAt.getTime() - b.startsAt.getTime()).slice(0, 3);
  const formats = Array.from(new Set(list.map((x) => x.format)));

  return (
    <>
      <PageHero eyebrow="Poker live" title={t.nav.poker} lead="Des tournois live pour tous les profils, dans un cadre encadré. Consultez les prochaines dates et réservez votre place en ligne.">
        <Link href="/tournois" className="btn btn-gold">
          {t.cta.viewCalendar}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </PageHero>

      <section className="py-20 lg:py-24">
        <div className="container-x">
          <SectionHeading eyebrow={t.home.upcomingEyebrow} title="À ne pas manquer" />
          {highlighted.length ? (
            <ul className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {highlighted.map((tm) => (
                <li key={tm.id}>
                  <TournamentCard tournament={tm} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-12 rounded-2xl border border-dashed border-white/15 p-10 text-center text-mist">{t.home.noUpcoming}</p>
          )}
        </div>
      </section>

      {formats.length > 0 && (
        <section className="border-y border-white/[0.06] bg-night-950 py-20 lg:py-24">
          <div className="container-x">
            <SectionHeading eyebrow="Formats" title="Les formats au programme" lead="Chaque tournoi précise sa structure : droit d’entrée, tapis de départ, durée des niveaux et règles particulières." />
            <dl className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07] sm:grid-cols-2 lg:grid-cols-3">
              {formats.map((f) => (
                <div key={f} className="bg-night-900 p-7">
                  <dt className="font-display text-2xl text-ivory">
                    <Link href={`/tournois?format=${encodeURIComponent(f)}`} className="hover:text-gold-300">
                      {f}
                    </Link>
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-mist">{FORMAT_GLOSSARY[f] ?? "Consultez la fiche du tournoi pour le détail de la structure."}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      <section className="py-20 lg:py-24">
        <div className="container-x grid gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow">{t.home.howEyebrow}</p>
            <h2 className="mt-4 text-4xl text-ivory sm:text-5xl">{t.home.howTitle}</h2>
            <ol className="mt-10 space-y-8">
              {t.home.howSteps.map((s, i) => (
                <li key={s.title} className="flex gap-5">
                  <span className="font-display text-4xl leading-none text-gold-400/80">0{i + 1}</span>
                  <div>
                    <h3 className="font-sans text-sm font-semibold uppercase tracking-[0.16em] text-ivory">{s.title}</h3>
                    <p className="mt-1.5 text-mist">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="surface self-start p-7">
            <h3 className="text-2xl text-ivory">{t.booking.terms}</h3>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-mist">{booking.bookingTerms}</p>
            {booking.cancellationPolicy && (
              <>
                <h3 className="mt-6 text-2xl text-ivory">{t.booking.cancellation}</h3>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-mist">{booking.cancellationPolicy}</p>
              </>
            )}
            {booking.minimumAge > 0 && <p className="mt-6 text-sm text-fog">{t.booking.ageNotice(booking.minimumAge)}</p>}
            <Link href="/reserver" className="btn btn-gold mt-8 w-full">
              {t.cta.book}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
