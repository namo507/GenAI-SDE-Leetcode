import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { curriculum, glossary, mockLoops, practiceSets, projects } from "@/content";
import { CATEGORIES, CurriculumSchema, DAY_KINDS, FlowSchema, ROLES, SCHEMA_VERSION, categoryOf } from "@/lib/curriculum";
import { buildSchemaDocument } from "@/lib/schema-doc";
import { SUPPORTED_R_EXPECTATIONS } from "@/lib/runtime/harness";

describe("curriculum contract", () => {
  it("has exactly 16 weeks of 7 days in the fixed day order", () => {
    expect(curriculum.weeks).toHaveLength(16);
    for (const w of curriculum.weeks) {
      expect(w.days).toHaveLength(7);
      expect(w.days.map((d) => d.kind)).toEqual([...DAY_KINDS]);
    }
  });

  it("gives every topic an ELI5 analogy limit, senior trade-offs, a flow and practice", () => {
    for (const t of curriculum.topics) {
      expect(t.eli5.analogyLimit.length, t.id).toBeGreaterThan(20);
      expect(t.senior.tradeoffs.length, t.id).toBeGreaterThanOrEqual(2);
      expect(t.flow.steps.length, t.id).toBeGreaterThanOrEqual(2);
      expect(t.practice.length, t.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("pairs runnable Python and R with real expected output and tests", () => {
    const withCode = curriculum.topics.filter((t) => t.implementation);
    expect(withCode.length).toBeGreaterThanOrEqual(90);
    for (const t of withCode) {
      const impl = t.implementation!;
      expect(impl.expectedOutput, t.id).not.toMatch(/PENDING/);
      expect(impl.tests.python, t.id).toMatch(/def test_/);
      expect(impl.tests.r, t.id).toMatch(/test_that\(/);
      const used = [...impl.tests.r.matchAll(/\b(expect_[a-z_]+)\(/g)].map((m) => m[1]);
      for (const fn of used) expect(SUPPORTED_R_EXPECTATIONS as readonly string[], `${t.id} uses ${fn}`).toContain(fn);
    }
  });

  it("gives every paired example an ELI5 code walkthrough that covers both languages", () => {
    for (const t of curriculum.topics.filter((x) => x.implementation)) {
      const steps = t.implementation!.walkthrough ?? [];
      expect(steps.length, t.id).toBeGreaterThanOrEqual(3);
      for (const s of steps) expect(s.eli5.length, t.id).toBeGreaterThan(20);
    }
  });

  it("covers every category and every role with a real body of topics", () => {
    for (const c of CATEGORIES) {
      const n = curriculum.topics.filter((t) => categoryOf(t.domain).id === c.id).length;
      expect(n, c.id).toBeGreaterThanOrEqual(3);
    }
    for (const role of ROLES) {
      const n = curriculum.topics.filter((t) => t.roles.includes(role)).length;
      expect(n, role).toBeGreaterThanOrEqual(20);
    }
  });

  it("rejects a topic referenced before it is taught", () => {
    const weeks = structuredClone(curriculum.weeks);
    weeks[0]!.days[0]!.topicIds = [...weeks[0]!.days[0]!.topicIds, "w02-d01-joins-and-keys"];
    const result = CurriculumSchema.safeParse({ schemaVersion: SCHEMA_VERSION, weeks, topics: curriculum.topics });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toMatch(/before it is taught/);
  });

  it("rejects a flow step that points at a missing node", () => {
    const flow = structuredClone(curriculum.topics[0]!.flow);
    flow.steps[0]!.nodes.push("does-not-exist");
    expect(FlowSchema.safeParse(flow).success).toBe(false);
  });

  it("keeps glossary, drills, projects and loops pointing at real topics and terms", () => {
    const topicIds = new Set(curriculum.topics.map((t) => t.id));
    const slugs = new Set(glossary.map((g) => g.slug));
    for (const g of glossary) {
      g.topicIds.forEach((id) => expect(topicIds.has(id), `${g.slug} -> ${id}`).toBe(true));
      g.prerequisites.forEach((p) => expect(slugs.has(p), `${g.slug} needs ${p}`).toBe(true));
    }
    for (const s of practiceSets) for (const d of s.items) d.topicIds.forEach((id) => expect(topicIds.has(id), `${d.id} -> ${id}`).toBe(true));
    for (const p of projects) p.topicIds.forEach((id) => expect(topicIds.has(id), `${p.id} -> ${id}`).toBe(true));
    for (const l of mockLoops) for (const r of l.rounds) r.topicIds.forEach((id) => expect(topicIds.has(id), `${l.id} -> ${id}`).toBe(true));
  });

  it("contains no em dashes or placeholder text", () => {
    const text = JSON.stringify({ curriculum, glossary, practiceSets, projects, mockLoops });
    expect(text).not.toMatch(/—/);
    expect(text).not.toMatch(/lorem ipsum|TODO|TBD/i);
  });

  it("ships a JSON Schema file that matches the Zod contract", () => {
    const committed = JSON.parse(readFileSync(join(process.cwd(), "docs/curriculum.schema.json"), "utf8"));
    expect(committed).toEqual(JSON.parse(JSON.stringify(buildSchemaDocument())));
    expect(committed.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
  });
});
