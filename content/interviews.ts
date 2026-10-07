import type { MockLoopInput } from "@/lib/content-types";

export const mockLoops: MockLoopInput[] = [
  {
    id: "warm-up-mixed",
    title: "30-minute mixed warm-up",
    roles: ["sde", "data-scientist", "ml-engineer", "genai-engineer", "data-engineer"],
    summary: "Three short rounds to rehearse switching between coding, SQL and statistics.",
    rounds: [
      { kind: "coding", title: "Arrays and hashing", minutes: 10, topicIds: ["w03-d01-hashing-patterns", "w03-d02-sliding-window"], questions: 1 },
      { kind: "sql", title: "Joins and windows", minutes: 10, topicIds: ["w02-d01-joins-and-keys", "w02-d02-window-functions"], questions: 1 },
      { kind: "statistics", title: "Tests and intervals", minutes: 10, topicIds: ["w05-d02-hypothesis-testing"], questions: 1 },
    ],
  },
  {
    id: "sde-onsite",
    title: "Software engineer onsite",
    roles: ["sde"],
    summary: "Two coding rounds, a system design round and a behavioral round.",
    rounds: [
      { kind: "coding", title: "Coding: arrays, windows and prefix sums", minutes: 45, topicIds: ["w03-d01-hashing-patterns", "w03-d02-sliding-window", "w03-d03-prefix-sums-intervals"], questions: 2 },
      { kind: "coding", title: "Coding: graphs and dynamic programming", minutes: 45, topicIds: ["w04-d02-graph-traversal", "w04-d03-dynamic-programming", "w04-d04-binary-search-backtracking"], questions: 2 },
      { kind: "system-design", title: "System design", minutes: 45, topicIds: ["w10-d01-estimation-api-design", "w10-d02-caching-load-balancing", "w10-d03-replication-queues"], questions: 1 },
      { kind: "behavioral", title: "Behavioral", minutes: 30, topicIds: ["w16-d02-behavioral-star"], questions: 2 },
    ],
  },
  {
    id: "data-scientist-loop",
    title: "Data scientist loop",
    roles: ["data-scientist"],
    summary: "SQL, statistics and experimentation, a product analytics case and behavioral.",
    rounds: [
      { kind: "sql", title: "SQL", minutes: 30, topicIds: ["w02-d01-joins-and-keys", "w02-d02-window-functions", "w06-d02-metrics-funnels"], questions: 2 },
      { kind: "statistics", title: "Statistics and experiments", minutes: 40, topicIds: ["w05-d02-hypothesis-testing", "w05-d03-ab-test-power", "w05-d04-bayesian-ab"], questions: 2 },
      { kind: "ml", title: "Product and causal case", minutes: 40, topicIds: ["w06-d03-cohort-retention", "w08-d03-causal-inference", "w07-d03-classification-metrics"], questions: 2 },
      { kind: "behavioral", title: "Behavioral", minutes: 30, topicIds: ["w16-d02-behavioral-star"], questions: 2 },
    ],
  },
  {
    id: "ml-engineer-loop",
    title: "ML engineer loop",
    roles: ["ml-engineer"],
    summary: "Coding, ML fundamentals, ML system design and behavioral.",
    rounds: [
      { kind: "coding", title: "Coding", minutes: 40, topicIds: ["w04-d01-stacks-queues-heaps", "w04-d02-graph-traversal", "w03-d02-sliding-window"], questions: 2 },
      { kind: "ml", title: "ML fundamentals", minutes: 40, topicIds: ["w07-d01-splits-and-leakage", "w07-d03-classification-metrics", "w07-d04-trees-boosting", "w09-d02-optimizers-regularization"], questions: 3 },
      { kind: "system-design", title: "ML system design", minutes: 45, topicIds: ["w12-d02-feature-stores-serving", "w12-d01-cicd-canary", "w12-d03-drift-observability"], questions: 1 },
      { kind: "behavioral", title: "Behavioral", minutes: 30, topicIds: ["w16-d02-behavioral-star"], questions: 2 },
    ],
  },
  {
    id: "genai-engineer-loop",
    title: "GenAI engineer loop",
    roles: ["genai-engineer"],
    summary: "Coding, LLM fundamentals, a RAG or agent design round and behavioral.",
    rounds: [
      { kind: "coding", title: "Coding", minutes: 40, topicIds: ["w03-d01-hashing-patterns", "w04-d01-stacks-queues-heaps"], questions: 2 },
      { kind: "genai", title: "LLM fundamentals", minutes: 35, topicIds: ["w09-d03-attention-transformers", "w13-d01-tokenization-embeddings", "w13-d03-decoding-structured-output", "w13-d04-inference-kv-cache"], questions: 3 },
      { kind: "genai", title: "RAG or agent system design", minutes: 45, topicIds: ["w14-d02-bm25-hybrid-retrieval", "w14-d03-rag-evaluation", "w15-d03-guardrails-budgets-tracing"], questions: 1 },
      { kind: "behavioral", title: "Behavioral", minutes: 30, topicIds: ["w16-d02-behavioral-star"], questions: 2 },
    ],
  },
  {
    id: "data-engineer-loop",
    title: "Data engineer loop",
    roles: ["data-engineer"],
    summary: "SQL and modeling, pipeline design, coding and behavioral.",
    rounds: [
      { kind: "sql", title: "SQL and modeling", minutes: 35, topicIds: ["w02-d02-window-functions", "w02-d03-scd2-dimensions"], questions: 2 },
      { kind: "system-design", title: "Pipeline design", minutes: 45, topicIds: ["w11-d01-etl-elt-cdc", "w11-d03-streaming-windows", "w11-d04-data-quality-orchestration"], questions: 1 },
      { kind: "coding", title: "Coding", minutes: 35, topicIds: ["w03-d03-prefix-sums-intervals", "w04-d02-graph-traversal"], questions: 2 },
      { kind: "behavioral", title: "Behavioral", minutes: 30, topicIds: ["w16-d02-behavioral-star"], questions: 2 },
    ],
  },
  {
    id: "data-analyst-loop",
    title: "Data analyst loop",
    roles: ["data-analyst"],
    summary: "SQL, a metrics and root-cause case, statistics for experiments, and behavioral.",
    rounds: [
      { kind: "sql", title: "SQL: joins, windows and conditional aggregation", minutes: 35, topicIds: ["w02-d01-joins-and-keys", "w02-d02-window-functions", "w02-d01-sql-query-order"], questions: 2 },
      { kind: "ml", title: "Metrics and root-cause case", minutes: 35, topicIds: ["w06-d02-kpi-root-cause", "w06-d02-metrics-funnels", "w06-d03-cohort-retention"], questions: 2 },
      { kind: "statistics", title: "Experiment readout", minutes: 30, topicIds: ["w05-d02-hypothesis-testing", "w05-d03-multiple-testing"], questions: 2 },
      { kind: "behavioral", title: "Behavioral and stakeholder communication", minutes: 25, topicIds: ["w16-d02-behavioral-star", "w06-d04-visualization-storytelling"], questions: 2 },
    ],
  },
  {
    id: "cloud-platform-loop",
    title: "Cloud and platform deep dive",
    roles: ["sde", "ml-engineer", "data-engineer", "genai-engineer"],
    summary: "Cloud architecture, containers and security, then a model-serving design, for platform-heavy roles.",
    rounds: [
      { kind: "system-design", title: "Cloud architecture and cost", minutes: 40, topicIds: ["w12-d01-cloud-fundamentals", "w12-d04-iac-cost"], questions: 2 },
      { kind: "system-design", title: "Kubernetes, IAM and networking", minutes: 35, topicIds: ["w12-d02-containers-kubernetes", "w12-d03-cloud-networking-iam"], questions: 2 },
      { kind: "genai", title: "Serving models: API or self-host", minutes: 35, topicIds: ["w12-d05-managed-ai-services", "w13-d04-inference-kv-cache"], questions: 2 },
      { kind: "behavioral", title: "Behavioral", minutes: 25, topicIds: ["w16-d02-behavioral-star"], questions: 1 },
    ],
  },
];
