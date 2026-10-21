/** Server-side lookups over the validated content, shared by route files. */
import { curriculum, glossary, mockLoops, practiceSets, projects } from "@/content";
import { buildCatalog } from "@/lib/catalog";
import type { Day, Topic, Week } from "@/lib/curriculum";

export { curriculum, glossary, mockLoops, practiceSets, projects };

export const catalog = buildCatalog(curriculum);

const topicsById = new Map(curriculum.topics.map((t) => [t.id, t]));
const days = curriculum.weeks.flatMap((w) => w.days.map((d) => ({ week: w, day: d })));
const daysById = new Map(days.map((x) => [x.day.id, x]));

export const getTopic = (id: string): Topic | undefined => topicsById.get(id);
export const getDay = (id: string): { week: Week; day: Day } | undefined => daysById.get(id);
export const findTopic = (domain: string, slug: string) => curriculum.topics.find((t) => t.domain === domain && t.slug === slug);
export const anchorDayId = (topicId: string) => topicId.slice(0, 7);

export function neighbors<T>(list: T[], index: number): { prev: T | null; next: T | null } {
  return { prev: index > 0 ? list[index - 1]! : null, next: index < list.length - 1 ? list[index + 1]! : null };
}

export const contentCounts = {
  weeks: curriculum.weeks.length,
  days: days.length,
  topics: curriculum.topics.length,
  pairedExamples: curriculum.topics.filter((t) => t.implementation).length,
  flows: curriculum.topics.length,
  practiceItems: curriculum.topics.reduce((n, t) => n + t.practice.length, 0),
  drills: practiceSets.reduce((n, s) => n + s.items.length, 0),
  productionCases: days.filter((x) => x.day.productionCase).length,
  projects: projects.length,
  mockLoops: mockLoops.length,
  glossaryTerms: glossary.length,
};

/** The catalog without practice prompts and answers, for pages that only need titles and links. */
export const catalogWithoutPractice = { ...catalog, topics: catalog.topics.map((t) => ({ ...t, practice: [] })) };
