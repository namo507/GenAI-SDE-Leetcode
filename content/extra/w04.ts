import { REVIEWED, code, defineTopic, edge, node, step } from "../helpers";
import type { ExtraWeek } from "./types";

export const w04: ExtraWeek = {
  schedule: [
    {
      dayId: "w04-d01",
      topicId: "w04-d01-trees-bst-tries",
      tasks: [
        { label: "Trees: BST insert, search, traversals and tries", minutes: 30 },
        { label: "Run the BST and trie example", minutes: 20 },
      ],
    },
    {
      dayId: "w04-d05",
      topicId: "w04-d05-shortest-paths-union-find",
      tasks: [
        { label: "Dijkstra and union-find", minutes: 30 },
        { label: "Network routing and connectivity prompts", minutes: 20 },
      ],
    },
  ],
  topics: [
    defineTopic({
      id: "w04-d01-trees-bst-tries",
      slug: "trees-bst-tries",
      title: "Trees: binary search trees, traversals and tries",
      domain: "dsa",
      roles: ["sde", "ml-engineer", "genai-engineer", "data-engineer"],
      difficulty: "intermediate",
      minutes: 50,
      prerequisites: ["w01-d02-recursion-call-stack", "w03-d01-hashing-patterns"],
      objectives: [
        "Insert into and search a binary search tree and explain why balance matters",
        "Produce in-order, pre-order and level-order traversals",
        "Use a trie for prefix search such as autocomplete",
      ],
      summary:
        "A tree is nodes with children and no cycles. In a binary search tree every left descendant is smaller and every right descendant is larger, so search follows one path from the root. A trie stores strings letter by letter so every word with a given prefix sits under one node.",
      eli5: {
        analogy:
          "A game of 'higher or lower'. You think of a number; I start at 50 and you say lower, so I go left to 30, you say higher, so I go right to 40. Every answer throws away half of what is left. A trie is like a dictionary where you follow one letter at a time: c, then a, then everything under 'ca'.",
        steps: [
          "Start at the root (the top of the upside-down tree).",
          "Smaller numbers go left, bigger ones go right.",
          "Keep going until you find it or fall off the bottom.",
          "In a trie, each step down is one more letter of the word.",
        ],
        analogyLimit:
          "Higher or lower is fast only if each answer halves the choices. If you insert numbers in sorted order, the tree becomes a long stick and you check every node; real systems use self-balancing trees to stop that.",
      },
      senior: {
        definition:
          "A binary search tree maintains left < node < right for every node, giving O(h) search, insert and delete where h is the height. Balanced variants (AVL, red-black, B-trees) keep h = O(log n). A trie maps strings to paths of characters, giving O(L) lookups for a key of length L independent of the number of keys.",
        invariants: [
          "In-order traversal of a BST yields keys in sorted order.",
          "Height determines cost: 3 levels for these 7 keys, but 7 levels if they were inserted in sorted order.",
          "In a trie, a node marks the end of a word separately from having children, so 'car' and 'cart' can coexist.",
        ],
        mechanism: [
          "Insert compares with each node from the root and attaches the key as a new leaf.",
          "Search for 60 checks 50, then 70, then finds 60: 3 comparisons.",
          "Level order uses a queue (BFS); in-order, pre-order and post-order use recursion or a stack (DFS).",
          "Trie prefix search walks to the node for 'ca' and collects every word below it in alphabetical order.",
        ],
        complexity: "BST operations O(h): O(log n) balanced, O(n) degenerate. Traversals O(n). Trie insert and lookup O(L); memory proportional to total characters.",
        tradeoffs: [
          { option: "Balanced BST or B-tree", choose: "Ordered data with range queries (databases, sorted maps).", cost: "Rebalancing logic; O(log n) instead of O(1)." },
          { option: "Hash map", choose: "Exact-key lookups only.", cost: "No ordering or range queries." },
          { option: "Trie", choose: "Prefix search, autocomplete, tokenizer vocabularies.", cost: "Memory for many small nodes; compressed tries (radix trees) reduce it." },
        ],
        failureModes: [
          "Inserting sorted data into an unbalanced BST, producing a linked list.",
          "Validating a BST by checking only each node's direct children instead of the full range.",
          "Recursive traversals overflowing the stack on deep, skewed trees.",
          "Forgetting end-of-word markers in a trie, so 'car' is reported only because 'cart' exists.",
        ],
        production:
          "B-trees index databases, red-black trees back sorted maps in standard libraries, and tries or radix trees power autocomplete, IP routing tables and tokenizer vocabularies.",
        interviewAnswer:
          "In a BST I search by comparing with the node and going left or right, so cost is the height: O(log n) when balanced, O(n) when skewed, which is why production uses balanced trees. In-order traversal gives sorted output; level order uses a queue. For prefix queries I use a trie, which walks one character at a time and collects all words below the prefix node.",
      },
      implementation: {
        problem: "Build a BST, print in-order and level-order traversals, its height and search cost, then use a trie for prefix search.",
        input: "insert 50 30 70 20 40 60 80; search 60; words car cart cat do dog; prefixes 'ca' and 'do'",
        python: {
          code: code`
            from collections import deque


            class TreeNode:
                def __init__(self, key: int):
                    self.key, self.left, self.right = key, None, None


            def insert(root, key: int):
                if root is None:
                    return TreeNode(key)
                if key < root.key:
                    root.left = insert(root.left, key)
                else:
                    root.right = insert(root.right, key)
                return root


            def in_order(root) -> list[int]:
                return in_order(root.left) + [root.key] + in_order(root.right) if root else []


            def levels(root) -> list[list[int]]:
                out, queue = [], deque([root])
                while queue:
                    level = []
                    for _ in range(len(queue)):
                        node = queue.popleft()
                        level.append(node.key)
                        queue.extend(child for child in (node.left, node.right) if child)
                    out.append(level)
                return out


            def search(root, key: int) -> int:
                checks = 0
                while root:
                    checks += 1
                    if key == root.key:
                        return checks
                    root = root.left if key < root.key else root.right
                return checks


            def build_trie(words: list[str]) -> dict:
                trie: dict = {}
                for w in words:
                    node = trie
                    for ch in w:
                        node = node.setdefault(ch, {})
                    node["$"] = True
                return trie


            def with_prefix(trie: dict, prefix: str) -> list[str]:
                node = trie
                for ch in prefix:
                    if ch not in node:
                        return []
                    node = node[ch]
                found = []

                def collect(n: dict, path: str) -> None:
                    if "$" in n:
                        found.append(path)
                    for ch in sorted(k for k in n if k != "$"):
                        collect(n[ch], path + ch)

                collect(node, prefix)
                return found


            root = None
            for k in [50, 30, 70, 20, 40, 60, 80]:
                root = insert(root, k)
            print("in-order: " + " ".join(map(str, in_order(root))))
            print("level order: " + " | ".join(" ".join(map(str, lv)) for lv in levels(root)))
            print(f"height: {len(levels(root))}, search 60 takes {search(root, 60)} comparisons")
            trie = build_trie(["car", "cart", "cat", "do", "dog"])
            for p in ("ca", "do"):
                print(f"words starting with '{p}': {' '.join(with_prefix(trie, p))}")
          `,
        },
        r: {
          code: code`
            new_tree_node <- function(key) {
              n <- new.env()
              n$key <- key
              n$left <- NULL
              n$right <- NULL
              n
            }

            insert <- function(root, key) {
              if (is.null(root)) return(new_tree_node(key))
              if (key < root$key) root$left <- insert(root$left, key) else root$right <- insert(root$right, key)
              root
            }

            in_order <- function(root) {
              if (is.null(root)) return(numeric(0))
              c(in_order(root$left), root$key, in_order(root$right))
            }

            levels <- function(root) {
              out <- list()
              queue <- list(root)
              while (length(queue) > 0) {
                out[[length(out) + 1]] <- vapply(queue, function(n) n$key, numeric(1))
                nxt <- list()
                for (n in queue) for (child in list(n$left, n$right)) if (!is.null(child)) nxt[[length(nxt) + 1]] <- child
                queue <- nxt
              }
              out
            }

            search <- function(root, key) {
              checks <- 0
              while (!is.null(root)) {
                checks <- checks + 1
                if (key == root$key) return(checks)
                root <- if (key < root$key) root$left else root$right
              }
              checks
            }

            new_trie_node <- function() {
              n <- new.env()
              n$children <- new.env()
              n$end <- FALSE
              n
            }

            build_trie <- function(words) {
              trie <- new_trie_node()
              for (w in words) {
                node <- trie
                for (ch in strsplit(w, "")[[1]]) {
                  if (is.null(node$children[[ch]])) assign(ch, new_trie_node(), envir = node$children)
                  node <- node$children[[ch]]
                }
                node$end <- TRUE
              }
              trie
            }

            with_prefix <- function(trie, prefix) {
              node <- trie
              for (ch in strsplit(prefix, "")[[1]]) {
                node <- node$children[[ch]]
                if (is.null(node)) return(character(0))
              }
              collect <- function(n, path) {
                found <- if (n$end) path else character(0)
                for (ch in sort(ls(n$children))) found <- c(found, collect(n$children[[ch]], paste0(path, ch)))
                found
              }
              collect(node, prefix)
            }

            root <- NULL
            for (k in c(50, 30, 70, 20, 40, 60, 80)) root <- insert(root, k)
            cat("in-order:", in_order(root), "\n")
            cat("level order:", paste(vapply(levels(root), paste, character(1), collapse = " "), collapse = " | "), "\n")
            cat(sprintf("height: %d, search 60 takes %d comparisons\n", length(levels(root)), as.integer(search(root, 60))))
            trie <- build_trie(c("car", "cart", "cat", "do", "dog"))
            for (p in c("ca", "do")) cat(sprintf("words starting with '%s': %s\n", p, paste(with_prefix(trie, p), collapse = " ")))
          `,
        },
        expectedOutput: code`
        in-order: 20 30 40 50 60 70 80
        level order: 50 | 30 70 | 20 40 60 80
        height: 3, search 60 takes 3 comparisons
        words starting with 'ca': car cart cat
        words starting with 'do': do dog
      `,
        tests: {
          python: code`
            def test_in_order_is_sorted():
                r = None
                for k in [5, 3, 8, 1, 4, 9]:
                    r = insert(r, k)
                assert in_order(r) == [1, 3, 4, 5, 8, 9]


            def test_sorted_inserts_make_a_tall_tree():
                r = None
                for k in range(1, 8):
                    r = insert(r, k)
                assert len(levels(r)) == 7


            def test_trie_keeps_end_markers():
                t = build_trie(["cart"])
                assert with_prefix(t, "car") == ["cart"]
                assert with_prefix(t, "x") == []
          `,
          r: code`
            test_that("in-order is sorted", {
              r <- NULL
              for (k in c(5, 3, 8, 1, 4, 9)) r <- insert(r, k)
              expect_equal(in_order(r), c(1, 3, 4, 5, 8, 9))
            })

            test_that("sorted inserts make a tall tree", {
              r <- NULL
              for (k in 1:7) r <- insert(r, k)
              expect_length(levels(r), 7)
            })

            test_that("trie keeps end markers", {
              t <- build_trie("cart")
              expect_equal(with_prefix(t, "car"), "cart")
              expect_length(with_prefix(t, "x"), 0)
            })
          `,
        },
        eli5Trace: [
          "50 becomes the top. 30 is smaller so it goes left; 70 is bigger so it goes right; and so on.",
          "Reading the tree left, middle, right gives the numbers in order: 20 30 40 50 60 70 80.",
          "Reading it floor by floor gives 50 | 30 70 | 20 40 60 80: three floors.",
          "Looking for 60: start at 50 (go right), 70 (go left), found 60. Three looks.",
          "In the trie, walking c then a reaches a spot where car, cart and cat all live; d then o finds do and dog.",
        ],
        complexity: { time: "BST operations O(height); traversals O(n); trie O(word length)", space: "O(n) nodes; trie O(total characters)" },
        edgeCases: [
          "Duplicate keys need a rule (count field, or always go right).",
          "An empty tree has height 0 and every search takes 0 comparisons.",
          "Sorted inserts make a skewed tree with height n.",
          "A prefix that is itself a word (do) must be returned along with longer words (dog).",
        ],
        incorrect: {
          language: "python",
          code: code`
            def is_bst(node):
                if node is None:
                    return True
                if node.left and node.left.key > node.key:
                    return False
                if node.right and node.right.key < node.key:
                    return False
                return is_bst(node.left) and is_bst(node.right)
          `,
          whyWrong: "It only checks each node against its direct children. A tree with 50 at the root, 30 on the left and 60 as 30's right child passes, but 60 sits in the left subtree of 50, so it is not a BST.",
          fix: "Pass down the allowed range: is_bst(node, low, high) checks low < node.key < high and narrows the range for each child.",
        },
        walkthrough: [
          { python: "def insert(root, key: int):", pythonLines: 8, r: "insert <- function(root, key) {", rLines: 5, eli5: "To insert a number, start at the top: smaller goes left, bigger goes right, until you find an empty spot." },
          { python: "def in_order(root) -> list[int]:", pythonLines: 2, r: "in_order <- function(root) {", rLines: 4, eli5: "In-order reading: everything on the left, then me, then everything on the right. In a BST that comes out sorted." },
          { python: "def levels(root) -> list[list[int]]:", pythonLines: 10, r: "levels <- function(root) {", rLines: 11, eli5: "Level order: use a queue to visit the tree floor by floor, like reading a family tree generation by generation." },
          { python: "def search(root, key: int) -> int:", pythonLines: 8, r: "search <- function(root, key) {", rLines: 9, eli5: "Search plays higher or lower: compare, go left or right, and count how many nodes we looked at." },
          { python: "def build_trie(words: list[str]) -> dict:", pythonLines: 8, r: "build_trie <- function(words) {", rLines: 12, eli5: "A trie stores words one letter at a time. Words that start the same share the same first branches, and a marker says where a word ends." },
          { python: "def with_prefix(trie: dict, prefix: str) -> list[str]:", pythonLines: 16, r: "with_prefix <- function(trie, prefix) {", rLines: 12, eli5: "To autocomplete, walk down the letters of the prefix, then collect every word below that spot in ABC order." },
        ],
      },
      flow: {
        title: "Searching a binary search tree for 60",
        nodes: [
          node("n50", "50", 300, 0, "root"),
          node("n30", "30", 140, 100),
          node("n70", "70", 460, 100),
          node("n20", "20", 60, 200),
          node("n40", "40", 220, 200),
          node("n60", "60", 380, 200, "found"),
          node("n80", "80", 540, 200),
        ],
        edges: [edge("n50", "n30"), edge("n50", "n70"), edge("n30", "n20"), edge("n30", "n40"), edge("n70", "n60"), edge("n70", "n80")],
        steps: [
          step("n50", "", "Start at the root, 50. 60 is bigger, so the answer can only be in the right subtree."),
          step("n50 n70", "n50-n70", "Move right to 70. 60 is smaller, so go left."),
          step("n70 n60", "n70-n60", "Found 60 after 3 comparisons: one per level, so cost equals the height."),
          step("n30 n20 n40", "n50-n30 n30-n20 n30-n40", "The whole left subtree (30, 20, 40) was never looked at: that is the halving that makes balanced trees O(log n)."),
        ],
      },
      practice: [
        {
          id: "w04-tree-code-1",
          type: "code",
          prompt: "Return the lowest common ancestor of two keys in a BST.",
          answer: "Start at the root: if both keys are smaller go left, if both are larger go right, otherwise the current node splits them and is the LCA. O(h) time, O(1) space iteratively.",
          rubric: ["Uses BST ordering", "Split point is LCA", "O(h)"],
        },
        {
          id: "w04-tree-recall-1",
          type: "recall",
          prompt: "Which traversal would you use to copy a tree, to delete a tree, and to print it in sorted order?",
          answer: "Pre-order to copy (create the parent before children), post-order to delete (children before parent), in-order for sorted output of a BST.",
          rubric: ["Pre-order copy", "Post-order delete", "In-order sorted"],
        },
        {
          id: "w04-tree-design-1",
          type: "design",
          prompt: "Design autocomplete for a search box that suggests the 5 most popular queries for a typed prefix.",
          answer: "A trie over past queries where each node stores the top 5 completions by frequency (precomputed), so a lookup is O(prefix length). Rebuild or update counts offline; shard by first letters if large; cache hot prefixes.",
          rubric: ["Trie", "Top-k stored per node", "Offline updates", "Caching or sharding"],
        },
      ],
      references: [
        { title: "Introduction to Algorithms (Cormen, Leiserson, Rivest, Stein), chapters on binary search trees and red-black trees", versionSensitive: false },
        { title: "Python documentation: collections.deque (queues for breadth-first traversal)", url: "https://docs.python.org/3/library/collections.html#collections.deque", versionSensitive: false },
      ],
      lastReviewed: REVIEWED,
    }),

    defineTopic({
      id: "w04-d05-shortest-paths-union-find",
      slug: "shortest-paths-union-find",
      title: "Shortest paths (Dijkstra) and union-find",
      domain: "dsa",
      roles: ["sde", "ml-engineer", "data-engineer"],
      difficulty: "advanced",
      minutes: 55,
      prerequisites: ["w04-d02-graph-traversal", "w04-d01-stacks-queues-heaps"],
      objectives: [
        "Run Dijkstra's algorithm with a priority queue and reconstruct the path",
        "Explain why Dijkstra fails with negative edges",
        "Use union-find with path compression to count components and find redundant edges",
      ],
      summary:
        "Dijkstra's algorithm finds cheapest paths from one source when edge weights are non-negative, always expanding the closest unfinished node. Union-find tracks which items are connected as edges arrive, answering 'same group?' in nearly constant time.",
      eli5: {
        analogy:
          "Water spreading from a tap through pipes of different lengths. The water reaches the nearest junction first, then the next nearest, and once it reaches a junction that junction's time can never get better. Union-find is like kids holding hands: to know if two kids are in the same chain, follow hands to each chain's leader and compare leaders.",
        steps: [
          "Start at the source with distance 0; everything else is 'unknown, very far'.",
          "Pick the closest place you have not finished yet and finish it.",
          "From there, see if going through it makes any neighbor closer.",
          "Repeat until everything is finished. For union-find, joining two chains means one leader holds the other's hand.",
        ],
        analogyLimit:
          "Water never flows backwards to make a path shorter, which is why the trick works. A negative pipe length (a shortcut that refunds time) breaks it: a finished junction could still get better, and you need Bellman-Ford instead.",
      },
      senior: {
        definition:
          "Dijkstra's algorithm computes single-source shortest paths for non-negative weights by repeatedly extracting the minimum-distance vertex from a priority queue and relaxing its outgoing edges. Union-find (disjoint set union) supports find and union with path compression and union by rank in amortized near-constant time.",
        invariants: [
          "When a vertex is extracted from the priority queue its distance is final (requires non-negative weights).",
          "Relaxation never increases a distance: dist[v] = min(dist[v], dist[u] + w).",
          "In union-find, each set has exactly one root; find returns that root.",
        ],
        mechanism: [
          "From A, C (2) is finalized first, then B at 3 through C beats the direct edge of 4.",
          "D is 8 through B, E is 10 through D (better than 12 directly from C), and F is 13 through E.",
          "The path is rebuilt by following prev pointers back from F.",
          "Union-find on 6 nodes with edges 0-1, 1-2, 2-0, 3-4 leaves 3 components; 2-0 is redundant because 2 and 0 already share a root.",
        ],
        complexity: "Dijkstra with a binary heap O((V + E) log V); the simple array version used in R here is O(V²). Union-find is O(α(n)) amortized per operation.",
        tradeoffs: [
          { option: "Dijkstra", choose: "Non-negative weights: road networks, routing, latency graphs.", cost: "Wrong with negative edges." },
          { option: "BFS", choose: "Unweighted graphs.", cost: "Ignores weights." },
          { option: "Bellman-Ford", choose: "Negative edges or detecting negative cycles.", cost: "O(VE), much slower." },
        ],
        failureModes: [
          "Using Dijkstra with negative weights.",
          "Not skipping stale heap entries, which wastes work (or breaks code that assumes uniqueness).",
          "Union-find without path compression on adversarial input, giving long chains.",
          "Forgetting that union-find cannot split groups once joined.",
        ],
        production:
          "Map routing uses Dijkstra variants with heuristics (A*) and precomputed hierarchies. Union-find appears in Kruskal's minimum spanning tree, connected-component labeling in images, deduplication of entity records and network connectivity checks.",
        interviewAnswer:
          "Dijkstra keeps a min-heap of tentative distances; I pop the closest node, skip it if stale, and relax its edges. Each pop is final because weights are non-negative, so total cost is O((V + E) log V); with negative edges I would use Bellman-Ford. For dynamic connectivity I use union-find with path compression and union by rank, which also finds the first redundant edge in a graph.",
      },
      implementation: {
        problem: "Find shortest distances and a path from A with Dijkstra, then count components and the redundant edge with union-find.",
        input: "directed edges A-B 4, A-C 2, C-B 1, B-D 5, C-D 8, C-E 10, D-E 2, D-F 6, E-F 3; union-find edges 0-1, 1-2, 2-0, 3-4 on nodes 0..5",
        python: {
          code: code`
            import heapq

            EDGES = [("A", "B", 4), ("A", "C", 2), ("C", "B", 1), ("B", "D", 5), ("C", "D", 8), ("C", "E", 10), ("D", "E", 2), ("D", "F", 6), ("E", "F", 3)]
            NODES = ["A", "B", "C", "D", "E", "F"]


            def dijkstra(source: str) -> tuple[dict[str, float], dict[str, str]]:
                graph: dict[str, list[tuple[str, int]]] = {n: [] for n in NODES}
                for u, v, w in EDGES:
                    graph[u].append((v, w))
                dist = {n: float("inf") for n in NODES}
                prev: dict[str, str] = {}
                dist[source] = 0
                heap = [(0, source)]
                while heap:
                    d, u = heapq.heappop(heap)
                    if d > dist[u]:
                        continue  # stale entry
                    for v, w in graph[u]:
                        if d + w < dist[v]:
                            dist[v], prev[v] = d + w, u
                            heapq.heappush(heap, (d + w, v))
                return dist, prev


            def path_to(prev: dict[str, str], target: str) -> list[str]:
                path = [target]
                while path[-1] in prev:
                    path.append(prev[path[-1]])
                return path[::-1]


            def find(parent: list[int], x: int) -> int:
                while parent[x] != x:
                    parent[x] = parent[parent[x]]  # path compression (halving)
                    x = parent[x]
                return x


            def components(n: int, edges: list[tuple[int, int]]) -> tuple[int, list[tuple[int, int]]]:
                parent = list(range(n))
                redundant = []
                for a, b in edges:
                    ra, rb = find(parent, a), find(parent, b)
                    if ra == rb:
                        redundant.append((a, b))
                    else:
                        parent[rb] = ra
                return len({find(parent, x) for x in range(n)}), redundant


            dist, prev = dijkstra("A")
            print("dijkstra from A: " + " ".join(f"{n}={int(dist[n])}" for n in NODES))
            print(f"shortest path A to F: {' -> '.join(path_to(prev, 'F'))} (cost {int(dist['F'])})")
            count, redundant = components(6, [(0, 1), (1, 2), (2, 0), (3, 4)])
            print(f"union-find on 6 nodes: {count} components, redundant edge {redundant[0][0]}-{redundant[0][1]}")
          `,
        },
        r: {
          code: code`
            edges <- data.frame(
              from = c("A", "A", "C", "B", "C", "C", "D", "D", "E"),
              to = c("B", "C", "B", "D", "D", "E", "E", "F", "F"),
              w = c(4, 2, 1, 5, 8, 10, 2, 6, 3)
            )
            nodes <- c("A", "B", "C", "D", "E", "F")

            dijkstra <- function(source) {
              dist <- setNames(rep(Inf, length(nodes)), nodes)
              prev <- setNames(rep(NA_character_, length(nodes)), nodes)
              done <- setNames(rep(FALSE, length(nodes)), nodes)
              dist[[source]] <- 0
              repeat {
                open <- nodes[!done & is.finite(dist)]
                if (length(open) == 0) break
                u <- open[which.min(dist[open])]
                done[[u]] <- TRUE
                out <- edges[edges$from == u, ]
                for (i in seq_len(nrow(out))) {
                  v <- out$to[i]
                  if (dist[[u]] + out$w[i] < dist[[v]]) {
                    dist[[v]] <- dist[[u]] + out$w[i]
                    prev[[v]] <- u
                  }
                }
              }
              list(dist = dist, prev = prev)
            }

            path_to <- function(prev, target) {
              path <- target
              while (!is.na(prev[[path[1]]])) path <- c(prev[[path[1]]], path)
              path
            }

            find_root <- function(parent, x) {
              while (parent[x] != x) x <- parent[x]
              x
            }

            components <- function(n, pairs) {
              parent <- seq_len(n)
              redundant <- NULL
              for (p in pairs) {
                ra <- find_root(parent, p[1] + 1)
                rb <- find_root(parent, p[2] + 1)
                if (ra == rb) redundant <- rbind(redundant, p) else parent[rb] <- ra
              }
              roots <- unique(vapply(seq_len(n), function(x) find_root(parent, x), numeric(1)))
              list(count = length(roots), redundant = redundant)
            }

            res <- dijkstra("A")
            cat("dijkstra from A:", paste0(nodes, "=", res$dist[nodes]), "\n")
            cat(sprintf("shortest path A to F: %s (cost %d)\n", paste(path_to(res$prev, "F"), collapse = " -> "), as.integer(res$dist[["F"]])))
            uf <- components(6, list(c(0, 1), c(1, 2), c(2, 0), c(3, 4)))
            cat(sprintf("union-find on 6 nodes: %d components, redundant edge %d-%d\n", uf$count, as.integer(uf$redundant[1, 1]), as.integer(uf$redundant[1, 2])))
          `,
        },
        expectedOutput: code`
        dijkstra from A: A=0 B=3 C=2 D=8 E=10 F=13
        shortest path A to F: A -> C -> B -> D -> E -> F (cost 13)
        union-find on 6 nodes: 3 components, redundant edge 2-0
      `,
        tests: {
          python: code`
            def test_unreachable_nodes_stay_infinite():
                d, _ = dijkstra("F")
                assert d["A"] == float("inf") and d["F"] == 0


            def test_path_starts_at_source():
                d, p = dijkstra("A")
                assert path_to(p, "D") == ["A", "C", "B", "D"] and d["D"] == 8


            def test_union_find_all_connected():
                assert components(4, [(0, 1), (1, 2), (2, 3)]) == (1, [])
          `,
          r: code`
            test_that("unreachable nodes stay infinite", {
              d <- dijkstra("F")$dist
              expect_true(is.infinite(d[["A"]]))
              expect_equal(d[["F"]], 0)
            })

            test_that("path to D goes through C and B", {
              r <- dijkstra("A")
              expect_equal(path_to(r$prev, "D"), c("A", "C", "B", "D"))
            })

            test_that("union-find counts components", {
              expect_equal(components(4, list(c(0, 1), c(1, 2), c(2, 3)))$count, 1)
            })
          `,
        },
        eli5Trace: [
          "Water starts at A. The nearest junction is C at 2, so C is finished first.",
          "Through C, B is only 3 away, better than the direct pipe of 4.",
          "From B, D is 8. From D, E is 10, beating the long pipe from C (12).",
          "F is reached at 13 through E, so the route is A, C, B, D, E, F.",
          "For union-find, 0, 1 and 2 hold hands in one chain, 3 and 4 in another, and 5 alone: 3 chains. The edge 2-0 joined kids already in the same chain, so it was redundant.",
        ],
        complexity: { time: "Dijkstra O((V + E) log V) with a heap; union-find near O(1) per operation", space: "O(V + E)" },
        edgeCases: [
          "Unreachable nodes keep distance infinity.",
          "Several equal shortest paths: the one recorded depends on processing order.",
          "Negative edge weights make Dijkstra wrong; detect them and use Bellman-Ford.",
          "Self-loops in union-find are always redundant.",
        ],
        incorrect: {
          language: "python",
          code: code`
            visited = set()
            queue = deque([source])
            while queue:
                u = queue.popleft()
                for v, w in graph[u]:
                    if v not in visited:
                        dist[v] = dist[u] + w
                        visited.add(v)
                        queue.append(v)
          `,
          whyWrong: "This is BFS with weights added: it fixes a node's distance the first time it is seen, so B would get 4 through the direct edge instead of 3 through C.",
          fix: "Use a priority queue keyed by distance and relax edges: update dist[v] whenever d + w is smaller, finalizing nodes only when popped.",
        },
        walkthrough: [
          { python: "EDGES = [", r: "edges <- data.frame(", rLines: 5, eli5: "Write down the pipes: where each one starts, where it ends, and how long it is." },
          { python: "dist = {n: float(", pythonLines: 4, r: "dist <- setNames(rep(Inf", rLines: 4, eli5: "Every place starts 'infinitely far' except the starting tap, which is 0 away." },
          { python: "d, u = heapq.heappop(heap)", pythonLines: 3, r: "u <- open[which.min(dist[open])]", rLines: 2, eli5: "Pick the closest place that is not finished yet. Python uses a heap to find it fast; R simply looks for the smallest." },
          { python: "for v, w in graph[u]:", pythonLines: 4, r: "for (i in seq_len(nrow(out))) {", rLines: 7, eli5: "From that place, check each pipe: if going through here makes a neighbor closer, write down the new distance and where we came from." },
          { python: "def path_to(prev: dict[str, str], target: str) -> list[str]:", pythonLines: 5, r: "path_to <- function(prev, target) {", rLines: 5, eli5: "To get the route, start at the end and follow the 'came from' notes back to the start." },
          { python: "def find(parent: list[int], x: int) -> int:", pythonLines: 5, r: "find_root <- function(parent, x) {", rLines: 4, eli5: "Union-find: to know which chain a kid is in, follow hands up to the chain's leader." },
          { python: "def components(n: int, edges", pythonLines: 10, r: "components <- function(n, pairs) {", rLines: 10, eli5: "For each new pair, if both kids already share a leader the pair is redundant; otherwise join the two chains. Count the leaders at the end." },
        ],
      },
      flow: {
        title: "Dijkstra finalizing the closest node first",
        nodes: [
          node("A", "A", 0, 120, "0"),
          node("C", "C", 200, 220, "2"),
          node("B", "B", 200, 20, "3"),
          node("D", "D", 420, 120, "8"),
          node("E", "E", 620, 220, "10"),
          node("F", "F", 820, 120, "13"),
        ],
        edges: [edge("A", "C", "2"), edge("A", "B", "4"), edge("C", "B", "1"), edge("B", "D", "5"), edge("C", "D", "8"), edge("C", "E", "10"), edge("D", "E", "2"), edge("D", "F", "6"), edge("E", "F", "3")],
        steps: [
          step("A C B", "A-C A-B", "From A, C is 2 away and B is 4 away. The heap pops C first because it is the closest."),
          step("C B", "C-B", "Relaxing C's edges improves B from 4 to 3. Distances only ever go down."),
          step("B D", "B-D", "B is popped at 3 and is now final. D becomes 8 through B, better than 10 through C."),
          step("D E F", "D-E D-F", "D gives E 10 (beating 12 from C) and F 14."),
          step("E F", "E-F", "E is popped at 10 and improves F to 13. The path is A, C, B, D, E, F."),
        ],
      },
      practice: [
        {
          id: "w04-sp-recall-1",
          type: "recall",
          prompt: "Why does Dijkstra's algorithm fail with negative edge weights?",
          answer: "It assumes a popped node's distance is final because any other path is at least as long. A later negative edge could make a finalized node cheaper, which the algorithm never revisits.",
          rubric: ["Finalization assumption", "Negative edge breaks it", "Bellman-Ford alternative"],
        },
        {
          id: "w04-sp-code-1",
          type: "code",
          prompt: "Given n computers and network cables (pairs), return the minimum number of cable moves to connect all computers, or -1 if impossible.",
          answer: "If cables < n - 1 return -1. Otherwise use union-find to count components c; the answer is c - 1, since each redundant cable can join two components.",
          rubric: ["Enough cables check", "Union-find components", "Answer c - 1"],
        },
        {
          id: "w04-sp-design-1",
          type: "design",
          prompt: "Design a service that returns the fastest delivery route between warehouses as traffic changes every few minutes.",
          answer: "Model roads as a weighted graph with travel-time weights updated from traffic feeds; run Dijkstra or A* with a distance heuristic per request; precompute contraction hierarchies or landmarks for speed; cache hot origin-destination pairs with short TTLs.",
          rubric: ["Weighted graph with live weights", "Dijkstra or A*", "Precomputation", "Caching with TTL"],
        },
      ],
      references: [
        { title: "Python documentation: heapq, heap queue algorithm", url: "https://docs.python.org/3/library/heapq.html", versionSensitive: false },
        { title: "Introduction to Algorithms (Cormen, Leiserson, Rivest, Stein), chapters on single-source shortest paths and disjoint sets", versionSensitive: false },
      ],
      lastReviewed: REVIEWED,
    }),
  ],
};
