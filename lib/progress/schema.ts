/**
 * Learner progress, stored locally in the browser. Completion, mastery,
 * confidence and retention are derived from separate records and are never
 * merged into one another (see lib/progress/metrics.ts).
 */
import { z } from "zod";
import { ROLES, LANGUAGES } from "@/lib/curriculum";
import { ROUND_KINDS } from "@/lib/content-types";

export const STORAGE_KEY = "techprep-os:progress:v1";
export const PROGRESS_VERSION = 1;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const SettingsSchema = z.object({
  roles: z.array(z.enum(ROLES)).min(1),
  startDate: isoDate,
  minutesPerDay: z.number().int().min(15).max(240),
  language: z.enum(LANGUAGES),
  theme: z.enum(["system", "light", "dark"]),
  motion: z.enum(["system", "reduce", "full"]),
  autoplayFlows: z.boolean(),
  onboarded: z.boolean(),
});

/** Confidence levels shown to the learner with the probability each one claims. */
export const CONFIDENCE_LEVELS = [
  { value: 1, label: "Guessing", probability: 0.2 },
  { value: 2, label: "Unsure", probability: 0.4 },
  { value: 3, label: "Fairly sure", probability: 0.6 },
  { value: 4, label: "Sure", probability: 0.8 },
  { value: 5, label: "Certain", probability: 0.95 },
] as const;

export const AttemptSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  topicId: z.string().nullable(),
  source: z.enum(["topic-practice", "drill", "review", "mock"]),
  at: z.string(),
  confidence: z.number().int().min(1).max(5),
  correct: z.boolean(),
});

export const ReviewCardSchema = z.object({
  due: isoDate,
  interval: z.number().min(0),
  ease: z.number().min(1.3).max(3),
  reps: z.number().int().min(0),
  lapses: z.number().int().min(0),
  lastReviewed: isoDate.nullable(),
});

export const ReviewLogSchema = z.object({
  topicId: z.string(),
  at: isoDate,
  due: isoDate,
  /** 0 again, 1 hard, 2 good, 3 easy */
  grade: z.number().int().min(0).max(3),
});

export const DayRecordSchema = z.object({
  status: z.enum(["in-progress", "done"]),
  updatedAt: z.string(),
  minutesSpent: z.number().int().min(0).max(600).nullable(),
});

export const MockResultSchema = z.object({
  id: z.string(),
  loopId: z.string(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  rounds: z.array(
    z.object({
      kind: z.enum(ROUND_KINDS),
      title: z.string(),
      plannedSeconds: z.number().int().min(0),
      usedSeconds: z.number().int().min(0),
      /** 0 Not yet, 1 Partial, 2 Solid, 3 Strong */
      score: z.number().int().min(0).max(3).nullable(),
      notes: z.string(),
    }),
  ),
});

export const ProgressSchema = z.object({
  version: z.literal(PROGRESS_VERSION),
  settings: SettingsSchema,
  days: z.record(z.string(), DayRecordSchema),
  attempts: z.array(AttemptSchema),
  reviews: z.record(z.string(), ReviewCardSchema),
  reviewLog: z.array(ReviewLogSchema),
  mocks: z.array(MockResultSchema),
});

export type Settings = z.infer<typeof SettingsSchema>;
export type Attempt = z.infer<typeof AttemptSchema>;
export type ReviewCard = z.infer<typeof ReviewCardSchema>;
export type ReviewLogEntry = z.infer<typeof ReviewLogSchema>;
export type DayRecord = z.infer<typeof DayRecordSchema>;
export type MockResult = z.infer<typeof MockResultSchema>;
export type Progress = z.infer<typeof ProgressSchema>;

export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function defaultProgress(today: string = todayIso()): Progress {
  return {
    version: PROGRESS_VERSION,
    settings: {
      roles: [...ROLES],
      startDate: today,
      minutesPerDay: 90,
      language: "python",
      theme: "system",
      motion: "system",
      autoplayFlows: false,
      onboarded: false,
    },
    days: {},
    attempts: [],
    reviews: {},
    reviewLog: [],
    mocks: [],
  };
}
