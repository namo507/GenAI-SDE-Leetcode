/**
 * Runs every lesson's R sample and browser-compatible tests through the actual
 * webR WebAssembly engine and production RRuntime adapter, without Rscript.
 * Includes regressions for streaming, fresh environments and the output cap.
 * This complements browser E2E; it does not verify browser/CDN policy or UI.
 *
 * Usage: npx tsx scripts/run-webr-fixtures.ts [--week 3] [--topic w03-d02-sliding-window]
 * No content is written. Each program has the production execution/setup limits;
 * a ten-minute outer deadline also fails the process if worker cleanup stalls.
 */
import assert from "node:assert/strict";
import { curriculum } from "@/content";
import { normalizeOutput, outputsMatch, rTestProgram } from "@/lib/runtime/harness";
import { RRuntime } from "@/lib/runtime/r";
import type { RunResult } from "@/lib/runtime/types";

function filters() {
  const values: { week?: string; topic?: string } = {};
  for (let i = 2; i < process.argv.length; i += 2) {
    const flag = process.argv[i];
    const value = process.argv[i + 1];
    if ((flag !== "--week" && flag !== "--topic") || !value || value.startsWith("--")) {
      throw new Error("Usage: npx tsx scripts/run-webr-fixtures.ts [--week 1..16] [--topic <topic-id>]");
    }
    if (flag === "--week") {
      if (!/^(?:[1-9]|1[0-6])$/.test(value)) throw new Error("--week must be an integer from 1 to 16.");
      values.week = `w${value.padStart(2, "0")}-`;
    } else values.topic = value;
  }
  return values;
}

function details(result: RunResult): string {
  return [result.error, result.stderr, result.stdout].filter(Boolean).join("\n");
}

async function main() {
  const filter = filters();
  const topics = curriculum.topics.filter((topic) =>
    topic.implementation && (!filter.week || topic.id.startsWith(filter.week)) && (!filter.topic || topic.id === filter.topic),
  );
  if (!topics.length) throw new Error("No paired examples match those filters.");

  const runtime = new RRuntime();
  const deadline = setTimeout(() => {
    runtime.terminate("webR fixtures exceeded the ten-minute overall deadline.");
    console.error("FAIL webR fixtures exceeded the ten-minute overall deadline.");
    process.exit(1);
  }, 10 * 60_000);
  const interrupted = () => {
    runtime.terminate("webR fixture run interrupted.");
    process.exit(130);
  };
  process.once("SIGINT", interrupted);
  let failures = 0;
  let samples = 0;
  let testPrograms = 0;

  try {
    const partial = await runtime.run('cat("partial output")');
    assert.ok(partial.ok && outputsMatch(partial.stdout, "partial output"), `Partial final output was lost: ${details(partial)}`);
    const definition = await runtime.run("techprep_fixture_function <- function() 42");
    assert.ok(definition.ok, details(definition));
    const removed = await runtime.run("techprep_fixture_function()");
    assert.ok(!removed.ok && removed.error?.includes("could not find function"), "A learner function leaked between runs.");
    const capped = await runtime.run('repeat { cat("streamed output\\n") }', { maxOutput: 100 });
    assert.ok(capped.truncated && capped.terminated && !capped.timedOut && capped.stdout.length === 100, `Streaming output cap failed: ${details(capped)}`);
    console.log("ok   runtime: partial stdout, isolated variables, immediate streaming output cap");

    for (const topic of topics) {
      const impl = topic.implementation!;
      const issues: string[] = [];
      const sample = await runtime.run(impl.r.code);
      if (!sample.ok) issues.push(`R WebAssembly sample failed:\n${details(sample)}`);
      else if (!outputsMatch(sample.stdout, impl.expectedOutput)) {
        issues.push(`Output differs:\nExpected:\n${normalizeOutput(impl.expectedOutput)}\nActual:\n${normalizeOutput(sample.stdout)}`);
      } else samples++;

      const tests = await runtime.run(rTestProgram(impl.r.code, impl.tests.r));
      if (!tests.ok) issues.push(`R WebAssembly tests failed:\n${details(tests)}`);
      else testPrograms++;

      if (issues.length) {
        failures++;
        console.error(`FAIL ${topic.id}\n  ${issues.join("\n").replace(/\n/g, "\n  ")}`);
      } else console.log(`ok   ${topic.id}`);
    }
    console.log(`\n${samples} of ${topics.length} R WebAssembly samples matched; ${testPrograms} of ${topics.length} test programs passed.`);
    if (failures) process.exitCode = 1;
  } finally {
    clearTimeout(deadline);
    process.removeListener("SIGINT", interrupted);
    runtime.terminate();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
