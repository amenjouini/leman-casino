import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TournamentWithAvailability } from "@/lib/tournaments";
import { formatDateLong, formatTime, zonedDateKey } from "@/lib/format";
import { t } from "@/lib/i18n";
import { StatusBadge } from "./StatusBadge";

const DOT: Record<string, string> = {
  open: "bg-ok",
  almost_full: "bg-warn",
  waitlist: "bg-danger",
  full: "bg-danger",
  not_yet_open: "bg-info",
  closed: "bg-fog",
  finished: "bg-fog",
};

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function MonthCalendar({
  month,
  currentMonth,
  tournaments,
  linkFor,
}: {
  month: string; // YYYY-MM
  currentMonth: string;
  tournaments: TournamentWithAvailability[];
  linkFor: (month: string) => string;
}) {
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const todayKey = zonedDateKey(new Date());

  const byDay = new Map<string, TournamentWithAvailability[]>();
  for (const tm of tournaments) {
    const key = zonedDateKey(tm.startsAt);
    if (!key.startsWith(month)) continue;
    byDay.set(key, [...(byDay.get(key) ?? []), tm]);
  }
  const cells = Array.from({ length: Math.ceil((offset + daysInMonth) / 7) * 7 }, (_, i) => {
    const day = i - offset + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });
  const keyOf = (day: number) => `${month}-${String(day).padStart(2, "0")}`;
  const daysWithEvents = Array.from(byDay.keys()).sort();
  const canGoBack = month > currentMonth;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="font-display text-3xl capitalize text-ivory sm:text-4xl">
          {MONTHS[m - 1]} {y}
        </h2>
        <div className="flex gap-2">
          {canGoBack ? (
            <Link href={linkFor(shiftMonth(month, -1))} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 hover:border-gold-400" aria-label={t.calendar.prevMonth}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
          ) : (
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.06] text-fog" aria-hidden>
              <ChevronLeft className="h-5 w-5" />
            </span>
          )}
          <Link href={linkFor(shiftMonth(month, 1))} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 hover:border-gold-400" aria-label={t.calendar.nextMonth}>
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Desktop grid */}
      <div className="hidden overflow-hidden rounded-2xl border border-white/[0.08] md:block">
        <div className="grid grid-cols-7 border-b border-white/[0.08] bg-night-950">
          {t.calendar.weekdays.map((d) => (
            <div key={d} className="px-3 py-3 text-center text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-mist">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            const key = day ? keyOf(day) : null;
            const events = key ? byDay.get(key) ?? [] : [];
            const isToday = key === todayKey;
            return (
              <div key={i} className={`min-h-32 border-b border-r border-white/[0.06] p-2 [&:nth-child(7n)]:border-r-0 ${day ? "bg-night-850/70" : "bg-night-950/60"}`}>
                {day && (
                  <>
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${isToday ? "bg-gold-400 font-semibold text-night-950" : events.length ? "text-ivory" : "text-fog"}`}>{day}</span>
                    <ul className="mt-1 space-y-1">
                      {events.map((tm) => (
                        <li key={tm.id}>
                          <Link
                            href={`/tournois/${tm.slug}`}
                            className="block rounded-lg border border-white/[0.06] bg-night-750/80 px-2 py-1.5 text-xs leading-snug transition-colors hover:border-gold-500/50"
                            title={`${tm.name} — ${t.status[tm.availability.state]}`}
                          >
                            <span className="flex items-center gap-1.5 text-mist">
                              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[tm.availability.state]}`} aria-hidden />
                              {formatTime(tm.startsAt)}
                            </span>
                            <span className="mt-0.5 line-clamp-2 font-medium text-ivory">{tm.name}</span>
                            <span className="sr-only">{t.status[tm.availability.state]}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile agenda */}
      <div className="md:hidden">
        {daysWithEvents.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-mist">{t.calendar.empty}</p>
        ) : (
          <ol className="space-y-6">
            {daysWithEvents.map((key) => {
              const events = byDay.get(key)!;
              return (
                <li key={key}>
                  <h3 className="mb-2 font-sans text-sm font-semibold capitalize text-gold-300">{formatDateLong(events[0].startsAt)}</h3>
                  <ul className="space-y-2">
                    {events.map((tm) => (
                      <li key={tm.id}>
                        <Link href={`/tournois/${tm.slug}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-night-850 p-4">
                          <span className="min-w-0">
                            <span className="block text-xs text-mist">
                              {formatTime(tm.startsAt)} · {tm.format}
                            </span>
                            <span className="block truncate font-display text-xl text-ivory">{tm.name}</span>
                          </span>
                          <StatusBadge state={tm.availability.state} className="shrink-0 !px-2 !text-[0.6rem]" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-mist" aria-label="Légende">
        {(["open", "almost_full", "waitlist", "not_yet_open", "closed"] as const).map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${DOT[s]}`} aria-hidden />
            {t.status[s]}
          </li>
        ))}
      </ul>
    </div>
  );
}
