/**
 * Writes docs/curriculum.schema.json from the Zod contract in lib/curriculum.ts,
 * so authors and external tools validate content against the same rules.
 * Cross-reference checks (orphans, prerequisites, flow node ids) live in the
 * Zod refinements and scripts/validate-content.ts; JSON Schema cannot express them.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { CurriculumSchema, GlossaryTermSchema, SCHEMA_VERSION } from "@/lib/curriculum";
import { MockLoopSchema, PracticeSetSchema, ProjectSchema } from "@/lib/content-types";

const toSchema = (schema: z.ZodType) => z.toJSONSchema(schema, { target: "draft-2020-12", io: "input", unrepresentable: "any" });

const doc = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: `urn:techprep-os:curriculum:${SCHEMA_VERSION}`,
  title: "TechPrep OS curriculum",
  description: `Portable contract for TechPrep OS content, version ${SCHEMA_VERSION}. Generated from lib/curriculum.ts; do not edit by hand.`,
  ...toSchema(CurriculumSchema),
  $defs: {
    GlossaryTerm: toSchema(GlossaryTermSchema),
    PracticeSet: toSchema(PracticeSetSchema),
    Project: toSchema(ProjectSchema),
    MockLoop: toSchema(MockLoopSchema),
  },
};

const out = join(process.cwd(), "docs/curriculum.schema.json");
writeFileSync(out, JSON.stringify(doc, null, 2) + "\n");
console.log(`wrote ${out}`);
