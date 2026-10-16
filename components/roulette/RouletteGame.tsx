"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Coins, Crown, Repeat, RotateCcw, Trash2, Undo2, Volume2, VolumeX, X } from "lucide-react";
import { t } from "@/lib/i18n";
import { POCKET_ANGLE, describe, neighbours, pocketCenterAngle, pocketColor, randomPocket, type PocketColor } from "@/lib/roulette";
import { KIND_LABELS, PAYOUT, SPOT_BY_ID, settle, totalStake, type Bets, type Settlement } from "@/lib/roulette-bets";
import { GEOMETRY, planSpin, restTime, sampleSpin, type SpinPlan, type SpinSample } from "./physics";
import { RouletteSound } from "./sound";
import { Wheel } from "./Wheel";
import { BettingTable } from "./BettingTable";
import { DENOMINATIONS, Token, compactAmount, type Denomination } from "./Token";

const STORE_KEY = "leman-roulette-v2";
const HISTORY_KEY = "leman-roulette-history";
const HISTORY_MAX = 15;
const START_BALANCE = 1000;
const SETTLE_DELAY = 2600;
const GOALS = [
  { at: 2500, name: "Bronze" },
  { at: 5000, name: "Argent" },
  { at: 10000, name: "Or" },
  { at: 25000, name: "Diamant" },
];

const CHIP: Record<PocketColor, string> = {
  red: "bg-roulette-red text-ivory",
  black: "bg-roulette-black text-ivory ring-1 ring-white/15",
  green: "bg-roulette-green text-ivory",
};

type Phase = "betting" | "spinning" | "settling";
type Stats = { balance: number; best: number; biggestWin: number; spins: number };
const fmt = (n: number) => new Intl.NumberFormat("fr-CH").format(n);

function useIsNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return narrow;
}

export function RouletteGame() {
  const wheelRef = useRef<SVGGElement>(null);
  const ballRef = useRef<SVGGElement>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const wheelAngleRef = useRef(0);
  const soundRef = useRef<RouletteSound | null>(null);
  const soundOnRef = useRef(false);
  const narrow = useIsNarrow();

  const [phase, setPhase] = useState<Phase>("betting");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [soundOn, setSoundOn] = useState(false);
  const [stats, setStats] = useState<Stats>({ balance: START_BALANCE, best: START_BALANCE, biggestWin: 0, spins: 0 });
  const [loaded, setLoaded] = useState(false);
  const [bets, setBets] = useState<Bets>({});
  const [undoStack, setUndoStack] = useState<{ id: string; amount: number }[]>([]);
  const [lastBets, setLastBets] = useState<Bets>({});
  const [chip, setChip] = useState<Denomination>(5);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [shake, setShake] = useState(0);

  const stake = totalStake(bets);
  const winners = useMemo(() => new Set(settlement?.winners.map((w) => w.id) ?? []), [settlement]);

  /* ── Persistence (per-visitor convenience; tokens have no value) ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as Partial<Stats>;
        const ok = (n: unknown, min = 0) => typeof n === "number" && Number.isFinite(n) && n >= min && n < 1e12;
        setStats({
          balance: ok(s.balance) ? Math.floor(s.balance!) : START_BALANCE,
          best: ok(s.best) ? Math.floor(s.best!) : START_BALANCE,
          biggestWin: ok(s.biggestWin) ? Math.floor(s.biggestWin!) : 0,
          spins: ok(s.spins) ? Math.floor(s.spins!) : 0,
        });
      }
      const h = JSON.parse(sessionStorage.getItem(HISTORY_KEY) ?? "[]") as unknown;
      if (Array.isArray(h)) setHistory(h.filter((n): n is number => Number.isInteger(n) && n >= 0 && n <= 36).slice(0, HISTORY_MAX));
    } catch {
      /* storage unavailable */
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      // Tokens on the table are counted back so a reload never loses them.
      localStorage.setItem(STORE_KEY, JSON.stringify({ ...stats, balance: stats.balance + (phase === "betting" ? stake : 0) }));
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      /* storage unavailable */
    }
  }, [stats, history, loaded, stake, phase]);

  /* ── Wheel rendering ── */
  const apply = useCallback((s: Pick<SpinSample, "wheelAngle" | "ballAngle" | "ballRadius">) => {
    wheelAngleRef.current = s.wheelAngle;
    wheelRef.current?.setAttribute("transform", `rotate(${s.wheelAngle.toFixed(3)} ${GEOMETRY.center} ${GEOMETRY.center})`);
    const a = (s.ballAngle * Math.PI) / 180;
    ballRef.current?.setAttribute(
      "transform",
      `translate(${(GEOMETRY.center + s.ballRadius * Math.sin(a)).toFixed(2)} ${(GEOMETRY.center - s.ballRadius * Math.cos(a)).toFixed(2)})`,
    );
  }, []);

  useEffect(() => {
    apply({ wheelAngle: 0, ballAngle: pocketCenterAngle(0), ballRadius: GEOMETRY.pocketRadius });
    soundRef.current = new RouletteSound();
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      soundRef.current?.dispose();
    };
  }, [apply]);

  const flash = (message: string) => {
    setNotice(message);
    setShake((n) => n + 1);
  };

  /* ── Betting ── */
  const place = useCallback(
    (id: string, remove: boolean) => {
      if (phase !== "betting") return;
      setNotice(null);
      setSettlement(null);
      setResult((r) => (r === null ? r : null));
      if (remove) {
        const amount = bets[id] ?? 0;
        if (!amount) return;
        setBets(({ [id]: _removed, ...rest }) => (void _removed, rest));
        setStats((s) => ({ ...s, balance: s.balance + amount }));
        setUndoStack((u) => u.filter((x) => x.id !== id));
        return;
      }
      if (stats.balance < chip) {
        flash(stats.balance + stake === 0 ? "Plus de jetons : rechargez votre cave gratuitement." : `Il vous reste ${fmt(stats.balance)} jeton(s) : choisissez un jeton plus petit.`);
        return;
      }
      setBets((b) => ({ ...b, [id]: (b[id] ?? 0) + chip }));
      setStats((s) => ({ ...s, balance: s.balance - chip }));
      setUndoStack((u) => [...u, { id, amount: chip }]);
      if (soundOnRef.current) soundRef.current?.click(0.25, 1400);
    },
    [phase, bets, stats.balance, chip, stake],
  );

  const undo = () => {
    const last = undoStack[undoStack.length - 1];
    if (!last || phase !== "betting") return;
    setUndoStack((u) => u.slice(0, -1));
    setBets((b) => {
      const left = (b[last.id] ?? 0) - last.amount;
      const { [last.id]: _old, ...rest } = b;
      void _old;
      return left > 0 ? { ...rest, [last.id]: left } : rest;
    });
    setStats((s) => ({ ...s, balance: s.balance + last.amount }));
  };

  const clear = () => {
    if (phase !== "betting" || !stake) return;
    setStats((s) => ({ ...s, balance: s.balance + stake }));
    setBets({});
    setUndoStack([]);
  };

  const rebet = () => {
    const need = totalStake(lastBets);
    if (phase !== "betting" || !need) return;
    if (need > stats.balance + stake) return flash("Pas assez de jetons pour rejouer la même mise.");
    setStats((s) => ({ ...s, balance: s.balance + stake - need }));
    setBets({ ...lastBets });
    setUndoStack(Object.entries(lastBets).map(([id, amount]) => ({ id, amount })));
    setSettlement(null);
    setResult(null);
  };

  const double = () => {
    if (phase !== "betting" || !stake) return;
    if (stake > stats.balance) return flash("Pas assez de jetons pour doubler la mise.");
    setStats((s) => ({ ...s, balance: s.balance - stake }));
    setUndoStack((u) => [...u, ...Object.entries(bets).map(([id, amount]) => ({ id, amount }))]);
    setBets((b) => Object.fromEntries(Object.entries(b).map(([id, a]) => [id, a * 2])));
  };

  const refill = () => {
    setStats((s) => ({ ...s, balance: s.balance + START_BALANCE }));
    setNotice(`${fmt(START_BALANCE)} jetons offerts — bonne chance !`);
  };

  /* ── Spin ── */
  const spin = useCallback(() => {
    if (phase !== "betting") return;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    if (soundOnRef.current) soundRef.current?.unlock();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = randomPocket();
    const plan: SpinPlan = planSpin({ target, wheelStartAngle: wheelAngleRef.current, reducedMotion: reduced });
    const placed = { ...bets };

    setPhase("spinning");
    setNotice(null);
    setResult(null);
    setSettlement(null);
    setStatus(stake ? "Rien ne va plus… la bille tourne." : t.roulette.spinning);

    const ball = ballRef.current;
    if (ball) ball.style.opacity = "0";
    let start: number | null = null;
    let announced = false;
    let lastPocket = -1;
    let lastClick = 0;

    const frame = (now: number) => {
      if (start === null) {
        start = now;
        if (ball) ball.style.opacity = "1";
      }
      const elapsed = now - start;
      const s = sampleSpin(plan, elapsed);
      apply(s);
      if (soundOnRef.current && (s.phase === "drop" || s.phase === "bounce")) {
        const rel = (((s.ballAngle - s.wheelAngle) % 360) + 360) % 360;
        const pocket = Math.round(rel / POCKET_ANGLE) % 37;
        if (pocket !== lastPocket && now - lastClick > 45) {
          soundRef.current?.click(s.phase === "drop" ? 0.18 : 0.32);
          lastClick = now;
        }
        lastPocket = pocket;
      }
      if (!announced && s.settled) {
        announced = true;
        if (soundOnRef.current) soundRef.current?.settle();
        const n = plan.target;
        const outcome = settle(placed, n);
        setResult(n);
        setSettlement(outcome);
        setHistory((h) => [n, ...h].slice(0, HISTORY_MAX));
        setPhase("settling");
        const c = pocketColor(n);
        const money =
          outcome.staked === 0 ? "" : outcome.returned > 0 ? ` Gain : ${fmt(outcome.returned)} jetons.` : ` Mise perdue : ${fmt(outcome.staked)} jetons.`;
        setStatus(`${t.roulette.result} : ${n}, ${t.roulette.colors[c].toLowerCase()}.${money}`);
        timerRef.current = window.setTimeout(() => {
          setStats((st) => {
            const balance = st.balance + outcome.returned;
            return {
              balance,
              best: Math.max(st.best, balance),
              biggestWin: Math.max(st.biggestWin, outcome.net),
              spins: st.spins + 1,
            };
          });
          if (outcome.staked) setLastBets(placed);
          setBets({});
          setUndoStack([]);
          setPhase("betting");
        }, SETTLE_DELAY);
      }
      rafRef.current = elapsed < restTime(plan) ? requestAnimationFrame(frame) : null;
    };
    rafRef.current = requestAnimationFrame(frame);
  }, [apply, phase, bets, stake]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    soundOnRef.current = next;
    if (next) soundRef.current?.unlock();
  };

  const info = result != null ? describe(result) : null;
  const nextGoal = GOALS.find((g) => stats.best < g.at);
  const reached = [...GOALS].reverse().find((g) => stats.best >= g.at);
  const broke = stats.balance + stake < DENOMINATIONS[0];
  const busy = phase !== "betting";

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.3fr)] xl:gap-10">
      {/* ───────────── Wheel side ───────────── */}
      <div className="space-y-5">
        <div className="relative mx-auto w-full max-w-[min(88vw,520px)]">
          <div className="absolute inset-[-8%] rounded-full bg-[radial-gradient(circle,rgba(213,185,127,0.16),transparent_62%)] blur-2xl" aria-hidden />
          <Wheel idPrefix="game" wheelRef={wheelRef} ballRef={ballRef} className="relative h-auto w-full drop-shadow-[0_40px_60px_rgba(0,0,0,0.6)]" />
          {result != null && (
            <div
              key={`${result}-${history.length}`}
              className="pointer-events-none absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-gold-300/80 bg-night-950/80 shadow-[0_0_40px_rgba(213,185,127,0.35)] backdrop-blur-sm motion-safe:animate-fade-up sm:h-28 sm:w-28"
              aria-hidden
            >
              <span className={`font-display text-5xl sm:text-6xl ${pocketColor(result) === "red" ? "text-[#ff6b6b]" : pocketColor(result) === "green" ? "text-[#5fd39a]" : "text-ivory"}`}>{result}</span>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-night-900/70 p-5 backdrop-blur" aria-live="polite" aria-atomic="true">
          {info ? (
            <div className="flex items-center gap-4">
              <span className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-display text-3xl ${CHIP[info.color]}`}>{info.number}</span>
              <div className="min-w-0">
                <p className="font-display text-2xl text-ivory">
                  {info.number} · {t.roulette.colors[info.color]}
                </p>
                <p className="text-xs text-mist">
                  {[info.parity, info.range, info.dozen].filter(Boolean).join(" · ") || "Zéro"} · {t.roulette.neighbours} {neighbours(info.number).join(" · ")}
                </p>
              </div>
              {settlement && settlement.staked > 0 && (
                <p className={`ml-auto shrink-0 text-right font-mono text-lg font-semibold ${settlement.returned > 0 ? "text-ok" : "text-danger"}`}>
                  {settlement.returned > 0 ? `+${fmt(settlement.returned)}` : `−${fmt(settlement.staked)}`}
                  <span className="block font-sans text-[0.65rem] font-normal uppercase tracking-[0.14em] text-fog">jetons</span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-mist">{phase === "spinning" ? status : "Placez vos jetons sur le tapis, puis lancez la bille."}</p>
          )}
          {settlement && settlement.winners.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2 text-xs">
              {settlement.winners.map((w) => {
                const spot = SPOT_BY_ID.get(w.id)!;
                return (
                  <li key={w.id} className="rounded-full border border-ok/30 bg-ok/10 px-2.5 py-1 text-ok">
                    {KIND_LABELS[spot.kind]} {spot.kind === "straight" ? spot.numbers[0] : ""} · {w.payout}:1 → {fmt(w.returned)}
                  </li>
                );
              })}
            </ul>
          )}
          <span className="sr-only" role="status">
            {status}
          </span>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-night-900/60 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.16em] text-ivory-dim">{t.roulette.history}</h3>
            <button type="button" onClick={() => setHistory([])} disabled={!history.length || busy} className="btn btn-ghost btn-sm !min-h-0 !px-1 !py-0 text-[0.65rem]">
              <RotateCcw className="h-3 w-3" aria-hidden /> {t.roulette.clear}
            </button>
          </div>
          {history.length ? (
            <ol className="mt-3 flex flex-wrap gap-1.5" aria-label={t.roulette.history}>
              {history.map((n, i) => (
                <li
                  key={`${n}-${i}`}
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${CHIP[pocketColor(n)]} ${i === 0 ? "ring-2 ring-gold-300" : "opacity-80"}`}
                  aria-label={`${n} ${t.roulette.colors[pocketColor(n)]}`}
                >
                  {n}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-xs text-mist">{t.roulette.noHistory}</p>
          )}
        </div>
      </div>

      {/* ───────────── Table side ───────────── */}
      <div className="min-w-0 space-y-4">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-2xl border border-gold-500/30 bg-night-900/70 p-3 sm:p-4">
            <p className="flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-fog">
              <Coins className="h-3.5 w-3.5 text-gold-400" aria-hidden /> Jetons
            </p>
            <p className={`mt-1 font-mono text-xl font-semibold tabular-nums text-gold-200 sm:text-2xl ${shake ? "animate-shake" : ""}`} key={shake}>
              {fmt(stats.balance)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-night-900/70 p-3 sm:p-4">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-fog">Mise en jeu</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-ivory sm:text-2xl">{fmt(stake)}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-night-900/70 p-3 sm:p-4">
            <p className="flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-fog">
              <Crown className="h-3.5 w-3.5 text-gold-400" aria-hidden /> Record
            </p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-ivory sm:text-2xl">{fmt(stats.best)}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-night-950/40 p-2 sm:p-3">
          <BettingTable bets={bets} vertical={narrow} disabled={busy} winningNumber={phase === "settling" ? result : null} winners={winners} onPlace={place} />
        </div>
        <p className="text-center text-[0.7rem] text-fog">
          Cliquez pour miser · clic droit (ou Maj + clic) pour retirer une mise · survolez les lignes pour les chevaux, carrés et transversales.
        </p>

        {/* Chip tray */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3" role="radiogroup" aria-label="Valeur du jeton">
          {DENOMINATIONS.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={chip === d}
              aria-label={`Jeton de ${d}`}
              onClick={() => setChip(d)}
              disabled={busy}
              className={`rounded-full transition-transform duration-200 disabled:opacity-50 ${chip === d ? "-translate-y-1.5 drop-shadow-[0_8px_14px_rgba(213,185,127,0.45)]" : "opacity-80 hover:-translate-y-0.5 hover:opacity-100"} ${d > stats.balance && !busy ? "grayscale" : ""}`}
            >
              <Token value={d} size={narrow ? 46 : 56} highlight={chip === d} />
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={undo} disabled={busy || !undoStack.length} className="btn btn-outline btn-sm">
            <Undo2 className="h-3.5 w-3.5" aria-hidden /> Annuler
          </button>
          <button type="button" onClick={clear} disabled={busy || !stake} className="btn btn-outline btn-sm">
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> Effacer
          </button>
          <button type="button" onClick={rebet} disabled={busy || !totalStake(lastBets)} className="btn btn-outline btn-sm">
            <Repeat className="h-3.5 w-3.5" aria-hidden /> Rejouer
          </button>
          <button type="button" onClick={double} disabled={busy || !stake} className="btn btn-outline btn-sm">
            <X className="h-3.5 w-3.5" aria-hidden />2
          </button>
          <button type="button" onClick={toggleSound} aria-pressed={soundOn} className="btn btn-ghost btn-sm">
            {soundOn ? <Volume2 className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
            {soundOn ? t.roulette.soundOff : t.roulette.soundOn}
          </button>
        </div>

        {notice && (
          <p role="alert" className="text-center text-sm text-warn">
            {notice}
          </p>
        )}

        {broke && phase === "betting" ? (
          <button type="button" onClick={refill} className="btn btn-gold w-full !min-h-14 text-[0.9rem]">
            <Coins className="h-4 w-4" aria-hidden /> Recharger {fmt(START_BALANCE)} jetons gratuits
          </button>
        ) : (
          <button type="button" onClick={spin} disabled={busy} aria-busy={phase === "spinning"} className="btn btn-gold w-full !min-h-14 text-[0.9rem]">
            {phase === "spinning" ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-night-950/30 border-t-night-950" aria-hidden />
                {t.roulette.spinning}
              </>
            ) : phase === "settling" ? (
              "Paiement des mises…"
            ) : stake ? (
              `${t.roulette.spin} · ${compactAmount(stake)} jetons en jeu`
            ) : (
              t.roulette.spin
            )}
          </button>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.08] bg-night-900/60 p-4">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-fog">Défi du Léman</p>
            {nextGoal ? (
              <>
                <p className="mt-1 text-sm text-ivory-dim">
                  Prochain palier : <strong className="text-gold-200">{nextGoal.name}</strong> à {fmt(nextGoal.at)} jetons
                  {reached && <span className="text-fog"> · atteint : {reached.name}</span>}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gold-400" style={{ width: `${Math.min(100, (stats.best / nextGoal.at) * 100)}%` }} />
                </div>
              </>
            ) : (
              <p className="mt-1 text-sm text-gold-200">Tous les paliers atteints — légende du Léman !</p>
            )}
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-night-900/60 p-4 text-sm text-ivory-dim">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-fog">Vos statistiques</p>
            <p className="mt-1">
              Plus gros gain : <strong className="text-ok">{fmt(stats.biggestWin)}</strong> · Lancers : <strong className="text-ivory">{fmt(stats.spins)}</strong>
            </p>
          </div>
        </div>

        <details className="rounded-2xl border border-white/[0.08] bg-night-900/50 p-4 text-sm text-mist">
          <summary className="cursor-pointer text-ivory-dim">Paiements de la table</summary>
          <ul className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {(["straight", "split", "street", "trio", "corner", "sixline", "dozen", "column", "red", "even", "low"] as const).map((k) => (
              <li key={k} className="flex justify-between gap-3">
                <span>{k === "red" ? "Rouge / Noir" : k === "even" ? "Pair / Impair" : k === "low" ? "1–18 / 19–36" : KIND_LABELS[k]}</span>
                <span className="font-mono text-gold-200">{PAYOUT[k]} : 1</span>
              </li>
            ))}
          </ul>
        </details>

        <p className="text-xs leading-relaxed text-fog">
          Jeu de divertissement gratuit : les jetons « LÉMAN » sont symboliques, sans aucune valeur, ne s’achètent pas et ne s’échangent contre rien (ni argent, ni lot, ni avantage).
          Chaque résultat est tiré au hasard et ne prédit pas une vraie partie. Votre solde n’est conservé que dans votre navigateur.
        </p>
      </div>
    </div>
  );
}
