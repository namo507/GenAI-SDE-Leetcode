# Focused Build Prompt — TechPrep OS 16-Week Dashboard

You are a principal frontend architect, curriculum engineer, SDE interviewer, data scientist, ML/GenAI platform engineer, accessibility specialist, and motion designer. Extend the included **runnable Next.js starter** into a production-quality learning dashboard. Build working software; do not return only mockups or descriptions.

## Non-negotiable scope

- Keep the roadmap at exactly **16 chronological weeks**, seven days per week.
- Use `docs/curriculum.schema.json` and `lib/curriculum.ts` as the canonical content contracts.
- Give every topic a local **ELI5 / Senior** toggle.
- Give every applicable topic equivalent, runnable **Python / R** examples with matching inputs and semantically matching outputs.
- Use **Motion for React** (`motion/react`, formerly Framer Motion) for UI transitions.
- Use **React Flow** (`@xyflow/react`) for step-controlled diagrams.
- Keep the application minimal, professional, responsive, WCAG 2.2 AA, keyboard accessible, dark/light compatible, and reduced-motion compatible.

## Current starter behavior

The included app already demonstrates:

- Next.js App Router and strict TypeScript
- Tailwind CSS foundation plus semantic CSS tokens
- A complete 16-week chronology
- A validated Zod model and portable JSON Schema
- Per-topic ELI5 and Senior content
- Browser-side Python execution with Pyodide
- Browser-side R execution with webR
- Motion transitions for explanation changes
- React Flow playback with play, pause, previous, next, reset, speed, narration, active nodes, and animated edges

Preserve these working behaviors while expanding the curriculum.

## 16-week curriculum

1. Foundations and diagnostics: Python, R, Git, testing, complexity, reproducibility.
2. SQL and data modeling: joins, CTEs, windows, transactions, indexes, OLTP/OLAP, star schema, SCD2.
3. DSA I: arrays, strings, hashing, two pointers, sliding windows, prefix sums, intervals.
4. DSA II: lists, stacks, queues, binary search, heaps, trees, graphs, backtracking, greedy, dynamic programming.
5. Statistics and experimentation: probability, distributions, estimation, tests, power, Bayesian basics, A/B testing.
6. Analytics and visualization: quality, EDA, metrics, cohorts, funnels, retention, dashboards, storytelling.
7. Classical ML: framing, splits, leakage, preprocessing, linear/logistic models, trees, boosting, metrics, calibration.
8. Advanced ML and causal inference: clustering, PCA/t-SNE/UMAP, anomaly detection, forecasting, recommenders, survival, DAGs, matching, DiD, IV, DML.
9. Deep learning: tensors, backpropagation, optimization, regularization, CNNs, RNN/LSTM, attention, transformers, PyTorch.
10. System design: estimation, APIs, cache, load balancing, partitioning, replication, queues, consistency, reliability, security, cost.
11. Data engineering: ETL/ELT, CDC, formats, warehouses/lakehouses, Spark, Kafka, streaming, orchestration, quality, lineage.
12. Cloud, DevOps, and MLOps: IAM, networking, Docker, Kubernetes, CI/CD, IaC, feature stores, serving, drift, observability.
13. LLM and GenAI: tokenization, embeddings, attention, pretraining, SFT, PEFT/LoRA/QLoRA, decoding, structured output, inference.
14. RAG and evaluation: ingestion, OCR, chunking, BM25, dense/hybrid retrieval, vector indexes, reranking, grounding, RAG metrics, safety.
15. Agentic systems: workflows versus agents, state, planning, tools, memory, human approval, multi-agent trade-offs, tracing, budgets, guardrails.
16. Capstones and interview loops: role-specific projects, DSA/SQL/statistics/ML/system design mocks, behavioral stories, final remediation.

For each week, create seven explicit days: concept map, theory lab, dual-language implementation, applied practice, production lens, interview simulation, and review/remediation. Allow the exact daily labels to adapt when a domain needs a different sequence, but preserve prerequisite order.

## Topic contract

Every topic must include:

- Stable `wNN-dNN-slug` ID
- Domain, roles, difficulty, minutes, prerequisites, and objectives
- ELI5 analogy, concrete steps, and a statement explaining where the analogy fails
- Senior definition, mechanism, trade-offs, interview answer, complexity, failure modes, and production relevance
- One Python and one R example solving the same problem
- Expected output, tests, ELI5 trace, complexity, edge cases, and a common incorrect implementation
- React Flow nodes, edges, and at least two narrated animation states
- Recall, code, design, or case practice
- Version-sensitive references and last-reviewed metadata when the schema is extended

## Dual explanation rules

The ELI5 mode must simplify vocabulary without making false claims. Use a physical analogy, explain the steps, then state the analogy’s limit. The Senior mode must define invariants and assumptions, explain mechanism and complexity, compare alternatives, identify failure modes, and provide a concise interview-ready answer.

The mode switch must be topic-local, keyboard accessible, use `aria-pressed`, preserve focus, and animate content with opacity plus a subtle 8–12px translation over 180–250ms. Under `prefers-reduced-motion`, replace movement with an immediate or near-immediate state change.

## Python and R execution

- Python: Pyodide in a dedicated Web Worker.
- R: webR in a dedicated Web Worker.
- Lazy-initialize each runtime only when selected.
- Show download/initialization state, run state, stdout/stderr, expected output, and runtime errors.
- Add reset and terminate controls, execution timeout, output limit, and package allowlist.
- Never run arbitrary learner code in the Next.js server process.
- Test paired examples against deterministic fixtures and compare normalized outputs in CI.
- Use Python type hints and tests; use idiomatic R and `testthat` where practical.

## Motion and React Flow

Motion for React:

- Use `AnimatePresence` with stable keys for explanation/tab transitions.
- Use shared-layout animation for the active mode/tab indicator.
- Use 120–180ms feedback for controls and 180–250ms panel transitions.
- Use spring motion only for direct manipulation.
- Pause timers when the document is hidden.
- Respect reduced motion everywhere.

React Flow:

- Nodes and edges must remain keyboard focusable.
- Every flow requires Play, Pause, Previous, Next, Reset, speed control, step counter, and live narration.
- Active nodes use a border/focus halo; active edges may use moving dashes only outside reduced-motion mode.
- Provide a textual ordered transcript of all steps for screen readers.
- Validate that every referenced active node/edge ID exists.
- Do not permit node dragging in explanatory playback unless editing is the lesson objective.

## Required product routes

- `/dashboard`: today’s plan, due review, progress, weak areas.
- `/roadmap`: 16-week timeline, week/day detail, role filters.
- `/learn/[domain]/[slug]`: complete lesson workspace.
- `/practice`: topic drills, SQL, coding, statistics, system design, RAG diagnosis.
- `/projects`: role-specific capstones.
- `/interviews`: timed mixed mock loops.
- `/analytics`: mastery, retention, confidence calibration, time versus plan.
- `/glossary`: searchable terminology and prerequisite links.
- `/settings`: role priorities, schedule, languages, theme, accessibility, import/export.

## Quality gates

- `npm run typecheck`, `npm run lint`, and `npm run build` pass.
- Test at 375px, 768px, 1280px, and 2560px.
- Test keyboard-only operation, reduced motion, screen-reader announcements, light/dark mode, offline/error states.
- No dead controls, lorem ipsum, fake code execution, fabricated output, invented APIs, or orphaned topic IDs.
- Keep completion, mastery, confidence, and retention as separate values.
- Label any readiness score as a learning indicator, expose its formula, and never present it as hiring probability.

## Completion report

Return implemented routes, content counts, setup commands, test results, accessibility checks, known limitations, and exact remaining backlog IDs. Prioritize correctness, accessibility, runnable learning experiences, and maintainable content architecture over decorative spectacle.
