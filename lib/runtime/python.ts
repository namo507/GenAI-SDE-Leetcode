"use client";

import { PYTHON_PACKAGE_ALLOWLIST } from "@/lib/curriculum";
import { DEFAULT_MAX_OUTPUT, DEFAULT_TIMEOUT_MS, type RunOptions, type RunResult, type Runtime, type RuntimeSnapshot } from "./types";

/** Import name -> Pyodide package name, for the allowlisted packages. */
const IMPORT_ALLOWLIST: Record<string, string> = Object.fromEntries(
  PYTHON_PACKAGE_ALLOWLIST.map((pkg) => [pkg === "scikit-learn" ? "sklearn" : pkg, pkg]),
);

type WorkerMessage =
  | { type: "status"; state: "loading" | "ready" | "running" | "error"; detail: string }
  | { type: "stdout" | "stderr"; id: number; text: string }
  | { type: "done"; id: number; ok: boolean; error?: string };

/**
 * Python runtime backed by Pyodide in a dedicated Web Worker. The worker is
 * created lazily on first use; terminating it (timeout, output limit, or the
 * learner's Terminate button) throws the interpreter away entirely.
 */
class PythonRuntime implements Runtime {
  readonly language = "python" as const;
  private worker: Worker | null = null;
  private state: RuntimeSnapshot = { state: "idle", detail: "Python runtime not loaded" };
  private listeners = new Set<() => void>();
  private nextId = 1;
  private active: { id: number; finish: (r: Partial<RunResult>) => void } | null = null;

  snapshot() {
    return this.state;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private set(state: RuntimeSnapshot) {
    this.state = state;
    this.listeners.forEach((l) => l());
  }

  private spawn(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker("/workers/pyodide-worker.mjs", { type: "module" });
    worker.onmessage = (e: MessageEvent<WorkerMessage>) => this.onMessage(e.data);
    worker.onerror = () => {
      this.set({ state: "error", detail: "The Python worker failed to start. Check your connection and try again." });
      this.active?.finish({ ok: false, error: "The Python worker stopped unexpectedly." });
      this.dispose();
    };
    this.worker = worker;
    return worker;
  }

  private onMessage(msg: WorkerMessage) {
    if (msg.type === "status") {
      if (msg.state === "ready") this.lastReady = msg.detail;
      this.set({ state: msg.state, detail: msg.detail });
      if (msg.state === "running") this.onRunning?.();
      return;
    }
    if (!this.active || msg.id !== this.active.id) return;
    if (msg.type === "stdout" || msg.type === "stderr") this.onChunk?.(msg.type, msg.text);
    if (msg.type === "done") this.active.finish({ ok: msg.ok, error: msg.error ?? null });
  }

  private onRunning: (() => void) | null = null;
  private onChunk: ((stream: "stdout" | "stderr", text: string) => void) | null = null;

  async ensure() {
    if (this.state.state === "ready" || this.state.state === "running") return;
    const worker = this.spawn();
    await new Promise<void>((resolve) => {
      const unsubscribe = this.subscribe(() => {
        if (this.state.state === "ready" || this.state.state === "error") {
          unsubscribe();
          resolve();
        }
      });
      worker.postMessage({ type: "init" });
    });
  }

  run(code: string, options: RunOptions = {}): Promise<RunResult> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxOutput = options.maxOutput ?? DEFAULT_MAX_OUTPUT;
    if (this.active) return Promise.resolve(blank({ ok: false, error: "Another run is still in progress." }));

    return new Promise<RunResult>((resolve) => {
      const started = performance.now();
      const id = this.nextId++;
      let stdout = "";
      let stderr = "";
      let timer: ReturnType<typeof setTimeout> | null = null;
      // A safety net for runtime download and package loading, before the execution clock starts.
      const setupTimer = setTimeout(() => {
        finish({ ok: false, error: "The Python runtime took too long to load. Check your connection and try again.", terminated: true });
        this.terminate();
      }, 120_000);

      const finish = (r: Partial<RunResult>) => {
        if (!this.active || this.active.id !== id) return;
        if (timer) clearTimeout(timer);
        clearTimeout(setupTimer);
        this.active = null;
        this.onRunning = null;
        this.onChunk = null;
        if (this.state.state === "running") this.set({ state: "ready", detail: this.lastReady });
        resolve(blank({ ...r, stdout, stderr, ms: Math.round(performance.now() - started) }));
      };

      this.active = { id, finish };
      this.onRunning = () => {
        clearTimeout(setupTimer);
        timer = setTimeout(() => {
          finish({ ok: false, timedOut: true, terminated: true, error: `Stopped after ${timeoutMs / 1000} s. The runtime was restarted; check for an infinite loop.` });
          this.terminate();
        }, timeoutMs);
      };
      this.onChunk = (stream, text) => {
        if (stdout.length + stderr.length + text.length > maxOutput) {
          const room = Math.max(0, maxOutput - stdout.length - stderr.length);
          if (stream === "stdout") stdout += text.slice(0, room);
          else stderr += text.slice(0, room);
          finish({ ok: false, truncated: true, terminated: true, error: `Output limit of ${maxOutput.toLocaleString("en-US")} characters reached; the run was stopped.` });
          this.terminate();
          return;
        }
        if (stream === "stdout") stdout += text;
        else stderr += text;
        options.onOutput?.(stream, text);
      };

      const worker = this.spawn();
      worker.postMessage({ type: "run", id, code, allowlist: IMPORT_ALLOWLIST });
    });
  }

  private lastReady = "Python ready";

  terminate(reason = "Python runtime stopped. It will reload on the next run.") {
    this.active?.finish({ ok: false, terminated: true, error: "Run terminated." });
    this.dispose();
    this.set({ state: "idle", detail: reason });
  }

  private dispose() {
    this.worker?.terminate();
    this.worker = null;
    this.active = null;
  }
}

function blank(r: Partial<RunResult>): RunResult {
  return { ok: false, stdout: "", stderr: "", error: null, timedOut: false, truncated: false, terminated: false, ms: 0, ...r };
}

let instance: PythonRuntime | null = null;
export function getPythonRuntime(): Runtime {
  instance ??= new PythonRuntime();
  return instance;
}
