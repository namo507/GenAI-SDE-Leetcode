"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Flag, Play, Trash, X } from "lucide-react";
import { ROLES, ROLE_LABELS } from "@/lib/curriculum";
import { ROUND_KIND_LABELS, ROUND_RUBRICS, ROUND_SCORE_LABELS, type MockLoop } from "@/lib/content-types";
import { todayIso, type MockResult } from "@/lib/progress/schema";
import { actions } from "@/lib/progress/store";
import { useClientProgress } from "@/lib/progress/hooks";
import { Countdown, clock, useStopwatch } from "@/components/ui/Stopwatch";
import { EmptyState } from "@/components/ui/primitives";
import type { PracticePrompt } from "@/components/practice/PracticeCard";

export type InterviewTopic = { title: string; href: string; practice: PracticePrompt[] };


/** Deterministic question draw: each retake of a loop rotates to different items. */
function drawQuestions(pool: PracticePrompt[], count: number, attempt: number): PracticePrompt[] {
  if (!pool.length) return [];
  const start = (attempt * count) % pool.length;
  return Array.from({ length: Math.min(count, pool.length) }, (_, i) => pool[(start + i) % pool.length]!);
}

type RoundResult = MockResult["rounds"][number];

function ActiveLoop({ loop, topics, attempt, onExit }: { loop: MockLoop; topics: Record<string, InterviewTopic>; attempt: number; onExit: (saved?: boolean) => void }) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [startedAt] = useState(() => new Date().toISOString());
  const watch = useStopwatch();
  const heading = useRef<HTMLHeadingElement>(null);
  const round = loop.rounds[index]!;
  const pool = round.topicIds.flatMap((id) => topics[id]?.practice ?? []);
  const questions = drawQuestions(pool, round.questions, attempt);
  const last = index === loop.rounds.length - 1;

  useEffect(() => {
    heading.current?.focus();
  }, [index]);

  const next = () => {
    if (score === null) return;
    if (watch.running) watch.pause();
    const result: RoundResult = {
      kind: round.kind,
      title: round.title,
      plannedSeconds: round.minutes * 60,
      usedSeconds: Math.round(watch.elapsedMs / 1000),
      score,
      notes,
    };
    const all = [...results, result];
    if (last) {
      actions.saveMock({ id: actions.newId(), loopId: loop.id, startedAt, finishedAt: new Date().toISOString(), rounds: all });
      onExit(true);
      return;
    }
    setResults(all);
    setIndex(index + 1);
    setScore(null);
    setNotes("");
    watch.reset();
  };

  return (
    <section className="grid gap-5" aria-labelledby="round-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="t-label tp-muted">
          {loop.title} · Round {index + 1} of {loop.rounds.length}
        </p>
        <button type="button" className="tp-btn tp-btn--ghost tp-btn--sm" onClick={() => onExit()}>
          <X className="tp-icon" aria-hidden />
          Leave without saving
        </button>
      </div>
      <ol className="flex gap-1" aria-label="Rounds">
        {loop.rounds.map((r, i) => (
          <li key={i} className={`h-1.5 flex-1 rounded-full ${i < index ? "bg-brand" : i === index ? "bg-brand/40" : "bg-surface-sunken"}`}>
            <span className="tp-sr-only">
              {r.title}: {i < index ? "done" : i === index ? "current" : "upcoming"}
            </span>
          </li>
        ))}
      </ol>
      <div className="tp-card grid gap-5">
        <div className="grid gap-1">
          <span className="tp-chip w-fit">{ROUND_KIND_LABELS[round.kind]}</span>
          <h2 id="round-title" ref={heading} tabIndex={-1} className="t-heading outline-none">
            {round.title}
          </h2>
        </div>
        <Countdown watch={watch} seconds={round.minutes * 60} label={`Round ${index + 1}`} />
        <ol className="grid gap-4">
          {questions.map((q, i) => (
            <li key={q.id} className="grid gap-2 border-l-2 border-border pl-4">
              <p className="t-body font-semibold">
                Question {i + 1}. {q.prompt}
              </p>
              <details>
                <summary className="cursor-pointer t-caption tp-link w-fit">Show the model answer (after you have answered)</summary>
                <p className="mt-2 prose-measure whitespace-pre-line t-body-sm">{q.answer}</p>
              </details>
            </li>
          ))}
        </ol>
        <section className="grid gap-1" aria-labelledby="rubric-title">
          <h3 id="rubric-title" className="t-label">
            Interviewers usually look for
          </h3>
          <ul className="grid list-disc gap-1 pl-6 t-body-sm">
            {ROUND_RUBRICS[round.kind].map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
        <fieldset className="grid gap-2">
          <legend className="mb-1 t-label">Score yourself honestly against that list</legend>
          <div className="flex flex-wrap gap-2">
            {ROUND_SCORE_LABELS.map((label, s) => (
              <label key={label} className={`tp-chip cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] ${score === s ? "tp-chip--brand" : ""}`}>
                <input type="radio" className="tp-sr-only" name="round-score" checked={score === s} onChange={() => setScore(s)} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="tp-field">
          <label htmlFor="round-notes" className="tp-field__label">
            Notes for next time (saved with the result)
          </label>
          <textarea id="round-notes" className="tp-textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
        </div>
        <div>
          <button type="button" className="tp-btn tp-btn--primary" onClick={next} disabled={score === null}>
            {last ? <Flag className="tp-icon" aria-hidden /> : <ArrowRight className="tp-icon" aria-hidden />}
            {last ? "Finish and save the loop" : "Next round"}
          </button>
          {score === null && <p className="mt-2 t-caption tp-muted">Pick a score to continue.</p>}
        </div>
      </div>
    </section>
  );
}

export function InterviewsView({ loops, topics }: { loops: MockLoop[]; topics: Record<string, InterviewTopic> }) {
  const progress = useClientProgress();
  const [active, setActive] = useState<string | null>(null);
  // After a loop is saved, say so and move focus to the history, where the new row is.
  const [savedTitle, setSavedTitle] = useState<string | null>(null);
  const historyHeading = useRef<HTMLHeadingElement>(null);
  const loop = loops.find((l) => l.id === active);
  const loopTitle = new Map(loops.map((l) => [l.id, l.title]));

  if (loop) {
    const attempt = progress ? progress.mocks.filter((m) => m.loopId === loop.id).length : 0;
    return (
      <ActiveLoop
        loop={loop}
        topics={topics}
        attempt={attempt}
        onExit={(saved) => {
          setActive(null);
          setSavedTitle(saved ? loop.title : null);
          if (saved) requestAnimationFrame(() => historyHeading.current?.focus());
        }}
      />
    );
  }

  const mocks = progress ? [...progress.mocks].sort((a, b) => b.startedAt.localeCompare(a.startedAt)) : [];

  return (
    <div className="grid gap-10">
      <ul className="grid gap-4 md:grid-cols-2">
        {loops.map((l) => {
          const minutes = l.rounds.reduce((s, r) => s + r.minutes, 0);
          return (
            <li key={l.id} className="tp-card grid content-start gap-3">
              <h2 className="t-subheading">{l.title}</h2>
              <p className="t-body-sm tp-muted">{l.summary}</p>
              <p className="t-caption tp-muted">
                {l.rounds.length} rounds · {minutes} min · {l.roles.length === ROLES.length ? "All roles" : l.roles.map((r) => ROLE_LABELS[r]).join(", ")}
              </p>
              <ol className="grid gap-0.5 t-body-sm">
                {l.rounds.map((r, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span>{r.title}</span>
                    <span className="shrink-0 tp-muted">{r.minutes} min</span>
                  </li>
                ))}
              </ol>
              <div>
                <button type="button" className="tp-btn tp-btn--primary tp-btn--sm" onClick={() => setActive(l.id)}>
                  <Play className="tp-icon" aria-hidden />
                  Start loop
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <section aria-labelledby="history" className="grid gap-3">
        <h2 id="history" ref={historyHeading} tabIndex={-1} className="t-heading scroll-mt-20 outline-none">
          Your mock history
        </h2>
        <p role="status" aria-live="polite" className={savedTitle ? "t-body-sm" : "tp-sr-only"}>
          {savedTitle ? `Saved: ${savedTitle}. It is the first row below.` : ""}
        </p>
        {!progress ? (
          <div className="tp-card h-24" aria-busy="true" />
        ) : mocks.length === 0 ? (
          <EmptyState title="No mock loops yet">Finish a loop to see your self-scores and time per round here and on the analytics page.</EmptyState>
        ) : (
          <div className="relative overflow-x-auto rounded-[var(--radius-lg)] border border-border">
            <table className="w-full min-w-[640px] border-collapse text-left t-body-sm">
              <caption className="tp-sr-only">Completed mock interview loops, newest first</caption>
              <thead className="bg-surface-sunken">
                <tr>
                  <th scope="col" className="px-3 py-2 t-label">Date</th>
                  <th scope="col" className="px-3 py-2 t-label">Loop</th>
                  <th scope="col" className="px-3 py-2 t-label">Rounds (score, time used of planned)</th>
                  <th scope="col" className="px-3 py-2 t-label"><span className="tp-sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {mocks.map((m) => (
                  <tr key={m.id} className="border-t border-border align-top">
                    <td className="px-3 py-2 whitespace-nowrap">{todayIso(new Date(m.startedAt))}</td>
                    <th scope="row" className="px-3 py-2 font-semibold">
                      {loopTitle.get(m.loopId) ?? m.loopId}
                    </th>
                    <td className="px-3 py-2">
                      <ul className="grid gap-0.5">
                        {m.rounds.map((r, i) => (
                          <li key={i}>
                            {r.title}: <span className="font-semibold">{r.score === null ? "not scored" : ROUND_SCORE_LABELS[r.score]}</span>{" "}
                            <span className="tp-muted">
                              ({clock(r.usedSeconds)} of {clock(r.plannedSeconds)})
                            </span>
                            {r.notes && <span className="block tp-muted">Note: {r.notes}</span>}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-3 py-2">
                      <button type="button" className="tp-btn tp-btn--ghost tp-btn--sm tp-btn--icon" aria-label={`Delete the ${loopTitle.get(m.loopId) ?? ""} result from ${todayIso(new Date(m.startedAt))}`} onClick={() => actions.deleteMock(m.id)}>
                        <Trash className="tp-icon" aria-hidden />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="t-caption tp-muted">
          Self-scores describe how you judged your own answers. They are a practice record, not a prediction of how a real interviewer will score you.{" "}
          <Link className="tp-link" href="/analytics">
            See trends in Analytics
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
