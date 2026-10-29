/**
 * Writes docs/curriculum.schema.json from the Zod contract in lib/curriculum.ts,
 * so authors and external tools validate content against the same rules.
 * Cross-reference checks (orphans, prerequisites, flow node ids) live in the
 * Zod refinements and scripts/validate-content.ts; JSON Schema cannot express them.
 * A unit test fails if the committed file is out of date.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildSchemaDocument } from "@/lib/schema-doc";

const out = join(process.cwd(), "docs/curriculum.schema.json");
writeFileSync(out, JSON.stringify(buildSchemaDocument(), null, 2) + "\n");
console.log(`wrote ${out}`);
