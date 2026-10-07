import { REVIEWED, code, defineTopic, edge, node, step } from "../helpers";
import type { ExtraWeek } from "./types";

export const w01: ExtraWeek = {
  schedule: [
    {
      dayId: "w01-d02",
      topicId: "w01-d02-recursion-call-stack",
      tasks: [
        { label: "Recursion: watch the call stack grow and unwind", minutes: 20 },
        { label: "Run naive versus memoized Fibonacci", minutes: 25 },
      ],
    },
    {
      dayId: "w01-d04",
      topicId: "w01-d04-dataframe-wrangling",
      tasks: [
        { label: "DataFrames: filter, group, join and sort in pandas and R", minutes: 35 },
        { label: "Wrangling practice prompts", minutes: 20 },
      ],
    },
  ],
  topics: [
    defineTopic({
      id: "w01-d02-recursion-call-stack",
      slug: "recursion-call-stack",
      title: "Recursion and the call stack",
      domain: "foundations",
      roles: ["sde", "data-scientist", "ml-engineer", "genai-engineer", "data-engineer"],
      difficulty: "beginner",
      minutes: 45,
      prerequisites: ["w01-d01-python-r-idioms"],
      objectives: [
        "Trace a recursive function through its call stack, down to the base case and back up",
        "Explain why naive recursive Fibonacci is exponential and memoization makes it linear",
        "Know when to replace recursion with a loop or an explicit stack",
      ],
      summary:
        "A recursive function solves a problem by calling itself on a smaller piece until it reaches a case it can answer directly. Every call waits on a stack until the smaller call returns, which is why depth and repeated work matter.",
      eli5: {
        analogy:
          "Russian nesting dolls. To count the dolls you open one and ask the doll inside to count itself. That doll opens the next one, and so on, until the tiniest doll says 'just me: 1'. Then every doll adds one and passes the answer back out.",
        steps: [
          "Open a doll and hand the smaller doll the same question.",
          "Keep going until the smallest doll answers on its own: that is the base case.",
          "Each doll waits on a pile (the stack) until the doll inside answers.",
          "Answers travel back out, and each doll adds its part.",
        ],
        analogyLimit:
          "Real dolls never repeat work. Recursive code often does: naive Fibonacci asks the same small question thousands of times, so we need memory (memoization) that dolls do not need.",
      },
      senior: {
        definition:
          "Recursion defines a function in terms of itself on a strictly smaller input, with one or more base cases that terminate. Each active call occupies a stack frame holding its arguments and return address, so space is O(depth).",
        invariants: [
          "Every recursive call moves strictly closer to a base case (a decreasing measure), or the recursion never ends.",
          "The result of a call depends only on its arguments, which is what makes memoization valid.",
          "Stack depth is bounded: CPython's default limit is about 1,000 frames and R's expression nesting limit is 5,000 by default.",
        ],
        mechanism: [
          "A call pushes a frame; returning pops it and resumes the caller where it paused.",
          "Naive fib(n) branches twice per call, so it makes 2·fib(n+1) − 1 calls: 177 for n = 10 and 21,891 for n = 20.",
          "Memoization stores each answer the first time; fib(n) then makes 2n − 1 calls (19 and 39).",
          "Tail recursion is not optimized in Python or R, so deep recursion should become a loop or an explicit stack.",
        ],
        complexity: "Naive Fibonacci is O(φ^n) time and O(n) stack; memoized is O(n) time and O(n) space; the loop version is O(n) time and O(1) space.",
        tradeoffs: [
          { option: "Recursion", choose: "Trees, divide and conquer, backtracking: the code mirrors the problem.", cost: "Stack depth limits and call overhead." },
          { option: "Memoized recursion (top-down DP)", choose: "Overlapping subproblems with a natural recursive definition.", cost: "Memory for the cache; still uses the stack." },
          { option: "Iteration or explicit stack", choose: "Deep inputs (long linked lists, big grids) or hot loops.", cost: "Less direct code; you manage the stack yourself." },
        ],
        failureModes: [
          "Missing or unreachable base case, giving RecursionError in Python or 'evaluation nested too deeply' in R.",
          "Exponential blow-up from recomputing the same subproblem.",
          "Mutable default arguments used as a cache in Python, shared across unrelated calls.",
          "Recursing on input size n for data that can be millions long.",
        ],
        production:
          "Parsers, JSON walkers, tree and graph algorithms and divide and conquer sorts are naturally recursive. Production code converts deep recursion into iteration with an explicit stack to avoid stack overflows on adversarial inputs.",
        interviewAnswer:
          "I define the base case first, then the recursive step on a smaller input, and check the measure decreases. Naive Fibonacci makes 2·fib(n+1) − 1 calls, which is exponential; memoizing makes it 2n − 1 calls, linear. For deep inputs I switch to iteration because Python and R do not optimize tail calls.",
      },
      implementation: {
        problem: "Trace the call stack of sum_to(3), then count calls for naive and memoized Fibonacci.",
        input: "sum_to(3); fib(10) and fib(20)",
        python: {
          code: code`
            def sum_to(n: int, depth: int = 0) -> int:
                pad = "  " * depth
                print(f"{pad}sum_to({n})")
                if n == 0:
                    print(f"{pad}base case: return 0")
                    return 0
                result = n + sum_to(n - 1, depth + 1)
                print(f"{pad}return {result}")
                return result


            def fib_naive(n: int, calls: list[int]) -> int:
                calls[0] += 1
                if n < 2:
                    return n
                return fib_naive(n - 1, calls) + fib_naive(n - 2, calls)


            def fib_memo(n: int, memo: dict[int, int], calls: list[int]) -> int:
                calls[0] += 1
                if n in memo:
                    return memo[n]
                memo[n] = n if n < 2 else fib_memo(n - 1, memo, calls) + fib_memo(n - 2, memo, calls)
                return memo[n]


            print("sum_to(3) call stack:")
            sum_to(3)
            for n in (10, 20):
                naive_calls, memo_calls = [0], [0]
                value = fib_naive(n, naive_calls)
                fib_memo(n, {}, memo_calls)
                print(f"fib({n}) = {value}: naive calls {naive_calls[0]}, memoized calls {memo_calls[0]}")
          `,
        },
        r: {
          code: code`
            sum_to <- function(n, depth = 0) {
              pad <- strrep("  ", depth)
              cat(sprintf("%ssum_to(%d)\n", pad, n))
              if (n == 0) {
                cat(sprintf("%sbase case: return 0\n", pad))
                return(0)
              }
              result <- n + sum_to(n - 1, depth + 1)
              cat(sprintf("%sreturn %d\n", pad, as.integer(result)))
              result
            }

            fib_naive <- function(n, counter) {
              counter$calls <- counter$calls + 1
              if (n < 2) return(n)
              fib_naive(n - 1, counter) + fib_naive(n - 2, counter)
            }

            fib_memo <- function(n, memo, counter) {
              counter$calls <- counter$calls + 1
              key <- as.character(n)
              if (!is.null(memo[[key]])) return(memo[[key]])
              value <- if (n < 2) n else fib_memo(n - 1, memo, counter) + fib_memo(n - 2, memo, counter)
              memo[[key]] <- value
              value
            }

            new_counter <- function() {
              e <- new.env()
              e$calls <- 0
              e
            }

            cat("sum_to(3) call stack:\n")
            invisible(sum_to(3))
            for (n in c(10, 20)) {
              naive <- new_counter()
              memo_count <- new_counter()
              value <- fib_naive(n, naive)
              fib_memo(n, new.env(), memo_count)
              cat(sprintf("fib(%d) = %d: naive calls %d, memoized calls %d\n", n, as.integer(value), as.integer(naive$calls), as.integer(memo_count$calls)))
            }
          `,
        },
        expectedOutput: code`
        sum_to(3) call stack:
        sum_to(3)
          sum_to(2)
            sum_to(1)
              sum_to(0)
              base case: return 0
            return 1
          return 3
        return 6
        fib(10) = 55: naive calls 177, memoized calls 19
        fib(20) = 6765: naive calls 21891, memoized calls 39
      `,
        tests: {
          python: code`
            def test_fib_values():
                assert fib_memo(30, {}, [0]) == 832040
                assert fib_naive(12, [0]) == 144


            def test_naive_call_count_formula():
                calls = [0]
                fib_naive(15, calls)
                assert calls[0] == 2 * 987 - 1


            def test_memo_is_linear():
                calls = [0]
                fib_memo(50, {}, calls)
                assert calls[0] == 2 * 50 - 1


            def test_sum_to_value():
                assert sum_to(10) == 55
          `,
          r: code`
            test_that("fibonacci values", {
              expect_equal(fib_memo(30, new.env(), new_counter()), 832040)
              expect_equal(fib_naive(12, new_counter()), 144)
            })

            test_that("naive call count is 2 fib(n+1) - 1", {
              cnt <- new_counter()
              fib_naive(15, cnt)
              expect_equal(cnt$calls, 2 * 987 - 1)
            })

            test_that("memoized recursion is linear", {
              cnt <- new_counter()
              fib_memo(50, new.env(), cnt)
              expect_equal(cnt$calls, 99)
            })
          `,
        },
        eli5Trace: [
          "sum_to(3) cannot answer yet, so it asks sum_to(2), which asks sum_to(1), which asks sum_to(0).",
          "sum_to(0) is the smallest doll: it answers 0 straight away.",
          "Answers travel back out: 1 + 0 = 1, then 2 + 1 = 3, then 3 + 3 = 6.",
          "Naive Fibonacci asks the same small questions again and again: 21,891 calls for fib(20).",
          "With a notebook (memo) of answers it already knows, fib(20) needs only 39 calls.",
        ],
        complexity: { time: "Naive O(φ^n); memoized O(n)", space: "O(n) stack and memo", note: "φ is about 1.618, so naive Fibonacci roughly multiplies its work by 1.6 for every step of n." },
        edgeCases: [
          "n = 0 and n = 1 are base cases and must return immediately.",
          "Negative n never reaches the base case; validate inputs first.",
          "fib(1000) recursively exceeds Python's default recursion limit even with memoization; use a loop.",
          "Sharing one memo across calls is fine for a pure function, but not for functions with side effects.",
        ],
        incorrect: {
          language: "python",
          code: code`
            def fib(n):
                return fib(n - 1) + fib(n - 2)
          `,
          whyWrong: "There is no base case, so the calls never stop: Python raises RecursionError after about a thousand frames.",
          fix: "Return n when n < 2 before recursing, and memoize or loop to avoid exponential repeated work.",
        },
        walkthrough: [
          { python: "def sum_to(n: int, depth: int = 0) -> int:", r: "sum_to <- function(n, depth = 0) {", eli5: "sum_to adds up the numbers from n down to 0. It keeps track of how deep it is so it can indent its messages like nested dolls." },
          { python: "if n == 0:", pythonLines: 3, r: "if (n == 0) {", rLines: 4, eli5: "The base case: when n is 0 the smallest doll answers 0 right away, without asking anyone else." },
          { python: "result = n + sum_to(n - 1, depth + 1)", r: "result <- n + sum_to(n - 1, depth + 1)", eli5: "Otherwise, ask a smaller doll (n minus 1) and wait. While waiting, this call sits on the call stack." },
          { python: 'print(f"{pad}return {result}")', pythonLines: 2, r: 'cat(sprintf("%sreturn %d\\n"', rLines: 2, eli5: "When the smaller doll answers, add our own number and pass the total back out to whoever asked us." },
          { python: "def fib_naive(n: int, calls: list[int]) -> int:", pythonLines: 5, r: "fib_naive <- function(n, counter) {", rLines: 5, eli5: "Naive Fibonacci asks two smaller questions every time and counts each call. It forgets answers, so it repeats lots of work." },
          { python: "if n in memo:", pythonLines: 4, r: "if (!is.null(memo[[key]])) return(memo[[key]])", rLines: 4, eli5: "The memo version keeps a notebook. Before working, it checks the notebook; after working, it writes the answer down." },
          { python: "for n in (10, 20):", pythonLines: 5, r: "for (n in c(10, 20)) {", rLines: 6, eli5: "Run both versions for 10 and 20 and print how many calls each needed: thousands without the notebook, a few dozen with it." },
        ],
      },
      flow: {
        title: "The call stack grows to the base case, then unwinds",
        nodes: [
          node("s3", "sum_to(3)", 0, 0, "waits"),
          node("s2", "sum_to(2)", 0, 90, "waits"),
          node("s1", "sum_to(1)", 0, 180, "waits"),
          node("s0", "sum_to(0)", 0, 270, "base case"),
          node("r1", "returns 1", 300, 180, "1 + 0"),
          node("r3", "returns 3", 300, 90, "2 + 1"),
          node("r6", "returns 6", 300, 0, "3 + 3"),
        ],
        edges: [edge("s3", "s2", "push"), edge("s2", "s1", "push"), edge("s1", "s0", "push"), edge("s0", "r1", "pop"), edge("r1", "r3", "pop"), edge("r3", "r6", "pop")],
        steps: [
          step("s3 s2", "s3-s2", "sum_to(3) cannot answer yet. It pushes a call for sum_to(2) on top of the stack and waits."),
          step("s2 s1 s0", "s2-s1 s1-s0", "The stack keeps growing until sum_to(0), the base case, which answers 0 without calling anything."),
          step("s0 r1", "s0-r1", "The top frame pops: sum_to(1) resumes and returns 1 + 0 = 1."),
          step("r1 r3", "r1-r3", "sum_to(2) resumes with that answer and returns 2 + 1 = 3."),
          step("r3 r6", "r3-r6", "Finally sum_to(3) returns 3 + 3 = 6 and the stack is empty again."),
        ],
      },
      practice: [
        {
          id: "w01-recursion-recall-1",
          type: "recall",
          prompt: "What two things must every correct recursive function have?",
          answer: "A base case that returns without recursing, and a recursive step that calls itself on a strictly smaller input so it always reaches the base case.",
          rubric: ["Base case", "Smaller input each call", "Guaranteed termination"],
        },
        {
          id: "w01-recursion-code-1",
          type: "code",
          prompt: "Write a recursive function that reverses a string, then explain its time and space cost.",
          answer: "def rev(s): return s if len(s) <= 1 else rev(s[1:]) + s[0]. It makes n calls and each slice copies the string, so it is O(n^2) time and O(n) stack; a loop or ''.join(reversed(s)) is O(n).",
          rubric: ["Correct base case", "Smaller subproblem", "Notes slicing cost", "Mentions iterative alternative"],
        },
        {
          id: "w01-recursion-recall-2",
          type: "recall",
          prompt: "Why does memoization turn Fibonacci from exponential to linear time?",
          answer: "Naive recursion recomputes the same fib(k) many times. Caching each fib(k) after the first computation means each value from 0 to n is computed once, so the work is proportional to n.",
          rubric: ["Overlapping subproblems", "Each value computed once", "Linear count"],
        },
      ],
      references: [
        { title: "Python documentation: sys.getrecursionlimit and setrecursionlimit", url: "https://docs.python.org/3/library/sys.html#sys.getrecursionlimit", versionSensitive: false },
        { title: "Structure and Interpretation of Computer Programs (Abelson and Sussman), section 1.2 on recursive and iterative processes", versionSensitive: false },
      ],
      lastReviewed: REVIEWED,
    }),

    defineTopic({
      id: "w01-d04-dataframe-wrangling",
      slug: "dataframe-wrangling",
      title: "DataFrames: filter, group, join and sort",
      domain: "foundations",
      roles: ["data-analyst", "data-scientist", "ml-engineer", "data-engineer"],
      difficulty: "beginner",
      minutes: 55,
      prerequisites: ["w01-d01-python-r-idioms"],
      objectives: [
        "Filter rows, group and aggregate, left join and sort in pandas and in base R",
        "Keep entities with no matching rows by choosing the right join and filling missing values",
        "Translate between pandas, base R, dplyr and SQL vocabulary",
      ],
      summary:
        "Most analysis is the same four moves on a table: keep the rows you want, group them, join extra columns from another table, and sort. pandas and R data frames do these with different words but the same ideas, which also map one to one onto SQL.",
      eli5: {
        analogy:
          "A pile of receipts on the kitchen table. You throw out the refunded ones, make one stack per person, add up each stack, then look up each person's town in your address book and line the stacks up from biggest to smallest.",
        steps: [
          "Filter: keep only the receipts that were paid.",
          "Group: make one pile per customer.",
          "Aggregate: count each pile and add up its money.",
          "Join: look up each customer's region in the address book, keeping people with no receipts as zero.",
          "Sort: biggest spender first.",
        ],
        analogyLimit:
          "A kitchen table holds a few dozen receipts. Real tables have millions of rows, so the order of operations (filter early, join on keys with unique values) decides whether the work takes seconds or hours.",
      },
      senior: {
        definition:
          "A data frame is a column-oriented table where each column has one type. Wrangling composes relational operations (selection, projection, grouping with aggregation, joins, ordering) that correspond directly to SQL clauses.",
        invariants: [
          "Group keys define the grain of the result: one row per distinct key.",
          "A left join keeps every row of the left table; unmatched right columns become missing (NaN or NA).",
          "Join keys on the right side should be unique, or the join multiplies rows (fan-out).",
        ],
        mechanism: [
          "pandas: boolean masks filter, groupby().agg() aggregates with named outputs, merge(how='left') joins, sort_values orders.",
          "Base R: logical indexing filters, tapply or aggregate group, merge(all.x = TRUE) left joins, order() sorts; dplyr spells these filter, group_by, summarise, left_join, arrange.",
          "Missing values after a left join must be filled deliberately: no orders means 0 orders, not unknown.",
          "Here refunds are removed first, so ana's revenue is 40, not 60, and dev appears with 0 because of the left join.",
        ],
        complexity: "Hash-based group and join are O(n) expected; sorting is O(n log n).",
        tradeoffs: [
          { option: "pandas or base R in memory", choose: "Data that fits in RAM and interactive analysis.", cost: "Single machine; copies can double memory use." },
          { option: "SQL in the warehouse", choose: "Large tables, shared logic, governance.", cost: "Less convenient for ad hoc plotting and modeling." },
          { option: "Polars, DuckDB or data.table", choose: "Bigger-than-comfortable data on one machine.", cost: "Another API to learn; some packages expect pandas." },
        ],
        failureModes: [
          "Filtering after the join instead of before, so refunded orders inflate revenue.",
          "Inner join silently dropping customers with no orders.",
          "Duplicate keys in the lookup table multiplying rows and sums.",
          "Leaving NaN in a count column, which turns integers into floats and breaks later comparisons.",
        ],
        production:
          "The same pipeline usually lives as SQL in a warehouse (dbt models) once it is shared. In notebooks, keep each step named and checked (row counts before and after joins) so silent fan-out is caught early.",
        interviewAnswer:
          "Filter refunds first, group paid orders by customer to count and sum, left join that onto the customer table so customers without orders stay with zeros, then sort by revenue descending with a name tiebreaker. I check row counts around the join to catch duplicate keys.",
      },
      implementation: {
        problem: "Per customer, count paid orders and sum revenue, keep customers with no orders, sort by revenue, then total revenue by region.",
        input: "6 orders (one refunded) for ana, ben, cara; 4 customers (dev has no orders) in EU, US, APAC",
        python: {
          code: code`
            import pandas as pd

            orders = pd.DataFrame({
                "order_id": [1, 2, 3, 4, 5, 6],
                "customer": ["ana", "ben", "ana", "cara", "ben", "ana"],
                "amount": [30.0, 12.5, 20.0, 55.0, 7.5, 10.0],
                "status": ["paid", "paid", "refunded", "paid", "paid", "paid"],
            })
            customers = pd.DataFrame({"customer": ["ana", "ben", "cara", "dev"], "region": ["EU", "US", "EU", "APAC"]})


            def summarize(orders: pd.DataFrame, customers: pd.DataFrame) -> pd.DataFrame:
                paid = orders[orders["status"] == "paid"]
                per_customer = paid.groupby("customer", as_index=False).agg(orders=("order_id", "count"), revenue=("amount", "sum"))
                joined = customers.merge(per_customer, on="customer", how="left")
                joined["orders"] = joined["orders"].fillna(0).astype(int)
                joined["revenue"] = joined["revenue"].fillna(0.0)
                return joined.sort_values(["revenue", "customer"], ascending=[False, True]).reset_index(drop=True)


            result = summarize(orders, customers)
            for row in result.itertuples(index=False):
                print(f"{row.customer:<5} {row.region:<5} orders={row.orders} revenue={row.revenue:.2f}")
            by_region = result.groupby("region")["revenue"].sum().sort_index()
            print("revenue by region: " + ", ".join(f"{region}={total:.2f}" for region, total in by_region.items()))
          `,
          packages: ["pandas"],
        },
        r: {
          code: code`
            orders <- data.frame(
              order_id = 1:6,
              customer = c("ana", "ben", "ana", "cara", "ben", "ana"),
              amount = c(30, 12.5, 20, 55, 7.5, 10),
              status = c("paid", "paid", "refunded", "paid", "paid", "paid")
            )
            customers <- data.frame(customer = c("ana", "ben", "cara", "dev"), region = c("EU", "US", "EU", "APAC"))

            summarize_orders <- function(orders, customers) {
              paid <- orders[orders$status == "paid", ]
              per_customer <- data.frame(customer = sort(unique(paid$customer)))
              per_customer$orders <- as.integer(table(paid$customer)[per_customer$customer])
              per_customer$revenue <- as.numeric(tapply(paid$amount, paid$customer, sum)[per_customer$customer])
              joined <- merge(customers, per_customer, by = "customer", all.x = TRUE)
              joined$orders[is.na(joined$orders)] <- 0L
              joined$revenue[is.na(joined$revenue)] <- 0
              joined <- joined[order(-joined$revenue, joined$customer), ]
              rownames(joined) <- NULL
              joined
            }

            result <- summarize_orders(orders, customers)
            for (i in seq_len(nrow(result))) {
              cat(sprintf("%-5s %-5s orders=%d revenue=%.2f\n", result$customer[i], result$region[i], result$orders[i], result$revenue[i]))
            }
            by_region <- tapply(result$revenue, result$region, sum)
            by_region <- by_region[order(names(by_region))]
            cat("revenue by region: ", paste(sprintf("%s=%.2f", names(by_region), by_region), collapse = ", "), "\n", sep = "")
          `,
        },
        expectedOutput: code`
        cara  EU    orders=1 revenue=55.00
        ana   EU    orders=2 revenue=40.00
        ben   US    orders=2 revenue=20.00
        dev   APAC  orders=0 revenue=0.00
        revenue by region: APAC=0.00, EU=95.00, US=20.00
      `,
        tests: {
          python: code`
            def test_refunds_are_excluded():
                ana = result[result["customer"] == "ana"].iloc[0]
                assert ana["revenue"] == 40.0 and ana["orders"] == 2


            def test_left_join_keeps_customers_without_orders():
                dev = result[result["customer"] == "dev"].iloc[0]
                assert dev["orders"] == 0 and dev["revenue"] == 0.0


            def test_sorted_by_revenue_then_name():
                assert list(result["customer"]) == ["cara", "ana", "ben", "dev"]
          `,
          r: code`
            test_that("refunds are excluded", {
              expect_equal(result$revenue[result$customer == "ana"], 40)
              expect_equal(result$orders[result$customer == "ana"], 2L)
            })

            test_that("left join keeps customers without orders", {
              expect_equal(result$orders[result$customer == "dev"], 0L)
            })

            test_that("sorted by revenue then name", {
              expect_identical(result$customer, c("cara", "ana", "ben", "dev"))
            })
          `,
        },
        eli5Trace: [
          "Throw out the refunded receipt (ana's 20), leaving five paid orders.",
          "Make a pile per person: ana has 30 + 10 = 40, ben has 12.5 + 7.5 = 20, cara has 55.",
          "Look everyone up in the address book. dev has no receipts but still gets a line with zeros.",
          "Line them up biggest first: cara 55, ana 40, ben 20, dev 0.",
          "Add up by region: EU = 55 + 40 = 95, US = 20, APAC = 0.",
        ],
        complexity: { time: "O(n) for group and join with hashing, O(n log n) for the sort", space: "O(n)" },
        edgeCases: [
          "A customer with only refunded orders should show 0 orders, not disappear.",
          "Duplicate customers in the lookup table would duplicate rows; check uniqueness first.",
          "Ties in revenue need a second sort key for a stable, reproducible order.",
          "Currency stored as floats can show rounding noise; format to 2 decimals or use integer cents.",
        ],
        incorrect: {
          language: "python",
          code: code`
            joined = customers.merge(orders, on="customer", how="inner")
            revenue = joined.groupby("customer")["amount"].sum()
          `,
          whyWrong: "The inner join drops dev entirely, and summing before filtering counts ana's refunded 20, so ana shows 60 instead of 40.",
          fix: "Filter to paid orders first, aggregate, then left join onto customers and fill missing counts with 0.",
        },
        walkthrough: [
          { python: "orders = pd.DataFrame({", pythonLines: 6, r: "orders <- data.frame(", rLines: 6, eli5: "This is our pile of receipts: who bought, how much, and whether it was paid or refunded." },
          { python: "customers = pd.DataFrame(", r: "customers <- data.frame(", eli5: "This is the address book: each customer and the region they live in. dev is in it but never bought anything." },
          { python: 'paid = orders[orders["status"] == "paid"]', r: 'paid <- orders[orders$status == "paid", ]', eli5: "Filter: keep only the paid receipts and throw out the refund." },
          { python: "per_customer = paid.groupby(", r: "per_customer <- data.frame(customer = sort(unique(paid$customer)))", rLines: 3, eli5: "Group: make one pile per customer, then count each pile and add up its money." },
          { python: 'joined = customers.merge(per_customer, on="customer", how="left")', pythonLines: 3, r: "joined <- merge(customers, per_customer", rLines: 3, eli5: "Join: start from the address book so nobody is left out. People with no receipts get zeros instead of blanks." },
          { python: "return joined.sort_values(", r: "joined <- joined[order(-joined$revenue, joined$customer), ]", eli5: "Sort: biggest spender first. If two spend the same, alphabetical order breaks the tie." },
          { python: "for row in result.itertuples(index=False):", pythonLines: 2, r: "for (i in seq_len(nrow(result))) {", rLines: 3, eli5: "Print one tidy line per customer." },
          { python: 'by_region = result.groupby("region")', pythonLines: 2, r: "by_region <- tapply(result$revenue, result$region, sum)", rLines: 3, eli5: "Finally group again by region and add up the money: EU 95, US 20, APAC 0." },
        ],
      },
      flow: {
        title: "Filter, group, join, sort",
        nodes: [
          node("orders", "orders", 0, 40, "6 rows"),
          node("filter", "Filter", 200, 40, "status = paid"),
          node("group", "Group + sum", 400, 40, "per customer"),
          node("customers", "customers", 400, 170, "4 rows"),
          node("join", "Left join", 620, 100, "keep dev"),
          node("sort", "Sort", 820, 100, "revenue desc"),
        ],
        edges: [edge("orders", "filter"), edge("filter", "group"), edge("group", "join"), edge("customers", "join"), edge("join", "sort")],
        steps: [
          step("orders filter", "orders-filter", "Start from the order table and keep only paid rows: the refunded order is dropped."),
          step("filter group", "filter-group", "Group the 5 paid orders by customer: ana 2 orders 40, ben 2 orders 20, cara 1 order 55."),
          step("group customers join", "group-join customers-join", "Left join onto all 4 customers. dev has no orders, so its counts are filled with 0 instead of being dropped."),
          step("join sort", "join-sort", "Sort by revenue descending with name as the tiebreaker: cara, ana, ben, dev."),
        ],
      },
      practice: [
        {
          id: "w01-wrangle-recall-1",
          type: "recall",
          prompt: "Translate this pandas pipeline into SQL: orders[orders.status == 'paid'].groupby('customer').amount.sum()",
          answer: "SELECT customer, SUM(amount) FROM orders WHERE status = 'paid' GROUP BY customer;",
          rubric: ["WHERE for the filter", "GROUP BY customer", "SUM aggregate"],
        },
        {
          id: "w01-wrangle-case-1",
          type: "case",
          prompt: "After joining orders to a product table, total revenue is 30% higher than the finance report. What do you check first?",
          answer: "Whether the product table has duplicate keys (several rows per product id), which fans out orders during the join. Compare row counts before and after the join and deduplicate or aggregate the lookup table first.",
          rubric: ["Suspects fan-out from duplicate keys", "Row counts before and after", "Deduplicate or pre-aggregate"],
        },
        {
          id: "w01-wrangle-recall-2",
          type: "recall",
          prompt: "Name the dplyr verbs for filter, group, aggregate, left join and sort.",
          answer: "filter(), group_by(), summarise(), left_join(), arrange().",
          rubric: ["filter", "group_by and summarise", "left_join", "arrange"],
        },
      ],
      references: [
        { title: "pandas user guide: Group by: split-apply-combine", url: "https://pandas.pydata.org/docs/user_guide/groupby.html", versionSensitive: true },
        { title: "R for Data Science (2e), Data transformation chapter", url: "https://r4ds.hadley.nz/data-transform.html", versionSensitive: true },
      ],
      lastReviewed: REVIEWED,
    }),
  ],
};
