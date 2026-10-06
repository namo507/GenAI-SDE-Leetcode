/**
 * Validates every content contract and prints content counts.
 * Run with: npm run validate
 */
import { CurriculumSchema, GlossaryTermSchema, SCHEMA_VERSION } from "@/lib/curriculum";
import { SUPPORTED_R_EXPECTATIONS } from "@/lib/runtime/harness";
import { rawTopics, rawWeeks } from "@/content/raw";
import { glossary } from "@/content/glossary";
import { practiceSets } from "@/content/practice";
import { projects } from "@/content/projects";
import { mockLoops } from "@/content/interviews";
import { MockLoopSchema, PracticeSetSchema, ProjectSchema } from "@/lib/content-types";

const problems: string[] = [];

const parsed = CurriculumSchema.safeParse({ schemaVersion: SCHEMA_VERSION, weeks: rawWeeks, topics: rawTopics });
if (!parsed.success) {
  for (const issue of parsed.error.issues) problems.push(`curriculum ${issue.path.join(".")}: ${issue.message}`);
}

const topicIds = new Set(rawTopics.map((t) => t.id));
const text = JSON.stringify({ rawWeeks, rawTopics, glossary, practiceSets, projects, mockLoops });
if (text.includes("—")) problems.push("Content contains an em dash; use commas, colons or parentheses instead.");
if (/lorem ipsum/i.test(text)) problems.push("Content contains placeholder text.");

for (const t of rawTopics) {
  const tests = t.implementation?.tests.r ?? "";
  for (const m of tests.matchAll(/\bexpect_[a-z_]+/g)) {
    if (!(SUPPORTED_R_EXPECTATIONS as readonly string[]).includes(m[0])) problems.push(`${t.id}: R test uses ${m[0]}, which the browser shim does not implement`);
  }
  if (t.implementation && !/\bdef test_/.test(t.implementation.tests.python)) problems.push(`${t.id}: Python tests need at least one test_ function`);
  if (t.implementation && !/test_that\(/.test(t.implementation.tests.r)) problems.push(`${t.id}: R tests need at least one test_that block`);
}

const slugs = new Set<string>();
for (const term of glossary) {
  const r = GlossaryTermSchema.safeParse(term);
  if (!r.success) problems.push(`glossary ${term.slug}: ${r.error.issues.map((i) => i.message).join("; ")}`);
  if (slugs.has(term.slug)) problems.push(`glossary: duplicate slug ${term.slug}`);
  slugs.add(term.slug);
  for (const id of term.topicIds ?? []) if (!topicIds.has(id)) problems.push(`glossary ${term.slug}: unknown topic ${id}`);
}
for (const term of glossary) for (const p of term.prerequisites ?? []) if (!slugs.has(p)) problems.push(`glossary ${term.slug}: unknown prerequisite ${p}`);

const parseAll = (label: string, items: unknown[], schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } } }) =>
  items.forEach((item, i) => {
    const r = schema.safeParse(item);
    if (!r.success) for (const issue of r.error!.issues) problems.push(`${label}[${i}] ${issue.path.join(".")}: ${issue.message}`);
  });
parseAll("practiceSets", practiceSets, PracticeSetSchema);
parseAll("projects", projects, ProjectSchema);
parseAll("mockLoops", mockLoops, MockLoopSchema);
const drillIds = new Set<string>();
for (const set of practiceSets) for (const item of set.items) {
  if (drillIds.has(item.id)) problems.push(`practice: duplicate drill id ${item.id}`);
  drillIds.add(item.id);
  if (item.kind === "choice" && item.correct >= item.options.length) problems.push(`practice ${item.id}: correct index out of range`);
  if (item.kind === "code") {
    for (const m of item.r.tests.matchAll(/\bexpect_[a-z_]+/g)) {
      if (!(SUPPORTED_R_EXPECTATIONS as readonly string[]).includes(m[0])) problems.push(`practice ${item.id}: R test uses ${m[0]}, which the browser shim does not implement`);
    }
    if (!/\bdef test_/.test(item.python.tests)) problems.push(`practice ${item.id}: Python tests need at least one test_ function`);
    if (!/test_that\(/.test(item.r.tests)) problems.push(`practice ${item.id}: R tests need at least one test_that block`);
  }
}
const withoutWalkthrough = rawTopics.filter((t) => t.implementation && !t.implementation.walkthrough).map((t) => t.id);
if (process.env.REQUIRE_WALKTHROUGH && withoutWalkthrough.length) problems.push(`Topics without a code walkthrough: ${withoutWalkthrough.join(", ")}`);

for (const set of practiceSets) for (const item of set.items) for (const id of item.topicIds) if (!topicIds.has(id)) problems.push(`practice ${item.id}: unknown topic ${id}`);
for (const p of projects) for (const id of p.topicIds) if (!topicIds.has(id)) problems.push(`project ${p.id}: unknown topic ${id}`);
for (const loop of mockLoops) for (const round of loop.rounds) for (const id of round.topicIds) if (!topicIds.has(id)) problems.push(`mock ${loop.id}: unknown topic ${id}`);

const weeks = rawWeeks.length;
const days = rawWeeks.reduce((n, w) => n + w.days.length, 0);
const withCode = rawTopics.filter((t) => t.implementation).length;
const practiceItems = rawTopics.reduce((n, t) => n + t.practice.length, 0) + practiceSets.reduce((n, s) => n + s.items.length, 0);
const flowSteps = rawTopics.reduce((n, t) => n + t.flow.steps.length, 0);
const walkthroughs = rawTopics.filter((t) => t.implementation?.walkthrough).length;
const codeProblems = practiceSets.reduce((n, s) => n + s.items.filter((i) => i.kind === "code").length, 0);
console.log(
  `weeks=${weeks} days=${days} topics=${rawTopics.length} paired_examples=${withCode} flow_steps=${flowSteps} ` +
    `walkthroughs=${walkthroughs} practice_items=${practiceItems} coding_problems=${codeProblems} glossary_terms=${glossary.length} projects=${projects.length} mock_loops=${mockLoops.length}`,
);

if (problems.length) {
  console.error(problems.map((p) => `- ${p}`).join("\n"));
  process.exit(1);
}
console.log("All content contracts hold.");
