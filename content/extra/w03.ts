import { REVIEWED, code, defineTopic, edge, node, step } from "../helpers";
import type { ExtraWeek } from "./types";

export const w03: ExtraWeek = {
  schedule: [
    {
      dayId: "w03-d04",
      topicId: "w03-d04-sorting-algorithms",
      tasks: [
        { label: "Sorting: merge sort, quicksort and stability", minutes: 30 },
        { label: "Count comparisons on sorted and random input", minutes: 20 },
      ],
    },
    {
      dayId: "w03-d05",
      topicId: "w03-d05-linked-lists",
      tasks: [
        { label: "Linked lists: reverse, middle and cycle detection", minutes: 30 },
        { label: "LRU cache design prompt", minutes: 20 },
      ],
    },
  ],
  topics: [
    defineTopic({
      id: "w03-d04-sorting-algorithms",
      slug: "sorting-algorithms",
      title: "Sorting: merge sort, quicksort and stability",
      domain: "dsa",
      roles: ["sde", "ml-engineer", "data-engineer", "genai-engineer"],
      difficulty: "intermediate",
      minutes: 50,
      prerequisites: ["w01-d02-big-o-complexity", "w01-d02-recursion-call-stack"],
      objectives: [
        "Implement merge sort and quicksort and count their comparisons",
        "Explain why quicksort degrades to O(n²) on sorted input with a naive pivot",
        "Define stability and know which built-in sorts are stable",
      ],
      summary:
        "Comparison sorts cannot beat O(n log n) in the worst case. Merge sort guarantees it and is stable; quicksort is usually faster in memory but depends on its pivot. Library sorts (Timsort in Python, radix or shell sorts in R) are what you should use, but interviews test the ideas.",
      eli5: {
        analogy:
          "Sorting a messy pile of numbered cards. Merge sort splits the pile in half again and again until each pile has one card, then merges pairs of sorted piles by always taking the smaller top card. Quicksort picks one card, puts smaller cards on its left and bigger ones on its right, then sorts each side the same way.",
        steps: [
          "Merge sort: keep splitting until every pile has one card.",
          "Merge two sorted piles by comparing their top cards and taking the smaller.",
          "Quicksort: pick a 'pivot' card and split the rest into smaller and bigger.",
          "Sort each side the same way; a pile of one is already sorted.",
        ],
        analogyLimit:
          "With cards you can see the whole pile at once and pick a good middle card. A naive quicksort always picks the last card, so on an already sorted pile every split is lopsided and the work explodes.",
      },
      senior: {
        definition:
          "Merge sort is a divide-and-conquer sort with O(n log n) worst case, O(n) extra space and stability. Quicksort partitions around a pivot, averaging O(n log n) with O(log n) stack but O(n²) worst case. Stability means equal keys keep their original relative order.",
        invariants: [
          "After merging, the output is sorted and contains every element of both inputs.",
          "After partitioning, everything left of the pivot is smaller than it and everything right is not smaller.",
          "A stable sort never swaps the order of two equal keys.",
        ],
        mechanism: [
          "Merge sort halves the list log n times and merges each level in O(n).",
          "Quicksort with the last element as pivot on already sorted input of 16 items makes 16·15/2 = 120 comparisons because each split peels off one element.",
          "Randomized or median-of-three pivots make the worst case very unlikely; introsort switches to heapsort when recursion gets deep.",
          "Python's sorted uses Timsort (stable, adaptive to existing runs); R's order() is stable for its default methods, so sorting by a second key and then a first key gives a multi-key sort.",
        ],
        complexity: "Merge sort O(n log n) time, O(n) space. Quicksort O(n log n) average, O(n²) worst, O(log n) stack on average. Counting and radix sorts beat n log n for small integer keys.",
        tradeoffs: [
          { option: "Merge sort", choose: "Guaranteed n log n, stability, linked lists, external sorting on disk.", cost: "O(n) extra memory for arrays." },
          { option: "Quicksort", choose: "In-memory arrays where cache locality matters.", cost: "Bad pivots give O(n²); not stable." },
          { option: "Counting or radix sort", choose: "Integer keys in a small range.", cost: "Memory proportional to the key range; not comparison based." },
        ],
        failureModes: [
          "Quicksort with a fixed first or last pivot on sorted or adversarial data.",
          "Assuming a sort is stable when chaining sorts on multiple keys.",
          "Writing your own sort in production instead of using the library sort.",
          "Comparators that are not consistent (a < b and b < a both true), which break sort invariants.",
        ],
        production:
          "Use the language's sort with a key function. External merge sort powers ORDER BY on data larger than memory, and sort-merge joins in databases and Spark rely on the same merge step.",
        interviewAnswer:
          "Merge sort splits in half, sorts both halves and merges, so it is O(n log n) in every case and stable, at the cost of O(n) memory. Quicksort partitions around a pivot and is fast in practice, but a last-element pivot on sorted input degrades to n²/2 comparisons, so I randomize the pivot. In real code I use the built-in stable sort with a key.",
      },
      implementation: {
        problem: "Sort a list with merge sort and quicksort, count comparisons on random and already sorted input, and show a stable multi-record sort.",
        input: "xs = [38, 27, 43, 3, 9, 82, 10]; sorted 1..16; records ana:3, ben:1, cy:3, di:2",
        python: {
          code: code`
            def merge_sort(xs: list[int], counter: list[int]) -> list[int]:
                if len(xs) <= 1:
                    return xs[:]
                mid = len(xs) // 2
                left, right = merge_sort(xs[:mid], counter), merge_sort(xs[mid:], counter)
                out, i, j = [], 0, 0
                while i < len(left) and j < len(right):
                    counter[0] += 1
                    if left[i] <= right[j]:
                        out.append(left[i])
                        i += 1
                    else:
                        out.append(right[j])
                        j += 1
                return out + left[i:] + right[j:]


            def quick_sort(xs: list[int], counter: list[int]) -> list[int]:
                if len(xs) <= 1:
                    return xs[:]
                pivot = xs[-1]
                smaller, larger = [], []
                for x in xs[:-1]:
                    counter[0] += 1
                    (smaller if x < pivot else larger).append(x)
                return quick_sort(smaller, counter) + [pivot] + quick_sort(larger, counter)


            def run(sort, xs):
                counter = [0]
                return sort(xs, counter), counter[0]


            xs = [38, 27, 43, 3, 9, 82, 10]
            print("input: " + " ".join(map(str, xs)))
            for name, sort in (("merge sort", merge_sort), ("quick sort", quick_sort)):
                out, n = run(sort, xs)
                print(f"{name}: {' '.join(map(str, out))} ({n} comparisons)")
            already = list(range(1, 17))
            print(f"already sorted 1..16: merge sort {run(merge_sort, already)[1]}, quick sort (last-element pivot) {run(quick_sort, already)[1]} comparisons")
            records = [("ana", 3), ("ben", 1), ("cy", 3), ("di", 2)]
            stable = sorted(records, key=lambda r: r[1])
            print("stable sort by score: " + " ".join(f"{name}:{score}" for name, score in stable))
          `,
        },
        r: {
          code: code`
            merge_sort <- function(xs, counter) {
              if (length(xs) <= 1) return(xs)
              mid <- length(xs) %/% 2
              left <- merge_sort(xs[seq_len(mid)], counter)
              right <- merge_sort(xs[(mid + 1):length(xs)], counter)
              out <- numeric(0)
              i <- 1
              j <- 1
              while (i <= length(left) && j <= length(right)) {
                counter$n <- counter$n + 1
                if (left[i] <= right[j]) {
                  out <- c(out, left[i])
                  i <- i + 1
                } else {
                  out <- c(out, right[j])
                  j <- j + 1
                }
              }
              c(out, left[seq_len(length(left) - i + 1) + i - 1], right[seq_len(length(right) - j + 1) + j - 1])
            }

            quick_sort <- function(xs, counter) {
              if (length(xs) <= 1) return(xs)
              pivot <- xs[length(xs)]
              rest <- xs[-length(xs)]
              counter$n <- counter$n + length(rest)
              c(quick_sort(rest[rest < pivot], counter), pivot, quick_sort(rest[rest >= pivot], counter))
            }

            run <- function(sort_fn, xs) {
              counter <- new.env()
              counter$n <- 0
              out <- sort_fn(xs, counter)
              list(out = out, n = counter$n)
            }

            xs <- c(38, 27, 43, 3, 9, 82, 10)
            cat("input:", xs, "\n")
            for (name in c("merge sort", "quick sort")) {
              r <- run(if (name == "merge sort") merge_sort else quick_sort, xs)
              cat(sprintf("%s: %s (%d comparisons)\n", name, paste(r$out, collapse = " "), as.integer(r$n)))
            }
            already <- 1:16
            cat(sprintf("already sorted 1..16: merge sort %d, quick sort (last-element pivot) %d comparisons\n", as.integer(run(merge_sort, already)$n), as.integer(run(quick_sort, already)$n)))
            records <- data.frame(name = c("ana", "ben", "cy", "di"), score = c(3, 1, 3, 2))
            stable <- records[order(records$score), ]
            cat("stable sort by score:", paste0(stable$name, ":", stable$score), "\n")
          `,
        },
        expectedOutput: code`
        input: 38 27 43 3 9 82 10
        merge sort: 3 9 10 27 38 43 82 (13 comparisons)
        quick sort: 3 9 10 27 38 43 82 (13 comparisons)
        already sorted 1..16: merge sort 32, quick sort (last-element pivot) 120 comparisons
        stable sort by score: ben:1 di:2 ana:3 cy:3
      `,
        tests: {
          python: code`
            import random


            def test_sorts_match_builtin():
                rng = random.Random(7)
                data = [rng.randint(0, 50) for _ in range(200)]
                assert run(merge_sort, data)[0] == sorted(data)
                assert run(quick_sort, data)[0] == sorted(data)


            def test_quicksort_worst_case_is_quadratic():
                assert run(quick_sort, list(range(1, 21)))[1] == 20 * 19 // 2


            def test_merge_sort_is_stable_on_keys():
                pairs = [(1, "a"), (0, "b"), (1, "c")]
                keyed = sorted(pairs, key=lambda p: p[0])
                assert [p[1] for p in keyed] == ["b", "a", "c"]
          `,
          r: code`
            test_that("sorts match the built-in sort", {
              set.seed(7)
              data <- sample(0:50, 200, replace = TRUE)
              expect_equal(run(merge_sort, data)$out, sort(data))
              expect_equal(run(quick_sort, data)$out, sort(data))
            })

            test_that("quicksort worst case is quadratic", {
              expect_equal(run(quick_sort, 1:20)$n, 190)
            })
          `,
        },
        eli5Trace: [
          "Merge sort splits 7 cards into piles of one, then merges pairs back together, always taking the smaller top card.",
          "Quicksort picks the last card (10) as the pivot, puts 3 and 9 on its left and the bigger cards on its right, and repeats on each side.",
          "Both end with 3 9 10 27 38 43 82; the comparison counts show how much work each did.",
          "On cards that are already in order, quicksort's last-card pivot splits off just one card each time: 120 comparisons for 16 cards.",
          "A stable sort keeps ana before cy because they tie on 3 and ana came first.",
        ],
        complexity: { time: "Merge O(n log n); quick O(n log n) average, O(n²) worst", space: "Merge O(n); quick O(log n) average stack (these teaching versions copy lists)" },
        edgeCases: [
          "Empty and single-element lists are already sorted.",
          "Many duplicates hurt two-way partition quicksort; three-way partitioning fixes it.",
          "Already sorted or reverse sorted input is the worst case for a fixed pivot.",
          "Sorting floats with NaN breaks ordering in many languages; handle NaN explicitly.",
        ],
        incorrect: {
          language: "python",
          code: code`
            def quick_sort(xs):
                pivot = xs[0]
                return quick_sort([x for x in xs if x < pivot]) + [pivot] + quick_sort([x for x in xs if x > pivot])
          `,
          whyWrong: "There is no base case for empty lists (it crashes on xs[0]), and elements equal to the pivot other than itself are dropped, so duplicates disappear.",
          fix: "Return the list when len(xs) <= 1 and keep equal elements in a third 'equal' partition or on one side.",
        },
        walkthrough: [
          { python: "def merge_sort(xs: list[int], counter: list[int]) -> list[int]:", pythonLines: 5, r: "merge_sort <- function(xs, counter) {", rLines: 5, eli5: "Merge sort: if the pile has one card it is already sorted. Otherwise cut it in half and sort each half the same way." },
          { python: "while i < len(left) and j < len(right):", pythonLines: 8, r: "while (i <= length(left) && j <= length(right)) {", rLines: 10, eli5: "Merge two sorted piles: look at the top card of each, take the smaller one, and count that comparison." },
          { python: "return out + left[i:] + right[j:]", r: "c(out, left[seq_len(length(left) - i + 1) + i - 1]", eli5: "When one pile runs out, the other pile's leftover cards are already in order, so just put them on the end." },
          { python: "def quick_sort(xs: list[int], counter: list[int]) -> list[int]:", pythonLines: 9, r: "quick_sort <- function(xs, counter) {", rLines: 6, eli5: "Quicksort: pick the last card as the pivot, put smaller cards on the left and the rest on the right, then sort each side." },
          { python: "already = list(range(1, 17))", pythonLines: 2, r: "already <- 1:16", rLines: 2, eli5: "Try cards that are already in order. Quicksort with a last-card pivot does the most work here: 120 comparisons." },
          { python: "stable = sorted(records, key=lambda r: r[1])", pythonLines: 2, r: "stable <- records[order(records$score), ]", rLines: 2, eli5: "Sort people by score with a stable sort: ana and cy both have 3, and ana stays first because she was first before." },
        ],
      },
      flow: {
        title: "Merge sort: split down, merge up",
        nodes: [
          node("all", "38 27 43 3 9 82 10", 300, 0),
          node("l", "38 27 43", 120, 100),
          node("r", "3 9 82 10", 480, 100),
          node("ls", "27 38 43", 120, 200, "sorted"),
          node("rs", "3 9 10 82", 480, 200, "sorted"),
          node("out", "3 9 10 27 38 43 82", 300, 300, "merged"),
        ],
        edges: [edge("all", "l", "split"), edge("all", "r", "split"), edge("l", "ls", "sort"), edge("r", "rs", "sort"), edge("ls", "out", "merge"), edge("rs", "out", "merge")],
        steps: [
          step("all l r", "all-l all-r", "Split the list in half. Each half is sorted the same way, recursively, until halves have one element."),
          step("l ls", "l-ls", "The left half becomes 27 38 43 after its own splits and merges."),
          step("r rs", "r-rs", "The right half becomes 3 9 10 82."),
          step("ls rs out", "ls-out rs-out", "Merge: repeatedly take the smaller front element of the two halves. Each level of merging costs O(n), and there are about log n levels."),
        ],
      },
      practice: [
        {
          id: "w03-sort-recall-1",
          type: "recall",
          prompt: "What does it mean for a sort to be stable, and when does it matter?",
          answer: "Equal keys keep their original relative order. It matters when sorting by multiple keys in passes (sort by secondary key, then stable sort by primary key) or when the original order carries meaning, like arrival time.",
          rubric: ["Equal keys keep order", "Multi-key sorting", "Example"],
        },
        {
          id: "w03-sort-code-1",
          type: "code",
          prompt: "Find the k-th smallest element of an unsorted array in average O(n) time.",
          answer: "Quickselect: partition around a random pivot, then recurse only into the side containing index k. Average O(n), worst O(n²); a heap of size k gives O(n log k) worst case.",
          rubric: ["Partition idea", "Recurse one side", "Average O(n)", "Mentions heap alternative"],
        },
        {
          id: "w03-sort-recall-2",
          type: "recall",
          prompt: "Why can no comparison sort beat O(n log n) in the worst case?",
          answer: "A comparison sort must distinguish all n! orderings; each comparison has two outcomes, so the decision tree needs depth at least log2(n!), which is on the order of n log n.",
          rubric: ["n! orderings", "Binary decision tree", "log(n!) is n log n"],
        },
      ],
      references: [
        { title: "Python documentation: Sorting Techniques (stability and key functions)", url: "https://docs.python.org/3/howto/sorting.html", versionSensitive: false },
        { title: "Introduction to Algorithms (Cormen, Leiserson, Rivest, Stein), chapters on merge sort and quicksort", versionSensitive: false },
      ],
      lastReviewed: REVIEWED,
    }),

    defineTopic({
      id: "w03-d05-linked-lists",
      slug: "linked-lists",
      title: "Linked lists: reverse, middle and cycles",
      domain: "dsa",
      roles: ["sde", "ml-engineer", "genai-engineer"],
      difficulty: "beginner",
      minutes: 45,
      prerequisites: ["w03-d01-hashing-patterns"],
      objectives: [
        "Reverse a singly linked list in place with three pointers",
        "Use slow and fast pointers to find the middle and detect a cycle",
        "Explain how an LRU cache combines a hash map with a doubly linked list",
      ],
      summary:
        "A linked list stores each value in a node that points to the next one. Inserting or removing at a known node is O(1), but reaching the k-th node is O(k). Pointer tricks (reversal, slow and fast pointers) are interview favorites and power real structures like LRU caches.",
      eli5: {
        analogy:
          "A treasure hunt where every clue tells you where the next clue is hidden. You cannot jump to clue 5; you have to follow clues 1 to 4. Adding a new clue in the middle is easy: change one note to point to it.",
        steps: [
          "Each clue (node) holds a prize (value) and the location of the next clue.",
          "To reverse the hunt, walk along and turn each arrow around.",
          "To find the middle, send a slow walker one clue at a time and a fast walker two at a time.",
          "If the fast walker ever catches the slow one, the clues loop in a circle.",
        ],
        analogyLimit:
          "A real treasure hunt ends when you find the treasure. A buggy linked list can loop forever, which is why we need the two-walker trick instead of just walking until the end.",
      },
      senior: {
        definition:
          "A singly linked list is a chain of nodes (value, next). A doubly linked list adds prev. Operations at a known node are O(1); search and index access are O(n). Floyd's algorithm detects cycles with two pointers in O(n) time and O(1) space.",
        invariants: [
          "During reversal, prev is the head of the already reversed part and cur is the head of the rest.",
          "The fast pointer moves twice as fast, so in a cycle it gains one step per iteration and must meet the slow pointer.",
          "After meeting, the distance from head to the cycle start equals the distance from the meeting point to the cycle start (mod cycle length).",
        ],
        mechanism: [
          "Reversal: save next, point cur.next to prev, advance prev and cur; return prev.",
          "Middle: when fast reaches the end, slow is at the middle (node 3 of 5).",
          "Cycle start: reset one pointer to head and move both one step at a time; they meet at the cycle's first node (3 here).",
          "LRU cache: a dict maps key to node for O(1) lookup; the doubly linked list keeps recency order so moving a node to the front and evicting the tail are O(1).",
        ],
        complexity: "Reverse, middle and cycle detection are O(n) time and O(1) extra space.",
        tradeoffs: [
          { option: "Linked list", choose: "Frequent inserts and deletes at known positions, LRU recency lists, queues.", cost: "No random access; poor cache locality; pointer overhead." },
          { option: "Dynamic array", choose: "Indexing and iteration, which is most of the time.", cost: "O(n) inserts in the middle." },
          { option: "Hash set of visited nodes for cycles", choose: "Simplest correct cycle check.", cost: "O(n) extra memory versus Floyd's O(1)." },
        ],
        failureModes: [
          "Losing the rest of the list by overwriting next before saving it.",
          "Null pointer access when fast.next is missing on even-length lists.",
          "Walking a list that has a cycle without a cycle check: an infinite loop.",
          "Forgetting to update both prev and next in a doubly linked list.",
        ],
        production:
          "Python's OrderedDict and functools.lru_cache, memory allocators' free lists and OS scheduler queues use linked structures. Most application code should use arrays and dicts; reach for linked lists when O(1) splicing matters.",
        interviewAnswer:
          "To reverse, I walk with prev, cur and next, flipping each pointer, which is O(n) time and O(1) space. For the middle and for cycles I use slow and fast pointers; if they meet there is a cycle, and resetting one to the head and stepping both by one finds the cycle start. An LRU cache combines a hash map for lookup with a doubly linked list for O(1) recency updates.",
      },
      implementation: {
        problem: "Build the list 1 -> 2 -> 3 -> 4 -> 5, reverse it, find its middle, then detect a cycle and its start.",
        input: "values 1..5; then link node 5 back to node 3",
        python: {
          code: code`
            class Node:
                def __init__(self, val: int):
                    self.val = val
                    self.next: "Node | None" = None


            def from_list(values: list[int]) -> "Node | None":
                head = None
                for v in reversed(values):
                    node = Node(v)
                    node.next = head
                    head = node
                return head


            def to_str(head: "Node | None") -> str:
                out = []
                while head:
                    out.append(str(head.val))
                    head = head.next
                return " -> ".join(out)


            def reverse(head: "Node | None") -> "Node | None":
                prev = None
                cur = head
                while cur:
                    nxt = cur.next
                    cur.next = prev
                    prev, cur = cur, nxt
                return prev


            def middle(head: Node) -> int:
                slow = fast = head
                while fast and fast.next:
                    slow, fast = slow.next, fast.next.next
                return slow.val


            def cycle_start(head: "Node | None") -> "Node | None":
                slow = fast = head
                while fast and fast.next:
                    slow, fast = slow.next, fast.next.next
                    if slow is fast:
                        slow = head
                        while slow is not fast:
                            slow, fast = slow.next, fast.next
                        return slow
                return None


            head = from_list([1, 2, 3, 4, 5])
            print(f"list: {to_str(head)}")
            print(f"middle (slow and fast pointers): {middle(head)}")
            print(f"reversed: {to_str(reverse(from_list([1, 2, 3, 4, 5])))}")
            print(f"cycle in a fresh list: {'yes' if cycle_start(head) else 'no'}")
            tail = head
            while tail.next:
                tail = tail.next
            tail.next = head.next.next
            start = cycle_start(head)
            print(f"after linking 5 back to 3: cycle {'yes' if start else 'no'}, starts at {start.val}")
          `,
        },
        r: {
          code: code`
            new_node <- function(val) {
              n <- new.env()
              n$val <- val
              n$nxt <- NULL
              n
            }

            from_vec <- function(values) {
              head <- NULL
              for (v in rev(values)) {
                node <- new_node(v)
                node$nxt <- head
                head <- node
              }
              head
            }

            to_str <- function(head) {
              out <- character(0)
              while (!is.null(head)) {
                out <- c(out, head$val)
                head <- head$nxt
              }
              paste(out, collapse = " -> ")
            }

            reverse_list <- function(head) {
              prev <- NULL
              cur <- head
              while (!is.null(cur)) {
                nxt <- cur$nxt
                cur$nxt <- prev
                prev <- cur
                cur <- nxt
              }
              prev
            }

            middle <- function(head) {
              slow <- head
              fast <- head
              while (!is.null(fast) && !is.null(fast$nxt)) {
                slow <- slow$nxt
                fast <- fast$nxt$nxt
              }
              slow$val
            }

            cycle_start <- function(head) {
              slow <- head
              fast <- head
              while (!is.null(fast) && !is.null(fast$nxt)) {
                slow <- slow$nxt
                fast <- fast$nxt$nxt
                if (identical(slow, fast)) {
                  slow <- head
                  while (!identical(slow, fast)) {
                    slow <- slow$nxt
                    fast <- fast$nxt
                  }
                  return(slow)
                }
              }
              NULL
            }

            head <- from_vec(1:5)
            cat(sprintf("list: %s\n", to_str(head)))
            cat(sprintf("middle (slow and fast pointers): %d\n", middle(head)))
            cat(sprintf("reversed: %s\n", to_str(reverse_list(from_vec(1:5)))))
            cat(sprintf("cycle in a fresh list: %s\n", if (is.null(cycle_start(head))) "no" else "yes"))
            tail <- head
            while (!is.null(tail$nxt)) tail <- tail$nxt
            tail$nxt <- head$nxt$nxt
            start <- cycle_start(head)
            cat(sprintf("after linking 5 back to 3: cycle %s, starts at %d\n", if (is.null(start)) "no" else "yes", start$val))
          `,
        },
        expectedOutput: code`
        list: 1 -> 2 -> 3 -> 4 -> 5
        middle (slow and fast pointers): 3
        reversed: 5 -> 4 -> 3 -> 2 -> 1
        cycle in a fresh list: no
        after linking 5 back to 3: cycle yes, starts at 3
      `,
        tests: {
          python: code`
            def test_reverse_empty_and_single():
                assert reverse(None) is None
                assert to_str(reverse(from_list([7]))) == "7"


            def test_middle_of_even_list_is_second_middle():
                assert middle(from_list([1, 2, 3, 4])) == 3


            def test_cycle_start_found():
                h = from_list([10, 20, 30])
                h.next.next.next = h
                assert cycle_start(h).val == 10
          `,
          r: code`
            test_that("reverse handles empty and single lists", {
              expect_null(reverse_list(NULL))
              expect_equal(to_str(reverse_list(from_vec(7))), "7")
            })

            test_that("middle of an even list is the second middle", {
              expect_equal(middle(from_vec(1:4)), 3L)
            })

            test_that("cycle start is found", {
              h <- from_vec(c(10, 20, 30))
              h$nxt$nxt$nxt <- h
              expect_equal(cycle_start(h)$val, 10)
            })
          `,
        },
        eli5Trace: [
          "Five clues point one to the next: 1 -> 2 -> 3 -> 4 -> 5.",
          "A slow walker takes one step while a fast walker takes two; when the fast one reaches the end, the slow one stands on 3, the middle.",
          "Turning every arrow around gives 5 -> 4 -> 3 -> 2 -> 1.",
          "Make clue 5 point back to clue 3, and the walkers end up circling: the fast one catches the slow one, so there is a loop.",
          "Start one walker again from the beginning and step both one at a time: they meet exactly where the loop begins, at 3.",
        ],
        complexity: { time: "O(n) for each operation", space: "O(1) extra" },
        edgeCases: [
          "Empty list: reversal returns None and middle has no answer.",
          "Even length: this middle returns the second of the two middle nodes.",
          "A cycle that includes the head: the start is the head itself.",
          "Very long lists: iterative code avoids recursion depth limits.",
        ],
        incorrect: {
          language: "python",
          code: code`
            while cur:
                cur.next = prev
                prev = cur
                cur = cur.next
          `,
          whyWrong: "cur.next is overwritten before it is saved, so cur = cur.next moves back to prev and the rest of the list is lost.",
          fix: "Save nxt = cur.next first, then flip the pointer, then advance with cur = nxt.",
        },
        walkthrough: [
          { python: "class Node:", pythonLines: 4, r: "new_node <- function(val) {", rLines: 6, eli5: "A node is one clue: it holds a value and the address of the next clue (or nothing if it is the last one)." },
          { python: "def from_list(values: list[int])", pythonLines: 7, r: "from_vec <- function(values) {", rLines: 9, eli5: "Build the chain backwards: each new clue points to the chain made so far, so the first value ends up at the front." },
          { python: "def reverse(head", pythonLines: 8, r: "reverse_list <- function(head) {", rLines: 10, eli5: "Reverse: walk along, remember the next clue, turn the current arrow around to point backwards, then step forward." },
          { python: "def middle(head: Node) -> int:", pythonLines: 5, r: "middle <- function(head) {", rLines: 9, eli5: "A slow walker moves one step and a fast walker two. When the fast one hits the end, the slow one is in the middle." },
          { python: "def cycle_start(head", pythonLines: 10, r: "cycle_start <- function(head) {", rLines: 17, eli5: "If the fast walker catches the slow one, the chain loops. Send one walker back to the start and step both slowly: they meet at the loop's first clue." },
          { python: "tail.next = head.next.next", pythonLines: 3, r: "tail$nxt <- head$nxt$nxt", rLines: 3, eli5: "Make the last clue point back to clue 3 to create a loop, then find where the loop starts." },
        ],
      },
      flow: {
        title: "Reversing pointers one node at a time",
        nodes: [
          node("prev", "prev", 0, 140, "None at first"),
          node("n1", "1", 180, 40),
          node("n2", "2", 340, 40),
          node("n3", "3", 500, 40),
          node("n4", "4", 660, 40),
          node("n5", "5", 820, 40),
        ],
        edges: [edge("n1", "n2", "next"), edge("n2", "n3", "next"), edge("n3", "n4", "next"), edge("n4", "n5", "next"), edge("n1", "prev", "flipped")],
        steps: [
          step("n1 n2", "n1-n2", "Start with cur at node 1. Save its next pointer (node 2) before changing anything."),
          step("n1 prev", "n1-prev", "Flip node 1 to point at prev (None). Node 1 is now the tail of the reversed part."),
          step("n2 n3", "n2-n3", "Advance: prev becomes node 1 and cur becomes node 2. Repeat: save, flip, advance."),
          step("n4 n5", "n4-n5", "When cur runs off the end, prev is node 5: the new head of 5 -> 4 -> 3 -> 2 -> 1."),
        ],
      },
      practice: [
        {
          id: "w03-ll-design-1",
          type: "design",
          prompt: "Design an LRU cache with O(1) get and put.",
          answer: "Keep a hash map from key to node and a doubly linked list ordered by recency with sentinel head and tail. get moves the node to the front; put inserts at the front and, when over capacity, removes the tail node and its map entry. All operations touch a constant number of pointers.",
          rubric: ["Hash map plus doubly linked list", "Move to front on access", "Evict tail", "Sentinels to simplify edges"],
        },
        {
          id: "w03-ll-code-1",
          type: "code",
          prompt: "Merge two sorted linked lists into one sorted list.",
          answer: "Use a dummy head and a tail pointer; repeatedly attach the smaller front node of the two lists and advance that list; finally attach whichever list remains. O(m + n) time, O(1) extra space.",
          rubric: ["Dummy head", "Compare fronts", "Attach remainder", "Complexity"],
        },
        {
          id: "w03-ll-recall-1",
          type: "recall",
          prompt: "Why does Floyd's algorithm need O(1) memory while the hash-set approach needs O(n)?",
          answer: "Floyd only stores two pointers; the hash-set approach stores every visited node to check for repeats.",
          rubric: ["Two pointers", "Visited set grows with n"],
        },
      ],
      references: [
        { title: "Python documentation: collections.OrderedDict (move_to_end and popitem for LRU behavior)", url: "https://docs.python.org/3/library/collections.html#collections.OrderedDict", versionSensitive: false },
        { title: "The Art of Computer Programming, Volume 2 (Knuth), exercise discussion of cycle detection attributed to Floyd", versionSensitive: false },
      ],
      lastReviewed: REVIEWED,
    }),
  ],
};
