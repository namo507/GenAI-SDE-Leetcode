/**
 * Contracts for the non-lesson content: practice drills, capstone projects and
 * mock interview loops. Lesson content lives in lib/curriculum.ts.
 */
import { z } from "zod";
import { DIFFICULTIES, ROLES, TopicIdSchema } from "@/lib/curriculum";

const nonEmpty = z.string().trim().min(1);
const id = z.string().regex(/^[a-z0-9-]+$/);
const cell = z.union([z.string(), z.number(), z.null()]);

const drillBase = {
  id,
  title: nonEmpty,
  prompt: nonEmpty,
  topicIds: z.array(TopicIdSchema).min(1),
  difficulty: z.enum(DIFFICULTIES),
  hints: z.array(nonEmpty).default([]),
};

/** SQL drills run in the browser against SQLite (Python's sqlite3 inside Pyodide). */
export const SqlDrillSchema = z.object({
  kind: z.literal("sql"),
  ...drillBase,
  setup: nonEmpty,
  solution: nonEmpty,
  expectedColumns: z.array(nonEmpty).min(1),
  /** Verified in CI by running `solution` against `setup` with SQLite. */
  expectedRows: z.array(z.array(cell)),
  orderMatters: z.boolean(),
});

/** Numeric drills: the stored answer is recomputed in CI by `verifyPython`, which must print one number. */
export const NumericDrillSchema = z.object({
  kind: z.literal("numeric"),
  ...drillBase,
  answer: z.number(),
  tolerance: z.number().positive(),
  unit: z.string().optional(),
  solution: nonEmpty,
  verifyPython: nonEmpty,
});

export const DesignDrillSchema = z.object({
  kind: z.literal("design"),
  ...drillBase,
  minutes: z.number().int().min(5).max(90),
  rubric: z.array(nonEmpty).min(3),
  modelAnswer: nonEmpty,
});

export const ChoiceDrillSchema = z.object({
  kind: z.literal("choice"),
  ...drillBase,
  options: z.array(nonEmpty).min(3).max(5),
  correct: z.number().int().min(0),
  explanation: nonEmpty,
});

/**
 * LeetCode-style problems in both languages. CI checks that each reference
 * solution passes its tests (Python asserts; R with real testthat and with the
 * browser shim) and that each starter fails them, so the tests have teeth.
 */
const codeSide = z.object({ starter: nonEmpty, solution: nonEmpty, tests: nonEmpty });
export const CodeProblemSchema = z.object({
  kind: z.literal("code"),
  ...drillBase,
  /** The interview pattern the problem trains, for example "Hash map" or "Sliding window". */
  pattern: nonEmpty,
  examples: z.array(z.object({ input: nonEmpty, output: nonEmpty, note: z.string().optional() })).min(1),
  python: codeSide,
  r: codeSide,
  complexity: nonEmpty,
  /** The idea of the reference solution, explained simply. */
  eli5: nonEmpty,
});

export const DrillSchema = z.discriminatedUnion("kind", [SqlDrillSchema, NumericDrillSchema, DesignDrillSchema, ChoiceDrillSchema, CodeProblemSchema]);

export const PRACTICE_SET_IDS = ["topic-drills", "coding", "sql", "statistics", "concepts", "system-design", "rag-diagnosis"] as const;
export type PracticeSetId = (typeof PRACTICE_SET_IDS)[number];

export const PracticeSetSchema = z.object({
  id: z.enum(PRACTICE_SET_IDS),
  title: nonEmpty,
  description: nonEmpty,
  items: z.array(DrillSchema),
});

export const ProjectSchema = z.object({
  id,
  role: z.enum(ROLES),
  title: nonEmpty,
  summary: nonEmpty,
  user: nonEmpty,
  decision: nonEmpty,
  metric: nonEmpty,
  baseline: nonEmpty,
  data: z.array(z.object({ name: nonEmpty, url: z.url().optional(), note: nonEmpty })).min(1),
  milestones: z.array(z.object({ title: nonEmpty, deliverable: nonEmpty })).min(3),
  rubric: z.array(nonEmpty).min(4),
  stretch: z.array(nonEmpty).min(1),
  topicIds: z.array(TopicIdSchema).min(2),
  weeks: z.number().int().min(1).max(4),
});

export const ROUND_KINDS = ["coding", "sql", "statistics", "ml", "system-design", "genai", "behavioral"] as const;
export type RoundKind = (typeof ROUND_KINDS)[number];

export const MockLoopSchema = z.object({
  id,
  title: nonEmpty,
  roles: z.array(z.enum(ROLES)).min(1),
  summary: nonEmpty,
  rounds: z
    .array(
      z.object({
        kind: z.enum(ROUND_KINDS),
        title: nonEmpty,
        minutes: z.number().int().min(5).max(60),
        topicIds: z.array(TopicIdSchema).min(1),
        /** How many questions to draw from the topics' practice items and interview prompts. */
        questions: z.number().int().min(1).max(4),
      }),
    )
    .min(1),
});

export type SqlDrill = z.infer<typeof SqlDrillSchema>;
export type NumericDrill = z.infer<typeof NumericDrillSchema>;
export type DesignDrill = z.infer<typeof DesignDrillSchema>;
export type ChoiceDrill = z.infer<typeof ChoiceDrillSchema>;
export type CodeProblem = z.infer<typeof CodeProblemSchema>;
export type Drill = z.infer<typeof DrillSchema>;
export type PracticeSet = z.infer<typeof PracticeSetSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type MockLoop = z.infer<typeof MockLoopSchema>;
export type DrillInput = z.input<typeof DrillSchema>;
export type PracticeSetInput = z.input<typeof PracticeSetSchema>;
export type ProjectInput = z.input<typeof ProjectSchema>;
export type MockLoopInput = z.input<typeof MockLoopSchema>;

/** Self-scoring scale for mock rounds, shared by Interviews and Analytics. */
export const ROUND_SCORE_LABELS = ["Not yet", "Partial", "Solid", "Strong"] as const;

export const ROUND_RUBRICS: Record<RoundKind, string[]> = {
  coding: ["Clarified inputs, outputs and edge cases", "Stated an approach and its complexity before coding", "Working, readable code", "Tested with examples and an edge case"],
  sql: ["Stated the grain and keys before writing", "Correct joins without fan-out", "Correct aggregation and window logic", "Explained the row count of the result"],
  statistics: ["Named assumptions", "Chose the right method", "Correct computation", "Plain-language interpretation and decision"],
  ml: ["Framed the problem and label", "Prevented leakage and chose a split", "Picked metrics from error costs", "Discussed failure modes and monitoring"],
  "system-design": ["Clarified requirements and estimated load", "Clear high-level design", "Deep dive with trade-offs", "Reliability, security and cost"],
  genai: ["Grounded the design in evaluation", "Retrieval or tool design with trade-offs", "Guardrails and failure handling", "Cost and latency estimates"],
  behavioral: ["Situation and task in under 30 seconds", "Specific actions in the first person", "Measured, honest result", "Reflection without blame"],
};
