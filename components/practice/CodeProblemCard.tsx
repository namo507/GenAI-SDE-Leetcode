"use client";

import { useId, useState } from "react";
import { Baby, CircleAlert, CircleCheck, Eye, EyeOff, FlaskConical, RotateCcw, Square } from "lucide-react";
import type { CodeProblem } from "@/lib/content-types";
import type { Language } from "@/lib/curriculum";
import { pythonTestProgram, rTestProgram } from "@/lib/runtime/harness";
import { DEFAULT_MAX_OUTPUT, type RunResult } from "@/lib/runtime/types";
import { actions, useProgress } from "@/lib/progress/store";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { TabList, TabPanel } from "@/components/ui/Tabs";
import { RuntimeStatus } from "@/components/learn/CodeRunner";
import { runtimeFor, useRuntimeState } from "@/components/learn/useRuntime";
import { ConfidencePicker } from "./Confidence";
import { DrillShell, type TopicIndex } from "./Drills";

const LANG_LABEL: Record<Language, string> = { python: "Python", r: "R" };
const TEST_TIMEOUT_MS = 15_000;

type Outcome = { stdout: string; stderr: string; result: RunResult | null };

/**
 * A LeetCode-style problem: edit the starter in Python or R, run the hidden
 * tests in the browser, then compare with the reference solution and its
 * plain-language explanation.
 */
export function CodeProblemCard({ problem, topics }: { problem: CodeProblem; topics: TopicIndex }) {
  const { settings } = useProgress();
  const idBase = useId();
  const [chosen, setChosen] = useState<Language | null>(null);
  const lang = chosen ?? settings.language;
  const [code, setCode] = useState<Record<Language, string>>({ python: problem.python.starter, r: problem.r.starter });
  const [outcome, setOutcome] = useState<Record<Language, Outcome | null>>({ python: null, r: null });
  const [busy, setBusy] = useState(false);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const snapshot = useRuntimeState(lang);

  const runTests = async () => {
    if (busy) return;
    const target = lang;
    const program = target === "python" ? pythonTestProgram(code.python, problem.python.tests) : rTestProgram(code.r, problem.r.tests);
    setBusy(true);
    setOutcome((o) => ({ ...o, [target]: { stdout: "", stderr: "", result: null } }));
    const result = await runtimeFor(target).run(program, {
      timeoutMs: TEST_TIMEOUT_MS,
      maxOutput: DEFAULT_MAX_OUTPUT,
      onOutput: (stream, text) =>
        setOutcome((o) => {
          const prev = o[target] ?? { stdout: "", stderr: "", result: null };
          return { ...o, [target]: { ...prev, [stream]: prev[stream] + text } };
        }),
    });
    setOutcome((o) => ({ ...o, [target]: { stdout: result.stdout, stderr: result.stderr, result } }));
    setBusy(false);
    if (confidence !== null) {
      actions.recordAttempt({ itemId: problem.id, topicId: problem.topicIds[0] ?? null, source: "drill", confidence, correct: result.ok });
      setConfidence(null);
    }
  };

  const current = outcome[lang];
  const result = current?.result;
  const edited = code[lang] !== problem[lang].starter;
  const lines = code[lang].split("\n").length;

  return (
    <DrillShell
      drill={problem}
      topics={topics}
      badges={
        <>
          <span className="tp-chip">{problem.pattern}</span>
        </>
      }
    >
      <div className="grid gap-2">
        <p className="t-label">Examples</p>
        <ul className="grid gap-2">
          {problem.examples.map((ex) => (
            <li key={ex.input} className="rounded-[var(--radius-md)] border border-border bg-surface-sunken px-3 py-2 font-mono text-[13px] leading-5">
              <span className="tp-muted">Input </span>
              {ex.input}
              <br />
              <span className="tp-muted">Output </span>
              {ex.output}
              {ex.note && <span className="block font-sans t-caption tp-muted">{ex.note}</span>}
            </li>
          ))}
        </ul>
      </div>

      <details className="tp-runner" onToggle={(e) => e.currentTarget.open && runtimeFor(lang).ensure().catch(() => undefined)}>
        <summary className="cursor-pointer px-4 py-3 t-label">Solve it in Python or R</summary>
        <div className="tp-runner__bar">
          <TabList
            idBase={idBase}
            label={`Language for ${problem.title}`}
            tabs={[
              { id: "python", label: "Python" },
              { id: "r", label: "R" },
            ]}
            value={lang}
            onChange={setChosen}
          />
          <div className="tp-runner__actions">
            <button type="button" className="tp-btn tp-btn--primary tp-btn--sm" onClick={() => void runTests()} disabled={busy}>
              <FlaskConical className="tp-icon" aria-hidden />
              Run tests
            </button>
            <button
              type="button"
              className="tp-btn tp-btn--ghost tp-btn--sm"
              onClick={() => {
                setCode((c) => ({ ...c, [lang]: problem[lang].starter }));
                setOutcome((o) => ({ ...o, [lang]: null }));
              }}
              disabled={!edited || busy}
            >
              <RotateCcw className="tp-icon" aria-hidden />
              Reset
            </button>
            <button type="button" className="tp-btn tp-btn--danger tp-btn--sm" onClick={() => runtimeFor(lang).terminate()} disabled={!busy}>
              <Square className="tp-icon" aria-hidden />
              Stop
            </button>
            <button type="button" className="tp-btn tp-btn--secondary tp-btn--sm" aria-pressed={showSolution} onClick={() => setShowSolution((v) => !v)}>
              {showSolution ? <EyeOff className="tp-icon" aria-hidden /> : <Eye className="tp-icon" aria-hidden />}
              {showSolution ? "Hide solution" : "Show solution"}
            </button>
          </div>
        </div>
        <TabPanel idBase={idBase} value={lang} panelKey={lang}>
          <label htmlFor={`${idBase}-editor-${lang}`} className="tp-sr-only">
            {LANG_LABEL[lang]} solution, editable
          </label>
          <textarea
            id={`${idBase}-editor-${lang}`}
            className="tp-runner__code"
            value={code[lang]}
            onChange={(e) => setCode((c) => ({ ...c, [lang]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void runTests();
              }
            }}
            rows={Math.min(Math.max(lines + 2, 8), 24)}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            wrap="off"
          />
          <div className="grid gap-3 border-t border-border px-4 py-3">
            <ConfidencePicker value={confidence} onChange={setConfidence} disabled={busy} />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <RuntimeStatus snapshot={snapshot} />
              <span className="t-caption tp-muted">Rate your confidence to log the next test run in your progress. Control or Command plus Enter runs the tests.</span>
            </div>
          </div>
          {current && (
            <div className="tp-runner__io">
              <div className="tp-runner__pane col-span-full">
                <p className="tp-runner__pane-title">Test output</p>
                <pre className="tp-runner__out" aria-busy={busy}>
                  {current.stdout}
                  {current.stderr && <span className="tp-runner__err">{current.stderr}</span>}
                  {result?.error && <span className="tp-runner__err">{`\n${result.error}`}</span>}
                  {busy && !current.stdout && !current.stderr && (
                    <span className="tp-muted">{snapshot.state === "loading" ? "Waiting for the runtime..." : "Running the tests..."}</span>
                  )}
                </pre>
              </div>
            </div>
          )}
          <div role="status" aria-live="polite">
            {result && (
              <div className="tp-runner__verdict" data-match={result.ok}>
                {result.ok ? <CircleCheck className="tp-icon" aria-hidden /> : <CircleAlert className="tp-icon" aria-hidden />}
                <span>
                  {result.ok ? "All tests passed." : result.timedOut ? "Stopped: the time limit was reached." : "Some tests failed. Read the FAIL lines above."}
                  <span className="tp-muted font-normal"> ({(result.ms / 1000).toFixed(2)} s)</span>
                </span>
              </div>
            )}
          </div>
          {showSolution && (
            <div className="grid gap-3 border-t border-border p-4">
              <CodeBlock code={problem[lang].solution} language={lang} label={`Reference solution in ${LANG_LABEL[lang]}`} />
              <div className="tp-callout tp-callout--note">
                <Baby className="tp-icon" aria-hidden />
                <div>
                  <p className="tp-callout__title">Explain like I&apos;m 5</p>
                  <p className="tp-callout__body">{problem.eli5}</p>
                </div>
              </div>
              <p className="t-body-sm">
                <span className="font-semibold">Complexity: </span>
                {problem.complexity}
              </p>
            </div>
          )}
        </TabPanel>
      </details>
    </DrillShell>
  );
}
