import { REVIEWED, code, defineTopic, defineWeek, edge, node, step } from "../helpers";

export const topics = [
  defineTopic({
    id: "w11-d01-etl-elt-cdc",
    slug: "etl-elt-cdc",
    title: "ETL, ELT and change data capture",
    domain: "data-engineering",
    roles: ["data-engineer", "sde", "data-scientist"],
    difficulty: "intermediate",
    minutes: 75,
    prerequisites: ["w02-d03-scd2-dimensions", "w10-d03-replication-queues"],
    objectives: [
      "Contrast ETL and ELT and when each fits",
      "Apply a change data capture log to a snapshot in log order",
      "Handle out-of-order and duplicate events with a log sequence number",
    ],
    summary:
      "Change data capture streams every insert, update and delete from a database's log. Applying those events to a snapshot, in log order and exactly once, keeps a warehouse copy in sync without reloading everything.",
    eli5: {
      analogy:
        "Copying a friend's address book. Instead of photocopying the whole book every day, you take one photocopy, then your friend sends a numbered note for every change. You apply the notes in number order, and skip any note numbered at or below the last one you applied.",
      steps: [
        "Start from the photocopy and remember its note number.",
        "Sort incoming notes by number.",
        "Skip notes you have already applied, including repeats.",
        "Apply inserts, updates and deletes in order.",
      ],
      analogyLimit:
        "Real logs also carry schema changes, transactions that span many rows and very large backfills. And the photocopy itself must be taken consistently at a known log position, which databases do with snapshot isolation.",
    },
    senior: {
      definition:
        "ETL transforms data before loading it into the warehouse; ELT loads raw data first and transforms inside the warehouse. Log-based CDC reads the database's write-ahead log or binlog and emits ordered change events with a log sequence number (LSN).",
      invariants: [
        "Events are applied in LSN order per key (or globally).",
        "An event with LSN at or below the last applied LSN is a duplicate or already included in the snapshot, and is skipped.",
        "The initial snapshot is consistent as of a known LSN, and streaming starts right after it.",
      ],
      mechanism: [
        "The snapshot was taken at LSN 100, so the event with LSN 100 is already reflected in it.",
        "Events arrive out of order and one is delivered twice; sorting by LSN and tracking the last applied LSN fixes both.",
        "Updates carry only changed columns, so they merge into the existing row; deletes remove the key (or set a tombstone).",
        "Tools such as Debezium produce these events; warehouses apply them with MERGE statements in micro-batches.",
      ],
      complexity: "O(e log e) to sort e events per batch, then O(e) to apply with a keyed store.",
      tradeoffs: [
        { option: "Full reload", choose: "Small tables or sources without logs.", cost: "Expensive, slow and misses deletes between loads only if you diff." },
        { option: "Timestamp-based incremental (updated_at)", choose: "Simple sources with reliable timestamps.", cost: "Misses hard deletes and clock-skewed updates." },
        { option: "Log-based CDC", choose: "Low latency, deletes and exact history.", cost: "Operational complexity, schema evolution handling and log retention limits." },
      ],
      failureModes: [
        "Applying events in arrival order instead of LSN order, so an older update overwrites a newer one.",
        "Reapplying events already included in the snapshot.",
        "Losing the log position after an outage longer than the source's log retention.",
        "Ignoring schema change events and breaking downstream models.",
      ],
      production:
        "Most modern stacks land raw CDC events in object storage or a lakehouse, then build current-state and history tables with MERGE (ELT). Monitor replication lag, event counts per table and the gap between source and warehouse row counts.",
      interviewAnswer:
        "I would take a consistent snapshot at a known LSN, then stream CDC events from the log, applying them in LSN order and skipping anything at or below the last applied LSN, which handles duplicates and snapshot overlap. Updates merge changed columns, deletes become tombstones. I prefer ELT: land raw events, then build current and SCD2 tables in the warehouse with MERGE.",
    },
    implementation: {
      problem: "Apply out-of-order and duplicated CDC events to a snapshot taken at LSN 100.",
      input: "snapshot at LSN 100: 1 Ada CA, 2 Grace UK, 3 Linus FI; events (arrival order): 102 insert 4, 101 update 2, 104 update 4, 100 update 1, 103 delete 3, 101 update 2 (redelivered)",
      python: {
        code: code`
          SNAPSHOT_LSN = 100
          SNAPSHOT = {
              1: {"name": "Ada", "country": "CA"},
              2: {"name": "Grace", "country": "UK"},
              3: {"name": "Linus", "country": "FI"},
          }
          EVENTS = [
              (102, "insert", 4, {"name": "Margaret", "country": "US"}),
              (101, "update", 2, {"country": "US"}),
              (104, "update", 4, {"country": "UK"}),
              (100, "update", 1, {"country": "CA"}),
              (103, "delete", 3, {}),
              (101, "update", 2, {"country": "US"}),
          ]


          def apply_cdc(snapshot, snapshot_lsn, events):
              table = {k: dict(v) for k, v in snapshot.items()}
              last, applied, skipped = snapshot_lsn, 0, 0
              for lsn, op, key, data in sorted(events, key=lambda e: e[0]):
                  if lsn <= last:
                      skipped += 1
                      continue
                  if op == "insert":
                      table[key] = dict(data)
                  elif op == "update":
                      table[key].update(data)
                  elif op == "delete":
                      table.pop(key, None)
                  last, applied = lsn, applied + 1
              return table, applied, skipped, last


          table, applied, skipped, last = apply_cdc(SNAPSHOT, SNAPSHOT_LSN, EVENTS)
          print(f"applied={applied} skipped={skipped} last_lsn={last}")
          for key in sorted(table):
              print(f"{key} {table[key]['name']} {table[key]['country']}")
        `,
      },
      r: {
        code: code`
          snapshot_lsn <- 100
          snapshot <- data.frame(id = 1:3, name = c("Ada", "Grace", "Linus"), country = c("CA", "UK", "FI"))
          events <- list(
            list(lsn = 102, op = "insert", id = 4, data = list(name = "Margaret", country = "US")),
            list(lsn = 101, op = "update", id = 2, data = list(country = "US")),
            list(lsn = 104, op = "update", id = 4, data = list(country = "UK")),
            list(lsn = 100, op = "update", id = 1, data = list(country = "CA")),
            list(lsn = 103, op = "delete", id = 3, data = list()),
            list(lsn = 101, op = "update", id = 2, data = list(country = "US"))
          )

          apply_cdc <- function(table, snapshot_lsn, events) {
            ordered <- events[order(vapply(events, function(e) e$lsn, numeric(1)))]
            last <- snapshot_lsn
            applied <- 0L
            skipped <- 0L
            for (e in ordered) {
              if (e$lsn <= last) {
                skipped <- skipped + 1L
                next
              }
              if (e$op == "insert") {
                table <- rbind(table, data.frame(id = e$id, name = e$data$name, country = e$data$country))
              } else if (e$op == "update") {
                for (col in names(e$data)) table[table$id == e$id, col] <- e$data[[col]]
              } else if (e$op == "delete") {
                table <- table[table$id != e$id, ]
              }
              last <- e$lsn
              applied <- applied + 1L
            }
            list(table = table[order(table$id), ], applied = applied, skipped = skipped, last = last)
          }

          res <- apply_cdc(snapshot, snapshot_lsn, events)
          cat(sprintf("applied=%d skipped=%d last_lsn=%d\n", res$applied, res$skipped, as.integer(res$last)))
          for (i in seq_len(nrow(res$table))) {
            cat(sprintf("%d %s %s\n", as.integer(res$table$id[i]), res$table$name[i], res$table$country[i]))
          }
        `,
      },
      expectedOutput: code`
        applied=4 skipped=2 last_lsn=104
        1 Ada CA
        2 Grace US
        4 Margaret UK
      `,
      tests: {
        python: code`
          def test_replaying_the_log_is_idempotent():
              t2, a2, _, _ = apply_cdc(table, last, EVENTS)
              assert t2 == table and a2 == 0


          def test_arrival_order_does_not_matter():
              t2, *_ = apply_cdc(SNAPSHOT, SNAPSHOT_LSN, list(reversed(EVENTS)))
              assert t2 == table


          def test_snapshot_is_not_mutated():
              assert 3 in SNAPSHOT
        `,
        r: code`
          test_that("replaying the log is idempotent", {
            again <- apply_cdc(res$table, res$last, events)
            expect_equal(again$applied, 0L)
            expect_equal(again$table, res$table)
          })

          test_that("arrival order does not matter", {
            expect_equal(apply_cdc(snapshot, snapshot_lsn, rev(events))$table, res$table)
          })
        `,
      },
      eli5Trace: [
        "Sort the notes: 100, 101, 101, 102, 103, 104.",
        "Note 100 is already in the photocopy: skip it.",
        "Apply 101 (Grace moves to US), skip the repeated 101.",
        "Apply 102 (add Margaret), 103 (remove Linus) and 104 (Margaret moves to UK).",
        "Four notes applied, two skipped, and the copy matches the source as of note 104.",
      ],
      complexity: { time: "O(e log e)", space: "O(rows + e)" },
      edgeCases: [
        "An update for a key that does not exist signals a missed insert; alert instead of guessing.",
        "A delete followed by a reinsert of the same key must apply in order.",
        "Multiple events in one source transaction share a commit position; apply them atomically.",
        "Long outages can exceed the source's log retention, forcing a new snapshot.",
      ],
      incorrect: {
        language: "python",
        code: code`
          for lsn, op, key, data in EVENTS:
              apply(op, key, data)
        `,
        whyWrong: "Applying in arrival order lets the late LSN 100 event and the duplicate 101 be applied, and an older update can overwrite a newer one.",
        fix: "Sort by LSN and skip anything at or below the last applied LSN (starting from the snapshot's LSN).",
      },
    },
    flow: {
      title: "Snapshot plus ordered change log",
      nodes: [
        node("db", "Source database", 0, 110, "write-ahead log"),
        node("snap", "Snapshot @ LSN 100", 240, 30, "consistent copy"),
        node("log", "CDC events", 240, 190, "out of order, duplicates"),
        node("sort", "Order by LSN", 480, 190, "skip <= last applied"),
        node("merge", "MERGE into table", 720, 110, "insert, update, delete"),
        node("wh", "Warehouse table", 940, 110, "as of LSN 104"),
      ],
      edges: [edge("db", "snap"), edge("db", "log"), edge("log", "sort"), edge("snap", "merge"), edge("sort", "merge"), edge("merge", "wh")],
      steps: [
        step("db snap", "db-snap", "Take a consistent snapshot and record its log position, LSN 100."),
        step("db log", "db-log", "Stream every change from the log; delivery can be out of order or repeated."),
        step("log sort", "log-sort", "Order events by LSN and skip anything at or below the last applied position."),
        step("snap sort merge", "snap-merge sort-merge", "Merge changes into the snapshot: inserts add rows, updates change columns, deletes remove rows."),
        step("merge wh", "merge-wh", "The warehouse table now matches the source as of LSN 104."),
      ],
    },
    practice: [
      {
        id: "w11-cdc-recall-1",
        type: "recall",
        prompt: "Why can't an updated_at-based incremental load capture hard deletes?",
        answer: "Deleted rows no longer exist, so no query on updated_at returns them. You need soft deletes, periodic full diffs or log-based CDC.",
        rubric: ["Deleted rows are absent", "Names an alternative"],
      },
      {
        id: "w11-elt-recall-1",
        type: "recall",
        prompt: "When would you still choose ETL over ELT?",
        answer: "When data must be masked or filtered before it lands (PII and compliance), when the destination has little compute, or when shrinking very large raw data before transfer saves real cost.",
        rubric: ["Compliance or PII", "Destination limits or cost"],
      },
    ],
    references: [
      { title: "Debezium documentation", url: "https://debezium.io/documentation/", versionSensitive: true },
      { title: "Designing Data-Intensive Applications (Kleppmann), chapter 11 on stream processing", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w11-d02-formats-spark-shuffle",
    slug: "formats-spark-shuffle",
    title: "File formats, partitioning and the Spark shuffle",
    domain: "data-engineering",
    roles: ["data-engineer", "ml-engineer", "data-scientist"],
    difficulty: "intermediate",
    minutes: 80,
    prerequisites: ["w11-d01-etl-elt-cdc", "w10-d02-caching-load-balancing"],
    objectives: [
      "Trace map, shuffle and reduce for a group-by aggregation",
      "Show how map-side combining shrinks the shuffle",
      "Choose columnar formats and partitioning for analytical reads",
    ],
    summary:
      "Distributed engines like Spark split work into tasks. Grouping by key forces a shuffle: every record moves to the partition that owns its key. Combining locally before the shuffle, and storing data in columnar, partitioned files, are the biggest performance levers.",
    eli5: {
      analogy:
        "Counting votes in three classrooms. Each room tallies its own ballots first, then sends one slip per candidate to the counting table that handles that candidate's name. Sending tallies instead of every ballot means far fewer slips walk down the hall.",
      steps: [
        "Each classroom reads its own ballots (the map step).",
        "Each room tallies its ballots so each candidate appears once per room (the combine step).",
        "Each tally slip goes to the counting table chosen by the candidate's name (the shuffle).",
        "Each table adds up its slips (the reduce step).",
      ],
      analogyLimit:
        "Real shuffles write data to disk and send it over the network, and one popular candidate (a skewed key) can swamp one table while others sit idle.",
    },
    senior: {
      definition:
        "A wide transformation (groupBy, join, distinct) requires a shuffle: map tasks partition their output by hash(key) mod P and reducers fetch their partition from every mapper. Map-side combine (as in reduceByKey) pre-aggregates within each map task before the shuffle.",
      invariants: [
        "All records with the same key land in the same reduce partition.",
        "Combining is valid only for associative and commutative aggregations (sum, count, max), not for arbitrary functions.",
        "The partition function must be deterministic across executors.",
      ],
      mechanism: [
        "Three lines act as three map tasks, each emitting (word, 1) pairs: 12 records in total.",
        "Map-side combine sums counts within each task first, cutting the shuffle to 10 records.",
        "A stable hash decides which of 3 partitions owns each word; each partition sums its records.",
        "Columnar formats such as Parquet store each column separately with statistics, so queries read only needed columns and skip row groups; partitioning files by a common filter (date) prunes whole directories.",
      ],
      complexity: "Shuffle cost is proportional to records times record size crossing the network; sorting within partitions is O(n log n).",
      tradeoffs: [
        { option: "Parquet or ORC (columnar)", choose: "Analytical scans over a few columns.", cost: "Slow for row-at-a-time writes and updates." },
        { option: "Avro or JSON (row-oriented)", choose: "Streaming ingestion and full-record access.", cost: "Larger scans for analytics." },
        { option: "Broadcast join", choose: "Joining a big table with a small one.", cost: "The small side must fit in each executor's memory." },
      ],
      failureModes: [
        "Using groupByKey then summing instead of reduceByKey, shuffling every record.",
        "Skewed keys making one task run for hours.",
        "Over-partitioning into millions of tiny files.",
        "Partitioning by a high-cardinality column (user_id) and creating a directory per user.",
      ],
      production:
        "Spark UI stages show shuffle read and write sizes and task time skew. Typical fixes: filter and select columns early, broadcast small tables, salt skewed keys, and compact small files in the lakehouse.",
      interviewAnswer:
        "A group-by causes a shuffle: each record is routed by hash of its key to one partition, so all values for a key meet in one reducer. I reduce shuffle volume with map-side combining (reduceByKey instead of groupByKey), early filters and column pruning, and broadcast joins when one side is small. Data lands in Parquet partitioned by date so queries prune files and columns.",
    },
    implementation: {
      problem: "Run a word count as map, combine, shuffle and reduce across 3 partitions, and count shuffled records with and without combining.",
      input: 'map tasks: "the cat and the hat", "the bat and the cat", "a cat"; 3 reduce partitions by stable hash',
      python: {
        code: code`
          from collections import Counter

          TASKS = ["the cat and the hat", "the bat and the cat", "a cat"]
          PARTITIONS = 3


          def stable_hash(s: str) -> int:
              h = 0
              for ch in s:
                  h = (h * 31 + ord(ch)) % 2**32
              return (h * 2654435761) % 2**32


          mapped = [[(w, 1) for w in line.split()] for line in TASKS]
          combined = [sorted(Counter(w for w, _ in task).items()) for task in mapped]
          print(f"shuffled records without combine: {sum(len(t) for t in mapped)}")
          print(f"shuffled records with combine: {sum(len(t) for t in combined)}")

          reduced: list[Counter[str]] = [Counter() for _ in range(PARTITIONS)]
          for task in combined:
              for word, count in task:
                  reduced[stable_hash(word) % PARTITIONS][word] += count
          for p, counts in enumerate(reduced):
              print(f"partition {p}: " + " ".join(f"{w}={c}" for w, c in sorted(counts.items())))
        `,
      },
      r: {
        code: code`
          tasks <- c("the cat and the hat", "the bat and the cat", "a cat")
          partitions <- 3

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

          mapped <- lapply(strsplit(tasks, " "), function(words) words)
          combined <- lapply(mapped, function(words) table(words))
          cat(sprintf("shuffled records without combine: %d\n", sum(lengths(mapped))))
          cat(sprintf("shuffled records with combine: %d\n", sum(vapply(combined, length, integer(1)))))

          reduced <- replicate(partitions, integer(0), simplify = FALSE)
          for (counts in combined) {
            for (w in names(counts)) {
              p <- stable_hash(w) %% partitions + 1
              current <- if (is.na(reduced[[p]][w])) 0L else reduced[[p]][[w]]
              reduced[[p]][w] <- current + as.integer(counts[[w]])
            }
          }
          for (p in seq_len(partitions)) {
            counts <- reduced[[p]]
            if (length(counts)) counts <- counts[order(names(counts))]
            cat(sprintf("partition %d: %s\n", p - 1, paste(sprintf("%s=%d", names(counts), counts), collapse = " ")))
          }
        `,
      },
      expectedOutput: code`
        shuffled records without combine: 12
        shuffled records with combine: 10
        partition 0: cat=3 hat=1 the=4
        partition 1:
        partition 2: a=1 and=2 bat=1
      `,
      tests: {
        python: code`
          def test_totals_match_a_plain_count():
              total = Counter()
              for c in reduced:
                  total.update(c)
              assert total == Counter(" ".join(TASKS).split())


          def test_each_word_lives_in_exactly_one_partition():
              words = [w for c in reduced for w in c]
              assert len(words) == len(set(words))


          def test_combine_never_increases_records():
              assert sum(len(t) for t in combined) <= sum(len(t) for t in mapped)
        `,
        r: code`
          test_that("totals match a plain count", {
            all_counts <- unlist(reduced)
            plain <- table(unlist(strsplit(tasks, " ")))
            expect_equal(sort(all_counts[names(plain)]), sort(setNames(as.integer(plain), names(plain))))
          })

          test_that("each word lives in exactly one partition", {
            words <- unlist(lapply(reduced, names))
            expect_equal(length(words), length(unique(words)))
          })
        `,
      },
      eli5Trace: [
        "Without tallying first, every word sends its own slip: 12 slips walk down the hall.",
        "Each room tallies first: 'the' appears twice in the first two rooms but sends one slip each, so 10 slips walk.",
        "Each word's name decides its counting table, so all of 'cat' ends up at the same table.",
        "Each table adds its slips: cat ends up at 3 and the at 4.",
        "With so few words, one table receives no slips at all: a tiny example of uneven partitions.",
      ],
      complexity: { time: "O(n) map and combine, O(n) shuffle and reduce", space: "O(distinct keys per task)" },
      edgeCases: [
        "A single very frequent key concentrates work in one partition (skew).",
        "An empty map task contributes nothing to the shuffle.",
        "Partition assignment must not depend on process-specific hashing (Python's salted hash()).",
        "Combining a non-associative function (like an average of averages) gives wrong answers.",
      ],
      incorrect: {
        language: "python",
        code: code`
          reduced = [Counter() for _ in range(PARTITIONS)]
          for task in combined:
              for word, count in task:
                  reduced[hash(word) % PARTITIONS][word] += count
        `,
        whyWrong: "Python's built-in hash() is salted per process, so different executors would send the same word to different partitions and counts would be split.",
        fix: "Use a stable, process-independent hash for partitioning.",
      },
    },
    flow: {
      title: "Map, combine, shuffle, reduce",
      nodes: [
        node("m1", "Map task 1", 0, 0, "5 words"),
        node("m2", "Map task 2", 0, 120, "5 words"),
        node("m3", "Map task 3", 0, 240, "2 words"),
        node("combine", "Map-side combine", 260, 120, "12 records to 10"),
        node("shuffle", "Shuffle by hash(key)", 520, 120, "network + disk"),
        node("reduce", "Reducers", 780, 120, "3 partitions sum counts"),
      ],
      edges: [edge("m1", "combine"), edge("m2", "combine"), edge("m3", "combine"), edge("combine", "shuffle"), edge("shuffle", "reduce")],
      steps: [
        step("m1 m2 m3", "", "Each map task reads its own split and emits (word, 1) for every word."),
        step("combine", "m1-combine m2-combine m3-combine", "Each task sums its own pairs first, so repeated words in a task become one record."),
        step("shuffle", "combine-shuffle", "Records are routed by a stable hash of the word, so each word lands in exactly one partition."),
        step("reduce", "shuffle-reduce", "Each reducer adds the partial counts for its words."),
      ],
    },
    practice: [
      {
        id: "w11-spark-case-1",
        type: "case",
        prompt: "A Spark join job has 199 tasks finishing in 2 minutes and 1 task running for 3 hours. Diagnose and fix.",
        answer: "Key skew: one join key (often null or a default value) has most rows. Filter or handle nulls separately, salt the hot key across several partitions, or broadcast the smaller side.",
        rubric: ["Names skew", "Checks null or default keys", "Salting or broadcast"],
      },
      {
        id: "w11-format-recall-1",
        type: "recall",
        prompt: "Why is Parquet faster than CSV for 'SELECT avg(price) FROM sales WHERE day = X'?",
        answer: "Parquet stores columns separately and keeps per-row-group statistics, so the engine reads only the price and day columns and skips row groups that cannot match; files partitioned by day prune further. CSV must parse every row and column.",
        rubric: ["Column pruning", "Statistics and predicate pushdown", "Partition pruning"],
      },
    ],
    references: [
      { title: "Apache Spark documentation: RDD programming guide, shuffle operations", url: "https://spark.apache.org/docs/latest/rdd-programming-guide.html#shuffle-operations", versionSensitive: true },
      { title: "Apache Parquet documentation", url: "https://parquet.apache.org/docs/", versionSensitive: true },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w11-d03-streaming-windows",
    slug: "streaming-windows",
    title: "Streaming windows, watermarks and late data",
    domain: "data-engineering",
    roles: ["data-engineer", "ml-engineer", "sde"],
    difficulty: "advanced",
    minutes: 80,
    prerequisites: ["w11-d01-etl-elt-cdc"],
    objectives: [
      "Aggregate events into tumbling event-time windows",
      "Use a watermark to decide when a window is complete",
      "Choose what to do with late events",
    ],
    summary:
      "Streams arrive out of order. Event-time windows group events by when they happened, and a watermark (the engine's estimate of 'all events up to time T have arrived') decides when to emit a window and what counts as late.",
    eli5: {
      analogy:
        "Collecting homework by the day it was due, not the day it reached your desk. You wait a little extra time for stragglers, then close that day's pile. Anything for a closed pile that shows up later is marked late.",
      steps: [
        "Put each event in the 10-second bucket of when it happened.",
        "Keep track of the newest event time you have seen.",
        "Declare 'everything up to 5 seconds before that has arrived' (the watermark).",
        "When the watermark passes a bucket's end, close it and report its count.",
        "Events for already-closed buckets are late and get dropped or sent elsewhere.",
      ],
      analogyLimit:
        "A watermark is a guess. Set it too tight and you drop real data; too loose and results are delayed. Real systems also allow updating results after the fact (retractions) for some use cases.",
    },
    senior: {
      definition:
        "Tumbling windows partition event time into fixed, non-overlapping intervals [k w, (k + 1) w). A bounded-out-of-orderness watermark is max_event_time_seen - allowed_delay. A window is emitted once the watermark reaches its end; events for emitted windows are late.",
      invariants: [
        "Watermarks never move backwards.",
        "A window is emitted exactly once (in this append mode) and never changes afterwards.",
        "Event time, not processing time, decides window membership.",
      ],
      mechanism: [
        "The event at t = 7 arrives after t = 12, but the watermark is only 7, so window [0, 10) is still open and accepts it.",
        "The event at t = 16 moves the watermark to 11, closing [0, 10) with 3 events.",
        "The event at t = 9 then arrives for a closed window and is dropped as late (it could go to a side output).",
        "At end of stream the remaining windows are flushed.",
      ],
      complexity: "O(1) per event to update window state; memory proportional to open windows times keys.",
      tradeoffs: [
        { option: "Tight watermark (small delay)", choose: "Low latency dashboards.", cost: "More late data dropped." },
        { option: "Loose watermark (large delay)", choose: "Accuracy-critical aggregates like billing.", cost: "Higher latency and more state." },
        { option: "Allowed lateness with updates", choose: "Sinks that support upserts.", cost: "Downstream must handle corrected results." },
      ],
      failureModes: [
        "Windowing by processing time, so a backlog replay puts old events in the current window.",
        "One idle partition holding back the global watermark forever.",
        "Silently dropping late events without counting them.",
        "Unbounded state from windows that never close.",
      ],
      production:
        "Flink, Spark Structured Streaming and Beam implement these semantics. Monitor late-event counts, watermark lag and state size; route late events to a side output and reconcile in batch.",
      interviewAnswer:
        "I window by event time and use a watermark of max event time minus an allowed delay, sized from the observed lateness distribution. A window emits when the watermark passes its end; later events are late, counted and sent to a side output or used to update results if the sink supports upserts. I would monitor watermark lag and late-event rate.",
    },
    implementation: {
      problem: "Count events in 10-second tumbling windows with a 5-second watermark delay, dropping late events.",
      input: "arrivals (event time): 1, 4, 12, 7, 16, 9, 25, 21; window 10 s; watermark = max seen - 5",
      python: {
        code: code`
          ARRIVALS = [1, 4, 12, 7, 16, 9, 25, 21]
          WINDOW, DELAY = 10, 5


          def run(arrivals: list[int], window: int, delay: int) -> list[str]:
              log: list[str] = []
              open_windows: dict[int, int] = {}
              closed: set[int] = set()
              watermark = float("-inf")
              for t in arrivals:
                  start = (t // window) * window
                  if start in closed:
                      log.append(f"drop late event t={t} (watermark {watermark})")
                      continue
                  open_windows[start] = open_windows.get(start, 0) + 1
                  watermark = max(watermark, t - delay)
                  for s in sorted(open_windows):
                      if s + window <= watermark:
                          log.append(f"emit window [{s}, {s + window}): {open_windows.pop(s)} events")
                          closed.add(s)
              for s in sorted(open_windows):
                  log.append(f"flush window [{s}, {s + window}): {open_windows[s]} events")
              return log


          for line in run(ARRIVALS, WINDOW, DELAY):
              print(line)
        `,
      },
      r: {
        code: code`
          arrivals <- c(1, 4, 12, 7, 16, 9, 25, 21)

          run_stream <- function(arrivals, window = 10, delay = 5) {
            log <- character(0)
            open <- integer(0)
            closed <- numeric(0)
            watermark <- -Inf
            for (t in arrivals) {
              start <- (t %/% window) * window
              key <- as.character(start)
              if (start %in% closed) {
                log <- c(log, sprintf("drop late event t=%d (watermark %d)", as.integer(t), as.integer(watermark)))
                next
              }
              open[key] <- if (is.na(open[key])) 1L else open[[key]] + 1L
              watermark <- max(watermark, t - delay)
              for (s in sort(as.numeric(names(open)))) {
                if (s + window <= watermark) {
                  k <- as.character(s)
                  log <- c(log, sprintf("emit window [%d, %d): %d events", as.integer(s), as.integer(s + window), open[[k]]))
                  open <- open[names(open) != k]
                  closed <- c(closed, s)
                }
              }
            }
            for (s in sort(as.numeric(names(open)))) {
              log <- c(log, sprintf("flush window [%d, %d): %d events", as.integer(s), as.integer(s + window), open[[as.character(s)]]))
            }
            log
          }

          for (line in run_stream(arrivals)) cat(line, "\n", sep = "")
        `,
      },
      expectedOutput: code`
        emit window [0, 10): 3 events
        drop late event t=9 (watermark 11)
        emit window [10, 20): 2 events
        flush window [20, 30): 2 events
      `,
      tests: {
        python: code`
          def test_in_order_stream_drops_nothing():
              assert not any("drop" in l for l in run([1, 5, 11, 15, 22], 10, 5))


          def test_counts_add_up_with_drops():
              log = run(ARRIVALS, WINDOW, DELAY)
              counted = sum(int(l.split(": ")[1].split()[0]) for l in log if l.startswith(("emit", "flush")))
              dropped = sum(1 for l in log if l.startswith("drop"))
              assert counted + dropped == len(ARRIVALS)


          def test_zero_delay_drops_any_out_of_order_event_for_a_closed_window():
              assert any("drop" in l for l in run([1, 11, 25, 3], 10, 0))
        `,
        r: code`
          test_that("an in-order stream drops nothing", {
            expect_false(any(grepl("drop", run_stream(c(1, 5, 11, 15, 22)))))
          })

          test_that("counted plus dropped equals arrivals", {
            log <- run_stream(arrivals)
            counted <- sum(as.integer(sub(".*: (\\d+) events", "\\1", log[grepl("events", log)])))
            expect_equal(counted + sum(grepl("^drop", log)), length(arrivals))
          })
        `,
      },
      eli5Trace: [
        "Events at 1 and 4 go in the 0 to 10 pile. The event at 12 starts the 10 to 20 pile and moves the watermark to 7.",
        "The straggler at 7 still fits: the 0 to 10 pile is open because the watermark has not reached 10.",
        "The event at 16 moves the watermark to 11, so the 0 to 10 pile closes with 3 events.",
        "The event at 9 arrives for a closed pile: it is late and dropped.",
        "25 closes the 10 to 20 pile with 2 events; 21 joins the last pile, which is flushed at the end.",
      ],
      complexity: { time: "O(events * open windows)", space: "O(open windows)" },
      edgeCases: [
        "An event exactly at a window boundary belongs to the next window ([start, end) intervals).",
        "With no new events the watermark never advances; real engines use idle timeouts.",
        "Negative or far-future timestamps should be quarantined, not allowed to jump the watermark.",
        "Flushing at end of stream only exists in bounded tests; infinite streams rely on the watermark.",
      ],
      incorrect: {
        language: "python",
        code: code`
          start = (arrival_index // 3) * 3
        `,
        whyWrong: "Windowing by arrival order (processing time) puts the late t = 9 event in a later window, mixing data from different periods.",
        fix: "Assign windows from the event's own timestamp and use a watermark to decide completeness.",
      },
    },
    flow: {
      title: "Event time, watermark and late data",
      nodes: [
        node("events", "Arrivals", 0, 110, "1 4 12 7 16 9 25 21"),
        node("assign", "Assign window", 230, 110, "by event time"),
        node("wm", "Watermark", 460, 30, "max seen - 5"),
        node("emit", "Emit window", 700, 30, "when watermark >= end"),
        node("late", "Late event", 460, 200, "window already closed"),
        node("side", "Side output", 700, 200, "count and reconcile"),
      ],
      edges: [edge("events", "assign"), edge("assign", "wm"), edge("wm", "emit"), edge("assign", "late"), edge("late", "side")],
      steps: [
        step("events assign", "events-assign", "Each event is placed in the 10-second window that contains its own timestamp."),
        step("assign wm", "assign-wm", "The watermark trails the newest event time by 5 seconds: after 12 arrives it is 7."),
        step("wm emit", "wm-emit", "When 16 arrives, the watermark reaches 11 and window [0, 10) emits 3 events."),
        step("assign late", "assign-late", "The event at 9 arrives after its window closed, so it is late."),
        step("late side", "late-side", "Late events are counted and routed aside for reconciliation rather than silently lost."),
      ],
    },
    practice: [
      {
        id: "w11-stream-design-1",
        type: "design",
        prompt: "Design per-minute revenue for a dashboard where 99% of events arrive within 30 seconds and 0.1% arrive hours late.",
        answer: "Event-time one-minute tumbling windows, watermark delay about 30 to 60 seconds for the live view, late events to a side output, and an hourly or daily batch job that recomputes exact totals and corrects the store (lambda or kappa with reprocessing).",
        rubric: ["Event-time windows", "Watermark from lateness distribution", "Late data path and batch correction"],
      },
      {
        id: "w11-stream-recall-1",
        type: "recall",
        prompt: "Why can a single idle Kafka partition stall a streaming job's output?",
        answer: "The job's watermark is the minimum across partitions; an idle partition never advances its watermark, so windows never close. Engines offer idleness timeouts to exclude idle sources.",
        rubric: ["Watermark is a minimum across inputs", "Idleness handling"],
      },
    ],
    references: [
      { title: "Apache Flink documentation: timely stream processing", versionSensitive: true },
      { title: "Streaming Systems (Akidau, Chernyak, Lax)", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w11-d04-data-quality-orchestration",
    slug: "data-quality-orchestration",
    title: "Orchestration, data contracts and quality gates",
    domain: "data-engineering",
    roles: ["data-engineer", "data-scientist", "ml-engineer"],
    difficulty: "intermediate",
    minutes: 70,
    prerequisites: ["w11-d01-etl-elt-cdc", "w06-d01-data-quality-eda", "w04-d02-graph-traversal"],
    objectives: [
      "Run a DAG where failed error-level checks stop downstream tasks",
      "Separate blocking checks from warnings",
      "Explain lineage and how it speeds up incident response",
    ],
    summary:
      "Pipelines are DAGs of tasks. Quality checks inside the DAG act as gates: an error-level failure stops bad data from reaching dashboards and models, while warnings alert without blocking. Lineage tells you who is affected when something breaks.",
    eli5: {
      analogy:
        "A bakery line: mix, inspect, bake, sell. If the inspector finds glass in the dough, baking and selling stop. If the dough is just a bit cold, the inspector notes it but the line keeps moving.",
      steps: [
        "Run the first task and collect the batch.",
        "Run every check and label failures as blocking or warning.",
        "If any blocking check fails, mark the inspection failed and skip everything after it.",
        "Warnings go to an alert, and the line continues.",
      ],
      analogyLimit:
        "A bakery has one line. Real pipelines branch: a failure should block only the tasks that depend on the bad data, and lineage is how you find which ones those are.",
    },
    senior: {
      definition:
        "An orchestrator (Airflow, Dagster, Prefect) runs tasks in dependency order with retries and scheduling. A data contract defines schema and quality expectations (not null, unique keys, ranges, freshness) with severities; error-level violations fail the task and skip dependents.",
      invariants: [
        "A task runs only if all its upstream tasks succeeded (default trigger rule).",
        "Checks are deterministic and run against the batch before publish.",
        "Every check result is recorded with counts, not just pass or fail.",
      ],
      mechanism: [
        "The batch has a duplicate id (unique check fails, error) and is 26 hours old (freshness fails, warning).",
        "validate fails because of the error-level failure, so transform and publish are skipped; nothing bad is published.",
        "The freshness warning is alerted on its own and would not have blocked a clean batch.",
        "Lineage graphs (for example OpenLineage) record which datasets each task reads and writes, so you can list affected dashboards when validate fails.",
      ],
      complexity: "Each check is O(n) or O(n log n); orchestration overhead is per task, so avoid thousands of tiny tasks.",
      tradeoffs: [
        { option: "Blocking checks (error)", choose: "Primary keys, required fields, financial totals.", cost: "Stale data downstream while someone fixes it." },
        { option: "Non-blocking checks (warn)", choose: "Freshness drift, soft distribution shifts.", cost: "Alert fatigue if thresholds are noisy." },
        { option: "Write-audit-publish", choose: "Critical tables: write to staging, audit, then swap atomically.", cost: "Extra storage and a publish step." },
      ],
      failureModes: [
        "Checks that run after publish, so bad data is already visible.",
        "Every check set to warn, so nothing ever blocks.",
        "Retries masking a deterministic data problem.",
        "No lineage, so incident response starts with guessing who is affected.",
      ],
      production:
        "dbt tests, Great Expectations or Soda encode contracts; orchestrators surface failures with lineage, owners and runbooks. Track data downtime (time from bad data to detection to fix) like an SLO.",
      interviewAnswer:
        "I model the pipeline as a DAG with a validation task before publish. Checks come from a data contract with severities: errors such as duplicate keys or nulls in required columns fail the task and skip downstream publishing; warnings such as freshness drift alert without blocking. I use write-audit-publish for critical tables and lineage to notify affected owners.",
    },
    implementation: {
      problem: "Validate a batch against a contract, then run a four-task DAG where an error-level failure skips downstream tasks.",
      input: "batch rows (id, amount, age in hours): (1, 20.0, 30) (2, 35.5, 28) (2, 35.5, 28) (3, 99.0, 26) (4, 15.0, 27); checks not_null, unique, range 0..10000 (error), freshness 24 h (warn); DAG extract > validate > transform > publish",
      python: {
        code: code`
          BATCH = [(1, 20.0, 30), (2, 35.5, 28), (2, 35.5, 28), (3, 99.0, 26), (4, 15.0, 27)]


          def run_checks(rows):
              ids = [r[0] for r in rows]
              results = [
                  ("not_null(id)", "error", all(i is not None for i in ids), ""),
                  ("unique(id)", "error", len(ids) == len(set(ids)), f"{len(ids) - len(set(ids))} duplicate"),
                  ("range(amount, 0, 10000)", "error", all(0 <= r[1] <= 10000 for r in rows), ""),
                  ("freshness(24h)", "warn", min(r[2] for r in rows) <= 24, f"{min(r[2] for r in rows)}h old"),
              ]
              return results


          def run_dag(results):
              blocking = any(not ok for _, sev, ok, _ in results if sev == "error")
              status = {"extract": "success", "validate": "failed" if blocking else "success"}
              for task in ["transform", "publish"]:
                  upstream_ok = all(s == "success" for s in status.values())
                  status[task] = "success" if upstream_ok else "skipped"
              return status


          results = run_checks(BATCH)
          for name, severity, ok, detail in results:
              print(f"check {name}: {'pass' if ok else 'FAIL'}" + ("" if ok else f" ({detail}) [{severity}]"))
          for task, status in run_dag(results).items():
              print(f"task {task}: {status}")
        `,
      },
      r: {
        code: code`
          batch <- data.frame(id = c(1, 2, 2, 3, 4), amount = c(20, 35.5, 35.5, 99, 15), age_h = c(30, 28, 28, 26, 27))

          run_checks <- function(rows) {
            dupes <- sum(duplicated(rows$id))
            list(
              list(name = "not_null(id)", severity = "error", ok = !any(is.na(rows$id)), detail = ""),
              list(name = "unique(id)", severity = "error", ok = dupes == 0, detail = sprintf("%d duplicate", dupes)),
              list(name = "range(amount, 0, 10000)", severity = "error", ok = all(rows$amount >= 0 & rows$amount <= 10000), detail = ""),
              list(name = "freshness(24h)", severity = "warn", ok = min(rows$age_h) <= 24, detail = sprintf("%dh old", as.integer(min(rows$age_h))))
            )
          }

          run_dag <- function(results) {
            blocking <- any(vapply(results, function(r) r$severity == "error" && !r$ok, logical(1)))
            status <- c(extract = "success", validate = if (blocking) "failed" else "success")
            for (task in c("transform", "publish")) {
              status[task] <- if (all(status == "success")) "success" else "skipped"
            }
            status
          }

          results <- run_checks(batch)
          for (r in results) {
            cat(sprintf("check %s: %s%s\n", r$name, if (r$ok) "pass" else "FAIL",
                        if (r$ok) "" else sprintf(" (%s) [%s]", r$detail, r$severity)))
          }
          status <- run_dag(results)
          for (task in names(status)) cat(sprintf("task %s: %s\n", task, status[[task]]))
        `,
      },
      expectedOutput: code`
        check not_null(id): pass
        check unique(id): FAIL (1 duplicate) [error]
        check range(amount, 0, 10000): pass
        check freshness(24h): FAIL (26h old) [warn]
        task extract: success
        task validate: failed
        task transform: skipped
        task publish: skipped
      `,
      tests: {
        python: code`
          def test_clean_batch_publishes():
              clean = [(1, 10.0, 2), (2, 20.0, 3)]
              assert run_dag(run_checks(clean))["publish"] == "success"


          def test_warning_alone_does_not_block():
              stale = [(1, 10.0, 48), (2, 20.0, 50)]
              assert run_dag(run_checks(stale))["publish"] == "success"


          def test_error_blocks_downstream():
              assert run_dag(results)["publish"] == "skipped"
        `,
        r: code`
          test_that("a clean batch publishes", {
            clean <- data.frame(id = c(1, 2), amount = c(10, 20), age_h = c(2, 3))
            expect_identical(run_dag(run_checks(clean))[["publish"]], "success")
          })

          test_that("a warning alone does not block", {
            stale <- data.frame(id = c(1, 2), amount = c(10, 20), age_h = c(48, 50))
            expect_identical(run_dag(run_checks(stale))[["publish"]], "success")
          })
        `,
      },
      eli5Trace: [
        "The inspector checks four things. Every row has an id: pass.",
        "Id 2 appears twice: a blocking failure.",
        "All amounts are in range: pass. The newest row is 26 hours old: a warning.",
        "Because a blocking check failed, inspection fails and baking (transform) and selling (publish) are skipped.",
      ],
      complexity: { time: "O(n) per check", space: "O(n) for the uniqueness set" },
      edgeCases: [
        "An empty batch passes uniqueness but should fail a row-count check you add.",
        "Freshness depends on the clock; compare against the batch's logical date in backfills.",
        "A failing warn check with a passing error set still publishes and alerts.",
        "Retrying a task cannot fix a deterministic data failure; route it to an owner.",
      ],
      incorrect: {
        language: "python",
        code: code`
          for name, severity, ok, detail in results:
              if not ok:
                  print("alert", name)
          publish(BATCH)
        `,
        whyWrong: "Checks only alert; the batch with a duplicate key is published anyway, so dashboards double count.",
        fix: "Make error-level failures fail the validate task so downstream publish is skipped (or use write-audit-publish).",
      },
    },
    flow: {
      title: "A quality gate inside the DAG",
      nodes: [
        node("extract", "extract", 0, 110, "success"),
        node("validate", "validate", 230, 110, "unique(id) failed"),
        node("transform", "transform", 460, 110, "skipped"),
        node("publish", "publish", 690, 110, "skipped"),
        node("alert", "Alert owners", 460, 250, "lineage: 3 dashboards"),
      ],
      edges: [edge("extract", "validate"), edge("validate", "transform"), edge("transform", "publish"), edge("validate", "alert")],
      steps: [
        step("extract", "", "extract lands the batch in staging."),
        step("validate", "extract-validate", "validate runs the contract: a duplicate id fails an error-level check; freshness only warns."),
        step("transform publish", "validate-transform transform-publish", "Downstream tasks are skipped, so the bad batch never reaches the published table."),
        step("alert", "validate-alert", "Lineage identifies affected dashboards and owners, who get one actionable alert."),
      ],
    },
    practice: [
      {
        id: "w11-dq-design-1",
        type: "design",
        prompt: "Write a data contract for an orders table consumed by finance.",
        answer: "Schema with types and nullability; order_id unique and not null; amount >= 0; currency in an accepted set; created_at not in the future; freshness under 2 hours (warn) and 6 hours (error); row count within 30% of the same weekday last week (warn); owner and escalation path.",
        rubric: ["Schema and keys", "Value rules", "Freshness and volume with severities", "Ownership"],
      },
      {
        id: "w11-dq-recall-1",
        type: "recall",
        prompt: "What is write-audit-publish?",
        answer: "Write the new data to a staging location or branch, run audits on it, and only then atomically publish (swap or merge) it, so consumers never see unaudited data.",
        rubric: ["Staging write", "Audit", "Atomic publish"],
      },
    ],
    references: [
      { title: "Apache Airflow documentation: DAGs and trigger rules", url: "https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dags.html", versionSensitive: true },
      { title: "OpenLineage documentation", url: "https://openlineage.io/docs/", versionSensitive: true },
    ],
    lastReviewed: REVIEWED,
  }),
];

export const week = defineWeek({
  number: 11,
  slug: "data-engineering",
  title: "Data engineering",
  track: "platform",
  domains: ["data-engineering"],
  summary:
    "ETL and ELT, change data capture, file formats, warehouses and lakehouses, Spark shuffles, Kafka and streaming windows, orchestration, data quality and lineage.",
  outcomes: [
    "Keep a warehouse in sync with CDC, correctly ordered and deduplicated",
    "Reason about shuffles, formats and partitioning for performance",
    "Build streaming aggregates with watermarks and quality-gated DAGs",
  ],
  roles: ["data-engineer", "sde", "ml-engineer", "data-scientist"],
  days: [
    {
      id: "w11-d01",
      day: 1,
      kind: "concept-map",
      title: "ETL, ELT and CDC",
      summary: "Snapshots, logs and applying changes exactly once.",
      minutes: 80,
      goals: ["Apply CDC events in LSN order", "Explain ETL versus ELT"],
      tasks: [
        { label: "Concept map and ELI5", minutes: 15 },
        { label: "Run the CDC example and tests", minutes: 30 },
        { label: "Hard deletes and ELT prompts", minutes: 20 },
        { label: "Write the interview answer", minutes: 15 },
      ],
      topicIds: ["w11-d01-etl-elt-cdc"],
    },
    {
      id: "w11-d02",
      day: 2,
      kind: "theory-lab",
      title: "Formats, partitioning and the shuffle",
      summary: "Map, combine, shuffle, reduce, and why Parquet wins for analytics.",
      minutes: 85,
      goals: ["Count shuffle records with and without combining", "Diagnose skew"],
      tasks: [
        { label: "Step through the shuffle diagram", minutes: 15 },
        { label: "Run the word count example", minutes: 30 },
        { label: "Skewed join case", minutes: 25 },
        { label: "Parquet recall prompt", minutes: 15 },
      ],
      topicIds: ["w11-d02-formats-spark-shuffle"],
    },
    {
      id: "w11-d03",
      day: 3,
      kind: "implementation",
      title: "Streaming windows and watermarks",
      summary: "Event time, watermarks and late data in a working simulation.",
      minutes: 90,
      goals: ["Trace every event's fate", "Size a watermark from lateness"],
      tasks: [
        { label: "Read the homework analogy and its limit", minutes: 10 },
        { label: "Run the stream simulation and tests", minutes: 35 },
        { label: "Per-minute revenue design", minutes: 30 },
        { label: "Idle partition recall prompt", minutes: 15 },
      ],
      topicIds: ["w11-d03-streaming-windows"],
    },
    {
      id: "w11-d04",
      day: 4,
      kind: "applied-practice",
      title: "Quality gates and data engineering drills",
      summary: "Contracts and DAG gates, then SQL and pipeline drills.",
      minutes: 90,
      goals: ["Write a data contract", "Solve the pipeline drills"],
      tasks: [
        { label: "Quality gate lesson and example", minutes: 35 },
        { label: "Pipeline and SQL drills", minutes: 40 },
        { label: "Log weak spots", minutes: 15 },
      ],
      topicIds: ["w11-d04-data-quality-orchestration", "w11-d01-etl-elt-cdc", "w11-d02-formats-spark-shuffle", "w11-d03-streaming-windows"],
    },
    {
      id: "w11-d05",
      day: 5,
      kind: "production-lens",
      title: "A silent schema change",
      summary: "Lineage, contracts and incident response when an upstream team changes a column.",
      minutes: 60,
      goals: ["Run a data incident from detection to prevention"],
      tasks: [
        { label: "Read the scenario", minutes: 10 },
        { label: "Answer the case questions", minutes: 35 },
        { label: "Compare against the rubric", minutes: 15 },
      ],
      topicIds: ["w11-d01-etl-elt-cdc", "w11-d04-data-quality-orchestration"],
      productionCase: {
        title: "Revenue dropped 30% overnight, but sales did not",
        scenario:
          "An upstream service changed the amount column from dollars to cents and renamed status values. The nightly ELT loaded fine, every task succeeded, and the CFO's dashboard shows revenue down 30% and a churn model's features shifted overnight.",
        constraints: [
          "Twelve downstream models and dashboards read the orders table.",
          "The upstream team deploys several times a day.",
          "You must restore correct numbers before the morning business review.",
        ],
        questions: [
          "How do you find what changed and who is affected?",
          "What is the fastest safe fix for this morning?",
          "Which checks would have caught it before publish?",
          "How do you stop it from recurring with the upstream team?",
        ],
        rubric: [
          "Uses lineage to list affected assets and compares column distributions before and after",
          "Rolls back to the last good snapshot or applies a documented conversion, then backfills",
          "Distribution and accepted-values checks with error severity on critical columns",
          "A data contract with the producer: schema versioning, CI checks on their side and change notification",
        ],
        pitfalls: ["Patching the dashboard instead of the data", "Adding checks that only warn"],
      },
    },
    {
      id: "w11-d06",
      day: 6,
      kind: "interview-simulation",
      title: "Data engineering interview",
      summary: "A pipeline design question plus timed SQL.",
      minutes: 60,
      goals: ["Design an ingestion pipeline with quality and backfills"],
      tasks: [
        { label: "Timed pipeline design", minutes: 30 },
        { label: "Timed SQL", minutes: 20 },
        { label: "Self-score with the rubric", minutes: 10 },
      ],
      topicIds: ["w11-d01-etl-elt-cdc", "w11-d02-formats-spark-shuffle", "w11-d03-streaming-windows", "w11-d04-data-quality-orchestration"],
    },
    {
      id: "w11-d07",
      day: 7,
      kind: "review",
      title: "Data engineering review",
      summary: "Spaced review across SQL, system design and data engineering.",
      minutes: 45,
      goals: ["Clear due reviews", "Redraw the CDC and streaming diagrams from memory"],
      tasks: [
        { label: "Due reviews", minutes: 25 },
        { label: "Diagrams from memory", minutes: 20 },
      ],
      topicIds: ["w11-d01-etl-elt-cdc", "w11-d02-formats-spark-shuffle", "w11-d03-streaming-windows", "w11-d04-data-quality-orchestration", "w10-d03-replication-queues"],
    },
  ],
});
