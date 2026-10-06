import { REVIEWED, code, defineTopic, defineWeek, edge, node, step } from "../helpers";

export const topics = [
  defineTopic({
    id: "w08-d01-clustering-pca",
    slug: "clustering-pca",
    title: "Clustering and dimensionality reduction",
    domain: "advanced-ml",
    roles: ["data-scientist", "ml-engineer", "genai-engineer"],
    difficulty: "intermediate",
    minutes: 80,
    prerequisites: ["w07-d01-splits-and-leakage"],
    objectives: [
      "Run Lloyd's k-means and explain why initialization matters",
      "Compute principal components of a 2D dataset from its covariance matrix",
      "Contrast PCA with t-SNE and UMAP for visualization",
    ],
    summary:
      "Clustering groups similar points without labels; k-means alternates between assigning points to the nearest center and moving centers to the mean. PCA finds the directions of greatest variance, which compresses data and reveals structure.",
    eli5: {
      analogy:
        "Placing three ice cream stands on a beach. Each person walks to the nearest stand; then each stand moves to the middle of its customers. Repeat until nobody switches stands.",
      steps: [
        "Put three stands somewhere to start.",
        "Every person picks the closest stand.",
        "Each stand moves to the average spot of its customers.",
        "Repeat until the stands stop moving.",
        "For PCA, find the direction along the beach where people are most spread out; that one line describes most of where they are.",
      ],
      analogyLimit:
        "Stands that start in bad places can get stuck serving odd groups, so real k-means runs many random starts. And clusters only exist if the data has them: k-means will happily cut a uniform crowd into k pieces.",
    },
    senior: {
      definition:
        "k-means minimizes within-cluster sum of squared distances. Lloyd's algorithm alternates assignment (nearest centroid) and update (centroid = mean of assigned points), monotonically decreasing the objective. PCA finds orthonormal directions maximizing variance: the eigenvectors of the covariance matrix, ordered by eigenvalue.",
      invariants: [
        "Each Lloyd iteration never increases the objective, so the algorithm terminates at a local optimum.",
        "Features must be on comparable scales; k-means and PCA are both scale-sensitive.",
        "Eigenvalues of the covariance matrix are the variances along each principal component; their sum is the total variance.",
      ],
      mechanism: [
        "Initialization here is deterministic (one point from each region) so both languages match; production uses k-means++ with several restarts.",
        "For a 2x2 covariance [[a, b], [b, d]], eigenvalues are (a + d) / 2 plus or minus sqrt(((a - d) / 2)^2 + b^2).",
        "Explained variance ratio = lambda_1 / (lambda_1 + lambda_2) says how much one dimension preserves.",
        "t-SNE and UMAP preserve local neighborhoods for visualization; distances between far clusters in their plots are not meaningful.",
      ],
      complexity: "k-means: O(n k d) per iteration. PCA via covariance: O(n d^2 + d^3); via randomized SVD for large d.",
      tradeoffs: [
        { option: "k-means", choose: "Roughly spherical, similar-sized clusters at scale.", cost: "Needs k; fails on elongated or nested shapes." },
        { option: "DBSCAN or HDBSCAN", choose: "Arbitrary shapes and noise points.", cost: "Density parameters; struggles with varying density." },
        { option: "PCA versus UMAP", choose: "PCA for compression and linear structure; UMAP for visual exploration.", cost: "PCA misses nonlinear structure; UMAP distorts global distances and is stochastic." },
      ],
      failureModes: [
        "Clustering unscaled features so one large-unit feature dominates.",
        "Choosing k by eye from a single run.",
        "Interpreting t-SNE cluster sizes or gaps as real distances.",
        "Applying PCA fitted on all data before a train/test split (leakage).",
      ],
      production:
        "Clusters seed customer segments and anomaly baselines; PCA compresses embeddings and speeds up nearest-neighbor search. Re-fit on a schedule and track cluster stability, because segments drift.",
      interviewAnswer:
        "k-means alternates assigning points to the nearest centroid and recomputing centroids as means; it converges to a local optimum, so I use k-means++ and several restarts and pick k with the elbow or silhouette plus business sense. PCA takes eigenvectors of the covariance matrix; eigenvalues tell me how much variance each component keeps. For visualization I would use UMAP but not trust distances between clusters.",
    },
    implementation: {
      problem: "Cluster nine 2D points into three groups with Lloyd's k-means, then compute PCA eigenvalues and explained variance.",
      input: "points (1,1) (1.5,2) (2,1.2) (8,8) (8.5,9) (9,8.2) (1,8) (1.5,9) (2,8.5); initial centers: points 1, 4 and 7",
      python: {
        code: code`
          from math import sqrt

          POINTS = [(1, 1), (1.5, 2), (2, 1.2), (8, 8), (8.5, 9), (9, 8.2), (1, 8), (1.5, 9), (2, 8.5)]


          def kmeans(points: list[tuple[float, float]], centers: list[tuple[float, float]], max_iter: int = 100):
              for it in range(1, max_iter + 1):
                  labels = [min(range(len(centers)), key=lambda c: (p[0] - centers[c][0]) ** 2 + (p[1] - centers[c][1]) ** 2) for p in points]
                  new = []
                  for c in range(len(centers)):
                      members = [p for p, lab in zip(points, labels) if lab == c]
                      new.append((sum(m[0] for m in members) / len(members), sum(m[1] for m in members) / len(members)))
                  if new == centers:
                      return labels, centers, it
                  centers = new
              return labels, centers, max_iter


          def pca_2d(points: list[tuple[float, float]]) -> tuple[float, float]:
              n = len(points)
              mx = sum(p[0] for p in points) / n
              my = sum(p[1] for p in points) / n
              a = sum((p[0] - mx) ** 2 for p in points) / (n - 1)
              d = sum((p[1] - my) ** 2 for p in points) / (n - 1)
              b = sum((p[0] - mx) * (p[1] - my) for p in points) / (n - 1)
              mid, rad = (a + d) / 2, sqrt(((a - d) / 2) ** 2 + b**2)
              return mid + rad, mid - rad


          labels, centers, iters = kmeans(POINTS, [POINTS[0], POINTS[3], POINTS[6]])
          print(f"k-means converged after {iters} iterations")
          for c, (cx, cy) in enumerate(centers):
              print(f"cluster {c}: center=({cx:.2f}, {cy:.2f}) size={labels.count(c)}")
          l1, l2 = pca_2d(POINTS)
          print(f"pca eigenvalues: {l1:.4f} {l2:.4f} explained by PC1: {100 * l1 / (l1 + l2):.1f}%")
        `,
      },
      r: {
        code: code`
          pts <- matrix(c(1, 1, 1.5, 2, 2, 1.2, 8, 8, 8.5, 9, 9, 8.2, 1, 8, 1.5, 9, 2, 8.5), ncol = 2, byrow = TRUE)

          kmeans_lloyd <- function(x, centers, max_iter = 100) {
            for (it in seq_len(max_iter)) {
              d <- sapply(seq_len(nrow(centers)), function(c) rowSums((x - matrix(centers[c, ], nrow(x), 2, byrow = TRUE))^2))
              labels <- max.col(-d, ties.method = "first")
              new <- t(sapply(seq_len(nrow(centers)), function(c) colMeans(x[labels == c, , drop = FALSE])))
              if (all(new == centers)) return(list(labels = labels, centers = centers, iter = it))
              centers <- new
            }
            list(labels = labels, centers = centers, iter = max_iter)
          }

          km <- kmeans_lloyd(pts, pts[c(1, 4, 7), ])
          cat(sprintf("k-means converged after %d iterations\n", km$iter))
          for (c in 1:3) {
            cat(sprintf("cluster %d: center=(%.2f, %.2f) size=%d\n", c - 1, km$centers[c, 1], km$centers[c, 2], sum(km$labels == c)))
          }
          ev <- eigen(cov(pts), symmetric = TRUE)$values
          cat(sprintf("pca eigenvalues: %.4f %.4f explained by PC1: %.1f%%\n", ev[1], ev[2], 100 * ev[1] / sum(ev)))
        `,
      },
      expectedOutput: code`
        k-means converged after 2 iterations
        cluster 0: center=(1.50, 1.40) size=3
        cluster 1: center=(8.50, 8.40) size=3
        cluster 2: center=(1.50, 8.50) size=3
        pca eigenvalues: 18.6283 6.4392 explained by PC1: 74.3%
      `,
      tests: {
        python: code`
          def test_each_point_is_closest_to_its_center():
              for p, lab in zip(POINTS, labels):
                  dists = [(p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 for c in centers]
                  assert dists[lab] == min(dists)


          def test_eigenvalues_sum_to_total_variance():
              l1, l2 = pca_2d(POINTS)
              n = len(POINTS)
              var_x = sum((p[0] - sum(q[0] for q in POINTS) / n) ** 2 for p in POINTS) / (n - 1)
              var_y = sum((p[1] - sum(q[1] for q in POINTS) / n) ** 2 for p in POINTS) / (n - 1)
              assert abs((l1 + l2) - (var_x + var_y)) < 1e-9
        `,
        r: code`
          test_that("built-in Lloyd k-means agrees", {
            ref <- kmeans(pts, centers = pts[c(1, 4, 7), ], algorithm = "Lloyd")
            expect_equal(unname(ref$centers), unname(km$centers))
          })

          test_that("eigenvalues match prcomp", {
            expect_equal(prcomp(pts)$sdev^2, ev)
          })
        `,
      },
      eli5Trace: [
        "Stands start at (1,1), (8,8) and (1,8), one in each crowd.",
        "Everyone walks to the nearest stand: three people per stand.",
        "Each stand moves to the middle of its three customers; nobody wants to switch after that, so it stops.",
        "The people are spread mostly along one direction, so a single line (PC1) captures about three quarters of the spread.",
      ],
      complexity: { time: "O(n k d) per iteration; O(n d^2) for the covariance", space: "O(n + k d)" },
      edgeCases: [
        "An empty cluster makes its mean undefined; production code re-seeds it.",
        "Ties in distance go to the lowest cluster index in both languages.",
        "Identical eigenvalues make principal directions arbitrary.",
        "Unscaled features let one axis dominate both methods.",
      ],
      incorrect: {
        language: "python",
        code: code`
          centers = POINTS[:3]
          labels, centers, iters = kmeans(POINTS, centers)
        `,
        whyWrong: "All three starting centers sit in the same bottom-left crowd, so Lloyd's algorithm can converge to a poor local optimum that splits one real cluster and merges others.",
        fix: "Use k-means++ seeding (spread-out starts) and several restarts, keeping the lowest objective.",
      },
    },
    flow: {
      title: "Lloyd's algorithm",
      nodes: [
        node("init", "Initialize centers", 0, 110, "one per region"),
        node("assign", "Assign", 240, 110, "nearest center"),
        node("update", "Update", 480, 110, "center = mean"),
        node("check", "Moved?", 720, 110, "compare centers"),
        node("done", "Converged", 940, 110, "3 clusters of 3"),
      ],
      edges: [edge("init", "assign"), edge("assign", "update"), edge("update", "check"), edge("check", "assign", "yes"), edge("check", "done", "no")],
      steps: [
        step("init", "", "Pick starting centers. Here one point from each region, so the result is deterministic."),
        step("init assign", "init-assign", "Each point joins its nearest center."),
        step("assign update", "assign-update", "Each center moves to the mean of its points, which lowers the total squared distance."),
        step("update check assign", "update-check check-assign", "Centers moved, so assign again."),
        step("check done", "check-done", "Centers stop moving: Lloyd's algorithm has reached a local optimum."),
      ],
    },
    practice: [
      {
        id: "w08-cluster-recall-1",
        type: "recall",
        prompt: "How do you choose k for k-means?",
        answer: "Plot the objective against k (elbow), compute silhouette scores, check stability across restarts and samples, and confirm the clusters are actionable for the business question.",
        rubric: ["Elbow or silhouette", "Stability", "Business usefulness"],
      },
      {
        id: "w08-pca-recall-1",
        type: "recall",
        prompt: "What do PCA eigenvalues and eigenvectors represent?",
        answer: "Eigenvectors are orthogonal directions of maximum variance; eigenvalues are the variance along each direction. Their ratios give explained variance.",
        rubric: ["Directions of variance", "Variance amounts", "Explained variance ratio"],
      },
    ],
    references: [
      { title: "scikit-learn documentation: clustering", url: "https://scikit-learn.org/stable/modules/clustering.html", versionSensitive: true },
      { title: "UMAP documentation: how to use UMAP", url: "https://umap-learn.readthedocs.io/en/latest/basic_usage.html", versionSensitive: true },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w08-d02-anomaly-forecasting",
    slug: "anomaly-forecasting",
    title: "Anomaly detection and forecasting",
    domain: "advanced-ml",
    roles: ["data-scientist", "ml-engineer", "data-engineer"],
    difficulty: "intermediate",
    minutes: 75,
    prerequisites: ["w06-d01-data-quality-eda"],
    objectives: [
      "Flag anomalies with a robust z-score built on the median and MAD",
      "Forecast with simple exponential smoothing and compare against a naive baseline",
      "Explain why forecasts are evaluated on rolling one-step-ahead errors",
    ],
    summary:
      "Robust statistics flag unusual values without letting the outlier distort the baseline. Exponential smoothing forecasts by blending each new observation with the previous level, and every forecast should beat the naive 'tomorrow equals today' baseline.",
    eli5: {
      analogy:
        "A thermostat that remembers the usual temperature. Each new reading nudges its memory halfway toward the new value. A reading wildly different from the usual is a fire alarm, but one weird reading should not change what 'usual' means.",
      steps: [
        "Find the typical value with the median, which ignores one crazy reading.",
        "Measure the typical wobble with the median distance from it.",
        "Flag readings more than about 3.5 wobbles away.",
        "To forecast, keep a running level: new level = half the new reading plus half the old level.",
        "Compare its errors with simply guessing yesterday's value.",
      ],
      analogyLimit:
        "A thermostat assumes the room has one usual temperature. Real series have trends, weekly cycles and holidays, which need seasonal models such as Holt-Winters, ETS or Prophet-style decompositions.",
    },
    senior: {
      definition:
        "Robust z = (x - median) / (1.4826 * MAD), where MAD is the median absolute deviation; 1.4826 makes it consistent with the standard deviation for normal data. Simple exponential smoothing: level_t = alpha x_t + (1 - alpha) level_(t-1); the forecast for t + 1 is level_t.",
      invariants: [
        "Median and MAD have a 50% breakdown point: one outlier cannot move them far.",
        "SES forecasts are flat; it suits series without trend or seasonality.",
        "Evaluation uses only data available before each forecast (rolling origin).",
      ],
      mechanism: [
        "The 160 spike is about 27 robust standard deviations from the median, so it is flagged; a mean and standard deviation would be inflated by the spike itself.",
        "SES with alpha = 0.5 halves the weight on older observations every step (exponential decay).",
        "MAE of one-step-ahead forecasts compares SES with the naive forecast; the spike hurts both.",
        "R's mad() uses the 1.4826 constant by default, matching the Python formula.",
      ],
      complexity: "Median and MAD: O(n log n) or O(n) with selection. SES: O(n).",
      tradeoffs: [
        { option: "Robust z-score", choose: "Quick univariate alerts on noisy metrics.", cost: "Ignores seasonality; one threshold for all times." },
        { option: "Seasonal decomposition plus residual alerts", choose: "Metrics with daily or weekly cycles.", cost: "Needs enough history and tuning." },
        { option: "Isolation forest", choose: "Multivariate anomalies across many features.", cost: "Harder to explain; needs contamination estimates." },
      ],
      failureModes: [
        "Using mean and standard deviation, letting the anomaly hide itself.",
        "Evaluating forecasts on data the model saw (in-sample error).",
        "Alerting on every anomaly without grouping, causing alert fatigue.",
        "Feeding detected anomalies back into the training baseline without review.",
      ],
      production:
        "Metric monitoring systems compute robust baselines per series and season, suppress duplicate alerts, and route to owners. Forecasts drive capacity, inventory and staffing; always ship them with a baseline comparison and prediction intervals.",
      interviewAnswer:
        "For anomalies I use robust statistics, median and MAD scaled by 1.4826, and flag points beyond about 3.5, so the outlier cannot inflate its own threshold; with seasonality I would first remove the seasonal component. For forecasting I start with naive and exponential smoothing baselines, evaluate with rolling one-step-ahead MAE, and only move to complex models if they beat those.",
    },
    implementation: {
      problem: "Flag anomalies with a robust z-score, then compare exponential smoothing with a naive forecast.",
      input: "daily values 100 102 98 101 99 103 160 100 97 102 101 99 104 100; threshold 3.5; alpha = 0.5",
      python: {
        code: code`
          from statistics import median

          SERIES = [100, 102, 98, 101, 99, 103, 160, 100, 97, 102, 101, 99, 104, 100]


          def robust_z(xs: list[float]) -> list[float]:
              med = median(xs)
              mad = median(abs(x - med) for x in xs) * 1.4826
              return [(x - med) / mad for x in xs]


          def ses_forecasts(xs: list[float], alpha: float) -> list[float]:
              level = xs[0]
              forecasts = []
              for x in xs[1:]:
                  forecasts.append(level)
                  level = alpha * x + (1 - alpha) * level
              return forecasts + [level]


          z = robust_z(SERIES)
          flagged = [(i, x, zi) for i, (x, zi) in enumerate(zip(SERIES, z)) if abs(zi) > 3.5]
          for i, x, zi in flagged:
              print(f"anomaly at day {i}: value={x} robust_z={zi:.2f}")

          f = ses_forecasts(SERIES, 0.5)
          actual = SERIES[1:]
          mae_ses = sum(abs(a - p) for a, p in zip(actual, f[:-1])) / len(actual)
          mae_naive = sum(abs(a - p) for a, p in zip(actual, SERIES[:-1])) / len(actual)
          print(f"one-step MAE: ses={mae_ses:.3f} naive={mae_naive:.3f}")
          print(f"forecast for day {len(SERIES)}: {f[-1]:.3f}")
        `,
      },
      r: {
        code: code`
          series <- c(100, 102, 98, 101, 99, 103, 160, 100, 97, 102, 101, 99, 104, 100)

          robust_z <- function(x) (x - median(x)) / mad(x)

          ses_forecasts <- function(x, alpha) {
            level <- x[1]
            out <- numeric(0)
            for (v in x[-1]) {
              out <- c(out, level)
              level <- alpha * v + (1 - alpha) * level
            }
            c(out, level)
          }

          z <- robust_z(series)
          for (i in which(abs(z) > 3.5)) {
            cat(sprintf("anomaly at day %d: value=%d robust_z=%.2f\n", i - 1, as.integer(series[i]), z[i]))
          }

          f <- ses_forecasts(series, 0.5)
          actual <- series[-1]
          mae_ses <- mean(abs(actual - f[-length(f)]))
          mae_naive <- mean(abs(actual - series[-length(series)]))
          cat(sprintf("one-step MAE: ses=%.3f naive=%.3f\n", mae_ses, mae_naive))
          cat(sprintf("forecast for day %d: %.3f\n", length(series), f[length(f)]))
        `,
      },
      expectedOutput: code`
        anomaly at day 6: value=160 robust_z=26.75
        one-step MAE: ses=10.400 naive=11.692
        forecast for day 14: 101.193
      `,
      tests: {
        python: code`
          def test_only_the_spike_is_flagged():
              assert [i for i, _, _ in flagged] == [6]


          def test_mad_resists_the_outlier():
              z_without = robust_z([x for x in SERIES if x != 160])
              assert max(abs(v) for v in z_without) < 3.5


          def test_ses_with_alpha_one_is_naive():
              f1 = ses_forecasts(SERIES, 1.0)
              assert f1[:-1] == SERIES[:-1]
        `,
        r: code`
          test_that("only the spike is flagged", {
            expect_equal(which(abs(z) > 3.5), 7L)
          })

          test_that("mad() uses the 1.4826 constant", {
            expect_equal(mad(series), median(abs(series - median(series))) * 1.4826)
          })

          test_that("alpha one is the naive forecast", {
            f1 <- ses_forecasts(series, 1)
            expect_equal(f1[-length(f1)], series[-length(series)])
          })
        `,
      },
      eli5Trace: [
        "The usual value (median) is about 100, and the typical wobble is a couple of units.",
        "Day 6 reads 160, dozens of wobbles away: fire alarm.",
        "The smoothed forecast moves halfway toward each new reading, so the spike drags it up for a few days.",
        "Guessing yesterday's value is a hard baseline to beat on a flat, noisy series; the printed errors show how they compare.",
      ],
      complexity: { time: "O(n log n) for medians, O(n) for smoothing", space: "O(n)" },
      edgeCases: [
        "If more than half the values are identical, MAD is 0 and robust z divides by zero.",
        "Days are 0-indexed in both outputs even though R vectors are 1-indexed.",
        "alpha = 1 reduces SES to the naive forecast; alpha near 0 barely reacts.",
        "Trend or seasonality makes flat SES forecasts biased.",
      ],
      incorrect: {
        language: "python",
        code: code`
          from statistics import mean, stdev
          z = [(x - mean(SERIES)) / stdev(SERIES) for x in SERIES]
        `,
        whyWrong: "The spike inflates the mean and standard deviation it is measured against, so its z-score is only about 3.5 and smaller anomalies disappear entirely.",
        fix: "Use median and MAD (robust statistics) for the baseline and scale.",
      },
    },
    flow: {
      title: "Robust baseline, then forecast",
      nodes: [
        node("series", "Series", 0, 110, "14 days"),
        node("median", "Median and MAD", 230, 30, "robust center and scale"),
        node("flag", "Flag |z| > 3.5", 470, 30, "day 6 = 160"),
        node("ses", "Exponential smoothing", 230, 190, "alpha = 0.5"),
        node("eval", "Rolling MAE", 470, 190, "vs naive"),
        node("act", "Alert or plan", 720, 110, "review + forecast"),
      ],
      edges: [edge("series", "median"), edge("median", "flag"), edge("series", "ses"), edge("ses", "eval"), edge("flag", "act"), edge("eval", "act")],
      steps: [
        step("series median", "series-median", "Median and MAD describe the usual level and wobble without being dragged by the spike."),
        step("median flag", "median-flag", "Day 6 sits far beyond 3.5 robust standard deviations, so it is flagged."),
        step("series ses", "series-ses", "Exponential smoothing keeps a level that moves halfway toward each new value."),
        step("ses eval", "ses-eval", "Each forecast is scored only against the next day, compared with the naive forecast."),
        step("flag eval act", "flag-act eval-act", "Anomalies go to a human; forecasts ship with their baseline comparison."),
      ],
    },
    practice: [
      {
        id: "w08-anomaly-case-1",
        type: "case",
        prompt: "Your anomaly alert fires every Monday morning for login volume. What is happening and how do you fix it?",
        answer: "Weekly seasonality: Monday mornings are normally high, but the baseline ignores day of week. Compare against the same weekday and hour (seasonal baseline) or detrend with STL before scoring.",
        rubric: ["Names weekly seasonality", "Seasonal baseline or decomposition"],
      },
      {
        id: "w08-forecast-recall-1",
        type: "recall",
        prompt: "Why must a forecasting model beat the naive and seasonal-naive baselines before you use it?",
        answer: "They are free, robust and often surprisingly accurate. A complex model that cannot beat them adds cost and failure modes without value.",
        rubric: ["Baselines are strong", "Complexity must earn its place"],
      },
    ],
    references: [
      { title: "Forecasting: Principles and Practice, 3rd edition (Hyndman and Athanasopoulos)", url: "https://otexts.com/fpp3/", versionSensitive: false },
      { title: "R documentation: mad()", url: "https://stat.ethz.ch/R-manual/R-devel/library/stats/html/mad.html", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w08-d03-causal-inference",
    slug: "causal-inference",
    title: "Causal inference: DAGs, DiD, matching, IV and DML",
    domain: "advanced-ml",
    roles: ["data-scientist", "ml-engineer"],
    difficulty: "advanced",
    minutes: 90,
    prerequisites: ["w05-d02-hypothesis-testing", "w07-d02-linear-logistic-regression"],
    objectives: [
      "Draw a DAG and name confounders, mediators and colliders",
      "Estimate a difference-in-differences effect and state the parallel trends assumption",
      "Choose between matching, instrumental variables and double machine learning",
    ],
    summary:
      "Correlation is not causation, but some designs let you estimate causal effects from observational data. Difference-in-differences compares changes over time between a treated and a comparison group, removing fixed differences between them.",
    eli5: {
      analogy:
        "Two lemonade stands. One starts playing music in July. Both stands sell more in July because it is hotter. The music's effect is how much more the music stand grew than the other stand grew.",
      steps: [
        "Measure both stands before the music.",
        "Measure both after.",
        "Compute each stand's growth.",
        "The difference between the two growths is the music's effect, because the heat raised both.",
      ],
      analogyLimit:
        "This only works if the two stands would have grown the same amount without music (parallel trends). If the music stand also got a better location in July, the method blames the music for the location's effect.",
    },
    senior: {
      definition:
        "DiD estimates the average treatment effect on the treated as (Y_treated,post - Y_treated,pre) - (Y_control,post - Y_control,pre). Equivalently, it is the interaction coefficient in y = b0 + b1 treated + b2 post + b3 treated x post.",
      invariants: [
        "Parallel trends: absent treatment, the treated group's outcome would have changed like the control group's.",
        "No anticipation and no spillover between groups (SUTVA).",
        "Group composition is stable between periods.",
      ],
      mechanism: [
        "Subtracting pre-period values removes time-invariant differences between groups.",
        "Subtracting the control group's change removes shocks common to both groups (seasonality, macro trends).",
        "The naive post-period comparison (15 versus 10) mixes the effect with a pre-existing gap; the naive before-after change (5) mixes it with the common trend.",
        "Other designs: matching or weighting on observed confounders (backdoor criterion), instrumental variables for unobserved confounding with a valid instrument, and double machine learning, which partials out confounders with flexible models and cross-fitting before estimating the effect.",
      ],
      complexity: "O(n) to compute group means; regression form O(n p^2). Staggered adoption needs modern estimators (for example Callaway and Sant'Anna).",
      tradeoffs: [
        { option: "Difference-in-differences", choose: "A policy hits some groups at a known time and pre-period data exist.", cost: "Relies on parallel trends; staggered timing needs care." },
        { option: "Matching or inverse propensity weighting", choose: "Rich observed confounders and overlap between groups.", cost: "Useless against unobserved confounders." },
        { option: "Instrumental variables", choose: "A variable that shifts treatment but affects the outcome only through it.", cost: "Valid instruments are rare; weak instruments bias results." },
      ],
      failureModes: [
        "Ignoring a pre-period trend difference between groups.",
        "Conditioning on a collider (a variable caused by both treatment and outcome), which creates bias.",
        "Controlling for a mediator and erasing part of the effect you want to measure.",
        "Running two-way fixed effects with staggered treatment and heterogeneous effects, which can produce wrong signs.",
      ],
      production:
        "When you cannot randomize (pricing changes, regional launches, policy changes), DiD and synthetic control are the workhorses. Always plot pre-period trends, run placebo tests on fake treatment dates, and report the assumptions next to the estimate.",
      interviewAnswer:
        "I would draw the DAG first to see confounders. For a regional launch with before and after data, I use difference-in-differences: the treated group's change minus the control group's change, which removes fixed group differences and common shocks. It hinges on parallel trends, so I check pre-period trends and run placebo tests. If confounding is only on observables I would match or weight; if it is unobserved I would look for an instrument or a natural experiment.",
    },
    implementation: {
      problem: "Estimate a launch effect with difference-in-differences and compare it with two naive estimates.",
      input: "treated pre 9 10 11, treated post 14 15 16; control pre 7 8 9, control post 9 10 11",
      python: {
        code: code`
          from statistics import mean

          DATA = {
              ("treated", "pre"): [9, 10, 11],
              ("treated", "post"): [14, 15, 16],
              ("control", "pre"): [7, 8, 9],
              ("control", "post"): [9, 10, 11],
          }

          m = {k: mean(v) for k, v in DATA.items()}
          treated_change = m[("treated", "post")] - m[("treated", "pre")]
          control_change = m[("control", "post")] - m[("control", "pre")]
          did = treated_change - control_change

          print(f"naive post-period gap: {m[('treated', 'post')] - m[('control', 'post')]:.2f}")
          print(f"naive before-after change: {treated_change:.2f}")
          print(f"control change (common trend): {control_change:.2f}")
          print(f"difference-in-differences effect: {did:.2f}")
        `,
      },
      r: {
        code: code`
          d <- data.frame(
            y = c(9, 10, 11, 14, 15, 16, 7, 8, 9, 9, 10, 11),
            treated = rep(c(1, 0), each = 6),
            post = rep(rep(c(0, 1), each = 3), 2)
          )

          cell <- function(tr, po) mean(d$y[d$treated == tr & d$post == po])
          treated_change <- cell(1, 1) - cell(1, 0)
          control_change <- cell(0, 1) - cell(0, 0)
          fit <- lm(y ~ treated * post, data = d)

          cat(sprintf("naive post-period gap: %.2f\n", cell(1, 1) - cell(0, 1)))
          cat(sprintf("naive before-after change: %.2f\n", treated_change))
          cat(sprintf("control change (common trend): %.2f\n", control_change))
          cat(sprintf("difference-in-differences effect: %.2f\n", coef(fit)[["treated:post"]]))
        `,
      },
      expectedOutput: code`
        naive post-period gap: 5.00
        naive before-after change: 5.00
        control change (common trend): 2.00
        difference-in-differences effect: 3.00
      `,
      tests: {
        python: code`
          def test_did_removes_a_constant_group_gap():
              shifted = {k: [v + (100 if k[0] == "treated" else 0) for v in vals] for k, vals in DATA.items()}
              mm = {k: mean(v) for k, v in shifted.items()}
              est = (mm[("treated", "post")] - mm[("treated", "pre")]) - (mm[("control", "post")] - mm[("control", "pre")])
              assert est == did


          def test_no_effect_when_changes_match():
              assert (12 - 10) - (9 - 7) == 0
        `,
        r: code`
          test_that("the regression interaction equals the difference of differences", {
            expect_equal(coef(fit)[["treated:post"]], treated_change - control_change)
          })

          test_that("a constant group gap does not change the estimate", {
            d2 <- d
            d2$y <- d2$y + 100 * d2$treated
            expect_equal(coef(lm(y ~ treated * post, data = d2))[["treated:post"]], coef(fit)[["treated:post"]])
          })
        `,
      },
      eli5Trace: [
        "After launch, treated averages 15 and control 10: a gap of 5, but treated was already 2 ahead before.",
        "Treated grew by 5 from before to after, but control grew by 2 without any launch.",
        "The launch's effect is the extra growth: 5 minus 2 equals 3.",
        "Both naive answers say 5, overstating the effect by mixing in the old gap or the common trend.",
      ],
      complexity: { time: "O(n)", space: "O(1) beyond the data" },
      edgeCases: [
        "Unequal group sizes are fine for means but matter for standard errors.",
        "Pre-period trends that diverge invalidate the estimate; test with several pre-periods.",
        "Units switching groups between periods break the design.",
        "Clustered errors (by region) are needed for honest standard errors.",
      ],
      incorrect: {
        language: "python",
        code: code`
          effect = m[("treated", "post")] - m[("control", "post")]
        `,
        whyWrong: "It compares groups after launch only, so the 2-point gap that existed before launch is counted as part of the effect.",
        fix: "Subtract each group's pre-period mean first, then compare the changes.",
      },
    },
    flow: {
      title: "Two subtractions isolate the effect",
      nodes: [
        node("tpre", "Treated pre", 0, 30, "mean 10"),
        node("tpost", "Treated post", 0, 190, "mean 15"),
        node("cpre", "Control pre", 300, 30, "mean 8"),
        node("cpost", "Control post", 300, 190, "mean 10"),
        node("tchange", "Treated change", 600, 30, "+5"),
        node("cchange", "Control change", 600, 190, "+2"),
        node("did", "DiD effect", 880, 110, "5 - 2 = 3"),
      ],
      edges: [edge("tpre", "tchange"), edge("tpost", "tchange"), edge("cpre", "cchange"), edge("cpost", "cchange"), edge("tchange", "did"), edge("cchange", "did")],
      steps: [
        step("tpre tpost tchange", "tpre-tchange tpost-tchange", "Subtracting the treated group's pre-period mean removes its fixed advantage: +5."),
        step("cpre cpost cchange", "cpre-cchange cpost-cchange", "The control group's change, +2, is what time alone did."),
        step("tchange cchange did", "tchange-did cchange-did", "The difference of the two changes, 3, is the effect if trends would have been parallel."),
      ],
    },
    practice: [
      {
        id: "w08-causal-recall-1",
        type: "recall",
        prompt: "Define confounder, mediator and collider, with one example each for 'ads cause purchases'.",
        answer: "Confounder: causes both (user intent drives ad targeting and purchases). Mediator: on the path (ad leads to site visit leads to purchase). Collider: caused by both (being in a 'converted from ad' report). Adjust for confounders, not mediators or colliders.",
        rubric: ["Three correct definitions", "Examples", "What to adjust for"],
      },
      {
        id: "w08-causal-design-1",
        type: "design",
        prompt: "A new feature rolled out to Canada on March 1, other countries later. Design an analysis of its effect on retention.",
        answer: "DiD with Canada as treated and similar not-yet-treated countries as controls, several weeks of pre-period, an event-study plot checking pre-trends, placebo dates, clustered standard errors by country, and caution about country-specific shocks.",
        rubric: ["DiD or synthetic control", "Pre-trend check", "Placebo or robustness", "Clustered errors"],
      },
    ],
    references: [
      { title: "Causal Inference: The Mixtape (Cunningham)", url: "https://mixtape.scunning.com/", versionSensitive: false },
      { title: "Double/debiased machine learning for treatment and structural parameters (Chernozhukov et al., 2018)", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w08-d04-kaplan-meier-survival",
    slug: "kaplan-meier-survival",
    title: "Survival analysis with Kaplan-Meier",
    domain: "advanced-ml",
    roles: ["data-scientist", "ml-engineer"],
    difficulty: "advanced",
    minutes: 70,
    prerequisites: ["w06-d03-cohort-retention"],
    objectives: [
      "Explain censoring and why dropping censored users biases results",
      "Compute the Kaplan-Meier survival curve and median survival time",
      "Connect survival curves to churn and time-to-event questions",
    ],
    summary:
      "Survival analysis handles 'how long until something happens' when some subjects have not experienced the event yet (censoring). Kaplan-Meier multiplies conditional survival probabilities at each event time to estimate the survival curve.",
    eli5: {
      analogy:
        "Tracking how long new houseplants survive. Some plants die, but some are given away to friends before they die, so you never learn their fate. You still count them as alive for as long as you had them.",
      steps: [
        "Sort the plants by how long you watched them.",
        "At each time a plant dies, look at how many were still being watched just before.",
        "The chance of surviving that moment is 1 minus deaths divided by plants watched.",
        "Multiply those chances together over time to get the survival curve.",
      ],
      analogyLimit:
        "Giving a plant away is fine only if it was not given away because it looked sick. If people cancel tracking because things are going badly (informative censoring), Kaplan-Meier is biased.",
    },
    senior: {
      definition:
        "For distinct event times t_i with d_i events and n_i subjects at risk just before t_i, the Kaplan-Meier estimator is S(t) = product over t_i <= t of (1 - d_i / n_i). Censored subjects contribute to n_i until their censoring time.",
      invariants: [
        "Censoring is non-informative: censored subjects have the same future risk as those still observed.",
        "S(t) is a non-increasing step function starting at 1 and only drops at event times.",
        "Subjects censored at time t are still at risk for events at time t (events are processed before censoring).",
      ],
      mechanism: [
        "Sort by time; at each distinct event time count events and subjects still at risk.",
        "Multiply the running survival by (1 - d / n).",
        "The median survival time is the first time S(t) drops to 0.5 or below.",
        "Dropping censored users or treating them as events both bias the curve; Kaplan-Meier uses their partial information.",
      ],
      complexity: "O(n log n) to sort, O(n) to compute.",
      tradeoffs: [
        { option: "Kaplan-Meier", choose: "Describing survival for a group without covariates.", cost: "No adjustment for covariates; compare groups with log-rank tests." },
        { option: "Cox proportional hazards", choose: "Effects of covariates on hazard.", cost: "Assumes proportional hazards; check with Schoenfeld residuals." },
        { option: "Treat as classification ('churned in 30 days')", choose: "Simple scoring with a fixed horizon.", cost: "Discards timing and mishandles recent users." },
      ],
      failureModes: [
        "Dropping users who have not churned yet, which makes survival look worse.",
        "Treating censoring as churn.",
        "Informative censoring (users leave tracking because of the outcome).",
        "Reading the far tail of the curve where few subjects remain at risk.",
      ],
      production:
        "Subscription companies use survival curves for churn, lifetime value and time-to-first-purchase; reliability teams use them for time to failure. Report the number at risk under the curve.",
      interviewAnswer:
        "Survival analysis handles time-to-event data with censoring. Kaplan-Meier multiplies, at each event time, one minus events over subjects at risk; censored subjects count as at risk until they leave. I read off median survival where the curve crosses 0.5, compare groups with a log-rank test, and use Cox regression when covariates matter.",
    },
    implementation: {
      problem: "Compute a Kaplan-Meier survival table and median survival time for subscriptions with censoring.",
      input: "months (event 1 = cancelled, 0 = still active): 2/1 3/0 4/1 4/1 5/0 6/1 8/0 9/1 10/0 12/1",
      python: {
        code: code`
          DATA = [(2, 1), (3, 0), (4, 1), (4, 1), (5, 0), (6, 1), (8, 0), (9, 1), (10, 0), (12, 1)]


          def kaplan_meier(data: list[tuple[int, int]]) -> list[tuple[int, int, int, float]]:
              rows = []
              survival = 1.0
              for t in sorted({t for t, e in data if e == 1}):
                  at_risk = sum(1 for ti, _ in data if ti >= t)
                  events = sum(1 for ti, e in data if ti == t and e == 1)
                  survival *= 1 - events / at_risk
                  rows.append((t, at_risk, events, survival))
              return rows


          table = kaplan_meier(DATA)
          for t, n, d, s in table:
              print(f"month {t}: at_risk={n} cancelled={d} survival={s:.4f}")
          median = next((t for t, _, _, s in table if s <= 0.5), None)
          print(f"median survival: {median} months")
        `,
      },
      r: {
        code: code`
          months <- c(2, 3, 4, 4, 5, 6, 8, 9, 10, 12)
          event <- c(1, 0, 1, 1, 0, 1, 0, 1, 0, 1)

          kaplan_meier <- function(time, event) {
            times <- sort(unique(time[event == 1]))
            survival <- 1
            rows <- list()
            for (t in times) {
              at_risk <- sum(time >= t)
              d <- sum(time == t & event == 1)
              survival <- survival * (1 - d / at_risk)
              rows[[length(rows) + 1]] <- data.frame(t = t, at_risk = at_risk, d = d, s = survival)
            }
            do.call(rbind, rows)
          }

          km <- kaplan_meier(months, event)
          for (i in seq_len(nrow(km))) {
            cat(sprintf("month %d: at_risk=%d cancelled=%d survival=%.4f\n", km$t[i], km$at_risk[i], km$d[i], km$s[i]))
          }
          cat(sprintf("median survival: %d months\n", km$t[which(km$s <= 0.5)[1]]))
        `,
      },
      expectedOutput: code`
        month 2: at_risk=10 cancelled=1 survival=0.9000
        month 4: at_risk=8 cancelled=2 survival=0.6750
        month 6: at_risk=5 cancelled=1 survival=0.5400
        month 9: at_risk=3 cancelled=1 survival=0.3600
        month 12: at_risk=1 cancelled=1 survival=0.0000
        median survival: 9 months
      `,
      tests: {
        python: code`
          def test_survival_never_increases():
              s = [row[3] for row in table]
              assert all(b <= a for a, b in zip(s, s[1:]))


          def test_without_censoring_it_is_the_empirical_survival():
              rows = kaplan_meier([(1, 1), (2, 1), (3, 1), (4, 1)])
              assert [round(r[3], 10) for r in rows] == [0.75, 0.5, 0.25, 0.0]


          def test_censored_subjects_count_as_at_risk():
              assert table[1][1] == 8
        `,
        r: code`
          test_that("survival never increases", {
            expect_true(all(diff(km$s) <= 0))
          })

          test_that("without censoring it is the empirical survival", {
            expect_equal(kaplan_meier(1:4, rep(1, 4))$s, c(0.75, 0.5, 0.25, 0))
          })

          test_that("censored subjects count as at risk", {
            expect_equal(km$at_risk[2], 8L)
          })
        `,
      },
      eli5Trace: [
        "Month 2: all 10 plants are being watched and 1 dies, so 90% survive.",
        "The plant given away at month 3 still counted as watched at month 2, but not after.",
        "Month 4: 8 are watched and 2 die, so 75% of the survivors survive: 0.9 times 0.75.",
        "Keep multiplying at each death. The curve first reaches 50% or less at the printed median.",
      ],
      complexity: { time: "O(n log n) as written with sorting; O(n^2) for the simple counting loops", space: "O(n)" },
      edgeCases: [
        "Ties between an event and a censoring at the same time: events are counted first, so the censored subject is still at risk.",
        "If the curve never reaches 0.5, the median is undefined (Python prints None).",
        "A final event with one subject at risk drops survival to 0.",
        "Late entry (left truncation) needs a modified at-risk count.",
      ],
      incorrect: {
        language: "python",
        code: code`
          cancelled = [t for t, e in DATA if e == 1]
          survival_at_6 = sum(1 for t in cancelled if t > 6) / len(cancelled)
        `,
        whyWrong: "It throws away the four censored subscribers, who were still active for months, so survival is underestimated.",
        fix: "Keep censored subjects in the at-risk set until their censoring time, as Kaplan-Meier does.",
      },
    },
    flow: {
      title: "Kaplan-Meier step by step",
      nodes: [
        node("sort", "Sort by time", 0, 110, "events and censorings"),
        node("risk", "At risk", 230, 110, "time >= t"),
        node("hazard", "Conditional survival", 460, 110, "1 - d / n"),
        node("product", "Running product", 690, 110, "S(t)"),
        node("median", "Median", 900, 110, "first S <= 0.5"),
      ],
      edges: [edge("sort", "risk"), edge("risk", "hazard"), edge("hazard", "product"), edge("product", "risk"), edge("product", "median")],
      steps: [
        step("sort", "", "Sort subscriptions by months observed, marking cancellations and still-active users."),
        step("sort risk", "sort-risk", "At each cancellation time, count everyone observed at least that long, including censored users."),
        step("risk hazard", "risk-hazard", "The chance of surviving that time is 1 minus cancellations over subscribers at risk."),
        step("hazard product", "hazard-product", "Multiply into the running survival probability."),
        step("product risk", "product-risk", "Move to the next cancellation time; censored users leave the risk set after their time."),
        step("median", "product-median", "The median survival time is the first time the curve reaches 0.5 or lower."),
      ],
    },
    practice: [
      {
        id: "w08-surv-recall-1",
        type: "recall",
        prompt: "Why is 'average tenure of churned users' a misleading churn metric?",
        answer: "It ignores active users, who are censored and often have long tenure, and it changes as the active base ages. Survival curves use everyone's partial information.",
        rubric: ["Ignores censored users", "Biased by cohort age", "Survival curves fix it"],
      },
      {
        id: "w08-surv-code-1",
        type: "code",
        prompt: "Extend kaplan_meier to return the number at risk at each month 0..12 for a risk table under the plot.",
        answer: "For each month m, at_risk[m] = count of subjects with time >= m. Print it aligned with the curve.",
        rubric: ["Counts time >= m", "Includes censored subjects"],
      },
    ],
    references: [
      { title: "Nonparametric estimation from incomplete observations (Kaplan and Meier, 1958)", versionSensitive: false },
      { title: "lifelines documentation: survival analysis in Python", url: "https://lifelines.readthedocs.io/en/latest/", versionSensitive: true },
    ],
    lastReviewed: REVIEWED,
  }),
];

export const week = defineWeek({
  number: 8,
  slug: "advanced-ml-and-causal-inference",
  title: "Advanced ML and causal inference",
  track: "data",
  domains: ["advanced-ml"],
  summary:
    "Beyond supervised prediction: clustering, dimensionality reduction, anomaly detection, forecasting, survival analysis, recommenders and the causal designs that answer 'what if' questions.",
  outcomes: [
    "Cluster and reduce dimensions with the right method and caveats",
    "Detect anomalies robustly and forecast against baselines",
    "Estimate causal effects with DiD and explain when matching, IV or DML fit",
  ],
  roles: ["data-scientist", "ml-engineer", "genai-engineer"],
  days: [
    {
      id: "w08-d01",
      day: 1,
      kind: "concept-map",
      title: "Clustering and dimensionality reduction",
      summary: "k-means, PCA and how to read UMAP plots without fooling yourself.",
      minutes: 85,
      goals: ["Run Lloyd's algorithm in both languages", "Compute explained variance"],
      tasks: [
        { label: "Concept map and ELI5", minutes: 15 },
        { label: "Run k-means and PCA with tests", minutes: 35 },
        { label: "Choosing k prompt", minutes: 20 },
        { label: "Recall prompt", minutes: 15 },
      ],
      topicIds: ["w08-d01-clustering-pca"],
    },
    {
      id: "w08-d02",
      day: 2,
      kind: "theory-lab",
      title: "Anomaly detection and forecasting",
      summary: "Robust baselines and exponential smoothing against naive forecasts.",
      minutes: 80,
      goals: ["Flag anomalies with median and MAD", "Evaluate forecasts one step ahead"],
      tasks: [
        { label: "Step through the diagram", minutes: 15 },
        { label: "Run the example and tests", minutes: 30 },
        { label: "Monday alert case", minutes: 20 },
        { label: "Recall prompt", minutes: 15 },
      ],
      topicIds: ["w08-d02-anomaly-forecasting"],
    },
    {
      id: "w08-d03",
      day: 3,
      kind: "implementation",
      title: "Causal inference",
      summary: "DAGs, difference-in-differences and when to reach for matching, IV or DML.",
      minutes: 95,
      goals: ["Compute DiD two ways", "State the identifying assumption of each design"],
      tasks: [
        { label: "Read the lemonade analogy and its limit", minutes: 10 },
        { label: "Run DiD and its regression check", minutes: 30 },
        { label: "Canada rollout design prompt", minutes: 35 },
        { label: "DAG recall prompt", minutes: 20 },
      ],
      topicIds: ["w08-d03-causal-inference"],
    },
    {
      id: "w08-d04",
      day: 4,
      kind: "applied-practice",
      title: "Survival analysis and advanced ML drills",
      summary: "Kaplan-Meier by hand, then mixed drills across the week.",
      minutes: 90,
      goals: ["Compute a survival table with censoring", "Solve the mixed drills"],
      tasks: [
        { label: "Survival lesson and example", minutes: 35 },
        { label: "Mixed drills", minutes: 40 },
        { label: "Log weak spots", minutes: 15 },
      ],
      topicIds: ["w08-d04-kaplan-meier-survival", "w08-d01-clustering-pca", "w08-d02-anomaly-forecasting", "w08-d03-causal-inference"],
    },
    {
      id: "w08-d05",
      day: 5,
      kind: "production-lens",
      title: "Cold-start recommendations",
      summary: "Recommenders in production: collaborative filtering, content features and evaluation.",
      minutes: 60,
      goals: ["Design a recommender that works for new users and new items"],
      tasks: [
        { label: "Read the scenario", minutes: 10 },
        { label: "Answer the case questions", minutes: 35 },
        { label: "Compare against the rubric", minutes: 15 },
      ],
      topicIds: ["w08-d01-clustering-pca", "w08-d03-causal-inference"],
      productionCase: {
        title: "Recommendations for a marketplace with constant new listings",
        scenario:
          "A secondhand marketplace gets 50,000 new listings and 20,000 new users a day. Its matrix factorization recommender only recommends items with at least 30 interactions, so new listings get no exposure and sellers are leaving.",
        constraints: [
          "Listings sell within about 5 days, so slow learning is useless.",
          "Recommendations must render in under 150 ms.",
          "Offline metrics have not predicted online wins in the past.",
        ],
        questions: [
          "How do you recommend items with no interactions?",
          "How do you serve new users?",
          "What architecture meets the latency budget?",
          "How do you evaluate changes so offline and online agree?",
        ],
        rubric: [
          "Content-based or two-tower embeddings from item text and images for new items",
          "Popularity, context or onboarding signals for new users, with exploration (bandits)",
          "Candidate generation with approximate nearest neighbors, then a ranker",
          "Online A/B tests with seller-side metrics; offline metrics that respect time ordering",
        ],
        pitfalls: ["Optimizing click-through only and starving new listings", "Random offline splits that leak future interactions"],
      },
    },
    {
      id: "w08-d06",
      day: 6,
      kind: "interview-simulation",
      title: "Data science case interview",
      summary: "A timed causal or unsupervised case with a written recommendation.",
      minutes: 55,
      goals: ["Name assumptions explicitly", "Pick a design and defend it"],
      tasks: [
        { label: "Timed case", minutes: 35 },
        { label: "Written recommendation", minutes: 10 },
        { label: "Self-score with the rubric", minutes: 10 },
      ],
      topicIds: ["w08-d01-clustering-pca", "w08-d02-anomaly-forecasting", "w08-d03-causal-inference", "w08-d04-kaplan-meier-survival"],
    },
    {
      id: "w08-d07",
      day: 7,
      kind: "review",
      title: "Data science track review",
      summary: "Spaced review across weeks 5 to 8 and remediation on your weakest topic.",
      minutes: 50,
      goals: ["Clear due reviews", "Re-run your weakest topic's example from memory"],
      tasks: [
        { label: "Due reviews", minutes: 25 },
        { label: "Weakest topic remediation", minutes: 25 },
      ],
      topicIds: ["w08-d01-clustering-pca", "w08-d02-anomaly-forecasting", "w08-d03-causal-inference", "w08-d04-kaplan-meier-survival", "w07-d03-classification-metrics"],
    },
  ],
});
