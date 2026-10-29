import { REVIEWED, code, defineTopic, edge, node, step } from "../helpers";
import type { ExtraWeek } from "./types";

export const w11: ExtraWeek = {
  schedule: [
    {
      dayId: "w11-d01",
      topicId: "w11-d01-warehouse-lakehouse",
      tasks: [
        { label: "Warehouses, lakehouses and open table formats", minutes: 30 },
        { label: "Estimate bytes scanned with and without pruning", minutes: 15 },
      ],
    },
  ],
  topics: [
    defineTopic({
      id: "w11-d01-warehouse-lakehouse",
      slug: "warehouse-lakehouse",
      title: "Warehouses and lakehouses: columnar storage and pruning",
      domain: "data-engineering",
      roles: ["data-engineer", "data-analyst", "data-scientist", "sde"],
      difficulty: "intermediate",
      minutes: 45,
      prerequisites: ["w02-d04-indexes-query-plans"],
      objectives: [
        "Explain why columnar files, partition pruning and min/max statistics cut the bytes a query reads",
        "Estimate scan size and cost for a query before running it",
        "Compare a cloud warehouse with a lakehouse built on Parquet and an open table format",
      ],
      summary:
        "Analytical queries read a few columns of many rows. Columnar formats such as Parquet store each column together, so a query reads only the columns it needs. Partitioning by a filter column (usually date) lets the engine skip whole folders, and per-file min/max statistics let it skip files. Warehouses (BigQuery, Snowflake, Redshift) manage all of this for you; lakehouses keep open files in object storage and add a table format (Delta Lake, Apache Iceberg, Apache Hudi) for transactions and metadata.",
      eli5: {
        analogy:
          "A library where every book is a day of sales. If you only want the price page, a columnar library lets you pull out just that page from each book. If you only want three days, you go straight to those three shelves (partitions). If each book has a label on the spine saying which countries are inside, you skip books that cannot have Germany at all.",
        steps: [
          "Only read the columns the question needs.",
          "Only open the folders for the dates in the question.",
          "Use the label on each file to skip files that cannot match.",
          "Fewer bytes read means a faster and cheaper answer.",
        ],
        analogyLimit:
          "Labels only help if similar rows are stored together. If every file contains every country, the 'which countries' label says 'all of them' and nothing can be skipped.",
      },
      senior: {
        definition:
          "A data warehouse is a managed analytical database with columnar storage, separated compute and SQL. A lakehouse stores open columnar files (Parquet or ORC) in object storage and uses a table format (Delta Lake, Iceberg, Hudi) to add ACID commits, schema evolution, time travel and file-level statistics, so several engines (Spark, Trino, DuckDB, warehouse engines) can query the same tables.",
        invariants: [
          "Pruning must never change the answer: skipped files provably contain no matching rows.",
          "Partition columns should be low to medium cardinality and used in most filters.",
          "Min/max statistics only skip files when data is clustered or sorted on the filtered column.",
        ],
        mechanism: [
          "A full row scan reads all 155 bytes of every row: 82.92 GB for 535 million rows.",
          "Reading only ts, country and amount (18 bytes) cuts that 8.6 times to 9.63 GB.",
          "Partition pruning on day opens 12 of 120 files (0.98 GB, 85 times less), and min/max skipping on country opens 3 files (0.24 GB, 351.7 times less).",
          "At a hypothetical USD 5 per TB scanned, running the query hourly costs about USD 298.53 a month as a row scan and USD 0.85 with pruning and skipping. Check your provider's current pricing model; many also offer flat-rate or capacity pricing.",
        ],
        complexity:
          "Bytes scanned ≈ rows in surviving files × bytes of the referenced columns (after compression). Planning cost grows with the number of files, which is why table formats keep manifests and statistics.",
        tradeoffs: [
          { option: "Cloud warehouse", choose: "Teams that want SQL, governance and performance with minimal operations.", cost: "Proprietary storage, egress and compute pricing, harder multi-engine access." },
          { option: "Lakehouse (Parquet + Iceberg or Delta)", choose: "Many engines and ML workloads on the same data, open formats, cheap storage.", cost: "You own file layout, compaction, catalog and access control." },
          { option: "Partition by date", choose: "Most queries filter on a time range; data arrives by day.", cost: "Too-fine partitions create the small-files problem." },
          { option: "Clustering or Z-ordering", choose: "Frequent filters on a second column such as country or customer.", cost: "Background rewrite cost; benefits fade as new unclustered data lands." },
        ],
        failureModes: [
          "SELECT * on a wide table, which defeats columnar storage.",
          "Filters that wrap the partition column in a function, which can stop the planner from pruning.",
          "Partitioning by a high-cardinality key (user id), creating millions of tiny files.",
          "Many small files from streaming writes, which slow planning and reading until compacted.",
        ],
        production:
          "Teams land raw data in a bronze layer, clean and conform it in silver, and publish business-level tables in gold (often called a medallion architecture). Scheduled jobs compact small files, expire old snapshots, and recluster hot tables. Query cost dashboards and per-query byte limits catch expensive scans before they reach the bill.",
        interviewAnswer:
          "Analytical cost is driven by bytes scanned, so I select only needed columns from a columnar format, partition by the dominant filter (usually date), and cluster by the next most common filter so min/max statistics can skip files. I estimate rows in surviving partitions times referenced column width before running anything expensive. A warehouse gives this as a managed service; a lakehouse gives open files plus a table format for transactions and multi-engine access, at the price of owning compaction and layout.",
      },
      implementation: {
        problem: "Estimate files opened, bytes scanned and monthly cost for one query under four physical designs: row store, columnar, columnar with partition pruning, and columnar with pruning plus min/max file skipping.",
        input: "30 daily partitions × 4 country-clustered files, 535 million rows, 7 columns (155 bytes per row); query: SUM(amount) for days 10 to 12 and country DE",
        python: {
          code: code`
            COLUMNS = {"order_id": 8, "ts": 8, "country": 2, "customer_id": 8, "amount": 8, "status": 1, "notes": 120}
            COUNTRIES = ["DE", "FR", "IN", "US"]
            PRICE_PER_TB = 5.0  # hypothetical on-demand price per TB scanned; check your provider's current pricing

            files = []  # one file per (day, country): files are clustered by country inside each daily partition
            for day in range(1, 31):
                for c, country in enumerate(COUNTRIES):
                    rows = 2_000_000 + ((day * 37 + c * 101) % 50) * 100_000
                    files.append({"day": day, "country_min": country, "country_max": country, "rows": rows})

            needed = ["ts", "country", "amount"]  # SELECT SUM(amount) ... WHERE day BETWEEN 10 AND 12 AND country = 'DE'
            row_width = sum(COLUMNS.values())
            col_width = sum(COLUMNS[c] for c in needed)


            def scan(use_columns, prune_partitions, skip_files):
                opened = rows = 0
                for f in files:
                    if prune_partitions and not 10 <= f["day"] <= 12:
                        continue
                    if skip_files and not f["country_min"] <= "DE" <= f["country_max"]:
                        continue
                    opened += 1
                    rows += f["rows"]
                return opened, rows * (col_width if use_columns else row_width)


            total_rows = sum(f["rows"] for f in files)
            print(f"table: {len(files)} files, {total_rows:,} rows, {row_width} bytes per row across {len(COLUMNS)} columns")
            baseline = None
            for label, args in [("row store, full scan", (False, False, False)),
                                ("columnar, 3 of 7 columns", (True, False, False)),
                                ("+ partition pruning on day", (True, True, False)),
                                ("+ min/max file skipping on country", (True, True, True))]:
                opened, scanned = scan(*args)
                baseline = baseline or scanned
                cost = scanned / 1e12 * PRICE_PER_TB
                print(f"{label:36s} files {opened:3d}  scanned {scanned / 1e9:7.2f} GB  reduction {baseline / scanned:6.1f}x  USD {cost:.4f} per run, USD {cost * 24 * 30:,.2f} per month if run hourly")
            matched = sum(f["rows"] for f in files if 10 <= f["day"] <= 12 and f["country_min"] == "DE")
            print(f"rows that match the filter: {matched:,} (the same answer whichever plan reads them)")
          `,
        },
        r: {
          code: code`
            columns <- c(order_id = 8, ts = 8, country = 2, customer_id = 8, amount = 8, status = 1, notes = 120)
            countries <- c("DE", "FR", "IN", "US")
            price_per_tb <- 5.0 # hypothetical on-demand price per TB scanned; check your provider's current pricing

            files <- do.call(rbind, lapply(1:30, function(day) {
              data.frame( # one file per (day, country): files are clustered by country inside each daily partition
                day = day,
                country_min = countries,
                country_max = countries,
                rows = 2000000 + ((day * 37 + (0:3) * 101) %% 50) * 100000
              )
            }))

            needed <- c("ts", "country", "amount") # SELECT SUM(amount) ... WHERE day BETWEEN 10 AND 12 AND country = 'DE'
            row_width <- sum(columns)
            col_width <- sum(columns[needed])

            scan <- function(use_columns, prune_partitions, skip_files) {
              keep <- rep(TRUE, nrow(files))
              if (prune_partitions) keep <- keep & files$day >= 10 & files$day <= 12
              if (skip_files) keep <- keep & files$country_min <= "DE" & "DE" <= files$country_max
              c(opened = sum(keep), bytes = sum(files$rows[keep]) * (if (use_columns) col_width else row_width))
            }

            money <- function(x) formatC(x, format = "f", digits = 2, big.mark = ",")
            cat(sprintf("table: %d files, %s rows, %d bytes per row across %d columns\n", nrow(files),
                        formatC(sum(files$rows), format = "f", digits = 0, big.mark = ","), as.integer(row_width), length(columns)))
            plans <- list(
              "row store, full scan" = c(FALSE, FALSE, FALSE),
              "columnar, 3 of 7 columns" = c(TRUE, FALSE, FALSE),
              "+ partition pruning on day" = c(TRUE, TRUE, FALSE),
              "+ min/max file skipping on country" = c(TRUE, TRUE, TRUE)
            )
            baseline <- NA
            for (label in names(plans)) {
              a <- plans[[label]]
              res <- scan(a[1], a[2], a[3])
              if (is.na(baseline)) baseline <- res[["bytes"]]
              cost <- res[["bytes"]] / 1e12 * price_per_tb
              cat(sprintf("%-36s files %3d  scanned %7.2f GB  reduction %6.1fx  USD %.4f per run, USD %s per month if run hourly\n",
                          label, as.integer(res[["opened"]]), res[["bytes"]] / 1e9, baseline / res[["bytes"]], cost, money(cost * 24 * 30)))
            }
            matched <- sum(files$rows[files$day >= 10 & files$day <= 12 & files$country_min == "DE"])
            cat(sprintf("rows that match the filter: %s (the same answer whichever plan reads them)\n", formatC(matched, format = "f", digits = 0, big.mark = ",")))
          `,
        },
        expectedOutput: code`
        table: 120 files, 535,000,000 rows, 155 bytes per row across 7 columns
        row store, full scan                 files 120  scanned   82.92 GB  reduction    1.0x  USD 0.4146 per run, USD 298.53 per month if run hourly
        columnar, 3 of 7 columns             files 120  scanned    9.63 GB  reduction    8.6x  USD 0.0481 per run, USD 34.67 per month if run hourly
        + partition pruning on day           files  12  scanned    0.98 GB  reduction   85.0x  USD 0.0049 per run, USD 3.51 per month if run hourly
        + min/max file skipping on country   files   3  scanned    0.24 GB  reduction  351.7x  USD 0.0012 per run, USD 0.85 per month if run hourly
        rows that match the filter: 13,100,000 (the same answer whichever plan reads them)
      `,
        tests: {
          python: code`
            def test_pruning_never_drops_matching_files():
                opened, scanned = scan(True, True, True)
                assert scanned == matched * col_width


            def test_each_step_reads_less():
                sizes = [scan(*a)[1] for a in [(False, False, False), (True, False, False), (True, True, False), (True, True, True)]]
                assert sizes == sorted(sizes, reverse=True)


            def test_unclustered_files_cannot_be_skipped():
                for f in files:
                    f["country_min"], f["country_max"] = "DE", "US"
                assert scan(True, True, True)[0] == 12
          `,
          r: code`
            test_that("pruning keeps exactly the matching rows", {
              expect_equal(scan(TRUE, TRUE, TRUE)[["bytes"]], matched * col_width)
            })

            test_that("each step reads less", {
              sizes <- c(scan(FALSE, FALSE, FALSE)[["bytes"]], scan(TRUE, FALSE, FALSE)[["bytes"]],
                         scan(TRUE, TRUE, FALSE)[["bytes"]], scan(TRUE, TRUE, TRUE)[["bytes"]])
              expect_true(all(diff(sizes) < 0))
            })
          `,
        },
        eli5Trace: [
          "The library has 120 books holding 535 million sales.",
          "Reading every page of every book is 83 GB.",
          "Pulling out only the 3 pages we need from each book is 9.6 GB.",
          "Going only to the shelves for days 10, 11 and 12 opens 12 books: under 1 GB.",
          "Reading the spine labels and opening only the Germany books leaves 3 books and 0.24 GB, about 350 times less than the start, with the same answer.",
        ],
        complexity: { time: "O(files) to plan; O(bytes scanned) to execute", space: "O(files) of metadata" },
        edgeCases: [
          "Compression makes real column sizes smaller and uneven; estimates use compressed sizes from metadata.",
          "Late-arriving data written to old partitions breaks assumptions that old partitions are immutable.",
          "Nested and repeated columns are stored as separate leaf columns in Parquet.",
          "A filter on a column with no statistics or no clustering scans everything that survives partition pruning.",
        ],
        incorrect: {
          language: "sql",
          code: code`
            SELECT *
            FROM orders
            WHERE EXTRACT(DAY FROM order_date) BETWEEN 10 AND 12
          `,
          whyWrong: "SELECT * reads every column, and the expression on the partition column can stop many planners from pruning. It is also a logic bug: it matches days 10 to 12 of every month in the table.",
          fix: "Select only the needed columns and filter the partition column directly: SELECT SUM(amount) FROM orders WHERE order_date BETWEEN DATE '2026-09-10' AND DATE '2026-09-12' AND country = 'DE'.",
        },
        walkthrough: [
          { python: "COLUMNS = {", pythonLines: 3, r: "columns <- c(", rLines: 3, eli5: "Each sale has 7 columns. The notes column is big (120 bytes), the others are small." },
          { python: "files = []", pythonLines: 5, r: "files <- do.call(rbind", rLines: 8, eli5: "Make 30 days × 4 countries = 120 files. Each file holds one country, so its label says exactly which country is inside." },
          { python: "needed = [", pythonLines: 3, r: "needed <- c(", rLines: 3, eli5: "Our question only needs 3 of the 7 columns: 18 bytes instead of 155." },
          { python: "def scan(use_columns, prune_partitions, skip_files):", pythonLines: 10, r: "scan <- function(use_columns, prune_partitions, skip_files) {", rLines: 6, eli5: "Walk through the files, skipping the wrong days and the files whose label says 'no Germany', and add up what we read." },
          { python: "for label, args in", pythonLines: 8, r: "plans <- list(", rLines: 15, eli5: "Try four ways of storing the same data and print how much each one reads and costs." },
          { python: "matched = ", pythonLines: 2, r: "matched <- ", rLines: 2, eli5: "Every way finds the same 13.1 million matching rows. Skipping only skips what cannot match." },
        ],
      },
      flow: {
        title: "How a lakehouse query avoids reading data",
        nodes: [
          node("sql", "Query", 0, 120, "SUM(amount), day 10-12, DE"),
          node("catalog", "Table metadata", 220, 120, "partitions, file stats"),
          node("prune", "Partition pruning", 440, 30, "120 → 12 files"),
          node("skip", "Min/max skipping", 440, 210, "12 → 3 files"),
          node("cols", "Column projection", 660, 120, "3 of 7 columns"),
          node("result", "Result", 880, 120, "0.24 GB read"),
        ],
        edges: [edge("sql", "catalog"), edge("catalog", "prune"), edge("prune", "skip"), edge("skip", "cols"), edge("cols", "result")],
        steps: [
          step("sql catalog", "sql-catalog", "The planner reads the table format's metadata (manifests, partition values, per-file statistics) before touching data."),
          step("catalog prune", "catalog-prune", "Only partitions for days 10 to 12 survive: 12 of 120 files."),
          step("prune skip", "prune-skip", "Per-file min/max on country rule out files that cannot contain DE: 3 files remain."),
          step("skip cols", "skip-cols", "Inside each file, only the ts, country and amount column chunks are read."),
          step("cols result", "cols-result", "The engine reads 0.24 GB instead of 82.92 GB and returns the same answer."),
        ],
      },
      practice: [
        {
          id: "w11-lake-recall-1",
          type: "recall",
          prompt: "What do open table formats such as Iceberg and Delta Lake add on top of Parquet files in object storage?",
          answer: "Atomic commits and isolation for concurrent writers, a metadata layer that lists the files in each snapshot with statistics, schema and partition evolution, time travel to earlier snapshots, and maintenance operations such as compaction and snapshot expiry.",
          rubric: ["ACID commits", "Metadata with statistics", "Schema evolution", "Time travel"],
        },
        {
          id: "w11-lake-case-1",
          type: "case",
          prompt: "A dashboard query on a 40 TB events table got 10 times more expensive after a new streaming job started writing to it. What happened and what do you do?",
          answer: "The streaming job likely writes many small, unclustered files, so planning is slower and min/max statistics no longer skip files. Schedule compaction and reclustering, make the stream write larger files or buffer longer, check that partitioning still matches the dashboard filter, and set byte limits or alerts on the query.",
          rubric: ["Small files", "Lost clustering", "Compaction", "Guardrails"],
        },
        {
          id: "w11-lake-design-1",
          type: "design",
          prompt: "Design the analytics storage for a company whose analysts use SQL and whose ML team trains models in Spark on the same data.",
          answer: "Land raw events in object storage as Parquet under an open table format (bronze), build cleaned and conformed tables (silver) and business marts (gold) with scheduled jobs, register them in one catalog with access control, and let analysts query through a warehouse or SQL engine that reads the table format while ML reads the same tables from Spark. Partition by event date, cluster by the most common secondary filter, and run compaction and snapshot expiry jobs.",
          rubric: ["Open table format", "Layers", "Shared catalog and access control", "Layout and maintenance"],
        },
      ],
      references: [
        { title: "Apache Parquet documentation", url: "https://parquet.apache.org/docs/", versionSensitive: true },
        { title: "Apache Iceberg documentation", url: "https://iceberg.apache.org/docs/latest/", versionSensitive: true },
        { title: "Delta Lake documentation", url: "https://docs.delta.io/latest/index.html", versionSensitive: true },
      ],
      lastReviewed: REVIEWED,
    }),
  ],
};
