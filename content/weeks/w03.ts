import { REVIEWED, code, defineTopic, defineWeek, edge, node, step } from "../helpers";

export const topics = [
  defineTopic({
    id: "w03-d01-hashing-patterns",
    slug: "hashing-patterns",
    title: "Arrays, strings and hashing",
    domain: "dsa",
    roles: ["sde", "ml-engineer", "genai-engineer", "data-engineer"],
    difficulty: "beginner",
    minutes: 60,
    prerequisites: ["w01-d02-big-o-complexity"],
    objectives: [
      "Recognize when a canonical key turns a search problem into a hash lookup",
      "Group anagrams in O(n * L log L) with a hash map",
      "Explain expected versus worst-case hash map performance",
    ],
    summary:
      "Hash maps turn 'have I seen something like this?' into an O(1) expected lookup. The trick is choosing a key that is identical for everything that should match.",
    eli5: {
      analogy:
        "Sorting mail into pigeonholes. For anagrams, the label on each pigeonhole is the word's letters in alphabetical order, so 'eat', 'tea' and 'ate' all go into the hole labeled 'aet'.",
      steps: [
        "Take a word and sort its letters to make its label.",
        "Find the pigeonhole with that label, or make a new one.",
        "Drop the word in.",
        "When every word is sorted, each pigeonhole holds one group of anagrams.",
      ],
      analogyLimit:
        "Real pigeonholes are found by reading the label. A hash map computes a number from the label to jump straight to a slot, and two different labels can land in the same slot (a collision), which the map must handle.",
    },
    senior: {
      definition:
        "A hash map stores key-value pairs in an array of buckets indexed by hash(key) mod capacity. Grouping by a canonical key (here, the sorted letters) partitions items into equivalence classes in one pass.",
      invariants: [
        "Two words are anagrams if and only if their sorted letters are equal, so the canonical key is exact, not approximate.",
        "Keys must be immutable and hashable: a tuple or string in Python, a character string in R.",
        "Load factor stays bounded by resizing, which keeps expected lookups O(1).",
      ],
      mechanism: [
        "For each word, sorting its L letters costs O(L log L). A counting key (26 letter counts) is O(L) and avoids the sort.",
        "defaultdict(list) appends the word to its group; R's split() does the same grouping by a key vector.",
        "Collisions are resolved by chaining or open addressing; Python's dict uses open addressing with perturbation.",
        "Groups are sorted before printing so the output is deterministic in both languages.",
      ],
      complexity: "O(n * L log L) time with the sorted key, O(n * L) with a letter-count key; O(n * L) space for the groups.",
      tradeoffs: [
        { option: "Sorted-letters key", choose: "Short words and readable code.", cost: "O(L log L) per word." },
        { option: "Letter-count key", choose: "Long strings over a small alphabet.", cost: "Key is a 26-tuple; awkward for Unicode." },
        { option: "Pairwise comparison", choose: "Never for grouping; only for checking a single pair.", cost: "O(n^2) comparisons." },
      ],
      failureModes: [
        "Using a mutable list as a dict key (TypeError in Python).",
        "Forgetting to normalize case or whitespace, so 'Tea' and 'eat' land in different groups.",
        "Assuming dict iteration order is sorted; it is insertion order.",
        "Adversarial inputs that collide in a weak hash and degrade lookups to O(n).",
      ],
      production:
        "The same pattern dedupes records by a normalized key (lowercased email, canonical address) and powers GROUP BY in databases through hash aggregation.",
      interviewAnswer:
        "I map each word to a canonical key, its sorted letters, and group words in a hash map from key to list. That is O(n * L log L) time and O(n * L) space; a letter-count key makes it O(n * L). I would normalize case first and sort the output if order matters.",
    },
    implementation: {
      problem: "Group words that are anagrams of each other and print each group in alphabetical order.",
      input: 'words = ["eat", "tea", "tan", "ate", "nat", "bat"]',
      python: {
        code: code`
          from collections import defaultdict


          def group_anagrams(words: list[str]) -> list[list[str]]:
              groups: dict[str, list[str]] = defaultdict(list)
              for w in words:
                  groups["".join(sorted(w))].append(w)
              return sorted(sorted(g) for g in groups.values())


          groups = group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"])
          print(f"groups: {len(groups)}")
          for g in groups:
              print(" ".join(g))
        `,
      },
      r: {
        code: code`
          group_anagrams <- function(words) {
            keys <- vapply(words, function(w) paste(sort(strsplit(w, "")[[1]]), collapse = ""), character(1))
            groups <- lapply(split(words, keys), sort)
            groups[order(vapply(groups, function(g) g[1], character(1)))]
          }

          groups <- group_anagrams(c("eat", "tea", "tan", "ate", "nat", "bat"))
          cat(sprintf("groups: %d\n", length(groups)))
          for (g in groups) cat(paste(g, collapse = " "), "\n", sep = "")
        `,
      },
      expectedOutput: code`
        groups: 3
        ate eat tea
        bat
        nat tan
      `,
      tests: {
        python: code`
          def test_empty_input():
              assert group_anagrams([]) == []


          def test_single_letters_and_duplicates():
              assert group_anagrams(["a", "a", "b"]) == [["a", "a"], ["b"]]


          def test_all_anagrams():
              assert group_anagrams(["listen", "silent", "enlist"]) == [["enlist", "listen", "silent"]]
        `,
        r: code`
          test_that("duplicates stay in one group", {
            res <- group_anagrams(c("a", "a", "b"))
            expect_equal(unname(res), list(c("a", "a"), "b"))
          })

          test_that("all anagrams form one group", {
            res <- group_anagrams(c("listen", "silent", "enlist"))
            expect_length(res, 1)
            expect_equal(res[[1]], c("enlist", "listen", "silent"))
          })
        `,
      },
      eli5Trace: [
        "eat becomes aet, tea becomes aet, ate becomes aet: one pigeonhole.",
        "tan and nat both become ant: a second pigeonhole.",
        "bat becomes abt, alone in a third pigeonhole.",
        "Sort inside each group and sort the groups: ate eat tea, bat, nat tan.",
      ],
      complexity: { time: "O(n * L log L)", space: "O(n * L)", note: "n words of length up to L" },
      edgeCases: [
        "Empty list returns no groups.",
        "Duplicate words stay together in one group.",
        "Case differences need normalizing first if 'Tea' should match 'eat'.",
        "R's sort() is locale-aware; for plain lowercase ASCII it matches Python.",
      ],
      incorrect: {
        language: "python",
        code: code`
          groups = {}
          for w in words:
              groups.setdefault(sorted(w), []).append(w)
        `,
        whyWrong: "sorted(w) returns a list, which is mutable and unhashable, so Python raises TypeError.",
        fix: "Convert the key to an immutable value: ''.join(sorted(w)) or tuple(sorted(w)).",
      },
    },
    flow: {
      title: "Canonical keys route words into groups",
      nodes: [
        node("words", "Words", 0, 110, "eat tea tan ate nat bat"),
        node("key", "Canonical key", 230, 110, "sorted letters"),
        node("aet", "aet", 480, 0, "eat tea ate"),
        node("ant", "ant", 480, 110, "tan nat"),
        node("abt", "abt", 480, 220, "bat"),
        node("out", "Sorted groups", 740, 110, "3 groups"),
      ],
      edges: [edge("words", "key"), edge("key", "aet"), edge("key", "ant"), edge("key", "abt"), edge("aet", "out"), edge("ant", "out"), edge("abt", "out")],
      steps: [
        step("words key", "words-key", "Each word is turned into a canonical key by sorting its letters."),
        step("key aet", "key-aet", "eat, tea and ate all produce aet, so they land in the same bucket."),
        step("key ant", "key-ant", "tan and nat produce ant: a second group."),
        step("key abt", "key-abt", "bat produces abt and stays alone."),
        step("aet ant abt out", "aet-out ant-out abt-out", "Sort inside each group and across groups so the output is deterministic."),
      ],
    },
    practice: [
      {
        id: "w03-hash-code-1",
        type: "code",
        prompt: "Two sum: return the indices of two numbers that add up to a target, in one pass.",
        answer: "Keep a map value -> index. For each x at i, if target - x is in the map, return (map[target - x], i); otherwise store map[x] = i. O(n) time, O(n) space.",
        rubric: ["Single pass", "Checks complement before inserting", "O(n) time and space"],
      },
      {
        id: "w03-hash-recall-1",
        type: "recall",
        prompt: "Why is a hash map lookup O(1) expected but O(n) worst case?",
        answer: "With a good hash and bounded load factor, each bucket holds O(1) keys on average. If many keys collide into one bucket, a lookup scans them all.",
        rubric: ["Load factor", "Collisions", "Distinguishes expected and worst case"],
      },
    ],
    references: [
      { title: "Python documentation: dict and mapping types", url: "https://docs.python.org/3/library/stdtypes.html#mapping-types-dict", versionSensitive: false },
      { title: "R documentation: split()", url: "https://stat.ethz.ch/R-manual/R-devel/library/base/html/split.html", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w03-d02-sliding-window",
    slug: "sliding-window",
    title: "Two pointers and sliding windows",
    domain: "dsa",
    roles: ["sde", "ml-engineer", "data-engineer"],
    difficulty: "intermediate",
    minutes: 75,
    prerequisites: ["w03-d01-hashing-patterns"],
    objectives: [
      "Maintain a window invariant while two pointers move forward only",
      "Find the longest substring without repeating characters in O(n)",
      "Tell fixed-size windows from variable-size windows",
    ],
    summary:
      "A sliding window keeps a running answer for a contiguous range while its left and right edges move forward. Each element enters and leaves at most once, so the whole scan is linear.",
    eli5: {
      analogy:
        "Reading a word through a cardboard tube that you slide along a line of letters. You stretch the tube to the right one letter at a time, and if a letter inside the tube repeats, you pull the tube's left edge past the earlier copy.",
      steps: [
        "Stretch the right edge to include the next letter.",
        "If that letter is already inside the tube, move the left edge just past where you last saw it.",
        "Measure the tube. If it is the longest so far, remember it.",
        "Keep going until the right edge reaches the end.",
      ],
      analogyLimit:
        "The tube trick works only because 'no repeats' stays true when you shrink the window. Problems where shrinking can break the condition, or where negative numbers make sums non-monotonic, need a different technique such as prefix sums.",
    },
    senior: {
      definition:
        "A variable-size sliding window maintains [start, i] such that an invariant holds (here, all characters distinct). The right pointer i advances every step; the left pointer start only moves right when the invariant breaks.",
      invariants: [
        "s[start..i] contains no repeated character after each iteration.",
        "last[ch] stores the most recent index of ch; a stale entry with last[ch] < start is ignored.",
        "Both pointers are non-decreasing, which bounds total movement by 2n.",
      ],
      mechanism: [
        "On seeing ch at i, if last[ch] >= start, jump start to last[ch] + 1 instead of shrinking one step at a time.",
        "Update last[ch] = i, then compare the window length i - start + 1 with the best so far.",
        "Store the best start and length, and slice once at the end.",
        "R needs the same logic with 1-based indexes; the slice is substr(s, best_start, best_start + best_len - 1).",
      ],
      complexity: "O(n) time and O(min(n, alphabet)) space for the last-seen map.",
      tradeoffs: [
        { option: "Jumping left pointer with a last-seen map", choose: "Default for distinct-character windows.", cost: "Needs a map; careful with stale entries." },
        { option: "Set and shrink one step at a time", choose: "When the invariant cannot jump directly (counts of k distinct).", cost: "Still O(n) amortized, more iterations." },
        { option: "Brute force over all substrings", choose: "Only as a test oracle.", cost: "O(n^2) or O(n^3)." },
      ],
      failureModes: [
        "Moving start backwards when a stale last[ch] is smaller than start.",
        "Off-by-one window length (i - start instead of i - start + 1).",
        "Assuming a sliding window works for sums with negative numbers.",
        "Indexing bytes instead of characters for non-ASCII strings.",
      ],
      production:
        "The same two-pointer idea powers rate limiters (count requests in the last N seconds), streaming deduplication and moving averages over event streams.",
      interviewAnswer:
        "I keep a window [start, i] with all distinct characters and a map from character to last index. For each i, if the character's last index is inside the window, I jump start past it, then update the best length. Each pointer only moves forward, so it is O(n) time and O(alphabet) space.",
    },
    implementation: {
      problem: "Find the longest substring without repeating characters for several inputs.",
      input: 'strings "abcabcbb", "bbbbb", "pwwkew", "dvdf", ""',
      python: {
        code: code`
          def longest_unique(s: str) -> tuple[int, str]:
              last: dict[str, int] = {}
              start = best_start = best_len = 0
              for i, ch in enumerate(s):
                  if last.get(ch, -1) >= start:
                      start = last[ch] + 1
                  last[ch] = i
                  if i - start + 1 > best_len:
                      best_len, best_start = i - start + 1, start
              return best_len, s[best_start:best_start + best_len]


          for s in ["abcabcbb", "bbbbb", "pwwkew", "dvdf", ""]:
              n, sub = longest_unique(s)
              print(f'"{s}" -> {n} "{sub}"')
        `,
      },
      r: {
        code: code`
          longest_unique <- function(s) {
            chars <- strsplit(s, "")[[1]]
            last <- new.env()
            start <- 1L
            best_start <- 1L
            best_len <- 0L
            for (i in seq_along(chars)) {
              ch <- chars[i]
              prev <- last[[ch]]
              if (!is.null(prev) && prev >= start) start <- prev + 1L
              last[[ch]] <- i
              if (i - start + 1L > best_len) {
                best_len <- i - start + 1L
                best_start <- start
              }
            }
            list(len = best_len, sub = substr(s, best_start, best_start + best_len - 1L))
          }

          for (s in c("abcabcbb", "bbbbb", "pwwkew", "dvdf", "")) {
            res <- longest_unique(s)
            cat(sprintf("\"%s\" -> %d \"%s\"\n", s, res$len, res$sub))
          }
        `,
      },
      expectedOutput: code`
        "abcabcbb" -> 3 "abc"
        "bbbbb" -> 1 "b"
        "pwwkew" -> 3 "wke"
        "dvdf" -> 3 "vdf"
        "" -> 0 ""
      `,
      tests: {
        python: code`
          def brute(s: str) -> int:
              return max((j - i for i in range(len(s)) for j in range(i, len(s) + 1) if len(set(s[i:j])) == j - i), default=0)


          def test_matches_brute_force():
              for s in ["abba", "tmmzuxt", "aab", "abcdef", "a"]:
                  assert longest_unique(s)[0] == brute(s)


          def test_stale_entries_do_not_move_start_back():
              assert longest_unique("abba") == (2, "ab")
        `,
        r: code`
          test_that("stale entries do not move start back", {
            res <- longest_unique("abba")
            expect_equal(res$len, 2L)
            expect_identical(res$sub, "ab")
          })

          test_that("known answers", {
            expect_equal(longest_unique("tmmzuxt")$len, 5L)
            expect_equal(longest_unique("aab")$len, 2L)
            expect_equal(longest_unique("")$len, 0L)
          })
        `,
      },
      eli5Trace: [
        "abcabcbb: the tube grows to abc. The next a repeats, so the left edge jumps past the first a: bca, then cab, then abc.",
        "The longest tube was 3 letters, first seen as abc.",
        "bbbbb: every new b repeats, so the tube never grows past 1.",
        "pwwkew: the second w forces the left edge past the first w; wke is the longest at 3.",
        "dvdf: when d repeats, the left edge jumps to v, giving vdf of length 3.",
      ],
      complexity: { time: "O(n)", space: "O(min(n, alphabet))" },
      edgeCases: [
        "Empty string returns length 0 and an empty substring.",
        "All characters equal returns 1.",
        "'abba': when the second a arrives, its last index 0 is before start 2 and must be ignored.",
        "Ties keep the first window of the maximum length.",
      ],
      incorrect: {
        language: "python",
        code: code`
          if ch in last:
              start = last[ch] + 1
        `,
        whyWrong: "It ignores whether the previous occurrence is still inside the window. On 'abba', the final a was last seen at index 0, before start = 2, yet the code moves start back to 1, so it reports 'bba' (length 3) even though b repeats.",
        fix: "Only jump when last[ch] >= start, or use start = max(start, last[ch] + 1).",
      },
    },
    flow: {
      title: "The window on 'pwwkew'",
      nodes: [
        node("p", "p", 0, 100, "index 0"),
        node("w1", "w", 130, 100, "index 1"),
        node("w2", "w", 260, 100, "index 2"),
        node("k", "k", 390, 100, "index 3"),
        node("e", "e", 520, 100, "index 4"),
        node("w3", "w", 650, 100, "index 5"),
        node("best", "Best", 850, 100, "length 3: wke"),
      ],
      edges: [edge("p", "w1"), edge("w1", "w2"), edge("w2", "k"), edge("k", "e"), edge("e", "w3"), edge("w3", "best")],
      steps: [
        step("p w1", "p-w1", "The window grows to pw. No repeats, best length 2."),
        step("w2", "", "The second w repeats the w at index 1, so start jumps to index 2. The window is just w."),
        step("w2 k e", "w2-k k-e", "The window grows to wke without repeats. New best length 3."),
        step("k e w3", "k-e e-w3", "The last w repeats index 2, so start jumps to 3: the window is kew, still length 3."),
        step("best", "w3-best", "The first window of length 3 was wke, which is the answer."),
      ],
    },
    practice: [
      {
        id: "w03-window-code-1",
        type: "code",
        prompt: "Return the maximum sum of any contiguous subarray of exactly k elements.",
        answer: "Fixed window: sum the first k, then for each i >= k add xs[i] and subtract xs[i - k], tracking the maximum. O(n) time, O(1) space.",
        rubric: ["Adds the new element and removes the old", "O(n)", "Handles k > n"],
      },
      {
        id: "w03-window-recall-1",
        type: "recall",
        prompt: "Why does a plain sliding window fail for 'shortest subarray with sum at least k' when numbers can be negative?",
        answer: "Shrinking the window can increase the sum when a negative number leaves, so the monotonic condition breaks. Use prefix sums with a monotonic deque instead.",
        rubric: ["Negative numbers break monotonicity", "Prefix sums or deque alternative"],
      },
    ],
    references: [
      { title: "Python documentation: str and sequence slicing", url: "https://docs.python.org/3/library/stdtypes.html#common-sequence-operations", versionSensitive: false },
      { title: "Introduction to Algorithms (CLRS), amortized analysis chapter", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w03-d03-prefix-sums-intervals",
    slug: "prefix-sums-intervals",
    title: "Prefix sums and intervals",
    domain: "dsa",
    roles: ["sde", "data-scientist", "data-engineer"],
    difficulty: "intermediate",
    minutes: 75,
    prerequisites: ["w03-d01-hashing-patterns"],
    objectives: [
      "Count subarrays with a target sum in O(n) using prefix sums and a hash map",
      "Merge overlapping intervals after sorting by start",
      "Explain why these work with negative numbers where windows fail",
    ],
    summary:
      "A prefix sum turns any range sum into a subtraction. Paired with a hash map of prefix counts, it counts target-sum subarrays in one pass. Sorting intervals by start lets you merge overlaps in one pass too.",
    eli5: {
      analogy:
        "A car's trip odometer. To know how far you drove between two stops, subtract the odometer readings. To find every stretch that was exactly 7 km, ask at each stop: 'did I ever read exactly 7 km less than now?'",
      steps: [
        "Keep a running total as you walk the list, like the odometer.",
        "Before you write today's reading in the logbook, check how many times the logbook already has 'today minus 7'.",
        "Each of those earlier readings starts a stretch that adds up to exactly 7.",
        "For intervals: line meetings up by start time, and glue each one onto the previous block if it starts before that block ends.",
      ],
      analogyLimit:
        "An odometer only goes up, but prefix sums can go down when numbers are negative. That is fine here (the subtraction still works), and it is exactly why this method beats a sliding window on negative numbers.",
    },
    senior: {
      definition:
        "prefix[i] = xs[0] + ... + xs[i - 1], so sum(xs[a:b]) = prefix[b] - prefix[a]. Counting pairs a < b with prefix[b] - prefix[a] = k becomes counting earlier prefixes equal to prefix[b] - k.",
      invariants: [
        "seen[p] is the number of indices before the current one whose prefix sum is p; it starts with seen[0] = 1 for the empty prefix.",
        "The lookup happens before inserting the current prefix, so a subarray never pairs a prefix with itself.",
        "For merging, after sorting by start, the merged list is sorted and non-overlapping after every step.",
      ],
      mechanism: [
        "Walk the array, update the running sum, add seen[running - k] to the answer, then increment seen[running].",
        "Intervals: sort by start; if the next start <= the current end, extend end = max(end, next end); otherwise start a new block.",
        "Touching intervals like [1, 3] and [3, 5] merge because the comparison is <=; change to < if touching should stay separate.",
      ],
      complexity: "Subarray count: O(n) time, O(n) space. Interval merge: O(n log n) for the sort, O(n) to merge.",
      tradeoffs: [
        { option: "Prefix sums + hash map", choose: "Counting or finding target-sum ranges with any signs.", cost: "O(n) memory for the map." },
        { option: "Sliding window", choose: "Non-negative numbers where shrinking reduces the sum.", cost: "Wrong answers with negatives." },
        { option: "2D prefix sums", choose: "Many rectangle-sum queries on a fixed grid.", cost: "O(rows * cols) preprocessing." },
      ],
      failureModes: [
        "Forgetting seen[0] = 1 and missing subarrays that start at index 0.",
        "Inserting the current prefix before the lookup when k = 0, counting empty subarrays.",
        "Merging intervals without sorting first.",
        "Mutating input intervals while merging and corrupting the caller's data.",
      ],
      production:
        "Prefix sums are cumulative metrics: cumulative revenue lets you answer any date-range total with two lookups. Interval merging computes on-call coverage, booked time or overlapping maintenance windows.",
      interviewAnswer:
        "I keep a running prefix sum and a hash map from prefix value to how many times I have seen it, seeded with 0 -> 1. At each step the number of subarrays ending here with sum k is seen[prefix - k]. It is O(n) and works with negative numbers. For intervals I sort by start and merge when the next start is at most the current end, O(n log n).",
    },
    implementation: {
      problem: "Count subarrays that sum to k, then merge overlapping intervals.",
      input: "nums = [3, 4, 7, 2, -3, 1, 4, 2], k = 7; intervals [1,3] [2,6] [8,10] [15,18]",
      python: {
        code: code`
          from collections import defaultdict


          def count_subarrays(nums: list[int], k: int) -> int:
              seen: dict[int, int] = defaultdict(int)
              seen[0] = 1
              running = count = 0
              for x in nums:
                  running += x
                  count += seen[running - k]
                  seen[running] += 1
              return count


          def merge(intervals: list[tuple[int, int]]) -> list[tuple[int, int]]:
              merged: list[tuple[int, int]] = []
              for start, end in sorted(intervals):
                  if merged and start <= merged[-1][1]:
                      merged[-1] = (merged[-1][0], max(merged[-1][1], end))
                  else:
                      merged.append((start, end))
              return merged


          nums = [3, 4, 7, 2, -3, 1, 4, 2]
          print(f"subarrays summing to 7: {count_subarrays(nums, 7)}")
          print("merged: " + " ".join(f"[{a},{b}]" for a, b in merge([(8, 10), (1, 3), (15, 18), (2, 6)])))
        `,
      },
      r: {
        code: code`
          count_subarrays <- function(nums, k) {
            seen <- new.env()
            seen[["0"]] <- 1L
            running <- 0
            count <- 0L
            for (x in nums) {
              running <- running + x
              key <- as.character(running - k)
              if (!is.null(seen[[key]])) count <- count + seen[[key]]
              cur <- as.character(running)
              seen[[cur]] <- if (is.null(seen[[cur]])) 1L else seen[[cur]] + 1L
            }
            count
          }

          merge_intervals <- function(starts, ends) {
            o <- order(starts, ends)
            starts <- starts[o]
            ends <- ends[o]
            out_s <- starts[1]
            out_e <- ends[1]
            for (i in seq_along(starts)[-1]) {
              last <- length(out_e)
              if (starts[i] <= out_e[last]) {
                out_e[last] <- max(out_e[last], ends[i])
              } else {
                out_s <- c(out_s, starts[i])
                out_e <- c(out_e, ends[i])
              }
            }
            list(starts = out_s, ends = out_e)
          }

          nums <- c(3, 4, 7, 2, -3, 1, 4, 2)
          cat(sprintf("subarrays summing to 7: %d\n", count_subarrays(nums, 7)))
          m <- merge_intervals(c(8, 1, 15, 2), c(10, 3, 18, 6))
          cat("merged: ", paste(sprintf("[%d,%d]", m$starts, m$ends), collapse = " "), "\n", sep = "")
        `,
      },
      expectedOutput: code`
        subarrays summing to 7: 4
        merged: [1,6] [8,10] [15,18]
      `,
      tests: {
        python: code`
          def brute(nums: list[int], k: int) -> int:
              return sum(1 for i in range(len(nums)) for j in range(i + 1, len(nums) + 1) if sum(nums[i:j]) == k)


          def test_matches_brute_force_with_negatives():
              for nums, k in [([1, -1, 0], 0), ([1, 1, 1], 2), ([-2, 2, -2, 2], 0)]:
                  assert count_subarrays(nums, k) == brute(nums, k)


          def test_touching_intervals_merge():
              assert merge([(1, 3), (3, 5)]) == [(1, 5)]


          def test_contained_interval():
              assert merge([(1, 10), (2, 3)]) == [(1, 10)]
        `,
        r: code`
          test_that("zero-sum subarrays are counted with negatives", {
            expect_equal(count_subarrays(c(1, -1, 0), 0), 3L)
            expect_equal(count_subarrays(c(-2, 2, -2, 2), 0), 4L)
          })

          test_that("touching intervals merge", {
            m <- merge_intervals(c(1, 3), c(3, 5))
            expect_equal(m$starts, 1)
            expect_equal(m$ends, 5)
          })

          test_that("a contained interval disappears", {
            m <- merge_intervals(c(1, 2), c(10, 3))
            expect_equal(m$ends, 10)
          })
        `,
      },
      eli5Trace: [
        "Running totals: 3, 7, 14, 16, 13, 14, 18, 20. The logbook starts with 0.",
        "At 7, the logbook has 0 (7 - 7): one stretch, [3, 4].",
        "At 14, it has 7: stretch [7]. At the second 14, it has 7 again: stretch [7, 2, -3, 1].",
        "At 20, it has 13: stretch [1, 4, 2]. Four stretches in total.",
        "Intervals sorted: [1,3] [2,6] [8,10] [15,18]. [2,6] starts before 3, so glue: [1,6]. The rest do not overlap.",
      ],
      complexity: { time: "O(n) and O(m log m)", space: "O(n) and O(m)", note: "n numbers, m intervals" },
      edgeCases: [
        "k = 0 with zeros in the array counts every zero-sum stretch, including single zeros.",
        "Subarrays starting at index 0 rely on the seeded seen[0] = 1.",
        "Touching intervals merge because the test uses <=.",
        "A single interval returns itself; an empty list returns an empty list (Python).",
      ],
      incorrect: {
        language: "python",
        code: code`
          seen = {}
          for x in nums:
              running += x
              seen[running] = seen.get(running, 0) + 1
              count += seen.get(running - k, 0)
        `,
        whyWrong: "It inserts the current prefix before the lookup and never seeds the empty prefix, so for k = 0 every position counts itself and subarrays starting at index 0 are missed.",
        fix: "Seed seen[0] = 1 and look up running - k before inserting running.",
      },
    },
    flow: {
      title: "Prefix sums find target-sum stretches",
      nodes: [
        node("arr", "nums", 0, 110, "3 4 7 2 -3 1 4 2"),
        node("prefix", "Running sum", 230, 110, "3 7 14 16 13 14 18 20"),
        node("lookup", "Look up sum - 7", 470, 30, "how many earlier?"),
        node("store", "Store sum", 470, 190, "seen[sum] += 1"),
        node("count", "Count", 720, 110, "4 subarrays"),
      ],
      edges: [edge("arr", "prefix"), edge("prefix", "lookup"), edge("lookup", "store"), edge("store", "prefix"), edge("lookup", "count")],
      steps: [
        step("arr prefix", "arr-prefix", "Walk the array once and keep a running sum, seeded with an empty prefix of 0."),
        step("prefix lookup", "prefix-lookup", "At running sum 7, look up 7 - 7 = 0: seen once, so [3, 4] sums to 7."),
        step("lookup store", "lookup-store", "Only after the lookup, record the current sum so a stretch never pairs with itself."),
        step("store prefix lookup", "store-prefix prefix-lookup", "Repeat. At 14, 7 was seen once; at the second 14, again once; at 20, 13 was seen once."),
        step("lookup count", "lookup-count", "Adding the lookups gives 4 subarrays, in one pass, even with the -3 in the middle."),
      ],
    },
    practice: [
      {
        id: "w03-prefix-code-1",
        type: "code",
        prompt: "Given meeting intervals, return the minimum number of rooms needed.",
        answer: "Sort start and end times separately and sweep with two pointers, or push ends into a min-heap; the max number of simultaneous meetings is the answer. O(n log n).",
        rubric: ["Sweep line or heap", "Handles touching meetings consistently", "O(n log n)"],
      },
      {
        id: "w03-prefix-recall-1",
        type: "recall",
        prompt: "How would you answer many 'sum of revenue between day a and day b' queries quickly?",
        answer: "Precompute cumulative revenue once (O(n)); each query is cum[b] - cum[a - 1] in O(1).",
        rubric: ["Precompute once", "O(1) per query"],
      },
    ],
    references: [
      { title: "Python documentation: itertools.accumulate", url: "https://docs.python.org/3/library/itertools.html#itertools.accumulate", versionSensitive: false },
      { title: "R documentation: cumsum()", url: "https://stat.ethz.ch/R-manual/R-devel/library/base/html/cumsum.html", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),
];

export const week = defineWeek({
  number: 3,
  slug: "dsa-arrays-strings-hashing",
  title: "DSA I: arrays, strings and hashing",
  track: "core",
  domains: ["dsa"],
  summary:
    "The patterns behind most array and string interview problems: canonical keys in hash maps, two pointers, sliding windows, prefix sums and interval sweeps.",
  outcomes: [
    "Pick between hashing, windows and prefix sums from the problem's shape",
    "Implement each pattern in Python and R with tests against brute force",
    "State time and space complexity before writing code",
  ],
  roles: ["sde", "ml-engineer", "genai-engineer", "data-engineer"],
  days: [
    {
      id: "w03-d01",
      day: 1,
      kind: "concept-map",
      title: "Arrays, strings and hashing",
      summary: "Canonical keys and hash maps as the default tool for 'have I seen this?' questions.",
      minutes: 70,
      goals: ["Group anagrams in both languages", "Solve two sum in one pass"],
      tasks: [
        { label: "Concept map and ELI5", minutes: 15 },
        { label: "Run and test the anagram grouping", minutes: 25 },
        { label: "Two sum drill", minutes: 20 },
        { label: "Recall prompt", minutes: 10 },
      ],
      topicIds: ["w03-d01-hashing-patterns"],
    },
    {
      id: "w03-d02",
      day: 2,
      kind: "theory-lab",
      title: "Two pointers and sliding windows",
      summary: "Window invariants and why each pointer moves at most n times.",
      minutes: 80,
      goals: ["Explain the stale-entry bug", "Solve a fixed-size window problem"],
      tasks: [
        { label: "Step through the pwwkew diagram", minutes: 15 },
        { label: "Run the example and the brute-force test", minutes: 25 },
        { label: "Fixed-window maximum sum drill", minutes: 25 },
        { label: "Recall prompt", minutes: 15 },
      ],
      topicIds: ["w03-d02-sliding-window"],
    },
    {
      id: "w03-d03",
      day: 3,
      kind: "implementation",
      title: "Prefix sums and intervals",
      summary: "Range sums by subtraction and interval merging after a sort.",
      minutes: 90,
      goals: ["Implement subarray counting with negatives", "Merge intervals and handle touching edges"],
      tasks: [
        { label: "Read the odometer analogy and its limit", minutes: 10 },
        { label: "Run the paired example and tests", minutes: 30 },
        { label: "Meeting rooms drill", minutes: 35 },
        { label: "Recall prompt", minutes: 15 },
      ],
      topicIds: ["w03-d03-prefix-sums-intervals"],
    },
    {
      id: "w03-d04",
      day: 4,
      kind: "applied-practice",
      title: "Pattern recognition set",
      summary: "Mixed problems where the first job is naming the pattern before coding it.",
      minutes: 90,
      goals: ["Name the pattern within two minutes", "Code three problems in your weaker language"],
      tasks: [
        { label: "Pattern-naming drill", minutes: 20 },
        { label: "Coding drills", minutes: 55 },
        { label: "Log misses", minutes: 15 },
      ],
      topicIds: ["w03-d01-hashing-patterns", "w03-d02-sliding-window", "w03-d03-prefix-sums-intervals"],
    },
    {
      id: "w03-d05",
      day: 5,
      kind: "production-lens",
      title: "Rate limiting at scale",
      summary: "The sliding window pattern as a production rate limiter.",
      minutes: 60,
      goals: ["Compare fixed window, sliding log and token bucket limiters"],
      tasks: [
        { label: "Read the scenario", minutes: 10 },
        { label: "Answer the case questions", minutes: 35 },
        { label: "Compare against the rubric", minutes: 15 },
      ],
      topicIds: ["w03-d02-sliding-window"],
      productionCase: {
        title: "An API that lets bursts through at minute boundaries",
        scenario:
          "Your public API allows 100 requests per minute per key using a counter that resets at the top of each minute. A customer sends 100 requests at 12:00:59 and 100 more at 12:01:00, and the database behind the API falls over.",
        constraints: [
          "The API runs on 20 stateless instances behind a load balancer.",
          "The limiter must add less than 2 ms of latency.",
          "Memory per API key must stay small: there are 5 million keys.",
        ],
        questions: [
          "Why does a fixed window allow 200 requests in two seconds?",
          "Compare a sliding log, a sliding window counter and a token bucket for this case.",
          "Where does the limiter state live with 20 instances, and what happens if that store is slow?",
          "What response should a limited client get?",
        ],
        rubric: [
          "Explains the boundary burst of fixed windows",
          "Sliding log is exact but O(requests) memory; the sliding window counter approximates with two counters",
          "Token bucket allows controlled bursts with O(1) state per key",
          "Centralized state (for example Redis with atomic operations) and a fail-open or fail-closed decision",
          "Returns 429 with a Retry-After header",
        ],
        pitfalls: ["Keeping counters in each instance's memory, which multiplies the limit by 20", "Storing a full request log per key at 5 million keys"],
      },
    },
    {
      id: "w03-d06",
      day: 6,
      kind: "interview-simulation",
      title: "DSA mock: arrays and strings",
      summary: "Two timed coding problems with spoken complexity analysis.",
      minutes: 60,
      goals: ["Talk through the approach before coding", "Finish both within 45 minutes"],
      tasks: [
        { label: "Problem 1 (timed)", minutes: 22 },
        { label: "Problem 2 (timed)", minutes: 23 },
        { label: "Self-score with the rubric", minutes: 15 },
      ],
      topicIds: ["w03-d01-hashing-patterns", "w03-d02-sliding-window", "w03-d03-prefix-sums-intervals"],
    },
    {
      id: "w03-d07",
      day: 7,
      kind: "review",
      title: "DSA I review",
      summary: "Spaced review and remediation of the patterns you missed.",
      minutes: 45,
      goals: ["Clear due reviews", "Re-solve one missed problem from scratch"],
      tasks: [
        { label: "Due reviews", minutes: 20 },
        { label: "Re-solve a missed problem", minutes: 25 },
      ],
      topicIds: ["w03-d01-hashing-patterns", "w03-d02-sliding-window", "w03-d03-prefix-sums-intervals"],
    },
  ],
});
