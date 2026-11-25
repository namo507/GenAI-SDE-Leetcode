import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// Static publishing uses the supported Webpack path to avoid stale relative
// CSS resolution when switching Turbopack's normal and export build modes.
const args = [require.resolve("next/dist/bin/next"), "build"];
if (process.env.STATIC_EXPORT) args.push("--webpack");
const result = spawnSync(process.execPath, args, { stdio: "inherit", env: process.env });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
