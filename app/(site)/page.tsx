import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, Mail, MapPin, Phone } from "lucide-react";
import { listPublicTournaments } from "@/lib/tournaments";
import { getAllPublicSettings } from "@/lib/settings";
import { formatEntry, formatDateLong, formatTime, zonedDateKey } from "@/lib/format";
import { t } from "@/lib/i18n";
import { LakeLines } from "@/components/site/LakeLines";
import { SectionHeading } from "@/components/site/Section";
import { TournamentCard, DateBlock } from "@/components/tournaments/TournamentCard";
import { StatusBadge } from "@/components/tournaments/StatusBadge";
import { RouletteGame } from "@/components/roulette/RouletteGame";
import welcome from "@/public/images/welcome.png";
import space from "@/public/images/space.png";
import tournamentsImg from "@/public/images/tournmanets.png";
import team from "@/public/images/team.png";
import club from "@/public/images/club.png";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ site }, upcoming] = await Promise.all([getAllPublicSettings(), listPublicTournaments({ limit: 40 })]);
  const next = upcoming.find((x) => x.availability.canRequest) ?? upcoming[0];
  const featured = [...upcoming].sort((a, b) => Number(b.featured) - Number(a.featured) || a.startsAt.getTime() - b.startsAt.getTime()).slice(0, 6);
  featured.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const horizon = Date.now() + 21 * 24 * 3600 * 1000;
  const agenda = upcoming.filter((x) => x.startsAt.getTime() <= horizon).slice(0, 8);
  const address = [site.addressLine, [site.postalCode, site.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  return (
    <>
      {/* ───────────── Hero ───────────── */}
      <section className="grain relative -mt-[4.5rem] overflow-hidden bg-night-950 lg:-mt-20">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -left-1/4 top-0 h-[80%] w-[80%] rounded-full bg-[radial-gradient(circle,rgba(196,162,101,0.16),transparent_60%)] motion-safe:animate-glow" />
          <div className="absolute bottom-0 right-0 h-[70%] w-[60%] bg-[radial-gradient(circle_at_bottom_right,rgba(28,39,69,0.9),transparent_65%)]" />
          <LakeLines className="absolute -left-20 bottom-[-6rem] h-[36rem] w-[80rem] text-gold-400/[0.08] motion-safe:animate-drift" />
        </div>

        <div className="container-x relative grid min-h-[min(100svh,58rem)] items-center gap-12 pb-16 pt-32 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:pb-24 lg:pt-36">
          <div className="motion-safe:animate-fade-up">
            <p className="eyebrow flex items-center gap-3">
              <span className="inline-block h-px w-10 bg-gold-500/70" aria-hidden />
              {t.home.eyebrow}
            </p>
            <h1 className="mt-6 whitespace-pre-line text-[3.1rem] leading-[0.98] text-ivory sm:text-7xl lg:text-[5.6rem]">
              {t.home.title.split("\n")[0]}
              <br />
              <em className="font-normal text-gold-300">{t.home.title.split("\n")[1]}</em>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-mist">{t.home.lead}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/tournois" className="btn btn-gold">
                {t.cta.discover}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/reserver" className="btn btn-outline">
                {t.cta.book}
              </Link>
            </div>
            {site.tagline && <p className="mt-10 text-xs uppercase tracking-[0.28em] text-fog">{site.tagline}</p>}
          </div>

          <div className="relative mx-auto w-full max-w-md motion-safe:animate-fade-up lg:max-w-none">
            <div className="relative aspect-[4/5] overflow-hidden rounded-t-[12rem] rounded-b-2xl border border-gold-500/25 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)]">
              {site.heroImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={site.heroImageUrl} alt="Salle de jeu du Léman" className="h-full w-full object-cover" />
              ) : (
                <Image src={welcome} alt="Salle de poker feutrée, tables et lustres" fill priority sizes="(min-width: 1024px) 40vw, 90vw" className="object-cover" placeholder="blur" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-night-950 via-night-950/10 to-transparent" />
            </div>
            {next && (
              <Link
                href={`/tournois/${next.slug}`}
                className="group absolute -bottom-8 left-4 right-4 flex items-center gap-4 rounded-2xl border border-white/10 bg-night-900/90 p-4 backdrop-blur-xl transition-colors hover:border-gold-500/50 sm:-left-8 sm:right-auto sm:w-[22rem]"
              >
                <DateBlock date={next.startsAt} />
                <div className="min-w-0">
                  <p className="eyebrow !text-[0.62rem]">{t.home.nextEvent}</p>
                  <p className="mt-1 truncate font-display text-xl text-ivory">{next.name}</p>
                  <p className="mt-0.5 text-xs text-mist">
                    {formatTime(next.startsAt)} · {formatEntry(next)}
                  </p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-gold-400 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ───────────── Upcoming tournaments ───────────── */}
      <section className="py-24 lg:py-32" id="a-venir">
        <div className="container-x">
          <SectionHeading eyebrow={t.home.upcomingEyebrow} title={t.home.upcomingTitle} lead={t.home.upcomingLead}>
            <Link href="/tournois" className="btn btn-outline btn-sm">
              {t.cta.viewCalendar}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </SectionHeading>
          {featured.length ? (
            <ul className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {featured.map((tm) => (
                <li key={tm.id}>
                  <TournamentCard tournament={tm} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-14 rounded-2xl border border-dashed border-white/15 p-10 text-center text-mist">{t.home.noUpcoming}</p>
          )}
        </div>
      </section>

      {/* ───────────── Experience ───────────── */}
      <section className="relative overflow-hidden border-y border-white/[0.06] bg-night-950 py-24 lg:py-32">
        <div className="container-x grid items-center gap-14 lg:grid-cols-2">
          <div className="grid grid-cols-6 grid-rows-6 gap-3 sm:gap-4" style={{ aspectRatio: "1 / 1" }}>
            <figure className="relative col-span-4 row-span-4 overflow-hidden rounded-2xl">
              <Image src={space} alt="Roulette et tapis de jeu" fill sizes="(min-width:1024px) 30vw, 66vw" className="object-cover" placeholder="blur" loading="lazy" />
            </figure>
            <figure className="relative col-span-2 col-start-5 row-span-3 overflow-hidden rounded-2xl">
              <Image src={tournamentsImg} alt="Table de tournoi de poker" fill sizes="(min-width:1024px) 15vw, 33vw" className="object-cover" placeholder="blur" loading="lazy" />
            </figure>
            <figure className="relative col-span-2 col-start-5 row-span-3 row-start-4 overflow-hidden rounded-2xl">
              <Image src={team} alt="L'équipe du club" fill sizes="(min-width:1024px) 15vw, 33vw" className="object-cover" placeholder="blur" loading="lazy" />
            </figure>
            <figure className="relative col-span-4 row-span-2 row-start-5 overflow-hidden rounded-2xl">
              <Image src={club} alt="Ambiance du club" fill sizes="(min-width:1024px) 30vw, 66vw" className="object-cover object-center" placeholder="blur" loading="lazy" />
            </figure>
          </div>
          <div>
            <p className="eyebrow">{t.home.experienceEyebrow}</p>
            <h2 className="mt-4 text-4xl leading-[1.05] text-ivory sm:text-5xl">{t.home.experienceTitle}</h2>
            <p className="mt-6 text-lg leading-relaxed text-mist">{site.aboutIntro}</p>
            <div className="rule-gold my-10" />
            <ol className="grid gap-8 sm:grid-cols-3">
              {t.home.howSteps.map((s, i) => (
                <li key={s.title}>
                  <span className="font-display text-4xl text-gold-400/80">0{i + 1}</span>
                  <h3 className="mt-2 font-sans text-sm font-semibold uppercase tracking-[0.16em] text-ivory">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-mist">{s.text}</p>
                </li>
              ))}
            </ol>
            <Link href="/le-casino" className="btn btn-outline mt-10">
              {t.nav.about}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────── Why play here ───────────── */}
      {site.highlights.length > 0 && (
        <section className="py-24 lg:py-32">
          <div className="container-x">
            <SectionHeading eyebrow={t.home.whyEyebrow} title={t.home.whyTitle} align="center" />
            <ul className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07] sm:grid-cols-2 lg:grid-cols-4">
              {site.highlights.map((h, i) => (
                <li key={h.title} className="bg-night-900 p-8 transition-colors hover:bg-night-850">
                  <span className="text-xs font-semibold tracking-[0.2em] text-gold-500">— 0{i + 1}</span>
                  <h3 className="mt-5 text-2xl leading-snug text-ivory">{h.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-mist">{h.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ───────────── Calendar preview ───────────── */}
      <section className="border-y border-white/[0.06] bg-night-950 py-24 lg:py-28">
        <div className="container-x grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="eyebrow">{t.home.calendarEyebrow}</p>
            <h2 className="mt-4 text-4xl leading-[1.05] text-ivory sm:text-5xl">{t.home.calendarTitle}</h2>
            <p className="mt-5 max-w-md text-mist">{t.calendar.lead}</p>
            <Link href="/tournois?vue=calendrier" className="btn btn-gold mt-8">
              <CalendarDays className="h-4 w-4" aria-hidden />
              {t.cta.viewCalendar}
            </Link>
          </div>
          {agenda.length ? (
            <ol className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
              {agenda.map((tm, i) => {
                const newDay = i === 0 || zonedDateKey(agenda[i - 1].startsAt) !== zonedDateKey(tm.startsAt);
                return (
                  <li key={tm.id}>
                    <Link href={`/tournois/${tm.slug}`} className="group grid grid-cols-[6.5rem_1fr_auto] items-center gap-4 py-4 transition-colors hover:bg-white/[0.02] sm:grid-cols-[9rem_1fr_auto]">
                      <span className={`text-sm ${newDay ? "text-ivory-dim" : "text-transparent"} first-letter:uppercase`}>{formatDateLong(tm.startsAt).replace(/ \d{4}$/, "")}</span>
                      <span className="min-w-0">
                        <span className="block truncate font-display text-xl text-ivory group-hover:text-gold-300">{tm.name}</span>
                        <span className="flex items-center gap-1.5 text-xs text-mist">
                          <Clock className="h-3 w-3" aria-hidden /> {formatTime(tm.startsAt)} · {tm.format}
                        </span>
                      </span>
                      <StatusBadge state={tm.availability.state} className="hidden sm:inline-flex" />
                    </Link>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="self-center rounded-2xl border border-dashed border-white/15 p-10 text-center text-mist">{t.home.noUpcoming}</p>
          )}
        </div>
      </section>

      {/* ───────────── Roulette (playable here) ───────────── */}
      <section id="roulette" className="relative scroll-mt-20 overflow-hidden py-20 lg:py-28" aria-labelledby="roulette-title">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,#124636_0%,#0b2a21_38%,#08130f_70%,var(--color-night-900)_100%)]" />
          <div className="grain absolute inset-0" />
        </div>
        <div className="container-x relative">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow">{t.home.rouletteEyebrow}</p>
              <h2 id="roulette-title" className="mt-4 text-4xl leading-[1.05] text-ivory sm:text-5xl">
                {t.home.rouletteTitle}
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-mist">{t.home.rouletteLead}</p>
            </div>
            <p className="max-w-xs text-xs leading-relaxed text-fog md:text-right">1 000 jetons « LÉMAN » offerts pour jouer. Jetons symboliques, sans valeur ni gain.</p>
          </div>
          <RouletteGame />
        </div>
      </section>

      {/* ───────────── Location & contact ───────────── */}
      <section className="border-t border-white/[0.06] bg-night-950 py-24 lg:py-28">
        <div className="container-x grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="eyebrow">{t.home.locationEyebrow}</p>
            <h2 className="mt-4 text-4xl leading-[1.05] text-ivory sm:text-5xl">{t.home.locationTitle}</h2>
            <ul className="mt-10 space-y-5 text-ivory-dim">
              {(address || site.city) && (
                <li className="flex gap-4">
                  <MapPin className="mt-1 h-5 w-5 shrink-0 text-gold-400" aria-hidden />
                  <span>
                    {site.casinoName}
                    <br />
                    {address || site.city}
                  </span>
                </li>
              )}
              {site.phone && (
                <li className="flex gap-4">
                  <Phone className="mt-1 h-5 w-5 shrink-0 text-gold-400" aria-hidden />
                  <a href={`tel:${site.phone.replace(/[^+0-9]/g, "")}`} className="hover:text-gold-300">
                    {site.phone}
                  </a>
                </li>
              )}
              {site.email && (
                <li className="flex gap-4">
                  <Mail className="mt-1 h-5 w-5 shrink-0 text-gold-400" aria-hidden />
                  <a href={`mailto:${site.email}`} className="break-all hover:text-gold-300">
                    {site.email}
                  </a>
                </li>
              )}
              {site.openingHours && (
                <li className="flex gap-4">
                  <Clock className="mt-1 h-5 w-5 shrink-0 text-gold-400" aria-hidden />
                  <span className="whitespace-pre-line">{site.openingHours}</span>
                </li>
              )}
            </ul>
            <Link href="/contact" className="btn btn-outline mt-10">
              {t.cta.contact}
            </Link>
          </div>
          {site.mapEmbedUrl ? (
            <div className="min-h-80 overflow-hidden rounded-2xl border border-white/[0.08] lg:min-h-[26rem]">
              <iframe
                src={site.mapEmbedUrl}
                title={`Carte : ${site.casinoName}`}
                className="h-full min-h-80 w-full grayscale-[0.4] invert-[0.92] hue-rotate-180 lg:min-h-[26rem]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
