/**
 * Decorative topographic lines evoking the crescent of Lac Léman.
 * Purely ornamental (aria-hidden), drawn with currentColor.
 */
export function LakeLines({ className = "" }: { className?: string }) {
  const rings = Array.from({ length: 9 }, (_, i) => i);
  return (
    <svg viewBox="0 0 1200 560" fill="none" className={className} aria-hidden focusable="false" preserveAspectRatio="xMidYMid slice">
      {rings.map((i) => {
        const k = i * 22;
        return (
          <path
            key={i}
            d={`M${40 + k * 0.6} ${330 - k * 0.2}
               C ${180 + k * 0.4} ${190 - k * 0.55}, ${420 + k * 0.2} ${150 - k * 0.6}, ${600} ${200 - k * 0.45}
               S ${930 - k * 0.3} ${150 - k * 0.6}, ${1160 - k * 0.6} ${250 - k * 0.15}
               C ${1060 - k * 0.5} ${330 + k * 0.35}, ${860 - k * 0.2} ${380 + k * 0.5}, ${640} ${352 + k * 0.6}
               S ${250 + k * 0.3} ${430 + k * 0.4}, ${40 + k * 0.6} ${330 - k * 0.2} Z`}
            stroke="currentColor"
            strokeWidth={i === 0 ? 1.6 : 1}
            opacity={1 - i * 0.08}
          />
        );
      })}
    </svg>
  );
}
