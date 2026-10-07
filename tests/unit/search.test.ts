import { describe, expect, it } from "vitest";
import { rankEntries, type SearchEntry } from "@/lib/search";

const entry = (kind: SearchEntry["kind"], title: string, href: string, keywords = ""): SearchEntry => ({ kind, title, href, meta: "", keywords });

const ENTRIES: SearchEntry[] = [
  entry("topic", "Rate limiting: token bucket and sliding windows", "/learn/system-design/rate-limiting"),
  entry("topic", "Two pointers and sliding windows", "/learn/dsa/sliding-window"),
  entry("term", "Sliding window", "/glossary#sliding-window"),
  entry("page", "Practice", "/practice", "drills coding sql"),
  entry("day", "Week 3 · Day 2", "/roadmap/w03-d02", "sliding window"),
];

describe("command palette ranking", () => {
  it("puts the topic whose slug matches the query first", () => {
    const topics = rankEntries(ENTRIES, "sliding window").filter((e) => e.kind === "topic");
    expect(topics.map((e) => e.href)).toEqual(["/learn/dsa/sliding-window", "/learn/system-design/rate-limiting"]);
  });

  it("keeps the fixed group order and returns only pages for an empty query", () => {
    expect(rankEntries(ENTRIES, "sliding window").map((e) => e.kind)).toEqual(["topic", "topic", "term", "day"]);
    expect(rankEntries(ENTRIES, "   ").map((e) => e.kind)).toEqual(["page"]);
  });

  it("matches keywords and requires every term", () => {
    expect(rankEntries(ENTRIES, "coding").map((e) => e.title)).toEqual(["Practice"]);
    expect(rankEntries(ENTRIES, "sliding zebra")).toEqual([]);
  });
});
