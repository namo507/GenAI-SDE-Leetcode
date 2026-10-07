/**
 * Canonical content contract for TechPrep OS.
 *
 * Every week, day and topic in /content is parsed with these schemas at build
 * time (scripts/validate-content.ts) and in unit tests. The portable JSON Schema
 * in docs/curriculum.schema.json is generated from this file
 * (scripts/generate-schema.ts), so external tools and authors share one contract.
 */
import { z } from "zod";

export const SCHEMA_VERSION = "1.0.0";

export const ROLES = ["sde", "data-scientist", "data-analyst", "ml-engineer", "genai-engineer", "data-engineer"] as const;
export const ROLE_LABELS: Record<Role, string> = {
  sde: "Software engineer",
  "data-scientist": "Data scientist",
  "data-analyst": "Data analyst",
  "ml-engineer": "ML engineer",
  "genai-engineer": "GenAI engineer",
  "data-engineer": "Data engineer",
};

export const DOMAINS = [
  "foundations",
  "sql",
  "dsa",
  "statistics",
  "analytics",
  "ml",
  "advanced-ml",
  "deep-learning",
  "system-design",
  "data-engineering",
  "cloud",
  "mlops",
  "llm",
  "rag",
  "agents",
  "career",
] as const;
export const DOMAIN_LABELS: Record<Domain, string> = {
  foundations: "Foundations",
  sql: "SQL and data modeling",
  dsa: "Data structures and algorithms",
  statistics: "Statistics and experimentation",
  analytics: "Analytics and visualization",
  ml: "Classical ML",
  "advanced-ml": "Advanced ML and causal inference",
  "deep-learning": "Deep learning",
  "system-design": "System design",
  "data-engineering": "Data engineering",
  cloud: "Cloud computing",
  mlops: "MLOps and deployment",
  llm: "LLMs and GenAI",
  rag: "RAG and evaluation",
  agents: "Agentic systems",
  career: "Capstones and interviews",
};

/** Library categories: how learners browse topics. Each domain belongs to exactly one category. */
export const CATEGORIES = [
  { id: "foundations", label: "Foundations", domains: ["foundations"], blurb: "Python and R side by side, complexity, recursion, testing and data wrangling." },
  { id: "dsa", label: "Data structures and algorithms", domains: ["dsa"], blurb: "Arrays to graphs, the patterns behind coding interviews." },
  { id: "sql", label: "SQL and data modeling", domains: ["sql"], blurb: "Query order, joins, windows, indexes, transactions and dimensional models." },
  { id: "statistics", label: "Statistics and experimentation", domains: ["statistics"], blurb: "Distributions, inference, A/B tests, power and Bayesian thinking." },
  { id: "analytics", label: "Analytics and BI", domains: ["analytics"], blurb: "EDA, metrics, funnels, cohorts, segmentation, root cause and dashboards." },
  { id: "ml", label: "Machine learning", domains: ["ml", "advanced-ml"], blurb: "From leakage-free splits to boosting, recommenders, causal inference and interpretability." },
  { id: "deep-learning", label: "Deep learning", domains: ["deep-learning"], blurb: "Backpropagation, optimizers, CNNs, RNNs, attention and training at scale." },
  { id: "genai", label: "GenAI and LLMs", domains: ["llm", "rag", "agents"], blurb: "Tokens to agents: prompting, fine-tuning, retrieval, evaluation and guardrails." },
  { id: "system-design", label: "System design", domains: ["system-design"], blurb: "Estimation, APIs, caching, queues, consistency, storage and rate limiting." },
  { id: "data-engineering", label: "Data engineering", domains: ["data-engineering"], blurb: "Pipelines, file formats, Spark, streaming, lakehouses and data quality." },
  { id: "cloud", label: "Cloud and MLOps", domains: ["cloud", "mlops"], blurb: "Compute, containers, storage, networking, IAM, cost, CI/CD and model operations." },
  { id: "career", label: "Interviews and capstones", domains: ["career"], blurb: "Capstone scoping, behavioral stories, product cases and remediation." },
] as const satisfies readonly { id: string; label: string; domains: readonly Domain[]; blurb: string }[];
export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const categoryOf = (domain: Domain): (typeof CATEGORIES)[number] => CATEGORIES.find((c) => (c.domains as readonly Domain[]).includes(domain))!;

export const TRACKS = ["core", "data", "ai", "platform", "capstone"] as const;
export const TRACK_LABELS: Record<Track, string> = {
  core: "Core engineering",
  data: "Data science",
  ai: "AI",
  platform: "Platform",
  capstone: "Capstone",
};

export const DAY_KINDS = [
  "concept-map",
  "theory-lab",
  "implementation",
  "applied-practice",
  "production-lens",
  "interview-simulation",
  "review",
] as const;
export const DAY_KIND_LABELS: Record<DayKind, string> = {
  "concept-map": "Concept map",
  "theory-lab": "Theory lab",
  implementation: "Implementation",
  "applied-practice": "Applied practice",
  "production-lens": "Production lens",
  "interview-simulation": "Interview simulation",
  review: "Review",
};

export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export const PRACTICE_TYPES = ["recall", "code", "design", "case"] as const;
export const LANGUAGES = ["python", "r"] as const;

export type Role = (typeof ROLES)[number];
export type Domain = (typeof DOMAINS)[number];
export type Track = (typeof TRACKS)[number];
export type DayKind = (typeof DAY_KINDS)[number];
export type Difficulty = (typeof DIFFICULTIES)[number];
export type Language = (typeof LANGUAGES)[number];

/** Packages a learner may import. Anything else is refused before execution. */
export const PYTHON_PACKAGE_ALLOWLIST = ["numpy", "pandas", "scipy", "scikit-learn", "statsmodels", "networkx", "sqlite3"] as const;
export const R_PACKAGE_ALLOWLIST = [
  "base",
  "stats",
  "utils",
  "methods",
  "datasets",
  "graphics",
  "grDevices",
  "tools",
  "grid",
  "splines",
  "stats4",
  "MASS",
  "Matrix",
  "survival",
  "jsonlite",
] as const;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const TOPIC_ID_PATTERN = /^w(0[1-9]|1[0-6])-d0[1-7]-[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const DAY_ID_PATTERN = /^w(0[1-9]|1[0-6])-d0[1-7]$/;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const TopicIdSchema = z.string().regex(TOPIC_ID_PATTERN, "Topic ids look like w03-d02-sliding-window");
export const DayIdSchema = z.string().regex(DAY_ID_PATTERN, "Day ids look like w03-d02");

const nonEmpty = z.string().trim().min(1);

export const CodeSampleSchema = z.object({
  code: nonEmpty,
  /** Non-base packages the sample needs; each must be on the language allowlist. */
  packages: z.array(nonEmpty).default([]),
});

/**
 * One step of the ELI5 code walkthrough. `python` and `r` are exact substrings
 * of the first line to highlight in each program; the walkthrough highlights
 * that line plus the following `pythonLines - 1` (or `rLines - 1`) lines.
 */
export const WalkthroughStepSchema = z.object({
  python: nonEmpty,
  r: nonEmpty,
  pythonLines: z.number().int().min(1).max(40).default(1),
  rLines: z.number().int().min(1).max(40).default(1),
  eli5: nonEmpty,
});

/** Index of the first line at or after `from` containing `anchor`, or -1. Shared by validation and the UI. */
export function findAnchorLine(code: string, anchor: string, from = 0): number {
  const lines = code.split("\n");
  for (let i = Math.max(0, from); i < lines.length; i++) if (lines[i]!.includes(anchor)) return i;
  for (let i = 0; i < Math.min(from, lines.length); i++) if (lines[i]!.includes(anchor)) return i;
  return -1;
}

export const ImplementationSchema = z.object({
  /** One sentence: the problem both programs solve. */
  problem: nonEmpty,
  /** The shared input, stated once so learners can see both programs use it. */
  input: nonEmpty,
  python: CodeSampleSchema,
  r: CodeSampleSchema,
  /**
   * Exact stdout both programs print. CI runs each program and compares
   * normalized output (trailing whitespace trimmed per line) with this text,
   * so the pair must print identical text, not just equivalent values.
   */
  expectedOutput: nonEmpty,
  tests: z.object({
    /** Plain assert-based test functions named test_*; run after the sample code. */
    python: nonEmpty,
    /** testthat test_that() blocks; run after the sample code. */
    r: nonEmpty,
  }),
  /** Plain-language walkthrough of what happens to the input, step by step. */
  eli5Trace: z.array(nonEmpty).min(2),
  complexity: z.object({ time: nonEmpty, space: nonEmpty, note: z.string().optional() }),
  edgeCases: z.array(nonEmpty).min(2),
  incorrect: z.object({
    language: z.enum(["python", "r", "sql"]),
    code: nonEmpty,
    whyWrong: nonEmpty,
    fix: nonEmpty,
  }),
  /** "Explain the code like I'm five": a guided tour over both programs. */
  walkthrough: z.array(WalkthroughStepSchema).min(3).optional(),
}).superRefine((impl, ctx) => {
  impl.walkthrough?.forEach((s, i) => {
    for (const lang of ["python", "r"] as const) {
      const codeText = impl[lang].code;
      const line = findAnchorLine(codeText, s[lang]);
      const span = lang === "python" ? s.pythonLines : s.rLines;
      if (line < 0) ctx.addIssue({ code: "custom", path: ["walkthrough", i, lang], message: `Walkthrough step ${i + 1}: "${s[lang]}" is not in the ${lang} code` });
      else if (line + span > codeText.split("\n").length) ctx.addIssue({ code: "custom", path: ["walkthrough", i], message: `Walkthrough step ${i + 1}: ${lang} span runs past the end of the code` });
    }
  });
});

export const FlowNodeSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]+$/),
  label: nonEmpty,
  detail: z.string().optional(),
  x: z.number(),
  y: z.number(),
});
export const FlowEdgeSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]+$/),
  source: nonEmpty,
  target: nonEmpty,
  label: z.string().optional(),
});
export const FlowStepSchema = z.object({
  nodes: z.array(nonEmpty),
  edges: z.array(nonEmpty),
  narration: nonEmpty,
});

export const FlowSchema = z
  .object({
    title: nonEmpty,
    nodes: z.array(FlowNodeSchema).min(2),
    edges: z.array(FlowEdgeSchema).min(1),
    steps: z.array(FlowStepSchema).min(2),
  })
  .superRefine((flow, ctx) => {
    const nodeIds = new Set(flow.nodes.map((n) => n.id));
    const edgeIds = new Set(flow.edges.map((e) => e.id));
    if (nodeIds.size !== flow.nodes.length) ctx.addIssue({ code: "custom", message: "Duplicate flow node id" });
    if (edgeIds.size !== flow.edges.length) ctx.addIssue({ code: "custom", message: "Duplicate flow edge id" });
    flow.edges.forEach((e, i) => {
      if (!nodeIds.has(e.source)) ctx.addIssue({ code: "custom", path: ["edges", i, "source"], message: `Unknown node ${e.source}` });
      if (!nodeIds.has(e.target)) ctx.addIssue({ code: "custom", path: ["edges", i, "target"], message: `Unknown node ${e.target}` });
    });
    flow.steps.forEach((s, i) => {
      s.nodes.forEach((id) => {
        if (!nodeIds.has(id)) ctx.addIssue({ code: "custom", path: ["steps", i, "nodes"], message: `Step ${i + 1} activates unknown node ${id}` });
      });
      s.edges.forEach((id) => {
        if (!edgeIds.has(id)) ctx.addIssue({ code: "custom", path: ["steps", i, "edges"], message: `Step ${i + 1} activates unknown edge ${id}` });
      });
    });
  });

export const PracticeItemSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  type: z.enum(PRACTICE_TYPES),
  prompt: nonEmpty,
  /** Model answer or worked solution. */
  answer: nonEmpty,
  /** Points a strong answer covers; used for self-grading. */
  rubric: z.array(nonEmpty).default([]),
  hints: z.array(nonEmpty).default([]),
});

export const ReferenceSchema = z.object({
  title: nonEmpty,
  url: z.url().optional(),
  note: z.string().optional(),
  /** True when the content depends on a library, model or service version that changes. */
  versionSensitive: z.boolean().default(false),
});

export const TopicSchema = z.object({
  id: TopicIdSchema,
  slug: z.string().regex(slugPattern),
  title: nonEmpty,
  domain: z.enum(DOMAINS),
  roles: z.array(z.enum(ROLES)).min(1),
  difficulty: z.enum(DIFFICULTIES),
  minutes: z.number().int().min(10).max(240),
  prerequisites: z.array(TopicIdSchema).default([]),
  objectives: z.array(nonEmpty).min(2),
  summary: nonEmpty,
  eli5: z.object({
    analogy: nonEmpty,
    steps: z.array(nonEmpty).min(2),
    /** Where the analogy stops being true. Required so ELI5 never misleads. */
    analogyLimit: nonEmpty,
  }),
  senior: z.object({
    definition: nonEmpty,
    /** Assumptions and invariants the mechanism relies on. */
    invariants: z.array(nonEmpty).min(1),
    mechanism: z.array(nonEmpty).min(2),
    complexity: nonEmpty,
    tradeoffs: z
      .array(z.object({ option: nonEmpty, choose: nonEmpty, cost: nonEmpty }))
      .min(2),
    failureModes: z.array(nonEmpty).min(2),
    production: nonEmpty,
    interviewAnswer: nonEmpty,
  }),
  /** Omitted only when code is not applicable (for example behavioral stories). */
  implementation: ImplementationSchema.optional(),
  /** Static, non-runnable reference code for libraries the browser cannot run (for example PyTorch). */
  referenceSnippet: z
    .object({ language: nonEmpty, label: nonEmpty, code: nonEmpty })
    .optional(),
  flow: FlowSchema,
  practice: z.array(PracticeItemSchema).min(2),
  references: z.array(ReferenceSchema).min(1),
  lastReviewed: isoDate,
});

export const ProductionCaseSchema = z.object({
  title: nonEmpty,
  scenario: nonEmpty,
  constraints: z.array(nonEmpty).min(2),
  questions: z.array(nonEmpty).min(2),
  rubric: z.array(nonEmpty).min(3),
  pitfalls: z.array(nonEmpty).min(1),
});

export const DayTaskSchema = z.object({ label: nonEmpty, minutes: z.number().int().min(5).max(180) });

export const DaySchema = z.object({
  id: DayIdSchema,
  day: z.number().int().min(1).max(7),
  kind: z.enum(DAY_KINDS),
  /** Lets a domain rename the kind label (for example "Capstone build") without changing order. */
  label: z.string().optional(),
  title: nonEmpty,
  summary: nonEmpty,
  minutes: z.number().int().min(15).max(240),
  goals: z.array(nonEmpty).min(1),
  tasks: z.array(DayTaskSchema).min(1),
  /** Topics taught (anchored here) or practiced/reviewed on this day. */
  topicIds: z.array(TopicIdSchema).default([]),
  productionCase: ProductionCaseSchema.optional(),
});

export const WeekSchema = z.object({
  number: z.number().int().min(1).max(16),
  slug: z.string().regex(slugPattern),
  title: nonEmpty,
  track: z.enum(TRACKS),
  domains: z.array(z.enum(DOMAINS)).min(1),
  summary: nonEmpty,
  outcomes: z.array(nonEmpty).min(2),
  roles: z.array(z.enum(ROLES)).min(1),
  days: z.array(DaySchema).length(7),
});

export const CurriculumSchema = z
  .object({
    schemaVersion: z.literal(SCHEMA_VERSION),
    weeks: z.array(WeekSchema).length(16),
    topics: z.array(TopicSchema).min(1),
  })
  .superRefine((c, ctx) => {
    const issue = (message: string, path: (string | number)[] = []) => ctx.addIssue({ code: "custom", message, path });

    c.weeks.forEach((w, wi) => {
      if (w.number !== wi + 1) issue(`Week at index ${wi} is numbered ${w.number}; weeks must be chronological 1..16`, ["weeks", wi]);
      w.days.forEach((d, di) => {
        const expected = `w${String(w.number).padStart(2, "0")}-d${String(di + 1).padStart(2, "0")}`;
        if (d.day !== di + 1 || d.id !== expected) issue(`Day ${d.id} should be ${expected}`, ["weeks", wi, "days", di]);
        const taskMinutes = d.tasks.reduce((sum, t) => sum + t.minutes, 0);
        if (taskMinutes !== d.minutes) issue(`${d.id}: tasks add up to ${taskMinutes} min but the day says ${d.minutes}`, ["weeks", wi, "days", di]);
        if (d.kind === "production-lens" && !d.productionCase) issue(`${d.id}: production-lens days need a productionCase`, ["weeks", wi, "days", di]);
      });
      const order = w.days.map((d) => DAY_KINDS.indexOf(d.kind));
      if (order.some((k, i) => i > 0 && k < order[i - 1]!)) issue(`Week ${w.number}: day kinds must keep prerequisite order`, ["weeks", wi]);
    });

    const topicIds = new Set<string>();
    const slugs = new Set<string>();
    const dayIndex = new Map<string, number>();
    c.weeks.flatMap((w) => w.days).forEach((d, i) => dayIndex.set(d.id, i));

    c.topics.forEach((t, ti) => {
      if (topicIds.has(t.id)) issue(`Duplicate topic id ${t.id}`, ["topics", ti]);
      if (slugs.has(t.slug)) issue(`Duplicate topic slug ${t.slug}`, ["topics", ti]);
      topicIds.add(t.id);
      slugs.add(t.slug);
      if (!t.id.endsWith(`-${t.slug}`)) issue(`${t.id}: id must end with its slug ${t.slug}`, ["topics", ti]);
      const anchor = t.id.slice(0, 7);
      if (!dayIndex.has(anchor)) issue(`${t.id}: anchor day ${anchor} does not exist`, ["topics", ti]);
    });

    const referenced = new Set<string>();
    c.weeks.forEach((w, wi) =>
      w.days.forEach((d, di) =>
        d.topicIds.forEach((id) => {
          referenced.add(id);
          if (!topicIds.has(id)) issue(`${d.id} references unknown topic ${id}`, ["weeks", wi, "days", di, "topicIds"]);
          else if (dayIndex.get(id.slice(0, 7))! > dayIndex.get(d.id)!) issue(`${d.id} references ${id} before it is taught`, ["weeks", wi, "days", di]);
        }),
      ),
    );

    c.topics.forEach((t, ti) => {
      const anchorDay = c.weeks.flatMap((w) => w.days).find((d) => d.id === t.id.slice(0, 7));
      if (!referenced.has(t.id) || !anchorDay?.topicIds.includes(t.id)) issue(`Orphaned topic ${t.id}: its anchor day must list it`, ["topics", ti]);
      t.prerequisites.forEach((p) => {
        if (!topicIds.has(p)) issue(`${t.id}: unknown prerequisite ${p}`, ["topics", ti, "prerequisites"]);
        else if (dayIndex.get(p.slice(0, 7))! >= dayIndex.get(t.id.slice(0, 7))!) issue(`${t.id}: prerequisite ${p} is not taught earlier`, ["topics", ti, "prerequisites"]);
      });
      const lists = [t.implementation?.python.packages ?? [], t.implementation?.r.packages ?? []];
      lists[0]!.forEach((p) => {
        if (!(PYTHON_PACKAGE_ALLOWLIST as readonly string[]).includes(p)) issue(`${t.id}: Python package ${p} is not allowlisted`, ["topics", ti]);
      });
      lists[1]!.forEach((p) => {
        if (!(R_PACKAGE_ALLOWLIST as readonly string[]).includes(p)) issue(`${t.id}: R package ${p} is not allowlisted`, ["topics", ti]);
      });
    });
  });

export const GlossaryTermSchema = z.object({
  slug: z.string().regex(slugPattern),
  term: nonEmpty,
  definition: nonEmpty,
  seniorNote: z.string().optional(),
  domain: z.enum(DOMAINS),
  topicIds: z.array(TopicIdSchema).default([]),
  /** Glossary slugs a learner should know first. */
  prerequisites: z.array(z.string().regex(slugPattern)).default([]),
});

export type CodeSample = z.infer<typeof CodeSampleSchema>;
export type WalkthroughStep = z.infer<typeof WalkthroughStepSchema>;
export type Implementation = z.infer<typeof ImplementationSchema>;
export type FlowNode = z.infer<typeof FlowNodeSchema>;
export type FlowEdge = z.infer<typeof FlowEdgeSchema>;
export type FlowStep = z.infer<typeof FlowStepSchema>;
export type Flow = z.infer<typeof FlowSchema>;
export type PracticeItem = z.infer<typeof PracticeItemSchema>;
export type Reference = z.infer<typeof ReferenceSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type ProductionCase = z.infer<typeof ProductionCaseSchema>;
export type Day = z.infer<typeof DaySchema>;
export type Week = z.infer<typeof WeekSchema>;
export type Curriculum = z.infer<typeof CurriculumSchema>;
export type GlossaryTerm = z.infer<typeof GlossaryTermSchema>;

/** Input types (before defaults) for authoring content files. */
export type TopicInput = z.input<typeof TopicSchema>;
export type WeekInput = z.input<typeof WeekSchema>;
export type DayInput = z.input<typeof DaySchema>;
export type GlossaryTermInput = z.input<typeof GlossaryTermSchema>;
export type WalkthroughStepInput = z.input<typeof WalkthroughStepSchema>;
