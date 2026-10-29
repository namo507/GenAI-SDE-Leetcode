import { REVIEWED, code, defineTopic, edge, node, step } from "../helpers";
import type { ExtraWeek } from "./types";

export const w14: ExtraWeek = {
  schedule: [
    {
      dayId: "w14-d02",
      topicId: "w14-d02-vector-search-ann",
      tasks: [
        { label: "Vector search: exact kNN, IVF and HNSW", minutes: 30 },
        { label: "Tune nprobe for a recall target", minutes: 15 },
      ],
    },
  ],
  topics: [
    defineTopic({
      id: "w14-d02-vector-search-ann",
      slug: "vector-search-ann",
      title: "Vector search: approximate nearest neighbors",
      domain: "rag",
      roles: ["genai-engineer", "ml-engineer", "sde", "data-engineer"],
      difficulty: "intermediate",
      minutes: 50,
      prerequisites: ["w14-d01-chunking-ingestion", "w08-d01-knn-naive-bayes"],
      objectives: [
        "Build an inverted-file (IVF) index with k-means and search it with nprobe lists",
        "Measure recall@k against exact search and the fraction of distance computations saved",
        "Choose between flat, IVF, HNSW and quantized indexes for a latency, memory and recall budget",
      ],
      summary:
        "Retrieval needs the nearest embeddings to a query among millions. Exact search compares the query with every vector. Approximate nearest neighbor (ANN) indexes trade a little recall for a lot of speed: IVF clusters vectors and searches only the closest clusters, HNSW walks a layered graph of neighbors, and product quantization compresses vectors to save memory.",
      eli5: {
        analogy:
          "Finding the books most like yours in a giant library. Checking every book is slow. Instead, the library is split into sections by topic. You walk to the one or two sections that best match your book and only look there. Usually the best matches are there; occasionally one is in the next section over.",
        steps: [
          "Sort all books into sections around section 'centers'.",
          "For a new book, find the closest few section centers.",
          "Look only inside those sections.",
          "Check more sections if you need to be surer, at the cost of more looking.",
        ],
        analogyLimit:
          "Real embeddings live in hundreds of dimensions where 'sections' overlap a lot, so the number of sections to check for good recall must be measured, not guessed.",
      },
      senior: {
        definition:
          "An ANN index returns approximately the k vectors closest to a query under a metric (L2, inner product or cosine). IVF partitions vectors with a coarse quantizer (k-means centroids) into inverted lists and searches the nprobe closest lists. HNSW builds a multi-layer proximity graph and searches it greedily. Product quantization encodes vectors as short codes so distances can be approximated from lookup tables.",
        invariants: [
          "Recall@k is measured against exact search on a sample of real queries.",
          "Query and document embeddings must come from the same model and normalization.",
          "With nprobe equal to the number of lists, IVF is exact (and slower than flat search because of the centroid comparisons).",
        ],
        mechanism: [
          "k-means splits 800 vectors into 16 lists of 23 to 67 vectors.",
          "Probing 1 list finds 52% of the true top 10 while computing 8.2% of the distances.",
          "Probing 4 lists reaches 95.8% recall at 27.2% of the work; 8 lists reach 99.8% at 52.6%.",
          "Probing all 16 lists is exact but costs 102% of brute force, because the 16 centroid distances are extra.",
        ],
        complexity:
          "Flat: O(n · d) per query. IVF: O(L · d + (nprobe / L) · n · d) on average for L lists. HNSW: roughly logarithmic hops with a tunable ef parameter. Building IVF costs k-means iterations; HNSW insertions are O(log n) each but memory-heavy.",
        tradeoffs: [
          { option: "Flat (exact)", choose: "Up to roughly a few hundred thousand vectors, or as ground truth.", cost: "Linear query time." },
          { option: "IVF", choose: "Large collections with batch builds; easy to shard.", cost: "Recall depends on nprobe; needs retraining as data drifts." },
          { option: "HNSW", choose: "Low-latency, high-recall search with frequent inserts.", cost: "High memory; deletes are awkward." },
          { option: "Product quantization (IVF-PQ)", choose: "Billions of vectors under tight memory.", cost: "Lower recall; usually needs re-ranking with full vectors." },
        ],
        failureModes: [
          "Tuning nprobe or ef without measuring recall on real queries.",
          "Mixing embeddings from two model versions in one index.",
          "Filtering after retrieval, so a narrow metadata filter leaves fewer than k results.",
          "Never rebuilding IVF centroids as the data distribution shifts.",
        ],
        production:
          "Vector databases and libraries (FAISS, pgvector, and managed services) expose these index types. Teams pick an index from data size, latency and memory budgets, measure recall@k against exact search, combine vector and keyword (BM25) retrieval, apply metadata filters inside the index when supported, and re-embed and re-index when the embedding model changes.",
        interviewAnswer:
          "Exact search is linear, so at scale I use an ANN index: IVF clusters vectors and searches the nprobe nearest clusters, HNSW walks a neighbor graph, and PQ compresses vectors for memory. I tune nprobe or ef by measuring recall@k against exact search on real queries until I hit the recall target within the latency budget. I keep one embedding model per index, filter inside the index where possible, and combine dense retrieval with BM25.",
      },
      implementation: {
        problem: "Build an IVF index with 16 k-means lists over 800 eight-dimensional vectors, then measure recall@10 and distance computations for 40 queries at nprobe 1 to 16.",
        input: "800 vectors scattered around 6 topic centers; 40 queries near those topics; seeded generator for identical Python and R results",
        python: {
          code: code`
            from math import cos, log, pi, sqrt

            M = 2147483647
            DIM, N, TOPICS, LISTS, QUERIES, K, ITERS = 8, 800, 6, 16, 40, 10, 6
            state = 11


            def uniform():
                global state
                state = (16807 * state) % M
                return state / M


            def normal():
                u1, u2 = uniform(), uniform()
                return sqrt(-2 * log(u1)) * cos(2 * pi * u2)


            def dist2(a, b):
                total = 0.0
                for x, y in zip(a, b):
                    diff = x - y
                    total += diff * diff
                return total


            def nearest(vec, centroids):
                best, best_d = 0, dist2(vec, centroids[0])
                for c in range(1, len(centroids)):
                    d = dist2(vec, centroids[c])
                    if d < best_d:
                        best, best_d = c, d
                return best


            topics = [[normal() for _ in range(DIM)] for _ in range(TOPICS)]  # topic centers; documents scatter around them
            points = [[topics[i % TOPICS][d] + normal() for d in range(DIM)] for i in range(N)]
            queries = [[topics[(7 * q) % TOPICS][d] + normal() for d in range(DIM)] for q in range(QUERIES)]

            centroids = [p[:] for p in points[:LISTS]]  # k-means initialized with the first points
            for _ in range(ITERS):
                assign = [nearest(p, centroids) for p in points]
                for c in range(LISTS):
                    members = [i for i in range(N) if assign[i] == c]
                    if members:
                        for d in range(DIM):
                            total = 0.0
                            for i in members:
                                total += points[i][d]
                            centroids[c][d] = total / len(members)
            assign = [nearest(p, centroids) for p in points]
            inverted = [[i for i in range(N) if assign[i] == c] for c in range(LISTS)]
            sizes = sorted(len(lst) for lst in inverted)
            print(f"{N} vectors in {DIM} dimensions, {LISTS} inverted lists (sizes {sizes[0]} to {sizes[-1]})")

            dists = [[dist2(q, p) for p in points] for q in queries]
            exact = [sorted(range(N), key=lambda i: (dq[i], i))[:K] for dq in dists]
            for nprobe in (1, 2, 4, 8, 16):
                hit_total, work = 0, 0
                for qi, q in enumerate(queries):
                    order = sorted(range(LISTS), key=lambda c: (dist2(q, centroids[c]), c))[:nprobe]
                    candidates = [i for c in order for i in inverted[c]]
                    found = sorted(candidates, key=lambda i: (dists[qi][i], i))[:K]
                    hit_total += len(set(found) & set(exact[qi]))
                    work += LISTS + len(candidates)
                print(f"nprobe {nprobe:2d}: recall@{K} {hit_total / (K * QUERIES):.3f}, distance computations {work / QUERIES:6.1f} per query ({100 * work / (QUERIES * N):5.1f}% of brute force)")
          `,
        },
        r: {
          code: code`
            m_mod <- 2147483647
            dim <- 8
            n <- 800
            n_topics <- 6
            n_lists <- 16
            n_queries <- 40
            k <- 10
            iters <- 6
            state <- 11

            uniform <- function() {
              state <<- (16807 * state) %% m_mod
              state / m_mod
            }

            normal_draw <- function() {
              u1 <- uniform()
              u2 <- uniform()
              sqrt(-2 * log(u1)) * cos(2 * pi * u2)
            }

            # Squared distance from vec to every row of mat, accumulated one dimension at a time.
            dist2_rows <- function(mat, vec) {
              total <- numeric(nrow(mat))
              for (d in seq_len(ncol(mat))) {
                diff <- mat[, d] - vec[d]
                total <- total + diff * diff
              }
              total
            }

            nearest <- function(vec, centroids) which.min(dist2_rows(centroids, vec))

            topics <- matrix(0, n_topics, dim) # topic centers; documents scatter around them
            for (t in 1:n_topics) for (d in 1:dim) topics[t, d] <- normal_draw()
            points <- matrix(0, n, dim)
            for (i in 1:n) for (d in 1:dim) points[i, d] <- topics[(i - 1) %% n_topics + 1, d] + normal_draw()
            queries <- matrix(0, n_queries, dim)
            for (q in 1:n_queries) for (d in 1:dim) queries[q, d] <- topics[(7 * (q - 1)) %% n_topics + 1, d] + normal_draw()

            centroids <- points[1:n_lists, ] # k-means initialized with the first points
            for (it in 1:iters) {
              assign <- vapply(1:n, function(i) nearest(points[i, ], centroids), integer(1))
              for (cl in 1:n_lists) {
                members <- which(assign == cl)
                if (length(members) > 0) {
                  for (d in 1:dim) {
                    total <- 0
                    for (i in members) total <- total + points[i, d]
                    centroids[cl, d] <- total / length(members)
                  }
                }
              }
            }
            assign <- vapply(1:n, function(i) nearest(points[i, ], centroids), integer(1))
            inverted <- lapply(1:n_lists, function(cl) which(assign == cl))
            sizes <- sort(lengths(inverted))
            cat(sprintf("%d vectors in %d dimensions, %d inverted lists (sizes %d to %d)\n", as.integer(n), as.integer(dim), as.integer(n_lists), sizes[1], sizes[length(sizes)]))

            dists <- t(vapply(1:n_queries, function(q) dist2_rows(points, queries[q, ]), numeric(n)))
            exact <- lapply(1:n_queries, function(q) order(dists[q, ], 1:n)[1:k])
            for (nprobe in c(1, 2, 4, 8, 16)) {
              hit_total <- 0
              work <- 0
              for (q in 1:n_queries) {
                probe <- order(dist2_rows(centroids, queries[q, ]), 1:n_lists)[1:nprobe]
                candidates <- unlist(inverted[probe])
                found <- candidates[order(dists[q, candidates], candidates)][1:min(k, length(candidates))]
                hit_total <- hit_total + length(intersect(found, exact[[q]]))
                work <- work + n_lists + length(candidates)
              }
              cat(sprintf("nprobe %2d: recall@%d %.3f, distance computations %6.1f per query (%5.1f%% of brute force)\n",
                          as.integer(nprobe), as.integer(k), hit_total / (k * n_queries), work / n_queries, 100 * work / (n_queries * n)))
            }
          `,
        },
        expectedOutput: code`
        800 vectors in 8 dimensions, 16 inverted lists (sizes 23 to 67)
        nprobe  1: recall@10 0.520, distance computations   65.6 per query (  8.2% of brute force)
        nprobe  2: recall@10 0.790, distance computations  118.2 per query ( 14.8% of brute force)
        nprobe  4: recall@10 0.958, distance computations  217.6 per query ( 27.2% of brute force)
        nprobe  8: recall@10 0.998, distance computations  420.7 per query ( 52.6% of brute force)
        nprobe 16: recall@10 1.000, distance computations  816.0 per query (102.0% of brute force)
      `,
        tests: {
          python: code`
            def test_every_vector_is_in_exactly_one_list():
                assert sorted(i for lst in inverted for i in lst) == list(range(N))


            def test_exact_neighbors_are_sorted_by_distance():
                for qi in range(QUERIES):
                    ds = [dists[qi][i] for i in exact[qi]]
                    assert ds == sorted(ds)


            def test_probing_every_list_is_exact():
                q = queries[0]
                candidates = [i for lst in inverted for i in lst]
                found = sorted(candidates, key=lambda i: (dists[0][i], i))[:K]
                assert found == exact[0]
          `,
          r: code`
            test_that("every vector is in exactly one list", {
              expect_equal(sort(unlist(inverted)), 1:n)
            })

            test_that("probing every list is exact", {
              candidates <- unlist(inverted)
              found <- candidates[order(dists[1, candidates], candidates)][1:k]
              expect_equal(found, exact[[1]])
            })
          `,
        },
        eli5Trace: [
          "The library gets 16 sections, each with between 23 and 67 books.",
          "Looking in just the closest section finds about half of the 10 best matches while checking only 8% of the books.",
          "Looking in 4 sections finds almost all of them (96%) while checking about a quarter of the books.",
          "Looking in every section finds everything, but then it is slower than just checking every book.",
        ],
        complexity: { time: "Build O(iterations × n × L × d); query O(L × d + candidates × d)", space: "O(n × d + L × d)" },
        edgeCases: [
          "Empty lists after k-means keep their old centroid here; libraries reseed them.",
          "Duplicate vectors make top-k ties; break ties by id for stable results.",
          "Queries far from all centroids (out-of-distribution) need more probes for the same recall.",
          "Cosine similarity needs normalized vectors so L2 and inner product rankings agree.",
        ],
        incorrect: {
          language: "python",
          code: code`
            results = index.search(query, k=10)
            results = [r for r in results if r.metadata["tenant"] == tenant][:10]  # filter afterwards
          `,
          whyWrong: "If only 2 of the 10 nearest vectors belong to this tenant, the user gets 2 results even though many relevant documents exist, and other tenants' data was touched in the process.",
          fix: "Filter inside the index (pre-filtering or a filtered search API), keep per-tenant indexes or partitions, or over-fetch and re-query until k filtered results are found.",
        },
        walkthrough: [
          { python: "def dist2(a, b):", pythonLines: 6, r: "dist2_rows <- function(mat, vec) {", rLines: 8, eli5: "How far apart are two books? Add up the squared differences, one direction at a time." },
          { python: "topics = [[", pythonLines: 3, r: "topics <- matrix(", rLines: 6, eli5: "Make 6 topic centers, 800 books scattered around them, and 40 new books to search for." },
          { python: "centroids = [p[:]", pythonLines: 11, r: "centroids <- points[1:n_lists, ]", rLines: 14, eli5: "Build 16 sections: put each book in its closest section, move each section center to the middle of its books, repeat." },
          { python: "inverted = [", pythonLines: 3, r: "inverted <- lapply(", rLines: 3, eli5: "Write down which books live in each section." },
          { python: "dists = [[", pythonLines: 2, r: "dists <- t(", rLines: 2, eli5: "The slow honest answer: compare every new book with every book to know the true 10 best." },
          { python: "for nprobe in (1, 2, 4, 8, 16):", pythonLines: 9, r: "for (nprobe in c(1, 2, 4, 8, 16)) {", rLines: 13, eli5: "Search only the closest sections and count how many of the true 10 we found and how much looking we did." },
        ],
      },
      flow: {
        title: "IVF search",
        nodes: [
          node("q", "Query embedding", 0, 120, "same model as documents"),
          node("cent", "Centroids", 230, 120, "k-means, L lists"),
          node("probe", "Probe nprobe lists", 460, 120, "closest centroids"),
          node("scan", "Scan candidates", 690, 120, "exact distances"),
          node("topk", "Top k", 900, 120, "recall measured vs exact"),
        ],
        edges: [edge("q", "cent"), edge("cent", "probe"), edge("probe", "scan"), edge("scan", "topk")],
        steps: [
          step("q cent", "q-cent", "The query is compared with the L centroids only, which is cheap."),
          step("cent probe", "cent-probe", "The nprobe closest lists are selected; more lists means higher recall and more work."),
          step("probe scan", "probe-scan", "Vectors in those lists are compared exactly (or with compressed codes in IVF-PQ)."),
          step("scan topk", "scan-topk", "The best k candidates are returned; recall@k against exact search is the quality metric to tune."),
        ],
      },
      practice: [
        {
          id: "w14-ann-recall-1",
          type: "recall",
          prompt: "What does increasing nprobe in IVF or ef in HNSW do?",
          answer: "Both widen the search: more lists or a larger candidate queue are explored, raising recall at the cost of latency. They are query-time knobs tuned against a recall target.",
          rubric: ["Wider search", "Recall up, latency up", "Query-time knob"],
        },
        {
          id: "w14-ann-case-1",
          type: "case",
          prompt: "After switching embedding models, retrieval quality dropped sharply although recall@10 against exact search is still 98%. What is going on?",
          answer: "Recall against exact search only measures the index's approximation, not relevance. The likely cause is mixed embeddings (old documents, new queries) or a model that is worse for this domain. Re-embed all documents with the new model, rebuild the index, and evaluate relevance with labeled queries (hit rate, nDCG), not just ANN recall.",
          rubric: ["ANN recall vs relevance", "Mixed embedding versions", "Re-embed and rebuild", "Relevance eval"],
        },
        {
          id: "w14-ann-design-1",
          type: "design",
          prompt: "Choose an index for 200 million 768-dimensional embeddings with 50 ms p99 latency and limited memory.",
          answer: "Raw float32 vectors need about 200M × 768 × 4 bytes ≈ 614 GB, so use IVF with product quantization (or a disk-based graph index), sharded across nodes, with re-ranking of the top few hundred candidates using full-precision vectors stored on SSD. Tune the number of lists, nprobe and code size against recall@k and p99 latency on real queries.",
          rubric: ["Memory estimate", "Quantization", "Sharding", "Re-ranking", "Measured tuning"],
        },
      ],
      references: [
        { title: "FAISS documentation (wiki)", url: "https://github.com/facebookresearch/faiss/wiki", versionSensitive: true },
        { title: "Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs (Malkov and Yashunin, 2016)", versionSensitive: false },
        { title: "Product Quantization for Nearest Neighbor Search (Jégou, Douze and Schmid, 2011)", versionSensitive: false },
      ],
      lastReviewed: REVIEWED,
    }),
  ],
};
