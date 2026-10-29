import { REVIEWED, code, defineTopic, edge, node, step } from "../helpers";
import type { ExtraWeek } from "./types";

export const w06: ExtraWeek = {
  schedule: [
    {
      dayId: "w06-d02",
      topicId: "w06-d02-kpi-root-cause",
      tasks: [
        { label: "Metric trees: decompose a revenue drop", minutes: 30 },
        { label: "Root-cause case: segment, rate and mix", minutes: 20 },
      ],
    },
    {
      dayId: "w06-d03",
      topicId: "w06-d03-segmentation-rfm",
      tasks: [
        { label: "RFM segmentation in Python and R", minutes: 30 },
        { label: "Turn segments into actions", minutes: 15 },
      ],
    },
    {
      dayId: "w06-d04",
      topicId: "w06-d04-visualization-storytelling",
      tasks: [
        { label: "Chart choice, honest axes and dashboard design", minutes: 30 },
        { label: "Critique a dashboard", minutes: 20 },
      ],
    },
  ],
  topics: [
    defineTopic({
      id: "w06-d02-kpi-root-cause",
      slug: "kpi-root-cause",
      title: "Metric trees and root-cause analysis",
      domain: "analytics",
      roles: ["data-analyst", "data-scientist"],
      difficulty: "intermediate",
      minutes: 50,
      prerequisites: ["w01-d04-dataframe-wrangling"],
      objectives: [
        "Decompose a top-line metric into drivers (users × conversion × order value)",
        "Attribute a change to drivers and to segments",
        "Separate a rate change inside a segment from a mix shift between segments",
      ],
      summary:
        "When a KPI moves, a metric tree turns 'revenue fell 13%' into 'iOS conversion fell from 6% to 4%'. Break the metric into multiplicative drivers, then into segments, and follow the biggest contribution down the tree before guessing causes.",
      eli5: {
        analogy:
          "Your lemonade stand made less money this week. Money = people who walked by × the share who bought × how much each paid. Check each one. Then check each street corner separately: maybe one corner's sign blew away and nobody there could see you.",
        steps: [
          "Write the money as a multiplication of simple parts.",
          "See which part changed the most.",
          "Split by place (corner, app, country) to see where it changed.",
          "Only then ask why it changed there.",
        ],
        analogyLimit:
          "A lemonade stand has one cause at a time. Real products often have several changes landing together (a release, a holiday, a tracking bug), and the tree tells you where to look, not what the cause is.",
      },
      senior: {
        definition:
          "A metric tree expresses a KPI as a product or sum of driver metrics. Multiplicative trees decompose cleanly in logs: ln(R₂/R₁) = ln(U₂/U₁) + ln(C₂/C₁) + ln(A₂/A₁). Segment attribution sums each segment's absolute change; comparing within-segment rates against segment weights separates rate effects from mix effects.",
        invariants: [
          "Driver log-changes add up exactly to the total log-change.",
          "Segment changes add up exactly to the total change.",
          "A total rate can fall even if every segment's rate rises when traffic shifts toward low-rate segments (Simpson's paradox).",
        ],
        mechanism: [
          "Revenue fell from 64,600 to 55,920 (−13.4%) while users grew 1.7%.",
          "In log terms conversion explains most of the drop and order value a little; users pushed the other way.",
          "By platform, iOS lost 9,360 while web and Android grew, so iOS explains more than 100% of the drop.",
          "Inside iOS, conversion fell from 6.0% to 4.0% with order value flat at 60.00: a rate change, not a mix shift.",
        ],
        complexity: "O(segments × drivers); the hard part is defining drivers that multiply to the KPI exactly.",
        tradeoffs: [
          { option: "Multiplicative tree with log attribution", choose: "KPIs that are products (revenue, GMV, ad revenue).", cost: "Shares are in log space, which needs explaining." },
          { option: "Sequential substitution", choose: "Simple stories for stakeholders.", cost: "Results depend on the order you substitute drivers." },
          { option: "Additive segment attribution", choose: "Finding where a change happened.", cost: "Does not say why; mix and rate effects need a separate split." },
        ],
        failureModes: [
          "Jumping to a cause (a competitor, the weather) before locating the change.",
          "Ignoring data issues: a tracking release that stopped logging iOS purchases looks exactly like this.",
          "Reporting segment rates without segment sizes, missing mix shifts.",
          "Comparing a week with a holiday to a normal week.",
        ],
        production:
          "Analysts keep metric trees in a semantic layer so every dashboard decomposes the same way, run automated contribution analysis on alerts, and always check instrumentation (event volumes, app versions) before declaring a product cause.",
        interviewAnswer:
          "First I confirm the drop is real by checking instrumentation and comparable periods. Then I decompose revenue into users × conversion × order value and attribute the change in logs: here conversion drives it. Splitting by platform, iOS explains more than the whole drop and its conversion fell from 6% to 4% with flat order value, so I would look at iOS releases and checkout events for that week.",
      },
      implementation: {
        problem: "Attribute a week-over-week revenue drop to drivers (users, conversion, order value) and to platforms.",
        input: "week 1 and week 2 users, orders and revenue for web, ios and android",
        python: {
          code: code`
            from math import log

            WEEK1 = {"web": (10000, 500, 25000), "ios": (8000, 480, 28800), "android": (6000, 240, 10800)}
            WEEK2 = {"web": (10200, 510, 25500), "ios": (8100, 324, 19440), "android": (6100, 244, 10980)}


            def totals(week: dict) -> tuple[int, int, int]:
                return tuple(sum(v[i] for v in week.values()) for i in range(3))


            def drivers(users: int, orders: int, revenue: int) -> dict[str, float]:
                return {"users": users, "conversion": orders / users, "order value": revenue / orders}


            u1, o1, r1 = totals(WEEK1)
            u2, o2, r2 = totals(WEEK2)
            print(f"revenue {r1} -> {r2} ({100 * (r2 - r1) / r1:+.1f}%)")
            d1, d2 = drivers(u1, o1, r1), drivers(u2, o2, r2)
            total_log = log(r2 / r1)
            for name in d1:
                share = log(d2[name] / d1[name]) / total_log
                print(f"  {name:<12} {d1[name]:>9.4f} -> {d2[name]:>9.4f}  share of log change {100 * share:6.1f}%")
            print("by platform:")
            for p in WEEK1:
                change = WEEK2[p][2] - WEEK1[p][2]
                c1, c2 = WEEK1[p][1] / WEEK1[p][0], WEEK2[p][1] / WEEK2[p][0]
                print(f"  {p:<8} revenue {change:+6d} ({100 * change / (r2 - r1):6.1f}% of change), conversion {100 * c1:.1f}% -> {100 * c2:.1f}%")
          `,
        },
        r: {
          code: code`
            week1 <- data.frame(platform = c("web", "ios", "android"), users = c(10000, 8000, 6000), orders = c(500, 480, 240), revenue = c(25000, 28800, 10800))
            week2 <- data.frame(platform = c("web", "ios", "android"), users = c(10200, 8100, 6100), orders = c(510, 324, 244), revenue = c(25500, 19440, 10980))

            drivers <- function(w) {
              c(users = sum(w$users), conversion = sum(w$orders) / sum(w$users), "order value" = sum(w$revenue) / sum(w$orders))
            }

            r1 <- sum(week1$revenue)
            r2 <- sum(week2$revenue)
            cat(sprintf("revenue %d -> %d (%+.1f%%)\n", as.integer(r1), as.integer(r2), 100 * (r2 - r1) / r1))
            d1 <- drivers(week1)
            d2 <- drivers(week2)
            total_log <- log(r2 / r1)
            for (name in names(d1)) {
              share <- log(d2[[name]] / d1[[name]]) / total_log
              cat(sprintf("  %-12s %9.4f -> %9.4f  share of log change %6.1f%%\n", name, d1[[name]], d2[[name]], 100 * share))
            }
            cat("by platform:\n")
            for (i in seq_len(nrow(week1))) {
              change <- week2$revenue[i] - week1$revenue[i]
              c1 <- week1$orders[i] / week1$users[i]
              c2 <- week2$orders[i] / week2$users[i]
              cat(sprintf("  %-8s revenue %+6d (%6.1f%% of change), conversion %.1f%% -> %.1f%%\n", week1$platform[i], as.integer(change), 100 * change / (r2 - r1), 100 * c1, 100 * c2))
            }
          `,
        },
        expectedOutput: code`
        revenue 64600 -> 55920 (-13.4%)
          users        24000.0000 -> 24400.0000  share of log change  -11.5%
          conversion      0.0508 ->    0.0442  share of log change   97.2%
          order value    52.9508 ->   51.8738  share of log change   14.2%
        by platform:
          web      revenue   +500 (  -5.8% of change), conversion 5.0% -> 5.0%
          ios      revenue  -9360 ( 107.8% of change), conversion 6.0% -> 4.0%
          android  revenue   +180 (  -2.1% of change), conversion 4.0% -> 4.0%
      `,
        tests: {
          python: code`
            from math import isclose


            def test_log_shares_add_up_to_one():
                total = log(r2 / r1)
                shares = [log(d2[k] / d1[k]) / total for k in d1]
                assert isclose(sum(shares), 1.0)


            def test_segment_changes_add_up():
                assert sum(WEEK2[p][2] - WEEK1[p][2] for p in WEEK1) == r2 - r1


            def test_ios_explains_more_than_the_drop():
                assert (WEEK2["ios"][2] - WEEK1["ios"][2]) / (r2 - r1) > 1
          `,
          r: code`
            test_that("log shares add up to one", {
              shares <- vapply(names(d1), function(k) log(d2[[k]] / d1[[k]]) / total_log, numeric(1))
              expect_equal(sum(shares), 1)
            })

            test_that("segment changes add up to the total", {
              expect_equal(sum(week2$revenue - week1$revenue), r2 - r1)
            })
          `,
        },
        eli5Trace: [
          "Money fell from 64,600 to 55,920 even though a few more people visited.",
          "Splitting money into visitors × share who buy × money per order shows the 'share who buy' part fell the most.",
          "Looking at each app separately, the iOS app lost about 9,400 while web and Android grew a little.",
          "On iOS the share of buyers dropped from 6% to 4% while each order was still worth the same: something broke the iOS buying step.",
        ],
        complexity: { time: "O(segments × drivers)", space: "O(segments)" },
        edgeCases: [
          "A driver that does not change gives a log share of 0; a total change of 0 makes shares undefined.",
          "Segments that appear or disappear between periods need their own line.",
          "Opposite-signed segment changes can sum to a small total, giving shares far above 100%.",
          "Seasonality: compare with the same week last year or a matched baseline.",
        ],
        incorrect: {
          language: "python",
          code: code`
            conversion_by_platform = {p: WEEK2[p][1] / WEEK2[p][0] for p in WEEK2}
            print("All platforms are fine" if min(conversion_by_platform.values()) > 0.03 else "Problem")
          `,
          whyWrong: "It looks at levels against an arbitrary threshold instead of changes against the previous period, so a fall from 6% to 4% on iOS passes as 'fine'.",
          fix: "Compare each segment with its own baseline and attribute the total change to segments and drivers.",
        },
        walkthrough: [
          { python: "WEEK1 = {", pythonLines: 2, r: "week1 <- data.frame(", rLines: 2, eli5: "Two weeks of numbers for three apps: how many people came, how many bought, and how much money came in." },
          { python: "def drivers(users: int, orders: int, revenue: int)", pythonLines: 2, r: "drivers <- function(w) {", rLines: 3, eli5: "Split money into three parts that multiply back together: people × share who buy × money per order." },
          { python: 'print(f"revenue {r1} -> {r2}', r: 'cat(sprintf("revenue %d -> %d', eli5: "First, how much did money change in total? About 13% down." },
          { python: "total_log = log(r2 / r1)", pythonLines: 4, r: "total_log <- log(r2 / r1)", rLines: 5, eli5: "Using logarithms, the three parts' changes add up exactly to the total change, so we can say what share each part is responsible for." },
          { python: "for p in WEEK1:", pythonLines: 4, r: "for (i in seq_len(nrow(week1))) {", rLines: 6, eli5: "Now look app by app: which one lost the money, and did its share of buyers change? iOS lost more than the whole drop." },
        ],
      },
      flow: {
        title: "Walking a revenue metric tree",
        nodes: [
          node("rev", "Revenue", 0, 120, "−13.4%"),
          node("users", "Users", 240, 0, "+1.7%"),
          node("conv", "Conversion", 240, 120, "5.1% → 4.4%"),
          node("aov", "Order value", 240, 240, "52.95 → 51.87"),
          node("ios", "iOS", 500, 120, "6.0% → 4.0%"),
          node("cause", "Check iOS release and checkout events", 760, 120, ""),
        ],
        edges: [edge("rev", "users"), edge("rev", "conv"), edge("rev", "aov"), edge("conv", "ios", "by platform"), edge("ios", "cause")],
        steps: [
          step("rev users conv aov", "rev-users rev-conv rev-aov", "Revenue is users × conversion × order value. Users rose slightly, so they cannot explain the drop."),
          step("conv", "rev-conv", "Conversion fell from about 5.1% to 4.4%: the largest share of the log change."),
          step("conv ios", "conv-ios", "Splitting conversion by platform, iOS fell from 6.0% to 4.0% while web and Android held steady."),
          step("ios cause", "ios-cause", "Now the question is specific: what changed in the iOS purchase path this week? Check releases and event tracking first."),
        ],
      },
      practice: [
        {
          id: "w06-rca-case-1",
          type: "case",
          prompt: "Daily active users dropped 8% yesterday. Walk through your first 30 minutes.",
          answer: "Confirm the data (pipeline delays, logging changes, time zones). Compare against the same weekday and seasonality. Decompose DAU into new versus returning and by platform, country, app version and acquisition channel. Find the segment carrying the drop, then correlate with releases, outages, marketing changes or external events.",
          rubric: ["Data validity first", "Comparable baseline", "Segment decomposition", "Correlate with changes"],
        },
        {
          id: "w06-rca-recall-1",
          type: "recall",
          prompt: "Explain how overall conversion can fall while every segment's conversion rises.",
          answer: "Mix shift: traffic moves toward a segment with a lower conversion rate. Each segment improves, but the weighted average falls because the low-rate segment now has more weight (Simpson's paradox).",
          rubric: ["Mix shift", "Weighted average", "Simpson's paradox"],
        },
        {
          id: "w06-rca-design-1",
          type: "design",
          prompt: "Draw a metric tree for ad revenue of a social app.",
          answer: "Ad revenue = DAU × sessions per user × ad impressions per session × fill rate × price per impression (CPM / 1000). Each node can be split by platform, country and ad format.",
          rubric: ["Multiplicative drivers", "Impressions and price", "Segment splits"],
        },
      ],
      references: [
        { title: "Trustworthy Online Controlled Experiments (Kohavi, Tang, Xu), chapters on metrics", versionSensitive: false },
        { title: "Simpson's paradox, Stanford Encyclopedia of Philosophy", url: "https://plato.stanford.edu/entries/paradox-simpson/", versionSensitive: false },
      ],
      lastReviewed: REVIEWED,
    }),

    defineTopic({
      id: "w06-d03-segmentation-rfm",
      slug: "segmentation-rfm",
      title: "Customer segmentation with RFM",
      domain: "analytics",
      roles: ["data-analyst", "data-scientist"],
      difficulty: "beginner",
      minutes: 45,
      prerequisites: ["w01-d04-dataframe-wrangling"],
      objectives: [
        "Score customers on recency, frequency and monetary value",
        "Map score patterns to actionable segments",
        "Explain when rule-based segments beat clustering and when they do not",
      ],
      summary:
        "RFM scores each customer on how recently they bought, how often and how much. Simple ranks turn into segments like Champions or At risk that marketing can act on the same day, without a model.",
      eli5: {
        analogy:
          "A shopkeeper sorting regulars. Who came in lately? Who comes often? Who spends a lot? Someone who came yesterday, comes weekly and buys a lot is a star; someone who used to come often but has not been in for months needs a friendly reminder.",
        steps: [
          "Give each customer a 1 to 3 score for each question.",
          "Recent visits get a high R score; frequent visits a high F; big spending a high M.",
          "Read the three scores together, like 3-3-3 or 1-3-3.",
          "Give each pattern a name and a plan.",
        ],
        analogyLimit:
          "A shopkeeper knows faces and stories. RFM only sees transactions, so it misses reasons (someone moved away) and treats a big one-off purchase like loyalty.",
      },
      senior: {
        definition:
          "RFM assigns each customer quantile-based scores for recency (days since last purchase, lower is better), frequency (number of orders) and monetary value (total or average spend). Segments are rules over the score triple.",
        invariants: [
          "Recency is reverse scored: fewer days since purchase earns a higher score.",
          "Scores are relative to the customer base at scoring time, so the same customer can change segment without changing behavior.",
          "Ties need a deterministic rule so segments are reproducible.",
        ],
        mechanism: [
          "Rank customers on each dimension and cut ranks into thirds: score = ceiling(3 × rank / n).",
          "Champions: R = 3 and F = 3. Loyal: F = 3 with lower recency. At risk: R = 1 with F ≥ 2. Hibernating: R = 1 and F = 1.",
          "Here 10 customers fall into five segments, each with a different action.",
          "In practice compute RFM in SQL with NTILE and refresh daily.",
        ],
        complexity: "O(n log n) for the ranking sorts.",
        tradeoffs: [
          { option: "RFM rules", choose: "Fast, explainable segments for lifecycle marketing.", cost: "Ignores product mix, channel and demographics." },
          { option: "Clustering (k-means on behavior)", choose: "Discovering unexpected groups.", cost: "Harder to explain and unstable between runs." },
          { option: "Predictive scores (churn or CLV models)", choose: "Prioritizing spend by expected value.", cost: "Needs labels, monitoring and more trust-building." },
        ],
        failureModes: [
          "Scoring on all-time spend so long-gone big spenders look like Champions.",
          "Recomputing quantiles on tiny groups where one customer moves the cut-offs.",
          "Treating segments as causes: 'Champions buy more because they are Champions'.",
          "Never measuring whether segment campaigns change behavior (no holdout).",
        ],
        production:
          "RFM tables are built in the warehouse (dbt models with NTILE), synced to CRM tools, and each campaign keeps a random holdout so the lift of acting on a segment is measured, not assumed.",
        interviewAnswer:
          "I compute recency, frequency and monetary value per customer, score each into quantiles with recency reversed, and map patterns to segments like Champions (recent and frequent) and At risk (frequent but not recent). Each segment gets a specific action, and I keep holdouts to measure whether those actions actually move retention.",
      },
      implementation: {
        problem: "Score 10 customers on recency, frequency and monetary value (1 to 3 each) and assign segments.",
        input: "10 customers with days since last order, order count and total spend",
        python: {
          code: code`
            from math import ceil

            CUSTOMERS = [
                ("c01", 3, 12, 980), ("c02", 40, 9, 720), ("c03", 95, 8, 650), ("c04", 7, 2, 90), ("c05", 120, 1, 30),
                ("c06", 15, 5, 410), ("c07", 60, 3, 150), ("c08", 2, 7, 560), ("c09", 200, 2, 300), ("c10", 30, 1, 45),
            ]


            def scores(values: list[float], higher_is_better: bool) -> list[int]:
                n = len(values)
                order = sorted(range(n), key=lambda i: (values[i] if higher_is_better else -values[i], i))
                out = [0] * n
                for rank, i in enumerate(order, start=1):
                    out[i] = ceil(3 * rank / n)
                return out


            def segment(r: int, f: int) -> str:
                if r == 3 and f == 3:
                    return "Champions"
                if f == 3:
                    return "Loyal"
                if r == 1 and f >= 2:
                    return "At risk"
                if r == 1:
                    return "Hibernating"
                return "Promising"


            ids = [c[0] for c in CUSTOMERS]
            r = scores([c[1] for c in CUSTOMERS], higher_is_better=False)
            f = scores([c[2] for c in CUSTOMERS], higher_is_better=True)
            m = scores([c[3] for c in CUSTOMERS], higher_is_better=True)
            counts: dict[str, int] = {}
            for i, cid in enumerate(ids):
                seg = segment(r[i], f[i])
                counts[seg] = counts.get(seg, 0) + 1
                print(f"{cid} RFM {r[i]}{f[i]}{m[i]} {seg}")
            print("segments: " + ", ".join(f"{k}={counts[k]}" for k in sorted(counts)))
          `,
        },
        r: {
          code: code`
            customers <- data.frame(
              id = sprintf("c%02d", 1:10),
              recency = c(3, 40, 95, 7, 120, 15, 60, 2, 200, 30),
              frequency = c(12, 9, 8, 2, 1, 5, 3, 7, 2, 1),
              monetary = c(980, 720, 650, 90, 30, 410, 150, 560, 300, 45)
            )

            scores <- function(values, higher_is_better) {
              n <- length(values)
              key <- if (higher_is_better) values else -values
              ord <- order(key, seq_len(n))
              out <- integer(n)
              out[ord] <- ceiling(3 * seq_len(n) / n)
              out
            }

            segment <- function(r, f) {
              if (r == 3 && f == 3) return("Champions")
              if (f == 3) return("Loyal")
              if (r == 1 && f >= 2) return("At risk")
              if (r == 1) return("Hibernating")
              "Promising"
            }

            r <- scores(customers$recency, FALSE)
            f <- scores(customers$frequency, TRUE)
            m <- scores(customers$monetary, TRUE)
            segs <- character(nrow(customers))
            for (i in seq_len(nrow(customers))) {
              segs[i] <- segment(r[i], f[i])
              cat(sprintf("%s RFM %d%d%d %s\n", customers$id[i], r[i], f[i], m[i], segs[i]))
            }
            counts <- table(segs)
            counts <- counts[order(names(counts))]
            cat("segments: ", paste(sprintf("%s=%d", names(counts), as.integer(counts)), collapse = ", "), "\n", sep = "")
          `,
        },
        expectedOutput: code`
        c01 RFM 333 Champions
        c02 RFM 233 Loyal
        c03 RFM 133 Loyal
        c04 RFM 311 Promising
        c05 RFM 111 Hibernating
        c06 RFM 322 Promising
        c07 RFM 222 Promising
        c08 RFM 333 Champions
        c09 RFM 122 At risk
        c10 RFM 211 Promising
        segments: At risk=1, Champions=2, Hibernating=1, Loyal=2, Promising=4
      `,
        tests: {
          python: code`
            def test_recency_is_reverse_scored():
                assert scores([1, 50, 100], higher_is_better=False) == [3, 2, 1]


            def test_scores_are_balanced_thirds():
                assert sorted(scores(list(range(9)), True)) == [1, 1, 1, 2, 2, 2, 3, 3, 3]


            def test_segment_rules():
                assert segment(3, 3) == "Champions" and segment(1, 3) == "Loyal" and segment(1, 2) == "At risk"
          `,
          r: code`
            test_that("recency is reverse scored", {
              expect_equal(scores(c(1, 50, 100), FALSE), c(3L, 2L, 1L))
            })

            test_that("segment rules", {
              expect_equal(segment(3, 3), "Champions")
              expect_equal(segment(1, 2), "At risk")
            })
          `,
        },
        eli5Trace: [
          "Each customer gets three stars ratings from 1 to 3: how recently, how often, how much.",
          "Someone who bought 3 days ago gets the top recency score; someone gone for 200 days gets the lowest.",
          "c01 bought recently, often and a lot: a Champion.",
          "c03 used to buy often but has not come for 95 days: Loyal for now, worth a check-in before they slip.",
          "Counting the names tells marketing how many people need each kind of message.",
        ],
        complexity: { time: "O(n log n)", space: "O(n)" },
        edgeCases: [
          "Ties in recency or frequency: break ties by id so results are reproducible.",
          "New customers with one recent order look Promising, not Champions; that is intended.",
          "Seasonal businesses need recency relative to the season, not the calendar.",
          "Returns and refunds should reduce monetary value.",
        ],
        incorrect: {
          language: "python",
          code: code`
            r_score = [ceil(3 * rank / n) for rank in sorted(recency_days)]
          `,
          whyWrong: "It ranks recency so that more days earns a higher score and loses the link between scores and customers by sorting the values themselves.",
          fix: "Rank customer indices by recency ascending (fewest days first get the top score) and write each score back to its customer.",
        },
        walkthrough: [
          { python: "CUSTOMERS = [", pythonLines: 4, r: "customers <- data.frame(", rLines: 6, eli5: "Ten customers: days since their last order, how many orders, and how much they spent in total." },
          { python: "def scores(values: list[float], higher_is_better: bool)", pythonLines: 7, r: "scores <- function(values, higher_is_better) {", rLines: 7, eli5: "Line customers up for one question and cut the line into thirds: top third scores 3, middle 2, bottom 1. For recency, fewer days is better." },
          { python: "def segment(r: int, f: int) -> str:", pythonLines: 10, r: "segment <- function(r, f) {", rLines: 7, eli5: "Turn score patterns into names a marketer understands: Champions, Loyal, At risk, Hibernating, Promising." },
          { python: "for i, cid in enumerate(ids):", pythonLines: 4, r: "for (i in seq_len(nrow(customers))) {", rLines: 4, eli5: "Print each customer's three scores and their segment name." },
          { python: 'print("segments: "', r: 'cat("segments: "', eli5: "Count how many customers are in each segment so we know how big each campaign will be." },
        ],
      },
      flow: {
        title: "From transactions to actionable segments",
        nodes: [
          node("orders", "Orders", 0, 110, "per customer"),
          node("rfm", "R, F, M", 200, 110, "days, count, spend"),
          node("score", "Score 1-3", 400, 110, "rank into thirds"),
          node("seg", "Segment rules", 600, 110, "Champions, At risk…"),
          node("act", "Action + holdout", 820, 110, "measure lift"),
        ],
        edges: [edge("orders", "rfm"), edge("rfm", "score"), edge("score", "seg"), edge("seg", "act")],
        steps: [
          step("orders rfm", "orders-rfm", "Aggregate orders per customer into recency (days since last order), frequency and monetary value."),
          step("rfm score", "rfm-score", "Rank customers on each and cut into thirds, reversing recency so recent buyers score high."),
          step("score seg", "score-seg", "Map score patterns to named segments that each imply a different message."),
          step("seg act", "seg-act", "Run the campaign with a random holdout so you can measure whether it changed behavior."),
        ],
      },
      practice: [
        {
          id: "w06-rfm-recall-1",
          type: "recall",
          prompt: "Write the SQL to give each customer a recency score from 1 to 5.",
          answer: "SELECT customer_id, NTILE(5) OVER (ORDER BY days_since_last_order DESC) AS r_score FROM customer_stats; ordering by days descending puts the most recent customers in tile 5.",
          rubric: ["NTILE(5)", "Order so recent customers get 5", "Window function"],
        },
        {
          id: "w06-rfm-case-1",
          type: "case",
          prompt: "Marketing wants to email all 'At risk' customers a 20% discount. How would you test whether it works?",
          answer: "Randomly hold out part of the At risk segment, send the offer to the rest, and compare 30-day repurchase and net margin (after the discount) between groups. Pre-register the metric and duration.",
          rubric: ["Random holdout", "Outcome window", "Margin not just revenue"],
        },
        {
          id: "w06-rfm-recall-2",
          type: "recall",
          prompt: "Why might RFM scores change even when a customer's behavior does not?",
          answer: "Scores are relative quantiles of the whole base, so if other customers become more active the cut-offs move.",
          rubric: ["Relative scoring", "Quantile cut-offs move"],
        },
      ],
      references: [
        { title: "PostgreSQL documentation: window functions (NTILE)", url: "https://www.postgresql.org/docs/current/functions-window.html", versionSensitive: false },
      ],
      lastReviewed: REVIEWED,
    }),

    defineTopic({
      id: "w06-d04-visualization-storytelling",
      slug: "visualization-storytelling",
      title: "Chart choice, honest axes and dashboards",
      domain: "analytics",
      roles: ["data-analyst", "data-scientist", "ml-engineer"],
      difficulty: "beginner",
      minutes: 45,
      prerequisites: ["w05-d01-descriptive-stats-clt"],
      objectives: [
        "Pick a chart from the question being asked (trend, comparison, part of whole, distribution, relationship)",
        "Spot truncated axes and compute a lie factor",
        "Design a dashboard around decisions, not around available data",
      ],
      summary:
        "A chart is an answer to a question. Line charts show trends, sorted bars compare, histograms show distributions and scatter plots show relationships. Bar lengths must start at zero, or a 20% gap can look like a 3× gap.",
      eli5: {
        analogy:
          "Telling a story with pictures for a friend who has ten seconds. If you want to show who is tallest, line everyone up from tallest to shortest. If you want to show how a plant grew, draw its height every day as a line. If you squash the bottom of the picture away, tiny differences look huge, and that is cheating.",
        steps: [
          "Decide the one question the picture answers.",
          "Pick the picture that answers that kind of question.",
          "Sort bars and label them directly.",
          "Start bars at zero so lengths stay honest.",
        ],
        analogyLimit:
          "A friend looks at one picture. A dashboard is read by many people for many decisions, so it also needs consistent definitions, filters and context like targets and last year's values.",
      },
      senior: {
        definition:
          "Visual encoding maps data to position, length, angle, area or color; people judge position and length most accurately. Tufte's lie factor is the size of an effect in the graphic divided by the size of the effect in the data; honest graphics stay near 1.",
        invariants: [
          "Bar and area charts encode magnitude by length or area, so their axis must start at zero.",
          "Line charts encode change by slope, so a non-zero baseline can be fine if labeled.",
          "One chart, one message; one axis per chart.",
        ],
        mechanism: [
          "Regions sorted by revenue, drawn from zero, show North (120k) as 1.2× East (100k).",
          "Starting the axis at 90 makes North's bar 3× East's: a lie factor of about 10 for a 20% difference.",
          "A rule table maps question types to charts: trend to line, comparison to sorted bar, part of whole to stacked or 100% bar, distribution to histogram or box plot, relationship to scatter.",
          "Dashboards lead with the decision metric, then its drivers, with targets and comparison periods on every tile.",
        ],
        complexity: "Rendering is trivial; the cost is in agreeing on metric definitions behind each tile.",
        tradeoffs: [
          { option: "Sorted horizontal bars", choose: "Comparing many categories with long labels.", cost: "Loses any natural category order." },
          { option: "Pie charts", choose: "Two or three parts of a whole at most.", cost: "Angles are hard to compare beyond a few slices." },
          { option: "Small multiples", choose: "Comparing the same chart across segments.", cost: "Needs shared axes and more space." },
        ],
        failureModes: [
          "Truncated bar axes exaggerating differences.",
          "Dual-axis charts implying a correlation by choosing scales.",
          "Rainbow color scales for ordered data.",
          "Dashboards with 30 tiles and no clear decision they support.",
        ],
        production:
          "BI tools (Tableau, Power BI, Looker, Superset) sit on a governed semantic layer so 'revenue' means one thing everywhere. Good dashboards show the north-star metric, its drivers, data freshness and an owner.",
        interviewAnswer:
          "I start from the question: trends get lines, comparisons get sorted bars, distributions get histograms or box plots, relationships get scatter plots. Bars always start at zero; a truncated axis here turns a 20% gap into a 3× visual gap, a lie factor around 10. A dashboard leads with the decision metric and its drivers, each with a target and comparison period.",
      },
      implementation: {
        problem: "Draw an honest text bar chart of regional revenue, compute the lie factor of a truncated axis, and pick charts for common questions.",
        input: "revenue (k): North 120, East 100, South 96, West 75; questions about trend, comparison, share, distribution and relationship",
        python: {
          code: code`
            REVENUE = {"East": 100, "North": 120, "South": 96, "West": 75}
            CHART_FOR = {
                "trend": "line chart",
                "comparison": "sorted bar chart",
                "part of whole": "stacked or 100% bar",
                "distribution": "histogram or box plot",
                "relationship": "scatter plot",
            }


            def bars(data: dict[str, int], width: int = 40, baseline: int = 0) -> list[str]:
                top = max(data.values())
                rows = sorted(data.items(), key=lambda kv: (-kv[1], kv[0]))
                return [f"{name:<6} {'#' * round(width * (v - baseline) / (top - baseline)):<{width}} {v}" for name, v in rows]


            def lie_factor(a: int, b: int, baseline: int) -> float:
                shown = (a - baseline) / (b - baseline)
                actual = a / b
                return (shown - 1) / (actual - 1)


            print("Revenue by region (k), sorted, axis from 0:")
            for line in bars(REVENUE):
                print(line)
            shown = (REVENUE["North"] - 90) / (REVENUE["East"] - 90)
            print(f"axis from 90: North looks {shown:.1f}x East but is {REVENUE['North'] / REVENUE['East']:.1f}x (lie factor {lie_factor(120, 100, 90):.1f})")
            for question in ("trend", "comparison", "part of whole", "distribution", "relationship"):
                print(f"{question:<14} -> {CHART_FOR[question]}")
          `,
        },
        r: {
          code: code`
            revenue <- c(East = 100, North = 120, South = 96, West = 75)
            chart_for <- c(
              trend = "line chart",
              comparison = "sorted bar chart",
              "part of whole" = "stacked or 100% bar",
              distribution = "histogram or box plot",
              relationship = "scatter plot"
            )

            bars <- function(data, width = 40, baseline = 0) {
              top <- max(data)
              ord <- order(-data, names(data))
              vapply(ord, function(i) {
                n <- round(width * (data[[i]] - baseline) / (top - baseline))
                sprintf("%-6s %-*s %d", names(data)[i], width, strrep("#", n), as.integer(data[[i]]))
              }, character(1))
            }

            lie_factor <- function(a, b, baseline) {
              shown <- (a - baseline) / (b - baseline)
              (shown - 1) / (a / b - 1)
            }

            cat("Revenue by region (k), sorted, axis from 0:\n")
            cat(bars(revenue), sep = "\n")
            shown <- (revenue[["North"]] - 90) / (revenue[["East"]] - 90)
            cat(sprintf("axis from 90: North looks %.1fx East but is %.1fx (lie factor %.1f)\n", shown, revenue[["North"]] / revenue[["East"]], lie_factor(120, 100, 90)))
            for (q in names(chart_for)) cat(sprintf("%-14s -> %s\n", q, chart_for[[q]]))
          `,
        },
        expectedOutput: code`
        Revenue by region (k), sorted, axis from 0:
        North  ######################################## 120
        East   #################################        100
        South  ################################         96
        West   #########################                75
        axis from 90: North looks 3.0x East but is 1.2x (lie factor 10.0)
        trend          -> line chart
        comparison     -> sorted bar chart
        part of whole  -> stacked or 100% bar
        distribution   -> histogram or box plot
        relationship   -> scatter plot
      `,
        tests: {
          python: code`
            def test_honest_axis_has_lie_factor_one():
                assert abs(lie_factor(120, 100, 0) - 1.0) < 1e-9


            def test_bars_are_sorted_descending():
                assert bars(REVENUE)[0].startswith("North")


            def test_longest_bar_fills_the_width():
                assert bars({"a": 5, "b": 1}, width=10)[0].count("#") == 10
          `,
          r: code`
            test_that("honest axis has lie factor one", {
              expect_equal(lie_factor(120, 100, 0), 1)
            })

            test_that("bars are sorted descending", {
              expect_match(bars(revenue)[1], "^North")
            })
          `,
        },
        eli5Trace: [
          "Line the regions up from biggest to smallest: North, East, South, West.",
          "Each bar's length is its revenue compared with the biggest, starting from nothing.",
          "If we chop the bottom off and start at 90, North's bar becomes three times East's even though North only earns 20% more.",
          "That stretch is the lie factor: the picture's story is about 10 times bigger than the real difference.",
          "A little table says which picture to use for each kind of question.",
        ],
        complexity: { time: "O(k log k) to sort k bars", space: "O(k)" },
        edgeCases: [
          "Negative values need bars on both sides of zero.",
          "All values equal: every bar fills the width; say so in the title.",
          "Very long category names: truncate or wrap, or switch to horizontal bars.",
          "Line charts with a zoomed axis must show the axis range clearly.",
        ],
        incorrect: {
          language: "python",
          code: code`
            plt.bar(regions, revenue)
            plt.ylim(90, 125)
          `,
          whyWrong: "Bars encode value by length; starting the y axis at 90 makes North's bar three times East's for a 20% difference.",
          fix: "Keep bar axes at zero (plt.ylim(0, ...)), or use a dot plot or line chart if you need to zoom into small differences.",
        },
        walkthrough: [
          { python: "REVENUE = {", r: "revenue <- c(", eli5: "Four regions and how much money each made, in thousands." },
          { python: "CHART_FOR = {", pythonLines: 7, r: "chart_for <- c(", rLines: 7, eli5: "A cheat sheet: which picture answers which kind of question." },
          { python: "def bars(data: dict[str, int], width: int = 40, baseline: int = 0)", pythonLines: 4, r: "bars <- function(data, width = 40, baseline = 0) {", rLines: 8, eli5: "Draw bars with # signs. Sort them biggest first, and make each bar's length proportional to its value measured from the baseline." },
          { python: "def lie_factor(a: int, b: int, baseline: int) -> float:", pythonLines: 4, r: "lie_factor <- function(a, b, baseline) {", rLines: 4, eli5: "The lie factor compares how big a difference looks in the picture with how big it really is. Honest pictures score 1." },
          { python: "shown = (REVENUE[", pythonLines: 2, r: "shown <- (revenue[[", rLines: 2, eli5: "Chop the axis at 90 and North suddenly looks three times bigger than East, when it is only 1.2 times bigger." },
        ],
      },
      flow: {
        title: "From a question to an honest chart",
        nodes: [
          node("q", "Question", 0, 110, "what decision?"),
          node("type", "Question type", 200, 110, "trend, compare…"),
          node("chart", "Chart", 400, 110, "line, sorted bar…"),
          node("axis", "Honest axis", 600, 110, "bars from zero"),
          node("label", "Label directly", 800, 110, "title states the takeaway"),
        ],
        edges: [edge("q", "type"), edge("type", "chart"), edge("chart", "axis"), edge("axis", "label")],
        steps: [
          step("q type", "q-type", "Start from the decision: 'which region should get more budget?' is a comparison question."),
          step("type chart", "type-chart", "Comparisons get sorted bars; trends get lines; distributions get histograms."),
          step("chart axis", "chart-axis", "Bars start at zero. A truncated axis turns a 20% gap into a 3× visual gap."),
          step("axis label", "axis-label", "Label bars directly and write the takeaway as the title, so the chart reads in seconds."),
        ],
      },
      practice: [
        {
          id: "w06-viz-recall-1",
          type: "recall",
          prompt: "Which chart would you use to show how order value is spread across customers, and why not a bar chart of averages?",
          answer: "A histogram or box plot, because the question is about the distribution. A bar of averages hides skew, outliers and multiple peaks.",
          rubric: ["Histogram or box plot", "Distribution question", "Averages hide shape"],
        },
        {
          id: "w06-viz-design-1",
          type: "design",
          prompt: "Design a one-screen dashboard for a subscription product's weekly business review.",
          answer: "Top: net revenue retention or MRR with target and last-year comparison. Next row: drivers (new MRR, expansion, contraction, churn) as small line charts. Then funnel conversion and cohort retention heatmap. Each tile shows definition, freshness and owner; filters for plan and region.",
          rubric: ["North-star metric with target", "Driver decomposition", "Cohorts or funnel", "Definitions and freshness"],
        },
        {
          id: "w06-viz-case-1",
          type: "case",
          prompt: "A slide shows two lines on separate y axes rising together and concludes marketing spend drives signups. What do you say?",
          answer: "Dual axes can make any two rising series look aligned by choosing scales, and co-movement is not causation. Show both indexed to a common base or in separate panels, and test causality with an experiment or a holdout.",
          rubric: ["Dual-axis manipulation", "Correlation versus causation", "Better alternatives"],
        },
      ],
      references: [
        { title: "The Visual Display of Quantitative Information (Tufte), including the lie factor", versionSensitive: false },
        { title: "Graphical Perception (Cleveland and McGill, Journal of the American Statistical Association, 1984)", versionSensitive: false },
      ],
      lastReviewed: REVIEWED,
    }),
  ],
};
