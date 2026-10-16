import Link from "next/link";
import { ArrowUpRight, Clock, Layers, Trophy } from "lucide-react";
import type { TournamentWithAvailability } from "@/lib/tournaments";
import { formatEntry, formatDayNumber, formatMoney, formatMonthShort, formatNumber, formatTime, formatWeekday } from "@/lib/format";
import { t } from "@/lib/i18n";
import { CapacityBar, StatusBadge } from "./StatusBadge";

export function DateBlock({ date, size = "md" }: { date: Date; size?: "md" | "lg" }) {
  return (
    <div className={`flex shrink-0 flex-col items-center justify-center rounded-xl border border-gold-500/25 bg-night-950/60 text-center ${size === "lg" ? "h-24 w-20" : "h-[4.75rem] w-16"}`}>
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-gold-400">{formatWeekday(date).replace(".", "")}</span>
      <span className={`font-display leading-none text-ivory ${size === "lg" ? "text-[2.6rem]" : "text-[2.1rem]"}`}>{formatDayNumber(date)}</span>
      <span className="text-[0.65rem] uppercase tracking-[0.14em] text-mist">{formatMonthShort(date).replace(".", "")}</span>
    </div>
  );
}

export function BookButton({ tournament, className = "", compact = false }: { tournament: TournamentWithAvailability; className?: string; compact?: boolean }) {
  const a = tournament.availability;
  if (tournament.externalBookingUrl && a.state !== "finished" && a.state !== "closed") {
    return (
      <a href={tournament.externalBookingUrl} target="_blank" rel="noopener noreferrer" className={`btn btn-gold btn-sm ${className}`}>
        {t.cta.external}
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only">(nouvel onglet)</span>
      </a>
    );
  }
  if (!a.canRequest) {
    return (
      <Link href={`/tournois/${tournament.slug}`} className={`btn btn-outline btn-sm ${className}`}>
        {t.common.details}
      </Link>
    );
  }
  return (
    <Link href={`/tournois/${tournament.slug}/reserver`} className={`btn btn-gold btn-sm ${className}`}>
      {a.waitlistOnly ? (compact ? "Liste d’attente" : t.cta.joinWaitlist) : compact ? "Réserver" : t.cta.book}
    </Link>
  );
}

export function TournamentCard({ tournament: tm }: { tournament: TournamentWithAvailability }) {
  const a = tm.availability;
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-white/[0.08] bg-gradient-to-b from-night-800 to-night-850 p-5 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-gold-500/40 sm:p-6">
      {tm.featured && (
        <span className="absolute -top-2.5 left-6 rounded-full bg-gold-400 px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-night-950">À la une</span>
      )}
      <div className="flex items-start gap-4">
        <DateBlock date={tm.startsAt} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs text-mist">
            <Clock className="h-3.5 w-3.5 text-gold-500" aria-hidden />
            {formatTime(tm.startsAt)}
            {tm.venue && <span className="truncate">· {tm.venue}</span>}
          </p>
          <h3 className="mt-1.5 font-display text-[1.6rem] leading-tight text-ivory">
            <Link href={`/tournois/${tm.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
              {tm.name}
            </Link>
          </h3>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-gold-400/90">
            {tm.format} · {tm.gameVariant}
          </p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-white/[0.06] py-4 text-sm">
        <div>
          <dt className="text-[0.68rem] uppercase tracking-[0.14em] text-fog">{t.common.buyIn}</dt>
          <dd className="mt-0.5 font-semibold text-ivory">{formatEntry(tm)}</dd>
        </div>
        {tm.startingStack ? (
          <div>
            <dt className="flex items-center gap-1 text-[0.68rem] uppercase tracking-[0.14em] text-fog">
              <Layers className="h-3 w-3" aria-hidden />
              {t.common.startingStack}
            </dt>
            <dd className="mt-0.5 font-semibold text-ivory">{formatNumber(tm.startingStack)}</dd>
          </div>
        ) : null}
        {tm.guaranteeCents ? (
          <div>
            <dt className="flex items-center gap-1 text-[0.68rem] uppercase tracking-[0.14em] text-fog">
              <Trophy className="h-3 w-3" aria-hidden />
              {t.common.guarantee}
            </dt>
            <dd className="mt-0.5 font-semibold text-gold-300">{formatMoney(tm.guaranteeCents, tm.currency)}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-4 space-y-4">
        {tm.externalBookingUrl ? (
          <p className="text-xs uppercase tracking-[0.14em] text-info">{t.detail.externalBadge}</p>
        ) : (
          <>
            <StatusBadge state={a.state} />
            <CapacityBar taken={a.taken} capacity={a.capacity} state={a.state} />
          </>
        )}
      </div>

      <div className="relative z-10 mt-auto flex items-center justify-between gap-3 pt-5">
        <Link href={`/tournois/${tm.slug}`} className="inline-flex items-center gap-1 text-sm font-medium text-ivory-dim transition-colors hover:text-gold-300">
          {t.common.details}
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
        <BookButton tournament={tm} />
      </div>
    </article>
  );
}
