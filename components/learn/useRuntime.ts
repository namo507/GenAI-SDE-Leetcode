"use client";

import { useSyncExternalStore } from "react";
import type { Language } from "@/lib/curriculum";
import { getPythonRuntime } from "@/lib/runtime/python";
import { getRRuntime } from "@/lib/runtime/r";
import type { RunResult, Runtime, RuntimeSnapshot } from "@/lib/runtime/types";

/**
 * A build can switch code execution off with NEXT_PUBLIC_CODE_RUNNERS=off, for
 * static hosts that cannot download Pyodide or webR. Lessons then show the
 * expected output and explain how to run the code, instead of a stalled download.
 */
export const RUNNERS_OFF = process.env.NEXT_PUBLIC_CODE_RUNNERS === "off";
const OFF_DETAIL = "Code execution is off in this preview. Run the site locally (npm run build, then npm start) to execute Python and R.";

class UnavailableRuntime implements Runtime {
  private readonly state: RuntimeSnapshot = { state: "error", detail: OFF_DETAIL };
  constructor(readonly language: Language) {}
  snapshot() {
    return this.state;
  }
  subscribe() {
    return () => undefined;
  }
  ensure() {
    return Promise.resolve();
  }
  run(): Promise<RunResult> {
    return Promise.resolve({ ok: false, stdout: "", stderr: "", error: OFF_DETAIL, timedOut: false, truncated: false, terminated: false, ms: 0 });
  }
  terminate() {}
}

const unavailable = { python: new UnavailableRuntime("python"), r: new UnavailableRuntime("r") };
const getPython = (): Runtime => (RUNNERS_OFF ? unavailable.python : getPythonRuntime());
const getR = (): Runtime => (RUNNERS_OFF ? unavailable.r : getRRuntime());

export const runtimeFor = (lang: Language): Runtime => (lang === "python" ? getPython() : getR());

const IDLE: Record<Language, RuntimeSnapshot> = {
  python: { state: "idle", detail: "Python runtime not loaded" },
  r: { state: "idle", detail: "R runtime not loaded" },
};

const subscribers = {
  python: (cb: () => void) => getPython().subscribe(cb),
  r: (cb: () => void) => getR().subscribe(cb),
};
const snapshots = {
  python: () => getPython().snapshot(),
  r: () => getR().snapshot(),
};

/** Live state of a language runtime (idle, loading, ready, running, error). */
export function useRuntimeState(lang: Language): RuntimeSnapshot {
  return useSyncExternalStore(subscribers[lang], snapshots[lang], () => IDLE[lang]);
}
