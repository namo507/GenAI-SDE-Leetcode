import { REVIEWED, code, defineTopic, edge, node, step } from "../helpers";
import type { ExtraWeek } from "./types";

export const w16: ExtraWeek = {
  schedule: [
    {
      dayId: "w16-d02",
      topicId: "w16-d02-product-case-interviews",
      tasks: [
        { label: "Product cases: sizing, metrics and launch decisions", minutes: 30 },
        { label: "Practice one sizing and one launch decision out loud", minutes: 20 },
      ],
    },
  ],
  topics: [
    defineTopic({
      id: "w16-d02-product-case-interviews",
      slug: "product-case-interviews",
      title: "Product case interviews: sizing, metrics and launch calls",
      domain: "career",
      roles: ["data-scientist", "data-analyst", "ml-engineer", "genai-engineer"],
      difficulty: "intermediate",
      minutes: 50,
      prerequisites: ["w05-d03-ab-test-power", "w06-d02-metrics-funnels"],
      objectives: [
        "Size a market with explicit assumptions and a low, base and high range",
        "Pick a primary metric with guardrails before looking at results",
        "Make and defend a launch decision from an interval and guardrail checks",
      ],
      summary:
        "Product and analytics interviews test structured thinking more than exact numbers. A strong answer states assumptions, sizes with ranges and names the assumption that matters most, defines a primary metric and guardrails up front, and turns experiment readouts into clear decisions with reasons: ship, do not ship, or collect more data.",
      eli5: {
        analogy:
          "Guessing how many jellybeans are in a jar. You do not count them; you guess how many fit across, how many up, and multiply, and you say 'probably between 500 and 1,500'. Then, when deciding whether a new jar shape is better, you agree first on what 'better' means and what must not get worse.",
        steps: [
          "Break the big question into small guesses you can multiply.",
          "Give a low, middle and high guess for each.",
          "Say which guess you would check first because it changes the answer most.",
          "Decide 'better' and 'must not get worse' before you look at results.",
        ],
        analogyLimit:
          "Interviewers care about the reasoning and the trade-offs you name, not whether your jellybean count matches theirs.",
      },
      senior: {
        definition:
          "Product cases cover estimation (Fermi sizing), metric design (north-star, primary, secondary and guardrail metrics), diagnosis (why did a metric move), and decision-making from experiments. Good answers are structured, quantitative, explicit about assumptions and uncertainty, and tied to user value and business goals.",
        invariants: [
          "Assumptions are stated before multiplying, with ranges rather than single points.",
          "Primary metric, guardrails and decision rule are fixed before seeing results.",
          "A guardrail breach blocks a launch even when the primary metric wins.",
        ],
        mechanism: [
          "800,000 households × 20% ordering online × 3 orders a month ÷ 30 days ≈ 16,000 deliveries a day, with a range of 5,333 to 32,000.",
          "The share of households ordering online varies 3x between low and high, more than order frequency (2x), so it is the assumption to research first.",
          "The new checkout lifts orders 3.1% with an interval of +1.2% to +5.0% and holds guardrails: ship.",
          "The free delivery banner lifts orders 4.0% but raises cancellations by 0.9 points against a 0.5-point limit: do not ship, investigate why.",
          "The reorder button's interval (−0.8% to +2.8%) includes zero: inconclusive, so extend the test or ship only if it is cheap to reverse.",
        ],
        complexity:
          "Sizing is a product of factors, so relative uncertainties compound: a 3x and a 2x range give a 6x range overall.",
        tradeoffs: [
          { option: "Top-down sizing (population × shares)", choose: "Quick estimates for new markets.", cost: "Shares are guesses; easy to overstate." },
          { option: "Bottom-up sizing (supply or unit capacity)", choose: "Operational businesses with known capacity per unit.", cost: "Needs more specific knowledge." },
          { option: "Single north-star metric", choose: "Aligning teams around user value.", cost: "Can hide harm unless guardrails are watched." },
        ],
        failureModes: [
          "Jumping to a number without stating assumptions.",
          "Choosing the metric after seeing which one moved.",
          "Shipping a primary-metric win that breaks a guardrail.",
          "Calling an interval that includes zero a 'directional win' without saying what would change the decision.",
        ],
        production:
          "Experimentation platforms pre-register the primary metric, guardrails and minimum detectable effect, compute intervals with variance reduction, and enforce guardrail checks before launch. Analysts write a short decision memo: context, result with interval, guardrails, risks, and the recommendation.",
        interviewAnswer:
          "I clarify the goal, then structure the estimate as a product of factors with low, base and high values and name the assumption that moves the answer most. For launches, I fix a primary metric, guardrails and the decision rule in advance. I ship when the interval excludes zero and guardrails hold, block when a guardrail breaks, and call inconclusive results inconclusive, proposing a longer test or a cheap reversible launch.",
      },
      implementation: {
        problem: "Size daily grocery deliveries in a city with low, base and high assumptions, find the most uncertain factor, and make launch calls for three experiment readouts with guardrails.",
        input: "2 million people, 2.5 per household; online share 10 to 30%; 2 to 4 orders a month; three readouts with lift intervals and guardrail changes",
        python: {
          code: code`
            POPULATION, PEOPLE_PER_HOUSEHOLD = 2_000_000, 2.5
            FACTORS = {  # (low, base, high) assumptions to state out loud and then research
                "share of households ordering groceries online": (0.10, 0.20, 0.30),
                "orders per ordering household per month": (2, 3, 4),
            }
            GUARDRAILS = {"cancellation rate (pp)": 0.5, "p95 latency (ms)": 100}
            READOUTS = [  # (name, lift %, CI low, CI high, guardrail changes)
                ("new checkout", 3.1, 1.2, 5.0, {"cancellation rate (pp)": 0.2, "p95 latency (ms)": 40}),
                ("free delivery banner", 4.0, 2.1, 5.9, {"cancellation rate (pp)": 0.9, "p95 latency (ms)": 10}),
                ("reorder button", 1.0, -0.8, 2.8, {"cancellation rate (pp)": 0.0, "p95 latency (ms)": 5}),
            ]


            def estimate(choice):
                households = POPULATION / PEOPLE_PER_HOUSEHOLD
                per_month = households
                for low_base_high in FACTORS.values():
                    per_month *= low_base_high[choice]
                return per_month / 30


            low, base, high = (estimate(i) for i in range(3))
            print(f"grocery deliveries per day: base {base:,.0f}, range {low:,.0f} to {high:,.0f}")
            for name, (lo, _, hi) in FACTORS.items():
                print(f"  {name}: high/low = {hi / lo:.1f}x")
            widest = max(FACTORS, key=lambda k: FACTORS[k][2] / FACTORS[k][0])
            print(f"  research first: {widest}")


            def decide(lift, ci_low, ci_high, changes):
                broken = [g for g, limit in GUARDRAILS.items() if changes[g] > limit]
                if broken:
                    return "do not ship: guardrail breached (" + ", ".join(broken) + ")"
                if ci_low > 0:
                    return "ship: the whole interval is above zero and guardrails hold"
                if ci_high < 0:
                    return "do not ship: it hurts the primary metric"
                return "inconclusive: the interval includes zero; extend the test or ship only if it is cheap to reverse"


            for name, lift, ci_low, ci_high, changes in READOUTS:
                print(f"{name}: lift {lift:+.1f}% [{ci_low:+.1f}, {ci_high:+.1f}] -> {decide(lift, ci_low, ci_high, changes)}")
          `,
        },
        r: {
          code: code`
            population <- 2000000
            people_per_household <- 2.5
            factors <- list( # (low, base, high) assumptions to state out loud and then research
              "share of households ordering groceries online" = c(0.10, 0.20, 0.30),
              "orders per ordering household per month" = c(2, 3, 4)
            )
            guardrails <- c("cancellation rate (pp)" = 0.5, "p95 latency (ms)" = 100)
            readouts <- list(
              list(name = "new checkout", lift = 3.1, lo = 1.2, hi = 5.0, changes = c("cancellation rate (pp)" = 0.2, "p95 latency (ms)" = 40)),
              list(name = "free delivery banner", lift = 4.0, lo = 2.1, hi = 5.9, changes = c("cancellation rate (pp)" = 0.9, "p95 latency (ms)" = 10)),
              list(name = "reorder button", lift = 1.0, lo = -0.8, hi = 2.8, changes = c("cancellation rate (pp)" = 0.0, "p95 latency (ms)" = 5))
            )

            estimate <- function(choice) {
              per_month <- population / people_per_household
              for (f in factors) per_month <- per_month * f[choice]
              per_month / 30
            }

            fmt <- function(x) formatC(x, format = "f", digits = 0, big.mark = ",")
            est <- vapply(1:3, estimate, numeric(1))
            cat(sprintf("grocery deliveries per day: base %s, range %s to %s\n", fmt(est[2]), fmt(est[1]), fmt(est[3])))
            spread <- vapply(factors, function(f) f[3] / f[1], numeric(1))
            for (name in names(factors)) cat(sprintf("  %s: high/low = %.1fx\n", name, spread[[name]]))
            cat(sprintf("  research first: %s\n", names(spread)[which.max(spread)]))

            decide <- function(lift, ci_low, ci_high, changes) {
              broken <- names(guardrails)[changes[names(guardrails)] > guardrails]
              if (length(broken)) return(sprintf("do not ship: guardrail breached (%s)", paste(broken, collapse = ", ")))
              if (ci_low > 0) return("ship: the whole interval is above zero and guardrails hold")
              if (ci_high < 0) return("do not ship: it hurts the primary metric")
              "inconclusive: the interval includes zero; extend the test or ship only if it is cheap to reverse"
            }

            for (r in readouts) {
              cat(sprintf("%s: lift %+.1f%% [%+.1f, %+.1f] -> %s\n", r$name, r$lift, r$lo, r$hi, decide(r$lift, r$lo, r$hi, r$changes)))
            }
          `,
        },
        expectedOutput: code`
        grocery deliveries per day: base 16,000, range 5,333 to 32,000
          share of households ordering groceries online: high/low = 3.0x
          orders per ordering household per month: high/low = 2.0x
          research first: share of households ordering groceries online
        new checkout: lift +3.1% [+1.2, +5.0] -> ship: the whole interval is above zero and guardrails hold
        free delivery banner: lift +4.0% [+2.1, +5.9] -> do not ship: guardrail breached (cancellation rate (pp))
        reorder button: lift +1.0% [-0.8, +2.8] -> inconclusive: the interval includes zero; extend the test or ship only if it is cheap to reverse
      `,
        tests: {
          python: code`
            def test_range_brackets_base():
                assert estimate(0) < estimate(1) < estimate(2)


            def test_guardrail_beats_a_winning_metric():
                assert decide(10.0, 5.0, 15.0, {"cancellation rate (pp)": 2.0, "p95 latency (ms)": 0}).startswith("do not ship")


            def test_negative_interval_is_rejected():
                assert decide(-2.0, -3.0, -1.0, {"cancellation rate (pp)": 0.0, "p95 latency (ms)": 0}).startswith("do not ship: it hurts")
          `,
          r: code`
            test_that("range brackets the base estimate", {
              expect_true(estimate(1) < estimate(2) && estimate(2) < estimate(3))
            })

            test_that("a guardrail beats a winning metric", {
              expect_match(decide(10, 5, 15, c("cancellation rate (pp)" = 2, "p95 latency (ms)" = 0)), "^do not ship")
            })
          `,
        },
        eli5Trace: [
          "2 million people live in about 800,000 homes.",
          "If 1 in 5 homes orders groceries online 3 times a month, that is about 16,000 deliveries a day, but it could be anywhere from about 5,000 to 32,000.",
          "The guess about how many homes order online is the shakiest, so find that out first.",
          "The new checkout is clearly better and breaks no rules: ship it.",
          "The banner helps orders but makes more people cancel: do not ship it yet.",
          "The reorder button might help or might not: test longer.",
        ],
        complexity: { time: "O(factors + readouts)", space: "O(1)" },
        edgeCases: [
          "Factors that are not independent (online share and frequency both higher in dense areas) widen the true range.",
          "A guardrail that improves is fine; only breaches past the limit block.",
          "A tiny but significant lift may not be worth the engineering or maintenance cost.",
          "Novelty effects can make early results look better than the long-run effect.",
        ],
        incorrect: {
          language: "python",
          code: code`
            best_metric = max(results, key=lambda m: results[m]["lift"])
            print(f"Success! {best_metric} went up")  # picked after looking
          `,
          whyWrong: "Choosing the metric after seeing results is p-hacking: with many metrics, some will move by chance, and the claim will not replicate.",
          fix: "Pre-register one primary metric, a few guardrails and the decision rule; treat other movements as exploratory hypotheses for the next test.",
        },
        walkthrough: [
          { python: "FACTORS = {", pythonLines: 4, r: "factors <- list(", rLines: 4, eli5: "The guesses we multiply, each with a low, middle and high value." },
          { python: "def estimate(choice):", pythonLines: 6, r: "estimate <- function(choice) {", rLines: 5, eli5: "Multiply homes by the chosen guesses and divide by 30 days." },
          { python: "low, base, high = ", pythonLines: 6, r: "est <- vapply(", rLines: 5, eli5: "Print the middle guess and the range, then point at the shakiest guess." },
          { python: "def decide(", pythonLines: 9, r: "decide <- function(", rLines: 7, eli5: "The decision rule: broken safety rule means no; clearly better means yes; maybe-better means test longer." },
          { python: "for name, lift, ci_low, ci_high, changes in READOUTS:", pythonLines: 2, r: "for (r in readouts) {", rLines: 3, eli5: "Apply the same rule to all three experiments." },
        ],
      },
      flow: {
        title: "Answering a product case",
        nodes: [
          node("clarify", "Clarify the goal", 0, 120, "user, business, scope"),
          node("size", "Size it", 230, 40, "factors with ranges"),
          node("metrics", "Choose metrics", 230, 210, "primary + guardrails"),
          node("test", "Test or analyze", 460, 120, "experiment, data"),
          node("decide", "Decide", 690, 120, "ship, block, extend"),
        ],
        edges: [edge("clarify", "size"), edge("clarify", "metrics"), edge("size", "test"), edge("metrics", "test"), edge("test", "decide")],
        steps: [
          step("clarify", "", "Restate the question and ask what success means for users and for the business."),
          step("clarify size", "clarify-size", "Break the estimate into factors, give ranges, and name the most uncertain one."),
          step("clarify metrics", "clarify-metrics", "Fix the primary metric, guardrails and decision rule before any results."),
          step("size metrics test", "size-test metrics-test", "Run or analyze the experiment and compute intervals."),
          step("test decide", "test-decide", "Apply the rule out loud: ship, do not ship because a guardrail broke, or collect more data."),
        ],
      },
      practice: [
        {
          id: "w16-case-recall-1",
          type: "recall",
          prompt: "What makes a good guardrail metric?",
          answer: "It captures harm the primary metric could hide (cancellations, latency, complaints, revenue per user, retention), is sensitive enough to detect a meaningful breach, has a pre-agreed threshold, and is owned by someone who will act on it.",
          rubric: ["Captures hidden harm", "Sensitive", "Pre-agreed threshold", "Owned"],
        },
        {
          id: "w16-case-case-1",
          type: "case",
          prompt: "Daily active users dropped 8% week over week. Walk through your first 10 minutes.",
          answer: "Confirm the data (tracking or pipeline changes, definitions, time zones), check whether it is seasonal or a holiday, then segment by platform, app version, country, acquisition channel and new versus returning users to localize the drop. Check releases, outages and marketing changes in that window, and form hypotheses to test with the owners.",
          rubric: ["Validate data first", "Seasonality", "Segment to localize", "Correlate with changes", "Hypotheses"],
        },
        {
          id: "w16-case-design-1",
          type: "design",
          prompt: "Define success metrics for an AI writing assistant inside an email product.",
          answer: "Primary: share of drafts where the suggestion is accepted and the email is sent (or time to send). Secondary: edit distance after acceptance, feature retention. Guardrails: reported issues, unsubscribes or complaints from recipients, latency, cost per suggestion, and safety flags. Decide thresholds and the experiment design (randomized by user) before launch.",
          rubric: ["Primary tied to value", "Secondary", "Guardrails incl. cost and safety", "Randomization unit"],
        },
      ],
      references: [
        { title: "Trustworthy Online Controlled Experiments (Kohavi, Tang and Xu, 2020)", versionSensitive: false },
        { title: "How to Measure Anything (Douglas W. Hubbard)", versionSensitive: false },
      ],
      lastReviewed: REVIEWED,
    }),
  ],
};
