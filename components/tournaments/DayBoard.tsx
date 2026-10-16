import Link from "next/link";
import { Clock, Trophy, Users } from "lucide-react";
import type { TournamentWithAvailability } from "@/lib/tournaments";
import { formatDateLong, formatEntry, formatStack, formatTime, zonedDateKey } from "@/lib/format";
import { entryType, isBounty } from "@/lib/tournament-meta";
import { levelDurationLabel } from "@/lib/levels";
import { t } from "@/lib/i18n";
import { BookButton } from "./TournamentCard";
import { StatusBadge } from "./StatusBadge";

function dayTitle(key: string, sample: Date) {
  const today = zonedDateKey(new Date());
  const tomorrow = zonedDateKey(new Date(Date.now() + 24 * 3600 * 1000));
  if (key === today) return "Aujourd’hui";
  if (key === tomorrow) return "Demain";
  return formatDateLong(sample).replace(/ \d{4}$/, "").replace(",", "");
}

function TypeBadges({ tm }: { tm: TournamentWithAvailability }) {
  const type = entryType(tm);
  const badge = "inline-flex h-6 min-w-6 items-center justify-center rounded-md border px-1.5 text-[0.66rem] font-bold tracking-wide";
  return (
    <span className="flex flex-wrap items-center gap-1">
      {type === "reentry" && (
        <span className={`${badge} border-danger/50 text-danger`} title={tm.reentryCount ? `${tm.reentryCount} re-entry autorisée(s)` : "Re-entry"}>
          {tm.reentryCount ? `${tm.reentryCount}R` : "R"}
          <span className="sr-only"> re-entry</span>
        </span>
      )}
      {type === "freezeout" && (
        <span className={`${badge} border-white/25 text-ivory-dim`} title="Freezeout : une seule entrée">
          FO<span className="sr-only"> freezeout</span>
        </span>
      )}
      {isBounty(tm) && (
        <span className={`${badge} border-info/50 text-info`} title="Bounty">
          B<span className="sr-only">ounty</span>
        </span>
      )}
      {(tm.guaranteeCents || /champ/i.test(tm.format)) && (
        <span className={`${badge} border-gold-400/60 text-gold-300`} title={tm.guaranteeCents ? "Prix garanti" : "Championnat"}>
          <Trophy className="h-3 w-3" aria-hidden />
          <span className="sr-only">{tm.guaranteeCents ? "Prix garanti" : "Championnat"}</span>
        </span>
      )}
    </span>
  );
}

function Players({ tm }: { tm: TournamentWithAvailability }) {
  const a = tm.availability;
  if (tm.externalBookingUrl) return <span className="text-xs text-info">{t.detail.externalBadge}</span>;
  const pct = Math.min(100, Math.round(a.fillRatio * 100));
  const color = pct >= 100 ? "bg-danger" : pct >= 85 ? "bg-[#f08a3c]" : pct >= 50 ? "bg-warn" : "bg-ok";
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <span className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-white/10 lg:w-12" aria-hidden>
        <span className={`block h-full rounded-full ${color}`} style={{ width: `${Math.max(pct, 3)}%` }} />
      </span>
      <span className="font-mono text-sm tabular-nums text-ivory-dim">
        {a.taken} / {a.capacity}
      </span>
      <Users className="h-3.5 w-3.5 text-fog" aria-hidden />
      <span className="sr-only">inscrits</span>
    </span>
  );
}

/** Day-grouped tournament board (familiar layout for players used to Swiss poker listings). */
export function DayBoard({ tournaments }: { tournaments: TournamentWithAvailability[] }) {
  const groups = new Map<string, TournamentWithAvailability[]>();
  for (const tm of tournaments) {
    const k = zonedDateKey(tm.startsAt);
    groups.set(k, [...(groups.get(k) ?? []), tm]);
  }
  const head = "px-4 py-3 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-fog";

  return (
    <div className="space-y-10">
      {Array.from(groups.entries()).map(([key, list]) => (
        <section key={key} aria-labelledby={`jour-${key}`}>
          <div className="mb-3 flex items-center gap-4">
            <h2 id={`jour-${key}`} className="font-display text-3xl text-gold-300 first-letter:uppercase">
              {dayTitle(key, list[0].startsAt)}
            </h2>
            <span className="rule-gold h-px flex-1" aria-hidden />
            <span className="text-xs text-fog">{list.length === 1 ? "1 tournoi" : `${list.length} tournois`}</span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-night-850/80">
            <div className="hidden grid-cols-[7.5rem_minmax(0,1fr)_6.5rem_5.5rem_8rem_11rem_11.5rem] items-center border-b border-white/[0.08] bg-night-950/70 lg:grid" aria-hidden>
              <span className={head}>Heure</span>
              <span className={head}>Tournoi</span>
              <span className={head}>Type</span>
              <span className={`${head} text-center`}>Tapis</span>
              <span className={`${head} text-right`}>Buy-in</span>
              <span className={head}>Joueurs</span>
              <span className={`${head} text-right`}>Inscription</span>
            </div>
            <ul className="divide-y divide-white/[0.06]">
              {list.map((tm) => (
                <li
                  key={tm.id}
                  className="group relative grid grid-cols-[1fr_auto] gap-x-4 gap-y-3 p-4 transition-colors hover:bg-white/[0.025] lg:grid-cols-[7rem_minmax(0,1fr)_5rem_5.5rem_7.5rem_9.5rem_13rem] lg:items-center lg:gap-0 lg:p-0"
                >
                  {/* Time + late reg */}
                  <div className="order-1 lg:px-4 lg:py-4">
                    <p className="font-mono text-lg font-semibold tabular-nums text-ivory">{formatTime(tm.startsAt)}</p>
                    {tm.lateRegistration && <p className="line-clamp-2 text-[0.7rem] leading-tight text-fog" title={tm.lateRegistration}>Late reg : {tm.lateRegistration}</p>}
                  </div>

                  {/* Name */}
                  <div className="order-3 col-span-2 min-w-0 lg:order-2 lg:col-span-1 lg:px-4">
                    <h3 className="text-xl leading-tight text-ivory">
                      <Link href={`/tournois/${tm.slug}`} className="after:absolute after:inset-0 after:content-[''] hover:text-gold-300 focus-visible:outline-none">
                        {tm.name}
                      </Link>
                    </h3>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-mist">
                      <span className="uppercase tracking-[0.12em] text-gold-400/90">{tm.format}</span>
                      <span>· {tm.gameVariant}</span>
                      {tm.featured && <span className="text-gold-300">★ À la une</span>}
                    </p>
                    {!tm.externalBookingUrl && tm.availability.state !== "open" && (
                      <StatusBadge state={tm.availability.state} className="mt-2 !py-0.5 !text-[0.6rem]" />
                    )}
                  </div>

                  {/* Type */}
                  <div className="order-2 justify-self-end lg:order-3 lg:justify-self-auto lg:px-4">
                    <TypeBadges tm={tm} />
                  </div>

                  {/* Stack / levels */}
                  <div className="order-4 text-sm lg:px-4 lg:text-center">
                    {tm.startingStack ? <p className="font-mono font-semibold text-ivory-dim">{formatStack(tm.startingStack)}</p> : <p className="text-fog">—</p>}
                    {levelDurationLabel(tm.levels, tm.blindLevelMinutes) ? (
                      <p className="flex items-center gap-1 text-xs text-fog lg:justify-center">
                        <Clock className="h-3 w-3" aria-hidden />
                        {levelDurationLabel(tm.levels, tm.blindLevelMinutes)} min
                      </p>
                    ) : null}
                  </div>

                  {/* Buy-in */}
                  <div className="order-5 text-right font-mono text-base font-semibold tabular-nums text-ivory lg:px-4">{formatEntry(tm).replace(/^CHF /, "")}</div>

                  {/* Players */}
                  <div className="order-6 lg:px-4">
                    <Players tm={tm} />
                  </div>

                  {/* CTA */}
                  <div className="relative z-10 order-7 flex justify-end lg:px-4">
                    <BookButton tournament={tm} compact className="w-full lg:w-auto" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-mist" aria-label="Légende">
        <li className="flex items-center gap-2">
          <span className="rounded-md border border-danger/50 px-1.5 text-[0.66rem] font-bold text-danger">2R</span> Re-entries autorisées
        </li>
        <li className="flex items-center gap-2">
          <span className="rounded-md border border-white/25 px-1.5 text-[0.66rem] font-bold text-ivory-dim">FO</span> Freezeout
        </li>
        <li className="flex items-center gap-2">
          <span className="rounded-md border border-info/50 px-1.5 text-[0.66rem] font-bold text-info">B</span> Bounty
        </li>
        <li className="flex items-center gap-2">
          <Trophy className="h-3.5 w-3.5 text-gold-300" aria-hidden /> Prix garanti / championnat
        </li>
        <li>Buy-in : prix d’entrée + bounty + frais (CHF)</li>
      </ul>
    </div>
  );
}
