"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { CircleAlert, CircleCheck, CircleDashed, FlaskConical, LoaderCircle, Play, RotateCcw, Square } from "lucide-react";
import { PYTHON_PACKAGE_ALLOWLIST, R_PACKAGE_ALLOWLIST, type Implementation, type Language } from "@/lib/curriculum";
import { normalizeOutput, outputsMatch, pythonTestProgram, rTestProgram } from "@/lib/runtime/harness";
import { DEFAULT_MAX_OUTPUT, DEFAULT_TIMEOUT_MS, type RunResult, type RuntimeSnapshot } from "@/lib/runtime/types";
import { useProgress } from "@/lib/progress/store";
import { TabList, TabPanel } from "@/components/ui/Tabs";
import { runtimeFor, useRuntimeState } from "./useRuntime";

const LANG_LABEL: Record<Language, string> = { python: "Python", r: "R" };
const R_EXTRA_PACKAGES = R_PACKAGE_ALLOWLIST.filter((p) => ["MASS", "Matrix", "survival", "jsonlite"].includes(p));

type Outcome = { kind: "run" | "tests"; stdout: string; stderr: string; result: RunResult | null };

export function RuntimeStatus({ snapshot }: { snapshot: RuntimeSnapshot }) {
  const Icon =
    snapshot.state === "ready" ? CircleCheck : snapshot.state === "error" ? CircleAlert : snapshot.state === "idle" ? CircleDashed : LoaderCircle;
  return (
    <span className="tp-runner__status" data-state={snapshot.state} role="status" aria-live="polite">
      <Icon className={`tp-icon ${snapshot.state === "loading" || snapshot.state === "running" ? "animate-spin" : ""}`} aria-hidden />
      {snapshot.detail}
    </span>
  );
}

/** Line number (1-based) of the first difference between two outputs, after normalization. */
function firstDifference(actual: string, expected: string): number {
  const a = normalizeOutput(actual).split("\n");
  const e = normalizeOutput(expected).split("\n");
  const n = Math.max(a.length, e.length);
  for (let i = 0; i < n; i++) if (a[i] !== e[i]) return i + 1;
  return 0;
}

function Verdict({ outcome, expected }: { outcome: Outcome; expected: string }) {
  const r = outcome.result;
  if (!r) return null;
  let match: boolean;
  let text: string;
  if (outcome.kind === "tests") {
    match = r.ok;
    text = r.ok ? "All tests passed." : r.timedOut || r.truncated || r.terminated ? "The test run was stopped." : "Some tests failed. Read the FAIL lines above.";
  } else if (!r.ok) {
    match = false;
    text = r.timedOut ? "Stopped: time limit reached." : r.truncated ? "Stopped: output limit reached." : "The program raised an error.";
  } else if (outputsMatch(r.stdout, expected)) {
    match = true;
    text = "Output matches the expected output.";
  } else {
    match = false;
    text = `Output differs from the expected output, starting at line ${firstDifference(r.stdout, expected)}.`;
  }
  return (
    <div className="tp-runner__verdict" data-match={match}>
      {match ? <CircleCheck className="tp-icon" aria-hidden /> : <CircleAlert className="tp-icon" aria-hidden />}
      <span>
        {text}
        <span className="tp-muted font-normal"> {r.ms > 0 ? `(${(r.ms / 1000).toFixed(2)} s)` : ""}</span>
      </span>
    </div>
  );
}

/**
 * Paired Python and R runner. Both programs solve the same problem and print
 * the same text; CI checks that, and this component checks the learner's
 * edited version against the same expected output.
 */
export function CodeRunner({ implementation, title }: { implementation: Implementation; title: string }) {
  const { settings } = useProgress();
  const idBase = useId();
  const [chosen, setChosen] = useState<Language | null>(null);
  const lang = chosen ?? settings.language;
  const [code, setCode] = useState<Record<Language, string>>({ python: implementation.python.code, r: implementation.r.code });
  const [outcomes, setOutcomes] = useState<Record<Language, Outcome | null>>({ python: null, r: null });
  const [running, setRunning] = useState<Record<Language, boolean>>({ python: false, r: false });
  const snapshot = useRuntimeState(lang);

  const run = async (kind: Outcome["kind"]) => {
    const target = lang;
    if (running[target]) return;
    const source = code[target];
    const program =
      kind === "run" ? source : target === "python" ? pythonTestProgram(source, implementation.tests.python) : rTestProgram(source, implementation.tests.r);
    setRunning((s) => ({ ...s, [target]: true }));
    setOutcomes((o) => ({ ...o, [target]: { kind, stdout: "", stderr: "", result: null } }));
    const result = await runtimeFor(target).run(program, {
      timeoutMs: DEFAULT_TIMEOUT_MS,
      maxOutput: DEFAULT_MAX_OUTPUT,
      onOutput: (stream, text) =>
        setOutcomes((o) => {
          const prev = o[target] ?? { kind, stdout: "", stderr: "", result: null };
          return { ...o, [target]: { ...prev, [stream]: prev[stream] + text } };
        }),
    });
    setOutcomes((o) => ({ ...o, [target]: { kind, stdout: result.stdout, stderr: result.stderr, result } }));
    setRunning((s) => ({ ...s, [target]: false }));
  };

  const onEditorKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void run("run");
    }
  };

  const outcome = outcomes[lang];
  const edited = code[lang] !== implementation[lang].code;
  const busy = running[lang];
  const canStop = busy || snapshot.state === "loading" || snapshot.state === "running";
  const lines = code[lang].split("\n").length;
  const allow = lang === "python" ? PYTHON_PACKAGE_ALLOWLIST.join(", ") : `base R, ${R_EXTRA_PACKAGES.join(", ")}`;
  const errorText = outcome?.result?.error ?? "";

  return (
    <div className="tp-runner">
      <div className="tp-runner__bar">
        <TabList
          idBase={idBase}
          label={`Language for ${title}`}
          tabs={[
            { id: "python", label: "Python" },
            { id: "r", label: "R" },
          ]}
          value={lang}
          onChange={setChosen}
        />
        <div className="tp-runner__actions">
          <button type="button" className="tp-btn tp-btn--primary tp-btn--sm" onClick={() => void run("run")} disabled={busy}>
            <Play className="tp-icon" aria-hidden />
            Run
          </button>
          <button type="button" className="tp-btn tp-btn--secondary tp-btn--sm" onClick={() => void run("tests")} disabled={busy}>
            <FlaskConical className="tp-icon" aria-hidden />
            Run tests
          </button>
          <button
            type="button"
            className="tp-btn tp-btn--ghost tp-btn--sm"
            onClick={() => {
              setCode((c) => ({ ...c, [lang]: implementation[lang].code }));
              setOutcomes((o) => ({ ...o, [lang]: null }));
            }}
            disabled={!edited || busy}
          >
            <RotateCcw className="tp-icon" aria-hidden />
            Reset code
          </button>
          <button type="button" className="tp-btn tp-btn--danger tp-btn--sm" onClick={() => runtimeFor(lang).terminate()} disabled={!canStop}>
            <Square className="tp-icon" aria-hidden />
            Stop
          </button>
        </div>
      </div>

      <TabPanel idBase={idBase} value={lang}>
        <label htmlFor={`${idBase}-editor-${lang}`} className="tp-sr-only">
          {LANG_LABEL[lang]} code, editable. Control or Command plus Enter runs it.
        </label>
        <textarea
          id={`${idBase}-editor-${lang}`}
          className="tp-runner__code"
          value={code[lang]}
          onChange={(e) => setCode((c) => ({ ...c, [lang]: e.target.value }))}
          onKeyDown={onEditorKey}
          rows={Math.min(Math.max(lines + 1, 8), 30)}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          wrap="off"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2">
          <RuntimeStatus snapshot={snapshot} />
          <span className="t-caption tp-muted">
            Runs in a Web Worker in your browser. {DEFAULT_TIMEOUT_MS / 1000} s and {DEFAULT_MAX_OUTPUT.toLocaleString("en-US")} characters per run. Allowed: {allow}.
          </span>
        </div>
        <div className="tp-runner__io">
          <div className="tp-runner__pane">
            <p className="tp-runner__pane-title">{outcome?.kind === "tests" ? "Test output" : "Your output"}</p>
            {outcome ? (
              <pre className="tp-runner__out" aria-busy={busy}>
                {outcome.stdout}
                {outcome.stderr && <span className="tp-runner__err">{outcome.stderr}</span>}
                {errorText && <span className="tp-runner__err">{`${outcome.stdout || outcome.stderr ? "\n" : ""}${errorText}`}</span>}
                {busy && !outcome.stdout && !outcome.stderr && <span className="tp-muted">{snapshot.state === "loading" ? "Waiting for the runtime..." : "Running..."}</span>}
              </pre>
            ) : (
              <p className="t-body-sm tp-muted">Press Run to execute the program, or Run tests to run its unit tests. The first run downloads the {LANG_LABEL[lang]} runtime, so it takes longer than later runs.</p>
            )}
          </div>
          <div className="tp-runner__pane">
            <p className="tp-runner__pane-title">Expected output (identical in Python and R)</p>
            <pre className="tp-runner__out">{implementation.expectedOutput}</pre>
          </div>
        </div>
        <div role="status" aria-live="polite">
          {outcome && <Verdict outcome={outcome} expected={implementation.expectedOutput} />}
        </div>
      </TabPanel>
    </div>
  );
}
