/**
 * Runs every paired Python/R example against its deterministic fixture.
 *
 * For each topic with an implementation it checks that:
 *   1. the Python program prints exactly `expectedOutput` (normalized),
 *   2. the R program prints exactly the same text,
 *   3. the Python tests pass,
 *   4. the R tests pass under the real testthat package,
 *   5. the R tests also pass under the browser's testthat shim.
 *
 * Usage: npm run fixtures [-- --week 3] [-- --topic w03-d02-sliding-window]
 * Binaries: PYTHON_BIN (default python3) and RSCRIPT_BIN (default Rscript).
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { TopicSchema } from "@/lib/curriculum";
import { rawTopics } from "@/content/raw";
import { practiceSets } from "@/content/practice";
import { normalizeOutput, pythonTestProgram, rTestProgram } from "@/lib/runtime/harness";
import { compareSqlResult, sqlProgram, type SqlResult } from "@/lib/practice/sql";

// Topics are parsed one by one so fixtures can run while later weeks are still drafts.
const curriculum = { topics: rawTopics.map((t) => TopicSchema.parse(t)) };

const PY = process.env.PYTHON_BIN ?? "python3";
const RS = process.env.RSCRIPT_BIN ?? "Rscript";
const dir = join(process.cwd(), ".fixtures-cache");
mkdirSync(dir, { recursive: true });

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const weekFilter = arg("week");
const topicFilter = arg("topic");

type Run = { ok: boolean; stdout: string; stderr: string };
function run(bin: string, file: string, source: string): Run {
  writeFileSync(file, source);
  const res = spawnSync(bin, [file], { encoding: "utf8", timeout: 60_000 });
  return { ok: res.status === 0, stdout: res.stdout ?? "", stderr: (res.stderr ?? "") + (res.error ? String(res.error) : "") };
}

const topics = curriculum.topics.filter(
  (t) =>
    t.implementation &&
    (!topicFilter || t.id === topicFilter) &&
    (!weekFilter || t.id.startsWith(`w${weekFilter.padStart(2, "0")}-`)),
);

let failures = 0;
for (const t of topics) {
  const impl = t.implementation!;
  const expected = normalizeOutput(impl.expectedOutput);
  const base = join(dir, t.id);
  const problems: string[] = [];

  const py = run(PY, `${base}.py`, impl.python.code);
  if (!py.ok) problems.push(`python sample crashed:\n${py.stderr}`);
  else if (normalizeOutput(py.stdout) !== expected) problems.push(`python output differs:\n--- expected\n${expected}\n--- actual\n${normalizeOutput(py.stdout)}`);

  const r = run(RS, `${base}.R`, impl.r.code);
  if (!r.ok) problems.push(`R sample crashed:\n${r.stderr}`);
  else if (normalizeOutput(r.stdout) !== expected) problems.push(`R output differs:\n--- expected\n${expected}\n--- actual\n${normalizeOutput(r.stdout)}`);

  const pyTests = run(PY, `${base}.test.py`, pythonTestProgram(impl.python.code, impl.tests.python));
  if (!pyTests.ok) problems.push(`python tests failed:\n${pyTests.stdout}\n${pyTests.stderr}`);

  const rTests = run(RS, `${base}.test.R`, rTestProgram(impl.r.code, impl.tests.r, false));
  if (!rTests.ok) problems.push(`R tests failed (testthat):\n${rTests.stdout}\n${rTests.stderr}`);

  const rShim = run(RS, `${base}.shim.R`, rTestProgram(impl.r.code, impl.tests.r, true));
  if (!rShim.ok) problems.push(`R tests failed (browser shim):\n${rShim.stdout}\n${rShim.stderr}`);

  if (problems.length) {
    failures++;
    console.log(`FAIL ${t.id}\n  ${problems.join("\n  ").replace(/\n/g, "\n    ")}`);
  } else {
    console.log(`ok   ${t.id}`);
  }
}

// Practice drills: SQL solutions must reproduce their expected rows; numeric answers must match their verification code.
let drillFailures = 0;
let drillCount = 0;
if (!topicFilter && !weekFilter) {
  for (const set of practiceSets) {
    for (const drill of set.items) {
      if (drill.kind === "sql") {
        drillCount++;
        const res = run(PY, join(dir, `${drill.id}.py`), sqlProgram(drill.setup, drill.solution));
        let ok = res.ok;
        if (ok) {
          const out = JSON.parse(res.stdout) as SqlResult;
          // Exact column names in CI (the browser accepts any letter case), then the shared row comparison.
          const check = compareSqlResult(out, drill);
          ok = JSON.stringify(out.cols) === JSON.stringify(drill.expectedColumns) && check.ok;
          if (!ok) console.log(`FAIL ${drill.id}: ${check.reason} Got ${res.stdout.trim()}`);
        } else console.log(`FAIL ${drill.id}: ${res.stderr}`);
        if (!ok) drillFailures++;
        else console.log(`ok   ${drill.id}`);
      } else if (drill.kind === "numeric") {
        drillCount++;
        const res = run(PY, join(dir, `${drill.id}.py`), drill.verifyPython);
        const value = Number(res.stdout.trim());
        const ok = res.ok && Number.isFinite(value) && Math.abs(value - drill.answer) <= drill.tolerance;
        if (!ok) {
          drillFailures++;
          console.log(`FAIL ${drill.id}: verification printed ${res.stdout.trim()} but the stored answer is ${drill.answer} +/- ${drill.tolerance}`);
        } else console.log(`ok   ${drill.id}`);
      }
    }
  }
  console.log(`\n${drillCount - drillFailures} of ${drillCount} SQL and numeric drills verified.`);
}

const skipped = curriculum.topics.length - curriculum.topics.filter((t) => t.implementation).length;
console.log(`\n${topics.length - failures} of ${topics.length} paired examples passed (${skipped} topics have no runnable code by design).`);
process.exit(failures || drillFailures ? 1 : 0);
