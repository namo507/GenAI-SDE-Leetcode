import { REVIEWED, code, defineTopic, edge, node, step } from "../helpers";
import type { ExtraWeek } from "./types";

/** Shared numeric helpers are repeated inside each program so every lesson runs on its own. */
export const w07: ExtraWeek = {
  schedule: [
    {
      dayId: "w07-d01",
      topicId: "w07-d01-feature-engineering",
      tasks: [
        { label: "Feature engineering: encode, scale, transform without leaking", minutes: 30 },
        { label: "Unseen categories and target encoding prompts", minutes: 15 },
      ],
    },
    {
      dayId: "w07-d02",
      topicId: "w07-d02-bias-variance-regularization",
      tasks: [
        { label: "Bias, variance and ridge regularization", minutes: 30 },
        { label: "Run the polynomial fits", minutes: 15 },
      ],
    },
    {
      dayId: "w07-d03",
      topicId: "w07-d03-cross-validation-tuning",
      tasks: [
        { label: "K-fold cross-validation and hyperparameter search", minutes: 30 },
        { label: "Nested CV and leakage prompts", minutes: 15 },
      ],
    },
    {
      dayId: "w07-d05",
      topicId: "w07-d05-imbalanced-data",
      tasks: [
        { label: "Imbalanced classes: thresholds, costs and PR curves", minutes: 30 },
        { label: "Fraud and churn threshold case", minutes: 20 },
      ],
    },
  ],
  topics: [
    defineTopic({
      id: "w07-d01-feature-engineering",
      slug: "feature-engineering",
      title: "Feature engineering without leakage",
      domain: "ml",
      roles: ["data-scientist", "ml-engineer", "data-analyst"],
      difficulty: "intermediate",
      minutes: 45,
      prerequisites: ["w06-d01-data-quality-eda", "w01-d04-dataframe-wrangling"],
      objectives: [
        "One-hot encode categories and handle categories unseen at training time",
        "Standardize and log-transform numeric features using statistics fitted on training data only",
        "Build smoothed target encoding and explain how it can leak",
      ],
      summary:
        "Models only see numbers, so features turn raw columns into useful numbers: categories into indicators or encodings, skewed amounts into logs, different scales into comparable ones. Every statistic used for a transform must come from training data only, or the model peeks at the test set.",
      eli5: {
        analogy:
          "Preparing ingredients before cooking. You chop vegetables into the same size so they cook evenly (scaling), you turn 'which shop it came from' into simple yes or no labels (one-hot), and you measure using the recipe's cup, not by tasting the finished dish (fit on training data only).",
        steps: [
          "Learn the measuring cups from the training data: averages, spreads and the list of categories.",
          "Use those same cups on new data, even if the new data looks different.",
          "Turn each category into its own yes or no column.",
          "Squash very big numbers with a log so a few giants do not dominate.",
        ],
        analogyLimit:
          "Kitchen measuring cups never change. In ML, the right transform depends on the model: trees do not need scaling, while linear models and k-nearest neighbors do.",
      },
      senior: {
        definition:
          "Feature engineering maps raw inputs to a representation a model can learn from. Transforms are fitted (means, variances, vocabularies, encodings) on training folds and applied unchanged to validation and test data, ideally inside one pipeline object.",
        invariants: [
          "Fit statistics only on training rows; apply the fitted transform everywhere else.",
          "Categories unseen in training must map to a defined fallback (all zeros, 'other', or the global mean).",
          "Target encoding of a row must not use that row's own label (use out-of-fold encoding).",
        ],
        mechanism: [
          "Age is standardized with the training mean (35.83) and population standard deviation, as scikit-learn's StandardScaler does.",
          "Income is right skewed, so log1p compresses 30,000 and 120,000 to about 10.3 and 11.7.",
          "Smoothed target encoding blends each city's purchase rate with the global rate: (sum + m·global) / (n + m) with m = 2.",
          "An unseen city (rome) gets an all-zero one-hot vector and the global rate as its encoding.",
        ],
        complexity: "O(n · features) to fit and transform; one-hot width grows with the number of categories.",
        tradeoffs: [
          { option: "One-hot encoding", choose: "Low-cardinality categories, linear models.", cost: "Very wide and sparse for thousands of categories." },
          { option: "Target encoding", choose: "High-cardinality categories (zip codes, merchants).", cost: "Leakage risk without out-of-fold fitting and smoothing." },
          { option: "Learned embeddings", choose: "Very high cardinality with lots of data, deep models.", cost: "Needs training and is harder to explain." },
        ],
        failureModes: [
          "Scaling with statistics computed on the whole dataset before splitting.",
          "Target encoding computed on all rows including the row being encoded.",
          "Crashing in production on a category the model never saw.",
          "Features that are only known after the prediction time (future information).",
        ],
        production:
          "Wrap transforms and the model in one pipeline (scikit-learn Pipeline and ColumnTransformer, tidymodels recipes) so the exact fitted transform ships with the model, and log feature distributions to catch drift and new categories.",
        interviewAnswer:
          "I fit every transform on the training split only: scaler means, vocabularies and encodings, then apply them unchanged to validation and test, inside a single pipeline so production matches training. Low-cardinality categories get one-hot, high-cardinality get smoothed out-of-fold target encoding, unseen categories fall back to a default, and skewed amounts get a log transform for linear models.",
      },
      implementation: {
        problem: "Fit scaling, one-hot and smoothed target encoding on 6 training rows, then transform 2 test rows, one with an unseen city.",
        input: "train: city, age, income, bought for 6 customers; test: lyon (35, 70,000) and rome (28, 40,000)",
        python: {
          code: code`
            from math import log1p, sqrt

            TRAIN = [("lyon", 25, 30000, 0), ("pune", 32, 52000, 1), ("lyon", 41, 120000, 1),
                     ("oslo", 29, 45000, 0), ("pune", 50, 80000, 1), ("oslo", 38, 61000, 1)]
            TEST = [("lyon", 35, 70000), ("rome", 28, 40000)]
            SMOOTHING = 2


            def mean(xs):
                total = 0.0
                for x in xs:
                    total += x
                return total / len(xs)


            def fit(train):
                ages = [r[1] for r in train]
                mu = mean(ages)
                sd = sqrt(mean([(a - mu) ** 2 for a in ages]))  # population sd, like StandardScaler
                global_rate = mean([r[3] for r in train])
                cats = sorted({r[0] for r in train})
                enc = {}
                for c in cats:
                    ys = [r[3] for r in train if r[0] == c]
                    enc[c] = (sum(ys) + SMOOTHING * global_rate) / (len(ys) + SMOOTHING)
                return {"cats": cats, "mean": mu, "sd": sd, "global": global_rate, "enc": enc}


            def transform(row, p):
                city, age, income = row[0], row[1], row[2]
                return {
                    "age_z": (age - p["mean"]) / p["sd"],
                    "log_income": log1p(income),
                    "one_hot": [1 if city == c else 0 for c in p["cats"]],
                    "target_enc": p["enc"].get(city, p["global"]),
                }


            params = fit(TRAIN)
            print(f"fitted on train only: categories {' '.join(params['cats'])}; age mean {params['mean']:.2f}, sd {params['sd']:.2f}; global rate {params['global']:.3f}")
            for row in TEST:
                f = transform(row, params)
                print(f"test {row[0]}: age_z={f['age_z']:.2f} log_income={f['log_income']:.2f} one_hot={f['one_hot']} target_enc={f['target_enc']:.3f}")
            leaky_mean = mean([r[1] for r in TRAIN] + [r[1] for r in TEST])
            print(f"age mean if fitted on train and test together: {leaky_mean:.2f} (this leaks test data)")
          `,
        },
        r: {
          code: code`
            train <- data.frame(
              city = c("lyon", "pune", "lyon", "oslo", "pune", "oslo"),
              age = c(25, 32, 41, 29, 50, 38),
              income = c(30000, 52000, 120000, 45000, 80000, 61000),
              bought = c(0, 1, 1, 0, 1, 1)
            )
            test <- data.frame(city = c("lyon", "rome"), age = c(35, 28), income = c(70000, 40000))
            smoothing <- 2

            mean_loop <- function(xs) {
              total <- 0
              for (x in xs) total <- total + x
              total / length(xs)
            }

            fit <- function(train) {
              mu <- mean_loop(train$age)
              sd_pop <- sqrt(mean_loop((train$age - mu)^2))
              global_rate <- mean_loop(train$bought)
              cats <- sort(unique(train$city))
              enc <- vapply(cats, function(cc) {
                ys <- train$bought[train$city == cc]
                (sum(ys) + smoothing * global_rate) / (length(ys) + smoothing)
              }, numeric(1))
              list(cats = cats, mean = mu, sd = sd_pop, global = global_rate, enc = enc)
            }

            transform_row <- function(city, age, income, p) {
              list(
                age_z = (age - p$mean) / p$sd,
                log_income = log1p(income),
                one_hot = as.integer(p$cats == city),
                target_enc = if (city %in% names(p$enc)) p$enc[[city]] else p$global
              )
            }

            params <- fit(train)
            cat(sprintf("fitted on train only: categories %s; age mean %.2f, sd %.2f; global rate %.3f\n", paste(params$cats, collapse = " "), params$mean, params$sd, params$global))
            for (i in seq_len(nrow(test))) {
              f <- transform_row(test$city[i], test$age[i], test$income[i], params)
              cat(sprintf("test %s: age_z=%.2f log_income=%.2f one_hot=[%s] target_enc=%.3f\n", test$city[i], f$age_z, f$log_income, paste(f$one_hot, collapse = ", "), f$target_enc))
            }
            leaky_mean <- mean_loop(c(train$age, test$age))
            cat(sprintf("age mean if fitted on train and test together: %.2f (this leaks test data)\n", leaky_mean))
          `,
        },
        expectedOutput: code`
        fitted on train only: categories lyon oslo pune; age mean 35.83, sd 8.27; global rate 0.667
        test lyon: age_z=-0.10 log_income=11.16 one_hot=[1, 0, 0] target_enc=0.583
        test rome: age_z=-0.95 log_income=10.60 one_hot=[0, 0, 0] target_enc=0.667
        age mean if fitted on train and test together: 34.75 (this leaks test data)
      `,
        tests: {
          python: code`
            def test_unseen_category_falls_back_to_global_rate():
                f = transform(("paris", 30, 1000), params)
                assert f["one_hot"] == [0, 0, 0] and f["target_enc"] == params["global"]


            def test_scaled_train_ages_have_mean_zero():
                zs = [transform(r, params)["age_z"] for r in TRAIN]
                assert abs(mean(zs)) < 1e-9


            def test_smoothing_pulls_toward_global():
                assert params["enc"]["lyon"] > 0.5 > 0.0
          `,
          r: code`
            test_that("unseen category falls back to the global rate", {
              f <- transform_row("paris", 30, 1000, params)
              expect_equal(f$one_hot, c(0L, 0L, 0L))
              expect_equal(f$target_enc, params$global)
            })

            test_that("scaled train ages have mean zero", {
              zs <- (train$age - params$mean) / params$sd
              expect_lt(abs(mean(zs)), 1e-9)
            })
          `,
        },
        eli5Trace: [
          "Learn the measuring cups from the 6 training customers: average age about 36, three cities, two in three of them bought.",
          "The Lyon test customer is almost exactly average age, so their scaled age is close to 0.",
          "Big incomes are squashed with a log, so 70,000 becomes about 11.2.",
          "Lyon becomes the column pattern [1, 0, 0]; Rome was never seen, so it gets [0, 0, 0] and the average buying rate.",
          "If we had measured the average age using the test customers too, we would have cheated a little.",
        ],
        complexity: { time: "O(n · features)", space: "O(categories)" },
        edgeCases: [
          "A category seen once gets an encoding dominated by one label; smoothing pulls it toward the global rate.",
          "A constant feature has standard deviation 0; guard against division by zero.",
          "Negative values cannot go through log; use log1p only for non-negative amounts or a signed transform.",
          "New categories appearing in production should be counted and alerted on.",
        ],
        incorrect: {
          language: "python",
          code: code`
            scaler = StandardScaler().fit(X)  # X includes test rows
            X_train, X_test = train_test_split(scaler.transform(X))
          `,
          whyWrong: "The scaler's mean and variance include the test rows, so information from the test set leaks into training and evaluation looks better than reality.",
          fix: "Split first, then fit the scaler on the training split only, ideally inside a Pipeline so cross-validation refits it per fold.",
        },
        walkthrough: [
          { python: "TRAIN = [", pythonLines: 3, r: "train <- data.frame(", rLines: 7, eli5: "Six training customers with city, age, income and whether they bought, plus two new test customers. One of them lives in a city we never saw." },
          { python: "def fit(train):", pythonLines: 11, r: "fit <- function(train) {", rLines: 11, eli5: "Learn the measuring cups from training data only: the average age and its spread, the list of cities, and each city's buying rate pulled a little toward the overall rate." },
          { python: "def transform(row, p):", pythonLines: 8, r: "transform_row <- function(city, age, income, p) {", rLines: 8, eli5: "Use those same cups on any row: scale the age, squash the income with a log, turn the city into yes or no columns, and look up the city's buying rate." },
          { python: '"target_enc": p["enc"].get(city, p["global"]),', r: "target_enc = if (city %in% names(p$enc))", eli5: "A city we never saw gets the overall buying rate instead of crashing the program." },
          { python: "leaky_mean = mean(", pythonLines: 2, r: "leaky_mean <- mean_loop(", rLines: 2, eli5: "If we had measured using the test customers too, the average age would change. That is the leak we must avoid." },
        ],
      },
      flow: {
        title: "Fit on train, apply everywhere",
        nodes: [
          node("train", "Train split", 0, 40, "6 rows"),
          node("fit", "Fit transforms", 220, 40, "mean, sd, cities, encodings"),
          node("test", "Test split", 0, 190, "2 rows, one unseen city"),
          node("apply", "Apply transforms", 460, 120, "same parameters"),
          node("model", "Model", 680, 120, "numbers only"),
        ],
        edges: [edge("train", "fit"), edge("fit", "apply"), edge("test", "apply"), edge("apply", "model")],
        steps: [
          step("train fit", "train-fit", "Statistics are learned from training rows only: age mean and sd, the category list and smoothed target rates."),
          step("fit apply", "fit-apply", "The fitted parameters are frozen and reused, exactly like a trained model."),
          step("test apply", "test-apply", "Test rows pass through the same transform; the unseen city falls back to zeros and the global rate."),
          step("apply model", "apply-model", "The model sees consistent numeric features in training, validation and production."),
        ],
      },
      practice: [
        {
          id: "w07-fe-recall-1",
          type: "recall",
          prompt: "Why must target encoding be computed out of fold?",
          answer: "If a row's own label contributes to its category's encoding, the feature contains the answer, so the model learns a shortcut that will not exist at prediction time. Out-of-fold encoding computes each row's encoding from other folds only.",
          rubric: ["Own label leaks", "Out-of-fold computation", "Inflated validation scores"],
        },
        {
          id: "w07-fe-case-1",
          type: "case",
          prompt: "A model with a 'merchant_id' feature (200,000 merchants) works offline but performs badly in production. What do you check?",
          answer: "Whether many production merchants are new or rare (unseen categories), whether target encoding was leaky offline, and whether the encoding table in production matches training. Consider smoothing, an 'other' bucket, frequency thresholds or merchant attributes instead of raw ids.",
          rubric: ["Unseen or rare categories", "Leaky encoding offline", "Train-serving mismatch", "Alternatives"],
        },
        {
          id: "w07-fe-recall-2",
          type: "recall",
          prompt: "Which models need feature scaling and which do not?",
          answer: "Distance and gradient based models need it: linear and logistic regression with regularization, SVMs, k-nearest neighbors, neural networks, PCA. Tree models (random forests, gradient boosting) split on thresholds and are scale invariant.",
          rubric: ["Distance or gradient models need it", "Trees do not"],
        },
      ],
      references: [
        { title: "scikit-learn user guide: Preprocessing data", url: "https://scikit-learn.org/stable/modules/preprocessing.html", versionSensitive: true },
        { title: "scikit-learn user guide: Common pitfalls and recommended practices (data leakage)", url: "https://scikit-learn.org/stable/common_pitfalls.html", versionSensitive: true },
      ],
      lastReviewed: REVIEWED,
    }),

    defineTopic({
      id: "w07-d02-bias-variance-regularization",
      slug: "bias-variance-regularization",
      title: "Bias, variance and regularization",
      domain: "ml",
      roles: ["data-scientist", "ml-engineer", "genai-engineer"],
      difficulty: "intermediate",
      minutes: 50,
      prerequisites: ["w07-d01-splits-and-leakage"],
      objectives: [
        "Diagnose underfitting and overfitting from training and test error",
        "Explain the bias-variance trade-off in terms of model flexibility",
        "Use ridge (L2) regularization to shrink coefficients and reduce variance",
      ],
      summary:
        "A model that is too simple misses the pattern (high bias); one that is too flexible memorizes noise (high variance). Training error always falls as flexibility grows, test error falls and then rises. Regularization adds a penalty on large coefficients so a flexible model behaves more simply.",
      eli5: {
        analogy:
          "Drawing a line through dots on paper. A ruler (straight line) misses the curve. A wiggly line that passes through every dot also follows the smudges and stray marks, so it guesses badly for new dots. A bendy ruler that resists bending too much gets close to the true curve.",
        steps: [
          "Fit a very simple line: it misses the shape (too stiff).",
          "Fit a very wiggly line: it hits every training dot but wobbles between them.",
          "Check on new dots: the wiggly line does badly.",
          "Add a penalty for wiggling (regularization) and the line calms down.",
        ],
        analogyLimit:
          "On paper you can see the true curve. With real data you cannot, so you choose flexibility and penalty strength by measuring error on held-out data.",
      },
      senior: {
        definition:
          "Expected squared test error decomposes into bias², variance and irreducible noise. Ridge regression minimizes squared error plus λ‖β‖², giving β = (XᵀX + λI)⁻¹Xᵀy, which shrinks coefficients and stabilizes ill-conditioned fits. Lasso (L1) shrinks some coefficients to exactly zero.",
        invariants: [
          "Training error never increases when you add flexibility to nested models.",
          "Regularization strength λ = 0 recovers ordinary least squares; larger λ means smaller coefficients and more bias.",
          "The intercept is usually not penalized.",
        ],
        mechanism: [
          "12 noisy points from sin(πx): a straight line underfits, with high error on both sets.",
          "A cubic captures the shape with low error on both sets.",
          "A degree-9 polynomial nearly interpolates the training points and its test error rises: overfitting.",
          "Ridge with a small λ shrinks the degree-9 coefficients sharply and brings test error back down.",
          "The same Gaussian-elimination solver is written in both languages so the numbers match exactly.",
        ],
        complexity: "Solving the normal equations is O(p³ + n·p²) for p features.",
        tradeoffs: [
          { option: "Ridge (L2)", choose: "Many correlated useful features; stable predictions.", cost: "Keeps every feature, so no automatic selection." },
          { option: "Lasso (L1)", choose: "Sparse models and feature selection.", cost: "Unstable among correlated features." },
          { option: "Elastic net", choose: "Correlated groups plus sparsity.", cost: "Two hyperparameters to tune." },
        ],
        failureModes: [
          "Judging a model by training error alone.",
          "Regularizing unscaled features, so the penalty hits large-unit features unfairly.",
          "Tuning λ on the test set.",
          "Assuming more data always fixes bias: it fixes variance, not an overly simple model.",
        ],
        production:
          "Regularization is everywhere: L2 weight decay in neural nets, L1 or L2 in logistic regression, shrinkage in gradient boosting, dropout and early stopping. Learning curves (error versus training size) tell you whether to collect data or add capacity.",
        interviewAnswer:
          "High training and test error means bias, so I add capacity or features; low training but high test error means variance, so I regularize, simplify or get more data. Ridge adds λ‖β‖², shrinking coefficients: here a degree-9 fit that overfits 12 points gets most of its test error back with a small λ. I choose λ by cross-validation, never on the test set.",
      },
      implementation: {
        problem: "Fit polynomials of degree 1, 3 and 9 to 12 noisy points, compare training and test error, then add ridge regularization to the degree-9 fit.",
        input: "x evenly spaced in [-1, 1]; y = sin(πx) + noise (sd 0.25) from a seeded generator; 12 train and 12 test points",
        python: {
          code: code`
            from math import cos, log, pi, sin, sqrt

            M = 2_147_483_647


            def make_rng(seed):
                state = [seed]

                def uniform():
                    state[0] = (16807 * state[0]) % M
                    return state[0] / M

                return uniform


            def normal(uniform):
                u1, u2 = uniform(), uniform()
                return sqrt(-2 * log(u1)) * cos(2 * pi * u2)


            def solve(a, b):
                n = len(b)
                m = [a[i][:] + [b[i]] for i in range(n)]
                for col in range(n):
                    piv = col
                    for r in range(col + 1, n):
                        if abs(m[r][col]) > abs(m[piv][col]):
                            piv = r
                    m[col], m[piv] = m[piv], m[col]
                    for r in range(col + 1, n):
                        f = m[r][col] / m[col][col]
                        for c in range(col, n + 1):
                            m[r][c] -= f * m[col][c]
                x = [0.0] * n
                for r in range(n - 1, -1, -1):
                    s = m[r][n]
                    for c in range(r + 1, n):
                        s -= m[r][c] * x[c]
                    x[r] = s / m[r][r]
                return x


            def fit(xs, ys, degree, lam):
                p = degree + 1
                a = [[0.0] * p for _ in range(p)]
                b = [0.0] * p
                for x, y in zip(xs, ys):
                    powers = [x**j for j in range(p)]
                    for i in range(p):
                        b[i] += powers[i] * y
                        for j in range(p):
                            a[i][j] += powers[i] * powers[j]
                for i in range(1, p):
                    a[i][i] += lam
                return solve(a, b)


            def mse(coef, xs, ys):
                total = 0.0
                for x, y in zip(xs, ys):
                    pred = 0.0
                    for j, c in enumerate(coef):
                        pred += c * x**j
                    total += (pred - y) ** 2
                return total / len(xs)


            def size(coef):
                total = 0.0
                for c in coef[1:]:
                    total += c * c
                return sqrt(total)


            uniform = make_rng(42)
            x_train = [-1 + 2 * i / 11 for i in range(12)]
            x_test = [-1 + 2 * (i + 0.5) / 12 for i in range(12)]
            y_train = [sin(pi * x) + 0.25 * normal(uniform) for x in x_train]
            y_test = [sin(pi * x) + 0.25 * normal(uniform) for x in x_test]
            for degree in (1, 3, 9):
                c = fit(x_train, y_train, degree, 0.0)
                print(f"degree {degree}: train MSE {mse(c, x_train, y_train):.3f}, test MSE {mse(c, x_test, y_test):.3f}, coefficient size {size(c):.1f}")
            c = fit(x_train, y_train, 9, 0.01)
            print(f"degree 9 + ridge (lambda 0.01): train MSE {mse(c, x_train, y_train):.3f}, test MSE {mse(c, x_test, y_test):.3f}, coefficient size {size(c):.1f}")
          `,
        },
        r: {
          code: code`
            m_mod <- 2147483647

            make_rng <- function(seed) {
              state <- seed
              function() {
                state <<- (16807 * state) %% m_mod
                state / m_mod
              }
            }

            normal_draw <- function(uniform) {
              u1 <- uniform()
              u2 <- uniform()
              sqrt(-2 * log(u1)) * cos(2 * pi * u2)
            }

            solve_ge <- function(a, b) {
              n <- length(b)
              m <- cbind(a, b)
              for (col in seq_len(n)) {
                piv <- col
                if (col < n) for (r in (col + 1):n) if (abs(m[r, col]) > abs(m[piv, col])) piv <- r
                tmp <- m[col, ]
                m[col, ] <- m[piv, ]
                m[piv, ] <- tmp
                if (col < n) for (r in (col + 1):n) {
                  f <- m[r, col] / m[col, col]
                  for (cc in col:(n + 1)) m[r, cc] <- m[r, cc] - f * m[col, cc]
                }
              }
              x <- numeric(n)
              for (r in n:1) {
                s <- m[r, n + 1]
                if (r < n) for (cc in (r + 1):n) s <- s - m[r, cc] * x[cc]
                x[r] <- s / m[r, r]
              }
              x
            }

            fit <- function(xs, ys, degree, lam) {
              p <- degree + 1
              a <- matrix(0, p, p)
              b <- numeric(p)
              for (k in seq_along(xs)) {
                powers <- xs[k]^(0:degree)
                for (i in seq_len(p)) {
                  b[i] <- b[i] + powers[i] * ys[k]
                  for (j in seq_len(p)) a[i, j] <- a[i, j] + powers[i] * powers[j]
                }
              }
              if (p > 1) for (i in 2:p) a[i, i] <- a[i, i] + lam
              solve_ge(a, b)
            }

            mse <- function(coef, xs, ys) {
              total <- 0
              for (k in seq_along(xs)) {
                pred <- 0
                for (j in seq_along(coef)) pred <- pred + coef[j] * xs[k]^(j - 1)
                total <- total + (pred - ys[k])^2
              }
              total / length(xs)
            }

            coef_size <- function(coef) {
              total <- 0
              for (cc in coef[-1]) total <- total + cc * cc
              sqrt(total)
            }

            uniform <- make_rng(42)
            x_train <- -1 + 2 * (0:11) / 11
            x_test <- -1 + 2 * ((0:11) + 0.5) / 12
            y_train <- vapply(x_train, function(x) sin(pi * x) + 0.25 * normal_draw(uniform), numeric(1))
            y_test <- vapply(x_test, function(x) sin(pi * x) + 0.25 * normal_draw(uniform), numeric(1))
            for (degree in c(1, 3, 9)) {
              cf <- fit(x_train, y_train, degree, 0)
              cat(sprintf("degree %d: train MSE %.3f, test MSE %.3f, coefficient size %.1f\n", as.integer(degree), mse(cf, x_train, y_train), mse(cf, x_test, y_test), coef_size(cf)))
            }
            cf <- fit(x_train, y_train, 9, 0.01)
            cat(sprintf("degree 9 + ridge (lambda 0.01): train MSE %.3f, test MSE %.3f, coefficient size %.1f\n", mse(cf, x_train, y_train), mse(cf, x_test, y_test), coef_size(cf)))
          `,
        },
        expectedOutput: code`
        degree 1: train MSE 0.161, test MSE 0.179, coefficient size 1.0
        degree 3: train MSE 0.042, test MSE 0.093, coefficient size 2.9
        degree 9: train MSE 0.005, test MSE 0.118, coefficient size 34.7
        degree 9 + ridge (lambda 0.01): train MSE 0.011, test MSE 0.081, coefficient size 3.7
      `,
        tests: {
          python: code`
            def test_solver_matches_known_system():
                assert [round(v, 9) for v in solve([[2.0, 1.0], [1.0, 3.0]], [3.0, 5.0])] == [0.8, 1.4]


            def test_training_error_falls_with_degree():
                errs = [mse(fit(x_train, y_train, d, 0.0), x_train, y_train) for d in (1, 3, 9)]
                assert errs[0] > errs[1] > errs[2]


            def test_ridge_shrinks_coefficients():
                assert size(fit(x_train, y_train, 9, 0.01)) < size(fit(x_train, y_train, 9, 0.0))
          `,
          r: code`
            test_that("solver matches a known system", {
              expect_equal(solve_ge(matrix(c(2, 1, 1, 3), 2, 2), c(3, 5)), c(0.8, 1.4))
            })

            test_that("ridge shrinks coefficients", {
              expect_lt(coef_size(fit(x_train, y_train, 9, 0.01)), coef_size(fit(x_train, y_train, 9, 0)))
            })
          `,
        },
        eli5Trace: [
          "Twelve dots roughly follow a wave, with some random smudges.",
          "A straight ruler misses the wave: big errors on old and new dots alike.",
          "A gently curved line (degree 3) follows the wave and does well on new dots too.",
          "A very wiggly line (degree 9) hugs the old dots but swings wildly between them, so new dots are missed.",
          "Penalizing wiggles (ridge) tames the line: its coefficients shrink and new-dot error drops.",
        ],
        complexity: { time: "O(n·p² + p³)", space: "O(p²)" },
        edgeCases: [
          "More parameters than points makes XᵀX singular; ridge with λ > 0 still solves.",
          "Unscaled features make λ penalize some coefficients far more than others.",
          "Very high polynomial degrees on raw x are numerically unstable; scale x to [-1, 1] as here.",
          "λ chosen on the test set gives optimistic error estimates.",
        ],
        incorrect: {
          language: "python",
          code: code`
            best = min(range(1, 12), key=lambda d: mse(fit(x_train, y_train, d, 0.0), x_train, y_train))
          `,
          whyWrong: "Choosing the degree by training error always picks the most flexible model, because training error only goes down as degree goes up.",
          fix: "Choose degree and λ by validation or cross-validation error, then report test error once.",
        },
        walkthrough: [
          { python: "def solve(a, b):", pythonLines: 20, r: "solve_ge <- function(a, b) {", rLines: 21, eli5: "A little equation solver (Gaussian elimination). Both languages do exactly the same steps, so they get exactly the same numbers." },
          { python: "def fit(xs, ys, degree, lam):", pythonLines: 13, r: "fit <- function(xs, ys, degree, lam) {", rLines: 13, eli5: "Fit a curve: build the equations that say 'make the squared misses as small as possible', add lam to punish big wiggly coefficients, and solve." },
          { python: "def mse(coef, xs, ys):", pythonLines: 8, r: "mse <- function(coef, xs, ys) {", rLines: 9, eli5: "Mean squared error: how far each prediction misses, squared, then averaged." },
          { python: "y_train = [sin(pi * x)", pythonLines: 2, r: "y_train <- vapply(x_train", rLines: 2, eli5: "Make the dots: a sine wave plus a little random noise, using the same seeded generator in both languages." },
          { python: "for degree in (1, 3, 9):", pythonLines: 3, r: "for (degree in c(1, 3, 9)) {", rLines: 4, eli5: "Try a stiff, a medium and a very wiggly curve, and compare their errors on old dots and new dots." },
          { python: "c = fit(x_train, y_train, 9, 0.01)", pythonLines: 2, r: "cf <- fit(x_train, y_train, 9, 0.01)", rLines: 2, eli5: "Now give the wiggly curve a small penalty for wiggling and watch the coefficients shrink and the new-dot error fall." },
        ],
      },
      flow: {
        title: "Flexibility versus error",
        nodes: [
          node("simple", "Degree 1", 0, 110, "underfit: high bias"),
          node("right", "Degree 3", 230, 110, "just right"),
          node("complex", "Degree 9", 460, 110, "overfit: high variance"),
          node("ridge", "Degree 9 + ridge", 690, 110, "shrunk coefficients"),
        ],
        edges: [edge("simple", "right", "add flexibility"), edge("right", "complex", "add more"), edge("complex", "ridge", "penalize size")],
        steps: [
          step("simple", "", "A straight line cannot bend to the wave: both training and test errors are high. That is bias."),
          step("simple right", "simple-right", "A cubic follows the wave: both errors drop."),
          step("right complex", "right-complex", "Degree 9 nearly passes through every training point, but test error rises: it learned the noise. That is variance."),
          step("complex ridge", "complex-ridge", "Ridge adds λ times the squared coefficient size to the loss. Coefficients shrink and test error comes back down."),
        ],
      },
      practice: [
        {
          id: "w07-bv-recall-1",
          type: "recall",
          prompt: "Training accuracy 99%, validation accuracy 72%. Name three things you would try.",
          answer: "This is variance (overfitting): stronger regularization (L2, dropout, smaller trees, early stopping), simpler models or fewer features, more training data or augmentation, and check for leakage between train and validation.",
          rubric: ["Identifies variance", "Regularization", "More data", "Check leakage"],
        },
        {
          id: "w07-bv-recall-2",
          type: "recall",
          prompt: "What is the difference between L1 and L2 regularization in effect on coefficients?",
          answer: "L2 shrinks all coefficients smoothly toward zero but rarely to exactly zero; L1 can set coefficients exactly to zero, performing feature selection, because its penalty has a corner at zero.",
          rubric: ["L2 smooth shrinkage", "L1 exact zeros", "Feature selection"],
        },
        {
          id: "w07-bv-case-1",
          type: "case",
          prompt: "Your learning curve shows training and validation error converging at a high value as data grows. What does that tell you?",
          answer: "High bias: the model is too simple for the problem, so more data will not help. Add features, use a more flexible model or reduce regularization.",
          rubric: ["Converging high error", "Bias diagnosis", "More data will not help", "Increase capacity"],
        },
      ],
      references: [
        { title: "The Elements of Statistical Learning (Hastie, Tibshirani, Friedman), chapters 3 and 7", url: "https://hastie.su.domains/ElemStatLearn/", versionSensitive: false },
        { title: "An Introduction to Statistical Learning (James, Witten, Hastie, Tibshirani)", url: "https://www.statlearning.com/", versionSensitive: false },
      ],
      lastReviewed: REVIEWED,
    }),

    defineTopic({
      id: "w07-d03-cross-validation-tuning",
      slug: "cross-validation-tuning",
      title: "Cross-validation and hyperparameter tuning",
      domain: "ml",
      roles: ["data-scientist", "ml-engineer", "genai-engineer"],
      difficulty: "intermediate",
      minutes: 45,
      prerequisites: ["w07-d02-bias-variance-regularization"],
      objectives: [
        "Run k-fold cross-validation to choose a hyperparameter",
        "Refit on all training data and report test error once",
        "Explain nested CV and when grouped or time-based folds are required",
      ],
      summary:
        "Cross-validation rotates which part of the training data is held out, so every row is used for validation exactly once. Averaging the fold errors gives a steadier estimate for choosing hyperparameters than a single validation split, while the test set stays untouched until the end.",
      eli5: {
        analogy:
          "Practicing for a quiz with five stacks of flash cards. Study four stacks and quiz yourself on the fifth, then rotate so every stack gets a turn as the quiz. Your average score tells you which study method works best before the real exam.",
        steps: [
          "Split the training cards into 5 stacks.",
          "For each setting, train on 4 stacks and test on the 5th, five times.",
          "Average the five scores for that setting.",
          "Pick the setting with the best average, retrain on all stacks, and take the real exam once.",
        ],
        analogyLimit:
          "Flash cards are independent. Real rows often are not (the same user, the same day), and then folds must keep related rows together or follow time order.",
      },
      senior: {
        definition:
          "K-fold cross-validation partitions training data into k folds; each fold serves once as validation while the model trains on the rest. The CV error is the mean fold error. Hyperparameters are chosen by CV, the final model is refit on all training data, and the untouched test set gives one unbiased estimate.",
        invariants: [
          "Every training row is validated exactly once.",
          "Preprocessing is fitted inside each fold, not before splitting.",
          "The test set is not used for any choice.",
        ],
        mechanism: [
          "Six values of λ for a degree-9 ridge fit are each scored by 5-fold CV on the 12 training points.",
          "Folds here are assigned by index modulo 5 because x is already spread out; in practice shuffle rows first (or group or order them).",
          "The λ with the lowest mean CV error is refit on all 12 points and scored once on the 12 test points.",
          "Nested CV wraps this whole search in an outer loop when you need an unbiased estimate of the tuning procedure itself.",
        ],
        complexity: "k × (number of settings) model fits; random or Bayesian search reduces settings for large spaces.",
        tradeoffs: [
          { option: "K-fold (k = 5 or 10)", choose: "Moderate datasets with independent rows.", cost: "k times the training cost." },
          { option: "Group k-fold", choose: "Multiple rows per user, patient or session.", cost: "Fewer effective folds if groups are uneven." },
          { option: "Time-series split (expanding window)", choose: "Forecasting and anything time ordered.", cost: "Early folds have little training data." },
        ],
        failureModes: [
          "Scaling or selecting features on all data before CV.",
          "Random folds for time series, letting the model learn from the future.",
          "Reporting the best CV score as the expected production performance (optimistic after a big search).",
          "Splitting rows from one user across train and validation folds.",
        ],
        production:
          "Pipelines (scikit-learn Pipeline, tidymodels workflows) put preprocessing inside the CV loop. Large models use a single validation split plus early stopping because k-fold is too expensive; tuning services run random or Bayesian search in parallel.",
        interviewAnswer:
          "I split off a test set, then choose hyperparameters by k-fold CV on the training set with preprocessing inside each fold. For grouped data I use group folds and for time series an expanding window. I refit the best setting on all training data and evaluate on the test set once; if I need an honest estimate of the whole tuning process I use nested CV.",
      },
      implementation: {
        problem: "Choose the ridge penalty λ for a degree-9 polynomial with 5-fold cross-validation, then refit and score once on the test set.",
        input: "same 12 noisy training and 12 test points as the bias-variance lesson; λ in 0, 0.0001, 0.001, 0.01, 0.1, 1",
        python: {
          code: code`
            from math import cos, log, pi, sin, sqrt

            M = 2_147_483_647
            LAMBDAS = [0.0, 0.0001, 0.001, 0.01, 0.1, 1.0]


            def make_rng(seed):
                state = [seed]

                def uniform():
                    state[0] = (16807 * state[0]) % M
                    return state[0] / M

                return uniform


            def normal(uniform):
                u1, u2 = uniform(), uniform()
                return sqrt(-2 * log(u1)) * cos(2 * pi * u2)


            def solve(a, b):
                n = len(b)
                m = [a[i][:] + [b[i]] for i in range(n)]
                for col in range(n):
                    piv = col
                    for r in range(col + 1, n):
                        if abs(m[r][col]) > abs(m[piv][col]):
                            piv = r
                    m[col], m[piv] = m[piv], m[col]
                    for r in range(col + 1, n):
                        f = m[r][col] / m[col][col]
                        for c in range(col, n + 1):
                            m[r][c] -= f * m[col][c]
                x = [0.0] * n
                for r in range(n - 1, -1, -1):
                    s = m[r][n]
                    for c in range(r + 1, n):
                        s -= m[r][c] * x[c]
                    x[r] = s / m[r][r]
                return x


            def fit(xs, ys, degree, lam):
                p = degree + 1
                a = [[0.0] * p for _ in range(p)]
                b = [0.0] * p
                for x, y in zip(xs, ys):
                    powers = [x**j for j in range(p)]
                    for i in range(p):
                        b[i] += powers[i] * y
                        for j in range(p):
                            a[i][j] += powers[i] * powers[j]
                for i in range(1, p):
                    a[i][i] += lam
                return solve(a, b)


            def mse(coef, xs, ys):
                total = 0.0
                for x, y in zip(xs, ys):
                    pred = 0.0
                    for j, c in enumerate(coef):
                        pred += c * x**j
                    total += (pred - y) ** 2
                return total / len(xs)


            def cv_error(xs, ys, lam, k=5):
                total = 0.0
                for fold in range(k):
                    tr = [i for i in range(len(xs)) if i % k != fold]
                    va = [i for i in range(len(xs)) if i % k == fold]
                    coef = fit([xs[i] for i in tr], [ys[i] for i in tr], 9, lam)
                    total += mse(coef, [xs[i] for i in va], [ys[i] for i in va])
                return total / k


            uniform = make_rng(42)
            x_train = [-1 + 2 * i / 11 for i in range(12)]
            x_test = [-1 + 2 * (i + 0.5) / 12 for i in range(12)]
            y_train = [sin(pi * x) + 0.25 * normal(uniform) for x in x_train]
            y_test = [sin(pi * x) + 0.25 * normal(uniform) for x in x_test]
            scores = [(lam, cv_error(x_train, y_train, lam)) for lam in LAMBDAS]
            for lam, err in scores:
                print(f"lambda {lam:<6} 5-fold CV MSE {err:.3f}")
            best = min(scores, key=lambda s: s[1])[0]
            final = fit(x_train, y_train, 9, best)
            print(f"chosen lambda {best}; test MSE after refitting on all training data {mse(final, x_test, y_test):.3f}")
          `,
        },
        r: {
          code: code`
            m_mod <- 2147483647
            lambdas <- c(0, 0.0001, 0.001, 0.01, 0.1, 1)

            make_rng <- function(seed) {
              state <- seed
              function() {
                state <<- (16807 * state) %% m_mod
                state / m_mod
              }
            }

            normal_draw <- function(uniform) {
              u1 <- uniform()
              u2 <- uniform()
              sqrt(-2 * log(u1)) * cos(2 * pi * u2)
            }

            solve_ge <- function(a, b) {
              n <- length(b)
              m <- cbind(a, b)
              for (col in seq_len(n)) {
                piv <- col
                if (col < n) for (r in (col + 1):n) if (abs(m[r, col]) > abs(m[piv, col])) piv <- r
                tmp <- m[col, ]
                m[col, ] <- m[piv, ]
                m[piv, ] <- tmp
                if (col < n) for (r in (col + 1):n) {
                  f <- m[r, col] / m[col, col]
                  for (cc in col:(n + 1)) m[r, cc] <- m[r, cc] - f * m[col, cc]
                }
              }
              x <- numeric(n)
              for (r in n:1) {
                s <- m[r, n + 1]
                if (r < n) for (cc in (r + 1):n) s <- s - m[r, cc] * x[cc]
                x[r] <- s / m[r, r]
              }
              x
            }

            fit <- function(xs, ys, degree, lam) {
              p <- degree + 1
              a <- matrix(0, p, p)
              b <- numeric(p)
              for (k in seq_along(xs)) {
                powers <- xs[k]^(0:degree)
                for (i in seq_len(p)) {
                  b[i] <- b[i] + powers[i] * ys[k]
                  for (j in seq_len(p)) a[i, j] <- a[i, j] + powers[i] * powers[j]
                }
              }
              if (p > 1) for (i in 2:p) a[i, i] <- a[i, i] + lam
              solve_ge(a, b)
            }

            mse <- function(coef, xs, ys) {
              total <- 0
              for (k in seq_along(xs)) {
                pred <- 0
                for (j in seq_along(coef)) pred <- pred + coef[j] * xs[k]^(j - 1)
                total <- total + (pred - ys[k])^2
              }
              total / length(xs)
            }

            cv_error <- function(xs, ys, lam, k = 5) {
              total <- 0
              idx <- seq_along(xs) - 1
              for (fold in 0:(k - 1)) {
                tr <- which(idx %% k != fold)
                va <- which(idx %% k == fold)
                coef <- fit(xs[tr], ys[tr], 9, lam)
                total <- total + mse(coef, xs[va], ys[va])
              }
              total / k
            }

            uniform <- make_rng(42)
            x_train <- -1 + 2 * (0:11) / 11
            x_test <- -1 + 2 * ((0:11) + 0.5) / 12
            y_train <- vapply(x_train, function(x) sin(pi * x) + 0.25 * normal_draw(uniform), numeric(1))
            y_test <- vapply(x_test, function(x) sin(pi * x) + 0.25 * normal_draw(uniform), numeric(1))
            errs <- vapply(lambdas, function(l) cv_error(x_train, y_train, l), numeric(1))
            labels <- c("0.0", "0.0001", "0.001", "0.01", "0.1", "1.0")
            for (i in seq_along(lambdas)) cat(sprintf("lambda %-6s 5-fold CV MSE %.3f\n", labels[i], errs[i]))
            best <- which.min(errs)
            final <- fit(x_train, y_train, 9, lambdas[best])
            cat(sprintf("chosen lambda %s; test MSE after refitting on all training data %.3f\n", labels[best], mse(final, x_test, y_test)))
          `,
        },
        expectedOutput: code`
        lambda 0.0    5-fold CV MSE 27.478
        lambda 0.0001 5-fold CV MSE 1.371
        lambda 0.001  5-fold CV MSE 0.098
        lambda 0.01   5-fold CV MSE 0.212
        lambda 0.1    5-fold CV MSE 0.239
        lambda 1.0    5-fold CV MSE 0.243
        chosen lambda 0.001; test MSE after refitting on all training data 0.080
      `,
        tests: {
          python: code`
            def test_every_row_is_validated_once():
                seen = sorted(i for fold in range(5) for i in range(12) if i % 5 == fold)
                assert seen == list(range(12))


            def test_cv_prefers_some_regularization_here():
                errs = dict(scores)
                assert min(errs.values()) < errs[0.0]


            def test_chosen_lambda_is_in_grid():
                assert best in LAMBDAS
          `,
          r: code`
            test_that("every row is validated once", {
              idx <- 0:11
              expect_equal(sort(unlist(lapply(0:4, function(f) which(idx %% 5 == f)))), 1:12)
            })

            test_that("cv prefers some regularization", {
              expect_lt(min(errs), errs[1])
            })
          `,
        },
        eli5Trace: [
          "Twelve training dots are split into 5 stacks.",
          "For each penalty strength, train on 4 stacks and check the 5th, rotating five times, then average.",
          "No penalty overfits the stacks it trained on and scores badly on the held-out stack.",
          "The best average wins; retrain with it on all 12 dots.",
          "Only now look at the 12 test dots, once.",
        ],
        complexity: { time: "folds × settings × fit cost", space: "O(p²) per fit" },
        edgeCases: [
          "With tiny folds, CV error is noisy; repeat CV with different shuffles.",
          "Ties between settings: prefer the simpler (more regularized) one.",
          "Classification with rare classes: use stratified folds.",
          "Time-ordered data: never let a fold train on rows after its validation rows.",
        ],
        incorrect: {
          language: "python",
          code: code`
            best = min(LAMBDAS, key=lambda lam: mse(fit(x_train, y_train, 9, lam), x_test, y_test))
          `,
          whyWrong: "Choosing λ by test error turns the test set into a validation set, so the reported test error is optimistically biased.",
          fix: "Choose λ by cross-validation on the training data and evaluate on the test set once.",
        },
        walkthrough: [
          { python: "LAMBDAS = [", r: "lambdas <- c(", eli5: "The penalty strengths we want to compare, from none to strong." },
          { python: "def cv_error(xs, ys, lam, k=5):", pythonLines: 8, r: "cv_error <- function(xs, ys, lam, k = 5) {", rLines: 11, eli5: "Cross-validation: for each of 5 stacks, train on the other 4 and measure error on this one. Average the five errors." },
          { python: "scores = [(lam, cv_error(", pythonLines: 3, r: "errs <- vapply(lambdas", rLines: 3, eli5: "Score every penalty strength the same way and print the averages." },
          { python: "best = min(scores, key=lambda s: s[1])[0]", r: "best <- which.min(errs)", eli5: "Pick the strength with the smallest average error." },
          { python: "final = fit(x_train, y_train, 9, best)", pythonLines: 2, r: "final <- fit(x_train, y_train, 9, lambdas[best])", rLines: 2, eli5: "Retrain on all training dots with that strength, then check the untouched test dots exactly once." },
        ],
      },
      flow: {
        title: "Five-fold cross-validation",
        nodes: [
          node("train", "Training data", 0, 120, "12 rows"),
          node("folds", "5 folds", 210, 120, "rotate validation"),
          node("scores", "Mean CV error", 420, 120, "per λ"),
          node("best", "Best λ", 630, 120, "lowest CV error"),
          node("refit", "Refit on all training", 840, 60, ""),
          node("test", "Test once", 840, 190, "unbiased estimate"),
        ],
        edges: [edge("train", "folds"), edge("folds", "scores"), edge("scores", "best"), edge("best", "refit"), edge("refit", "test")],
        steps: [
          step("train folds", "train-folds", "Split training rows into 5 folds. Each fold takes one turn as the validation set."),
          step("folds scores", "folds-scores", "For every λ, fit on 4 folds, score on the 5th, and average the 5 scores."),
          step("scores best", "scores-best", "The λ with the lowest mean CV error wins."),
          step("best refit test", "best-refit refit-test", "Refit with that λ on all training rows and evaluate on the test set exactly once."),
        ],
      },
      practice: [
        {
          id: "w07-cv-recall-1",
          type: "recall",
          prompt: "Why is the best cross-validation score after a large hyperparameter search optimistic?",
          answer: "Picking the maximum of many noisy estimates favors settings that got lucky on these folds (selection bias). Nested CV or a separate test set gives an unbiased estimate.",
          rubric: ["Selection over noise", "Optimistic bias", "Nested CV or test set"],
        },
        {
          id: "w07-cv-case-1",
          type: "case",
          prompt: "A churn model gets 0.92 AUC in random 5-fold CV but 0.71 in production. Each customer has 12 monthly rows. What happened?",
          answer: "Rows from the same customer were split across folds, so the model memorized customers; and random folds let it learn from future months. Use group folds by customer and a time-based split.",
          rubric: ["Same customer in train and validation", "Temporal leakage", "Group and time-based folds"],
        },
        {
          id: "w07-cv-recall-2",
          type: "recall",
          prompt: "Compare grid search, random search and Bayesian optimization.",
          answer: "Grid tries every combination and scales badly with dimensions; random search samples settings and finds good regions faster when only a few hyperparameters matter; Bayesian optimization models the score surface to choose promising settings, saving fits at the cost of more machinery.",
          rubric: ["Grid exhaustive", "Random efficient in high dimensions", "Bayesian uses a surrogate model"],
        },
      ],
      references: [
        { title: "scikit-learn user guide: Cross-validation: evaluating estimator performance", url: "https://scikit-learn.org/stable/modules/cross_validation.html", versionSensitive: true },
        { title: "Random Search for Hyper-Parameter Optimization (Bergstra and Bengio, JMLR, 2012)", versionSensitive: false },
      ],
      lastReviewed: REVIEWED,
    }),

    defineTopic({
      id: "w07-d05-imbalanced-data",
      slug: "imbalanced-data",
      title: "Imbalanced classes, thresholds and costs",
      domain: "ml",
      roles: ["data-scientist", "ml-engineer", "data-analyst"],
      difficulty: "intermediate",
      minutes: 50,
      prerequisites: ["w07-d03-classification-metrics"],
      objectives: [
        "Explain why accuracy misleads when positives are rare",
        "Choose a decision threshold from precision, recall and business costs",
        "Compare class weights, resampling and threshold moving",
      ],
      summary:
        "When 2% of cases are fraud, a model that never flags fraud is 98% accurate and useless. With rare positives, judge models by precision, recall and PR curves, and pick the threshold from the cost of each kind of mistake, not from 0.5 by habit.",
      eli5: {
        analogy:
          "A smoke alarm in a house where real fires are very rare. An alarm that never rings is 'right' almost every day but fails at its one job. A sensitive alarm sometimes rings for toast. You choose how sensitive to make it by asking how bad a missed fire is compared with a false alarm.",
        steps: [
          "Count real fires and false alarms, not just 'days it was right'.",
          "Lower the threshold to catch more fires (more toast alarms too).",
          "Raise it to cut false alarms (more missed fires too).",
          "Pick the setting with the lowest total cost.",
        ],
        analogyLimit:
          "A smoke alarm's costs are obvious. In business the costs of a missed fraud or a blocked good customer must be estimated, and they change over time.",
      },
      senior: {
        definition:
          "With class imbalance, accuracy is dominated by the majority class. Precision = TP / (TP + FP), recall = TP / (TP + FN); the PR curve and its area are informative when positives are rare. The optimal threshold minimizes expected cost: cost_FN × FN + cost_FP × FP.",
        invariants: [
          "Lowering the threshold never decreases recall and usually decreases precision.",
          "Threshold choice does not change the ranking quality (ROC-AUC, PR-AUC), only the operating point.",
          "Resampling or reweighting changes predicted probabilities, so recalibrate before using them as probabilities.",
        ],
        mechanism: [
          "1,000 cases with 20 positives: predicting all negative gives 98% accuracy and 0% recall.",
          "At threshold 0.5 the model still misses 8 of 20 positives while raising 219 false alarms; lowering the threshold raises recall and lowers precision, and the cost weights decide where to stop.",
          "With a missed positive costing 50 and a false alarm costing 1, scanning thresholds picks a low cut-off that accepts many false alarms.",
          "Scores come from a seeded generator so both languages see the same cases.",
        ],
        complexity: "O(n log n) to sort scores once; each threshold is then O(1) with cumulative counts (this lesson recounts for clarity).",
        tradeoffs: [
          { option: "Threshold moving", choose: "Always: it is cheap and directly targets costs.", cost: "Needs cost estimates and validation data." },
          { option: "Class weights", choose: "Models that support them (logistic regression, boosting).", cost: "Distorts probabilities; recalibrate." },
          { option: "Resampling (undersample or SMOTE)", choose: "Very large majority classes or models without weights.", cost: "Discards data or invents synthetic points; easy to leak if done before splitting." },
        ],
        failureModes: [
          "Reporting accuracy or ROC-AUC alone for a 1% positive rate.",
          "Oversampling before the train/test split, so duplicates of test positives appear in training.",
          "Using the default 0.5 threshold after training with class weights.",
          "Ignoring that the positive rate in production differs from the training sample.",
        ],
        production:
          "Fraud and abuse systems use cost-based thresholds, often with tiers (auto-block, manual review, allow), monitor precision and recall on labeled samples, and revisit thresholds as fraud patterns and costs change.",
        interviewAnswer:
          "With 2% positives, accuracy is meaningless, so I look at precision, recall and the PR curve. I keep the model's ranking, then choose the threshold that minimizes expected cost using estimates like 'a missed fraud costs 50 times a false alarm'. Class weights or resampling can help training, but I resample only inside the training split and recalibrate probabilities afterward.",
      },
      implementation: {
        problem: "Score 1,000 cases with 2% positives, show the accuracy trap, compare thresholds, and pick the cost-minimizing threshold.",
        input: "1,000 cases, every 50th is positive; scores from a seeded generator (positives score higher on average); cost of a miss 50, of a false alarm 1",
        python: {
          code: code`
            M = 2_147_483_647


            def make_rng(seed):
                state = [seed]

                def uniform():
                    state[0] = (16807 * state[0]) % M
                    return state[0] / M

                return uniform


            def counts(labels, scores, threshold):
                tp = fp = fn = tn = 0
                for y, s in zip(labels, scores):
                    pred = 1 if s >= threshold else 0
                    if pred and y:
                        tp += 1
                    elif pred:
                        fp += 1
                    elif y:
                        fn += 1
                    else:
                        tn += 1
                return tp, fp, fn, tn


            uniform = make_rng(99)
            labels = [1 if i % 50 == 0 else 0 for i in range(1000)]
            scores = [0.3 + 0.7 * uniform() if y else 0.65 * uniform() for y in labels]
            positives = sum(labels)
            print(f"{len(labels)} cases, {positives} positive ({100 * positives / len(labels):.1f}%)")
            print(f"always predict negative: accuracy {100 * (len(labels) - positives) / len(labels):.1f}%, recall 0.0%")
            for t in (0.5, 0.4, 0.3):
                tp, fp, fn, tn = counts(labels, scores, t)
                precision = tp / (tp + fp) if tp + fp else 0.0
                recall = tp / (tp + fn)
                print(f"threshold {t:.2f}: TP={tp} FP={fp} FN={fn}  precision {precision:.3f} recall {recall:.3f} accuracy {(tp + tn) / len(labels):.3f}")
            costs = []
            for k in range(1, 20):
                tp, fp, fn, tn = counts(labels, scores, k / 20)
                costs.append((50 * fn + fp, k / 20))
            cost, best = min(costs)
            print(f"cost-minimizing threshold (miss = 50, false alarm = 1): {best:.2f} with total cost {cost}")
          `,
        },
        r: {
          code: code`
            m_mod <- 2147483647

            make_rng <- function(seed) {
              state <- seed
              function() {
                state <<- (16807 * state) %% m_mod
                state / m_mod
              }
            }

            counts <- function(labels, scores, threshold) {
              pred <- as.integer(scores >= threshold)
              c(tp = sum(pred == 1 & labels == 1), fp = sum(pred == 1 & labels == 0), fn = sum(pred == 0 & labels == 1), tn = sum(pred == 0 & labels == 0))
            }

            uniform <- make_rng(99)
            labels <- as.integer((0:999) %% 50 == 0)
            scores <- vapply(labels, function(y) if (y == 1) 0.3 + 0.7 * uniform() else 0.65 * uniform(), numeric(1))
            positives <- sum(labels)
            cat(sprintf("%d cases, %d positive (%.1f%%)\n", length(labels), positives, 100 * positives / length(labels)))
            cat(sprintf("always predict negative: accuracy %.1f%%, recall 0.0%%\n", 100 * (length(labels) - positives) / length(labels)))
            for (t in c(0.5, 0.4, 0.3)) {
              k <- counts(labels, scores, t)
              precision <- if (k[["tp"]] + k[["fp"]] > 0) k[["tp"]] / (k[["tp"]] + k[["fp"]]) else 0
              recall <- k[["tp"]] / (k[["tp"]] + k[["fn"]])
              cat(sprintf("threshold %.2f: TP=%d FP=%d FN=%d  precision %.3f recall %.3f accuracy %.3f\n", t, k[["tp"]], k[["fp"]], k[["fn"]], precision, recall, (k[["tp"]] + k[["tn"]]) / length(labels)))
            }
            thresholds <- (1:19) / 20
            cost <- vapply(thresholds, function(t) {
              k <- counts(labels, scores, t)
              50 * k[["fn"]] + k[["fp"]]
            }, numeric(1))
            best <- which.min(cost)
            cat(sprintf("cost-minimizing threshold (miss = 50, false alarm = 1): %.2f with total cost %d\n", thresholds[best], as.integer(cost[best])))
          `,
        },
        expectedOutput: code`
        1000 cases, 20 positive (2.0%)
        always predict negative: accuracy 98.0%, recall 0.0%
        threshold 0.50: TP=12 FP=219 FN=8  precision 0.052 recall 0.600 accuracy 0.773
        threshold 0.40: TP=17 FP=357 FN=3  precision 0.045 recall 0.850 accuracy 0.640
        threshold 0.30: TP=20 FP=527 FN=0  precision 0.037 recall 1.000 accuracy 0.473
        cost-minimizing threshold (miss = 50, false alarm = 1): 0.40 with total cost 507
      `,
        tests: {
          python: code`
            def test_lower_threshold_never_lowers_recall():
                recalls = []
                for t in (0.9, 0.7, 0.5, 0.3, 0.1):
                    tp, fp, fn, tn = counts(labels, scores, t)
                    recalls.append(tp / (tp + fn))
                assert recalls == sorted(recalls)


            def test_counts_cover_every_case():
                assert sum(counts(labels, scores, 0.42)) == 1000


            def test_zero_threshold_flags_everything():
                tp, fp, fn, tn = counts(labels, scores, 0.0)
                assert fn == 0 and tn == 0
          `,
          r: code`
            test_that("counts cover every case", {
              expect_equal(sum(counts(labels, scores, 0.42)), 1000)
            })

            test_that("zero threshold flags everything", {
              k <- counts(labels, scores, 0)
              expect_equal(k[["fn"]] + k[["tn"]], 0)
            })
          `,
        },
        eli5Trace: [
          "Out of 1,000 days, only 20 have a real fire.",
          "An alarm that never rings is right 98% of the time but misses every fire.",
          "Ringing at a high score still misses some fires and rings for lots of toast; lowering the score catches every fire but rings for even more toast.",
          "If a missed fire is 50 times worse than a toast alarm, the cheapest setting is a fairly sensitive alarm.",
        ],
        complexity: { time: "O(n) per threshold here; O(n log n) overall with sorting", space: "O(n)" },
        edgeCases: [
          "No predicted positives: precision is undefined; report it as 0 or 'n/a' and say so.",
          "Ties at the threshold: decide whether >= or > and use it consistently.",
          "Costs that depend on the amount (a large fraud costs more) need value-weighted thresholds.",
          "A shift in the base rate in production changes precision even if the model is unchanged.",
        ],
        incorrect: {
          language: "python",
          code: code`
            X_res, y_res = SMOTE().fit_resample(X, y)
            X_train, X_test, y_train, y_test = train_test_split(X_res, y_res)
          `,
          whyWrong: "Oversampling before splitting puts synthetic copies of test positives into training and makes the test set artificially balanced, so evaluation is both leaky and unrepresentative.",
          fix: "Split first, resample only the training split (inside each CV fold), and evaluate on data with the real class balance.",
        },
        walkthrough: [
          { python: "def counts(labels, scores, threshold):", pythonLines: 14, r: "counts <- function(labels, scores, threshold) {", rLines: 4, eli5: "For one alarm setting, count the four outcomes: caught fires, false alarms, missed fires and quiet good days." },
          { python: "labels = [1 if i % 50 == 0 else 0", pythonLines: 2, r: "labels <- as.integer((0:999) %% 50 == 0)", rLines: 2, eli5: "Make 1,000 days with a fire on every 50th day. Fire days tend to get higher smoke scores, but not always." },
          { python: 'print(f"always predict negative', r: 'cat(sprintf("always predict negative', eli5: "The never-ring alarm: 98% 'accurate' and completely useless." },
          { python: "for t in (0.5, 0.4, 0.3):", pythonLines: 5, r: "for (t in c(0.5, 0.4, 0.3)) {", rLines: 6, eli5: "Try three settings. Lower settings catch more fires (recall up) but ring for more toast (precision down)." },
          { python: "costs = []", pythonLines: 6, r: "thresholds <- (1:19) / 20", rLines: 7, eli5: "Give each mistake a price (a missed fire costs 50, a false alarm costs 1), try 19 settings and keep the cheapest." },
        ],
      },
      flow: {
        title: "Choosing an operating point",
        nodes: [
          node("scores", "Model scores", 0, 120, "ranking"),
          node("high", "High threshold", 230, 30, "fewer alarms, misses"),
          node("low", "Low threshold", 230, 210, "catches more, noisier"),
          node("costs", "Cost of errors", 470, 120, "miss 50, alarm 1"),
          node("pick", "Cheapest threshold", 700, 120, "operating point"),
        ],
        edges: [edge("scores", "high"), edge("scores", "low"), edge("high", "costs"), edge("low", "costs"), edge("costs", "pick")],
        steps: [
          step("scores", "", "The model ranks cases by score. Its ranking quality does not depend on any threshold."),
          step("scores high", "scores-high", "A high threshold flags fewer cases: fewer false alarms but more missed positives."),
          step("scores low", "scores-low", "A low threshold flags many: recall rises, precision falls."),
          step("high low costs pick", "high-costs low-costs costs-pick", "Price each mistake and pick the threshold with the lowest total cost. With misses 50× worse, a low threshold wins."),
        ],
      },
      practice: [
        {
          id: "w07-imb-recall-1",
          type: "recall",
          prompt: "Why is PR-AUC usually more informative than ROC-AUC for rare positives?",
          answer: "ROC uses the false positive rate, whose denominator is the huge number of negatives, so many false alarms barely move it. Precision directly shows what share of flagged cases are real, which is what changes when positives are rare.",
          rubric: ["FPR diluted by many negatives", "Precision reflects flagged quality"],
        },
        {
          id: "w07-imb-case-1",
          type: "case",
          prompt: "A fraud team can manually review 200 transactions a day. How do you set the threshold?",
          answer: "Treat review capacity as the constraint: rank by score and send the top 200 per day (a capacity-based threshold), auto-block only above a very high-precision threshold, and monitor precision of reviewed cases to adjust.",
          rubric: ["Capacity constraint", "Top-k by score", "Tiered actions", "Monitoring"],
        },
        {
          id: "w07-imb-recall-2",
          type: "recall",
          prompt: "After training with class weights, why might predicted probabilities be wrong?",
          answer: "Weighting changes the effective class prior, so the model's scores are shifted toward the minority class. Recalibrate on unweighted validation data (Platt scaling or isotonic regression) before treating scores as probabilities.",
          rubric: ["Shifted prior", "Recalibration methods"],
        },
      ],
      references: [
        { title: "The Precision-Recall Plot Is More Informative than the ROC Plot When Evaluating Binary Classifiers on Imbalanced Datasets (Saito and Rehmsmeier, PLOS ONE, 2015)", versionSensitive: false },
        { title: "imbalanced-learn documentation", url: "https://imbalanced-learn.org/stable/", versionSensitive: true },
      ],
      lastReviewed: REVIEWED,
    }),
  ],
};
