import { describe, expect, it } from "vitest";
import { buildCatalog } from "@/lib/catalog";
import { curriculum } from "@/content";
import { defaultProgress, ProgressSchema, type Progress } from "@/lib/progress/schema";
import { addDays, daysBetween, newCard, schedule } from "@/lib/progress/srs";
import {
  READINESS_WEIGHTS,
  TOTAL_DAYS,
  averageConfidence,
  calibration,
  completion,
  dueReviews,
  readiness,
  retention,
  todaysDay,
  topicMastery,
  weakAreas,
} from "@/lib/progress/metrics";

const catalog = buildCatalog(curriculum);
const T1 = "w03-d02-sliding-window";
const T2 = "w02-d01-joins-and-keys";

function withAttempts(rows: [string, number, boolean][], base = defaultProgress("2026-01-01")): Progress {
  return {
    ...base,
    attempts: rows.map(([topicId, confidence, correct], i) => ({ id: String(i), itemId: `i${i}`, topicId, source: "drill", at: `2026-01-0${(i % 9) + 1}T10:00:00Z`, confidence, correct })),
  };
}

describe("spaced repetition", () => {
  it("handles dates in UTC without daylight-saving drift", () => {
    expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
    expect(daysBetween("2026-10-30", "2026-11-02")).toBe(3);
  });

  it("grows intervals 1, 3, then by ease, and resets on a lapse", () => {
    const today = "2026-01-10";
    let card = newCard(today);
    expect(card.due).toBe("2026-01-11");
    card = schedule(card, 2, today);
    expect(card.interval).toBe(1);
    card = schedule(card, 2, today);
    expect(card.interval).toBe(3);
    card = schedule(card, 2, today);
    expect(card.interval).toBe(Math.round(3 * 2.5));
    const lapsed = schedule(card, 0, today);
    expect(lapsed).toMatchObject({ reps: 0, interval: 1, lapses: 1, due: "2026-01-11" });
    expect(lapsed.ease).toBeCloseTo(2.3);
  });
});

describe("metrics stay separate", () => {
  it("computes completion from days only", () => {
    const p = defaultProgress("2026-01-01");
    p.days = { "w01-d01": { status: "done", updatedAt: "", minutesSpent: 60 }, "w01-d02": { status: "in-progress", updatedAt: "", minutesSpent: null } };
    expect(completion(p)).toBeCloseTo(1 / TOTAL_DAYS);
    expect(topicMastery(p, T1)).toBeNull();
  });

  it("uses only the last three attempts for topic mastery", () => {
    const p = withAttempts([
      [T1, 3, false],
      [T1, 3, false],
      [T1, 3, true],
      [T1, 3, true],
    ]);
    expect(topicMastery(p, T1)).toBeCloseTo(2 / 3);
  });

  it("averages confidence independently of correctness", () => {
    const p = withAttempts([
      [T1, 5, false],
      [T2, 1, true],
    ]);
    expect(averageConfidence(p)).toBe(3);
  });

  it("measures calibration error against the stated probabilities", () => {
    const p = withAttempts([
      [T1, 5, false],
      [T1, 5, false],
      [T2, 1, true],
      [T2, 1, true],
    ]);
    const cal = calibration(p);
    // Certain (0.95) but 0% right, Guessing (0.2) but 100% right: |0.95 - 0| and |0.2 - 1| weighted equally.
    expect(cal.error).toBeCloseTo((0.95 + 0.8) / 2);
  });

  it("counts retention only for on-time reviews graded Good or Easy", () => {
    const p = defaultProgress("2026-01-01");
    p.reviewLog = [
      { topicId: T1, at: "2026-01-05", due: "2026-01-05", grade: 2 },
      { topicId: T1, at: "2026-01-09", due: "2026-01-06", grade: 3 },
      { topicId: T2, at: "2026-01-05", due: "2026-01-05", grade: 1 },
    ];
    expect(retention(p, "2026-01-10")).toBeCloseTo(1 / 3);
  });

  it("labels readiness with the documented weights and treats missing inputs as zero", () => {
    const p = defaultProgress("2026-01-01");
    p.days = { "w01-d01": { status: "done", updatedAt: "", minutesSpent: 60 } };
    const r = readiness(p, catalog, "2026-01-02");
    expect(r.value).toBeCloseTo(READINESS_WEIGHTS.completion * (1 / TOTAL_DAYS));
    expect(r.parts.mastery).toBeNull();
  });
});

describe("plan position and queues", () => {
  it("maps the start date to week 1 day 1 and clamps past the end", () => {
    expect(todaysDay(catalog, "2026-01-01", "2026-01-01").day?.id).toBe("w01-d01");
    expect(todaysDay(catalog, "2026-01-01", "2026-01-09").day?.id).toBe("w02-d02");
    expect(todaysDay(catalog, "2026-01-01", "2027-01-01").day?.id).toBe("w16-d07");
    expect(todaysDay(catalog, "2026-01-05", "2026-01-01").day).toBeNull();
  });

  it("lists due reviews oldest first", () => {
    const p = defaultProgress("2026-01-01");
    p.reviews = { [T1]: { ...newCard("2026-01-01"), due: "2026-01-03" }, [T2]: { ...newCard("2026-01-01"), due: "2026-01-02" } };
    expect(dueReviews(p, catalog, "2026-01-04").map((d) => d.topic.id)).toEqual([T2, T1]);
    expect(dueReviews(p, catalog, "2026-01-01")).toHaveLength(0);
  });

  it("ranks weak areas by role weight, missed answers and overdue reviews", () => {
    const p = withAttempts([
      [T1, 3, false],
      [T2, 3, true],
    ]);
    p.settings.roles = ["sde"];
    const weak = weakAreas(p, catalog, "2026-01-02");
    expect(weak[0]?.topic.id).toBe(T1);
    expect(weak.find((w) => w.topic.id === T2)).toBeUndefined();
  });

  it("round-trips the default progress through its schema", () => {
    expect(ProgressSchema.safeParse(defaultProgress()).success).toBe(true);
  });
});
