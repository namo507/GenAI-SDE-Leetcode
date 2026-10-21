import { REVIEWED, code, defineTopic, defineWeek, edge, node, step } from "../helpers";

export const topics = [
  defineTopic({
    id: "w07-d01-splits-and-leakage",
    slug: "splits-and-leakage",
    title: "Problem framing, splits and leakage",
    domain: "ml",
    roles: ["data-scientist", "ml-engineer", "genai-engineer"],
    difficulty: "intermediate",
    minutes: 70,
    prerequisites: ["w01-d03-testing-reproducibility", "w05-d01-probability-distributions"],
    objectives: [
      "Frame a prediction problem: unit, label, prediction time and features available then",
      "Split by time when the model will predict the future",
      "Fit preprocessing on training data only and explain what leaks otherwise",
    ],
    summary:
      "Leakage is when information unavailable at prediction time sneaks into training or evaluation. It produces models that look excellent offline and fail in production. Time-aware splits and train-only preprocessing prevent the most common forms.",
    eli5: {
      analogy:
        "Studying for an exam with the answer key taped inside the textbook. You score brilliantly on practice tests, then fail the real exam, where the answer key is not there.",
      steps: [
        "Decide when the prediction will be made and only use information known by then.",
        "Train on the past and test on the later period, like the real future.",
        "Compute averages and spreads for scaling on the training part only.",
        "Apply those training numbers to the test part, even if the test part looks different.",
      ],
      analogyLimit:
        "Leaks are rarely as obvious as an answer key. They hide in a scaler fitted on all rows, a feature computed with tomorrow's data, or duplicate users across train and test. You find them by asking 'would I know this at prediction time?' for every column.",
    },
    senior: {
      definition:
        "Leakage is any dependence of the training or evaluation pipeline on data outside the information set available at prediction time. Preprocessing leakage occurs when transforms (scaling, imputation, encoding, feature selection) are fit on data that includes the evaluation set.",
      invariants: [
        "Every transform is fit on the training fold only and then applied unchanged to validation and test.",
        "For forecasting, all training timestamps precede all test timestamps, with a gap if labels mature slowly.",
        "Entities (users, patients) appear in only one split when rows from the same entity are correlated.",
      ],
      mechanism: [
        "The series shifts upward at t = 7. A time split trains on t <= 6 and tests on t >= 7, like deployment would.",
        "Fitting the scaler on all ten points pulls the mean toward the shifted values, so test points look much less extreme than they are relative to training.",
        "With train-only statistics, test z-scores near 13 reveal the distribution shift that the model will actually face.",
        "In scikit-learn, Pipeline plus cross_val_score refits transforms per fold; in R, recipes or rsample do the same.",
      ],
      complexity: "O(n) to compute statistics; leakage costs nothing to compute and everything to deploy.",
      tradeoffs: [
        { option: "Random split", choose: "IID data with no time or group structure.", cost: "Overestimates performance when future data drifts." },
        { option: "Time-based split", choose: "Any model that predicts the future.", cost: "Smaller, less similar training data; needs re-fitting cadence." },
        { option: "Group split", choose: "Multiple rows per entity.", cost: "Fewer effective samples per split." },
      ],
      failureModes: [
        "Scaling or imputing on the full dataset before splitting.",
        "Features aggregated over windows that extend past the prediction time.",
        "Target encoding without out-of-fold computation.",
        "Tuning hyperparameters on the test set until it stops being a test set.",
      ],
      production:
        "Build features with as-of logic from a feature store or point-in-time joins, and keep a final untouched test period. A sudden offline-to-online drop is the classic symptom of leakage.",
      interviewAnswer:
        "I first fix the prediction time and only allow features known at that moment. For anything forecasting the future I split by time, and I fit every preprocessing step inside the training fold, usually with a pipeline so cross-validation refits it. I also split by entity when users repeat, and I keep a final holdout I never tune on.",
    },
    implementation: {
      problem: "Standardize a feature for a time-based split, once with train-only statistics and once with leaky all-data statistics.",
      input: "x at t = 1..10: 10, 12, 11, 13, 12, 14, 30, 32, 31, 33; train t <= 6, test t >= 7",
      python: {
        code: code`
          from statistics import mean, stdev

          X = [10, 12, 11, 13, 12, 14, 30, 32, 31, 33]
          train, test = X[:6], X[6:]


          def standardize(values: list[float], mu: float, sd: float) -> list[float]:
              return [(v - mu) / sd for v in values]


          mu_train, sd_train = mean(train), stdev(train)
          mu_all, sd_all = mean(X), stdev(X)
          print(f"train stats: mean={mu_train:.4f} sd={sd_train:.4f}")
          print(f"leaky stats: mean={mu_all:.4f} sd={sd_all:.4f}")
          print("test z with train stats: " + " ".join(f"{z:.2f}" for z in standardize(test, mu_train, sd_train)))
          print("test z with leaky stats: " + " ".join(f"{z:.2f}" for z in standardize(test, mu_all, sd_all)))
        `,
      },
      r: {
        code: code`
          x <- c(10, 12, 11, 13, 12, 14, 30, 32, 31, 33)
          train <- x[1:6]
          test <- x[7:10]

          standardize <- function(values, mu, s) (values - mu) / s

          cat(sprintf("train stats: mean=%.4f sd=%.4f\n", mean(train), sd(train)))
          cat(sprintf("leaky stats: mean=%.4f sd=%.4f\n", mean(x), sd(x)))
          cat("test z with train stats: ", paste(sprintf("%.2f", standardize(test, mean(train), sd(train))), collapse = " "), "\n", sep = "")
          cat("test z with leaky stats: ", paste(sprintf("%.2f", standardize(test, mean(x), sd(x))), collapse = " "), "\n", sep = "")
        `,
      },
      expectedOutput: code`
        train stats: mean=12.0000 sd=1.4142
        leaky stats: mean=19.8000 sd=10.1522
        test z with train stats: 12.73 14.14 13.44 14.85
        test z with leaky stats: 1.00 1.20 1.10 1.30
      `,
      tests: {
        python: code`
          def test_train_split_precedes_test():
              assert len(train) == 6 and train[-1] == 14 and test[0] == 30


          def test_train_z_scores_have_zero_mean():
              z = standardize(train, mu_train, sd_train)
              assert abs(sum(z)) < 1e-12


          def test_leaky_stats_hide_the_shift():
              leaky = standardize(test, mu_all, sd_all)
              honest = standardize(test, mu_train, sd_train)
              assert max(leaky) < 2 < min(honest)
        `,
        r: code`
          test_that("train z-scores have zero mean", {
            expect_equal(sum(standardize(train, mean(train), sd(train))), 0)
          })

          test_that("leaky statistics hide the shift", {
            leaky <- standardize(test, mean(x), sd(x))
            honest <- standardize(test, mean(train), sd(train))
            expect_lt(max(leaky), 2)
            expect_gt(min(honest), 2)
          })
        `,
      },
      eli5Trace: [
        "The first six values hover around 12; the last four jump to around 31.",
        "Measured with the training numbers, the test values are about 13 spreads above normal: a huge, honest warning.",
        "Measured with numbers computed from all ten values, they look only about 1 spread above normal.",
        "The leaky version 'knew' about the jump in advance, so it makes the future look ordinary.",
      ],
      complexity: { time: "O(n)", space: "O(n)" },
      edgeCases: [
        "A constant training column has sd = 0; guard or drop the feature.",
        "New categories in test need an 'unknown' bucket fitted on train only.",
        "Rolling features must use windows that end at prediction time.",
        "Sample sd (n - 1) is used in both languages; mixing with population sd changes the numbers.",
      ],
      incorrect: {
        language: "python",
        code: code`
          mu, sd = mean(X), stdev(X)
          z = standardize(X, mu, sd)
          train_z, test_z = z[:6], z[6:]
        `,
        whyWrong: "The scaler is fit before splitting, so test information shapes the training features and the evaluation is optimistic.",
        fix: "Split first, fit statistics on the training part, then apply them to the test part.",
      },
    },
    flow: {
      title: "Where leakage enters a pipeline",
      nodes: [
        node("data", "Full history", 0, 110, "t = 1..10"),
        node("split", "Time split", 220, 110, "train t <= 6"),
        node("fit", "Fit scaler on train", 450, 30, "mean 12, sd 1.41"),
        node("apply", "Apply to test", 690, 30, "z around 13"),
        node("leak", "Fit on everything", 450, 200, "leaky mean 19.8"),
        node("eval", "Evaluation", 900, 110, "honest vs optimistic"),
      ],
      edges: [edge("data", "split"), edge("split", "fit"), edge("fit", "apply"), edge("apply", "eval"), edge("data", "leak"), edge("leak", "eval")],
      steps: [
        step("data split", "data-split", "Split first, by time, because the model will predict the future."),
        step("split fit", "split-fit", "Fit the scaler on the six training points only."),
        step("fit apply", "fit-apply", "Apply the training statistics to the test points: they sit about 13 standard deviations out, exposing the shift."),
        step("data leak", "data-leak", "The leaky path fits on all ten points, mixing the future into the statistics."),
        step("apply leak eval", "apply-eval leak-eval", "The leaky evaluation looks calm and optimistic; production will look like the honest path."),
      ],
    },
    practice: [
      {
        id: "w07-leak-case-1",
        type: "case",
        prompt: "A hospital readmission model uses 'number of follow-up visits in the next 30 days' as a feature. AUC is 0.97. What is wrong?",
        answer: "The feature is measured after the prediction time and is caused by the outcome, so it is target leakage. Drop it and rebuild features as of discharge time.",
        rubric: ["Identifies post-prediction information", "Names target leakage", "As-of feature construction"],
      },
      {
        id: "w07-leak-recall-1",
        type: "recall",
        prompt: "Why must target encoding be computed out of fold?",
        answer: "Encoding a category with the mean target including the row's own label leaks that label into the feature; out-of-fold encoding uses only other folds' labels.",
        rubric: ["Own label leaks", "Out-of-fold computation"],
      },
    ],
    references: [
      { title: "scikit-learn documentation: common pitfalls and data leakage", url: "https://scikit-learn.org/stable/common_pitfalls.html", versionSensitive: true },
      { title: "scikit-learn documentation: TimeSeriesSplit", url: "https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html", versionSensitive: true },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w07-d02-linear-logistic-regression",
    slug: "linear-logistic-regression",
    title: "Linear and logistic regression",
    domain: "ml",
    roles: ["data-scientist", "ml-engineer", "genai-engineer"],
    difficulty: "intermediate",
    minutes: 85,
    prerequisites: ["w07-d01-splits-and-leakage"],
    objectives: [
      "Fit ordinary least squares in closed form and interpret slope and R-squared",
      "Fit logistic regression by Newton's method and match R's glm()",
      "Explain the loss each model minimizes and what the coefficients mean",
    ],
    summary:
      "Linear regression finds the line with the smallest squared errors and has a closed-form answer. Logistic regression models the log-odds of a yes/no outcome and is fit iteratively by maximizing likelihood. Both remain strong baselines and are easy to explain.",
    eli5: {
      analogy:
        "Linear regression is laying a ruler through a cloud of dots so it is as close to all of them as possible. Logistic regression is drawing an S-shaped slide that says how likely a 'yes' is at each point, steepest where the yeses and nos mix.",
      steps: [
        "For the ruler, find the tilt that best follows how y rises with x, then slide it to pass through the middle of the dots.",
        "Check how much of the up-and-down in y the ruler explains: that is R-squared.",
        "For the slide, start flat and keep adjusting its position and steepness so it predicts the actual yeses and nos as well as possible.",
        "Read the slide at any x to get a probability between 0 and 1.",
      ],
      analogyLimit:
        "The ruler and slide only capture straight-line trends in their own scales. Curves, interactions and outliers need extra features or other models, and a steep slope says nothing about cause and effect.",
    },
    senior: {
      definition:
        "OLS minimizes the sum of squared residuals; with one feature, slope = Sxy / Sxx and intercept = y_bar - slope x_bar. Logistic regression models P(y = 1 | x) = sigma(b0 + b1 x) and maximizes the Bernoulli log-likelihood, which is concave, so Newton's method (IRLS) converges to the unique maximum when the data are not separable.",
      invariants: [
        "OLS residuals sum to zero and are uncorrelated with x.",
        "Newton's update is beta += H^-1 g with gradient g = X^T (y - p) and Hessian X^T W X, W = diag(p(1 - p)).",
        "Perfectly separable data has no finite logistic MLE; coefficients grow without bound.",
      ],
      mechanism: [
        "Python computes OLS from sums and fits logistic regression with hand-written Newton steps on a 2x2 system.",
        "R uses lm() and glm(family = binomial), which runs the same IRLS algorithm internally.",
        "Because both converge to the same maximum, coefficients agree to many decimals and print identically.",
        "b1 in logistic regression is the change in log-odds per unit of x; exp(b1) is the odds ratio.",
      ],
      complexity: "OLS: O(n p^2 + p^3). Each Newton step: O(n p^2 + p^3); usually under 10 steps.",
      tradeoffs: [
        { option: "Linear or logistic regression", choose: "Baselines, interpretability, calibrated probabilities (logistic).", cost: "Misses nonlinear structure without feature engineering." },
        { option: "Regularized versions (ridge, lasso)", choose: "Many correlated features or p near n.", cost: "Bias and a penalty strength to tune." },
        { option: "Tree ensembles", choose: "Nonlinear interactions in tabular data.", cost: "Less interpretable; probabilities often need calibration." },
      ],
      failureModes: [
        "Interpreting coefficients causally from observational data.",
        "Perfect separation causing huge coefficients and warnings in glm().",
        "Extrapolating far outside the observed x range.",
        "Ignoring heteroscedasticity or correlated errors when reporting standard errors.",
      ],
      production:
        "Logistic regression still powers many credit, ads and fraud systems because it is fast, stable, auditable and well calibrated. Coefficients double as documentation of what the model learned.",
      interviewAnswer:
        "Linear regression minimizes squared error and has a closed form; with one feature the slope is covariance over variance. Logistic regression models log-odds as linear in x and maximizes the Bernoulli likelihood, usually with Newton's method or IRLS, which converges because the objective is concave. I interpret exp(b1) as an odds ratio, watch for separation, and use regularization when features are many or correlated.",
    },
    implementation: {
      problem: "Fit a least-squares line and a logistic regression, then predict a pass probability.",
      input: "linear: x = 1..8, y = 2.1, 3.9, 6.2, 7.8, 10.1, 12.2, 13.8, 16.1; logistic: hours 0.5..5.0 by 0.5, passed = 0 0 0 1 0 1 0 1 1 1",
      python: {
        code: code`
          from math import exp

          X = [1, 2, 3, 4, 5, 6, 7, 8]
          Y = [2.1, 3.9, 6.2, 7.8, 10.1, 12.2, 13.8, 16.1]
          HOURS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0]
          PASSED = [0, 0, 0, 1, 0, 1, 0, 1, 1, 1]


          def ols(x: list[float], y: list[float]) -> tuple[float, float, float]:
              n = len(x)
              mx, my = sum(x) / n, sum(y) / n
              sxy = sum((a - mx) * (b - my) for a, b in zip(x, y))
              sxx = sum((a - mx) ** 2 for a in x)
              slope = sxy / sxx
              intercept = my - slope * mx
              sse = sum((b - intercept - slope * a) ** 2 for a, b in zip(x, y))
              sst = sum((b - my) ** 2 for b in y)
              return intercept, slope, 1 - sse / sst


          def sigmoid(z: float) -> float:
              return 1 / (1 + exp(-z))


          def fit_logistic(x: list[float], y: list[int], max_iter: int = 50) -> tuple[float, float]:
              b0 = b1 = 0.0
              for _ in range(max_iter):
                  g0 = g1 = h00 = h01 = h11 = 0.0
                  for xi, yi in zip(x, y):
                      p = sigmoid(b0 + b1 * xi)
                      w = p * (1 - p)
                      g0 += yi - p
                      g1 += (yi - p) * xi
                      h00 += w
                      h01 += w * xi
                      h11 += w * xi * xi
                  det = h00 * h11 - h01 * h01
                  d0 = (h11 * g0 - h01 * g1) / det
                  d1 = (h00 * g1 - h01 * g0) / det
                  b0, b1 = b0 + d0, b1 + d1
                  if abs(d0) + abs(d1) < 1e-12:
                      break
              return b0, b1


          a, b, r2 = ols(X, Y)
          print(f"linear: intercept={a:.4f} slope={b:.4f} r2={r2:.4f}")
          c0, c1 = fit_logistic(HOURS, PASSED)
          print(f"logistic: intercept={c0:.4f} slope={c1:.4f} odds ratio per hour={exp(c1):.4f}")
          print(f"P(pass | 2.75 hours)={sigmoid(c0 + c1 * 2.75):.4f}")
        `,
      },
      r: {
        code: code`
          x <- 1:8
          y <- c(2.1, 3.9, 6.2, 7.8, 10.1, 12.2, 13.8, 16.1)
          hours <- seq(0.5, 5, by = 0.5)
          passed <- c(0, 0, 0, 1, 0, 1, 0, 1, 1, 1)

          lin <- lm(y ~ x)
          cat(sprintf("linear: intercept=%.4f slope=%.4f r2=%.4f\n", coef(lin)[[1]], coef(lin)[[2]], summary(lin)$r.squared))

          logit <- glm(passed ~ hours, family = binomial, control = glm.control(epsilon = 1e-14, maxit = 50))
          b <- coef(logit)
          cat(sprintf("logistic: intercept=%.4f slope=%.4f odds ratio per hour=%.4f\n", b[[1]], b[[2]], exp(b[[2]])))
          cat(sprintf("P(pass | 2.75 hours)=%.4f\n", predict(logit, data.frame(hours = 2.75), type = "response")))
        `,
      },
      expectedOutput: code`
        linear: intercept=0.0357 slope=1.9976 r2=0.9988
        logistic: intercept=-3.7219 slope=1.3534 odds ratio per hour=3.8706
        P(pass | 2.75 hours)=0.5000
      `,
      tests: {
        python: code`
          def test_ols_residuals_sum_to_zero():
              a, b, _ = ols(X, Y)
              assert abs(sum(yv - a - b * xv for xv, yv in zip(X, Y))) < 1e-9


          def test_perfect_line_has_r2_one():
              assert abs(ols([1, 2, 3], [2, 4, 6])[2] - 1) < 1e-12


          def test_logistic_gradient_is_zero_at_optimum():
              c0, c1 = fit_logistic(HOURS, PASSED)
              g = sum(yv - sigmoid(c0 + c1 * h) for h, yv in zip(HOURS, PASSED))
              assert abs(g) < 1e-9
        `,
        r: code`
          test_that("lm residuals sum to zero", {
            expect_equal(sum(residuals(lin)), 0)
          })

          test_that("the glm score equations hold at the optimum", {
            p <- fitted(logit)
            expect_equal(sum(passed - p), 0, tolerance = 1e-8)
            expect_equal(sum((passed - p) * hours), 0, tolerance = 1e-8)
          })
        `,
      },
      eli5Trace: [
        "The dots rise by about 2 for every step in x and start near 0, so the ruler has slope near 2 and intercept near 0.",
        "The ruler explains almost all of the up-and-down: R-squared is close to 1.",
        "For the pass/fail data, the slide starts flat at 50% and Newton steps tilt and shift it until predictions match the outcomes best.",
        "Each extra hour multiplies the odds of passing by the printed odds ratio.",
        "At 2.75 hours the slide reads a probability close to a coin flip, because passes and fails are mixed there.",
      ],
      complexity: { time: "O(n) per pass; under 10 Newton steps", space: "O(1) beyond the data" },
      edgeCases: [
        "If all x are equal, Sxx = 0 and the slope is undefined.",
        "Perfectly separated labels make the Newton step diverge; glm() warns about fitted probabilities of 0 or 1.",
        "Large |b0 + b1 x| can overflow exp(); production code clips or uses a stable log-sigmoid.",
        "R's default glm tolerance is 1e-8; a tighter tolerance here makes the printed digits match the Python fit exactly.",
      ],
      incorrect: {
        language: "python",
        code: code`
          for _ in range(1000):
              p = [sigmoid(b0 + b1 * xi) for xi in x]
              b1 += 0.1 * sum((yi - pi) for yi, pi in zip(y, p))
        `,
        whyWrong: "The gradient for b1 must be weighted by x (sum of (y - p) * x), and b0 is never updated, so the fit converges to the wrong model.",
        fix: "Use the full gradient for both coefficients, or Newton steps with the Hessian, and check the score equations at the end.",
      },
    },
    flow: {
      title: "Newton's method for logistic regression",
      nodes: [
        node("start", "Start", 0, 110, "b0 = b1 = 0, p = 0.5"),
        node("predict", "Predict p", 220, 110, "sigma(b0 + b1 x)"),
        node("grad", "Gradient", 440, 30, "X^T (y - p)"),
        node("hess", "Hessian", 440, 190, "X^T W X"),
        node("update", "Newton step", 660, 110, "beta += H^-1 g"),
        node("done", "Converged", 880, 110, "matches glm()"),
      ],
      edges: [edge("start", "predict"), edge("predict", "grad"), edge("predict", "hess"), edge("grad", "update"), edge("hess", "update"), edge("update", "predict"), edge("update", "done")],
      steps: [
        step("start predict", "start-predict", "Start flat: every student gets a 50% pass probability."),
        step("predict grad", "predict-grad", "The gradient measures how predictions miss the labels, weighted by hours for the slope."),
        step("predict hess", "predict-hess", "The Hessian measures curvature, with weights p(1 - p) largest where predictions are uncertain."),
        step("grad hess update", "grad-update hess-update", "Solve the 2x2 system to move both coefficients at once."),
        step("update predict", "update-predict", "Repeat; the step size shrinks quickly because the log-likelihood is concave."),
        step("done", "update-done", "Stop when the step is tiny. R's glm() runs the same IRLS updates and lands on the same coefficients."),
      ],
    },
    practice: [
      {
        id: "w07-reg-recall-1",
        type: "recall",
        prompt: "A logistic regression coefficient for 'has_coupon' is 0.7. Interpret it.",
        answer: "Holding other features fixed, having a coupon multiplies the odds of conversion by exp(0.7), about 2.0. It is an association, not necessarily causal.",
        rubric: ["Log-odds to odds ratio", "Holding others fixed", "Not causal by default"],
      },
      {
        id: "w07-reg-recall-2",
        type: "recall",
        prompt: "Why does logistic regression fail on perfectly separable data, and what fixes it?",
        answer: "The likelihood keeps increasing as coefficients grow, so there is no finite maximum. L2 regularization or Firth's penalized likelihood gives finite estimates.",
        rubric: ["No finite MLE", "Regularization fix"],
      },
    ],
    references: [
      { title: "An Introduction to Statistical Learning (James, Witten, Hastie, Tibshirani), chapters 3 and 4", versionSensitive: false },
      { title: "R documentation: glm()", url: "https://stat.ethz.ch/R-manual/R-devel/library/stats/html/glm.html", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w07-d03-classification-metrics",
    slug: "classification-metrics",
    title: "Classification metrics and calibration",
    domain: "ml",
    roles: ["data-scientist", "ml-engineer", "genai-engineer"],
    difficulty: "intermediate",
    minutes: 75,
    prerequisites: ["w07-d02-linear-logistic-regression"],
    objectives: [
      "Compute precision, recall, F1 and accuracy from a confusion matrix",
      "Compute ROC AUC as the probability a positive outranks a negative",
      "Use Brier score and log loss to judge probability quality",
    ],
    summary:
      "Metrics answer different questions: precision (how many flagged items were right), recall (how many right items were flagged), AUC (how well scores rank), and Brier or log loss (how trustworthy the probabilities are). The threshold decides the trade-off.",
    eli5: {
      analogy:
        "A metal detector on a beach. Precision: of the times it beeped, how often was there real treasure? Recall: of all the treasure on the beach, how much did it beep for? Turning up the sensitivity finds more treasure but beeps at more bottle caps.",
      steps: [
        "Pick a sensitivity (the threshold) and record beeps versus actual treasure.",
        "Count four boxes: treasure found, bottle caps beeped, treasure missed, quiet over sand.",
        "Precision and recall come from those boxes.",
        "Separately, check whether the detector's confidence matches reality: when it says 80%, is there treasure about 80% of the time?",
      ],
      analogyLimit:
        "A detector has one dial, but real models produce scores whose meaning shifts when the population changes. A threshold tuned on last month's data may give very different precision next month.",
    },
    senior: {
      definition:
        "At threshold t: precision = TP / (TP + FP), recall = TP / (TP + FN), F1 = harmonic mean. ROC AUC = P(score of a random positive > score of a random negative), ties counting one half. Brier = mean (p - y)^2; log loss = -mean(y log p + (1 - y) log(1 - p)).",
      invariants: [
        "AUC is threshold-free and invariant to any monotonic transform of scores.",
        "Brier and log loss are proper scoring rules: they are minimized by the true probabilities.",
        "Precision depends on class prevalence; recall does not.",
      ],
      mechanism: [
        "Thresholding scores yields predictions, then the four confusion-matrix counts.",
        "Python counts positive-negative pairs for AUC; R uses the rank formula (Mann-Whitney U), giving the same number.",
        "Lowering the threshold from 0.5 to 0.3 raises recall to 1.0 and lowers precision, illustrating the trade-off.",
        "Calibration compares predicted probabilities with observed rates; Brier combines calibration and sharpness.",
      ],
      complexity: "Confusion matrix O(n). AUC O(n log n) with ranks (O(n1 n0) with pairwise counting as shown).",
      tradeoffs: [
        { option: "Precision-oriented threshold", choose: "False positives are expensive (blocking real customers).", cost: "Misses more positives." },
        { option: "Recall-oriented threshold", choose: "Missing a positive is expensive (fraud, disease screening).", cost: "More false alarms to review." },
        { option: "PR AUC instead of ROC AUC", choose: "Rare positives where ROC AUC looks deceptively high.", cost: "Harder to compare across prevalences." },
      ],
      failureModes: [
        "Reporting accuracy on a 99%-negative dataset.",
        "Picking the threshold on the test set.",
        "Treating uncalibrated tree or boosting scores as probabilities.",
        "Comparing precision across segments with different base rates.",
      ],
      production:
        "Choose thresholds from business costs (cost of a false positive versus a false negative), monitor precision and recall per segment, and recalibrate (Platt scaling or isotonic regression) when scores drift.",
      interviewAnswer:
        "I start from the confusion matrix and the costs of each error. Precision answers 'when we flag, are we right?', recall answers 'how much do we catch?', and the threshold trades them. AUC measures ranking independent of threshold, and for probabilities I check calibration with Brier score or log loss and a reliability plot. With rare positives I prefer precision-recall curves.",
    },
    implementation: {
      problem: "Evaluate scored predictions at two thresholds and compute AUC, Brier score and log loss.",
      input: "labels 1 0 1 1 0 0 1 0 1 0; scores 0.9 0.1 0.8 0.35 0.6 0.2 0.7 0.4 0.55 0.05; thresholds 0.5 and 0.3",
      python: {
        code: code`
          from math import log

          Y = [1, 0, 1, 1, 0, 0, 1, 0, 1, 0]
          S = [0.9, 0.1, 0.8, 0.35, 0.6, 0.2, 0.7, 0.4, 0.55, 0.05]


          def confusion(y: list[int], s: list[float], t: float) -> tuple[int, int, int, int]:
              tp = sum(1 for yi, si in zip(y, s) if si >= t and yi == 1)
              fp = sum(1 for yi, si in zip(y, s) if si >= t and yi == 0)
              fn = sum(1 for yi, si in zip(y, s) if si < t and yi == 1)
              tn = sum(1 for yi, si in zip(y, s) if si < t and yi == 0)
              return tp, fp, fn, tn


          def auc(y: list[int], s: list[float]) -> float:
              pos = [si for yi, si in zip(y, s) if yi == 1]
              neg = [si for yi, si in zip(y, s) if yi == 0]
              wins = sum(1.0 if p > n else 0.5 if p == n else 0.0 for p in pos for n in neg)
              return wins / (len(pos) * len(neg))


          for t in [0.5, 0.3]:
              tp, fp, fn, tn = confusion(Y, S, t)
              precision, recall = tp / (tp + fp), tp / (tp + fn)
              f1 = 2 * precision * recall / (precision + recall)
              print(f"t={t}: TP={tp} FP={fp} FN={fn} TN={tn} precision={precision:.3f} recall={recall:.3f} f1={f1:.3f}")

          brier = sum((si - yi) ** 2 for yi, si in zip(Y, S)) / len(Y)
          logloss = -sum(yi * log(si) + (1 - yi) * log(1 - si) for yi, si in zip(Y, S)) / len(Y)
          print(f"auc={auc(Y, S):.3f} brier={brier:.4f} logloss={logloss:.4f}")
        `,
      },
      r: {
        code: code`
          y <- c(1, 0, 1, 1, 0, 0, 1, 0, 1, 0)
          s <- c(0.9, 0.1, 0.8, 0.35, 0.6, 0.2, 0.7, 0.4, 0.55, 0.05)

          confusion <- function(y, s, t) {
            pred <- s >= t
            c(tp = sum(pred & y == 1), fp = sum(pred & y == 0), fn = sum(!pred & y == 1), tn = sum(!pred & y == 0))
          }

          auc <- function(y, s) {
            r <- rank(s)
            n1 <- sum(y == 1)
            n0 <- sum(y == 0)
            (sum(r[y == 1]) - n1 * (n1 + 1) / 2) / (n1 * n0)
          }

          for (t in c(0.5, 0.3)) {
            cm <- confusion(y, s, t)
            precision <- cm[["tp"]] / (cm[["tp"]] + cm[["fp"]])
            recall <- cm[["tp"]] / (cm[["tp"]] + cm[["fn"]])
            f1 <- 2 * precision * recall / (precision + recall)
            cat(sprintf("t=%s: TP=%d FP=%d FN=%d TN=%d precision=%.3f recall=%.3f f1=%.3f\n",
                        format(t), cm[["tp"]], cm[["fp"]], cm[["fn"]], cm[["tn"]], precision, recall, f1))
          }

          brier <- mean((s - y)^2)
          logloss <- -mean(y * log(s) + (1 - y) * log(1 - s))
          cat(sprintf("auc=%.3f brier=%.4f logloss=%.4f\n", auc(y, s), brier, logloss))
        `,
      },
      expectedOutput: code`
        t=0.5: TP=4 FP=1 FN=1 TN=4 precision=0.800 recall=0.800 f1=0.800
        t=0.3: TP=5 FP=2 FN=0 TN=3 precision=0.714 recall=1.000 f1=0.833
        auc=0.880 brier=0.1338 logloss=0.4140
      `,
      tests: {
        python: code`
          def test_perfect_ranking_has_auc_one():
              assert auc([0, 0, 1, 1], [0.1, 0.2, 0.8, 0.9]) == 1.0


          def test_ties_count_half():
              assert auc([0, 1], [0.5, 0.5]) == 0.5


          def test_confusion_counts_add_up():
              assert sum(confusion(Y, S, 0.5)) == len(Y)
        `,
        r: code`
          test_that("perfect ranking has AUC one", {
            expect_equal(auc(c(0, 0, 1, 1), c(0.1, 0.2, 0.8, 0.9)), 1)
          })

          test_that("ties count one half", {
            expect_equal(auc(c(0, 1), c(0.5, 0.5)), 0.5)
          })

          test_that("AUC is invariant to monotonic transforms", {
            expect_equal(auc(y, s), auc(y, log(s)))
          })
        `,
      },
      eli5Trace: [
        "At 0.5 the detector beeps on five items: four treasures and one bottle cap, and it misses one treasure scored 0.35.",
        "Precision is 4 of 5 beeps and recall is 4 of 5 treasures.",
        "Turning sensitivity up to 0.3 catches all five treasures but beeps at two bottle caps.",
        "Ranking: in 22 of the 25 treasure-versus-cap pairs, the treasure scored higher, so AUC is 0.88.",
      ],
      complexity: { time: "O(n) per threshold, O(n1 n0) pairwise AUC", space: "O(n)" },
      edgeCases: [
        "No predicted positives makes precision undefined (0 / 0).",
        "Scores of exactly 0 or 1 make log loss infinite when wrong; clip probabilities.",
        "Tied scores count one half in AUC; rank() averages ties for the same result.",
        "Thresholds use >= so a score equal to the threshold is a positive prediction.",
      ],
      incorrect: {
        language: "python",
        code: code`
          accuracy = sum((si >= 0.5) == yi for yi, si in zip(Y, S)) / len(Y)
          print("model is good" if accuracy > 0.7 else "model is bad")
        `,
        whyWrong: "Accuracy hides which errors happen and collapses on imbalanced data: a model that predicts all negatives on a 99% negative set has 99% accuracy.",
        fix: "Report the confusion matrix, precision, recall and a ranking metric, and pick the threshold from error costs.",
      },
    },
    flow: {
      title: "Scores, threshold and the confusion matrix",
      nodes: [
        node("scores", "Scores", 0, 110, "10 predictions"),
        node("threshold", "Threshold", 220, 110, "t = 0.5"),
        node("cm", "Confusion matrix", 450, 110, "TP 4 FP 1 FN 1 TN 4"),
        node("pr", "Precision / recall", 690, 30, "0.8 / 0.8"),
        node("auc", "AUC", 690, 190, "22 / 25 = 0.88"),
        node("calib", "Calibration", 900, 110, "Brier, log loss"),
      ],
      edges: [edge("scores", "threshold"), edge("threshold", "cm"), edge("cm", "pr"), edge("scores", "auc"), edge("scores", "calib")],
      steps: [
        step("scores threshold", "scores-threshold", "Every score is compared with the threshold to become a yes or no prediction."),
        step("threshold cm", "threshold-cm", "Count the four outcomes: 4 true positives, 1 false positive, 1 false negative, 4 true negatives."),
        step("cm pr", "cm-pr", "Precision and recall are both 0.8 at t = 0.5; lowering t to 0.3 raises recall to 1.0 but precision drops."),
        step("scores auc", "scores-auc", "AUC skips the threshold: in 22 of 25 positive-negative pairs the positive scores higher."),
        step("scores calib", "scores-calib", "Brier score and log loss check whether the probabilities themselves are trustworthy."),
      ],
    },
    practice: [
      {
        id: "w07-metrics-case-1",
        type: "case",
        prompt: "A fraud model flags transactions for manual review. Reviewers can handle 500 a day out of 1 million. How do you pick the threshold and which metric do you report?",
        answer: "Choose the threshold that flags about 500 a day (a capacity constraint) and report precision at that volume plus recall of fraud dollars. Track precision at k daily, because base rates change.",
        rubric: ["Threshold from capacity", "Precision at k", "Dollar-weighted recall or base-rate monitoring"],
      },
      {
        id: "w07-metrics-recall-1",
        type: "recall",
        prompt: "Why can ROC AUC look excellent on a dataset with 0.1% positives while the model is useless in practice?",
        answer: "ROC uses the false positive rate, whose denominator is the huge negative class, so many false positives barely move it. Precision at useful thresholds can still be tiny. Use precision-recall curves.",
        rubric: ["FPR denominator is large", "Precision stays low", "Use PR curves"],
      },
    ],
    references: [
      { title: "scikit-learn documentation: metrics and scoring", url: "https://scikit-learn.org/stable/modules/model_evaluation.html", versionSensitive: true },
      { title: "scikit-learn documentation: probability calibration", url: "https://scikit-learn.org/stable/modules/calibration.html", versionSensitive: true },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w07-d04-trees-boosting",
    slug: "trees-boosting",
    title: "Decision trees and gradient boosting",
    domain: "ml",
    roles: ["data-scientist", "ml-engineer"],
    difficulty: "advanced",
    minutes: 85,
    prerequisites: ["w07-d03-classification-metrics"],
    objectives: [
      "Find the best split by Gini impurity",
      "Implement gradient boosting with stumps on squared loss and watch the error fall",
      "Explain learning rate, depth and number of rounds as bias-variance controls",
    ],
    summary:
      "A decision tree asks yes/no questions that make groups purer. Gradient boosting adds many small trees, each fitted to the errors the previous trees still make. It is the default strong model for tabular data.",
    eli5: {
      analogy:
        "A tree is twenty questions: each question splits the group so each side is more alike. Boosting is a team of beginners: the first makes a rough guess, the second only tries to fix the first one's mistakes, the third fixes what is still wrong, and so on.",
      steps: [
        "For the tree, try every place to cut the line of examples and score how mixed each side is.",
        "Keep the cut that makes the sides least mixed.",
        "For boosting, start by guessing the average for everyone.",
        "Fit a one-question tree to the leftover errors, add a fraction of its answer, and repeat.",
      ],
      analogyLimit:
        "Beginners fixing each other's mistakes can also start memorizing noise. Real boosting needs a small learning rate, limited depth, enough data and early stopping on validation data, or it overfits.",
    },
    senior: {
      definition:
        "A CART split minimizes weighted child impurity; Gini(S) = 1 - sum_k p_k^2. Gradient boosting builds F_m(x) = F_(m-1)(x) + eta h_m(x), where h_m is fit to the negative gradient of the loss; for squared loss that is the residual y - F_(m-1)(x).",
      invariants: [
        "Each split threshold is a midpoint between adjacent sorted feature values.",
        "With squared loss, a stump's leaf value is the mean residual in that leaf.",
        "Training MSE never increases with eta in (0, 1] when each stump is fit by least squares.",
      ],
      mechanism: [
        "Gini search sorts x, evaluates each midpoint, and keeps the lowest weighted impurity; ties keep the first threshold.",
        "Boosting initializes predictions with the mean of y (the constant minimizing squared error).",
        "Each round fits a stump to the residuals by minimizing their within-leaf sum of squares, then adds eta times the leaf mean.",
        "Libraries such as XGBoost, LightGBM and CatBoost add second-order gradients, regularization, histogram splits and native categorical handling.",
      ],
      complexity: "Exhaustive split search: O(n log n) to sort plus O(n) per feature with running counts. Boosting: O(rounds * features * n) with presorted or histogram features.",
      tradeoffs: [
        { option: "Single decision tree", choose: "Explainability to non-technical audiences.", cost: "High variance; small data changes alter the tree." },
        { option: "Random forest", choose: "Robust default with little tuning.", cost: "Larger models, less accurate than tuned boosting." },
        { option: "Gradient boosting", choose: "Best accuracy on most tabular problems.", cost: "Needs tuning and early stopping; scores need calibration." },
      ],
      failureModes: [
        "Too many rounds with a high learning rate, overfitting training noise.",
        "Leaking target information through features that the trees exploit perfectly.",
        "Reading impurity-based feature importance as causal or unbiased (it favors high-cardinality features).",
        "Treating boosted scores as calibrated probabilities.",
      ],
      production:
        "Boosted trees dominate tabular production ML: ranking, risk, demand forecasting features. Monitor feature drift, retrain on a schedule, and use SHAP values for per-prediction explanations.",
      interviewAnswer:
        "A tree chooses splits that minimize impurity, Gini for classification or squared error for regression. Gradient boosting fits trees sequentially to the negative gradient of the loss, which is the residual for squared error, adding each with a learning rate. I control overfitting with depth, learning rate, subsampling and early stopping on validation data.",
    },
    implementation: {
      problem: "Find the best Gini split for a classification feature, then run three rounds of gradient boosting with stumps on a regression target.",
      input: "classification: x = 1..8, y = 0 0 0 0 1 0 1 1; regression: x = 1..8, y = 1.0 1.2 1.1 3.0 3.2 2.9 5.1 5.0; learning rate 0.5",
      python: {
        code: code`
          def gini(labels: list[int]) -> float:
              if not labels:
                  return 0.0
              p = sum(labels) / len(labels)
              return 1 - p**2 - (1 - p) ** 2


          def best_gini_split(x: list[float], y: list[int]) -> tuple[float, float]:
              pairs = sorted(zip(x, y))
              best_t, best_score = float("nan"), float("inf")
              for i in range(1, len(pairs)):
                  t = (pairs[i - 1][0] + pairs[i][0]) / 2
                  left = [b for a, b in pairs if a <= t]
                  right = [b for a, b in pairs if a > t]
                  score = (len(left) * gini(left) + len(right) * gini(right)) / len(pairs)
                  if score < best_score:
                      best_t, best_score = t, score
              return best_t, best_score


          def fit_stump(x: list[float], r: list[float]) -> tuple[float, float, float]:
              best = (float("inf"), 0.0, 0.0, 0.0)
              xs = sorted(set(x))
              for i in range(1, len(xs)):
                  t = (xs[i - 1] + xs[i]) / 2
                  left = [ri for xi, ri in zip(x, r) if xi <= t]
                  right = [ri for xi, ri in zip(x, r) if xi > t]
                  lm, rm = sum(left) / len(left), sum(right) / len(right)
                  sse = sum((v - lm) ** 2 for v in left) + sum((v - rm) ** 2 for v in right)
                  if sse < best[0]:
                      best = (sse, t, lm, rm)
              return best[1], best[2], best[3]


          def boost(x: list[float], y: list[float], rounds: int, lr: float) -> list[float]:
              pred = [sum(y) / len(y)] * len(y)
              mses = [sum((a - b) ** 2 for a, b in zip(y, pred)) / len(y)]
              for _ in range(rounds):
                  t, lv, rv = fit_stump(x, [a - b for a, b in zip(y, pred)])
                  pred = [p + lr * (lv if xi <= t else rv) for p, xi in zip(pred, x)]
                  mses.append(sum((a - b) ** 2 for a, b in zip(y, pred)) / len(y))
              return mses


          X = [1, 2, 3, 4, 5, 6, 7, 8]
          t, score = best_gini_split(X, [0, 0, 0, 0, 1, 0, 1, 1])
          print(f"root gini={gini([0, 0, 0, 0, 1, 0, 1, 1]):.4f} best split x <= {t} weighted gini={score:.4f}")
          mses = boost(X, [1.0, 1.2, 1.1, 3.0, 3.2, 2.9, 5.1, 5.0], rounds=3, lr=0.5)
          print("boosting train mse by round: " + " ".join(f"{m:.4f}" for m in mses))
        `,
      },
      r: {
        code: code`
          gini <- function(labels) {
            if (length(labels) == 0) return(0)
            p <- mean(labels)
            1 - p^2 - (1 - p)^2
          }

          best_gini_split <- function(x, y) {
            o <- order(x, y)
            x <- x[o]
            y <- y[o]
            best_t <- NA
            best_score <- Inf
            for (i in 2:length(x)) {
              t <- (x[i - 1] + x[i]) / 2
              score <- (sum(x <= t) * gini(y[x <= t]) + sum(x > t) * gini(y[x > t])) / length(x)
              if (score < best_score) {
                best_t <- t
                best_score <- score
              }
            }
            c(t = best_t, score = best_score)
          }

          fit_stump <- function(x, r) {
            xs <- sort(unique(x))
            best <- c(sse = Inf, t = 0, left = 0, right = 0)
            for (i in 2:length(xs)) {
              t <- (xs[i - 1] + xs[i]) / 2
              lm <- mean(r[x <= t])
              rm <- mean(r[x > t])
              sse <- sum((r[x <= t] - lm)^2) + sum((r[x > t] - rm)^2)
              if (sse < best[["sse"]]) best <- c(sse = sse, t = t, left = lm, right = rm)
            }
            best
          }

          boost <- function(x, y, rounds, lr) {
            pred <- rep(mean(y), length(y))
            mses <- mean((y - pred)^2)
            for (k in seq_len(rounds)) {
              s <- fit_stump(x, y - pred)
              pred <- pred + lr * ifelse(x <= s[["t"]], s[["left"]], s[["right"]])
              mses <- c(mses, mean((y - pred)^2))
            }
            mses
          }

          x <- 1:8
          labels <- c(0, 0, 0, 0, 1, 0, 1, 1)
          split <- best_gini_split(x, labels)
          cat(sprintf("root gini=%.4f best split x <= %s weighted gini=%.4f\n", gini(labels), format(split[["t"]]), split[["score"]]))
          mses <- boost(x, c(1.0, 1.2, 1.1, 3.0, 3.2, 2.9, 5.1, 5.0), rounds = 3, lr = 0.5)
          cat("boosting train mse by round: ", paste(sprintf("%.4f", mses), collapse = " "), "\n", sep = "")
        `,
      },
      expectedOutput: code`
        root gini=0.4688 best split x <= 4.5 weighted gini=0.1875
        boosting train mse by round: 2.3786 1.0589 0.3161 0.1304
      `,
      tests: {
        python: code`
          def test_pure_node_has_zero_gini():
              assert gini([1, 1, 1]) == 0 and gini([]) == 0


          def test_balanced_node_has_max_gini():
              assert gini([0, 1]) == 0.5


          def test_boosting_mse_never_increases():
              m = boost(X, [1.0, 1.2, 1.1, 3.0, 3.2, 2.9, 5.1, 5.0], rounds=6, lr=0.5)
              assert all(b <= a + 1e-12 for a, b in zip(m, m[1:]))
        `,
        r: code`
          test_that("pure and balanced nodes", {
            expect_equal(gini(c(1, 1, 1)), 0)
            expect_equal(gini(c(0, 1)), 0.5)
          })

          test_that("boosting MSE never increases", {
            m <- boost(x, c(1.0, 1.2, 1.1, 3.0, 3.2, 2.9, 5.1, 5.0), rounds = 6, lr = 0.5)
            expect_true(all(diff(m) <= 1e-12))
          })
        `,
      },
      eli5Trace: [
        "Three of the eight labels are 1, so the root group is quite mixed: Gini about 0.47.",
        "Trying every cut, 'x <= 4.5' puts four clean zeros on the left and three ones out of four on the right: the least mixed overall.",
        "Boosting starts by guessing the average, about 2.8, for everyone.",
        "The first small tree learns 'left side is too high, right side is too low' and fixes half of that.",
        "Each later round fixes part of what is still wrong, so the error printed for each round keeps falling.",
      ],
      complexity: { time: "O(n^2) as written; O(n log n) with sorted running sums", space: "O(n)" },
      edgeCases: [
        "A feature with one unique value has no split.",
        "Ties in split quality keep the first (lowest) threshold in both languages.",
        "Learning rate 1.0 with deep trees can fit training data perfectly and overfit.",
        "Leaves with very few samples make leaf means noisy; libraries enforce minimum leaf sizes.",
      ],
      incorrect: {
        language: "python",
        code: code`
          for _ in range(rounds):
              t, lv, rv = fit_stump(x, y)
              pred = [p + lr * (lv if xi <= t else rv) for p, xi in zip(pred, x)]
        `,
        whyWrong: "Each stump is fit to the original targets instead of the current residuals, so every round adds the same correction and predictions overshoot.",
        fix: "Fit each new stump to the residuals y - pred from the current ensemble.",
      },
    },
    flow: {
      title: "Boosting fits the remaining error",
      nodes: [
        node("init", "Start with the mean", 0, 110, "pred = 2.81"),
        node("resid", "Residuals", 230, 110, "y - pred"),
        node("stump", "Fit a stump", 460, 110, "best split on residuals"),
        node("add", "Add eta x stump", 690, 110, "eta = 0.5"),
        node("mse", "Training MSE", 900, 110, "falls every round"),
      ],
      edges: [edge("init", "resid"), edge("resid", "stump"), edge("stump", "add"), edge("add", "resid"), edge("add", "mse")],
      steps: [
        step("init", "", "Predict the mean of y for every example: the best constant under squared loss."),
        step("init resid", "init-resid", "Compute residuals: what the current model still gets wrong."),
        step("resid stump", "resid-stump", "Fit a one-split tree to the residuals; each leaf predicts its mean residual."),
        step("stump add", "stump-add", "Add half of the stump's correction to the predictions."),
        step("add resid", "add-resid", "Recompute residuals and repeat with a new stump."),
        step("mse", "add-mse", "Training error drops every round; validation error decides when to stop."),
      ],
    },
    practice: [
      {
        id: "w07-trees-recall-1",
        type: "recall",
        prompt: "Name three ways to reduce overfitting in gradient boosting.",
        answer: "Lower the learning rate with more rounds and early stopping, limit depth or leaves, subsample rows and columns, and add L1/L2 regularization on leaf weights.",
        rubric: ["Learning rate with early stopping", "Depth or leaf limits", "Subsampling or regularization"],
      },
      {
        id: "w07-trees-recall-2",
        type: "recall",
        prompt: "Why do random forests and boosting differ in how they reduce error?",
        answer: "Random forests average many deep, decorrelated trees to reduce variance. Boosting adds shallow trees sequentially to reduce bias, fixing remaining errors.",
        rubric: ["Forests reduce variance by averaging", "Boosting reduces bias sequentially"],
      },
    ],
    references: [
      { title: "The Elements of Statistical Learning (Hastie, Tibshirani, Friedman), chapter 10 on boosting", versionSensitive: false },
      { title: "XGBoost documentation: introduction to boosted trees", url: "https://xgboost.readthedocs.io/en/stable/tutorials/model.html", versionSensitive: true },
    ],
    lastReviewed: REVIEWED,
  }),
];

export const week = defineWeek({
  number: 7,
  slug: "classical-ml",
  title: "Classical machine learning",
  track: "data",
  domains: ["ml"],
  summary:
    "Frame problems, split without leaking, fit linear and logistic models, evaluate with the right metrics, and understand the trees and boosting that win on tabular data.",
  outcomes: [
    "Spot and prevent leakage in splits and preprocessing",
    "Fit and interpret linear and logistic regression",
    "Choose metrics and thresholds from error costs, and explain boosting",
  ],
  roles: ["data-scientist", "ml-engineer", "genai-engineer"],
  days: [
    {
      id: "w07-d01",
      day: 1,
      kind: "concept-map",
      title: "Framing, splits and leakage",
      summary: "Prediction time, time-aware splits and train-only preprocessing.",
      minutes: 75,
      goals: ["Ask 'known at prediction time?' for every feature", "Split by time for forecasting"],
      tasks: [
        { label: "Concept map and ELI5", minutes: 15 },
        { label: "Run the leakage example", minutes: 25 },
        { label: "Readmission leakage case", minutes: 20 },
        { label: "Recall prompt", minutes: 15 },
      ],
      topicIds: ["w07-d01-splits-and-leakage"],
    },
    {
      id: "w07-d02",
      day: 2,
      kind: "theory-lab",
      title: "Linear and logistic regression",
      summary: "Closed-form OLS and Newton's method, checked against lm() and glm().",
      minutes: 90,
      goals: ["Derive the OLS slope", "Explain why Newton's method converges for logistic regression"],
      tasks: [
        { label: "Step through the Newton diagram", minutes: 15 },
        { label: "Run both fits and their tests", minutes: 35 },
        { label: "Odds ratio and separation prompts", minutes: 25 },
        { label: "Write the interview answer from memory", minutes: 15 },
      ],
      topicIds: ["w07-d02-linear-logistic-regression"],
    },
    {
      id: "w07-d03",
      day: 3,
      kind: "implementation",
      title: "Metrics and calibration",
      summary: "Confusion matrices, AUC, Brier score and threshold choice.",
      minutes: 80,
      goals: ["Compute every metric by hand", "Pick a threshold from costs"],
      tasks: [
        { label: "Read the metal detector analogy", minutes: 10 },
        { label: "Run the metrics example and tests", minutes: 30 },
        { label: "Fraud review capacity case", minutes: 25 },
        { label: "Recall prompt", minutes: 15 },
      ],
      topicIds: ["w07-d03-classification-metrics"],
    },
    {
      id: "w07-d04",
      day: 4,
      kind: "applied-practice",
      title: "Trees, boosting and ML drills",
      summary: "Gini splits and boosting by hand, then a mixed ML problem set.",
      minutes: 100,
      goals: ["Implement a boosting round", "Explain bias versus variance controls"],
      tasks: [
        { label: "Trees and boosting lesson", minutes: 40 },
        { label: "ML drills in Practice", minutes: 45 },
        { label: "Log weak spots", minutes: 15 },
      ],
      topicIds: ["w07-d04-trees-boosting", "w07-d01-splits-and-leakage", "w07-d02-linear-logistic-regression", "w07-d03-classification-metrics"],
    },
    {
      id: "w07-d05",
      day: 5,
      kind: "production-lens",
      title: "The churn model that looked great offline",
      summary: "Leakage, calibration and threshold drift after launch.",
      minutes: 60,
      goals: ["Diagnose an offline-to-online performance gap"],
      tasks: [
        { label: "Read the scenario", minutes: 10 },
        { label: "Answer the case questions", minutes: 35 },
        { label: "Compare against the rubric", minutes: 15 },
      ],
      topicIds: ["w07-d01-splits-and-leakage", "w07-d03-classification-metrics"],
      productionCase: {
        title: "A churn model with 0.94 AUC offline and no lift online",
        scenario:
          "A gradient-boosted churn model scored 0.94 AUC on a random 20% holdout. Retention offers targeted at its top decile produced no measurable reduction in churn. The top features include 'days since last login' and 'support tickets in the last 30 days'.",
        constraints: [
          "Labels mean 'cancelled within 30 days of the snapshot'.",
          "Features were computed from a nightly table refreshed after the label window.",
          "Offers cost 10 dollars each.",
        ],
        questions: [
          "Which features might leak, and how would you check?",
          "Why might a random holdout overstate performance here?",
          "Even without leakage, why might targeting high-risk users not reduce churn?",
          "How would you evaluate the model and the offer properly?",
        ],
        rubric: [
          "Recomputes features as of the snapshot date (point-in-time) and compares performance",
          "Uses a time-based holdout",
          "Distinguishes prediction from treatment effect (users at high risk may not be persuadable)",
          "Proposes a randomized test of the offer within model deciles, or uplift modeling",
          "Checks calibration before using scores to set budgets",
        ],
        pitfalls: ["Retraining with more features before fixing the evaluation", "Assuming the highest-risk users respond most to offers"],
      },
    },
    {
      id: "w07-d06",
      day: 6,
      kind: "interview-simulation",
      title: "ML fundamentals interview",
      summary: "Timed conceptual round: leakage, regression, metrics and boosting.",
      minutes: 50,
      goals: ["Answer each question in under three minutes with one example"],
      tasks: [
        { label: "Timed ML questions", minutes: 30 },
        { label: "One whiteboard derivation", minutes: 10 },
        { label: "Self-score with the rubric", minutes: 10 },
      ],
      topicIds: ["w07-d01-splits-and-leakage", "w07-d02-linear-logistic-regression", "w07-d03-classification-metrics", "w07-d04-trees-boosting"],
    },
    {
      id: "w07-d07",
      day: 7,
      kind: "review",
      title: "Classical ML review",
      summary: "Spaced review across statistics and ML, with remediation on metrics.",
      minutes: 45,
      goals: ["Clear due reviews", "Recompute one metric set by hand"],
      tasks: [
        { label: "Due reviews", minutes: 25 },
        { label: "Metrics by hand, then check", minutes: 20 },
      ],
      topicIds: ["w07-d01-splits-and-leakage", "w07-d02-linear-logistic-regression", "w07-d03-classification-metrics", "w07-d04-trees-boosting"],
    },
  ],
});
