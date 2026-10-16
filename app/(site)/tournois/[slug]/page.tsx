import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CalendarDays, Clock, Globe, Layers, Mail, MapPin, Phone, Trophy, User, Users } from "lucide-react";
import { getPublicTournament, listPublicTournaments } from "@/lib/tournaments";
import { publicParticipants } from "@/lib/bookings";
import { getAllPublicSettings } from "@/lib/settings";
import { formatDateShort, formatDateLong, formatEntry, formatMoney, formatNumber, formatStack, formatTime, totalEntryCents } from "@/lib/format";
import { levelDurationLabel } from "@/lib/levels";
import { entryType } from "@/lib/tournament-meta";
import { t } from "@/lib/i18n";
import { siteUrl } from "@/lib/request";
import { StatusBadge } from "@/components/tournaments/StatusBadge";
import { ShareButtons } from "@/components/tournaments/ShareButtons";
import { DayBoard } from "@/components/tournaments/DayBoard";
import { LakeLines } from "@/components/site/LakeLines";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

const chf = (cents: number | null | undefined) => (cents == null ? null : `${new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 2 }).format(cents / 100)}.-`);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tm = await getPublicTournament(slug);
  if (!tm) return { title: "Tournoi introuvable" };
  const description = `${tm.format} · ${tm.gameVariant} — ${formatDateLong(tm.startsAt)} à ${formatTime(tm.startsAt)}. Buy-in : ${formatEntry(tm)}. Réservez votre place en ligne.`;
  return {
    title: `${tm.name} — ${formatDateLong(tm.startsAt)}`,
    description,
    alternates: { canonical: `/tournois/${tm.slug}` },
    openGraph: { title: tm.name, description, type: "website", images: tm.coverImageUrl ? [tm.coverImageUrl] : undefined },
  };
}

function Row({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/[0.05] py-2 last:border-0">
      <dt className="text-xs text-fog">{label}</dt>
      <dd className={`text-right font-mono text-sm tabular-nums ${accent ? "font-semibold text-gold-300" : "text-ivory"}`}>{value}</dd>
    </div>
  );
}

function Card({ title, icon: Icon, children, className = "" }: { title: string; icon: typeof Users; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/[0.08] bg-night-850 p-5 ${className}`}>
      <h2 className="mb-3 flex items-center gap-2 font-sans text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-gold-400">
        <Icon className="h-3.5 w-3.5" aria-hidden /> {title}
      </h2>
      {children}
    </section>
  );
}

export default async function TournamentDetailPage({ params }: Props) {
  const { slug } = await params;
  const [tm, { site, booking }] = await Promise.all([getPublicTournament(slug), getAllPublicSettings()]);
  if (!tm) notFound();
  const a = tm.availability;
  const [people, others] = await Promise.all([publicParticipants(tm.id), listPublicTournaments({ limit: 8 })]);
  const otherList = others.filter((o) => o.id !== tm.id).slice(0, 5);
  const type = entryType(tm);
  const duration = levelDurationLabel(tm.levels, tm.blindLevelMinutes);
  const address = [site.addressLine, [site.postalCode, site.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const pct = Math.round(a.fillRatio * 100);
  const external = !!tm.externalBookingUrl;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: tm.name,
    startDate: tm.startsAt.toISOString(),
    endDate: tm.endsAt?.toISOString(),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    description: tm.description || `${tm.format} · ${tm.gameVariant}`,
    location: { "@type": "Place", name: site.casinoName, address: [site.addressLine, site.postalCode, site.city, site.country].filter(Boolean).join(", ") || undefined },
    organizer: { "@type": "Organization", name: site.casinoName, url: siteUrl() },
    offers:
      totalEntryCents(tm.buyInCents, tm.feeCents, tm.bountyCents) != null
        ? {
            "@type": "Offer",
            price: ((totalEntryCents(tm.buyInCents, tm.feeCents, tm.bountyCents) ?? 0) / 100).toFixed(2),
            priceCurrency: tm.currency,
            availability: a.canRequest && !a.waitlistOnly ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
            url: `${siteUrl()}/tournois/${tm.slug}`,
          }
        : undefined,
  };

  const barColor = pct >= 100 ? "bg-danger" : pct >= 85 ? "bg-[#f08a3c]" : pct >= 50 ? "bg-warn" : "bg-ok";
  let levelNo = 0;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <section className="grain relative -mt-[4.5rem] overflow-hidden border-b border-white/[0.06] bg-night-950 lg:-mt-20">
        <LakeLines className="pointer-events-none absolute -right-40 top-10 h-[30rem] w-[60rem] text-gold-400/[0.07]" />
        <div className="container-x relative pb-10 pt-28 lg:pb-12 lg:pt-36">
          <Link href="/tournois" className="inline-flex items-center gap-2 text-sm text-mist hover:text-gold-300">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Tous les tournois
          </Link>
          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                {!external && <StatusBadge state={a.state} />}
                <span className="text-xs uppercase tracking-[0.16em] text-gold-400">
                  {tm.format} · {tm.gameVariant}
                </span>
              </div>
              <h1 className="mt-4 max-w-4xl text-5xl leading-[1.02] text-ivory sm:text-6xl">{tm.name}</h1>
              <p className="mt-3 text-sm text-mist">{site.casinoName}</p>
              <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ivory-dim">
                {(address || site.city) && (
                  <li className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gold-500" aria-hidden />
                    {[tm.venue, address || site.city].filter(Boolean).join(" · ")}
                  </li>
                )}
                {site.phone && (
                  <li className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gold-500" aria-hidden />
                    <a href={`tel:${site.phone.replace(/[^+0-9]/g, "")}`} className="hover:text-gold-300">
                      {site.phone}
                    </a>
                  </li>
                )}
                {site.email && (
                  <li className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gold-500" aria-hidden />
                    <a href={`mailto:${site.email}`} className="hover:text-gold-300">
                      {site.email}
                    </a>
                  </li>
                )}
              </ul>
            </div>
            <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-gold-500/25 bg-night-900/70 px-5 py-4">
              <CalendarDays className="h-6 w-6 text-gold-400" aria-hidden />
              <div>
                <p className="font-display text-2xl leading-tight text-ivory first-letter:uppercase">{formatDateLong(tm.startsAt).replace(/ \d{4}$/, "")}</p>
                <p className="font-mono text-sm text-gold-300">{formatTime(tm.startsAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 lg:py-14">
        <div className="container-x space-y-6">
          {/* ── Inscription · Détails · Specs ── */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Inscription" icon={Users}>
              {external ? (
                <>
                  <p className="text-sm text-mist">{t.detail.externalInfo}</p>
                  <a href={tm.externalBookingUrl!} target="_blank" rel="noopener noreferrer" className="btn btn-gold mt-4 w-full">
                    {t.cta.external} <ArrowUpRight className="h-4 w-4" aria-hidden />
                  </a>
                </>
              ) : (
                <>
                  <div className="flex items-baseline justify-between">
                    <p className="font-mono text-ivory">
                      <span className="text-2xl font-semibold">{a.taken}</span>
                      <span className="text-mist"> / {a.capacity} joueurs</span>
                    </p>
                    <span className="font-mono text-sm text-mist">{pct}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={a.capacity} aria-valuenow={a.taken} aria-label="Remplissage">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-mist">
                    Réservés : <span className="text-ivory">{people.reserved}</span> · Attente : <span className="text-ivory">{people.waiting}</span>
                  </p>
                  {a.canRequest ? (
                    <Link href={`/tournois/${tm.slug}/reserver`} className="btn btn-gold mt-4 w-full">
                      {a.waitlistOnly ? t.cta.joinWaitlist : t.cta.book}
                    </Link>
                  ) : (
                    <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-mist">
                      {a.state === "not_yet_open" && a.opensAt ? `Ouverture des inscriptions le ${formatDateShort(a.opensAt)} à ${formatTime(a.opensAt)}.` : t.booking.unavailable}
                    </p>
                  )}
                  <p className="mt-3 text-xs leading-relaxed text-fog">{t.detail.bookingInfo}</p>
                </>
              )}
              <div className="mt-4 border-t border-white/[0.06] pt-4">
                <ShareButtons path={`/tournois/${tm.slug}`} title={`${tm.name} — ${formatDateShort(tm.startsAt)} ${formatTime(tm.startsAt)}`} />
              </div>
            </Card>

            <Card title="Détails" icon={CalendarDays}>
              <dl>
                <Row label="Date" value={formatDateShort(tm.startsAt)} />
                <Row label="Heure" value={formatTime(tm.startsAt)} />
                {tm.lateRegistration && <Row label="Late reg" value={tm.lateRegistration} />}
                <Row label="Re-entries" value={tm.reentryCount != null ? (tm.reentryCount === 0 ? "Freezeout" : tm.reentryCount) : type === "reentry" ? "Oui" : "—"} accent={!!tm.reentryCount} />
                <Row label="Buy-in" value={chf(tm.buyInCents) ?? "—"} accent />
                {tm.bountyCents ? <Row label="Bounty" value={chf(tm.bountyCents)} /> : null}
                <Row label="Rake" value={chf(tm.feeCents) ?? "—"} />
                {(tm.reentryCount ?? 0) > 0 && <Row label="Re-entry" value={chf(tm.reentryPriceCents ?? tm.buyInCents) ?? "—"} />}
                {(tm.reentryCount ?? 0) > 0 && <Row label="Rake du re-entry" value={chf(tm.reentryFeeCents ?? tm.feeCents) ?? "—"} />}
                {tm.guaranteeCents ? <Row label="Garantie" value={formatMoney(tm.guaranteeCents, tm.currency)} accent /> : null}
              </dl>
            </Card>

            <Card title="Specs" icon={Layers}>
              <dl>
                <Row label="Type" value={tm.gameVariant} />
                <Row label="Format" value={tm.format} />
                <Row label="Stack départ" value={tm.startingStack ? `${formatStack(tm.startingStack)} (${formatNumber(tm.startingStack)})` : "—"} />
                <Row label="Niveaux" value={duration ? `${duration} min` : "—"} />
                <Row label="Capacité" value={`${tm.capacity} · ${t.detail.tables(tm.tableCount, tm.seatsPerTable)}`} />
                <Row label="Placement" value={tm.seatSelection === "player" ? "Choix du siège" : "Tirage par l’équipe"} />
              </dl>
            </Card>
          </div>

          {/* ── Counters ── */}
          {!external && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                [`${a.taken}/${a.capacity}`, "Joueurs", "text-ivory"],
                [people.waiting, "Attente", "text-info"],
                [people.reserved, "Réservés", "text-ok"],
                [people.anonymous, "Anonymes", "text-mist"],
              ].map(([v, l, c]) => (
                <div key={l as string} className="rounded-2xl border border-white/[0.08] bg-night-850 px-4 py-4 text-center">
                  <p className={`font-mono text-2xl font-semibold tabular-nums ${c}`}>{v}</p>
                  <p className="mt-1 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-fog">{l}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Registered players ── */}
          {!external && (
            <Card title={`Inscrits (${people.registered})`} icon={User}>
              {people.registered === 0 ? (
                <p className="text-sm text-mist">Aucun joueur confirmé pour le moment. Soyez le premier !</p>
              ) : (
                <ol className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
                  {people.names.map((n, i) => (
                    <li key={`${n}-${i}`} className="flex items-center gap-3 border-b border-white/[0.05] py-2.5">
                      <span className="w-6 text-right font-mono text-xs text-fog">{i + 1}</span>
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-night-700 text-[0.7rem] font-semibold text-gold-200" aria-hidden>
                        {n.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="truncate text-sm text-ivory">{n}</span>
                    </li>
                  ))}
                  {people.anonymous > 0 && (
                    <li className="flex items-center gap-3 border-b border-white/[0.05] py-2.5 text-sm text-mist">
                      <span className="w-6" />
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-night-750 text-fog" aria-hidden>
                        <User className="h-3.5 w-3.5" />
                      </span>
                      + {people.anonymous} joueur{people.anonymous > 1 ? "s" : ""} anonyme{people.anonymous > 1 ? "s" : ""}
                    </li>
                  )}
                </ol>
              )}
              <p className="mt-3 text-xs text-fog">Seuls les pseudos des joueurs confirmés ayant accepté d’apparaître sont affichés.</p>
            </Card>
          )}

          {/* ── Description & poster ── */}
          {(tm.description || tm.coverImageUrl || tm.rules) && (
            <Card title="Description" icon={Trophy}>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
                <div className="space-y-4">
                  {tm.description && <p className="whitespace-pre-line leading-relaxed text-ivory-dim">{tm.description}</p>}
                  {tm.rules && (
                    <div>
                      <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.16em] text-mist">{t.detail.rules}</h3>
                      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-mist">{tm.rules}</p>
                    </div>
                  )}
                  {booking.cancellationPolicy && (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-mist">
                      <strong className="text-ivory-dim">{t.booking.cancellation} : </strong>
                      {booking.cancellationPolicy}
                    </p>
                  )}
                  {booking.minimumAge > 0 && <p className="text-xs text-fog">{t.booking.ageNotice(booking.minimumAge)}</p>}
                </div>
                {tm.coverImageUrl && (
                  // Posters keep their full format (no cropping).
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={tm.coverImageUrl} alt={`Affiche du tournoi ${tm.name}`} loading="lazy" className="w-full rounded-xl border border-white/[0.08] object-contain" />
                )}
              </div>
            </Card>
          )}

          {/* ── Structure ── */}
          {(tm.levels.length > 0 || tm.blindStructure) && (
            <Card title="Structure" icon={Clock}>
              {tm.levels.length > 0 ? (
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full min-w-[28rem] font-mono text-sm tabular-nums">
                    <thead>
                      <tr className="text-[0.66rem] uppercase tracking-[0.16em] text-fog">
                        <th className="py-2 pr-3 text-left font-semibold">Niv.</th>
                        <th className="px-3 py-2 text-right font-semibold">SB</th>
                        <th className="px-3 py-2 text-right font-semibold">BB</th>
                        <th className="px-3 py-2 text-right font-semibold">Ante</th>
                        <th className="py-2 pl-3 text-right font-semibold">Durée</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tm.levels.map((l, i) => {
                        if (l.isBreak)
                          return (
                            <tr key={i} className="border-t border-white/[0.05] bg-gold-400/[0.06] text-gold-200">
                              <td className="py-2 pr-3 font-sans text-xs uppercase tracking-[0.16em]" colSpan={4}>
                                ☕ {l.label || "Pause"}
                              </td>
                              <td className="py-2 pl-3 text-right">{l.minutes}m</td>
                            </tr>
                          );
                        levelNo++;
                        return (
                          <tr key={i} className="border-t border-white/[0.05] text-ivory-dim">
                            <td className="py-2 pr-3 text-ivory">{levelNo}</td>
                            <td className="px-3 py-2 text-right">{formatNumber(l.sb)}</td>
                            <td className="px-3 py-2 text-right">{formatNumber(l.bb)}</td>
                            <td className="px-3 py-2 text-right">{l.ante ? formatNumber(l.ante) : "—"}</td>
                            <td className="py-2 pl-3 text-right text-gold-300">{l.minutes}m</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ivory-dim">{tm.blindStructure}</pre>
              )}
            </Card>
          )}

          {/* ── Other tournaments ── */}
          {otherList.length > 0 && (
            <div className="pt-6">
              <h2 className="mb-5 flex items-center gap-2 text-3xl text-ivory">
                <Globe className="h-5 w-5 text-gold-400" aria-hidden /> Autres tournois du club
              </h2>
              <DayBoard tournaments={otherList} />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
