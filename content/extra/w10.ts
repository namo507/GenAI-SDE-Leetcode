import { REVIEWED, code, defineTopic, edge, node, step } from "../helpers";
import type { ExtraWeek } from "./types";

export const w10: ExtraWeek = {
  schedule: [
    {
      dayId: "w10-d02",
      topicId: "w10-d02-rate-limiting",
      tasks: [
        { label: "Rate limiting: token bucket, fixed window, sliding log", minutes: 30 },
        { label: "Design a distributed limiter for an LLM API", minutes: 15 },
      ],
    },
    {
      dayId: "w10-d03",
      topicId: "w10-d03-consistency-quorums",
      tasks: [
        { label: "Quorums, consistency levels and read repair", minutes: 30 },
        { label: "Choose N, W and R for three workloads", minutes: 15 },
      ],
    },
    {
      dayId: "w10-d04",
      topicId: "w10-d04-storage-engines",
      tasks: [
        { label: "B-trees versus LSM trees, Bloom filters and compaction", minutes: 30 },
        { label: "Pick a storage engine for a write-heavy workload", minutes: 15 },
      ],
    },
  ],
  topics: [
    defineTopic({
      id: "w10-d02-rate-limiting",
      slug: "rate-limiting",
      title: "Rate limiting: token bucket and sliding windows",
      domain: "system-design",
      roles: ["sde", "ml-engineer", "genai-engineer", "data-engineer"],
      difficulty: "intermediate",
      minutes: 45,
      prerequisites: ["w10-d01-estimation-api-design"],
      objectives: [
        "Implement token bucket, fixed window and sliding log limiters and compare them on the same traffic",
        "Explain the fixed-window boundary burst and how bursts are allowed on purpose by a token bucket",
        "Design a distributed limiter with Redis, HTTP 429 responses and client backoff",
      ],
      summary:
        "Rate limiters protect services from overload and abuse by capping how many requests a client can make. A fixed window counter is simple but lets twice the limit through around a window boundary. A sliding log is exact but stores every timestamp. A token bucket refills at a steady rate and allows controlled bursts up to its capacity, which is why it is the most common choice for APIs.",
      eli5: {
        analogy:
          "A token bucket is a jar of tickets for the slide. Each ride costs one ticket, and the grown-up drops a new ticket in the jar every two seconds, but the jar holds only five. If you wait, you can take five quick rides in a row. If the jar is empty, you wait.",
        steps: [
          "Every request needs a ticket.",
          "Tickets drip back in at a steady speed.",
          "The jar has a lid: it never holds more than five, so nobody can save up a hundred.",
          "No ticket? The answer is 'please wait and try again'.",
        ],
        analogyLimit:
          "Real limiters run on many servers at once, so the jar has to live somewhere shared, like Redis, and updating it must be atomic or two servers can both take the last ticket.",
      },
      senior: {
        definition:
          "A rate limiter admits or rejects each request based on recent usage per key (user, API key, IP, tenant). Common algorithms: fixed window counter, sliding window log, sliding window counter (a weighted blend of two fixed windows), token bucket and leaky bucket.",
        invariants: [
          "Every algorithm here enforces an average of 5 requests per 10 seconds; they differ in how bursts are treated.",
          "Check-and-decrement must be atomic per key, or concurrent requests can exceed the limit.",
          "Rejected requests should be cheap: reject before doing expensive work.",
        ],
        mechanism: [
          "The fixed window allowed 11 of 13 requests and let 9 through between 9.0 and 10.8 seconds, because its counter resets at exactly 10 seconds.",
          "The sliding log allowed 7 and never more than 5 in any 10-second span, at the cost of storing a timestamp per request.",
          "The token bucket allowed 8: a full bucket of 5 between 9.0 and 9.8 seconds, then refills at 16 and 30 seconds. Over any long period it averages the target rate, but a 10-second span can hold capacity plus refill (6 here).",
          "Integer arithmetic (tokens scaled by 10,000 units) keeps the refill exact; floating-point refills drift over long runs.",
        ],
        complexity:
          "Fixed window and token bucket: O(1) time and memory per key. Sliding log: O(limit) memory per key. Sliding window counter: O(1) with a small approximation error.",
        tradeoffs: [
          { option: "Token bucket", choose: "Public APIs that should allow short bursts at a steady average rate.", cost: "Bursts up to capacity can still hit the backend at once." },
          { option: "Fixed window counter", choose: "Cheap quotas such as daily limits where boundary bursts do not matter.", cost: "Up to twice the limit around a boundary." },
          { option: "Sliding log", choose: "Low limits that must be exact, such as login attempts.", cost: "Memory grows with the limit; more Redis work per request." },
          { option: "Sliding window counter", choose: "High-traffic APIs that want near-exact limits in O(1).", cost: "Approximate; assumes requests were spread evenly in the previous window." },
        ],
        failureModes: [
          "Read-then-write races across servers that let bursts exceed the limit.",
          "Limiting by IP behind a shared NAT or proxy, which punishes many users for one.",
          "Clients retrying immediately on 429, which amplifies the overload (retry storms).",
          "Keys without expiry piling up in Redis and exhausting memory.",
        ],
        production:
          "Limiters usually run at the API gateway or as middleware backed by Redis, using atomic Lua scripts or INCR with expiry. Responses use HTTP 429 Too Many Requests with a Retry-After header, and well-behaved clients back off exponentially with jitter. LLM providers commonly limit both requests and tokens per minute, so GenAI services often need two buckets per key; check each provider's current documentation for its exact limits.",
        interviewAnswer:
          "I would use a token bucket per API key in Redis, updated atomically with a Lua script that refills based on elapsed time and decrements if a token is available. It allows short bursts but enforces the average rate. Rejected calls get 429 with Retry-After, clients back off with jitter, and I add a fixed daily quota for billing. For exact low limits like login attempts I would use a sliding log instead.",
      },
      implementation: {
        problem: "Run three limiters (5 requests per 10 seconds) on the same 13 timestamps and compare what each allows, including the busiest 2-second and 10-second spans.",
        input: "Requests at 2 s, a burst from 9.0 to 10.8 s across the 10-second boundary, then 16 s and 30 s",
        python: {
          code: code`
            LIMIT, WINDOW_MS = 5, 10_000  # every limiter allows 5 requests per 10 seconds on average
            REQUESTS_MS = [2_000, 9_000, 9_200, 9_400, 9_600, 9_800,
                           10_000, 10_200, 10_400, 10_600, 10_800, 16_000, 30_000]


            def token_bucket(times):
                capacity = LIMIT * WINDOW_MS  # one token = WINDOW_MS units; refill 1 unit per ms per token rate
                per_request = WINDOW_MS
                level, last, allowed = capacity, 0, []
                for t in times:
                    level = min(capacity, level + (t - last) * LIMIT)
                    last = t
                    if level >= per_request:
                        level -= per_request
                        allowed.append(t)
                return allowed


            def fixed_window(times):
                counts, allowed = {}, []
                for t in times:
                    w = t // WINDOW_MS
                    if counts.get(w, 0) < LIMIT:
                        counts[w] = counts.get(w, 0) + 1
                        allowed.append(t)
                return allowed


            def sliding_log(times):
                log, allowed = [], []
                for t in times:
                    log = [s for s in log if s > t - WINDOW_MS]
                    if len(log) < LIMIT:
                        log.append(t)
                        allowed.append(t)
                return allowed


            def busiest(allowed, span_ms):
                best = 0
                for start in allowed:
                    count = 0
                    for t in allowed:
                        if start <= t < start + span_ms:
                            count += 1
                    best = max(best, count)
                return best


            print(f"{len(REQUESTS_MS)} requests; limit {LIMIT} per {WINDOW_MS // 1000} s")
            for name, limiter in [("token bucket", token_bucket), ("fixed window", fixed_window), ("sliding log", sliding_log)]:
                allowed = limiter(REQUESTS_MS)
                print(f"{name:13s}: allowed {len(allowed):2d}, rejected {len(REQUESTS_MS) - len(allowed):2d}, "
                      f"most in any 2 s {busiest(allowed, 2_000)}, most in any 10 s {busiest(allowed, WINDOW_MS)}")
                print(f"{'':13s}  allowed at (s): {' '.join(f'{t / 1000:g}' for t in allowed)}")
          `,
        },
        r: {
          code: code`
            limit <- 5
            window_ms <- 10000 # every limiter allows 5 requests per 10 seconds on average
            requests_ms <- c(2000, 9000, 9200, 9400, 9600, 9800,
                             10000, 10200, 10400, 10600, 10800, 16000, 30000)

            token_bucket <- function(times) {
              capacity <- limit * window_ms # one token = window_ms units; refill 1 unit per ms per token rate
              per_request <- window_ms
              level <- capacity
              last <- 0
              allowed <- c()
              for (t in times) {
                level <- min(capacity, level + (t - last) * limit)
                last <- t
                if (level >= per_request) {
                  level <- level - per_request
                  allowed <- c(allowed, t)
                }
              }
              allowed
            }

            fixed_window <- function(times) {
              counts <- integer(0)
              allowed <- c()
              for (t in times) {
                w <- as.character(t %/% window_ms)
                used <- if (is.na(counts[w])) 0L else counts[[w]]
                if (used < limit) {
                  counts[w] <- used + 1L
                  allowed <- c(allowed, t)
                }
              }
              allowed
            }

            sliding_log <- function(times) {
              log <- c()
              allowed <- c()
              for (t in times) {
                log <- log[log > t - window_ms]
                if (length(log) < limit) {
                  log <- c(log, t)
                  allowed <- c(allowed, t)
                }
              }
              allowed
            }

            busiest <- function(allowed, span_ms) {
              best <- 0L
              for (start in allowed) best <- max(best, sum(allowed >= start & allowed < start + span_ms))
              best
            }

            cat(sprintf("%d requests; limit %d per %d s\n", length(requests_ms), as.integer(limit), as.integer(window_ms %/% 1000)))
            limiters <- list("token bucket" = token_bucket, "fixed window" = fixed_window, "sliding log" = sliding_log)
            for (name in names(limiters)) {
              allowed <- limiters[[name]](requests_ms)
              cat(sprintf("%-13s: allowed %2d, rejected %2d, most in any 2 s %d, most in any 10 s %d\n",
                          name, length(allowed), length(requests_ms) - length(allowed), busiest(allowed, 2000), busiest(allowed, window_ms)))
              cat(sprintf("%-13s  allowed at (s): %s\n", "", paste(sprintf("%g", allowed / 1000), collapse = " ")))
            }
          `,
        },
        expectedOutput: code`
        13 requests; limit 5 per 10 s
        token bucket : allowed  8, rejected  5, most in any 2 s 5, most in any 10 s 6
                       allowed at (s): 2 9 9.2 9.4 9.6 9.8 16 30
        fixed window : allowed 11, rejected  2, most in any 2 s 9, most in any 10 s 10
                       allowed at (s): 2 9 9.2 9.4 9.6 10 10.2 10.4 10.6 10.8 30
        sliding log  : allowed  7, rejected  6, most in any 2 s 4, most in any 10 s 5
                       allowed at (s): 2 9 9.2 9.4 9.6 16 30
      `,
        tests: {
          python: code`
            def test_sliding_log_never_exceeds_the_limit():
                assert busiest(sliding_log(REQUESTS_MS), WINDOW_MS) <= LIMIT


            def test_fixed_window_boundary_burst():
                assert busiest(fixed_window(REQUESTS_MS), 2_000) > LIMIT


            def test_bucket_refills_after_waiting():
                assert token_bucket([0, 1, 2, 3, 4, 5, 20_000]) == [0, 1, 2, 3, 4, 20_000]
          `,
          r: code`
            test_that("sliding log never exceeds the limit", {
              expect_lte(busiest(sliding_log(requests_ms), window_ms), limit)
            })

            test_that("fixed window lets a boundary burst through", {
              expect_gt(busiest(fixed_window(requests_ms), 2000), limit)
            })
          `,
        },
        eli5Trace: [
          "Thirteen kids ask to use the slide, with a big crowd arriving just before and after the 10-second bell.",
          "The 'count per bell period' rule lets 5 in before the bell and 5 more right after it: 9 rides in under 2 seconds.",
          "The 'remember every ride for 10 seconds' rule never lets more than 5 ride in any 10 seconds.",
          "The ticket jar lets 5 kids go in a quick burst because the jar was full, then everyone waits for new tickets.",
        ],
        complexity: { time: "O(1) per request for bucket and fixed window; O(limit) for the sliding log", space: "O(keys) or O(keys × limit) for the log" },
        edgeCases: [
          "Clock skew between servers changes window boundaries; use the limiter store's clock.",
          "Bursty clients that are within the average still trip a small bucket; size capacity for legitimate bursts.",
          "A request larger than one token (an LLM call with 8,000 tokens) should cost more than one unit.",
          "Limits per tenant and per user can conflict; check the tighter one first.",
        ],
        incorrect: {
          language: "python",
          code: code`
            count = redis.get(key) or 0
            if int(count) < LIMIT:
                redis.incr(key)  # another server may have incremented in between
                return "allow"
          `,
          whyWrong: "The read and the increment are separate operations, so two servers can both read 4, both allow, and the limit of 5 becomes 6 or more under concurrency.",
          fix: "Make check-and-increment atomic: INCR first and compare the returned value, or run the whole token bucket update in one Lua script.",
        },
        walkthrough: [
          { python: "LIMIT, WINDOW_MS = 5, 10_000", pythonLines: 3, r: "limit <- 5", rLines: 4, eli5: "The rule is 5 rides per 10 seconds. Thirteen kids show up at these times (in milliseconds)." },
          { python: "def token_bucket(times):", pythonLines: 11, r: "token_bucket <- function(times) {", rLines: 16, eli5: "The ticket jar: tickets drip back in as time passes, the lid stops it overflowing, and each ride takes one ticket." },
          { python: "def fixed_window(times):", pythonLines: 8, r: "fixed_window <- function(times) {", rLines: 13, eli5: "Count rides in each 10-second period and reset the count when the bell rings." },
          { python: "def sliding_log(times):", pythonLines: 8, r: "sliding_log <- function(times) {", rLines: 12, eli5: "Write down every ride and only count the ones from the last 10 seconds." },
          { python: "def busiest(allowed, span_ms):", pythonLines: 9, r: "busiest <- function(allowed, span_ms) {", rLines: 5, eli5: "Find the most rides that happened in any short stretch of time." },
          { python: "for name, limiter in", pythonLines: 5, r: "limiters <- list(", rLines: 7, eli5: "Run all three rules on the same crowd and compare who got to ride." },
        ],
      },
      flow: {
        title: "Token bucket at the gateway",
        nodes: [
          node("client", "Client request", 0, 120, "API key"),
          node("bucket", "Token bucket", 230, 120, "refill, then check"),
          node("allow", "Forward to service", 470, 30, "token taken"),
          node("reject", "HTTP 429", 470, 210, "Retry-After"),
          node("backoff", "Client backoff", 700, 210, "exponential + jitter"),
        ],
        edges: [edge("client", "bucket"), edge("bucket", "allow"), edge("bucket", "reject"), edge("reject", "backoff")],
        steps: [
          step("client bucket", "client-bucket", "The gateway looks up the bucket for this key and adds the tokens earned since the last request, up to capacity."),
          step("bucket allow", "bucket-allow", "If at least one token is available it is removed atomically and the request goes through."),
          step("bucket reject", "bucket-reject", "Otherwise the gateway answers 429 immediately, before any expensive work."),
          step("reject backoff", "reject-backoff", "Good clients wait for Retry-After, then back off exponentially with random jitter so retries do not arrive together."),
        ],
      },
      practice: [
        {
          id: "w10-rate-recall-1",
          type: "recall",
          prompt: "Why can a fixed window limiter of 100 per minute let 200 requests through in about one second?",
          answer: "A client can send 100 requests at the end of one window and 100 more at the start of the next. Both windows see only 100, so all are allowed, even though 200 arrived within moments of each other.",
          rubric: ["Two windows", "Boundary burst"],
        },
        {
          id: "w10-rate-design-1",
          type: "design",
          prompt: "Design rate limiting for a GenAI API that has per-key limits on requests per minute and tokens per minute, served from 20 gateway instances.",
          answer: "Keep two token buckets per key in Redis (requests and tokens), updated atomically by one Lua script that refills both by elapsed time and checks the request's estimated tokens. Reconcile with actual tokens after the response. Return 429 with Retry-After and headers showing remaining quota. Shard Redis by key, set TTLs on idle buckets, fail open or closed by tier, and alert on rejection rates per tenant.",
          rubric: ["Two buckets", "Atomic Lua", "Estimate then reconcile tokens", "429 + headers", "Failure policy"],
        },
        {
          id: "w10-rate-case-1",
          type: "case",
          prompt: "After an outage, every client retries at once and the recovering service falls over again. What changes?",
          answer: "Clients need exponential backoff with jitter and a retry budget; the server should shed load early with 429 or 503 and Retry-After, use a token bucket that starts partly empty after recovery, and put circuit breakers on dependencies.",
          rubric: ["Backoff with jitter", "Retry budget", "Load shedding", "Circuit breakers"],
        },
      ],
      references: [
        { title: "RFC 6585: Additional HTTP Status Codes (429 Too Many Requests)", url: "https://www.rfc-editor.org/rfc/rfc6585", versionSensitive: false },
        { title: "Redis documentation: INCR (rate limiter pattern)", url: "https://redis.io/docs/latest/commands/incr/", versionSensitive: true },
      ],
      lastReviewed: REVIEWED,
    }),

    defineTopic({
      id: "w10-d03-consistency-quorums",
      slug: "consistency-quorums",
      title: "Consistency, quorums and read repair",
      domain: "system-design",
      roles: ["sde", "data-engineer", "ml-engineer"],
      difficulty: "advanced",
      minutes: 45,
      prerequisites: ["w10-d01-estimation-api-design"],
      objectives: [
        "Show that read and write quorums overlap exactly when R + W > N",
        "Trade consistency against latency and availability by choosing W and R",
        "Explain read repair and why quorums alone are not linearizable",
      ],
      summary:
        "Replicated databases keep N copies of each value. A write waits for W acknowledgements and a read asks R replicas. If R + W > N, every read set overlaps every write set, so a read always reaches at least one replica with the latest acknowledged write. Smaller W and R are faster and more available but can return stale data.",
      eli5: {
        analogy:
          "Three friends keep copies of the class phone list. When a number changes, you tell at least two of them. When you need a number, you ask two of them and trust the newest version. Because two plus two is more than three, at least one friend you ask must have heard the update.",
        steps: [
          "Tell W friends about every change.",
          "Ask R friends when you need the answer.",
          "If W + R is bigger than the number of friends, the groups always share someone.",
          "Whoever has the older version gets corrected on the spot.",
        ],
        analogyLimit:
          "If two people change the same number at the same moment, or a friend is temporarily replaced by a stranger, overlapping groups are not enough to agree on one order. That needs consensus algorithms such as Raft.",
      },
      senior: {
        definition:
          "In leaderless (Dynamo-style) replication, a write is sent to all N replicas and succeeds after W acknowledgements; a read queries R replicas and returns the value with the highest version. Strict quorums require R + W > N. Versions come from timestamps, version vectors or a leader's log index.",
        invariants: [
          "R + W > N guarantees the read set and write set intersect.",
          "W > N / 2 also prevents two disjoint write quorums from succeeding at once.",
          "Write latency is the W-th fastest acknowledgement; read latency is the R-th fastest response.",
        ],
        mechanism: [
          "With N = 3, W = 1 and R = 1, a read misses the write in 6 of 9 possible placements; with W = 2 and R = 2 it never does.",
          "With N = 5, W = 2 and R = 2 still fails in 30 of 100 placements, because 2 + 2 is not greater than 5; W = 3 and R = 3 fixes it.",
          "Replica acknowledgement times of 12, 30 and 95 ms make W = 2 cost 30 ms and W = 3 cost 95 ms: requiring every replica makes you wait for the slowest.",
          "A W = 2 write reaches A and B while C is down. A read from B and C sees versions 2 and 1, returns version 2, and repairs C.",
        ],
        complexity:
          "Each operation contacts N replicas and waits for W or R of them: O(N) messages, latency set by the W-th or R-th fastest replica.",
        tradeoffs: [
          { option: "W = N, R = 1", choose: "Read-heavy data that changes rarely.", cost: "Writes fail if any replica is down; write latency is the slowest replica." },
          { option: "W = R = majority", choose: "Balanced workloads that need fresh reads.", cost: "Both reads and writes pay a majority round trip." },
          { option: "W = R = 1", choose: "Caches, metrics, carts where stale reads are acceptable.", cost: "Stale reads; relies on anti-entropy and read repair." },
          { option: "Consensus (Raft, Paxos)", choose: "Linearizable operations such as locks, leader election, unique usernames.", cost: "Leader bottleneck and extra round trips." },
        ],
        failureModes: [
          "Sloppy quorums and hinted handoff write to substitute nodes, so R + W > N no longer guarantees overlap during partitions.",
          "Last-write-wins with clock skew silently drops concurrent writes.",
          "Concurrent writes with no version vectors cannot be detected or merged.",
          "Assuming quorum reads are linearizable: without read repair completing before the response, two readers can see different values.",
        ],
        production:
          "Cassandra and similar stores expose consistency levels per request (ONE, QUORUM, ALL, LOCAL_QUORUM for multi-region). Teams use LOCAL_QUORUM within a region for latency, run background anti-entropy (Merkle tree comparison) to fix replicas, and put operations that need a single order, such as uniqueness checks, behind a consensus-based store.",
        interviewAnswer:
          "With N replicas, writes wait for W acknowledgements and reads query R replicas; R + W > N makes them overlap, so a read sees the latest acknowledged write. I choose W and R by workload: majority for balanced freshness, W = N and R = 1 for read-heavy data, and 1 and 1 where staleness is fine. I point out that quorums are not linearizable under sloppy quorums or concurrent writes, so anything needing a single global order goes through Raft or Paxos.",
      },
      implementation: {
        problem: "Count stale reads for every write and read placement across several (N, W, R) settings, show the latency of waiting for W acknowledgements, and simulate a write with one replica down followed by read repair.",
        input: "N = 3 or 5 replicas; acknowledgement times 12, 30 and 95 ms; values blue (v1) and green (v2)",
        python: {
          code: code`
            from itertools import combinations

            LATENCY_MS = {"A": 12, "B": 30, "C": 95}  # how long each replica takes to acknowledge


            def stale_reads(n, w, r):
                stale = total = 0
                for write_set in combinations(range(n), w):
                    for read_set in combinations(range(n), r):
                        total += 1
                        if not set(write_set) & set(read_set):
                            stale += 1
                return stale, total


            def quorum_latency(w):
                return sorted(LATENCY_MS.values())[w - 1]  # wait for the w-th fastest acknowledgement


            for n, w, r in [(3, 1, 1), (3, 1, 2), (3, 2, 2), (3, 3, 1), (3, 1, 3), (5, 2, 2), (5, 3, 3)]:
                stale, total = stale_reads(n, w, r)
                print(f"N={n} W={w} R={r}: R+W>N {'yes' if r + w > n else 'no '}  stale read in {stale:2d} of {total:3d} write/read placements")
            for w in (1, 2, 3):
                print(f"write latency with W={w}: {quorum_latency(w)} ms")

            replicas = {"A": (1, "blue"), "B": (1, "blue"), "C": (1, "blue")}
            for name in ("A", "B"):  # W=2; C is unreachable during the write
                replicas[name] = (2, "green")
            read_from = ["B", "C"]  # R=2 overlaps the write set at B
            answers = [replicas[name] for name in read_from]
            newest = max(answers)
            print(f"read from {' '.join(read_from)} sees versions {[v for v, _ in answers]}, returns v{newest[0]} {newest[1]}")
            for name in read_from:
                if replicas[name][0] < newest[0]:
                    replicas[name] = newest
                    print(f"read repair: {name} updated to v{newest[0]}")
            print("replicas now: " + ", ".join(f"{k}=v{v[0]}" for k, v in sorted(replicas.items())))
          `,
        },
        r: {
          code: code`
            latency_ms <- c(A = 12, B = 30, C = 95) # how long each replica takes to acknowledge

            stale_reads <- function(n, w, r) {
              writes <- combn(n, w)
              reads <- combn(n, r)
              stale <- 0L
              for (i in seq_len(ncol(writes))) {
                for (j in seq_len(ncol(reads))) {
                  if (length(intersect(writes[, i], reads[, j])) == 0) stale <- stale + 1L
                }
              }
              c(stale = stale, total = ncol(writes) * ncol(reads))
            }

            quorum_latency <- function(w) sort(latency_ms)[[w]] # wait for the w-th fastest acknowledgement

            cases <- list(c(3, 1, 1), c(3, 1, 2), c(3, 2, 2), c(3, 3, 1), c(3, 1, 3), c(5, 2, 2), c(5, 3, 3))
            for (cs in cases) {
              n <- cs[1]
              w <- cs[2]
              r <- cs[3]
              res <- stale_reads(n, w, r)
              cat(sprintf("N=%d W=%d R=%d: R+W>N %s  stale read in %2d of %3d write/read placements\n",
                          as.integer(n), as.integer(w), as.integer(r), if (r + w > n) "yes" else "no ", as.integer(res[["stale"]]), as.integer(res[["total"]])))
            }
            for (w in 1:3) cat(sprintf("write latency with W=%d: %d ms\n", w, as.integer(quorum_latency(w))))

            version <- c(A = 1, B = 1, C = 1)
            value <- c(A = "blue", B = "blue", C = "blue")
            for (name in c("A", "B")) { # W=2; C is unreachable during the write
              version[[name]] <- 2
              value[[name]] <- "green"
            }
            read_from <- c("B", "C") # R=2 overlaps the write set at B
            newest <- read_from[which.max(version[read_from])]
            cat(sprintf("read from %s sees versions [%s], returns v%d %s\n", paste(read_from, collapse = " "),
                        paste(version[read_from], collapse = ", "), as.integer(version[[newest]]), value[[newest]]))
            for (name in read_from) {
              if (version[[name]] < version[[newest]]) {
                version[[name]] <- version[[newest]]
                value[[name]] <- value[[newest]]
                cat(sprintf("read repair: %s updated to v%d\n", name, as.integer(version[[newest]])))
              }
            }
            cat(sprintf("replicas now: %s\n", paste(sprintf("%s=v%d", names(version), as.integer(version)), collapse = ", ")))
          `,
        },
        expectedOutput: code`
        N=3 W=1 R=1: R+W>N no   stale read in  6 of   9 write/read placements
        N=3 W=1 R=2: R+W>N no   stale read in  3 of   9 write/read placements
        N=3 W=2 R=2: R+W>N yes  stale read in  0 of   9 write/read placements
        N=3 W=3 R=1: R+W>N yes  stale read in  0 of   3 write/read placements
        N=3 W=1 R=3: R+W>N yes  stale read in  0 of   3 write/read placements
        N=5 W=2 R=2: R+W>N no   stale read in 30 of 100 write/read placements
        N=5 W=3 R=3: R+W>N yes  stale read in  0 of 100 write/read placements
        write latency with W=1: 12 ms
        write latency with W=2: 30 ms
        write latency with W=3: 95 ms
        read from B C sees versions [2, 1], returns v2 green
        read repair: C updated to v2
        replicas now: A=v2, B=v2, C=v2
      `,
        tests: {
          python: code`
            def test_overlap_rule_matches_enumeration():
                for n in range(1, 6):
                    for w in range(1, n + 1):
                        for r in range(1, n + 1):
                            stale, _ = stale_reads(n, w, r)
                            assert (stale == 0) == (r + w > n)


            def test_all_replicas_converge_after_repair():
                assert {v for v, _ in replicas.values()} == {2}
          `,
          r: code`
            test_that("overlap rule matches enumeration", {
              for (n in 2:5) for (w in 1:n) for (r in 1:n) {
                expect_equal(stale_reads(n, w, r)[["stale"]] == 0, r + w > n)
              }
            })

            test_that("replicas converge after repair", {
              expect_true(all(version == 2))
            })
          `,
        },
        eli5Trace: [
          "Tell one friend and ask one friend: most of the time you ask the wrong friend and get the old number.",
          "Tell two and ask two out of three: the groups always share a friend, so you always get the new number.",
          "Waiting for all three friends means waiting for the slowest one, 95 ms instead of 30.",
          "Friend C missed the update. When you ask B and C, B has the new number, so you fix C's list on the spot.",
        ],
        complexity: { time: "O(C(N, W) × C(N, R) × N) to enumerate placements", space: "O(N)" },
        edgeCases: [
          "W = 0 (fire and forget) can lose acknowledged writes entirely.",
          "N = 1 makes every setting trivially consistent and not fault tolerant.",
          "A replica that comes back with an old version must not win a read; versions, not arrival order, decide.",
          "Deletes need tombstones, or read repair can resurrect deleted data.",
        ],
        incorrect: {
          language: "python",
          code: code`
            answers = [replicas[name] for name in read_from]
            return answers[0]  # first replica to respond wins
          `,
          whyWrong: "The fastest replica might be the stale one. Returning the first answer throws away the reason for asking R replicas.",
          fix: "Compare versions across all R responses, return the newest, and repair any replica that returned an older version.",
        },
        walkthrough: [
          { python: "def stale_reads(n, w, r):", pythonLines: 8, r: "stale_reads <- function(n, w, r) {", rLines: 11, eli5: "Try every way to pick W friends to tell and R friends to ask, and count how often the two groups share nobody." },
          { python: "def quorum_latency(w):", pythonLines: 2, r: "quorum_latency <- function(w)", eli5: "To hear back from W friends, wait for the W-th fastest one." },
          { python: "for n, w, r in", pythonLines: 3, r: "for (cs in cases) {", rLines: 8, eli5: "Check several group sizes. Whenever W + R is bigger than the number of friends, there are zero stale reads." },
          { python: 'for name in ("A", "B"):', pythonLines: 2, r: 'for (name in c("A", "B")) {', rLines: 4, eli5: "Friend C is out sick, so only A and B hear the new color." },
          { python: 'read_from = ["B", "C"]', pythonLines: 4, r: 'read_from <- c("B", "C")', rLines: 4, eli5: "Ask B and C and trust the newest version: green." },
          { python: "for name in read_from:", pythonLines: 5, r: "for (name in read_from) {", rLines: 8, eli5: "C had the old color, so we fix it while we are there. Now everyone agrees." },
        ],
      },
      flow: {
        title: "Quorum write and read",
        nodes: [
          node("client", "Client", 0, 120, "write v2"),
          node("a", "Replica A", 260, 20, "v2, 12 ms"),
          node("b", "Replica B", 260, 120, "v2, 30 ms"),
          node("c", "Replica C", 260, 220, "down, still v1"),
          node("reader", "Reader", 520, 120, "R = 2: asks B and C"),
          node("repair", "Read repair", 760, 220, "C ← v2"),
        ],
        edges: [edge("client", "a"), edge("client", "b"), edge("client", "c"), edge("b", "reader"), edge("c", "reader"), edge("reader", "repair")],
        steps: [
          step("client a b c", "client-a client-b client-c", "The write goes to all three replicas; C is unreachable."),
          step("a b", "client-a client-b", "W = 2 acknowledgements arrive from A and B, so the write succeeds after 30 ms."),
          step("b c reader", "b-reader c-reader", "A reader asks R = 2 replicas. Because 2 + 2 > 3, at least one of them (B) has v2."),
          step("reader repair c", "reader-repair", "The reader returns the newest version and writes v2 back to C."),
        ],
      },
      practice: [
        {
          id: "w10-quorum-recall-1",
          type: "recall",
          prompt: "With N = 5, what W and R give fresh reads while tolerating the most replica failures for both reads and writes?",
          answer: "W = 3 and R = 3: 3 + 3 > 5, and both reads and writes still succeed with 2 replicas down.",
          rubric: ["W = R = 3", "Tolerates 2 failures"],
        },
        {
          id: "w10-quorum-case-1",
          type: "case",
          prompt: "Users sometimes see their profile edit disappear for a few seconds after saving. The store uses N = 3, W = 1, R = 1. What would you change?",
          answer: "Reads can hit a replica that has not received the write. Options: raise to W = 2 and R = 2, route a user's reads to the replica they wrote to for a short time (read-your-writes via session stickiness), or read from the leader after a write. Pick based on latency budget and how widespread the problem is.",
          rubric: ["Stale replica explanation", "Quorum change", "Read-your-writes"],
        },
        {
          id: "w10-quorum-recall-2",
          type: "recall",
          prompt: "Why do usernames need consensus rather than quorum writes?",
          answer: "Two concurrent sign-ups for the same name can both reach W replicas with different versions, and last-write-wins would silently drop one. Uniqueness requires a single agreed order of operations (linearizability), which consensus provides.",
          rubric: ["Concurrent writes", "Single order", "Consensus"],
        },
      ],
      references: [
        { title: "Designing Data-Intensive Applications (Martin Kleppmann, 2017), chapters 5 and 9", versionSensitive: false },
        { title: "Dynamo: Amazon's Highly Available Key-value Store (DeCandia et al., 2007)", versionSensitive: false },
      ],
      lastReviewed: REVIEWED,
    }),

    defineTopic({
      id: "w10-d04-storage-engines",
      slug: "storage-engines",
      title: "Storage engines: B-trees, LSM trees and Bloom filters",
      domain: "system-design",
      roles: ["sde", "data-engineer"],
      difficulty: "advanced",
      minutes: 50,
      prerequisites: ["w03-d01-hashing-patterns", "w04-d01-trees-bst-tries"],
      objectives: [
        "Build a Bloom filter and compare its measured false positive rate with theory",
        "Trace writes and reads through a small LSM tree: memtable, sorted runs and compaction",
        "Choose between B-tree and LSM engines from a workload's read, write and space needs",
      ],
      summary:
        "B-trees update fixed-size pages in place and are fast for reads. LSM trees buffer writes in memory, flush them as sorted immutable files, and merge files in the background, which makes writes sequential and fast but means reads may check several files. Bloom filters let reads skip files that definitely do not contain a key.",
      eli5: {
        analogy:
          "A B-tree is a tidy filing cabinet: every paper goes straight into its folder. An LSM tree is a desk inbox: new papers pile on top, and every so often you sort the pile into a box. To find a paper you check the inbox and then the boxes, newest first. A Bloom filter is a sticky note on each box saying 'definitely not in here' or 'maybe in here'.",
        steps: [
          "New writes go into a small sorted pile in memory.",
          "When the pile is full, it becomes a sorted box on disk.",
          "Reads check the pile, then boxes from newest to oldest, skipping boxes whose sticky note says 'definitely not'.",
          "Now and then, merge the boxes into one and throw away old versions.",
        ],
        analogyLimit:
          "Merging boxes is heavy work that happens in the background, and if writes arrive faster than merging, the number of boxes and the read cost keep growing.",
      },
      senior: {
        definition:
          "A B-tree (in practice a B+ tree) is a balanced, page-oriented tree updated in place with a write-ahead log. An LSM tree writes to a memtable plus log, flushes sorted string tables (SSTables), and compacts them in levels or tiers. A Bloom filter is a bit array with k hash functions that answers 'possibly present' or 'definitely absent'.",
        invariants: [
          "Bloom filters have no false negatives: an inserted key always tests positive.",
          "LSM reads must check newer data before older data, so the newest version wins.",
          "Compaction keeps only the newest version of each key (and drops tombstones once safe).",
        ],
        mechanism: [
          "A 256-bit filter with k = 3 and 40 keys had a measured false positive rate of 0.0530 against the theoretical (1 − e^(−kn/m))^k = 0.0524, and zero false negatives.",
          "After 13 writes the LSM tree held 3 sorted runs plus 1 key in the memtable: 13 stored entries for 9 live keys, which is space amplification before compaction.",
          "Fifty lookups of absent keys cost 150 disk reads without Bloom filters (every run checked) and 0 with them.",
          "Compaction merged the runs oldest first so newer values overwrite older ones, leaving 1 run with 8 entries and the newest value c2 for k03.",
        ],
        complexity:
          "B-tree: O(log n) page reads for reads and writes. LSM: O(1) amortized memory write, reads up to one probe per run (fewer with Bloom filters), and background compaction that rewrites data several times (write amplification).",
        tradeoffs: [
          { option: "B-tree (PostgreSQL, MySQL InnoDB)", choose: "Read-heavy, transactional workloads with range scans and in-place updates.", cost: "Random writes; page splits; write amplification from rewriting whole pages." },
          { option: "LSM tree (RocksDB, Cassandra, LevelDB)", choose: "Write-heavy ingestion, time series, key-value at high throughput.", cost: "Read amplification and compaction stalls; tuning compaction is hard." },
          { option: "Bloom filter per file", choose: "Point lookups on LSM stores, many absent-key reads.", cost: "About 10 bits per key for roughly 1% false positives; no help for range scans." },
        ],
        failureModes: [
          "Compaction falling behind sustained writes, so reads slow down and disk fills with obsolete versions.",
          "Using a weak hash or only its low bits, which inflates Bloom false positives: without the mixing step this exact program measured 0.23 instead of 0.053.",
          "Deleting by removing keys instead of writing tombstones, which lets old runs resurrect deleted data.",
          "Choosing an LSM store for a workload dominated by random reads of rarely updated data.",
        ],
        production:
          "RocksDB is embedded in many systems (including stream processors and databases) and exposes leveled and universal compaction, per-file Bloom filters and block caches. Operators watch pending compaction bytes, write stalls, read amplification and space amplification, and size Bloom filters at about 10 bits per key.",
        interviewAnswer:
          "B-trees update pages in place, so reads are fast and predictable, which suits OLTP. LSM trees turn random writes into sequential flushes of sorted files and merge them later, which suits write-heavy workloads; the cost is read amplification and compaction work. Bloom filters with no false negatives let reads skip files that cannot hold a key, so point lookups stay close to one disk read. I choose based on the read-write mix, range scan needs and space budget.",
      },
      implementation: {
        problem: "Build a Bloom filter with FNV-1a hashing and measure its false positive rate, then run 13 writes through a tiny LSM tree, look keys up with and without Bloom filters, and compact.",
        input: "40 keys user:1 to user:40 and 2,000 absent keys; 13 writes over 9 keys with a memtable limit of 4",
        python: {
          code: code`
            from math import exp

            M32 = 2**32
            MEMTABLE_LIMIT = 4


            def fnv1a(text):
                h = 2166136261
                for byte in text.encode():
                    h ^= byte
                    h = (h * 16777619) % M32
                return h


            def mix(h):
                return h ^ (h >> 16)  # fold the high half into the low bits that "% m" keeps


            def positions(key, m, k):
                h1, h2 = mix(fnv1a(key)), mix(fnv1a(key + "#")) | 1
                return [(h1 + i * h2) % m for i in range(k)]


            def bloom(keys, m, k):
                bits = [0] * m
                for key in keys:
                    for p in positions(key, m, k):
                        bits[p] = 1
                return bits


            def might_contain(bits, key, k):
                return all(bits[p] for p in positions(key, len(bits), k))


            m, k, n = 256, 3, 40
            bits = bloom([f"user:{i}" for i in range(1, n + 1)], m, k)
            false_pos = sum(might_contain(bits, f"user:{i}", k) for i in range(1001, 3001))
            print(f"bloom filter m={m} bits, k={k}, n={n} keys: false positives {false_pos}/2000 = {false_pos / 2000:.4f}, theory {(1 - exp(-k * n / m)) ** k:.4f}")
            print(f"no false negatives: {'yes' if all(might_contain(bits, f'user:{i}', k) for i in range(1, n + 1)) else 'no'}")

            memtable, runs = {}, []  # runs are newest first: (sorted dict, bloom bits)


            def flush():
                global memtable
                run = dict(sorted(memtable.items()))
                runs.insert(0, (run, bloom(run.keys(), 64, 3)))
                memtable = {}


            def put(key, value):
                memtable[key] = value
                if len(memtable) >= MEMTABLE_LIMIT:
                    flush()


            def get(key, use_bloom):
                if key in memtable:
                    return memtable[key], 0
                probes = 0
                for run, bits in runs:
                    if use_bloom and not might_contain(bits, key, 3):
                        continue
                    probes += 1  # one disk read
                    if key in run:
                        return run[key], probes
                return None, probes


            writes = [("k01", "a1"), ("k02", "b1"), ("k03", "c1"), ("k04", "d1"), ("k05", "e1"), ("k03", "c2"),
                      ("k06", "f1"), ("k07", "g1"), ("k01", "a2"), ("k08", "h1"), ("k07", "g2"), ("k05", "e2"), ("k09", "i1")]
            for key, value in writes:
                put(key, value)
            stored = sum(len(run) for run, _ in runs) + len(memtable)
            live = len({key for key, _ in writes})
            print(f"after {len(writes)} writes: {len(runs)} sorted runs + {len(memtable)} in memtable, {stored} entries stored for {live} live keys")
            for key in ("k03", "k07", "k09"):
                value, probes = get(key, True)
                print(f"get {key} -> {value}, disk reads: {probes}")
            for use_bloom in (False, True):
                total = sum(get(f"x{i:02d}", use_bloom)[1] for i in range(50))
                print(f"50 lookups of absent keys, bloom filters {'on ' if use_bloom else 'off'}: {total} disk reads")
            merged = {}
            for run, _ in reversed(runs):  # oldest first, so newer values overwrite older ones
                merged.update(run)
            runs[:] = [(dict(sorted(merged.items())), bloom(merged.keys(), 64, 3))]
            print(f"after compaction: {len(runs)} run with {len(runs[0][0])} entries + {len(memtable)} in memtable; get k03 -> {get('k03', True)[0]}")
          `,
        },
        r: {
          code: code`
            memtable_limit <- 4

            fnv1a <- function(text) {
              h <- 2166136261
              for (byte in as.integer(charToRaw(text))) {
                low <- h %% 256
                h <- h - low + bitwXor(as.integer(low), byte)
                h <- ((h %% 256) * 16777216 + h * 403) %% 4294967296 # h * 16777619 mod 2^32 without overflow
              }
              h
            }

            mix <- function(h) {
              hi <- h %/% 65536
              hi * 65536 + bitwXor(as.integer(h %% 65536), as.integer(hi)) # fold the high half into the low bits
            }

            positions <- function(key, m, k) {
              h1 <- mix(fnv1a(key))
              h2 <- mix(fnv1a(paste0(key, "#")))
              if (h2 %% 2 == 0) h2 <- h2 + 1
              (h1 + (0:(k - 1)) * h2) %% m + 1
            }

            bloom <- function(keys, m, k) {
              bits <- integer(m)
              for (key in keys) bits[positions(key, m, k)] <- 1L
              bits
            }

            might_contain <- function(bits, key, k) all(bits[positions(key, length(bits), k)] == 1L)

            m <- 256
            k <- 3
            n <- 40
            bits <- bloom(paste0("user:", 1:n), m, k)
            false_pos <- sum(vapply(paste0("user:", 1001:3000), function(key) might_contain(bits, key, k), logical(1)))
            cat(sprintf("bloom filter m=%d bits, k=%d, n=%d keys: false positives %d/2000 = %.4f, theory %.4f\n",
                        as.integer(m), as.integer(k), as.integer(n), false_pos, false_pos / 2000, (1 - exp(-k * n / m))^k))
            no_fn <- all(vapply(paste0("user:", 1:n), function(key) might_contain(bits, key, k), logical(1)))
            cat(sprintf("no false negatives: %s\n", if (no_fn) "yes" else "no"))

            memtable <- character(0)
            runs <- list() # newest first: list(data = named character vector, bits = bloom bits)

            flush <- function() {
              data <- memtable[order(names(memtable))]
              runs <<- c(list(list(data = data, bits = bloom(names(data), 64, 3))), runs)
              memtable <<- character(0)
            }

            put <- function(key, value) {
              memtable[key] <<- value
              if (length(memtable) >= memtable_limit) flush()
            }

            get <- function(key, use_bloom) {
              if (key %in% names(memtable)) return(list(value = memtable[[key]], probes = 0L))
              probes <- 0L
              for (run in runs) {
                if (use_bloom && !might_contain(run$bits, key, 3)) next
                probes <- probes + 1L # one disk read
                if (key %in% names(run$data)) return(list(value = run$data[[key]], probes = probes))
              }
              list(value = NA_character_, probes = probes)
            }

            writes <- list(c("k01", "a1"), c("k02", "b1"), c("k03", "c1"), c("k04", "d1"), c("k05", "e1"), c("k03", "c2"),
                           c("k06", "f1"), c("k07", "g1"), c("k01", "a2"), c("k08", "h1"), c("k07", "g2"), c("k05", "e2"), c("k09", "i1"))
            for (wr in writes) put(wr[1], wr[2])
            stored <- sum(vapply(runs, function(run) length(run$data), integer(1))) + length(memtable)
            live <- length(unique(vapply(writes, function(wr) wr[1], character(1))))
            cat(sprintf("after %d writes: %d sorted runs + %d in memtable, %d entries stored for %d live keys\n",
                        length(writes), length(runs), length(memtable), stored, live))
            for (key in c("k03", "k07", "k09")) {
              res <- get(key, TRUE)
              cat(sprintf("get %s -> %s, disk reads: %d\n", key, res$value, res$probes))
            }
            for (use_bloom in c(FALSE, TRUE)) {
              total <- sum(vapply(sprintf("x%02d", 0:49), function(key) get(key, use_bloom)$probes, integer(1)))
              cat(sprintf("50 lookups of absent keys, bloom filters %s: %d disk reads\n", if (use_bloom) "on " else "off", total))
            }
            merged <- character(0)
            for (run in rev(runs)) merged[names(run$data)] <- run$data # oldest first, so newer values overwrite older ones
            merged <- merged[order(names(merged))]
            runs <- list(list(data = merged, bits = bloom(names(merged), 64, 3)))
            cat(sprintf("after compaction: %d run with %d entries + %d in memtable; get k03 -> %s\n",
                        length(runs), length(runs[[1]]$data), length(memtable), get("k03", TRUE)$value))
          `,
        },
        expectedOutput: code`
        bloom filter m=256 bits, k=3, n=40 keys: false positives 106/2000 = 0.0530, theory 0.0524
        no false negatives: yes
        after 13 writes: 3 sorted runs + 1 in memtable, 13 entries stored for 9 live keys
        get k03 -> c2, disk reads: 1
        get k07 -> g2, disk reads: 1
        get k09 -> i1, disk reads: 0
        50 lookups of absent keys, bloom filters off: 150 disk reads
        50 lookups of absent keys, bloom filters on : 0 disk reads
        after compaction: 1 run with 8 entries + 1 in memtable; get k03 -> c2
      `,
        tests: {
          python: code`
            def test_fnv1a_matches_published_vectors():
                assert fnv1a("") == 0x811C9DC5
                assert fnv1a("a") == 0xE40C292C


            def test_bloom_has_no_false_negatives():
                bits = bloom(["x", "y", "z"], 32, 3)
                assert all(might_contain(bits, key, 3) for key in ["x", "y", "z"])


            def test_newest_value_wins():
                assert get("k05", True)[0] == "e2"
          `,
          r: code`
            test_that("FNV-1a matches published vectors", {
              expect_equal(fnv1a("a"), 3826002220)
            })

            test_that("newest value wins", {
              expect_equal(get("k05", TRUE)$value, "e2")
            })
          `,
        },
        eli5Trace: [
          "Forty names go into the sticky-note filter. Out of 2,000 names that were never added, it wrongly says 'maybe' for 106, about 5%, just as the math predicts.",
          "It never says 'definitely not' for a name that was added.",
          "Thirteen papers arrive. Every 4 papers, the inbox pile becomes a sorted box: 3 boxes plus 1 paper still on the desk.",
          "Looking for papers that do not exist means opening all 3 boxes each time, 150 openings, unless the sticky notes say 'not here', which cuts it to 0.",
          "Merging the boxes keeps only the newest copy of each paper: 8 in the box plus 1 on the desk.",
        ],
        complexity: { time: "Bloom: O(k) per insert and lookup; LSM get: O(runs) probes, fewer with filters", space: "Bloom: m bits; LSM: entries until compaction removes old versions" },
        edgeCases: [
          "A Bloom filter cannot delete keys; use a counting filter or rebuild.",
          "Filling a filter beyond its design capacity drives the false positive rate toward 1.",
          "Range queries cannot use Bloom filters; they rely on sorted runs and fence pointers.",
          "R needs FNV's 32-bit multiply split into pieces because doubles are exact only up to 2^53.",
        ],
        incorrect: {
          language: "python",
          code: code`
            for run, bits in reversed(runs):  # oldest run first
                if key in run:
                    return run[key]
          `,
          whyWrong: "Searching oldest first returns the first version ever written, so updates appear lost (k03 would read c1 instead of c2).",
          fix: "Check the memtable, then runs from newest to oldest, and stop at the first hit.",
        },
        walkthrough: [
          { python: "def fnv1a(text):", pythonLines: 6, r: "fnv1a <- function(text) {", rLines: 9, eli5: "Turn a word into a big number by mixing in one letter at a time. R splits the big multiplication into smaller pieces so it stays exact." },
          { python: "def positions(key, m, k):", pythonLines: 3, r: "positions <- function(key, m, k) {", rLines: 6, eli5: "Pick k spots in the bit row for each word from two hash numbers." },
          { python: "m, k, n = 256, 3, 40", pythonLines: 5, r: "m <- 256", rLines: 9, eli5: "Add 40 names, then test 2,000 names that were never added and count the wrong 'maybe' answers." },
          { python: "def flush():", pythonLines: 5, r: "flush <- function() {", rLines: 5, eli5: "When the desk pile reaches 4 papers, sort it into a new box and put the box on top." },
          { python: "def get(key, use_bloom):", pythonLines: 11, r: "get <- function(key, use_bloom) {", rLines: 10, eli5: "To find a paper: check the desk, then each box from newest to oldest, skipping boxes whose sticky note says 'not here'." },
          { python: "for use_bloom in (False, True):", pythonLines: 3, r: "for (use_bloom in c(FALSE, TRUE)) {", rLines: 4, eli5: "Look for 50 papers that do not exist, with and without sticky notes, and count box openings." },
          { python: "merged = {}", pythonLines: 5, r: "merged <- character(0)", rLines: 6, eli5: "Merge all the boxes, letting newer papers replace older copies." },
        ],
      },
      flow: {
        title: "LSM write and read paths",
        nodes: [
          node("write", "Write", 0, 40, "append to log"),
          node("mem", "Memtable", 220, 40, "sorted, in memory"),
          node("sst", "Sorted runs", 440, 40, "immutable files"),
          node("compact", "Compaction", 660, 40, "merge, drop old versions"),
          node("read", "Read", 0, 200, "point lookup"),
          node("bloom", "Bloom filters", 440, 200, "skip files"),
        ],
        edges: [edge("write", "mem"), edge("mem", "sst"), edge("sst", "compact"), edge("read", "mem"), edge("read", "bloom"), edge("bloom", "sst")],
        steps: [
          step("write mem", "write-mem", "A write is appended to the log for durability and inserted into the in-memory sorted table."),
          step("mem sst", "mem-sst", "A full memtable is flushed as a new immutable sorted file in one sequential write."),
          step("read mem", "read-mem", "A read checks the memtable first, because it holds the newest data."),
          step("read bloom sst", "read-bloom bloom-sst", "Each file's Bloom filter rules out files that cannot contain the key; only 'maybe' files are read, newest first."),
          step("sst compact", "sst-compact", "Background compaction merges files, keeps the newest version of each key and reclaims space."),
        ],
      },
      practice: [
        {
          id: "w10-storage-recall-1",
          type: "recall",
          prompt: "Define read, write and space amplification for a storage engine.",
          answer: "Read amplification: disk reads per logical read. Write amplification: bytes written to disk per byte written by the application (compaction and page rewrites inflate it). Space amplification: bytes on disk per byte of live data (old versions and fragmentation).",
          rubric: ["Read", "Write", "Space"],
        },
        {
          id: "w10-storage-case-1",
          type: "case",
          prompt: "An IoT platform ingests 500,000 small writes per second and reads mostly the last hour per device. B-tree or LSM, and why?",
          answer: "LSM: sustained small writes become sequential flushes, time-ordered keys (device, timestamp) compact efficiently, recent data is in the memtable or newest runs, and old data can be expired with TTL compaction. A B-tree would do random page writes and suffer under this ingest rate.",
          rubric: ["LSM", "Sequential writes", "Key design", "TTL or time-based compaction"],
        },
        {
          id: "w10-storage-recall-2",
          type: "recall",
          prompt: "Roughly how many bits per key does a Bloom filter need for a 1% false positive rate?",
          answer: "About 9.6 bits per key with the optimal k of about 7, from m/n = −ln(p) / (ln 2)², so roughly 10 bits per key in practice.",
          rubric: ["About 10 bits per key", "k about 7"],
        },
      ],
      references: [
        { title: "Designing Data-Intensive Applications (Martin Kleppmann, 2017), chapter 3", versionSensitive: false },
        { title: "The Log-Structured Merge-Tree (O'Neil, Cheng, Gawlick and O'Neil, 1996)", versionSensitive: false },
        { title: "Space/Time Trade-offs in Hash Coding with Allowable Errors (Burton H. Bloom, 1970)", versionSensitive: false },
        { title: "RocksDB wiki", url: "https://github.com/facebook/rocksdb/wiki", versionSensitive: true },
      ],
      lastReviewed: REVIEWED,
    }),
  ],
};
