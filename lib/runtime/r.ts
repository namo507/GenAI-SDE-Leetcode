"use client";

import type { WebR } from "webr";
import { R_PACKAGE_ALLOWLIST } from "@/lib/curriculum";
import { DEFAULT_MAX_OUTPUT, DEFAULT_TIMEOUT_MS, type RunOptions, type RunResult, type Runtime, type RuntimeSnapshot } from "./types";

const BASE_PACKAGES = new Set(["base", "stats", "utils", "methods", "datasets", "graphics", "grDevices", "tools", "grid", "splines", "stats4"]);

/** Packages referenced via library(), require(), requireNamespace() or pkg:: in the code. */
export function referencedRPackages(code: string): string[] {
  const found = new Set<string>();
  for (const m of code.matchAll(/\b(?:library|require|requireNamespace)\(\s*["']?([A-Za-z][A-Za-z0-9.]*)["']?/g)) found.add(m[1]!);
  for (const m of code.matchAll(/\b([A-Za-z][A-Za-z0-9.]*):::?[A-Za-z.]/g)) found.add(m[1]!);
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
class RRuntime implements Runtime {
  readonly language = "r" as const;
  private webR: WebR | null = null;
  private starting: Promise<void> | null = null;
  private state: RuntimeSnapshot = { state: "idle", detail: "R runtime not loaded" };
  private listeners = new Set<() => void>();
  private busy = false;
  private readyDetail = "R ready";
  private generation = 0;

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
    if (this.webR && this.state.state !== "error") return Promise.resolve();
    if (this.starting) return this.starting;
    this.set({ state: "loading", detail: "Downloading the R runtime (webR)" });
    const gen = ++this.generation;
    this.starting = (async () => {
      try {
        const { WebR } = await import("webr");
        const webR = new WebR({ interactive: false });
        await webR.init();
        if (gen !== this.generation) {
          webR.close();
          return;
        }
        const version = await webR.evalRString("paste(R.version$major, R.version$minor, sep = '.')");
        this.webR = webR;
        this.readyDetail = `R ${version} (webR)`;
        this.set({ state: "ready", detail: this.readyDetail });
      } catch (err) {
        this.set({ state: "error", detail: `Could not load the R runtime: ${err instanceof Error ? err.message : String(err)}` });
      } finally {
        this.starting = null;
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
    try {
      await this.ensure();
      const webR = this.webR;
      if (!webR) return { ...result, error: this.state.detail };

      const extra = pkgs.filter((p) => !BASE_PACKAGES.has(p));
      if (extra.length) {
        this.set({ state: "loading", detail: `Installing ${extra.join(", ")}` });
        await webR.installPackages(extra, { quiet: true });
      }

      this.set({ state: "running", detail: "Running" });
      const shelter = await new webR.Shelter();
      let timer: ReturnType<typeof setTimeout> | null = null;
      try {
        const timeout = new Promise<"timeout">((resolve) => {
          timer = setTimeout(() => resolve("timeout"), timeoutMs);
        });
        const outcome = await Promise.race([
          shelter.captureR(code, { withAutoprint: true, captureStreams: true, captureConditions: true, captureGraphics: false, throwJsException: false }),
          timeout,
        ]);
        if (outcome === "timeout") {
          this.terminate(`Stopped after ${timeoutMs / 1000} s. The R runtime was restarted; check for an infinite loop.`);
          return { ...result, timedOut: true, terminated: true, error: `Stopped after ${timeoutMs / 1000} s. The runtime was restarted; check for an infinite loop.`, ms: Math.round(performance.now() - started) };
        }
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
          if (result.stdout.length + result.stderr.length + text.length > maxOutput) {
            result.truncated = true;
            failed = `Output limit of ${maxOutput.toLocaleString("en-US")} characters reached; output was cut.`;
            break;
          }
          if (stream === "stdout") result.stdout += text;
          else result.stderr += text;
          options.onOutput?.(stream, text);
        }
        result.ok = failed === null;
        result.error = failed;
      } finally {
        if (timer) clearTimeout(timer);
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
      this.busy = false;
    }
    result.ms = Math.round(performance.now() - started);
    return result;
  }

  terminate(reason = "R runtime stopped. It will reload on the next run.") {
    this.generation++;
    this.webR?.close();
    this.webR = null;
    this.starting = null;
    this.busy = false;
    this.set({ state: "idle", detail: reason });
  }
}

let instance: RRuntime | null = null;
export function getRRuntime(): Runtime {
  instance ??= new RRuntime();
  return instance;
}
