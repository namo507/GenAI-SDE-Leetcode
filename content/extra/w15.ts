import { REVIEWED, code, defineTopic, edge, node, step } from "../helpers";
import type { ExtraWeek } from "./types";

export const w15: ExtraWeek = {
  schedule: [
    {
      dayId: "w15-d04",
      topicId: "w15-d04-agent-evaluation",
      tasks: [
        { label: "Agent evaluation: pass@k, pass^k and trajectory checks", minutes: 30 },
        { label: "Write three trajectory assertions for your agent", minutes: 15 },
      ],
    },
  ],
  topics: [
    defineTopic({
      id: "w15-d04-agent-evaluation",
      slug: "agent-evaluation",
      title: "Evaluating agents: success, reliability and trajectories",
      domain: "agents",
      roles: ["genai-engineer", "ml-engineer", "sde"],
      difficulty: "advanced",
      minutes: 45,
      prerequisites: ["w15-d03-guardrails-budgets-tracing", "w13-d05-llm-evaluation"],
      objectives: [
        "Compute pass@k and pass^k from repeated trials and explain why reliability needs pass^k",
        "Check trajectories for policy violations, loops and wasted steps",
        "Report task success together with cost and step counts",
      ],
      summary:
        "Agents are judged on whether the final state is correct, whether they got there safely, and what it cost. Because runs are stochastic, each task is run several times: pass@k (at least one of k tries succeeds) shows capability, while pass^k (all k tries succeed) shows the reliability users experience. Trajectory checks catch unsafe or wasteful paths even when the end state looks right.",
      eli5: {
        analogy:
          "Testing a robot that tidies rooms. You ask it to tidy the same room five times. Did it ever get it right? Does it get it right every time? And did it break the rules on the way, like throwing a toy out of the window, or walk in circles?",
        steps: [
          "Give the robot the same job several times.",
          "Count how often the room ends up right.",
          "Check the path it took for broken rules and circles.",
          "Write down how long and how much energy it used.",
        ],
        analogyLimit:
          "Real tasks often have several correct end states and need careful checkers, and running every task many times costs real money.",
      },
      senior: {
        definition:
          "With n trials of which c succeed, the unbiased estimate of pass@k is 1 − C(n−c, k)/C(n, k) and of pass^k (all k succeed) is C(c, k)/C(n, k). Trajectory evaluation inspects the sequence of tool calls: required steps and their order, forbidden actions, loops, step counts and token cost, often with deterministic assertions plus model-graded checks.",
        invariants: [
          "Success is judged on the environment's end state, not on the agent's own claim of success.",
          "pass^k ≤ pass@1 ≤ pass@k for k ≥ 1.",
          "Policy rules (such as approval before large refunds) are checked on every trajectory, including successful ones.",
        ],
        mechanism: [
          "The refund-over-limit task succeeds 3 of 5 times: pass@1 0.60, pass@3 1.00, but pass^3 only 0.10.",
          "Across six tasks, average pass@3 is 0.92 while pass^3 is 0.42: the agent can usually do the job but is not reliable.",
          "One trajectory issued a refund without approval, which fails the policy check even if the refund itself was correct.",
          "A policy question took 5 steps instead of 2 because search_docs ran 4 times in a row, flagged as a loop.",
        ],
        complexity:
          "Evaluation cost is tasks × trials × steps × model calls; trajectory checks are linear in steps.",
        tradeoffs: [
          { option: "End-state checks", choose: "Tasks with verifiable outcomes (database rows, files, API state).", cost: "Miss unsafe or wasteful paths." },
          { option: "Trajectory assertions", choose: "Policies and required steps that must always hold.", cost: "Brittle if they hard-code one valid path." },
          { option: "LLM-graded trajectories", choose: "Open-ended quality of reasoning or communication.", cost: "Judge bias; needs calibration with humans." },
          { option: "Simulated users", choose: "Multi-turn tasks at scale.", cost: "Simulators differ from real users." },
        ],
        failureModes: [
          "Reporting pass@k as reliability, hiding that users see frequent failures.",
          "Trusting the agent's final message instead of checking the real end state.",
          "One trial per task, so noise dominates comparisons between versions.",
          "Ignoring cost and latency, so a 'better' agent is too expensive to run.",
        ],
        production:
          "Teams maintain a task suite with sandboxed environments and end-state checkers, run several trials per task in CI for agent changes, track pass@1 and pass^k with cost and step distributions, assert policies on every trace, and replay real production traces (with consent and redaction) as new test cases.",
        interviewAnswer:
          "I evaluate agents on end-state success over several trials per task, reporting pass@1 for average quality and pass^k for reliability, since users feel the failures. I add trajectory checks for required steps, forbidden actions and loops, plus cost and step counts. Policy violations fail a run even if the outcome was right. Changes ship only when success and reliability hold without cost regressions.",
      },
      implementation: {
        problem: "Compute pass@1, pass@3 and pass^3 for six tasks with five trials each, then check three trajectories for an approval policy, loops, extra steps and cost.",
        input: "Success vectors for 6 tasks; 3 tool-call trajectories with token counts; hypothetical USD 0.01 per 1,000 tokens",
        python: {
          code: code`
            from math import comb

            TRIALS = {  # 5 independent runs per task; 1 = the task's end state was correct
                "refund under limit": [1, 1, 1, 1, 1],
                "refund over limit": [1, 0, 1, 1, 0],
                "change address": [1, 1, 1, 0, 1],
                "cancel order": [1, 1, 1, 1, 1],
                "policy question": [0, 1, 0, 0, 1],
                "multi-item return": [0, 0, 1, 0, 0],
            }
            EXPECTED_STEPS = {"refund over limit": 4, "policy question": 2}
            TRAJECTORIES = [  # (task, tool calls in order, tokens used)
                ("refund over limit", ["get_order", "check_policy", "issue_refund"], 5200),
                ("refund over limit", ["get_order", "check_policy", "request_approval", "issue_refund"], 6100),
                ("policy question", ["search_docs", "search_docs", "search_docs", "search_docs", "answer"], 9800),
            ]
            PRICE_PER_1K = 0.01  # hypothetical blended USD per 1,000 tokens


            def pass_at_k(n, c, k):
                return 1 - comb(n - c, k) / comb(n, k)  # at least one of k tries succeeds


            def pass_hat_k(n, c, k):
                return comb(c, k) / comb(n, k)  # all k tries succeed: reliability


            def check(task, calls):
                problems = []
                if "issue_refund" in calls and task == "refund over limit":
                    if "request_approval" not in calls or calls.index("request_approval") > calls.index("issue_refund"):
                        problems.append("refund issued without approval")
                run = 1
                for prev, cur in zip(calls, calls[1:]):
                    run = run + 1 if cur == prev else 1
                    if run == 3:
                        problems.append(f"loop: {cur} called 3 times in a row")
                return problems


            totals = [0.0, 0.0, 0.0]
            for task, runs in TRIALS.items():
                n, c = len(runs), sum(runs)
                row = [pass_at_k(n, c, 1), pass_at_k(n, c, 3), pass_hat_k(n, c, 3)]
                totals = [t + r for t, r in zip(totals, row)]
                print(f"{task:18s} {c}/{n} succeeded  pass@1 {row[0]:.2f}  pass@3 {row[1]:.2f}  pass^3 {row[2]:.2f}")
            m = len(TRIALS)
            print(f"{'average':18s}                pass@1 {totals[0] / m:.2f}  pass@3 {totals[1] / m:.2f}  pass^3 {totals[2] / m:.2f}")
            for task, calls, used in TRAJECTORIES:
                problems = check(task, calls)
                extra = len(calls) - EXPECTED_STEPS[task]
                print(f"{task} ({len(calls)} steps, {extra:+d} vs expected, USD {used / 1000 * PRICE_PER_1K:.3f}): {'; '.join(problems) if problems else 'ok'}")
          `,
        },
        r: {
          code: code`
            trials <- list( # 5 independent runs per task; 1 = the task's end state was correct
              "refund under limit" = c(1, 1, 1, 1, 1),
              "refund over limit" = c(1, 0, 1, 1, 0),
              "change address" = c(1, 1, 1, 0, 1),
              "cancel order" = c(1, 1, 1, 1, 1),
              "policy question" = c(0, 1, 0, 0, 1),
              "multi-item return" = c(0, 0, 1, 0, 0)
            )
            expected_steps <- c("refund over limit" = 4, "policy question" = 2)
            trajectories <- list( # task, tool calls in order, tokens used
              list(task = "refund over limit", calls = c("get_order", "check_policy", "issue_refund"), tokens = 5200),
              list(task = "refund over limit", calls = c("get_order", "check_policy", "request_approval", "issue_refund"), tokens = 6100),
              list(task = "policy question", calls = c("search_docs", "search_docs", "search_docs", "search_docs", "answer"), tokens = 9800)
            )
            price_per_1k <- 0.01 # hypothetical blended USD per 1,000 tokens

            pass_at_k <- function(n, c, k) 1 - choose(n - c, k) / choose(n, k) # at least one of k tries succeeds
            pass_hat_k <- function(n, c, k) choose(c, k) / choose(n, k) # all k tries succeed: reliability

            check <- function(task, calls) {
              problems <- character(0)
              if ("issue_refund" %in% calls && task == "refund over limit") {
                if (!"request_approval" %in% calls || match("request_approval", calls) > match("issue_refund", calls)) {
                  problems <- c(problems, "refund issued without approval")
                }
              }
              run <- 1
              for (i in seq_along(calls)[-1]) {
                run <- if (calls[i] == calls[i - 1]) run + 1 else 1
                if (run == 3) problems <- c(problems, sprintf("loop: %s called 3 times in a row", calls[i]))
              }
              problems
            }

            totals <- c(0, 0, 0)
            for (task in names(trials)) {
              runs <- trials[[task]]
              n <- length(runs)
              c_ok <- sum(runs)
              row <- c(pass_at_k(n, c_ok, 1), pass_at_k(n, c_ok, 3), pass_hat_k(n, c_ok, 3))
              totals <- totals + row
              cat(sprintf("%-18s %d/%d succeeded  pass@1 %.2f  pass@3 %.2f  pass^3 %.2f\n", task, as.integer(c_ok), n, row[1], row[2], row[3]))
            }
            m <- length(trials)
            cat(sprintf("%-18s                pass@1 %.2f  pass@3 %.2f  pass^3 %.2f\n", "average", totals[1] / m, totals[2] / m, totals[3] / m))
            for (tr in trajectories) {
              problems <- check(tr$task, tr$calls)
              extra <- length(tr$calls) - expected_steps[[tr$task]]
              cat(sprintf("%s (%d steps, %+d vs expected, USD %.3f): %s\n", tr$task, length(tr$calls), as.integer(extra),
                          tr$tokens / 1000 * price_per_1k, if (length(problems)) paste(problems, collapse = "; ") else "ok"))
            }
          `,
        },
        expectedOutput: code`
        refund under limit 5/5 succeeded  pass@1 1.00  pass@3 1.00  pass^3 1.00
        refund over limit  3/5 succeeded  pass@1 0.60  pass@3 1.00  pass^3 0.10
        change address     4/5 succeeded  pass@1 0.80  pass@3 1.00  pass^3 0.40
        cancel order       5/5 succeeded  pass@1 1.00  pass@3 1.00  pass^3 1.00
        policy question    2/5 succeeded  pass@1 0.40  pass@3 0.90  pass^3 0.00
        multi-item return  1/5 succeeded  pass@1 0.20  pass@3 0.60  pass^3 0.00
        average                           pass@1 0.67  pass@3 0.92  pass^3 0.42
        refund over limit (3 steps, -1 vs expected, USD 0.052): refund issued without approval
        refund over limit (4 steps, +0 vs expected, USD 0.061): ok
        policy question (5 steps, +3 vs expected, USD 0.098): loop: search_docs called 3 times in a row
      `,
        tests: {
          python: code`
            def test_metric_ordering():
                for runs in TRIALS.values():
                    n, c = len(runs), sum(runs)
                    assert pass_hat_k(n, c, 3) <= pass_at_k(n, c, 1) + 1e-12 <= pass_at_k(n, c, 3) + 2e-12


            def test_approval_after_refund_is_still_a_violation():
                calls = ["get_order", "issue_refund", "request_approval"]
                assert "refund issued without approval" in check("refund over limit", calls)


            def test_clean_trajectory_passes():
                assert check("refund over limit", ["get_order", "check_policy", "request_approval", "issue_refund"]) == []
          `,
          r: code`
            test_that("pass^k never exceeds pass@1", {
              for (runs in trials) expect_lte(pass_hat_k(5, sum(runs), 3), pass_at_k(5, sum(runs), 1) + 1e-12)
            })

            test_that("approval after the refund is still a violation", {
              expect_true("refund issued without approval" %in% check("refund over limit", c("get_order", "issue_refund", "request_approval")))
            })
          `,
        },
        eli5Trace: [
          "The easy jobs work every time.",
          "The big-refund job works 3 times out of 5. Asking for 3 tries, at least one works, but all 3 working is only a 1 in 10 chance.",
          "On average the robot can usually do each job (0.92) but does it right every time much less often (0.42).",
          "One robot gave a big refund without asking a grown-up first: that breaks a rule even though the refund was right.",
          "Another robot searched 4 times in a row for the same thing: walking in circles.",
        ],
        complexity: { time: "O(tasks × trials + steps)", space: "O(tasks)" },
        edgeCases: [
          "pass^k is 0 whenever fewer than k of the n trials succeeded.",
          "k cannot exceed the number of trials n.",
          "Some tasks have several valid tool orders; assert only the constraints that truly matter.",
          "Non-deterministic environments (live APIs) make reruns differ for reasons other than the agent.",
        ],
        incorrect: {
          language: "python",
          code: code`
            success = "refund issued" in agent_final_message.lower()
          `,
          whyWrong: "The agent's own message is not evidence: it can claim success without calling the tool, or call it with the wrong amount. Grading the message rewards confident wording, not correct outcomes.",
          fix: "Check the environment's end state (the refund record, its amount and approval status) and assert policy constraints on the recorded tool calls.",
        },
        walkthrough: [
          { python: "TRIALS = {", pythonLines: 8, r: "trials <- list(", rLines: 8, eli5: "Six jobs, each tried five times. A 1 means the room really was tidy at the end." },
          { python: "def pass_at_k(n, c, k):", pythonLines: 6, r: "pass_at_k <- function", rLines: 2, eli5: "Two questions: does at least one of k tries work, and do all k tries work?" },
          { python: "def check(task, calls):", pythonLines: 11, r: "check <- function(task, calls) {", rLines: 14, eli5: "Read the robot's path: was the refund approved first, and did it repeat the same step three times in a row?" },
          { python: "for task, runs in TRIALS.items():", pythonLines: 7, r: "for (task in names(trials)) {", rLines: 10, eli5: "Score every job, then the average." },
          { python: "for task, calls, used in TRAJECTORIES:", pythonLines: 4, r: "for (tr in trajectories) {", rLines: 6, eli5: "Check three recorded paths for broken rules, extra steps and cost." },
        ],
      },
      flow: {
        title: "Agent evaluation harness",
        nodes: [
          node("tasks", "Task suite", 0, 120, "sandboxed environments"),
          node("runs", "k trials per task", 230, 120, "same settings"),
          node("state", "End-state check", 460, 40, "real outcome"),
          node("traj", "Trajectory checks", 460, 210, "policy, loops, steps"),
          node("report", "Report", 690, 120, "pass@1, pass^k, cost"),
        ],
        edges: [edge("tasks", "runs"), edge("runs", "state"), edge("runs", "traj"), edge("state", "report"), edge("traj", "report")],
        steps: [
          step("tasks runs", "tasks-runs", "Each task runs several times in a fresh sandbox because agents are stochastic."),
          step("runs state", "runs-state", "Success is decided by inspecting the environment, not the agent's message."),
          step("runs traj", "runs-traj", "Every trace is checked for forbidden actions, required order, loops and step counts."),
          step("state traj report", "state-report traj-report", "The report shows capability (pass@k), reliability (pass^k), violations and cost side by side."),
        ],
      },
      practice: [
        {
          id: "w15-agent-eval-recall-1",
          type: "recall",
          prompt: "An agent succeeds on a task 4 times out of 5. Estimate pass^3.",
          answer: "C(4, 3) / C(5, 3) = 4 / 10 = 0.40.",
          rubric: ["Combinatorial estimator", "0.40"],
        },
        {
          id: "w15-agent-eval-case-1",
          type: "case",
          prompt: "A new agent version raises pass@1 from 0.70 to 0.76 but average tool calls rise from 6 to 14. Do you ship it?",
          answer: "Not yet. Check whether the pass@1 gain is significant over enough trials, inspect the extra calls for loops or redundant searches, compare cost and latency per task against budgets, and check pass^k and policy violations. Ship only if reliability holds and cost stays within budget, possibly after fixing the loops.",
          rubric: ["Significance", "Inspect trajectories", "Cost and latency", "Reliability and policy"],
        },
        {
          id: "w15-agent-eval-design-1",
          type: "design",
          prompt: "Design the evaluation suite for a customer support agent that can look up orders, issue refunds and update addresses.",
          answer: "Sandboxed copies of the order system seeded per task; 50+ tasks covering each tool, multi-step cases and adversarial requests; end-state checkers for each task; policy assertions (approval above a limit, identity verification before address changes); 5 trials per task with pass@1 and pass^k; cost and step budgets; a simulated customer for multi-turn tasks; and real traces added as regression tests.",
          rubric: ["Sandboxes", "Coverage incl. adversarial", "End-state checkers", "Policy assertions", "Trials and metrics", "Regression growth"],
        },
      ],
      references: [
        { title: "τ-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains (Yao et al., 2024)", versionSensitive: false },
        { title: "Evaluating Large Language Models Trained on Code (Chen et al., 2021), for the pass@k estimator", versionSensitive: false },
      ],
      lastReviewed: REVIEWED,
    }),
  ],
};
