import { describe, expect, it } from "vitest";
import { curriculum, mockLoops, projects } from "@/content";
import { ROLES } from "@/lib/curriculum";
import { labs } from "@/lib/labs";
import { defaultParameters, normalizeParameters } from "@/lib/labs/types";
import { rolePaths } from "@/content/role-paths";
import { calculateBayes, calculateJoinFanout, calculateSimpson, calculateThreshold, calculateWindowWork } from "@/lib/labs/quantitative";
import { agentModel, attentionModel, autoscalingModel, cacheModel, ragModel, streamingModel, STREAM_EVENTS } from "@/lib/labs/systems-ai";
import { defaultProgress, ProgressSchema } from "@/lib/progress/schema";

describe("experiment catalog and role journeys", () => {
  it("provides valid linked teaching content and real calculated results at presets and control boundaries", () => {
    const topicIds = new Set(curriculum.topics.map((topic) => topic.id));
    expect(labs).toHaveLength(12);
    expect(new Set(labs.map((lab) => lab.id)).size).toBe(labs.length);
    for (const lab of labs) {
      expect(lab.presets.length, lab.id).toBeGreaterThanOrEqual(3);
      expect(lab.challenges.length, lab.id).toBeGreaterThanOrEqual(2);
      expect(lab.eli5.limit.length, lab.id).toBeGreaterThan(40);
      for (const id of lab.topicIds) expect(topicIds.has(id), `${lab.id}: ${id}`).toBe(true);
      const base = defaultParameters(lab);
      const cases = [base, ...lab.presets.map((preset) => preset.values), ...lab.controls.flatMap((control) => [control.min, control.max].map((value) => ({ ...base, [control.key]: value })))];
      for (const parameters of cases) {
        const normalized = normalizeParameters(lab, parameters);
        const result = lab.evaluate(normalized);
        const prediction = lab.predict(normalized);
        expect(prediction.correctIndex, lab.id).toBeGreaterThanOrEqual(0);
        expect(prediction.correctIndex, lab.id).toBeLessThan(prediction.choices.length);
        expect(result.metrics.length, lab.id).toBeGreaterThanOrEqual(2);
        expect(result.steps.length, lab.id).toBeGreaterThanOrEqual(2);
        for (const row of result.table.rows) expect(row.length, lab.id).toBe(result.table.columns.length);
        for (const bar of result.bars?.items ?? []) expect(Number.isFinite(bar.value) && bar.value >= 0, `${lab.id}: ${bar.label}`).toBe(true);
        for (const metric of result.metrics) if (typeof metric.value === "number") expect(Number.isFinite(metric.value), `${lab.id}: ${metric.label}`).toBe(true);
      }
    }
  });
  it("has a complete role loop for each role, with no dead lesson, lab, project or mock identifiers", () => {
    expect(rolePaths.map((path) => path.role).sort()).toEqual([...ROLES].sort());
    for (const role of ROLES) expect(labs.filter((lab) => lab.roles.includes(role)).length, role).toBeGreaterThanOrEqual(3);
    for (const path of rolePaths) {
      path.topicIds.forEach((id) => expect(curriculum.topics.some((topic) => topic.id === id), id).toBe(true));
      path.labIds.forEach((id) => expect(labs.some((lab) => lab.id === id), id).toBe(true));
      path.projectIds.forEach((id) => expect(projects.some((project) => project.id === id), id).toBe(true));
      expect(mockLoops.some((loop) => loop.id === path.mockLoopId), path.mockLoopId).toBe(true);
      expect(path.mission.rubric.length).toBeGreaterThanOrEqual(4);
    }
  });
  it("bounds imported experiment inputs and preserves older v1 exports", () => {
    const lab = labs[0]!;
    const p = normalizeParameters(lab, { n: Infinity, width: -500, unknown: 42 });
    expect(p.n).toBe(16); expect(p.width).toBe(1); expect(p.unknown).toBeUndefined();
    const oldExport: Record<string, unknown> = { ...defaultProgress("2026-10-29") };
    delete oldExport.reflections;
    delete oldExport.labNotes;
    expect(ProgressSchema.parse(oldExport)).toMatchObject({ reflections: {}, labNotes: {} });
  });
});

describe("quantitative mechanisms", () => {
  it("counts value reads and preserves every rolling sum, including cases where rolling is no faster", () => {
    for (let n = 8; n <= 64; n += 8) for (let width = 1; width <= 8; width++) {
      const r = calculateWindowWork(n, width);
      expect(r.windows.map((w) => w.sum)).toEqual(r.windows.map((w) => r.values.slice(w.start, w.end + 1).reduce((a, b) => a + b, 0)));
    }
    expect(calculateWindowWork(8, 1)).toMatchObject({ rescanningReads: 8, rollingReads: 15 });
    expect(calculateWindowWork(8, 8)).toMatchObject({ rescanningReads: 8, rollingReads: 8 });
  });
  it("demonstrates join duplication and keeps SQL NULL equality nonmatching", () => {
    expect(calculateJoinFanout(1, true, true)).toMatchObject({ countStar: 6, countDimensionId: 4, joinedTotal: 210 });
    expect(calculateJoinFanout(2, true, true)).toMatchObject({ countStar: 8, countDimensionId: 6, joinedTotal: 240 });
    expect(calculateJoinFanout(1, true, false)).toMatchObject({ countStar: 4, countDimensionId: 4, joinedTotal: 100 });
  });
  it("uses the positive-test denominator, not sensitivity or specificity", () => {
    const r = calculateBayes(1, 90, 95);
    expect(r).toMatchObject({ truePositive: 90, falsePositive: 495, flagged: 585 });
    expect(r.posterior).toBeCloseTo(90 / 585);
    expect(calculateBayes(1, 90, 100).posterior).toBe(1);
  });
  it("isolates the composition reversal under common cohort weights", () => {
    const r = calculateSimpson(90, 10, 10);
    expect(r.aPooled).toBeCloseTo(0.75); expect(r.bPooled).toBeCloseTo(0.45);
    expect(r.bStandardized - r.aStandardized).toBeCloseTo(0.1);
    expect(r.reversal).toBe(true);
  });
  it("preserves confusion totals and recall monotonicity across thresholds", () => {
    let previousRecall = 1;
    for (let threshold = 5; threshold <= 100; threshold += 5) {
      const r = calculateThreshold(threshold, 2, 5);
      expect(r.tp + r.fp + r.tn + r.fn).toBe(10);
      expect(r.recall).toBeLessThanOrEqual(previousRecall);
      expect(r.totalCost).toBe(2 * r.fp + 5 * r.fn);
      previousRecall = r.recall;
    }
    expect(calculateThreshold(100, 1, 5).precision).toBeNull();
  });
});

describe("systems and AI mechanisms", () => {
  it("separates cache freshness and retry amplification", () => {
    expect(cacheModel({ ttl: 0, sourceInterval: 1, retries: 0, layers: 1, failure: 0 })).toMatchObject({ hits: 0, stale: 0, misses: 30, worstOrigin: 30 });
    const nested = cacheModel({ ttl: 8, sourceInterval: 1, retries: 2, layers: 3, failure: 100 });
    expect(nested.stale).toBeGreaterThan(0); expect(nested.worstOrigin).toBe(nested.misses * 27);
    expect(nested.expectedAttempts).toBe(3);
  });
  it("accounts for every streaming event, and increasing retained lateness cannot add drops", () => {
    const tight = streamingModel({ lag: 0, allowance: 0, window: 5 });
    const relaxed = streamingModel({ lag: 0, allowance: 12, window: 5 });
    expect(tight.onTime + tight.updated + tight.dropped).toBe(STREAM_EVENTS.length);
    expect(relaxed.dropped).toBeLessThanOrEqual(tight.dropped);
  });
  it("does not promise to drain a queue when post-scale capacity is insufficient", () => {
    const limited = autoscalingModel({ demand: 1600, current: 1, target: 70, maximum: 3, delay: 20 });
    expect(limited.capacity).toBe(300); expect(limited.backlog).toBe(30000); expect(limited.drainSeconds).toBeNull();
    expect(autoscalingModel({ demand: 800, current: 3, target: 70, maximum: 12, delay: 0 }).backlog).toBe(0);
    const newlyOverloaded = autoscalingModel({ demand: 1000, current: 12, target: 70, maximum: 6, delay: 20 });
    expect(newlyOverloaded.backlog).toBe(0);
    expect(newlyOverloaded.drainSeconds).toBeNull();
    expect(labs.find((lab) => lab.id === "autoscaling-capacity")!.predict({ demand: 1600, current: 1, target: 70, maximum: 3, delay: 0 }).correctIndex).toBe(1);
  });
  it("normalizes attention over allowed keys and cannot attend to a masked future", () => {
    for (let position = 0; position < 4; position++) {
      const r = attentionModel({ qx: 1, qy: -1, temperature: 0.25, position, mask: 1 });
      expect(r.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
      expect(r.futureMass).toBe(0);
      r.weights.slice(position + 1).forEach((weight) => expect(weight).toBe(0));
    }
    expect(attentionModel({ qx: 0, qy: 0, temperature: 1, position: 3, mask: 0 }).weights).toEqual([0.25, 0.25, 0.25, 0.25]);
  });
  it("distinguishes candidate recall from packed context, and filters before top-k", () => {
    const r = ragModel({ topK: 8, budget: 100, rerank: 1, filter: 1 });
    expect(r.recall).toBe(1); expect(r.contextRecall).toBe(0); expect(r.unauthorized).toBe(0);
    expect(r.ranked.every((d) => d.authorized)).toBe(true);
    const unsafe = ragModel({ topK: 8, budget: 1200, rerank: 1, filter: 0 });
    expect(unsafe.unauthorized).toBe(1);
  });
  it("requires both capability and approval, respects budget, and deduplicates the approved effect", () => {
    const p = { write: 1, approved: 1, budget: 15, steps: 6, idempotent: 1 };
    expect(agentModel(p)).toMatchObject({ refunds: 1, cached: 1, blocked: 2 });
    expect(agentModel({ ...p, approved: 0 }).refunds).toBe(0);
    expect(agentModel({ ...p, write: 0 }).refunds).toBe(0);
    expect(agentModel({ ...p, budget: 4 }).refunds).toBe(0);
    expect(agentModel({ ...p, idempotent: 0 }).refunds).toBe(2);
  });
});
