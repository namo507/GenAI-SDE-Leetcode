import { code, defineTopic, node, edge, step } from "../helpers";

export const numericalStability = defineTopic({
  id: "w09-d03-numerical-stability", slug: "numerical-stability", title: "Numerical stability: softmax without overflow", domain: "deep-learning",
  roles: ["data-scientist", "ml-engineer", "genai-engineer", "data-engineer"], difficulty: "intermediate", minutes: 40,
  prerequisites: ["w01-d05-linear-algebra-geometry", "w05-d04-information-theory", "w09-d01-backpropagation"],
  objectives: ["Distinguish an algebraically correct formula from a stable floating-point implementation", "Derive the max-shift softmax and log-sum-exp identities", "Diagnose overflow, underflow and cancellation without silently changing the model"],
  summary: "Computers store a finite set of numbers. A mathematically valid exponential can overflow before you divide it by another large number. Shift logits before exponentiating, keep log probabilities in log space, and test the invariances your transformation is supposed to preserve.",
  eli5: {
    analogy: "Two tall towers are 1,000 and 1,001 blocks high. Your measuring stick cannot reach them. Move the zero mark to the taller tower first: the shorter is now one block below it and the taller is at zero. You can compare their relative heights without building either giant tower again.",
    steps: ["The original scores can be large, but softmax only needs their differences.", "Subtract the biggest score from every score. At least one becomes zero and none is positive.", "Turn the shifted scores into positive weights and divide by their sum.", "For the log of the total, add the biggest score back after taking the log of the small sum."],
    analogyLimit: "Softmax uses exponentials, not literal tower heights. Moving the common reference preserves the ratios algebraically, but finite-precision computers can still round tiny probabilities to zero. A stable formula does not repair bad input data, missing masks or an unsuitable model.",
  },
  senior: {
    definition: "Floating-point arithmetic has finite range and precision. Numerical stability concerns how rounding and representation errors affect a computation. For finite logits z and m = max(z), softmax_i(z) = exp(z_i − m) / sum_j exp(z_j − m), and logsumexp(z) = m + log(sum_j exp(z_j − m)).",
    invariants: ["The input is a nonempty finite vector; this lesson explicitly rejects NaN and infinities rather than inventing an all-masked policy.", "Adding the same finite constant to every logit preserves softmax mathematically. Log-sum-exp increases by that constant.", "Class order, masking and log units stay unchanged. The transformation is a common shift, not clipping or a change in temperature."],
    mechanism: ["Directly computing exp(1000) exceeds ordinary binary64 floating-point range, even though the normalized probabilities for logits [1000,1001] are well defined.", "Factor exp(m) from numerator and denominator so it cancels before it is materialized. All shifted exponentials lie in (0,1] mathematically, so their sum is at least one for finite inputs.", "For [1000,1001], evaluate exp(−1) and exp(0). The probabilities are approximately 0.268941 and 0.731059; log-sum-exp is approximately 1001.313262.", "Algebraically, log-softmax is z_i − logsumexp(z). Numerically, use the fused shifted form (z_i − m) − log(sum_j exp(z_j − m)). Subtracting a separately rounded huge log-sum-exp can lose the small log-normalizer: with equal scores of 1e20, the separate subtraction may return zero instead of −log(2). Taking log of an underflowed probability has a different failure. Tested fused routines avoid these unnecessary intermediates.", "Overflow creates infinities; underflow can round tiny values to zero. Cancellation loses relative information when nearly equal rounded numbers are subtracted. Rescaling, alternative identities, higher precision or compensated summation address different mechanisms.", "An attention mask intentionally excludes positions. If every position is masked, subtracting a maximum of negative infinity is undefined; a real system needs an explicit validated policy for that case. This finite-logit example does not claim to implement masked attention."],
    complexity: "Two or three linear passes over k logits cost O(k) time. The returned probability vector uses O(k) space; the log-sum-exp accumulator alone can use O(1) extra space. Stability is not a claim that floating-point results are exact.",
    tradeoffs: [{ option: "Max-shift and fused log-space routines", choose: "You need the same mathematical distribution without overflow-prone intermediate exponentials.", cost: "Tiny probabilities may still underflow; all-masked or nonfinite inputs need deliberate handling." }, { option: "Higher precision", choose: "The required dynamic range or accumulated error justifies additional precision.", cost: "More memory and compute; precision does not repair an invalid formula or data contract." }, { option: "Probability clipping", choose: "An explicitly documented scoring or robustness policy requires bounded log loss.", cost: "Changes the scored forecast and loss. It is not algebraically equivalent to a common logit shift." }],
    failureModes: ["Computing the enormous exponentials before subtracting the maximum.", "Replacing every NaN with zero and treating the result as a valid normalized distribution.", "Adding epsilon to probabilities without reporting the change to evaluation.", "Confusing a common logit shift with temperature scaling; temperature generally changes the distribution."],
    production: "Use tested library log-softmax and cross-entropy primitives, validate finite inputs and masks, and check normalization and shift invariance on controlled fixtures. Log dtype, reduction convention and nonfinite-value counts when diagnosing training failures. Numerical checks complement, rather than replace, gradient and model-quality checks.",
    interviewAnswer: "I separate mathematical equivalence from finite-precision behavior. For softmax I subtract the maximum before exponentiation, and for log probabilities I use a fused log-space computation. I validate finite inputs and masks, test shift invariance and normalization, and treat clipping as an explicit policy change. A stable computation still needs correct data and a useful objective.",
  },
  implementation: {
    problem: "Normalize large finite logits and compute their log-sum-exp while exposing the failure of naive exponentiation.", input: "Logits [1000,1001] in natural-log units.",
    python: { code: code`
      from math import exp, log, isfinite

      def logsumexp(values: list[float]) -> float:
          if not values or not all(isfinite(x) for x in values):
              raise ValueError("expected nonempty finite logits")
          maximum = max(values)
          return maximum + log(sum(exp(x - maximum) for x in values))

      def softmax(values: list[float]) -> list[float]:
          logsumexp(values)  # shared validation, not a probability clipping rule
          maximum = max(values)
          weights = [exp(x - maximum) for x in values]
          total = sum(weights)
          return [w / total for w in weights]

      logits = [1000.0, 1001.0]
      try:
          naive_finite = all(isfinite(exp(x)) for x in logits)
      except OverflowError:
          naive_finite = False
      print("naive exponentials finite: " + str(naive_finite).lower())
      print("stable probabilities: " + ",".join(f"{p:.6f}" for p in softmax(logits)))
      print(f"log-sum-exp: {logsumexp(logits):.6f}")
    ` },
    r: { code: code`
      logsumexp <- function(values) {
        if (length(values) == 0 || !all(is.finite(values))) stop("expected nonempty finite logits")
        maximum <- max(values)
        maximum + log(sum(exp(values - maximum)))
      }

      softmax <- function(values) {
        logsumexp(values) # validate without clipping
        maximum <- max(values)
        weights <- exp(values - maximum)
        weights / sum(weights)
      }

      logits <- c(1000,1001)
      naive_finite <- all(is.finite(exp(logits)))
      cat(sprintf("naive exponentials finite: %s\n", tolower(as.character(naive_finite))))
      cat(sprintf("stable probabilities: %s\n", paste(sprintf("%.6f",softmax(logits)),collapse=",")))
      cat(sprintf("log-sum-exp: %.6f\n",logsumexp(logits)))
    ` },
    expectedOutput: "naive exponentials finite: false\nstable probabilities: 0.268941,0.731059\nlog-sum-exp: 1001.313262",
    tests: {
      python: code`
        def test_shift_and_normalization():
            a = softmax([0.0,1.0])
            b = softmax([10000.0,10001.0])
            assert max(abs(x-y) for x,y in zip(a,b)) < 1e-12
            assert abs(sum(b)-1) < 1e-12
            assert abs(logsumexp([10000.0,10001.0])-logsumexp([0.0,1.0])-10000) < 1e-9

        def test_equal_and_invalid():
            assert softmax([3.0,3.0]) == [0.5,0.5]
            for bad in ([], [float('nan')], [float('inf')]):
                try:
                    softmax(bad)
                except ValueError:
                    continue
                raise AssertionError("invalid logits accepted")
      `,
      r: code`
        test_that("shift preserves probabilities and normalization", {
          expect_equal(softmax(c(0,1)),softmax(c(10000,10001)),tolerance=1e-12)
          expect_equal(sum(softmax(c(10000,10001))),1,tolerance=1e-12)
          expect_equal(logsumexp(c(10000,10001))-logsumexp(c(0,1)),10000,tolerance=1e-9)
        })
        test_that("ties are uniform and invalid inputs are explicit", {
          expect_equal(softmax(c(3,3)),c(0.5,0.5))
          expect_error(softmax(numeric()),"finite logits")
          expect_error(softmax(c(NaN)),"finite logits")
          expect_error(softmax(c(Inf)),"finite logits")
        })
      `,
    },
    eli5Trace: ["The direct exponentials are too large for ordinary floating-point numbers.", "Subtract 1001 to work with scores −1 and 0, whose exponentials are small.", "Divide by the small sum to obtain probabilities, then add 1001 back only for log-sum-exp."],
    complexity: { time: "O(k) for k logits", space: "O(k) for returned probabilities", note: "This small implementation makes an extra validation pass for clarity. Production code normally uses a fused, tested primitive." },
    edgeCases: ["An empty or nonfinite logit vector is rejected by this explicit contract.", "Equal finite logits produce equal probabilities.", "Very separated finite logits may produce underflowed zero probabilities even with the stable transformation."],
    incorrect: { language: "python", code: "weights = [exp(x) for x in logits]\nprobabilities = [w / sum(weights) for w in weights]", whyWrong: "The large exponentials overflow before their common scale can cancel. The mathematical ratio being finite does not make the intermediate values representable.", fix: "Subtract the maximum before exponentiation. Keep log probabilities in log space instead of logging underflowed probabilities." },
    walkthrough: [{ python: "def logsumexp(", r: "logsumexp <-", pythonLines: 5, rLines: 5, eli5: "Check the inputs, move the reference to the largest score and add that reference back after taking the log." }, { python: "def softmax(", r: "softmax <-", pythonLines: 6, rLines: 6, eli5: "Use the same shifted weights but divide by their sum. The common reference cancels, so the probabilities keep their meaning." }, { python: "print(\"naive exponentials", r: "cat(sprintf(\"naive exponentials", pythonLines: 3, rLines: 3, eli5: "Show the failed naive route and the finite stable answer separately, without hiding the failure or inventing a probability." }],
  },
  flow: { title: "Remove the dangerous intermediate scale", nodes: [node("logits", "1000, 1001", 0, 100), node("shift", "Subtract 1001", 250, 100), node("weights", "exp(−1), exp(0)", 500, 100), node("probabilities", "Normalize", 750, 100), node("logtotal", "Log then add 1001", 750, 260)], edges: [edge("logits", "shift"), edge("shift", "weights"), edge("weights", "probabilities"), edge("weights", "logtotal")], steps: [step("logits", "", "Finite scores can still have unrepresentable direct exponentials."), step("logits shift", "logits-shift", "Subtract a common maximum before exponentiating."), step("shift weights", "shift-weights", "The shifted exponentials are at most one and their sum is at least one."), step("weights probabilities", "weights-probabilities", "Normalize without materializing the cancelled common scale."), step("weights logtotal", "weights-logtotal", "For log-sum-exp, take the log of the small sum and restore the common maximum.")] },
  practice: [{ id: "w09-stability-shift", type: "recall", prompt: "Why does adding 500 to every finite logit leave softmax unchanged, while dividing every logit by 2 generally changes it?", answer: "A common additive shift multiplies every exponential by the same factor, which cancels during normalization. Dividing logits changes their pairwise differences and therefore their ratios; it is temperature scaling, not a common shift.", rubric: ["Common factor cancels", "Ratios depend on differences", "Temperature changes distribution"] }, { id: "w09-stability-policy", type: "case", prompt: "A pipeline replaces NaN attention rows with zeros. What do you inspect before calling that a fix?", answer: "Trace the first nonfinite value, input dtype, score scale and mask. An all-masked row can create an undefined normalization. Define a valid masking policy and choose a stable implementation; a zero row may not sum to one and may hide a broken data contract. Test the expected behavior explicitly.", rubric: ["First nonfinite operation", "Mask and dtype", "Explicit policy", "No silent invalid distribution"] }, { id: "w09-stability-code", type: "code", prompt: "Give two properties a stable finite-logit softmax test should verify besides one expected numeric answer.", answer: "Probabilities sum to approximately one and are nonnegative; a common shift preserves them within tolerance. Equal logits produce a uniform distribution, and invalid inputs are handled according to an explicit contract. Separate those tests from all-masked policies.", rubric: ["Normalization", "Shift invariance", "Boundary policy"] }],
  references: [{ title: "Deep Learning, chapter 4: Numerical Computation", url: "https://www.deeplearningbook.org/contents/numerical.html", versionSensitive: false }, { title: "SciPy: logsumexp", url: "https://docs.scipy.org/doc/scipy/reference/generated/scipy.special.logsumexp.html", versionSensitive: true }], lastReviewed: "2026-10-29",
});
