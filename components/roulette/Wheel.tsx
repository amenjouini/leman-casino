import type { Ref } from "react";
import { POCKET_ANGLE, WHEEL_SEQUENCE, pocketColor } from "@/lib/roulette";
import { GEOMETRY } from "./physics";

const C = GEOMETRY.center;
const rad = (deg: number) => (deg * Math.PI) / 180;
const pt = (r: number, deg: number) => [C + r * Math.sin(rad(deg)), C - r * Math.cos(rad(deg))] as const;
const f = (n: number) => n.toFixed(2);

function sector(r1: number, r2: number, a0: number, a1: number) {
  const [ox0, oy0] = pt(r2, a0);
  const [ox1, oy1] = pt(r2, a1);
  const [ix1, iy1] = pt(r1, a1);
  const [ix0, iy0] = pt(r1, a0);
  return `M${f(ox0)} ${f(oy0)}A${r2} ${r2} 0 0 1 ${f(ox1)} ${f(oy1)}L${f(ix1)} ${f(iy1)}A${r1} ${r1} 0 0 0 ${f(ix0)} ${f(iy0)}Z`;
}

const FILL = { red: "#a8171f", black: "#121317", green: "#0c6c3d" } as const;
const POCKET_FILL = { red: "#7a0f16", black: "#0a0b0e", green: "#084d2b" } as const;

/** Precomputed geometry (identical on server and client). */
const SEGMENTS = WHEEL_SEQUENCE.map((n, i) => {
  const a = i * POCKET_ANGLE;
  const a0 = a - POCKET_ANGLE / 2;
  const a1 = a + POCKET_ANGLE / 2;
  const [tx, ty] = pt(331, a);
  const [fx0, fy0] = pt(GEOMETRY.pocketRingInner - 2, a0);
  const [fx1, fy1] = pt(GEOMETRY.numberRingOuter - 56, a0);
  const color = pocketColor(n);
  return {
    n,
    a,
    color,
    number: sector(304, 358, a0, a1),
    pocket: sector(GEOMETRY.pocketRingInner, GEOMETRY.pocketRingOuter, a0, a1),
    text: { x: f(tx), y: f(ty) },
    fret: `M${f(fx0)} ${f(fy0)}L${f(fx1)} ${f(fy1)}`,
  };
});

const DEFLECTORS = Array.from({ length: 8 }, (_, i) => {
  const a = i * 45 + 22.5;
  const [x, y] = pt(GEOMETRY.deflectorRadius, a);
  const vertical = i % 2 === 0;
  return { x, y, a, vertical };
});

type WheelProps = {
  idPrefix?: string;
  wheelRef?: Ref<SVGGElement>;
  ballRef?: Ref<SVGGElement>;
  showBall?: boolean;
  initialRotation?: number;
  className?: string;
  title?: string;
};

export function Wheel({ idPrefix = "w", wheelRef, ballRef, showBall = true, initialRotation = 0, className = "", title }: WheelProps) {
  const id = (s: string) => `${idPrefix}-${s}`;
  const url = (s: string) => `url(#${id(s)})`;
  const [bx, by] = pt(GEOMETRY.trackRadius, 0);

  return (
    <svg viewBox="0 0 1000 1000" className={className} role="img" aria-label={title ?? "Roue de roulette européenne"}>
      <defs>
        <radialGradient id={id("wood")} cx="50%" cy="50%" r="50%">
          <stop offset="86%" stopColor="#3b1f0e" />
          <stop offset="93%" stopColor="#6b3d1d" />
          <stop offset="97%" stopColor="#4a2711" />
          <stop offset="100%" stopColor="#25130a" />
        </radialGradient>
        <linearGradient id={id("brass")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f6e6b4" />
          <stop offset="35%" stopColor="#c69a4a" />
          <stop offset="65%" stopColor="#7d5a23" />
          <stop offset="100%" stopColor="#e9cf8c" />
        </linearGradient>
        <radialGradient id={id("bowl")} cx="50%" cy="50%" r="50%">
          <stop offset="72%" stopColor="#0b0907" />
          <stop offset="80%" stopColor="#1d1611" />
          <stop offset="86%" stopColor="#2b2119" />
          <stop offset="89.5%" stopColor="#140f0b" />
        </radialGradient>
        <radialGradient id={id("cone")} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8a5428" />
          <stop offset="55%" stopColor="#5e3517" />
          <stop offset="100%" stopColor="#2e180a" />
        </radialGradient>
        <radialGradient id={id("pocketShade")} cx="50%" cy="50%" r="50%">
          <stop offset="48%" stopColor="#000" stopOpacity="0.55" />
          <stop offset="56%" stopColor="#000" stopOpacity="0.05" />
          <stop offset="60.4%" stopColor="#000" stopOpacity="0.35" />
        </radialGradient>
        <radialGradient id={id("light")} cx="34%" cy="26%" r="75%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="40%" stopColor="#fff" stopOpacity="0.03" />
          <stop offset="75%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.35" />
        </radialGradient>
        <radialGradient id={id("ball")} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#f1efe9" />
          <stop offset="85%" stopColor="#b9b6ad" />
          <stop offset="100%" stopColor="#8d8a82" />
        </radialGradient>
        <radialGradient id={id("dome")} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fff4cf" />
          <stop offset="45%" stopColor="#d2a85a" />
          <stop offset="100%" stopColor="#6e4f1d" />
        </radialGradient>
        <filter id={id("shadow")} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.65" />
        </filter>
        <filter id={id("soft")} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      {/* Table shadow + wooden rim */}
      <circle cx={C} cy={C} r={486} fill="#000" opacity="0.6" filter={url("soft")} transform="translate(8 14)" />
      <circle cx={C} cy={C} r={495} fill={url("wood")} />
      <circle cx={C} cy={C} r={492} fill="none" stroke="#f0d9a0" strokeOpacity="0.18" strokeWidth="2" />
      <circle cx={C} cy={C} r={449} fill="none" stroke={url("brass")} strokeWidth="5" />

      {/* Ball track (bowl) */}
      <circle cx={C} cy={C} r={446} fill={url("bowl")} />
      <circle cx={C} cy={C} r={433} fill="none" stroke="#fff" strokeOpacity="0.05" strokeWidth="1.5" />
      <circle cx={C} cy={C} r={400} fill="none" stroke="#000" strokeOpacity="0.5" strokeWidth="2" />

      {/* Deflectors ("diamonds") */}
      {DEFLECTORS.map((d, i) => (
        <g key={i} transform={`translate(${f(d.x)} ${f(d.y)}) rotate(${d.a + (d.vertical ? 0 : 90)})`} filter={url("shadow")}>
          <path d={d.vertical ? "M0 -17 L7 0 L0 17 L-7 0Z" : "M0 -11 L10 0 L0 11 L-10 0Z"} fill={url("brass")} />
        </g>
      ))}

      {/* Rotating wheel head */}
      <g ref={wheelRef} transform={`rotate(${initialRotation} ${C} ${C})`}>
        <circle cx={C} cy={C} r={365} fill="#0d0d10" />
        <circle cx={C} cy={C} r={363} fill="none" stroke={url("brass")} strokeWidth="4" />
        {SEGMENTS.map((s) => (
          <path key={`n${s.n}`} d={s.number} fill={FILL[s.color]} stroke="#d9bd7c" strokeOpacity="0.55" strokeWidth="1.2" />
        ))}
        {SEGMENTS.map((s) => (
          <text
            key={`t${s.n}`}
            x={s.text.x}
            y={s.text.y}
            transform={`rotate(${s.a.toFixed(2)} ${s.text.x} ${s.text.y})`}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#f6efdd"
            fontSize="27"
            fontWeight="600"
            fontFamily="var(--font-display), Georgia, serif"
          >
            {s.n}
          </text>
        ))}
        <circle cx={C} cy={C} r={303.5} fill="none" stroke={url("brass")} strokeWidth="3" />
        {SEGMENTS.map((s) => (
          <path key={`p${s.n}`} d={s.pocket} fill={POCKET_FILL[s.color]} />
        ))}
        <circle cx={C} cy={C} r={GEOMETRY.pocketRingOuter} fill={url("pocketShade")} />
        {SEGMENTS.map((s) => (
          <path key={`f${s.n}`} d={s.fret} stroke={url("brass")} strokeWidth="4" strokeLinecap="round" />
        ))}
        <circle cx={C} cy={C} r={GEOMETRY.pocketRingInner} fill={url("cone")} stroke={url("brass")} strokeWidth="3" />
        {Array.from({ length: 8 }, (_, i) => {
          const [x0, y0] = pt(110, i * 45);
          const [x1, y1] = pt(238, i * 45);
          return <path key={i} d={`M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}`} stroke="#000" strokeOpacity="0.25" strokeWidth="2" />;
        })}
        <circle cx={C} cy={C} r={150} fill="none" stroke={url("brass")} strokeWidth="2" strokeOpacity="0.7" />

        {/* Turret (spindle) */}
        <g filter={url("shadow")}>
          {[0, 90, 180, 270].map((a) => {
            const [x, y] = pt(118, a);
            return (
              <g key={a}>
                <path d={`M${C} ${C}L${f(x)} ${f(y)}`} stroke={url("brass")} strokeWidth="13" strokeLinecap="round" />
                <circle cx={f(x)} cy={f(y)} r="15" fill={url("dome")} />
              </g>
            );
          })}
          <circle cx={C} cy={C} r={48} fill={url("dome")} />
          <circle cx={C} cy={C} r={20} fill={url("brass")} />
          <circle cx={C - 6} cy={C - 7} r={6} fill="#fff" opacity="0.55" />
        </g>
      </g>

      {/* Fixed lighting so the wheel turns under the same light */}
      <circle cx={C} cy={C} r={495} fill={url("light")} pointerEvents="none" />

      {showBall && (
        <g ref={ballRef} transform={`translate(${f(bx)} ${f(by)})`} style={{ transition: "opacity 160ms" }}>
          <circle r={GEOMETRY.ballRadius} fill={url("ball")} filter={url("shadow")} />
          <circle cx={-3.5} cy={-4} r={3} fill="#fff" opacity="0.9" />
        </g>
      )}
    </svg>
  );
}
