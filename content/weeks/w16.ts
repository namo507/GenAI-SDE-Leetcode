import { REVIEWED, code, defineTopic, defineWeek, edge, node, step } from "../helpers";

export const topics = [
  defineTopic({
    id: "w16-d01-capstone-scoping",
    slug: "capstone-scoping",
    title: "Scoping a role-specific capstone",
    domain: "career",
    roles: ["sde", "data-scientist", "ml-engineer", "genai-engineer", "data-engineer"],
    difficulty: "intermediate",
    minutes: 60,
    prerequisites: ["w01-d03-testing-reproducibility"],
    objectives: [
      "Write a one-page capstone brief with a user, a metric and a baseline",
      "Cut scope to something demoable in two weeks",
      "Plan the evidence interviewers will look for: tests, evaluation and a write-up",
    ],
    summary:
      "A capstone is evidence that you can take a problem from question to working, measured result. Scope it around one user, one decision and one metric, beat a simple baseline, and show the engineering around it.",
    eli5: {
      analogy:
        "Building a model bridge for a science fair. Judges do not want the biggest bridge; they want to see that you defined how much weight it must hold, tested a simple design first, measured it, and explained what you would improve.",
      steps: [
        "Name the person who has the problem and the decision they need to make.",
        "Pick one number that says whether you helped them.",
        "Build the simplest thing that works and measure it.",
        "Improve one step at a time, keeping the measurements.",
        "Write a short report: what worked, what did not, what is next.",
      ],
      analogyLimit:
        "A science fair has a fixed date and a single judge. Interviewers skim, so the story must be clear in the first minute: the README and a short demo matter as much as the code.",
    },
    senior: {
      definition:
        "A capstone brief states the user, the decision, the success metric and its target, the data and its provenance, the baseline, the constraints (latency, cost, privacy) and milestones with a demoable slice at each.",
      invariants: [
        "Every claim in the write-up is backed by a reproducible run (pinned environment, fixed data snapshot, tests in CI).",
        "There is a simple baseline, and improvements are reported against it.",
        "Data sources are real and properly licensed; nothing is presented as production data that is not.",
      ],
      mechanism: [
        "Week 1 of the capstone: brief, data audit, baseline, evaluation harness. Week 2: one improvement, failure analysis, write-up and demo.",
        "Role-specific emphasis: SDE (API, tests, load and failure handling), data scientist (question, causal or statistical rigor, decision memo), ML engineer (pipeline, serving, monitoring), GenAI engineer (RAG or agent with an eval suite and guardrails), data engineer (ingestion, quality gates, lineage).",
        "The write-up leads with the result and its limits, then method, then next steps.",
      ],
      complexity: "The constraint is time: two weeks of evenings, so scope ruthlessly to one end-to-end path.",
      tradeoffs: [
        { option: "Narrow, deep project", choose: "Showing rigor and production thinking.", cost: "Less visual breadth." },
        { option: "Broad demo", choose: "Showing product sense quickly.", cost: "Easy to look shallow under questioning." },
        { option: "Open-source contribution", choose: "Showing collaboration and code review.", cost: "Less control over scope and timing." },
      ],
      failureModes: [
        "No baseline, so improvements cannot be judged.",
        "Notebook-only projects that do not run for anyone else.",
        "Claims (accuracy, users, impact) that the repository cannot reproduce.",
        "Scope creep that leaves nothing finished.",
      ],
      production:
        "Treat the capstone like a small production system: CI, tests, a README with a one-command setup, evaluation reports, and an honest limitations section.",
      interviewAnswer:
        "I scoped it around one user and one decision, defined the metric up front, built a simple baseline and an evaluation harness first, then made one improvement and analyzed its failures. Everything reruns from a pinned environment with tests in CI, and the write-up states the result, its limits and what I would do next.",
    },
    flow: {
      title: "From idea to defensible capstone",
      nodes: [
        node("user", "User and decision", 0, 110, "who, what choice"),
        node("metric", "Metric and target", 220, 110, "one number"),
        node("baseline", "Baseline + eval", 440, 110, "simplest working version"),
        node("improve", "One improvement", 660, 110, "measured against baseline"),
        node("writeup", "Write-up and demo", 880, 110, "result, limits, next"),
      ],
      edges: [edge("user", "metric"), edge("metric", "baseline"), edge("baseline", "improve"), edge("improve", "writeup")],
      steps: [
        step("user", "", "Start from a real user and the decision your project helps them make."),
        step("metric", "user-metric", "Define one metric and a target before building anything."),
        step("baseline", "metric-baseline", "Ship the simplest end-to-end version with an evaluation harness and tests."),
        step("improve", "baseline-improve", "Make one improvement and report it against the baseline, including failures."),
        step("writeup", "improve-writeup", "Lead the write-up with the result and its limits; record a two-minute demo."),
      ],
    },
    practice: [
      {
        id: "w16-capstone-design-1",
        type: "design",
        prompt: "Write a one-page capstone brief for your target role using the template: user, decision, metric and target, data, baseline, constraints, two milestones.",
        answer: "A good brief names a specific user (for example, 'support leads triaging 500 tickets a day'), one decision, a measurable target ('route 80% of tickets correctly at under 2 seconds'), a real and licensed dataset, a baseline (keyword rules), constraints (cost per ticket, privacy) and two demoable milestones.",
        rubric: ["Specific user and decision", "Measurable target", "Real data with provenance", "Baseline and milestones"],
      },
      {
        id: "w16-capstone-recall-1",
        type: "recall",
        prompt: "What should the first screen of your capstone README contain?",
        answer: "One sentence on the problem and user, the headline result against the baseline, a demo link or GIF, a one-command setup, and a limitations line.",
        rubric: ["Problem and user", "Result versus baseline", "Setup command", "Limitations"],
      },
    ],
    references: [
      { title: "Rules of Machine Learning (Zinkevich), Google developers", url: "https://developers.google.com/machine-learning/guides/rules-of-ml", versionSensitive: false },
      { title: "The Mom Test (Fitzpatrick), on talking to users about real problems", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w16-d02-behavioral-star",
    slug: "behavioral-star",
    title: "Behavioral stories with STAR",
    domain: "career",
    roles: ["sde", "data-scientist", "ml-engineer", "genai-engineer", "data-engineer"],
    difficulty: "beginner",
    minutes: 60,
    prerequisites: [],
    objectives: [
      "Structure stories as situation, task, action, result and reflection",
      "Build a story bank that covers common competencies",
      "Quantify results honestly and own your specific contribution",
    ],
    summary:
      "Behavioral interviews test how you work: conflict, ambiguity, failure, ownership and influence. Six to eight well-structured stories, each reusable for several questions, cover most loops.",
    eli5: {
      analogy:
        "Telling a good short story at dinner: who was there, what had to happen, what you did, how it turned out, and what you learned. Not your whole life, not someone else's part, just your scene.",
      steps: [
        "Set the scene in two sentences.",
        "Say what you were responsible for.",
        "Spend most of the time on what you did, using 'I', not 'we'.",
        "Give the result, with a number if you honestly have one.",
        "End with what you learned or would do differently.",
      ],
      analogyLimit:
        "Dinner stories can be embellished; interview stories must be true and will be probed. Interviewers ask follow-ups to test depth, so know the details behind every number.",
    },
    senior: {
      definition:
        "STAR (situation, task, action, result) plus reflection is a structure for evidence-based answers to competency questions. A story bank maps each story to the competencies it demonstrates.",
      invariants: [
        "Actions are yours and specific; team context is brief.",
        "Results are measurable or at least observable, and stated honestly.",
        "Each story fits in about two minutes before follow-ups.",
      ],
      mechanism: [
        "Pick stories from the last few years with real stakes: a disagreement, a failure, an ambiguous project, an influence-without-authority win, a technical deep dive, a mentoring moment.",
        "Map each to competencies (ownership, conflict, ambiguity, customer focus, technical judgment) so one story answers several prompts.",
        "Rehearse aloud with a timer, then cut setup and expand actions.",
        "Prepare follow-up answers: what would you do differently, what did others think, how did you measure it.",
      ],
      complexity: "Six to eight stories cover most loops; more than that becomes hard to rehearse well.",
      tradeoffs: [
        { option: "Recent, smaller story with clear ownership", choose: "Most prompts.", cost: "Less impressive headline." },
        { option: "Big team story", choose: "Scale and influence questions.", cost: "Harder to show your specific contribution." },
        { option: "Failure story", choose: "Required by many loops; shows learning.", cost: "Must show real ownership, not blame." },
      ],
      failureModes: [
        "Answering with 'we' throughout, so the interviewer cannot assess you.",
        "Spending most of the time on situation and none on actions.",
        "Inflated or unverifiable numbers that fall apart under follow-up.",
        "A failure story where the failure was someone else's.",
      ],
      production:
        "Keep a running work log of decisions, numbers and feedback; it makes stories accurate and easy to refresh before each loop.",
      interviewAnswer:
        "For a conflict question I would use STAR: two sentences of situation, my responsibility, then specific actions I took, such as how I gathered data and proposed a compromise, the measurable result, and what I would do differently. I keep each story to about two minutes and prepare for follow-ups on details and alternatives.",
    },
    flow: {
      title: "A two-minute STAR answer",
      nodes: [
        node("s", "Situation", 0, 110, "2 sentences"),
        node("t", "Task", 200, 110, "your responsibility"),
        node("a", "Action", 420, 110, "most of the time, 'I'"),
        node("r", "Result", 640, 110, "measured, honest"),
        node("l", "Reflection", 860, 110, "what you learned"),
      ],
      edges: [edge("s", "t"), edge("t", "a"), edge("a", "r"), edge("r", "l")],
      steps: [
        step("s", "", "Set the scene briefly: team, goal, stakes."),
        step("t", "s-t", "State what you specifically owned."),
        step("a", "t-a", "Spend most of the answer here: what you did, how, and why."),
        step("r", "a-r", "Give the outcome with a number you can defend."),
        step("l", "r-l", "Close with what you learned or would change, which invites good follow-ups."),
      ],
    },
    practice: [
      {
        id: "w16-star-design-1",
        type: "design",
        prompt: "Draft your story bank: list six stories and map each to at least two competencies (ownership, conflict, ambiguity, failure, influence, technical depth).",
        answer: "A strong bank covers every competency at least twice across six stories, each with a one-line STAR summary and one number.",
        rubric: ["Six stories", "Every competency covered twice", "One-line STAR summaries with numbers"],
      },
      {
        id: "w16-star-case-1",
        type: "case",
        prompt: "Practice aloud: 'Tell me about a time you disagreed with a technical decision.' Time yourself and score against the rubric.",
        answer: "About 2 minutes; situation under 20 seconds; specific actions (data gathered, alternatives proposed, how disagreement was resolved); outcome and what you learned; no blame.",
        rubric: ["Under 2.5 minutes", "Actions dominate", "Measured result", "Reflection without blame"],
      },
    ],
    references: [
      { title: "Cracking the Coding Interview (McDowell), chapter on behavioral questions", versionSensitive: false },
      { title: "Staff Engineer: Leadership beyond the management track (Larson)", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w16-d03-remediation-planning",
    slug: "remediation-planning",
    title: "Mock loop strategy and remediation planning",
    domain: "career",
    roles: ["sde", "data-scientist", "ml-engineer", "genai-engineer", "data-engineer"],
    difficulty: "intermediate",
    minutes: 70,
    prerequisites: ["w16-d01-capstone-scoping"],
    objectives: [
      "Rank topics for final review from mastery, retention, overdue reviews and role weight",
      "Turn the ranking into a time budget",
      "Explain why the learning indicator is not a hiring prediction",
    ],
    summary:
      "The last week should go where it moves the needle: low mastery on high-weight topics, overdue reviews and weak retention. A transparent priority formula turns your learning data into a concrete plan.",
    eli5: {
      analogy:
        "Packing for a trip with limited suitcase space. You pack first what you need most and are most likely to forget, not what you already wear every day.",
      steps: [
        "For each topic, note how well you know it, how well it sticks, how overdue its review is, and how important it is for your role.",
        "Combine these into one priority score with a simple formula.",
        "Sort topics by priority.",
        "Split your available time across the top few in proportion to their scores.",
      ],
      analogyLimit:
        "The formula only knows the numbers you gave it. A topic you never practiced has no mastery data at all, and interview performance also depends on communication and nerves, which no score captures.",
    },
    senior: {
      definition:
        "priority = role_weight x (1 - mastery) x (1 + days_overdue / 7) + 0.5 x (1 - retention). Time for each selected topic = total minutes x priority / sum of selected priorities, rounded to the nearest minute.",
      invariants: [
        "Mastery, retention, completion and confidence stay separate inputs; none is folded into another.",
        "The formula is shown to the learner and labeled a learning indicator, not a probability of being hired.",
        "Rounding is half-up (floor(x + 0.5)) in both languages so plans match.",
      ],
      mechanism: [
        "Low mastery multiplies with role weight, so a weak topic that matters for your role dominates.",
        "Overdue reviews scale priority up by one seventh per day overdue, capturing forgetting risk.",
        "Retention adds a smaller independent term so well-understood but leaky topics still surface.",
        "The top four topics share 240 minutes in proportion to priority.",
      ],
      complexity: "O(n log n) to sort n topics.",
      tradeoffs: [
        { option: "Transparent formula", choose: "Learners must trust and adjust the plan.", cost: "Hand-picked weights, not learned." },
        { option: "Learned model of forgetting", choose: "Large user bases with review history.", cost: "Opaque and data-hungry." },
        { option: "Pure self-assessment", choose: "Quick planning.", cost: "Confidence is often miscalibrated." },
      ],
      failureModes: [
        "Spending the final week on comfortable topics.",
        "Treating a readiness score as a hiring probability.",
        "Ignoring topics with no data because they show no weakness.",
        "Cramming new material instead of consolidating.",
      ],
      production:
        "The Analytics page in this app computes exactly these inputs from your attempts and reviews, and the Dashboard surfaces the top items as weak areas.",
      interviewAnswer:
        "I rank topics by role weight times the mastery gap, scaled up for overdue reviews, plus a retention term, then split my available time in proportion to priority across the top few. It is a transparent learning indicator, not a prediction of interview outcomes, and I adjust it after every mock loop.",
    },
    implementation: {
      problem: "Rank six topics by remediation priority and split 240 minutes across the top four.",
      input: "per topic: mastery, retention, days overdue, role weight; 240 minutes available",
      python: {
        code: code`
          from math import floor

          TOPICS = [
              ("sliding-window", 0.55, 0.70, 3, 3),
              ("window-functions", 0.80, 0.90, 0, 3),
              ("hypothesis-testing", 0.40, 0.60, 10, 2),
              ("attention-transformers", 0.65, 0.75, 1, 3),
              ("replication-queues", 0.30, 0.50, 5, 2),
              ("kaplan-meier-survival", 0.50, 0.80, 0, 1),
          ]


          def priority(mastery: float, retention: float, overdue: int, weight: int) -> float:
              return weight * (1 - mastery) * (1 + overdue / 7) + 0.5 * (1 - retention)


          ranked = sorted(TOPICS, key=lambda t: (-priority(*t[1:]), t[0]))
          top = ranked[:4]
          total = sum(priority(*t[1:]) for t in top)
          for i, (name, *stats) in enumerate(ranked, 1):
              p = priority(*stats)
              minutes = floor(240 * p / total + 0.5) if i <= 4 else 0
              print(f"{i}. {name}: priority={p:.3f} minutes={minutes}")
        `,
      },
      r: {
        code: code`
          topics <- data.frame(
            name = c("sliding-window", "window-functions", "hypothesis-testing", "attention-transformers", "replication-queues", "kaplan-meier-survival"),
            mastery = c(0.55, 0.80, 0.40, 0.65, 0.30, 0.50),
            retention = c(0.70, 0.90, 0.60, 0.75, 0.50, 0.80),
            overdue = c(3, 0, 10, 1, 5, 0),
            weight = c(3, 3, 2, 3, 2, 1)
          )

          priority <- function(mastery, retention, overdue, weight) weight * (1 - mastery) * (1 + overdue / 7) + 0.5 * (1 - retention)

          topics$p <- with(topics, priority(mastery, retention, overdue, weight))
          ranked <- topics[order(-topics$p, topics$name, method = "radix"), ]
          total <- sum(ranked$p[1:4])
          for (i in seq_len(nrow(ranked))) {
            minutes <- if (i <= 4) floor(240 * ranked$p[i] / total + 0.5) else 0
            cat(sprintf("%d. %s: priority=%.3f minutes=%d\n", i, ranked$name[i], ranked$p[i], as.integer(minutes)))
          }
        `,
      },
      expectedOutput: code`
        1. hypothesis-testing: priority=3.114 minutes=82
        2. replication-queues: priority=2.650 minutes=69
        3. sliding-window: priority=2.079 minutes=54
        4. attention-transformers: priority=1.325 minutes=35
        5. window-functions: priority=0.650 minutes=0
        6. kaplan-meier-survival: priority=0.600 minutes=0
      `,
      tests: {
        python: code`
          def test_mastered_topic_with_good_retention_is_low_priority():
              assert priority(1.0, 1.0, 0, 3) == 0


          def test_overdue_increases_priority():
              assert priority(0.5, 0.8, 7, 2) > priority(0.5, 0.8, 0, 2)


          def test_allocated_minutes_are_close_to_budget():
              allocated = sum(floor(240 * priority(*t[1:]) / total + 0.5) for t in top)
              assert abs(allocated - 240) <= 2
        `,
        r: code`
          test_that("a mastered topic with good retention has zero priority", {
            expect_equal(priority(1, 1, 0, 3), 0)
          })

          test_that("overdue reviews increase priority", {
            expect_gt(priority(0.5, 0.8, 7, 2), priority(0.5, 0.8, 0, 2))
          })
        `,
      },
      eli5Trace: [
        "replication-queues is barely known, matters for the role and is five days overdue, so it lands near the top.",
        "hypothesis-testing is weak and ten days overdue, which more than doubles its urgency.",
        "window-functions is well known and on schedule, so it drops down the list.",
        "The four most urgent topics share the 240 minutes in proportion to their scores.",
      ],
      complexity: { time: "O(n log n)", space: "O(n)" },
      edgeCases: [
        "If every top topic has zero priority, the minute split divides by zero; return an even split instead.",
        "Rounding can make minutes sum to slightly more or less than 240.",
        "Ties in priority are broken alphabetically in both languages.",
        "Topics with no attempts need a default mastery (for example 0) so they are not ignored.",
      ],
      incorrect: {
        language: "python",
        code: code`
          readiness = 0.5 * mastery + 0.5 * confidence
          print(f"You have a {readiness:.0%} chance of getting the job")
        `,
        whyWrong: "It blends confidence into mastery and presents a learning indicator as a hiring probability, which no study-tracking data can support.",
        fix: "Keep the inputs separate, show the formula, and label any combined score as a learning indicator.",
      },
    },
    flow: {
      title: "From learning data to a final-week plan",
      nodes: [
        node("inputs", "Separate inputs", 0, 110, "mastery, retention, overdue, weight"),
        node("formula", "Priority formula", 260, 110, "shown to the learner"),
        node("rank", "Rank topics", 500, 110, "ties by name"),
        node("budget", "Split 240 minutes", 720, 110, "top four, proportional"),
        node("loop", "Mock loop", 920, 110, "update the inputs"),
      ],
      edges: [edge("inputs", "formula"), edge("formula", "rank"), edge("rank", "budget"), edge("budget", "loop"), edge("loop", "inputs")],
      steps: [
        step("inputs", "", "Mastery, retention, overdue days and role weight stay separate numbers."),
        step("formula", "inputs-formula", "A visible formula combines them into a priority, labeled as a learning indicator."),
        step("rank", "formula-rank", "Topics are sorted by priority, with alphabetical tie-breaks."),
        step("budget", "rank-budget", "The top four share the available minutes in proportion to priority."),
        step("loop", "budget-loop loop-inputs", "After each mock loop, the inputs update and the plan is recomputed."),
      ],
    },
    practice: [
      {
        id: "w16-plan-design-1",
        type: "design",
        prompt: "Use your own Analytics page numbers to produce a seven-day final plan with daily minutes and one mock loop.",
        answer: "Rank topics with the formula, allocate minutes to the top items across five days, schedule a mixed mock loop on day six and remediation of its misses on day seven.",
        rubric: ["Uses real numbers", "Proportional allocation", "Includes a mock loop and remediation"],
      },
      {
        id: "w16-plan-recall-1",
        type: "recall",
        prompt: "Why keep completion, mastery, confidence and retention separate instead of one score?",
        answer: "They measure different things: having done the work, getting answers right, how sure you feel, and whether it sticks over time. Blending hides miscalibration (high confidence, low mastery) and forgetting.",
        rubric: ["Each measures something different", "Blending hides miscalibration"],
      },
    ],
    references: [
      { title: "Make It Stick: The Science of Successful Learning (Brown, Roediger, McDaniel)", versionSensitive: false },
      { title: "The SM-2 spaced repetition algorithm (Wozniak, SuperMemo)", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),
];

export const week = defineWeek({
  number: 16,
  slug: "capstones-and-interview-loops",
  title: "Capstones and interview loops",
  track: "capstone",
  domains: ["career"],
  summary:
    "Role-specific capstone projects, mixed mock loops across DSA, SQL, statistics, ML and system design, behavioral stories, and a final remediation plan.",
  outcomes: [
    "Ship a scoped, reproducible capstone with an honest write-up",
    "Deliver structured behavioral stories",
    "Run full mock loops and remediate the gaps they reveal",
  ],
  roles: ["sde", "data-scientist", "ml-engineer", "genai-engineer", "data-engineer"],
  days: [
    {
      id: "w16-d01",
      day: 1,
      kind: "concept-map",
      label: "Capstone scoping",
      title: "Scope your capstone",
      summary: "One user, one decision, one metric, a baseline and two milestones.",
      minutes: 75,
      goals: ["Write the capstone brief", "Pick a project from the Projects page"],
      tasks: [
        { label: "Read the scoping lesson", minutes: 15 },
        { label: "Choose a role-specific capstone", minutes: 15 },
        { label: "Write the one-page brief", minutes: 35 },
        { label: "README first-screen prompt", minutes: 10 },
      ],
      topicIds: ["w16-d01-capstone-scoping"],
    },
    {
      id: "w16-d02",
      day: 2,
      kind: "theory-lab",
      label: "Behavioral stories",
      title: "Build your STAR story bank",
      summary: "Six stories mapped to competencies and rehearsed aloud.",
      minutes: 70,
      goals: ["Draft six stories", "Rehearse two aloud with a timer"],
      tasks: [
        { label: "Read the STAR lesson", minutes: 10 },
        { label: "Draft the story bank", minutes: 35 },
        { label: "Timed rehearsal", minutes: 25 },
      ],
      topicIds: ["w16-d02-behavioral-star"],
    },
    {
      id: "w16-d03",
      day: 3,
      kind: "implementation",
      label: "Capstone build",
      title: "Build the baseline and plan remediation",
      summary: "Capstone baseline and evaluation harness, plus a data-driven remediation plan.",
      minutes: 120,
      goals: ["Run the capstone baseline end to end", "Compute your remediation priorities"],
      tasks: [
        { label: "Capstone baseline and evaluation harness", minutes: 75 },
        { label: "Run the remediation planner", minutes: 20 },
        { label: "Plan the next four days", minutes: 25 },
      ],
      topicIds: ["w16-d03-remediation-planning", "w16-d01-capstone-scoping"],
    },
    {
      id: "w16-d04",
      day: 4,
      kind: "applied-practice",
      label: "Mock loop: coding and SQL",
      title: "Mock loop: DSA and SQL",
      summary: "Timed DSA and SQL rounds from the whole curriculum.",
      minutes: 120,
      goals: ["Complete both rounds in time", "Log every miss"],
      tasks: [
        { label: "DSA round", minutes: 45 },
        { label: "SQL round", minutes: 45 },
        { label: "Self-score and log misses", minutes: 30 },
      ],
      topicIds: ["w03-d02-sliding-window", "w04-d03-dynamic-programming", "w04-d02-graph-traversal", "w02-d02-window-functions", "w02-d01-joins-and-keys"],
    },
    {
      id: "w16-d05",
      day: 5,
      kind: "production-lens",
      label: "Capstone review",
      title: "Capstone review and write-up",
      summary: "Finish one improvement, analyze failures and write the README.",
      minutes: 120,
      goals: ["Publish a reproducible capstone with a limitations section"],
      tasks: [
        { label: "One improvement and failure analysis", minutes: 60 },
        { label: "Write-up and demo recording", minutes: 45 },
        { label: "Review against the rubric", minutes: 15 },
      ],
      topicIds: ["w16-d01-capstone-scoping"],
      productionCase: {
        title: "Review your capstone like an interviewer would",
        scenario:
          "An interviewer opens your capstone repository for five minutes before your call and will ask you to defend one decision in depth.",
        constraints: [
          "They will not run anything unless setup is one command.",
          "They will ask how you know the result is real.",
          "They will ask what you would do with two more weeks.",
        ],
        questions: [
          "What do they see in the first screen of the README?",
          "Which result can you reproduce live, and how?",
          "Which decision would you most like them to ask about, and why?",
          "What are the honest limitations?",
        ],
        rubric: [
          "Problem, user and headline result versus baseline in the first screen",
          "One-command setup, tests in CI and a pinned environment",
          "An evaluation report with failure analysis",
          "A limitations section and a credible next-steps plan",
        ],
        pitfalls: ["Unreproducible headline numbers", "No baseline comparison"],
      },
    },
    {
      id: "w16-d06",
      day: 6,
      kind: "interview-simulation",
      label: "Final mixed loop",
      title: "Final mixed interview loop",
      summary: "A full loop: coding, statistics or ML, system design and behavioral, back to back.",
      minutes: 180,
      goals: ["Complete the loop under time pressure", "Score each round with its rubric"],
      tasks: [
        { label: "Coding round", minutes: 45 },
        { label: "Statistics or ML round", minutes: 45 },
        { label: "System design round", minutes: 45 },
        { label: "Behavioral round", minutes: 30 },
        { label: "Scoring", minutes: 15 },
      ],
      topicIds: ["w16-d02-behavioral-star", "w05-d02-hypothesis-testing", "w07-d03-classification-metrics", "w10-d02-caching-load-balancing", "w14-d03-rag-evaluation"],
    },
    {
      id: "w16-d07",
      day: 7,
      kind: "review",
      label: "Final remediation",
      title: "Final remediation",
      summary: "Recompute priorities from the mock loop and close the top gaps.",
      minutes: 120,
      goals: ["Re-solve every missed mock question", "Update the remediation plan for after the program"],
      tasks: [
        { label: "Recompute priorities", minutes: 15 },
        { label: "Re-solve missed questions", minutes: 75 },
        { label: "Write the ongoing practice plan", minutes: 30 },
      ],
      topicIds: ["w16-d03-remediation-planning", "w16-d02-behavioral-star", "w16-d01-capstone-scoping"],
    },
  ],
});
