import { REVIEWED, code, defineTopic, defineWeek, edge, node, step } from "../helpers";

export const topics = [
  defineTopic({
    id: "w05-d01-probability-distributions",
    slug: "probability-distributions",
    title: "Probability and distributions",
    domain: "statistics",
    roles: ["data-scientist", "ml-engineer", "genai-engineer"],
    difficulty: "beginner",
    minutes: 60,
    prerequisites: ["w01-d01-python-r-idioms"],
    objectives: [
      "Compute binomial, Poisson and normal probabilities exactly",
      "Pick a distribution from the story of how data is generated",
      "Read R's d/p/q/r naming and its Python equivalents",
    ],
    summary:
      "Distributions are stories about how numbers come out: counts of successes (binomial), counts of rare events (Poisson), sums of many small effects (normal). Computing their probabilities exactly is the base of every test and interval that follows.",
    eli5: {
      analogy:
        "A binomial is flipping a slightly unfair coin 10 times and counting heads. A Poisson is counting shooting stars in an hour. A normal is the heights of a big crowd: most people near the middle, fewer at the extremes.",
      steps: [
        "Decide what is being counted or measured.",
        "Pick the story that matches: fixed tries with yes or no (binomial), events at a steady rate (Poisson), many small pushes added up (normal).",
        "Use the formula for the chance of exactly one outcome, or add up chances for 'at most'.",
        "Check the answer is between 0 and 1 and that the chances of everything add to 1.",
      ],
      analogyLimit:
        "Real data rarely follows a story perfectly: coin flips can depend on each other, shooting stars cluster, and heights are not truly normal at the extremes. The distribution is a model you check, not a fact about the world.",
    },
    senior: {
      definition:
        "A probability distribution assigns probabilities to outcomes. Binomial(n, p): P(X = k) = C(n, k) p^k (1 - p)^(n - k). Poisson(lambda): P(X = k) = e^(-lambda) lambda^k / k!. Normal(mu, sigma): continuous with CDF Phi((x - mu) / sigma).",
      invariants: [
        "Binomial assumes n independent trials with the same success probability p.",
        "Poisson assumes events occur independently at a constant rate; its mean equals its variance.",
        "PMF values are probabilities; PDF values are densities and can exceed 1. Only areas under a PDF are probabilities.",
      ],
      mechanism: [
        "Python computes the binomial and Poisson formulas directly with math.comb, math.exp and math.factorial, and uses statistics.NormalDist for the normal CDF and quantile.",
        "R provides d (density or mass), p (CDF), q (quantile) and r (random draws) functions: dbinom, pbinom, dpois, ppois, pnorm, qnorm.",
        "P(X >= 3) is computed as 1 - P(X <= 2) to avoid summing an infinite tail.",
      ],
      complexity: "Exact PMF evaluation is O(1) per value; a CDF by summation is O(k). Library CDFs use numerically stable special functions.",
      tradeoffs: [
        { option: "Binomial", choose: "Fixed number of independent yes/no trials.", cost: "Breaks with correlated trials (users in the same household)." },
        { option: "Poisson", choose: "Counts of events per interval at a steady rate.", cost: "Real counts are often overdispersed; negative binomial fits better then." },
        { option: "Normal approximation", choose: "Large n, where np and n(1 - p) are both at least about 10.", cost: "Poor in the tails and for small samples or rare events." },
      ],
      failureModes: [
        "Treating a density value as a probability.",
        "Using the normal approximation for rare events with tiny expected counts.",
        "Assuming independence when observations cluster (sessions from the same user).",
        "Off-by-one errors between P(X < k) and P(X <= k) for discrete distributions.",
      ],
      production:
        "Choosing the right distribution drives alert thresholds (Poisson for error counts), capacity planning (tail percentiles) and every statistical test in experimentation.",
      interviewAnswer:
        "I start from the data-generating story. Fixed independent yes/no trials are binomial, event counts at a steady rate are Poisson, and sums of many small effects are approximately normal. Then I compute exact probabilities, using 1 minus the CDF for upper tails, and I check the assumptions, especially independence and overdispersion.",
    },
    implementation: {
      problem: "Compute binomial, normal and Poisson probabilities and print them to four decimals.",
      input: "Binomial(n = 10, p = 0.3); Normal(mu = 100, sigma = 15); Poisson(lambda = 2)",
      python: {
        code: code`
          from math import comb, exp, factorial
          from statistics import NormalDist


          def binom_pmf(k: int, n: int, p: float) -> float:
              return comb(n, k) * p**k * (1 - p) ** (n - k)


          def binom_cdf(k: int, n: int, p: float) -> float:
              return sum(binom_pmf(i, n, p) for i in range(k + 1))


          def poisson_pmf(k: int, lam: float) -> float:
              return exp(-lam) * lam**k / factorial(k)


          n, p = 10, 0.3
          print(f"Binomial(10, 0.3): P(X=3)={binom_pmf(3, n, p):.4f} P(X<=3)={binom_cdf(3, n, p):.4f} mean={n * p:.4f} var={n * p * (1 - p):.4f}")

          iq = NormalDist(mu=100, sigma=15)
          print(f"Normal(100, 15): P(X<=130)={iq.cdf(130):.4f} 95th percentile={iq.inv_cdf(0.95):.4f}")

          lam = 2.0
          tail = 1 - sum(poisson_pmf(k, lam) for k in range(3))
          print(f"Poisson(2): P(X=0)={poisson_pmf(0, lam):.4f} P(X>=3)={tail:.4f}")
        `,
      },
      r: {
        code: code`
          n <- 10
          p <- 0.3
          cat(sprintf("Binomial(10, 0.3): P(X=3)=%.4f P(X<=3)=%.4f mean=%.4f var=%.4f\n",
                      dbinom(3, n, p), pbinom(3, n, p), n * p, n * p * (1 - p)))

          cat(sprintf("Normal(100, 15): P(X<=130)=%.4f 95th percentile=%.4f\n",
                      pnorm(130, mean = 100, sd = 15), qnorm(0.95, mean = 100, sd = 15)))

          lambda <- 2
          cat(sprintf("Poisson(2): P(X=0)=%.4f P(X>=3)=%.4f\n",
                      dpois(0, lambda), 1 - ppois(2, lambda)))
        `,
      },
      expectedOutput: code`
        Binomial(10, 0.3): P(X=3)=0.2668 P(X<=3)=0.6496 mean=3.0000 var=2.1000
        Normal(100, 15): P(X<=130)=0.9772 95th percentile=124.6728
        Poisson(2): P(X=0)=0.1353 P(X>=3)=0.3233
      `,
      tests: {
        python: code`
          def test_binomial_pmf_sums_to_one():
              assert abs(sum(binom_pmf(k, 10, 0.3) for k in range(11)) - 1) < 1e-12


          def test_poisson_mean_equals_lambda():
              mean = sum(k * poisson_pmf(k, 2.0) for k in range(60))
              assert abs(mean - 2.0) < 1e-9


          def test_normal_quantile_inverts_cdf():
              d = NormalDist(100, 15)
              assert abs(d.cdf(d.inv_cdf(0.95)) - 0.95) < 1e-9
        `,
        r: code`
          test_that("the binomial pmf sums to one", {
            expect_equal(sum(dbinom(0:10, 10, 0.3)), 1)
          })

          test_that("the Poisson mean equals lambda", {
            expect_equal(sum((0:60) * dpois(0:60, 2)), 2)
          })

          test_that("qnorm inverts pnorm", {
            expect_equal(pnorm(qnorm(0.95, 100, 15), 100, 15), 0.95)
          })
        `,
      },
      eli5Trace: [
        "Ten flips of a coin that lands heads 30% of the time: exactly 3 heads is the single most likely count.",
        "Adding the chances of 0, 1, 2 and 3 heads gives the chance of at most 3.",
        "Scores averaging 100 with spread 15: 130 is two spreads above, so almost everyone is below it.",
        "Shooting stars at 2 an hour: a quiet hour with zero happens about 13.5% of the time.",
      ],
      complexity: { time: "O(k) for a summed CDF", space: "O(1)" },
      edgeCases: [
        "p = 0 or p = 1 makes the binomial degenerate; 0 ** 0 is 1 in both languages, which keeps the formula correct.",
        "Large n overflows naive factorials; use comb or log-gamma.",
        "Upper tails computed as 1 - CDF lose precision when the tail is tiny; use survival functions then.",
        "Normal quantiles at 0 or 1 are infinite.",
      ],
      incorrect: {
        language: "python",
        code: code`
          tail = 1 - sum(poisson_pmf(k, lam) for k in range(3 + 1))
        `,
        whyWrong: "It subtracts P(X <= 3) instead of P(X <= 2), so it computes P(X >= 4), not P(X >= 3).",
        fix: "P(X >= k) = 1 - P(X <= k - 1): sum over range(k).",
      },
    },
    flow: {
      title: "From story to probability",
      nodes: [
        node("story", "Data story", 0, 110, "what is counted?"),
        node("binom", "Binomial", 260, 0, "n trials, p each"),
        node("pois", "Poisson", 260, 110, "events at rate lambda"),
        node("norm", "Normal", 260, 220, "sum of small effects"),
        node("calc", "PMF / CDF / quantile", 540, 110, "exact computation"),
        node("check", "Check assumptions", 800, 110, "independence, dispersion"),
      ],
      edges: [edge("story", "binom"), edge("story", "pois"), edge("story", "norm"), edge("binom", "calc"), edge("pois", "calc"), edge("norm", "calc"), edge("calc", "check")],
      steps: [
        step("story", "", "Start from how the data is generated, not from the formula you remember."),
        step("story binom", "story-binom", "Ten independent trials with success 0.3: binomial. P(X=3) is about 0.27."),
        step("story pois", "story-pois", "Events at a steady 2 per hour: Poisson. Zero events has probability e^-2."),
        step("story norm", "story-norm", "Many small additive effects: normal. 130 is two standard deviations above 100."),
        step("binom pois norm calc", "binom-calc pois-calc norm-calc", "Compute exactly with PMFs, CDFs and quantiles; use complements for upper tails."),
        step("check", "calc-check", "Check independence and whether the variance matches the model before trusting the numbers."),
      ],
    },
    practice: [
      {
        id: "w05-prob-recall-1",
        type: "recall",
        prompt: "A support team gets on average 4 tickets per hour. What distribution models tickets per hour, and what is P(0 tickets)?",
        answer: "Poisson with lambda = 4; P(0) = e^-4, about 0.0183.",
        rubric: ["Names Poisson", "Computes e^-4"],
      },
      {
        id: "w05-prob-recall-2",
        type: "recall",
        prompt: "Why can a normal density at a point be 2.5, yet probabilities never exceed 1?",
        answer: "Density is probability per unit; a narrow distribution has tall density. Probabilities are areas under the curve, which always total 1.",
        rubric: ["Density vs probability", "Area interpretation"],
      },
    ],
    references: [
      { title: "Python documentation: statistics.NormalDist", url: "https://docs.python.org/3/library/statistics.html#statistics.NormalDist", versionSensitive: false },
      { title: "R documentation: the Binomial distribution (dbinom)", url: "https://stat.ethz.ch/R-manual/R-devel/library/stats/html/Binomial.html", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w05-d02-hypothesis-testing",
    slug: "hypothesis-testing",
    title: "Estimation, confidence intervals and hypothesis tests",
    domain: "statistics",
    roles: ["data-scientist", "ml-engineer", "genai-engineer"],
    difficulty: "intermediate",
    minutes: 75,
    prerequisites: ["w05-d01-probability-distributions"],
    objectives: [
      "Run a two-proportion z-test by hand and interpret the p-value correctly",
      "Build a 95% confidence interval for a difference in rates",
      "Explain type I and type II errors and what a p-value is not",
    ],
    summary:
      "A hypothesis test asks how surprising your data would be if nothing had changed. A confidence interval tells you the range of effects consistent with the data. Together they turn an A/B result into a decision.",
    eli5: {
      analogy:
        "A friend says their coin is fair. You flip it 100 times and get 70 heads. You ask: if the coin really were fair, how often would I see something this lopsided? If the answer is 'almost never', you stop believing the coin is fair.",
      steps: [
        "Assume nothing changed: both versions convert at the same rate.",
        "Measure how far apart the two rates are, in units of how much they would wiggle by chance.",
        "Turn that distance into a p-value: the chance of a gap at least this big if nothing changed.",
        "If the p-value is below the bar you set in advance (often 0.05), call the difference real, and report the range of likely effects.",
      ],
      analogyLimit:
        "The p-value is not the chance that the coin is fair, and a small p-value does not mean the effect is big or important. It only measures surprise under the 'nothing changed' assumption.",
    },
    senior: {
      definition:
        "For proportions p1 and p2 with sample sizes n1 and n2, the pooled z-test statistic is z = (p2 - p1) / sqrt(p(1 - p)(1/n1 + 1/n2)) with pooled p. The two-sided p-value is 2(1 - Phi(|z|)). A 95% Wald CI for the difference uses the unpooled standard error.",
      invariants: [
        "Samples are independent and units are randomized; each user counts once.",
        "Expected successes and failures per arm are large enough for the normal approximation (roughly at least 10).",
        "alpha is fixed before looking at the data; the test is two-sided unless a one-sided question was pre-registered.",
      ],
      mechanism: [
        "Under H0 (p1 = p2), the pooled rate estimates the common p, so the standard error uses it.",
        "The CI estimates the actual difference, so it uses each arm's own rate: se = sqrt(p1(1 - p1)/n1 + p2(1 - p2)/n2).",
        "R's prop.test without continuity correction reports X-squared = z^2 and the same p-value, which the R tests check.",
        "The decision rule 'reject when p < alpha' controls the false positive rate at alpha across many tests.",
      ],
      complexity: "O(1) arithmetic once counts are aggregated; aggregation is O(n) over events.",
      tradeoffs: [
        { option: "z-test for proportions", choose: "Large samples of binary outcomes.", cost: "Inaccurate for tiny counts." },
        { option: "Fisher's exact test", choose: "Small samples or rare events.", cost: "Conservative and slower on large tables." },
        { option: "Bootstrap CI", choose: "Complex metrics like ratios or medians.", cost: "Compute cost and care with dependent data." },
      ],
      failureModes: [
        "Reading p = 0.03 as '97% chance the treatment works'.",
        "Peeking repeatedly and stopping when p < 0.05, which inflates false positives.",
        "Analyzing sessions or page views when randomization was by user (pseudo-replication).",
        "Declaring 'no effect' from a non-significant result with low power.",
      ],
      production:
        "Experimentation platforms automate this test, but you still own the unit of analysis, the guardrail metrics, multiple-testing corrections and the sample ratio mismatch check that catches broken randomization.",
      interviewAnswer:
        "I compute each arm's rate and the pooled rate, form z = difference / pooled standard error, and get a two-sided p-value from the normal CDF. I also report a 95% confidence interval with the unpooled standard error, because the decision should consider effect size, not just significance. I state alpha up front, avoid peeking, and check randomization with a sample ratio test.",
    },
    implementation: {
      problem: "Test whether a treatment changed a conversion rate, with a z-statistic, p-value and 95% confidence interval for the difference.",
      input: "control 200 conversions of 2000 users; treatment 250 of 2000; alpha = 0.05",
      python: {
        code: code`
          from math import sqrt
          from statistics import NormalDist

          Z = NormalDist()


          def two_proportion_test(x1: int, n1: int, x2: int, n2: int) -> tuple[float, float, float, float]:
              p1, p2 = x1 / n1, x2 / n2
              pooled = (x1 + x2) / (n1 + n2)
              z = (p2 - p1) / sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2))
              p_value = 2 * (1 - Z.cdf(abs(z)))
              se = sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2)
              margin = Z.inv_cdf(0.975) * se
              return z, p_value, (p2 - p1) - margin, (p2 - p1) + margin


          z, p_value, lo, hi = two_proportion_test(200, 2000, 250, 2000)
          print(f"control 10.00% treatment 12.50% difference {0.125 - 0.10:.4f}")
          print(f"z={z:.4f} p={p_value:.4f}")
          print(f"95% CI for difference: [{lo:.4f}, {hi:.4f}]")
          print(f"reject H0 at alpha=0.05: {'yes' if p_value < 0.05 else 'no'}")
        `,
      },
      r: {
        code: code`
          two_proportion_test <- function(x1, n1, x2, n2) {
            p1 <- x1 / n1
            p2 <- x2 / n2
            pooled <- (x1 + x2) / (n1 + n2)
            z <- (p2 - p1) / sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2))
            p_value <- 2 * (1 - pnorm(abs(z)))
            se <- sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2)
            margin <- qnorm(0.975) * se
            list(z = z, p = p_value, lo = (p2 - p1) - margin, hi = (p2 - p1) + margin)
          }

          res <- two_proportion_test(200, 2000, 250, 2000)
          cat(sprintf("control 10.00%% treatment 12.50%% difference %.4f\n", 0.125 - 0.10))
          cat(sprintf("z=%.4f p=%.4f\n", res$z, res$p))
          cat(sprintf("95%% CI for difference: [%.4f, %.4f]\n", res$lo, res$hi))
          cat(sprintf("reject H0 at alpha=0.05: %s\n", if (res$p < 0.05) "yes" else "no"))
        `,
      },
      expectedOutput: code`
        control 10.00% treatment 12.50% difference 0.0250
        z=2.5020 p=0.0124
        95% CI for difference: [0.0054, 0.0446]
        reject H0 at alpha=0.05: yes
      `,
      tests: {
        python: code`
          def test_identical_arms_give_z_zero():
              z, p, lo, hi = two_proportion_test(100, 1000, 100, 1000)
              assert z == 0 and abs(p - 1) < 1e-12 and lo < 0 < hi


          def test_ci_excludes_zero_when_significant():
              z, p, lo, hi = two_proportion_test(200, 2000, 250, 2000)
              assert p < 0.05 and lo > 0


          def test_symmetry():
              z1, p1, _, _ = two_proportion_test(200, 2000, 250, 2000)
              z2, p2, _, _ = two_proportion_test(250, 2000, 200, 2000)
              assert abs(z1 + z2) < 1e-12 and abs(p1 - p2) < 1e-12
        `,
        r: code`
          test_that("prop.test without continuity correction agrees", {
            pt <- prop.test(c(250, 200), c(2000, 2000), correct = FALSE)
            expect_equal(unname(pt$statistic), res$z^2)
            expect_equal(pt$p.value, res$p)
          })

          test_that("identical arms give z = 0", {
            r0 <- two_proportion_test(100, 1000, 100, 1000)
            expect_equal(r0$z, 0)
            expect_lt(r0$lo, 0)
            expect_gt(r0$hi, 0)
          })
        `,
      },
      eli5Trace: [
        "Control converts 10% and treatment 12.5%, a gap of 2.5 points.",
        "If nothing changed, both would wiggle around 11.25%; with 2000 users each, a typical wiggle in the gap is about 1 point.",
        "A 2.5-point gap is about 2.5 typical wiggles: the z printed above.",
        "A gap that big happens by chance only about 1.2% of the time, below the 5% bar, and the likely true gap is between about 0.5 and 4.5 points.",
      ],
      complexity: { time: "O(1) after aggregation", space: "O(1)" },
      edgeCases: [
        "Zero conversions in both arms makes the pooled variance 0 and z undefined; guard against division by zero.",
        "Unequal sample sizes are handled by the 1/n1 + 1/n2 term.",
        "Very small counts make the normal approximation unreliable; use an exact test.",
        "The CI can include 0 even when p is just under 0.05 if different standard errors are used; report both consistently.",
      ],
      incorrect: {
        language: "python",
        code: code`
          p_value = 1 - Z.cdf(z)
        `,
        whyWrong: "It is a one-sided p-value, half the two-sided value, and it is wrong in sign when z is negative.",
        fix: "Use 2 * (1 - Z.cdf(abs(z))) for a two-sided test.",
      },
    },
    flow: {
      title: "From counts to a decision",
      nodes: [
        node("counts", "Counts", 0, 110, "200/2000 vs 250/2000"),
        node("h0", "Assume H0", 220, 30, "same true rate"),
        node("se", "Standard error", 220, 190, "pooled under H0"),
        node("z", "z statistic", 460, 110, "gap / SE"),
        node("p", "p-value", 680, 30, "2(1 - Phi(|z|))"),
        node("ci", "95% CI", 680, 190, "unpooled SE"),
        node("decide", "Decision", 900, 110, "effect size + p"),
      ],
      edges: [edge("counts", "h0"), edge("counts", "se"), edge("h0", "z"), edge("se", "z"), edge("z", "p"), edge("counts", "ci"), edge("p", "decide"), edge("ci", "decide")],
      steps: [
        step("counts h0", "counts-h0", "Start by assuming the null: both arms share one true conversion rate."),
        step("counts se", "counts-se", "Estimate the shared rate (11.25%) and the standard error of the gap under that assumption."),
        step("h0 se z", "h0-z se-z", "Divide the observed gap of 2.5 points by the standard error to get z."),
        step("z p", "z-p", "Convert z into a two-sided p-value with the normal CDF."),
        step("counts ci", "counts-ci", "Separately, build a 95% interval for the true gap using each arm's own rate."),
        step("p ci decide", "p-decide ci-decide", "Decide using both: is it surprising under H0, and is the plausible effect big enough to matter?"),
      ],
    },
    practice: [
      {
        id: "w05-test-recall-1",
        type: "recall",
        prompt: "Define a p-value in one sentence and name one thing it is not.",
        answer: "The probability, assuming the null hypothesis is true, of a result at least as extreme as the one observed. It is not the probability that the null is true, and not the size of the effect.",
        rubric: ["Conditional on H0", "At least as extreme", "Names a misconception"],
      },
      {
        id: "w05-test-case-1",
        type: "case",
        prompt: "A PM checks the dashboard daily and stops the test the first day p < 0.05. What is wrong and what would you propose?",
        answer: "Optional stopping inflates the false positive rate well above 5%. Fix the sample size in advance from a power analysis, or use a sequential method designed for continuous monitoring (alpha spending or always-valid inference).",
        rubric: ["Names peeking or optional stopping", "Explains inflated false positives", "Proposes fixed horizon or sequential testing"],
      },
    ],
    references: [
      { title: "R documentation: prop.test", url: "https://stat.ethz.ch/R-manual/R-devel/library/stats/html/prop.test.html", versionSensitive: false },
      { title: "Trustworthy Online Controlled Experiments (Kohavi, Tang, Xu)", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w05-d03-ab-test-power",
    slug: "ab-test-power",
    title: "Power analysis and A/B test design",
    domain: "statistics",
    roles: ["data-scientist", "ml-engineer", "genai-engineer"],
    difficulty: "intermediate",
    minutes: 75,
    prerequisites: ["w05-d02-hypothesis-testing"],
    objectives: [
      "Compute the sample size per arm for a target minimum detectable effect",
      "Explain how baseline rate, effect size, alpha and power trade off",
      "Compute the power a fixed sample actually has",
    ],
    summary:
      "Power analysis answers 'how many users do we need?' before the test starts. Small effects need dramatically more users, because sample size grows with one over the effect squared.",
    eli5: {
      analogy:
        "Hearing a whisper in a noisy room. A loud voice is easy to hear with a short listen; a whisper needs you to listen much longer to be sure you heard it and not the noise.",
      steps: [
        "Decide the smallest change worth hearing, like 2 points of conversion.",
        "Decide how often you are willing to be fooled by noise (5%) and how often you want to catch a real change (80%).",
        "Plug those into the formula to get how many users each version needs.",
        "Halve the change you want to detect and you need about four times as many users.",
      ],
      analogyLimit:
        "The room's noise here is fixed and known from the baseline rate. In real tests, traffic changes week to week, users return several times, and novelty effects fade, so plans need a safety margin and a fixed duration covering full weekly cycles.",
    },
    senior: {
      definition:
        "For a two-sided test of two proportions, n per arm = (z_(1 - alpha/2) sqrt(2 p_bar (1 - p_bar)) + z_(1 - beta) sqrt(p1(1 - p1) + p2(1 - p2)))^2 / (p2 - p1)^2, where p_bar is the average of p1 and p2 and 1 - beta is power.",
      invariants: [
        "alpha, power and the minimum detectable effect (MDE) are fixed before launch.",
        "n scales with 1 / MDE^2: halving the MDE roughly quadruples n.",
        "Power is computed for the true effect equal to the MDE; smaller true effects have less power.",
      ],
      mechanism: [
        "Under H0 the test statistic is centered at 0; under H1 it is centered at the effect over its standard error.",
        "Requiring both 'reject at alpha under H0' and 'reject with probability 1 - beta under H1' gives the formula above.",
        "Achieved power for a fixed n is Phi((|delta| sqrt(n) - z_(1 - alpha/2) sqrt(2 p_bar q_bar)) / sqrt(p1 q1 + p2 q2)), ignoring the negligible opposite tail.",
        "R's power.prop.test implements the same approximation, which the R tests check.",
      ],
      complexity: "O(1) arithmetic; the real cost is the traffic and time the sample size implies.",
      tradeoffs: [
        { option: "Smaller MDE", choose: "When small changes are worth a lot (large revenue base).", cost: "Quadratically more users and longer tests." },
        { option: "Variance reduction (CUPED, stratification)", choose: "When pre-experiment data predicts the metric.", cost: "Implementation complexity and covariate pipelines." },
        { option: "Higher alpha or lower power", choose: "Low-risk, reversible changes.", cost: "More false positives or more missed wins." },
      ],
      failureModes: [
        "Computing n with a relative MDE (20% lift) but plugging it in as absolute points.",
        "Ignoring that randomization by user with many sessions inflates variance of session metrics.",
        "Stopping as soon as n is reached on a Tuesday, missing weekly seasonality.",
        "Running many metrics or variants without adjusting alpha.",
      ],
      production:
        "Experimentation teams publish an MDE calculator, enforce minimum durations of whole weeks, and track the share of tests that are underpowered, because underpowered tests mostly produce noise and exaggerated winners.",
      interviewAnswer:
        "I need the baseline rate, the minimum detectable effect, alpha and power. With a 10% baseline, a 2-point absolute MDE, alpha 0.05 two-sided and 80% power, the formula gives about 3,841 users per arm. Halving the MDE roughly quadruples that. I would round up, run whole weeks, and consider CUPED if traffic is the bottleneck.",
    },
    implementation: {
      problem: "Compute users per arm for several minimum detectable effects, then the power a fixed 2,000 users per arm actually has.",
      input: "baseline 10%; MDE 1, 2 and 5 absolute points; alpha 0.05 two-sided; power 0.8; check power for n = 2000 and a 2.5-point lift",
      python: {
        code: code`
          from math import ceil, sqrt
          from statistics import NormalDist

          Z = NormalDist()


          def n_per_arm(p1: float, p2: float, alpha: float = 0.05, power: float = 0.8) -> int:
              p_bar = (p1 + p2) / 2
              a = Z.inv_cdf(1 - alpha / 2) * sqrt(2 * p_bar * (1 - p_bar))
              b = Z.inv_cdf(power) * sqrt(p1 * (1 - p1) + p2 * (1 - p2))
              return ceil((a + b) ** 2 / (p2 - p1) ** 2)


          def achieved_power(p1: float, p2: float, n: int, alpha: float = 0.05) -> float:
              p_bar = (p1 + p2) / 2
              num = abs(p2 - p1) * sqrt(n) - Z.inv_cdf(1 - alpha / 2) * sqrt(2 * p_bar * (1 - p_bar))
              return Z.cdf(num / sqrt(p1 * (1 - p1) + p2 * (1 - p2)))


          for mde in [0.01, 0.02, 0.05]:
              print(f"MDE {mde * 100:.0f} pt: {n_per_arm(0.10, 0.10 + mde)} users per arm")
          print(f"power with 2000 per arm for a 2.5 pt lift: {achieved_power(0.10, 0.125, 2000):.4f}")
        `,
      },
      r: {
        code: code`
          n_per_arm <- function(p1, p2, alpha = 0.05, power = 0.8) {
            p_bar <- (p1 + p2) / 2
            a <- qnorm(1 - alpha / 2) * sqrt(2 * p_bar * (1 - p_bar))
            b <- qnorm(power) * sqrt(p1 * (1 - p1) + p2 * (1 - p2))
            ceiling((a + b)^2 / (p2 - p1)^2)
          }

          achieved_power <- function(p1, p2, n, alpha = 0.05) {
            p_bar <- (p1 + p2) / 2
            num <- abs(p2 - p1) * sqrt(n) - qnorm(1 - alpha / 2) * sqrt(2 * p_bar * (1 - p_bar))
            pnorm(num / sqrt(p1 * (1 - p1) + p2 * (1 - p2)))
          }

          for (mde in c(0.01, 0.02, 0.05)) {
            cat(sprintf("MDE %.0f pt: %d users per arm\n", mde * 100, as.integer(n_per_arm(0.10, 0.10 + mde))))
          }
          cat(sprintf("power with 2000 per arm for a 2.5 pt lift: %.4f\n", achieved_power(0.10, 0.125, 2000)))
        `,
      },
      expectedOutput: code`
        MDE 1 pt: 14751 users per arm
        MDE 2 pt: 3841 users per arm
        MDE 5 pt: 686 users per arm
        power with 2000 per arm for a 2.5 pt lift: 0.7062
      `,
      tests: {
        python: code`
          def test_halving_mde_roughly_quadruples_n():
              ratio = n_per_arm(0.10, 0.11) / n_per_arm(0.10, 0.12)
              assert 3.5 < ratio < 4.5


          def test_power_at_planned_n_is_about_target():
              n = n_per_arm(0.10, 0.12)
              assert 0.79 < achieved_power(0.10, 0.12, n) < 0.81


          def test_more_power_needs_more_users():
              assert n_per_arm(0.10, 0.12, power=0.9) > n_per_arm(0.10, 0.12, power=0.8)
        `,
        r: code`
          test_that("power.prop.test uses the same approximation", {
            expect_equal(power.prop.test(p1 = 0.10, p2 = 0.12, power = 0.8)$n, n_per_arm(0.10, 0.12), tolerance = 1e-3)
          })

          test_that("power at the planned n is about the target", {
            n <- n_per_arm(0.10, 0.12)
            expect_gt(achieved_power(0.10, 0.12, n), 0.79)
            expect_lt(achieved_power(0.10, 0.12, n), 0.81)
          })
        `,
      },
      eli5Trace: [
        "Hearing a 1-point change over a 10% baseline takes the most users: the first line.",
        "A 2-point change needs about a quarter as many.",
        "A 5-point change is loud enough to hear with only a few hundred users per arm.",
        "With only 2,000 users per arm, a real 2.5-point lift would be caught only about 71% of the time, short of the 80% target.",
      ],
      complexity: { time: "O(1)", space: "O(1)" },
      edgeCases: [
        "MDE of 0 divides by zero: no finite sample can detect a zero effect.",
        "Baselines near 0 or 1 shrink the variance and the normal approximation weakens.",
        "Relative MDEs must be converted to absolute differences first.",
        "Unequal allocation (90/10) needs the generalized formula with 1/n1 + 1/n2.",
      ],
      incorrect: {
        language: "python",
        code: code`
          a = Z.inv_cdf(1 - alpha) * sqrt(2 * p_bar * (1 - p_bar))
        `,
        whyWrong: "Using 1 - alpha instead of 1 - alpha / 2 plans a one-sided test while analyzing two-sided, so the test is underpowered.",
        fix: "For a two-sided test use the 1 - alpha / 2 quantile.",
      },
    },
    flow: {
      title: "What drives sample size",
      nodes: [
        node("baseline", "Baseline rate", 0, 0, "10%"),
        node("mde", "MDE", 0, 110, "2 points"),
        node("alpha", "alpha", 0, 220, "0.05 two-sided"),
        node("power", "Power", 0, 330, "0.8"),
        node("formula", "Sample size formula", 320, 165, "n ~ 1 / MDE^2"),
        node("n", "Users per arm", 620, 165, "rounded up"),
        node("plan", "Test plan", 880, 165, "whole weeks"),
      ],
      edges: [edge("baseline", "formula"), edge("mde", "formula"), edge("alpha", "formula"), edge("power", "formula"), edge("formula", "n"), edge("n", "plan")],
      steps: [
        step("baseline mde", "baseline-formula mde-formula", "The baseline sets the noise level and the MDE sets the size of the signal you must hear."),
        step("alpha power", "alpha-formula power-formula", "alpha caps false positives; power is how often a real MDE-sized effect is detected."),
        step("formula", "", "All four combine in one formula where n grows with one over the MDE squared."),
        step("formula n", "formula-n", "For a 2-point MDE on a 10% baseline that is a few thousand users per arm."),
        step("n plan", "n-plan", "Convert users to days with real traffic and round up to whole weeks."),
      ],
    },
    practice: [
      {
        id: "w05-power-recall-1",
        type: "recall",
        prompt: "Your test needs 40,000 users per arm and you get 5,000 eligible users a day. What are your options?",
        answer: "Run about 16 days (two to three full weeks), accept a larger MDE, use variance reduction such as CUPED, or choose a more sensitive metric that moves with the same change.",
        rubric: ["Converts to days and whole weeks", "Larger MDE or variance reduction", "Metric sensitivity"],
      },
      {
        id: "w05-power-code-1",
        type: "code",
        prompt: "Extend n_per_arm to unequal allocation where treatment gets a fraction r of traffic.",
        answer: "Replace the 2 p_bar q_bar term with p_bar q_bar (1/r + 1/(1 - r)) scaled to total n, and p1 q1 / (1 - r) + p2 q2 / r under H1; solve for total n.",
        rubric: ["Accounts for 1/n1 + 1/n2", "Solves for total traffic"],
      },
    ],
    references: [
      { title: "R documentation: power.prop.test", url: "https://stat.ethz.ch/R-manual/R-devel/library/stats/html/power.prop.test.html", versionSensitive: false },
      { title: "Trustworthy Online Controlled Experiments (Kohavi, Tang, Xu), chapter on power", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w05-d04-bayesian-ab",
    slug: "bayesian-ab",
    title: "Bayesian A/B testing with Beta-Binomial",
    domain: "statistics",
    roles: ["data-scientist", "ml-engineer"],
    difficulty: "advanced",
    minutes: 70,
    prerequisites: ["w05-d02-hypothesis-testing"],
    objectives: [
      "Update a Beta prior with conversion data to get a posterior",
      "Compute the probability that treatment beats control exactly",
      "Contrast posterior probabilities with p-values",
    ],
    summary:
      "Bayesian testing starts from a prior belief about each conversion rate and updates it with data. The output is a direct statement such as 'treatment is better with probability 0.99', which is often what stakeholders thought a p-value meant.",
    eli5: {
      analogy:
        "Guessing how good two basketball players are at free throws. Before watching, you assume anything is possible. Every shot you watch nudges your guess. After 2,000 shots each, your guesses are sharp, and you can say how sure you are that one is better.",
      steps: [
        "Start each player with a flat guess: any success rate is equally likely.",
        "Add made shots to one counter and missed shots to another.",
        "The counters describe a curve of likely rates for each player.",
        "Compare the two curves to get the chance that player B's true rate is higher.",
      ],
      analogyLimit:
        "The answer depends on the starting guess (the prior). With lots of data a flat prior barely matters, but with little data a strong prior can dominate. And 'probability B is better' says nothing about whether B is better by enough to matter.",
    },
    senior: {
      definition:
        "With a Beta(a, b) prior on a conversion rate and x successes in n trials, the posterior is Beta(a + x, b + n - x) by conjugacy. P(p_B > p_A) for independent Beta posteriors has a closed form: the sum over i = 0..a_B - 1 of B(a_A + i, b_A + b_B) / ((b_B + i) B(1 + i, b_B) B(a_A, b_A)), valid when a_B is an integer.",
      invariants: [
        "Arms are independent and each user is one Bernoulli trial.",
        "The prior is fixed before seeing data; Beta(1, 1) is uniform.",
        "Posterior mean a / (a + b) and variance ab / ((a + b)^2 (a + b + 1)).",
      ],
      mechanism: [
        "Conjugacy turns the update into addition: successes into a, failures into b.",
        "The closed-form sum is computed in log space with log-gamma (math.lgamma in Python, lbeta in R) to avoid overflow, then exponentiated per term.",
        "Without a closed form you would sample both posteriors and count how often B exceeds A; the exact sum avoids sampling noise, so Python and R print identical digits.",
      ],
      complexity: "O(a_B) terms for the exact probability, about 250 here; sampling would need many thousands of draws for similar precision.",
      tradeoffs: [
        { option: "Bayesian posterior probability", choose: "Stakeholders want 'probability B is better' and expected loss.", cost: "Requires a prior; not a frequentist error guarantee." },
        { option: "Frequentist test", choose: "Regulated or standardized decision processes with fixed alpha.", cost: "p-values are easy to misread." },
        { option: "Sampling (Monte Carlo)", choose: "Complex metrics without closed forms.", cost: "Simulation noise and seeds that differ across languages." },
      ],
      failureModes: [
        "Claiming Bayesian methods make peeking free; stopping rules still change the decisions you make.",
        "Using an informative prior from a different population.",
        "Deciding on P(B > A) alone without the expected size of the improvement.",
        "Computing Beta functions directly instead of in log space and overflowing.",
      ],
      production:
        "Many teams report P(B > A) and expected loss (how much conversion you lose if you pick B and it is actually worse). A decision rule such as 'ship when expected loss is below 0.1 points' combines confidence and magnitude.",
      interviewAnswer:
        "With a uniform Beta(1, 1) prior, each arm's posterior is Beta(1 + conversions, 1 + non-conversions). I compute P(p_B > p_A) exactly with the Beta closed form in log space, or by sampling, and I pair it with expected loss so the decision reflects effect size. I would state the prior and still pre-register a stopping rule.",
    },
    implementation: {
      problem: "Update uniform priors with conversion counts and compute posterior means, standard deviations and the exact probability that treatment beats control.",
      input: "prior Beta(1, 1); control 200 of 2000; treatment 250 of 2000",
      python: {
        code: code`
          from math import exp, lgamma, log, sqrt


          def lbeta(a: float, b: float) -> float:
              return lgamma(a) + lgamma(b) - lgamma(a + b)


          def prob_b_beats_a(a_a: int, b_a: int, a_b: int, b_b: int) -> float:
              total = 0.0
              for i in range(a_b):
                  total += exp(lbeta(a_a + i, b_a + b_b) - log(b_b + i) - lbeta(1 + i, b_b) - lbeta(a_a, b_a))
              return total


          def summary(a: int, b: int) -> tuple[float, float]:
              mean = a / (a + b)
              sd = sqrt(a * b / ((a + b) ** 2 * (a + b + 1)))
              return mean, sd


          a_a, b_a = 1 + 200, 1 + 1800
          a_b, b_b = 1 + 250, 1 + 1750
          for name, (a, b) in [("control", (a_a, b_a)), ("treatment", (a_b, b_b))]:
              mean, sd = summary(a, b)
              print(f"{name}: posterior Beta({a}, {b}) mean={mean:.4f} sd={sd:.4f}")
          print(f"P(treatment > control) = {prob_b_beats_a(a_a, b_a, a_b, b_b):.4f}")
        `,
      },
      r: {
        code: code`
          prob_b_beats_a <- function(a_a, b_a, a_b, b_b) {
            i <- 0:(a_b - 1)
            sum(exp(lbeta(a_a + i, b_a + b_b) - log(b_b + i) - lbeta(1 + i, b_b) - lbeta(a_a, b_a)))
          }

          posterior_summary <- function(a, b) {
            c(mean = a / (a + b), sd = sqrt(a * b / ((a + b)^2 * (a + b + 1))))
          }

          a_a <- 1 + 200; b_a <- 1 + 1800
          a_b <- 1 + 250; b_b <- 1 + 1750
          arms <- list(control = c(a_a, b_a), treatment = c(a_b, b_b))
          for (name in names(arms)) {
            ab <- arms[[name]]
            s <- posterior_summary(ab[1], ab[2])
            cat(sprintf("%s: posterior Beta(%d, %d) mean=%.4f sd=%.4f\n", name, as.integer(ab[1]), as.integer(ab[2]), s[["mean"]], s[["sd"]]))
          }
          cat(sprintf("P(treatment > control) = %.4f\n", prob_b_beats_a(a_a, b_a, a_b, b_b)))
        `,
      },
      expectedOutput: code`
        control: posterior Beta(201, 1801) mean=0.1004 sd=0.0067
        treatment: posterior Beta(251, 1751) mean=0.1254 sd=0.0074
        P(treatment > control) = 0.9938
      `,
      tests: {
        python: code`
          def test_identical_posteriors_give_about_half():
              assert abs(prob_b_beats_a(51, 51, 51, 51) - 0.5) < 0.02


          def test_probability_is_complementary():
              p = prob_b_beats_a(a_a, b_a, a_b, b_b)
              q = prob_b_beats_a(a_b, b_b, a_a, b_a)
              assert abs(p + q - 1) < 1e-9


          def test_uniform_prior_mean_is_half():
              assert summary(1, 1)[0] == 0.5
        `,
        r: code`
          test_that("the exact probability matches numerical integration", {
            f <- function(x) dbeta(x, a_b, b_b) * pbeta(x, a_a, b_a)
            expect_equal(prob_b_beats_a(a_a, b_a, a_b, b_b), integrate(f, 0, 1, rel.tol = 1e-10)$value, tolerance = 1e-6)
          })

          test_that("the probability is complementary", {
            expect_equal(prob_b_beats_a(a_a, b_a, a_b, b_b) + prob_b_beats_a(a_b, b_b, a_a, b_a), 1)
          })
        `,
      },
      eli5Trace: [
        "Control: start at 1 make and 1 miss, add 200 makes and 1,800 misses.",
        "Treatment: start the same, add 250 makes and 1,750 misses.",
        "Each curve centers near its observed rate and is narrow because 2,000 shots is a lot.",
        "The curves barely overlap, so treatment is better with probability above 0.99.",
      ],
      complexity: { time: "O(a_B)", space: "O(1)" },
      edgeCases: [
        "Tiny samples: the prior dominates; Beta(1, 1) pulls rates toward 50%.",
        "a_B must be an integer for this closed form; with a non-integer prior, integrate numerically or sample.",
        "Very large counts make individual Beta functions underflow; log space avoids it.",
        "Identical posteriors give a probability near, but not exactly, 0.5 because of ties in the discrete sum.",
      ],
      incorrect: {
        language: "python",
        code: code`
          from math import gamma

          def beta(a, b):
              return gamma(a) * gamma(b) / gamma(a + b)
        `,
        whyWrong: "gamma(201) overflows a float (it is about 10^375), so the computation raises OverflowError or returns nonsense.",
        fix: "Work in log space with lgamma and exponentiate only the final per-term ratio.",
      },
    },
    flow: {
      title: "Prior plus data equals posterior",
      nodes: [
        node("prior", "Prior Beta(1, 1)", 0, 110, "every rate equally likely"),
        node("dataA", "Control data", 250, 20, "200 / 2000"),
        node("dataB", "Treatment data", 250, 200, "250 / 2000"),
        node("postA", "Posterior A", 500, 20, "Beta(201, 1801)"),
        node("postB", "Posterior B", 500, 200, "Beta(251, 1751)"),
        node("compare", "P(B > A)", 760, 110, "exact sum"),
      ],
      edges: [edge("prior", "dataA"), edge("prior", "dataB"), edge("dataA", "postA"), edge("dataB", "postB"), edge("postA", "compare"), edge("postB", "compare")],
      steps: [
        step("prior", "", "Both arms start from the same uniform prior."),
        step("dataA postA", "prior-dataA dataA-postA", "Control's 200 conversions and 1,800 non-conversions are added: Beta(201, 1801)."),
        step("dataB postB", "prior-dataB dataB-postB", "Treatment becomes Beta(251, 1751), centered near 12.5%."),
        step("postA postB compare", "postA-compare postB-compare", "The exact closed form gives the probability that a draw from B exceeds a draw from A."),
      ],
    },
    practice: [
      {
        id: "w05-bayes-recall-1",
        type: "recall",
        prompt: "What is the posterior after a Beta(2, 8) prior and 30 conversions out of 100?",
        answer: "Beta(2 + 30, 8 + 70) = Beta(32, 78), with mean 32 / 110, about 0.291.",
        rubric: ["Adds successes to a", "Adds failures to b", "Computes the mean"],
      },
      {
        id: "w05-bayes-case-1",
        type: "case",
        prompt: "P(B > A) is 0.97 but the expected lift is 0.05 points and shipping B costs engineering time. Do you ship?",
        answer: "Probably not. High confidence in a tiny effect may not cover the cost. Use expected loss or a minimum practical effect in the decision rule, not P(B > A) alone.",
        rubric: ["Separates confidence from magnitude", "Mentions expected loss or practical significance"],
      },
    ],
    references: [
      { title: "Bayesian Data Analysis, 3rd edition (Gelman et al.), chapter on single-parameter models", versionSensitive: false },
      { title: "R documentation: Beta function (lbeta)", url: "https://stat.ethz.ch/R-manual/R-devel/library/base/html/Special.html", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),
];

export const week = defineWeek({
  number: 5,
  slug: "statistics-and-experimentation",
  title: "Statistics and experimentation",
  track: "data",
  domains: ["statistics"],
  summary:
    "Probability, distributions, estimation, hypothesis tests, power and Bayesian basics, all in service of designing and reading A/B tests correctly.",
  outcomes: [
    "Compute exact probabilities and pick distributions from data stories",
    "Run and interpret a two-proportion test with a confidence interval",
    "Size an experiment and explain the result in both frequentist and Bayesian terms",
  ],
  roles: ["data-scientist", "ml-engineer", "genai-engineer"],
  days: [
    {
      id: "w05-d01",
      day: 1,
      kind: "concept-map",
      title: "Probability and distributions",
      summary: "Binomial, Poisson and normal, with d/p/q functions in R and their Python equivalents.",
      minutes: 65,
      goals: ["Choose a distribution from a story", "Compute tails with complements"],
      tasks: [
        { label: "Concept map and ELI5", minutes: 15 },
        { label: "Run the paired probability example", minutes: 25 },
        { label: "Recall prompts", minutes: 15 },
        { label: "Write one example of each distribution from your work", minutes: 10 },
      ],
      topicIds: ["w05-d01-probability-distributions"],
    },
    {
      id: "w05-d02",
      day: 2,
      kind: "theory-lab",
      title: "Hypothesis tests and confidence intervals",
      summary: "A two-proportion z-test by hand, checked against R's prop.test.",
      minutes: 80,
      goals: ["Explain a p-value in one sentence", "Report a confidence interval with every test"],
      tasks: [
        { label: "Step through the decision diagram", minutes: 15 },
        { label: "Run the test in both languages", minutes: 25 },
        { label: "Peeking case prompt", minutes: 20 },
        { label: "Recall prompts", minutes: 20 },
      ],
      topicIds: ["w05-d02-hypothesis-testing"],
    },
    {
      id: "w05-d03",
      day: 3,
      kind: "implementation",
      title: "Power analysis",
      summary: "Sample size per arm and achieved power, with the 1 / MDE squared rule.",
      minutes: 80,
      goals: ["Size a test from baseline, MDE, alpha and power", "Explain why small effects are expensive"],
      tasks: [
        { label: "Read the whisper analogy and its limit", minutes: 10 },
        { label: "Run the calculator and its tests", minutes: 30 },
        { label: "Unequal allocation drill", minutes: 25 },
        { label: "Traffic planning prompt", minutes: 15 },
      ],
      topicIds: ["w05-d03-ab-test-power"],
    },
    {
      id: "w05-d04",
      day: 4,
      kind: "applied-practice",
      title: "Bayesian A/B and statistics drills",
      summary: "Beta-Binomial updating, then a mixed set of statistics problems with numeric answers.",
      minutes: 90,
      goals: ["Compute a posterior by hand", "Solve the statistics drills within tolerance"],
      tasks: [
        { label: "Bayesian lesson and example", minutes: 35 },
        { label: "Statistics drills in Practice", minutes: 40 },
        { label: "Log weak spots", minutes: 15 },
      ],
      topicIds: ["w05-d04-bayesian-ab", "w05-d01-probability-distributions", "w05-d02-hypothesis-testing", "w05-d03-ab-test-power"],
    },
    {
      id: "w05-d05",
      day: 5,
      kind: "production-lens",
      title: "The experiment that peeked",
      summary: "Sample ratio mismatch, novelty effects and peeking in a real launch decision.",
      minutes: 60,
      goals: ["Audit an experiment readout before trusting it"],
      tasks: [
        { label: "Read the scenario", minutes: 10 },
        { label: "Answer the case questions", minutes: 35 },
        { label: "Compare against the rubric", minutes: 15 },
      ],
      topicIds: ["w05-d02-hypothesis-testing", "w05-d03-ab-test-power"],
      productionCase: {
        title: "A winning checkout test that will not replicate",
        scenario:
          "A checkout redesign showed +4% conversion with p = 0.01 after five days, and the team shipped it. A follow-up holdout two months later shows no difference. The original test had 50.8% of users in treatment instead of 50%.",
        constraints: [
          "Traffic is about 20,000 eligible users per day.",
          "The test was planned for 14 days but stopped early.",
          "Leadership wants to know whether to roll back.",
        ],
        questions: [
          "What does the 50.8% split suggest, and how would you test it?",
          "How did stopping at day five affect the result?",
          "What could explain an effect that fades over time?",
          "What process changes would you propose?",
        ],
        rubric: [
          "Runs a chi-square sample ratio mismatch test on assignment counts and investigates the cause",
          "Explains optional stopping and inflated false positives",
          "Names novelty effects and weekly seasonality",
          "Proposes pre-registered duration, SRM alerts and holdouts for big launches",
        ],
        pitfalls: ["Trusting any result with a sample ratio mismatch", "Rolling back without checking the holdout's power"],
      },
    },
    {
      id: "w05-d06",
      day: 6,
      kind: "interview-simulation",
      title: "Statistics interview round",
      summary: "Timed questions on tests, intervals, power and experiment pitfalls.",
      minutes: 50,
      goals: ["Answer with formulas and plain-language interpretations"],
      tasks: [
        { label: "Timed statistics questions", minutes: 30 },
        { label: "Experiment design question", minutes: 10 },
        { label: "Self-score with the rubric", minutes: 10 },
      ],
      topicIds: ["w05-d02-hypothesis-testing", "w05-d03-ab-test-power", "w05-d04-bayesian-ab"],
    },
    {
      id: "w05-d07",
      day: 7,
      kind: "review",
      title: "Statistics review",
      summary: "Spaced review and a one-page summary of the formulas you need from memory.",
      minutes: 45,
      goals: ["Clear due reviews", "Write the formula sheet from memory"],
      tasks: [
        { label: "Due reviews", minutes: 20 },
        { label: "Formula sheet from memory, then check", minutes: 25 },
      ],
      topicIds: ["w05-d01-probability-distributions", "w05-d02-hypothesis-testing", "w05-d03-ab-test-power", "w05-d04-bayesian-ab"],
    },
  ],
});
