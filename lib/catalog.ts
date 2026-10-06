/**
 * A lightweight index of the curriculum for client components (dashboard,
 * roadmap, analytics), so pages do not ship full lesson bodies to the browser.
 */
import type { Curriculum, DayKind, Difficulty, Domain, Role, Topic, Track } from "@/lib/curriculum";

export type CatalogTopic = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  domain: Domain;
  difficulty: Difficulty;
  minutes: number;
  roles: Role[];
  week: number;
  href: string;
  hasCode: boolean;
  practice: { id: string; type: string; prompt: string; answer: string; rubric: string[] }[];
};

export type CatalogDay = {
  id: string;
  week: number;
  day: number;
  index: number;
  kind: DayKind;
  label?: string;
  title: string;
  summary: string;
  minutes: number;
  topicIds: string[];
  tasks: { label: string; minutes: number }[];
  href: string;
};

export type CatalogWeek = {
  number: number;
  slug: string;
  title: string;
  summary: string;
  track: Track;
  domains: Domain[];
  roles: Role[];
  dayIds: string[];
  minutes: number;
};

export type Catalog = { weeks: CatalogWeek[]; days: CatalogDay[]; topics: CatalogTopic[] };

export const topicHref = (t: Pick<Topic, "domain" | "slug">) => `/learn/${t.domain}/${t.slug}`;
export const dayHref = (dayId: string) => `/roadmap/${dayId}`;

export function buildCatalog(c: Curriculum): Catalog {
  let index = 0;
  const days: CatalogDay[] = c.weeks.flatMap((w) =>
    w.days.map((d) => ({
      id: d.id,
      week: w.number,
      day: d.day,
      index: index++,
      kind: d.kind,
      ...(d.label ? { label: d.label } : {}),
      title: d.title,
      summary: d.summary,
      minutes: d.minutes,
      topicIds: d.topicIds,
      tasks: d.tasks,
      href: dayHref(d.id),
    })),
  );
  const weeks: CatalogWeek[] = c.weeks.map((w) => ({
    number: w.number,
    slug: w.slug,
    title: w.title,
    summary: w.summary,
    track: w.track,
    domains: w.domains,
    roles: w.roles,
    dayIds: w.days.map((d) => d.id),
    minutes: w.days.reduce((n, d) => n + d.minutes, 0),
  }));
  const topics: CatalogTopic[] = c.topics.map((t) => ({
    id: t.id,
    slug: t.slug,
    title: t.title,
    summary: t.summary,
    domain: t.domain,
    difficulty: t.difficulty,
    minutes: t.minutes,
    roles: t.roles,
    week: Number(t.id.slice(1, 3)),
    href: topicHref(t),
    hasCode: Boolean(t.implementation),
    practice: t.practice.map((p) => ({ id: p.id, type: p.type, prompt: p.prompt, answer: p.answer, rubric: p.rubric })),
  }));
  return { weeks, days, topics };
}
