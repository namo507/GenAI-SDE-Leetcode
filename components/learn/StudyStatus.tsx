"use client";

import { BookmarkPlus, CalendarCheck } from "lucide-react";
import { topicMastery } from "@/lib/progress/metrics";
import { actions, useHydrated, useProgress } from "@/lib/progress/store";
import { pct } from "@/components/ui/primitives";

/** Puts a topic into spaced review and shows its review and mastery state. */
export function StudyStatus({ topicId, title }: { topicId: string; title: string }) {
  const progress = useProgress();
  const hydrated = useHydrated();
  if (!hydrated) return <div className="h-10" aria-hidden />;
  const card = progress.reviews[topicId];
  const mastery = topicMastery(progress, topicId);
  const attempts = progress.attempts.filter((a) => a.topicId === topicId).length;
  return (
    <div className="flex flex-wrap items-center gap-3" role="status">
      {card ? (
        <span className="tp-chip tp-chip--brand">
          <CalendarCheck className="tp-icon" aria-hidden />
          In spaced review, next due {card.due}
        </span>
      ) : (
        <button type="button" className="tp-btn tp-btn--primary" onClick={() => actions.markStudied(topicId)} aria-label={`I studied ${title}. Start spaced review.`}>
          <BookmarkPlus className="tp-icon" aria-hidden />
          I studied this: start spaced review
        </button>
      )}
      <span className="t-body-sm tp-muted">
        {attempts === 0 ? "No practice attempts yet." : `Mastery ${pct(mastery ?? 0)} from your last ${Math.min(attempts, 3)} of ${attempts} attempts.`}
      </span>
    </div>
  );
}
