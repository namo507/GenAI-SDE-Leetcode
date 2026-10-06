"use client";

import Link from "next/link";
import { useId, useState, useSyncExternalStore } from "react";
import { DIFFICULTIES, DOMAIN_LABELS, type Difficulty, type Domain } from "@/lib/curriculum";
import type { CatalogTopic } from "@/lib/catalog";
import type { CodeProblem, PracticeSet } from "@/lib/content-types";
import { topicMastery } from "@/lib/progress/metrics";
import { useClientProgress } from "@/lib/progress/hooks";
import { TabList, TabPanel } from "@/components/ui/Tabs";
import { pct } from "@/components/ui/primitives";
import { PracticeCard } from "./PracticeCard";
import { ChoiceDrillCard, DesignDrillCard, DIFFICULTY, NumericDrillCard, SqlDrillCard, type TopicIndex } from "./Drills";
import { CodeProblemCard } from "./CodeProblemCard";
import { ReviewSession } from "./ReviewSession";

const TABS = [
  { id: "review", label: "Spaced review" },
  { id: "topic-drills", label: "Topic drills" },
  { id: "sql", label: "SQL" },
  { id: "coding", label: "Coding" },
  { id: "statistics", label: "Statistics" },
  { id: "system-design", label: "System design" },
  { id: "rag-diagnosis", label: "RAG diagnosis" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const subscribeHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

/** The selected tab follows the URL hash, so /practice#sql links straight to a set. */
function useHashTab(): [TabId, (t: TabId) => void] {
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash.slice(1), () => "");
  const [chosen, setChosen] = useState<TabId | null>(null);
  const fromHash = TABS.find((t) => t.id === hash)?.id;
  const value = chosen ?? fromHash ?? "review";
  return [
    value,
    (t) => {
      setChosen(t);
      window.history.replaceState(null, "", `#${t}`);
    },
  ];
}

function SetIntro({ set }: { set: PracticeSet | undefined }) {
  if (!set) return null;
  return <p className="mb-4 prose-measure t-body-sm tp-muted">{set.description}</p>;
}

function TopicDrills({ topics }: { topics: CatalogTopic[] }) {
  const [topicId, setTopicId] = useState(topics[0]!.id);
  const topic = topics.find((t) => t.id === topicId)!;
  const weeks = [...new Set(topics.map((t) => t.week))];
  return (
    <div className="grid gap-4">
      <div className="tp-field max-w-xl">
        <label htmlFor="topic-pick" className="tp-field__label">
          Topic
        </label>
        <select id="topic-pick" className="tp-select" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
          {weeks.map((w) => (
            <optgroup key={w} label={`Week ${w}`}>
              {topics
                .filter((t) => t.week === w)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <span className="tp-field__hint">
          {topic.practice.length} items.{" "}
          <Link className="tp-link" href={topic.href}>
            Read the lesson
          </Link>
        </span>
      </div>
      <div className="grid gap-4">
        {topic.practice.map((p) => (
          <PracticeCard key={`${topic.id}-${p.id}`} item={p} topicId={topic.id} context={topic.title} />
        ))}
      </div>
    </div>
  );
}

function CodingBank({ set, topics, topicIndex }: { set: PracticeSet | undefined; topics: CatalogTopic[]; topicIndex: TopicIndex }) {
  const problems = (set?.items ?? []).filter((d): d is CodeProblem => d.kind === "code");
  const patterns = [...new Set(problems.map((p) => p.pattern))].sort();
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [pattern, setPattern] = useState("all");
  const shown = problems.filter((p) => (difficulty === "all" || p.difficulty === difficulty) && (pattern === "all" || p.pattern === pattern));
  return (
    <div className="grid gap-6">
      <SetIntro set={set} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="tp-field w-48">
          <label htmlFor="code-difficulty" className="tp-field__label">
            Difficulty
          </label>
          <select id="code-difficulty" className="tp-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty | "all")}>
            <option value="all">All levels</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {DIFFICULTY[d]}
              </option>
            ))}
          </select>
        </div>
        <div className="tp-field w-72">
          <label htmlFor="code-pattern" className="tp-field__label">
            Pattern
          </label>
          <select id="code-pattern" className="tp-select" value={pattern} onChange={(e) => setPattern(e.target.value)}>
            <option value="all">All patterns</option>
            {patterns.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <p className="pb-2 t-caption tp-muted" role="status" aria-live="polite">
          {shown.length} of {problems.length} problems
        </p>
      </div>
      <div className="grid gap-4">
        {shown.map((p) => (
          <CodeProblemCard key={p.id} problem={p} topics={topicIndex} />
        ))}
      </div>
      <section aria-labelledby="lesson-code" className="grid gap-3">
        <h3 id="lesson-code" className="t-heading">
          Runnable lesson examples
        </h3>
        <CodingList topics={topics} />
      </section>
    </div>
  );
}

function CodingList({ topics }: { topics: CatalogTopic[] }) {
  const progress = useClientProgress();
  const withCode = topics.filter((t) => t.hasCode);
  const domains = [...new Set(withCode.map((t) => t.domain))] as Domain[];
  return (
    <div className="grid gap-6">
      <p className="prose-measure t-body-sm tp-muted">
        {withCode.length} runnable problems, each with a Python and an R solution that print identical output, unit tests in both languages, and a deliberately wrong version to
        learn from. Edit the code in the lesson and press Run tests.
      </p>
      {domains.map((d) => (
        <section key={d} aria-labelledby={`code-${d}`} className="grid gap-2">
          <h3 id={`code-${d}`} className="t-subheading">
            {DOMAIN_LABELS[d]}
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {withCode
              .filter((t) => t.domain === d)
              .map((t) => {
                const m = progress ? topicMastery(progress, t.id) : null;
                return (
                  <li key={t.id}>
                    <Link href={`${t.href}#run-it`} className="tp-card flex items-center justify-between gap-3 !p-4">
                      <span className="grid">
                        <span className="t-caption tp-muted">Week {t.week}</span>
                        <span className="font-semibold">{t.title}</span>
                      </span>
                      <span className="tp-chip shrink-0">{m === null ? "Not practiced" : `Mastery ${pct(m)}`}</span>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function PracticeView({ topics, sets }: { topics: CatalogTopic[]; sets: PracticeSet[] }) {
  const idBase = useId();
  const [tab, setTab] = useHashTab();
  const topicIndex: TopicIndex = Object.fromEntries(topics.map((t) => [t.id, { title: t.title, href: t.href }]));
  const set = (id: string) => sets.find((s) => s.id === id);
  const count = (id: string) => set(id)?.items.length;

  const items = (id: string) =>
    (set(id)?.items ?? []).map((d) => {
      switch (d.kind) {
        case "sql":
          return <SqlDrillCard key={d.id} drill={d} topics={topicIndex} />;
        case "numeric":
          return <NumericDrillCard key={d.id} drill={d} topics={topicIndex} />;
        case "design":
          return <DesignDrillCard key={d.id} drill={d} topics={topicIndex} />;
        case "choice":
          return <ChoiceDrillCard key={d.id} drill={d} topics={topicIndex} />;
        case "code":
          return <CodeProblemCard key={d.id} problem={d} topics={topicIndex} />;
      }
    });

  return (
    <div className="grid gap-6">
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <TabList
          idBase={idBase}
          label="Practice sets"
          className="w-max min-w-full"
          tabs={TABS.map((t) => ({ id: t.id, label: count(t.id) ? `${t.label} (${count(t.id)})` : t.label }))}
          value={tab}
          onChange={setTab}
        />
      </div>
      <TabPanel idBase={idBase} value={tab} className="outline-none">
        {tab === "review" && <ReviewSession topics={topics} />}
        {tab === "topic-drills" && <TopicDrills topics={topics} />}
        {tab === "coding" && <CodingBank set={set("coding")} topics={topics} topicIndex={topicIndex} />}
        {tab !== "review" && tab !== "topic-drills" && tab !== "coding" && (
          <>
            <SetIntro set={set(tab)} />
            <div className="grid gap-4">{items(tab)}</div>
          </>
        )}
      </TabPanel>
    </div>
  );
}
