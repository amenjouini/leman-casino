import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { t } from "@/lib/i18n";
import { PageHero } from "@/components/site/Section";
import welcome from "@/public/images/welcome.png";
import space from "@/public/images/space.png";
import team from "@/public/images/team.png";
import club from "@/public/images/club.png";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Le casino",
  description: "Découvrez le Léman Poker & Casino à Lausanne : un club de poker convivial, encadré par une équipe professionnelle.",
  alternates: { canonical: "/le-casino" },
};

export default async function AboutPage() {
  const site = await getSettings("site");
  const gallery = [
    { src: welcome, alt: "Salle de jeu aux boiseries et lustres" },
    { src: space, alt: "Roulette et table de jeu" },
    { src: team, alt: "Équipe du club" },
    { src: club, alt: "Ambiance du club" },
  ];
  return (
    <>
      <PageHero eyebrow={site.tagline || t.nav.about} title={site.casinoName} lead={site.aboutIntro} />
      <section className="py-20 lg:py-24">
        <div className="container-x">
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {gallery.map((g, i) => (
              <li key={i} className={`relative overflow-hidden rounded-2xl ${i % 2 ? "aspect-[3/4] lg:mt-12" : "aspect-[3/4]"}`}>
                <Image src={g.src} alt={g.alt} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover" placeholder="blur" loading="lazy" />
              </li>
            ))}
          </ul>

          {site.highlights.length > 0 && (
            <ol className="mx-auto mt-24 max-w-4xl divide-y divide-white/[0.07] border-y border-white/[0.07]">
              {site.highlights.map((h, i) => (
                <li key={h.title} className="grid gap-4 py-10 md:grid-cols-[6rem_1fr]">
                  <span className="font-display text-5xl leading-none text-gold-400/70">0{i + 1}</span>
                  <div>
                    <h2 className="text-3xl text-ivory sm:text-4xl">{h.title}</h2>
                    <p className="mt-3 text-lg leading-relaxed text-mist">{h.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-20 flex flex-col items-center gap-4 text-center">
            <p className="font-display text-3xl text-ivory sm:text-4xl">Prêt à prendre place ?</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/tournois" className="btn btn-gold">
                {t.cta.discover}
              </Link>
              <Link href="/contact" className="btn btn-outline">
                {t.cta.contact}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
