import { REVIEWED, code, defineTopic, defineWeek, edge, node, step } from "../helpers";

export const topics = [
  defineTopic({
    id: "w02-d01-joins-and-keys",
    slug: "joins-and-keys",
    title: "Keys, joins and the relational model",
    domain: "sql",
    roles: ["sde", "data-scientist", "data-engineer", "ml-engineer"],
    difficulty: "beginner",
    minutes: 60,
    prerequisites: ["w01-d01-python-r-idioms"],
    objectives: [
      "Predict the row count of inner and left joins before running them",
      "Aggregate after a left join without losing customers that have no orders",
      "Find orphaned foreign keys with an anti-join",
    ],
    summary:
      "Tables connect through keys. Which join you choose decides which rows survive, and most reporting bugs are a join that silently dropped or duplicated rows.",
    eli5: {
      analogy:
        "Two stacks of cards: one card per customer, one card per order with the customer's number written on it. A join pairs every order card with the customer card that has the same number.",
      steps: [
        "Inner join: keep only pairs where both cards exist. A customer with no orders disappears, and so does an order whose customer card is missing.",
        "Left join: keep every customer card. If a customer has no orders, pair it with a blank order card.",
        "Count and add up the order cards for each customer, treating blank cards as zero.",
        "Look for order cards whose number matches no customer: those are orphans.",
      ],
      analogyLimit:
        "Cards pair one-to-one in your head, but a real join pairs every match: a customer with two orders produces two rows, and joining two many-to-many tables multiplies rows. Blank cards are NULLs, and NULL never equals anything, not even another NULL.",
    },
    senior: {
      definition:
        "A join combines rows from two relations where a predicate holds. Primary keys identify a row uniquely; foreign keys reference another table's key. Inner joins keep matching pairs; left outer joins keep every left row and fill missing right columns with NULL.",
      invariants: [
        "customers.id is unique, so joining orders to customers never duplicates order rows.",
        "Row count of a left join is at least the left table's row count; with a unique right key it equals the number of matches plus unmatched left rows.",
        "Aggregates over a nullable side must handle NULL: COUNT(o.id) skips NULLs, COUNT(*) does not.",
      ],
      mechanism: [
        "The engine picks a physical strategy: nested loop (with an index on the join key), hash join (build a hash table on the smaller side) or merge join (both sides sorted on the key).",
        "LEFT JOIN emits each customer once per matching order, or once with NULLs when there is none. GROUP BY then collapses back to one row per customer.",
        "COALESCE(SUM(amount), 0) turns the NULL sum of a customer with no orders into 0.",
        "The anti-join (LEFT JOIN ... WHERE right.key IS NULL) finds rows with no partner, the standard check for broken foreign keys.",
      ],
      complexity:
        "Hash join: O(n + m) expected time, O(min(n, m)) memory. Merge join: O(n log n + m log m) if sorting is needed. Indexed nested loop: O(n log m).",
      tradeoffs: [
        { option: "Inner join", choose: "When unmatched rows are genuinely irrelevant, such as revenue per active customer.", cost: "Silently drops customers with no orders and orders with bad keys." },
        { option: "Left join + COALESCE", choose: "When every entity on the left must appear in the report.", cost: "Must handle NULLs in every aggregate and filter; a WHERE on the right table turns it back into an inner join." },
        { option: "Pre-aggregate, then join", choose: "When the right side is large and many-to-one.", cost: "An extra step, but avoids fan-out duplicates and is usually faster." },
      ],
      failureModes: [
        "Fan-out: joining two one-to-many tables to the same parent multiplies rows and inflates sums.",
        "Filtering the right table in WHERE instead of ON, which removes the NULL rows a left join was meant to keep.",
        "Joining on a non-unique key that you assumed was unique.",
        "Comparing NULL with = in a join condition and losing rows.",
      ],
      production:
        "Most metric discrepancies between two dashboards are join choices. Add tests that assert row counts before and after joins and that foreign keys have no orphans; dbt-style relationship tests do exactly this.",
      interviewAnswer:
        "An inner join keeps only matching pairs; a left join keeps every left row and fills NULLs. To report every customer's total I would left join orders, group by customer, use COUNT(o.id) and COALESCE(SUM(o.amount), 0). I would also check the key is unique on the one side to avoid fan-out, and run an anti-join to find orphaned orders.",
    },
    implementation: {
      problem: "Compare inner and left join row counts, total each customer's orders including customers with none, and count orphaned orders.",
      input: "customers (1 Ada, 2 Grace, 3 Linus, 4 Margaret); orders 101 to 106, where order 106 points at a customer 9 that does not exist",
      python: {
        packages: ["sqlite3"],
        code: code`
          import sqlite3

          con = sqlite3.connect(":memory:")
          con.executescript("""
          CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
          CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer_id INTEGER, amount REAL NOT NULL);
          INSERT INTO customers VALUES (1, 'Ada'), (2, 'Grace'), (3, 'Linus'), (4, 'Margaret');
          INSERT INTO orders VALUES (101, 1, 30.0), (102, 1, 20.5), (103, 2, 99.9),
                                    (104, 3, 15.0), (105, 3, 5.0), (106, 9, 42.0);
          """)


          def scalar(sql: str) -> int:
              return con.execute(sql).fetchone()[0]


          print(f"inner join rows: {scalar('SELECT COUNT(*) FROM customers c JOIN orders o ON o.customer_id = c.id')}")
          print(f"left join rows: {scalar('SELECT COUNT(*) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id')}")

          rows = con.execute("""
          SELECT c.id, c.name, COUNT(o.order_id) AS n_orders, COALESCE(SUM(o.amount), 0) AS total
          FROM customers c
          LEFT JOIN orders o ON o.customer_id = c.id
          GROUP BY c.id, c.name
          ORDER BY c.id
          """).fetchall()
          for cid, name, n_orders, total in rows:
              print(f"{cid} {name} orders={n_orders} total={total:.2f}")

          orphans = scalar("""
          SELECT COUNT(*) FROM orders o
          LEFT JOIN customers c ON c.id = o.customer_id
          WHERE c.id IS NULL
          """)
          print(f"orphan orders: {orphans}")
        `,
      },
      r: {
        code: code`
          customers <- data.frame(id = 1:4, name = c("Ada", "Grace", "Linus", "Margaret"))
          orders <- data.frame(
            order_id = 101:106,
            customer_id = c(1L, 1L, 2L, 3L, 3L, 9L),
            amount = c(30, 20.5, 99.9, 15, 5, 42)
          )

          inner <- merge(customers, orders, by.x = "id", by.y = "customer_id")
          left <- merge(customers, orders, by.x = "id", by.y = "customer_id", all.x = TRUE)
          cat(sprintf("inner join rows: %d\n", nrow(inner)))
          cat(sprintf("left join rows: %d\n", nrow(left)))

          per_customer <- do.call(rbind, lapply(split(left, left$id), function(g) {
            data.frame(
              id = g$id[1],
              name = g$name[1],
              n_orders = sum(!is.na(g$order_id)),
              total = sum(g$amount, na.rm = TRUE)
            )
          }))
          per_customer <- per_customer[order(per_customer$id), ]
          for (i in seq_len(nrow(per_customer))) {
            r <- per_customer[i, ]
            cat(sprintf("%d %s orders=%d total=%.2f\n", r$id, r$name, r$n_orders, r$total))
          }

          orphans <- sum(!(orders$customer_id %in% customers$id))
          cat(sprintf("orphan orders: %d\n", orphans))
        `,
      },
      expectedOutput: code`
        inner join rows: 5
        left join rows: 6
        1 Ada orders=2 total=50.50
        2 Grace orders=1 total=99.90
        3 Linus orders=2 total=20.00
        4 Margaret orders=0 total=0.00
        orphan orders: 1
      `,
      tests: {
        python: code`
          def test_left_join_keeps_every_customer():
              n = scalar("SELECT COUNT(DISTINCT c.id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id")
              assert n == 4


          def test_count_star_counts_null_rows():
              star = scalar("SELECT COUNT(*) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE c.id = 4")
              col = scalar("SELECT COUNT(o.order_id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE c.id = 4")
              assert (star, col) == (1, 0)


          def test_where_on_right_side_turns_left_into_inner():
              n = scalar("SELECT COUNT(*) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.amount > 0")
              assert n == 5
        `,
        r: code`
          test_that("a left join keeps every customer", {
            expect_setequal(unique(left$id), 1:4)
          })

          test_that("a customer with no orders gets one row of NAs", {
            m <- left[left$id == 4, ]
            expect_equal(nrow(m), 1L)
            expect_true(is.na(m$order_id))
          })

          test_that("totals match the SQL version", {
            expect_equal(per_customer$total, c(50.5, 99.9, 20, 0))
          })
        `,
      },
      eli5Trace: [
        "Inner join: Ada has 2 orders, Grace 1, Linus 2, Margaret 0, and order 106 has no customer. 2 + 1 + 2 = 5 rows.",
        "Left join: the same 5 rows plus one row for Margaret with blanks, 6 rows.",
        "Group by customer: Ada 30 + 20.5 = 50.50, Grace 99.90, Linus 15 + 5 = 20.00, Margaret 0.",
        "Anti-join: order 106 points at customer 9, who does not exist, so there is 1 orphan.",
      ],
      complexity: { time: "O(n + m) with a hash join", space: "O(min(n, m))", note: "n customers, m orders" },
      edgeCases: [
        "A customer with no orders: COUNT(o.order_id) is 0 and SUM is NULL until COALESCE turns it into 0.",
        "An order whose customer was deleted: invisible to both joins from customers, found by the anti-join.",
        "Duplicate customer ids would double every order total. Enforce uniqueness with a primary key.",
        "R's merge() sorts by the key by default; SQL needs an explicit ORDER BY.",
      ],
      incorrect: {
        language: "sql",
        code: code`
          SELECT c.id, c.name, COUNT(*) AS n_orders, SUM(o.amount) AS total
          FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
          GROUP BY c.id, c.name
        `,
        whyWrong: "COUNT(*) counts Margaret's NULL row as one order, and SUM returns NULL for her instead of 0.",
        fix: "Count a column from the right table, COUNT(o.order_id), and wrap the sum in COALESCE(..., 0).",
      },
    },
    flow: {
      title: "Which rows survive each join",
      nodes: [
        node("customers", "customers", 0, 40, "4 rows, id unique"),
        node("orders", "orders", 0, 200, "6 rows, customer_id"),
        node("inner", "INNER JOIN", 300, 0, "5 matched pairs"),
        node("left", "LEFT JOIN", 300, 120, "6 rows, 1 NULL"),
        node("anti", "Anti-join", 300, 240, "orders without customer"),
        node("agg", "GROUP BY customer", 600, 120, "COUNT(o.id), COALESCE(SUM)"),
        node("report", "Report", 860, 120, "4 customers, 1 orphan"),
      ],
      edges: [
        edge("customers", "inner"),
        edge("orders", "inner"),
        edge("customers", "left"),
        edge("orders", "left"),
        edge("orders", "anti"),
        edge("left", "agg"),
        edge("agg", "report"),
        edge("anti", "report"),
      ],
      steps: [
        step("customers orders inner", "customers-inner orders-inner", "An inner join keeps the 5 orders whose customer exists. Margaret and order 106 both disappear."),
        step("customers orders left", "customers-left orders-left", "A left join keeps all 4 customers. Margaret appears once with NULL order columns, giving 6 rows."),
        step("left agg", "left-agg", "Group by customer. COUNT(o.order_id) skips the NULL and COALESCE turns Margaret's NULL sum into 0."),
        step("orders anti", "orders-anti", "The anti-join finds order 106, whose customer_id 9 matches nobody."),
        step("agg anti report", "agg-report anti-report", "The report shows every customer and flags 1 orphaned order for the data owners."),
      ],
    },
    practice: [
      {
        id: "w02-joins-recall-1",
        type: "recall",
        prompt: "A query uses LEFT JOIN orders o and then WHERE o.status = 'paid'. What happens to customers with no orders, and how do you fix it?",
        answer: "They are removed, because NULL = 'paid' is not true; the left join behaves like an inner join. Move the condition into the ON clause or use a filtered subquery.",
        rubric: ["NULL comparison is not true", "Move to ON or a subquery"],
      },
      {
        id: "w02-joins-code-1",
        type: "code",
        prompt: "Write SQL that returns customers who have never placed an order.",
        answer: "SELECT c.* FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.order_id IS NULL; or WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id).",
        rubric: ["Anti-join or NOT EXISTS", "Tests the right key for NULL"],
      },
      {
        id: "w02-joins-case-1",
        type: "case",
        prompt: "Revenue in a dashboard doubled overnight after someone joined a promotions table to orders. What is the likely cause?",
        answer: "Fan-out: promotions is many-to-one or many-to-many with orders, so each order repeats once per matching promotion and SUM(amount) counts it several times. Pre-aggregate promotions per order or join on a unique key.",
        rubric: ["Names fan-out or duplication", "Explains the key is not unique", "Pre-aggregate or dedupe"],
      },
    ],
    references: [
      { title: "SQLite documentation: SELECT and join operators", url: "https://www.sqlite.org/lang_select.html", versionSensitive: false },
      { title: "PostgreSQL documentation: joins between tables", url: "https://www.postgresql.org/docs/current/tutorial-join.html", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w02-d02-window-functions",
    slug: "window-functions",
    title: "Window functions and CTEs",
    domain: "sql",
    roles: ["sde", "data-scientist", "data-engineer"],
    difficulty: "intermediate",
    minutes: 70,
    prerequisites: ["w02-d01-joins-and-keys"],
    objectives: [
      "Compute running totals and ranks without collapsing rows",
      "Explain PARTITION BY, ORDER BY and the default window frame",
      "Use a CTE to name an intermediate result and filter on a window value",
    ],
    summary:
      "Window functions compute values across related rows while keeping every row. They answer 'running total', 'rank within group' and 'top N per group' questions that GROUP BY cannot.",
    eli5: {
      analogy:
        "A class lines up by height inside each team. Every kid keeps their own place in line, but each kid can also say 'I am the 2nd tallest on my team' or 'the team's heights add up to this much, counting me and everyone before me'.",
      steps: [
        "Split the line into teams (PARTITION BY customer).",
        "Inside each team, order the kids (ORDER BY day, or by amount for ranking).",
        "Each kid looks at the kids ahead of them in their own team and adds up, or counts how many are bigger.",
        "Nobody leaves the line, so you still have one row per order.",
      ],
      analogyLimit:
        "In real SQL the 'kids ahead of me' depend on the window frame. With ORDER BY the default frame includes every row with the same order value (peers), so two orders on the same day share one running total unless you specify ROWS BETWEEN.",
    },
    senior: {
      definition:
        "A window function computes f over a window of rows related to the current row, defined by PARTITION BY (which rows), ORDER BY (in what order) and a frame (which slice). Unlike GROUP BY, it does not collapse rows.",
      invariants: [
        "Window functions run after WHERE, GROUP BY and HAVING, and before the final ORDER BY and LIMIT.",
        "You cannot reference a window result in WHERE; wrap it in a CTE or subquery and filter outside.",
        "With ORDER BY and no frame clause, the default frame is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW, which includes peers.",
      ],
      mechanism: [
        "The engine sorts (or hashes then sorts) by the partition keys and the order keys, then streams each partition once.",
        "SUM() OVER (PARTITION BY customer ORDER BY day) keeps an accumulator per partition and emits it per row.",
        "RANK() assigns 1 + the number of rows strictly ahead, so ties share a rank and leave gaps; DENSE_RANK has no gaps; ROW_NUMBER breaks ties arbitrarily unless the order is total.",
        "The CTE (WITH ranked AS ...) names the windowed result so the outer query can filter amount_rank = 1.",
      ],
      complexity: "O(n log n) for the sort per partition set, then O(n) to stream. Memory depends on the frame; running aggregates need O(1) per partition.",
      tradeoffs: [
        { option: "Window function", choose: "Running totals, ranks, lags and top N per group in one pass.", cost: "Needs a sort; large partitions can spill to disk." },
        { option: "Self-join or correlated subquery", choose: "Only on engines without window support.", cost: "O(n^2) behavior and harder to read." },
        { option: "Pre-aggregated table", choose: "Dashboards that query the same running total constantly.", cost: "Storage and freshness lag; must be rebuilt when history changes." },
      ],
      failureModes: [
        "Using ROW_NUMBER for 'top 1 per group' with ties and getting a random winner.",
        "Forgetting PARTITION BY and computing one running total across all customers.",
        "Relying on the default RANGE frame when duplicate order keys exist, so running totals jump.",
        "Filtering on a window alias in WHERE, which is a syntax error.",
      ],
      production:
        "Window queries over big fact tables are sort-heavy. Cluster or partition the table on the partition key and order key, and push filters into the CTE so less data is sorted.",
      interviewAnswer:
        "I use SUM() OVER (PARTITION BY customer ORDER BY day) for the running total and RANK() OVER (PARTITION BY customer ORDER BY amount DESC) for the rank, inside a CTE, then filter rank = 1 outside because window results cannot be used in WHERE. I would choose RANK or ROW_NUMBER based on how ties should behave, and specify ROWS frames when order keys can repeat.",
    },
    implementation: {
      problem: "For each customer, compute the running total of order amounts by day and rank orders by amount, then list each customer's top order.",
      input: "orders: Ada 2026-01-01 30, Ada 2026-01-03 20, Ada 2026-01-07 50, Grace 2026-01-02 99, Grace 2026-01-05 10, Linus 2026-01-04 15",
      python: {
        packages: ["sqlite3"],
        code: code`
          import sqlite3

          con = sqlite3.connect(":memory:")
          con.executescript("""
          CREATE TABLE orders (order_id INTEGER PRIMARY KEY, customer TEXT, day TEXT, amount INTEGER);
          INSERT INTO orders VALUES
            (1, 'Ada', '2026-01-01', 30), (2, 'Ada', '2026-01-03', 20), (3, 'Ada', '2026-01-07', 50),
            (4, 'Grace', '2026-01-02', 99), (5, 'Grace', '2026-01-05', 10), (6, 'Linus', '2026-01-04', 15);
          """)

          WINDOWED = """
          WITH ranked AS (
            SELECT customer, day, amount,
                   SUM(amount) OVER (PARTITION BY customer ORDER BY day) AS running_total,
                   RANK() OVER (PARTITION BY customer ORDER BY amount DESC) AS amount_rank
            FROM orders
          )
          """

          for customer, day, amount, running, rank in con.execute(
              WINDOWED + "SELECT * FROM ranked ORDER BY customer, day"
          ):
              print(f"{customer} {day} amount={amount} running={running} rank={rank}")

          top = con.execute(WINDOWED + "SELECT customer, amount FROM ranked WHERE amount_rank = 1 ORDER BY customer").fetchall()
          print("top orders: " + ", ".join(f"{c} {a}" for c, a in top))
        `,
      },
      r: {
        code: code`
          orders <- data.frame(
            customer = c("Ada", "Ada", "Ada", "Grace", "Grace", "Linus"),
            day = c("2026-01-01", "2026-01-03", "2026-01-07", "2026-01-02", "2026-01-05", "2026-01-04"),
            amount = c(30L, 20L, 50L, 99L, 10L, 15L)
          )

          ranked <- orders[order(orders$customer, orders$day), ]
          ranked$running <- ave(ranked$amount, ranked$customer, FUN = cumsum)
          ranked$rank <- ave(-ranked$amount, ranked$customer, FUN = function(x) rank(x, ties.method = "min"))

          for (i in seq_len(nrow(ranked))) {
            r <- ranked[i, ]
            cat(sprintf("%s %s amount=%d running=%d rank=%d\n", r$customer, r$day, r$amount, r$running, as.integer(r$rank)))
          }

          top <- ranked[ranked$rank == 1, ]
          top <- top[order(top$customer), ]
          cat("top orders: ", paste(sprintf("%s %d", top$customer, top$amount), collapse = ", "), "\n", sep = "")
        `,
      },
      expectedOutput: code`
        Ada 2026-01-01 amount=30 running=30 rank=2
        Ada 2026-01-03 amount=20 running=50 rank=3
        Ada 2026-01-07 amount=50 running=100 rank=1
        Grace 2026-01-02 amount=99 running=99 rank=1
        Grace 2026-01-05 amount=10 running=109 rank=2
        Linus 2026-01-04 amount=15 running=15 rank=1
        top orders: Ada 50, Grace 99, Linus 15
      `,
      tests: {
        python: code`
          def test_running_total_resets_per_customer():
              rows = con.execute(WINDOWED + "SELECT customer, running_total FROM ranked WHERE customer = 'Grace' ORDER BY day").fetchall()
              assert [r for _, r in rows] == [99, 109]


          def test_rank_shares_ties():
              con.execute("INSERT INTO orders VALUES (7, 'Linus', '2026-01-09', 15)")
              ranks = [r for (r,) in con.execute(WINDOWED + "SELECT amount_rank FROM ranked WHERE customer = 'Linus'")]
              con.execute("DELETE FROM orders WHERE order_id = 7")
              assert sorted(ranks) == [1, 1]
        `,
        r: code`
          test_that("the running total resets per customer", {
            expect_equal(ranked$running[ranked$customer == "Grace"], c(99L, 109L))
          })

          test_that("min ties share a rank like SQL RANK()", {
            expect_equal(rank(-c(15, 15), ties.method = "min"), c(1, 1))
          })

          test_that("every customer has exactly one top order here", {
            expect_equal(nrow(top), 3L)
          })
        `,
      },
      eli5Trace: [
        "Split the orders into Ada, Grace and Linus, and order each group by day.",
        "Ada's running total: 30, then 30 + 20 = 50, then 50 + 50 = 100.",
        "Rank Ada's orders by amount: 50 is 1st, 30 is 2nd, 20 is 3rd.",
        "Grace: running 99 then 109, ranks 1 and 2. Linus has one order, rank 1.",
        "Keep rank 1 per customer: Ada 50, Grace 99, Linus 15.",
      ],
      complexity: { time: "O(n log n)", space: "O(n)", note: "dominated by the sort on (customer, day)" },
      edgeCases: [
        "Two orders on the same day: the default RANGE frame gives both the same running total.",
        "Ties in amount: RANK gives both rank 1, so 'top order' returns two rows.",
        "A customer with one order has running total equal to the amount and rank 1.",
        "R's ave() returns doubles for rank(); convert before printing with %d.",
      ],
      incorrect: {
        language: "sql",
        code: code`
          SELECT customer, amount,
                 RANK() OVER (PARTITION BY customer ORDER BY amount DESC) AS amount_rank
          FROM orders
          WHERE amount_rank = 1
        `,
        whyWrong: "WHERE runs before window functions, so amount_rank does not exist yet and the query fails.",
        fix: "Compute the rank in a CTE or subquery, then filter amount_rank = 1 in the outer query.",
      },
    },
    flow: {
      title: "PARTITION BY, ORDER BY, then compute",
      nodes: [
        node("rows", "orders", 0, 110, "6 rows"),
        node("part", "PARTITION BY customer", 230, 110, "Ada | Grace | Linus"),
        node("order", "ORDER BY day", 470, 40, "within each partition"),
        node("sum", "SUM() OVER", 700, 40, "running total"),
        node("rank", "RANK() OVER", 700, 180, "ORDER BY amount DESC"),
        node("cte", "CTE ranked", 920, 110, "filter rank = 1 outside"),
      ],
      edges: [edge("rows", "part"), edge("part", "order"), edge("order", "sum"), edge("part", "rank"), edge("sum", "cte"), edge("rank", "cte")],
      steps: [
        step("rows part", "rows-part", "Rows are grouped into partitions by customer, but nothing is collapsed."),
        step("part order", "part-order", "Inside each partition, rows are ordered by day."),
        step("order sum", "order-sum", "SUM streams through each partition: Ada 30, 50, 100. It resets for Grace: 99, 109."),
        step("part rank", "part-rank", "RANK orders each partition by amount descending: Ada's 50 is 1, 30 is 2, 20 is 3."),
        step("sum rank cte", "sum-cte rank-cte", "The CTE names this result so the outer query can keep amount_rank = 1."),
      ],
    },
    practice: [
      {
        id: "w02-window-recall-1",
        type: "recall",
        prompt: "What is the difference between RANK, DENSE_RANK and ROW_NUMBER for amounts 50, 30, 30, 20?",
        answer: "RANK: 1, 2, 2, 4. DENSE_RANK: 1, 2, 2, 3. ROW_NUMBER: 1, 2, 3, 4 with an arbitrary order between the two 30s unless the ORDER BY is made total.",
        rubric: ["RANK leaves a gap", "DENSE_RANK has no gap", "ROW_NUMBER is arbitrary on ties"],
      },
      {
        id: "w02-window-code-1",
        type: "code",
        prompt: "Write SQL for each customer's days since their previous order.",
        answer: "julianday(day) - julianday(LAG(day) OVER (PARTITION BY customer ORDER BY day)); the first order per customer returns NULL.",
        rubric: ["Uses LAG with PARTITION BY", "Handles the first order as NULL"],
      },
      {
        id: "w02-window-recall-2",
        type: "recall",
        prompt: "Why can't you write WHERE amount_rank = 1 in the same SELECT that defines amount_rank?",
        answer: "Logical query order: FROM, WHERE, GROUP BY, HAVING, window functions, SELECT, ORDER BY. WHERE runs before the window value exists.",
        rubric: ["States the evaluation order", "Proposes a CTE or subquery"],
      },
    ],
    references: [
      { title: "SQLite documentation: window functions", url: "https://www.sqlite.org/windowfunctions.html", versionSensitive: false },
      { title: "PostgreSQL documentation: window functions tutorial", url: "https://www.postgresql.org/docs/current/tutorial-window.html", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w02-d03-scd2-dimensions",
    slug: "scd2-dimensions",
    title: "Star schemas and SCD Type 2",
    domain: "sql",
    roles: ["data-engineer", "data-scientist", "sde"],
    difficulty: "intermediate",
    minutes: 75,
    prerequisites: ["w02-d01-joins-and-keys"],
    objectives: [
      "Explain facts, dimensions and surrogate keys in a star schema",
      "Apply a batch of attribute changes as SCD Type 2 rows",
      "Answer a point-in-time question from a versioned dimension",
    ],
    summary:
      "Analytical warehouses separate facts (events with numbers) from dimensions (descriptions). Slowly changing dimension Type 2 keeps history by closing old rows and opening new ones, so past facts still join to the description that was true at the time.",
    eli5: {
      analogy:
        "A school keeps a card for each student's address. When a student moves, the school does not erase the old card. It stamps it 'valid until today' and writes a new card 'valid from today'.",
      steps: [
        "Look at each change in today's batch.",
        "If the address is the same as the current card, do nothing.",
        "If it changed, stamp the current card with today's date as its end and mark it old.",
        "Write a new card with the new address, valid from today with no end yet.",
        "To know where a student lived on any date, find the card whose dates cover that day.",
      ],
      analogyLimit:
        "Real warehouses also deal with corrections to the past, late-arriving changes and many attributes changing at once. Choosing which attributes create a new version (Type 2) and which simply overwrite (Type 1) is a business decision the cards cannot make for you.",
    },
    senior: {
      definition:
        "In a star schema, a fact table holds measures at a declared grain with foreign keys to dimension tables. SCD Type 2 versions a dimension row on change: each version has a surrogate key, the natural key, attributes, valid_from, valid_to and an is_current flag.",
      invariants: [
        "For each natural key, validity intervals [valid_from, valid_to) do not overlap and have no gaps after the first version.",
        "Exactly one row per natural key has is_current = true and the open end date 9999-12-31.",
        "Facts store the surrogate key that was current when the event happened, so history joins stay correct.",
      ],
      mechanism: [
        "Compare incoming records to current rows on the natural key.",
        "Unchanged: skip. Changed: set valid_to = as_of and is_current = false on the old row, then insert a new row with a new surrogate key. New key: insert.",
        "Point-in-time lookup: valid_from <= day < valid_to, using a half-open interval so the change date belongs to the new version only.",
        "In SQL engines this is a MERGE statement or a pair of UPDATE and INSERT in one transaction, so readers never see two current rows.",
      ],
      complexity: "O(n + c) per batch with a hash lookup on the natural key, for n current rows and c changes. Storage grows with the number of changes, not the number of customers.",
      tradeoffs: [
        { option: "SCD Type 1 (overwrite)", choose: "Corrections, or attributes nobody analyzes historically.", cost: "History is lost; old reports change when rerun." },
        { option: "SCD Type 2 (versioned rows)", choose: "Attributes that segment metrics over time, such as region or plan.", cost: "More rows, surrogate keys, and every join must respect validity." },
        { option: "Snapshot tables", choose: "Small dimensions or audit needs where a full daily copy is cheap.", cost: "Storage grows with days times rows; changes are implicit." },
      ],
      failureModes: [
        "Closed intervals (valid_to inclusive) so a fact on the change date matches two versions.",
        "Two current rows for one key after a partial failure between UPDATE and INSERT.",
        "Joining facts on the natural key instead of the surrogate key, which attributes old sales to the new city.",
        "Detecting changes with string comparison that treats whitespace or case changes as real changes.",
      ],
      production:
        "Most teams implement Type 2 with MERGE in the warehouse or with dbt snapshots. Add tests: one current row per key, no overlapping intervals, and every fact's surrogate key exists.",
      interviewAnswer:
        "A star schema keeps measures in facts and descriptions in dimensions. For attributes where history matters I use SCD Type 2: on change I close the current row with valid_to and add a new row with a new surrogate key, inside one transaction. Facts store the surrogate key current at event time, and point-in-time queries use valid_from <= t < valid_to.",
    },
    implementation: {
      problem: "Apply a batch of customer city changes to a Type 2 dimension, then answer where customer C1 lived on two dates.",
      input: "dimension: C1 Austin, C2 Boston (both since 2025-01-01); batch on 2026-03-01: C1 Denver, C2 Boston, C3 Chicago",
      python: {
        code: code`
          from dataclasses import dataclass, replace

          OPEN_END = "9999-12-31"


          @dataclass
          class Row:
              key: int
              customer_id: str
              city: str
              valid_from: str
              valid_to: str
              is_current: bool


          def apply_scd2(dim: list[Row], changes: dict[str, str], as_of: str) -> list[Row]:
              out = [replace(r) for r in dim]
              next_key = max((r.key for r in out), default=0) + 1
              current = {r.customer_id: r for r in out if r.is_current}
              for customer_id, city in sorted(changes.items()):
                  row = current.get(customer_id)
                  if row is not None and row.city == city:
                      continue
                  if row is not None:
                      row.valid_to = as_of
                      row.is_current = False
                  out.append(Row(next_key, customer_id, city, as_of, OPEN_END, True))
                  next_key += 1
              return out


          def city_on(dim: list[Row], customer_id: str, day: str) -> str | None:
              for r in dim:
                  if r.customer_id == customer_id and r.valid_from <= day < r.valid_to:
                      return r.city
              return None


          dim = [
              Row(1, "C1", "Austin", "2025-01-01", OPEN_END, True),
              Row(2, "C2", "Boston", "2025-01-01", OPEN_END, True),
          ]
          dim = apply_scd2(dim, {"C1": "Denver", "C2": "Boston", "C3": "Chicago"}, "2026-03-01")
          for r in dim:
              print(f"{r.key} {r.customer_id} {r.city} {r.valid_from} {r.valid_to} current={int(r.is_current)}")
          print(f"C1 on 2025-06-30: {city_on(dim, 'C1', '2025-06-30')}")
          print(f"C1 on 2026-06-30: {city_on(dim, 'C1', '2026-06-30')}")
        `,
      },
      r: {
        code: code`
          OPEN_END <- "9999-12-31"

          apply_scd2 <- function(dim, changes, as_of) {
            next_key <- max(c(0L, dim$key)) + 1L
            for (customer_id in sort(names(changes))) {
              city <- changes[[customer_id]]
              cur <- which(dim$customer_id == customer_id & dim$is_current)
              if (length(cur) == 1 && dim$city[cur] == city) next
              if (length(cur) == 1) {
                dim$valid_to[cur] <- as_of
                dim$is_current[cur] <- FALSE
              }
              dim <- rbind(dim, data.frame(
                key = next_key, customer_id = customer_id, city = city,
                valid_from = as_of, valid_to = OPEN_END, is_current = TRUE
              ))
              next_key <- next_key + 1L
            }
            dim
          }

          city_on <- function(dim, customer_id, day) {
            hit <- dim$customer_id == customer_id & dim$valid_from <= day & day < dim$valid_to
            if (any(hit)) dim$city[hit][1] else NA_character_
          }

          dim <- data.frame(
            key = 1:2, customer_id = c("C1", "C2"), city = c("Austin", "Boston"),
            valid_from = "2025-01-01", valid_to = OPEN_END, is_current = TRUE
          )
          dim <- apply_scd2(dim, list(C1 = "Denver", C2 = "Boston", C3 = "Chicago"), "2026-03-01")
          for (i in seq_len(nrow(dim))) {
            r <- dim[i, ]
            cat(sprintf("%d %s %s %s %s current=%d\n", r$key, r$customer_id, r$city, r$valid_from, r$valid_to, as.integer(r$is_current)))
          }
          cat(sprintf("C1 on 2025-06-30: %s\n", city_on(dim, "C1", "2025-06-30")))
          cat(sprintf("C1 on 2026-06-30: %s\n", city_on(dim, "C1", "2026-06-30")))
        `,
      },
      expectedOutput: code`
        1 C1 Austin 2025-01-01 2026-03-01 current=0
        2 C2 Boston 2025-01-01 9999-12-31 current=1
        3 C1 Denver 2026-03-01 9999-12-31 current=1
        4 C3 Chicago 2026-03-01 9999-12-31 current=1
        C1 on 2025-06-30: Austin
        C1 on 2026-06-30: Denver
      `,
      tests: {
        python: code`
          def test_one_current_row_per_customer():
              current = [r.customer_id for r in dim if r.is_current]
              assert sorted(current) == ["C1", "C2", "C3"]


          def test_unchanged_record_is_untouched():
              c2 = [r for r in dim if r.customer_id == "C2"]
              assert len(c2) == 1 and c2[0].valid_to == OPEN_END


          def test_change_date_belongs_to_new_version():
              assert city_on(dim, "C1", "2026-03-01") == "Denver"


          def test_reapplying_the_batch_is_idempotent():
              again = apply_scd2(dim, {"C1": "Denver", "C2": "Boston", "C3": "Chicago"}, "2026-03-02")
              assert len(again) == len(dim)
        `,
        r: code`
          test_that("there is one current row per customer", {
            expect_setequal(dim$customer_id[dim$is_current], c("C1", "C2", "C3"))
            expect_equal(sum(dim$is_current), 3L)
          })

          test_that("the unchanged record is untouched", {
            expect_equal(sum(dim$customer_id == "C2"), 1L)
          })

          test_that("the change date belongs to the new version", {
            expect_identical(city_on(dim, "C1", "2026-03-01"), "Denver")
          })

          test_that("reapplying the batch is idempotent", {
            again <- apply_scd2(dim, list(C1 = "Denver", C2 = "Boston", C3 = "Chicago"), "2026-03-02")
            expect_equal(nrow(again), nrow(dim))
          })
        `,
      },
      eli5Trace: [
        "C1's current card says Austin, but the batch says Denver: stamp the Austin card 'until 2026-03-01' and mark it old.",
        "Write card 3: C1 Denver, valid from 2026-03-01, open end.",
        "C2 still says Boston, so nothing changes.",
        "C3 is new, so write card 4: C3 Chicago from 2026-03-01.",
        "On 2025-06-30 only the Austin card covers that day; on 2026-06-30 the Denver card does.",
      ],
      complexity: { time: "O(n + c)", space: "O(n + c)", note: "n dimension rows, c incoming changes" },
      edgeCases: [
        "A change on the same day as the previous one produces a zero-length interval; most pipelines reject or merge it.",
        "Reapplying the same batch must not create duplicate versions, which is why unchanged records are skipped.",
        "A customer missing from the batch is not a deletion; deletes need an explicit soft-delete flag.",
        "ISO date strings compare correctly as text, but only in YYYY-MM-DD form.",
      ],
      incorrect: {
        language: "python",
        code: code`
          if r.customer_id == customer_id and r.valid_from <= day <= r.valid_to:
              return r.city
        `,
        whyWrong: "With an inclusive end date, the change date 2026-03-01 matches both the Austin and the Denver rows, and the lookup returns whichever comes first.",
        fix: "Use half-open intervals: valid_from <= day < valid_to.",
      },
    },
    flow: {
      title: "Applying one SCD Type 2 change",
      nodes: [
        node("batch", "Incoming batch", 0, 110, "C1 Denver, C2 Boston, C3 Chicago"),
        node("compare", "Compare on natural key", 260, 110, "current rows only"),
        node("skip", "Unchanged", 520, 0, "C2: skip"),
        node("close", "Close old row", 520, 110, "C1 Austin valid_to 2026-03-01"),
        node("insert", "Insert new rows", 520, 220, "C1 Denver, C3 Chicago"),
        node("dim", "Dimension", 800, 110, "4 rows, 3 current"),
      ],
      edges: [edge("batch", "compare"), edge("compare", "skip"), edge("compare", "close"), edge("close", "insert"), edge("compare", "insert"), edge("insert", "dim"), edge("skip", "dim")],
      steps: [
        step("batch compare", "batch-compare", "Each incoming record is matched to the current dimension row with the same customer id."),
        step("compare skip", "compare-skip", "C2 still lives in Boston, so nothing is written. Reruns stay idempotent."),
        step("compare close", "compare-close", "C1 moved: the Austin row gets valid_to = 2026-03-01 and is_current = false."),
        step("close insert compare", "close-insert compare-insert", "Insert C1 Denver with a new surrogate key, and C3 Chicago as a brand-new customer."),
        step("insert skip dim", "insert-dim skip-dim", "The dimension now has 4 rows and exactly one current row per customer."),
      ],
    },
    practice: [
      {
        id: "w02-scd2-recall-1",
        type: "recall",
        prompt: "Why do facts store the surrogate key rather than the natural customer id?",
        answer: "So each fact joins to the dimension version that was current when it happened. Joining on the natural key would attach old sales to the customer's current city.",
        rubric: ["Point-in-time correctness", "Natural key join reattributes history"],
      },
      {
        id: "w02-scd2-design-1",
        type: "design",
        prompt: "Design the star schema for an online store's orders: name the fact grain, two dimensions, and which customer attributes are Type 1 versus Type 2.",
        answer:
          "Fact: one row per order line with quantity, price, discount and keys to date, product and customer. Dimensions: customer, product, date. Type 2: region and loyalty tier (they segment revenue over time). Type 1: email and name spelling corrections.",
        rubric: ["Declares the grain explicitly", "Names at least two dimensions", "Justifies Type 1 vs Type 2 per attribute"],
      },
    ],
    references: [
      { title: "The Data Warehouse Toolkit, 3rd edition (Kimball and Ross)", versionSensitive: false },
      { title: "dbt documentation: snapshots", url: "https://docs.getdbt.com/docs/build/snapshots", versionSensitive: true },
    ],
    lastReviewed: REVIEWED,
  }),
];

export const week = defineWeek({
  number: 2,
  slug: "sql-and-data-modeling",
  title: "SQL and data modeling",
  track: "core",
  domains: ["sql"],
  summary:
    "Write joins, CTEs and window functions you can defend, and model data for analytics with star schemas and history-preserving dimensions. Production lens: transactions, indexes and OLTP versus OLAP.",
  outcomes: [
    "Predict join row counts and avoid fan-out",
    "Answer ranking and running-total questions with window functions",
    "Design a star schema with SCD Type 2 dimensions",
  ],
  roles: ["sde", "data-scientist", "data-engineer", "ml-engineer"],
  days: [
    {
      id: "w02-d01",
      day: 1,
      kind: "concept-map",
      title: "Keys, joins and the relational model",
      summary: "How keys connect tables and which rows each join keeps.",
      minutes: 75,
      goals: ["Predict row counts for inner and left joins", "Find orphans with an anti-join"],
      tasks: [
        { label: "Step through the join diagram", minutes: 15 },
        { label: "Run the paired SQL and R examples", minutes: 25 },
        { label: "Write the never-ordered query", minutes: 20 },
        { label: "Recall and case prompts", minutes: 15 },
      ],
      topicIds: ["w02-d01-joins-and-keys"],
    },
    {
      id: "w02-d02",
      day: 2,
      kind: "theory-lab",
      title: "Window functions and CTEs",
      summary: "Running totals, ranks and top N per group without collapsing rows.",
      minutes: 80,
      goals: ["Explain partition, order and frame", "Filter on a window result with a CTE"],
      tasks: [
        { label: "Read the Senior mechanism on frames", minutes: 15 },
        { label: "Run and extend the window query", minutes: 30 },
        { label: "Write a LAG query for days between orders", minutes: 20 },
        { label: "Recall prompts", minutes: 15 },
      ],
      topicIds: ["w02-d02-window-functions"],
    },
    {
      id: "w02-d03",
      day: 3,
      kind: "implementation",
      title: "Star schemas and SCD Type 2",
      summary: "Version a dimension so history stays correct.",
      minutes: 90,
      goals: ["Implement SCD2 in both languages", "Answer a point-in-time question"],
      tasks: [
        { label: "Read the star schema explanation", minutes: 15 },
        { label: "Run the SCD2 example and its tests", minutes: 30 },
        { label: "Add a soft-delete flag and a test for it", minutes: 30 },
        { label: "Design prompt: store schema", minutes: 15 },
      ],
      topicIds: ["w02-d03-scd2-dimensions"],
    },
    {
      id: "w02-d04",
      day: 4,
      kind: "applied-practice",
      title: "SQL drills",
      summary: "Timed SQL drills on joins, windows and modeling, run against a real in-browser database.",
      minutes: 75,
      goals: ["Solve each SQL drill before checking the result", "Explain every row count you produce"],
      tasks: [
        { label: "SQL drills in the Practice workspace", minutes: 45 },
        { label: "Topic drills with confidence ratings", minutes: 20 },
        { label: "Log weak spots", minutes: 10 },
      ],
      topicIds: ["w02-d01-joins-and-keys", "w02-d02-window-functions", "w02-d03-scd2-dimensions"],
    },
    {
      id: "w02-d05",
      day: 5,
      kind: "production-lens",
      title: "The dashboard query that got slow",
      summary: "OLTP versus OLAP, indexes, transactions and where analytics queries should run.",
      minutes: 60,
      goals: ["Choose between an index, a replica and a warehouse for an analytics query"],
      tasks: [
        { label: "Read the scenario", minutes: 10 },
        { label: "Answer the case questions", minutes: 35 },
        { label: "Compare against the rubric", minutes: 15 },
      ],
      topicIds: ["w02-d01-joins-and-keys", "w02-d03-scd2-dimensions"],
      productionCase: {
        title: "A revenue dashboard is slowing down checkout",
        scenario:
          "A revenue dashboard runs a 30-second query with joins and window functions directly against the production Postgres database every minute. Checkout latency spikes whenever it runs, and the finance team says last quarter's revenue by region changed after customers moved.",
        constraints: [
          "Checkout must keep its p99 latency under 300 ms.",
          "Finance needs numbers that do not change when customers move.",
          "The data team has a cloud warehouse but no streaming pipeline yet.",
        ],
        questions: [
          "Why does an analytics query hurt an OLTP workload, and what are your options?",
          "Would an index fix this? Which one, and what would it cost writes?",
          "How do you make regional revenue stable over time?",
          "What isolation level does the dashboard need, and why?",
        ],
        rubric: [
          "Separates OLTP (many small transactions) from OLAP (large scans) and moves the query off the primary",
          "Discusses a read replica or warehouse load with a freshness trade-off",
          "Evaluates a composite index on the filter and join keys and its write cost",
          "Uses an SCD Type 2 customer dimension with surrogate keys in facts",
          "Explains snapshot isolation or a consistent extract for repeatable numbers",
        ],
        pitfalls: ["Adding indexes until checkout writes slow down", "Overwriting customer region in place (Type 1) and silently rewriting history"],
      },
    },
    {
      id: "w02-d06",
      day: 6,
      kind: "interview-simulation",
      title: "SQL interview round",
      summary: "A timed round of SQL questions explained out loud: joins, windows and modeling.",
      minutes: 50,
      goals: ["Say the row count before running each query", "Finish within the time box"],
      tasks: [
        { label: "Timed SQL questions", minutes: 30 },
        { label: "Modeling question", minutes: 10 },
        { label: "Self-score with the rubric", minutes: 10 },
      ],
      topicIds: ["w02-d01-joins-and-keys", "w02-d02-window-functions", "w02-d03-scd2-dimensions"],
    },
    {
      id: "w02-d07",
      day: 7,
      kind: "review",
      title: "SQL review",
      summary: "Spaced review of joins, windows and SCD2, plus remediation on missed drills.",
      minutes: 45,
      goals: ["Clear due reviews", "Redo every drill you missed"],
      tasks: [
        { label: "Due reviews", minutes: 20 },
        { label: "Redo missed drills", minutes: 25 },
      ],
      topicIds: ["w02-d01-joins-and-keys", "w02-d02-window-functions", "w02-d03-scd2-dimensions"],
    },
  ],
});
