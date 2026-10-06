# TechPrep OS

A 16-week study dashboard for software engineering, data science, ML engineering, data engineering and GenAI interviews. Every topic is explained twice (ELI5 and Senior), animated step by step, and implemented in **Python and R that print identical output and run in your browser**.

- 16 weeks × 7 days = 112 planned days, each with a fixed job: concept map, theory lab, implementation, applied practice, production lens, interview simulation, review
- 55 topics, 53 with paired Python and R programs, unit tests in both languages and a deliberately wrong version to learn from
- 271 narrated diagram steps (React Flow), 114 topic practice items and 36 drills (SQL in SQLite, statistics, system design, RAG diagnosis)
- 16 production cases, 10 capstone briefs, 6 timed mock interview loops, 73 glossary terms
- Spaced review, confidence calibration and four separate progress measures, all stored only in your browser

## Quick start

```bash
npm ci
npm run dev          # http://localhost:3000
```

Production build: `npm run build && npm start`. Every page is prerendered (178 static pages); there is no backend.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev server, production build, production server |
| `npm run typecheck` | `tsc --noEmit` (strict, `noUncheckedIndexedAccess`) |
| `npm run lint` | ESLint flat config (`eslint-config-next` core web vitals and TypeScript) |
| `npm test` | Vitest unit tests: curriculum contract, spaced repetition, metrics, output comparison, SQL checking |
| `npm run validate` | Parses all content against the Zod contract and prints counts |
| `npm run fixtures` | Runs every paired program with CPython and Rscript, compares both with the expected output, runs the Python tests, the R tests with real testthat and with the browser shim, and re-verifies every SQL and numeric drill answer. Needs `python3` and `Rscript` with `testthat` (override with `PYTHON_BIN`, `RSCRIPT_BIN`) |
| `npm run schema` | Regenerates `docs/curriculum.schema.json` from the Zod contract (a unit test fails if it is stale) |
| `npm run tokens` | Compiles `design-system/tokens.json` to `app/tokens.css` (runs before every build) |
| `npm run e2e` | Playwright: axe WCAG 2.2 AA in light and dark, 375/768/1280/2560 px viewports, keyboard and interaction tests |
| `npm run e2e:runtime` | Playwright tests that download Pyodide and webR and execute code. `RUNTIME_E2E=all` runs all 53 lessons in both languages |

Set `PW_CHROMIUM_PATH` to use an existing Chromium instead of `npx playwright install chromium`.

## How it fits together

```
content/weeks/w01..w16.ts ─┐
content/{practice,projects,interviews,glossary}.ts ─┤─> lib/curriculum.ts + lib/content-types.ts (Zod contracts)
                                                    │      ├─> docs/curriculum.schema.json (portable JSON Schema)
                                                    │      └─> parsed at build time; a broken reference fails the build
                                                    └─> app/ routes (static) ─> client islands for progress, runners and diagrams
```

- **Contract first.** `lib/curriculum.ts` is the canonical model. Refinements check chronology, day order, that tasks add up to the day's minutes, that no topic is referenced before it is taught, that prerequisites come earlier, that flow steps only point at real nodes and edges, and that packages are on the allowlist.
- **Paired code.** Each implementation stores Python, R, the exact expected stdout, tests for both, an ELI5 trace, complexity, edge cases and an incorrect example. `lib/runtime/harness.ts` defines output normalization and test programs once, shared by the browser and the fixture runner.
- **Python runtime.** Pyodide 314.0.7 in a dedicated module worker (`public/workers/pyodide-worker.mjs`), loaded lazily from jsDelivr. Imports are checked against the standard library and an allowlist (numpy, pandas, scipy, scikit-learn, statsmodels, networkx; sqlite3 ships in the standard library) before anything runs. Each run has a 10 s limit (the worker is terminated and recreated on timeout) and a 20,000-character output cap.
- **R runtime.** webR 0.6.0 (npm package; it fetches R itself from the webR CDN) in its own worker. Packages are limited to base R plus MASS, Matrix, survival and jsonlite. Same time and output limits. Browser tests use a small testthat-compatible shim; CI runs the same tests with real testthat.
- **Progress.** `lib/progress/*`: a `useSyncExternalStore` store persisted to `localStorage` (versioned and schema-checked, with export, import and reset). Completion, mastery, confidence and retention are computed separately in `lib/progress/metrics.ts`. The single "learning indicator" shows its formula and is labeled as not a hiring probability.
- **Design system.** `design-system/tokens.json` (light and dark color, type, spacing, motion) compiles to CSS custom properties; `design-system/components.css` holds the `tp-` component classes; Tailwind v4 maps the tokens to utilities.
- **Motion.** Motion for React with stable keys, 150 to 250 ms transitions and a shared-layout indicator on tabs and toggles. Reduced motion follows the OS unless overridden in Settings, and diagram autoplay pauses while the tab is hidden.

## Routes

`/` welcome and onboarding · `/dashboard` today, reviews due, weak areas, four measures · `/roadmap` and `/roadmap/[dayId]` 112 day pages · `/learn/[domain]/[slug]` 55 lessons · `/practice` review and drill sets · `/projects` capstone briefs · `/interviews` timed loops with self-scoring · `/analytics` metrics, calibration and time against plan · `/glossary` · `/settings`

## Adding a topic

1. Add a `defineTopic({...})` entry to the week file and list its id on its anchor day (`w05-d02` for `w05-d02-your-slug`).
2. Write the Python and R programs so they print the same text, set `expectedOutput: "PENDING"`, then run `npx tsx scripts/fill-expected.ts`. It fills the value only when both languages agree.
3. `npm run validate && npm run fixtures && npm test`.

## Known limits

- First use of each runtime downloads it from a CDN, so the first run needs a connection and can take a while on slow networks. Later runs reuse it until the page reloads.
- The import allowlist decides which packages are loaded; it is not a security sandbox. Isolation comes from the browser worker, and nothing runs on a server.
- The R test shim implements 13 testthat expectations with edition 2 semantics; the content uses only those, and a unit test enforces it.
- Progress lives in one browser. Export it from Settings to move devices.
- Library, model and service facts change. References that depend on a version are flagged in the lesson; check current documentation before relying on them.
