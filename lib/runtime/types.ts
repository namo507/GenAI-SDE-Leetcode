export type RuntimeState = "idle" | "loading" | "ready" | "running" | "error";

export type RunOptions = {
  /** Wall-clock limit for executing the code, after the runtime and packages are ready. */
  timeoutMs?: number;
  /** Maximum characters of combined output before the run is stopped. */
  maxOutput?: number;
  onOutput?: (stream: "stdout" | "stderr", text: string) => void;
};

export type RunResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  error: string | null;
  timedOut: boolean;
  truncated: boolean;
  terminated: boolean;
  ms: number;
};

export type RuntimeSnapshot = { state: RuntimeState; detail: string };

export interface Runtime {
  readonly language: "python" | "r";
  snapshot(): RuntimeSnapshot;
  subscribe(listener: () => void): () => void;
  ensure(): Promise<void>;
  run(code: string, options?: RunOptions): Promise<RunResult>;
  terminate(reason?: string): void;
}

export const DEFAULT_TIMEOUT_MS = 10_000;
export const DEFAULT_MAX_OUTPUT = 20_000;
