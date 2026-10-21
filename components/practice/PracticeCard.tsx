"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Eye, RotateCcw, X } from "lucide-react";
import type { Attempt } from "@/lib/progress/schema";
import { actions } from "@/lib/progress/store";
import { ConfidencePicker, confidenceLabel } from "./Confidence";

export type PracticePrompt = { id: string; type: string; prompt: string; answer: string; rubric: string[]; hints?: string[] };

const TYPE_LABEL: Record<string, string> = { recall: "Recall", code: "Code", design: "Design", case: "Case" };

/**
 * One self-graded practice item: rate confidence, reveal the model answer,
 * tick the rubric points you covered, then record whether you got it.
 */
export function PracticeCard({
  item,
  topicId,
  source = "topic-practice",
  headingLevel = 3,
  context,
}: {
  item: PracticePrompt;
  topicId: string | null;
  source?: Attempt["source"];
  headingLevel?: 3 | 4;
  context?: string;
}) {
  const [confidence, setConfidence] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [covered, setCovered] = useState<Set<number>>(new Set());
  const [recorded, setRecorded] = useState<boolean | null>(null);
  const Heading = headingLevel === 3 ? "h3" : "h4";
  const answerRef = useRef<HTMLDivElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);

  // The button the learner pressed disappears, so move focus to what replaced it.
  useEffect(() => {
    if (revealed) answerRef.current?.focus();
  }, [revealed]);
  useEffect(() => {
    if (recorded !== null) againRef.current?.focus();
  }, [recorded]);

  const record = (correct: boolean) => {
    if (confidence === null) return;
    actions.recordAttempt({ itemId: item.id, topicId, source, confidence, correct });
    setRecorded(correct);
  };
  const reset = () => {
    setConfidence(null);
    setRevealed(false);
    setCovered(new Set());
    setRecorded(null);
  };

  return (
    <article className="tp-card grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="tp-chip">{TYPE_LABEL[item.type] ?? item.type}</span>
        {context && <span className="t-caption tp-muted">{context}</span>}
      </div>
      <Heading className="t-subheading">{item.prompt}</Heading>
      {item.hints && item.hints.length > 0 && (
        <details>
          <summary className="cursor-pointer t-label">Hints ({item.hints.length})</summary>
          <ul className="mt-2 grid list-disc gap-1 pl-6 t-body-sm">
            {item.hints.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </details>
      )}

      {!revealed && (
        <>
          <ConfidencePicker value={confidence} onChange={setConfidence} />
          <div>
            <button type="button" className="tp-btn tp-btn--secondary" onClick={() => setRevealed(true)} disabled={confidence === null} aria-describedby={confidence === null ? `${item.id}-need` : undefined}>
              <Eye className="tp-icon" aria-hidden />
              Reveal answer
            </button>
            {confidence === null && (
              <p id={`${item.id}-need`} className="mt-2 t-caption tp-muted">
                Pick a confidence level first.
              </p>
            )}
          </div>
        </>
      )}

      {revealed && (
        <div className="grid gap-4">
          <p className="t-caption tp-muted">You said: {confidenceLabel(confidence ?? 0)}</p>
          <div ref={answerRef} tabIndex={-1} className="rounded-[var(--radius-md)] bg-surface-sunken p-4 outline-none">
            <p className="mb-1 t-label">Model answer</p>
            <p className="prose-measure t-body whitespace-pre-line">{item.answer}</p>
          </div>
          {item.rubric.length > 0 && (
            <fieldset className="grid gap-1">
              <legend className="mb-1 t-label">Which points did your answer cover?</legend>
              {item.rubric.map((r, i) => (
                <label key={r} className="tp-check">
                  <input
                    type="checkbox"
                    checked={covered.has(i)}
                    disabled={recorded !== null}
                    onChange={(e) =>
                      setCovered((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(i);
                        else next.delete(i);
                        return next;
                      })
                    }
                  />
                  {r}
                </label>
              ))}
            </fieldset>
          )}
          {recorded === null ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="tp-btn tp-btn--primary" onClick={() => record(true)}>
                <Check className="tp-icon" aria-hidden />I got it right
              </button>
              <button type="button" className="tp-btn tp-btn--secondary" onClick={() => record(false)}>
                <X className="tp-icon" aria-hidden />
                Not yet
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3" role="status">
              <span className={`tp-chip ${recorded ? "tp-chip--positive" : "tp-chip--caution"}`}>{recorded ? "Recorded as correct" : "Recorded as not yet"}</span>
              <button ref={againRef} type="button" className="tp-btn tp-btn--ghost tp-btn--sm" onClick={reset}>
                <RotateCcw className="tp-icon" aria-hidden />
                Try again
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
