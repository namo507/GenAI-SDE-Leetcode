import type { DrillInput } from "@/lib/content-types";
import { code } from "./helpers";

/** Coding problems, part 1: arrays and hashing, two pointers, sliding windows, intervals, stacks and heaps. */
export const codingA: DrillInput[] = [
  {
    kind: "code",
    id: "code-two-sum",
    title: "Two sum",
    pattern: "Hash map",
    difficulty: "beginner",
    topicIds: ["w03-d01-hashing-patterns"],
    prompt: "Given a list of numbers and a target, return the positions of the two numbers that add up to the target (0-based in Python, 1-based in R). Exactly one answer exists; return the smaller position first.",
    hints: ["For each number, the partner you need is target minus that number.", "Remember every number you have already seen and where it was."],
    examples: [
      { input: "nums = [2, 7, 11, 15], target = 9", output: "[0, 1] in Python, c(1, 2) in R" },
      { input: "nums = [3, 2, 4], target = 6", output: "[1, 2] in Python, c(2, 3) in R" },
    ],
    python: {
      starter: code`
        def two_sum(nums, target):
            # your code here
            return []
      `,
      solution: code`
        def two_sum(nums, target):
            seen = {}
            for i, x in enumerate(nums):
                if target - x in seen:
                    return [seen[target - x], i]
                seen[x] = i
            return []
      `,
      tests: code`
        def test_basic():
            assert two_sum([2, 7, 11, 15], 9) == [0, 1]


        def test_middle():
            assert two_sum([3, 2, 4], 6) == [1, 2]


        def test_same_value_twice():
            assert two_sum([3, 3], 6) == [0, 1]
      `,
    },
    r: {
      starter: code`
        two_sum <- function(nums, target) {
          # your code here
          integer(0)
        }
      `,
      solution: code`
        two_sum <- function(nums, target) {
          seen <- new.env()
          for (i in seq_along(nums)) {
            need <- as.character(target - nums[i])
            if (!is.null(seen[[need]])) return(c(seen[[need]], i))
            seen[[as.character(nums[i])]] <- i
          }
          integer(0)
        }
      `,
      tests: code`
        test_that("basic", {
          expect_equal(two_sum(c(2, 7, 11, 15), 9), c(1, 2))
        })

        test_that("same value twice", {
          expect_equal(two_sum(c(3, 3), 6), c(1, 2))
        })
      `,
    },
    complexity: "O(n) time, O(n) space",
    eli5: "Walk down the line of numbers with a notebook. For each number, check the notebook for its missing partner. If it is there, you are done; if not, write this number down and keep walking.",
  },
  {
    kind: "code",
    id: "code-nearby-duplicate",
    title: "Duplicate within k steps",
    pattern: "Hash map with last index",
    difficulty: "beginner",
    topicIds: ["w03-d01-hashing-patterns"],
    prompt: "Return true if the list contains two equal values whose positions are at most k apart.",
    hints: ["Store the last position where each value appeared."],
    examples: [
      { input: "nums = [1, 2, 3, 1], k = 3", output: "true" },
      { input: "nums = [1, 2, 3, 1, 2, 3], k = 2", output: "false" },
    ],
    python: {
      starter: code`
        def nearby_duplicate(nums, k):
            # your code here
            return False
      `,
      solution: code`
        def nearby_duplicate(nums, k):
            last = {}
            for i, x in enumerate(nums):
                if x in last and i - last[x] <= k:
                    return True
                last[x] = i
            return False
      `,
      tests: code`
        def test_found():
            assert nearby_duplicate([1, 2, 3, 1], 3) is True


        def test_too_far():
            assert nearby_duplicate([1, 2, 3, 1, 2, 3], 2) is False


        def test_adjacent():
            assert nearby_duplicate([1, 0, 1, 1], 1) is True
      `,
    },
    r: {
      starter: code`
        nearby_duplicate <- function(nums, k) {
          # your code here
          FALSE
        }
      `,
      solution: code`
        nearby_duplicate <- function(nums, k) {
          last <- new.env()
          for (i in seq_along(nums)) {
            key <- as.character(nums[i])
            if (!is.null(last[[key]]) && i - last[[key]] <= k) return(TRUE)
            last[[key]] <- i
          }
          FALSE
        }
      `,
      tests: code`
        test_that("found within k", {
          expect_true(nearby_duplicate(c(1, 2, 3, 1), 3))
        })

        test_that("too far apart", {
          expect_false(nearby_duplicate(c(1, 2, 3, 1, 2, 3), 2))
        })

        test_that("adjacent pair", {
          expect_true(nearby_duplicate(c(1, 0, 1, 1), 1))
        })
      `,
    },
    complexity: "O(n) time, O(n) space",
    eli5: "Keep a sticker book saying where you last saw each number. When a number shows up again, check whether its last sticker is close enough.",
  },
  {
    kind: "code",
    id: "code-top-k-frequent",
    title: "Top k frequent values",
    pattern: "Counting and sorting",
    difficulty: "intermediate",
    topicIds: ["w03-d01-hashing-patterns", "w04-d01-stacks-queues-heaps"],
    prompt: "Return the k most frequent values, most frequent first. Break ties by the smaller value first.",
    hints: ["Count each value first.", "Sort by (minus count, value) so ties are deterministic."],
    examples: [{ input: "nums = [1, 1, 1, 2, 2, 3], k = 2", output: "[1, 2]" }],
    python: {
      starter: code`
        def top_k_frequent(nums, k):
            # your code here
            return nums[:k]
      `,
      solution: code`
        from collections import Counter


        def top_k_frequent(nums, k):
            counts = Counter(nums)
            return [v for v, _ in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:k]]
      `,
      tests: code`
        def test_basic():
            assert top_k_frequent([1, 1, 1, 2, 2, 3], 2) == [1, 2]


        def test_ties_by_value():
            assert top_k_frequent([4, 4, 2, 2, 9], 2) == [2, 4]


        def test_single():
            assert top_k_frequent([5], 1) == [5]
      `,
    },
    r: {
      starter: code`
        top_k_frequent <- function(nums, k) {
          # your code here
          nums[seq_len(k)]
        }
      `,
      solution: code`
        top_k_frequent <- function(nums, k) {
          counts <- table(nums)
          values <- as.numeric(names(counts))
          ord <- order(-as.integer(counts), values)
          values[ord][seq_len(k)]
        }
      `,
      tests: code`
        test_that("basic", {
          expect_equal(top_k_frequent(c(1, 1, 1, 2, 2, 3), 2), c(1, 2))
        })

        test_that("ties go to the smaller value", {
          expect_equal(top_k_frequent(c(4, 4, 2, 2, 9), 2), c(2, 4))
        })
      `,
    },
    complexity: "O(n + u log u) time for u distinct values; O(u) space. A size-k heap gives O(n log k).",
    eli5: "Make a tally for every number, then line the tallies up from biggest to smallest and take the first k. If two tallies are equal, the smaller number goes first.",
  },
  {
    kind: "code",
    id: "code-product-except-self",
    title: "Product of everything except me",
    pattern: "Prefix and suffix products",
    difficulty: "intermediate",
    topicIds: ["w03-d03-prefix-sums-intervals"],
    prompt: "Return a list where each position holds the product of all other numbers. Do not use division.",
    hints: ["The answer at i is (product of everything left of i) times (product of everything right of i).", "Build the left products in one pass and multiply by right products in a second pass."],
    examples: [
      { input: "[1, 2, 3, 4]", output: "[24, 12, 8, 6]" },
      { input: "[2, 0, 3]", output: "[0, 6, 0]" },
    ],
    python: {
      starter: code`
        def product_except_self(nums):
            # your code here
            return [0] * len(nums)
      `,
      solution: code`
        def product_except_self(nums):
            out = [1] * len(nums)
            left = 1
            for i in range(len(nums)):
                out[i] = left
                left *= nums[i]
            right = 1
            for i in range(len(nums) - 1, -1, -1):
                out[i] *= right
                right *= nums[i]
            return out
      `,
      tests: code`
        def test_basic():
            assert product_except_self([1, 2, 3, 4]) == [24, 12, 8, 6]


        def test_zero():
            assert product_except_self([2, 0, 3]) == [0, 6, 0]


        def test_two_values():
            assert product_except_self([5, 7]) == [7, 5]
      `,
    },
    r: {
      starter: code`
        product_except_self <- function(nums) {
          # your code here
          numeric(length(nums))
        }
      `,
      solution: code`
        product_except_self <- function(nums) {
          n <- length(nums)
          out <- rep(1, n)
          left <- 1
          for (i in seq_len(n)) {
            out[i] <- left
            left <- left * nums[i]
          }
          right <- 1
          for (i in rev(seq_len(n))) {
            out[i] <- out[i] * right
            right <- right * nums[i]
          }
          out
        }
      `,
      tests: code`
        test_that("basic", {
          expect_equal(product_except_self(c(1, 2, 3, 4)), c(24, 12, 8, 6))
        })

        test_that("a zero", {
          expect_equal(product_except_self(c(2, 0, 3)), c(0, 6, 0))
        })
      `,
    },
    complexity: "O(n) time, O(1) extra space besides the output",
    eli5: "Walk left to right writing down 'everything before me multiplied together', then walk right to left multiplying in 'everything after me'. Each spot ends up with everyone but itself.",
  },
  {
    kind: "code",
    id: "code-longest-consecutive",
    title: "Longest run of consecutive numbers",
    pattern: "Hash set",
    difficulty: "intermediate",
    topicIds: ["w03-d01-hashing-patterns"],
    prompt: "Given unsorted integers, return the length of the longest run of consecutive values (like 1, 2, 3, 4) in O(n) time.",
    hints: ["Put everything in a set.", "Only start counting from numbers whose predecessor is missing."],
    examples: [{ input: "[100, 4, 200, 1, 3, 2]", output: "4 (the run 1, 2, 3, 4)" }],
    python: {
      starter: code`
        def longest_consecutive(nums):
            # your code here
            return 1
      `,
      solution: code`
        def longest_consecutive(nums):
            values = set(nums)
            best = 0
            for x in values:
                if x - 1 not in values:
                    length = 1
                    while x + length in values:
                        length += 1
                    best = max(best, length)
            return best
      `,
      tests: code`
        def test_basic():
            assert longest_consecutive([100, 4, 200, 1, 3, 2]) == 4


        def test_duplicates():
            assert longest_consecutive([0, 3, 7, 2, 5, 8, 4, 6, 0, 1]) == 9


        def test_empty():
            assert longest_consecutive([]) == 0
      `,
    },
    r: {
      starter: code`
        longest_consecutive <- function(nums) {
          # your code here
          1
        }
      `,
      solution: code`
        longest_consecutive <- function(nums) {
          values <- unique(nums)
          best <- 0
          for (x in values) {
            if (!((x - 1) %in% values)) {
              len <- 1
              while ((x + len) %in% values) len <- len + 1
              best <- max(best, len)
            }
          }
          best
        }
      `,
      tests: code`
        test_that("basic", {
          expect_equal(longest_consecutive(c(100, 4, 200, 1, 3, 2)), 4)
        })

        test_that("empty input", {
          expect_equal(longest_consecutive(numeric(0)), 0)
        })
      `,
    },
    complexity: "O(n) expected time with a hash set (each run is walked once from its start); O(n) space. The R version uses %in% on a vector for clarity, which is O(n) per lookup; use an environment for true O(1) lookups.",
    eli5: "Put every number in a bag. Only start counting at a number whose smaller neighbor is not in the bag, then count up while the next number is there.",
  },
  {
    kind: "code",
    id: "code-valid-palindrome",
    title: "Valid palindrome",
    pattern: "Two pointers",
    difficulty: "beginner",
    topicIds: ["w03-d02-sliding-window"],
    prompt: "Return true if the text reads the same forwards and backwards after lowercasing and keeping only letters and digits.",
    hints: ["Use one pointer at each end and move them toward each other, skipping other characters."],
    examples: [
      { input: '"A man, a plan, a canal: Panama"', output: "true" },
      { input: '"race a car"', output: "false" },
    ],
    python: {
      starter: code`
        def is_palindrome(text):
            # your code here
            return False
      `,
      solution: code`
        def is_palindrome(text):
            chars = [c for c in text.lower() if c.isalnum()]
            i, j = 0, len(chars) - 1
            while i < j:
                if chars[i] != chars[j]:
                    return False
                i, j = i + 1, j - 1
            return True
      `,
      tests: code`
        def test_sentence():
            assert is_palindrome("A man, a plan, a canal: Panama") is True


        def test_not():
            assert is_palindrome("race a car") is False


        def test_empty():
            assert is_palindrome(" ") is True
      `,
    },
    r: {
      starter: code`
        is_palindrome <- function(text) {
          # your code here
          FALSE
        }
      `,
      solution: code`
        is_palindrome <- function(text) {
          chars <- strsplit(gsub("[^a-z0-9]", "", tolower(text)), "")[[1]]
          i <- 1
          j <- length(chars)
          while (i < j) {
            if (chars[i] != chars[j]) return(FALSE)
            i <- i + 1
            j <- j - 1
          }
          TRUE
        }
      `,
      tests: code`
        test_that("sentence", {
          expect_true(is_palindrome("A man, a plan, a canal: Panama"))
        })

        test_that("not a palindrome", {
          expect_false(is_palindrome("race a car"))
        })

        test_that("blank text", {
          expect_true(is_palindrome(" "))
        })
      `,
    },
    complexity: "O(n) time, O(n) space for the cleaned characters (O(1) if you skip in place)",
    eli5: "One finger at the start, one at the end. If the letters under your fingers match, slide both fingers inward. One mismatch and it is not a palindrome.",
  },
  {
    kind: "code",
    id: "code-container-water",
    title: "Container with most water",
    pattern: "Two pointers",
    difficulty: "intermediate",
    topicIds: ["w03-d02-sliding-window"],
    prompt: "Given wall heights, pick two walls that, with the x-axis, hold the most water. Return that area (width times the shorter wall).",
    hints: ["Start with the widest pair.", "Moving the taller wall inward can never help, so always move the shorter one."],
    examples: [{ input: "[1, 8, 6, 2, 5, 4, 8, 3, 7]", output: "49" }],
    python: {
      starter: code`
        def max_area(heights):
            # your code here
            return 0
      `,
      solution: code`
        def max_area(heights):
            i, j, best = 0, len(heights) - 1, 0
            while i < j:
                best = max(best, (j - i) * min(heights[i], heights[j]))
                if heights[i] < heights[j]:
                    i += 1
                else:
                    j -= 1
            return best
      `,
      tests: code`
        def test_basic():
            assert max_area([1, 8, 6, 2, 5, 4, 8, 3, 7]) == 49


        def test_two_walls():
            assert max_area([1, 1]) == 1


        def test_tall_ends():
            assert max_area([5, 1, 1, 1, 5]) == 20
      `,
    },
    r: {
      starter: code`
        max_area <- function(heights) {
          # your code here
          0
        }
      `,
      solution: code`
        max_area <- function(heights) {
          i <- 1
          j <- length(heights)
          best <- 0
          while (i < j) {
            best <- max(best, (j - i) * min(heights[i], heights[j]))
            if (heights[i] < heights[j]) i <- i + 1 else j <- j - 1
          }
          best
        }
      `,
      tests: code`
        test_that("basic", {
          expect_equal(max_area(c(1, 8, 6, 2, 5, 4, 8, 3, 7)), 49)
        })

        test_that("tall ends", {
          expect_equal(max_area(c(5, 1, 1, 1, 5)), 20)
        })
      `,
    },
    complexity: "O(n) time, O(1) space",
    eli5: "Start with the two walls furthest apart. The short wall limits the water, so step past the short wall hoping for a taller one, and remember the biggest pool you saw.",
  },
  {
    kind: "code",
    id: "code-three-sum",
    title: "Three numbers that sum to zero",
    pattern: "Sort plus two pointers",
    difficulty: "intermediate",
    topicIds: ["w03-d02-sliding-window", "w03-d04-sorting-algorithms"],
    prompt: "Return every unique triplet of values that sums to 0. Sort each triplet ascending and the list of triplets ascending.",
    hints: ["Sort first.", "Fix one number, then use two pointers on the rest.", "Skip equal neighbors to avoid duplicates."],
    examples: [{ input: "[-1, 0, 1, 2, -1, -4]", output: "[[-1, -1, 2], [-1, 0, 1]]" }],
    python: {
      starter: code`
        def three_sum(nums):
            # your code here
            return []
      `,
      solution: code`
        def three_sum(nums):
            nums = sorted(nums)
            out = []
            for i in range(len(nums) - 2):
                if i > 0 and nums[i] == nums[i - 1]:
                    continue
                lo, hi = i + 1, len(nums) - 1
                while lo < hi:
                    s = nums[i] + nums[lo] + nums[hi]
                    if s < 0:
                        lo += 1
                    elif s > 0:
                        hi -= 1
                    else:
                        out.append([nums[i], nums[lo], nums[hi]])
                        lo += 1
                        while lo < hi and nums[lo] == nums[lo - 1]:
                            lo += 1
                        hi -= 1
            return out
      `,
      tests: code`
        def test_basic():
            assert three_sum([-1, 0, 1, 2, -1, -4]) == [[-1, -1, 2], [-1, 0, 1]]


        def test_zeros():
            assert three_sum([0, 0, 0, 0]) == [[0, 0, 0]]


        def test_none():
            assert three_sum([1, 2, 3]) == []
      `,
    },
    r: {
      starter: code`
        three_sum <- function(nums) {
          # your code here
          list()
        }
      `,
      solution: code`
        three_sum <- function(nums) {
          nums <- sort(nums)
          n <- length(nums)
          out <- list()
          if (n < 3) return(out)
          for (i in 1:(n - 2)) {
            if (i > 1 && nums[i] == nums[i - 1]) next
            lo <- i + 1
            hi <- n
            while (lo < hi) {
              s <- nums[i] + nums[lo] + nums[hi]
              if (s < 0) {
                lo <- lo + 1
              } else if (s > 0) {
                hi <- hi - 1
              } else {
                out[[length(out) + 1]] <- c(nums[i], nums[lo], nums[hi])
                lo <- lo + 1
                while (lo < hi && nums[lo] == nums[lo - 1]) lo <- lo + 1
                hi <- hi - 1
              }
            }
          }
          out
        }
      `,
      tests: code`
        test_that("basic", {
          expect_equal(three_sum(c(-1, 0, 1, 2, -1, -4)), list(c(-1, -1, 2), c(-1, 0, 1)))
        })

        test_that("all zeros", {
          expect_equal(three_sum(c(0, 0, 0, 0)), list(c(0, 0, 0)))
        })
      `,
    },
    complexity: "O(n²) time, O(1) extra space besides the output",
    eli5: "Line the numbers up from small to big. Hold one number, then squeeze two fingers from both ends of the rest: too small, move the left finger up; too big, move the right finger down.",
  },
  {
    kind: "code",
    id: "code-max-sum-window",
    title: "Largest sum of k neighbors",
    pattern: "Fixed sliding window",
    difficulty: "beginner",
    topicIds: ["w03-d02-sliding-window"],
    prompt: "Return the largest sum of any k consecutive numbers.",
    hints: ["Add the new number entering the window and subtract the one leaving."],
    examples: [{ input: "nums = [2, 1, 5, 1, 3, 2], k = 3", output: "9" }],
    python: {
      starter: code`
        def max_window_sum(nums, k):
            # your code here
            return sum(nums[:k])
      `,
      solution: code`
        def max_window_sum(nums, k):
            window = sum(nums[:k])
            best = window
            for i in range(k, len(nums)):
                window += nums[i] - nums[i - k]
                best = max(best, window)
            return best
      `,
      tests: code`
        def test_basic():
            assert max_window_sum([2, 1, 5, 1, 3, 2], 3) == 9


        def test_negatives():
            assert max_window_sum([-3, -1, -2, -5], 2) == -3


        def test_end():
            assert max_window_sum([1, 1, 1, 9, 9], 2) == 18
      `,
    },
    r: {
      starter: code`
        max_window_sum <- function(nums, k) {
          # your code here
          sum(nums[seq_len(k)])
        }
      `,
      solution: code`
        max_window_sum <- function(nums, k) {
          window <- sum(nums[seq_len(k)])
          best <- window
          if (length(nums) > k) {
            for (i in (k + 1):length(nums)) {
              window <- window + nums[i] - nums[i - k]
              best <- max(best, window)
            }
          }
          best
        }
      `,
      tests: code`
        test_that("basic", {
          expect_equal(max_window_sum(c(2, 1, 5, 1, 3, 2), 3), 9)
        })

        test_that("best window at the end", {
          expect_equal(max_window_sum(c(1, 1, 1, 9, 9), 2), 18)
        })
      `,
    },
    complexity: "O(n) time, O(1) space",
    eli5: "Look through a window k numbers wide. Each time it slides one step, add the number coming in and take away the number going out, instead of adding everything again.",
  },
  {
    kind: "code",
    id: "code-min-subarray-len",
    title: "Shortest run reaching a target",
    pattern: "Variable sliding window",
    difficulty: "intermediate",
    topicIds: ["w03-d02-sliding-window"],
    prompt: "Given positive numbers and a target, return the length of the shortest run of neighbors whose sum is at least the target, or 0 if none exists.",
    hints: ["Grow the window on the right until the sum is big enough, then shrink it from the left as far as possible."],
    examples: [{ input: "target = 7, nums = [2, 3, 1, 2, 4, 3]", output: "2 (the run 4, 3)" }],
    python: {
      starter: code`
        def min_subarray_len(target, nums):
            # your code here
            return len(nums)
      `,
      solution: code`
        def min_subarray_len(target, nums):
            best = len(nums) + 1
            total = left = 0
            for right, x in enumerate(nums):
                total += x
                while total >= target:
                    best = min(best, right - left + 1)
                    total -= nums[left]
                    left += 1
            return 0 if best > len(nums) else best
      `,
      tests: code`
        def test_basic():
            assert min_subarray_len(7, [2, 3, 1, 2, 4, 3]) == 2


        def test_single():
            assert min_subarray_len(4, [1, 4, 4]) == 1


        def test_impossible():
            assert min_subarray_len(11, [1, 1, 1, 1]) == 0
      `,
    },
    r: {
      starter: code`
        min_subarray_len <- function(target, nums) {
          # your code here
          length(nums)
        }
      `,
      solution: code`
        min_subarray_len <- function(target, nums) {
          best <- length(nums) + 1
          total <- 0
          left <- 1
          for (right in seq_along(nums)) {
            total <- total + nums[right]
            while (total >= target) {
              best <- min(best, right - left + 1)
              total <- total - nums[left]
              left <- left + 1
            }
          }
          if (best > length(nums)) 0 else best
        }
      `,
      tests: code`
        test_that("basic", {
          expect_equal(min_subarray_len(7, c(2, 3, 1, 2, 4, 3)), 2)
        })

        test_that("impossible", {
          expect_equal(min_subarray_len(11, c(1, 1, 1, 1)), 0)
        })
      `,
    },
    complexity: "O(n) time (each element enters and leaves once), O(1) space",
    eli5: "Stretch a rubber band to the right until it holds enough, then pull its left end in as far as you can while it still holds enough. Remember the shortest band.",
  },
  {
    kind: "code",
    id: "code-k-distinct",
    title: "Longest substring with at most k distinct letters",
    pattern: "Variable sliding window with counts",
    difficulty: "intermediate",
    topicIds: ["w03-d02-sliding-window"],
    prompt: "Return the length of the longest substring that contains at most k distinct characters.",
    hints: ["Keep a count of each letter in the window.", "When there are more than k kinds, shrink from the left until there are k again."],
    examples: [{ input: 's = "eceba", k = 2', output: '3 ("ece")' }],
    python: {
      starter: code`
        def longest_k_distinct(s, k):
            # your code here
            return k
      `,
      solution: code`
        def longest_k_distinct(s, k):
            counts = {}
            left = best = 0
            for right, ch in enumerate(s):
                counts[ch] = counts.get(ch, 0) + 1
                while len(counts) > k:
                    counts[s[left]] -= 1
                    if counts[s[left]] == 0:
                        del counts[s[left]]
                    left += 1
                best = max(best, right - left + 1)
            return best
      `,
      tests: code`
        def test_basic():
            assert longest_k_distinct("eceba", 2) == 3


        def test_repeat():
            assert longest_k_distinct("aa", 1) == 2


        def test_zero():
            assert longest_k_distinct("abc", 0) == 0
      `,
    },
    r: {
      starter: code`
        longest_k_distinct <- function(s, k) {
          # your code here
          k
        }
      `,
      solution: code`
        longest_k_distinct <- function(s, k) {
          chars <- strsplit(s, "")[[1]]
          counts <- integer(0)
          left <- 1
          best <- 0
          for (right in seq_along(chars)) {
            ch <- chars[right]
            counts[ch] <- if (is.na(counts[ch])) 1L else counts[[ch]] + 1L
            while (length(counts) > k) {
              out <- chars[left]
              counts[out] <- counts[[out]] - 1L
              if (counts[[out]] == 0) counts <- counts[names(counts) != out]
              left <- left + 1
            }
            best <- max(best, right - left + 1)
          }
          best
        }
      `,
      tests: code`
        test_that("basic", {
          expect_equal(longest_k_distinct("eceba", 2), 3)
        })

        test_that("k of zero", {
          expect_equal(longest_k_distinct("abc", 0), 0)
        })
      `,
    },
    complexity: "O(n) time, O(k) space",
    eli5: "Slide a window along the word and count the kinds of letters inside. Too many kinds? Push the left side forward until there are only k kinds again.",
  },
  {
    kind: "code",
    id: "code-meeting-rooms",
    title: "Meeting rooms needed",
    pattern: "Sweep line over sorted events",
    difficulty: "intermediate",
    topicIds: ["w03-d03-prefix-sums-intervals"],
    prompt: "Given meetings as (start, end) with end exclusive, return the minimum number of rooms so no two overlapping meetings share a room. In R, pass the starts and the ends as two vectors.",
    hints: ["Sort start times and end times separately.", "Walk the starts; free a room whenever the earliest end is at or before the current start."],
    examples: [{ input: "[(0, 30), (5, 10), (15, 20)]", output: "2" }],
    python: {
      starter: code`
        def min_rooms(meetings):
            # your code here
            return 1
      `,
      solution: code`
        def min_rooms(meetings):
            starts = sorted(s for s, _ in meetings)
            ends = sorted(e for _, e in meetings)
            rooms = best = j = 0
            for s in starts:
                while j < len(ends) and ends[j] <= s:
                    rooms -= 1
                    j += 1
                rooms += 1
                best = max(best, rooms)
            return best
      `,
      tests: code`
        def test_basic():
            assert min_rooms([(0, 30), (5, 10), (15, 20)]) == 2


        def test_back_to_back():
            assert min_rooms([(1, 5), (5, 8)]) == 1


        def test_all_overlap():
            assert min_rooms([(1, 10), (2, 9), (3, 8)]) == 3
      `,
    },
    r: {
      starter: code`
        min_rooms <- function(starts, ends) {
          # your code here
          1
        }
      `,
      solution: code`
        min_rooms <- function(starts, ends) {
          starts <- sort(starts)
          ends <- sort(ends)
          rooms <- 0
          best <- 0
          j <- 1
          for (s in starts) {
            while (j <= length(ends) && ends[j] <= s) {
              rooms <- rooms - 1
              j <- j + 1
            }
            rooms <- rooms + 1
            best <- max(best, rooms)
          }
          best
        }
      `,
      tests: code`
        test_that("basic", {
          expect_equal(min_rooms(c(0, 5, 15), c(30, 10, 20)), 2)
        })

        test_that("back to back meetings share a room", {
          expect_equal(min_rooms(c(1, 5), c(5, 8)), 1)
        })

        test_that("all overlap", {
          expect_equal(min_rooms(c(1, 2, 3), c(10, 9, 8)), 3)
        })
      `,
    },
    complexity: "O(n log n) time for sorting, O(n) space",
    eli5: "Read the day's schedule in time order. Every meeting that starts takes a room; every meeting that has ended gives one back. The busiest moment tells you how many rooms you need.",
  },
  {
    kind: "code",
    id: "code-range-sums",
    title: "Many range sums",
    pattern: "Prefix sums",
    difficulty: "beginner",
    topicIds: ["w03-d03-prefix-sums-intervals"],
    prompt: "Given numbers and a list of inclusive ranges (0-based in Python, 1-based in R), return the sum of each range. Each query should take O(1) after one pass of setup. In R, pass the range starts and ends as two vectors.",
    hints: ["prefix[i] holds the sum of the first i numbers.", "The sum from a to b is prefix[b + 1] minus prefix[a]."],
    examples: [{ input: "nums = [3, 1, 4, 1, 5], ranges = [(0, 2), (1, 3), (4, 4)]", output: "[8, 6, 5]" }],
    python: {
      starter: code`
        def range_sums(nums, ranges):
            # your code here
            return [0 for _ in ranges]
      `,
      solution: code`
        def range_sums(nums, ranges):
            prefix = [0]
            for x in nums:
                prefix.append(prefix[-1] + x)
            return [prefix[b + 1] - prefix[a] for a, b in ranges]
      `,
      tests: code`
        def test_basic():
            assert range_sums([3, 1, 4, 1, 5], [(0, 2), (1, 3), (4, 4)]) == [8, 6, 5]


        def test_whole():
            assert range_sums([1, 2, 3], [(0, 2)]) == [6]
      `,
    },
    r: {
      starter: code`
        range_sums <- function(nums, from, to) {
          # your code here
          rep(0, length(from))
        }
      `,
      solution: code`
        range_sums <- function(nums, from, to) {
          prefix <- c(0, cumsum(nums))
          prefix[to + 1] - prefix[from]
        }
      `,
      tests: code`
        test_that("basic", {
          expect_equal(range_sums(c(3, 1, 4, 1, 5), c(1, 2, 5), c(3, 4, 5)), c(8, 6, 5))
        })

        test_that("whole vector", {
          expect_equal(range_sums(c(1, 2, 3), 1, 3), 6)
        })
      `,
    },
    complexity: "O(n) setup, O(1) per query, O(n) space",
    eli5: "Write a running total under each number once. Then any stretch's total is just 'running total at the end minus running total before the start'.",
  },
  {
    kind: "code",
    id: "code-daily-temperatures",
    title: "Days until a warmer day",
    pattern: "Monotonic stack",
    difficulty: "intermediate",
    topicIds: ["w04-d01-stacks-queues-heaps"],
    prompt: "For each day, return how many days you wait for a warmer temperature, or 0 if it never comes.",
    hints: ["Keep a stack of days still waiting, with temperatures decreasing from bottom to top.", "A warmer day answers every cooler day on top of the stack."],
    examples: [{ input: "[73, 74, 75, 71, 69, 72, 76, 73]", output: "[1, 1, 4, 2, 1, 1, 0, 0]" }],
    python: {
      starter: code`
        def daily_temperatures(temps):
            # your code here
            return [0] * len(temps)
      `,
      solution: code`
        def daily_temperatures(temps):
            wait = [0] * len(temps)
            stack = []
            for i, t in enumerate(temps):
                while stack and temps[stack[-1]] < t:
                    j = stack.pop()
                    wait[j] = i - j
                stack.append(i)
            return wait
      `,
      tests: code`
        def test_basic():
            assert daily_temperatures([73, 74, 75, 71, 69, 72, 76, 73]) == [1, 1, 4, 2, 1, 1, 0, 0]


        def test_rising():
            assert daily_temperatures([30, 40, 50]) == [1, 1, 0]
      `,
    },
    r: {
      starter: code`
        daily_temperatures <- function(temps) {
          # your code here
          rep(0, length(temps))
        }
      `,
      solution: code`
        daily_temperatures <- function(temps) {
          wait <- rep(0, length(temps))
          stack <- integer(0)
          for (i in seq_along(temps)) {
            while (length(stack) > 0 && temps[stack[length(stack)]] < temps[i]) {
              j <- stack[length(stack)]
              stack <- stack[-length(stack)]
              wait[j] <- i - j
            }
            stack <- c(stack, i)
          }
          wait
        }
      `,
      tests: code`
        test_that("basic", {
          expect_equal(daily_temperatures(c(73, 74, 75, 71, 69, 72, 76, 73)), c(1, 1, 4, 2, 1, 1, 0, 0))
        })

        test_that("rising", {
          expect_equal(daily_temperatures(c(30, 40, 50)), c(1, 1, 0))
        })
      `,
    },
    complexity: "O(n) time (each day is pushed and popped once), O(n) space",
    eli5: "Days still waiting for warmth stand in a pile. When a warm day arrives, every cooler day on top of the pile gets its answer and leaves.",
  },
  {
    kind: "code",
    id: "code-kth-largest",
    title: "Kth largest value",
    pattern: "Min-heap of size k",
    difficulty: "beginner",
    topicIds: ["w04-d01-stacks-queues-heaps"],
    prompt: "Return the kth largest value in the list (counting duplicates).",
    hints: ["Keep only the k biggest values seen so far; the smallest of them is the answer.", "In Python, heapq keeps the smallest on top."],
    examples: [{ input: "nums = [3, 2, 1, 5, 6, 4], k = 2", output: "5" }],
    python: {
      starter: code`
        def kth_largest(nums, k):
            # your code here
            return max(nums)
      `,
      solution: code`
        import heapq


        def kth_largest(nums, k):
            heap = []
            for x in nums:
                heapq.heappush(heap, x)
                if len(heap) > k:
                    heapq.heappop(heap)
            return heap[0]
      `,
      tests: code`
        def test_basic():
            assert kth_largest([3, 2, 1, 5, 6, 4], 2) == 5


        def test_duplicates():
            assert kth_largest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4) == 4


        def test_k_one():
            assert kth_largest([7], 1) == 7
      `,
    },
    r: {
      starter: code`
        kth_largest <- function(nums, k) {
          # your code here
          max(nums)
        }
      `,
      solution: code`
        kth_largest <- function(nums, k) {
          sort(nums, decreasing = TRUE)[k]
        }
      `,
      tests: code`
        test_that("basic", {
          expect_equal(kth_largest(c(3, 2, 1, 5, 6, 4), 2), 5)
        })

        test_that("duplicates count", {
          expect_equal(kth_largest(c(3, 2, 3, 1, 2, 4, 5, 5, 6), 4), 4)
        })
      `,
    },
    complexity: "Heap: O(n log k) time, O(k) space. Sorting (the R version): O(n log n). Quickselect averages O(n).",
    eli5: "Keep a tiny pile of the k biggest numbers, with the smallest of them on top. When the pile overflows, throw the top one away. At the end, the top is your answer.",
  },
  {
    kind: "code",
    id: "code-window-max",
    title: "Maximum in every window",
    pattern: "Monotonic deque",
    difficulty: "advanced",
    topicIds: ["w04-d01-stacks-queues-heaps", "w03-d02-sliding-window"],
    prompt: "Return the maximum of every window of k consecutive numbers, in O(n) total time.",
    hints: ["Keep positions in a deque with values decreasing from front to back.", "Drop the front when it leaves the window; drop smaller values from the back when a bigger one arrives."],
    examples: [{ input: "nums = [1, 3, -1, -3, 5, 3, 6, 7], k = 3", output: "[3, 3, 5, 5, 6, 7]" }],
    python: {
      starter: code`
        def window_max(nums, k):
            # your code here
            return []
      `,
      solution: code`
        from collections import deque


        def window_max(nums, k):
            dq, out = deque(), []
            for i, x in enumerate(nums):
                while dq and dq[0] <= i - k:
                    dq.popleft()
                while dq and nums[dq[-1]] <= x:
                    dq.pop()
                dq.append(i)
                if i >= k - 1:
                    out.append(nums[dq[0]])
            return out
      `,
      tests: code`
        def test_basic():
            assert window_max([1, 3, -1, -3, 5, 3, 6, 7], 3) == [3, 3, 5, 5, 6, 7]


        def test_k_one():
            assert window_max([4, 2, 9], 1) == [4, 2, 9]


        def test_falling():
            assert window_max([9, 8, 7, 6], 2) == [9, 8, 7]
      `,
    },
    r: {
      starter: code`
        window_max <- function(nums, k) {
          # your code here
          numeric(0)
        }
      `,
      solution: code`
        window_max <- function(nums, k) {
          dq <- integer(0)
          out <- numeric(0)
          for (i in seq_along(nums)) {
            while (length(dq) > 0 && dq[1] <= i - k) dq <- dq[-1]
            while (length(dq) > 0 && nums[dq[length(dq)]] <= nums[i]) dq <- dq[-length(dq)]
            dq <- c(dq, i)
            if (i >= k) out <- c(out, nums[dq[1]])
          }
          out
        }
      `,
      tests: code`
        test_that("basic", {
          expect_equal(window_max(c(1, 3, -1, -3, 5, 3, 6, 7), 3), c(3, 3, 5, 5, 6, 7))
        })

        test_that("falling values", {
          expect_equal(window_max(c(9, 8, 7, 6), 2), c(9, 8, 7))
        })
      `,
    },
    complexity: "O(n) time (each index enters and leaves the deque once), O(k) space",
    eli5: "Keep a line of champions, strongest at the front. A new number knocks out every weaker number behind it, and the front champion leaves when it falls out of the window.",
  },
];
