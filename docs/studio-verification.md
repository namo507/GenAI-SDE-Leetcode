# Learning Studio release verification

Verified 2026-10-29 against the request for more conceptual content, refinement and creative interactive teaching across all six roles. The source briefs and 16-week chronology remain the content boundary; this release does not claim to cover every possible interview question or prove learning effectiveness.

## Delivered

- `/labs` and 12 `/labs/[slug]` pages provide deterministic experiments with real parameter-driven calculations, predictions, evidence tables, narrated traces, counterfactual comparisons and saved notes.
- Six role paths connect lessons, experiments, self-graded transfer cases, existing capstones and timed mocks. Links use actual catalog identifiers.
- Every one of the 101 lesson pages has an explain-back workspace with an optional speaking timer, three saved writing fields, an objective-linked self-check and an explicitly self-graded interview rehearsal.
- Five new full lessons cover vectors/matrices, derivatives/chain rule, entropy/cross-entropy/KL, sampling/selection bias and numerical stability. Each has equivalent Python/R programs, tests, walkthroughs, analogy limits, Senior trade-offs, narrated diagrams and practice.
- Eleven new glossary terms and two definition refinements connect the foundational theory to later lessons. Cosine zero is correctly described as orthogonality rather than proof of semantic unrelatedness.
- Existing v1 exports import with empty defaults for the new notes. New exports preserve explanations, experiment parameters, baselines and notes. Imported inputs are normalized consistently for both calculation and labels.

Canonical counts: 16 weeks, 112 days, 101 lessons, 99 paired programs/walkthroughs, 473 narrated diagram states, 382 topic/practice-bank items, 260 glossary terms, 16 production cases, 12 project briefs and 8 mock loops. In addition, the studio supplies 12 dynamic prediction questions, 24 misconception challenges, 12 lab transfer cases, six role transfer cases and a speaking rehearsal on every lesson. These additional interactions are kept separate from the canonical practice-bank count.

## Evidence

| Gate | Result |
| --- | --- |
| Strict typecheck, lint, content contracts | Pass |
| Production and static builds | Pass; 238 HTML pages, all 101 explain-back workspaces and 12 experiment pages, bundled semantic styles, no missing internal route/asset references or stylesheet-resolution errors |
| Unit tests | 69 pass, including independent model invariants and counterexamples |
| Native Python/R fixtures | 99/99 paired programs and their tests; 64/64 executable drills pass |
| Actual webR WebAssembly | 99/99 R outputs and 99/99 R test programs pass through the application runtime |
| Browser runtimes | 24 pass against both the normal build and the exported artifact, including all five new lessons in both Python and R |
| Browser UI | All 108 checks pass against the normal build and all 108 pass in a final exported-artifact run, including the corrected all-role filter expectation and computed typography/card-radius checks |
| Studio accessibility and layouts | Every experiment is checked with visible results and comparisons in both themes using WCAG 2.2 AA axe tags and 375/768/1280/2560 px viewports |
| Notes, predictions and links | Browser tests cover confidence gating, single attempt recording, hiding/restarting predictions, saved inputs/baselines/notes, out-of-range imported baselines, legacy progress compatibility, lesson note round trips and role capstone links |

The model tests check window sums, SQL equality joins/NULLs/fan-out, natural-frequency Bayes denominators, cohort-weight reversal, threshold confusion totals, gradient convergence boundaries, streaming accounting, overload recovery, attention masking/normalization, context packing/authorization and idempotent scoped agent effects. A separate review found and prompted corrections for zero-initial-backlog overload, fused log-softmax cancellation, normalized baseline labels and tiny nonzero loss formatting.

Static builds use the documented Webpack export path to avoid the observed Turbopack build-mode CSS resolver warnings. The regular build and exported artifact both preserve semantic CSS layer order; browser checks assert the specified title font and card radius as well as accessibility and behavior. CI includes a static studio and Python/R smoke gate.

An initial concurrent static UI/runtime run encountered a renderer timeout and a test that read the exiting language panel's stale verdict. Runtime tests now wait for the selected editor instead of a fixed animation delay. Separate final runs with three workers passed all 108 UI checks and 24 runtime checks; the timeout did not recur.

Native Chrome was used to inspect the studio index and an active attention experiment visually and through its accessibility tree. The layout, controls, calculated weights, transcript and evidence table were present. Automated tests provide the broader theme, keyboard and viewport evidence. A full manual screen-reader audit remains uncompleted; automated axe checks are not certification.

The hosted audience stays private to the owner. First-time runtime/package downloads need internet; notes remain browser-local with explicit save and export/import. Prices, production models, retrieval rankings and agent actions in experiments are labelled teaching fixtures. No live model provider, real payment, Kafka broker, cluster or cloud deployment is simulated as an actual external execution.

Setup and maintenance commands are in [deployment.md](deployment.md); the teaching structure and complete experiment list are in [learning-studio.md](learning-studio.md). Optional follow-ups retain the original backlog IDs: **QA-01**, complete the manual screen-reader audit beyond the representative visual inspection; **QA-02**, run the exhaustive full-browser runtime suite beyond the tested 24 integrations; **ENH-01**, offline caching; **ENH-02**, cross-device synchronization. They do not change the delivered local-calculation or browser-worker contracts.
