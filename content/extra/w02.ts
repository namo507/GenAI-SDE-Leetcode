import { REVIEWED, code, defineTopic, edge, node, step } from "../helpers";
import type { ExtraWeek } from "./types";

export const w02: ExtraWeek = {
  schedule: [
    {
      dayId: "w02-d01",
      topicId: "w02-d01-sql-query-order",
      tasks: [
        { label: "How SQL runs: clause order, HAVING and NULL logic", minutes: 25 },
        { label: "Run the NULL and HAVING examples", minutes: 20 },
      ],
    },
    {
      dayId: "w02-d04",
      topicId: "w02-d04-indexes-query-plans",
      tasks: [
        { label: "Indexes: full scans versus B-tree searches", minutes: 25 },
        { label: "Composite index and selectivity prompts", minutes: 20 },
      ],
    },
    {
      dayId: "w02-d05",
      topicId: "w02-d05-transactions-normalization",
      tasks: [
        { label: "Transactions, isolation anomalies and normal forms", minutes: 30 },
        { label: "Design a normalized schema", minutes: 20 },
      ],
    },
  ],
  topics: [
    defineTopic({
      id: "w02-d01-sql-query-order",
      slug: "sql-query-order",
      title: "How SQL runs: clause order, HAVING and NULLs",
      domain: "sql",
      roles: ["data-analyst", "data-scientist", "data-engineer", "sde", "ml-engineer"],
      difficulty: "beginner",
      minutes: 45,
      prerequisites: ["w01-d01-python-r-idioms"],
      objectives: [
        "Recite the logical order SQL evaluates clauses in and use it to debug queries",
        "Choose WHERE or HAVING correctly and explain COUNT(*) versus COUNT(column)",
        "Predict how NULL behaves in comparisons, aggregates and CASE",
      ],
      summary:
        "SQL reads top to bottom but runs in a different order: FROM and JOIN, then WHERE, GROUP BY, HAVING, SELECT, DISTINCT, ORDER BY and LIMIT. That order explains most surprises, and NULL's three-valued logic explains the rest.",
      eli5: {
        analogy:
          "Making fruit salad from a recipe card. You fetch the fruit first (FROM), throw away the bruised pieces (WHERE), sort them into bowls by kind (GROUP BY), drop the bowls that have too little (HAVING), decide what goes on each plate (SELECT), line the plates up (ORDER BY) and serve the first few (LIMIT).",
        steps: [
          "Fetch the rows from the tables.",
          "Throw out rows you do not want, one row at a time.",
          "Sort what is left into groups.",
          "Throw out whole groups that fail a test.",
          "Pick the columns and calculations to show, then sort and cut the list.",
        ],
        analogyLimit:
          "This is the logical order that defines what a query means. The database may physically do things in a different order (for example using an index before reading a table) as long as the answer is the same.",
      },
      senior: {
        definition:
          "SQL's logical processing order is FROM/JOIN, WHERE, GROUP BY, HAVING, SELECT (including window functions), DISTINCT, ORDER BY, LIMIT/OFFSET. Predicates use three-valued logic: TRUE, FALSE and UNKNOWN, and only TRUE rows pass WHERE or HAVING.",
        invariants: [
          "WHERE filters rows before grouping; HAVING filters groups after aggregation.",
          "SELECT aliases do not exist yet in WHERE, but can be used in ORDER BY.",
          "Any comparison with NULL yields UNKNOWN, including NULL = NULL; use IS NULL or IS DISTINCT FROM.",
          "Aggregates ignore NULLs except COUNT(*), which counts rows.",
        ],
        mechanism: [
          "COUNT(*) here is 6 but COUNT(bonus) is 4 because two bonuses are NULL.",
          "WHERE bonus <> 100 keeps only 2 rows: the NULL rows evaluate to UNKNOWN and are dropped, which surprises people who expect 4.",
          "COALESCE(bonus, 0) <> 100 turns NULL into 0 first, so 4 rows match.",
          "GROUP BY dept with HAVING AVG(salary) > 50 keeps eng (80.00) and sales (52.50) but drops ops (40.00).",
        ],
        complexity: "Filtering is O(n); grouping is O(n) with hashing or O(n log n) with sorting.",
        tradeoffs: [
          { option: "Filter in WHERE", choose: "The condition is about individual rows.", cost: "Cannot reference aggregates." },
          { option: "Filter in HAVING", choose: "The condition is about a group (counts, sums, averages).", cost: "Rows are grouped first, so row-level filters belong in WHERE for speed." },
          { option: "COALESCE versus IS NULL", choose: "COALESCE to substitute a default; IS NULL to find missing values.", cost: "COALESCE can hide data quality problems if the default is meaningful." },
        ],
        failureModes: [
          "Using a SELECT alias in WHERE, which fails or silently refers to a column with the same name.",
          "NOT IN with a subquery that returns a NULL, which makes the whole predicate UNKNOWN and returns no rows.",
          "Putting an aggregate condition in WHERE.",
          "AVG over a column with NULLs, which averages only the non-NULL values and can surprise readers.",
        ],
        production:
          "Most query bugs in reviews are clause-order or NULL bugs. Lint for NOT IN over nullable columns, prefer NOT EXISTS, and make NULL handling explicit with COALESCE or IS DISTINCT FROM.",
        interviewAnswer:
          "SQL evaluates FROM and joins first, then WHERE on rows, GROUP BY, HAVING on groups, then SELECT, DISTINCT, ORDER BY and LIMIT. That is why aliases are not visible in WHERE and why aggregate filters go in HAVING. Comparisons with NULL are UNKNOWN, so WHERE bonus <> 100 drops NULL bonuses; I use COALESCE or IS DISTINCT FROM when I want them included.",
      },
      implementation: {
        problem: "Show COUNT(*) versus COUNT(column), NULL comparisons, HAVING and a CASE bucket on a small employee table.",
        input: "6 employees in eng, sales and ops; salaries 40 to 90; two NULL bonuses",
        python: {
          packages: ["sqlite3"],
          code: code`
            import sqlite3

            con = sqlite3.connect(":memory:")
            con.executescript("""
            CREATE TABLE emp (id INTEGER PRIMARY KEY, name TEXT, dept TEXT, salary REAL, bonus REAL);
            INSERT INTO emp VALUES (1, 'Ana', 'eng', 90, 10), (2, 'Ben', 'eng', 70, NULL), (3, 'Cy', 'sales', 50, 5),
                                   (4, 'Di', 'sales', 55, NULL), (5, 'Ed', 'ops', 40, 100), (6, 'Fay', 'eng', 80, 100);
            """)


            def one(sql: str):
                return con.execute(sql).fetchone()


            star, bonus = one("SELECT COUNT(*), COUNT(bonus) FROM emp")
            print(f"count(*) = {star}, count(bonus) = {bonus}")
            print(f"bonus <> 100 matches {one('SELECT COUNT(*) FROM emp WHERE bonus <> 100')[0]} rows (NULL is unknown, so dropped)")
            print(f"coalesce(bonus, 0) <> 100 matches {one('SELECT COUNT(*) FROM emp WHERE COALESCE(bonus, 0) <> 100')[0]} rows")

            print("departments with avg salary > 50:")
            for dept, avg in con.execute("SELECT dept, AVG(salary) AS avg_salary FROM emp GROUP BY dept HAVING AVG(salary) > 50 ORDER BY avg_salary DESC"):
                print(f"  {dept} {avg:.2f}")

            bands = con.execute("""
            SELECT CASE WHEN salary >= 80 THEN 'high' WHEN salary >= 55 THEN 'mid' ELSE 'low' END AS band, COUNT(*)
            FROM emp GROUP BY band ORDER BY band
            """).fetchall()
            print("salary bands: " + ", ".join(f"{b}={n}" for b, n in bands))
          `,
        },
        r: {
          code: code`
            emp <- data.frame(
              id = 1:6,
              name = c("Ana", "Ben", "Cy", "Di", "Ed", "Fay"),
              dept = c("eng", "eng", "sales", "sales", "ops", "eng"),
              salary = c(90, 70, 50, 55, 40, 80),
              bonus = c(10, NA, 5, NA, 100, 100)
            )

            cat(sprintf("count(*) = %d, count(bonus) = %d\n", nrow(emp), sum(!is.na(emp$bonus))))
            # which() keeps only TRUE, exactly like WHERE: NA (unknown) rows are dropped.
            cat(sprintf("bonus <> 100 matches %d rows (NULL is unknown, so dropped)\n", length(which(emp$bonus != 100))))
            coalesced <- ifelse(is.na(emp$bonus), 0, emp$bonus)
            cat(sprintf("coalesce(bonus, 0) <> 100 matches %d rows\n", length(which(coalesced != 100))))

            cat("departments with avg salary > 50:\n")
            avg_salary <- tapply(emp$salary, emp$dept, mean)
            kept <- sort(avg_salary[avg_salary > 50], decreasing = TRUE)
            for (d in names(kept)) cat(sprintf("  %s %.2f\n", d, kept[[d]]))

            band <- ifelse(emp$salary >= 80, "high", ifelse(emp$salary >= 55, "mid", "low"))
            counts <- table(band)
            counts <- counts[order(names(counts))]
            cat("salary bands: ", paste(sprintf("%s=%d", names(counts), as.integer(counts)), collapse = ", "), "\n", sep = "")
          `,
        },
        expectedOutput: code`
        count(*) = 6, count(bonus) = 4
        bonus <> 100 matches 2 rows (NULL is unknown, so dropped)
        coalesce(bonus, 0) <> 100 matches 4 rows
        departments with avg salary > 50:
          eng 80.00
          sales 52.50
        salary bands: high=2, low=2, mid=2
      `,
        tests: {
          python: code`
            def test_null_equals_null_is_unknown():
                assert one("SELECT NULL = NULL")[0] is None


            def test_count_star_counts_null_rows():
                assert one("SELECT COUNT(*), COUNT(bonus) FROM emp") == (6, 4)


            def test_not_in_with_null_returns_nothing():
                assert one("SELECT COUNT(*) FROM emp WHERE id NOT IN (SELECT bonus FROM emp)")[0] == 0


            def test_having_filters_groups():
                depts = [r[0] for r in con.execute("SELECT dept FROM emp GROUP BY dept HAVING COUNT(*) >= 2 ORDER BY dept")]
                assert depts == ["eng", "sales"]
          `,
          r: code`
            test_that("NA comparisons are unknown", {
              expect_true(is.na(NA == NA))
              expect_equal(length(which(c(1, NA, 3) != 1)), 1L)
            })

            test_that("count of non-missing bonuses", {
              expect_equal(sum(!is.na(emp$bonus)), 4L)
            })

            test_that("having keeps eng and sales", {
              expect_setequal(names(kept), c("eng", "sales"))
            })
          `,
        },
        eli5Trace: [
          "Six rows in the table, but only four have a bonus written down: COUNT(*) says 6, COUNT(bonus) says 4.",
          "Asking 'is the bonus not 100?' about a blank bonus gets the answer 'I don't know', so those rows are left out: only 2 match.",
          "Filling blanks with 0 first turns 'I don't know' into a real number, so 4 rows match.",
          "Grouping by department gives averages eng 80, sales 52.5 and ops 40; HAVING keeps the groups above 50.",
          "A CASE expression puts each salary in a band: two high, two mid, two low.",
        ],
        complexity: { time: "O(n) per query here", space: "O(groups)" },
        edgeCases: [
          "NOT IN (subquery) returns nothing if the subquery contains a NULL; use NOT EXISTS.",
          "AVG ignores NULLs, so AVG(bonus) here averages 4 values, not 6.",
          "GROUP BY puts all NULL keys in one group even though NULL = NULL is unknown.",
          "ORDER BY puts NULLs first in some databases and last in others; say NULLS FIRST or NULLS LAST.",
        ],
        incorrect: {
          language: "sql",
          code: code`
            SELECT dept, AVG(salary) AS avg_salary
            FROM emp
            WHERE avg_salary > 50
            GROUP BY dept;
          `,
          whyWrong: "WHERE runs before GROUP BY and SELECT, so the alias avg_salary and the aggregate do not exist yet; the query errors or filters on something else.",
          fix: "Move the condition to HAVING AVG(salary) > 50, which runs after grouping.",
        },
        walkthrough: [
          { python: "CREATE TABLE emp", pythonLines: 3, r: "emp <- data.frame(", rLines: 7, eli5: "Make a little table of six workers. Two of them have a blank bonus: in SQL that blank is called NULL, in R it is NA." },
          { python: 'star, bonus = one("SELECT COUNT(*), COUNT(bonus) FROM emp")', pythonLines: 2, r: 'cat(sprintf("count(*) = %d', eli5: "Count the rows (6), then count only the bonuses that are filled in (4). Blanks are skipped." },
          { python: "print(f\"bonus <> 100 matches", r: "cat(sprintf(\"bonus <> 100 matches", eli5: "Ask 'is the bonus not 100?'. For a blank bonus the answer is 'I don't know', and SQL only keeps rows where the answer is a clear yes." },
          { python: "print(f\"coalesce(bonus, 0) <> 100", r: "coalesced <- ifelse(is.na(emp$bonus), 0, emp$bonus)", rLines: 2, eli5: "Fill the blanks with 0 first. Now every row has a real answer, so 4 rows match." },
          { python: 'for dept, avg in con.execute("SELECT dept, AVG(salary)', pythonLines: 2, r: "avg_salary <- tapply(emp$salary, emp$dept, mean)", rLines: 3, eli5: "Group workers by department, average each group's salary, and keep only groups whose average is above 50. That keeping step is HAVING." },
          { python: "SELECT CASE WHEN salary >= 80", pythonLines: 3, r: 'band <- ifelse(emp$salary >= 80, "high"', rLines: 4, eli5: "Put each salary into a size band (high, mid, low) and count how many land in each band." },
        ],
      },
      flow: {
        title: "Logical order of a SELECT",
        nodes: [
          node("from", "FROM / JOIN", 0, 80, "6 rows"),
          node("where", "WHERE", 160, 80, "row filter"),
          node("group", "GROUP BY", 320, 80, "eng, sales, ops"),
          node("having", "HAVING", 480, 80, "AVG > 50"),
          node("select", "SELECT", 640, 80, "dept, AVG"),
          node("order", "ORDER BY", 800, 80, "avg desc"),
          node("limit", "LIMIT", 960, 80, "first n"),
        ],
        edges: [edge("from", "where"), edge("where", "group"), edge("group", "having"), edge("having", "select"), edge("select", "order"), edge("order", "limit")],
        steps: [
          step("from where", "from-where", "Rows come from the tables first, then WHERE tests each row. Only rows where the test is TRUE survive; NULL comparisons are UNKNOWN and drop out."),
          step("where group", "where-group", "GROUP BY collects the surviving rows into one group per department."),
          step("group having", "group-having", "HAVING tests each group: ops averages 40 and is dropped; eng (80) and sales (52.5) stay."),
          step("having select", "having-select", "Only now does SELECT compute the output columns and their aliases, such as avg_salary."),
          step("select order limit", "select-order order-limit", "ORDER BY can use those aliases, and LIMIT cuts the sorted list last."),
        ],
      },
      practice: [
        {
          id: "w02-order-recall-1",
          type: "recall",
          prompt: "Why can you use a SELECT alias in ORDER BY but not in WHERE?",
          answer: "Logically, WHERE runs before SELECT, so the alias does not exist yet; ORDER BY runs after SELECT, so it can see it.",
          rubric: ["States evaluation order", "WHERE before SELECT", "ORDER BY after SELECT"],
        },
        {
          id: "w02-order-case-1",
          type: "case",
          prompt: "A query 'SELECT * FROM users WHERE id NOT IN (SELECT referrer_id FROM signups)' suddenly returns zero rows after a deploy. What changed and how do you fix it?",
          answer: "A NULL referrer_id appeared in signups. x NOT IN (..., NULL) is UNKNOWN for every x, so no rows pass. Use NOT EXISTS (SELECT 1 FROM signups s WHERE s.referrer_id = users.id) or filter NULLs inside the subquery.",
          rubric: ["Identifies NULL in subquery", "Explains UNKNOWN", "NOT EXISTS fix"],
        },
        {
          id: "w02-order-recall-2",
          type: "recall",
          prompt: "What do COUNT(*), COUNT(col) and COUNT(DISTINCT col) each count?",
          answer: "COUNT(*) counts rows; COUNT(col) counts rows where col is not NULL; COUNT(DISTINCT col) counts distinct non-NULL values.",
          rubric: ["Rows", "Non-NULL values", "Distinct non-NULL values"],
        },
      ],
      references: [
        { title: "PostgreSQL documentation: SELECT (description of processing order)", url: "https://www.postgresql.org/docs/current/sql-select.html", versionSensitive: false },
        { title: "SQLite: NULL handling in SQLite versus other database engines", url: "https://www.sqlite.org/nulls.html", versionSensitive: false },
      ],
      lastReviewed: REVIEWED,
    }),

    defineTopic({
      id: "w02-d04-indexes-query-plans",
      slug: "indexes-query-plans",
      title: "Indexes, B-trees and query plans",
      domain: "sql",
      roles: ["data-engineer", "sde", "data-analyst", "data-scientist"],
      difficulty: "intermediate",
      minutes: 45,
      prerequisites: ["w01-d02-big-o-complexity", "w02-d01-sql-query-order"],
      objectives: [
        "Explain why an index turns an O(n) scan into an O(log n) search",
        "Apply the leftmost-prefix rule to composite indexes",
        "Read a query plan and decide whether an index helps, using selectivity",
      ],
      summary:
        "An index is a sorted copy of one or more columns with pointers back to the rows, usually a B-tree. It lets the database jump to matching rows instead of reading the whole table, at the cost of extra storage and slower writes.",
      eli5: {
        analogy:
          "The index at the back of a book. To find 'volcano' you do not read every page; you open the alphabetical index, jump to V, and it tells you the page. A composite index is like a phone book sorted by last name, then first name.",
        steps: [
          "Without an index, read every page looking for the word.",
          "With an index, open the alphabetical list in the middle and keep halving until you find the word.",
          "The index points you to the right page.",
          "A phone book sorted by last name helps if you know the last name, but not if you only know the first name.",
        ],
        analogyLimit:
          "A printed index never changes. A database index must be updated on every insert, update and delete, and if a word appears on almost every page the index saves nothing: you would read the whole book anyway.",
      },
      senior: {
        definition:
          "A B-tree index stores keys in sorted order in a balanced tree of pages with high fan-out, giving O(log n) point lookups and efficient range scans. The query planner chooses between full table scans and index access using statistics about selectivity.",
        invariants: [
          "Keys within the index are sorted, which supports equality, range and ORDER BY on the indexed prefix.",
          "A composite index on (a, b) can serve predicates on a, or on a and b, but not on b alone (leftmost prefix).",
          "Every write must also update every index on the table.",
        ],
        mechanism: [
          "Binary search over 100,000 sorted keys finds user 77,777 in 16 comparisons; a scan checks 77,777 rows.",
          "Rows sorted by (country, city) let the planner find the 25,000 'DE' rows by searching for the range boundaries.",
          "A predicate on city alone cannot use that order, so it falls back to a full scan.",
          "Low selectivity (a value matching a large share of rows) makes index access slower than a sequential scan because of random reads.",
        ],
        complexity: "Point lookup O(log n); range scan O(log n + k); every insert pays O(log n) per index.",
        tradeoffs: [
          { option: "Single-column index", choose: "Frequent equality filters on one selective column.", cost: "Extra writes and storage." },
          { option: "Composite index", choose: "Queries filter on a fixed leading column and often a second one.", cost: "Useless for queries that skip the leading column." },
          { option: "Covering index", choose: "Hot queries that read only indexed columns, avoiding table lookups.", cost: "Wider index, more write amplification." },
        ],
        failureModes: [
          "Wrapping the indexed column in a function (WHERE LOWER(email) = ...) so the index cannot be used.",
          "Leading wildcards (LIKE '%son') that defeat sorted lookups.",
          "Too many indexes on a write-heavy table.",
          "Implicit type casts between the column and the parameter that disable index use.",
        ],
        production:
          "Read plans with EXPLAIN (SQLite's EXPLAIN QUERY PLAN, PostgreSQL's EXPLAIN ANALYZE), index the columns in hot WHERE, JOIN and ORDER BY clauses, and drop unused indexes. Columnar warehouses use partitioning, clustering and zone maps instead of B-trees.",
        interviewAnswer:
          "An index is a sorted B-tree over the key with pointers to rows, so a lookup is O(log n) instead of a full scan. A composite index on (country, city) helps WHERE country = ... and WHERE country = ... AND city = ..., but not WHERE city = ... alone. I check the plan with EXPLAIN, watch selectivity, and remember every index slows writes.",
      },
      implementation: {
        problem: "Count how many rows or keys are checked by a full scan, a binary-search index lookup, and a composite-index range search.",
        input: "100,000 rows; user_id 1 to 100,000; country DE, FR, IN, US (25,000 each) sorted by (country, city)",
        python: {
          code: code`
            N = 100_000


            def scan_checks(keys: list, target) -> int:
                for i, k in enumerate(keys):
                    if k == target:
                        return i + 1
                return len(keys)


            def binary_search_checks(keys: list, target) -> int:
                lo, hi, checks = 0, len(keys) - 1, 0
                while lo <= hi:
                    checks += 1
                    mid = (lo + hi) // 2
                    if keys[mid] == target:
                        return checks
                    if keys[mid] < target:
                        lo = mid + 1
                    else:
                        hi = mid - 1
                return checks


            def bound(keys: list, target, upper: bool) -> tuple[int, int]:
                lo, hi, checks = 0, len(keys), 0
                while lo < hi:
                    checks += 1
                    mid = (lo + hi) // 2
                    if keys[mid] < target or (upper and keys[mid] == target):
                        lo = mid + 1
                    else:
                        hi = mid
                return lo, checks


            user_ids = list(range(1, N + 1))
            countries = [c for c in ("DE", "FR", "IN", "US") for _ in range(N // 4)]
            print(f"rows: {N}")
            print(f"lookup user_id=77777: full scan checks {scan_checks(user_ids, 77777)} rows, index checks {binary_search_checks(user_ids, 77777)} keys")
            start, c1 = bound(countries, "DE", upper=False)
            end, c2 = bound(countries, "DE", upper=True)
            print("composite index (country, city):")
            print(f"  WHERE country = 'DE': range of {end - start} rows found with {c1 + c2} key checks")
            print(f"  WHERE city = 'Lyon': city is not the leading column, so full scan of {N} rows")
            print(f"selectivity of country = 'DE': {100 * (end - start) / N:.1f}%")
          `,
        },
        r: {
          code: code`
            n <- 100000

            scan_checks <- function(keys, target) {
              hit <- match(target, keys)
              if (is.na(hit)) length(keys) else hit
            }

            binary_search_checks <- function(keys, target) {
              lo <- 0
              hi <- length(keys) - 1
              checks <- 0
              while (lo <= hi) {
                checks <- checks + 1
                mid <- (lo + hi) %/% 2
                if (keys[mid + 1] == target) return(checks)
                if (keys[mid + 1] < target) lo <- mid + 1 else hi <- mid - 1
              }
              checks
            }

            bound <- function(keys, target, upper) {
              lo <- 0
              hi <- length(keys)
              checks <- 0
              while (lo < hi) {
                checks <- checks + 1
                mid <- (lo + hi) %/% 2
                if (keys[mid + 1] < target || (upper && keys[mid + 1] == target)) lo <- mid + 1 else hi <- mid
              }
              c(pos = lo, checks = checks)
            }

            user_ids <- seq_len(n)
            countries <- rep(c("DE", "FR", "IN", "US"), each = n / 4)
            cat(sprintf("rows: %d\n", as.integer(n)))
            cat(sprintf("lookup user_id=77777: full scan checks %d rows, index checks %d keys\n", as.integer(scan_checks(user_ids, 77777)), as.integer(binary_search_checks(user_ids, 77777))))
            s <- bound(countries, "DE", FALSE)
            e <- bound(countries, "DE", TRUE)
            cat("composite index (country, city):\n")
            cat(sprintf("  WHERE country = 'DE': range of %d rows found with %d key checks\n", as.integer(e[["pos"]] - s[["pos"]]), as.integer(s[["checks"]] + e[["checks"]])))
            cat(sprintf("  WHERE city = 'Lyon': city is not the leading column, so full scan of %d rows\n", as.integer(n)))
            cat(sprintf("selectivity of country = 'DE': %.1f%%\n", 100 * (e[["pos"]] - s[["pos"]]) / n))
          `,
        },
        expectedOutput: code`
        rows: 100000
        lookup user_id=77777: full scan checks 77777 rows, index checks 16 keys
        composite index (country, city):
          WHERE country = 'DE': range of 25000 rows found with 33 key checks
          WHERE city = 'Lyon': city is not the leading column, so full scan of 100000 rows
        selectivity of country = 'DE': 25.0%
      `,
        tests: {
          python: code`
            import sqlite3


            def test_binary_search_is_logarithmic():
                assert binary_search_checks(list(range(1_000_000)), 999_999) <= 21


            def test_bounds_find_the_range():
                keys = ["a", "b", "b", "b", "c"]
                assert bound(keys, "b", upper=False)[0] == 1
                assert bound(keys, "b", upper=True)[0] == 4


            def test_sqlite_uses_the_index_for_the_leading_column():
                con = sqlite3.connect(":memory:")
                con.execute("CREATE TABLE t (country TEXT, city TEXT, x INTEGER)")
                con.execute("CREATE INDEX idx ON t (country, city)")
                plan = " ".join(r[-1] for r in con.execute("EXPLAIN QUERY PLAN SELECT x FROM t WHERE country = 'DE'"))
                assert "USING INDEX" in plan
                plan_city = " ".join(r[-1] for r in con.execute("EXPLAIN QUERY PLAN SELECT x FROM t WHERE city = 'Lyon'"))
                assert "SCAN" in plan_city
          `,
          r: code`
            test_that("binary search is logarithmic", {
              expect_lte(binary_search_checks(seq_len(1000000), 1000000), 21)
            })

            test_that("bounds find the range", {
              keys <- c("a", "b", "b", "b", "c")
              expect_equal(bound(keys, "b", FALSE)[["pos"]], 1)
              expect_equal(bound(keys, "b", TRUE)[["pos"]], 4)
            })
          `,
        },
        eli5Trace: [
          "Looking for user 77,777 by reading every row means checking 77,777 rows.",
          "With a sorted index you open the middle, see whether you are too high or too low, and halve again: 16 checks.",
          "Rows sorted by country then city keep all 'DE' rows together, so two quick searches find where they start and end.",
          "Searching by city alone is like using a phone book when you only know the first name: you read everything.",
          "DE is a quarter of the table (25%), so for a query returning all of it an index helps less than you might think.",
        ],
        complexity: { time: "Scan O(n); index lookup O(log n); range O(log n + k)", space: "Index adds O(n) storage" },
        edgeCases: [
          "A value that is not present still costs a full scan without an index, and log n checks with one.",
          "Very low selectivity (most rows match) makes scans cheaper than index lookups.",
          "Functions or casts on the indexed column prevent index use unless you build an expression index.",
          "Composite index column order matters: put equality columns before range columns.",
        ],
        incorrect: {
          language: "sql",
          code: code`
            CREATE INDEX idx_city_country ON t (city, country);
            SELECT * FROM t WHERE country = 'DE';
          `,
          whyWrong: "The index leads with city, but the query filters only on country, so the leftmost-prefix rule means the index cannot be used for this predicate.",
          fix: "Order composite index columns to match the most common predicates: (country, city) serves country alone and country with city.",
        },
        walkthrough: [
          { python: "def scan_checks(keys: list, target) -> int:", pythonLines: 5, r: "scan_checks <- function(keys, target) {", rLines: 4, eli5: "A full scan looks at the rows one by one until it finds the one we want, counting every look." },
          { python: "def binary_search_checks(keys: list, target) -> int:", pythonLines: 11, r: "binary_search_checks <- function(keys, target) {", rLines: 11, eli5: "An index is sorted, so we can open it in the middle, see if we are too high or too low, and throw away half each time." },
          { python: "def bound(keys: list, target, upper: bool)", pythonLines: 9, r: "bound <- function(keys, target, upper) {", rLines: 10, eli5: "To find a whole range (all the 'DE' rows), search once for where it starts and once for where it ends." },
          { python: "user_ids = list(range(1, N + 1))", pythonLines: 2, r: "user_ids <- seq_len(n)", rLines: 2, eli5: "Build 100,000 pretend rows: user ids in order, and countries grouped together like a sorted index would keep them." },
          { python: 'print(f"lookup user_id=77777', r: 'cat(sprintf("lookup user_id=77777', eli5: "Compare: the scan checks 77,777 rows, the index only 16 keys." },
          { python: 'start, c1 = bound(countries, "DE", upper=False)', pythonLines: 5, r: 's <- bound(countries, "DE", FALSE)', rLines: 5, eli5: "Use the country-first index to find all 25,000 'DE' rows quickly. A city-only question cannot use it and must scan everything." },
        ],
      },
      flow: {
        title: "How the planner answers WHERE with and without an index",
        nodes: [
          node("query", "Query", 0, 110, "WHERE country = 'DE'"),
          node("planner", "Planner", 220, 110, "uses statistics"),
          node("index", "B-tree index", 440, 30, "(country, city)"),
          node("rows", "Fetch rows", 660, 30, "25,000 matches"),
          node("scan", "Full scan", 440, 190, "100,000 rows"),
          node("result", "Result", 860, 110, ""),
        ],
        edges: [edge("query", "planner"), edge("planner", "index", "leading column"), edge("index", "rows"), edge("rows", "result"), edge("planner", "scan", "no usable index"), edge("scan", "result")],
        steps: [
          step("query planner", "query-planner", "The planner looks at the predicate and the indexes that exist, and estimates how many rows will match."),
          step("planner index", "planner-index", "country is the leading column of the (country, city) index, so the planner can binary search the B-tree."),
          step("index rows result", "index-rows rows-result", "It finds the start and end of the DE range in a handful of checks, then fetches those rows."),
          step("planner scan result", "planner-scan scan-result", "A query on city alone cannot use that order, so the planner reads every row: a full scan."),
        ],
      },
      practice: [
        {
          id: "w02-index-recall-1",
          type: "recall",
          prompt: "You have an index on (last_name, first_name). Which of these can use it: WHERE last_name = 'Lee'; WHERE first_name = 'Ana'; WHERE last_name = 'Lee' AND first_name = 'Ana'?",
          answer: "The first and third can (they use the leftmost prefix). The second cannot, because first_name is not the leading column.",
          rubric: ["Leftmost prefix rule", "Identifies first and third", "Explains why second fails"],
        },
        {
          id: "w02-index-case-1",
          type: "case",
          prompt: "A dashboard query filtering on created_at got slow after someone added WHERE DATE(created_at) = '2026-01-05'. Why, and what do you do?",
          answer: "Wrapping the column in DATE() hides it from the index, forcing a scan. Rewrite as a range: created_at >= '2026-01-05' AND created_at < '2026-01-06', or create an expression index on DATE(created_at).",
          rubric: ["Function defeats index", "Range rewrite", "Expression index alternative"],
        },
        {
          id: "w02-index-recall-2",
          type: "recall",
          prompt: "Why might the planner ignore an index on a status column where 90% of rows are 'active'?",
          answer: "Low selectivity: fetching 90% of rows through index lookups means many random reads, which is slower than one sequential scan.",
          rubric: ["Selectivity", "Random versus sequential I/O"],
        },
      ],
      references: [
        { title: "SQLite: The SQLite Query Optimizer Overview and query planning", url: "https://www.sqlite.org/queryplanner.html", versionSensitive: false },
        { title: "SQLite: EXPLAIN QUERY PLAN", url: "https://www.sqlite.org/eqp.html", versionSensitive: true },
        { title: "PostgreSQL documentation: Indexes", url: "https://www.postgresql.org/docs/current/indexes.html", versionSensitive: false },
      ],
      lastReviewed: REVIEWED,
    }),

    defineTopic({
      id: "w02-d05-transactions-normalization",
      slug: "transactions-normalization",
      title: "Transactions, ACID, isolation and normalization",
      domain: "sql",
      roles: ["sde", "data-engineer", "data-analyst", "data-scientist"],
      difficulty: "intermediate",
      minutes: 50,
      prerequisites: ["w02-d01-joins-and-keys"],
      objectives: [
        "Explain atomicity, consistency, isolation and durability with a transfer example",
        "Recognize lost updates, dirty reads and phantom reads and the isolation levels that prevent them",
        "Normalize a table to third normal form and say when to denormalize",
      ],
      summary:
        "A transaction groups changes so they all happen or none do, and isolation controls what concurrent transactions can see. Normalization removes duplicated facts so each one lives in a single place, which prevents update anomalies.",
      eli5: {
        analogy:
          "Moving coins between two piggy banks while a grown-up watches. Either the coins leave one bank and arrive in the other, or the grown-up puts everything back as it was. Nobody is allowed to count the banks halfway through.",
        steps: [
          "Say 'start' before touching any piggy bank.",
          "Take coins out of one bank and put them into the other.",
          "If anything goes wrong, put everything back (rollback).",
          "If it all worked, say 'done' and make it permanent (commit).",
        ],
        analogyLimit:
          "One grown-up watching one child is easy. Real databases serve thousands of people at once, so they choose how strict to be (isolation levels); the strictest is safest but slowest.",
      },
      senior: {
        definition:
          "ACID: atomicity (all or nothing), consistency (constraints hold after commit), isolation (concurrent transactions behave as if run in some order, to a configurable degree) and durability (committed data survives crashes). Normal forms remove redundancy: 1NF atomic values, 2NF no partial dependency on a composite key, 3NF no transitive dependency on non-key columns.",
        invariants: [
          "Total money across accounts is unchanged by any committed transfer.",
          "Under serializable isolation, the outcome equals some serial order of the transactions.",
          "In 3NF every non-key column depends on the key, the whole key and nothing but the key.",
        ],
        mechanism: [
          "A failed transfer (insufficient funds) rolls back, so balances stay at 70 and 80 with total 150.",
          "Without a transaction, a crash after the debit loses 30: total drops to 120.",
          "Two clients that read 100, add 10 and write 110 lose one update; serializing them (locks or SELECT ... FOR UPDATE) gives 120.",
          "Storing the customer's city on every order duplicates it 4 times for 2 customers; normalizing moves it to a customers table with 2 rows.",
        ],
        complexity: "Locking adds waiting under contention; normalization adds joins at read time but removes update anomalies.",
        tradeoffs: [
          { option: "Read committed", choose: "Default in many databases; good throughput.", cost: "Allows non-repeatable reads and some lost updates without explicit locks." },
          { option: "Serializable", choose: "Money, inventory and other invariants across rows.", cost: "Retries on serialization failures; lower throughput." },
          { option: "Denormalized tables", choose: "Read-heavy analytics in a warehouse.", cost: "Duplicated facts must be kept in sync by the pipeline." },
        ],
        failureModes: [
          "Read-modify-write in application code without locking or atomic updates (UPDATE x SET n = n + 1).",
          "Long transactions holding locks and blocking others.",
          "Assuming the default isolation level is serializable when it is not.",
          "Over-normalizing an analytics model so every query needs six joins.",
        ],
        production:
          "OLTP databases stay normalized and use transactions with the weakest isolation level that preserves the invariant, plus idempotency keys for retries. Warehouses denormalize into star schemas because reads dominate and pipelines control writes.",
        interviewAnswer:
          "I wrap the debit and credit in one transaction so a failure rolls both back; a check constraint or explicit check prevents negative balances. For concurrent increments I use an atomic UPDATE balance = balance + 10 or SELECT FOR UPDATE, otherwise two read-modify-writes lose an update. Transactional tables are normalized to 3NF so each fact lives once; analytics tables are denormalized on purpose.",
      },
      implementation: {
        problem: "Simulate transfers with and without a transaction, a lost update, and count duplicated facts before and after normalization.",
        input: "alice 100, bob 50; transfers of 30 and 500; two clients adding 10 to 100; 4 orders for 2 customers with city on each order",
        python: {
          code: code`
            class InsufficientFunds(Exception):
                pass


            def transfer(accounts: dict[str, int], src: str, dst: str, amount: int) -> str:
                snapshot = dict(accounts)  # what BEGIN gives us: a point to roll back to
                try:
                    if accounts[src] < amount:
                        raise InsufficientFunds()
                    accounts[src] -= amount
                    accounts[dst] += amount
                    return "committed"
                except InsufficientFunds:
                    accounts.clear()
                    accounts.update(snapshot)
                    return "rolled back (insufficient funds)"


            def show(accounts: dict[str, int]) -> str:
                return f"alice={accounts['alice']} bob={accounts['bob']} total={sum(accounts.values())}"


            accounts = {"alice": 100, "bob": 50}
            print(f"start: {show(accounts)}")
            print(f"transfer 30 alice->bob: {transfer(accounts, 'alice', 'bob', 30)}, {show(accounts)}")
            print(f"transfer 500 alice->bob: {transfer(accounts, 'alice', 'bob', 500)}, {show(accounts)}")

            no_tx = dict(accounts)
            no_tx["alice"] -= 30  # the process crashes before the matching credit
            print(f"crash after debit without a transaction: {show(no_tx)}")

            balance = 100
            read_a, read_b = balance, balance
            balance = read_a + 10
            balance = read_b + 10
            print(f"lost update: two clients add 10 to 100 -> {balance} (expected 120)")
            balance = 100
            for _ in range(2):
                balance = balance + 10
            print(f"serialized with a lock: {balance}")

            orders = [(1, "ana", "Lyon"), (2, "ana", "Lyon"), (3, "ben", "Pune"), (4, "ana", "Lyon")]
            customers = {name: city for _, name, city in orders}
            print(f"denormalized: city stored {len(orders)} times; normalized customers table: {len(customers)} rows")
          `,
        },
        r: {
          code: code`
            transfer <- function(accounts, src, dst, amount) {
              snapshot <- accounts
              result <- tryCatch({
                if (accounts[[src]] < amount) stop("insufficient")
                accounts[[src]] <- accounts[[src]] - amount
                accounts[[dst]] <- accounts[[dst]] + amount
                list(accounts = accounts, status = "committed")
              }, error = function(e) list(accounts = snapshot, status = "rolled back (insufficient funds)"))
              result
            }

            show <- function(a) sprintf("alice=%d bob=%d total=%d", as.integer(a[["alice"]]), as.integer(a[["bob"]]), as.integer(sum(unlist(a))))

            accounts <- list(alice = 100, bob = 50)
            cat(sprintf("start: %s\n", show(accounts)))
            r1 <- transfer(accounts, "alice", "bob", 30)
            accounts <- r1$accounts
            cat(sprintf("transfer 30 alice->bob: %s, %s\n", r1$status, show(accounts)))
            r2 <- transfer(accounts, "alice", "bob", 500)
            accounts <- r2$accounts
            cat(sprintf("transfer 500 alice->bob: %s, %s\n", r2$status, show(accounts)))

            no_tx <- accounts
            no_tx$alice <- no_tx$alice - 30
            cat(sprintf("crash after debit without a transaction: %s\n", show(no_tx)))

            balance <- 100
            read_a <- balance
            read_b <- balance
            balance <- read_a + 10
            balance <- read_b + 10
            cat(sprintf("lost update: two clients add 10 to 100 -> %d (expected 120)\n", as.integer(balance)))
            balance <- 100
            for (i in 1:2) balance <- balance + 10
            cat(sprintf("serialized with a lock: %d\n", as.integer(balance)))

            orders <- data.frame(id = 1:4, name = c("ana", "ana", "ben", "ana"), city = c("Lyon", "Lyon", "Pune", "Lyon"))
            customers <- unique(orders[, c("name", "city")])
            cat(sprintf("denormalized: city stored %d times; normalized customers table: %d rows\n", nrow(orders), nrow(customers)))
          `,
        },
        expectedOutput: code`
        start: alice=100 bob=50 total=150
        transfer 30 alice->bob: committed, alice=70 bob=80 total=150
        transfer 500 alice->bob: rolled back (insufficient funds), alice=70 bob=80 total=150
        crash after debit without a transaction: alice=40 bob=80 total=120
        lost update: two clients add 10 to 100 -> 110 (expected 120)
        serialized with a lock: 120
        denormalized: city stored 4 times; normalized customers table: 2 rows
      `,
        tests: {
          python: code`
            import sqlite3


            def test_failed_transfer_keeps_total():
                a = {"alice": 10, "bob": 0}
                assert transfer(a, "alice", "bob", 50).startswith("rolled back")
                assert a == {"alice": 10, "bob": 0}


            def test_successful_transfer_conserves_money():
                a = {"alice": 100, "bob": 50}
                transfer(a, "alice", "bob", 40)
                assert sum(a.values()) == 150 and a["bob"] == 90


            def test_sqlite_rollback_undoes_changes():
                con = sqlite3.connect(":memory:", isolation_level=None)
                con.execute("CREATE TABLE acct (name TEXT PRIMARY KEY, bal INTEGER)")
                con.execute("INSERT INTO acct VALUES ('alice', 100)")
                con.execute("BEGIN")
                con.execute("UPDATE acct SET bal = bal - 30 WHERE name = 'alice'")
                con.execute("ROLLBACK")
                assert con.execute("SELECT bal FROM acct").fetchone()[0] == 100
          `,
          r: code`
            test_that("failed transfer keeps balances", {
              r <- transfer(list(alice = 10, bob = 0), "alice", "bob", 50)
              expect_match(r$status, "rolled back")
              expect_equal(r$accounts$alice, 10)
            })

            test_that("successful transfer conserves money", {
              r <- transfer(list(alice = 100, bob = 50), "alice", "bob", 40)
              expect_equal(sum(unlist(r$accounts)), 150)
            })
          `,
        },
        eli5Trace: [
          "Alice has 100 coins and Bob 50: 150 in total.",
          "Moving 30 works: Alice 70, Bob 80, still 150 in total.",
          "Moving 500 fails because Alice only has 70, so everything is put back: still 70 and 80.",
          "Without the grown-up watching, a crash right after taking 30 out of Alice's bank loses those coins: the total drops to 120.",
          "Two kids each read 100, add 10 and write 110: one addition is lost. Taking turns gives 120.",
          "Writing Ana's city on every order repeats it; a separate customers list stores each city once.",
        ],
        complexity: { time: "O(1) per transfer", space: "O(accounts) for the rollback snapshot" },
        edgeCases: [
          "Transfers to the same account must not double count.",
          "Negative amounts must be rejected, or a transfer becomes a theft.",
          "Retries after a timeout need an idempotency key so the transfer is not applied twice.",
          "A city that changes must be updated in one place after normalization, or every order before it.",
        ],
        incorrect: {
          language: "python",
          code: code`
            balance = read_balance(account)
            write_balance(account, balance + 10)
          `,
          whyWrong: "Two concurrent requests can read the same balance and both write balance + 10, so one increment is lost (a lost update).",
          fix: "Use an atomic statement (UPDATE accounts SET balance = balance + 10 WHERE id = ?) or lock the row with SELECT ... FOR UPDATE inside a transaction.",
        },
        walkthrough: [
          { python: "def transfer(accounts: dict[str, int], src: str, dst: str, amount: int) -> str:", pythonLines: 2, r: "transfer <- function(accounts, src, dst, amount) {", rLines: 2, eli5: "Before touching anything, take a photo of the piggy banks. That photo is what lets us undo everything if something goes wrong." },
          { python: "if accounts[src] < amount:", pythonLines: 5, r: "if (accounts[[src]] < amount) stop(", rLines: 4, eli5: "Check there are enough coins, then take them out of one bank and put them into the other." },
          { python: "except InsufficientFunds:", pythonLines: 4, r: "}, error = function(e)", eli5: "If anything goes wrong, put the banks back exactly as in the photo. That is a rollback." },
          { python: 'no_tx["alice"] -= 30', r: "no_tx$alice <- no_tx$alice - 30", eli5: "Without a transaction, a crash after taking coins out but before putting them in means coins vanish." },
          { python: "read_a, read_b = balance, balance", pythonLines: 3, r: "read_a <- balance", rLines: 4, eli5: "Two kids read 100 at the same time, each add 10 and write 110. One addition is lost." },
          { python: "for _ in range(2):", pythonLines: 2, r: "for (i in 1:2) balance <- balance + 10", eli5: "If they take turns (a lock), each one sees the other's update and the answer is 120." },
          { python: "customers = {name: city for _, name, city in orders}", r: 'customers <- unique(orders[, c("name", "city")])', eli5: "Normalization: keep each customer's city in one small list instead of copying it onto every order." },
        ],
      },
      flow: {
        title: "A transfer inside a transaction",
        nodes: [
          node("begin", "BEGIN", 0, 100, "snapshot point"),
          node("check", "Check funds", 190, 100, "alice >= amount?"),
          node("debit", "Debit alice", 390, 30, "-30"),
          node("credit", "Credit bob", 590, 30, "+30"),
          node("commit", "COMMIT", 790, 30, "durable"),
          node("rollback", "ROLLBACK", 590, 190, "restore snapshot"),
        ],
        edges: [edge("begin", "check"), edge("check", "debit", "ok"), edge("debit", "credit"), edge("credit", "commit"), edge("check", "rollback", "fail")],
        steps: [
          step("begin check", "begin-check", "BEGIN marks a point to return to; nothing other transactions see has changed yet."),
          step("check debit credit", "check-debit debit-credit", "With enough funds, the debit and credit happen inside the transaction."),
          step("credit commit", "credit-commit", "COMMIT makes both changes visible and durable at once: total money is unchanged."),
          step("check rollback", "check-rollback", "A transfer of 500 fails the check, so ROLLBACK restores the snapshot. Nothing half-done is ever visible."),
        ],
      },
      practice: [
        {
          id: "w02-tx-recall-1",
          type: "recall",
          prompt: "Give one example each of a dirty read, a non-repeatable read and a phantom read.",
          answer: "Dirty read: reading another transaction's uncommitted change that later rolls back. Non-repeatable read: reading the same row twice and getting different values because another transaction committed an update in between. Phantom: re-running a range query and seeing new rows inserted by another transaction.",
          rubric: ["Dirty read uncommitted", "Non-repeatable read same row", "Phantom new rows in a range"],
        },
        {
          id: "w02-tx-design-1",
          type: "design",
          prompt: "Normalize this table to 3NF: orders(order_id, customer_id, customer_email, customer_city, product_id, product_name, qty).",
          answer: "customers(customer_id PK, email, city); products(product_id PK, name); orders(order_id PK, customer_id FK, product_id FK, qty). Email and city depend on customer_id, and product_name on product_id, not on order_id: those are transitive dependencies.",
          rubric: ["Separate customers", "Separate products", "Foreign keys in orders", "Names the transitive dependency"],
        },
        {
          id: "w02-tx-case-1",
          type: "case",
          prompt: "Inventory sometimes goes negative during flash sales even though the code checks stock before decrementing. Why, and how do you fix it?",
          answer: "Check-then-act races: two requests both see stock 1 and both decrement. Use an atomic conditional update (UPDATE items SET stock = stock - 1 WHERE id = ? AND stock > 0, then check rows affected), row locks, or serializable isolation with retries.",
          rubric: ["Identifies race", "Atomic conditional update", "Locks or serializable alternative"],
        },
      ],
      references: [
        { title: "PostgreSQL documentation: Transaction Isolation", url: "https://www.postgresql.org/docs/current/transaction-iso.html", versionSensitive: false },
        { title: "Designing Data-Intensive Applications (Kleppmann), chapter 7 on transactions", versionSensitive: false },
        { title: "Database System Concepts (Silberschatz, Korth, Sudarshan), relational database design chapter", versionSensitive: false },
      ],
      lastReviewed: REVIEWED,
    }),
  ],
};
