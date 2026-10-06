import { CurriculumSchema, GlossaryTermSchema, SCHEMA_VERSION, type Curriculum, type GlossaryTerm } from "@/lib/curriculum";
import { MockLoopSchema, PracticeSetSchema, ProjectSchema, type MockLoop, type PracticeSet, type Project } from "@/lib/content-types";
import { rawTopics, rawWeeks } from "./raw";
import { glossary as rawGlossary } from "./glossary";
import { practiceSets as rawPracticeSets } from "./practice";
import { projects as rawProjects } from "./projects";
import { mockLoops as rawMockLoops } from "./interviews";

/** The validated curriculum. Parsing throws at build time if any contract is broken. */
export const curriculum: Curriculum = CurriculumSchema.parse({
  schemaVersion: SCHEMA_VERSION,
  weeks: rawWeeks,
  topics: rawTopics,
});

export const glossary: GlossaryTerm[] = rawGlossary.map((t) => GlossaryTermSchema.parse(t));
export const practiceSets: PracticeSet[] = rawPracticeSets.map((s) => PracticeSetSchema.parse(s));
export const projects: Project[] = rawProjects.map((p) => ProjectSchema.parse(p));
export const mockLoops: MockLoop[] = rawMockLoops.map((l) => MockLoopSchema.parse(l));
