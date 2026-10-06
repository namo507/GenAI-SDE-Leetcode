"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Check, CircleAlert, CircleCheck, Play, RotateCcw } from "lucide-react";
import type { ChoiceDrill, DesignDrill, NumericDrill, SqlDrill } from "@/lib/content-types";
import { compareSqlResult, sqlProgram, type SqlResult } from "@/lib/practice/sql";
import { actions } from "@/lib/progress/store";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Countdown, useStopwatch } from "@/components/ui/Stopwatch";
import { RuntimeStatus } from "@/components/learn/CodeRunner";
import { runtimeFor, useRuntimeState } from "@/components/learn/useRuntime";
import { ConfidencePicker } from "./Confidence";

export type TopicIndex = Record<string, { title: string; href: string }>;

export const DIFFICULTY = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" } as const;

export function DrillShell({
  drill,
  topics,
  children,
  badges,
}: {
  drill: { id: string; title: string; prompt: string; difficulty: keyof typeof DIFFICULTY; hints: string[]; topicIds: string[] };
  topics: TopicIndex;
  children: ReactNode;
  badges?: ReactNode;
}) {
  return (
    <article className="tp-card grid gap-4" aria-labelledby={`${drill.id}-title`}>
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="tp-chip">{DIFFICULTY[drill.difficulty]}</span>
          {badges}
          {drill.topicIds.map((id) =>
            topics[id] ? (
              <Link key={id} className="t-caption tp-link" href={topics[id].href}>
                {topics[id].title}
              </Link>
            ) : null,
          )}
        </div>
        <h3 id={`${drill.id}-title`} className="t-subheading">
          {drill.title}
        </h3>
        <p className="prose-measure t-body">{drill.prompt}</p>
      </div>
      {drill.hints.length > 0 && (
        <details>
          <summary className="cursor-pointer t-label">Hints ({drill.hints.length})</summary>
          <ul className="mt-2 grid list-disc gap-1 pl-6 t-body-sm">
            {drill.hints.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </details>
      )}
      {children}
    </article>
  );
}

function Verdict({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <div className={`tp-callout ${ok ? "tp-callout--positive" : "tp-callout--risk"}`}>
      {ok ? <CircleCheck className="tp-icon" aria-hidden /> : <CircleAlert className="tp-icon" aria-hidden />}
      <div>
        <p className="tp-callout__title">{ok ? "Correct" : "Not yet"}</p>
        <div className="tp-callout__body">{children}</div>
      </div>
    </div>
  );
}

const lastErrorLine = (error: string) =>
  error
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .pop() ?? error;

/* ---------- SQL ---------- */

function ResultTable({ result, caption }: { result: SqlResult; caption: string }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
      <table className="w-full border-collapse text-left font-mono text-[13px] leading-5">
        <caption className="px-3 py-2 text-left t-caption tp-muted">{caption}</caption>
        <thead className="bg-surface-sunken">
          <tr>
            {result.cols.map((c, i) => (
              <th key={`${c}-${i}`} scope="col" className="px-3 py-1.5 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.slice(0, 50).map((r, i) => (
            <tr key={i} className="border-t border-border">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-1.5">
                  {c === null ? <span className="tp-muted">NULL</span> : String(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SqlDrillCard({ drill, topics }: { drill: SqlDrill; topics: TopicIndex }) {
  const status = useRuntimeState("python");
  const [query, setQuery] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SqlResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<{ ok: boolean; reason: string } | null>(null);

  const execute = async (): Promise<SqlResult | null> => {
    setBusy(true);
    setError(null);
    const res = await runtimeFor("python").run(sqlProgram(drill.setup, query), { timeoutMs: 10_000 });
    setBusy(false);
    if (!res.ok) {
      setResult(null);
      setError(lastErrorLine(res.error ?? res.stderr ?? "The query failed."));
      return null;
    }
    try {
      const parsed = JSON.parse(res.stdout.trim().split("\n").pop() ?? "") as SqlResult;
      setResult(parsed);
      return parsed;
    } catch {
      setError("Could not read the query result.");
      return null;
    }
  };

  const check = async () => {
    if (confidence === null || !query.trim()) return;
    const out = await execute();
    const v = out ? compareSqlResult(out, drill) : { ok: false, reason: "The query did not run, so it cannot match." };
    setVerdict(v);
    actions.recordAttempt({ itemId: drill.id, topicId: drill.topicIds[0] ?? null, source: "drill", confidence, correct: v.ok });
  };

  return (
    <DrillShell drill={drill} topics={topics}>
      <details>
        <summary className="cursor-pointer t-label">Tables and data</summary>
        <CodeBlock className="mt-2" code={drill.setup.replace(/;\s*/g, ";\n")} language="sql" label="SQLite setup (runs before your query)" />
      </details>
      <div className="tp-field">
        <label htmlFor={`${drill.id}-sql`} className="tp-field__label">
          Your query
        </label>
        <textarea
          id={`${drill.id}-sql`}
          className="tp-textarea font-mono text-[14px]"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={6}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          placeholder="SELECT ..."
          disabled={verdict !== null}
        />
      </div>
      {verdict === null && <ConfidencePicker value={confidence} onChange={setConfidence} />}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="tp-btn tp-btn--secondary" onClick={() => void execute()} disabled={busy || !query.trim()}>
          <Play className="tp-icon" aria-hidden />
          Run query
        </button>
        {verdict === null ? (
          <button type="button" className="tp-btn tp-btn--primary" onClick={() => void check()} disabled={busy || !query.trim() || confidence === null}>
            <Check className="tp-icon" aria-hidden />
            Check answer
          </button>
        ) : (
          <button
            type="button"
            className="tp-btn tp-btn--ghost"
            onClick={() => {
              setVerdict(null);
              setConfidence(null);
            }}
          >
            <RotateCcw className="tp-icon" aria-hidden />
            Try again
          </button>
        )}
        <RuntimeStatus snapshot={status} />
      </div>
      {(!query.trim() || confidence === null) && verdict === null && <p className="t-caption tp-muted">Write a query and rate your confidence to check it. Run query previews the result without grading.</p>}
      <div role="status" aria-live="polite" className="grid gap-3">
        {error && <p className="font-mono text-[13px] text-critical">{error}</p>}
        {verdict && <Verdict ok={verdict.ok}>{verdict.reason}</Verdict>}
      </div>
      {result && <ResultTable result={result} caption={`Your result: ${result.rows.length} rows${result.rows.length > 50 ? " (first 50 shown)" : ""}`} />}
      {verdict && (
        <details>
          <summary className="cursor-pointer t-label">Show a reference solution</summary>
          <CodeBlock className="mt-2" code={drill.solution} language="sql" />
        </details>
      )}
    </DrillShell>
  );
}

/* ---------- Numeric ---------- */

export function NumericDrillCard({ drill, topics }: { drill: NumericDrill; topics: TopicIndex }) {
  const status = useRuntimeState("python");
  const [value, setValue] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<boolean | null>(null);
  const [verify, setVerify] = useState<{ busy: boolean; out: string | null }>({ busy: false, out: null });
  const parsed = Number(value.replace(/,/g, ""));
  const valid = value.trim() !== "" && Number.isFinite(parsed);

  const check = () => {
    if (!valid || confidence === null) return;
    const ok = Math.abs(parsed - drill.answer) <= drill.tolerance;
    setVerdict(ok);
    actions.recordAttempt({ itemId: drill.id, topicId: drill.topicIds[0] ?? null, source: "drill", confidence, correct: ok });
  };

  const runVerify = async () => {
    setVerify({ busy: true, out: null });
    const res = await runtimeFor("python").run(drill.verifyPython, { timeoutMs: 10_000 });
    setVerify({ busy: false, out: res.ok ? res.stdout.trim() : lastErrorLine(res.error ?? "Failed") });
  };

  return (
    <DrillShell drill={drill} topics={topics}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="tp-field w-56">
          <label htmlFor={`${drill.id}-answer`} className="tp-field__label">
            Your answer{drill.unit ? ` (${drill.unit})` : ""}
          </label>
          <input
            id={`${drill.id}-answer`}
            className="tp-input"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={value.trim() !== "" && !valid}
            aria-describedby={`${drill.id}-tol`}
            disabled={verdict !== null}
          />
        </div>
        <p id={`${drill.id}-tol`} className="pb-2 t-caption tp-muted">
          Accepted within ±{drill.tolerance}
        </p>
      </div>
      {verdict === null ? (
        <>
          <ConfidencePicker value={confidence} onChange={setConfidence} />
          <div>
            <button type="button" className="tp-btn tp-btn--primary" onClick={check} disabled={!valid || confidence === null}>
              <Check className="tp-icon" aria-hidden />
              Check answer
            </button>
          </div>
        </>
      ) : (
        <div>
          <button
            type="button"
            className="tp-btn tp-btn--ghost"
            onClick={() => {
              setVerdict(null);
              setConfidence(null);
            }}
          >
            <RotateCcw className="tp-icon" aria-hidden />
            Try again
          </button>
        </div>
      )}
      <div role="status" aria-live="polite">
        {verdict !== null && (
          <Verdict ok={verdict}>
            The answer is {drill.answer}
            {drill.unit ? ` ${drill.unit}` : ""}. {drill.solution}
          </Verdict>
        )}
      </div>
      {verdict !== null && (
        <details>
          <summary className="cursor-pointer t-label">See the computation and run it</summary>
          <div className="mt-2 grid gap-2">
            <CodeBlock code={drill.verifyPython} language="python" label="Python" />
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="tp-btn tp-btn--secondary tp-btn--sm" onClick={() => void runVerify()} disabled={verify.busy}>
                <Play className="tp-icon" aria-hidden />
                Run in Python
              </button>
              <RuntimeStatus snapshot={status} />
            </div>
            {verify.out !== null && (
              <p className="font-mono text-[13px]" role="status">
                Output: {verify.out}
              </p>
            )}
          </div>
        </details>
      )}
    </DrillShell>
  );
}

/* ---------- Design ---------- */

export function DesignDrillCard({ drill, topics }: { drill: DesignDrill; topics: TopicIndex }) {
  const watch = useStopwatch();
  const [notes, setNotes] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [phase, setPhase] = useState<"work" | "assess" | "done">("work");
  const [covered, setCovered] = useState<Set<number>>(new Set());
  const needed = Math.ceil(drill.rubric.length * 0.75);
  const ok = covered.size >= needed;

  return (
    <DrillShell drill={drill} topics={topics}>
      <Countdown watch={watch} seconds={drill.minutes * 60} label={`${drill.title} timer`} />
      <div className="tp-field">
        <label htmlFor={`${drill.id}-notes`} className="tp-field__label">
          Your design notes
        </label>
        <textarea id={`${drill.id}-notes`} className="tp-textarea" rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <span className="tp-field__hint">Notes stay on this page only and are not saved.</span>
      </div>
      {phase === "work" && (
        <>
          <ConfidencePicker value={confidence} onChange={setConfidence} />
          <div>
            <button
              type="button"
              className="tp-btn tp-btn--primary"
              disabled={confidence === null}
              onClick={() => {
                if (watch.running) watch.pause();
                setPhase("assess");
              }}
            >
              Finish and self-assess
            </button>
          </div>
        </>
      )}
      {phase !== "work" && (
        <div className="grid gap-4">
          <fieldset className="grid gap-1">
            <legend className="mb-1 t-label">
              Tick each point your design covered. {needed} of {drill.rubric.length} counts as correct.
            </legend>
            {drill.rubric.map((r, i) => (
              <label key={r} className="tp-check">
                <input
                  type="checkbox"
                  checked={covered.has(i)}
                  disabled={phase === "done"}
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
          <details>
            <summary className="cursor-pointer t-label">Model answer</summary>
            <p className="mt-2 prose-measure whitespace-pre-line t-body">{drill.modelAnswer}</p>
          </details>
          {phase === "assess" ? (
            <div>
              <button
                type="button"
                className="tp-btn tp-btn--primary"
                onClick={() => {
                  actions.recordAttempt({ itemId: drill.id, topicId: drill.topicIds[0] ?? null, source: "drill", confidence: confidence ?? 3, correct: ok });
                  setPhase("done");
                }}
              >
                Record result ({covered.size} of {drill.rubric.length})
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3" role="status">
              <span className={`tp-chip ${ok ? "tp-chip--positive" : "tp-chip--caution"}`}>{ok ? "Recorded as correct" : "Recorded as not yet"}</span>
              <button
                type="button"
                className="tp-btn tp-btn--ghost tp-btn--sm"
                onClick={() => {
                  setPhase("work");
                  setCovered(new Set());
                  setConfidence(null);
                  watch.reset();
                }}
              >
                <RotateCcw className="tp-icon" aria-hidden />
                Try again
              </button>
            </div>
          )}
        </div>
      )}
    </DrillShell>
  );
}

/* ---------- Choice ---------- */

export function ChoiceDrillCard({ drill, topics }: { drill: ChoiceDrill; topics: TopicIndex }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const ok = selected === drill.correct;

  return (
    <DrillShell drill={drill} topics={topics}>
      <fieldset className="grid gap-2" disabled={checked}>
        <legend className="mb-1 t-label">Choose one</legend>
        {drill.options.map((o, i) => (
          <label
            key={o}
            className={`tp-check items-start rounded-[var(--radius-md)] border px-3 py-2 ${
              checked && i === drill.correct ? "border-positive bg-positive-soft" : checked && i === selected ? "border-critical bg-critical-soft" : "border-border"
            }`}
          >
            <input type="radio" className="mt-1" name={`${drill.id}-choice`} checked={selected === i} onChange={() => setSelected(i)} />
            <span>
              {o}
              {checked && i === drill.correct && <span className="tp-sr-only"> (correct answer)</span>}
              {checked && i === selected && i !== drill.correct && <span className="tp-sr-only"> (your answer)</span>}
            </span>
          </label>
        ))}
      </fieldset>
      {!checked ? (
        <>
          <ConfidencePicker value={confidence} onChange={setConfidence} />
          <div>
            <button
              type="button"
              className="tp-btn tp-btn--primary"
              disabled={selected === null || confidence === null}
              onClick={() => {
                if (selected === null || confidence === null) return;
                setChecked(true);
                actions.recordAttempt({ itemId: drill.id, topicId: drill.topicIds[0] ?? null, source: "drill", confidence, correct: selected === drill.correct });
              }}
            >
              <Check className="tp-icon" aria-hidden />
              Check answer
            </button>
          </div>
        </>
      ) : (
        <div>
          <button
            type="button"
            className="tp-btn tp-btn--ghost"
            onClick={() => {
              setChecked(false);
              setSelected(null);
              setConfidence(null);
            }}
          >
            <RotateCcw className="tp-icon" aria-hidden />
            Try again
          </button>
        </div>
      )}
      <div role="status" aria-live="polite">
        {checked && <Verdict ok={ok}>{drill.explanation}</Verdict>}
      </div>
    </DrillShell>
  );
}
