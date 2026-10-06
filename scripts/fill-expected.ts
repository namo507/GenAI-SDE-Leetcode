/**
 * Authoring aid: replaces `expectedOutput: "PENDING"` in a week file with the
 * real output, but only when the Python and R programs both run and print
 * identical text. Anything else is reported and left untouched.
 *
 * Usage: npx tsx scripts/fill-expected.ts 3                     (fills content/weeks/w03.ts)
 *        npx tsx scripts/fill-expected.ts content/extra/w03.ts  (any content file exporting topics)
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeOutput } from "@/lib/runtime/harness";

const weekArg = process.argv[2];
if (!weekArg) throw new Error("Pass a week number or a content file path");
const file = /^\d+$/.test(weekArg) ? join(process.cwd(), `content/weeks/w${weekArg.padStart(2, "0")}.ts`) : join(process.cwd(), weekArg);
const dir = join(process.cwd(), ".fixtures-cache");
mkdirSync(dir, { recursive: true });

async function main() {
type T = { id: string; implementation?: { expectedOutput: string; python: { code: string }; r: { code: string } } };
const loaded = (await import(file)) as Record<string, unknown>;
// Week files export topics; extra files export an object with a topics array.
const mod = { topics: (Array.isArray(loaded.topics) ? loaded.topics : Object.values(loaded).flatMap((v) => (v && typeof v === "object" && "topics" in v ? (v as { topics: T[] }).topics : []))) as T[] };
const exec = (bin: string, path: string, src: string) => {
  writeFileSync(path, src);
  const r = spawnSync(bin, [path], { encoding: "utf8", timeout: 60_000 });
  return { ok: r.status === 0, out: normalizeOutput(r.stdout ?? ""), err: r.stderr ?? "" };
};

let source = readFileSync(file, "utf8");
for (const t of mod.topics) {
  const impl = t.implementation;
  if (!impl || impl.expectedOutput !== "PENDING") continue;
  const py = exec(process.env.PYTHON_BIN ?? "python3", join(dir, `${t.id}.py`), impl.python.code);
  const r = exec(process.env.RSCRIPT_BIN ?? "Rscript", join(dir, `${t.id}.R`), impl.r.code);
  if (!py.ok || !r.ok || py.out !== r.out) {
    console.log(`SKIP ${t.id}\n--- python (${py.ok ? "ok" : "error"})\n${py.out}\n${py.err}\n--- r (${r.ok ? "ok" : "error"})\n${r.out}\n${r.err}`);
    continue;
  }
  const block = `code\`\n${py.out
    .split("\n")
    .map((l) => (l ? `        ${l}` : ""))
    .join("\n")}\n      \``;
  const marker = 'expectedOutput: "PENDING"';
  // Anchor on this topic's id so a skipped topic's marker is never filled with another topic's output.
  const at = source.indexOf(marker, source.indexOf(`id: "${t.id}"`));
  source = source.slice(0, at) + `expectedOutput: ${block}` + source.slice(at + marker.length);
  console.log(`filled ${t.id}`);
}
writeFileSync(file, source);
}

void main();
