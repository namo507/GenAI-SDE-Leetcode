import { describe, expect, it } from "vitest";
import { foundationLabs, gradientTrajectory } from "@/lib/labs/foundations";

describe("gradient teaching model", () => {
  it("converges with shrinking crossings, oscillates at the boundary and diverges above it", () => {
    expect(gradientTrajectory({ start: 8, rate: 0.75, steps: 2 }).map((r) => r.x)).toEqual([8, -1, 3.5]);
    expect(gradientTrajectory({ start: 8, rate: 1, steps: 2 }).map((r) => r.x)).toEqual([8, -4, 8]);
    expect(gradientTrajectory({ start: 8, rate: 1.25, steps: 2 }).at(-1)!.loss).toBeGreaterThan(36);
  });
  it("handles the stationary exception and a zero learning rate", () => {
    expect(gradientTrajectory({ start: 2, rate: 1.5, steps: 12 }).every((r) => r.loss === 0)).toBe(true);
    expect(gradientTrajectory({ start: 8, rate: 0, steps: 12 }).every((r) => r.loss === 36)).toBe(true);
    expect(foundationLabs[0]!.predict({ start: 2, rate: 1.5, steps: 12 }).correctIndex).toBe(1);
  });
  it("does not display a tiny nonzero loss as exact convergence", () => {
    const result = foundationLabs[0]!.evaluate({ start: 8, rate: 0.45, steps: 12 });
    expect(result.metrics.find((metric) => metric.label === "Final loss")!.value).not.toBe("0");
  });
});
