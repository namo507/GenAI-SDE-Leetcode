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
/** True when the query's words start a run of words in `text`, ignoring punctuation, so "week 3 day 2" finds "Week 3 · Day 2". */
const flat = (s: string) => s.replace(/[^a-z0-9]+/g, " ").trim();
const phraseIn = (text: string, q: string) => ` ${flat(text)}`.includes(` ${flat(q)}`);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** True when `term` starts a word in `text`, so "sum" does not match "consumers" and "3" does not match "13". */
const startsWord = (text: string, term: string) => new RegExp(`(^|[^a-z0-9])${escape(term)}`).test(text);

/**
 * Ranked match. Every term has to start a word somewhere in the entry. An exact
 * title wins, then the URL slug, a title prefix, the whole phrase in the title or
 * meta, word prefixes and per-term title hits; ties go to the shorter title.
 * Groups are ordered by their best match, so Enter always opens the top hit.
 */
export function rankEntries(entries: SearchEntry[], query: string, perKind = 6): SearchEntry[] {
  const q = norm(query.trim()).replace(/\s+/g, " ");
  if (!q) return entries.filter((e) => e.kind === "page");
  const terms = q.split(" ");
  const scored: { e: SearchEntry; score: number }[] = [];
  for (const e of entries) {
    const title = norm(e.title);
    const meta = norm(e.meta);
    const hay = `${title} ${meta} ${norm(e.keywords)}`;
    if (!terms.every((t) => startsWord(hay, t))) continue;
    let score = 0;
    if (title === q) score += 200;
    // A lesson whose URL slug is the query is the canonical page for it, ahead of a glossary entry of the same name.
    if (e.kind === "topic" && e.href.split("/").pop() === q.replace(/ /g, "-")) score += 250;
    if (title.startsWith(q)) score += 100;
    else if (phraseIn(title, q)) score += 50;
    else if (phraseIn(meta, q)) score += 40;
    if (startsWord(title, terms[0]!)) score += 30;
    score += terms.filter((t) => startsWord(title, t)).length * 10;
    if (e.kind === "topic") score += 5;
    scored.push({ e, score });
  }
  const byScore = (a: { e: SearchEntry; score: number }, b: { e: SearchEntry; score: number }) =>
    b.score - a.score || a.e.title.length - b.e.title.length || a.e.title.localeCompare(b.e.title);
  scored.sort(byScore);
  const best = new Map<SearchKind, number>();
  for (const { e, score } of scored) if (!best.has(e.kind)) best.set(e.kind, score);
  const rank = (k: SearchKind) => [-(best.get(k) ?? 0), KIND_ORDER.indexOf(k)] as const;
  scored.sort((a, b) => {
    const [sa, oa] = rank(a.e.kind);
    const [sb, ob] = rank(b.e.kind);
    return sa - sb || oa - ob || byScore(a, b);
  });
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
