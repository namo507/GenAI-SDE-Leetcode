# Release verification

This is the original release record. See [Learning Studio release verification](studio-verification.md) for the current content counts and checks.

Verified on 2026-10-28. Scope: the supplied 16-week master build brief and design brief, plus the existing application in PR #1. The curriculum coverage map identifies the lesson for every named concept; it does not claim to contain every possible interview question.

## Implemented experience

| Routes | What works |
| --- | --- |
| `/`, `/dashboard` | Role and schedule setup, today's plan, due reviews, weak areas, separate progress measures |
| `/roadmap`, `/roadmap/[dayId]` | Exactly 16 chronological weeks and 112 explicit days, role filters, saved day status and study minutes |
| `/topics`, `/learn/[domain]/[slug]` | Searchable lesson library, local ELI5/Senior controls, analogy limits, prerequisites, code, tests, narrated diagrams and practice |
| `/practice` | Topic practice, spaced reviews, coding, live SQLite, statistics, concepts, design and RAG diagnosis |
| `/projects`, `/interviews` | Role-specific capstone briefs, timed mock loops and recorded self-scores |
| `/analytics`, `/glossary`, `/settings` | Metric formulas and calibration, searchable terminology, role/language/theme/motion preferences and progress import/export |

Content contracts validate 96 topics, 94 paired implementations, 94 code walkthroughs, 451 narrated diagram states, 367 practice items including 32 coding problems, 249 glossary terms, 16 production cases, 12 capstone briefs and 8 mock loops. Two writing/speaking topics intentionally have no runnable program.

This release adds dedicated Git collaboration, reliability and causal-identification lessons. It expands dimensionality reduction, LSTM, Kafka, Docker and API security, and corrects a multidimensional bin-packing complexity claim. Runtime changes fix initialization cancellation, stale workers, stale R variables and streaming output limits. Search recovers from an unavailable index, offline messaging states its limits, and future-dated imported reviews no longer affect today's retention.

## Verification evidence

- Node.js 24: strict typecheck, repository lint, 52 unit tests and all curriculum contracts pass.
- Production Next.js build passes and prerenders every required route.
- Static export: 220 HTML pages, with no missing root-relative route or asset references; design tokens and component styles are bundled. The export now writes to the `out/` directory declared by Sites.
- Native deterministic fixtures: all 94 paired Python/R programs and their tests pass, including real testthat and the browser test shim. All 64 SQL, numeric and coding reference drills pass.
- Actual webR WASM: all 94 R programs and their test programs pass through the application runtime. `npm run fixtures:webr` preserves this check and runs in CI.
- Browser integration: 19 runtime checks pass, including both languages, SQLite, package loading, infinite loops, Stop during download/execution, stale R function removal, streaming caps and the five new/expanded example pairs.
- Browser UI: all 68 checks pass. These cover axe WCAG 2.2 AA tags on 20 representative routes in both themes; 375, 768, 1280 and 2560 px layouts; keyboard interactions, focus handling, reduced-motion diagram edges, onboarding, local progress, search recovery, offline controls, practice and mock loops.
- Four UI checks initially encountered missing trace files because two parallel Playwright processes shared an output directory. All four passed when rerun separately. No assertion failures remained. Use separate `--output` directories for parallel Playwright invocations.
- The package audit reports zero known vulnerabilities after Next.js and Zod patch updates. This is a point-in-time check, not a security guarantee.

The native visible-browser handoff was unavailable in this environment. Automated Chromium checks ran successfully; a manual screen-reader or visual audit was not completed. The opt-in `RUNTIME_E2E=all` suite for every lesson and practice solution in full browser UI contexts was not run locally. Deterministic fixtures, all actual webR examples and the representative browser integration suite provide the runtime evidence above.

## Limits and follow-ups

No required curriculum concept remains unassigned in the coverage audit. The following are explicitly optional follow-ups, not hidden shipped behavior:

| ID | Follow-up | Current behavior |
| --- | --- | --- |
| QA-01 | Manual screen-reader and visual audit | Automated accessibility, keyboard, motion and viewport checks pass |
| QA-02 | Run the opt-in exhaustive browser UI runtime suite | All native fixtures and actual webR examples pass; 19 representative browser runtime checks pass |
| ENH-01 | Full offline cache | First-time pages, runtimes and package downloads need a connection |
| ENH-02 | Cross-device progress synchronization | Progress is browser-local with working JSON export/import |

PyTorch and Docker snippets are explicitly reference-only. Distributed/cloud/LLM examples use labelled mathematical or deterministic teaching models, not real provisioned infrastructure or model-provider calls. Capstone projects are briefs for the learner to build. Completion, mastery, confidence and retention stay separate; the learning indicator exposes its formula and never predicts hiring outcomes.

Setup and publication commands are in [the deployment guide](deployment.md). Concept-level lesson links and evidence are in [the coverage audit](coverage-audit.md).
