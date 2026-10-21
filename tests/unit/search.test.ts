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

  it("orders groups by their best match and returns only pages for an empty query", () => {
    expect(rankEntries(ENTRIES, "sliding window").map((e) => e.kind)).toEqual(["topic", "topic", "term", "day"]);
    expect(rankEntries(ENTRIES, "   ").map((e) => e.kind)).toEqual(["page"]);
  });

  it("matches keywords and requires every term", () => {
    expect(rankEntries(ENTRIES, "coding").map((e) => e.title)).toEqual(["Practice"]);
    expect(rankEntries(ENTRIES, "sliding zebra")).toEqual([]);
  });

  it("puts an exact title first even when it is in a later group, so Enter opens it", () => {
    const entries = [
      entry("topic", "Replication, consistency and queues", "/learn/system-design/replication-queues", "two consumers sum offsets"),
      entry("problem", "Two sum", "/practice#coding"),
      entry("term", "p-value", "/glossary#p-value"),
      entry("topic", "Bayesian A/B testing", "/learn/statistics/bayesian-ab", "replaces the p-value"),
    ];
    expect(rankEntries(entries, "two sum")[0]!.title).toBe("Two sum");
    expect(rankEntries(entries, "p-value")[0]!.title).toBe("p-value");
  });

  it("matches terms only at the start of a word", () => {
    const entries = [entry("topic", "Consumers and offsets", "/learn/a/b"), entry("topic", "Week 13 topic", "/learn/c/d"), entry("topic", "Sum types", "/learn/e/f")];
    expect(rankEntries(entries, "sum").map((e) => e.title)).toEqual(["Sum types"]);
    expect(rankEntries(entries, "3")).toEqual([]);
  });

  it("finds days by week and day number in either spelling", () => {
    const day = { kind: "day" as const, title: "Two pointers practice", href: "/roadmap/w03-d02", meta: "Week 3 · Day 2 · Theory lab", keywords: "W3 D2 W3D2" };
    const other = { kind: "day" as const, title: "Graphs", href: "/roadmap/w13-d02", meta: "Week 13 · Day 2 · Theory lab", keywords: "W13 D2 W13D2" };
    for (const q of ["week 3 day 2", "W3 D2", "w3d2"]) expect(rankEntries([other, day], q).map((e) => e.href)).toEqual(["/roadmap/w03-d02"]);
  });
});
