import { DAY_KIND_LABELS, DOMAIN_LABELS, categoryOf } from "@/lib/curriculum";
import { topicHref } from "@/lib/catalog";
import type { SearchEntry } from "@/lib/search";
import { curriculum, glossary, practiceSets } from "@/lib/site";
import { NAV_PAGES } from "@/components/shell/nav";

export const dynamic = "force-static";

export function GET() {
  const entries: SearchEntry[] = [
    ...NAV_PAGES.map((p) => ({ kind: "page" as const, title: p.label, href: p.href, meta: p.section, keywords: p.keywords })),
    ...curriculum.topics.map((t) => ({
      kind: "topic" as const,
      title: t.title,
      href: topicHref(t),
      meta: `${categoryOf(t.domain).label} · Week ${Number(t.id.slice(1, 3))}`,
      keywords: `${DOMAIN_LABELS[t.domain]} ${t.summary} ${t.objectives.join(" ")}`,
    })),
    ...curriculum.weeks.flatMap((w) =>
      w.days.map((d) => ({
        kind: "day" as const,
        title: `W${w.number} D${d.day}: ${d.title}`,
        href: `/roadmap/${d.id}`,
        meta: d.label ?? DAY_KIND_LABELS[d.kind],
        keywords: `${w.title} ${d.summary}`,
      })),
    ),
    ...glossary.map((g) => ({ kind: "term" as const, title: g.term, href: `/glossary#${g.slug}`, meta: DOMAIN_LABELS[g.domain], keywords: g.definition })),
    ...practiceSets.flatMap((s) =>
      s.items.map((d) => ({ kind: "problem" as const, title: d.title, href: `/practice#${s.id}`, meta: s.title, keywords: `${d.prompt} ${"pattern" in d ? d.pattern : ""}` })),
    ),
  ];
  return Response.json(entries);
}
