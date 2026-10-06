import { REVIEWED, code, defineTopic, defineWeek, edge, node, step } from "../helpers";

export const topics = [
  defineTopic({
    id: "w06-d01-data-quality-eda",
    slug: "data-quality-eda",
    title: "Data quality checks and exploratory analysis",
    domain: "analytics",
    roles: ["data-scientist", "data-engineer", "ml-engineer"],
    difficulty: "beginner",
    minutes: 65,
    prerequisites: ["w05-d01-probability-distributions"],
    objectives: [
      "Profile a table for duplicates, missing values and invalid ranges before analysis",
      "Flag outliers with the IQR rule and explain the quantile definition used",
      "Show how one outlier moves the mean but not the median",
    ],
    summary:
      "Every analysis starts by checking whether the data can be trusted. A short profile (duplicates, missing values, invalid values, outliers) catches most problems before they become wrong conclusions.",
    eli5: {
      analogy:
        "Checking a bag of groceries before cooking. Throw out the duplicate receipt, notice the item with no price, the one with a negative price, and the one that costs 400 dollars when everything else costs about 30.",
      steps: [
        "Count everything in the bag and look for exact copies.",
        "Count the items missing a price or a label.",
        "Find prices that cannot be right, like negative ones.",
        "Line up the good prices, find the middle half, and flag anything far outside it.",
        "Compare the average with and without the strange item.",
      ],
      analogyLimit:
        "A grocery receipt has one obvious right answer. Real outliers are sometimes the most important rows (a whale customer, a fraud spike), so you flag and investigate them; you do not delete them automatically.",
    },
    senior: {
      definition:
        "Data profiling computes completeness (missing rates), uniqueness (duplicates on keys or whole rows), validity (domain and range rules) and distribution summaries. The IQR rule flags x outside [Q1 - 1.5 IQR, Q3 + 1.5 IQR].",
      invariants: [
        "Checks run before any aggregate is reported.",
        "Quartiles depend on the quantile definition; Python's statistics.quantiles(method='inclusive') matches R's default type 7.",
        "Cleaning decisions are recorded: what was dropped, why, and how many rows.",
      ],
      mechanism: [
        "Exact duplicates are found by comparing whole rows; key duplicates by grouping on the primary key.",
        "Missing values are None in Python and NA in R; both must be excluded explicitly from numeric summaries.",
        "Quartiles of the cleaned amounts give the IQR fences; the 400 order is far above the upper fence.",
        "The mean moves from about 28 to about 81 because of one value; the median does not move, which is why skewed metrics report medians or trimmed means.",
      ],
      complexity: "Profiling is O(n) per column plus O(n log n) for quantiles.",
      tradeoffs: [
        { option: "IQR fences", choose: "Quick, robust flags on roughly unimodal data.", cost: "Flags many points on heavy-tailed data like revenue." },
        { option: "Z-scores", choose: "Approximately normal data.", cost: "The outlier inflates the standard deviation it is measured against." },
        { option: "Domain rules", choose: "Known constraints such as price > 0 or age < 120.", cost: "Need business input and maintenance." },
      ],
      failureModes: [
        "Dropping outliers that are real, important customers.",
        "Computing a mean over a column where missing values were silently filled with 0.",
        "Deduplicating on whole rows when the business key is order_id, missing near-duplicates with different timestamps.",
        "Comparing quartiles across tools that use different quantile definitions.",
      ],
      production:
        "In pipelines these checks become automated tests (not null, unique, accepted range, freshness) that block bad data before dashboards refresh. Tools such as dbt tests or Great Expectations encode them.",
      interviewAnswer:
        "Before analysis I profile row counts, duplicates on the key, missing rates per column and range violations, and I look at the distribution with quantiles. I flag outliers with IQR fences but investigate before dropping. I report medians for skewed metrics and write down every cleaning step so the numbers are reproducible.",
    },
    implementation: {
      problem: "Profile a small orders table, clean it, flag outliers with IQR fences, and compare mean and median.",
      input: "10 order rows with one exact duplicate, one missing amount, one missing country, one negative amount and one 400.00 order",
      python: {
        code: code`
          from statistics import mean, median, quantiles

          ROWS = [
              (1, "u1", 25.0, "US"), (2, "u2", 30.0, "US"), (2, "u2", 30.0, "US"),
              (3, "u3", None, "DE"), (4, "u4", -5.0, "US"), (5, "u5", 27.5, None),
              (6, "u6", 31.0, "FR"), (7, "u7", 29.0, "US"), (8, "u8", 400.0, "US"),
              (9, "u9", 26.0, "DE"),
          ]

          duplicates = len(ROWS) - len(set(ROWS))
          missing_amount = sum(r[2] is None for r in ROWS)
          missing_country = sum(r[3] is None for r in ROWS)
          negative = sum(r[2] is not None and r[2] < 0 for r in ROWS)
          print(f"rows={len(ROWS)} duplicates={duplicates} missing_amount={missing_amount} "
                f"missing_country={missing_country} negative_amount={negative}")

          clean = [r for r in dict.fromkeys(ROWS) if r[2] is not None and r[2] >= 0]
          amounts = [r[2] for r in clean]
          q1, q2, q3 = quantiles(amounts, n=4, method="inclusive")
          lo, hi = q1 - 1.5 * (q3 - q1), q3 + 1.5 * (q3 - q1)
          outliers = [a for a in amounts if a < lo or a > hi]
          print(f"clean rows={len(clean)}")
          print(f"quartiles: q1={q1:.2f} median={q2:.2f} q3={q3:.2f}")
          print(f"iqr fences: [{lo:.2f}, {hi:.2f}] outliers: {', '.join(f'{a:.2f}' for a in outliers)}")
          inliers = [a for a in amounts if lo <= a <= hi]
          print(f"mean with outlier={mean(amounts):.2f} without={mean(inliers):.2f} median={median(amounts):.2f}")
        `,
      },
      r: {
        code: code`
          rows <- data.frame(
            order_id = c(1, 2, 2, 3, 4, 5, 6, 7, 8, 9),
            user = c("u1", "u2", "u2", "u3", "u4", "u5", "u6", "u7", "u8", "u9"),
            amount = c(25, 30, 30, NA, -5, 27.5, 31, 29, 400, 26),
            country = c("US", "US", "US", "DE", "US", NA, "FR", "US", "US", "DE")
          )

          cat(sprintf("rows=%d duplicates=%d missing_amount=%d missing_country=%d negative_amount=%d\n",
                      nrow(rows), sum(duplicated(rows)), sum(is.na(rows$amount)),
                      sum(is.na(rows$country)), sum(rows$amount < 0, na.rm = TRUE)))

          clean <- rows[!duplicated(rows) & !is.na(rows$amount) & rows$amount >= 0, ]
          amounts <- clean$amount
          q <- quantile(amounts, c(0.25, 0.5, 0.75), type = 7, names = FALSE)
          lo <- q[1] - 1.5 * (q[3] - q[1])
          hi <- q[3] + 1.5 * (q[3] - q[1])
          outliers <- amounts[amounts < lo | amounts > hi]
          cat(sprintf("clean rows=%d\n", nrow(clean)))
          cat(sprintf("quartiles: q1=%.2f median=%.2f q3=%.2f\n", q[1], q[2], q[3]))
          cat(sprintf("iqr fences: [%.2f, %.2f] outliers: %s\n", lo, hi, paste(sprintf("%.2f", outliers), collapse = ", ")))
          inliers <- amounts[amounts >= lo & amounts <= hi]
          cat(sprintf("mean with outlier=%.2f without=%.2f median=%.2f\n", mean(amounts), mean(inliers), median(amounts)))
        `,
      },
      expectedOutput: code`
        rows=10 duplicates=1 missing_amount=1 missing_country=1 negative_amount=1
        clean rows=7
        quartiles: q1=26.75 median=29.00 q3=30.50
        iqr fences: [21.12, 36.12] outliers: 400.00
        mean with outlier=81.21 without=28.08 median=29.00
      `,
      tests: {
        python: code`
          def test_inclusive_quartiles_match_type_7():
              assert quantiles([1, 2, 3, 4], n=4, method="inclusive") == [1.75, 2.5, 3.25]


          def test_cleaning_keeps_only_valid_rows():
              assert all(r[2] is not None and r[2] >= 0 for r in clean)
              assert len(clean) == len(set(clean))


          def test_median_is_robust_to_the_outlier():
              assert median(amounts) == median(inliers + [10_000.0])
        `,
        r: code`
          test_that("type 7 quartiles match Python's inclusive method", {
            expect_equal(quantile(1:4, c(0.25, 0.5, 0.75), type = 7, names = FALSE), c(1.75, 2.5, 3.25))
          })

          test_that("cleaning keeps only valid rows", {
            expect_false(any(is.na(clean$amount)))
            expect_true(all(clean$amount >= 0))
            expect_false(any(duplicated(clean)))
          })

          test_that("the outlier is flagged", {
            expect_equal(outliers, 400)
          })
        `,
      },
      eli5Trace: [
        "Ten rows, but order 2 appears twice: one duplicate.",
        "Order 3 has no amount, order 5 has no country, and order 4 has a negative amount.",
        "After removing the duplicate, the missing amount and the negative one, seven good amounts remain.",
        "The middle half of the good amounts runs from about 26 to about 31, so anything far above 36 is suspicious: the 400 order.",
        "The average jumps to about 81 with that one order, while the middle value stays at 29.",
      ],
      complexity: { time: "O(n log n)", space: "O(n)" },
      edgeCases: [
        "All values missing: quantiles fail; report the column as empty instead.",
        "Fewer than two values: quartiles are undefined in Python's statistics.quantiles.",
        "A missing country is a completeness issue, not a reason to drop the amount.",
        "Different quantile methods give slightly different fences; state the method in reports.",
      ],
      incorrect: {
        language: "python",
        code: code`
          amounts = [r[2] or 0 for r in ROWS]
          print(mean(amounts))
        `,
        whyWrong: "Filling missing amounts with 0, keeping the duplicate and the negative row biases the mean, and nobody can tell from the output.",
        fix: "Profile first, drop or impute explicitly, and report how many rows each rule removed.",
      },
    },
    flow: {
      title: "Profile, clean, then summarize",
      nodes: [
        node("raw", "Raw rows", 0, 110, "10 rows"),
        node("dupes", "Duplicates", 220, 0, "1 exact copy"),
        node("missing", "Missing values", 220, 110, "amount 1, country 1"),
        node("invalid", "Invalid ranges", 220, 220, "1 negative"),
        node("clean", "Clean rows", 470, 110, "7 rows"),
        node("iqr", "IQR fences", 690, 110, "flags 400.00"),
        node("summary", "Robust summary", 900, 110, "median 29"),
      ],
      edges: [edge("raw", "dupes"), edge("raw", "missing"), edge("raw", "invalid"), edge("dupes", "clean"), edge("missing", "clean"), edge("invalid", "clean"), edge("clean", "iqr"), edge("iqr", "summary")],
      steps: [
        step("raw dupes", "raw-dupes", "Exact duplicate rows are counted first; order 2 was loaded twice."),
        step("raw missing", "raw-missing", "Missing values are counted per column. A missing country does not invalidate the amount."),
        step("raw invalid", "raw-invalid", "Domain rules catch impossible values like a negative order amount."),
        step("dupes missing invalid clean", "dupes-clean missing-clean invalid-clean", "Each rule removes rows explicitly, leaving seven valid amounts and a record of why."),
        step("clean iqr", "clean-iqr", "Quartiles of the clean amounts set fences at Q1 - 1.5 IQR and Q3 + 1.5 IQR; 400.00 is far outside."),
        step("iqr summary", "iqr-summary", "Report the median, or the mean with and without the outlier, and investigate the outlier before deciding."),
      ],
    },
    practice: [
      {
        id: "w06-dq-recall-1",
        type: "recall",
        prompt: "Name four dimensions of data quality and one automated check for each.",
        answer: "Completeness (not-null rate), uniqueness (unique key), validity (accepted values or range), freshness or timeliness (max timestamp within SLA). Accuracy and consistency are also common.",
        rubric: ["At least four dimensions", "A concrete check for each"],
      },
      {
        id: "w06-dq-case-1",
        type: "case",
        prompt: "Average order value jumped 40% overnight. What do you check before telling anyone?",
        answer: "Row counts and duplicates in the load, a few extreme orders (outliers or test orders), currency or unit changes, a changed filter or join in the metric definition, and the median versus the mean.",
        rubric: ["Pipeline or duplicate check", "Outliers and test data", "Units or definitions", "Median comparison"],
      },
    ],
    references: [
      { title: "Python documentation: statistics.quantiles", url: "https://docs.python.org/3/library/statistics.html#statistics.quantiles", versionSensitive: false },
      { title: "R documentation: quantile() types", url: "https://stat.ethz.ch/R-manual/R-devel/library/stats/html/quantile.html", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w06-d02-metrics-funnels",
    slug: "metrics-funnels",
    title: "Metric design and funnels",
    domain: "analytics",
    roles: ["data-scientist", "genai-engineer"],
    difficulty: "intermediate",
    minutes: 70,
    prerequisites: ["w06-d01-data-quality-eda"],
    objectives: [
      "Define a metric precisely: unit, numerator, denominator, window",
      "Compute an ordered funnel where each step must follow the previous one",
      "Distinguish step conversion from conversion of the top of the funnel",
    ],
    summary:
      "A funnel counts how many users make it through ordered steps. The definition choices (must steps be in order? within what window? counted once per user?) change the numbers more than most code bugs do.",
    eli5: {
      analogy:
        "A theme park with four gates in a row. You only count someone at gate 3 if they walked through gates 1 and 2 first, in that order. Somebody who climbed the fence into the middle does not count.",
      steps: [
        "List each visitor's gate passes in time order.",
        "Count everyone who passed gate 1.",
        "From those, count who passed gate 2 after gate 1, then gate 3 after gate 2, and so on.",
        "Divide each gate's count by the first gate (overall) and by the previous gate (step by step).",
      ],
      analogyLimit:
        "Real users return across days, use several devices and do steps in odd orders. Whether to count a purchase without a signup, or a signup weeks after the visit, is a product decision you must write down; the park gates make it look obvious when it is not.",
    },
    senior: {
      definition:
        "An ordered funnel counts users u who have events s1 <= s2 <= ... <= sk at non-decreasing timestamps. Step conversion is count(k) / count(k - 1); overall conversion is count(k) / count(1).",
      invariants: [
        "The unit is the user, so each user contributes at most once per step.",
        "A user counted at step k is counted at every earlier step.",
        "Timestamps are compared in one time zone and the conversion window is stated.",
      ],
      mechanism: [
        "Events are grouped by user and sorted by time.",
        "For each user, a pointer walks the funnel steps and finds the first matching event after the previous step's time.",
        "Users who enter mid-funnel (signup without a visit) are excluded because they never pass step 1.",
        "u8 visits, activates, then signs up: signup counts, but activation happened before signup, so u8 stops at signup.",
      ],
      complexity: "O(E log E) to sort E events, then O(E) to walk them.",
      tradeoffs: [
        { option: "Strictly ordered funnel", choose: "Product flows with a required sequence.", cost: "Undercounts users who skip or reorder optional steps." },
        { option: "Unordered (any time) funnel", choose: "Exploratory 'did they ever do X' questions.", cost: "Overstates the flow's conversion." },
        { option: "Windowed funnel (within 7 days)", choose: "Attributing conversion to a recent session.", cost: "Sensitive to window choice and time zones." },
      ],
      failureModes: [
        "Counting events instead of users, so one enthusiastic user inflates a step.",
        "Mixing time zones so steps appear out of order.",
        "Changing the definition between dashboards and comparing the numbers anyway.",
        "Ratios of averages versus averages of ratios when aggregating across segments.",
      ],
      production:
        "Write the metric spec (unit, numerator, denominator, filters, window, owner) next to the SQL, and test it with fixture users like the ones here. Most 'the dashboard is wrong' tickets are definition disagreements.",
      interviewAnswer:
        "I define the unit as the user, require steps in time order within a stated window, and count each user once per step. Per user I walk the sorted events with a pointer over the funnel steps. I report both step conversion and overall conversion, and I keep the definition in a spec so dashboards agree.",
    },
    implementation: {
      problem: "Count users at each ordered funnel step and report overall and step conversion.",
      input: "funnel visit > signup > activate > purchase; 8 users with events in time order, including one who skips signup and one who activates before signing up",
      python: {
        code: code`
          from collections import defaultdict

          FUNNEL = ["visit", "signup", "activate", "purchase"]
          EVENTS = [
              ("u1", "visit", 1), ("u1", "signup", 2), ("u1", "activate", 3), ("u1", "purchase", 4),
              ("u2", "visit", 1), ("u2", "signup", 5),
              ("u3", "visit", 2), ("u3", "signup", 3), ("u3", "activate", 9),
              ("u4", "visit", 1),
              ("u5", "signup", 2),
              ("u6", "visit", 1), ("u6", "purchase", 2),
              ("u7", "visit", 3), ("u7", "signup", 4), ("u7", "activate", 6), ("u7", "purchase", 8),
              ("u8", "visit", 1), ("u8", "activate", 2), ("u8", "signup", 3),
          ]


          def funnel_counts(events: list[tuple[str, str, int]], steps: list[str]) -> list[int]:
              by_user: dict[str, list[tuple[int, str]]] = defaultdict(list)
              for user, name, t in events:
                  by_user[user].append((t, name))
              counts = [0] * len(steps)
              for history in by_user.values():
                  history.sort()
                  k, last_t = 0, None
                  for t, name in history:
                      if k < len(steps) and name == steps[k] and (last_t is None or t >= last_t):
                          counts[k] += 1
                          k, last_t = k + 1, t
              return counts


          counts = funnel_counts(EVENTS, FUNNEL)
          for i, (step_name, n) in enumerate(zip(FUNNEL, counts)):
              overall = 100 * n / counts[0]
              step_rate = "-" if i == 0 else f"{100 * n / counts[i - 1]:.1f}%"
              print(f"{step_name}: {n} users, {overall:.1f}% of visits, step {step_rate}")
        `,
      },
      r: {
        code: code`
          funnel <- c("visit", "signup", "activate", "purchase")
          events <- data.frame(
            user = c("u1", "u1", "u1", "u1", "u2", "u2", "u3", "u3", "u3", "u4", "u5", "u6", "u6",
                     "u7", "u7", "u7", "u7", "u8", "u8", "u8"),
            name = c("visit", "signup", "activate", "purchase", "visit", "signup", "visit", "signup", "activate",
                     "visit", "signup", "visit", "purchase", "visit", "signup", "activate", "purchase",
                     "visit", "activate", "signup"),
            t = c(1, 2, 3, 4, 1, 5, 2, 3, 9, 1, 2, 1, 2, 3, 4, 6, 8, 1, 2, 3)
          )

          funnel_counts <- function(events, steps) {
            counts <- integer(length(steps))
            for (h in split(events, events$user)) {
              h <- h[order(h$t, h$name), ]
              k <- 1
              last_t <- -Inf
              for (i in seq_len(nrow(h))) {
                if (k <= length(steps) && h$name[i] == steps[k] && h$t[i] >= last_t) {
                  counts[k] <- counts[k] + 1L
                  last_t <- h$t[i]
                  k <- k + 1
                }
              }
            }
            counts
          }

          counts <- funnel_counts(events, funnel)
          for (i in seq_along(funnel)) {
            overall <- 100 * counts[i] / counts[1]
            step_rate <- if (i == 1) "-" else sprintf("%.1f%%", 100 * counts[i] / counts[i - 1])
            cat(sprintf("%s: %d users, %.1f%% of visits, step %s\n", funnel[i], counts[i], overall, step_rate))
          }
        `,
      },
      expectedOutput: code`
        visit: 7 users, 100.0% of visits, step -
        signup: 5 users, 71.4% of visits, step 71.4%
        activate: 3 users, 42.9% of visits, step 60.0%
        purchase: 2 users, 28.6% of visits, step 66.7%
      `,
      tests: {
        python: code`
          def test_counts_never_increase_down_the_funnel():
              assert all(a >= b for a, b in zip(counts, counts[1:]))


          def test_entering_mid_funnel_does_not_count():
              assert funnel_counts([("x", "signup", 1)], FUNNEL) == [0, 0, 0, 0]


          def test_out_of_order_step_is_not_counted():
              assert funnel_counts([("x", "visit", 1), ("x", "signup", 0)], FUNNEL) == [1, 0, 0, 0]
        `,
        r: code`
          test_that("counts never increase down the funnel", {
            expect_true(all(diff(counts) <= 0))
          })

          test_that("entering mid-funnel does not count", {
            e <- data.frame(user = "x", name = "signup", t = 1)
            expect_equal(funnel_counts(e, funnel), c(0L, 0L, 0L, 0L))
          })

          test_that("an out-of-order step is not counted", {
            e <- data.frame(user = c("x", "x"), name = c("visit", "signup"), t = c(1, 0))
            expect_equal(funnel_counts(e, funnel), c(1L, 0L, 0L, 0L))
          })
        `,
      },
      eli5Trace: [
        "Seven users passed the visit gate; u5 signed up without visiting, so it never entered.",
        "Signup after visit: u1, u2, u3, u7 and u8. u6 skipped signup and stops at visit.",
        "Activate after signup: u1, u3 and u7. u8 activated before signing up, so it stops at signup.",
        "Purchase after activate: u1 and u7.",
        "Each line divides by the visit gate (overall) and by the previous gate (step).",
      ],
      complexity: { time: "O(E log E)", space: "O(E)", note: "E events" },
      edgeCases: [
        "Two steps with the same timestamp count in funnel order because ties are allowed (t >= last_t).",
        "Repeated events (two visits) only count once per user.",
        "A user whose first step is missing never enters the funnel.",
        "Empty data makes the overall denominator zero; guard before dividing.",
      ],
      incorrect: {
        language: "python",
        code: code`
          counts = [len({u for u, name, _ in EVENTS if name == s}) for s in FUNNEL]
        `,
        whyWrong: "It counts anyone who ever did each step, ignoring order and earlier steps: u5 counts as a signup and u6 as a purchase, so the funnel can even widen.",
        fix: "Walk each user's events in time order and only advance when the next expected step occurs.",
      },
    },
    flow: {
      title: "Users moving through ordered gates",
      nodes: [
        node("visit", "visit", 0, 110, "7 users"),
        node("signup", "signup", 230, 110, "5 users"),
        node("activate", "activate", 460, 110, "3 users"),
        node("purchase", "purchase", 690, 110, "2 users"),
        node("excluded", "Not counted", 345, 250, "u5 mid-entry, u6 skip, u8 order"),
      ],
      edges: [edge("visit", "signup"), edge("signup", "activate"), edge("activate", "purchase"), edge("visit", "excluded"), edge("signup", "excluded")],
      steps: [
        step("visit", "", "Only users with a visit enter the funnel: 7 of 8. u5 signed up without visiting."),
        step("visit signup", "visit-signup", "5 users sign up after visiting. u6 jumped straight to purchase and stops here."),
        step("signup activate excluded", "signup-activate signup-excluded", "3 users activate after signup. u8 activated before signing up, so the order rule stops it."),
        step("activate purchase", "activate-purchase", "2 users purchase after activating: about 29% of visits, 67% of activations."),
      ],
    },
    practice: [
      {
        id: "w06-metric-design-1",
        type: "design",
        prompt: "Write a complete spec for 'weekly active users' for a chat product.",
        answer: "Unit: user id after account merges. Active: sent at least one message (not just opened the app) in a Monday to Sunday UTC week. Exclusions: bots, internal and test accounts. Owner, source tables, and known caveats such as device merges.",
        rubric: ["Unit defined", "Activity event defined", "Window and time zone", "Exclusions and owner"],
      },
      {
        id: "w06-funnel-recall-1",
        type: "recall",
        prompt: "Step conversion from activate to purchase is 67% but overall conversion is 29%. Which do you show a PM asking where the funnel leaks?",
        answer: "Step conversion: it shows where users drop at each gate. Overall conversion hides which step leaks.",
        rubric: ["Chooses step conversion", "Explains why"],
      },
    ],
    references: [
      { title: "Trustworthy Online Controlled Experiments (Kohavi, Tang, Xu), chapter on metrics", versionSensitive: false },
      { title: "R documentation: split()", url: "https://stat.ethz.ch/R-manual/R-devel/library/base/html/split.html", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w06-d03-cohort-retention",
    slug: "cohort-retention",
    title: "Cohort retention analysis",
    domain: "analytics",
    roles: ["data-scientist", "genai-engineer"],
    difficulty: "intermediate",
    minutes: 70,
    prerequisites: ["w06-d02-metrics-funnels"],
    objectives: [
      "Build a cohort retention table from signup and activity data",
      "Explain why cohorts beat a single blended retention number",
      "Handle incomplete periods so young cohorts are not compared unfairly",
    ],
    summary:
      "A cohort groups users by when they started. Following each cohort over time shows whether retention is improving, which a single blended number hides when the mix of new and old users shifts.",
    eli5: {
      analogy:
        "A running club tracks each month's new members separately. 'Of the people who joined in January, how many still run in February? In March?' That way a big new class does not hide that older members are drifting away.",
      steps: [
        "Group members by the week they joined.",
        "For each group, count how many were active 0, 1, 2 weeks after joining.",
        "Divide by the group's size to get a percentage.",
        "Leave a blank where a group has not existed long enough to know.",
      ],
      analogyLimit:
        "Real activity is not simply yes or no each week; it has intensity and seasonality. And blanks are not zeros: a cohort that joined last week has no week-2 data yet, which is unknown, not lost.",
    },
    senior: {
      definition:
        "Retention(c, k) = |{u in cohort c : active in period c + k}| / |cohort c|. Rows are cohorts, columns are periods since start, and cells beyond the observation window are undefined.",
      invariants: [
        "A user belongs to exactly one cohort, defined by their first period.",
        "Week 0 retention is 100% when the signup itself counts as activity.",
        "Cells where c + k exceeds the last observed period are reported as missing, not zero.",
      ],
      mechanism: [
        "Join activity to each user's cohort, compute the offset k = active_week - cohort_week, and count distinct users per (cohort, k).",
        "Divide by cohort size and format; cells past the observation window print '-'.",
        "Reading down a column compares cohorts at the same age; reading along a row follows one cohort over time.",
      ],
      complexity: "O(A) over activity rows with hash aggregation; output is cohorts times periods.",
      tradeoffs: [
        { option: "Classic (bounded) retention", choose: "Active exactly in period k.", cost: "Noisy for products used irregularly." },
        { option: "Unbounded (rolling) retention", choose: "Active in period k or later.", cost: "Always looks higher; must be labeled clearly." },
        { option: "Blended retention", choose: "Single headline metric.", cost: "Mix shifts make it move even if no cohort changed." },
      ],
      failureModes: [
        "Filling incomplete cells with 0 and concluding new cohorts retain worse.",
        "Defining cohorts by first event of any type instead of a real start (signup or first purchase).",
        "Mixing calendar weeks and 7-day windows across cohorts.",
        "Counting activity events instead of distinct users.",
      ],
      production:
        "Cohort tables are usually materialized nightly. Store the definition (start event, activity event, period) with the table, and plot cohort curves for executives instead of the raw grid.",
      interviewAnswer:
        "I assign each user a cohort by signup week, compute weeks since signup for each active week, and count distinct users per cohort and offset divided by cohort size. I leave cells past the data window empty instead of zero, and I compare cohorts at the same age down each column.",
    },
    implementation: {
      problem: "Build a weekly cohort retention table and mark cells that have not happened yet.",
      input: "9 users: 4 signed up in week 0, 3 in week 1, 2 in week 2; activity by week; data runs through week 2",
      python: {
        code: code`
          SIGNUP = {"u1": 0, "u2": 0, "u3": 0, "u4": 0, "u5": 1, "u6": 1, "u7": 1, "u8": 2, "u9": 2}
          ACTIVE = {
              "u1": {0, 1, 2}, "u2": {0, 1}, "u3": {0}, "u4": {0},
              "u5": {1, 2}, "u6": {1, 2}, "u7": {1},
              "u8": {2}, "u9": {2},
          }
          LAST_WEEK = 2


          def retention_table(signup: dict[str, int], active: dict[str, set[int]], last_week: int) -> dict[int, list[float | None]]:
              table: dict[int, list[float | None]] = {}
              for cohort in sorted(set(signup.values())):
                  users = [u for u, w in signup.items() if w == cohort]
                  row: list[float | None] = []
                  for k in range(last_week + 1):
                      if cohort + k > last_week:
                          row.append(None)
                      else:
                          row.append(100 * sum(cohort + k in active[u] for u in users) / len(users))
                  table[cohort] = row
              return table


          table = retention_table(SIGNUP, ACTIVE, LAST_WEEK)
          print(f"{'cohort':<8}{'size':<6}{'wk0':<8}{'wk1':<8}{'wk2':<8}".rstrip())
          for cohort, row in table.items():
              size = sum(w == cohort for w in SIGNUP.values())
              cells = "".join(f"{('-' if v is None else f'{v:.1f}%'):<8}" for v in row)
              print(f"{'W' + str(cohort):<8}{size:<6}{cells}".rstrip())
        `,
      },
      r: {
        code: code`
          signup <- c(u1 = 0, u2 = 0, u3 = 0, u4 = 0, u5 = 1, u6 = 1, u7 = 1, u8 = 2, u9 = 2)
          active <- list(
            u1 = c(0, 1, 2), u2 = c(0, 1), u3 = 0, u4 = 0,
            u5 = c(1, 2), u6 = c(1, 2), u7 = 1,
            u8 = 2, u9 = 2
          )
          last_week <- 2

          retention_table <- function(signup, active, last_week) {
            cohorts <- sort(unique(signup))
            lapply(setNames(cohorts, cohorts), function(cohort) {
              users <- names(signup)[signup == cohort]
              vapply(0:last_week, function(k) {
                if (cohort + k > last_week) return(NA_real_)
                100 * sum(vapply(users, function(u) (cohort + k) %in% active[[u]], logical(1))) / length(users)
              }, numeric(1))
            })
          }

          tab <- retention_table(signup, active, last_week)
          cat(sub("\\s+$", "", sprintf("%-8s%-6s%-8s%-8s%-8s", "cohort", "size", "wk0", "wk1", "wk2")), "\n", sep = "")
          for (cohort in names(tab)) {
            cells <- vapply(tab[[cohort]], function(v) sprintf("%-8s", if (is.na(v)) "-" else sprintf("%.1f%%", v)), character(1))
            line <- sprintf("%-8s%-6d%s", paste0("W", cohort), sum(signup == as.numeric(cohort)), paste(cells, collapse = ""))
            cat(sub("\\s+$", "", line), "\n", sep = "")
          }
        `,
      },
      expectedOutput: code`
        cohort  size  wk0     wk1     wk2
        W0      4     100.0%  50.0%   25.0%
        W1      3     100.0%  66.7%   -
        W2      2     100.0%  -       -
      `,
      tests: {
        python: code`
          def test_week_zero_is_full_when_signup_counts():
              assert all(row[0] == 100 for row in table.values())


          def test_future_cells_are_unknown_not_zero():
              assert table[2][1] is None and table[1][2] is None


          def test_cohort_sizes_add_up():
              assert sum(sum(w == c for w in SIGNUP.values()) for c in table) == len(SIGNUP)
        `,
        r: code`
          test_that("week zero is full when signup counts as activity", {
            expect_true(all(vapply(tab, function(r) r[1] == 100, logical(1))))
          })

          test_that("future cells are unknown, not zero", {
            expect_true(is.na(tab[["2"]][2]))
            expect_true(is.na(tab[["1"]][3]))
          })

          test_that("the first cohort decays", {
            expect_equal(tab[["0"]], c(100, 50, 25))
          })
        `,
      },
      eli5Trace: [
        "Week 0 group: u1 to u4. All were active when they joined: 100%.",
        "One week later, u1 and u2 were still active: 2 of 4 is 50%. Two weeks later, only u1: 25%.",
        "Week 1 group: u5, u6, u7. One week later, u5 and u6: 66.7%.",
        "Week 2 group joined in the last week of data, so only week 0 is known; the rest are blanks, not zeros.",
      ],
      complexity: { time: "O(users * periods)", space: "O(cohorts * periods)" },
      edgeCases: [
        "A cohort with zero users must be skipped to avoid dividing by zero.",
        "Users active before their signup week (data errors) should be flagged, not counted.",
        "Incomplete trailing cells print '-' rather than 0%.",
        "Calendar weeks versus 7-day windows give different cohorts near week boundaries.",
      ],
      incorrect: {
        language: "python",
        code: code`
          rate = 100 * sum(1 for u in users if k in active[u]) / len(users)
        `,
        whyWrong: "It checks absolute week k instead of the cohort's week cohort + k, so the week 1 cohort's 'week 1' column looks at calendar week 1, which is their signup week.",
        fix: "Compare against cohort + k, the week that is k weeks after this cohort started.",
      },
    },
    flow: {
      title: "From activity log to cohort grid",
      nodes: [
        node("signup", "Signup week", 0, 30, "assigns cohort"),
        node("activity", "Activity weeks", 0, 190, "per user"),
        node("offset", "Weeks since signup", 260, 110, "k = active - cohort"),
        node("count", "Distinct users per cell", 520, 110, "cohort x k"),
        node("rate", "Divide by cohort size", 760, 110, "percent"),
        node("mask", "Mask the future", 760, 250, "'-' past last week"),
      ],
      edges: [edge("signup", "offset"), edge("activity", "offset"), edge("offset", "count"), edge("count", "rate"), edge("rate", "mask")],
      steps: [
        step("signup activity", "", "Each user's first week fixes their cohort; their activity weeks are the raw log."),
        step("offset", "signup-offset activity-offset", "Convert calendar weeks into weeks since signup so cohorts can be compared at the same age."),
        step("count", "offset-count", "Count distinct users per cohort and offset: cohort W0 has 4 at k = 0, 2 at k = 1, 1 at k = 2."),
        step("rate", "count-rate", "Divide by cohort size: 100%, 50%, 25% for W0."),
        step("mask", "rate-mask", "Cells beyond the last observed week are unknown, so they print '-' instead of a misleading 0%."),
      ],
    },
    practice: [
      {
        id: "w06-cohort-case-1",
        type: "case",
        prompt: "Overall weekly retention fell from 40% to 35% after a big marketing push, but every cohort's curve looks the same as before. Explain.",
        answer: "Mix shift: the push added many new users, who naturally have lower retention than tenured ones, so the blended number fell while cohort-level behavior did not change. Report cohort curves or age-adjusted retention.",
        rubric: ["Names mix shift or composition", "New users retain less", "Recommends cohort or age-adjusted view"],
      },
      {
        id: "w06-cohort-code-1",
        type: "code",
        prompt: "Change the table to unbounded retention: active in week k or any later week.",
        answer: "Replace 'cohort + k in active[u]' with 'max(active[u]) >= cohort + k' (any activity at or after that week).",
        rubric: ["Uses at-or-after logic", "Keeps masking of future cells"],
      },
    ],
    references: [
      { title: "Python documentation: format specification mini-language", url: "https://docs.python.org/3/library/string.html#format-specification-mini-language", versionSensitive: false },
      { title: "R documentation: sprintf()", url: "https://stat.ethz.ch/R-manual/R-devel/library/base/html/sprintf.html", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),
];

export const week = defineWeek({
  number: 6,
  slug: "analytics-and-visualization",
  title: "Analytics and visualization",
  track: "data",
  domains: ["analytics"],
  summary:
    "Trustworthy numbers first, then metrics, funnels and cohorts, then the dashboards and stories that make people act on them.",
  outcomes: [
    "Profile and clean data with recorded decisions",
    "Define metrics precisely and compute ordered funnels",
    "Build cohort retention tables and explain mix shift",
  ],
  roles: ["data-scientist", "genai-engineer", "data-engineer"],
  days: [
    {
      id: "w06-d01",
      day: 1,
      kind: "concept-map",
      title: "Data quality and EDA",
      summary: "Profile, clean and summarize before trusting any number.",
      minutes: 70,
      goals: ["Profile a table for the four main quality issues", "Explain mean versus median under outliers"],
      tasks: [
        { label: "Concept map and ELI5", minutes: 15 },
        { label: "Run the profiling example", minutes: 25 },
        { label: "Average order value case prompt", minutes: 20 },
        { label: "Recall prompt", minutes: 10 },
      ],
      topicIds: ["w06-d01-data-quality-eda"],
    },
    {
      id: "w06-d02",
      day: 2,
      kind: "theory-lab",
      title: "Metrics and funnels",
      summary: "Metric specs and ordered funnels, with users who break the happy path.",
      minutes: 75,
      goals: ["Write a full metric spec", "Explain each excluded user in the funnel"],
      tasks: [
        { label: "Step through the funnel diagram", minutes: 15 },
        { label: "Run the funnel example and tests", minutes: 25 },
        { label: "WAU spec design prompt", minutes: 25 },
        { label: "Recall prompt", minutes: 10 },
      ],
      topicIds: ["w06-d02-metrics-funnels"],
    },
    {
      id: "w06-d03",
      day: 3,
      kind: "implementation",
      title: "Cohort retention",
      summary: "Cohort grids with honest blanks for the future.",
      minutes: 80,
      goals: ["Build the grid in both languages", "Explain mix shift"],
      tasks: [
        { label: "Read the running club analogy and its limit", minutes: 10 },
        { label: "Run the cohort example and tests", minutes: 30 },
        { label: "Unbounded retention drill", minutes: 25 },
        { label: "Mix shift case prompt", minutes: 15 },
      ],
      topicIds: ["w06-d03-cohort-retention"],
    },
    {
      id: "w06-d04",
      day: 4,
      kind: "applied-practice",
      title: "Analytics drills",
      summary: "SQL and metric drills on funnels, cohorts and data quality.",
      minutes: 80,
      goals: ["Solve the analytics SQL drills", "Explain every definition choice"],
      tasks: [
        { label: "SQL drills in Practice", minutes: 40 },
        { label: "Topic drills with confidence ratings", minutes: 25 },
        { label: "Log weak spots", minutes: 15 },
      ],
      topicIds: ["w06-d01-data-quality-eda", "w06-d02-metrics-funnels", "w06-d03-cohort-retention"],
    },
    {
      id: "w06-d05",
      day: 5,
      kind: "production-lens",
      title: "The dashboard that told two stories",
      summary: "Simpson's paradox, metric definitions and storytelling for decisions.",
      minutes: 60,
      goals: ["Explain an aggregate that contradicts every segment"],
      tasks: [
        { label: "Read the scenario", minutes: 10 },
        { label: "Answer the case questions", minutes: 35 },
        { label: "Compare against the rubric", minutes: 15 },
      ],
      topicIds: ["w06-d02-metrics-funnels", "w06-d03-cohort-retention"],
      productionCase: {
        title: "Conversion fell overall but rose on every platform",
        scenario:
          "The weekly business review shows overall conversion down from 5.0% to 4.6%. The mobile team says mobile conversion went up, the desktop team says desktop went up too, and leadership wants to know who is wrong.",
        constraints: [
          "Traffic shifted heavily toward mobile after a new ad campaign.",
          "Mobile converts at about a third of desktop's rate.",
          "You have 30 minutes before the review.",
        ],
        questions: [
          "How can both segments improve while the total falls?",
          "Which chart or table would make it obvious in one look?",
          "What should the headline metric be going forward?",
          "How do you say this without blaming either team?",
        ],
        rubric: [
          "Identifies Simpson's paradox caused by a mix shift toward the lower-converting segment",
          "Shows segment rates next to segment traffic share",
          "Proposes a mix-adjusted metric or segment-level targets",
          "Leads with the decision and the one chart, not the method",
        ],
        pitfalls: ["Averaging the two segment rates without weights", "Treating the drop as a product regression"],
      },
    },
    {
      id: "w06-d06",
      day: 6,
      kind: "interview-simulation",
      title: "Product analytics case interview",
      summary: "A timed product-sense case: define the metric, find the drop, recommend an action.",
      minutes: 50,
      goals: ["Structure the answer: clarify, hypothesize, measure, decide"],
      tasks: [
        { label: "Timed metric-drop case", minutes: 30 },
        { label: "Write the one-paragraph recommendation", minutes: 10 },
        { label: "Self-score with the rubric", minutes: 10 },
      ],
      topicIds: ["w06-d01-data-quality-eda", "w06-d02-metrics-funnels", "w06-d03-cohort-retention"],
    },
    {
      id: "w06-d07",
      day: 7,
      kind: "review",
      title: "Analytics review",
      summary: "Spaced review across statistics and analytics, with remediation on definitions.",
      minutes: 45,
      goals: ["Clear due reviews", "Rewrite one metric spec from memory"],
      tasks: [
        { label: "Due reviews", minutes: 25 },
        { label: "Metric spec from memory", minutes: 20 },
      ],
      topicIds: ["w06-d01-data-quality-eda", "w06-d02-metrics-funnels", "w06-d03-cohort-retention", "w05-d02-hypothesis-testing"],
    },
  ],
});
