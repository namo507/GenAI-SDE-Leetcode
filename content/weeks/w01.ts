import { REVIEWED, code, defineTopic, defineWeek, edge, node, step } from "../helpers";

export const topics = [
  defineTopic({
    id: "w01-d01-python-r-idioms",
    slug: "python-r-idioms",
    title: "Python and R side by side",
    domain: "foundations",
    roles: ["sde", "data-scientist", "ml-engineer", "genai-engineer", "data-engineer"],
    difficulty: "beginner",
    minutes: 50,
    prerequisites: [],
    objectives: [
      "Translate a small counting task between Python and R without changing its behavior",
      "Explain why both programs need an explicit tie-break to print the same order",
      "Name the core structures that correspond across the two languages",
    ],
    summary:
      "Most interview and pipeline tasks reduce to the same few moves: split, count, sort, take the top k. This lesson maps those moves between Python and R so you can read and write either.",
    eli5: {
      analogy:
        "Python and R are two kitchens that cook the same recipe. The steps are identical (chop, count, sort, serve), but the drawers are in different places: Python keeps its counter in a drawer called Counter, R keeps it in one called table.",
      steps: [
        "Chop the sentence into words by cutting at every space.",
        "Count each word by keeping a tally card per word.",
        "Line the cards up from the biggest tally to the smallest, and when two tallies tie, put them in alphabetical order.",
        "Serve the first three cards.",
      ],
      analogyLimit:
        "Real languages differ in more than drawer layout. R counts from 1 while Python counts from 0, R's table sorts its labels as it builds them, and R copies a vector when you change it while Python changes a list in place. Those differences change results when you translate code line by line instead of by meaning.",
    },
    senior: {
      definition:
        "A frequency count is a reduction from a sequence of tokens to a map of token to count, followed by a total order on the entries. Python expresses the map with collections.Counter (a dict subclass); R expresses it with table(), which builds a factor and tabulates its levels.",
      invariants: [
        "Both programs see the same tokens: lowercase, split on runs of whitespace.",
        "The output order is fully determined: count descending, then word ascending. Without the second key, ties come out in insertion order in Python and in sorted level order in R.",
        "Counts are integers; no floating point is involved, so outputs compare exactly.",
      ],
      mechanism: [
        "Python: Counter hashes each token and increments a bucket, expected O(1) per token. sorted() with the key (-count, word) is a stable Timsort over the u unique words.",
        "R: strsplit returns a list of character vectors; table() calls factor(), which sorts the unique values to make levels, then counts with tabulate(). order(-counts, names) gives the permutation for the final ordering.",
        "Both print with explicit formatting (f-strings and sprintf) so the text is byte-identical rather than relying on each language's default print method.",
      ],
      complexity:
        "Time O(n + u log u) for n tokens and u unique words: one pass to count, one sort over unique words. Space O(u) for the counts.",
      tradeoffs: [
        {
          option: "Counter.most_common(k)",
          choose: "When tie order does not matter and you want the shortest code.",
          cost: "Ties keep first-seen order, so results can change when input order changes.",
        },
        {
          option: "Explicit sort with a compound key",
          choose: "When output must be reproducible, testable and identical across languages.",
          cost: "Sorts all unique words even when k is small; heapq.nlargest would be O(u log k).",
        },
        {
          option: "dplyr::count() or data.table in R",
          choose: "On data frames with millions of rows and grouping columns.",
          cost: "Adds a dependency; base table() is fine for a single vector.",
        },
      ],
      failureModes: [
        "Relying on default tie order and getting different top-k lists across runs or languages.",
        "Locale-sensitive sorting in R: order() on mixed-case text uses the session collation, so 'Bat' and 'apple' can swap between machines.",
        "Splitting on a single space instead of runs of whitespace, which creates empty-string tokens.",
        "Translating index arithmetic literally and producing off-by-one errors between 0-based and 1-based code.",
      ],
      production:
        "Mixed Python and R teams usually exchange data through files or tables, not code. Pin the contract at that boundary: column types, encodings and a deterministic sort order, so a report built in R matches the service built in Python.",
      interviewAnswer:
        "I count with a hash map, which is O(n), then sort the unique words by count descending and word ascending, which is O(u log u). I add the alphabetical tie-break on purpose so the answer is deterministic. If k is much smaller than u, I would use a heap of size k to get O(u log k).",
    },
    implementation: {
      problem: "Print the three most frequent words in a sentence, breaking ties alphabetically.",
      input: 'text = "the cat and the hat and the bat", k = 3',
      python: {
        code: code`
          from collections import Counter


          def top_words(text: str, k: int) -> list[tuple[str, int]]:
              counts = Counter(text.lower().split())
              return sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:k]


          text = "the cat and the hat and the bat"
          for word, n in top_words(text, 3):
              print(f"{word}: {n}")
        `,
      },
      r: {
        code: code`
          top_words <- function(text, k) {
            words <- strsplit(tolower(text), "\\s+")[[1]]
            counts <- table(words)
            ord <- order(-as.integer(counts), names(counts))
            head(counts[ord], k)
          }

          text <- "the cat and the hat and the bat"
          top <- top_words(text, 3)
          for (w in names(top)) cat(sprintf("%s: %d\n", w, top[[w]]))
        `,
      },
      expectedOutput: code`
        the: 3
        and: 2
        bat: 1
      `,
      tests: {
        python: code`
          def test_ties_break_alphabetically():
              assert top_words("b a b a c", 2) == [("a", 2), ("b", 2)]


          def test_case_insensitive():
              assert top_words("Go go GO stop", 1) == [("go", 3)]


          def test_k_larger_than_vocabulary():
              assert top_words("one two", 5) == [("one", 1), ("two", 1)]
        `,
        r: code`
          test_that("ties break alphabetically", {
            res <- top_words("b a b a c", 2)
            expect_equal(names(res), c("a", "b"))
            expect_equal(as.integer(res), c(2L, 2L))
          })

          test_that("counting ignores case", {
            res <- top_words("Go go GO stop", 1)
            expect_equal(names(res), "go")
            expect_equal(as.integer(res), 3L)
          })

          test_that("k larger than the vocabulary returns every word", {
            expect_length(top_words("one two", 5), 2)
          })
        `,
      },
      eli5Trace: [
        "Lowercase and split: the, cat, and, the, hat, and, the, bat.",
        "Tally: the 3, and 2, cat 1, hat 1, bat 1.",
        "Sort by tally, biggest first: the 3, and 2, then the three 1s.",
        "Break the three-way tie alphabetically: bat, cat, hat.",
        "Keep the first three: the 3, and 2, bat 1.",
      ],
      complexity: { time: "O(n + u log u)", space: "O(u)", note: "n tokens, u unique words" },
      edgeCases: [
        "Empty text: Python returns an empty list; R's strsplit gives one empty string, so filter it if empty input is possible.",
        "Punctuation stays attached ('cat,' differs from 'cat') unless you strip it first.",
        "k larger than the number of unique words returns all of them.",
        "Mixed case is folded by lower() and tolower() before counting.",
      ],
      incorrect: {
        language: "python",
        code: code`
          def top_words(text, k):
              return Counter(text.split()).most_common(k)
        `,
        whyWrong:
          "most_common keeps first-seen order for ties and skips lowercasing, so 'The' and 'the' are counted separately and the third word here would be 'cat' instead of 'bat'.",
        fix: "Lowercase first and sort with the key (-count, word) so ties are ordered alphabetically.",
      },
    },
    flow: {
      title: "From sentence to top-k words",
      nodes: [
        node("text", "Raw text", 0, 80, '"the cat and the hat..."'),
        node("tokens", "Tokenize", 210, 80, "lower + split"),
        node("counts", "Hash map", 420, 80, "word -> count"),
        node("sorted", "Sort", 630, 80, "count desc, word asc"),
        node("topk", "Take k", 840, 80, "first 3"),
      ],
      edges: [edge("text", "tokens"), edge("tokens", "counts"), edge("counts", "sorted"), edge("sorted", "topk")],
      steps: [
        step("text tokens", "text-tokens", "Lowercase the sentence and split it on whitespace into eight tokens."),
        step("tokens counts", "tokens-counts", "Each token increments its bucket in a hash map: the 3, and 2, cat 1, hat 1, bat 1."),
        step("counts sorted", "counts-sorted", "Sort the five unique words by count descending, breaking ties alphabetically."),
        step("sorted topk", "sorted-topk", "Keep the first three: the, and, bat. The tie-break is what makes bat win over cat and hat."),
      ],
    },
    practice: [
      {
        id: "w01-idioms-recall-1",
        type: "recall",
        prompt: "Why do the Python and R versions need an explicit alphabetical tie-break to print the same output?",
        answer:
          "Counter keeps insertion order for equal counts, while R's table() orders levels alphabetically. Without a shared secondary key, ties print in different orders across languages and across inputs.",
        rubric: ["Names Python's insertion-order ties", "Names R's sorted levels", "States the fix: a compound sort key"],
      },
      {
        id: "w01-idioms-code-1",
        type: "code",
        prompt: "Change top_words so that punctuation does not stick to words: 'cat,' and 'cat' should count as the same word. Do it in both languages.",
        answer:
          "Python: re.findall(r\"[a-z']+\", text.lower()) instead of split(). R: regmatches(tolower(text), gregexpr(\"[a-z']+\", tolower(text)))[[1]]. Keep the same sort.",
        rubric: ["Uses a regex token pattern", "Keeps lowercasing", "Keeps the deterministic sort"],
        hints: ["Extract word characters rather than splitting on spaces."],
      },
      {
        id: "w01-idioms-recall-2",
        type: "recall",
        prompt: "What is the time complexity of the solution, and how would you improve it when k is tiny compared with the vocabulary?",
        answer: "O(n + u log u). With a heap of size k (heapq.nlargest) the selection becomes O(u log k).",
        rubric: ["O(n) counting", "O(u log u) sorting", "Heap for O(u log k)"],
      },
    ],
    references: [
      { title: "Python documentation: collections.Counter", url: "https://docs.python.org/3/library/collections.html#collections.Counter", versionSensitive: false },
      { title: "R documentation: table()", url: "https://stat.ethz.ch/R-manual/R-devel/library/base/html/table.html", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w01-d02-big-o-complexity",
    slug: "big-o-complexity",
    title: "Big-O and complexity analysis",
    domain: "foundations",
    roles: ["sde", "data-scientist", "ml-engineer", "genai-engineer", "data-engineer"],
    difficulty: "beginner",
    minutes: 60,
    prerequisites: ["w01-d01-python-r-idioms"],
    objectives: [
      "Count the work an algorithm does as input grows, instead of timing it",
      "Explain why binary search grows like log n and linear search like n",
      "State best, worst and average cases and the assumptions behind them",
    ],
    summary:
      "Big-O describes how work grows with input size. Counting steps for linear and binary search on growing inputs makes the difference between n and log n visible.",
    eli5: {
      analogy:
        "Finding a name in a phone book. Reading every page from the start is linear search. Opening the middle, seeing whether the name comes before or after, and throwing away the wrong half is binary search.",
      steps: [
        "With 10 pages, reading every page can take 10 looks; halving takes about 4.",
        "Make the book 1,000 times bigger. Reading every page now takes 10,000 looks.",
        "Halving only needs about 14 looks, because each look throws away half of what is left.",
        "Big-O is the name for that growth: linear search grows like the number of pages, halving grows like how many times you can halve it.",
      ],
      analogyLimit:
        "Halving only works because the phone book is sorted. Big-O also hides constant costs: on a tiny list, a simple linear scan can beat binary search in real time, and Big-O says nothing about which is faster at a fixed size.",
    },
    senior: {
      definition:
        "f(n) is O(g(n)) if there exist constants c and n0 such that f(n) <= c * g(n) for all n >= n0. It is an upper bound on growth, used here for the worst-case number of comparisons.",
      invariants: [
        "Binary search requires a sorted array with O(1) random access.",
        "Loop invariant for binary search: if the target is present, it lies in xs[lo..hi].",
        "Each iteration at least halves hi - lo + 1, so the loop runs at most floor(log2 n) + 1 times.",
      ],
      mechanism: [
        "Linear search compares elements in order and stops at the first match; the worst case (target last or absent) costs n comparisons.",
        "Binary search compares the middle element, then discards the half that cannot contain the target. After k steps at most n / 2^k elements remain.",
        "Counting steps rather than timing removes machine noise and makes the result identical in Python and R.",
      ],
      complexity:
        "Linear search: O(n) time, O(1) space. Binary search: O(log n) time, O(1) space iteratively. Sorting first costs O(n log n), so binary search pays off only when you search the same data many times.",
      tradeoffs: [
        { option: "Linear scan", choose: "Unsorted data, a single lookup, or very small n.", cost: "O(n) per lookup." },
        { option: "Sort once, then binary search", choose: "Many lookups on data that rarely changes.", cost: "O(n log n) up front and sorted order must be maintained on inserts." },
        { option: "Hash set or map", choose: "Exact-match lookups with no ordering needs.", cost: "O(n) extra memory; no range queries; expected rather than worst-case O(1)." },
      ],
      failureModes: [
        "Computing mid as (lo + hi) / 2 in fixed-width integer languages can overflow; use lo + (hi - lo) / 2.",
        "Off-by-one loop bounds (lo < hi versus lo <= hi) that skip the last candidate or loop forever.",
        "Running binary search on unsorted data and getting silent wrong answers.",
        "Quoting O(1) for hash maps while ignoring the O(n) worst case under adversarial collisions.",
      ],
      production:
        "Complexity decides what survives scale: an O(n^2) dedupe that takes 1 second on 10,000 rows takes roughly 3 hours on 1,000,000 rows. In data pipelines, indexes and sorted files exist so queries can use the log n path.",
      interviewAnswer:
        "Linear search is O(n) because the worst case touches every element. Binary search is O(log n) because each comparison halves the remaining range, but it needs sorted input with random access. If I search once, I scan; if I search many times, I sort once or build a hash set.",
    },
    implementation: {
      problem: "Count the comparisons linear and binary search make to find the last element of 0..n-1 as n grows.",
      input: "n in [10, 100, 1000, 10000]; xs = 0..n-1; target = n - 1",
      python: {
        code: code`
          def linear_steps(xs: list[int], target: int) -> int:
              steps = 0
              for x in xs:
                  steps += 1
                  if x == target:
                      break
              return steps


          def binary_steps(xs: list[int], target: int) -> int:
              lo, hi, steps = 0, len(xs) - 1, 0
              while lo <= hi:
                  steps += 1
                  mid = (lo + hi) // 2
                  if xs[mid] == target:
                      break
                  if xs[mid] < target:
                      lo = mid + 1
                  else:
                      hi = mid - 1
              return steps


          for n in [10, 100, 1000, 10000]:
              xs = list(range(n))
              print(f"n={n}: linear={linear_steps(xs, n - 1)} binary={binary_steps(xs, n - 1)}")
        `,
      },
      r: {
        code: code`
          linear_steps <- function(xs, target) {
            steps <- 0L
            for (x in xs) {
              steps <- steps + 1L
              if (x == target) break
            }
            steps
          }

          binary_steps <- function(xs, target) {
            lo <- 1L
            hi <- length(xs)
            steps <- 0L
            while (lo <= hi) {
              steps <- steps + 1L
              mid <- (lo + hi) %/% 2L
              if (xs[mid] == target) break
              if (xs[mid] < target) lo <- mid + 1L else hi <- mid - 1L
            }
            steps
          }

          for (n in c(10L, 100L, 1000L, 10000L)) {
            xs <- 0:(n - 1L)
            cat(sprintf("n=%d: linear=%d binary=%d\n", n, linear_steps(xs, n - 1L), binary_steps(xs, n - 1L)))
          }
        `,
      },
      expectedOutput: code`
        n=10: linear=10 binary=4
        n=100: linear=100 binary=7
        n=1000: linear=1000 binary=10
        n=10000: linear=10000 binary=14
      `,
      tests: {
        python: code`
          def test_binary_steps_are_logarithmic():
              assert binary_steps(list(range(1024)), 1023) == 11


          def test_empty_input_takes_no_steps():
              assert binary_steps([], 3) == 0
              assert linear_steps([], 3) == 0


          def test_absent_target_is_worst_case():
              assert linear_steps([1, 2, 3], 9) == 3
              assert binary_steps([1, 3, 5], 4) == 2
        `,
        r: code`
          test_that("binary steps are logarithmic", {
            expect_equal(binary_steps(0:1023, 1023), 11L)
          })

          test_that("empty input takes no steps", {
            expect_equal(binary_steps(integer(0), 3), 0L)
            expect_equal(linear_steps(integer(0), 3), 0L)
          })

          test_that("an absent target is the worst case", {
            expect_equal(linear_steps(c(1, 2, 3), 9), 3L)
            expect_equal(binary_steps(c(1, 3, 5), 4), 2L)
          })
        `,
      },
      eli5Trace: [
        "For n = 10 the target is 9, the last element, so linear search looks at all 10 numbers.",
        "Binary search looks at 4 (too small), then 7 (too small), then 8 (too small), then 9: 4 looks.",
        "Each time n grows 10 times, linear search does 10 times more work.",
        "Binary search only adds about 3 or 4 looks, because 10 is about 2 to the power 3.3.",
      ],
      complexity: { time: "Linear O(n), binary O(log n)", space: "O(1) for both" },
      edgeCases: [
        "Empty array: both return 0 steps without indexing.",
        "Target smaller than every element: binary search shrinks hi below lo and stops.",
        "Duplicates: binary search returns some matching index, not necessarily the first.",
        "R uses 1-based indexes; (lo + hi) %/% 2 with lo = 1 picks the same element as the 0-based Python version.",
      ],
      incorrect: {
        language: "python",
        code: code`
          def binary_steps(xs, target):
              lo, hi, steps = 0, len(xs), 0
              while lo < hi:
                  steps += 1
                  mid = (lo + hi) // 2
                  if xs[mid] < target:
                      lo = mid
                  else:
                      hi = mid
              return steps
        `,
        whyWrong: "Setting lo = mid instead of mid + 1 never shrinks a two-element range when the target is on the right, so the loop never ends.",
        fix: "Exclude mid after comparing it: lo = mid + 1 or hi = mid - 1, with the inclusive bound lo <= hi.",
      },
    },
    flow: {
      title: "Binary search halves the range",
      nodes: [
        node("range", "Range 0..9", 0, 100, "10 candidates"),
        node("mid1", "Check 4", 200, 100, "4 < 9, go right"),
        node("mid2", "Check 7", 400, 100, "range 5..9"),
        node("mid3", "Check 8", 600, 100, "range 8..9"),
        node("found", "Check 9", 800, 100, "found in 4 steps"),
      ],
      edges: [edge("range", "mid1"), edge("mid1", "mid2"), edge("mid2", "mid3"), edge("mid3", "found")],
      steps: [
        step("range mid1", "range-mid1", "Start with all 10 candidates and compare the middle element, 4. The target 9 is larger, so drop 0..4."),
        step("mid1 mid2", "mid1-mid2", "Five candidates remain (5..9). The middle is 7, still smaller, so drop 5..7."),
        step("mid2 mid3", "mid2-mid3", "Two candidates remain (8..9). The middle is 8, still smaller."),
        step("mid3 found", "mid3-found", "One candidate remains and it is 9. Four comparisons instead of ten."),
      ],
    },
    practice: [
      {
        id: "w01-bigo-recall-1",
        type: "recall",
        prompt: "What is the maximum number of comparisons binary search needs on 1,000,000 sorted items?",
        answer: "floor(log2(1,000,000)) + 1 = 20, because 2^20 is about 1.05 million.",
        rubric: ["Uses log base 2", "Gets 20"],
      },
      {
        id: "w01-bigo-recall-2",
        type: "recall",
        prompt: "When is a linear scan the better choice even though binary search is asymptotically faster?",
        answer: "When the data is unsorted and searched once (sorting costs O(n log n)), or when n is so small that constant factors dominate.",
        rubric: ["Sorting cost", "Single lookup", "Small n constant factors"],
      },
      {
        id: "w01-bigo-code-1",
        type: "code",
        prompt: "Modify binary_steps to return the index of the first occurrence of the target in a list with duplicates, or -1.",
        answer: "On a match, record the index and keep searching left (hi = mid - 1). Return the recorded index after the loop.",
        rubric: ["Continues left after a match", "Returns -1 when absent", "Still O(log n)"],
      },
    ],
    references: [
      { title: "Introduction to Algorithms (Cormen, Leiserson, Rivest, Stein), chapter on growth of functions", versionSensitive: false },
      { title: "Python documentation: bisect module", url: "https://docs.python.org/3/library/bisect.html", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w01-d03-testing-reproducibility",
    slug: "testing-reproducibility",
    title: "Tests and reproducible splits",
    domain: "foundations",
    roles: ["sde", "data-scientist", "ml-engineer", "data-engineer"],
    difficulty: "beginner",
    minutes: 70,
    prerequisites: ["w01-d01-python-r-idioms"],
    objectives: [
      "Write tests in Python and R that pin down behavior, including edge cases",
      "Make a train/test split that never changes between runs, machines or row orders",
      "List what else reproducibility needs: pinned environments, versioned data and code",
    ],
    summary:
      "A reproducible result comes out the same every time from the same inputs. Hash-based splitting shows how to remove hidden state, and tests show how to prove it stays that way.",
    eli5: {
      analogy:
        "Sorting kids into two teams by the last digit of their birthday instead of by drawing names from a hat. Every time you sort, each kid lands on the same team, even if they line up in a different order.",
      steps: [
        "Turn each user's name into a number with a fixed recipe.",
        "Keep only the last two digits, a bucket from 00 to 99.",
        "Buckets below 20 go to the test team, the rest to the train team.",
        "Write tests that check the same name always gets the same team, whatever order the names arrive in.",
      ],
      analogyLimit:
        "Birthdays spread out fairly evenly, but a simple recipe for turning names into numbers may not: here consecutive ids land in evenly spaced buckets. A real system uses a well-mixed hash so the teams are close to the intended sizes.",
    },
    senior: {
      definition:
        "A deterministic split assigns each entity to a partition with a pure function of a stable key: partition = f(hash(key) mod B). Because it depends on nothing but the key, it is invariant to row order, process restarts and data appends.",
      invariants: [
        "The hash function is pure and stable across runs, platforms and language versions.",
        "The key identifies the entity whose rows must stay together (a user, not an event), which also prevents leakage across the split.",
        "Adding new ids never moves existing ids between partitions.",
      ],
      mechanism: [
        "bucket(id) sums each character code weighted by its position, then takes mod 100. It is deterministic in both languages because it only uses integer arithmetic on code points.",
        "Ids whose bucket is below the test percentage go to test. With a well-mixed hash, the expected test share is test_percent / 100.",
        "Tests are plain functions in Python (test_*) and test_that() blocks in R. They pin determinism, order invariance and the share on a large sample.",
        "Python's built-in hash() is salted per process for strings, so it must never be used for splits; a fixed function or hashlib is required.",
      ],
      complexity: "O(n * L) for n ids of length L. No state is stored, so assignment is O(1) memory per id.",
      tradeoffs: [
        { option: "Random split with a seed", choose: "One-off analysis in a single language and environment.", cost: "Changes if row order, row count, library version or language changes." },
        { option: "Hash of a stable key", choose: "Pipelines, experiments and anything rerun over growing data.", cost: "Needs a stable entity key and a well-mixed hash; share is only approximately the target." },
        { option: "Time-based split", choose: "Forecasting or anything where the future must not leak into training.", cost: "Distribution shift between periods; not an unbiased random sample." },
      ],
      failureModes: [
        "Using Python's salted hash() so splits change every process start.",
        "Hashing the row index instead of the entity id, so the same user lands in both train and test.",
        "A poorly mixed hash producing skewed shares, as this toy hash does for sequential ids.",
        "Tests that only cover the happy path and never assert order invariance.",
      ],
      production:
        "Reproducibility also needs pinned environments (a lockfile or renv.lock), versioned data snapshots and code under Git, with CI running tests on every change. A notebook that only works on one laptop is a liability, not an asset.",
      interviewAnswer:
        "I would split on a stable entity key with a deterministic hash, for example sha256 of the user id mod 100, and put buckets below 20 in test. It is reproducible across runs and machines, keeps each user on one side so there is no leakage, and new users never move old ones. I would add tests for determinism and order invariance, and pin the environment so CI reproduces it.",
    },
    implementation: {
      problem: "Assign user ids to train or test with a stable hash so the split never changes between runs or row orders.",
      input: "ids user-001 .. user-010, 100 buckets, test_percent = 20",
      python: {
        code: code`
          def bucket(user_id: str, buckets: int = 100) -> int:
              return sum((i + 1) * ord(ch) for i, ch in enumerate(user_id)) % buckets


          def split_ids(user_ids: list[str], test_percent: int = 20) -> dict[str, str]:
              return {u: "test" if bucket(u) < test_percent else "train" for u in user_ids}


          ids = [f"user-{n:03d}" for n in range(1, 11)]
          assignment = split_ids(ids)
          for u in ids:
              print(f"{u} bucket={bucket(u):02d} {assignment[u]}")
          print(f"test share: {sum(v == 'test' for v in assignment.values())}/{len(ids)}")
        `,
      },
      r: {
        code: code`
          bucket <- function(user_id, buckets = 100) {
            codes <- utf8ToInt(user_id)
            sum(seq_along(codes) * codes) %% buckets
          }

          split_ids <- function(user_ids, test_percent = 20) {
            b <- vapply(user_ids, bucket, numeric(1))
            setNames(ifelse(b < test_percent, "test", "train"), user_ids)
          }

          ids <- sprintf("user-%03d", 1:10)
          assignment <- split_ids(ids)
          for (u in ids) cat(sprintf("%s bucket=%02d %s\n", u, bucket(u), assignment[[u]]))
          cat(sprintf("test share: %d/%d\n", sum(assignment == "test"), length(ids)))
        `,
      },
      expectedOutput: code`
        user-001 bucket=47 train
        user-002 bucket=55 train
        user-003 bucket=63 train
        user-004 bucket=71 train
        user-005 bucket=79 train
        user-006 bucket=87 train
        user-007 bucket=95 train
        user-008 bucket=03 test
        user-009 bucket=11 test
        user-010 bucket=46 train
        test share: 2/10
      `,
      tests: {
        python: code`
          def test_same_id_same_bucket():
              assert bucket("user-042") == bucket("user-042")


          def test_order_does_not_change_assignment():
              ids = [f"user-{n:03d}" for n in range(1, 51)]
              assert split_ids(ids) == split_ids(list(reversed(ids)))


          def test_share_is_close_to_target_on_many_ids():
              ids = [f"user-{n:03d}" for n in range(1, 1001)]
              share = sum(v == "test" for v in split_ids(ids).values()) / len(ids)
              assert 0.15 <= share <= 0.25
        `,
        r: code`
          test_that("the same id always gets the same bucket", {
            expect_identical(bucket("user-042"), bucket("user-042"))
          })

          test_that("row order does not change the assignment", {
            ids <- sprintf("user-%03d", 1:50)
            expect_identical(split_ids(ids)[ids], split_ids(rev(ids))[ids])
          })

          test_that("the share is close to the target on many ids", {
            ids <- sprintf("user-%03d", 1:1000)
            share <- mean(split_ids(ids) == "test")
            expect_gte(share, 0.15)
            expect_lte(share, 0.25)
          })
        `,
      },
      eli5Trace: [
        "Take user-001. Multiply each character's code by its position and add them up.",
        "Keep the last two digits of the total: 47. 47 is not below 20, so user-001 trains.",
        "user-008 lands in bucket 03, which is below 20, so it goes to test.",
        "Run it again, on another machine, or with the ids shuffled: every id lands in the same bucket.",
      ],
      complexity: { time: "O(n * L)", space: "O(n) for the assignment map", note: "n ids of length L" },
      edgeCases: [
        "Empty id: the sum is 0, so it lands in bucket 0 (test). Validate ids before splitting.",
        "Non-ASCII ids: ord() and utf8ToInt() both return Unicode code points, so results still match.",
        "Changing test_percent moves ids between sets; changing the hash recipe reshuffles everyone.",
        "Sequential ids produce evenly spaced buckets with this toy hash, so the share can be off on small samples.",
      ],
      incorrect: {
        language: "python",
        code: code`
          def bucket(user_id: str, buckets: int = 100) -> int:
              return hash(user_id) % buckets
        `,
        whyWrong: "Python salts str hashes per process (PYTHONHASHSEED), so the same id lands in different buckets on every run.",
        fix: "Use a fixed function of the characters or hashlib.sha256(user_id.encode()).digest() converted to an integer.",
      },
    },
    flow: {
      title: "A split that depends only on the key",
      nodes: [
        node("id", "User id", 0, 110, "user-008"),
        node("hash", "Stable hash", 210, 110, "position-weighted sum"),
        node("mod", "Bucket", 420, 110, "sum mod 100 = 03"),
        node("test", "Test set", 640, 30, "bucket < 20"),
        node("train", "Train set", 640, 190, "bucket >= 20"),
        node("ci", "Tests in CI", 850, 110, "determinism, order"),
      ],
      edges: [edge("id", "hash"), edge("hash", "mod"), edge("mod", "test"), edge("mod", "train"), edge("test", "ci"), edge("train", "ci")],
      steps: [
        step("id hash", "id-hash", "Start from a stable entity key, never a row number or a random draw."),
        step("hash mod", "hash-mod", "Turn the key into a number with a pure function, then keep it mod 100 to get a bucket."),
        step("mod test", "mod-test", "user-008 has bucket 03, which is below 20, so it goes to test, today and every day."),
        step("mod train", "mod-train", "Every other bucket goes to train. New users never move existing ones."),
        step("ci test train", "test-ci train-ci", "Tests in CI assert determinism, order invariance and the share, so a refactor cannot silently reshuffle the split."),
      ],
    },
    practice: [
      {
        id: "w01-repro-recall-1",
        type: "recall",
        prompt: "Why must you never use Python's built-in hash() for a train/test split?",
        answer: "String hashing is salted per process, so the same id maps to different values on each run unless PYTHONHASHSEED is fixed.",
        rubric: ["Mentions salting or PYTHONHASHSEED", "Explains the split changes between runs"],
      },
      {
        id: "w01-repro-design-1",
        type: "design",
        prompt: "Your model's offline accuracy dropped after a teammate reran the notebook with no code changes. List what could differ and how you would make the run reproducible.",
        answer:
          "Data snapshot, random seeds, library versions, row order, hardware nondeterminism. Fix with versioned data, a lockfile, seeds set in code, deterministic splits on a stable key, and CI that reruns the pipeline.",
        rubric: ["Data version", "Environment pinning", "Seeds or deterministic split", "CI check"],
      },
    ],
    references: [
      { title: "pytest documentation: getting started", url: "https://docs.pytest.org/en/stable/getting-started.html", versionSensitive: true },
      { title: "testthat documentation", url: "https://testthat.r-lib.org/", versionSensitive: true },
      { title: "Python documentation: PYTHONHASHSEED", url: "https://docs.python.org/3/using/cmdline.html#envvar-PYTHONHASHSEED", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),
];

export const week = defineWeek({
  number: 1,
  slug: "foundations-and-diagnostics",
  title: "Foundations and diagnostics",
  track: "core",
  domains: ["foundations"],
  summary:
    "Set up the habits every later week depends on: reading Python and R side by side, reasoning about complexity, and producing results that come out the same every time.",
  outcomes: [
    "Translate small programs between Python and R by meaning, not line by line",
    "Estimate growth with Big-O and justify it by counting work",
    "Write tests and reproducible splits that survive reruns and new machines",
  ],
  roles: ["sde", "data-scientist", "ml-engineer", "genai-engineer", "data-engineer"],
  days: [
    {
      id: "w01-d01",
      day: 1,
      kind: "concept-map",
      title: "Python and R side by side",
      summary: "Map the core moves (split, count, sort, take k) between the two languages and run your first paired example.",
      minutes: 60,
      goals: ["Run the paired example in both languages", "Explain the tie-break that keeps outputs identical"],
      tasks: [
        { label: "Read the ELI5 and Senior explanations", minutes: 15 },
        { label: "Run and modify the Python and R examples", minutes: 25 },
        { label: "Answer the recall prompts", minutes: 10 },
        { label: "Self-assess: write down which language feels weaker", minutes: 10 },
      ],
      topicIds: ["w01-d01-python-r-idioms"],
    },
    {
      id: "w01-d02",
      day: 2,
      kind: "theory-lab",
      title: "Big-O by counting",
      summary: "Count comparisons for linear and binary search to see n and log n growth without a stopwatch.",
      minutes: 75,
      goals: ["Derive log n for binary search", "Name the precondition binary search needs"],
      tasks: [
        { label: "Step through the binary search diagram", minutes: 15 },
        { label: "Run the step counter for growing n", minutes: 20 },
        { label: "Fix the infinite-loop bug in the incorrect version", minutes: 20 },
        { label: "Practice prompts", minutes: 20 },
      ],
      topicIds: ["w01-d02-big-o-complexity"],
    },
    {
      id: "w01-d03",
      day: 3,
      kind: "implementation",
      title: "Tests and reproducible splits",
      summary: "Build a deterministic train/test split in both languages and pin it with tests.",
      minutes: 90,
      goals: ["Write a split that is invariant to row order", "Run the Python tests and the testthat tests"],
      tasks: [
        { label: "Read why salted hashes break reproducibility", minutes: 15 },
        { label: "Run the paired split and its tests", minutes: 30 },
        { label: "Add a test of your own in each language", minutes: 30 },
        { label: "Design prompt: the notebook that changed", minutes: 15 },
      ],
      topicIds: ["w01-d03-testing-reproducibility"],
    },
    {
      id: "w01-d04",
      day: 4,
      kind: "applied-practice",
      title: "Diagnostic problem set",
      summary: "Mixed drills across the week's topics to find your starting level before the curriculum ramps up.",
      minutes: 75,
      goals: ["Attempt every drill before reading answers", "Rate confidence before each answer"],
      tasks: [
        { label: "Recall drills with confidence ratings", minutes: 25 },
        { label: "Code drills in your weaker language", minutes: 35 },
        { label: "Log weak areas for review", minutes: 15 },
      ],
      topicIds: ["w01-d01-python-r-idioms", "w01-d02-big-o-complexity", "w01-d03-testing-reproducibility"],
    },
    {
      id: "w01-d05",
      day: 5,
      kind: "production-lens",
      title: "The notebook nobody can rerun",
      summary: "A production case about environments, data versions and CI for analysis code.",
      minutes: 60,
      goals: ["Write a reproducibility checklist for a real project"],
      tasks: [
        { label: "Read the scenario and constraints", minutes: 10 },
        { label: "Answer the case questions in writing", minutes: 35 },
        { label: "Compare against the rubric", minutes: 15 },
      ],
      topicIds: ["w01-d03-testing-reproducibility"],
      productionCase: {
        title: "A churn notebook that changes every time it runs",
        scenario:
          "A teammate left a churn analysis notebook that leadership quotes every quarter. When you rerun it, the headline retention number moves by two points, and on your laptop one cell fails with a library error.",
        constraints: [
          "The source table keeps growing and old rows are occasionally corrected.",
          "The notebook mixes Python for extraction and R for the model.",
          "You have one week and cannot rewrite the analysis from scratch.",
        ],
        questions: [
          "Which sources of nondeterminism would you check first, and in what order?",
          "How would you pin the environment for both the Python and R parts?",
          "How would you make the train/test split stable as new rows arrive?",
          "What would CI check on every change?",
        ],
        rubric: [
          "Identifies data versioning (snapshot or as-of date) as the first fix",
          "Pins environments with a lockfile and renv.lock (or containers)",
          "Replaces random splits with a stable key hash",
          "Adds tests and a CI job that reruns the notebook end to end",
          "Communicates the corrected number and why it moved",
        ],
        pitfalls: [
          "Only setting a random seed, which does not survive new rows or library upgrades",
          "Fixing your laptop instead of the project definition",
        ],
      },
    },
    {
      id: "w01-d06",
      day: 6,
      kind: "interview-simulation",
      title: "Warm-up mock: complexity and code reading",
      summary: "A short timed round: explain complexity out loud and translate a function between languages.",
      minutes: 45,
      goals: ["Answer within the time box", "Practice saying complexity before coding"],
      tasks: [
        { label: "Timed recall round", minutes: 15 },
        { label: "Timed translation round", minutes: 20 },
        { label: "Score yourself with the rubric", minutes: 10 },
      ],
      topicIds: ["w01-d01-python-r-idioms", "w01-d02-big-o-complexity"],
    },
    {
      id: "w01-d07",
      day: 7,
      kind: "review",
      title: "Diagnostics review and gap list",
      summary: "Spaced review of the week and a written list of gaps to watch in later weeks.",
      minutes: 45,
      goals: ["Clear every due review", "Write three gaps with a plan for each"],
      tasks: [
        { label: "Due reviews", minutes: 20 },
        { label: "Revisit the lowest-mastery topic", minutes: 15 },
        { label: "Write the gap list", minutes: 10 },
      ],
      topicIds: ["w01-d01-python-r-idioms", "w01-d02-big-o-complexity", "w01-d03-testing-reproducibility"],
    },
  ],
});
