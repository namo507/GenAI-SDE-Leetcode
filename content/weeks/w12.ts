import { REVIEWED, code, defineTopic, defineWeek, edge, node, step } from "../helpers";

export const topics = [
  defineTopic({
    id: "w12-d01-cicd-canary",
    slug: "cicd-canary",
    title: "Cloud, containers, CI/CD and canary releases",
    domain: "mlops",
    roles: ["ml-engineer", "sde", "data-engineer", "genai-engineer"],
    difficulty: "intermediate",
    minutes: 75,
    prerequisites: ["w05-d02-hypothesis-testing", "w10-d01-estimation-api-design"],
    objectives: [
      "Map the path from commit to production: build, test, image, deploy, verify",
      "Gate a canary on error rate and latency with explicit rules",
      "Explain IAM least privilege, networking basics and infrastructure as code",
    ],
    summary:
      "Continuous delivery ships small changes safely. A canary sends a slice of traffic to the new version and compares it with the baseline; automated gates decide whether to promote or roll back before most users are affected.",
    eli5: {
      analogy:
        "A restaurant testing a new recipe. A few tables get the new dish while everyone else gets the usual one. If those tables send back more plates or wait much longer, the kitchen switches back before the whole room is served.",
      steps: [
        "Package the new version so it runs the same everywhere (a container image).",
        "Send a small share of real traffic to it.",
        "Compare its errors and slowness with the current version's.",
        "If it is clearly worse, roll back; otherwise widen the share.",
      ],
      analogyLimit:
        "A few tables give a small, noisy sample. Real canaries need enough traffic for the comparison to mean something, and some problems (memory leaks, data corruption) only show up later or at full load.",
    },
    senior: {
      definition:
        "A canary release routes a fraction of production traffic to a new version and compares service-level indicators (error rate, latency percentiles, saturation) with the baseline using predefined statistical gates. CI builds and tests every commit; CD promotes immutable artifacts (container images) through environments.",
      invariants: [
        "The artifact deployed to canary and production is the same immutable image (same digest).",
        "Gates are defined before the rollout, not chosen after looking at results.",
        "Rollback is automated and faster than the time it takes to diagnose.",
      ],
      mechanism: [
        "The error gate reuses the two-proportion z-test: a one-sided test that the canary's error rate exceeds the baseline's.",
        "The latency gate compares nearest-rank p95 values with a 10% tolerance.",
        "Here the canary has 6 errors in 1,000 requests versus 25 in 10,000: z is about 2, above 1.645, so the error gate fails and the decision is rollback even though latency passed.",
        "Surrounding practices: least-privilege IAM roles per service, private networking with explicit ingress, and infrastructure defined in code (Terraform) and reviewed like application code.",
      ],
      complexity: "Gate computation is O(n log n) for percentiles; the real constraint is collecting enough canary traffic.",
      tradeoffs: [
        { option: "Canary", choose: "Stateless services with enough traffic for statistics.", cost: "Needs traffic splitting and automated analysis." },
        { option: "Blue-green", choose: "Fast full switches with instant rollback.", cost: "Double capacity during the switch; no gradual exposure." },
        { option: "Shadow (dark) launch", choose: "ML models: compare predictions on mirrored traffic without serving them.", cost: "Extra compute and no user-facing feedback." },
      ],
      failureModes: [
        "Too little canary traffic, so gates cannot detect real regressions.",
        "Comparing against last week instead of a concurrent baseline.",
        "Shared database migrations that cannot roll back with the code.",
        "Overly broad IAM permissions that turn a bug into a breach.",
      ],
      production:
        "Progressive delivery tools (Argo Rollouts, Flagger, cloud deployment services) automate traffic shifting and analysis. For ML, combine canaries with shadow mode and business-metric guardrails.",
      interviewAnswer:
        "CI builds an immutable image and runs tests on every commit; CD promotes the same image through staging to a canary. The canary takes a few percent of traffic, and automated gates compare error rate with a one-sided proportion test and p95 latency with a tolerance against a concurrent baseline. Any failed gate triggers automatic rollback. Infrastructure is in Terraform and services run with least-privilege roles.",
    },
    implementation: {
      problem: "Decide whether to promote a canary using an error-rate z-test and a p95 latency gate.",
      input: "baseline 25 errors in 10,000 requests; canary 6 errors in 1,000; 20 latency samples each (ms); z threshold 1.645; p95 tolerance 10%",
      python: {
        code: code`
          from math import ceil, sqrt

          BASELINE_LAT = [120, 130, 125, 140, 135, 150, 128, 132, 145, 160, 138, 127, 133, 129, 142, 136, 131, 126, 139, 300]
          CANARY_LAT = [118, 129, 124, 137, 133, 148, 126, 130, 141, 150, 135, 125, 131, 128, 140, 134, 129, 124, 136, 280]


          def p95(samples: list[float]) -> float:
              ordered = sorted(samples)
              return ordered[ceil(0.95 * len(ordered)) - 1]


          def worse_error_rate(x1: int, n1: int, x2: int, n2: int) -> tuple[float, float, float]:
              p1, p2 = x1 / n1, x2 / n2
              pooled = (x1 + x2) / (n1 + n2)
              z = (p2 - p1) / sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2))
              return p1, p2, z


          p1, p2, z = worse_error_rate(25, 10_000, 6, 1_000)
          error_ok = z <= 1.645
          lat_ok = p95(CANARY_LAT) <= 1.10 * p95(BASELINE_LAT)
          print(f"error rate: baseline={100 * p1:.3f}% canary={100 * p2:.3f}% z={z:.2f} -> {'pass' if error_ok else 'fail'}")
          print(f"p95 latency: baseline={p95(BASELINE_LAT)}ms canary={p95(CANARY_LAT)}ms -> {'pass' if lat_ok else 'fail'}")
          print(f"decision: {'promote' if error_ok and lat_ok else 'rollback'}")
        `,
      },
      r: {
        code: code`
          baseline_lat <- c(120, 130, 125, 140, 135, 150, 128, 132, 145, 160, 138, 127, 133, 129, 142, 136, 131, 126, 139, 300)
          canary_lat <- c(118, 129, 124, 137, 133, 148, 126, 130, 141, 150, 135, 125, 131, 128, 140, 134, 129, 124, 136, 280)

          p95 <- function(x) sort(x)[ceiling(0.95 * length(x))]

          worse_error_rate <- function(x1, n1, x2, n2) {
            p1 <- x1 / n1
            p2 <- x2 / n2
            pooled <- (x1 + x2) / (n1 + n2)
            z <- (p2 - p1) / sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2))
            c(p1 = p1, p2 = p2, z = z)
          }

          e <- worse_error_rate(25, 10000, 6, 1000)
          error_ok <- e[["z"]] <= 1.645
          lat_ok <- p95(canary_lat) <= 1.10 * p95(baseline_lat)
          cat(sprintf("error rate: baseline=%.3f%% canary=%.3f%% z=%.2f -> %s\n", 100 * e[["p1"]], 100 * e[["p2"]], e[["z"]], if (error_ok) "pass" else "fail"))
          cat(sprintf("p95 latency: baseline=%dms canary=%dms -> %s\n", as.integer(p95(baseline_lat)), as.integer(p95(canary_lat)), if (lat_ok) "pass" else "fail"))
          cat(sprintf("decision: %s\n", if (error_ok && lat_ok) "promote" else "rollback"))
        `,
      },
      expectedOutput: code`
        error rate: baseline=0.250% canary=0.600% z=1.99 -> fail
        p95 latency: baseline=160ms canary=150ms -> pass
        decision: rollback
      `,
      tests: {
        python: code`
          def test_nearest_rank_p95():
              assert p95(list(range(1, 21))) == 19


          def test_equal_rates_pass():
              _, _, z = worse_error_rate(10, 1000, 10, 1000)
              assert z == 0


          def test_better_canary_has_negative_z():
              assert worse_error_rate(30, 1000, 10, 1000)[2] < 0
        `,
        r: code`
          test_that("nearest-rank p95", {
            expect_equal(p95(1:20), 19L)
          })

          test_that("a better canary has negative z", {
            expect_lt(worse_error_rate(30, 1000, 10, 1000)[["z"]], 0)
          })
        `,
      },
      eli5Trace: [
        "The usual dish is sent back 25 times in 10,000 plates: 0.25%.",
        "The new dish is sent back 6 times in 1,000 plates: 0.6%, more than double.",
        "That gap is about 2 typical wobbles, too big to blame on luck: the error check fails.",
        "The new dish is actually a little faster, but one failed check is enough to switch back.",
      ],
      complexity: { time: "O(n log n) for percentiles", space: "O(n)" },
      edgeCases: [
        "Zero errors in both groups makes the pooled variance 0; treat as pass.",
        "Very small canary traffic makes the z-test unreliable; wait for a minimum sample.",
        "Nearest-rank percentiles on 20 samples are coarse; real gates use histograms over thousands.",
        "A latency gate on p95 can miss p99 regressions; gate the percentiles your SLO uses.",
      ],
      incorrect: {
        language: "python",
        code: code`
          decision = "promote" if p2 < 0.01 else "rollback"
        `,
        whyWrong: "An absolute threshold ignores the baseline: the canary more than doubled the error rate yet stays under 1%, so it would be promoted.",
        fix: "Compare against a concurrent baseline with a statistical test and predefined tolerances.",
      },
    },
    flow: {
      title: "Commit to production with a canary gate",
      nodes: [
        node("commit", "Commit", 0, 110, "PR merged"),
        node("ci", "CI", 200, 110, "tests, image build"),
        node("canary", "Canary 5%", 420, 110, "same image digest"),
        node("gates", "Gates", 640, 110, "errors z-test, p95"),
        node("promote", "Promote", 860, 30, "100% traffic"),
        node("rollback", "Rollback", 860, 190, "automatic"),
      ],
      edges: [edge("commit", "ci"), edge("ci", "canary"), edge("canary", "gates"), edge("gates", "promote"), edge("gates", "rollback")],
      steps: [
        step("commit ci", "commit-ci", "Every merge builds one immutable container image and runs the tests."),
        step("ci canary", "ci-canary", "The image goes to a canary taking a small share of real traffic."),
        step("canary gates", "canary-gates", "Gates compare the canary with the concurrent baseline: error rate z = 1.99 > 1.645 fails."),
        step("rollback", "gates-rollback", "Any failed gate triggers automatic rollback before most users see the regression."),
        step("promote", "gates-promote", "Had both gates passed, traffic would shift to 100% in steps."),
      ],
    },
    practice: [
      {
        id: "w12-cicd-recall-1",
        type: "recall",
        prompt: "Why deploy by image digest rather than by tag like 'latest'?",
        answer: "Tags are mutable; a digest pins the exact bytes, so staging, canary and production run identical code and rollbacks are exact.",
        rubric: ["Tags mutable", "Digest immutable", "Reproducible rollbacks"],
      },
      {
        id: "w12-iam-recall-1",
        type: "recall",
        prompt: "What does least privilege mean for a model-serving service?",
        answer: "Its role can read only the model artifact bucket and the feature store it needs, write only its logs and metrics, and nothing else; no wildcard permissions, no long-lived keys.",
        rubric: ["Scoped read access", "No wildcards", "Short-lived credentials"],
      },
    ],
    references: [
      { title: "Google SRE workbook: canarying releases", url: "https://sre.google/workbook/canarying-releases/", versionSensitive: false },
      { title: "Argo Rollouts documentation", url: "https://argo-rollouts.readthedocs.io/en/stable/", versionSensitive: true },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w12-d02-feature-stores-serving",
    slug: "feature-stores-serving",
    title: "Feature stores, point-in-time joins and serving",
    domain: "mlops",
    roles: ["ml-engineer", "data-engineer", "data-scientist"],
    difficulty: "advanced",
    minutes: 80,
    prerequisites: ["w07-d01-splits-and-leakage", "w11-d01-etl-elt-cdc"],
    objectives: [
      "Build training data with an as-of (point-in-time) join",
      "Explain training-serving skew and how feature stores reduce it",
      "Choose online versus batch serving for a model",
    ],
    summary:
      "Training rows must use feature values as they were when each label's prediction would have been made. A point-in-time join picks the latest feature value at or before the label time; joining the latest value overall leaks the future.",
    eli5: {
      analogy:
        "Grading a weather forecaster. To be fair, you only let them see the sky as it looked before they made each forecast, not the photos taken afterwards.",
      steps: [
        "For each moment you want to predict, write down the time.",
        "Look up the feature history for that user.",
        "Pick the newest value recorded at or before that time.",
        "Never use values recorded afterwards, even if they are 'more current'.",
      ],
      analogyLimit:
        "Real feature pipelines also have delays: a value with timestamp 9:00 might only land in the store at 9:30. A strict point-in-time join uses when the value became available, not just when it describes.",
    },
    senior: {
      definition:
        "A point-in-time (as-of) join attaches to each label row (entity, t) the feature value with the greatest timestamp <= t (optionally minus an availability delay). Feature stores keep an offline history for training and an online low-latency copy for serving, computed by the same definitions.",
      invariants: [
        "No training feature has a timestamp after its label's prediction time.",
        "Online and offline features come from one definition, so values match at serving time.",
        "Each feature carries an event timestamp and, ideally, an ingestion timestamp.",
      ],
      mechanism: [
        "For each label row, filter the entity's history to timestamps <= t and take the latest.",
        "The naive join takes each user's latest value overall: it uses data from after the label time for every row here.",
        "Feast, Tecton and warehouse ASOF JOIN syntax implement this efficiently with sorted merges.",
        "Serving: batch predictions write scores to a table on a schedule; online serving computes or fetches features per request within a latency budget.",
      ],
      complexity: "Sort-merge as-of join: O((L + F) log(L + F)); with a per-entity index, O(log F) per label lookup.",
      tradeoffs: [
        { option: "Batch scoring", choose: "Daily decisions (churn lists, recommendations emails).", cost: "Scores are stale between runs." },
        { option: "Online serving with a feature store", choose: "Per-request decisions (fraud, ranking).", cost: "Latency budgets, online store cost and freshness pipelines." },
        { option: "On-demand features computed at request time", choose: "Features that depend on the request itself.", cost: "Must be reimplemented identically for training data." },
      ],
      failureModes: [
        "Joining the latest feature value and leaking the future into training.",
        "Training-serving skew from reimplementing a feature differently online.",
        "Ignoring ingestion delay, so training sees values that were not yet available.",
        "Timezone mismatches between label and feature timestamps.",
      ],
      production:
        "Most offline-online performance gaps trace to skew or leakage in features. Log the exact feature vector used for every online prediction, and compare its distribution with training data.",
      interviewAnswer:
        "Training rows must use features as of each prediction time, so I use point-in-time joins: for each label, the latest feature value at or before that time, adjusted for ingestion delay. A feature store gives one definition with an offline history for training and an online store for serving, which prevents training-serving skew. I log served features to verify parity.",
    },
    implementation: {
      problem: "Attach a feature to label rows with a point-in-time join and compare it with a leaky latest-value join.",
      input: "labels: (u1, t=10, 0), (u1, t=20, 1), (u2, t=15, 0); feature sessions_7d history: u1 at 5:12, 12:8, 18:3, 25:0; u2 at 10:6, 16:9",
      python: {
        code: code`
          LABELS = [("u1", 10, 0), ("u1", 20, 1), ("u2", 15, 0)]
          FEATURES = {"u1": [(5, 12), (12, 8), (18, 3), (25, 0)], "u2": [(10, 6), (16, 9)]}


          def as_of(history: list[tuple[int, int]], t: int) -> int | None:
              eligible = [(ts, v) for ts, v in history if ts <= t]
              return max(eligible)[1] if eligible else None


          def latest(history: list[tuple[int, int]]) -> int:
              return max(history)[1]


          leaks = 0
          for user, t, label in LABELS:
              pit, last = as_of(FEATURES[user], t), latest(FEATURES[user])
              future = max(ts for ts, _ in FEATURES[user]) > t
              leaks += future
              print(f"{user} t={t} label={label} point_in_time={pit} latest={last}{' (uses future data)' if future else ''}")
          print(f"rows where the latest-value join leaks: {leaks}/{len(LABELS)}")
        `,
      },
      r: {
        code: code`
          labels <- data.frame(user = c("u1", "u1", "u2"), t = c(10, 20, 15), label = c(0, 1, 0))
          features <- data.frame(
            user = c("u1", "u1", "u1", "u1", "u2", "u2"),
            ts = c(5, 12, 18, 25, 10, 16),
            value = c(12, 8, 3, 0, 6, 9)
          )

          as_of <- function(user, t) {
            h <- features[features$user == user & features$ts <= t, ]
            if (nrow(h) == 0) NA else h$value[which.max(h$ts)]
          }
          latest <- function(user) {
            h <- features[features$user == user, ]
            h$value[which.max(h$ts)]
          }

          leaks <- 0L
          for (i in seq_len(nrow(labels))) {
            u <- labels$user[i]
            t <- labels$t[i]
            future <- max(features$ts[features$user == u]) > t
            leaks <- leaks + as.integer(future)
            cat(sprintf("%s t=%d label=%d point_in_time=%d latest=%d%s\n", u, as.integer(t), as.integer(labels$label[i]),
                        as.integer(as_of(u, t)), as.integer(latest(u)), if (future) " (uses future data)" else ""))
          }
          cat(sprintf("rows where the latest-value join leaks: %d/%d\n", leaks, nrow(labels)))
        `,
      },
      expectedOutput: code`
        u1 t=10 label=0 point_in_time=12 latest=0 (uses future data)
        u1 t=20 label=1 point_in_time=3 latest=0 (uses future data)
        u2 t=15 label=0 point_in_time=6 latest=9 (uses future data)
        rows where the latest-value join leaks: 3/3
      `,
      tests: {
        python: code`
          def test_no_feature_before_first_observation():
              assert as_of(FEATURES["u1"], 4) is None


          def test_exact_timestamp_is_included():
              assert as_of(FEATURES["u1"], 12) == 8


          def test_point_in_time_never_uses_future_rows():
              for user, t, _ in LABELS:
                  v = as_of(FEATURES[user], t)
                  assert v in [val for ts, val in FEATURES[user] if ts <= t]
        `,
        r: code`
          test_that("no feature exists before the first observation", {
            expect_true(is.na(as_of("u1", 4)))
          })

          test_that("an exact timestamp is included", {
            expect_equal(as_of("u1", 12), 8)
          })
        `,
      },
      eli5Trace: [
        "For u1 at time 10, the newest reading at or before 10 is from time 5: 12 sessions.",
        "For u1 at time 20, it is the reading from time 18: 3 sessions.",
        "For u2 at time 15, it is the reading from time 10: 6 sessions.",
        "The leaky join gives every row the very last reading, taken after the moment being predicted.",
      ],
      complexity: { time: "O(F) per label as written; O(log F) with sorted history", space: "O(L + F)" },
      edgeCases: [
        "A label earlier than any feature gets no value; decide on a default explicitly.",
        "Equal timestamps: a feature recorded at exactly t is included (<=).",
        "Ingestion delay should shift the cutoff to t minus the delay.",
        "Several feature tables need one as-of join each, all with the same cutoff.",
      ],
      incorrect: {
        language: "python",
        code: code`
          training_rows = [(user, t, label, latest(FEATURES[user])) for user, t, label in LABELS]
        `,
        whyWrong: "Every row gets the user's newest value, recorded after the label time, so the model learns from the future and offline metrics are inflated.",
        fix: "Use an as-of join that keeps only feature rows with timestamp <= the label time.",
      },
    },
    flow: {
      title: "Point-in-time correct training data",
      nodes: [
        node("labels", "Label events", 0, 30, "(user, t, label)"),
        node("history", "Feature history", 0, 190, "(user, ts, value)"),
        node("asof", "As-of join", 260, 110, "latest ts <= t"),
        node("train", "Training set", 500, 110, "no future data"),
        node("online", "Online store", 500, 250, "same definition"),
        node("serve", "Serving", 740, 180, "parity checked"),
      ],
      edges: [edge("labels", "asof"), edge("history", "asof"), edge("asof", "train"), edge("history", "online"), edge("online", "serve"), edge("train", "serve")],
      steps: [
        step("labels history", "", "Each label has a prediction time; each feature value has the time it was true."),
        step("asof", "labels-asof history-asof", "For each label, keep only feature rows at or before its time and take the newest."),
        step("train", "asof-train", "The training set never contains information from after a prediction moment."),
        step("online serve", "history-online online-serve", "The online store is filled from the same definitions, so serving sees identically computed values."),
        step("serve", "train-serve", "Logging served features lets you check parity with training data."),
      ],
    },
    practice: [
      {
        id: "w12-fs-recall-1",
        type: "recall",
        prompt: "What is training-serving skew, and give two causes.",
        answer: "A difference between the features or data a model sees in training and in serving. Causes: separate implementations of the same feature, different data freshness, preprocessing differences, or leakage in training data.",
        rubric: ["Definition", "Two concrete causes"],
      },
      {
        id: "w12-fs-design-1",
        type: "design",
        prompt: "A fraud model needs 'number of transactions in the last 10 minutes' at request time with 50 ms p99. Design the feature pipeline.",
        answer: "Stream transactions into a windowed aggregation (Flink) that updates an online store (Redis) keyed by card; serving reads it in a few ms. The same windowed definition writes to the offline store with event timestamps for point-in-time training joins.",
        rubric: ["Streaming aggregation", "Low-latency online store", "Same definition offline", "Point-in-time training"],
      },
    ],
    references: [
      { title: "Feast documentation: point-in-time joins", versionSensitive: true },
      { title: "Rules of Machine Learning (Zinkevich), Google developers", url: "https://developers.google.com/machine-learning/guides/rules-of-ml", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w12-d03-drift-observability",
    slug: "drift-observability",
    title: "Drift detection and ML observability",
    domain: "mlops",
    roles: ["ml-engineer", "data-scientist", "genai-engineer"],
    difficulty: "intermediate",
    minutes: 70,
    prerequisites: ["w12-d02-feature-stores-serving", "w06-d01-data-quality-eda"],
    objectives: [
      "Compute the population stability index between two distributions",
      "Distinguish data drift, concept drift and pipeline bugs",
      "Design monitoring that pages for real problems, not noise",
    ],
    summary:
      "Models degrade when inputs or the input-output relationship change. Distribution metrics like PSI flag input drift cheaply, but the decision to retrain should rest on performance and business metrics once labels arrive.",
    eli5: {
      analogy:
        "A shopkeeper who stocks shelves based on last year's customers. If suddenly many more students shop there, the mix of customers changed (data drift). If students start wanting different things than before, what customers want changed (concept drift).",
      steps: [
        "Split a feature into buckets and record what share of customers fell in each bucket during training.",
        "Measure the same shares this week.",
        "Add up how different each bucket's share is, weighted by how surprising the change is.",
        "Small totals mean stable; large totals mean investigate.",
      ],
      analogyLimit:
        "A changed customer mix does not always hurt sales, and an unchanged mix does not guarantee customers still want the same things. Drift scores are smoke alarms, not proof of fire.",
    },
    senior: {
      definition:
        "PSI = sum over bins of (a_i - e_i) ln(a_i / e_i), where e_i and a_i are expected (baseline) and actual bin proportions. Common rule-of-thumb thresholds are below 0.1 stable, 0.1 to 0.25 moderate and above 0.25 major shift; these are conventions, not statistical tests.",
      invariants: [
        "Bins are fixed from the baseline (usually quantiles) and reused for every comparison.",
        "Zero proportions are clipped to a small epsilon so the log is defined.",
        "PSI is symmetric in the sense that swapping baseline and current gives the same value.",
      ],
      mechanism: [
        "Feature A's shares barely move, so each bin's term is tiny and PSI is near zero.",
        "Feature B shifts mass toward low bins; the terms for the first and last bins dominate and PSI exceeds 0.25.",
        "Data drift (input distribution) is visible immediately; concept drift (relationship to the label) needs labels, often delayed.",
        "Observability adds prediction distributions, feature null rates, latency and business KPIs, sliced by segment.",
      ],
      complexity: "O(bins) per feature per window after binning, which is O(n) per window.",
      tradeoffs: [
        { option: "PSI or Jensen-Shannon on binned features", choose: "Cheap, explainable drift dashboards.", cost: "Bin choice matters; thresholds are heuristics." },
        { option: "Kolmogorov-Smirnov tests", choose: "Continuous features with moderate sample sizes.", cost: "With huge samples, every tiny shift is 'significant'." },
        { option: "Performance monitoring with delayed labels", choose: "The ground truth for retraining decisions.", cost: "Labels can arrive weeks late." },
      ],
      failureModes: [
        "Paging on PSI alone for every feature, causing alert fatigue.",
        "Recomputing bins on current data, which hides the drift.",
        "Treating a pipeline bug (unit change, nulls) as natural drift and retraining on broken data.",
        "Monitoring only global metrics while one segment collapses.",
      ],
      production:
        "Page on business and performance metrics; ticket on input drift. Pair every drift alert with a quick check for pipeline changes, and keep a retraining playbook with validation gates.",
      interviewAnswer:
        "I monitor input drift per feature with PSI against fixed training bins, prediction distribution shift, data quality signals, and, once labels arrive, model performance by segment. PSI thresholds of 0.1 and 0.25 are rules of thumb, so drift opens a ticket while performance and business metrics page. Before retraining I rule out pipeline bugs.",
    },
    implementation: {
      problem: "Compute PSI for two features against their training baselines and label each as stable, moderate or major.",
      input: "five fixed bins; baseline counts 100 200 400 200 100 for both; current A: 90 210 390 210 100; current B: 300 300 250 100 50",
      python: {
        code: code`
          from math import log

          BASELINE = [100, 200, 400, 200, 100]
          CURRENT = {"feature_a": [90, 210, 390, 210, 100], "feature_b": [300, 300, 250, 100, 50]}


          def psi(expected: list[int], actual: list[int], eps: float = 1e-6) -> float:
              e_tot, a_tot = sum(expected), sum(actual)
              total = 0.0
              for e, a in zip(expected, actual):
                  pe, pa = max(e / e_tot, eps), max(a / a_tot, eps)
                  total += (pa - pe) * log(pa / pe)
              return total


          def status(value: float) -> str:
              return "stable" if value < 0.1 else "moderate" if value < 0.25 else "major"


          for name, counts in CURRENT.items():
              v = psi(BASELINE, counts)
              print(f"{name}: psi={v:.4f} {status(v)}")
        `,
      },
      r: {
        code: code`
          baseline <- c(100, 200, 400, 200, 100)
          current <- list(feature_a = c(90, 210, 390, 210, 100), feature_b = c(300, 300, 250, 100, 50))

          psi <- function(expected, actual, eps = 1e-6) {
            pe <- pmax(expected / sum(expected), eps)
            pa <- pmax(actual / sum(actual), eps)
            sum((pa - pe) * log(pa / pe))
          }

          status <- function(v) if (v < 0.1) "stable" else if (v < 0.25) "moderate" else "major"

          for (name in names(current)) {
            v <- psi(baseline, current[[name]])
            cat(sprintf("%s: psi=%.4f %s\n", name, v, status(v)))
          }
        `,
      },
      expectedOutput: code`
        feature_a: psi=0.0023 stable
        feature_b: psi=0.4347 major
      `,
      tests: {
        python: code`
          def test_identical_distributions_have_zero_psi():
              assert psi(BASELINE, BASELINE) == 0


          def test_psi_is_symmetric():
              assert abs(psi(BASELINE, CURRENT["feature_b"]) - psi(CURRENT["feature_b"], BASELINE)) < 1e-12


          def test_empty_bins_do_not_crash():
              assert psi([10, 0, 10], [5, 5, 10]) > 0
        `,
        r: code`
          test_that("identical distributions have zero PSI", {
            expect_equal(psi(baseline, baseline), 0)
          })

          test_that("PSI is symmetric", {
            expect_equal(psi(baseline, current$feature_b), psi(current$feature_b, baseline))
          })
        `,
      },
      eli5Trace: [
        "Feature A: each bucket's share moves by about one percentage point, so the total difference is tiny.",
        "Feature B: the lowest bucket triples from 10% to 30% and the highest halves.",
        "Big, surprising moves in shares add up fast, so B lands far above 0.25.",
        "A is stable; B needs a look: is it a real change in customers or a broken pipeline?",
      ],
      complexity: { time: "O(bins)", space: "O(1)" },
      edgeCases: [
        "A bin empty in one window would make the log infinite without the epsilon clip.",
        "Small samples make PSI noisy; require a minimum count per window.",
        "Categorical features use categories as bins plus an 'other' bucket for new values.",
        "Thresholds are conventions; calibrate them on your own history of false alarms.",
      ],
      incorrect: {
        language: "python",
        code: code`
          bins = quantile_bins(current_values)
          psi(histogram(baseline_values, bins), histogram(current_values, bins))
        `,
        whyWrong: "Recomputing bins from current data makes every current bin roughly equal-sized, which hides the very shift you want to detect.",
        fix: "Freeze bin edges from the training baseline and reuse them for every comparison.",
      },
    },
    flow: {
      title: "From drift signal to action",
      nodes: [
        node("baseline", "Training baseline", 0, 30, "fixed bins"),
        node("live", "Live window", 0, 190, "this week"),
        node("psi", "PSI per feature", 240, 110, "A 0.00, B high"),
        node("check", "Pipeline check", 480, 110, "units, nulls, schema"),
        node("perf", "Performance + KPIs", 720, 30, "when labels arrive"),
        node("action", "Act", 720, 190, "fix, retrain or ignore"),
      ],
      edges: [edge("baseline", "psi"), edge("live", "psi"), edge("psi", "check"), edge("check", "perf"), edge("check", "action"), edge("perf", "action")],
      steps: [
        step("baseline live psi", "baseline-psi live-psi", "Compare this week's bin shares with the frozen training bins."),
        step("psi", "", "Feature A is stable; feature B shifted sharply toward low values."),
        step("check", "psi-check", "First rule out pipeline bugs: a unit change or new nulls look exactly like drift."),
        step("perf", "check-perf", "Then check model performance and business metrics as labels arrive."),
        step("action", "check-action perf-action", "Fix the pipeline, retrain with validation gates, or document an acceptable shift."),
      ],
    },
    practice: [
      {
        id: "w12-drift-recall-1",
        type: "recall",
        prompt: "Distinguish data drift from concept drift with an example of each.",
        answer: "Data drift: the input distribution changes (more mobile users). Concept drift: the input-label relationship changes (the same browsing behavior now predicts churn differently after a price change).",
        rubric: ["Data drift example", "Concept drift example"],
      },
      {
        id: "w12-drift-case-1",
        type: "case",
        prompt: "PSI alerts fire on 40 features every Monday. What would you change?",
        answer: "Compare against the same weekday baseline (seasonality), alert on a few key features and prediction drift, route drift to tickets instead of pages, and page only on performance or business metric breaches.",
        rubric: ["Seasonality-aware baselines", "Fewer, prioritized alerts", "Page on outcomes"],
      },
    ],
    references: [
      { title: "Google Cloud documentation: Vertex AI model monitoring overview", versionSensitive: true },
      { title: "Evidently AI documentation: data drift", url: "https://docs.evidentlyai.com/", versionSensitive: true },
    ],
    lastReviewed: REVIEWED,
  }),
];

export const week = defineWeek({
  number: 12,
  slug: "cloud-devops-mlops",
  title: "Cloud, DevOps and MLOps",
  track: "platform",
  domains: ["mlops"],
  summary:
    "IAM, networking, containers, Kubernetes, CI/CD and infrastructure as code, then the ML-specific layer: feature stores, serving, drift and observability.",
  outcomes: [
    "Ship changes safely with canaries and automated rollback",
    "Build point-in-time correct training data and avoid training-serving skew",
    "Monitor models with drift, performance and business signals",
  ],
  roles: ["ml-engineer", "sde", "data-engineer", "genai-engineer"],
  days: [
    {
      id: "w12-d01",
      day: 1,
      kind: "concept-map",
      title: "Cloud, containers and CI/CD",
      summary: "From commit to production with gates you define in advance.",
      minutes: 80,
      goals: ["Gate a canary with a statistical test", "Explain least privilege"],
      tasks: [
        { label: "Concept map and ELI5", minutes: 15 },
        { label: "Run the canary gate example", minutes: 30 },
        { label: "IAM and image digest prompts", minutes: 20 },
        { label: "Sketch your own deploy pipeline", minutes: 15 },
      ],
      topicIds: ["w12-d01-cicd-canary"],
    },
    {
      id: "w12-d02",
      day: 2,
      kind: "theory-lab",
      title: "Feature stores and serving",
      summary: "Point-in-time joins, skew and serving modes.",
      minutes: 85,
      goals: ["Write an as-of join in both languages", "Pick batch or online serving"],
      tasks: [
        { label: "Step through the diagram", minutes: 15 },
        { label: "Run the as-of join example", minutes: 30 },
        { label: "Fraud feature design prompt", minutes: 25 },
        { label: "Skew recall prompt", minutes: 15 },
      ],
      topicIds: ["w12-d02-feature-stores-serving"],
    },
    {
      id: "w12-d03",
      day: 3,
      kind: "implementation",
      title: "Drift and observability",
      summary: "PSI, drift types and alerting that respects on-call humans.",
      minutes: 80,
      goals: ["Compute PSI", "Design an alert policy"],
      tasks: [
        { label: "Read the shopkeeper analogy and its limit", minutes: 10 },
        { label: "Run PSI and its tests", minutes: 25 },
        { label: "Monday alerts case", minutes: 25 },
        { label: "Drift types recall prompt", minutes: 20 },
      ],
      topicIds: ["w12-d03-drift-observability"],
    },
    {
      id: "w12-d04",
      day: 4,
      kind: "applied-practice",
      title: "MLOps drills",
      summary: "Deployment, feature and monitoring drills, plus a system design prompt for an ML service.",
      minutes: 85,
      goals: ["Design an ML serving system end to end"],
      tasks: [
        { label: "MLOps drills", minutes: 35 },
        { label: "ML system design prompt", minutes: 35 },
        { label: "Log weak spots", minutes: 15 },
      ],
      topicIds: ["w12-d01-cicd-canary", "w12-d02-feature-stores-serving", "w12-d03-drift-observability"],
    },
    {
      id: "w12-d05",
      day: 5,
      kind: "production-lens",
      title: "The model that decayed after a pricing change",
      summary: "Concept drift, delayed labels and a retraining decision.",
      minutes: 60,
      goals: ["Decide between retraining, recalibrating and rolling back"],
      tasks: [
        { label: "Read the scenario", minutes: 10 },
        { label: "Answer the case questions", minutes: 35 },
        { label: "Compare against the rubric", minutes: 15 },
      ],
      topicIds: ["w12-d03-drift-observability", "w12-d02-feature-stores-serving"],
      productionCase: {
        title: "Conversion predictions are off by 40% after a price increase",
        scenario:
          "A conversion model drives ad bidding. After a 15% price increase, predicted conversion stays flat while actual conversion drops; spend efficiency falls. Input PSI is low on every feature except price, which the model barely uses.",
        constraints: [
          "Conversion labels arrive up to 7 days after a click.",
          "Bidding decisions happen in real time.",
          "Retraining takes a day and needs at least two weeks of post-change data for stability.",
        ],
        questions: [
          "Is this data drift, concept drift or a pipeline bug, and how do you tell?",
          "What can you do this week before enough labels exist?",
          "How should the retraining be set up?",
          "What monitoring would have caught this sooner?",
        ],
        rubric: [
          "Identifies concept drift (the price-to-conversion relationship changed) after ruling out pipeline issues",
          "Short-term recalibration on recent labels or a temporary bid adjustment with guardrails",
          "Retraining with post-change data, time-based validation and a canary or shadow comparison",
          "Monitoring calibration (predicted versus observed rates by segment) and business KPIs, not only input PSI",
        ],
        pitfalls: ["Waiting for input drift alerts that will never fire", "Retraining immediately on two days of noisy labels"],
      },
    },
    {
      id: "w12-d06",
      day: 6,
      kind: "interview-simulation",
      title: "ML system design mock",
      summary: "Design and operate a production ML service under time pressure.",
      minutes: 60,
      goals: ["Cover data, training, serving, monitoring and rollout"],
      tasks: [
        { label: "Timed ML system design", minutes: 45 },
        { label: "Self-score with the rubric", minutes: 15 },
      ],
      topicIds: ["w12-d01-cicd-canary", "w12-d02-feature-stores-serving", "w12-d03-drift-observability"],
    },
    {
      id: "w12-d07",
      day: 7,
      kind: "review",
      title: "Platform track review",
      summary: "Spaced review across system design, data engineering and MLOps.",
      minutes: 50,
      goals: ["Clear due reviews", "Write a one-page production readiness checklist"],
      tasks: [
        { label: "Due reviews", minutes: 25 },
        { label: "Readiness checklist", minutes: 25 },
      ],
      topicIds: ["w12-d01-cicd-canary", "w12-d02-feature-stores-serving", "w12-d03-drift-observability", "w11-d04-data-quality-orchestration"],
    },
  ],
});
