import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RRuntime } from "@/lib/runtime/r";
import { PythonRuntime } from "@/lib/runtime/python";

const control = vi.hoisted(() => ({
  init: () => Promise.resolve(),
  install: () => Promise.resolve(),
  instances: [] as Array<{ close: ReturnType<typeof vi.fn>; emit: (message: { type: string; data?: string }) => void }>,
  capture: vi.fn<(code: string, options: unknown) => Promise<{ output: Array<{ type: string; data: string }> }>>(),
}));

vi.mock("webr", () => ({
  WebR: class {
    private queued: Array<{ type: string; data?: string }> = [];
    private waiting: ((message: { type: string; data?: string }) => void) | null = null;
    emit(message: { type: string; data?: string }) {
      if (this.waiting) {
        const resolve = this.waiting;
        this.waiting = null;
        resolve(message);
      } else this.queued.push(message);
    }
    close = vi.fn(() => this.emit({ type: "closed" }));
    init = () => control.init();
    evalRString = async () => "4.5.0";
    installPackages = () => control.install();
    flush = async () => [];
    async *stream() {
      for (;;) {
        const message = this.queued.shift() ?? await new Promise<{ type: string; data?: string }>((resolve) => { this.waiting = resolve; });
        if (message.type === "closed") return;
        yield message;
      }
    }
    Shelter;
    constructor() {
      const emit = (message: { type: string; data?: string }) => this.emit(message);
      this.Shelter = class {
        evalR = async () => ({ environment: Symbol("run") });
        captureR = (code: string, options: unknown) => {
          const marker = /__techprep_stream_end_\d+_\d+__/.exec(code)?.[0];
          if (marker && code.startsWith("base::cat(")) {
            emit({ type: "stdout", data: marker });
            return Promise.resolve({ output: [] });
          }
          return control.capture(code, options);
        };
        purge = async () => undefined;
      };
      control.instances.push(this);
    }
  },
}));

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  control.instances.length = 0;
  control.init = () => Promise.resolve();
  control.install = () => Promise.resolve();
  control.capture.mockReset().mockResolvedValue({ output: [] });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("R runtime lifecycle", () => {
  it("Stop settles a run and closes the worker while the runtime is downloading", async () => {
    const download = deferred();
    control.init = () => download.promise;
    const runtime = new RRuntime();
    const run = runtime.run("cat('hello')");
    await vi.waitFor(() => expect(control.instances).toHaveLength(1));
    runtime.terminate();
    await expect(run).resolves.toMatchObject({ ok: false, terminated: true });
    expect(control.instances[0]!.close).toHaveBeenCalledOnce();
    expect(runtime.snapshot().state).toBe("idle");
    download.resolve();
  });

  it("closes a late worker again when initialization completes after Stop", async () => {
    const download = deferred();
    control.init = () => download.promise;
    const runtime = new RRuntime();
    const run = runtime.run("cat('hello')");
    await vi.waitFor(() => expect(control.instances).toHaveLength(1));
    runtime.terminate();
    await run;
    download.resolve();
    await vi.waitFor(() => expect(control.instances[0]!.close).toHaveBeenCalledTimes(2));
    expect(runtime.snapshot().state).toBe("idle");
    expect(control.capture).not.toHaveBeenCalled();
  });

  it("an old initialization failure cannot overwrite a restarted runtime", async () => {
    const firstDownload = deferred();
    control.init = () => firstDownload.promise;
    const runtime = new RRuntime();
    const first = runtime.run("cat('first')");
    await vi.waitFor(() => expect(control.instances).toHaveLength(1));
    runtime.terminate();
    await first;
    control.init = () => Promise.resolve();
    await expect(runtime.run("cat('second')")).resolves.toMatchObject({ ok: true });
    firstDownload.reject(new Error("old worker closed"));
    await Promise.resolve();
    await Promise.resolve();
    expect(runtime.snapshot().state).toBe("ready");
    runtime.terminate();
  });

  it("Stop also settles package installation before execution starts", async () => {
    const install = deferred();
    control.install = () => install.promise;
    const runtime = new RRuntime();
    const run = runtime.run("library(MASS)");
    await vi.waitFor(() => expect(runtime.snapshot().detail).toBe("Installing MASS"));
    runtime.terminate();
    await expect(run).resolves.toMatchObject({ ok: false, terminated: true });
    expect(control.capture).not.toHaveBeenCalled();
    install.resolve();
  });

  it("a stalled setup ends with a connection error and can be retried", async () => {
    vi.useFakeTimers();
    const download = deferred();
    control.init = () => download.promise;
    const runtime = new RRuntime();
    const run = runtime.run("cat('hello')");
    await vi.advanceTimersByTimeAsync(120_000);
    await expect(run).resolves.toMatchObject({ ok: false, terminated: true, error: expect.stringContaining("too long to load") });
    control.init = () => Promise.resolve();
    await expect(runtime.run("cat('retry')")).resolves.toMatchObject({ ok: true });
    runtime.terminate();
    download.resolve();
  });

  it("each run evaluates in a new environment rather than reusing old learner variables", async () => {
    const runtime = new RRuntime();
    await runtime.run("answer <- 42");
    await runtime.run("answer");
    const first = control.capture.mock.calls[0]![1] as { env: object };
    const second = control.capture.mock.calls[1]![1] as { env: object };
    expect(first.env).toBeDefined();
    expect(second.env).not.toBe(first.env);
    runtime.terminate();
  });

  it("terminates on streamed output before a non-ending evaluation can finish", async () => {
    control.capture.mockImplementation(() => new Promise(() => undefined));
    const runtime = new RRuntime();
    const run = runtime.run("repeat { cat('spam\\n') }", { maxOutput: 4 });
    await vi.waitFor(() => expect(runtime.snapshot().state).toBe("running"));
    control.instances[0]!.emit({ type: "stdout", data: "abcdef" });
    await expect(run).resolves.toMatchObject({ ok: false, terminated: true, truncated: true, stdout: "abcd", timedOut: false });
    expect(control.instances[0]!.close).toHaveBeenCalledOnce();
  });

  it("preserves output up to the cap when a single chunk exceeds the limit", async () => {
    control.capture.mockResolvedValue({ output: [{ type: "stdout", data: "abcdef" }] });
    const runtime = new RRuntime();
    await expect(runtime.run("cat('abcdef')", { maxOutput: 4 })).resolves.toMatchObject({ ok: false, stdout: "abcd", truncated: true });
    runtime.terminate();
  });
});


describe("Python worker lifecycle", () => {
  it("returns a failed result when browser policy prevents worker construction", async () => {
    vi.stubGlobal("Worker", class { constructor() { throw new Error("blocked by browser policy"); } });
    const runtime = new PythonRuntime();
    await expect(runtime.run("print(1)")).resolves.toMatchObject({ ok: false, error: expect.stringContaining("could not start") });
    expect(runtime.snapshot().state).toBe("error");
  });

  it("initialization reports worker startup failure without leaving a pending promise", async () => {
    vi.stubGlobal("Worker", class { constructor() { throw new Error("unsupported"); } });
    const runtime = new PythonRuntime();
    await runtime.ensure();
    expect(runtime.snapshot().state).toBe("error");
  });

  it("Stop also settles a pending explicit initialization", async () => {
    const closed = vi.fn();
    vi.stubGlobal("Worker", class {
      postMessage = vi.fn();
      terminate = closed;
    });
    const runtime = new PythonRuntime();
    const starting = runtime.ensure();
    runtime.terminate();
    await starting;
    expect(closed).toHaveBeenCalledOnce();
    expect(runtime.snapshot().state).toBe("idle");
  });
});
