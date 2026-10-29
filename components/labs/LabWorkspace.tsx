"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, FlaskConical, Pin, RotateCcw, Save } from "lucide-react";
import { findLab } from "@/lib/labs";
import { defaultParameters, normalizeParameters, type LabDefinition, type LabParameters, type LabPrediction, type LabResult } from "@/lib/labs/types";
import { useClientProgress } from "@/lib/progress/hooks";
import { actions } from "@/lib/progress/store";
import { Callout } from "@/components/ui/primitives";
import { DataTable } from "@/components/analytics/charts";
import { ConfidencePicker } from "@/components/practice/Confidence";
import { PracticeCard } from "@/components/practice/PracticeCard";
import { ModeToggle, type ExplainMode } from "@/components/learn/Explainer";
import { useReducedMotionPreference } from "@/components/shell/Providers";

function PredictionCheck({ prediction, itemId, topicId, onReveal, title = "Predict before you experiment" }: { prediction: LabPrediction; itemId: string; topicId: string; onReveal: () => void; title?: string }) {
  const id = useId();
  const [choice, setChoice] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const correct = choice === prediction.correctIndex;
  return <article className="tp-card grid gap-4" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`} className="t-subheading">{title}</h3>
    <fieldset className="grid gap-2" disabled={checked}>
      <legend className="mb-3 prose-measure t-body">{prediction.prompt}</legend>
      {prediction.choices.map((text, index) => <label className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border p-3 t-body-sm ${choice === index ? "border-brand bg-brand-soft" : "border-border"}`} key={text}>
        <input className="mt-1 accent-[var(--brand)]" type="radio" name={id} checked={choice === index} onChange={() => setChoice(index)} />{text}
      </label>)}
    </fieldset>
    {!checked && <>
      <ConfidencePicker value={confidence} onChange={setConfidence} />
      <button type="button" className="tp-btn tp-btn--primary w-fit" disabled={choice === null || confidence === null} onClick={() => {
        if (choice === null || confidence === null) return;
        actions.recordAttempt({ itemId, topicId, source: "drill", confidence, correct });
        setChecked(true); onReveal();
      }}>Check prediction</button>
      <p className="t-caption tp-muted">Choose an answer and confidence first. Only checking records a practice attempt.</p>
    </>}
    {checked && <><div role="status"><Callout tone={correct ? "positive" : "note"} title={correct ? "Prediction matched" : "A useful surprise"}>
      <p className="font-medium">Answer: {prediction.choices[prediction.correctIndex]}</p><p className="mt-2">{prediction.explanation}</p>
    </Callout></div><button className="tp-btn tp-btn--ghost w-fit" type="button" onClick={() => { setChecked(false); setConfidence(null); setChoice(null); }}>Try this question again</button></>}
  </article>;
}

function ResultBars({ bars }: { bars: NonNullable<LabResult["bars"]> }) {
  const bound = Math.max(1, ...bars.items.map((item) => Math.abs(item.value)));
  return <figure className="grid gap-3">
    <figcaption className="t-subheading">{bars.title}</figcaption>
    <p className="t-caption tp-muted">Values in {bars.unit}. The complete values are also listed in the table.</p>
    <div role="img" aria-label={`${bars.title}. ${bars.items.map((item) => `${item.label}: ${Number(item.value.toPrecision(5))} ${bars.unit}`).join("; ")}.`} className="grid gap-2">
      {bars.items.map((item) => <div key={item.label} className="grid gap-1" aria-hidden>
        <div className="flex flex-wrap justify-between gap-x-3 t-caption"><span>{item.label}</span><span className="font-mono">{Number(item.value.toPrecision(5)).toLocaleString("en-US")} {bars.unit}</span></div>
        <div className="h-2 overflow-hidden rounded-[var(--radius-sm)] bg-surface-sunken"><div className="h-full bg-brand" style={{ width: `${Math.abs(item.value) / bound * 100}%` }} /></div>
        {item.detail && <p className="t-caption tp-muted">{item.detail}</p>}
      </div>)}
    </div>
  </figure>;
}

function NarratedResult({ result }: { result: LabResult }) {
  const [step, setStep] = useState(0);
  const bounded = Math.min(step, result.steps.length - 1);
  return <section className="tp-card grid gap-4" aria-labelledby="trace-title">
    <h3 id="trace-title" className="t-subheading">Trace the mechanism</h3>
    <p className="t-caption tp-muted">Step {bounded + 1} of {result.steps.length}. The narration is recomputed from your current inputs.</p>
    <p role="status" className="prose-measure t-body min-h-16">{result.steps[bounded]}</p>
    <div className="flex flex-wrap gap-2">
      <button className="tp-btn tp-btn--secondary tp-btn--sm" type="button" disabled={bounded === 0} onClick={() => setStep(bounded - 1)}><ArrowLeft className="tp-icon" aria-hidden />Previous explanation step</button>
      <button className="tp-btn tp-btn--secondary tp-btn--sm" type="button" disabled={bounded === result.steps.length - 1} onClick={() => setStep(bounded + 1)}>Next explanation step<ArrowRight className="tp-icon" aria-hidden /></button>
      <button className="tp-btn tp-btn--ghost tp-btn--sm" type="button" disabled={bounded === 0} onClick={() => setStep(0)}>Reset trace</button>
    </div>
    <details><summary className="cursor-pointer t-label">Read the full transcript</summary><ol className="mt-3 grid list-decimal gap-2 pl-5 t-body-sm">{result.steps.map((text, i) => <li key={i}>{text}</li>)}</ol></details>
  </section>;
}

function Explanation({ lab }: { lab: LabDefinition }) {
  const [mode, setMode] = useState<ExplainMode>("eli5");
  const reduced = useReducedMotionPreference();
  return <section className="grid gap-5" aria-labelledby="why-title">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="why-title" className="t-heading">Why the experiment behaves this way</h2><ModeToggle value={mode} onChange={setMode} label="Experiment explanation depth" /></div>
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={mode} initial={{ opacity: 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.2 }} className="tp-card grid gap-5">
        {mode === "eli5" ? <><p className="prose-measure t-body">{lab.eli5.analogy}</p><ol className="prose-measure grid list-decimal gap-2 pl-5 t-body">{lab.eli5.steps.map((text) => <li key={text}>{text}</li>)}</ol><Callout tone="limit" title="Where the analogy breaks">{lab.eli5.limit}</Callout></> : <>
          <div><h3 className="t-subheading mb-2">Assumptions</h3><ul className="prose-measure list-disc pl-5 t-body-sm">{lab.senior.assumptions.map((text) => <li className="mb-2" key={text}>{text}</li>)}</ul></div>
          <p className="prose-measure t-body">{lab.senior.principle}</p>
          {([["Mechanism", lab.senior.mechanism], ["Trade-offs", lab.senior.tradeoffs], ["Failure modes", lab.senior.failureModes]] as const).map(([label, items]) => <div key={label}><h3 className="t-subheading mb-2">{label}</h3><ul className="prose-measure grid list-disc gap-2 pl-5 t-body-sm">{items.map((text) => <li key={text}>{text}</li>)}</ul></div>)}
          <Callout tone="note" title="An interview-ready explanation">{lab.senior.interviewAnswer}</Callout>
        </>}
      </motion.div>
    </AnimatePresence>
  </section>;
}

export function LabWorkspace({ labId, topics }: { labId: string; topics: { id: string; title: string; href: string }[] }) {
  const lab = findLab(labId)!;
  const progress = useClientProgress();
  const saved = progress?.labNotes[lab.id];
  const [draft, setDraft] = useState<LabParameters | null>(null);
  const [baselineDraft, setBaseline] = useState<LabParameters | null | undefined>(undefined);
  const [noteDraft, setNote] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [predictionRound, setPredictionRound] = useState(0);
  const [savedMessage, setSavedMessage] = useState("");
  const parameters = normalizeParameters(lab, draft ?? saved?.parameters ?? defaultParameters(lab));
  const rawBaseline = baselineDraft === undefined ? saved?.baseline ?? null : baselineDraft;
  const baseline = rawBaseline ? normalizeParameters(lab, rawBaseline) : null;
  const note = noteDraft ?? saved?.note ?? "";
  const result = lab.evaluate(parameters);
  const prediction = lab.predict(parameters);
  const comparison = baseline ? lab.evaluate(baseline) : null;
  const key = JSON.stringify(parameters);
  const setParameters = (next: LabParameters) => { setDraft(normalizeParameters(lab, next)); setSavedMessage(""); };
  const persist = (nextBaseline = baseline) => {
    actions.saveLabNote(lab.id, { parameters, baseline: nextBaseline, note });
    setSavedMessage("Experiment and notes saved in this browser. Progress export includes them.");
  };
  return <div className="grid gap-10">
    <Callout tone="note" title="Predict, change one thing, explain the result">This is a deterministic teaching model that runs locally. Predict before opening the outcome, then compare a counterexample. The controls change real calculations; they do not provision infrastructure or call a model provider.</Callout>
    <section className="grid gap-4" aria-labelledby="experiment-title">
      <h2 id="experiment-title" className="t-heading">Your experiment</h2>
      <div className="grid gap-4 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.2fr)]">
        <div className="tp-card grid content-start gap-6">
          <fieldset className="grid gap-2"><legend className="mb-3 t-label">Start with a scenario</legend>{lab.presets.map((preset) => <button type="button" key={preset.id} className={`rounded-[var(--radius-md)] border p-3 text-left hover:border-border-strong ${JSON.stringify(normalizeParameters(lab, preset.values)) === key ? "border-brand bg-brand-soft" : "border-border"}`} aria-pressed={JSON.stringify(normalizeParameters(lab, preset.values)) === key} onClick={() => setParameters(preset.values)}><span className="t-body-sm font-semibold block">{preset.label}</span><span className="t-caption tp-muted block mt-1">{preset.description}</span></button>)}</fieldset>
          {lab.controls.map((control) => <div key={control.key} className="tp-field">
            <label htmlFor={`lab-${control.key}`} className="tp-field__label">{control.label}</label>
            {control.options ? <select id={`lab-${control.key}`} className="tp-select" value={parameters[control.key]} aria-describedby={`lab-${control.key}-help`} onChange={(e) => setParameters({ ...parameters, [control.key]: Number(e.target.value) })}>{control.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <>
              <output htmlFor={`lab-${control.key}`} className="font-mono t-body-sm">{parameters[control.key]} {control.unit}</output>
              <input id={`lab-${control.key}`} className="w-full min-h-9 accent-[var(--brand)]" type="range" min={control.min} max={control.max} step={control.step} value={parameters[control.key]} aria-valuetext={`${parameters[control.key]} ${control.unit ?? ""}`} aria-describedby={`lab-${control.key}-help`} onChange={(e) => setParameters({ ...parameters, [control.key]: Number(e.target.value) })} />
            </>}
            <p className="tp-field__hint" id={`lab-${control.key}-help`}>{control.help}</p>
          </div>)}
          <button className="tp-btn tp-btn--secondary" type="button" onClick={() => { setParameters(defaultParameters(lab)); setShown(false); setPredictionRound((r) => r + 1); }}><RotateCcw className="tp-icon" aria-hidden />Reset inputs</button>
        </div>
        <div className="grid min-w-0 content-start gap-4">
          <PredictionCheck key={`${key}-${predictionRound}`} prediction={prediction} itemId={`lab-${lab.id}-prediction`} topicId={lab.topicIds[0]!} onReveal={() => setShown(true)} />
          <button type="button" className="tp-btn tp-btn--secondary w-fit" aria-expanded={shown} onClick={() => { if (shown) setPredictionRound((r) => r + 1); setShown((value) => !value); }}><FlaskConical className="tp-icon" aria-hidden />{shown ? "Hide results and predict again" : "Explore without recording a prediction"}</button>
          {shown && <section className="tp-card grid gap-5" aria-labelledby="outcome-title">
            <h3 id="outcome-title" className="t-subheading">Calculated outcome</h3>
            <p className="prose-measure t-body-sm" role="status">{result.insight}</p>
            <dl className="grid gap-4 sm:grid-cols-2">{result.metrics.map((metric) => <div key={metric.label} className="rounded-[var(--radius-md)] bg-surface-sunken p-3 min-w-0"><dt className="t-label tp-muted">{metric.label}</dt><dd className="mt-1 t-heading break-words">{typeof metric.value === "number" ? metric.value.toLocaleString("en-US", { maximumFractionDigits: 5 }) : metric.value} {metric.unit && <span className="t-caption font-normal">{metric.unit}</span>}</dd><dd className="mt-1 t-caption tp-muted">{metric.detail}</dd></div>)}</dl>
            {result.bars && <ResultBars bars={result.bars} />}
            <p className="t-caption tp-muted">Change one input to see a new calculation immediately. Hide results when you want to make another blind prediction.</p>
          </section>}
        </div>
      </div>
    </section>
    {shown && <>
      <NarratedResult key={`trace-${lab.id}`} result={result} />
      <section className="tp-card grid gap-4" aria-labelledby="data-title"><h2 id="data-title" className="t-heading">Inspect the evidence</h2><DataTable caption={result.table.caption} head={result.table.columns} rows={result.table.rows} /></section>
      <section className="tp-card grid gap-4" aria-labelledby="compare-title">
        <h2 id="compare-title" className="t-heading">Compare a counterfactual</h2>
        <p className="prose-measure t-body-sm tp-muted">Pin this configuration, then change one input. Compare both outcomes under the same teaching model. Pinning a baseline does not claim it is the best policy.</p>
        <div className="flex flex-wrap gap-2"><button className="tp-btn tp-btn--secondary" type="button" onClick={() => { setBaseline({ ...parameters }); if (progress) persist(parameters); }}><Pin className="tp-icon" aria-hidden />Pin current baseline</button>{baseline && <button className="tp-btn tp-btn--ghost" type="button" onClick={() => { setBaseline(null); if (progress) persist(null); }}>Clear baseline</button>}</div>
        {comparison && <><p className="t-caption tp-muted">Pinned inputs: {lab.controls.map((c) => `${c.label} ${baseline![c.key]}${c.unit ? ` ${c.unit}` : ""}`).join("; ")}</p><DataTable caption="Pinned baseline compared with current inputs" head={["Measure", "Pinned baseline", "Current experiment"]} rows={result.metrics.map((metric, i) => [metric.label, `${comparison.metrics[i]?.value ?? "Unavailable"} ${metric.unit ?? ""}`, `${metric.value} ${metric.unit ?? ""}`])} /></>}
      </section>
    </>}
    <Explanation lab={lab} />
    <section className="grid gap-4" aria-labelledby="challenge-title"><h2 id="challenge-title" className="t-heading">Break the tempting rule</h2><p className="prose-measure t-body-sm tp-muted">Try a new situation, rather than repeating a number from the experiment.</p>{lab.challenges.map((challenge) => <div key={challenge.id} className="grid gap-2"><details><summary className="cursor-pointer t-label">Hint for this challenge</summary><p className="prose-measure mt-2 t-body-sm tp-muted">{challenge.hint}</p></details><PredictionCheck prediction={challenge} itemId={`lab-${lab.id}-${challenge.id}`} topicId={lab.topicIds[0]!} onReveal={() => undefined} title="Transfer challenge" /></div>)}</section>
    <section className="grid gap-4" aria-labelledby="transfer-title"><h2 id="transfer-title" className="t-heading">Take it into an interview</h2><PracticeCard item={{ id: `lab-${lab.id}-transfer`, type: "design", prompt: lab.transfer.prompt, answer: lab.transfer.sampleAnswer, rubric: lab.transfer.checklist }} topicId={lab.topicIds[0]!} context="Explain your reasoning · self-graded" /></section>
    <section className="tp-card grid gap-4" aria-labelledby="notes-title"><h2 id="notes-title" className="t-heading">Keep your discovery</h2><label htmlFor="experiment-note" className="t-label">What changed your mind, and where would this model stop working?</label><textarea id="experiment-note" className="tp-input min-h-32" maxLength={6000} rows={5} value={note} onChange={(e) => { setNote(e.target.value); setSavedMessage(""); }} /><div className="flex flex-wrap items-center gap-3"><button type="button" className="tp-btn tp-btn--primary" disabled={!progress} onClick={() => persist()}><Save className="tp-icon" aria-hidden />Save experiment</button><p role="status" className="t-caption tp-muted">{savedMessage || "Save inputs, the pinned comparison and your notes before leaving. No cloud sync is used."}</p></div></section>
    <section className="grid gap-3" aria-labelledby="next-title"><h2 id="next-title" className="t-heading">Connect the experiment to the full theory</h2><ul className="grid gap-2">{topics.map((topic) => <li key={topic.id}><Link className="tp-link inline-flex items-start gap-2" href={topic.href}><Check className="tp-icon mt-1 shrink-0" aria-hidden />{topic.title}</Link></li>)}</ul><ul className="mt-2 grid gap-2 t-body-sm">{lab.references.map((reference) => <li key={reference.url}><a className="tp-link" href={reference.url} target="_blank" rel="noopener noreferrer">{reference.title}<span className="tp-sr-only"> (opens in a new tab)</span></a></li>)}</ul></section>
  </div>;
}
