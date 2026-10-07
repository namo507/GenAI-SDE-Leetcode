import { REVIEWED, code, defineTopic, edge, node, step } from "../helpers";
import type { ExtraWeek } from "./types";

export const w05: ExtraWeek = {
  schedule: [
    {
      dayId: "w05-d01",
      topicId: "w05-d01-descriptive-stats-clt",
      tasks: [
        { label: "Center, spread, outliers and the central limit theorem", minutes: 30 },
        { label: "Run the CLT simulation", minutes: 15 },
      ],
    },
    {
      dayId: "w05-d02",
      topicId: "w05-d02-confidence-intervals-bootstrap",
      tasks: [
        { label: "Confidence intervals: t, Wilson and bootstrap", minutes: 30 },
        { label: "Interpretation prompts", minutes: 15 },
      ],
    },
    {
      dayId: "w05-d03",
      topicId: "w05-d03-multiple-testing",
      tasks: [
        { label: "Multiple testing and peeking", minutes: 25 },
        { label: "Run Bonferroni, Benjamini-Hochberg and the peeking simulation", minutes: 20 },
      ],
    },
  ],
  topics: [
    defineTopic({
      id: "w05-d01-descriptive-stats-clt",
      slug: "descriptive-stats-clt",
      title: "Descriptive statistics and the central limit theorem",
      domain: "statistics",
      roles: ["data-analyst", "data-scientist", "ml-engineer"],
      difficulty: "beginner",
      minutes: 45,
      prerequisites: ["w01-d04-dataframe-wrangling"],
      objectives: [
        "Choose mean or median, standard deviation or IQR depending on skew and outliers",
        "Flag outliers with the 1.5 × IQR rule and explain its limits",
        "Explain the central limit theorem and the 1/√n shrinkage of a mean's spread",
      ],
      summary:
        "Summaries describe a dataset's center and spread. Means and standard deviations are pulled by outliers; medians and IQRs are not. The central limit theorem says averages of many independent draws look normal even when single draws do not, which is why so much inference works.",
      eli5: {
        analogy:
          "Ten friends compare pocket money. Sharing it all out equally gives the mean; the friend standing in the middle of a line sorted by money gives the median. If one friend is secretly a millionaire, the mean jumps but the middle friend barely moves.",
        steps: [
          "Line everyone up from least to most.",
          "The middle person is the median; the even share is the mean.",
          "The middle half of the line shows the usual spread (the IQR).",
          "Anyone far outside that range is an outlier worth a second look.",
          "If you average handfuls of draws instead of single draws, the averages pile up in a neat bell shape.",
        ],
        analogyLimit:
          "Friends' pocket money is a small, complete group. In analysis we usually see a sample from a bigger population, so these summaries are estimates with uncertainty, and the bell shape only appears when draws are independent and handfuls are big enough.",
      },
      senior: {
        definition:
          "Location (mean, median), dispersion (variance, standard deviation, IQR) and shape (skewness) summarize a distribution. The central limit theorem states that the standardized mean of n independent draws with finite variance converges to a standard normal as n grows, with standard error σ/√n.",
        invariants: [
          "The sample standard deviation divides by n - 1 (Bessel's correction).",
          "Quantiles depend on a definition; this lesson uses the linear interpolation used by R's default (type 7) and NumPy's default.",
          "The standard error of a mean shrinks with √n, not n.",
        ],
        mechanism: [
          "One salary of 120 lifts the mean to 50.80 while the median stays at 43.00.",
          "The IQR rule flags values above Q3 + 1.5 × IQR (69.12 here), which catches 120.",
          "Exponential draws are strongly right skewed (skewness near 2); means of 30 draws are nearly symmetric with standard deviation close to 1/√30 ≈ 0.18.",
          "Random numbers come from the same small generator in Python and R, so both print the same simulation.",
        ],
        complexity: "Mean and variance O(n) in one pass (Welford); median and quantiles O(n log n) by sorting or O(n) with selection.",
        tradeoffs: [
          { option: "Mean and standard deviation", choose: "Roughly symmetric data, or when totals matter (revenue).", cost: "Sensitive to outliers." },
          { option: "Median and IQR", choose: "Skewed data like incomes, latencies, session lengths.", cost: "Harder to combine across groups; ignores tail magnitude." },
          { option: "Trimmed or winsorized mean", choose: "A compromise that limits outlier influence.", cost: "Needs a cut-off choice that must be reported." },
        ],
        failureModes: [
          "Reporting an average latency when the p95 is what users feel.",
          "Deleting outliers without checking whether they are errors or the most important customers.",
          "Applying the CLT to dependent data (time series) or heavy-tailed data without finite variance.",
          "Comparing standard deviations across groups with very different means instead of using a coefficient of variation.",
        ],
        production:
          "Dashboards show medians and percentiles for skewed metrics, and alerting uses robust statistics. A/B tests lean on the CLT to treat a difference in means as approximately normal once each group has enough users.",
        interviewAnswer:
          "For skewed data like salaries I report the median and IQR because one 120k salary moves the mean from 43 to 51 but barely moves the median. I flag outliers with 1.5 × IQR, then investigate rather than delete. The CLT says means of independent draws are approximately normal with standard error σ/√n, which justifies z and t tests on means even when the raw data is skewed.",
      },
      implementation: {
        problem: "Summarize 10 salaries with and without an outlier, then show the central limit theorem with simulated exponential draws.",
        input: "salaries 32 35 38 40 41 45 47 52 58 120 (thousands); 2,000 samples of 30 exponential draws from a seeded generator",
        python: {
          code: code`
            from math import floor, log, sqrt

            M = 2_147_483_647


            def make_rng(seed: int):
                state = [seed]

                def uniform() -> float:
                    state[0] = (16807 * state[0]) % M
                    return state[0] / M

                return uniform


            def mean(xs):
                return sum(xs) / len(xs)


            def sd(xs):
                m = mean(xs)
                return sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1))


            def quantile(xs, p):
                s = sorted(xs)
                h = (len(s) - 1) * p
                lo = floor(h)
                return s[lo] if lo + 1 >= len(s) else s[lo] + (h - lo) * (s[lo + 1] - s[lo])


            def skew(xs):
                m, s = mean(xs), sd(xs)
                return sum(((x - m) / s) ** 3 for x in xs) / len(xs)


            salaries = [32, 35, 38, 40, 41, 45, 47, 52, 58, 120]
            q1, q3 = quantile(salaries, 0.25), quantile(salaries, 0.75)
            fence = q3 + 1.5 * (q3 - q1)
            print(f"mean {mean(salaries):.2f}, median {quantile(salaries, 0.5):.2f}, sd {sd(salaries):.2f}")
            print(f"Q1 {q1:.2f}, Q3 {q3:.2f}, IQR {q3 - q1:.2f}, outliers above {fence:.2f}: {[x for x in salaries if x > fence]}")
            kept = [x for x in salaries if x <= fence]
            print(f"without outliers: mean {mean(kept):.2f}, median {quantile(kept, 0.5):.2f}")

            uniform = make_rng(2026)
            draws = [-log(uniform()) for _ in range(60_000)]
            means = [mean(draws[i:i + 30]) for i in range(0, 60_000, 30)]
            print(f"single exponential draws: mean {mean(draws):.2f}, sd {sd(draws):.2f}, skew {skew(draws):.2f}")
            print(f"means of 30 draws: mean {mean(means):.2f}, sd {sd(means):.2f} (theory {1 / sqrt(30):.2f}), skew {skew(means):.2f}")
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

            quantile7 <- function(xs, p) {
              s <- sort(xs)
              h <- (length(s) - 1) * p
              lo <- floor(h)
              if (lo + 1 >= length(s)) s[lo + 1] else s[lo + 1] + (h - lo) * (s[lo + 2] - s[lo + 1])
            }

            skew <- function(xs) sum(((xs - mean(xs)) / sd(xs))^3) / length(xs)

            salaries <- c(32, 35, 38, 40, 41, 45, 47, 52, 58, 120)
            q1 <- quantile7(salaries, 0.25)
            q3 <- quantile7(salaries, 0.75)
            fence <- q3 + 1.5 * (q3 - q1)
            cat(sprintf("mean %.2f, median %.2f, sd %.2f\n", mean(salaries), quantile7(salaries, 0.5), sd(salaries)))
            cat(sprintf("Q1 %.2f, Q3 %.2f, IQR %.2f, outliers above %.2f: [%s]\n", q1, q3, q3 - q1, fence, paste(salaries[salaries > fence], collapse = ", ")))
            kept <- salaries[salaries <= fence]
            cat(sprintf("without outliers: mean %.2f, median %.2f\n", mean(kept), quantile7(kept, 0.5)))

            uniform <- make_rng(2026)
            draws <- vapply(seq_len(60000), function(i) -log(uniform()), numeric(1))
            means <- colMeans(matrix(draws, nrow = 30))
            cat(sprintf("single exponential draws: mean %.2f, sd %.2f, skew %.2f\n", mean(draws), sd(draws), skew(draws)))
            cat(sprintf("means of 30 draws: mean %.2f, sd %.2f (theory %.2f), skew %.2f\n", mean(means), sd(means), 1 / sqrt(30), skew(means)))
          `,
        },
        expectedOutput: code`
        mean 50.80, median 43.00, sd 25.54
        Q1 38.50, Q3 50.75, IQR 12.25, outliers above 69.12: [120]
        without outliers: mean 43.11, median 41.00
        single exponential draws: mean 1.00, sd 1.00, skew 2.07
        means of 30 draws: mean 1.00, sd 0.18 (theory 0.18), skew 0.36
      `,
        tests: {
          python: code`
            def test_quantile_matches_type_7():
                assert quantile([1, 2, 3, 4], 0.25) == 1.75


            def test_sample_sd_uses_n_minus_1():
                assert abs(sd([2, 4, 4, 4, 5, 5, 7, 9]) - 2.138) < 0.001


            def test_rng_is_reproducible():
                a, b = make_rng(1), make_rng(1)
                assert [a() for _ in range(3)] == [b() for _ in range(3)]
          `,
          r: code`
            test_that("quantile matches R type 7", {
              expect_equal(quantile7(c(1, 2, 3, 4), 0.25), unname(quantile(c(1, 2, 3, 4), 0.25)))
            })

            test_that("generator is reproducible", {
              a <- make_rng(1)
              b <- make_rng(1)
              expect_equal(c(a(), a()), c(b(), b()))
            })
          `,
        },
        eli5Trace: [
          "Ten salaries, one of them huge (120).",
          "The even share (mean) is about 51, but the middle person (median) earns 43: the millionaire pulls the mean up.",
          "The middle half of salaries spans about 12k; anything above roughly 69k is flagged, and only 120 is.",
          "Without it, the mean drops to about 43 and sits right next to the median.",
          "Single random waiting times are lopsided, but averages of 30 of them form a neat, almost symmetric bell with a much smaller spread.",
        ],
        complexity: { time: "O(n log n) for quantiles (sorting), O(n) for mean and sd", space: "O(n)" },
        edgeCases: [
          "Quantile definitions differ between tools; state which one you use.",
          "With n = 1 the sample standard deviation is undefined (division by zero).",
          "Heavy-tailed data (for example Pareto with infinite variance) breaks the CLT.",
          "The IQR rule flags many points in naturally skewed data; consider a log scale first.",
        ],
        incorrect: {
          language: "python",
          code: code`
            import random
            random.seed(1)
            draws = [random.expovariate(1) for _ in range(1000)]
          `,
          whyWrong: "Correct statistics, but Python's and R's built-in random generators produce different numbers from the same seed, so a paired lesson would print different results in each language.",
          fix: "Use one explicit generator implemented identically in both languages (as here), or compare results statistically rather than digit by digit.",
        },
        walkthrough: [
          { python: "def make_rng(seed: int):", pythonLines: 8, r: "make_rng <- function(seed) {", rLines: 7, eli5: "A tiny random number machine: multiply, take the remainder, and repeat. Same seed, same numbers, in both languages." },
          { python: "def quantile(xs, p):", pythonLines: 5, r: "quantile7 <- function(xs, p) {", rLines: 6, eli5: "To find a quantile, sort the values and walk the right fraction of the way along the line, blending two neighbors if we land between them." },
          { python: "q1, q3 = quantile(salaries, 0.25)", pythonLines: 2, r: "q1 <- quantile7(salaries, 0.25)", rLines: 3, eli5: "The middle half of the line runs from Q1 to Q3. Anything more than one and a half middle-halves above Q3 is called an outlier." },
          { python: 'print(f"mean {mean(salaries):.2f}', pythonLines: 4, r: 'cat(sprintf("mean %.2f, median %.2f, sd %.2f', rLines: 4, eli5: "Print the even share (mean), the middle person (median), and how spread out everyone is, with and without the outlier." },
          { python: "draws = [-log(uniform()) for _ in range(60_000)]", r: "draws <- vapply(seq_len(60000)", eli5: "Make 60,000 random waiting times. Most are short, a few are long, so they are lopsided." },
          { python: "means = [mean(draws[i:i + 30])", pythonLines: 3, r: "means <- colMeans(matrix(draws, nrow = 30))", rLines: 3, eli5: "Average them in handfuls of 30. The averages are much less spread out and almost perfectly balanced: that is the central limit theorem." },
        ],
      },
      flow: {
        title: "From lopsided draws to a bell-shaped average",
        nodes: [
          node("draws", "Single draws", 0, 100, "skewed, sd 1"),
          node("hand", "Handfuls of 30", 230, 100, "independent"),
          node("avg", "Average each", 460, 100, "2,000 means"),
          node("bell", "Bell shape", 690, 100, "sd ≈ 1/√30"),
        ],
        edges: [edge("draws", "hand"), edge("hand", "avg"), edge("avg", "bell")],
        steps: [
          step("draws", "", "Exponential waiting times: most are short, a few are very long, so the shape is lopsided (skewness about 2)."),
          step("draws hand", "draws-hand", "Group independent draws into handfuls of 30."),
          step("hand avg", "hand-avg", "Average each handful. Long and short draws cancel out inside a handful."),
          step("avg bell", "avg-bell", "The 2,000 averages form a near-normal bell centered on 1 with spread close to 1/√30 ≈ 0.18: the central limit theorem."),
        ],
      },
      practice: [
        {
          id: "w05-desc-recall-1",
          type: "recall",
          prompt: "When would you report the median instead of the mean? Give a product example.",
          answer: "When data is skewed or has outliers, such as session length, order value or page latency, where a few extreme values would pull the mean far from a typical user.",
          rubric: ["Skew or outliers", "Concrete product metric", "Typical user framing"],
        },
        {
          id: "w05-desc-recall-2",
          type: "recall",
          prompt: "By how much does the standard error of a mean shrink if you quadruple the sample size?",
          answer: "It halves, because the standard error is σ/√n and √4 = 2.",
          rubric: ["σ/√n", "Halves"],
        },
        {
          id: "w05-desc-case-1",
          type: "case",
          prompt: "A dashboard's average order value jumped 18% overnight but the median did not move. What do you investigate?",
          answer: "A few very large orders (bulk buyer, fraud, test orders, currency bug) are pulling the mean. Check the top orders, the p99, and whether the change is concentrated in one customer or market before reporting a trend.",
          rubric: ["Outlier hypothesis", "Inspect tail", "Segment before concluding"],
        },
      ],
      references: [
        { title: "NIST/SEMATECH e-Handbook of Statistical Methods: measures of location, scale and skewness", url: "https://www.itl.nist.gov/div898/handbook/eda/section3/eda35.htm", versionSensitive: false },
        { title: "R documentation: quantile (the nine sample quantile types)", url: "https://stat.ethz.ch/R-manual/R-devel/library/stats/html/quantile.html", versionSensitive: false },
      ],
      lastReviewed: REVIEWED,
    }),

    defineTopic({
      id: "w05-d02-confidence-intervals-bootstrap",
      slug: "confidence-intervals-bootstrap",
      title: "Confidence intervals and the bootstrap",
      domain: "statistics",
      roles: ["data-analyst", "data-scientist", "ml-engineer"],
      difficulty: "intermediate",
      minutes: 45,
      prerequisites: ["w05-d01-descriptive-stats-clt"],
      objectives: [
        "Compute and interpret a t interval for a mean and a Wilson interval for a proportion",
        "Build a percentile bootstrap interval for any statistic",
        "Explain what 95% confidence does and does not mean",
      ],
      summary:
        "A confidence interval is a range computed from data by a procedure that captures the true value in a stated share of repeated experiments. Formulas exist for means and proportions; the bootstrap resamples your own data to get intervals for almost any statistic.",
      eli5: {
        analogy:
          "Throwing a hoop at a hidden peg. You cannot see the peg, but your throwing method lands the hoop around it 95 times out of 100. A confidence interval is one throw of that hoop. The bootstrap is practicing your throw by pretending your bag of samples is the whole world and drawing from it again and again.",
        steps: [
          "Measure your sample's average.",
          "Work out how much that average would wobble if you repeated the experiment.",
          "Draw a hoop of about two wobbles on each side.",
          "Bootstrap: redraw from your own sample many times, see how much the average moves, and keep the middle 95%.",
        ],
        analogyLimit:
          "Once a hoop has landed it either holds the peg or it does not: '95%' describes the throwing method, not this throw. And the bootstrap can only show variation that exists in your sample; with very small or biased samples it is overconfident.",
      },
      senior: {
        definition:
          "A 95% confidence interval procedure has a 95% coverage probability over repeated sampling. For a mean: x̄ ± t(0.975, n−1)·s/√n. For a proportion, the Wilson score interval has better coverage than the Wald interval near 0 or 1. The percentile bootstrap takes empirical quantiles of a statistic recomputed on resamples drawn with replacement.",
        invariants: [
          "Wider intervals mean more uncertainty; width shrinks with √n.",
          "The interval is random, the parameter is fixed.",
          "Bootstrap resamples have the same size as the original sample and are drawn with replacement.",
        ],
        mechanism: [
          "Twelve delivery times average 31.00 minutes with standard error s/√12; the t critical value for 11 degrees of freedom is 2.201.",
          "45 conversions out of 50 (90%): the Wald interval reaches past 98%, while Wilson pulls it back toward the middle.",
          "2,000 bootstrap means, sorted, give the 2.5% and 97.5% quantiles as the interval.",
          "The bootstrap median interval works the same way, where no simple formula exists.",
        ],
        complexity: "Formula intervals are O(n). The bootstrap is O(B · n) for B resamples (2,000 × 12 here).",
        tradeoffs: [
          { option: "t interval", choose: "Means of roughly normal data or moderate n.", cost: "Misleading for heavy skew with small n." },
          { option: "Wilson interval", choose: "Proportions, especially near 0 or 1 or with small n.", cost: "Slightly more algebra than Wald." },
          { option: "Bootstrap", choose: "Medians, ratios, model metrics, anything without a tidy formula.", cost: "Computation; poor for tiny samples and extremes like the max." },
        ],
        failureModes: [
          "Saying 'there is a 95% chance the true value is in this interval'.",
          "Using the Wald interval for rare events, giving impossible bounds below 0.",
          "Bootstrapping dependent data (time series, users with many sessions) as if rows were independent; resample whole users or blocks.",
          "Comparing two overlapping intervals instead of computing an interval for the difference.",
        ],
        production:
          "Experiment platforms report intervals on lifts rather than bare p-values, and ML teams bootstrap evaluation sets to put error bars on accuracy or AUC before claiming a model is better.",
        interviewAnswer:
          "A 95% interval comes from a procedure that covers the true value in 95% of repeated samples. For a mean I use x̄ ± t·s/√n; for a conversion rate I prefer Wilson over Wald, especially near 0 or 1. For a median or a model metric I bootstrap: resample with replacement thousands of times and take the 2.5th and 97.5th percentiles, resampling by user if rows are correlated.",
      },
      implementation: {
        problem: "Compute a t interval for mean delivery time, Wald and Wilson intervals for a conversion rate, and bootstrap intervals for the mean and median.",
        input: "delivery minutes 22 25 27 28 29 30 31 32 33 35 38 42; 45 conversions in 50 visits; 2,000 bootstrap resamples from a seeded generator",
        python: {
          code: code`
            from math import floor, sqrt

            M = 2_147_483_647
            T_975_DF11 = 2.201  # t critical value for 11 degrees of freedom, from tables
            Z = 1.96


            def make_rng(seed: int):
                state = [seed]

                def uniform() -> float:
                    state[0] = (16807 * state[0]) % M
                    return state[0] / M

                return uniform


            def mean(xs):
                return sum(xs) / len(xs)


            def sd(xs):
                m = mean(xs)
                return sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1))


            def quantile(xs, p):
                s = sorted(xs)
                h = (len(s) - 1) * p
                lo = floor(h)
                return s[lo] if lo + 1 >= len(s) else s[lo] + (h - lo) * (s[lo + 1] - s[lo])


            def wilson(k: int, n: int) -> tuple[float, float]:
                p = k / n
                centre = (p + Z * Z / (2 * n)) / (1 + Z * Z / n)
                half = Z * sqrt(p * (1 - p) / n + Z * Z / (4 * n * n)) / (1 + Z * Z / n)
                return centre - half, centre + half


            def bootstrap(xs, stat, b: int, seed: int) -> tuple[float, float]:
                uniform = make_rng(seed)
                n = len(xs)
                stats = [stat([xs[floor(uniform() * n)] for _ in range(n)]) for _ in range(b)]
                return quantile(stats, 0.025), quantile(stats, 0.975)


            times = [22, 25, 27, 28, 29, 30, 31, 32, 33, 35, 38, 42]
            se = sd(times) / sqrt(len(times))
            print(f"mean {mean(times):.2f} min, 95% t interval [{mean(times) - T_975_DF11 * se:.2f}, {mean(times) + T_975_DF11 * se:.2f}]")
            p = 45 / 50
            wald = (p - Z * sqrt(p * (1 - p) / 50), p + Z * sqrt(p * (1 - p) / 50))
            lo, hi = wilson(45, 50)
            print(f"conversion 45/50: Wald [{wald[0]:.3f}, {wald[1]:.3f}], Wilson [{lo:.3f}, {hi:.3f}]")
            b_lo, b_hi = bootstrap(times, mean, 2000, 7)
            print(f"bootstrap mean interval [{b_lo:.2f}, {b_hi:.2f}]")
            m_lo, m_hi = bootstrap(times, lambda xs: quantile(xs, 0.5), 2000, 7)
            print(f"bootstrap median interval [{m_lo:.2f}, {m_hi:.2f}]")
          `,
        },
        r: {
          code: code`
            m_mod <- 2147483647
            t_975_df11 <- 2.201
            z <- 1.96

            make_rng <- function(seed) {
              state <- seed
              function() {
                state <<- (16807 * state) %% m_mod
                state / m_mod
              }
            }

            quantile7 <- function(xs, p) {
              s <- sort(xs)
              h <- (length(s) - 1) * p
              lo <- floor(h)
              if (lo + 1 >= length(s)) s[lo + 1] else s[lo + 1] + (h - lo) * (s[lo + 2] - s[lo + 1])
            }

            wilson <- function(k, n) {
              p <- k / n
              centre <- (p + z^2 / (2 * n)) / (1 + z^2 / n)
              half <- z * sqrt(p * (1 - p) / n + z^2 / (4 * n^2)) / (1 + z^2 / n)
              c(centre - half, centre + half)
            }

            bootstrap <- function(xs, stat, b, seed) {
              uniform <- make_rng(seed)
              n <- length(xs)
              stats <- vapply(seq_len(b), function(i) stat(xs[vapply(seq_len(n), function(j) floor(uniform() * n), numeric(1)) + 1]), numeric(1))
              c(quantile7(stats, 0.025), quantile7(stats, 0.975))
            }

            times <- c(22, 25, 27, 28, 29, 30, 31, 32, 33, 35, 38, 42)
            se <- sd(times) / sqrt(length(times))
            cat(sprintf("mean %.2f min, 95%% t interval [%.2f, %.2f]\n", mean(times), mean(times) - t_975_df11 * se, mean(times) + t_975_df11 * se))
            p <- 45 / 50
            wald <- c(p - z * sqrt(p * (1 - p) / 50), p + z * sqrt(p * (1 - p) / 50))
            w <- wilson(45, 50)
            cat(sprintf("conversion 45/50: Wald [%.3f, %.3f], Wilson [%.3f, %.3f]\n", wald[1], wald[2], w[1], w[2]))
            bm <- bootstrap(times, mean, 2000, 7)
            cat(sprintf("bootstrap mean interval [%.2f, %.2f]\n", bm[1], bm[2]))
            bmed <- bootstrap(times, function(xs) quantile7(xs, 0.5), 2000, 7)
            cat(sprintf("bootstrap median interval [%.2f, %.2f]\n", bmed[1], bmed[2]))
          `,
        },
        expectedOutput: code`
        mean 31.00 min, 95% t interval [27.48, 34.52]
        conversion 45/50: Wald [0.817, 0.983], Wilson [0.786, 0.957]
        bootstrap mean interval [28.08, 33.75]
        bootstrap median interval [27.50, 34.00]
      `,
        tests: {
          python: code`
            def test_wilson_stays_inside_zero_one():
                lo, hi = wilson(0, 10)
                assert lo > -1e-12 and hi < 0.35  # lo is 0 up to floating-point rounding


            def test_bootstrap_interval_contains_sample_mean():
                lo, hi = bootstrap(times, mean, 500, 3)
                assert lo < mean(times) < hi


            def test_wider_with_less_data():
                assert wilson(9, 10)[1] - wilson(9, 10)[0] > wilson(90, 100)[1] - wilson(90, 100)[0]
          `,
          r: code`
            test_that("wilson stays inside zero and one", {
              w <- wilson(0, 10)
              expect_gt(w[1], -1e-12)
              expect_lt(w[2], 0.35)
            })

            test_that("bootstrap interval contains the sample mean", {
              b <- bootstrap(times, mean, 500, 3)
              expect_lt(b[1], mean(times))
              expect_gt(b[2], mean(times))
            })
          `,
        },
        eli5Trace: [
          "Twelve deliveries average 31 minutes.",
          "The average would wobble a bit if we watched another twelve deliveries; about two wobbles each way makes the hoop.",
          "For 45 sales out of 50 visits, the simple hoop pokes out past 98%; the Wilson hoop is better behaved near the edge.",
          "Bootstrap: pick 12 deliveries from our own list (repeats allowed), average them, and do it 2,000 times. The middle 95% of those averages is the hoop.",
          "The same trick works for the median, which has no easy formula.",
        ],
        complexity: { time: "O(n) for formulas; O(B · n) for the bootstrap", space: "O(B) bootstrap statistics" },
        edgeCases: [
          "Zero successes: the Wald interval collapses to [0, 0]; Wilson still gives a sensible upper bound.",
          "Tiny samples: bootstrap intervals are too narrow because the sample cannot show rare values.",
          "Correlated rows (many events per user): resample users, not events.",
          "The t critical value depends on degrees of freedom; 1.96 is only right for large n.",
        ],
        incorrect: {
          language: "python",
          code: code`
            lo, hi = 0.83, 0.97
            print(f"There is a 95% probability the true rate is between {lo} and {hi}")
          `,
          whyWrong: "That is a Bayesian credible-interval statement. A frequentist 95% interval means the procedure covers the true value in 95% of repeated samples; this particular interval either contains it or not.",
          fix: "Say 'we are 95% confident' or 'this procedure captures the true rate 95% of the time', or use a Bayesian model if you want probability statements about the parameter.",
        },
        walkthrough: [
          { python: "T_975_DF11 = 2.201", pythonLines: 2, r: "t_975_df11 <- 2.201", rLines: 2, eli5: "Two magic numbers from statistics tables: how many wobbles wide the hoop is for 12 data points (t) and for very many (z)." },
          { python: "def wilson(k: int, n: int)", pythonLines: 5, r: "wilson <- function(k, n) {", rLines: 6, eli5: "The Wilson hoop for a yes-or-no rate. It nudges the center toward the middle, so it never pokes outside 0% to 100%." },
          { python: "def bootstrap(xs, stat, b: int, seed: int)", pythonLines: 5, r: "bootstrap <- function(xs, stat, b, seed) {", rLines: 6, eli5: "The bootstrap: pick from our own data with repeats allowed, compute the statistic, do it thousands of times, and keep the middle 95%." },
          { python: "se = sd(times) / sqrt(len(times))", pythonLines: 2, r: "se <- sd(times) / sqrt(length(times))", rLines: 2, eli5: "The wobble of an average is the spread divided by the square root of how many we measured. The hoop is about 2.2 wobbles each side." },
          { python: "p = 45 / 50", pythonLines: 4, r: "p <- 45 / 50", rLines: 4, eli5: "For 45 sales out of 50, compare the simple hoop (Wald) with the better-behaved Wilson hoop." },
          { python: "b_lo, b_hi = bootstrap(times, mean, 2000, 7)", pythonLines: 4, r: "bm <- bootstrap(times, mean, 2000, 7)", rLines: 4, eli5: "Bootstrap hoops for the mean and the median, using the same seed so Python and R draw the same numbers." },
        ],
      },
      flow: {
        title: "Percentile bootstrap",
        nodes: [
          node("sample", "Sample", 0, 100, "12 deliveries"),
          node("resample", "Resample", 210, 100, "with replacement"),
          node("stat", "Statistic", 420, 100, "mean or median"),
          node("repeat", "Repeat 2,000×", 420, 230, ""),
          node("sort", "Sort statistics", 630, 100, ""),
          node("ci", "2.5% and 97.5%", 840, 100, "interval"),
        ],
        edges: [edge("sample", "resample"), edge("resample", "stat"), edge("stat", "repeat"), edge("repeat", "resample"), edge("stat", "sort"), edge("sort", "ci")],
        steps: [
          step("sample resample", "sample-resample", "Treat the sample as a stand-in for the population and draw 12 values from it with replacement."),
          step("resample stat", "resample-stat", "Compute the statistic on that resample."),
          step("stat repeat resample", "stat-repeat repeat-resample", "Repeat thousands of times to see how much the statistic moves from resample to resample."),
          step("stat sort ci", "stat-sort sort-ci", "Sort the 2,000 values and read off the 2.5th and 97.5th percentiles: that is the 95% interval."),
        ],
      },
      practice: [
        {
          id: "w05-ci-recall-1",
          type: "recall",
          prompt: "Your 95% interval for a lift is [-0.4%, 2.1%]. What can you conclude?",
          answer: "The data is consistent with a small negative effect up to about a 2% lift; zero is inside, so at the 5% level you cannot claim a positive effect. The decision should weigh whether a plausible effect up to 2.1% is worth more data.",
          rubric: ["Zero inside interval", "Range of plausible effects", "Decision framing"],
        },
        {
          id: "w05-ci-case-1",
          type: "case",
          prompt: "You bootstrap model accuracy on 10,000 test rows but rows come from 500 users. Your interval looks very narrow. What is wrong?",
          answer: "Rows from the same user are correlated, so resampling rows understates variance. Resample users (cluster bootstrap) and recompute accuracy on all of each sampled user's rows.",
          rubric: ["Correlated rows", "Cluster bootstrap by user", "Interval will widen"],
        },
        {
          id: "w05-ci-recall-2",
          type: "recall",
          prompt: "Why prefer Wilson over Wald for a 2 out of 40 conversion rate?",
          answer: "Wald assumes normality around p̂ and can give a lower bound below 0 with poor coverage for small counts; Wilson inverts the score test and stays within [0, 1] with better coverage.",
          rubric: ["Wald below zero", "Coverage", "Wilson bounded"],
        },
      ],
      references: [
        { title: "An Introduction to the Bootstrap (Efron and Tibshirani)", versionSensitive: false },
        { title: "Interval Estimation for a Binomial Proportion (Brown, Cai, DasGupta, Statistical Science, 2001)", versionSensitive: false },
      ],
      lastReviewed: REVIEWED,
    }),

    defineTopic({
      id: "w05-d03-multiple-testing",
      slug: "multiple-testing",
      title: "Multiple testing, peeking and false discoveries",
      domain: "statistics",
      roles: ["data-analyst", "data-scientist", "ml-engineer"],
      difficulty: "intermediate",
      minutes: 45,
      prerequisites: ["w05-d02-hypothesis-testing"],
      objectives: [
        "Compute the family-wise error rate for many tests and correct it with Bonferroni",
        "Apply the Benjamini-Hochberg procedure to control the false discovery rate",
        "Explain why peeking at a running A/B test inflates false positives",
      ],
      summary:
        "Every test at α = 0.05 has a 5% chance of a false alarm, so testing many metrics or checking a test every day almost guarantees a 'significant' result by luck. Corrections trade some power for honesty.",
      eli5: {
        analogy:
          "Buying lottery tickets. One ticket rarely wins, but buy twenty and something is likely to pay out by luck. If you then announce 'I found a winning strategy', you are fooling yourself. Corrections are like requiring a bigger win before you celebrate.",
        steps: [
          "One test has a small chance of a fake 'win'.",
          "Many tests add up those chances.",
          "Bonferroni: demand a much smaller p-value from each test.",
          "Benjamini-Hochberg: sort the p-values and accept a sliding bar, which keeps the share of fake wins small.",
          "Do not keep checking a running test and stop when it looks good.",
        ],
        analogyLimit:
          "Lottery tickets are truly independent. Real metrics are correlated (clicks and sessions move together), so the simple formulas are conservative; methods that model the correlation can be less strict.",
      },
      senior: {
        definition:
          "The family-wise error rate (FWER) is the probability of at least one false rejection among m tests; for independent tests at level α it is 1 − (1 − α)^m. Bonferroni tests each at α/m to control FWER. The false discovery rate (FDR) is the expected share of rejections that are false; Benjamini-Hochberg controls it at q by rejecting the k smallest p-values where k is the largest i with p(i) ≤ (i/m)·q.",
        invariants: [
          "Bonferroni controls FWER under any dependence between tests.",
          "Benjamini-Hochberg controls FDR for independent or positively dependent tests.",
          "A fixed-horizon test's α only holds if you analyze once at the planned sample size.",
        ],
        mechanism: [
          "With 20 independent metrics at 0.05, the chance of at least one false alarm is 1 − 0.95^20 ≈ 64%.",
          "Bonferroni lowers the bar to 0.05 / 20 = 0.0025.",
          "Benjamini-Hochberg sorts the p-values and finds the largest rank whose p-value is under its rank-scaled threshold, accepting more discoveries than Bonferroni.",
          "Simulated A/A tests checked 10 times stop 'significant' far more often than 5%, which is the peeking problem.",
        ],
        complexity: "Bonferroni O(m); Benjamini-Hochberg O(m log m) for sorting.",
        tradeoffs: [
          { option: "Bonferroni", choose: "A few critical metrics where any false alarm is costly.", cost: "Low power with many tests." },
          { option: "Benjamini-Hochberg", choose: "Screening many metrics, features or genes.", cost: "Controls the share of false discoveries, not their existence." },
          { option: "Sequential tests (alpha spending, always-valid p-values)", choose: "You need to monitor a test continuously.", cost: "More complex; wider intervals early on." },
        ],
        failureModes: [
          "Slicing results by 30 segments after the test and reporting the one that is significant.",
          "Stopping a test the first day it crosses p < 0.05.",
          "Choosing the primary metric after seeing results.",
          "Ignoring correlation and over-correcting, then missing real effects.",
        ],
        production:
          "Experiment platforms pre-register a primary metric, use guardrail metrics with corrections, and offer sequential testing so teams can monitor safely. Feature selection and anomaly alerting across many series need FDR thinking too.",
        interviewAnswer:
          "If I test 20 metrics at 0.05, the chance of at least one false positive is about 64%, so I pre-register one primary metric, apply Bonferroni to the few guardrails, and use Benjamini-Hochberg when screening many. I never stop a fixed-horizon test early because peeking inflates the false positive rate; if the team needs to monitor, I use a sequential design.",
      },
      implementation: {
        problem: "Compute the family-wise error for 20 tests, apply Bonferroni and Benjamini-Hochberg to 10 p-values, and simulate peeking in A/A tests.",
        input: "p-values 0.001 0.008 0.012 0.021 0.035 0.041 0.18 0.27 0.52 0.74; 1,000 simulated A/A tests checked 10 times each",
        python: {
          code: code`
            from math import cos, log, pi, sqrt

            M = 2_147_483_647


            def make_rng(seed: int):
                state = [seed]

                def uniform() -> float:
                    state[0] = (16807 * state[0]) % M
                    return state[0] / M

                return uniform


            def normal_pair(uniform) -> float:
                return sqrt(-2 * log(uniform())) * cos(2 * pi * uniform())


            def bonferroni(pvals: list[float], alpha: float) -> list[int]:
                return [i for i, p in enumerate(pvals) if p <= alpha / len(pvals)]


            def benjamini_hochberg(pvals: list[float], q: float) -> list[int]:
                order = sorted(range(len(pvals)), key=lambda i: pvals[i])
                k = 0
                for rank, i in enumerate(order, start=1):
                    if pvals[i] <= rank / len(pvals) * q:
                        k = rank
                return sorted(order[:k])


            def peeking_false_positive_rate(sims: int, looks: int, per_look: int, seed: int) -> float:
                uniform = make_rng(seed)
                hits = 0
                for _ in range(sims):
                    total, n = 0.0, 0
                    for _ in range(looks):
                        for _ in range(per_look):
                            total += normal_pair(uniform)  # difference between two identical arms
                            n += 1
                        if abs(total / sqrt(n)) > 1.96:
                            hits += 1
                            break
                return hits / sims


            print(f"20 independent tests at 0.05: P(at least one false alarm) = {1 - 0.95 ** 20:.3f}")
            pvals = [0.001, 0.008, 0.012, 0.021, 0.035, 0.041, 0.18, 0.27, 0.52, 0.74]
            print(f"uncorrected discoveries: {sum(p <= 0.05 for p in pvals)}")
            print(f"Bonferroni (threshold {0.05 / len(pvals):.4f}): tests {bonferroni(pvals, 0.05)}")
            print(f"Benjamini-Hochberg (q = 0.05): tests {benjamini_hochberg(pvals, 0.05)}")
            print(f"A/A tests checked once: false positive rate {peeking_false_positive_rate(1000, 1, 100, 11):.3f}")
            print(f"A/A tests checked 10 times: false positive rate {peeking_false_positive_rate(1000, 10, 10, 11):.3f}")
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

            bonferroni <- function(pvals, alpha) which(pvals <= alpha / length(pvals)) - 1

            benjamini_hochberg <- function(pvals, q) {
              ord <- order(pvals)
              k <- 0
              for (rank in seq_along(ord)) if (pvals[ord[rank]] <= rank / length(pvals) * q) k <- rank
              sort(ord[seq_len(k)]) - 1
            }

            peeking_false_positive_rate <- function(sims, looks, per_look, seed) {
              uniform <- make_rng(seed)
              hits <- 0
              for (s in seq_len(sims)) {
                total <- 0
                n <- 0
                for (l in seq_len(looks)) {
                  for (i in seq_len(per_look)) {
                    total <- total + normal_draw(uniform)
                    n <- n + 1
                  }
                  if (abs(total / sqrt(n)) > 1.96) {
                    hits <- hits + 1
                    break
                  }
                }
              }
              hits / sims
            }

            fmt <- function(ix) paste0("[", paste(ix, collapse = ", "), "]")
            cat(sprintf("20 independent tests at 0.05: P(at least one false alarm) = %.3f\n", 1 - 0.95^20))
            pvals <- c(0.001, 0.008, 0.012, 0.021, 0.035, 0.041, 0.18, 0.27, 0.52, 0.74)
            cat(sprintf("uncorrected discoveries: %d\n", sum(pvals <= 0.05)))
            cat(sprintf("Bonferroni (threshold %.4f): tests %s\n", 0.05 / length(pvals), fmt(bonferroni(pvals, 0.05))))
            cat(sprintf("Benjamini-Hochberg (q = 0.05): tests %s\n", fmt(benjamini_hochberg(pvals, 0.05))))
            cat(sprintf("A/A tests checked once: false positive rate %.3f\n", peeking_false_positive_rate(1000, 1, 100, 11)))
            cat(sprintf("A/A tests checked 10 times: false positive rate %.3f\n", peeking_false_positive_rate(1000, 10, 10, 11)))
          `,
        },
        expectedOutput: code`
        20 independent tests at 0.05: P(at least one false alarm) = 0.642
        uncorrected discoveries: 6
        Bonferroni (threshold 0.0050): tests [0]
        Benjamini-Hochberg (q = 0.05): tests [0, 1, 2]
        A/A tests checked once: false positive rate 0.040
        A/A tests checked 10 times: false positive rate 0.189
      `,
        tests: {
          python: code`
            def test_bonferroni_is_stricter_than_bh():
                p = [0.001, 0.01, 0.02, 0.03, 0.2]
                assert set(bonferroni(p, 0.05)) <= set(benjamini_hochberg(p, 0.05))


            def test_bh_with_no_signal_rejects_nothing():
                assert benjamini_hochberg([0.3, 0.5, 0.9], 0.05) == []


            def test_bh_step_up_includes_earlier_ranks():
                assert benjamini_hochberg([0.04, 0.01, 0.03, 0.02], 0.05) == [0, 1, 2, 3]
          `,
          r: code`
            test_that("BH with no signal rejects nothing", {
              expect_length(benjamini_hochberg(c(0.3, 0.5, 0.9), 0.05), 0)
            })

            test_that("BH matches p.adjust", {
              p <- c(0.001, 0.008, 0.012, 0.021, 0.035, 0.041, 0.18, 0.27, 0.52, 0.74)
              expect_equal(benjamini_hochberg(p, 0.05), which(p.adjust(p, "BH") <= 0.05) - 1)
            })

            test_that("bonferroni matches p.adjust", {
              p <- c(0.001, 0.008, 0.012, 0.021, 0.035)
              expect_equal(bonferroni(p, 0.05), which(p.adjust(p, "bonferroni") <= 0.05) - 1)
            })
          `,
        },
        eli5Trace: [
          "Twenty lottery tickets each with a 5% chance of a fake win: the chance at least one 'wins' is about 64%.",
          "Six of ten p-values are under 0.05 if we do not correct anything.",
          "Bonferroni asks each test to beat 0.005 instead: only the first test does.",
          "Benjamini-Hochberg uses a sliding bar that grows with rank and keeps more real-looking wins while limiting fakes.",
          "Pretend tests with no real difference: checking once says 'significant' about 5% of the time, but checking 10 times and stopping at the first good-looking day says it much more often.",
        ],
        complexity: { time: "O(m log m) for BH; the simulation is O(sims × samples)", space: "O(m)" },
        edgeCases: [
          "Ties in p-values: BH treats them by rank order, which is fine.",
          "Strongly correlated metrics make Bonferroni too strict.",
          "A single pre-registered primary metric needs no correction.",
          "Sequential designs need their own boundaries; corrections for multiple metrics still apply on top.",
        ],
        incorrect: {
          language: "python",
          code: code`
            for segment in segments:
                if p_value(segment) < 0.05:
                    print(f"Winner in {segment}!")
          `,
          whyWrong: "Testing many segments after the fact multiplies the chance of a false winner; with 20 segments a lucky one is more likely than not.",
          fix: "Pre-register the segments and correct (Bonferroni or BH), or treat post-hoc segments as hypotheses for a new test.",
        },
        walkthrough: [
          { python: "def normal_pair(uniform) -> float:", pythonLines: 2, r: "normal_draw <- function(uniform) {", rLines: 5, eli5: "Turn two flat random numbers into one bell-curve number (the Box-Muller trick)." },
          { python: "def bonferroni(pvals: list[float], alpha: float)", pythonLines: 2, r: "bonferroni <- function(pvals, alpha)", eli5: "Bonferroni: split the 5% allowance for mistakes evenly across all tests, so each test needs a much smaller p-value." },
          { python: "def benjamini_hochberg(pvals: list[float], q: float)", pythonLines: 7, r: "benjamini_hochberg <- function(pvals, q) {", rLines: 6, eli5: "Benjamini-Hochberg: sort the p-values, give each rank a slightly bigger bar, and accept everything up to the last one that clears its bar." },
          { python: "def peeking_false_positive_rate(", pythonLines: 14, r: "peeking_false_positive_rate <- function(", rLines: 18, eli5: "Simulate tests where nothing really changed. Peek after every batch and stop as soon as it looks significant, then count how often we were fooled." },
          { python: 'print(f"20 independent tests at 0.05', r: 'cat(sprintf("20 independent tests at 0.05', eli5: "The chance of at least one fake win in 20 tests is 1 minus the chance of none: about 64%." },
          { python: 'print(f"A/A tests checked once', pythonLines: 2, r: 'cat(sprintf("A/A tests checked once', rLines: 2, eli5: "Checking once fools us about 5% of the time; checking 10 times fools us far more often." },
        ],
      },
      flow: {
        title: "Benjamini-Hochberg in four moves",
        nodes: [
          node("tests", "10 tests", 0, 100, "raw p-values"),
          node("sort", "Sort", 200, 100, "smallest first"),
          node("bars", "Rank bars", 400, 100, "(i / m) × q"),
          node("cut", "Largest passing rank", 620, 100, "k"),
          node("disc", "Discoveries", 840, 100, "first k tests"),
        ],
        edges: [edge("tests", "sort"), edge("sort", "bars"), edge("bars", "cut"), edge("cut", "disc")],
        steps: [
          step("tests sort", "tests-sort", "Collect all p-values from the family of tests and sort them from smallest to largest."),
          step("sort bars", "sort-bars", "Give rank i the threshold (i / m) × q: 0.005 for the first, 0.010 for the second, and so on."),
          step("bars cut", "bars-cut", "Find the largest rank whose p-value is under its own bar; every smaller rank is accepted too (step-up)."),
          step("cut disc", "cut-disc", "Those tests are discoveries. On average at most 5% of them are false, compared with Bonferroni's stricter 'no false alarm at all'."),
        ],
      },
      practice: [
        {
          id: "w05-mt-recall-1",
          type: "recall",
          prompt: "What is the difference between controlling FWER and FDR?",
          answer: "FWER control bounds the probability of any false positive among all tests; FDR control bounds the expected proportion of false positives among the rejected tests. FDR is less strict and keeps more power when testing many hypotheses.",
          rubric: ["Any false positive", "Proportion among discoveries", "Power trade-off"],
        },
        {
          id: "w05-mt-case-1",
          type: "case",
          prompt: "A PM checks the A/B dashboard daily and wants to ship on the first day p < 0.05. What do you propose?",
          answer: "Explain that peeking inflates false positives well above 5%. Either fix the sample size up front and analyze once, or switch to a sequential design (alpha spending or always-valid inference) that allows daily looks with correct error rates.",
          rubric: ["Peeking inflates errors", "Fixed horizon", "Sequential alternative"],
        },
        {
          id: "w05-mt-recall-2",
          type: "recall",
          prompt: "You test 50 features for association with churn. Which correction would you use and why?",
          answer: "Benjamini-Hochberg, because this is screening: you want to keep the share of false leads low while still finding real signals; Bonferroni at 0.001 would miss many.",
          rubric: ["BH", "Screening context", "Bonferroni too conservative"],
        },
      ],
      references: [
        { title: "Controlling the False Discovery Rate (Benjamini and Hochberg, Journal of the Royal Statistical Society B, 1995)", versionSensitive: false },
        { title: "R documentation: p.adjust", url: "https://stat.ethz.ch/R-manual/R-devel/library/stats/html/p.adjust.html", versionSensitive: false },
      ],
      lastReviewed: REVIEWED,
    }),
  ],
};
