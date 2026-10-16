import { describe, expect, it } from "vitest";
import { POCKET_ANGLE, WHEEL_SEQUENCE, describe as describeNumber, numberAtWheelAngle, pocketCenterAngle, pocketColor, randomPocket } from "@/lib/roulette";
import { planSpin, sampleSpin } from "@/components/roulette/physics";

describe("roue européenne", () => {
  it("contient 37 cases uniques 0–36 dans l'ordre officiel", () => {
    expect(WHEEL_SEQUENCE).toHaveLength(37);
    expect(new Set(WHEEL_SEQUENCE).size).toBe(37);
    expect([...WHEEL_SEQUENCE].sort((a, b) => a - b)).toEqual(Array.from({ length: 37 }, (_, i) => i));
    expect(WHEEL_SEQUENCE.join(",")).toBe(
      "0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26",
    );
  });

  it("couleurs : zéro vert, 18 rouges, 18 noirs, alternance rouge/noir autour de la roue", () => {
    expect(pocketColor(0)).toBe("green");
    const colors = WHEEL_SEQUENCE.map(pocketColor);
    expect(colors.filter((c) => c === "red")).toHaveLength(18);
    expect(colors.filter((c) => c === "black")).toHaveLength(18);
    for (let i = 1; i < 36; i++) expect(colors[i]).not.toBe(colors[i + 1]);
    expect(pocketColor(32)).toBe("red");
    expect(pocketColor(26)).toBe("black");
    expect(pocketColor(1)).toBe("red");
    expect(pocketColor(2)).toBe("black");
  });

  it("géométrie : l'angle du centre de chaque case renvoie bien ce numéro", () => {
    for (const n of WHEEL_SEQUENCE) {
      expect(numberAtWheelAngle(pocketCenterAngle(n))).toBe(n);
      expect(numberAtWheelAngle(pocketCenterAngle(n) + POCKET_ANGLE * 0.45)).toBe(n);
      expect(numberAtWheelAngle(pocketCenterAngle(n) - 360 * 3)).toBe(n);
    }
  });

  it("tirage aléatoire uniforme sur 0–36", () => {
    const counts = new Array(37).fill(0);
    for (let i = 0; i < 37_000; i++) counts[randomPocket()]++;
    for (const c of counts) expect(c).toBeGreaterThan(700);
    expect(describeNumber(0).parity).toBeNull();
    expect(describeNumber(17).dozen).toBe("2e douzaine");
  });
});

describe("animation de la bille", () => {
  it("la bille s'arrête toujours exactement dans la case du résultat", () => {
    for (let k = 0; k < 300; k++) {
      const target = WHEEL_SEQUENCE[k % 37];
      const plan = planSpin({ target, wheelStartAngle: (k * 47) % 360, random: Math.random });
      const end = sampleSpin(plan, plan.duration + 2000);
      expect(end.settled).toBe(true);
      // Ball angle relative to the wheel frame must point at the target pocket.
      expect(numberAtWheelAngle(end.ballAngle - end.wheelAngle)).toBe(target);
      // The ball sits in the pocket ring at the end.
      expect(end.ballRadius).toBeCloseTo(plan.pocketRadius, 5);
    }
  });

  it("la roue et la bille tournent en sens opposés pendant le lancer", () => {
    const plan = planSpin({ target: 17, wheelStartAngle: 0, random: () => 0.5 });
    const a = sampleSpin(plan, 500);
    const b = sampleSpin(plan, 600);
    expect(b.wheelAngle - a.wheelAngle).toBeGreaterThan(0);
    expect(b.ballAngle - a.ballAngle).toBeLessThan(0);
  });

  it("la bille ralentit puis descend vers les cases", () => {
    const plan = planSpin({ target: 5, wheelStartAngle: 0, random: () => 0.3 });
    const early = sampleSpin(plan, 200);
    const late = sampleSpin(plan, plan.dropTime + 50);
    expect(early.ballRadius).toBeGreaterThan(plan.pocketRadius);
    const speed = (t: number) => Math.abs(sampleSpin(plan, t + 16).ballAngle - sampleSpin(plan, t).ballAngle);
    expect(speed(200)).toBeGreaterThan(speed(plan.dropTime - 100));
    expect(late.ballRadius).toBeLessThanOrEqual(plan.trackRadius);
  });
});
