import { REVIEWED, code, defineTopic, defineWeek, edge, node, step } from "../helpers";

export const topics = [
  defineTopic({
    id: "w10-d01-estimation-api-design",
    slug: "estimation-api-design",
    title: "Back-of-envelope estimation and API design",
    domain: "system-design",
    roles: ["sde", "ml-engineer", "genai-engineer", "data-engineer"],
    difficulty: "intermediate",
    minutes: 70,
    prerequisites: ["w01-d02-big-o-complexity"],
    objectives: [
      "Turn users and actions into average and peak QPS, storage and bandwidth",
      "State assumptions explicitly and round sensibly",
      "Design a resource-oriented API with pagination, idempotency and versioning",
    ],
    summary:
      "System design interviews start with numbers. A few multiplications (users times actions, divided by seconds per day, times a peak factor) decide whether one database is enough or you need caching, sharding and queues.",
    eli5: {
      analogy:
        "Planning a school bake sale. If 500 families each buy 4 cookies spread over a 2-hour sale, you can estimate cookies per minute, how many you must bake, and how much table space you need, before anyone bakes a thing.",
      steps: [
        "Count the people and how often each one does something.",
        "Divide by the time window to get a rate per second.",
        "Multiply by a rush-hour factor for the busiest moment.",
        "Multiply by the size of each item and how long you keep it to get storage.",
        "Use those numbers to decide how big the kitchen must be.",
      ],
      analogyLimit:
        "Bake sales have one rush; real traffic has daily peaks, viral spikes and retries during outages that multiply load. Estimates set the order of magnitude, not the exact capacity plan.",
    },
    senior: {
      definition:
        "Capacity estimation converts workload assumptions (DAU, actions per user, object size, retention, replication, peak-to-average ratio) into requests per second, storage and bandwidth, usually to one significant figure.",
      invariants: [
        "1 day is 86,400 seconds; about 100,000 is a fine mental shortcut.",
        "Peak QPS = average QPS times a peak factor (2 to 5 is typical); design for peak, not average.",
        "Storage = writes per day times object size times retention times replication factor.",
      ],
      mechanism: [
        "50 million DAU times 20 reads is 1 billion reads a day, about 11,600 per second on average and about 35,000 at a 3x peak.",
        "Writes at 2 per user are 100 million a day; at 1 KB each with 3 replicas, a year is about 110 TB.",
        "These numbers suggest a read-heavy design: caching and read replicas first, sharding writes later.",
        "API design: nouns as resources (GET /v1/urls/{code}), cursor pagination for large lists, Idempotency-Key headers on POST, explicit versioning, and consistent error bodies.",
      ],
      complexity: "O(1) arithmetic; the value is in the assumptions you say out loud.",
      tradeoffs: [
        { option: "Offset pagination", choose: "Small, static lists and admin tools.", cost: "Slow deep pages and duplicates when rows shift." },
        { option: "Cursor pagination", choose: "Feeds and large or changing collections.", cost: "No random page jumps; cursors must be opaque and stable." },
        { option: "REST versus gRPC", choose: "REST for public APIs and browsers; gRPC for internal low-latency calls.", cost: "gRPC needs tooling and is awkward from browsers." },
      ],
      failureModes: [
        "Designing for average load and falling over at peak.",
        "Forgetting replication or indexes in storage estimates.",
        "Non-idempotent POST endpoints that double-charge on client retries.",
        "Breaking API changes without a version, stranding old clients.",
      ],
      production:
        "The same arithmetic feeds real capacity plans and cloud budgets. Teams keep a living estimate sheet and compare it with observed metrics every quarter.",
      interviewAnswer:
        "I state assumptions first: 50 million DAU, 20 reads and 2 writes per user per day, 1 KB objects, 3x peak, 3 replicas, one-year retention. That gives about 12,000 read QPS on average and 35,000 at peak, about 1,200 write QPS, and about 110 TB a year. It is read-heavy, so I would put a cache in front of replicated storage, use cursor pagination and idempotency keys in the API, and revisit sharding when writes grow.",
    },
    implementation: {
      problem: "Estimate average and peak QPS, yearly storage and read bandwidth from workload assumptions.",
      input: "50,000,000 DAU; 20 reads and 2 writes per user per day; 1,000-byte objects; peak factor 3; replication 3; retention 365 days",
      python: {
        code: code`
          DAU = 50_000_000
          READS, WRITES = 20, 2
          OBJECT_BYTES = 1_000
          PEAK, REPLICAS, DAYS = 3, 3, 365
          SECONDS_PER_DAY = 86_400

          read_qps = DAU * READS / SECONDS_PER_DAY
          write_qps = DAU * WRITES / SECONDS_PER_DAY
          storage_tb = DAU * WRITES * OBJECT_BYTES * DAYS * REPLICAS / 1e12
          read_mb_s = read_qps * OBJECT_BYTES / 1e6

          print(f"average read QPS: {round(read_qps):,}")
          print(f"peak read QPS: {round(read_qps * PEAK):,}")
          print(f"average write QPS: {round(write_qps):,}")
          print(f"storage per year with replication: {storage_tb:.1f} TB")
          print(f"average read bandwidth: {read_mb_s:.1f} MB/s")
        `,
      },
      r: {
        code: code`
          dau <- 50e6
          reads <- 20
          writes <- 2
          object_bytes <- 1000
          peak <- 3
          replicas <- 3
          days <- 365
          seconds_per_day <- 86400

          read_qps <- dau * reads / seconds_per_day
          write_qps <- dau * writes / seconds_per_day
          storage_tb <- dau * writes * object_bytes * days * replicas / 1e12
          read_mb_s <- read_qps * object_bytes / 1e6
          commas <- function(x) formatC(round(x), format = "d", big.mark = ",")

          cat(sprintf("average read QPS: %s\n", commas(read_qps)))
          cat(sprintf("peak read QPS: %s\n", commas(read_qps * peak)))
          cat(sprintf("average write QPS: %s\n", commas(write_qps)))
          cat(sprintf("storage per year with replication: %.1f TB\n", storage_tb))
          cat(sprintf("average read bandwidth: %.1f MB/s\n", read_mb_s))
        `,
      },
      expectedOutput: code`
        average read QPS: 11,574
        peak read QPS: 34,722
        average write QPS: 1,157
        storage per year with replication: 109.5 TB
        average read bandwidth: 11.6 MB/s
      `,
      tests: {
        python: code`
          def test_reads_dominate_writes():
              assert read_qps / write_qps == READS / WRITES


          def test_storage_scales_linearly_with_replicas():
              single = DAU * WRITES * OBJECT_BYTES * DAYS / 1e12
              assert abs(storage_tb - 3 * single) < 1e-9


          def test_peak_is_three_times_average():
              assert round(read_qps * PEAK) == round(3 * read_qps)
        `,
        r: code`
          test_that("reads dominate writes by the ratio of actions", {
            expect_equal(read_qps / write_qps, reads / writes)
          })

          test_that("commas formats large numbers", {
            expect_identical(commas(1234567), "1,234,567")
          })
        `,
      },
      eli5Trace: [
        "50 million people times 20 reads is a billion reads a day.",
        "Spread over 86,400 seconds, that is about 11,600 reads every second, and about three times that at the busiest moment.",
        "Writes are a tenth of reads.",
        "100 million small writes a day, kept a year, copied three times, fills about 110 terabytes.",
      ],
      complexity: { time: "O(1)", space: "O(1)" },
      edgeCases: [
        "Traffic concentrated in a few hours needs a higher peak factor than 3.",
        "Media files change storage by orders of magnitude; estimate them separately.",
        "Decimal (TB) and binary (TiB) units differ by about 10%; say which you use.",
        "Retries during incidents can multiply peak load; include headroom.",
      ],
      incorrect: {
        language: "python",
        code: code`
          read_qps = DAU * READS / 24
        `,
        whyWrong: "Dividing by 24 gives reads per hour, not per second, overstating QPS by 3,600 times and leading to a wildly oversized design.",
        fix: "Divide daily totals by 86,400 seconds, then apply a peak factor.",
      },
    },
    flow: {
      title: "From users to infrastructure",
      nodes: [
        node("users", "50M DAU", 0, 110, "20 reads, 2 writes each"),
        node("daily", "Per day", 220, 110, "1B reads, 100M writes"),
        node("qps", "Per second", 440, 30, "~11.6k avg, ~35k peak"),
        node("storage", "Storage", 440, 190, "~110 TB / year x3"),
        node("design", "Design choice", 690, 110, "cache + replicas"),
        node("api", "API contract", 900, 110, "cursor pagination, idempotency"),
      ],
      edges: [edge("users", "daily"), edge("daily", "qps"), edge("daily", "storage"), edge("qps", "design"), edge("storage", "design"), edge("design", "api")],
      steps: [
        step("users daily", "users-daily", "Multiply users by actions per day to get daily totals."),
        step("daily qps", "daily-qps", "Divide by 86,400 seconds and multiply by a peak factor."),
        step("daily storage", "daily-storage", "Multiply writes by size, retention and replicas for storage."),
        step("qps storage design", "qps-design storage-design", "A read-heavy profile points to caching and read replicas before sharding."),
        step("design api", "design-api", "The API exposes resources with cursor pagination, idempotency keys and a version prefix."),
      ],
    },
    practice: [
      {
        id: "w10-est-recall-1",
        type: "recall",
        prompt: "Estimate the storage for 1 million photos a day at 2 MB each for 5 years with 3 replicas.",
        answer: "1e6 x 2 MB = 2 TB a day; x 365 x 5 = 3,650 TB; x 3 = about 11 PB.",
        rubric: ["Daily volume", "Retention", "Replication"],
      },
      {
        id: "w10-api-design-1",
        type: "design",
        prompt: "Design the endpoints for creating a payment that clients may retry.",
        answer: "POST /v1/payments with an Idempotency-Key header; the server stores the key with the result and returns the same response for retries. GET /v1/payments/{id} for status. Errors use a consistent body with a code and a retryable flag.",
        rubric: ["Idempotency key stored with result", "Resource-oriented paths", "Versioning", "Error contract"],
      },
    ],
    references: [
      { title: "Google SRE book: Handling overload", url: "https://sre.google/sre-book/handling-overload/", versionSensitive: false },
      { title: "Designing Data-Intensive Applications (Kleppmann), chapter 1", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w10-d02-caching-load-balancing",
    slug: "caching-load-balancing",
    title: "Caching, load balancing and partitioning",
    domain: "system-design",
    roles: ["sde", "ml-engineer", "genai-engineer", "data-engineer"],
    difficulty: "intermediate",
    minutes: 80,
    prerequisites: ["w10-d01-estimation-api-design", "w03-d01-hashing-patterns"],
    objectives: [
      "Simulate an LRU cache and compute its hit ratio",
      "Show why consistent hashing moves few keys when nodes change",
      "Pick cache invalidation and load balancing strategies for a workload",
    ],
    summary:
      "Caches keep hot data close; LRU evicts what was used longest ago. Partitioning spreads data across nodes; consistent hashing lets you add a node while moving only a small slice of keys instead of almost all of them.",
    eli5: {
      analogy:
        "A desk with room for three books (the cache) next to a library (the database). When you need a fourth, the book you have not touched for longest goes back. For partitioning, picture a round table of shelves: each book goes to the next shelf clockwise, so adding a shelf only takes books from its neighbor.",
      steps: [
        "Need a book on your desk? That is a hit. Otherwise fetch it: a miss.",
        "If the desk is full, return the least recently used book.",
        "For shelves, place each book at a spot on a circle and walk clockwise to the next shelf.",
        "Add a new shelf: only books between it and the previous shelf move.",
      ],
      analogyLimit:
        "Real caches serve many readers at once, so stale copies (a book someone else changed) and stampedes (everyone fetching the same missing book) matter as much as eviction order.",
    },
    senior: {
      definition:
        "An LRU cache evicts the least recently used entry when full; hash map plus doubly linked list gives O(1) get and put. Consistent hashing maps keys and nodes onto a ring and assigns each key to the first node clockwise, so adding a node only remaps keys in one arc (about 1/N of them).",
      invariants: [
        "LRU order is updated on every hit, not only on insert.",
        "Going from N to N + 1 buckets with mod-N hashing remaps about N / (N + 1) of keys; with a ring, only keys in the new node's arc move.",
        "Virtual nodes (many points per server) even out load on the ring.",
      ],
      mechanism: [
        "The LRU simulation uses an ordered dictionary (Python) or an ordered vector (R) with the most recently used item last.",
        "Keys hash to positions 0 to 99 with a stable hash; servers sit at fixed positions 10, 45 and 80, and a new server lands at 62.",
        "Only keys with positions 46 to 62 move, from the server at 80 to the new one; mod-N hashing moves most keys.",
        "Load balancers distribute requests: round robin, least connections, or consistent hashing for session or cache affinity.",
      ],
      complexity: "LRU get and put: O(1) with hash map plus linked list. Ring lookup: O(log V) with binary search over V points.",
      tradeoffs: [
        { option: "Cache-aside with TTL", choose: "General read-heavy workloads.", cost: "Stale reads up to the TTL; stampedes on popular keys." },
        { option: "Write-through cache", choose: "Read-after-write consistency matters.", cost: "Higher write latency; caches data that may never be read." },
        { option: "Mod-N versus consistent hashing", choose: "Mod-N for fixed clusters; rings for elastic clusters.", cost: "Mod-N reshuffles on resize; rings need virtual nodes for balance." },
      ],
      failureModes: [
        "Cache stampede when a hot key expires and thousands of requests hit the database.",
        "Invalidation bugs that serve stale data indefinitely.",
        "Hot partitions when one key (a celebrity) gets most traffic.",
        "Too few virtual nodes, so one server owns most of the ring.",
      ],
      production:
        "Use request coalescing or locks for stampedes, jittered TTLs, per-key rate limits for hot keys, and monitor hit ratio, eviction rate and backend load together.",
      interviewAnswer:
        "For read-heavy traffic I would put a cache-aside layer such as Redis with TTLs in front of the database, using LRU eviction and request coalescing to avoid stampedes. To partition cache or data across nodes I use consistent hashing with virtual nodes, so adding a node moves about 1/N of the keys instead of nearly all of them as mod-N would.",
    },
    implementation: {
      problem: "Simulate an LRU cache, then count how many keys move when a fourth server is added, with mod-N hashing and with a hash ring.",
      input: "LRU capacity 3, accesses A B C A D B E A B C; keys user:1 .. user:20; ring servers at 10, 45, 80, new server at 62",
      python: {
        code: code`
          from collections import OrderedDict


          def lru_simulate(accesses: list[str], capacity: int) -> tuple[int, int, list[str]]:
              cache: OrderedDict[str, None] = OrderedDict()
              hits = misses = 0
              for key in accesses:
                  if key in cache:
                      hits += 1
                      cache.move_to_end(key)
                  else:
                      misses += 1
                      if len(cache) == capacity:
                          cache.popitem(last=False)
                      cache[key] = None
              return hits, misses, list(cache)


          def stable_hash(s: str) -> int:
              h = 0
              for ch in s:
                  h = (h * 31 + ord(ch)) % 2**32
              return (h * 2654435761) % 2**32


          def ring_owner(ring: dict[int, str], position: int) -> str:
              for point in sorted(ring):
                  if point >= position:
                      return ring[point]
              return ring[min(ring)]


          hits, misses, final = lru_simulate(list("ABCADBEABC"), 3)
          print(f"lru hits={hits} misses={misses} hit ratio={hits / (hits + misses):.2f} final (oldest to newest)={' '.join(final)}")

          keys = [f"user:{i}" for i in range(1, 21)]
          moved_mod = sum(stable_hash(k) % 3 != stable_hash(k) % 4 for k in keys)
          ring3 = {10: "A", 45: "B", 80: "C"}
          ring4 = {10: "A", 45: "B", 62: "D", 80: "C"}
          moved_ring = sum(ring_owner(ring3, stable_hash(k) % 100) != ring_owner(ring4, stable_hash(k) % 100) for k in keys)
          print(f"keys moved adding a 4th server: mod-N={moved_mod}/20 ring={moved_ring}/20")
        `,
      },
      r: {
        code: code`
          lru_simulate <- function(accesses, capacity) {
            cache <- character(0)
            hits <- 0L
            misses <- 0L
            for (key in accesses) {
              if (key %in% cache) {
                hits <- hits + 1L
                cache <- c(cache[cache != key], key)
              } else {
                misses <- misses + 1L
                if (length(cache) == capacity) cache <- cache[-1]
                cache <- c(cache, key)
              }
            }
            list(hits = hits, misses = misses, final = cache)
          }

          mul_mod32 <- function(a, b) {
            hi <- a %/% 65536
            lo <- a %% 65536
            ((hi * b) %% 65536 * 65536 + lo * b) %% 2^32
          }

          stable_hash <- function(s) {
            h <- 0
            for (code in utf8ToInt(s)) h <- (h * 31 + code) %% 2^32
            mul_mod32(h, 2654435761)
          }

          ring_owner <- function(points, owners, position) {
            o <- order(points)
            hit <- which(points[o] >= position)
            if (length(hit)) owners[o][hit[1]] else owners[o][1]
          }

          res <- lru_simulate(strsplit("ABCADBEABC", "")[[1]], 3)
          cat(sprintf("lru hits=%d misses=%d hit ratio=%.2f final (oldest to newest)=%s\n",
                      res$hits, res$misses, res$hits / (res$hits + res$misses), paste(res$final, collapse = " ")))

          keys <- sprintf("user:%d", 1:20)
          h <- vapply(keys, stable_hash, numeric(1))
          moved_mod <- sum(h %% 3 != h %% 4)
          before <- vapply(h %% 100, function(p) ring_owner(c(10, 45, 80), c("A", "B", "C"), p), character(1))
          after <- vapply(h %% 100, function(p) ring_owner(c(10, 45, 62, 80), c("A", "B", "D", "C"), p), character(1))
          cat(sprintf("keys moved adding a 4th server: mod-N=%d/20 ring=%d/20\n", moved_mod, sum(before != after)))
        `,
      },
      expectedOutput: code`
        lru hits=2 misses=8 hit ratio=0.20 final (oldest to newest)=A B C
        keys moved adding a 4th server: mod-N=16/20 ring=3/20
      `,
      tests: {
        python: code`
          def test_lru_evicts_least_recent():
              assert lru_simulate(list("ABCAD"), 3)[2] == ["C", "A", "D"]


          def test_capacity_one_only_hits_repeats():
              assert lru_simulate(list("AAB"), 1)[:2] == (1, 2)


          def test_only_the_new_arc_moves():
              ring3 = {10: "A", 45: "B", 80: "C"}
              ring4 = {10: "A", 45: "B", 62: "D", 80: "C"}
              for p in range(100):
                  if ring_owner(ring3, p) != ring_owner(ring4, p):
                      assert 46 <= p <= 62
        `,
        r: code`
          test_that("LRU evicts the least recently used key", {
            expect_equal(lru_simulate(c("A", "B", "C", "A", "D"), 3)$final, c("C", "A", "D"))
          })

          test_that("the 32-bit multiply matches exact arithmetic on small values", {
            expect_equal(mul_mod32(123456, 7), (123456 * 7) %% 2^32)
          })

          test_that("only the new arc moves", {
            for (p in 0:99) {
              a <- ring_owner(c(10, 45, 80), c("A", "B", "C"), p)
              b <- ring_owner(c(10, 45, 62, 80), c("A", "B", "D", "C"), p)
              if (a != b) expect_true(p >= 46 && p <= 62)
            }
          })
        `,
      },
      eli5Trace: [
        "A, B and C fill the desk. A is used again: a hit, and A becomes the newest.",
        "D needs room, so B (untouched longest) goes back. Then B is needed again: a miss.",
        "Only the second A and the second-to-last B are hits: 2 hits out of 10.",
        "Keys sit at spots on a 0 to 99 circle. Adding a server at 62 only takes the keys between 46 and 62 from the server at 80.",
        "Switching from 3 to 4 buckets with plain division reshuffles most keys instead.",
      ],
      complexity: { time: "O(1) per LRU access with a linked list (O(capacity) in the R vector version)", space: "O(capacity)" },
      edgeCases: [
        "Capacity 0 means every access misses; guard against it.",
        "Keys hashing past the last ring point wrap around to the first server.",
        "Two servers at the same ring position need a tie-break.",
        "R doubles cannot multiply two 32-bit numbers exactly, so mul_mod32 splits one into 16-bit halves.",
      ],
      incorrect: {
        language: "python",
        code: code`
          if key in cache:
              hits += 1
          else:
              ...
        `,
        whyWrong: "Without move_to_end on a hit, the cache becomes FIFO: a frequently used key is evicted because it was inserted early.",
        fix: "On every hit, mark the key as most recently used (move_to_end or relink in the list).",
      },
    },
    flow: {
      title: "Adding a server to a hash ring",
      nodes: [
        node("a", "Server A @10", 120, 0),
        node("b", "Server B @45", 480, 0),
        node("d", "New D @62", 600, 120, "joins the ring"),
        node("c", "Server C @80", 480, 240),
        node("keys", "Keys 46..62", 860, 120, "3 of 20 keys"),
        node("rest", "All other keys", 120, 240, "stay put"),
      ],
      edges: [edge("a", "b"), edge("b", "d"), edge("d", "c"), edge("c", "a"), edge("c", "keys"), edge("keys", "d")],
      steps: [
        step("a b c", "a-b c-a", "Keys walk clockwise to the next server: A owns 81 to 10, B owns 11 to 45, C owns 46 to 80."),
        step("d", "b-d d-c", "Server D joins at position 62, between B and C."),
        step("c keys d", "c-keys keys-d", "Only keys at positions 46 to 62 change owner, moving from C to D."),
        step("rest", "", "Every other key stays where it was. With mod-N hashing, 16 of 20 keys would have moved."),
      ],
    },
    practice: [
      {
        id: "w10-cache-design-1",
        type: "design",
        prompt: "A product page cache has a 5-minute TTL. Every 5 minutes, database CPU spikes. Explain and fix.",
        answer: "Synchronized expiry causes a stampede: many requests miss at once and query the database. Add TTL jitter, request coalescing (single flight), stale-while-revalidate, or background refresh of hot keys.",
        rubric: ["Names stampede or thundering herd", "Jittered TTL", "Coalescing or stale-while-revalidate"],
      },
      {
        id: "w10-ring-recall-1",
        type: "recall",
        prompt: "Why do consistent hashing rings use virtual nodes?",
        answer: "With one point per server, arcs are uneven and load is lopsided; many points per server average out arc sizes and spread a failed server's keys across many survivors.",
        rubric: ["Uneven arcs", "Load balance", "Spreads failover load"],
      },
    ],
    references: [
      { title: "Redis documentation: key eviction policies", versionSensitive: true },
      { title: "Dynamo: Amazon's highly available key-value store (DeCandia et al., 2007)", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w10-d03-replication-queues",
    slug: "replication-queues",
    title: "Replication, consistency and queues",
    domain: "system-design",
    roles: ["sde", "data-engineer", "ml-engineer", "genai-engineer"],
    difficulty: "advanced",
    minutes: 85,
    prerequisites: ["w10-d02-caching-load-balancing"],
    objectives: [
      "Make a queue consumer idempotent under at-least-once delivery",
      "Use quorum arithmetic (R + W > N) to reason about consistency",
      "Explain CAP and PACELC trade-offs in plain terms",
    ],
    summary:
      "Replicas improve availability and read capacity but can disagree. Queues decouple services but deliver messages at least once, so consumers must tolerate duplicates. Quorums and idempotency are the two tools that keep data correct.",
    eli5: {
      analogy:
        "Three notebooks copying the same class notes. If you write in two of them and later read from two, at least one of the notebooks you read was written in, so you see the latest note. And if the teacher repeats an announcement, you only write it down once because you check its number first.",
      steps: [
        "Give every message a unique number.",
        "Before acting on a message, check whether you already handled that number.",
        "Write important data to enough copies, and read from enough copies, that the groups always overlap.",
        "If the groups do not overlap, a read might miss the newest write.",
      ],
      analogyLimit:
        "Real networks can split notebooks into groups that cannot talk (partitions), clocks disagree, and checking 'already handled' must be atomic with the action, or a crash in between still double-processes.",
    },
    senior: {
      definition:
        "With N replicas, a write acknowledged by W and a read from R replicas overlap in at least one replica when R + W > N, giving read-your-latest-write for that key (ignoring sloppy quorums and concurrent writes). At-least-once delivery plus an idempotent consumer gives effectively-once processing.",
      invariants: [
        "Each message has a stable id assigned by the producer, not the broker.",
        "The dedupe record and the side effect commit atomically (same transaction or an outbox).",
        "A write quorum W tolerates N - W unavailable replicas for writes; R tolerates N - R for reads.",
      ],
      mechanism: [
        "The consumer keeps a set of processed message ids; duplicates are acknowledged but skipped.",
        "Without dedupe, the redelivered +100 and -30 messages are applied twice and the balance is wrong.",
        "The quorum table lists, for N = 3, which (W, R) pairs overlap and how many failures each side tolerates.",
        "CAP: during a partition, choose consistency (reject some requests) or availability (accept and reconcile). PACELC adds: else, trade latency against consistency.",
      ],
      complexity: "Dedupe lookup O(1) per message with a hash set or a unique index; storage grows with retained ids (expire them after the redelivery window).",
      tradeoffs: [
        { option: "Strong consistency (R + W > N, or leader-based)", choose: "Balances, inventory, anything where stale reads cause harm.", cost: "Higher latency and lower availability during partitions." },
        { option: "Eventual consistency", choose: "Feeds, counters and caches where brief staleness is fine.", cost: "Conflict resolution and user-visible anomalies." },
        { option: "Exactly-once via transactions in the broker", choose: "Stream processing within one system (for example Kafka transactions).", cost: "Only covers that system; external side effects still need idempotency." },
      ],
      failureModes: [
        "Deduping in memory only, so a consumer restart forgets processed ids.",
        "Recording the id after the side effect, so a crash in between reprocesses it.",
        "Using broker-assigned offsets as ids, which change on republish.",
        "Assuming R + W > N gives linearizability under concurrent writes and clock skew.",
      ],
      production:
        "The outbox pattern writes the business change and an outbound message in one database transaction; consumers use a processed-messages table with a unique constraint. Dead-letter queues capture poison messages for inspection.",
      interviewAnswer:
        "Queues usually guarantee at-least-once delivery, so I make consumers idempotent: producers assign message ids, and the consumer records processed ids in the same transaction as the side effect, with a unique constraint. For replicated stores I reason with quorums: with N = 3, W = 2 and R = 2 overlap, so reads see the latest acknowledged write while tolerating one failure on each side.",
    },
    implementation: {
      problem: "Apply redelivered account messages with and without idempotency, then tabulate quorum configurations for three replicas.",
      input: "messages m1 +100, m2 -30, m2 -30 (redelivered), m3 +50, m1 +100 (redelivered), m4 -20; N = 3 with (W, R) in (1,1) (2,2) (3,1) (1,3) (2,1)",
      python: {
        code: code`
          MESSAGES = [("m1", 100), ("m2", -30), ("m2", -30), ("m3", 50), ("m1", 100), ("m4", -20)]


          def apply_naive(messages: list[tuple[str, int]]) -> int:
              return sum(amount for _, amount in messages)


          def apply_idempotent(messages: list[tuple[str, int]]) -> tuple[int, int]:
              seen: set[str] = set()
              balance = skipped = 0
              for msg_id, amount in messages:
                  if msg_id in seen:
                      skipped += 1
                      continue
                  seen.add(msg_id)
                  balance += amount
              return balance, skipped


          balance, skipped = apply_idempotent(MESSAGES)
          print(f"naive balance={apply_naive(MESSAGES)} idempotent balance={balance} duplicates skipped={skipped}")

          N = 3
          print("W R  overlap  write-failures-tolerated  read-failures-tolerated")
          for w, r in [(1, 1), (2, 2), (3, 1), (1, 3), (2, 1)]:
              print(f"{w} {r}  {'yes' if r + w > N else 'no ':<7}  {N - w:<24}  {N - r}")
        `,
      },
      r: {
        code: code`
          ids <- c("m1", "m2", "m2", "m3", "m1", "m4")
          amounts <- c(100, -30, -30, 50, 100, -20)

          apply_idempotent <- function(ids, amounts) {
            seen <- character(0)
            balance <- 0
            skipped <- 0L
            for (i in seq_along(ids)) {
              if (ids[i] %in% seen) {
                skipped <- skipped + 1L
                next
              }
              seen <- c(seen, ids[i])
              balance <- balance + amounts[i]
            }
            list(balance = balance, skipped = skipped)
          }

          res <- apply_idempotent(ids, amounts)
          cat(sprintf("naive balance=%d idempotent balance=%d duplicates skipped=%d\n", as.integer(sum(amounts)), as.integer(res$balance), res$skipped))

          n <- 3
          cat("W R  overlap  write-failures-tolerated  read-failures-tolerated\n")
          configs <- list(c(1, 1), c(2, 2), c(3, 1), c(1, 3), c(2, 1))
          for (cfg in configs) {
            w <- cfg[1]
            r <- cfg[2]
            cat(sprintf("%d %d  %-7s  %-24d  %d\n", w, r, if (r + w > n) "yes" else "no ", n - w, n - r))
          }
        `,
      },
      expectedOutput: code`
        naive balance=170 idempotent balance=100 duplicates skipped=2
        W R  overlap  write-failures-tolerated  read-failures-tolerated
        1 1  no       2                         2
        2 2  yes      1                         1
        3 1  yes      0                         2
        1 3  yes      2                         0
        2 1  no       1                         2
      `,
      tests: {
        python: code`
          def test_redelivery_does_not_change_the_balance():
              assert apply_idempotent(MESSAGES + MESSAGES)[0] == apply_idempotent(MESSAGES)[0]


          def test_order_of_distinct_messages_does_not_matter():
              assert apply_idempotent(list(reversed(MESSAGES)))[0] == balance


          def test_majority_quorums_overlap():
              assert 2 + 2 > 3 and not (1 + 1 > 3)
        `,
        r: code`
          test_that("redelivery does not change the balance", {
            expect_equal(apply_idempotent(c(ids, ids), c(amounts, amounts))$balance, res$balance)
          })

          test_that("the naive balance double counts", {
            expect_gt(sum(amounts), res$balance)
          })
        `,
      },
      eli5Trace: [
        "The broker delivered m2 and m1 twice, as at-least-once systems may.",
        "Adding every delivery gives 170, which is wrong.",
        "Checking each message number first skips the two repeats, giving 100.",
        "With 3 notebooks, writing to 2 and reading from 2 always overlaps; writing to 1 and reading from 1 might not.",
      ],
      complexity: { time: "O(m) messages with a hash set", space: "O(distinct ids)" },
      edgeCases: [
        "A message with the same id but different content signals a producer bug; log and alert.",
        "Dedupe ids must be retained at least as long as the broker can redeliver.",
        "W = N means a single replica outage blocks writes.",
        "Concurrent writes to the same key under quorums still need versioning or conflict resolution.",
      ],
      incorrect: {
        language: "python",
        code: code`
          for msg_id, amount in messages:
              balance += amount
              seen.add(msg_id)
        `,
        whyWrong: "It never checks seen before applying, and even if it did, recording the id after the side effect lets a crash between the two lines reapply the message.",
        fix: "Check the id first and commit the side effect and the id together atomically (one transaction or an outbox).",
      },
    },
    flow: {
      title: "At-least-once delivery, effectively-once processing",
      nodes: [
        node("producer", "Producer", 0, 110, "assigns message ids"),
        node("broker", "Queue", 230, 110, "may redeliver"),
        node("consumer", "Consumer", 460, 110, "checks id first"),
        node("dedupe", "Processed ids", 690, 30, "unique constraint"),
        node("effect", "Side effect", 690, 190, "same transaction"),
        node("dlq", "Dead-letter queue", 460, 250, "poison messages"),
      ],
      edges: [edge("producer", "broker"), edge("broker", "consumer"), edge("consumer", "dedupe"), edge("consumer", "effect"), edge("consumer", "dlq")],
      steps: [
        step("producer broker", "producer-broker", "The producer stamps each message with a stable id before publishing."),
        step("broker consumer", "broker-consumer", "The queue delivers at least once: after a timeout or crash, m1 and m2 arrive again."),
        step("consumer dedupe", "consumer-dedupe", "The consumer checks the processed-ids table; repeats are acknowledged and skipped."),
        step("dedupe effect", "consumer-effect", "New ids and their balance change commit together, so a crash cannot apply one without the other."),
        step("dlq", "consumer-dlq", "Messages that fail repeatedly go to a dead-letter queue instead of blocking the stream."),
      ],
    },
    practice: [
      {
        id: "w10-repl-recall-1",
        type: "recall",
        prompt: "Explain CAP in two sentences without saying 'pick two'.",
        answer: "When a network partition happens, a replicated system must either refuse some requests to stay consistent or keep serving and risk inconsistent results. When there is no partition, the real trade-off is latency versus consistency (PACELC).",
        rubric: ["Partition as the trigger", "Consistency versus availability", "Latency trade-off otherwise"],
      },
      {
        id: "w10-queue-design-1",
        type: "design",
        prompt: "Design an order pipeline where the order service publishes an event after saving an order, and inventory must be decremented exactly once.",
        answer: "Use the transactional outbox: save the order and an outbox row in one transaction; a relay publishes outbox rows. Inventory consumes with an idempotency table keyed by event id, updated in the same transaction as the decrement. Add retries with backoff and a dead-letter queue.",
        rubric: ["Outbox pattern", "Idempotent consumer", "Retries and DLQ"],
      },
    ],
    references: [
      { title: "Designing Data-Intensive Applications (Kleppmann), chapters 5 and 11", versionSensitive: false },
      { title: "Apache Kafka documentation: message delivery semantics", url: "https://kafka.apache.org/documentation/#semantics", versionSensitive: true },
    ],
    lastReviewed: REVIEWED,
  }),
];

export const week = defineWeek({
  number: 10,
  slug: "system-design",
  title: "System design",
  track: "platform",
  domains: ["system-design"],
  summary:
    "Estimation, APIs, caching, load balancing, partitioning, replication, queues and consistency, plus reliability, security and cost as production lenses.",
  outcomes: [
    "Estimate load and storage from assumptions in under five minutes",
    "Choose caching, partitioning and replication strategies with trade-offs",
    "Design idempotent, observable, secure services",
  ],
  roles: ["sde", "ml-engineer", "genai-engineer", "data-engineer"],
  days: [
    {
      id: "w10-d01",
      day: 1,
      kind: "concept-map",
      title: "Estimation and API design",
      summary: "Numbers first, then resources, pagination and idempotency.",
      minutes: 75,
      goals: ["Estimate QPS and storage aloud", "Design an idempotent endpoint"],
      tasks: [
        { label: "Concept map and ELI5", minutes: 15 },
        { label: "Run and vary the estimator", minutes: 25 },
        { label: "Payment API design prompt", minutes: 20 },
        { label: "Estimation drill", minutes: 15 },
      ],
      topicIds: ["w10-d01-estimation-api-design"],
    },
    {
      id: "w10-d02",
      day: 2,
      kind: "theory-lab",
      title: "Caching, load balancing and partitioning",
      summary: "LRU, stampedes and why hash rings move few keys.",
      minutes: 85,
      goals: ["Simulate LRU", "Explain consistent hashing with virtual nodes"],
      tasks: [
        { label: "Step through the ring diagram", minutes: 15 },
        { label: "Run the cache and ring example", minutes: 30 },
        { label: "Stampede design prompt", minutes: 25 },
        { label: "Recall prompt", minutes: 15 },
      ],
      topicIds: ["w10-d02-caching-load-balancing"],
    },
    {
      id: "w10-d03",
      day: 3,
      kind: "implementation",
      title: "Replication, consistency and queues",
      summary: "Quorums, CAP and idempotent consumers.",
      minutes: 90,
      goals: ["Make a consumer idempotent", "Read a quorum table"],
      tasks: [
        { label: "Read the notebook analogy and its limit", minutes: 10 },
        { label: "Run the consumer and quorum example", minutes: 30 },
        { label: "Outbox design prompt", minutes: 35 },
        { label: "CAP recall prompt", minutes: 15 },
      ],
      topicIds: ["w10-d03-replication-queues"],
    },
    {
      id: "w10-d04",
      day: 4,
      kind: "applied-practice",
      title: "System design drills",
      summary: "Timed component drills: rate limiter, cache, queue, and a design rubric review.",
      minutes: 90,
      goals: ["Complete two component designs against the rubric"],
      tasks: [
        { label: "System design prompts in Practice", minutes: 60 },
        { label: "Self-review with the rubric", minutes: 20 },
        { label: "Log weak spots", minutes: 10 },
      ],
      topicIds: ["w10-d01-estimation-api-design", "w10-d02-caching-load-balancing", "w10-d03-replication-queues"],
    },
    {
      id: "w10-d05",
      day: 5,
      kind: "production-lens",
      title: "A URL shortener at scale",
      summary: "Reliability, security and cost for a classic design question.",
      minutes: 75,
      goals: ["Produce a full design with failure modes and costs"],
      tasks: [
        { label: "Read the scenario", minutes: 10 },
        { label: "Write the design", minutes: 45 },
        { label: "Compare against the rubric", minutes: 20 },
      ],
      topicIds: ["w10-d01-estimation-api-design", "w10-d02-caching-load-balancing", "w10-d03-replication-queues"],
      productionCase: {
        title: "Design a URL shortener for 100 million redirects a day",
        scenario:
          "Marketing wants branded short links. Expect 1 million new links and 100 million redirects a day, global users, and links that must keep working for years. Security has flagged that short links are used for phishing.",
        constraints: [
          "Redirect p99 latency under 50 ms worldwide.",
          "Links must survive a full region outage.",
          "Budget is tight: storage and egress costs matter.",
        ],
        questions: [
          "Estimate QPS and storage, then sketch the architecture.",
          "How do you generate short codes without collisions?",
          "How do you keep redirects fast and available across regions?",
          "How do you handle abuse, and what does it cost?",
        ],
        rubric: [
          "About 1,200 redirects per second on average and several thousand at peak; small storage (hundreds of GB a year)",
          "Code generation by base62 counter ranges per node or random codes with a uniqueness check",
          "CDN or edge caching with a replicated key-value store and multi-region failover",
          "Abuse: URL reputation checks on create, rate limits per account, takedown flow, and 301 versus 302 trade-off for analytics",
          "Observability: redirect latency, error rate, cache hit ratio",
        ],
        pitfalls: ["Hashing the URL and truncating, which collides", "A single database region for redirects"],
      },
    },
    {
      id: "w10-d06",
      day: 6,
      kind: "interview-simulation",
      title: "System design mock",
      summary: "A 45-minute design interview with a structured rubric.",
      minutes: 60,
      goals: ["Cover requirements, estimates, design, deep dive and trade-offs in time"],
      tasks: [
        { label: "Timed design interview", minutes: 45 },
        { label: "Self-score with the rubric", minutes: 15 },
      ],
      topicIds: ["w10-d01-estimation-api-design", "w10-d02-caching-load-balancing", "w10-d03-replication-queues"],
    },
    {
      id: "w10-d07",
      day: 7,
      kind: "review",
      title: "System design review",
      summary: "Spaced review and a one-page design template you can reuse.",
      minutes: 45,
      goals: ["Clear due reviews", "Write your design template"],
      tasks: [
        { label: "Due reviews", minutes: 20 },
        { label: "Design template", minutes: 25 },
      ],
      topicIds: ["w10-d01-estimation-api-design", "w10-d02-caching-load-balancing", "w10-d03-replication-queues"],
    },
  ],
});
