import type { WalkthroughStepInput } from "@/lib/curriculum";

export const walkthroughs: Record<string, WalkthroughStepInput[]> = {
  "w01-d02-big-o-complexity": [
    { python: "def linear_steps", pythonLines: 7, r: "linear_steps", rLines: 8, eli5: "Linear search opens boxes in a row one at a time, counting every peek, until it finds the toy." },
    { python: "def binary_steps", pythonLines: 12, r: "binary_steps", rLines: 12, eli5: "Binary search needs boxes in number order. Peek in the middle: if the toy's number is bigger, forget the left half; if smaller, forget the right half. Every peek throws away half." },
    { python: "for n in", pythonLines: 3, r: "for (n in", rLines: 4, eli5: "Try rows of 10, 100, 1,000 and 10,000 boxes. One-by-one needs as many peeks as boxes; halving needs only 4, 7, 10 and 14." },
  ],
  "w01-d03-testing-reproducibility": [
    { python: "def bucket", pythonLines: 2, r: "bucket <", rLines: 4, eli5: "Turn a name into a bucket number from 0 to 99 by adding up its letters, each times its position. The same name always lands in the same bucket." },
    { python: "def split_ids", pythonLines: 2, r: "split_ids", rLines: 4, eli5: "Names in buckets below 20 go to the test pile and everyone else trains. No dice are rolled, so the piles never change between runs." },
    { python: "ids = [f", pythonLines: 5, r: "ids <- sprintf", rLines: 4, eli5: "Make ten user names, sort them into piles, and count how many landed in test: 2 of 10." },
  ],
  "w02-d01-joins-and-keys": [
    { python: "import sqlite3", pythonLines: 10, r: "customers", rLines: 6, eli5: "Two tables: four customers and six orders. One order points at customer 9, who does not exist." },
    { python: "print(f\"inner", pythonLines: 2, r: "inner <-", rLines: 4, eli5: "An inner join keeps only customers with matching orders (5 rows). A left join keeps every customer, even Margaret with no orders (6 rows)." },
    { python: "rows = con", pythonLines: 9, r: "per_customer", rLines: 13, eli5: "For each customer, count orders and add up the money, using 0 when there are none." },
    { python: "orphans =", pythonLines: 6, r: "orphans <", rLines: 2, eli5: "Find orders whose customer is missing. That one lonely order is an orphan." },
  ],
  "w02-d02-window-functions": [
    { python: "con.executescript", pythonLines: 6, r: "orders <", rLines: 5, eli5: "Six orders from three customers, each with a day and an amount." },
    { python: "WINDOWED", pythonLines: 8, r: "ranked <", rLines: 3, eli5: "For each customer separately, keep a running total in date order and rank orders from biggest to smallest. The rows stay; we just add two new columns." },
    { python: "for customer", pythonLines: 4, r: "for (i in", rLines: 4, eli5: "Print every order with its running total and its rank." },
    { python: "top = con", pythonLines: 2, r: "top <- ranked", rLines: 3, eli5: "Keep only rank 1 to get each customer's biggest order." },
  ],
  "w02-d03-scd2-dimensions": [
    { python: "def apply_scd2", pythonLines: 14, r: "apply_scd2", rLines: 18, eli5: "When a customer moves, we do not erase the old address. We close the old row with an end date and add a new row that starts today." },
    { python: "if row is", pythonLines: 2, r: "if (length", eli5: "If the city did not change, do nothing, so we do not make duplicate history." },
    { python: "def city_on", pythonLines: 5, r: "city_on <", rLines: 4, eli5: "To ask 'where did they live on this day?', find the row whose start and end dates surround that day." },
    { python: "dim = [", pythonLines: 7, r: "dim <- data", rLines: 9, eli5: "Start with two customers, apply the moves on 2026-03-01, and print the history rows." },
    { python: "print(f\"C1", pythonLines: 2, r: "cat(sprintf(\"C1", rLines: 2, eli5: "C1 lived in Austin in 2025 and in Denver after the move." },
  ],
  "w03-d02-sliding-window": [
    { python: "last: dict", pythonLines: 2, r: "chars <-", rLines: 5, eli5: "Remember the last place we saw each letter, where our window starts, and the best window so far." },
    { python: "for i, ch", pythonLines: 4, r: "for (i in", rLines: 5, eli5: "Walk along the word. If this letter is already inside the window, slide the window's start just past its last copy." },
    { python: "if i - start", pythonLines: 3, r: "if (i - start", rLines: 6, eli5: "If the window is the longest so far, remember it, then cut that piece out of the word at the end." },
    { python: "for s in", pythonLines: 3, r: "for (s in", rLines: 4, eli5: "Try five words, including one with all the same letter and an empty one." },
  ],
  "w03-d03-prefix-sums-intervals": [
    { python: "def count_subarrays", pythonLines: 9, r: "count_subarrays", rLines: 14, eli5: "Keep a running total. If the total minus 7 has been seen before, every earlier spot with that total starts a piece that adds up to exactly 7." },
    { python: "def merge", pythonLines: 8, r: "merge_intervals", rLines: 17, eli5: "Sort the time ranges by start. If a range starts before the last one ends, stretch the last one; otherwise start a new one." },
    { python: "nums = [3", pythonLines: 3, r: "nums <- c", rLines: 4, eli5: "Count pieces adding to 7 (there are 4) and squash four ranges into three." },
  ],
  "w04-d01-stacks-queues-heaps": [
    { python: "def balanced", pythonLines: 9, r: "balanced", rLines: 13, eli5: "A stack is a pile of plates. Every opening bracket goes on top; every closing bracket must match the plate on top, which we take off." },
    { python: "def k_largest", pythonLines: 8, r: "k_largest", rLines: 7, eli5: "Keep a tiny pile of the 3 biggest numbers seen so far, with the smallest of them on top. A bigger newcomer kicks the smallest out." },
    { python: "import heapq", r: "heap_push", rLines: 24, eli5: "Python's heapq does the pile-keeping for us. R builds it by hand: push bubbles a number up, replace-top sinks the new number down." },
    { python: "for s in", pythonLines: 3, r: "for (s in", rLines: 2, eli5: "Check three bracket strings and find the 3 largest numbers: 9, 9 and 7." },
  ],
  "w04-d02-graph-traversal": [
    { python: "GRID = [", pythonLines: 6, r: "GRID <- c", rLines: 6, eli5: "A maze: S is the start, E is the exit, # is a wall." },
    { python: "def shortest_path", pythonLines: 15, r: "shortest_path", rLines: 23, eli5: "Breadth-first search spreads out like water: first every square 1 step away, then 2 steps, and so on. The first time it touches E is the shortest path." },
    { python: "def topo_order", pythonLines: 19, r: "topo_order", rLines: 19, eli5: "To order jobs, count how many jobs each one waits for. Start with jobs that wait for nothing, and each time a job finishes, cross it off for the jobs that waited on it." },
    { python: "EDGES = [", pythonLines: 4, r: "from <- c", rLines: 4, eli5: "The water reaches the exit in 12 steps, and the jobs run from setup to deploy." },
  ],
  "w04-d03-dynamic-programming": [
    { python: "def min_coins", pythonLines: 9, r: "min_coins", rLines: 11, eli5: "Fill a table from small amounts to big ones. For each amount, try every coin and keep the fewest coins found, using answers we already wrote down for smaller amounts." },
    { python: "if best[amount", pythonLines: 7, r: "if (is.infinite", rLines: 7, eli5: "Walk back through the table to list which coins we used." },
    { python: "def count_ways", pythonLines: 6, r: "count_ways", rLines: 8, eli5: "Count the ways instead: for each coin, add the ways to make the rest. Going coin by coin means 1+2 and 2+1 count once." },
    { python: "for coins", pythonLines: 4, r: "cases <-", rLines: 8, eli5: "Try four puzzles, including one that is impossible and one with amount 0." },
  ],
  "w04-d04-binary-search-backtracking": [
    { python: "def days_needed", pythonLines: 8, r: "days_needed", rLines: 12, eli5: "Pretend the ship holds a certain weight and count how many days the boxes take, starting a new day when the next box would not fit." },
    { python: "def min_capacity", pythonLines: 9, r: "min_capacity", rLines: 9, eli5: "Guess the capacity by halving: too many days means guess bigger, few enough means try smaller. The answer is 15." },
    { python: "def combination_sum", pythonLines: 18, r: "combination_sum", rLines: 17, eli5: "Backtracking: pick a number, try to finish the sum with what is left, then take it back and try the next one. Stop early when a number is too big." },
    { python: "print(f\"min", pythonLines: 2, r: "cat(sprintf", rLines: 3, eli5: "Print the smallest capacity and the two ways to make 7." },
  ],
};
