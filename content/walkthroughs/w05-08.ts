import type { WalkthroughStepInput } from "@/lib/curriculum";

export const walkthroughs: Record<string, WalkthroughStepInput[]> = {
  "w05-d01-probability-distributions": [
    { python: "def binom_pmf", pythonLines: 6, r: "cat(sprintf", rLines: 2, eli5: "Binomial: flip a coin that lands heads 30% of the time 10 times. How likely is exactly 3 heads, and how likely is 3 or fewer?" },
    { python: "iq = NormalDist", pythonLines: 2, r: "cat(sprintf(\"Normal", rLines: 2, eli5: "Normal: scores that cluster around 100 with a typical spread of 15. How many score 130 or less, and where is the top 5% line?" },
    { python: "def poisson_pmf", pythonLines: 2, r: "lambda <", rLines: 3, eli5: "Poisson: on average 2 things happen per hour. How likely is none at all, and how likely is 3 or more?" },
    { python: "n, p = 10", pythonLines: 2, r: "n <- 10", rLines: 4, eli5: "Python writes the formulas itself; R has them built in as dbinom, pbinom, pnorm, qnorm, dpois and ppois." },
  ],
  "w05-d02-hypothesis-testing": [
    { python: "def two_proportion_test", pythonLines: 5, r: "two_proportion_test", rLines: 6, eli5: "Pretend the button made no difference and pool everyone together. Then measure how surprising the real gap is (z) and how often luck alone would give a gap that big (p)." },
    { python: "se = sqrt", pythonLines: 3, r: "se <- sqrt", rLines: 3, eli5: "Build a range of believable true differences: the gap plus or minus about two wobbles." },
    { python: "z, p_value, lo", pythonLines: 5, r: "res <- two_proportion_test", rLines: 5, eli5: "200 of 2,000 versus 250 of 2,000: p is 0.0124 and the range stays above zero, so we say the change is real." },
  ],
  "w05-d03-ab-test-power": [
    { python: "def n_per_arm", pythonLines: 5, r: "n_per_arm", rLines: 6, eli5: "How many people per group do we need to spot a change of a given size 80% of the time? Smaller changes need many more people." },
    { python: "def achieved_power", pythonLines: 4, r: "achieved_power", rLines: 5, eli5: "Flip it around: with 2,000 people per group, how often would we spot a 2.5 point change? About 71% of the time." },
    { python: "for mde in", pythonLines: 3, r: "for (mde", rLines: 4, eli5: "A 1 point change needs 14,751 people per group, 2 points needs 3,841, 5 points needs only 686." },
  ],
  "w05-d04-bayesian-ab": [
    { python: "a_a, b_a =", pythonLines: 2, r: "a_a <- 1", rLines: 2, eli5: "Start knowing nothing (1 success and 1 failure as a pretend guess), then add the real counts to each group." },
    { python: "def summary", pythonLines: 4, r: "posterior_summary", rLines: 3, eli5: "Each group's belief is a Beta curve: its middle is the likely rate and its width is how unsure we are." },
    { python: "def prob_b_beats_a", pythonLines: 5, r: "prob_b_beats_a", rLines: 4, eli5: "Add up the exact chance that the treatment's true rate is higher than the control's." },
    { python: "for name", pythonLines: 4, r: "arms <- list", rLines: 7, eli5: "Print both beliefs and the answer: a 99.4% chance the treatment is better." },
  ],
  "w06-d01-data-quality-eda": [
    { python: "ROWS = [", pythonLines: 6, r: "rows <- data", rLines: 6, eli5: "A messy table of orders: one row is repeated, one amount is missing, one is negative and one country is blank." },
    { python: "duplicates", pythonLines: 6, r: "cat(sprintf", rLines: 3, eli5: "Count each kind of mess before touching anything." },
    { python: "clean = [r", pythonLines: 2, r: "clean <-", rLines: 2, eli5: "Throw out the repeat, the missing amount and the negative one." },
    { python: "q1, q2, q3", pythonLines: 3, r: "q <- quantile", rLines: 4, eli5: "Find the middle half of the amounts and build fences 1.5 lengths beyond it. Anything outside the fences, like 400, is an outlier." },
    { python: "inliers =", pythonLines: 2, r: "inliers <", rLines: 2, eli5: "One giant order pulls the average up to 81, while the median stays at 29." },
  ],
  "w06-d02-metrics-funnels": [
    { python: "FUNNEL =", pythonLines: 11, r: "funnel <", rLines: 9, eli5: "Every click users made, with a time. The funnel is visit, then signup, then activate, then purchase." },
    { python: "def funnel_counts", pythonLines: 13, r: "funnel_counts", rLines: 16, eli5: "For each user, walk through their clicks in time order and only count a step if all earlier steps already happened." },
    { python: "counts = funnel_counts", pythonLines: 5, r: "counts <- funnel_counts", rLines: 6, eli5: "Print how many users reached each step, as a share of visitors and of the step before." },
  ],
  "w06-d03-cohort-retention": [
    { python: "SIGNUP =", pythonLines: 7, r: "signup <", rLines: 7, eli5: "Who joined in which week, and which weeks each person came back." },
    { python: "def retention_table", pythonLines: 12, r: "retention_table", rLines: 10, eli5: "For each joining week, what share came back 0, 1 and 2 weeks later? Weeks in the future get a dash, not a zero." },
    { python: "table = retention_table", pythonLines: 6, r: "tab <- retention_table", rLines: 7, eli5: "Print the table: each row is a joining week, each column is weeks since joining." },
  ],
  "w07-d01-splits-and-leakage": [
    { python: "X = [10,", pythonLines: 2, r: "x <- c(10", rLines: 3, eli5: "Ten numbers in time order. The first six are for learning, the last four are the future we test on." },
    { python: "def standardize", pythonLines: 2, r: "standardize", eli5: "Standardize: subtract the average and divide by the spread." },
    { python: "mu_train", pythonLines: 4, r: "cat(sprintf", rLines: 2, eli5: "Measure the average and spread from training only, and again from all the data, which peeks at the future." },
    { python: "print(\"test", pythonLines: 2, r: "cat(\"test", rLines: 2, eli5: "With honest measurements the future looks wildly unusual (z near 13). Peeking hides that, making it look normal (z near 1)." },
  ],
  "w07-d02-linear-logistic-regression": [
    { python: "def ols(x", pythonLines: 10, r: "lin <- lm", rLines: 2, eli5: "Draw the straight line that keeps the squared misses as small as possible, and say how much of the wiggle it explains (r2)." },
    { python: "def sigmoid", pythonLines: 2, r: "logit <-", eli5: "Squash any number into a chance between 0 and 1 with the S-shaped sigmoid curve." },
    { python: "def fit_logistic", pythonLines: 19, r: "logit <-", rLines: 2, eli5: "Fit the pass-or-fail line by Newton steps: each round, use the slope and the curvature to jump closer to the best fit. R's glm does this for us." },
    { python: "a, b, r2", pythonLines: 5, r: "cat(sprintf(\"logistic", rLines: 2, eli5: "Each extra hour of study multiplies the odds of passing by about 3.9, and 2.75 hours is a coin flip." },
  ],
  "w07-d03-classification-metrics": [
    { python: "def confusion", pythonLines: 6, r: "confusion", rLines: 4, eli5: "Pick a cut-off score and sort predictions into four boxes: right yes, wrong yes, missed yes, right no." },
    { python: "def auc(y", pythonLines: 5, r: "auc <- function", rLines: 6, eli5: "AUC: pick a random yes and a random no. How often does the yes get the higher score?" },
    { python: "for t in", pythonLines: 5, r: "for (t in", rLines: 8, eli5: "Lowering the cut-off from 0.5 to 0.3 catches every yes but adds a false alarm." },
    { python: "brier = sum", pythonLines: 3, r: "brier <-", rLines: 3, eli5: "Brier and log loss grade the probabilities themselves; log loss punishes confident mistakes hardest." },
  ],
  "w07-d04-trees-boosting": [
    { python: "def gini", pythonLines: 5, r: "gini <- function", rLines: 5, eli5: "Gini measures how mixed a pile is: 0 means all the same, 0.5 means half and half." },
    { python: "def best_gini_split", pythonLines: 11, r: "best_gini_split", rLines: 16, eli5: "Try every split point and keep the one that leaves the two piles least mixed." },
    { python: "def fit_stump", pythonLines: 12, r: "fit_stump", rLines: 12, eli5: "A stump is a one-question tree: split once and predict the average on each side." },
    { python: "def boost", pythonLines: 8, r: "boost <-", rLines: 10, eli5: "Boosting: guess the average, then add small corrections, each stump learning the mistakes that are left. The error shrinks every round." },
  ],
  "w08-d01-clustering-pca": [
    { python: "def kmeans", pythonLines: 11, r: "kmeans_lloyd", rLines: 10, eli5: "k-means: put each point with its nearest center, move each center to the middle of its points, and repeat until nothing moves." },
    { python: "labels, centers, iters", pythonLines: 4, r: "km <- kmeans_lloyd", rLines: 5, eli5: "Start from three points as centers; it settles after 2 rounds into three groups of three." },
    { python: "def pca_2d", pythonLines: 9, r: "ev <- eigen", eli5: "PCA finds the direction the points spread out the most. Python works out the two spreads by hand; R asks eigen for them." },
    { python: "l1, l2 =", pythonLines: 2, r: "cat(sprintf(\"pca", eli5: "The main direction explains about 74% of the spread." },
  ],
  "w08-d02-anomaly-forecasting": [
    { python: "def robust_z", pythonLines: 4, r: "robust_z", eli5: "Measure how far each day is from the median, in units of a typical wobble that one weird day cannot stretch." },
    { python: "z = robust_z", pythonLines: 4, r: "z <- robust_z", rLines: 4, eli5: "Day 6, with 160, is more than 3.5 wobbles away, so it is flagged." },
    { python: "def ses_forecasts", pythonLines: 7, r: "ses_forecasts", rLines: 9, eli5: "Smoothing: tomorrow's guess is half today's value plus half the old guess." },
    { python: "f = ses_forecasts", pythonLines: 6, r: "f <- ses_forecasts", rLines: 6, eli5: "Compare its mistakes with 'tomorrow equals today'. Smoothing makes smaller mistakes here." },
  ],
  "w08-d03-causal-inference": [
    { python: "DATA = {", pythonLines: 6, r: "d <- data", rLines: 5, eli5: "Sales before and after a launch, for stores that got it and stores that did not." },
    { python: "m = {k: mean", pythonLines: 4, r: "cell <- function", rLines: 4, eli5: "The launched stores rose by 5, but the others also rose by 2 on their own. The launch's real effect is the difference: 3." },
    { python: "print(f\"naive", pythonLines: 4, r: "cat(sprintf", rLines: 4, eli5: "The two naive answers both say 5 and are wrong because they ignore the shared trend." },
  ],
  "w08-d04-kaplan-meier-survival": [
    { python: "DATA = [", r: "months <", rLines: 2, eli5: "Ten subscriptions: how many months each lasted, and whether it was cancelled (1) or is still going (0)." },
    { python: "def kaplan_meier", pythonLines: 9, r: "kaplan_meier", rLines: 12, eli5: "At each month someone cancelled, count who was still around and how many left, and multiply the surviving share into a running total." },
    { python: "table = kaplan_meier", pythonLines: 5, r: "km <- kaplan_meier", rLines: 5, eli5: "Print the table; the median is the first month the survival drops to half or below: month 9." },
  ],
};
