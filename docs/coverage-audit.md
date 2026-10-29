# Master curriculum coverage map

Reviewed 2026-10-28 against the [master build brief](briefs/master-build-prompt.md), [curriculum assembly](../content/raw.ts), [base lessons](../content/weeks), [additional lessons](../content/extra), [capstone briefs](../content/projects.ts) and [interview loops](../content/interviews.ts). This maps named concepts, not every possible topic in each field. A schema-valid topic is not proof of empirical learning effectiveness. Fixture checks establish deterministic code behavior, not causal validity or job readiness. Lesson links open the owner-private deployed site; the linked source remains inspectable in GitHub.

## Week 1

- Python and R: [w01-d01-python-r-idioms](https://techprep-os-namo.namit507.chatgpt.site/learn/foundations/python-r-idioms); paired same-input/output implementations throughout applicable lessons.
- Git: [w01-d03-git-collaboration](https://techprep-os-namo.namit507.chatgpt.site/learn/foundations/git-collaboration) (new dedicated snapshot, branch, merge, conflict, revert and collaboration lesson).
- Testing and reproducibility: [w01-d03-testing-reproducibility](https://techprep-os-namo.namit507.chatgpt.site/learn/foundations/testing-reproducibility).
- Complexity: [w01-d02-big-o-complexity](https://techprep-os-namo.namit507.chatgpt.site/learn/foundations/big-o-complexity); additional call-stack analysis in [w01-d02-recursion-call-stack](https://techprep-os-namo.namit507.chatgpt.site/learn/foundations/recursion-call-stack).
- Diagnostics: [w01-d04](https://techprep-os-namo.namit507.chatgpt.site/roadmap/w01-d04) diagnostic problem set and [w01-d07](https://techprep-os-namo.namit507.chatgpt.site/roadmap/w01-d07) gap review; dataframe practice in [w01-d04-dataframe-wrangling](https://techprep-os-namo.namit507.chatgpt.site/learn/foundations/dataframe-wrangling).

## Week 2

- Joins, keys, relational model: [w02-d01-joins-and-keys](https://techprep-os-namo.namit507.chatgpt.site/learn/sql/joins-and-keys).
- CTEs and window functions: [w02-d02-window-functions](https://techprep-os-namo.namit507.chatgpt.site/learn/sql/window-functions).
- Transactions: [w02-d05-transactions-normalization](https://techprep-os-namo.namit507.chatgpt.site/learn/sql/transactions-normalization) (ACID, isolation, anomalies and normalization).
- Indexes: [w02-d04-indexes-query-plans](https://techprep-os-namo.namit507.chatgpt.site/learn/sql/indexes-query-plans) (B-tree and planner behavior).
- OLTP/OLAP: [w02-d05-transactions-normalization](https://techprep-os-namo.namit507.chatgpt.site/learn/sql/transactions-normalization), [w02-d05](https://techprep-os-namo.namit507.chatgpt.site/roadmap/w02-d05) production case, and [w11-d01-warehouse-lakehouse](https://techprep-os-namo.namit507.chatgpt.site/learn/data-engineering/warehouse-lakehouse). The explicit OLTP/OLAP contrast is mostly in the production case rather than a dedicated lesson.
- Star schema and SCD2: [w02-d03-scd2-dimensions](https://techprep-os-namo.namit507.chatgpt.site/learn/sql/scd2-dimensions).
- Additional logical SQL order/NULL treatment: [w02-d01-sql-query-order](https://techprep-os-namo.namit507.chatgpt.site/learn/sql/sql-query-order).

## Week 3

- Arrays, strings, hashing: [w03-d01-hashing-patterns](https://techprep-os-namo.namit507.chatgpt.site/learn/dsa/hashing-patterns).
- Two pointers and sliding windows: [w03-d02-sliding-window](https://techprep-os-namo.namit507.chatgpt.site/learn/dsa/sliding-window).
- Prefix sums and intervals: [w03-d03-prefix-sums-intervals](https://techprep-os-namo.namit507.chatgpt.site/learn/dsa/prefix-sums-intervals).
- Supplementary comparison sorting: [w03-d04-sorting-algorithms](https://techprep-os-namo.namit507.chatgpt.site/learn/dsa/sorting-algorithms).
- Linked-list groundwork begins in week 3: [w03-d05-linked-lists](https://techprep-os-namo.namit507.chatgpt.site/learn/dsa/linked-lists), before its review in week 4.

## Week 4

- Lists: [w03-d05-linked-lists](https://techprep-os-namo.namit507.chatgpt.site/learn/dsa/linked-lists), reused in week 4 practice.
- Stacks, queues and heaps: [w04-d01-stacks-queues-heaps](https://techprep-os-namo.namit507.chatgpt.site/learn/dsa/stacks-queues-heaps).
- Binary search: [w01-d02-big-o-complexity](https://techprep-os-namo.namit507.chatgpt.site/learn/foundations/big-o-complexity) and [w04-d04-binary-search-backtracking](https://techprep-os-namo.namit507.chatgpt.site/learn/dsa/binary-search-backtracking).
- Trees: [w04-d01-trees-bst-tries](https://techprep-os-namo.namit507.chatgpt.site/learn/dsa/trees-bst-tries); traversal in [w04-d02-graph-traversal](https://techprep-os-namo.namit507.chatgpt.site/learn/dsa/graph-traversal).
- Graphs: [w04-d02-graph-traversal](https://techprep-os-namo.namit507.chatgpt.site/learn/dsa/graph-traversal), [w04-d05-shortest-paths-union-find](https://techprep-os-namo.namit507.chatgpt.site/learn/dsa/shortest-paths-union-find).
- Backtracking and greedy checks: [w04-d04-binary-search-backtracking](https://techprep-os-namo.namit507.chatgpt.site/learn/dsa/binary-search-backtracking).
- Dynamic programming: [w04-d03-dynamic-programming](https://techprep-os-namo.namit507.chatgpt.site/learn/dsa/dynamic-programming).

## Week 5

- Probability and distributions: [w05-d01-probability-distributions](https://techprep-os-namo.namit507.chatgpt.site/learn/statistics/probability-distributions).
- Estimation and tests: [w05-d02-hypothesis-testing](https://techprep-os-namo.namit507.chatgpt.site/learn/statistics/hypothesis-testing).
- Confidence intervals: [w05-d02-confidence-intervals-bootstrap](https://techprep-os-namo.namit507.chatgpt.site/learn/statistics/confidence-intervals-bootstrap).
- Power and A/B testing: [w05-d03-ab-test-power](https://techprep-os-namo.namit507.chatgpt.site/learn/statistics/ab-test-power).
- Bayesian basics: [w05-d04-bayesian-ab](https://techprep-os-namo.namit507.chatgpt.site/learn/statistics/bayesian-ab) (Beta-Binomial prior/posterior, not a general Bayesian modeling course).
- Supporting CLT and descriptive measures: [w05-d01-descriptive-stats-clt](https://techprep-os-namo.namit507.chatgpt.site/learn/statistics/descriptive-stats-clt).
- Multiplicity and peeking: [w05-d03-multiple-testing](https://techprep-os-namo.namit507.chatgpt.site/learn/statistics/multiple-testing).

## Week 6

- Quality and EDA: [w06-d01-data-quality-eda](https://techprep-os-namo.namit507.chatgpt.site/learn/analytics/data-quality-eda).
- Metrics and funnels: [w06-d02-metrics-funnels](https://techprep-os-namo.namit507.chatgpt.site/learn/analytics/metrics-funnels); decomposition in [w06-d02-kpi-root-cause](https://techprep-os-namo.namit507.chatgpt.site/learn/analytics/kpi-root-cause).
- Cohorts and retention: [w06-d03-cohort-retention](https://techprep-os-namo.namit507.chatgpt.site/learn/analytics/cohort-retention).
- Dashboards and storytelling: [w06-d04-visualization-storytelling](https://techprep-os-namo.namit507.chatgpt.site/learn/analytics/visualization-storytelling).
- Additional segmentation: [w06-d03-segmentation-rfm](https://techprep-os-namo.namit507.chatgpt.site/learn/analytics/segmentation-rfm).

## Week 7

- Problem framing, splits and leakage: [w07-d01-splits-and-leakage](https://techprep-os-namo.namit507.chatgpt.site/learn/ml/splits-and-leakage).
- Preprocessing: [w07-d01-feature-engineering](https://techprep-os-namo.namit507.chatgpt.site/learn/ml/feature-engineering).
- Linear and logistic models: [w07-d02-linear-logistic-regression](https://techprep-os-namo.namit507.chatgpt.site/learn/ml/linear-logistic-regression).
- Trees and boosting: [w07-d04-trees-boosting](https://techprep-os-namo.namit507.chatgpt.site/learn/ml/trees-boosting).
- Metrics and calibration: [w07-d03-classification-metrics](https://techprep-os-namo.namit507.chatgpt.site/learn/ml/classification-metrics).
- Further bias/variance, tuning and class imbalance: [w07-d02-bias-variance-regularization](https://techprep-os-namo.namit507.chatgpt.site/learn/ml/bias-variance-regularization), [w07-d03-cross-validation-tuning](https://techprep-os-namo.namit507.chatgpt.site/learn/ml/cross-validation-tuning), [w07-d05-imbalanced-data](https://techprep-os-namo.namit507.chatgpt.site/learn/ml/imbalanced-data).

## Week 8

- Clustering and PCA: [w08-d01-clustering-pca](https://techprep-os-namo.namit507.chatgpt.site/learn/advanced-ml/clustering-pca) (worked k-means and covariance/eigenvalue example).
- t-SNE and UMAP: [w08-d01-clustering-pca](https://techprep-os-namo.namit507.chatgpt.site/learn/advanced-ml/clustering-pca) explains Gaussian affinities, perplexity, t-SNE's KL objective, UMAP's neighbor graph/fuzzy memberships/cross-entropy and the limits of map distances. Paired code calculates fixed-scale Gaussian neighbor probabilities and a UMAP-style fuzzy union. These isolate affinity mechanisms; they do not run either full embedding optimizer.
- Anomaly detection and forecasting: [w08-d02-anomaly-forecasting](https://techprep-os-namo.namit507.chatgpt.site/learn/advanced-ml/anomaly-forecasting) (robust z-score/MAD, exponential smoothing, naive baseline).
- Recommenders: [w08-d02-recommender-systems](https://techprep-os-namo.namit507.chatgpt.site/learn/advanced-ml/recommender-systems) plus [w08-d05](https://techprep-os-namo.namit507.chatgpt.site/roadmap/w08-d05) cold-start production case.
- Survival: [w08-d04-kaplan-meier-survival](https://techprep-os-namo.namit507.chatgpt.site/learn/advanced-ml/kaplan-meier-survival).
- DiD: [w08-d03-causal-inference](https://techprep-os-namo.namit507.chatgpt.site/learn/advanced-ml/causal-inference) (worked estimate and assumptions).
- DAGs, matching, IV and DML: [w08-d04-causal-identification](https://techprep-os-namo.namit507.chatgpt.site/learn/advanced-ml/causal-identification) (new dedicated lesson). Explicit backdoor fork/mediator/collider explanations, overlap and exchangeability, IV relevance/independence/exclusion/monotonicity and LATE, plus worked orthogonal residual score and cross-fitting. Matching and IV are conceptual with a numeric Wald example; the runnable fixture focuses on residualized DML.
- Further interpretability: [w08-d04-model-interpretability](https://techprep-os-namo.namit507.chatgpt.site/learn/advanced-ml/model-interpretability).

## Week 9

- Tensors and backpropagation: [w09-d01-backpropagation](https://techprep-os-namo.namit507.chatgpt.site/learn/deep-learning/backpropagation).
- Optimization and regularization: [w09-d02-optimizers-regularization](https://techprep-os-namo.namit507.chatgpt.site/learn/deep-learning/optimizers-regularization).
- CNNs, RNNs and LSTM: [w09-d04-cnn-rnn](https://techprep-os-namo.namit507.chatgpt.site/learn/deep-learning/cnn-rnn). Paired code works through convolution, recurrence and a fixed-gate LSTM cell-state trace. Theory states forget/input/output gates, candidate state, cell update and hidden-state formulas, explaining the additive gradient path and why it can still forget. The LSTM fixture demonstrates equations, not training a production network.
- Attention and transformers: [w09-d03-attention-transformers](https://techprep-os-namo.namit507.chatgpt.site/learn/deep-learning/attention-transformers).
- PyTorch: [w09-d01-backpropagation](https://techprep-os-namo.namit507.chatgpt.site/learn/deep-learning/backpropagation) and [w09-d03-attention-transformers](https://techprep-os-namo.namit507.chatgpt.site/learn/deep-learning/attention-transformers) reference snippets, explicitly non-runnable in browser; the runnable Python/R examples implement the corresponding math.
- Scale and distributed-training expansion: [w09-d05-training-at-scale](https://techprep-os-namo.namit507.chatgpt.site/learn/deep-learning/training-at-scale).

## Week 10

- Estimation and APIs: [w10-d01-estimation-api-design](https://techprep-os-namo.namit507.chatgpt.site/learn/system-design/estimation-api-design).
- Cache, load balancing and partitioning: [w10-d02-caching-load-balancing](https://techprep-os-namo.namit507.chatgpt.site/learn/system-design/caching-load-balancing).
- Replication and queues: [w10-d03-replication-queues](https://techprep-os-namo.namit507.chatgpt.site/learn/system-design/replication-queues).
- Consistency: [w10-d03-consistency-quorums](https://techprep-os-namo.namit507.chatgpt.site/learn/system-design/consistency-quorums).
- Reliability: [w10-d04-service-reliability](https://techprep-os-namo.namit507.chatgpt.site/learn/system-design/service-reliability) (new SLO/error budget/bounded retry lesson), plus multi-region [w10-d05](https://techprep-os-namo.namit507.chatgpt.site/roadmap/w10-d05) URL-shortener case.
- Security: [w10-d01-estimation-api-design](https://techprep-os-namo.namit507.chatgpt.site/learn/system-design/estimation-api-design) explains trust boundaries, authentication versus object/tenant authorization, TLS, token validation, bounded inputs, parameterized queries, CORS, CSRF, isolated cache keys, redacted logs and negative access tests. [w10-d02-rate-limiting](https://techprep-os-namo.namit507.chatgpt.site/learn/system-design/rate-limiting), the [w10-d05](https://techprep-os-namo.namit507.chatgpt.site/roadmap/w10-d05) abuse case and [w12-d03-cloud-networking-iam](https://techprep-os-namo.namit507.chatgpt.site/learn/cloud/cloud-networking-iam) add abuse controls and cloud authorization. This is interview-oriented coverage rather than every application-security class.
- Cost: [w10-d01-estimation-api-design](https://techprep-os-namo.namit507.chatgpt.site/learn/system-design/estimation-api-design), [w10-d05](https://techprep-os-namo.namit507.chatgpt.site/roadmap/w10-d05) storage/egress discussion; deeper explicit hypothetical cost calculations in [w12-d01-cloud-fundamentals](https://techprep-os-namo.namit507.chatgpt.site/learn/cloud/cloud-fundamentals), [w12-d04-iac-cost](https://techprep-os-namo.namit507.chatgpt.site/learn/cloud/iac-cost), [w12-d05-managed-ai-services](https://techprep-os-namo.namit507.chatgpt.site/learn/cloud/managed-ai-services).
- Additional storage engines: [w10-d04-storage-engines](https://techprep-os-namo.namit507.chatgpt.site/learn/system-design/storage-engines).

## Week 11

- ETL, ELT and CDC: [w11-d01-etl-elt-cdc](https://techprep-os-namo.namit507.chatgpt.site/learn/data-engineering/etl-elt-cdc).
- Formats and Spark: [w11-d02-formats-spark-shuffle](https://techprep-os-namo.namit507.chatgpt.site/learn/data-engineering/formats-spark-shuffle).
- Warehouses and lakehouses: [w11-d01-warehouse-lakehouse](https://techprep-os-namo.namit507.chatgpt.site/learn/data-engineering/warehouse-lakehouse).
- Streaming: [w11-d03-streaming-windows](https://techprep-os-namo.namit507.chatgpt.site/learn/data-engineering/streaming-windows).
- Kafka: [w11-d03-streaming-windows](https://techprep-os-namo.namit507.chatgpt.site/learn/data-engineering/streaming-windows) explains topic partitions and per-partition ordering, independent consumer groups, next-read offsets, assignment/rebalance, replay, commit timing and transactional limits. Paired code traces a crash after an idempotent sink write and before committing the next offset; replay does not duplicate the business effect. This is a deterministic broker/consumer teaching model, not a running Kafka cluster. [w10-d03-replication-queues](https://techprep-os-namo.namit507.chatgpt.site/learn/system-design/replication-queues) adds delivery semantics and deduplication.
- Orchestration, quality and lineage: [w11-d04-data-quality-orchestration](https://techprep-os-namo.namit507.chatgpt.site/learn/data-engineering/data-quality-orchestration).

## Week 12

- IAM and networking: [w12-d03-cloud-networking-iam](https://techprep-os-namo.namit507.chatgpt.site/learn/cloud/cloud-networking-iam).
- Docker and Kubernetes: [w12-d02-containers-kubernetes](https://techprep-os-namo.namit507.chatgpt.site/learn/cloud/containers-kubernetes) distinguishes Dockerfile, image, live container and persistent volume; explains immutable/writable layers, cache ordering, namespaces, cgroups, shared kernel, platform limits, multi-stage builds, secret handling, non-root operation and image digests. A Dockerfile is explicitly terminal-only reference code; browser Python/R fixtures simulate Kubernetes placement/HPA, not a container engine or cluster.
- CI/CD: [w12-d01-cicd-canary](https://techprep-os-namo.namit507.chatgpt.site/learn/mlops/cicd-canary).
- IaC: [w12-d04-iac-cost](https://techprep-os-namo.namit507.chatgpt.site/learn/cloud/iac-cost).
- Feature stores and serving: [w12-d02-feature-stores-serving](https://techprep-os-namo.namit507.chatgpt.site/learn/mlops/feature-stores-serving).
- Drift and observability: [w12-d03-drift-observability](https://techprep-os-namo.namit507.chatgpt.site/learn/mlops/drift-observability).

## Week 13

- Tokenization and embeddings: [w13-d01-tokenization-embeddings](https://techprep-os-namo.namit507.chatgpt.site/learn/llm/tokenization-embeddings).
- Attention: [w09-d03-attention-transformers](https://techprep-os-namo.namit507.chatgpt.site/learn/deep-learning/attention-transformers), preceding LLM-specific applications.
- Pretraining, SFT, PEFT, LoRA and QLoRA: [w13-d02-finetuning-lora](https://techprep-os-namo.namit507.chatgpt.site/learn/llm/finetuning-lora).
- Decoding and structured output: [w13-d03-decoding-structured-output](https://techprep-os-namo.namit507.chatgpt.site/learn/llm/decoding-structured-output).
- Inference: [w13-d04-inference-kv-cache](https://techprep-os-namo.namit507.chatgpt.site/learn/llm/inference-kv-cache).
- Supplementary prompts, preference optimization and output evaluation: [w13-d01-prompt-engineering](https://techprep-os-namo.namit507.chatgpt.site/learn/llm/prompt-engineering), [w13-d02-preference-tuning-dpo](https://techprep-os-namo.namit507.chatgpt.site/learn/llm/preference-tuning-dpo), [w13-d05-llm-evaluation](https://techprep-os-namo.namit507.chatgpt.site/learn/llm/llm-evaluation).

## Week 14

- Ingestion, OCR and chunking: [w14-d01-chunking-ingestion](https://techprep-os-namo.namit507.chatgpt.site/learn/rag/chunking-ingestion). Runnable example chunks extracted text; OCR is a pipeline concept, not a browser OCR implementation.
- BM25, dense and hybrid retrieval: [w14-d02-bm25-hybrid-retrieval](https://techprep-os-namo.namit507.chatgpt.site/learn/rag/bm25-hybrid-retrieval). Dense ranking is explicitly a fixed teaching input, not a live embedding-model call.
- Vector indexes: [w14-d02-vector-search-ann](https://techprep-os-namo.namit507.chatgpt.site/learn/rag/vector-search-ann) (worked IVF with recall against exact search; HNSW and PQ mechanism/trade-offs).
- Reranking, grounding and RAG metrics: [w14-d03-rag-evaluation](https://techprep-os-namo.namit507.chatgpt.site/learn/rag/rag-evaluation); cross-encoder placement in [w14-d02-bm25-hybrid-retrieval](https://techprep-os-namo.namit507.chatgpt.site/learn/rag/bm25-hybrid-retrieval). Grounding fixture uses an explicitly limited lexical-overlap proxy, not a fabricated semantic judge.
- Safety: adversarial/out-of-scope evaluation and refusal accuracy in [w14-d03-rag-evaluation](https://techprep-os-namo.namit507.chatgpt.site/learn/rag/rag-evaluation); deterministic tool-layer controls in [w15-d03-guardrails-budgets-tracing](https://techprep-os-namo.namit507.chatgpt.site/learn/agents/guardrails-budgets-tracing). RAG security depth is primarily evaluation/guardrail oriented.

## Week 15

- Workflows versus agents and state: [w15-d01-workflows-vs-agents](https://techprep-os-namo.namit507.chatgpt.site/learn/agents/workflows-vs-agents) (worked refund state machine).
- Planning, tools and memory: [w15-d02-tools-planning-memory](https://techprep-os-namo.namit507.chatgpt.site/learn/agents/tools-planning-memory) (planner explicitly deterministic).
- Human approval, tracing, budgets and guardrails: [w15-d03-guardrails-budgets-tracing](https://techprep-os-namo.namit507.chatgpt.site/learn/agents/guardrails-budgets-tracing).
- Multi-agent trade-offs: [w15-d05](https://techprep-os-namo.namit507.chatgpt.site/roadmap/w15-d05) production case linked to [w15-d01-workflows-vs-agents](https://techprep-os-namo.namit507.chatgpt.site/learn/agents/workflows-vs-agents) and [w15-d03-guardrails-budgets-tracing](https://techprep-os-namo.namit507.chatgpt.site/learn/agents/guardrails-budgets-tracing). Case compares routed workflow versus five-agent chatter; no live multi-agent platform is required or implemented.
- Supplementary reliability/trajectory evaluation: [w15-d04-agent-evaluation](https://techprep-os-namo.namit507.chatgpt.site/learn/agents/agent-evaluation).

## Week 16

- Role-specific projects: [w16-d01-capstone-scoping](https://techprep-os-namo.namit507.chatgpt.site/learn/career/capstone-scoping) plus 12 project briefs in `content/projects.ts`: two each for SDE (`sde-url-shortener`, `sde-job-scheduler`), data scientist (`ds-experiment-readout`, `ds-churn-survival`), ML engineer (`mle-taxi-eta`, `mle-recsys`), GenAI engineer (`genai-docs-rag`, `genai-agent-triage`), data engineer (`de-lakehouse`, `de-streaming`) and data analyst (`da-kpi-dashboard`, `da-funnel-retention`). These are briefs, not pre-built projects that could be misrepresented as the learner's work.
- DSA, SQL, statistics, ML and system-design mocks: [w16-d06](https://techprep-os-namo.namit507.chatgpt.site/roadmap/w16-d06) final mixed loop; 8 timed mock loops in `content/interviews.ts`: `warm-up-mixed`, `sde-onsite`, `data-scientist-loop`, `ml-engineer-loop`, `genai-engineer-loop`, `data-engineer-loop`, `data-analyst-loop`, `cloud-platform-loop`. Per-round prompts and rubrics apply.
- Behavioral stories: [w16-d02-behavioral-star](https://techprep-os-namo.namit507.chatgpt.site/learn/career/behavioral-star).
- Final remediation: [w16-d03-remediation-planning](https://techprep-os-namo.namit507.chatgpt.site/learn/career/remediation-planning) and [w16-d07](https://techprep-os-namo.namit507.chatgpt.site/roadmap/w16-d07).
- Additional product cases: [w16-d02-product-case-interviews](https://techprep-os-namo.namit507.chatgpt.site/learn/career/product-case-interviews).

## Verification and scope limits

- Content validation: 16 chronological weeks, 112 days, 96 topics, 94 paired programs, 451 narrated flow states, 94 code walkthroughs, 367 practice items, 32 coding problems, 249 glossary terms, 12 capstones and 8 mock loops. All contracts passed after the content additions.
- Local unit snapshot: 50 tests across 5 files passed; typecheck passed. The release report records the final integration/browser checks separately.
- Final fixture run: 94/94 paired programs and 64/64 SQL/numeric/coding drills passed using task-local Python 3.12 with numpy/pandas and R 4.5.1 with testthat. This checks both expected outputs, both language test suites, the browser-compatible R test shim, SQL/numeric solutions and coding reference solutions; coding starters must fail the reference tests. All 126 lesson/day links in this report resolve to registered curriculum routes.
- Default system Python 3.9 cannot evaluate the curriculum's union type annotations; local fixtures need Python >=3.10, and CI config selects Python 3.13. Browser runtime versions are independently managed by Pyodide/webR.
- Every applicable topic has an ELI5 explanation with an analogy limit and a Senior explanation. Paired fixtures implement the math or a deterministic teaching model where a browser cannot host the real system. PyTorch and Docker examples remain explicitly labelled reference code. No live model provider, distributed training cluster, Kafka broker, Docker daemon, Kubernetes cluster or cloud account is provisioned by the lessons.
- Source ingestion/OCR, semantic dense retrieval, rerankers and model judges have production explanations, but the runnable fixtures intentionally operate on deterministic extracted text, supplied rankings or explicit proxy checks. The code labels those boundaries instead of presenting fixture output as a real model call.
- Behavioral and capstone-scoping topics omit runnable code by design. Project briefs and mocks guide the learner's work; completing a page does not demonstrate an implemented capstone or predict hiring outcomes.


## Learning Studio expansion, 2026-10-29

The original 16-week concept map remains intact. Five additional complete lessons deepen foundations that later topics rely on:

- [Vector and matrix geometry](https://techprep-os-namo.namit507.chatgpt.site/learn/foundations/linear-algebra-geometry): dot product, norms, cosine, shapes and noncommuting transformations.
- [Derivatives and the chain rule](https://techprep-os-namo.namit507.chatgpt.site/learn/foundations/derivatives-chain-rule): local sensitivity, multiple derivative paths, finite-difference checks and update limits.
- [Information theory](https://techprep-os-namo.namit507.chatgpt.site/learn/statistics/information-theory): surprise, entropy, cross-entropy, directed KL, log units, perplexity and scoring limits.
- [Sampling and selection bias](https://techprep-os-namo.namit507.chatgpt.site/learn/statistics/sampling-selection-bias): target population, sampling frame, nonresponse, support, post-stratification and weight dispersion.
- [Numerical stability](https://techprep-os-namo.namit507.chatgpt.site/learn/deep-learning/numerical-stability): finite range/precision, max-shift softmax, fused log-softmax, cancellation, clipping and explicit input contracts.

[The Learning Studio](https://techprep-os-namo.namit507.chatgpt.site/labs) links 12 calculated experiments, 24 misconception checks, six role paths and interview-transfer cases to actual lesson IDs. Every lesson has a saved explain-back workspace. [The guide](learning-studio.md) states each model's scope and the distinction between calculated predictions and self-graded speaking practice.
