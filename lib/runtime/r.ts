"use client";

import type { WebR } from "webr";
import { R_PACKAGE_ALLOWLIST } from "@/lib/curriculum";
import { DEFAULT_MAX_OUTPUT, DEFAULT_TIMEOUT_MS, type RunOptions, type RunResult, type Runtime, type RuntimeSnapshot } from "./types";

const BASE_PACKAGES = new Set(["base", "stats", "utils", "methods", "datasets", "graphics", "grDevices", "tools", "grid", "splines", "stats4"]);

/**
 * Blanks out comments and the contents of string literals with spaces, keeping
 * every other character at its original offset, so a scan of the result never
 * mistakes text such as "arn:aws:s3:::bucket" or a comment for package access.
 */
function maskRCode(code: string): string {
  let out = "";
  let quote: string | null = null;
  let comment = false;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i]!;
    if (comment) {
      comment = ch !== "\n";
      out += comment ? " " : ch;
    } else if (quote) {
      if (ch === "\\" && i + 1 < code.length) {
        out += code[i + 1] === "\n" ? " \n" : "  ";
        i++;
      } else if (ch === quote) {
        quote = null;
        out += ch;
      } else {
        out += ch === "\n" ? ch : " ";
      }
    } else if (ch === "#") {
      comment = true;
      out += " ";
    } else {
      if (ch === '"' || ch === "'") quote = ch;
      out += ch;
    }
  }
  return out;
}

/** Packages referenced via library(), require(), requireNamespace() or pkg:: in the code (not in strings or comments). */
export function referencedRPackages(code: string): string[] {
  const masked = maskRCode(code);
  const found = new Set<string>();
  for (const m of masked.matchAll(/\b(?:library|require|requireNamespace)\s*\(\s*(?:package\s*=\s*)?/g)) {
    const arg = /^["']?([A-Za-z][A-Za-z0-9.]*)/.exec(code.slice(m.index + m[0].length));
    if (arg) found.add(arg[1]!);
  }
  for (const m of masked.matchAll(/\b([A-Za-z][A-Za-z0-9.]*)\s*:::?\s*[A-Za-z.]/g)) found.add(m[1]!);
  return [...found];
}

type Condition = { get: (name: string) => Promise<{ toString: () => Promise<string> }> };

async function conditionMessage(data: unknown): Promise<string> {
  try {
    const msg = await (data as Condition).get("message");
    return await msg.toString();
  } catch {
    return String(data);
  }
}

/**
 * R runtime backed by webR. webR runs R inside its own dedicated Web Worker
 * and exposes a proxy on the main thread; nothing executes on the server.
 * Closing webR terminates that worker.
 */
export class RRuntime implements Runtime {
  readonly language = "r" as const;
  private webR: WebR | null = null;
  private starting: Promise<void> | null = null;
  private state: RuntimeSnapshot = { state: "idle", detail: "R runtime not loaded" };
  private listeners = new Set<() => void>();
  private busy = false;
  private readyDetail = "R ready";
  private generation = 0;
  /** Settles the run in progress when the learner presses Stop. */
  private stopActive: (() => void) | null = null;
  private streamOutput: ((stream: "stdout" | "stderr", text: string) => void) | null = null;
  private nextRun = 0;

  private async readOutput(webR: WebR, gen: number) {
    try {
      for await (const message of webR.stream()) {
        if (gen !== this.generation) return;
        if (message.type === "stdout" || message.type === "stderr") {
          this.streamOutput?.(message.type, String(message.data));
        }
      }
    } catch {
      if (gen === this.generation) this.terminate("The R worker stopped unexpectedly. Run again to reload it.");
    }
  }

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

  ensure(): Promise<void> {
    if (this.starting) return this.starting;
    if (this.webR && (this.state.state === "ready" || this.state.state === "running")) return Promise.resolve();
    this.set({ state: "loading", detail: "Downloading the R runtime (webR)" });
    const gen = ++this.generation;
    this.starting = (async () => {
      try {
        const { WebR } = await import("webr");
        if (gen !== this.generation) return;
        const webR = new WebR({ interactive: false });
        // Retain the instance before init so Stop can close a downloading worker.
        this.webR = webR;
        await webR.init();
        if (gen !== this.generation) {
          webR.close();
          return;
        }
        const version = await webR.evalRString("paste(R.version$major, R.version$minor, sep = '.')");
        if (gen !== this.generation) {
          webR.close();
          return;
        }
        this.readyDetail = `R ${version} (webR)`;
        // Discard the startup banner before attaching the per-run output handler.
        await webR.flush();
        if (gen !== this.generation) {
          webR.close();
          return;
        }
        void this.readOutput(webR, gen);
        this.set({ state: "ready", detail: this.readyDetail });
      } catch (err) {
        // An older download must never overwrite the state of a restarted runtime.
        if (gen !== this.generation) return;
        this.webR?.close();
        this.webR = null;
        this.set({ state: "error", detail: `Could not load the R runtime: ${err instanceof Error ? err.message : String(err)}` });
      } finally {
        if (gen === this.generation) this.starting = null;
      }
    })();
    return this.starting;
  }

  async run(code: string, options: RunOptions = {}): Promise<RunResult> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxOutput = options.maxOutput ?? DEFAULT_MAX_OUTPUT;
    const result: RunResult = { ok: false, stdout: "", stderr: "", error: null, timedOut: false, truncated: false, terminated: false, ms: 0 };
    if (this.busy) return { ...result, error: "Another run is still in progress." };

    const pkgs = referencedRPackages(code);
    const blocked = pkgs.filter((p) => !(R_PACKAGE_ALLOWLIST as readonly string[]).includes(p));
    if (blocked.length) {
      return { ...result, error: `Package not allowed here: ${blocked.join(", ")}. Allowed: base R plus ${R_PACKAGE_ALLOWLIST.filter((p) => !BASE_PACKAGES.has(p)).join(", ")}.` };
    }

    this.busy = true;
    const started = performance.now();
    let setupTimer: ReturnType<typeof setTimeout> | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const stopped = new Promise<"stopped">((resolve) => {
      // Stop works during runtime initialization, package loading and execution.
      this.stopActive = () => resolve("stopped");
    });
    const setupTimeout = new Promise<"setup-timeout">((resolve) => {
      setupTimer = setTimeout(() => resolve("setup-timeout"), 120_000);
    });
    const cancelled = (outcome: "stopped" | "setup-timeout" | "timeout" | "output-limit"): RunResult => {
      const timedOut = outcome === "timeout";
      const error = outcome === "output-limit"
        ? `Output limit of ${maxOutput.toLocaleString("en-US")} characters reached; the run was stopped.`
        : outcome === "setup-timeout"
        ? "The R runtime took too long to load. Check your connection and try again."
        : timedOut
          ? `Stopped after ${timeoutMs / 1000} s. The runtime was restarted; check for an infinite loop.`
          : "Run stopped. The R runtime will reload on the next run.";
      if (outcome !== "stopped") this.terminate(error);
      return { ...result, terminated: true, timedOut, error, ms: Math.round(performance.now() - started) };
    };
    try {
      const ready = await Promise.race([this.ensure().then(() => "ready" as const), stopped, setupTimeout]);
      if (ready !== "ready") return cancelled(ready);
      const webR = this.webR;
      if (!webR) return { ...result, error: this.state.detail };

      const extra = pkgs.filter((p) => !BASE_PACKAGES.has(p));
      if (extra.length) {
        this.set({ state: "loading", detail: `Installing ${extra.join(", ")}` });
        const installed = await Promise.race([webR.installPackages(extra, { quiet: true }).then(() => "ready" as const), stopped, setupTimeout]);
        if (installed !== "ready") return cancelled(installed);
      }

      const prepared = await Promise.race([
        (async () => {
          const shelter = await new webR.Shelter();
          // Fresh variables for every run: a deleted function cannot pass tests
          // by accidentally reusing a definition from an earlier attempt.
          const env = await shelter.evalR("new.env(parent = globalenv())");
          return { shelter, env };
        })(),
        stopped,
        setupTimeout,
      ]);
      if (typeof prepared === "string") return cancelled(prepared);
      const { shelter, env } = prepared;
      if (setupTimer) clearTimeout(setupTimer);
      const marker = `__techprep_stream_end_${this.generation}_${++this.nextRun}__`;
      let drained!: () => void;
      const outputDrained = new Promise<void>((resolve) => { drained = resolve; });
      let capReached!: () => void;
      const outputLimit = new Promise<"output-limit">((resolve) => { capReached = () => resolve("output-limit"); });
      const append = (stream: "stdout" | "stderr", text: string) => {
        if (result.truncated) return;
        const room = Math.max(0, maxOutput - result.stdout.length - result.stderr.length);
        const kept = text.slice(0, room);
        if (stream === "stdout") result.stdout += kept;
        else result.stderr += kept;
        if (kept) options.onOutput?.(stream, kept);
        if (text.length > room) {
          result.truncated = true;
          capReached();
          this.terminate(`Output limit of ${maxOutput.toLocaleString("en-US")} characters reached; the run was stopped.`);
        }
      };
      this.streamOutput = (stream, text) => {
        // The final marker also flushes output without a trailing newline. It
        // may share that last stream message, so preserve everything before it.
        if (stream === "stdout" && text.endsWith(marker)) {
          const lastText = text.slice(0, -marker.length);
          if (lastText) append(stream, `${lastText}\n`);
          drained();
        } else append(stream, `${text}\n`);
      };
      this.set({ state: "running", detail: "Running" });
      try {
        const timeout = new Promise<"timeout">((resolve) => {
          timer = setTimeout(() => resolve("timeout"), timeoutMs);
        });
        const captureOptions = { env, withAutoprint: true, captureStreams: false, captureConditions: true, captureGraphics: false, throwJsException: false };
        const evaluation = (async () => {
          const captured = await shelter.captureR(code, captureOptions);
          // A separate evaluation preserves the learner's normal console
          // autoprint behavior while establishing an ordered stream barrier.
          await shelter.captureR(`base::cat("${marker}\\n")`, captureOptions);
          await outputDrained;
          return captured;
        })();
        const outcome = await Promise.race([evaluation, timeout, stopped, outputLimit]);
        if (typeof outcome === "string") return cancelled(outcome);
        let failed: string | null = null;
        for (const out of outcome.output) {
          let text = "";
          let stream: "stdout" | "stderr" = "stdout";
          if (out.type === "stdout") text = `${out.data}\n`;
          else if (out.type === "stderr") {
            text = `${out.data}\n`;
            stream = "stderr";
          } else if (out.type === "message") {
            text = await conditionMessage(out.data);
            stream = "stderr";
          } else if (out.type === "warning") {
            text = `Warning: ${await conditionMessage(out.data)}\n`;
            stream = "stderr";
          } else if (out.type === "error") {
            failed = `Error: ${await conditionMessage(out.data)}`;
            continue;
          } else continue;
          append(stream, text);
          if (result.truncated) return cancelled("output-limit");
        }
        result.ok = failed === null;
        result.error = failed;
      } finally {
        // The webR worker may already be closed after a timeout; purging is then a no-op.
        Promise.resolve()
          .then(() => shelter.purge())
          .catch(() => undefined);
      }
      if (this.webR) this.set({ state: "ready", detail: this.readyDetail });
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
      if (this.webR) this.set({ state: "ready", detail: this.readyDetail });
    } finally {
      this.stopActive = null;
      this.streamOutput = null;
      if (setupTimer) clearTimeout(setupTimer);
      if (timer) clearTimeout(timer);
      this.busy = false;
    }
    result.ms = Math.round(performance.now() - started);
    return result;
  }

  terminate(reason = "R runtime stopped. It will reload on the next run.") {
    this.stopActive?.();
    this.streamOutput = null;
    this.generation++;
    this.webR?.close();
    this.webR = null;
    this.starting = null;
    this.set({ state: "idle", detail: reason });
  }
}

let instance: RRuntime | null = null;
export function getRRuntime(): Runtime {
  instance ??= new RRuntime();
  return instance;
}
