import type { DrillInput, PracticeSetInput } from "@/lib/content-types";
import type { Difficulty } from "@/lib/curriculum";

type Q = [id: string, title: string, prompt: string, topicIds: string[], difficulty: Difficulty, options: string[], correct: number, explanation: string];

/** Rotates the options by a fixed amount per question so the right answer is not always in the same slot. */
const choice = ([id, title, prompt, topicIds, difficulty, options, correct, explanation]: Q): DrillInput => {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % 9973;
  const n = options.length;
  const offset = hash % n;
  return {
    kind: "choice",
    id,
    title,
    prompt,
    topicIds,
    difficulty,
    options: options.map((_, i) => options[(i + offset) % n]!),
    correct: (correct - offset + n) % n,
    explanation,
  };
};

/** Quick concept checks across every category, each linked to the lesson that teaches it. */
const QUESTIONS: Q[] = [
  // Data structures and algorithms
  ["cc-hash-lookup", "Hash table lookups", "What are the typical average-case and worst-case times to look up a key in a hash table?", ["w03-d01-hashing-patterns"], "beginner",
    ["O(1) average, O(n) worst case", "O(log n) average, O(log n) worst case", "O(1) average and worst case", "O(n) average, O(n²) worst case"], 0,
    "Hashing jumps straight to a bucket, so lookups are constant time on average. If many keys collide into one bucket, a lookup can degrade to scanning all n keys."],
  ["cc-bfs-shortest", "Shortest path in an unweighted graph", "Which algorithm finds the fewest-edges path between two nodes in an unweighted graph?", ["w04-d02-graph-traversal"], "beginner",
    ["Depth-first search", "Breadth-first search", "Dijkstra with a max-heap", "Topological sort"], 1,
    "BFS explores nodes in order of distance (1 edge, then 2, and so on), so the first time it reaches the target is along a shortest path. Dijkstra is needed when edges have different weights."],
  ["cc-heapify", "Building a heap", "How long does it take to build a binary heap from n unordered items with heapify?", ["w04-d01-stacks-queues-heaps"], "intermediate",
    ["O(n log n)", "O(n)", "O(log n)", "O(n²)"], 1,
    "Bottom-up heapify does little work for the many nodes near the leaves, and the total sums to O(n). Pushing items one at a time costs O(n log n)."],
  ["cc-dp-conditions", "When dynamic programming helps", "Which pair of properties makes a problem a good fit for dynamic programming?", ["w04-d03-dynamic-programming"], "beginner",
    ["Sorted input and unique values", "Overlapping subproblems and optimal substructure", "A graph with no cycles and positive weights", "Constant memory and linear time"], 1,
    "DP stores answers to subproblems that repeat (overlapping subproblems) and builds the best answer from best sub-answers (optimal substructure)."],
  ["cc-stable-sort", "Stable sorting", "Which statement about sorting is true?", ["w03-d04-sorting-algorithms"], "intermediate",
    ["Python's sorted() is stable, so equal keys keep their original order", "Quicksort is always stable", "Stability only matters for numbers", "Heap sort is stable"], 0,
    "Python uses Timsort, which is stable. Stability lets you sort by a secondary key first and the primary key second. Typical in-place quicksort and heap sort are not stable."],

  // SQL
  ["cc-sql-alias-where", "Aliases in WHERE", "Why does SELECT amount * 2 AS doubled FROM orders WHERE doubled > 10 fail in most databases?", ["w02-d01-sql-query-order"], "beginner",
    ["Aliases must be uppercase", "WHERE is evaluated before SELECT, so the alias does not exist yet", "You cannot multiply in SELECT", "WHERE only accepts constants"], 1,
    "The logical order is FROM, WHERE, GROUP BY, HAVING, SELECT, ORDER BY. Repeat the expression in WHERE, or compute it in a subquery or CTE first."],
  ["cc-sql-count-null", "COUNT and NULL", "A column has 10 rows, 3 of which are NULL. What do COUNT(*) and COUNT(column) return?", ["w02-d01-joins-and-keys"], "beginner",
    ["10 and 10", "10 and 7", "7 and 7", "7 and 10"], 1,
    "COUNT(*) counts rows; COUNT(column) counts non-NULL values. This is why COUNT(o.id) after a LEFT JOIN gives 0 for customers without orders."],
  ["cc-sql-left-join-where", "A LEFT JOIN that became an inner join", "SELECT c.name, o.id FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.status = 'paid' unexpectedly drops customers without orders. Why?", ["w02-d01-joins-and-keys"], "intermediate",
    ["LEFT JOIN never keeps unmatched rows", "The WHERE filter rejects the NULL order rows; move the status condition into the ON clause", "status must be indexed", "The join needs DISTINCT"], 1,
    "For customers without orders, o.status is NULL, and NULL = 'paid' is not true, so WHERE removes them. Conditions on the right table belong in ON when you want to keep unmatched left rows."],
  ["cc-sql-window-vs-group", "Window functions versus GROUP BY", "What is the key difference between SUM(amount) OVER (PARTITION BY customer_id) and GROUP BY customer_id with SUM(amount)?", ["w02-d02-window-functions"], "beginner",
    ["There is no difference", "The window version keeps every row and adds the total to each; GROUP BY collapses rows to one per customer", "Window functions cannot use SUM", "GROUP BY is always faster"], 1,
    "Window functions compute across related rows without collapsing them, which is why they are used for running totals, ranks and shares of a total."],
  ["cc-sql-isolation", "Isolation levels", "Which anomaly does the READ COMMITTED isolation level prevent?", ["w02-d05-transactions-normalization"], "intermediate",
    ["Dirty reads", "Phantom reads", "Lost updates in every case", "Write skew"], 0,
    "READ COMMITTED only shows committed data, so you never read another transaction's uncommitted changes. Non-repeatable reads, phantoms and write skew need stronger levels or explicit locking."],

  // Statistics
  ["cc-stat-pvalue", "What a p-value means", "Which statement correctly describes a p-value of 0.03?", ["w05-d02-hypothesis-testing"], "beginner",
    ["There is a 3% chance the null hypothesis is true", "If the null hypothesis were true, data at least this extreme would appear about 3% of the time", "The effect is 3% large", "There is a 97% chance the treatment works"], 1,
    "A p-value is computed assuming the null hypothesis is true. It is not the probability that the null is true or that the result will replicate."],
  ["cc-stat-ci", "Interpreting a 95% confidence interval", "What does '95% confidence' refer to?", ["w05-d02-confidence-intervals-bootstrap"], "intermediate",
    ["95% of the data falls inside the interval", "The procedure captures the true value in about 95% of repeated samples", "There is a 95% probability this specific interval contains the true value, in every framework", "The estimate is 95% accurate"], 1,
    "Confidence describes the long-run behavior of the interval-building method. A Bayesian credible interval is the tool that makes direct probability statements about the parameter."],
  ["cc-stat-power", "Increasing power", "Which change increases the power of an A/B test, holding everything else fixed?", ["w05-d03-ab-test-power"], "beginner",
    ["Lowering alpha from 0.05 to 0.01", "Increasing the sample size", "Testing more metrics", "Stopping the test as soon as p < 0.05"], 1,
    "More users shrink the standard error, making a real effect easier to detect. A stricter alpha lowers power, and peeking inflates false positives."],
  ["cc-stat-multiple", "Many metrics at once", "You test 20 independent metrics at alpha = 0.05 and none truly changed. About how likely is at least one 'significant' result?", ["w05-d03-multiple-testing"], "intermediate",
    ["5%", "About 36%", "About 64%", "100%"], 2,
    "1 − 0.95²⁰ ≈ 0.64. Control the family-wise error rate (Bonferroni, Holm) or the false discovery rate (Benjamini-Hochberg), and pre-register a primary metric."],
  ["cc-stat-clt", "The central limit theorem", "What does the central limit theorem say?", ["w05-d01-descriptive-stats-clt"], "beginner",
    ["Every dataset becomes normal when it is large", "The distribution of sample means approaches a normal distribution as sample size grows, for populations with finite variance", "The median equals the mean for large samples", "Outliers disappear in large samples"], 1,
    "The raw data keeps its shape; the averages of repeated samples become approximately normal, which is why normal-based intervals for means work at moderate sizes."],

  // Analytics
  ["cc-an-simpson", "Conversion went up everywhere but down overall", "Conversion rose in every country, yet total conversion fell. What is the most likely explanation?", ["w06-d02-kpi-root-cause"], "intermediate",
    ["A tracking bug in every country", "A mix shift: traffic moved toward countries with lower conversion (Simpson's paradox)", "Random noise", "The metric definition changed in every country"], 1,
    "When segment weights change, the overall rate can move opposite to every segment. Decompose the change into rate effects and mix effects before drawing conclusions."],
  ["cc-an-median", "Summarizing skewed spend", "Order values are mostly 20 to 40 with a few orders over 5,000. Which summary best describes a typical order?", ["w06-d01-data-quality-eda"], "beginner",
    ["The mean", "The median", "The maximum", "The sum"], 1,
    "The median is robust to extreme values. Report the mean too if totals matter, but say that a few large orders pull it up."],
  ["cc-an-cohorts", "Why cohort tables", "Why analyze retention by signup cohort instead of one overall retention curve?", ["w06-d03-cohort-retention"], "beginner",
    ["Cohorts are required by SQL", "Mixing users who joined at different times hides whether newer users retain better or worse", "Cohorts remove the need for dates", "Overall curves cannot be plotted"], 1,
    "Each cohort is measured from its own start, so product or marketing changes show up as differences between rows instead of being averaged away."],

  // Machine learning
  ["cc-ml-leakage", "Spotting leakage", "Which step leaks information from the test set?", ["w07-d01-splits-and-leakage", "w07-d01-feature-engineering"], "beginner",
    ["Fitting a scaler on the training split only", "Fitting a scaler on all data before splitting", "Using cross-validation inside the training set", "Holding out the most recent month as the test set"], 1,
    "The scaler's mean and spread then include test rows. Fit every transform on training data only, ideally inside a pipeline."],
  ["cc-ml-threshold", "Moving the decision threshold", "Lowering a classifier's threshold from 0.5 to 0.3 usually does what?", ["w07-d03-classification-metrics", "w07-d05-imbalanced-data"], "beginner",
    ["Raises precision and lowers recall", "Raises recall and lowers precision", "Changes the AUC", "Has no effect on predictions"], 1,
    "More cases are flagged, so more true positives are caught (recall up) along with more false alarms (precision usually down). AUC does not depend on the threshold."],
  ["cc-ml-l1", "L1 versus L2 regularization", "Which regularizer tends to set some coefficients exactly to zero?", ["w07-d02-bias-variance-regularization"], "intermediate",
    ["L2 (ridge)", "L1 (lasso)", "Dropout", "Early stopping"], 1,
    "The L1 penalty's corner at zero makes exact zeros optimal for weak features, giving built-in feature selection. Ridge shrinks coefficients but rarely to exactly zero."],
  ["cc-ml-boosting", "Boosting versus bagging", "How does gradient boosting differ from a random forest?", ["w07-d04-trees-boosting"], "intermediate",
    ["Boosting trains trees independently on bootstrap samples", "Boosting adds trees one after another, each fitting the errors of the ensemble so far", "Random forests cannot do classification", "Boosting uses only one tree"], 1,
    "Random forests average many deep, independent trees to reduce variance. Boosting builds shallow trees sequentially to reduce bias, which also makes it easier to overfit without a learning rate and early stopping."],
  ["cc-ml-auc", "What AUC measures", "What does a ROC AUC of 0.8 mean?", ["w07-d03-classification-metrics"], "intermediate",
    ["80% of predictions are correct", "A random positive is scored above a random negative 80% of the time", "Precision is 0.8", "The model is calibrated"], 1,
    "AUC is a ranking measure. It says nothing about calibration or accuracy at any particular threshold."],
  ["cc-ml-cv", "Choosing a hyperparameter", "Where should you choose the regularization strength?", ["w07-d03-cross-validation-tuning"], "beginner",
    ["On the test set", "With cross-validation on the training data, then evaluate once on the test set", "On the full dataset", "By picking the value with the lowest training error"], 1,
    "Tuning on the test set makes its score optimistic. Cross-validation on training data picks the value; the untouched test set gives an honest estimate."],

  // Deep learning
  ["cc-dl-vanishing", "Vanishing gradients", "Which change most directly helps gradients flow through a very deep network?", ["w09-d01-backpropagation", "w09-d04-cnn-rnn"], "intermediate",
    ["Using sigmoid activations everywhere", "Residual (skip) connections and normalization layers", "Removing the bias terms", "Using a smaller batch"], 1,
    "Skip connections give gradients a short path back to early layers, and normalization keeps activations in a healthy range. Saturating activations such as sigmoid make the problem worse."],
  ["cc-dl-attention-scale", "Why scale attention scores", "Why are attention scores divided by the square root of the key dimension?", ["w09-d03-attention-transformers"], "advanced",
    ["To save memory", "To keep the dot products from growing with dimension, so the softmax does not saturate", "To make attention causal", "To normalize the values"], 1,
    "Dot products of random vectors grow in variance with dimension. Without scaling, softmax becomes nearly one-hot and gradients get tiny."],
  ["cc-dl-dropout", "Dropout at inference", "What happens to dropout when a trained model serves predictions?", ["w09-d02-optimizers-regularization"], "beginner",
    ["It drops the same units as in training", "It is turned off; with inverted dropout, the scaling was already applied during training", "It doubles the dropout rate", "It is applied only to the output layer"], 1,
    "Dropout is a training-time regularizer. Frameworks switch it off in evaluation mode, which is why calling model.eval() matters."],
  ["cc-dl-adam", "Adam's adaptive steps", "What makes Adam different from plain SGD?", ["w09-d02-optimizers-regularization"], "intermediate",
    ["It needs no learning rate", "It keeps running averages of gradients and squared gradients, giving each parameter its own step size", "It only works for convolutional networks", "It computes exact second derivatives"], 1,
    "Adam combines momentum with per-parameter scaling by recent gradient size. It still has a learning rate, and AdamW decouples weight decay from that update."],

  // GenAI
  ["cc-genai-temperature", "Sampling temperature", "Lowering the sampling temperature from 1.0 to 0.2 has which effect?", ["w13-d03-decoding-structured-output"], "beginner",
    ["More random, creative outputs", "A sharper distribution that favors the most likely tokens", "Longer outputs", "Fewer tokens in the vocabulary"], 1,
    "Dividing logits by a small temperature exaggerates differences, so sampling picks the top tokens more often. Temperature 0 is usually treated as greedy decoding."],
  ["cc-genai-rag-vs-ft", "Facts that change weekly", "Your assistant must answer from a product catalog that changes every week. What is the best first approach?", ["w14-d01-chunking-ingestion", "w13-d02-finetuning-lora"], "beginner",
    ["Fine-tune the model every week", "Retrieval-augmented generation over the current catalog", "Increase the context window and paste in old data", "Raise the temperature"], 1,
    "RAG keeps knowledge in a searchable index that updates without retraining and lets answers cite sources. Fine-tuning is better for style, format and behavior than for fast-changing facts."],
  ["cc-genai-lora", "What LoRA trains", "In LoRA fine-tuning, what is trained?", ["w13-d02-finetuning-lora"], "intermediate",
    ["All model weights", "Small low-rank adapter matrices added to chosen layers, with the base weights frozen", "Only the tokenizer", "Only the output softmax"], 1,
    "LoRA learns a low-rank update per adapted matrix, so trainable parameters and optimizer memory drop dramatically. QLoRA also keeps the frozen base in 4-bit."],
  ["cc-genai-kv-cache", "The KV cache", "What does the KV cache store during generation?", ["w13-d04-inference-kv-cache"], "intermediate",
    ["The model's weights in compressed form", "Keys and values of previous tokens for each layer, so they are not recomputed", "The user's chat history in plain text", "Cached answers to identical prompts"], 1,
    "Reusing past keys and values makes each new token cheap to compute, but cache memory grows with layers, KV heads, sequence length and batch size."],
  ["cc-genai-injection", "Prompt injection defense", "A RAG agent with an email tool reads web pages. Which defense matters most against prompt injection?", ["w13-d01-prompt-engineering", "w15-d03-guardrails-budgets-tracing"], "intermediate",
    ["Adding 'ignore malicious instructions' to the system prompt", "Least-privilege tools, treating retrieved text as data, and human approval for risky actions", "Using a larger model", "Lowering the temperature"], 1,
    "Prompts can be talked around. Limiting what the agent can do, separating data from instructions, and gating side effects bound the damage when injection succeeds."],
  ["cc-genai-faithfulness", "Measuring hallucination in RAG", "Which metric checks whether a RAG answer is supported by the retrieved context?", ["w14-d03-rag-evaluation"], "beginner",
    ["Recall@k", "Faithfulness or groundedness", "Perplexity", "BLEU"], 1,
    "Retrieval metrics (recall, MRR, nDCG) judge what was fetched. Faithfulness judges whether each claim in the answer is backed by that context."],

  // System design
  ["cc-sd-cap", "The CAP theorem in practice", "During a network partition, what must a distributed data store choose between?", ["w10-d03-consistency-quorums"], "intermediate",
    ["Latency and throughput", "Consistency and availability", "Durability and cost", "Reads and writes"], 1,
    "When nodes cannot talk, a store either refuses some requests to stay consistent or answers them and risks stale or conflicting data. PACELC adds the latency versus consistency trade-off when there is no partition."],
  ["cc-sd-idempotency", "Safe retries", "Clients retry a payment request after a timeout. How do you avoid charging twice?", ["w10-d03-replication-queues"], "beginner",
    ["Disable retries", "Require an idempotency key and store the result of the first request under it", "Use a faster database", "Add more replicas"], 1,
    "With an idempotency key, a repeated request returns the stored outcome instead of executing again. The same idea makes queue consumers safe under at-least-once delivery."],
  ["cc-sd-consistent-hashing", "Adding a cache node", "Why use consistent hashing for a cache cluster?", ["w10-d02-caching-load-balancing"], "intermediate",
    ["It encrypts keys", "Adding or removing a node moves only a small share of keys instead of nearly all of them", "It guarantees no cache misses", "It sorts keys alphabetically"], 1,
    "With hash mod N, changing N remaps most keys and floods the database. A hash ring with virtual nodes moves roughly 1/N of the keys."],
  ["cc-sd-rate-limit", "Token bucket behavior", "What does a token bucket rate limiter allow that a strict sliding log does not?", ["w10-d02-rate-limiting"], "intermediate",
    ["Unlimited traffic", "Short bursts up to the bucket size while enforcing the average rate", "Exactly-once delivery", "Per-user encryption"], 1,
    "Tokens refill at a steady rate and accumulate up to a cap, so a quiet client can burst briefly. A sliding log enforces the limit in every window."],

  // Data engineering
  ["cc-de-parquet", "Why columnar formats", "Why are columnar formats like Parquet faster for analytics queries?", ["w11-d02-formats-spark-shuffle", "w11-d01-warehouse-lakehouse"], "beginner",
    ["They store rows in random order", "Queries read only the columns they need, and similar values compress well", "They forbid NULLs", "They are always smaller than CSV by 100 times"], 1,
    "Column pruning and compression cut bytes read; file statistics allow skipping whole row groups. Row formats suit transactional point reads and writes."],
  ["cc-de-watermark", "Late events in streaming", "What is a watermark in stream processing?", ["w11-d03-streaming-windows"], "intermediate",
    ["A copyright notice on data", "A moving estimate of event time below which the system assumes no more events will arrive, so windows can close", "The maximum throughput", "A checksum on each message"], 1,
    "Watermarks trade completeness for latency. Events older than the watermark are late and are dropped, sent to a side output, or used to update results, depending on configuration."],
  ["cc-de-small-files", "Partitioning by user id", "A team partitions a table by user_id with millions of users. What problem appears?", ["w11-d01-warehouse-lakehouse", "w11-d02-formats-spark-shuffle"], "intermediate",
    ["Too few files", "Millions of tiny files that slow planning and reading", "Queries can no longer filter by date", "Data becomes unencrypted"], 1,
    "Partition columns should have low to medium cardinality and match common filters. High-cardinality keys belong in clustering or sorting within files."],

  // Cloud and MLOps
  ["cc-cloud-shared-resp", "Shared responsibility", "Under the shared responsibility model, who is responsible for an S3 bucket being publicly readable by mistake?", ["w12-d01-cloud-fundamentals", "w12-d03-cloud-networking-iam"], "beginner",
    ["The cloud provider", "The customer, who configures access", "Nobody", "The internet service provider"], 1,
    "Providers secure the infrastructure; customers own identity, access configuration and data protection. Account-level public access blocks help prevent this mistake."],
  ["cc-cloud-spot", "Using spot capacity", "Which workload fits spot or preemptible instances best?", ["w12-d01-cloud-fundamentals"], "beginner",
    ["A single-instance production database", "Batch jobs and training runs that checkpoint and can restart", "A payment service with no replicas", "A login service with strict uptime needs"], 1,
    "Spot capacity is cheap because it can be reclaimed with little notice. Work that tolerates interruption, through checkpoints and retries, captures the savings safely."],
  ["cc-cloud-iam-deny", "Allow and deny together", "An identity policy allows s3:* on a bucket, and another policy explicitly denies s3:DeleteObject on it. Can the role delete objects?", ["w12-d03-cloud-networking-iam"], "beginner",
    ["Yes, because an allow exists", "No, an explicit deny always wins", "Only during business hours", "It depends on statement order"], 1,
    "In AWS IAM evaluation, an explicit deny in any applicable policy overrides any allow, and statement order does not matter."],
  ["cc-cloud-hpa", "Pods versus nodes", "Your Horizontal Pod Autoscaler wants 20 replicas but pods stay Pending. What is missing?", ["w12-d02-containers-kubernetes"], "intermediate",
    ["A bigger container image", "Node capacity: a cluster autoscaler (or more nodes) to fit the pods' requests", "A lower CPU target", "A new namespace"], 1,
    "The HPA changes how many pods are desired; the scheduler still needs nodes with enough allocatable CPU and memory. The cluster autoscaler adds nodes when pods cannot be placed."],
  ["cc-mlops-skew", "Training-serving skew", "A model scores well offline but poorly in production, and features are computed by different code in training and serving. What is this called?", ["w12-d02-feature-stores-serving"], "beginner",
    ["Concept drift", "Training-serving skew", "Overfitting", "Label leakage"], 1,
    "Two implementations of the same feature drift apart. Shared feature definitions (a feature store or one library) and logged serving features for training prevent it."],

  // Interviews
  ["cc-career-star", "Structuring a behavioral answer", "What does the STAR structure stand for?", ["w16-d02-behavioral-star"], "beginner",
    ["Strategy, Tactics, Analysis, Review", "Situation, Task, Action, Result", "Skills, Team, Approach, Risk", "Scope, Timeline, Assumptions, Results"], 1,
    "Keep the situation and task short, spend most of the answer on your own actions, and end with a measured result and what you learned."],
];

export const conceptSet: PracticeSetInput = {
  id: "concepts",
  title: "Concept checks",
  description: "Quick multiple-choice checks across every category, from hash tables to cloud IAM. Each links to the lesson that teaches it and explains why the answer is right.",
  items: QUESTIONS.map(choice),
};
