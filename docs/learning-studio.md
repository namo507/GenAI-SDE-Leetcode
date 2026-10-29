# Learning Studio

The [Learning Studio](https://techprep-os-namo.namit507.chatgpt.site/labs) adds experiments and speaking practice to the 16-week curriculum. The full chronology remains 16 weeks and 112 days. Experiments complement the lessons instead of replacing their prerequisites or runnable Python/R implementations.

## Teaching loop

1. Read a concrete scenario and choose its inputs.
2. Predict an outcome and rate confidence before checking. Checking records one objectively graded question attempt. Exploring without a prediction records no attempt.
3. Inspect calculated metrics, a complete evidence table and a narrated trace. Change one input and explain the effect.
4. Pin a baseline, change a condition, and compare both configurations under the same model.
5. Challenge a tempting but incorrect rule, then explain a new interview situation against an explicit self-grading rubric.
6. Save the parameter snapshot, comparison and discovery note before leaving.

Every lab has a physical ELI5 analogy with a stated limit, a Senior explanation of assumptions, mechanism, trade-offs and failure modes, and primary references. These are deterministic local teaching models. No real cloud resources, payments, agents or model-provider calls are invoked.

## Experiments

| Experiment | What you can change and discover |
| --- | --- |
| `window-cost` | Array and window sizes change exact array-value read counts; reusing a sum is not automatically faster for every small window |
| `join-fanout` | Duplicate keys, missing dimension rows and inner/left joins change row counts and totals; NULL equality does not match ordinary NULLs |
| `bayes-base-rates` | Base rate, sensitivity and specificity change the composition of positive flags in 10,000 items |
| `simpsons-paradox` | Cohort weights can reverse pooled rates while within-cohort rates favor the other variant; standardization is not causal identification |
| `classification-threshold` | The same fixed scores yield different confusion matrices and error costs; precision can be undefined |
| `gradient-descent` | Step size can produce convergence, shrinking crossings, oscillation or divergence; a stationary start is an exception |
| `cache-retries` | TTL changes freshness and source reads; independently retrying layers amplify worst-case traffic |
| `streaming-watermarks` | Watermark lag, window size and retained lateness change on-time, updated and dropped event counts |
| `autoscaling-capacity` | Demand, headroom, replica limits and startup delay change backlog recovery; an empty queue can still become overloaded |
| `attention-temperature` | Query coordinates, masks and a teaching temperature change normalized attention weights and a value mixture |
| `rag-retrieval` | Candidate count, fixture reranking, authorization and token budget separate candidate recall from evidence reaching context |
| `agent-guardrails` | Scoped capability, trusted approval, execution/step budgets and idempotency control a fictional tool-call trace |

There are 12 dynamic prediction questions, 24 misconception challenges, 12 self-graded lab transfer cases and six role transfer cases. They are additional to the curriculum's 382 topic/practice-bank items. Repeating a known question is practice, not independent evidence of broad mastery.

## Theory and speaking practice

Five new complete lessons explain vector/matrix geometry, derivatives and the chain rule, entropy/cross-entropy/KL, sampling and selection bias, and numerical stability. They include paired programs, tests, narrated diagrams, edge cases and deliberate incorrect examples.

Every one of the 101 lessons has an explain-back workspace: a plain-language explanation, an assumption, a counterexample, an optional 60-second speaking timer and a self-check linked to that lesson's objectives and invariant. Saving writing does not automatically grade it or mark a topic mastered. A learner must explicitly record a self-assessment to create an attempt.

Six role paths connect foundations, experiments, a transfer case, role capstones and timed mocks. They cover software engineer, data scientist, data analyst, ML engineer, data engineer and GenAI engineer. All underlying topic, experiment, project and mock identifiers are checked against the actual catalogs.

## Progress compatibility and privacy

`reflections` and `labNotes` extend the existing v1 progress format with default empty records. Older v1 exports still import successfully. New exports include saved explanations, inputs, baseline snapshots and discovery notes. Imported numeric inputs are normalized to each lab's declared controls before calculation or display. Unknown keys cannot become calculator parameters.

Progress remains browser-local, with JSON import/export in Settings. Moving from localhost to the hosted origin requires export/import if you want to carry test or study notes over. Views, saved notes and exploratory control changes do not add correct-answer attempts.

After updating the site, refresh any already-open TechPrep tabs before saving new notes. A tab still running the older release can save its older progress shape without the new note fields. Export a backup in Settings when moving between releases or devices.

## Verification

- `npm run check`: typecheck, lint, unit tests and canonical curriculum validation.
- `npm run fixtures`: all paired examples and executable drills under native Python/R.
- `npm run fixtures:webr`: all R programs/tests through actual webR and the application runtime.
- `npx playwright test tests/e2e/studio.spec.ts`: all 12 experiments in both themes with visible results, control changes, comparison, accessibility checks and four viewport widths; prediction recording, notes, imports and role links.
- `npm run e2e:runtime`: representative browser Python/R integration, including the five new theory implementations.

The model tests cover algebraic invariants and counterexamples independently of UI text. They include rolling-sum correctness, SQL fan-out/NULLs, natural-frequency Bayes denominators, cohort reversal, confusion-matrix accounting, attention masks, context packing, overload recovery and scoped idempotent effects. Automated checks and a successful calculation do not establish empirical learning effectiveness.
