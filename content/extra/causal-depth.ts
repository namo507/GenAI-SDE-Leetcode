import { code, defineTopic, edge, node, step } from "../helpers";

/** Identification assumptions come before estimator selection. */
export const causalDepth = defineTopic({
  id: "w08-d04-causal-identification",
  slug: "causal-identification",
  title: "Causal identification: DAGs, matching, instruments and DML",
  domain: "advanced-ml",
  roles: ["data-scientist", "data-analyst", "ml-engineer"],
  difficulty: "advanced",
  minutes: 65,
  prerequisites: ["w08-d03-causal-inference", "w07-d02-linear-logistic-regression"],
  objectives: [
    "Read confounder, mediator and collider paths before choosing an adjustment set",
    "State exchangeability and overlap for matching, and relevance, independence, exclusion and monotonicity for an instrument",
    "Compute a cross-fitted residualized effect and explain what DML cannot identify",
  ],
  summary: "A convincing causal answer needs a reason that a comparison represents the intervention you care about. A DAG records that reason. Matching balances measured causes, an instrument supplies outside variation, and double machine learning estimates an identified effect while reducing nuisance-model bias.",
  eli5: {
    analogy: "You want to know whether more watering makes plants taller. Sunny plants get more water and also grow faster. Comparing all wet plants with all dry plants mixes water with sunshine. Draw arrows on cards: sunshine points to water and height, and water points to height.",
    steps: [
      "Name the question: how much would the same kind of plant grow if you changed only its water?",
      "Compare plants with the same sunshine. Matching puts similar plants beside each other. If no dry plants grow in full sun, that comparison is missing.",
      "An outside watering lottery can help, but only if the lottery changes water and cannot change height another way. It tells you about plants whose watering actually changes.",
      "For DML, let one group teach you how sunshine predicts water and height. For the other group, remove those predictions and compare what remains. Swap the groups and combine the comparisons.",
      "A leaf count caused by watering is part of its effect. A prize awarded for either watering or height is a selection trap. Do not automatically match on everything you can measure.",
    ],
    analogyLimit: "You cannot grow the same plant under two watering choices at once. Similar-looking plants may still differ in hidden soil quality. A good drawing, a lottery story or a clever model does not prove the assumptions; you must defend them with how the data were collected.",
  },
  senior: {
    definition: "Identification asks whether an intervention effect is determined by the observed distribution plus stated causal assumptions. Estimation then computes it. A directed acyclic graph (DAG) encodes assumed causal arrows without cycles. Matching, instrumental variables (IV) and double machine learning (DML) solve different problems and require different assumptions.",
    invariants: [
      "Define the population, treatment, outcome and estimand first: total versus direct effect, ATE versus ATT, or an IV local average treatment effect (LATE). Consistency and no relevant interference connect observed outcomes to the chosen intervention.",
      "For binary-treatment adjustment, conditional exchangeability means (Y(0), Y(1)) is independent of D given measured pre-treatment X. Positivity requires both treatments possible at the X values targeted; practical overlap keeps propensity scores away from 0 and 1.",
      "For IV, Z must change D (relevance), be independent of unmeasured outcome causes (possibly conditional on X), and affect Y only through D (exclusion). For binary Z and D, monotonicity rules out people who take treatment only when not encouraged; with the other assumptions, the Wald ratio identifies LATE for compliers.",
      "The worked example uses a continuous dose measured relative to a baseline in a partially linear model Y = theta D + g(X) + error, with zero conditional-mean error given D and X, a constant theta and nonzero residual dose variance. A negative centered dose means less than baseline, not negative physical water. It is a noiseless teaching fixture, not evidence that real observational data meet these assumptions.",
    ],
    mechanism: [
      "A confounder fork D <- X -> Y is an open noncausal path. Conditioning on X blocks it. A mediator chain D -> M -> Y carries part of the total effect; adjusting for M removes that part. A collider D -> C <- Y blocks a path by default; conditioning on C, or its descendant, can open it and create selection bias.",
      "Pearl's backdoor criterion gives a sufficient adjustment rule: choose no descendants of D, and block every path into D. A DAG is assumed from domain knowledge and timing, not inferred simply by drawing arrows between correlated columns. For the plant example, adjust for pre-treatment sunshine, not later leaf count or selection into a prize competition.",
      "Matching compares treated and untreated units with similar pre-treatment covariates, often using a propensity score e(X) = P(D = 1 | X). Check covariate balance and common support after matching. Discarding units without counterparts changes the target population; balance cannot remove hidden confounding.",
      "For a randomized encouragement Z, the binary-IV Wald estimate is [E(Y|Z=1) - E(Y|Z=0)] / [E(D|Z=1) - E(D|Z=0)]. An outcome difference of 2 with a treatment-rate difference of 0.4 gives LATE = 5 for compliers, not automatically ATE. A small denominator means weak identification; exclusion and independence need substantive arguments.",
      "For partially linear DML, fit m(X) = E(D|X) and l(X) = E(Y|X) outside each held-out fold. On held-out rows compute V = D - m_hat(X), U = Y - l_hat(X), then theta_hat = sum(V U) / sum(V squared). Solve the orthogonal moment E[V(U - theta V)] = 0: small nuisance errors have no first-order effect at the truth. Cross-fitting separates nuisance training from score evaluation; it does not remove omitted confounding or guarantee finite-sample accuracy.",
      "Here each fold contains two doses at each sunshine level. Opposite-fold means are m(0)=0, m(1)=2, l(0)=0, l(1)=11. Every held-out residual dose is -1 or +1 and its residual outcome is exactly three times it. The unadjusted slope is 4.25, while the cross-fitted coefficient is 3.00.",
    ],
    complexity: "The teaching group-mean nuisance learners and score aggregation are O(n) time and O(n + s) space for n rows and s observed strata. General K-fold DML costs K times the two nuisance fits plus O(n) scoring; uncertainty also requires the appropriate influence-function variance and a sampling design that respects clusters or time.",
    tradeoffs: [
      { option: "Randomized experiment", choose: "You can assign treatment ethically and operationally.", cost: "Needs sample size, compliance handling and protection against interference; external validity still matters." },
      { option: "Matching or weighting", choose: "Measured pre-treatment causes plausibly explain treatment selection and groups overlap.", cost: "Hidden causes remain; poor overlap makes the target effect unstable or unidentified." },
      { option: "Instrumental variables", choose: "Credible outside variation shifts treatment despite hidden treatment-outcome confounding.", cost: "Exclusion is difficult to defend, weak instruments are unstable, and LATE can differ from the policy's target ATE." },
      { option: "Cross-fitted DML", choose: "The effect is already identified and flexible nuisance prediction is useful.", cost: "Needs adequate data and nuisance rates; it is an estimator framework, not a substitute for identification." },
    ],
    failureModes: [
      "Adjusting for a post-treatment mediator while claiming to estimate the total effect, or selecting on a collider such as enrollment caused by both treatment and health.",
      "Calling matched groups randomized, or extrapolating effects into regions with no comparable controls.",
      "Calling an instrument valid because its first-stage association is significant; that checks relevance, not exclusion or independence.",
      "Fitting nuisances on the same rows used for the causal score, splitting repeated users across folds, or applying random folds to a time-dependent intervention.",
      "Residualizing only Y, using an unadjusted D denominator, or treating a good predictive score as proof of a causal effect.",
    ],
    production: "Before running an estimator, write the estimand, DAG, collection process and identifying assumptions in a reviewable analysis plan. Inspect overlap and balance, run sensitivity and placebo checks suited to the design, preserve user or time boundaries in folds, and report confidence intervals and target-population limits. This lesson prints point estimates only; it does not implement inferential uncertainty or certify a real intervention.",
    interviewAnswer: "I define the estimand and draw the causal graph before choosing a model. With measured confounders and overlap, I can adjust or match; with credible outside variation I can use IV, interpreting a binary-instrument result as LATE under monotonicity. DML combines an orthogonal score with cross-fitting to reduce nuisance-estimation bias after identification is established. None of these methods repairs an unjustified causal assumption.",
  },
  implementation: {
    problem: "Compare an unadjusted dose-outcome slope with a two-fold residualized estimate in a synthetic confounded dataset.",
    input: "Eight rows: two folds, sunshine X in {0,1}, residual dose in {-1,+1}; D = 2X + residual, Y = 3D + 5X. Dose and outcome are measured relative to baselines, so negative values mean below baseline.",
    python: {
      code: code`
        Row = tuple[int, float, float, int]


        def make_rows() -> list[Row]:
            rows: list[Row] = []
            for fold in (0, 1):
                for x in (0, 1):
                    for residual in (-1.0, 1.0):
                        dose = 2 * x + residual
                        rows.append((x, dose, 3 * dose + 5 * x, fold))
            return rows


        def slope(xs: list[float], ys: list[float]) -> float:
            mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
            denominator = sum((x - mx) ** 2 for x in xs)
            if denominator < 1e-12:
                raise ValueError("no variation")
            return sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / denominator


        def nuisance_means(rows: list[Row], heldout: int) -> dict[int, tuple[float, float]]:
            groups: dict[int, list[tuple[float, float]]] = {}
            for x, d, y, fold in rows:
                if fold != heldout:
                    groups.setdefault(x, []).append((d, y))
            return {x: (sum(d for d, _ in pairs) / len(pairs),
                        sum(y for _, y in pairs) / len(pairs)) for x, pairs in groups.items()}


        def cross_fit(rows: list[Row]) -> float:
            vd, vy = [0.0] * len(rows), [0.0] * len(rows)
            for fold in sorted({r[3] for r in rows}):
                means = nuisance_means(rows, fold)
                for i, (x, d, y, row_fold) in enumerate(rows):
                    if row_fold == fold:
                        if x not in means:
                            raise ValueError("held-out stratum missing from training")
                        md, my = means[x]
                        vd[i], vy[i] = d - md, y - my
            denominator = sum(v * v for v in vd)
            if denominator < 1e-12:
                raise ValueError("no residual dose variation")
            return sum(v * u for v, u in zip(vd, vy)) / denominator


        rows = make_rows()
        naive = slope([r[1] for r in rows], [r[2] for r in rows])
        print(f"rows: {len(rows)} folds: 2")
        print(f"unadjusted slope: {naive:.2f}")
        print(f"cross-fitted effect per dose unit: {cross_fit(rows):.2f}")
        print("true effect in this fixture: 3.00")
      `,
    },
    r: {
      code: code`
        make_rows <- function() {
          rows <- data.frame(x = numeric(), d = numeric(), y = numeric(), fold = integer())
          for (fold in 0:1) {
            for (x in 0:1) {
              for (residual in c(-1, 1)) {
                dose <- 2 * x + residual
                rows <- rbind(rows, data.frame(x = x, d = dose, y = 3 * dose + 5 * x, fold = fold))
              }
            }
          }
          rows
        }

        slope <- function(xs, ys) {
          mx <- mean(xs); my <- mean(ys)
          denominator <- sum((xs - mx)^2)
          if (denominator < 1e-12) stop("no variation")
          sum((xs - mx) * (ys - my)) / denominator
        }

        nuisance_means <- function(rows, heldout) {
          train <- rows[rows$fold != heldout, , drop = FALSE]
          groups <- split(train, train$x)
          lapply(groups, function(g) c(mean(g$d), mean(g$y)))
        }

        cross_fit <- function(rows) {
          vd <- numeric(nrow(rows)); vy <- numeric(nrow(rows))
          for (fold in sort(unique(rows$fold))) {
            means <- nuisance_means(rows, fold)
            for (i in which(rows$fold == fold)) {
              key <- as.character(rows$x[i])
              if (is.null(means[[key]])) stop("held-out stratum missing from training")
              vd[i] <- rows$d[i] - means[[key]][1]
              vy[i] <- rows$y[i] - means[[key]][2]
            }
          }
          denominator <- sum(vd * vd)
          if (denominator < 1e-12) stop("no residual dose variation")
          sum(vd * vy) / denominator
        }

        rows <- make_rows()
        naive <- slope(rows$d, rows$y)
        cat(sprintf("rows: %d folds: 2\n", nrow(rows)))
        cat(sprintf("unadjusted slope: %.2f\n", naive))
        cat(sprintf("cross-fitted effect per dose unit: %.2f\n", cross_fit(rows)))
        cat("true effect in this fixture: 3.00\n")
      `,
    },
    expectedOutput: code`
      rows: 8 folds: 2
      unadjusted slope: 4.25
      cross-fitted effect per dose unit: 3.00
      true effect in this fixture: 3.00
    `,
    tests: {
      python: code`
        def test_effect_and_confounding():
            data = make_rows()
            assert abs(cross_fit(data) - 3.0) < 1e-12
            assert abs(slope([r[1] for r in data], [r[2] for r in data]) - 4.25) < 1e-12


        def test_heldout_outcomes_do_not_train_nuisances():
            data = make_rows()
            changed = [(x, d, y + 1000 if f == 0 else y, f) for x, d, y, f in data]
            assert nuisance_means(changed, 0) == nuisance_means(data, 0)


        def test_shift_invariance():
            data = [(x, d, y + 10, f) for x, d, y, f in make_rows()]
            assert abs(cross_fit(data) - 3.0) < 1e-12


        def test_no_residual_variation_is_rejected():
            data = [(x, 2.0 * x, 11.0 * x, f) for x, _, _, f in make_rows()]
            try:
                cross_fit(data)
            except ValueError as error:
                assert "no residual dose" in str(error)
            else:
                assert False, "must reject an unidentified coefficient"
      `,
      r: code`
        test_that("adjustment recovers the fixture effect", {
          data <- make_rows()
          expect_equal(cross_fit(data), 3)
          expect_equal(slope(data$d, data$y), 4.25)
        })
        test_that("held-out outcomes do not train nuisances", {
          data <- make_rows()
          changed <- data
          changed$y[changed$fold == 0] <- changed$y[changed$fold == 0] + 1000
          expect_equal(nuisance_means(changed, 0), nuisance_means(data, 0))
        })
        test_that("outcome shifts leave the effect unchanged", {
          data <- make_rows(); data$y <- data$y + 10
          expect_equal(cross_fit(data), 3)
        })
        test_that("no residual variation is rejected", {
          data <- make_rows(); data$d <- 2 * data$x; data$y <- 11 * data$x
          expect_error(cross_fit(data), "no residual dose")
        })
      `,
    },
    eli5Trace: [
      "Sunshine raises both dose and height, so the simple slope counts some sunshine as watering: 4.25.",
      "For fold 0, learn sunshine-group means only from fold 1. Reverse the roles for fold 1.",
      "Subtract group predictions. Each remaining dose is -1 or +1, and each remaining height is -3 or +3.",
      "The eight dose-height products add to 24; eight squared doses add to 8. The answer is 24 / 8 = 3.",
      "This exact answer follows from a deliberately noiseless fixture; real data require uncertainty estimates and a defensible causal design.",
    ],
    complexity: { time: "O(n)", space: "O(n + s)", note: "Two fixed folds and group-mean nuisances over s sunshine strata; no general ML library is needed." },
    edgeCases: [
      "A held-out sunshine group absent from training has no nuisance prediction; raise an error rather than inventing one.",
      "If dose has no variation after conditioning on sunshine, the denominator is zero and this coefficient cannot be estimated.",
      "Repeated users or time dependence require grouped or temporal sample splits; random row splits can leak information.",
    ],
    incorrect: {
      language: "python",
      code: code`
        # Wrong: residualize the outcome but keep the original dose.
        theta = sum(d * u for d, u in zip(dose, outcome_residual)) / sum(d * d for d in dose)
      `,
      whyWrong: "Original dose still includes the part explained by sunshine. The partially linear orthogonal score needs residualized dose in both the numerator and denominator, with out-of-fold nuisance predictions.",
      fix: "Compute V = D - m_hat(X) and U = Y - l_hat(X) outside the training fold, then divide sum(V * U) by sum(V * V).",
    },
    walkthrough: [
      { python: "def make_rows()", r: "make_rows <- function()", pythonLines: 10, rLines: 12, eli5: "Build two identical little gardens so each group contains sunny and shady plants with two watering doses. The true watering effect is written into the fixture as three." },
      { python: "def slope(", r: "slope <- function", pythonLines: 6, rLines: 6, eli5: "Measure the simple line before removing sunshine. It mixes the two causes and reports 4.25." },
      { python: "def nuisance_means(", r: "nuisance_means <- function", pythonLines: 7, rLines: 5, eli5: "Use only the other group to learn average dose and height for each sunshine level. The held-out plants do not teach their own predictions." },
      { python: "means = nuisance_means(rows, fold)", r: "means <- nuisance_means(rows, fold)", pythonLines: 7, rLines: 7, eli5: "For each held-out plant, subtract the dose and height you expected from its sunshine. Keep the two leftovers." },
      { python: "denominator = sum(v * v for v in vd)", r: "denominator <- sum(vd * vd)", pythonLines: 4, rLines: 3, eli5: "Compare leftover height with leftover dose. Stop if there is no leftover dose to compare; otherwise the ratio is 24 divided by 8, or three." },
    ],
  },
  flow: {
    title: "Identify the comparison before estimating it",
    nodes: [
      node("sun", "Sunshine X", 0, 0, "Pre-treatment common cause"),
      node("dose", "Water dose D", 250, 100, "Intervention of interest"),
      node("height", "Height Y", 500, 0, "Outcome"),
      node("fold", "Cross-fit nuisances", 250, 260, "Learn on other fold"),
      node("residual", "Residual score", 500, 260, "sum(VU) / sum(V²)"),
    ],
    edges: [edge("sun", "dose"), edge("sun", "height"), edge("dose", "height"), edge("dose", "fold"), edge("fold", "residual")],
    steps: [
      step("sun dose height", "sun-dose sun-height", "Sunshine is a common cause of watering and height. The path from dose backward through sunshine to height confounds the raw comparison."),
      step("dose height", "dose-height", "The target is the effect of changing water. Keep this causal path, and justify an adjustment that blocks the sunshine backdoor path."),
      step("sun dose fold", "dose-fold", "If measured sunshine suffices for identification, estimate its dose and outcome predictions on a different fold. Matching or IV would require their own assumptions instead."),
      step("fold residual", "fold-residual", "Score held-out residuals, swap folds, and aggregate. Orthogonality and cross-fitting address estimation bias, not hidden confounding."),
    ],
  },
  practice: [
    { id: "w08-causal-depth-controls", type: "recall", prompt: "For D <- X -> Y, D -> M -> Y, and D -> C <- Y, which variables should you adjust for when estimating the total effect of D?", answer: "Adjust for pre-treatment confounder X to block the backdoor fork. Do not adjust for mediator M when estimating the total effect because it blocks part of that effect. Do not condition on collider C or its descendants because doing so can open a noncausal path. A full graph may change which set is sufficient.", rubric: ["Confounder blocks a backdoor", "Mediator carries the total effect", "Collider selection opens a path", "Check the full DAG"] },
    { id: "w08-causal-depth-matching", type: "case", prompt: "After matching discount recipients to nonrecipients, all customers with propensity above 0.95 have been dropped. Can you report an ATE for all customers?", answer: "No. The unmatched high-propensity region lacks credible controls, so the retained estimate targets a restricted overlap population unless extra extrapolation assumptions are made. Report who was removed, balance in the retained sample, the resulting estimand and sensitivity to hidden confounding.", rubric: ["Overlap failure", "Changed target population", "Balance is insufficient for hidden confounding"] },
    { id: "w08-causal-depth-iv", type: "case", prompt: "A randomized email raises enrollment by 0.4 and average outcome by 2. What does the ratio 5 mean, and what could invalidate it?", answer: "Under consistency, random assignment, exclusion, relevance and monotonicity, it is the LATE among people whose enrollment changes because of the email. If the email directly motivates better outcomes, exclusion fails. If some enroll only when they do not receive it, monotonicity fails. The estimate need not equal the ATE for everyone.", rubric: ["Wald ratio 2 / 0.4", "LATE for compliers", "Exclusion and monotonicity", "Not automatically ATE"] },
    { id: "w08-causal-depth-dml", type: "design", prompt: "A colleague says that using a neural network with cross-fitting proves a treatment effect is causal. How do you respond?", answer: "Cross-fitting separates nuisance training from score evaluation; an orthogonal score reduces first-order sensitivity to nuisance errors. Causal identification still needs a credible design, suitable covariates and overlap or another identification strategy. Check the estimand and DAG, nuisance diagnostics, grouping or temporal leakage, uncertainty, and hidden-confounding sensitivity before making a causal claim.", rubric: ["Identification versus estimation", "Orthogonality plus cross-fitting", "Assumptions and overlap", "Uncertainty and leakage"] },
  ],
  references: [
    { title: "Pearl: Probabilistic and Causal Inference, backdoor criterion", url: "https://ftp.cs.ucla.edu/pub/stat_ser/ACMBook-published-2022.pdf", versionSensitive: false },
    { title: "Imbens and Angrist (1994): Identification and Estimation of Local Average Treatment Effects", url: "https://www.gsb.stanford.edu/faculty-research/publications/identification-estimation-local-average-treatment-effects", versionSensitive: false },
    { title: "Chernozhukov et al.: Double/Debiased Machine Learning for Treatment and Structural Parameters", url: "https://www.nber.org/papers/w23564", versionSensitive: false },
  ],
  lastReviewed: "2026-10-28",
});
