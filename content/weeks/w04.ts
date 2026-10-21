import { REVIEWED, code, defineTopic, defineWeek, edge, node, step } from "../helpers";

export const topics = [
  defineTopic({
    id: "w04-d01-stacks-queues-heaps",
    slug: "stacks-queues-heaps",
    title: "Stacks, queues and heaps",
    domain: "dsa",
    roles: ["sde", "ml-engineer", "data-engineer"],
    difficulty: "intermediate",
    minutes: 70,
    prerequisites: ["w03-d01-hashing-patterns"],
    objectives: [
      "Use a stack for last-in-first-out matching problems",
      "Keep the k largest values with a size-k min-heap",
      "Explain sift-up and sift-down and their O(log k) cost",
    ],
    summary:
      "Stacks match the most recent open item, queues process in arrival order, and heaps always know their minimum. Together they cover parsing, scheduling and top-k problems.",
    eli5: {
      analogy:
        "A stack is a pile of plates: you can only take the top one. A heap is a tournament bracket where the smallest player always sits on top; when a stronger newcomer arrives, the weakest is pushed out.",
      steps: [
        "Brackets: every opening bracket goes on the plate pile.",
        "Every closing bracket must match the plate on top, which you then remove.",
        "If the pile is empty at the end, every bracket was matched.",
        "Top 3: keep a little pile of 3 numbers with the smallest on top; a bigger newcomer replaces that smallest one.",
      ],
      analogyLimit:
        "A heap is not fully sorted like a ranked list. Only the top is guaranteed to be the smallest; the other positions only promise that each parent is smaller than its children.",
    },
    senior: {
      definition:
        "A stack supports push and pop at one end in O(1). A binary min-heap is a complete binary tree stored in an array where each parent is <= its children, giving O(1) peek-min and O(log n) push and pop.",
      invariants: [
        "Bracket stack: it holds exactly the unmatched opening brackets, in order.",
        "Heap property: h[parent(i)] <= h[i] for every i; with 0-based arrays parent(i) = (i - 1) // 2, with 1-based arrays parent(i) = i %/% 2.",
        "The size-k heap holds the k largest values seen so far, with the smallest of them at the root.",
      ],
      mechanism: [
        "Push appends at the end and sifts up, swapping with the parent while it is smaller.",
        "Replace-top overwrites the root and sifts down, swapping with the smaller child while a child is smaller.",
        "For top-k, a newcomer larger than the root replaces it; otherwise it is ignored. Each step costs O(log k).",
        "Python's heapq is a min-heap on a list; R has no heap in base, so the R version implements sift-up and sift-down directly.",
      ],
      complexity: "Bracket matching O(n) time, O(n) space. Top-k with a heap O(n log k) time, O(k) space, versus O(n log n) to sort everything.",
      tradeoffs: [
        { option: "Size-k min-heap", choose: "Top-k over a large or streaming input.", cost: "O(n log k); results need a final sort." },
        { option: "Full sort", choose: "Small inputs or when you need everything ranked.", cost: "O(n log n) time and O(n) memory." },
        { option: "Quickselect", choose: "One-off top-k on an in-memory array.", cost: "O(n) average, O(n^2) worst; not streaming." },
      ],
      failureModes: [
        "Popping from an empty stack on input like ']'.",
        "Using a max-heap for top-k largest, which keeps all n values instead of k.",
        "Growing an R vector one element at a time inside a hot loop, which copies the vector every time.",
        "Forgetting that heapq has no decrease-key; use lazy deletion instead.",
      ],
      production:
        "Heaps schedule timers and retries (earliest deadline first) and power top-N leaderboards over streams. Stacks appear in parsers, undo history and depth-first traversals without recursion.",
      interviewAnswer:
        "For brackets I push openers on a stack and pop on each closer, failing on a mismatch or an empty stack; O(n). For the k largest I keep a min-heap of size k: if a value beats the root I replace it and sift down. That is O(n log k) time and O(k) space, and it works on streams.",
    },
    implementation: {
      problem: "Check bracket balance with a stack, then find the 3 largest values with a size-3 min-heap.",
      input: 'strings "([]{})", "([)]", "(("; nums = [5, 1, 9, 3, 7, 9, 2], k = 3',
      python: {
        code: code`
          import heapq

          PAIRS = {")": "(", "]": "[", "}": "{"}


          def balanced(s: str) -> bool:
              stack: list[str] = []
              for ch in s:
                  if ch in "([{":
                      stack.append(ch)
                  elif ch in PAIRS:
                      if not stack or stack.pop() != PAIRS[ch]:
                          return False
              return not stack


          def k_largest(nums: list[int], k: int) -> list[int]:
              heap: list[int] = []
              for x in nums:
                  if len(heap) < k:
                      heapq.heappush(heap, x)
                  elif x > heap[0]:
                      heapq.heapreplace(heap, x)
              return sorted(heap, reverse=True)


          for s in ["([]{})", "([)]", "(("]:
              print(f"{s} balanced: {'yes' if balanced(s) else 'no'}")
          print(f"3 largest: {k_largest([5, 1, 9, 3, 7, 9, 2], 3)}")
        `,
      },
      r: {
        code: code`
          balanced <- function(s) {
            pairs <- c(")" = "(", "]" = "[", "}" = "{")
            stack <- character(0)
            for (ch in strsplit(s, "")[[1]]) {
              if (ch %in% c("(", "[", "{")) {
                stack <- c(stack, ch)
              } else if (ch %in% names(pairs)) {
                if (length(stack) == 0 || stack[length(stack)] != pairs[[ch]]) return(FALSE)
                stack <- stack[-length(stack)]
              }
            }
            length(stack) == 0
          }

          heap_push <- function(h, x) {
            h <- c(h, x)
            i <- length(h)
            while (i > 1 && h[i %/% 2] > h[i]) {
              p <- i %/% 2
              h[c(p, i)] <- h[c(i, p)]
              i <- p
            }
            h
          }

          heap_replace_top <- function(h, x) {
            h[1] <- x
            i <- 1
            n <- length(h)
            repeat {
              m <- i
              for (child in c(2 * i, 2 * i + 1)) if (child <= n && h[child] < h[m]) m <- child
              if (m == i) break
              h[c(m, i)] <- h[c(i, m)]
              i <- m
            }
            h
          }

          k_largest <- function(nums, k) {
            h <- numeric(0)
            for (x in nums) {
              if (length(h) < k) h <- heap_push(h, x) else if (x > h[1]) h <- heap_replace_top(h, x)
            }
            sort(h, decreasing = TRUE)
          }

          for (s in c("([]{})", "([)]", "((")) cat(sprintf("%s balanced: %s\n", s, if (balanced(s)) "yes" else "no"))
          cat(sprintf("3 largest: [%s]\n", paste(k_largest(c(5, 1, 9, 3, 7, 9, 2), 3), collapse = ", ")))
        `,
      },
      expectedOutput: code`
        ([]{}) balanced: yes
        ([)] balanced: no
        (( balanced: no
        3 largest: [9, 9, 7]
      `,
      tests: {
        python: code`
          def test_empty_and_lonely_closer():
              assert balanced("")
              assert not balanced("]")


          def test_k_largest_matches_sorting():
              data = [4, 8, 1, 8, 3, 10, 0, 7]
              for k in range(1, len(data) + 1):
                  assert k_largest(data, k) == sorted(data, reverse=True)[:k]


          def test_k_larger_than_input():
              assert k_largest([1, 2], 5) == [2, 1]
        `,
        r: code`
          test_that("empty input and a lonely closer", {
            expect_true(balanced(""))
            expect_false(balanced("]"))
          })

          test_that("k largest matches sorting", {
            data <- c(4, 8, 1, 8, 3, 10, 0, 7)
            for (k in seq_along(data)) expect_equal(k_largest(data, k), sort(data, decreasing = TRUE)[seq_len(k)])
          })

          test_that("the heap property holds after pushes", {
            h <- Reduce(heap_push, c(7, 3, 9, 1, 5), numeric(0))
            for (i in 2:length(h)) expect_lte(h[i %/% 2], h[i])
          })
        `,
      },
      eli5Trace: [
        "([]{}): push (, push [, ] matches [, push {, } matches {, ) matches (. Pile empty: balanced.",
        "([)]: push (, push [, then ) meets [ on top. Mismatch: not balanced.",
        "((: two plates left on the pile at the end: not balanced.",
        "Top 3 of 5 1 9 3 7 9 2: the pile fills with 5 1 9, then 3 beats 1, 7 beats 3, 9 beats 5. Left: 9 9 7.",
      ],
      complexity: { time: "O(n) for brackets, O(n log k) for top-k", space: "O(n) stack, O(k) heap" },
      edgeCases: [
        "Empty string is balanced.",
        "A closer with an empty stack fails immediately instead of crashing.",
        "Duplicates in top-k are kept (two 9s).",
        "k larger than the input returns every value, sorted.",
      ],
      incorrect: {
        language: "python",
        code: code`
          def balanced(s):
              return s.count("(") == s.count(")") and s.count("[") == s.count("]")
        `,
        whyWrong: "Counting ignores order and nesting, so '([)]' and ')(' are reported as balanced.",
        fix: "Use a stack so every closer is checked against the most recent unmatched opener.",
      },
    },
    flow: {
      title: "A size-3 min-heap keeps the top 3",
      nodes: [
        node("stream", "Stream", 0, 110, "5 1 9 3 7 9 2"),
        node("fill", "Fill to k", 220, 30, "heap 1 5 9"),
        node("compare", "Compare with root", 220, 190, "x > min?"),
        node("replace", "Replace root", 470, 190, "then sift down"),
        node("heap", "Heap", 470, 30, "root = smallest of top k"),
        node("result", "Result", 720, 110, "9 9 7"),
      ],
      edges: [edge("stream", "fill"), edge("fill", "heap"), edge("stream", "compare"), edge("compare", "replace"), edge("replace", "heap"), edge("heap", "result")],
      steps: [
        step("stream fill heap", "stream-fill fill-heap", "The first three values fill the heap. The root is the smallest, 1."),
        step("compare replace heap", "stream-compare compare-replace replace-heap", "3 beats the root 1, so it replaces it and sifts down. The root is now 3."),
        step("compare replace heap", "compare-replace replace-heap", "7 beats 3, then 9 beats 5. Each replacement costs O(log k)."),
        step("compare", "stream-compare", "2 does not beat the root 7, so it is ignored in O(1)."),
        step("heap result", "heap-result", "Sort the k survivors: 9, 9, 7."),
      ],
    },
    practice: [
      {
        id: "w04-heap-code-1",
        type: "code",
        prompt: "Merge k sorted lists into one sorted list.",
        answer: "Push the first element of each list with its list index into a min-heap; pop the smallest, append it, and push the next element from that list. O(N log k) for N total elements.",
        rubric: ["Heap of size k", "Tracks which list each value came from", "O(N log k)"],
      },
      {
        id: "w04-stack-code-1",
        type: "code",
        prompt: "For each day's temperature, return how many days until a warmer temperature (0 if none).",
        answer: "Monotonic decreasing stack of indexes; when a warmer day arrives, pop each colder index and set answer[idx] = i - idx. O(n).",
        rubric: ["Stack holds indexes", "Pops while current is warmer", "O(n) amortized"],
      },
    ],
    references: [
      { title: "Python documentation: heapq", url: "https://docs.python.org/3/library/heapq.html", versionSensitive: false },
      { title: "Introduction to Algorithms (CLRS), heapsort chapter", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w04-d02-graph-traversal",
    slug: "graph-traversal",
    title: "Trees, graphs and traversal",
    domain: "dsa",
    roles: ["sde", "ml-engineer", "data-engineer", "genai-engineer"],
    difficulty: "intermediate",
    minutes: 80,
    prerequisites: ["w04-d01-stacks-queues-heaps"],
    objectives: [
      "Find shortest paths in unweighted graphs with breadth-first search",
      "Order tasks with dependencies using Kahn's topological sort",
      "Detect cycles and explain why BFS and DFS visit each node once",
    ],
    summary:
      "Graphs model anything with connections: grids, task dependencies, social networks. Breadth-first search finds shortest unweighted paths; topological sort orders work so every dependency comes first.",
    eli5: {
      analogy:
        "Dropping a pebble in a pond. The ripple reaches every spot one step away, then every spot two steps away, and so on. The first time a ripple touches the exit, you know the shortest number of steps.",
      steps: [
        "Start at S and mark it visited.",
        "Visit all open neighbors one step away, then their neighbors, ring by ring.",
        "Never visit a square twice: the first visit was already the shortest.",
        "For task order, start with tasks that depend on nothing, and unlock each task once all its prerequisites are done.",
      ],
      analogyLimit:
        "Ripples assume every step costs the same. When steps have different costs, like roads of different lengths, BFS gives wrong answers and you need Dijkstra's algorithm.",
    },
    senior: {
      definition:
        "BFS explores a graph in order of distance from the source using a FIFO queue. Kahn's algorithm produces a topological order of a directed acyclic graph by repeatedly removing nodes with in-degree zero.",
      invariants: [
        "BFS: when a node is dequeued, its recorded distance is the shortest path length; the queue holds nodes at distance d and d + 1 only.",
        "A node is marked visited when enqueued, not when dequeued, so it enters the queue at most once.",
        "Kahn: a node is output only after all its predecessors; if fewer than V nodes are output, the graph has a cycle.",
      ],
      mechanism: [
        "Grid BFS treats each open cell as a node with up to four neighbors, storing distances in a dictionary or matrix.",
        "Kahn's algorithm counts in-degrees, starts with the zero in-degree set, and decrements neighbors as nodes are emitted.",
        "Choosing the alphabetically smallest available node at each step makes the order deterministic, which keeps Python and R outputs identical.",
      ],
      complexity: "BFS: O(V + E) time and O(V) space; a grid has V = rows * cols. Kahn: O(V + E), or O((V + E) log V) with a priority queue for the lexicographic order.",
      tradeoffs: [
        { option: "BFS", choose: "Shortest paths with equal edge weights, level-order traversal.", cost: "Stores a whole frontier; wide graphs use a lot of memory." },
        { option: "DFS", choose: "Reachability, cycle detection, topological order by finish time.", cost: "Recursion depth limits; no shortest-path guarantee." },
        { option: "Dijkstra or A*", choose: "Weighted edges with non-negative costs.", cost: "O((V + E) log V) and a heap." },
      ],
      failureModes: [
        "Marking nodes visited on dequeue, which enqueues the same node many times.",
        "Recursing DFS on a large graph and hitting Python's recursion limit.",
        "Returning a partial topological order without checking for a cycle.",
        "Mixing up row and column bounds on non-square grids.",
      ],
      production:
        "Build systems, schedulers like Airflow and package managers topologically sort dependencies and refuse cycles. BFS-style fan-out underlies crawlers and 'people you may know' within k hops.",
      interviewAnswer:
        "For the shortest path on an unweighted grid I run BFS from the start, marking cells visited when I enqueue them; the first time I reach the exit is the shortest distance, O(rows * cols). For dependencies I use Kahn's algorithm: emit zero in-degree nodes, decrement their neighbors, and if I emit fewer than all nodes there is a cycle.",
    },
    implementation: {
      problem: "Find the shortest path length through a grid maze, then order build tasks so every dependency runs first.",
      input: "4x8 grid with walls (#), start S, exit E; tasks setup, install, build, lint, test, deploy with six dependency edges",
      python: {
        code: code`
          from collections import deque

          GRID = [
              "S.#.....",
              ".##.###.",
              "....#...",
              "#.#...#E",
          ]


          def shortest_path(grid: list[str]) -> int:
              rows, cols = len(grid), len(grid[0])
              start = next((r, c) for r in range(rows) for c in range(cols) if grid[r][c] == "S")
              dist = {start: 0}
              queue = deque([start])
              while queue:
                  r, c = queue.popleft()
                  if grid[r][c] == "E":
                      return dist[(r, c)]
                  for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                      nr, nc = r + dr, c + dc
                      if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] != "#" and (nr, nc) not in dist:
                          dist[(nr, nc)] = dist[(r, c)] + 1
                          queue.append((nr, nc))
              return -1


          def topo_order(edges: list[tuple[str, str]]) -> list[str]:
              nodes = sorted({n for e in edges for n in e})
              indegree = {n: 0 for n in nodes}
              for _, b in edges:
                  indegree[b] += 1
              ready = sorted(n for n in nodes if indegree[n] == 0)
              order: list[str] = []
              while ready:
                  n = ready.pop(0)
                  order.append(n)
                  for a, b in edges:
                      if a == n:
                          indegree[b] -= 1
                          if indegree[b] == 0:
                              ready.append(b)
                  ready.sort()
              if len(order) != len(nodes):
                  raise ValueError("cycle detected")
              return order


          EDGES = [("setup", "install"), ("install", "build"), ("install", "lint"),
                   ("build", "test"), ("test", "deploy"), ("lint", "deploy")]
          print(f"shortest path length: {shortest_path(GRID)}")
          print("build order: " + " -> ".join(topo_order(EDGES)))
        `,
      },
      r: {
        code: code`
          GRID <- c(
            "S.#.....",
            ".##.###.",
            "....#...",
            "#.#...#E"
          )

          shortest_path <- function(grid) {
            m <- do.call(rbind, strsplit(grid, ""))
            start <- which(m == "S", arr.ind = TRUE)[1, ]
            dist <- matrix(NA_integer_, nrow(m), ncol(m))
            dist[start[1], start[2]] <- 0L
            queue <- matrix(start, ncol = 2)
            head <- 1
            while (head <= nrow(queue)) {
              r <- queue[head, 1]
              c <- queue[head, 2]
              head <- head + 1
              if (m[r, c] == "E") return(dist[r, c])
              for (d in list(c(1, 0), c(-1, 0), c(0, 1), c(0, -1))) {
                nr <- r + d[1]
                nc <- c + d[2]
                if (nr >= 1 && nr <= nrow(m) && nc >= 1 && nc <= ncol(m) && m[nr, nc] != "#" && is.na(dist[nr, nc])) {
                  dist[nr, nc] <- dist[r, c] + 1L
                  queue <- rbind(queue, c(nr, nc))
                }
              }
            }
            -1L
          }

          topo_order <- function(from, to) {
            nodes <- sort(unique(c(from, to)))
            indegree <- setNames(integer(length(nodes)), nodes)
            for (b in to) indegree[b] <- indegree[b] + 1L
            ready <- sort(nodes[indegree == 0])
            order <- character(0)
            while (length(ready) > 0) {
              n <- ready[1]
              ready <- ready[-1]
              order <- c(order, n)
              for (b in to[from == n]) {
                indegree[b] <- indegree[b] - 1L
                if (indegree[b] == 0) ready <- c(ready, b)
              }
              ready <- sort(ready)
            }
            if (length(order) != length(nodes)) stop("cycle detected")
            order
          }

          from <- c("setup", "install", "install", "build", "test", "lint")
          to <- c("install", "build", "lint", "test", "deploy", "deploy")
          cat(sprintf("shortest path length: %d\n", shortest_path(GRID)))
          cat("build order: ", paste(topo_order(from, to), collapse = " -> "), "\n", sep = "")
        `,
      },
      expectedOutput: code`
        shortest path length: 12
        build order: setup -> install -> build -> lint -> test -> deploy
      `,
      tests: {
        python: code`
          def test_unreachable_exit():
              assert shortest_path(["S#", "#E"]) == -1


          def test_adjacent_exit():
              assert shortest_path(["SE"]) == 1


          def test_cycle_is_detected():
              try:
                  topo_order([("a", "b"), ("b", "a")])
              except ValueError:
                  return
              raise AssertionError("expected a cycle error")


          def test_every_edge_respects_order():
              order = topo_order(EDGES)
              assert all(order.index(a) < order.index(b) for a, b in EDGES)
        `,
        r: code`
          test_that("an unreachable exit returns -1", {
            expect_equal(shortest_path(c("S#", "#E")), -1L)
          })

          test_that("an adjacent exit is one step away", {
            expect_equal(shortest_path("SE"), 1L)
          })

          test_that("a cycle is detected", {
            expect_error(topo_order(c("a", "b"), c("b", "a")), "cycle")
          })

          test_that("every edge respects the order", {
            o <- topo_order(from, to)
            expect_true(all(match(from, o) < match(to, o)))
          })
        `,
      },
      eli5Trace: [
        "From S the ripple spreads down the left column and right along the top row until walls stop it.",
        "Each open square records how many steps it took to reach; no square is visited twice.",
        "The ripple first touches E in the bottom-right corner after the number of steps printed.",
        "Tasks: setup has no prerequisites, so it goes first, then install. Both build and lint unlock; build comes first alphabetically.",
        "test unlocks after build, deploy waits for both test and lint and goes last.",
      ],
      complexity: { time: "O(rows * cols) and O(V + E log V)", space: "O(rows * cols) and O(V + E)" },
      edgeCases: [
        "No path to the exit returns -1.",
        "Start next to the exit returns 1.",
        "A dependency cycle raises an error instead of returning a partial order.",
        "Several valid orders exist; picking the alphabetically smallest ready task makes the output deterministic.",
      ],
      incorrect: {
        language: "python",
        code: code`
          while queue:
              r, c = queue.popleft()
              if (r, c) in seen:
                  continue
              seen.add((r, c))
              for nr, nc in neighbors(r, c):
                  queue.append((nr, nc))
        `,
        whyWrong: "Marking visited on dequeue lets the same cell be enqueued by every neighbor, so the queue grows far beyond V and distances must be tracked separately.",
        fix: "Mark a cell visited (and record its distance) at the moment you enqueue it.",
      },
    },
    flow: {
      title: "Kahn's algorithm on the build graph",
      nodes: [
        node("setup", "setup", 0, 110),
        node("install", "install", 200, 110),
        node("build", "build", 420, 30),
        node("lint", "lint", 420, 190),
        node("test", "test", 640, 30),
        node("deploy", "deploy", 860, 110),
      ],
      edges: [
        edge("setup", "install"),
        edge("install", "build"),
        edge("install", "lint"),
        edge("build", "test"),
        edge("test", "deploy"),
        edge("lint", "deploy"),
      ],
      steps: [
        step("setup", "", "Only setup has in-degree 0, so it is emitted first."),
        step("install", "setup-install", "Removing setup drops install's in-degree to 0. Emit install."),
        step("build lint", "install-build install-lint", "build and lint both become ready. Pick build first alphabetically."),
        step("lint test", "build-test", "Emitting build unlocks test. Now lint and test are ready; lint goes first."),
        step("test deploy", "test-deploy lint-deploy", "deploy needs both test and lint, so it is last. Six nodes emitted: no cycle."),
      ],
    },
    practice: [
      {
        id: "w04-graph-code-1",
        type: "code",
        prompt: "Count the number of islands (connected groups of '1') in a grid.",
        answer: "Scan cells; on an unvisited '1', increment the count and BFS or DFS to mark the whole island. O(rows * cols).",
        rubric: ["Visits each cell once", "Marks visited before or during the flood fill", "O(rows * cols)"],
      },
      {
        id: "w04-graph-recall-1",
        type: "recall",
        prompt: "Why does BFS give shortest paths only for unweighted graphs?",
        answer: "BFS explores in order of edge count. With weights, a path with more edges can be cheaper, so the first arrival is not necessarily the cheapest; use Dijkstra for non-negative weights.",
        rubric: ["Explores by edge count", "Weights break the guarantee", "Names Dijkstra"],
      },
    ],
    references: [
      { title: "Python documentation: collections.deque", url: "https://docs.python.org/3/library/collections.html#collections.deque", versionSensitive: false },
      { title: "Python documentation: graphlib.TopologicalSorter", url: "https://docs.python.org/3/library/graphlib.html", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w04-d03-dynamic-programming",
    slug: "dynamic-programming",
    title: "Dynamic programming",
    domain: "dsa",
    roles: ["sde", "ml-engineer", "data-scientist"],
    difficulty: "advanced",
    minutes: 90,
    prerequisites: ["w04-d02-graph-traversal"],
    objectives: [
      "Define a DP state, recurrence and base case before writing code",
      "Solve minimum-coins and count-the-ways coin change bottom-up",
      "Reconstruct the chosen solution from stored decisions",
    ],
    summary:
      "Dynamic programming solves a problem by solving each smaller subproblem once and reusing the answer. Coin change shows both flavors: the best answer (fewest coins) and the number of answers (ways).",
    eli5: {
      analogy:
        "Filling in a staircase of sticky notes. On step 1 you write the fewest coins for 1 cent, on step 2 for 2 cents, and so on. Each new note just reads a few notes below it, so you never redo work.",
      steps: [
        "Step 0 needs 0 coins.",
        "For each amount, try each coin: the coin plus the best note for what is left.",
        "Write the smallest result on that step's note, and remember which coin you used.",
        "At the top, follow the remembered coins back down to see the actual coins.",
      ],
      analogyLimit:
        "The staircase works because the best answer for 11 is built from best answers for smaller amounts (optimal substructure). Problems where a locally best choice ruins later choices across shared resources, or where the subproblems are too many to store, need other methods.",
    },
    senior: {
      definition:
        "DP applies when a problem has optimal substructure and overlapping subproblems. State: best[a] = fewest coins summing to a. Recurrence: best[a] = min over coins c <= a of best[a - c] + 1, with best[0] = 0. Counting combinations uses ways[a] += ways[a - c], iterating coins in the outer loop.",
      invariants: [
        "When computing best[a], every best[b] for b < a is final.",
        "best[a] = infinity means a is unreachable with these coins.",
        "In the ways recurrence, putting coins in the outer loop counts combinations (order does not matter); amounts in the outer loop would count permutations.",
      ],
      mechanism: [
        "Tabulate bottom-up from 0 to amount; store choice[a], the coin that achieved best[a].",
        "Reconstruct by repeatedly taking choice[a] and subtracting it until a = 0.",
        "Ties are broken by coin order (the first coin that strictly improves wins), which keeps Python and R identical.",
        "Greedy (always take the largest coin) works for [1, 2, 5] but fails for coins like [1, 3, 4] at amount 6.",
      ],
      complexity: "O(amount * coins) time, O(amount) space for each table.",
      tradeoffs: [
        { option: "Bottom-up tabulation", choose: "Dense state spaces like 0..amount.", cost: "Computes every state even if unused." },
        { option: "Top-down memoization", choose: "Sparse reachable states or easier recurrences.", cost: "Recursion overhead and depth limits." },
        { option: "Greedy", choose: "Only when a proof shows the greedy choice is safe (canonical coin systems).", cost: "Wrong answers otherwise." },
      ],
      failureModes: [
        "Swapping the loop order in the ways count and counting permutations instead of combinations.",
        "Initializing best with 0 instead of infinity and returning 0 for unreachable amounts.",
        "Forgetting the base case ways[0] = 1.",
        "Assuming greedy is optimal for any coin system.",
      ],
      production:
        "DP shows up in sequence alignment, edit distance for fuzzy matching, Viterbi decoding, and resource allocation such as fitting jobs into a budget.",
      interviewAnswer:
        "I define best[a] as the fewest coins for amount a, with best[0] = 0 and best[a] = min(best[a - c] + 1). I fill it bottom-up in O(amount * coins) and store the coin used so I can reconstruct the answer. For the number of combinations I loop coins outside and amounts inside, with ways[0] = 1. I would not use greedy unless the coin system is proven canonical.",
    },
    implementation: {
      problem: "For several amounts, find the fewest coins (with the coins used) and the number of combinations that make the amount.",
      input: "(coins [1, 2, 5], amount 11), (coins [2], amount 3), (coins [1, 3, 4], amount 6), (coins [1], amount 0)",
      python: {
        code: code`
          def min_coins(coins: list[int], amount: int) -> list[int] | None:
              inf = float("inf")
              best = [0.0] + [inf] * amount
              choice = [0] * (amount + 1)
              for a in range(1, amount + 1):
                  for c in coins:
                      if c <= a and best[a - c] + 1 < best[a]:
                          best[a] = best[a - c] + 1
                          choice[a] = c
              if best[amount] == inf:
                  return None
              used: list[int] = []
              while amount > 0:
                  used.append(choice[amount])
                  amount -= choice[amount]
              return used


          def count_ways(coins: list[int], amount: int) -> int:
              ways = [1] + [0] * amount
              for c in coins:
                  for a in range(c, amount + 1):
                      ways[a] += ways[a - c]
              return ways[amount]


          for coins, amount in [([1, 2, 5], 11), ([2], 3), ([1, 3, 4], 6), ([1], 0)]:
              used = min_coins(coins, amount)
              best = "none" if used is None else f"{len(used)} ({' + '.join(map(str, used)) or '-'})"
              print(f"amount={amount} coins={coins} min={best} ways={count_ways(coins, amount)}")
        `,
      },
      r: {
        code: code`
          min_coins <- function(coins, amount) {
            best <- c(0, rep(Inf, amount))
            choice <- integer(amount + 1)
            for (a in seq_len(amount)) {
              for (c in coins) {
                if (c <= a && best[a - c + 1] + 1 < best[a + 1]) {
                  best[a + 1] <- best[a - c + 1] + 1
                  choice[a + 1] <- c
                }
              }
            }
            if (is.infinite(best[amount + 1])) return(NULL)
            used <- integer(0)
            while (amount > 0) {
              used <- c(used, choice[amount + 1])
              amount <- amount - choice[amount + 1]
            }
            used
          }

          count_ways <- function(coins, amount) {
            ways <- c(1, numeric(amount))
            for (c in coins) {
              if (c > amount) next
              for (a in c:amount) ways[a + 1] <- ways[a + 1] + ways[a - c + 1]
            }
            ways[amount + 1]
          }

          cases <- list(list(c(1, 2, 5), 11), list(2, 3), list(c(1, 3, 4), 6), list(1, 0))
          for (case in cases) {
            coins <- case[[1]]
            amount <- case[[2]]
            used <- min_coins(coins, amount)
            best <- if (is.null(used)) "none" else sprintf("%d (%s)", length(used), if (length(used)) paste(used, collapse = " + ") else "-")
            cat(sprintf("amount=%d coins=[%s] min=%s ways=%d\n", amount, paste(coins, collapse = ", "), best, count_ways(coins, amount)))
          }
        `,
      },
      expectedOutput: code`
        amount=11 coins=[1, 2, 5] min=3 (1 + 5 + 5) ways=11
        amount=3 coins=[2] min=none ways=0
        amount=6 coins=[1, 3, 4] min=2 (3 + 3) ways=4
        amount=0 coins=[1] min=0 (-) ways=1
      `,
      tests: {
        python: code`
          def test_greedy_would_fail_here():
              assert sorted(min_coins([1, 3, 4], 6)) == [3, 3]


          def test_unreachable_amount():
              assert min_coins([2], 3) is None
              assert count_ways([2], 3) == 0


          def test_combinations_not_permutations():
              assert count_ways([1, 2], 3) == 2
        `,
        r: code`
          test_that("greedy would fail here", {
            expect_equal(sort(min_coins(c(1, 3, 4), 6)), c(3, 3))
          })

          test_that("an unreachable amount", {
            expect_null(min_coins(2, 3))
            expect_equal(count_ways(2, 3), 0)
          })

          test_that("ways counts combinations, not permutations", {
            expect_equal(count_ways(c(1, 2), 3), 2)
          })
        `,
      },
      eli5Trace: [
        "Notes for [1, 2, 5]: 0 needs 0 coins, 1 needs 1, 2 needs 1, 5 needs 1, 10 needs 2.",
        "For 11, trying coin 1 reads note 10 (2 coins): 3 coins. Coins 2 and 5 cannot beat 3.",
        "Follow the remembered coins back down: 1, then 5, then 5.",
        "With only a 2-cent coin, 3 cents can never be made: none, 0 ways.",
        "For [1, 3, 4] and 6, taking the biggest coin first would give 4 + 1 + 1, but the notes find 3 + 3.",
      ],
      complexity: { time: "O(amount * coins)", space: "O(amount)" },
      edgeCases: [
        "Amount 0 needs 0 coins and has exactly 1 way (use nothing).",
        "Unreachable amounts return none and 0 ways.",
        "Coins larger than the amount are skipped.",
        "Several optimal answers can exist; the first coin that strictly improves wins.",
      ],
      incorrect: {
        language: "python",
        code: code`
          def count_ways(coins, amount):
              ways = [1] + [0] * amount
              for a in range(1, amount + 1):
                  for c in coins:
                      if c <= a:
                          ways[a] += ways[a - c]
              return ways[amount]
        `,
        whyWrong: "With amounts in the outer loop, 1 + 2 and 2 + 1 are counted separately, so it counts ordered sequences (3 for amount 3 with [1, 2]) instead of combinations (2).",
        fix: "Loop over coins in the outer loop and amounts in the inner loop.",
      },
    },
    flow: {
      title: "Filling best[a] for coins [1, 2, 5]",
      nodes: [
        node("base", "best[0] = 0", 0, 110, "base case"),
        node("small", "best[1..4]", 200, 110, "1 1 2 2"),
        node("five", "best[5] = 1", 400, 30, "coin 5"),
        node("ten", "best[10] = 2", 600, 30, "5 + 5"),
        node("eleven", "best[11] = 3", 800, 110, "best[10] + coin 1"),
        node("rebuild", "Reconstruct", 800, 220, "1, 5, 5"),
      ],
      edges: [edge("base", "small"), edge("small", "five"), edge("five", "ten"), edge("ten", "eleven"), edge("eleven", "rebuild")],
      steps: [
        step("base", "", "Start with the base case: zero coins make zero."),
        step("base small", "base-small", "Each small amount reads earlier notes: best[3] = best[1] + 1 = 2 using coin 2."),
        step("small five", "small-five", "At 5, coin 5 reads best[0] and gives 1, beating 1 + 2 + 2."),
        step("five ten", "five-ten", "At 10, coin 5 reads best[5]: 2 coins."),
        step("ten eleven", "ten-eleven", "At 11, coin 1 reads best[10]: 3 coins, and no other coin does better."),
        step("eleven rebuild", "eleven-rebuild", "Walk back through the stored choices: 1, then 5, then 5."),
      ],
    },
    practice: [
      {
        id: "w04-dp-code-1",
        type: "code",
        prompt: "Compute the edit distance between two words (insert, delete, substitute each cost 1).",
        answer: "dp[i][j] = edit distance of a[:i] and b[:j]; dp[i][0] = i, dp[0][j] = j; dp[i][j] = dp[i-1][j-1] if a[i-1] == b[j-1], else 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]). O(n * m).",
        rubric: ["Correct base row and column", "Three-way recurrence", "O(n * m) time"],
      },
      {
        id: "w04-dp-recall-1",
        type: "recall",
        prompt: "How do you decide whether a problem is a DP problem?",
        answer: "Look for overlapping subproblems (the same smaller question asked repeatedly) and optimal substructure (the best answer is built from best answers to subproblems). Then define the state, recurrence, base case and order.",
        rubric: ["Overlapping subproblems", "Optimal substructure", "State, recurrence and base case"],
      },
    ],
    references: [
      { title: "Introduction to Algorithms (CLRS), dynamic programming chapter", versionSensitive: false },
      { title: "Python documentation: functools.cache for memoization", url: "https://docs.python.org/3/library/functools.html#functools.cache", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w04-d04-binary-search-backtracking",
    slug: "binary-search-backtracking",
    title: "Binary search on answers, greedy checks and backtracking",
    domain: "dsa",
    roles: ["sde", "ml-engineer"],
    difficulty: "advanced",
    minutes: 80,
    prerequisites: ["w01-d02-big-o-complexity", "w04-d03-dynamic-programming"],
    objectives: [
      "Binary search over a monotonic answer space with a greedy feasibility check",
      "Enumerate combinations with backtracking and prune early",
      "Explain when greedy is provably correct",
    ],
    summary:
      "When 'can we do it with capacity c?' gets easier as c grows, binary search finds the smallest c that works. When you must list every valid combination, backtracking builds candidates step by step and abandons dead ends.",
    eli5: {
      analogy:
        "Choosing a truck size. Try a medium truck: if the boxes fit in 5 trips, try a smaller one; if not, try a bigger one. Each try halves the range of sizes. For combinations, it is like trying outfits: add a piece, and if it already breaks the dress code, take it off and try the next piece.",
      steps: [
        "The smallest possible truck carries the heaviest box; the biggest carries everything at once.",
        "Pick the middle size and count trips by loading boxes in order until the truck is full.",
        "Too many trips: the truck must be bigger. Few enough: try smaller.",
        "For sums: add a number, keep going while the total is below the target, and step back when it goes over.",
      ],
      analogyLimit:
        "Halving only works because a bigger truck never needs more trips. If the answer is not monotonic, binary search can skip the right answer. Backtracking still explores many branches, so it is exponential in the worst case.",
    },
    senior: {
      definition:
        "Binary search on the answer finds the minimum x in [lo, hi] with feasible(x) true, where feasible is monotonic. Backtracking is depth-first search over partial solutions with pruning when a partial solution cannot be completed.",
      invariants: [
        "feasible(c) is monotonic: if capacity c works, any capacity above c works.",
        "lo = max(weights) is the smallest capacity that can carry every box; hi = sum(weights) always works.",
        "Backtracking only extends combinations with candidates at or after the current index, so each combination is generated once in non-decreasing order.",
      ],
      mechanism: [
        "The greedy check loads boxes in order and starts a new day when the next box would overflow; this greedy is optimal because boxes must ship in order.",
        "Binary search keeps the invariant 'the answer is in [lo, hi]' and stops when lo = hi.",
        "Combination sum sorts candidates, recurses with the remaining target, reuses the same candidate (index stays) and breaks the loop once a candidate exceeds the remaining target.",
      ],
      complexity: "Shipping: O(n log(sum - max)). Combination sum: exponential in the worst case, bounded by the number of valid and pruned partial combinations.",
      tradeoffs: [
        { option: "Binary search on the answer", choose: "Minimize or maximize a threshold with a monotonic check.", cost: "Needs a correct feasibility check and a proven monotonic property." },
        { option: "Dynamic programming", choose: "Counting or optimizing with overlapping subproblems.", cost: "May need a large table." },
        { option: "Backtracking", choose: "When you must list every solution, or constraints prune heavily.", cost: "Exponential worst case." },
      ],
      failureModes: [
        "Starting lo at 1 instead of max(weights), so the check accepts capacities that cannot lift the heaviest box.",
        "Using lo < hi with hi = mid - 1 and skipping the answer.",
        "Backtracking without sorting, so pruning by 'candidate exceeds remaining' cannot break early.",
        "Appending the shared path list itself instead of a copy, so every saved result ends up empty.",
      ],
      production:
        "Binary search on capacity sizes autoscaling and batch windows ('smallest worker count that meets the SLA'). Backtracking with pruning underlies constraint solvers, schedulers and test-case generators.",
      interviewAnswer:
        "The number of days needed only decreases as capacity grows, so I binary search capacity between the heaviest package and the total weight, using a greedy check that counts days. That is O(n log(sum)). For combinations that hit a target I sort, recurse with the remaining target, allow reuse by not advancing the index, and break when a candidate exceeds what is left.",
    },
    implementation: {
      problem: "Find the smallest ship capacity that delivers packages in order within 5 days, then list all combinations of candidates (with reuse) that sum to 7.",
      input: "weights = 1..10, days = 5; candidates = [2, 3, 6, 7], target = 7",
      python: {
        code: code`
          def days_needed(weights: list[int], capacity: int) -> int:
              days, load = 1, 0
              for w in weights:
                  if load + w > capacity:
                      days += 1
                      load = 0
                  load += w
              return days


          def min_capacity(weights: list[int], days: int) -> int:
              lo, hi = max(weights), sum(weights)
              while lo < hi:
                  mid = (lo + hi) // 2
                  if days_needed(weights, mid) <= days:
                      hi = mid
                  else:
                      lo = mid + 1
              return lo


          def combination_sum(candidates: list[int], target: int) -> list[list[int]]:
              candidates = sorted(candidates)
              results: list[list[int]] = []

              def backtrack(start: int, remaining: int, path: list[int]) -> None:
                  if remaining == 0:
                      results.append(path.copy())
                      return
                  for i in range(start, len(candidates)):
                      c = candidates[i]
                      if c > remaining:
                          break
                      path.append(c)
                      backtrack(i, remaining - c, path)
                      path.pop()

              backtrack(0, target, [])
              return results


          print(f"min capacity for 5 days: {min_capacity(list(range(1, 11)), 5)}")
          print("combinations summing to 7: " + " ".join(str(c) for c in combination_sum([2, 3, 6, 7], 7)))
        `,
      },
      r: {
        code: code`
          days_needed <- function(weights, capacity) {
            days <- 1
            load <- 0
            for (w in weights) {
              if (load + w > capacity) {
                days <- days + 1
                load <- 0
              }
              load <- load + w
            }
            days
          }

          min_capacity <- function(weights, days) {
            lo <- max(weights)
            hi <- sum(weights)
            while (lo < hi) {
              mid <- (lo + hi) %/% 2
              if (days_needed(weights, mid) <= days) hi <- mid else lo <- mid + 1
            }
            lo
          }

          combination_sum <- function(candidates, target) {
            candidates <- sort(candidates)
            results <- list()
            backtrack <- function(start, remaining, path) {
              if (remaining == 0) {
                results[[length(results) + 1]] <<- path
                return(invisible())
              }
              for (i in seq(start, length(candidates))) {
                c <- candidates[i]
                if (c > remaining) break
                backtrack(i, remaining - c, c(path, c))
              }
            }
            backtrack(1, target, numeric(0))
            results
          }

          cat(sprintf("min capacity for 5 days: %d\n", min_capacity(1:10, 5)))
          combos <- vapply(combination_sum(c(2, 3, 6, 7), 7), function(p) sprintf("[%s]", paste(p, collapse = ", ")), character(1))
          cat("combinations summing to 7: ", paste(combos, collapse = " "), "\n", sep = "")
        `,
      },
      expectedOutput: code`
        min capacity for 5 days: 15
        combinations summing to 7: [2, 2, 3] [7]
      `,
      tests: {
        python: code`
          def test_capacity_is_minimal():
              w = list(range(1, 11))
              cap = min_capacity(w, 5)
              assert days_needed(w, cap) <= 5 and days_needed(w, cap - 1) > 5


          def test_one_day_needs_everything():
              assert min_capacity([3, 2, 2, 4, 1, 4], 1) == 16


          def test_no_combination():
              assert combination_sum([5, 10], 3) == []


          def test_reuse_is_allowed():
              assert combination_sum([2], 6) == [[2, 2, 2]]
        `,
        r: code`
          test_that("the capacity is minimal", {
            cap <- min_capacity(1:10, 5)
            expect_lte(days_needed(1:10, cap), 5)
            expect_gt(days_needed(1:10, cap - 1), 5)
          })

          test_that("one day needs everything", {
            expect_equal(min_capacity(c(3, 2, 2, 4, 1, 4), 1), 16)
          })

          test_that("no combination returns an empty list", {
            expect_length(combination_sum(c(5, 10), 3), 0)
          })

          test_that("reuse is allowed", {
            expect_equal(combination_sum(2, 6), list(c(2, 2, 2)))
          })
        `,
      },
      eli5Trace: [
        "The smallest truck must lift the 10 box; the biggest carries all 55 at once.",
        "Try 32: it takes 2 trips, so try smaller. Try 21: 3 trips, still fine, try smaller.",
        "Keep halving until the smallest size that still fits in 5 trips remains.",
        "For 7: 2 + 2 + 2 would leave 1, too small for anything, so back up; 2 + 2 + 3 works. 7 alone works. 6 leaves 1: dead end.",
      ],
      complexity: { time: "O(n log(sum)) and exponential worst case for backtracking", space: "O(1) and O(target / min candidate) recursion depth" },
      edgeCases: [
        "days = 1 needs capacity equal to the total weight.",
        "days >= number of packages needs only the heaviest package.",
        "No combination reaches the target: an empty list.",
        "A candidate equal to the target is a combination by itself.",
      ],
      incorrect: {
        language: "python",
        code: code`
          if remaining == 0:
              results.append(path)
              return
        `,
        whyWrong: "path is the same list object that backtracking keeps mutating, so after the search every stored result is the final, empty path.",
        fix: "Store a copy: results.append(path.copy()) (or list(path)).",
      },
    },
    flow: {
      title: "Binary search over ship capacity",
      nodes: [
        node("range", "Range 10..55", 0, 110, "max weight .. total"),
        node("mid32", "Try 32", 210, 30, "2 days: fits"),
        node("mid21", "Try 21", 420, 30, "3 days: fits"),
        node("mid15", "Try 15", 630, 30, "5 days: fits"),
        node("mid12", "Try 12", 630, 190, "6 days: too many"),
        node("answer", "Answer 15", 860, 110, "smallest that fits"),
      ],
      edges: [edge("range", "mid32"), edge("mid32", "mid21"), edge("mid21", "mid15"), edge("mid15", "mid12"), edge("mid12", "answer")],
      steps: [
        step("range", "", "Capacity must be at least 10 (the heaviest box) and 55 always works."),
        step("range mid32", "range-mid32", "Try the middle, 32: the greedy load needs 2 days, so look lower."),
        step("mid32 mid21", "mid32-mid21", "21 needs 3 days: still within 5, so keep looking lower."),
        step("mid21 mid15", "mid21-mid15", "Smaller tries narrow the range; 15 needs exactly 5 days."),
        step("mid15 mid12", "mid15-mid12", "Anything smaller, such as 12 or 14, needs 6 days, which is too many."),
        step("answer", "mid12-answer", "The range closes at 15, the smallest capacity that ships in 5 days."),
      ],
    },
    practice: [
      {
        id: "w04-bs-code-1",
        type: "code",
        prompt: "Koko eats bananas: piles p and h hours. Find the minimum eating speed so she finishes in time.",
        answer: "Binary search speed in [1, max(p)]; hours(speed) = sum(ceil(x / speed)). Find the smallest speed with hours <= h. O(n log max(p)).",
        rubric: ["Monotonic check", "Correct bounds", "Ceiling division"],
      },
      {
        id: "w04-backtrack-code-1",
        type: "code",
        prompt: "Generate all permutations of a list of distinct numbers.",
        answer: "Backtrack with a used-flag array: for each unused element, mark it, append it, recurse, then undo. n! results, O(n * n!) time.",
        rubric: ["Undo after recursion", "Copies the path when saving", "States n! output size"],
      },
    ],
    references: [
      { title: "Python documentation: bisect for searching sorted sequences", url: "https://docs.python.org/3/library/bisect.html", versionSensitive: false },
      { title: "The Algorithm Design Manual (Skiena), backtracking chapter", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),
];

export const week = defineWeek({
  number: 4,
  slug: "dsa-structures-graphs-dp",
  title: "DSA II: structures, graphs and dynamic programming",
  track: "core",
  domains: ["dsa"],
  summary:
    "The rest of the interview toolkit: stacks, queues, heaps, binary search on answers, tree and graph traversal, backtracking, greedy and dynamic programming.",
  outcomes: [
    "Choose the right structure (stack, queue, heap) from the access pattern",
    "Traverse graphs with BFS and order dependencies with topological sort",
    "Write DP recurrences with base cases and reconstruct solutions",
  ],
  roles: ["sde", "ml-engineer", "data-scientist", "data-engineer"],
  days: [
    {
      id: "w04-d01",
      day: 1,
      kind: "concept-map",
      title: "Stacks, queues and heaps",
      summary: "Access patterns decide the structure: last-in-first-out, first-in-first-out, or always-the-minimum.",
      minutes: 75,
      goals: ["Match brackets with a stack", "Keep top-k with a size-k heap"],
      tasks: [
        { label: "Concept map and heap diagram", minutes: 15 },
        { label: "Run both examples, including R's hand-written heap", minutes: 30 },
        { label: "Daily temperatures drill", minutes: 20 },
        { label: "Recall prompts", minutes: 10 },
      ],
      topicIds: ["w04-d01-stacks-queues-heaps"],
    },
    {
      id: "w04-d02",
      day: 2,
      kind: "theory-lab",
      title: "Trees, graphs and traversal",
      summary: "BFS distances and Kahn's topological order, with cycle detection.",
      minutes: 85,
      goals: ["Explain why visited marks happen on enqueue", "Detect a dependency cycle"],
      tasks: [
        { label: "Step through Kahn's algorithm", minutes: 15 },
        { label: "Run the maze and build-order examples", minutes: 30 },
        { label: "Number of islands drill", minutes: 25 },
        { label: "Recall prompt", minutes: 15 },
      ],
      topicIds: ["w04-d02-graph-traversal"],
    },
    {
      id: "w04-d03",
      day: 3,
      kind: "implementation",
      title: "Dynamic programming",
      summary: "State, recurrence, base case, order: coin change two ways.",
      minutes: 95,
      goals: ["Write the recurrence before coding", "Explain combinations versus permutations"],
      tasks: [
        { label: "Read the staircase analogy and its limit", minutes: 10 },
        { label: "Run coin change and its tests", minutes: 30 },
        { label: "Edit distance drill", minutes: 40 },
        { label: "Recall prompt", minutes: 15 },
      ],
      topicIds: ["w04-d03-dynamic-programming"],
    },
    {
      id: "w04-d04",
      day: 4,
      kind: "applied-practice",
      title: "Binary search on answers and backtracking",
      summary: "Monotonic feasibility checks and pruned enumeration, then a mixed problem set.",
      minutes: 100,
      goals: ["Find the monotonic property in a minimize-the-maximum problem", "Prune backtracking with sorting"],
      tasks: [
        { label: "Run the shipping and combination examples", minutes: 30 },
        { label: "Koko and permutations drills", minutes: 45 },
        { label: "Mixed pattern-naming set", minutes: 25 },
      ],
      topicIds: ["w04-d04-binary-search-backtracking", "w04-d01-stacks-queues-heaps", "w04-d02-graph-traversal", "w04-d03-dynamic-programming"],
    },
    {
      id: "w04-d05",
      day: 5,
      kind: "production-lens",
      title: "Dependency resolution in a build system",
      summary: "Topological sort, cycle reporting and caching in a real monorepo build.",
      minutes: 60,
      goals: ["Design a build order with parallelism and cycle errors people can act on"],
      tasks: [
        { label: "Read the scenario", minutes: 10 },
        { label: "Answer the case questions", minutes: 35 },
        { label: "Compare against the rubric", minutes: 15 },
      ],
      topicIds: ["w04-d02-graph-traversal"],
      productionCase: {
        title: "A monorepo build that takes 40 minutes",
        scenario:
          "Your monorepo has 300 packages. CI builds them one at a time in alphabetical order, so a change to a leaf package still rebuilds everything, and last week a circular import between two packages produced a build that hung instead of failing.",
        constraints: [
          "CI machines have 16 cores.",
          "Engineers need a clear error naming the packages in any cycle.",
          "Unchanged packages should not rebuild.",
        ],
        questions: [
          "How do you compute a correct build order and run independent packages in parallel?",
          "How do you detect and report cycles?",
          "How do you rebuild only what a change affects?",
          "What is the critical path and why does it bound build time?",
        ],
        rubric: [
          "Topological sort with level-by-level parallel execution",
          "Cycle detection that reports the cycle's members (DFS with a recursion stack or leftover in-degrees)",
          "Content-hash caching and reverse-dependency traversal from changed packages",
          "Explains the critical path as the longest dependency chain",
        ],
        pitfalls: ["Timeouts instead of cycle detection", "Rebuilding reverse dependencies without hashing inputs"],
      },
    },
    {
      id: "w04-d06",
      day: 6,
      kind: "interview-simulation",
      title: "DSA mock: graphs and DP",
      summary: "Two timed problems: one graph traversal, one dynamic programming.",
      minutes: 60,
      goals: ["State the recurrence or traversal before coding", "Test with an edge case out loud"],
      tasks: [
        { label: "Graph problem (timed)", minutes: 22 },
        { label: "DP problem (timed)", minutes: 23 },
        { label: "Self-score with the rubric", minutes: 15 },
      ],
      topicIds: ["w04-d02-graph-traversal", "w04-d03-dynamic-programming", "w04-d04-binary-search-backtracking"],
    },
    {
      id: "w04-d07",
      day: 7,
      kind: "review",
      title: "DSA II review",
      summary: "Spaced review across weeks 3 and 4, focused on your lowest-mastery patterns.",
      minutes: 50,
      goals: ["Clear due reviews", "Re-solve your two weakest problems"],
      tasks: [
        { label: "Due reviews", minutes: 20 },
        { label: "Re-solve weak problems", minutes: 30 },
      ],
      topicIds: ["w04-d01-stacks-queues-heaps", "w04-d02-graph-traversal", "w04-d03-dynamic-programming", "w04-d04-binary-search-backtracking", "w03-d02-sliding-window"],
    },
  ],
});
