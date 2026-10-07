/** The command palette's index: built at build time and served as a static JSON file. */
export type SearchKind = "page" | "topic" | "day" | "term" | "problem";
export type SearchEntry = { kind: SearchKind; title: string; href: string; meta: string; keywords: string };

export const SEARCH_KIND_LABELS: Record<SearchKind, string> = {
  page: "Pages",
  topic: "Topics",
  day: "Days",
  term: "Glossary",
  problem: "Practice",
};

const KIND_ORDER: SearchKind[] = ["page", "topic", "term", "problem", "day"];

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

/**
 * Simple ranked match: an entry whose URL slug is the query wins, then title prefix,
 * the whole phrase in the title, word prefixes and per-term title hits. Ties go to
 * the shorter title, which is usually the closer match.
 */
export function rankEntries(entries: SearchEntry[], query: string, perKind = 6): SearchEntry[] {
  const q = norm(query.trim());
  if (!q) return entries.filter((e) => e.kind === "page");
  const terms = q.split(/\s+/);
  const scored: { e: SearchEntry; score: number }[] = [];
  for (const e of entries) {
    const title = norm(e.title);
    const hay = `${title} ${norm(e.meta)} ${norm(e.keywords)}`;
    if (!terms.every((t) => hay.includes(t))) continue;
    let score = 0;
    if (e.href.split(/[/#]/).pop() === q.replace(/\s+/g, "-")) score += 150;
    if (title.startsWith(q)) score += 100;
    else if (title.includes(q)) score += 50;
    if (title.split(/[\s,:()/-]+/).some((w) => w.startsWith(terms[0]!))) score += 30;
    score += terms.filter((t) => title.includes(t)).length * 10;
    if (e.kind === "topic") score += 5;
    scored.push({ e, score });
  }
  // Groups appear in a fixed order (pages, topics, terms, practice, days); best matches first within each.
  scored.sort((a, b) => KIND_ORDER.indexOf(a.e.kind) - KIND_ORDER.indexOf(b.e.kind) || b.score - a.score || a.e.title.length - b.e.title.length || a.e.title.localeCompare(b.e.title));
  const counts = new Map<SearchKind, number>();
  const out: SearchEntry[] = [];
  for (const { e } of scored) {
    const n = counts.get(e.kind) ?? 0;
    if (n >= perKind) continue;
    counts.set(e.kind, n + 1);
    out.push(e);
  }
  return out;
}
