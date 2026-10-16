import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, List, Search, X } from "lucide-react";
import { listPublicFormats, listPublicTournaments } from "@/lib/tournaments";
import { zonedDateKey } from "@/lib/format";
import { t } from "@/lib/i18n";
import { PageHero } from "@/components/site/Section";
import { DayBoard } from "@/components/tournaments/DayBoard";
import { MonthCalendar } from "@/components/tournaments/MonthCalendar";
import { TournamentFilters, type FilterValues } from "@/components/tournaments/TournamentFilters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: t.calendar.title,
  description: "Calendrier des tournois de poker du Léman Poker & Casino à Lausanne : dates, formats, buy-in, tapis de départ et places disponibles.",
  alternates: { canonical: "/tournois" },
};

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => ((Array.isArray(v) ? v[0] : v) ?? "").slice(0, 80);
const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const nonNeg = (v: string) => (/^\d{1,7}$/.test(v) ? Number(v) : undefined);

export default async function TournamentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = one(sp.q);
  const format = one(sp.format);
  const from = isDate(one(sp.du)) ? one(sp.du) : "";
  const to = isDate(one(sp.au)) ? one(sp.au) : "";
  const onlyAvailable = one(sp.dispo) === "1";
  const type = one(sp.type) === "reentry" || one(sp.type) === "freezeout" ? (one(sp.type) as "reentry" | "freezeout") : undefined;
  const bmin = nonNeg(one(sp.bmin));
  const bmax = nonNeg(one(sp.bmax));
  const jmin = nonNeg(one(sp.jmin));
  const jmax = nonNeg(one(sp.jmax));
  const view = one(sp.vue) === "calendrier" ? "calendrier" : "liste";
  const currentMonth = zonedDateKey(new Date()).slice(0, 7);
  const month = /^\d{4}-\d{2}$/.test(one(sp.mois)) && one(sp.mois) >= currentMonth ? one(sp.mois) : currentMonth;

  const [formats, list] = await Promise.all([
    listPublicFormats(),
    listPublicTournaments({
      q,
      format: format || undefined,
      from: view === "liste" ? from || undefined : undefined,
      to: view === "liste" ? to || undefined : undefined,
      availability: onlyAvailable ? "available" : "all",
      type,
      buyInMin: bmin != null ? bmin * 100 : undefined,
      buyInMax: bmax != null ? bmax * 100 : undefined,
      playersMin: jmin,
      playersMax: jmax,
    }),
  ]);

  const current: Record<string, string> = {
    q,
    format,
    du: from,
    au: to,
    dispo: onlyAvailable ? "1" : "",
    type: type ?? "",
    bmin: bmin != null ? String(bmin) : "",
    bmax: bmax != null ? String(bmax) : "",
    jmin: jmin != null ? String(jmin) : "",
    jmax: jmax != null ? String(jmax) : "",
    vue: view === "calendrier" ? "calendrier" : "",
    mois: view === "calendrier" ? month : "",
  };
  const href = (overrides: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...current, ...overrides })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/tournois?${s}` : "/tournois";
  };

  // Active filter chips (each removable).
  const chips: { label: string; remove: Record<string, string> }[] = [];
  if (type) chips.push({ label: type === "reentry" ? "Re-entry" : "Freezeout", remove: { type: "" } });
  if (bmin != null || bmax != null) chips.push({ label: `Buy-in ${bmin ?? 0}–${bmax ?? "∞"} CHF`, remove: { bmin: "", bmax: "" } });
  if (jmin != null || jmax != null) chips.push({ label: `Joueurs ${jmin ?? 0}–${jmax ?? "∞"}`, remove: { jmin: "", jmax: "" } });
  if (format) chips.push({ label: format, remove: { format: "" } });
  if (view === "liste" && (from || to)) chips.push({ label: `Dates ${from || "…"} → ${to || "…"}`, remove: { du: "", au: "" } });
  if (onlyAvailable) chips.push({ label: "Places disponibles", remove: { dispo: "" } });
  const hasFilters = chips.length > 0 || !!q;
  const filterValues: FilterValues = { ...current };

  return (
    <>
      <PageHero eyebrow={t.nav.calendar} title={t.calendar.title} lead={t.calendar.lead} />

      <section className="py-10 lg:py-14">
        <div className="container-x">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <form method="get" action="/tournois" role="search" className="flex flex-1 gap-2 md:max-w-xl">
              {Object.entries(current)
                .filter(([k, v]) => k !== "q" && v)
                .map(([k, v]) => (
                  <input key={k} type="hidden" name={k} value={v} />
                ))}
              <label htmlFor="q" className="sr-only">
                {t.calendar.search}
              </label>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fog" aria-hidden />
                <input id="q" name="q" type="search" defaultValue={q} placeholder={t.calendar.searchPlaceholder} className="field !pl-9" maxLength={80} />
              </div>
              <button type="submit" className="btn btn-gold btn-sm h-[2.85rem]" aria-label={t.calendar.search}>
                <Search className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Rechercher</span>
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-2">
              <TournamentFilters formats={formats} values={filterValues} activeCount={chips.length} />
              <div className="inline-flex rounded-full border border-white/10 p-1" role="group" aria-label="Mode d'affichage">
                <Link
                  href={href({ vue: "", mois: "" })}
                  aria-current={view === "liste" ? "page" : undefined}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${view === "liste" ? "bg-gold-400 text-night-950" : "text-ivory-dim hover:text-ivory"}`}
                >
                  <List className="h-3.5 w-3.5" aria-hidden />
                  {t.calendar.listView}
                </Link>
                <Link
                  href={href({ vue: "calendrier", du: "", au: "", mois: month })}
                  aria-current={view === "calendrier" ? "page" : undefined}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${view === "calendrier" ? "bg-gold-400 text-night-950" : "text-ivory-dim hover:text-ivory"}`}
                >
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                  {t.calendar.calendarView}
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-5 flex min-h-8 flex-wrap items-center gap-2" aria-live="polite">
            {view === "liste" && <span className="mr-2 text-sm text-mist">{t.calendar.results(list.length)}</span>}
            {chips.map((c) => (
              <Link key={c.label} href={href(c.remove)} className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/40 bg-gold-400/10 px-3 py-1 text-xs text-gold-200 hover:border-gold-300">
                {c.label}
                <X className="h-3 w-3" aria-label="Retirer ce filtre" />
              </Link>
            ))}
            {hasFilters && (
              <Link href={view === "calendrier" ? `/tournois?vue=calendrier&mois=${month}` : "/tournois"} className="ml-1 text-xs text-mist underline-offset-2 hover:text-gold-300 hover:underline">
                {t.calendar.reset}
              </Link>
            )}
          </div>

          <div className="mt-8">
            {view === "calendrier" ? (
              <MonthCalendar month={month} currentMonth={currentMonth} tournaments={list} linkFor={(mo) => href({ mois: mo })} />
            ) : list.length ? (
              <DayBoard tournaments={list} />
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center">
                <p className="text-mist">{hasFilters ? t.calendar.empty : t.calendar.emptyAll}</p>
                {hasFilters && (
                  <Link href="/tournois" className="btn btn-outline btn-sm mt-5">
                    {t.calendar.reset}
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
