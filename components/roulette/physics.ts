import { POCKET_ANGLE, pocketCenterAngle } from "@/lib/roulette";

/**
 * Physics-inspired roulette motion.
 *
 * Angles are in degrees, clockwise from 12 o'clock. The wheel turns clockwise and
 * slows exponentially. The ball is modelled in the wheel's own frame: its relative
 * angular speed decays smoothly to zero at the settle time, and the total relative
 * travel is solved so that the ball comes to rest exactly on the pre-drawn pocket.
 * Bounces and deflections are zero-sum perturbations confined to the drop phase,
 * so they add irregularity without ever changing where the ball ends up.
 */

export const GEOMETRY = {
  size: 1000,
  center: 500,
  trackRadius: 418,
  deflectorRadius: 382,
  pocketRingOuter: 302,
  pocketRingInner: 246,
  pocketRadius: 272,
  numberRingOuter: 360,
  ballRadius: 11,
} as const;

type Bump = { start: number; width: number; amp: number };

export type SpinPlan = {
  target: number;
  duration: number; // ms until the ball rests in its pocket
  dropTime: number; // ms when the ball leaves the rim
  wheelStartAngle: number;
  wheelSpeed0: number; // deg/ms
  wheelTau: number; // ms
  relStart: number; // ball angle relative to wheel at t=0
  relTravel: number; // total relative travel (deg, positive = counter-clockwise relative motion)
  power: number;
  trackRadius: number;
  pocketRadius: number;
  bumps: Bump[];
  radialBounces: { start: number; width: number; height: number }[];
  wobblePhase: number;
};

export type SpinSample = { wheelAngle: number; ballAngle: number; ballRadius: number; settled: boolean; phase: "rim" | "drop" | "bounce" | "rest" };

export function planSpin(opts: { target: number; wheelStartAngle: number; random?: () => number; reducedMotion?: boolean }): SpinPlan {
  const rnd = opts.random ?? Math.random;
  const reduced = !!opts.reducedMotion;
  const duration = reduced ? 1600 : 6400 + rnd() * 1400;
  const dropTime = reduced ? 700 : duration * (0.56 + rnd() * 0.06);
  const wheelSpeed0 = (reduced ? 0.06 : 0.11 + rnd() * 0.04) * 1; // deg per ms (≈ 110–150°/s)
  const wheelTau = 14000;
  const power = 1.55 + rnd() * 0.2;

  const relStart = rnd() * 360;
  // Relative frame: we need relStart - relTravel ≡ pocketCenter(target) (mod 360).
  const baseTravel = reduced ? 360 : 360 * (7 + Math.floor(rnd() * 3));
  const targetAngle = pocketCenterAngle(opts.target);
  const adjust = (((relStart - baseTravel - targetAngle) % 360) + 360) % 360;
  const relTravel = baseTravel + adjust;

  const bumps: Bump[] = [];
  const radialBounces: SpinPlan["radialBounces"] = [];
  if (!reduced) {
    // Deflections: the ball jumps a few pockets forward/back, then the motion resumes.
    const windowStart = dropTime + 450;
    const windowEnd = duration - 380;
    const count = 2 + Math.floor(rnd() * 3);
    let cursor = windowStart;
    for (let i = 0; i < count && cursor < windowEnd - 180; i++) {
      const width = 220 + rnd() * 380;
      const start = cursor + rnd() * 120;
      if (start + width > windowEnd) break;
      const decay = 1 - i / (count + 1);
      const amp = (rnd() < 0.5 ? -1 : 1) * POCKET_ANGLE * (0.6 + rnd() * 1.8) * decay;
      bumps.push({ start, width, amp });
      cursor = start + width * 0.85;
    }
    // Radial hops as the ball rattles across the frets.
    let t = dropTime + 520;
    let h = 26 + rnd() * 10;
    while (t < duration - 140 && h > 2) {
      const width = 120 + rnd() * 140;
      radialBounces.push({ start: t, width, height: h });
      t += width + rnd() * 60;
      h *= 0.62 + rnd() * 0.12;
    }
  }

  return {
    target: opts.target,
    duration,
    dropTime,
    wheelStartAngle: opts.wheelStartAngle,
    wheelSpeed0,
    wheelTau,
    relStart,
    relTravel,
    power,
    trackRadius: GEOMETRY.trackRadius,
    pocketRadius: GEOMETRY.pocketRadius,
    bumps,
    radialBounces,
    wobblePhase: rnd() * Math.PI * 2,
  };
}

const smoothstep = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** After the ball settles, the wheel is braked more strongly and coasts to a stop. */
export const COAST_TAU = 2600;
/** Time after which the whole scene is at rest (animation loop can stop). */
export const restTime = (plan: SpinPlan) => plan.duration + COAST_TAU * 5;

function freeWheelAngle(plan: SpinPlan, t: number) {
  return plan.wheelStartAngle + plan.wheelSpeed0 * plan.wheelTau * (1 - Math.exp(-Math.max(0, t) / plan.wheelTau));
}

export function wheelAngleAt(plan: SpinPlan, t: number): number {
  if (t <= plan.duration) return freeWheelAngle(plan, t);
  const vT = plan.wheelSpeed0 * Math.exp(-plan.duration / plan.wheelTau);
  return freeWheelAngle(plan, plan.duration) + vT * COAST_TAU * (1 - Math.exp(-(t - plan.duration) / COAST_TAU));
}

export function sampleSpin(plan: SpinPlan, t: number): SpinSample {
  const T = plan.duration;
  const wheelAngle = wheelAngleAt(plan, t);
  const targetRel = pocketCenterAngle(plan.target);

  if (t >= T) {
    // At rest in the pocket, carried by the wheel, with a short decaying rock.
    const dt = t - T;
    const rock = dt < 900 ? POCKET_ANGLE * 0.12 * Math.exp(-dt / 140) * Math.sin(dt / 38 + plan.wobblePhase) : 0;
    const settleR = dt < 900 ? 4 * Math.exp(-dt / 90) * Math.abs(Math.sin(dt / 30)) : 0;
    return { wheelAngle, ballAngle: wheelAngle + targetRel + rock, ballRadius: plan.pocketRadius + settleR, settled: true, phase: "rest" };
  }

  const u = Math.max(0, t) / T;
  const progress = 1 - Math.pow(1 - u, plan.power + 1); // ∫ of (1-u)^p, normalised
  let rel = plan.relStart - plan.relTravel * progress;
  for (const b of plan.bumps) {
    if (t > b.start && t < b.start + b.width) rel += b.amp * Math.sin((Math.PI * (t - b.start)) / b.width);
  }

  let ballRadius: number;
  let phase: SpinSample["phase"];
  if (t < plan.dropTime) {
    phase = "rim";
    // Slight wobble on the track as the ball loses speed.
    ballRadius = plan.trackRadius - 2.5 * smoothstep(t / plan.dropTime) * (1 + Math.sin(t / 55));
  } else {
    const dropDur = Math.min(650, (T - plan.dropTime) * 0.3);
    const k = (t - plan.dropTime) / dropDur;
    if (k < 1) {
      phase = "drop";
      // Spiral down the cone with a little kick when passing the deflectors.
      const s = k * k * (3 - 2 * k);
      const kick = Math.sin(Math.PI * Math.min(1, k * 1.6)) * 10 * s;
      ballRadius = plan.trackRadius + (plan.pocketRadius + 18 - plan.trackRadius) * s + kick;
    } else {
      phase = "bounce";
      ballRadius = plan.pocketRadius + 18 * (1 - smoothstep((t - plan.dropTime - dropDur) / 260));
      for (const b of plan.radialBounces) {
        if (t > b.start && t < b.start + b.width) ballRadius += b.height * Math.sin((Math.PI * (t - b.start)) / b.width);
      }
    }
  }

  return { wheelAngle, ballAngle: wheelAngle + rel, ballRadius, settled: false, phase };
}
