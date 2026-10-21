import type { DrillInput } from "@/lib/content-types";
import { code } from "./helpers";

/** Coding problems, part 2: graphs, dynamic programming, search, trees, lists, recursion and data wrangling. */
export const codingB: DrillInput[] = [
  {
    kind: "code",
    id: "code-number-of-islands",
    title: "Number of islands",
    pattern: "Grid BFS or DFS",
    difficulty: "intermediate",
    topicIds: ["w04-d02-graph-traversal"],
    prompt: "A grid of '1' (land) and '0' (water) is given as a list of strings. Count the islands: groups of land connected up, down, left or right.",
    hints: ["Scan every cell; when you find unvisited land, count one island and flood-fill all land connected to it."],
    examples: [{ input: '["11000", "11000", "00100", "00011"]', output: "3" }],
    python: {
      starter: code`
        def count_islands(grid):
            # your code here
            return 0
      `,
      solution: code`
        def count_islands(grid):
            rows, cols = len(grid), len(grid[0]) if grid else 0
            seen = set()
            islands = 0
            for r in range(rows):
                for c in range(cols):
                    if grid[r][c] == "1" and (r, c) not in seen:
                        islands += 1
                        stack = [(r, c)]
                        seen.add((r, c))
                        while stack:
                            y, x = stack.pop()
                            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                                ny, nx = y + dy, x + dx
                                if 0 <= ny < rows and 0 <= nx < cols and grid[ny][nx] == "1" and (ny, nx) not in seen:
                                    seen.add((ny, nx))
                                    stack.append((ny, nx))
            return islands
      `,
      tests: code`
        def test_three():
            assert count_islands(["11000", "11000", "00100", "00011"]) == 3


        def test_one_big():
            assert count_islands(["111", "101", "111"]) == 1


        def test_diagonal_is_separate():
            assert count_islands(["10", "01"]) == 2
      `,
    },
    r: {
      starter: code`
        count_islands <- function(grid) {
          # your code here
          0
        }
      `,
      solution: code`
        count_islands <- function(grid) {
          m <- do.call(rbind, strsplit(grid, ""))
          seen <- matrix(FALSE, nrow(m), ncol(m))
          islands <- 0
          for (r in seq_len(nrow(m))) {
            for (c in seq_len(ncol(m))) {
              if (m[r, c] == "1" && !seen[r, c]) {
                islands <- islands + 1
                stack <- list(c(r, c))
                seen[r, c] <- TRUE
                while (length(stack) > 0) {
                  cell <- stack[[length(stack)]]
                  stack[[length(stack)]] <- NULL
                  for (d in list(c(1, 0), c(-1, 0), c(0, 1), c(0, -1))) {
                    ny <- cell[1] + d[1]
                    nx <- cell[2] + d[2]
                    if (ny >= 1 && ny <= nrow(m) && nx >= 1 && nx <= ncol(m) && m[ny, nx] == "1" && !seen[ny, nx]) {
                      seen[ny, nx] <- TRUE
                      stack[[length(stack) + 1]] <- c(ny, nx)
                    }
                  }
                }
              }
            }
          }
          islands
        }
      `,
      tests: code`
        test_that("three islands", {
          expect_equal(count_islands(c("11000", "11000", "00100", "00011")), 3)
        })

        test_that("diagonal cells are separate islands", {
          expect_equal(count_islands(c("10", "01")), 2)
        })
      `,
    },
    complexity: "O(rows × cols) time and space",
    eli5: "Fly over the map. Each time you spot land nobody has painted yet, count a new island and paint every bit of land you can walk to from there.",
  },
  {
    kind: "code",
    id: "code-course-schedule",
    title: "Can every course be finished?",
    pattern: "Topological sort (Kahn's algorithm)",
    difficulty: "intermediate",
    topicIds: ["w04-d02-graph-traversal"],
    prompt: "There are n courses numbered 0 to n - 1. Each pair (a, b) means you must take b before a. Return true if all courses can be finished, meaning the prerequisites have no cycle. In R, pass the a values and the b values as two vectors.",
    hints: ["Count how many prerequisites each course still waits for.", "Repeatedly take courses with zero remaining; if some are never taken, there is a cycle."],
    examples: [
      { input: "n = 2, pairs = [(1, 0)]", output: "true" },
      { input: "n = 2, pairs = [(1, 0), (0, 1)]", output: "false" },
    ],
    python: {
      starter: code`
        def can_finish(n, pairs):
            # your code here
            return True
      `,
      solution: code`
        from collections import deque


        def can_finish(n, pairs):
            waiting = [0] * n
            unlocks = [[] for _ in range(n)]
            for a, b in pairs:
                waiting[a] += 1
                unlocks[b].append(a)
            ready = deque(i for i in range(n) if waiting[i] == 0)
            taken = 0
            while ready:
                course = ready.popleft()
                taken += 1
                for nxt in unlocks[course]:
                    waiting[nxt] -= 1
                    if waiting[nxt] == 0:
                        ready.append(nxt)
            return taken == n
      `,
      tests: code`
        def test_chain():
            assert can_finish(3, [(1, 0), (2, 1)]) is True


        def test_cycle():
            assert can_finish(2, [(1, 0), (0, 1)]) is False


        def test_no_prerequisites():
            assert can_finish(4, []) is True
      `,
    },
    r: {
      starter: code`
        can_finish <- function(n, a, b) {
          # your code here
          TRUE
        }
      `,
      solution: code`
        can_finish <- function(n, a, b) {
          waiting <- integer(n)
          for (x in a) waiting[x + 1] <- waiting[x + 1] + 1L
          ready <- which(waiting == 0) - 1
          taken <- 0
          while (length(ready) > 0) {
            course <- ready[1]
            ready <- ready[-1]
            taken <- taken + 1
            for (nxt in a[b == course]) {
              waiting[nxt + 1] <- waiting[nxt + 1] - 1L
              if (waiting[nxt + 1] == 0) ready <- c(ready, nxt)
            }
          }
          taken == n
        }
      `,
      tests: code`
        test_that("chain", {
          expect_true(can_finish(3, c(1, 2), c(0, 1)))
        })

        test_that("cycle", {
          expect_false(can_finish(2, c(1, 0), c(0, 1)))
        })
      `,
    },
    complexity: "O(n + e) time and space for n courses and e pairs",
    eli5: "Take any class that needs nothing first. Each time you finish one, cross it off the lists of classes that were waiting for it. If you get stuck with classes left, they are waiting on each other in a circle.",
  },
  {
    kind: "code",
    id: "code-network-delay",
    title: "Network delay time",
    pattern: "Dijkstra's shortest paths",
    difficulty: "advanced",
    topicIds: ["w04-d05-shortest-paths-union-find"],
    prompt: "Nodes are numbered 1 to n. Each edge (u, v, w) sends a signal from u to v in w milliseconds. Starting at node k, return how long until every node has the signal, or -1 if some node never gets it. In R, pass u, v and w as three vectors.",
    hints: ["Dijkstra: always settle the closest unsettled node next.", "The answer is the largest settled distance."],
    examples: [{ input: "edges = [(2, 1, 1), (2, 3, 1), (3, 4, 1)], n = 4, k = 2", output: "2" }],
    python: {
      starter: code`
        def network_delay(edges, n, k):
            # your code here
            return -1
      `,
      solution: code`
        import heapq


        def network_delay(edges, n, k):
            graph = {i: [] for i in range(1, n + 1)}
            for u, v, w in edges:
                graph[u].append((v, w))
            dist = {}
            heap = [(0, k)]
            while heap:
                d, node = heapq.heappop(heap)
                if node in dist:
                    continue
                dist[node] = d
                for nxt, w in graph[node]:
                    if nxt not in dist:
                        heapq.heappush(heap, (d + w, nxt))
            return max(dist.values()) if len(dist) == n else -1
      `,
      tests: code`
        def test_basic():
            assert network_delay([(2, 1, 1), (2, 3, 1), (3, 4, 1)], 4, 2) == 2


        def test_unreachable():
            assert network_delay([(1, 2, 1)], 2, 2) == -1


        def test_detour_is_faster():
            assert network_delay([(1, 2, 10), (1, 3, 1), (3, 2, 2)], 3, 1) == 3
      `,
    },
    r: {
      starter: code`
        network_delay <- function(u, v, w, n, k) {
          # your code here
          -1
        }
      `,
      solution: code`
        network_delay <- function(u, v, w, n, k) {
          dist <- rep(Inf, n)
          done <- rep(FALSE, n)
          dist[k] <- 0
          for (step in seq_len(n)) {
            candidates <- which(!done & is.finite(dist))
            if (length(candidates) == 0) break
            node <- candidates[which.min(dist[candidates])]
            done[node] <- TRUE
            out <- which(u == node)
            for (e in out) dist[v[e]] <- min(dist[v[e]], dist[node] + w[e])
          }
          if (all(is.finite(dist))) max(dist) else -1
        }
      `,
      tests: code`
        test_that("basic", {
          expect_equal(network_delay(c(2, 2, 3), c(1, 3, 4), c(1, 1, 1), 4, 2), 2)
        })

        test_that("detour is faster", {
          expect_equal(network_delay(c(1, 1, 3), c(2, 3, 2), c(10, 1, 2), 3, 1), 3)
        })

        test_that("unreachable node", {
          expect_equal(network_delay(1, 2, 1, 2, 2), -1)
        })
      `,
    },
    complexity: "O(e log e) with a heap (Python); O(n² + e) with the simple array version (R)",
    eli5: "Shout from the start node. Always deal next with the closest node that has not heard yet, and update how soon its neighbors could hear. The slowest node to hear sets the answer.",
  },
  {
    kind: "code",
    id: "code-climbing-stairs",
    title: "Climbing stairs",
    pattern: "1D dynamic programming",
    difficulty: "beginner",
    topicIds: ["w04-d03-dynamic-programming"],
    prompt: "You climb n steps taking 1 or 2 steps at a time. Return the number of distinct ways to reach the top.",
    hints: ["Ways(n) = Ways(n - 1) + Ways(n - 2).", "Keep only the last two answers."],
    examples: [{ input: "n = 3", output: "3 (1+1+1, 1+2, 2+1)" }],
    python: {
      starter: code`
        def climb_stairs(n):
            # your code here
            return n
      `,
      solution: code`
        def climb_stairs(n):
            a, b = 1, 1
            for _ in range(n):
                a, b = b, a + b
            return a
      `,
      tests: code`
        def test_small():
            assert climb_stairs(1) == 1 and climb_stairs(2) == 2 and climb_stairs(3) == 3


        def test_five():
            assert climb_stairs(5) == 8


        def test_larger():
            assert climb_stairs(30) == 1346269
      `,
    },
    r: {
      starter: code`
        climb_stairs <- function(n) {
          # your code here
          n
        }
      `,
      solution: code`
        climb_stairs <- function(n) {
          a <- 1
          b <- 1
          for (i in seq_len(n)) {
            nxt <- a + b
            a <- b
            b <- nxt
          }
          a
        }
      `,
      tests: code`
        test_that("small cases", {
          expect_equal(c(climb_stairs(1), climb_stairs(2), climb_stairs(3)), c(1, 2, 3))
        })

        test_that("thirty steps", {
          expect_equal(climb_stairs(30), 1346269)
        })
      `,
    },
    complexity: "O(n) time, O(1) space",
    eli5: "To reach a step, you came from one step below or two steps below, so its number of ways is the two before it added together. Just keep adding as you climb.",
  },
  {
    kind: "code",
    id: "code-house-robber",
    title: "House robber",
    pattern: "1D dynamic programming",
    difficulty: "intermediate",
    topicIds: ["w04-d03-dynamic-programming"],
    prompt: "Houses in a row hold amounts of money. You cannot take from two neighboring houses. Return the most money you can take.",
    hints: ["At each house: either skip it (keep the best so far) or take it plus the best from two houses back."],
    examples: [{ input: "[2, 7, 9, 3, 1]", output: "12 (2 + 9 + 1)" }],
    python: {
      starter: code`
        def rob(houses):
            # your code here
            return max(houses, default=0)
      `,
      solution: code`
        def rob(houses):
            take, skip = 0, 0
            for x in houses:
                take, skip = skip + x, max(take, skip)
            return max(take, skip)
      `,
      tests: code`
        def test_basic():
            assert rob([2, 7, 9, 3, 1]) == 12


        def test_alternate():
            assert rob([1, 2, 3, 1]) == 4


        def test_empty():
            assert rob([]) == 0
      `,
    },
    r: {
      starter: code`
        rob <- function(houses) {
          # your code here
          if (length(houses)) max(houses) else 0
        }
      `,
      solution: code`
        rob <- function(houses) {
          take <- 0
          skip <- 0
          for (x in houses) {
            new_take <- skip + x
            skip <- max(take, skip)
            take <- new_take
          }
          max(take, skip)
        }
      `,
      tests: code`
        test_that("basic", {
          expect_equal(rob(c(2, 7, 9, 3, 1)), 12)
        })

        test_that("empty street", {
          expect_equal(rob(numeric(0)), 0)
        })

        test_that("alternate houses", {
          expect_equal(rob(c(1, 2, 3, 1)), 4)
        })
      `,
    },
    complexity: "O(n) time, O(1) space",
    eli5: "Walk down the street keeping two totals: the best if you took the last house, and the best if you skipped it. Taking this house is only allowed after a skip.",
  },
  {
    kind: "code",
    id: "code-lis",
    title: "Longest increasing subsequence",
    pattern: "DP with binary search (patience sorting)",
    difficulty: "intermediate",
    topicIds: ["w04-d03-dynamic-programming", "w04-d04-binary-search-backtracking"],
    prompt: "Return the length of the longest strictly increasing subsequence (not necessarily neighbors).",
    hints: ["tails[i] is the smallest possible last value of an increasing subsequence of length i + 1.", "Each number replaces the first tail that is at least as big, found by binary search."],
    examples: [{ input: "[10, 9, 2, 5, 3, 7, 101, 18]", output: "4 (2, 3, 7, 18)" }],
    python: {
      starter: code`
        def lis_length(nums):
            # your code here
            return 1
      `,
      solution: code`
        from bisect import bisect_left


        def lis_length(nums):
            tails = []
            for x in nums:
                i = bisect_left(tails, x)
                if i == len(tails):
                    tails.append(x)
                else:
                    tails[i] = x
            return len(tails)
      `,
      tests: code`
        def test_basic():
            assert lis_length([10, 9, 2, 5, 3, 7, 101, 18]) == 4


        def test_strict():
            assert lis_length([7, 7, 7, 7]) == 1


        def test_empty():
            assert lis_length([]) == 0
      `,
    },
    r: {
      starter: code`
        lis_length <- function(nums) {
          # your code here
          1
        }
      `,
      solution: code`
        lis_length <- function(nums) {
          tails <- numeric(0)
          for (x in nums) {
            i <- sum(tails < x) + 1
            if (i > length(tails)) tails <- c(tails, x) else tails[i] <- x
          }
          length(tails)
        }
      `,
      tests: code`
        test_that("basic", {
          expect_equal(lis_length(c(10, 9, 2, 5, 3, 7, 101, 18)), 4)
        })

        test_that("empty input", {
          expect_equal(lis_length(numeric(0)), 0)
        })
      `,
    },
    complexity: "O(n log n) with binary search (Python); the R version counts with sum(tails < x), which is O(n) per step and O(n²) overall but stays short and clear",
    eli5: "Deal the numbers into piles like solitaire: put each number on the leftmost pile whose top is not smaller, or start a new pile. The number of piles is the answer.",
  },
  {
    kind: "code",
    id: "code-edit-distance",
    title: "Edit distance",
    pattern: "2D dynamic programming",
    difficulty: "advanced",
    topicIds: ["w04-d03-dynamic-programming"],
    prompt: "Return the minimum number of single-character inserts, deletes or replacements that turn word a into word b.",
    hints: ["d[i][j] is the distance between the first i letters of a and the first j letters of b.", "If the letters match, copy the diagonal; otherwise take 1 plus the smallest of the three neighbors."],
    examples: [{ input: 'a = "horse", b = "ros"', output: "3" }],
    python: {
      starter: code`
        def edit_distance(a, b):
            # your code here
            return abs(len(a) - len(b))
      `,
      solution: code`
        def edit_distance(a, b):
            prev = list(range(len(b) + 1))
            for i in range(1, len(a) + 1):
                cur = [i] + [0] * len(b)
                for j in range(1, len(b) + 1):
                    if a[i - 1] == b[j - 1]:
                        cur[j] = prev[j - 1]
                    else:
                        cur[j] = 1 + min(prev[j], cur[j - 1], prev[j - 1])
                prev = cur
            return prev[len(b)]
      `,
      tests: code`
        def test_basic():
            assert edit_distance("horse", "ros") == 3


        def test_longer():
            assert edit_distance("intention", "execution") == 5


        def test_empty():
            assert edit_distance("", "abc") == 3
      `,
    },
    r: {
      starter: code`
        edit_distance <- function(a, b) {
          # your code here
          abs(nchar(a) - nchar(b))
        }
      `,
      solution: code`
        edit_distance <- function(a, b) {
          x <- strsplit(a, "")[[1]]
          y <- strsplit(b, "")[[1]]
          d <- matrix(0, length(x) + 1, length(y) + 1)
          d[, 1] <- 0:length(x)
          d[1, ] <- 0:length(y)
          for (i in seq_along(x)) {
            for (j in seq_along(y)) {
              d[i + 1, j + 1] <- if (x[i] == y[j]) d[i, j] else 1 + min(d[i, j + 1], d[i + 1, j], d[i, j])
            }
          }
          d[length(x) + 1, length(y) + 1]
        }
      `,
      tests: code`
        test_that("horse to ros", {
          expect_equal(edit_distance("horse", "ros"), 3)
        })

        test_that("intention to execution", {
          expect_equal(edit_distance("intention", "execution"), 5)
        })
      `,
    },
    complexity: "O(len(a) × len(b)) time; O(len(b)) space with two rows (Python), full table in R",
    eli5: "Fill a table where each box answers 'how many fixes to turn this start of word a into this start of word b'. Each box looks at three neighbors that are already filled in.",
  },
  {
    kind: "code",
    id: "code-search-rotated",
    title: "Search a rotated sorted list",
    pattern: "Modified binary search",
    difficulty: "intermediate",
    topicIds: ["w04-d04-binary-search-backtracking"],
    prompt: "A sorted list of distinct numbers was rotated at some point (for example [4, 5, 6, 7, 0, 1, 2]). Return the position of the target (0-based in Python, 1-based in R) or -1, in O(log n).",
    hints: ["At every middle point, one half is still sorted.", "Check whether the target lies inside the sorted half; if not, search the other half."],
    examples: [{ input: "nums = [4, 5, 6, 7, 0, 1, 2], target = 0", output: "4 in Python, 5 in R" }],
    python: {
      starter: code`
        def search_rotated(nums, target):
            # your code here
            return -1
      `,
      solution: code`
        def search_rotated(nums, target):
            lo, hi = 0, len(nums) - 1
            while lo <= hi:
                mid = (lo + hi) // 2
                if nums[mid] == target:
                    return mid
                if nums[lo] <= nums[mid]:
                    if nums[lo] <= target < nums[mid]:
                        hi = mid - 1
                    else:
                        lo = mid + 1
                else:
                    if nums[mid] < target <= nums[hi]:
                        lo = mid + 1
                    else:
                        hi = mid - 1
            return -1
      `,
      tests: code`
        def test_found_right_half():
            assert search_rotated([4, 5, 6, 7, 0, 1, 2], 0) == 4


        def test_found_left_half():
            assert search_rotated([4, 5, 6, 7, 0, 1, 2], 5) == 1


        def test_missing():
            assert search_rotated([4, 5, 6, 7, 0, 1, 2], 3) == -1
      `,
    },
    r: {
      starter: code`
        search_rotated <- function(nums, target) {
          # your code here
          -1
        }
      `,
      solution: code`
        search_rotated <- function(nums, target) {
          lo <- 1
          hi <- length(nums)
          while (lo <= hi) {
            mid <- (lo + hi) %/% 2
            if (nums[mid] == target) return(mid)
            if (nums[lo] <= nums[mid]) {
              if (nums[lo] <= target && target < nums[mid]) hi <- mid - 1 else lo <- mid + 1
            } else {
              if (nums[mid] < target && target <= nums[hi]) lo <- mid + 1 else hi <- mid - 1
            }
          }
          -1
        }
      `,
      tests: code`
        test_that("found in the right half", {
          expect_equal(search_rotated(c(4, 5, 6, 7, 0, 1, 2), 0), 5)
        })

        test_that("found in the left half", {
          expect_equal(search_rotated(c(4, 5, 6, 7, 0, 1, 2), 5), 2)
        })
      `,
    },
    complexity: "O(log n) time, O(1) space",
    eli5: "Cut the list in half. One half is always in order, so you can tell at a glance whether the number could be in it. Keep only the half that could hold it.",
  },
  {
    kind: "code",
    id: "code-subsets",
    title: "All subsets",
    pattern: "Backtracking",
    difficulty: "intermediate",
    topicIds: ["w04-d04-binary-search-backtracking"],
    prompt: "Given distinct numbers, return every subset. Sort each subset ascending and order subsets by size, then lexicographically.",
    hints: ["For each number, branch into 'take it' and 'leave it'.", "Sort the final list with a key of (size, values)."],
    examples: [{ input: "[1, 2, 3]", output: "[[], [1], [2], [3], [1, 2], [1, 3], [2, 3], [1, 2, 3]]" }],
    python: {
      starter: code`
        def subsets(nums):
            # your code here
            return [[]]
      `,
      solution: code`
        def subsets(nums):
            nums = sorted(nums)
            out = []

            def backtrack(start, path):
                out.append(path[:])
                for i in range(start, len(nums)):
                    path.append(nums[i])
                    backtrack(i + 1, path)
                    path.pop()

            backtrack(0, [])
            return sorted(out, key=lambda s: (len(s), s))
      `,
      tests: code`
        def test_three():
            assert subsets([3, 1, 2]) == [[], [1], [2], [3], [1, 2], [1, 3], [2, 3], [1, 2, 3]]


        def test_count():
            assert len(subsets([1, 2, 3, 4, 5])) == 32
      `,
    },
    r: {
      starter: code`
        subsets <- function(nums) {
          # your code here
          list(numeric(0))
        }
      `,
      solution: code`
        subsets <- function(nums) {
          nums <- sort(nums)
          out <- list(numeric(0))
          for (size in seq_along(nums)) {
            combos <- combn(seq_along(nums), size, function(idx) nums[idx], simplify = FALSE)
            out <- c(out, combos)
          }
          out
        }
      `,
      tests: code`
        test_that("three numbers", {
          expect_equal(subsets(c(3, 1, 2)), list(numeric(0), 1, 2, 3, c(1, 2), c(1, 3), c(2, 3), c(1, 2, 3)))
        })

        test_that("count doubles with each number", {
          expect_length(subsets(1:5), 32)
        })
      `,
    },
    complexity: "O(n × 2ⁿ) time and space, because there are 2ⁿ subsets",
    eli5: "For every toy, decide 'in the box' or 'not in the box'. Trying every choice gives every possible box. R lets combn list all boxes of each size for us.",
  },
  {
    kind: "code",
    id: "code-validate-bst",
    title: "Is it a binary search tree?",
    pattern: "Tree recursion with bounds",
    difficulty: "intermediate",
    topicIds: ["w04-d01-trees-bst-tries"],
    prompt: "A binary tree is stored level by level in a list: the children of position i sit at 2i + 1 and 2i + 2 (0-based); missing nodes are None in Python and NA in R. Return true if every node is strictly greater than everything in its left subtree and strictly smaller than everything in its right subtree.",
    hints: ["Pass down the lowest and highest allowed values.", "Going left tightens the upper bound; going right tightens the lower bound."],
    examples: [
      { input: "[2, 1, 3]", output: "true" },
      { input: "[5, 1, 4, None, None, 3, 6]", output: "false (3 is in the right subtree of 5)" },
    ],
    python: {
      starter: code`
        def is_bst(tree):
            # your code here
            return True
      `,
      solution: code`
        def is_bst(tree):
            def check(i, low, high):
                if i >= len(tree) or tree[i] is None:
                    return True
                v = tree[i]
                if not (low < v < high):
                    return False
                return check(2 * i + 1, low, v) and check(2 * i + 2, v, high)

            return check(0, float("-inf"), float("inf"))
      `,
      tests: code`
        def test_valid():
            assert is_bst([2, 1, 3]) is True


        def test_deep_violation():
            assert is_bst([5, 1, 4, None, None, 3, 6]) is False


        def test_grandchild_violation():
            assert is_bst([10, 5, 15, None, None, 6, 20]) is False
      `,
    },
    r: {
      starter: code`
        is_bst <- function(tree) {
          # your code here
          TRUE
        }
      `,
      solution: code`
        is_bst <- function(tree) {
          check <- function(i, low, high) {
            if (i > length(tree) || is.na(tree[i])) return(TRUE)
            v <- tree[i]
            if (!(low < v && v < high)) return(FALSE)
            check(2 * i, low, v) && check(2 * i + 1, v, high)
          }
          check(1, -Inf, Inf)
        }
      `,
      tests: code`
        test_that("valid tree", {
          expect_true(is_bst(c(2, 1, 3)))
        })

        test_that("grandchild breaks the rule", {
          expect_false(is_bst(c(10, 5, 15, NA, NA, 6, 20)))
        })
      `,
    },
    complexity: "O(n) time, O(height) space for the recursion",
    eli5: "Every node gets a 'between these two numbers' rule from its parents. Going left lowers the ceiling, going right raises the floor. One node outside its rule breaks the tree.",
  },
  {
    kind: "code",
    id: "code-list-cycle",
    title: "Does the linked list loop?",
    pattern: "Fast and slow pointers (Floyd)",
    difficulty: "intermediate",
    topicIds: ["w03-d05-linked-lists"],
    prompt: "A linked list is stored as next pointers: next[i] is the position of the node after node i (0-based, None at the end, in Python; 1-based, NA at the end, in R). Starting from the first node, return true if the list loops. Use O(1) extra space.",
    hints: ["Move one pointer one step and another two steps at a time.", "If they ever meet, there is a loop."],
    examples: [
      { input: "next = [1, 2, 3, 1]", output: "true (3 points back to 1)" },
      { input: "next = [1, 2, None]", output: "false" },
    ],
    python: {
      starter: code`
        def has_cycle(next_of):
            # your code here
            return False
      `,
      solution: code`
        def has_cycle(next_of):
            def step(i):
                return None if i is None else next_of[i]

            slow = fast = 0 if next_of else None
            while fast is not None and step(fast) is not None:
                slow = step(slow)
                fast = step(step(fast))
                if slow == fast:
                    return True
            return False
      `,
      tests: code`
        def test_loop():
            assert has_cycle([1, 2, 3, 1]) is True


        def test_no_loop():
            assert has_cycle([1, 2, None]) is False


        def test_self_loop():
            assert has_cycle([0]) is True
      `,
    },
    r: {
      starter: code`
        has_cycle <- function(next_of) {
          # your code here
          FALSE
        }
      `,
      solution: code`
        has_cycle <- function(next_of) {
          step <- function(i) if (is.na(i)) NA else next_of[i]
          if (length(next_of) == 0) return(FALSE)
          slow <- 1
          fast <- 1
          while (!is.na(fast) && !is.na(step(fast))) {
            slow <- step(slow)
            fast <- step(step(fast))
            if (!is.na(fast) && slow == fast) return(TRUE)
          }
          FALSE
        }
      `,
      tests: code`
        test_that("loop", {
          expect_true(has_cycle(c(2, 3, 4, 2)))
        })

        test_that("no loop", {
          expect_false(has_cycle(c(2, 3, NA)))
        })

        test_that("self loop", {
          expect_true(has_cycle(1))
        })
      `,
    },
    complexity: "O(n) time, O(1) space",
    eli5: "A tortoise and a hare run along the list. If the track is a loop, the fast hare eventually laps the tortoise and they meet. If the track ends, the hare falls off the end first.",
  },
  {
    kind: "code",
    id: "code-flatten",
    title: "Flatten nested lists",
    pattern: "Recursion",
    difficulty: "beginner",
    topicIds: ["w01-d02-recursion-call-stack"],
    prompt: "Given a list whose items are numbers or further lists (nested to any depth), return all the numbers in order as one flat list.",
    hints: ["If an item is a list, flatten it and add its numbers; otherwise add the number itself."],
    examples: [{ input: "[1, [2, [3, 4]], 5, []]", output: "[1, 2, 3, 4, 5]" }],
    python: {
      starter: code`
        def flatten(items):
            # your code here
            return [x for x in items if not isinstance(x, list)]
      `,
      solution: code`
        def flatten(items):
            out = []
            for x in items:
                if isinstance(x, list):
                    out.extend(flatten(x))
                else:
                    out.append(x)
            return out
      `,
      tests: code`
        def test_nested():
            assert flatten([1, [2, [3, 4]], 5, []]) == [1, 2, 3, 4, 5]


        def test_deep():
            assert flatten([[[[7]]]]) == [7]


        def test_empty():
            assert flatten([]) == []
      `,
    },
    r: {
      starter: code`
        flatten <- function(items) {
          # your code here
          numeric(0)
        }
      `,
      solution: code`
        flatten <- function(items) {
          out <- numeric(0)
          for (x in items) {
            out <- c(out, if (is.list(x)) flatten(x) else x)
          }
          out
        }
      `,
      tests: code`
        test_that("nested", {
          expect_equal(flatten(list(1, list(2, list(3, 4)), 5, list())), c(1, 2, 3, 4, 5))
        })

        test_that("deep", {
          expect_equal(flatten(list(list(list(list(7))))), 7)
        })
      `,
    },
    complexity: "O(total items) time, O(depth) recursion stack",
    eli5: "Open each box. If you find a smaller box inside, open that the same way. Every toy you find goes into one long line.",
  },
  {
    kind: "code",
    id: "code-sessionize",
    title: "Sessionize clickstream events",
    pattern: "Single pass with a gap rule",
    difficulty: "intermediate",
    topicIds: ["w01-d04-dataframe-wrangling", "w06-d02-metrics-funnels"],
    prompt: "Given one user's event times in minutes (sorted) and an inactivity gap, start a new session whenever the time since the previous event is greater than the gap. Return the number of events in each session.",
    hints: ["Compare each event with the one before it.", "A gap of exactly the limit stays in the same session."],
    examples: [{ input: "times = [0, 5, 20, 70, 75, 200], gap = 30", output: "[3, 2, 1]" }],
    python: {
      starter: code`
        def session_sizes(times, gap):
            # your code here
            return [len(times)]
      `,
      solution: code`
        def session_sizes(times, gap):
            sizes = []
            for i, t in enumerate(times):
                if i == 0 or t - times[i - 1] > gap:
                    sizes.append(1)
                else:
                    sizes[-1] += 1
            return sizes
      `,
      tests: code`
        def test_basic():
            assert session_sizes([0, 5, 20, 70, 75, 200], 30) == [3, 2, 1]


        def test_exact_gap_stays():
            assert session_sizes([0, 30, 60], 30) == [3]


        def test_empty():
            assert session_sizes([], 30) == []
      `,
    },
    r: {
      starter: code`
        session_sizes <- function(times, gap) {
          # your code here
          length(times)
        }
      `,
      solution: code`
        session_sizes <- function(times, gap) {
          if (length(times) == 0) return(integer(0))
          new_session <- c(TRUE, diff(times) > gap)
          as.integer(table(cumsum(new_session)))
        }
      `,
      tests: code`
        test_that("basic", {
          expect_equal(session_sizes(c(0, 5, 20, 70, 75, 200), 30), c(3, 2, 1))
        })

        test_that("an exact gap stays in the session", {
          expect_equal(session_sizes(c(0, 30, 60), 30), 3)
        })
      `,
    },
    complexity: "O(n) time, O(number of sessions) space",
    eli5: "Read the clicks in time order. If someone was away longer than the gap, start a new visit; otherwise add the click to the current visit. R marks each new visit and counts with a running tally.",
  },
  {
    kind: "code",
    id: "code-dedupe-latest",
    title: "Keep the latest record per id",
    pattern: "Group by key, keep the max timestamp",
    difficulty: "beginner",
    topicIds: ["w01-d04-dataframe-wrangling", "w06-d01-data-quality-eda"],
    prompt: "Records are (id, timestamp, value). Keep only the record with the latest timestamp for each id; if two share the latest timestamp, keep the one that appears later. Return (id, value) pairs sorted by id. In R, take a data frame with columns id, ts and value and return a data frame with id and value.",
    hints: ["Walk the records and replace the stored one when the timestamp is greater than or equal to it."],
    examples: [{ input: "[(2, 5, 'b'), (1, 3, 'a'), (2, 9, 'c'), (1, 3, 'z')]", output: "[(1, 'z'), (2, 'c')]" }],
    python: {
      starter: code`
        def latest_per_id(records):
            # your code here
            return sorted((r[0], r[2]) for r in records)
      `,
      solution: code`
        def latest_per_id(records):
            best = {}
            for rid, ts, value in records:
                if rid not in best or ts >= best[rid][0]:
                    best[rid] = (ts, value)
            return [(rid, best[rid][1]) for rid in sorted(best)]
      `,
      tests: code`
        def test_basic():
            assert latest_per_id([(2, 5, "b"), (1, 3, "a"), (2, 9, "c"), (1, 3, "z")]) == [(1, "z"), (2, "c")]


        def test_out_of_order():
            assert latest_per_id([(7, 9, "new"), (7, 1, "old")]) == [(7, "new")]
      `,
    },
    r: {
      starter: code`
        latest_per_id <- function(df) {
          # your code here
          df[order(df$id), c("id", "value")]
        }
      `,
      solution: code`
        latest_per_id <- function(df) {
          df$row <- seq_len(nrow(df))
          ordered <- df[order(df$id, -df$ts, -df$row), ]
          keep <- ordered[!duplicated(ordered$id), c("id", "value")]
          rownames(keep) <- NULL
          keep
        }
      `,
      tests: code`
        test_that("basic", {
          res <- latest_per_id(data.frame(id = c(2, 1, 2, 1), ts = c(5, 3, 9, 3), value = c("b", "a", "c", "z")))
          expect_equal(res$id, c(1, 2))
          expect_equal(res$value, c("z", "c"))
        })

        test_that("out of order input", {
          res <- latest_per_id(data.frame(id = c(7, 7), ts = c(9, 1), value = c("new", "old")))
          expect_equal(res$value, "new")
        })
      `,
    },
    complexity: "O(n) time with a dictionary (Python); O(n log n) with sorting (R)",
    eli5: "Keep one card per id. Whenever a newer card for the same id shows up, swap it in. At the end, sort the cards by id.",
  },
  {
    kind: "code",
    id: "code-moving-average",
    title: "Trailing moving average",
    pattern: "Running window sum",
    difficulty: "beginner",
    topicIds: ["w01-d04-dataframe-wrangling", "w08-d02-anomaly-forecasting"],
    prompt: "Return the average of every window of k consecutive values, in order, using a running sum rather than re-adding each window.",
    hints: ["Add the value entering the window and subtract the value leaving it."],
    examples: [{ input: "values = [1, 2, 3, 4, 5], k = 2", output: "[1.5, 2.5, 3.5, 4.5]" }],
    python: {
      starter: code`
        def moving_average(values, k):
            # your code here
            return values[k - 1:]
      `,
      solution: code`
        def moving_average(values, k):
            out, total = [], 0.0
            for i, x in enumerate(values):
                total += x
                if i >= k:
                    total -= values[i - k]
                if i >= k - 1:
                    out.append(total / k)
            return out
      `,
      tests: code`
        def test_basic():
            assert moving_average([1, 2, 3, 4, 5], 2) == [1.5, 2.5, 3.5, 4.5]


        def test_k_three():
            assert moving_average([3, 3, 6, 0], 3) == [4.0, 3.0]


        def test_window_too_big():
            assert moving_average([1, 2], 3) == []
      `,
    },
    r: {
      starter: code`
        moving_average <- function(values, k) {
          # your code here
          values[k:length(values)]
        }
      `,
      solution: code`
        moving_average <- function(values, k) {
          n <- length(values)
          if (n < k) return(numeric(0))
          sums <- cumsum(values)
          window <- sums[k:n] - c(0, sums[seq_len(n - k)])
          window / k
        }
      `,
      tests: code`
        test_that("basic", {
          expect_equal(moving_average(c(1, 2, 3, 4, 5), 2), c(1.5, 2.5, 3.5, 4.5))
        })

        test_that("window too big", {
          expect_length(moving_average(c(1, 2), 3), 0)
        })
      `,
    },
    complexity: "O(n) time, O(1) extra space besides the output",
    eli5: "Slide a frame along the numbers. Each step, one number comes in and one goes out, so you only fix the total instead of adding the whole frame again.",
  },
  {
    kind: "code",
    id: "code-top-n-per-group",
    title: "Top 2 items per group",
    pattern: "Sort then take per group",
    difficulty: "intermediate",
    topicIds: ["w01-d04-dataframe-wrangling", "w02-d02-window-functions"],
    prompt: "Rows are (group, item, score). For each group (in alphabetical order), return its top 2 items by score, highest first, breaking ties by item name. In R, take and return a data frame with columns group, item and score.",
    hints: ["Sort by group, then score descending, then item.", "Count rows per group as you go and keep the first two."],
    examples: [{ input: "[('a', 'x', 5), ('a', 'y', 9), ('a', 'z', 9), ('b', 'p', 1)]", output: "[('a', 'y'), ('a', 'z'), ('b', 'p')]" }],
    python: {
      starter: code`
        def top_two_per_group(rows):
            # your code here
            return [(g, i) for g, i, _ in rows[:2]]
      `,
      solution: code`
        def top_two_per_group(rows):
            out, taken = [], {}
            for g, item, _ in sorted(rows, key=lambda r: (r[0], -r[2], r[1])):
                if taken.get(g, 0) < 2:
                    out.append((g, item))
                    taken[g] = taken.get(g, 0) + 1
            return out
      `,
      tests: code`
        def test_basic():
            rows = [("a", "x", 5), ("a", "y", 9), ("a", "z", 9), ("b", "p", 1)]
            assert top_two_per_group(rows) == [("a", "y"), ("a", "z"), ("b", "p")]


        def test_groups_sorted():
            rows = [("b", "q", 3), ("a", "m", 1), ("b", "r", 4), ("b", "s", 2)]
            assert top_two_per_group(rows) == [("a", "m"), ("b", "r"), ("b", "q")]
      `,
    },
    r: {
      starter: code`
        top_two_per_group <- function(df) {
          # your code here
          head(df, 2)
        }
      `,
      solution: code`
        top_two_per_group <- function(df) {
          ordered <- df[order(df$group, -df$score, df$item), ]
          rank_in_group <- ave(seq_len(nrow(ordered)), ordered$group, FUN = seq_along)
          out <- ordered[rank_in_group <= 2, ]
          rownames(out) <- NULL
          out
        }
      `,
      tests: code`
        test_that("basic", {
          df <- data.frame(group = c("a", "a", "a", "b"), item = c("x", "y", "z", "p"), score = c(5, 9, 9, 1))
          res <- top_two_per_group(df)
          expect_equal(res$item, c("y", "z", "p"))
        })

        test_that("groups come out in order", {
          df <- data.frame(group = c("b", "a", "b", "b"), item = c("q", "m", "r", "s"), score = c(3, 1, 4, 2))
          expect_equal(top_two_per_group(df)$item, c("m", "r", "q"))
        })
      `,
    },
    complexity: "O(n log n) time for the sort, O(n) space",
    eli5: "Line everyone up by team, best score first. Then walk the line and let only the first two from each team through.",
  },
];
