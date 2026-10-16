import type { Metadata } from "next";
import Link from "next/link";
import { Medal, Search, Trophy } from "lucide-react";
import { listPublishedResults } from "@/lib/results";
import { formatDateShort, formatMoney, formatTime } from "@/lib/format";
import { entryType } from "@/lib/tournament-meta";
import { PageHero } from "@/components/site/Section";
import { ShareButtons } from "@/components/tournaments/ShareButtons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Résultats",
  description: "Classements et gains des derniers tournois de poker du Léman Poker & Casino.",
  alternates: { canonical: "/resultats" },
};

const MEDAL = ["text-gold-300", "text-[#c9ccd3]", "text-[#c98a5a]"];

export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 80);
  const { items, page, pages } = await listPublishedResults({ q, page: Number(sp.page) || 1 });

  return (
    <>
      <PageHero eyebrow="Classements" title="Résultats" lead="Les classements et gains des tournois disputés au club, publiés par notre équipe après chaque événement." />
      <section className="py-10 lg:py-14">
        <div className="container-x">
          <form method="get" role="search" className="mb-8 flex max-w-lg gap-2">
            <label htmlFor="rq" className="sr-only">
              Rechercher un tournoi
            </label>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fog" aria-hidden />
              <input id="rq" name="q" type="search" defaultValue={q} placeholder="Rechercher un tournoi" className="field !pl-9" />
            </div>
            <button type="submit" className="btn btn-gold btn-sm h-[2.85rem]">
              Rechercher
            </button>
          </form>

          {items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/15 p-12 text-center text-mist">
              {q ? "Aucun résultat pour cette recherche." : "Aucun classement publié pour le moment."}
            </p>
          ) : (
            <ul className="grid gap-5 lg:grid-cols-2">
              {items.map((tm) => {
                const type = entryType(tm);
                const buyIn = (tm.buyInCents ?? 0) + (tm.bountyCents ?? 0) + (tm.feeCents ?? 0);
                return (
                  <li key={tm.id} className="flex flex-col rounded-2xl border border-white/[0.08] bg-night-850">
                    <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] p-5">
                      <div className="min-w-0">
                        <h2 className="text-2xl leading-tight text-ivory">
                          <Link href={`/tournois/${tm.slug}`} className="hover:text-gold-300">
                            {tm.name}
                          </Link>
                        </h2>
                        <p className="mt-1 font-mono text-sm text-mist">
                          {formatDateShort(tm.startsAt)} · {formatTime(tm.startsAt)}
                        </p>
                      </div>
                      <Trophy className="h-6 w-6 shrink-0 text-gold-400" aria-hidden />
                    </div>
                    <dl className="grid grid-cols-3 border-b border-white/[0.06] text-center">
                      <div className="p-3">
                        <dt className="text-[0.62rem] uppercase tracking-[0.16em] text-fog">Buy-in</dt>
                        <dd className="font-mono text-sm text-ivory">{buyIn ? formatMoney(buyIn, tm.currency) : "—"}</dd>
                      </div>
                      <div className="border-x border-white/[0.06] p-3">
                        <dt className="text-[0.62rem] uppercase tracking-[0.16em] text-fog">Type</dt>
                        <dd className="font-mono text-sm text-ivory">{type === "reentry" ? (tm.reentryCount ? `${tm.reentryCount}R` : "Re-entry") : type === "freezeout" ? "FO" : tm.format}</dd>
                      </div>
                      <div className="p-3">
                        <dt className="text-[0.62rem] uppercase tracking-[0.16em] text-fog">Entries</dt>
                        <dd className="font-mono text-sm text-ivory">{tm.entriesCount ?? "—"}</dd>
                      </div>
                    </dl>
                    <ol className="flex-1 divide-y divide-white/[0.05] px-5 py-2">
                      {tm.results.map((r) => (
                        <li key={r.id} className="flex items-center gap-3 py-2.5">
                          <span className={`w-7 text-right font-mono text-sm font-semibold ${MEDAL[r.rank - 1] ?? "text-fog"}`}>
                            {r.rank <= 3 ? <Medal className="ml-auto h-4 w-4" aria-label={`${r.rank}e`} /> : r.rank}
                          </span>
                          <span className={`min-w-0 flex-1 truncate ${r.displayName ? "text-ivory" : "italic text-fog"}`}>{r.displayName || "Anonyme"}</span>
                          {r.deal && <span className="rounded border border-info/40 px-1.5 text-[0.62rem] uppercase tracking-[0.12em] text-info">deal</span>}
                          <span className="font-mono text-sm tabular-nums text-gold-200">{r.prizeCents != null ? formatMoney(r.prizeCents, tm.currency) : ""}</span>
                        </li>
                      ))}
                    </ol>
                    <div className="border-t border-white/[0.06] px-5 py-3">
                      <ShareButtons path={`/resultats?q=${encodeURIComponent(tm.name)}`} title={`Résultats — ${tm.name}`} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {pages > 1 && (
            <nav className="mt-8 flex justify-between text-sm" aria-label="Pagination">
              {page > 1 ? (
                <Link className="btn btn-outline btn-sm" href={`/resultats?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page - 1) })}`}>
                  Plus récents
                </Link>
              ) : (
                <span />
              )}
              {page < pages && (
                <Link className="btn btn-outline btn-sm" href={`/resultats?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page + 1) })}`}>
                  Plus anciens
                </Link>
              )}
            </nav>
          )}
        </div>
      </section>
    </>
  );
}
