import { code, defineTopic, edge, node, step } from "../helpers";

export const serviceReliability = defineTopic({
  id: "w10-d04-service-reliability",
  slug: "service-reliability",
  title: "Reliability: SLOs, error budgets and bounded retries",
  domain: "system-design",
  roles: ["sde", "ml-engineer", "data-engineer", "genai-engineer"],
  difficulty: "intermediate",
  minutes: 45,
  prerequisites: ["w10-d01-estimation-api-design", "w10-d03-replication-queues"],
  objectives: ["Define a user-facing SLI, SLO, error budget and burn rate with explicit denominators", "Bound retries with deadlines, backoff, jitter and idempotency", "Explain overload, circuit breakers, bulkheads and graceful degradation in a design interview"],
  summary: "Reliability starts with what a user needs, such as a successful response within 300 ms, measured over a stated window. An error budget makes the allowed failure fraction explicit. Deadlines, bounded retries, idempotency and overload controls stop a small dependency failure from turning into a system-wide outage.",
  eli5: {
    analogy: "A school lunch counter promises that 999 of every 1,000 lunches arrive on time and complete. The one allowed miss is its mistake budget. If a sandwich is late, asking for it again may help, but a hundred children shouting the same order makes the kitchen slower.",
    steps: ["Choose what counts as a good lunch: complete and on time. Count all eligible orders, including the bad ones.", "Compare the misses with the small number you agreed to allow.", "Wait only until your lunch deadline. Try again only a few times, with different pauses so everyone does not shout together.", "Give each order a ticket number so repeating it does not create a second lunch charge.", "When the kitchen is overwhelmed, offer a simpler meal or stop taking extra orders until it recovers."],
    analogyLimit: "Real services have several user journeys and correlated failures. A request-based budget is not the same as minutes of downtime. A ticket prevents duplicate effects only if the service durably records and checks it; adding a header alone does nothing.",
  },
  senior: {
    definition: "An SLI is a measured service behavior, an SLO is its target over a defined window, and an SLA is a contractual commitment that may attach consequences. For a request-success SLO, allowed bad events = eligible events × (1 − target). Burn rate is the observed bad-event fraction divided by the allowed bad-event fraction.",
    invariants: ["Define eligibility, measurement point, success criteria, threshold and window before interpreting an SLO.", "A good request must satisfy every criterion in this SLI, such as both success and latency; an HTTP 200 alone need not be good.", "A retry must fit the end-to-end deadline and be safe against duplicate effects. A timeout means the result is unknown, not that nothing happened.", "Every retry consumes shared capacity; retry budgets and concurrency limits are bounded."],
    mechanism: [
      "For 1,000,000 eligible requests at 99.9%, the request-based error budget is 1,000 bad requests. If 500 are bad, half remains and the observed-window burn rate is 0.5. Keep rolling-window accounting separate from short-window alerting.",
      "Set a caller deadline, propagate its remaining time downstream and choose connection and request timeouts from latency distributions and the false-timeout cost. Stop launching attempts that cannot finish within the deadline.",
      "Retry transient failures at a single deliberate layer. Use capped exponential backoff with full jitter, a maximum attempt count and a retry budget. Respect server retry guidance where applicable; validation or authorization errors usually require a changed request instead.",
      "Record an idempotency key, request identity and outcome atomically with the effect where possible. Reuse the original key on retry and reject mismatched payloads. Coordinate deduplication retention with the possible retry window.",
      "A circuit breaker opens after a configured failure signal and later allows limited probes. Bulkheads isolate concurrency pools; load shedding rejects excess work early; backpressure slows producers. These protect healthy dependencies but require tuning and an explicit user experience.",
      "Degrade deliberately: serve bounded-stale cache data, omit an optional recommendation, or return an honest partial result. Replicate across independent failure domains and test restoration, because a backup that cannot restore does not meet a recovery objective.",
      "Define RTO as the target time to recover and RPO as the acceptable data-loss interval. Multi-zone replicas and cross-region recovery have different failure coverage, latency and cost. Run failure drills and blameless incident reviews against those objectives.",
    ],
    complexity: "Counting good and eligible events is O(n) for n events; an aggregated counter is O(1) per event. A policy with r retries permits r + 1 attempts per logical call. Uncoordinated retries at d layers can multiply into (r + 1)^d downstream attempts.",
    tradeoffs: [
      { option: "Retry with backoff and jitter", choose: "Transient faults in operations with safe repeat semantics and spare deadline.", cost: "Amplifies load and tail latency; cannot repair sustained overload." },
      { option: "Circuit breaker and load shedding", choose: "A failing or overloaded dependency needs protection and bounded resource use.", cost: "Rejects some work that might have succeeded; state transitions and thresholds add complexity." },
      { option: "Graceful degradation", choose: "An optional feature can be omitted while the core journey stays useful.", cost: "Reduced freshness or functionality must be explicit and acceptable to users." },
    ],
    failureModes: ["Excluding timeouts from the denominator and reporting a falsely healthy SLI.", "Retrying a payment after timeout with a new key and charging twice.", "Identical backoff without jitter synchronizes callers into retry waves.", "Retrying independently in every layer, exhausting pools and multiplying traffic.", "Using average latency to hide p99 stalls, or treating an SLO as a universal guarantee for every request."],
    production: "Instrument requests at a point that reflects the user journey. Alert on fast and sustained budget consumption, link alerts to runbooks, cap concurrent work and test recovery paths. An error-budget policy decides when feature releases give way to reliability work; it should be agreed in advance rather than invented during an incident.",
    interviewAnswer: "I define a user-facing SLI and its eligible-event denominator before choosing an SLO and window. I use the error budget and short-window burn signals to guide alerting and release decisions. Calls get propagated deadlines, bounded retries with jitter and durable idempotency where effects can repeat. Under overload I shed work, isolate dependencies and degrade optional features, then test that recovery meets the stated RTO and RPO.",
  },
  implementation: {
    problem: "Compute a request-based error budget and a deterministic full-jitter retry schedule. This teaching model does not send requests or implement a production circuit breaker.",
    input: "1,000,000 eligible requests, 999,500 good requests, target 0.999; retry ceilings 100, 200, 400 and 800 ms with supplied jitter fractions 0.25, 0.5, 0.75 and 0.5.",
    python: { code: code`
      def budget(total: int, good: int, target: float) -> tuple[int, int, float]:
          if not (total > 0 and 0 <= good <= total and 0 < target < 1):
              raise ValueError("invalid SLO input")
          allowed = total * (1 - target)
          bad = total - good
          return bad, round(allowed - bad), bad / allowed

      def retry_delays(fractions: list[float], base: int = 100, cap: int = 800) -> list[int]:
          if base <= 0 or cap <= 0 or any(not 0 <= x <= 1 for x in fractions):
              raise ValueError("invalid retry policy")
          return [round(min(cap, base * 2 ** i) * x) for i, x in enumerate(fractions)]

      bad, remaining, burn = budget(1_000_000, 999_500, 0.999)
      delays = retry_delays([0.25, 0.5, 0.75, 0.5])
      print(f"bad requests: {bad}; remaining budget: {remaining}; burn rate: {burn:.2f}")
      print("retry delays (ms): " + ",".join(map(str, delays)))
      print(f"maximum attempts: {1 + len(delays)}; total waiting: {sum(delays)} ms")
    ` },
    r: { code: code`
      budget <- function(total, good, target) {
        if (!(total > 0 && good >= 0 && good <= total && target > 0 && target < 1)) {
          stop("invalid SLO input")
        }
        allowed <- total * (1 - target)
        bad <- total - good
        list(bad = bad, remaining = round(allowed - bad), burn = bad / allowed)
      }

      retry_delays <- function(fractions, base = 100, cap = 800) {
        if (base <= 0 || cap <= 0 || any(fractions < 0 | fractions > 1)) stop("invalid retry policy")
        round(pmin(cap, base * 2^(seq_along(fractions) - 1)) * fractions)
      }

      result <- budget(1000000, 999500, 0.999)
      delays <- retry_delays(c(0.25, 0.5, 0.75, 0.5))
      cat(sprintf("bad requests: %d; remaining budget: %d; burn rate: %.2f\n", result$bad, result$remaining, result$burn))
      cat(sprintf("retry delays (ms): %s\n", paste(delays, collapse = ",")))
      cat(sprintf("maximum attempts: %d; total waiting: %d ms\n", 1 + length(delays), sum(delays)))
    ` },
    expectedOutput: "bad requests: 500; remaining budget: 500; burn rate: 0.50\nretry delays (ms): 25,100,300,400\nmaximum attempts: 5; total waiting: 825 ms",
    tests: {
      python: code`
        def test_budget_exhaustion():
            bad, remaining, burn = budget(100_000, 99_800, 0.999)
            assert bad == 200 and remaining == -100 and abs(burn - 2) < 1e-9

        def test_retry_cap_and_no_retries():
            assert retry_delays([1, 1, 1, 1, 1]) == [100, 200, 400, 800, 800]
            assert retry_delays([]) == []

        def test_invalid_input():
            try:
                budget(0, 0, 0.999)
            except ValueError:
                return
            raise AssertionError("zero denominator accepted")
      `,
      r: code`
        test_that("budget exhaustion has negative remaining allowance", {
          result <- budget(100000, 99800, 0.999)
          expect_equal(result$bad, 200)
          expect_equal(result$remaining, -100)
          expect_equal(result$burn, 2, tolerance = 1e-9)
        })
        test_that("retry ceilings stay capped and empty means no retry", {
          expect_equal(retry_delays(rep(1, 5)), c(100, 200, 400, 800, 800))
          expect_length(retry_delays(numeric()), 0)
          expect_error(budget(0, 0, 0.999), "invalid SLO input")
        })
      `,
    },
    eli5Trace: ["Of a million requests, 500 missed the definition of good. The promise allowed 1,000 misses, leaving 500.", "Double the maximum pause each time until the cap. Pick a supplied fraction of each maximum, giving pauses of 25, 100, 300 and 400 ms.", "Four retries mean up to five attempts including the first try. The 825 ms waiting total excludes the requests' own execution time."],
    complexity: { time: "O(r) for r retry delays; O(1) for an aggregated budget", space: "O(r) for the returned delay list", note: "The remaining count is rounded only for this displayed integer-event example. A production policy needs explicit rounding and window rules, and real jitter samples a random fraction for each attempt." },
    edgeCases: ["No eligible requests makes a success fraction undefined; reject it or show no data instead of claiming 100%.", "Exhausted budgets can be negative; do not clamp away the breach.", "A maximum attempt count alone does not enforce an end-to-end deadline.", "Fractions are supplied for reproducibility; correlated random seeds across callers can undermine real jitter."],
    incorrect: { language: "python", code: "while not success:\n    success = charge_card(new_request_id())", whyWrong: "An unbounded loop adds load and each new identity can repeat a side effect whose previous outcome was unknown.", fix: "Reuse a durable idempotency key, bound attempts and elapsed time, and back off with jitter only for retryable failures." },
    walkthrough: [
      { python: "def budget(", pythonLines: 6, r: "budget <-", rLines: 8, eli5: "Check the counts, compute allowed misses and compare actual misses with the allowance." },
      { python: "def retry_delays(", pythonLines: 4, r: "retry_delays <-", rLines: 4, eli5: "Double the pause ceiling up to the cap, then take each jitter fraction." },
      { python: "bad, remaining, burn =", pythonLines: 5, r: "result <- budget(", rLines: 5, eli5: "Print measured misses, the remaining allowance and the bounded retry plan." },
    ],
  },
  flow: {
    title: "A deadline-bounded dependency call",
    nodes: [node("deadline", "Check deadline", 0, 100), node("call", "Attempt with same key", 240, 100), node("classify", "Classify outcome", 480, 100), node("wait", "Budget and jitter", 720, 20), node("finish", "Return or degrade", 720, 200)],
    edges: [edge("deadline", "call"), edge("call", "classify"), edge("classify", "wait", "retryable"), edge("wait", "deadline"), edge("classify", "finish", "done or exhausted")],
    steps: [step("deadline", "", "Check remaining deadline, attempt and concurrency budgets before allocating work."), step("deadline call", "deadline-call", "Send an attempt with a stable idempotency key when repeated effects are possible."), step("call classify", "call-classify", "Success finishes. A permanent error finishes. A timeout has an unknown outcome and requires safe retry semantics."), step("classify wait", "classify-wait", "For retryable failure, require spare deadline and retry budget, then wait with capped jitter."), step("wait deadline", "wait-deadline", "Recheck the deadline; do not let a sleeping retry bypass the overall limit."), step("classify finish", "classify-finish", "Return the result or an explicit degraded response, record the user-facing SLI and release resources.")],
  },
  practice: [
    { id: "w10-reliability-recall-1", type: "recall", prompt: "At 99.9% request success, how much budget do 2 million requests allow? Does that imply a number of outage minutes?", answer: "2,000 bad requests. It does not determine downtime minutes: request traffic varies over time, and request-based and time-based indicators have different denominators.", rubric: ["2,000", "Request denominator", "Cannot infer outage duration"] },
    { id: "w10-reliability-design-1", type: "design", prompt: "A payment call times out. Design the retry behavior without double charging or overloading the service.", answer: "Use the same durable idempotency key and bind it to the payload and stored result. Propagate a deadline, retry only classified transient failures with capped backoff and jitter, bound attempts and global retry traffic, and inspect the existing operation status when possible. Limit concurrency and shed work if the dependency is overloaded.", rubric: ["Durable idempotency", "Unknown outcome", "Deadline and retry budget", "Backoff and jitter", "Overload protection"] },
    { id: "w10-reliability-case-1", type: "case", prompt: "A recommendation dependency is failing while checkout still works. What do you protect first?", answer: "Protect checkout's resources and user journey. Isolate recommendation concurrency, open a tuned breaker if warranted, omit optional recommendations or serve acceptable cached ones, measure checkout's SLI and investigate the dependency without allowing unbounded retries to consume the healthy service.", rubric: ["Core user journey", "Bulkhead", "Explicit degradation", "Bound retries"] },
  ],
  references: [
    { title: "Google SRE Workbook: Implementing SLOs", url: "https://sre.google/workbook/implementing-slos/", versionSensitive: false },
    { title: "Google SRE Workbook: Error Budget Policy", url: "https://sre.google/workbook/error-budget-policy/", versionSensitive: false },
    { title: "Amazon Builders' Library: Timeouts, retries, and backoff with jitter", url: "https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/", versionSensitive: false },
  ],
  lastReviewed: "2026-10-28",
});
