/**
 * Learning metrics. Each one is computed from its own records and reported
 * separately; the readiness value is a labeled learning indicator with an
 * exposed formula, never a prediction of interview or hiring outcomes.
 */
import type { Catalog, CatalogDay, CatalogTopic } from "@/lib/catalog";
import type { Role } from "@/lib/curriculum";
import { CONFIDENCE_LEVELS, type Progress } from "./schema";
import { daysBetween } from "./srs";

export const METRIC_DEFINITIONS = {
  completion: "Days marked done out of all 112 days.",
  mastery: "Share of correct answers in your last 3 attempts per topic, averaged over topics you have attempted.",
  confidence: "Average of the confidence you rate before checking an answer (1 Guessing to 5 Certain).",
  retention: "Share of spaced reviews in the last 60 days that were done on or before their due date and graded Good or Easy.",
  calibration: "Expected calibration error: the average gap between the probability your confidence claims and how often you were right at that level.",
} as const;

export const READINESS_WEIGHTS = { mastery: 0.4, retention: 0.25, completion: 0.2, calibration: 0.15 } as const;
export const READINESS_FORMULA =
  "Learning indicator = 0.40 x mastery + 0.25 x retention + 0.20 x completion + 0.15 x (1 - calibration error). Missing inputs count as 0. It describes your study data, not your chance of being hired.";

export const TOTAL_DAYS = 112;

export function programDayIndex(startDate: string, today: string): number {
  return daysBetween(startDate, today);
}

export function todaysDay(catalog: Pick<Catalog, "days">, startDate: string, today: string): { day: CatalogDay | null; offset: number } {
  const offset = programDayIndex(startDate, today);
  if (offset < 0) return { day: null, offset };
  return { day: catalog.days[Math.min(offset, catalog.days.length - 1)] ?? null, offset };
}

export function completion(p: Progress): number {
  return Object.values(p.days).filter((d) => d.status === "done").length / TOTAL_DAYS;
}

export function topicMastery(p: Progress, topicId: string): number | null {
  const recent = p.attempts.filter((a) => a.topicId === topicId).slice(-3);
  if (!recent.length) return null;
  return recent.filter((a) => a.correct).length / recent.length;
}

export function overallMastery(p: Progress, topics: CatalogTopic[]): number | null {
  const values = topics.map((t) => topicMastery(p, t.id)).filter((v): v is number => v !== null);
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

export function averageConfidence(p: Progress): number | null {
  const recent = p.attempts.slice(-50);
  return recent.length ? recent.reduce((s, a) => s + a.confidence, 0) / recent.length : null;
}

export function retention(p: Progress, today: string, windowDays = 60): number | null {
  const recent = p.reviewLog.filter((r) => daysBetween(r.at, today) <= windowDays);
  if (!recent.length) return null;
  return recent.filter((r) => r.at <= r.due && r.grade >= 2).length / recent.length;
}

export function topicRetention(p: Progress, topicId: string): number | null {
  const logs = p.reviewLog.filter((r) => r.topicId === topicId);
  if (!logs.length) return null;
  return logs.filter((r) => r.at <= r.due && r.grade >= 2).length / logs.length;
}

export type CalibrationRow = { level: number; label: string; stated: number; n: number; accuracy: number | null };

export function calibration(p: Progress): { rows: CalibrationRow[]; error: number | null } {
  const rows = CONFIDENCE_LEVELS.map((lvl) => {
    const at = p.attempts.filter((a) => a.confidence === lvl.value);
    return {
      level: lvl.value,
      label: lvl.label,
      stated: lvl.probability,
      n: at.length,
      accuracy: at.length ? at.filter((a) => a.correct).length / at.length : null,
    };
  });
  const total = rows.reduce((s, r) => s + r.n, 0);
  const error = total ? rows.reduce((s, r) => s + (r.accuracy === null ? 0 : (r.n * Math.abs(r.stated - r.accuracy))), 0) / total : null;
  return { rows, error };
}

export type WeekTime = { week: number; planned: number; actual: number };

export function timeVsPlan(p: Progress, catalog: Catalog): WeekTime[] {
  return catalog.weeks.map((w) => ({
    week: w.number,
    planned: w.minutes,
    actual: w.dayIds.reduce((s, id) => s + (p.days[id]?.status === "done" ? (p.days[id]?.minutesSpent ?? 0) : 0), 0),
  }));
}

export function readiness(p: Progress, catalog: Catalog, today: string) {
  const parts = {
    mastery: overallMastery(p, catalog.topics),
    retention: retention(p, today),
    completion: completion(p),
    calibration: calibration(p).error,
  };
  const value =
    READINESS_WEIGHTS.mastery * (parts.mastery ?? 0) +
    READINESS_WEIGHTS.retention * (parts.retention ?? 0) +
    READINESS_WEIGHTS.completion * parts.completion +
    READINESS_WEIGHTS.calibration * (parts.calibration === null ? 0 : 1 - parts.calibration);
  return { value, parts };
}

export function roleWeight(topicRoles: Role[], priorities: Role[]): number {
  if (priorities[0] && topicRoles.includes(priorities[0])) return 3;
  if (topicRoles.some((r) => priorities.includes(r))) return 2;
  return 1;
}

export type WeakArea = { topic: CatalogTopic; mastery: number | null; overdueDays: number; priority: number };

/** Same formula as the week 16 remediation lesson, so learners can reproduce it. */
export function weakAreas(p: Progress, catalog: Catalog, today: string, limit = 5): WeakArea[] {
  return catalog.topics
    .map((topic) => {
      const mastery = topicMastery(p, topic.id);
      const card = p.reviews[topic.id];
      const overdueDays = card ? Math.max(0, daysBetween(card.due, today)) : 0;
      if (mastery === null && overdueDays === 0) return null;
      const ret = topicRetention(p, topic.id);
      const priority = roleWeight(topic.roles, p.settings.roles) * (1 - (mastery ?? 0)) * (1 + overdueDays / 7) + 0.5 * (1 - (ret ?? 1));
      return { topic, mastery, overdueDays, priority };
    })
    .filter((w): w is WeakArea => w !== null && (w.mastery === null || w.mastery < 0.7 || w.overdueDays > 0))
    .sort((a, b) => b.priority - a.priority || a.topic.title.localeCompare(b.topic.title))
    .slice(0, limit);
}

export function dueReviews(p: Progress, catalog: Pick<Catalog, "topics">, today: string): { topic: CatalogTopic; due: string; overdueDays: number }[] {
  return catalog.topics
    .filter((t) => p.reviews[t.id] && p.reviews[t.id]!.due <= today)
    .map((t) => ({ topic: t, due: p.reviews[t.id]!.due, overdueDays: daysBetween(p.reviews[t.id]!.due, today) }))
    .sort((a, b) => a.due.localeCompare(b.due) || a.topic.title.localeCompare(b.topic.title));
}

export function masteryByDomain(p: Progress, catalog: Catalog) {
  const byDomain = new Map<string, { attempted: number; total: number; sum: number }>();
  for (const t of catalog.topics) {
    const entry = byDomain.get(t.domain) ?? { attempted: 0, total: 0, sum: 0 };
    entry.total++;
    const m = topicMastery(p, t.id);
    if (m !== null) {
      entry.attempted++;
      entry.sum += m;
    }
    byDomain.set(t.domain, entry);
  }
  return [...byDomain.entries()].map(([domain, e]) => ({ domain, attempted: e.attempted, total: e.total, mastery: e.attempted ? e.sum / e.attempted : null }));
}
