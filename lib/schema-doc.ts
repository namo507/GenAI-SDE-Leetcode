/** Builds the portable JSON Schema document (docs/curriculum.schema.json) from the Zod contracts. */
import { z } from "zod";
import { CurriculumSchema, GlossaryTermSchema, SCHEMA_VERSION } from "@/lib/curriculum";
import { MockLoopSchema, PracticeSetSchema, ProjectSchema } from "@/lib/content-types";

const toSchema = (schema: z.ZodType) => z.toJSONSchema(schema, { target: "draft-2020-12", io: "input", unrepresentable: "any" });

export function buildSchemaDocument() {
  return {
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
}
