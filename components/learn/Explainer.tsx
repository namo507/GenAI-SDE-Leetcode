"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { Baby, GraduationCap } from "lucide-react";
import type { Topic } from "@/lib/curriculum";
import { Callout, LiveRegion } from "@/components/ui/primitives";

export type ExplainMode = "eli5" | "senior";

const MODES = [
  { id: "eli5", label: "ELI5", long: "Explain like I am five", icon: Baby },
  { id: "senior", label: "Senior", long: "Senior engineer depth", icon: GraduationCap },
] as const;

/**
 * Two toggle buttons (aria-pressed) rather than tabs: the learner is choosing
 * a depth for the same content. Focus stays on the pressed button; only the
 * explanation below changes.
 */
export function ModeToggle({ value, onChange, label }: { value: ExplainMode; onChange: (m: ExplainMode) => void; label: string }) {
  const layoutId = `${useId()}-mode`;
  return (
    <div className="tp-seg" role="group" aria-label={label}>
      {MODES.map(({ id, label: text, long, icon: Icon }) => {
        const pressed = value === id;
        return (
          <button key={id} type="button" className="tp-seg__btn" aria-pressed={pressed} title={long} onClick={() => onChange(id)}>
            {pressed && <motion.span layoutId={layoutId} className="tp-seg__indicator" transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }} aria-hidden />}
            <span className="tp-seg__label">
              <Icon className="tp-icon" aria-hidden />
              {text}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Eli5({ topic }: { topic: Topic }) {
  return (
    <div className="grid gap-5">
      <p className="prose-measure t-body">{topic.eli5.analogy}</p>
      <ol className="prose-measure grid list-decimal gap-2 pl-6 t-body">
        {topic.eli5.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <Callout tone="limit" title="Where the analogy stops working" className="prose-measure">
        {topic.eli5.analogyLimit}
      </Callout>
    </div>
  );
}

function Senior({ topic }: { topic: Topic }) {
  const s = topic.senior;
  return (
    <div className="grid gap-6">
      <p className="prose-measure t-body">{s.definition}</p>
      <section className="grid gap-2">
        <h3 className="t-subheading">Assumptions and invariants</h3>
        <ul className="prose-measure grid list-disc gap-1 pl-6 t-body">
          {s.invariants.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>
      <section className="grid gap-2">
        <h3 className="t-subheading">Mechanism</h3>
        <ol className="prose-measure grid list-decimal gap-1 pl-6 t-body">
          {s.mechanism.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ol>
      </section>
      <section className="grid gap-2">
        <h3 className="t-subheading">Complexity</h3>
        <p className="prose-measure t-body">{s.complexity}</p>
      </section>
      <section className="grid gap-2">
        <h3 className="t-subheading">Trade-offs</h3>
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
          <table className="w-full min-w-[540px] border-collapse text-left t-body-sm">
            <thead className="bg-surface-sunken">
              <tr>
                <th scope="col" className="px-3 py-2 t-label">Option</th>
                <th scope="col" className="px-3 py-2 t-label">Choose it when</th>
                <th scope="col" className="px-3 py-2 t-label">Cost</th>
              </tr>
            </thead>
            <tbody>
              {s.tradeoffs.map((t) => (
                <tr key={t.option} className="border-t border-border align-top">
                  <th scope="row" className="px-3 py-2 font-semibold">{t.option}</th>
                  <td className="px-3 py-2">{t.choose}</td>
                  <td className="px-3 py-2">{t.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="grid gap-2">
        <h3 className="t-subheading">Failure modes</h3>
        <ul className="prose-measure grid list-disc gap-1 pl-6 t-body">
          {s.failureModes.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>
      <section className="grid gap-2">
        <h3 className="t-subheading">In production</h3>
        <p className="prose-measure t-body">{s.production}</p>
      </section>
      <Callout tone="note" title="Say it in an interview" className="prose-measure">
        {s.interviewAnswer}
      </Callout>
    </div>
  );
}

export function Explainer({ topic }: { topic: Topic }) {
  const [mode, setMode] = useState<ExplainMode>("eli5");
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} className="t-heading">
          Explanation
        </h2>
        <ModeToggle value={mode} onChange={setMode} label={`Explanation depth for ${topic.title}`} />
      </div>
      <LiveRegion>{mode === "eli5" ? "Showing the ELI5 explanation" : "Showing the senior explanation"}</LiveRegion>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
        >
          {mode === "eli5" ? <Eli5 topic={topic} /> : <Senior topic={topic} />}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
