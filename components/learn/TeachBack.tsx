"use client";

import { useId, useState } from "react";
import { Check, Save, Sparkles } from "lucide-react";
import type { Topic } from "@/lib/curriculum";
import { useClientProgress } from "@/lib/progress/hooks";
import { actions } from "@/lib/progress/store";
import { Countdown, useStopwatch } from "@/components/ui/Stopwatch";
import { Callout } from "@/components/ui/primitives";
import { PracticeCard } from "@/components/practice/PracticeCard";

type Reflection = { explanation: string; assumption: string; counterexample: string };
const blank: Reflection = { explanation: "", assumption: "", counterexample: "" };

/** Learner-authored explanations are kept separate from evidence of correctness. */
export function TeachBack({ topic }: { topic: Topic }) {
  const progress = useClientProgress();
  const id = useId();
  const [draft, setDraft] = useState<Reflection | null>(null);
  const [saved, setSaved] = useState(false);
  const [showRubric, setShowRubric] = useState(false);
  const watch = useStopwatch();
  const value = draft ?? progress?.reflections[topic.id] ?? blank;
  const fields = [
    { key: "explanation" as const, label: "Explain it to a curious child", hint: "Use an everyday object. Explain what happens in order. Define a difficult word before using it.", max: 6000 },
    { key: "assumption" as const, label: "Name the assumption", hint: "What must stay true for your explanation or algorithm to work?", max: 3000 },
    { key: "counterexample" as const, label: "Find where it breaks", hint: "Give one input, failure or real-world situation that challenges the simple story.", max: 3000 },
  ];
  return (
    <section aria-labelledby={`${id}-title`} className="grid gap-5">
      <div className="grid gap-2">
        <h2 id={`${id}-title`} className="t-heading flex items-center gap-2"><Sparkles className="tp-icon text-brand" aria-hidden />Explain it back</h2>
        <p className="prose-measure t-body-sm tp-muted">Close the explanation above and rebuild it in your own words. Then move from the simple story to an assumption, a counterexample and an interview answer.</p>
      </div>
      <div className="tp-card grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="t-label">Optional 60-second speaking rehearsal</p>
          <Countdown watch={watch} seconds={60} label="Explanation rehearsal" />
        </div>
        {fields.map((f) => (
          <div className="tp-field" key={f.key}>
            <label className="tp-field__label" htmlFor={`${id}-${f.key}`}>{f.label}</label>
            <textarea id={`${id}-${f.key}`} className="tp-input min-h-28 resize-y" rows={f.key === "explanation" ? 5 : 3} maxLength={f.max} value={value[f.key]} aria-describedby={`${id}-${f.key}-hint`} onChange={(e) => { setDraft({ ...value, [f.key]: e.target.value }); setSaved(false); }} />
            <p id={`${id}-${f.key}-hint`} className="tp-field__hint">{f.hint}</p>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <button className="tp-btn tp-btn--primary" type="button" disabled={!progress} onClick={() => { actions.saveReflection(topic.id, value); setSaved(true); }}><Save className="tp-icon" aria-hidden />Save explanation</button>
          <button className="tp-btn tp-btn--secondary" type="button" aria-expanded={showRubric} onClick={() => setShowRubric((s) => !s)}>{showRubric ? "Hide the self-check" : "Compare with the self-check"}</button>
          <span role="status" className="t-caption tp-muted">{saved ? "Explanation saved in this browser and included in progress exports." : draft ? "Unsaved changes. Save before leaving this lesson." : progress?.reflections[topic.id] ? "Your saved explanation is restored." : "Your words stay in this browser when you save."}</span>
        </div>
        {showRubric && <Callout tone="note" title="Check the reasoning, not the vocabulary"><ul className="grid list-disc gap-2 pl-4">{topic.objectives.map((o) => <li key={o}>{o}</li>)}<li>Name an assumption: {topic.senior.invariants[0]}</li><li>Keep the analogy honest: {topic.eli5.analogyLimit}</li></ul></Callout>}
      </div>
      <PracticeCard item={{ id: `${topic.id}-teach-back`, type: "case", prompt: `Give a concise interview explanation of ${topic.title.toLowerCase()}, then defend one trade-off.`, answer: topic.senior.interviewAnswer, rubric: [...topic.objectives.slice(0, 2), "Stated an assumption and how the mechanism preserves it", "Compared a named alternative and identified a failure mode"], hints: ["Start with the problem and one concrete example. Explain the mechanism before naming tools."] }} topicId={topic.id} context="Speaking rehearsal · self-graded" />
      <p className="t-caption tp-muted flex items-start gap-2"><Check className="tp-icon shrink-0" aria-hidden />Saving notes does not mark a lesson mastered. Only your explicitly recorded self-assessment adds a practice attempt; this page does not automatically grade your writing.</p>
    </section>
  );
}
