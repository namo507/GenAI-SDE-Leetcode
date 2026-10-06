"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";
import type { CatalogTopic } from "@/lib/catalog";
import { dueReviews } from "@/lib/progress/metrics";
import { useClientProgress, useToday } from "@/lib/progress/hooks";
import { GRADE_LABELS, schedule } from "@/lib/progress/srs";
import { actions } from "@/lib/progress/store";
import { EmptyState } from "@/components/ui/primitives";

const GRADE_HELP = ["Could not recall it", "Recalled with real effort", "Recalled with some thought", "Recalled instantly"];

/** One spaced-review card at a time: recall, reveal, then grade how well you remembered. */
export function ReviewSession({ topics }: { topics: CatalogTopic[] }) {
  const progress = useClientProgress();
  const today = useToday();
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const answer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (revealed) answer.current?.focus();
  }, [revealed]);

  if (!progress || !today) return <div className="tp-card h-40" aria-busy="true" />;

  const due = dueReviews(progress, { topics }, today);
  const current = due[0];
  if (!current) {
    const upcoming = topics
      .filter((t) => progress.reviews[t.id])
      .map((t) => ({ t, due: progress.reviews[t.id]!.due }))
      .sort((a, b) => a.due.localeCompare(b.due))
      .slice(0, 6);
    return (
      <div className="grid gap-6">
        <EmptyState title={done ? `Done: ${done} ${done === 1 ? "review" : "reviews"} this session` : "No reviews due today"}>
          {upcoming.length
            ? "Each topic comes back on a growing schedule: one day, three days, then longer intervals for things you remember well."
            : "Topics join spaced review when you answer their practice items or press “I studied this” on a topic page."}
        </EmptyState>
        {upcoming.length > 0 && (
          <section aria-labelledby="upcoming" className="grid gap-2">
            <h3 id="upcoming" className="t-subheading">
              Coming up
            </h3>
            <ul className="grid gap-1 t-body-sm">
              {upcoming.map(({ t, due: d }) => (
                <li key={t.id} className="flex justify-between gap-3 border-b border-border pb-1">
                  <Link className="tp-link" href={t.href}>
                    {t.title}
                  </Link>
                  <span className="tp-muted">{d}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  const card = progress.reviews[current.topic.id]!;
  const items = current.topic.practice;
  const item = items.length ? items[(card.reps + card.lapses) % items.length]! : null;

  const grade = (g: number) => {
    actions.gradeReview(current.topic.id, g);
    setRevealed(false);
    setDone((n) => n + 1);
    requestAnimationFrame(() => heading.current?.focus());
  };

  return (
    <article className="tp-card grid gap-4" aria-labelledby="review-card-title">
      <p className="t-caption tp-muted">
        {due.length} due · {current.overdueDays > 0 ? `${current.overdueDays} days overdue` : "due today"} · reviewed {card.reps} times
      </p>
      <h3 id="review-card-title" ref={heading} tabIndex={-1} className="t-heading outline-none">
        {current.topic.title}
      </h3>
      {item ? (
        <p className="prose-measure t-body">{item.prompt}</p>
      ) : (
        <p className="prose-measure t-body">Explain this topic out loud in two minutes: what it is, how it works, and one trade-off.</p>
      )}
      {!revealed ? (
        <div>
          <button type="button" className="tp-btn tp-btn--primary" onClick={() => setRevealed(true)}>
            <Eye className="tp-icon" aria-hidden />
            Recall it, then reveal
          </button>
        </div>
      ) : (
        <>
          <div ref={answer} tabIndex={-1} className="rounded-[var(--radius-md)] bg-surface-sunken p-4 outline-none">
            <p className="mb-1 t-label">Model answer</p>
            <p className="prose-measure whitespace-pre-line t-body">{item?.answer ?? current.topic.summary}</p>
            {item && item.rubric.length > 0 && (
              <ul className="mt-2 grid list-disc gap-1 pl-6 t-body-sm tp-muted">
                {item.rubric.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-1 t-label">How well did you remember it?</legend>
            <div className="flex flex-wrap gap-2">
              {GRADE_LABELS.map((label, g) => {
                const next = schedule(card, g, today);
                return (
                  <button key={label} type="button" className={`tp-btn ${g >= 2 ? "tp-btn--secondary" : "tp-btn--ghost border-border-strong"}`} onClick={() => grade(g)}>
                    <span className="grid text-left leading-tight">
                      <span>{label}</span>
                      <span className="text-[12px] font-normal tp-muted">
                        {GRADE_HELP[g]} · next in {next.interval} {next.interval === 1 ? "day" : "days"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        </>
      )}
      <p className="t-caption tp-muted">
        <Link className="tp-link" href={current.topic.href}>
          Open the topic
        </Link>{" "}
        if you want to re-read before grading.
      </p>
    </article>
  );
}
