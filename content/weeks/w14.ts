import { REVIEWED, code, defineTopic, defineWeek, edge, node, step } from "../helpers";

export const topics = [
  defineTopic({
    id: "w14-d01-chunking-ingestion",
    slug: "chunking-ingestion",
    title: "RAG ingestion: parsing, OCR and chunking",
    domain: "rag",
    roles: ["genai-engineer", "ml-engineer", "data-engineer"],
    difficulty: "intermediate",
    minutes: 70,
    prerequisites: ["w13-d01-tokenization-embeddings"],
    objectives: [
      "Normalize raw text and split it into overlapping chunks",
      "Choose chunk size and overlap from the questions users ask",
      "Attach metadata that later enables filtering, citations and freshness",
    ],
    summary:
      "Retrieval-augmented generation answers from your documents, so answer quality starts at ingestion. Parsing (and OCR for scans) extracts clean text; chunking splits it into pieces small enough to retrieve precisely but large enough to carry meaning; metadata makes chunks citable and filterable.",
    eli5: {
      analogy:
        "Cutting a long recipe book into index cards so you can find the right card fast. Each card overlaps a little with the next so no instruction is cut in half and lost, and each card says which book and page it came from.",
      steps: [
        "Clean the text: fix spacing and remove junk like page headers.",
        "Cut it into cards of about the same size.",
        "Repeat the last few words of each card at the start of the next.",
        "Write the source, page and date on every card.",
      ],
      analogyLimit:
        "Fixed-size cards ignore structure: a table or a list can be split mid-row. Real pipelines prefer cutting at headings, paragraphs and sentences, and treat tables and images specially.",
    },
    senior: {
      definition:
        "Ingestion converts source documents into retrievable units: parse (HTML, PDF, OCR for images), normalize, chunk (fixed windows with overlap, recursive by structure, or semantic), embed, and index with metadata such as source, section, version and timestamps.",
      invariants: [
        "Every chunk keeps a pointer to its source and position, so answers can cite it.",
        "Overlap is smaller than chunk size, so the window always advances.",
        "Re-ingesting a changed document replaces its old chunks (keyed by document id and version).",
      ],
      mechanism: [
        "Whitespace normalization collapses newlines and repeated spaces from extraction.",
        "Windows of 16 words advance by 12 (overlap 4), so each boundary phrase appears in two chunks.",
        "The last chunk ends at the final word; no empty or duplicate tail chunk is produced.",
        "Production chunkers count tokens with the embedding model's tokenizer and prefer sentence or heading boundaries.",
      ],
      complexity: "O(n) in document length to normalize and chunk; embedding cost scales with total tokens, so overlap increases cost.",
      tradeoffs: [
        { option: "Small chunks (100 to 300 tokens)", choose: "Precise factoid questions.", cost: "Lose surrounding context; more chunks to store and rank." },
        { option: "Large chunks (500 to 1,000 tokens)", choose: "Questions needing context or reasoning across a section.", cost: "Noisier retrieval and more prompt tokens." },
        { option: "Structure-aware chunking", choose: "Docs with headings, lists and tables.", cost: "Parser complexity per format." },
      ],
      failureModes: [
        "OCR errors and headers or footers polluting chunks.",
        "Tables flattened into unreadable text.",
        "No document versioning, so old policy chunks remain searchable.",
        "Chunk boundaries splitting the key sentence from its qualifier ('except for final sale items').",
      ],
      production:
        "Treat ingestion as a pipeline with tests: sample documents, check parsed text, track chunk counts and token totals, and re-ingest on change with tombstones for removed documents.",
      interviewAnswer:
        "I parse each format properly, with OCR for scans and special handling for tables, normalize text, then chunk by structure where possible, falling back to token windows with about 10 to 20% overlap. Every chunk carries source, section, version and date metadata for citations, filtering and freshness. Chunk size is tuned on an eval set of real questions.",
    },
    implementation: {
      problem: "Normalize a policy document and split it into 16-word chunks with a 4-word overlap.",
      input: "a refund policy of about 50 words with messy line breaks and spaces; size 16, overlap 4",
      python: {
        code: code`
          import re

          RAW = """Refunds are available within 30 days of delivery.\n  Items must be unused and in original packaging.
          Damaged items can be returned at any time with a photo of the damage.   Refunds go back to the original
          payment method within 5 business days.\n\nGift cards and final sale items are not refundable."""


          def normalize(text: str) -> str:
              return re.sub(r"\s+", " ", text).strip()


          def chunk_words(text: str, size: int, overlap: int) -> list[tuple[int, int, str]]:
              if not 0 <= overlap < size:
                  raise ValueError("overlap must be smaller than size")
              words = text.split(" ")
              chunks, start = [], 0
              while True:
                  end = min(start + size, len(words))
                  chunks.append((start, end, " ".join(words[start:end])))
                  if end == len(words):
                      return chunks
                  start += size - overlap


          text = normalize(RAW)
          chunks = chunk_words(text, 16, 4)
          print(f"words={len(text.split(' '))} chunks={len(chunks)}")
          for i, (s, e, c) in enumerate(chunks):
              print(f"[{i}] words {s}-{e - 1}: {c}")
        `,
      },
      r: {
        code: code`
          raw <- "Refunds are available within 30 days of delivery.\n  Items must be unused and in original packaging.
          Damaged items can be returned at any time with a photo of the damage.   Refunds go back to the original
          payment method within 5 business days.\n\nGift cards and final sale items are not refundable."

          normalize <- function(text) trimws(gsub("\\s+", " ", text))

          chunk_words <- function(text, size, overlap) {
            if (overlap < 0 || overlap >= size) stop("overlap must be smaller than size")
            words <- strsplit(text, " ", fixed = TRUE)[[1]]
            chunks <- list()
            start <- 1
            repeat {
              end <- min(start + size - 1, length(words))
              chunks[[length(chunks) + 1]] <- list(start = start - 1, end = end - 1, text = paste(words[start:end], collapse = " "))
              if (end == length(words)) return(chunks)
              start <- start + size - overlap
            }
          }

          text <- normalize(raw)
          chunks <- chunk_words(text, 16, 4)
          cat(sprintf("words=%d chunks=%d\n", length(strsplit(text, " ", fixed = TRUE)[[1]]), length(chunks)))
          for (i in seq_along(chunks)) {
            ch <- chunks[[i]]
            cat(sprintf("[%d] words %d-%d: %s\n", i - 1, as.integer(ch$start), as.integer(ch$end), ch$text))
          }
        `,
      },
      expectedOutput: code`
        words=51 chunks=4
        [0] words 0-15: Refunds are available within 30 days of delivery. Items must be unused and in original packaging.
        [1] words 12-27: and in original packaging. Damaged items can be returned at any time with a photo of
        [2] words 24-39: with a photo of the damage. Refunds go back to the original payment method within 5
        [3] words 36-50: payment method within 5 business days. Gift cards and final sale items are not refundable.
      `,
      tests: {
        python: code`
          def test_every_word_is_covered():
              covered = set()
              for s, e, _ in chunks:
                  covered.update(range(s, e))
              assert covered == set(range(len(text.split(" "))))


          def test_consecutive_chunks_overlap():
              for (s1, e1, _), (s2, _, _) in zip(chunks, chunks[1:]):
                  assert e1 - s2 == 4


          def test_bad_overlap_is_rejected():
              try:
                  chunk_words(text, 5, 5)
              except ValueError:
                  return
              raise AssertionError("expected ValueError")
        `,
        r: code`
          test_that("normalization collapses whitespace", {
            expect_identical(normalize("a \n\n  b "), "a b")
          })

          test_that("a bad overlap is rejected", {
            expect_error(chunk_words(text, 5, 5), "overlap")
          })

          test_that("the last chunk ends at the last word", {
            last <- chunks[[length(chunks)]]
            expect_equal(last$end + 1, length(strsplit(text, " ", fixed = TRUE)[[1]]))
          })
        `,
      },
      eli5Trace: [
        "Messy line breaks and double spaces become single spaces.",
        "The first card holds words 0 to 15.",
        "The next card starts 12 words later, so its first 4 words repeat the end of the previous card.",
        "Cards continue until one reaches the final word.",
      ],
      complexity: { time: "O(n)", space: "O(n * (1 + overlap / size))" },
      edgeCases: [
        "A document shorter than the chunk size produces exactly one chunk.",
        "Overlap equal to or larger than size would never advance, so it is rejected.",
        "Word counts are a stand-in; embedding limits are in tokens of the embedding model.",
        "R and Python use 0-based word positions in the printout so chunk ranges match.",
      ],
      incorrect: {
        language: "python",
        code: code`
          chunks = [words[i:i + size] for i in range(0, len(words), size)]
        `,
        whyWrong: "Without overlap, a sentence that straddles a boundary is split, and neither chunk contains the whole fact, so retrieval can miss it.",
        fix: "Advance by size - overlap, or split on sentence and heading boundaries.",
      },
    },
    flow: {
      title: "Ingestion pipeline",
      nodes: [
        node("source", "Source docs", 0, 110, "PDF, HTML, scans"),
        node("parse", "Parse / OCR", 220, 110, "text + structure"),
        node("normalize", "Normalize", 440, 110, "whitespace, headers"),
        node("chunk", "Chunk", 660, 110, "16 words, overlap 4"),
        node("meta", "Metadata", 660, 250, "source, version, date"),
        node("index", "Embed + index", 880, 110, "searchable chunks"),
      ],
      edges: [edge("source", "parse"), edge("parse", "normalize"), edge("normalize", "chunk"), edge("chunk", "index"), edge("meta", "index")],
      steps: [
        step("source parse", "source-parse", "Parse each format; scanned pages need OCR, and tables need structure-aware handling."),
        step("normalize", "parse-normalize", "Normalize whitespace and strip repeated headers and footers."),
        step("chunk", "normalize-chunk", "Split into overlapping windows so boundary sentences appear whole in at least one chunk."),
        step("meta", "", "Attach source, section, version and date to every chunk."),
        step("index", "chunk-index meta-index", "Embed and index chunks with their metadata for retrieval and citations."),
      ],
    },
    practice: [
      {
        id: "w14-chunk-design-1",
        type: "design",
        prompt: "Your RAG system answers HR policy questions. Policies are updated quarterly and old versions must not be cited. Design ingestion.",
        answer: "Parse policies by section; chunk on headings with token windows inside long sections; metadata with policy id, version, effective date and URL; on update, re-ingest and tombstone old versions; filter retrieval to current versions; nightly diff checks of chunk counts.",
        rubric: ["Section-aware chunking", "Version metadata and tombstones", "Filtered retrieval", "Monitoring"],
      },
      {
        id: "w14-chunk-recall-1",
        type: "recall",
        prompt: "What goes wrong with very large chunks?",
        answer: "Embeddings average over many topics, so similarity to a specific question drops; prompts get long and expensive; the model must find the needle inside each chunk.",
        rubric: ["Diluted embeddings", "Cost", "Needle in chunk"],
      },
    ],
    references: [
      { title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks (Lewis et al., 2020)", url: "https://arxiv.org/abs/2005.11401", versionSensitive: false },
      { title: "LangChain documentation: text splitters", versionSensitive: true },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w14-d02-bm25-hybrid-retrieval",
    slug: "bm25-hybrid-retrieval",
    title: "BM25, dense and hybrid retrieval",
    domain: "rag",
    roles: ["genai-engineer", "ml-engineer", "sde"],
    difficulty: "intermediate",
    minutes: 80,
    prerequisites: ["w14-d01-chunking-ingestion", "w03-d01-hashing-patterns"],
    objectives: [
      "Score documents with BM25 and explain term frequency saturation and length normalization",
      "Fuse lexical and dense rankings with reciprocal rank fusion",
      "Describe vector indexes (HNSW, IVF) and when to rerank",
    ],
    summary:
      "Lexical retrieval (BM25) matches exact words and excels at names, codes and rare terms; dense retrieval matches meaning. Hybrid search combines both, and reciprocal rank fusion merges rankings without calibrating their scores.",
    eli5: {
      analogy:
        "Two librarians search for you. One looks for books containing your exact words, giving extra points for rare words. The other understands what you mean even with different words. You combine their top picks by giving points for how high each book appears on each list.",
      steps: [
        "Split the question and each document into words.",
        "BM25 gives a document points for each question word it contains, more for rare words, with diminishing returns for repeats and a penalty for very long documents.",
        "The meaning-based librarian hands over its own ranked list.",
        "Each document earns 1 / (60 + its rank) from each list; add them and sort.",
      ],
      analogyLimit:
        "The word librarian misses 'refunds' when you typed 'refund' unless words are normalized (stemming), and the meaning librarian can confidently return something similar but wrong. That is why the two are combined and checked.",
    },
    senior: {
      definition:
        "BM25(q, d) = sum over query terms t of IDF(t) * tf(t, d) * (k1 + 1) / (tf(t, d) + k1 * (1 - b + b * |d| / avgdl)), with IDF(t) = ln(1 + (N - n_t + 0.5) / (n_t + 0.5)). RRF(d) = sum over rankings r of 1 / (k + rank_r(d)), typically k = 60.",
      invariants: [
        "k1 controls term-frequency saturation; b controls document-length normalization.",
        "Terms in every document get a small but positive IDF with this variant.",
        "RRF uses only ranks, so it needs no score calibration between retrievers.",
      ],
      mechanism: [
        "The query 'refund policy for damaged items' matches d5 on refund, policy, damaged and items; d1 says 'refunds' and misses the exact term.",
        "The dense retriever (its ranking is fixed for this example) puts d1 first because it understands refunds and refund mean the same thing.",
        "RRF rewards documents ranked high by both: d1 (third by BM25, first by dense) and d5 (first by BM25, third by dense) tie at the top, just ahead of d3.",
        "At scale, dense vectors live in approximate nearest neighbor indexes (HNSW graphs, IVF with product quantization); a cross-encoder reranker reorders the top candidates.",
      ],
      complexity: "BM25 with an inverted index: proportional to postings of query terms. HNSW search: roughly O(log N) per query with tunable recall. Reranking: one model call per candidate.",
      tradeoffs: [
        { option: "BM25 only", choose: "Exact identifiers, legal or code search, no embedding budget.", cost: "Misses paraphrases and synonyms." },
        { option: "Dense only", choose: "Natural-language questions over prose.", cost: "Weak on rare tokens, product codes and new jargon." },
        { option: "Hybrid + reranker", choose: "Production RAG where quality matters.", cost: "Two indexes and a reranking latency budget." },
      ],
      failureModes: [
        "No stemming or normalization, so singular and plural do not match lexically.",
        "Fusing raw scores from different retrievers as if they were comparable.",
        "ANN index parameters tuned for speed with silently low recall.",
        "Embedding model changes without re-embedding the corpus.",
      ],
      production:
        "Measure retrieval separately from generation (recall@k on labeled questions). Most RAG quality wins come from hybrid retrieval, metadata filters and reranking before any prompt tuning.",
      interviewAnswer:
        "I run BM25 and dense retrieval in parallel: BM25 catches exact terms and identifiers, dense catches paraphrases. I fuse them with reciprocal rank fusion, which only needs ranks, then rerank the top 20 to 50 with a cross-encoder. Dense vectors sit in an HNSW index, and I measure recall@k on a labeled question set to tune it.",
    },
    implementation: {
      problem: "Rank five documents with BM25 for a query, then fuse with a dense ranking using reciprocal rank fusion.",
      input: "query 'refund policy for damaged items'; d1..d5 short policy and support texts; dense ranking fixed as d1, d3, d5, d2, d4; k1 = 1.2, b = 0.75, RRF k = 60",
      python: {
        code: code`
          import re
          from collections import Counter
          from math import log

          DOCS = {
              "d1": "Refunds are issued within 14 days for damaged items",
              "d2": "Our shipping policy covers international orders",
              "d3": "Damaged items can be returned for a full refund",
              "d4": "Track your order status in the account page",
              "d5": "Refund policy: items must be unused unless damaged",
          }
          DENSE_RANKING = ["d1", "d3", "d5", "d2", "d4"]


          def tokenize(text: str) -> list[str]:
              return re.findall(r"[a-z0-9]+", text.lower())


          def bm25(query: str, docs: dict[str, str], k1: float = 1.2, b: float = 0.75) -> dict[str, float]:
              toks = {d: tokenize(t) for d, t in docs.items()}
              n = len(docs)
              avgdl = sum(len(t) for t in toks.values()) / n
              df = Counter(term for t in toks.values() for term in set(t))
              scores = {}
              for d, t in toks.items():
                  tf, score = Counter(t), 0.0
                  for q in tokenize(query):
                      if tf[q]:
                          idf = log(1 + (n - df[q] + 0.5) / (df[q] + 0.5))
                          score += idf * tf[q] * (k1 + 1) / (tf[q] + k1 * (1 - b + b * len(t) / avgdl))
                  scores[d] = score
              return scores


          def rrf(rankings: list[list[str]], k: int = 60) -> dict[str, float]:
              fused: dict[str, float] = {}
              for ranking in rankings:
                  for rank, d in enumerate(ranking, 1):
                      fused[d] = fused.get(d, 0.0) + 1 / (k + rank)
              return fused


          scores = bm25("refund policy for damaged items", DOCS)
          bm25_ranking = sorted(scores, key=lambda d: (-scores[d], d))
          print("bm25: " + " ".join(f"{d}={scores[d]:.4f}" for d in bm25_ranking))
          print("dense: " + " ".join(DENSE_RANKING))
          fused = rrf([bm25_ranking, DENSE_RANKING])
          print("rrf: " + " ".join(f"{d}={fused[d]:.5f}" for d in sorted(fused, key=lambda d: (-fused[d], d))))
        `,
      },
      r: {
        code: code`
          docs <- c(
            d1 = "Refunds are issued within 14 days for damaged items",
            d2 = "Our shipping policy covers international orders",
            d3 = "Damaged items can be returned for a full refund",
            d4 = "Track your order status in the account page",
            d5 = "Refund policy: items must be unused unless damaged"
          )
          dense_ranking <- c("d1", "d3", "d5", "d2", "d4")

          tokenize <- function(text) regmatches(tolower(text), gregexpr("[a-z0-9]+", tolower(text)))[[1]]

          bm25 <- function(query, docs, k1 = 1.2, b = 0.75) {
            toks <- lapply(docs, tokenize)
            n <- length(docs)
            avgdl <- mean(lengths(toks))
            df <- table(unlist(lapply(toks, unique)))
            sapply(toks, function(t) {
              score <- 0
              for (q in tokenize(query)) {
                tf <- sum(t == q)
                if (tf > 0) {
                  idf <- log(1 + (n - df[[q]] + 0.5) / (df[[q]] + 0.5))
                  score <- score + idf * tf * (k1 + 1) / (tf + k1 * (1 - b + b * length(t) / avgdl))
                }
              }
              score
            })
          }

          rrf <- function(rankings, k = 60) {
            fused <- numeric(0)
            for (ranking in rankings) {
              for (rank in seq_along(ranking)) {
                d <- ranking[rank]
                fused[d] <- (if (is.na(fused[d])) 0 else fused[[d]]) + 1 / (k + rank)
              }
            }
            fused
          }

          scores <- bm25("refund policy for damaged items", docs)
          bm25_ranking <- names(scores)[order(-scores, names(scores), method = "radix")]
          cat("bm25: ", paste(sprintf("%s=%.4f", bm25_ranking, scores[bm25_ranking]), collapse = " "), "\n", sep = "")
          cat("dense: ", paste(dense_ranking, collapse = " "), "\n", sep = "")
          fused <- rrf(list(bm25_ranking, dense_ranking))
          ord <- names(fused)[order(-fused, names(fused), method = "radix")]
          cat("rrf: ", paste(sprintf("%s=%.5f", ord, fused[ord]), collapse = " "), "\n", sep = "")
        `,
      },
      expectedOutput: code`
        bm25: d5=2.8289 d3=2.6913 d1=1.8584 d2=0.9752 d4=0.0000
        dense: d1 d3 d5 d2 d4
        rrf: d1=0.03227 d5=0.03227 d3=0.03226 d2=0.03125 d4=0.03077
      `,
      tests: {
        python: code`
          def test_document_without_query_terms_scores_zero():
              assert scores["d4"] == 0


          def test_rare_terms_weigh_more():
              d = {"a": "refund", "b": "items", "c": "items", "e": "items"}
              s = bm25("refund items", d)
              assert s["a"] > s["b"]


          def test_rrf_rewards_agreement():
              f = rrf([["x", "y"], ["x", "z"]])
              assert f["x"] > f["y"] and f["x"] > f["z"]
        `,
        r: code`
          test_that("a document without query terms scores zero", {
            expect_equal(scores[["d4"]], 0)
          })

          test_that("RRF rewards agreement between rankings", {
            f <- rrf(list(c("x", "y"), c("x", "z")))
            expect_gt(f[["x"]], f[["y"]])
          })
        `,
      },
      eli5Trace: [
        "d5 contains refund, policy, damaged and items: it tops the word librarian's list.",
        "d1 says 'Refunds', which does not match 'refund' exactly, so it only scores on 'for', 'damaged' and 'items'.",
        "The meaning librarian ranks d1 first because refunds and refund mean the same thing.",
        "Combining by rank lifts documents that both librarians like: the fused list starts with them.",
      ],
      complexity: { time: "O(total tokens) for this small BM25; inverted indexes make it sublinear", space: "O(vocabulary + documents)" },
      edgeCases: [
        "A query term in no document is skipped (no division by zero).",
        "Ties in score are broken by document id so both languages agree.",
        "Very short documents get a length-normalization boost; b = 0 turns it off.",
        "The dense ranking is a fixed example list, not computed by a model here.",
      ],
      incorrect: {
        language: "python",
        code: code`
          fused = {d: scores.get(d, 0) + dense_scores.get(d, 0) for d in DOCS}
        `,
        whyWrong: "BM25 scores and cosine similarities live on different, uncalibrated scales, so adding them lets one retriever dominate arbitrarily.",
        fix: "Fuse ranks with RRF, or normalize and learn weights on labeled data.",
      },
    },
    flow: {
      title: "Hybrid retrieval with reciprocal rank fusion",
      nodes: [
        node("query", "Query", 0, 110, "refund policy for damaged items"),
        node("bm25", "BM25", 250, 30, "exact terms"),
        node("dense", "Dense ANN", 250, 190, "meaning"),
        node("rrf", "Reciprocal rank fusion", 520, 110, "1 / (60 + rank)"),
        node("rerank", "Reranker", 760, 110, "cross-encoder top-k"),
        node("context", "Context for the LLM", 960, 110, "cited chunks"),
      ],
      edges: [edge("query", "bm25"), edge("query", "dense"), edge("bm25", "rrf"), edge("dense", "rrf"), edge("rrf", "rerank"), edge("rerank", "context")],
      steps: [
        step("query bm25", "query-bm25", "BM25 scores exact term matches, weighting rare terms and saturating repeats."),
        step("query dense", "query-dense", "The dense retriever finds semantically similar chunks, even with different words."),
        step("rrf", "bm25-rrf dense-rrf", "RRF adds 1 / (60 + rank) from each list, so agreement wins without calibrating scores."),
        step("rerank", "rrf-rerank", "A cross-encoder reranks the fused top candidates by reading query and chunk together."),
        step("context", "rerank-context", "The best few chunks go into the prompt with their citations."),
      ],
    },
    practice: [
      {
        id: "w14-retrieval-recall-1",
        type: "recall",
        prompt: "Why does hybrid search beat dense-only search on queries like 'error E1043 on model XR-7'?",
        answer: "Identifiers like E1043 and XR-7 are rare exact tokens that BM25 matches precisely, while embeddings may map them to generic 'error' semantics.",
        rubric: ["Rare exact tokens", "Embedding weakness on identifiers"],
      },
      {
        id: "w14-retrieval-recall-2",
        type: "recall",
        prompt: "What does an HNSW index trade off, and which parameters control it?",
        answer: "Search speed and memory versus recall. M (graph degree) and efConstruction affect build quality and memory; efSearch controls recall versus latency at query time.",
        rubric: ["Speed versus recall", "Names efSearch and M"],
      },
    ],
    references: [
      { title: "The Probabilistic Relevance Framework: BM25 and Beyond (Robertson and Zaragoza, 2009)", versionSensitive: false },
      { title: "Reciprocal rank fusion outperforms Condorcet and individual rank learning methods (Cormack, Clarke, Buettcher, 2009)", versionSensitive: false },
      { title: "Efficient and robust approximate nearest neighbor search using HNSW graphs (Malkov and Yashunin)", url: "https://arxiv.org/abs/1603.09320", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w14-d03-rag-evaluation",
    slug: "rag-evaluation",
    title: "Reranking, grounding and RAG evaluation",
    domain: "rag",
    roles: ["genai-engineer", "ml-engineer", "data-scientist"],
    difficulty: "advanced",
    minutes: 85,
    prerequisites: ["w14-d02-bm25-hybrid-retrieval", "w07-d03-classification-metrics"],
    objectives: [
      "Compute recall@k, MRR and nDCG@k for retrieval",
      "Check whether answer sentences are supported by retrieved context",
      "Build an evaluation set and separate retrieval failures from generation failures",
    ],
    summary:
      "RAG fails in two places: retrieval misses the right chunk, or generation says something the chunks do not support. Measuring each separately (retrieval metrics and groundedness) tells you which part to fix.",
    eli5: {
      analogy:
        "Grading a student's open-book exam. First: did they open the book to the right pages? Second: does each sentence of their answer actually appear in those pages, or did they make something up?",
      steps: [
        "For each test question, list which pages are the right ones.",
        "Check how many right pages the student opened in their top three (recall), and how early the first right page came (reciprocal rank).",
        "For each sentence of the answer, check whether its key words appear in the opened pages.",
        "Sentences with little support are flagged as possibly made up.",
      ],
      analogyLimit:
        "Matching key words is a rough check: a sentence can reuse the page's words and still contradict it, or paraphrase correctly with different words. Real groundedness checks use entailment models or LLM judges validated against human labels.",
    },
    senior: {
      definition:
        "Recall@k = |relevant in top k| / |relevant|. MRR = mean over queries of 1 / rank of the first relevant result (0 if none). nDCG@k = DCG@k / IDCG@k with DCG = sum of rel_i / log2(i + 1). Groundedness (faithfulness) = share of answer claims supported by the retrieved context.",
      invariants: [
        "Retrieval metrics need labeled relevant chunks per question.",
        "IDCG uses the best possible ordering, so nDCG lies in [0, 1].",
        "A groundedness score only checks support, not whether the answer addresses the question (answer relevance) or is complete.",
      ],
      mechanism: [
        "Query 1 finds one of its two relevant documents at rank 2, query 2 finds its only one at rank 1, query 3 finds nothing.",
        "The mean metrics summarize the eval set; per-query rows show where retrieval fails.",
        "The lexical groundedness check marks a sentence supported if at least 60% of its content words occur in the context.",
        "The third answer sentence ('Shipping costs are always refunded') has no support: a hallucination the check catches.",
      ],
      complexity: "Metrics are O(k) per query. Judge-based groundedness costs one model call per answer or claim.",
      tradeoffs: [
        { option: "Lexical overlap checks", choose: "Cheap smoke tests in CI.", cost: "Miss paraphrases and contradictions." },
        { option: "NLI or LLM-as-judge", choose: "Faithfulness scoring at scale.", cost: "Judge errors and bias; must be validated against human labels." },
        { option: "Human evaluation", choose: "Ground truth for high-stakes domains and judge calibration.", cost: "Slow and expensive." },
      ],
      failureModes: [
        "Evaluating only final answers, so retrieval and generation failures are indistinguishable.",
        "An eval set of easy, synthetic questions that does not match real traffic.",
        "LLM judges grading their own family's outputs leniently.",
        "No regression gate, so prompt or index changes ship untested.",
      ],
      production:
        "Keep a versioned eval set built from real questions (including adversarial and out-of-scope ones), run it on every change to prompts, models, chunking or indexes, and track retrieval recall, groundedness, answer relevance, refusal accuracy, latency and cost together.",
      interviewAnswer:
        "I evaluate retrieval and generation separately. Retrieval: recall@k, MRR and nDCG@k on labeled questions. Generation: groundedness (each claim supported by retrieved context), answer relevance, and correct refusals when the answer is not in the corpus. I use NLI or an LLM judge validated on human labels, and run the suite as a regression gate on every change.",
    },
    implementation: {
      problem: "Compute recall@3, MRR and nDCG@3 for three queries, then check which answer sentences are supported by the retrieved context.",
      input: "q1 retrieved d3 d1 d7, relevant d1 d5; q2 retrieved d2 d4 d9, relevant d2; q3 retrieved d8 d6 d5, relevant d4; a three-sentence answer and a two-sentence context",
      python: {
        code: code`
          import re
          from math import log2

          RUNS = [
              (["d3", "d1", "d7"], {"d1", "d5"}),
              (["d2", "d4", "d9"], {"d2"}),
              (["d8", "d6", "d5"], {"d4"}),
          ]
          CONTEXT = "Damaged items can be returned at any time with a photo. Refunds go to the original payment method within 5 business days."
          ANSWER = "You can return damaged items at any time if you include a photo. The refund arrives within 5 business days. Shipping costs are always refunded."
          STOPWORDS = {"with", "your", "that", "this", "from", "have", "will", "into", "them", "they"}


          def metrics(retrieved: list[str], relevant: set[str], k: int = 3) -> tuple[float, float, float]:
              top = retrieved[:k]
              recall = len(set(top) & relevant) / len(relevant)
              rr = next((1 / i for i, d in enumerate(top, 1) if d in relevant), 0.0)
              dcg = sum(1 / log2(i + 1) for i, d in enumerate(top, 1) if d in relevant)
              idcg = sum(1 / log2(i + 1) for i in range(1, min(len(relevant), k) + 1))
              return recall, rr, dcg / idcg


          def content_words(text: str) -> list[str]:
              return [w for w in re.findall(r"[a-z]+", text.lower()) if len(w) >= 4 and w not in STOPWORDS]


          rows = [metrics(r, rel) for r, rel in RUNS]
          for i, (rec, rr, ndcg) in enumerate(rows, 1):
              print(f"q{i}: recall@3={rec:.3f} rr={rr:.3f} ndcg@3={ndcg:.3f}")
          print(f"mean: recall@3={sum(r[0] for r in rows) / 3:.3f} mrr={sum(r[1] for r in rows) / 3:.3f} ndcg@3={sum(r[2] for r in rows) / 3:.3f}")

          context = set(content_words(CONTEXT))
          supported = 0
          for sentence in re.split(r"(?<=[.!?])\s+", ANSWER):
              words = content_words(sentence)
              share = sum(w in context for w in words) / len(words)
              ok = share >= 0.6
              supported += ok
              print(f"{'supported' if ok else 'UNSUPPORTED'} ({share:.2f}): {sentence}")
          print(f"groundedness: {supported}/3")
        `,
      },
      r: {
        code: code`
          runs <- list(
            list(retrieved = c("d3", "d1", "d7"), relevant = c("d1", "d5")),
            list(retrieved = c("d2", "d4", "d9"), relevant = "d2"),
            list(retrieved = c("d8", "d6", "d5"), relevant = "d4")
          )
          context_text <- "Damaged items can be returned at any time with a photo. Refunds go to the original payment method within 5 business days."
          answer <- "You can return damaged items at any time if you include a photo. The refund arrives within 5 business days. Shipping costs are always refunded."
          stopwords <- c("with", "your", "that", "this", "from", "have", "will", "into", "them", "they")

          metrics <- function(retrieved, relevant, k = 3) {
            top <- retrieved[seq_len(k)]
            hits <- top %in% relevant
            recall <- sum(hits) / length(relevant)
            rr <- if (any(hits)) 1 / which(hits)[1] else 0
            dcg <- sum(1 / log2(which(hits) + 1))
            idcg <- sum(1 / log2(seq_len(min(length(relevant), k)) + 1))
            c(recall = recall, rr = rr, ndcg = dcg / idcg)
          }

          content_words <- function(text) {
            w <- regmatches(tolower(text), gregexpr("[a-z]+", tolower(text)))[[1]]
            w[nchar(w) >= 4 & !(w %in% stopwords)]
          }

          rows <- t(sapply(runs, function(r) metrics(r$retrieved, r$relevant)))
          for (i in seq_len(nrow(rows))) {
            cat(sprintf("q%d: recall@3=%.3f rr=%.3f ndcg@3=%.3f\n", i, rows[i, "recall"], rows[i, "rr"], rows[i, "ndcg"]))
          }
          cat(sprintf("mean: recall@3=%.3f mrr=%.3f ndcg@3=%.3f\n", mean(rows[, "recall"]), mean(rows[, "rr"]), mean(rows[, "ndcg"])))

          context <- unique(content_words(context_text))
          supported <- 0L
          for (sentence in strsplit(answer, "(?<=[.!?])\\s+", perl = TRUE)[[1]]) {
            words <- content_words(sentence)
            share <- mean(words %in% context)
            ok <- share >= 0.6
            supported <- supported + as.integer(ok)
            cat(sprintf("%s (%.2f): %s\n", if (ok) "supported" else "UNSUPPORTED", share, sentence))
          }
          cat(sprintf("groundedness: %d/3\n", supported))
        `,
      },
      expectedOutput: code`
        q1: recall@3=0.500 rr=0.500 ndcg@3=0.387
        q2: recall@3=1.000 rr=1.000 ndcg@3=1.000
        q3: recall@3=0.000 rr=0.000 ndcg@3=0.000
        mean: recall@3=0.500 mrr=0.500 ndcg@3=0.462
        supported (0.67): You can return damaged items at any time if you include a photo.
        supported (0.60): The refund arrives within 5 business days.
        UNSUPPORTED (0.00): Shipping costs are always refunded.
        groundedness: 2/3
      `,
      tests: {
        python: code`
          def test_perfect_retrieval_scores_one():
              assert metrics(["a", "b", "c"], {"a", "b"}) == (1.0, 1.0, 1.0)


          def test_no_hits_scores_zero():
              assert metrics(["x", "y", "z"], {"a"}) == (0.0, 0.0, 0.0)


          def test_ndcg_rewards_earlier_hits():
              assert metrics(["a", "x", "y"], {"a"})[2] > metrics(["x", "y", "a"], {"a"})[2]
        `,
        r: code`
          test_that("perfect retrieval scores one", {
            expect_equal(unname(metrics(c("a", "b", "c"), c("a", "b"))), c(1, 1, 1))
          })

          test_that("no hits scores zero", {
            expect_equal(unname(metrics(c("x", "y", "z"), "a")), c(0, 0, 0))
          })

          test_that("nDCG rewards earlier hits", {
            expect_gt(metrics(c("a", "x", "y"), "a")[["ndcg"]], metrics(c("x", "y", "a"), "a")[["ndcg"]])
          })
        `,
      },
      eli5Trace: [
        "Question 1 opened one of its two right pages, second in line: half recall, reciprocal rank one half.",
        "Question 2 opened its only right page first: perfect scores.",
        "Question 3 never opened the right page: zeros. Retrieval needs work here before blaming the writer.",
        "The first two answer sentences mostly reuse words from the pages; the third, about shipping costs, appears nowhere: unsupported.",
      ],
      complexity: { time: "O(k) per query, O(words) per sentence check", space: "O(context vocabulary)" },
      edgeCases: [
        "A question with no relevant documents makes recall undefined; out-of-scope questions are scored on refusal instead.",
        "'refund' versus 'refunds' fails the lexical match; stemming or a model-based judge handles it.",
        "A sentence with no content words would divide by zero; skip or treat as neutral.",
        "Lookbehind regexes need perl = TRUE in R's strsplit.",
      ],
      incorrect: {
        language: "python",
        code: code`
          idcg = sum(1 / log2(i + 1) for i in range(1, k + 1))
        `,
        whyWrong: "The ideal ranking can only place as many relevant documents as exist; using k slots makes IDCG too large and nDCG can never reach 1 for queries with one relevant document.",
        fix: "Sum over min(number of relevant documents, k) positions.",
      },
    },
    flow: {
      title: "Diagnosing a RAG failure",
      nodes: [
        node("question", "Eval question", 0, 110, "labeled relevant chunks"),
        node("retrieve", "Retrieval", 230, 110, "top-k chunks"),
        node("rmetrics", "Retrieval metrics", 460, 30, "recall@k, MRR, nDCG"),
        node("generate", "Generation", 460, 190, "answer from context"),
        node("ground", "Groundedness", 700, 190, "claims supported?"),
        node("verdict", "Fix the right part", 920, 110, "index or prompt"),
      ],
      edges: [edge("question", "retrieve"), edge("retrieve", "rmetrics"), edge("retrieve", "generate"), edge("generate", "ground"), edge("rmetrics", "verdict"), edge("ground", "verdict")],
      steps: [
        step("question retrieve", "question-retrieve", "Each eval question has labeled relevant chunks, so retrieval can be scored on its own."),
        step("rmetrics", "retrieve-rmetrics", "Recall@3, reciprocal rank and nDCG@3 show q3 retrieved nothing relevant."),
        step("generate", "retrieve-generate", "The model answers from the retrieved context."),
        step("ground", "generate-ground", "Each answer sentence is checked against the context; the shipping claim has no support."),
        step("verdict", "rmetrics-verdict ground-verdict", "Low recall means fix retrieval; low groundedness with good recall means fix the prompt or model."),
      ],
    },
    practice: [
      {
        id: "w14-eval-design-1",
        type: "design",
        prompt: "Build an evaluation plan for an internal policy assistant before launch.",
        answer: "Collect 200+ real questions with labeled source chunks and reference answers, including out-of-scope and adversarial ones. Metrics: recall@5 and MRR for retrieval; groundedness, answer correctness and refusal accuracy for generation; latency and cost. Validate an LLM judge against 50 human-graded answers. Run on every change as a gate with per-category breakdowns.",
        rubric: ["Real questions with labels", "Separate retrieval and generation metrics", "Judge validation", "Regression gate"],
      },
      {
        id: "w14-eval-recall-1",
        type: "recall",
        prompt: "Retrieval recall@5 is 0.95 but users still report wrong answers. Where do you look?",
        answer: "Generation: check groundedness and whether the answer uses the right chunk; look for conflicting or outdated chunks in context, prompt instructions, and context ordering or length (lost in the middle).",
        rubric: ["Groundedness", "Conflicting or stale context", "Prompt and context length"],
      },
    ],
    references: [
      { title: "RAGAS: Automated Evaluation of Retrieval Augmented Generation (Es et al., 2023)", url: "https://arxiv.org/abs/2309.15217", versionSensitive: true },
      { title: "Lost in the Middle: How Language Models Use Long Contexts (Liu et al., 2023)", url: "https://arxiv.org/abs/2307.03172", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),
];

export const week = defineWeek({
  number: 14,
  slug: "rag-and-evaluation",
  title: "RAG and evaluation",
  track: "ai",
  domains: ["rag"],
  summary:
    "Ingestion, OCR and chunking, BM25, dense and hybrid retrieval, vector indexes, reranking, grounding, RAG metrics and safety.",
  outcomes: [
    "Build an ingestion and chunking pipeline with metadata",
    "Combine lexical and dense retrieval and know when to rerank",
    "Evaluate retrieval and generation separately and gate releases on it",
  ],
  roles: ["genai-engineer", "ml-engineer", "data-engineer", "sde"],
  days: [
    {
      id: "w14-d01",
      day: 1,
      kind: "concept-map",
      title: "Ingestion and chunking",
      summary: "Parsing, normalization, chunk size, overlap and metadata.",
      minutes: 75,
      goals: ["Chunk a document with overlap in both languages", "Design versioned ingestion"],
      tasks: [
        { label: "Concept map and ELI5", minutes: 15 },
        { label: "Run the chunker and tests", minutes: 25 },
        { label: "HR policy ingestion design", minutes: 25 },
        { label: "Recall prompt", minutes: 10 },
      ],
      topicIds: ["w14-d01-chunking-ingestion"],
    },
    {
      id: "w14-d02",
      day: 2,
      kind: "theory-lab",
      title: "BM25, dense and hybrid retrieval",
      summary: "Lexical scoring by hand and rank fusion.",
      minutes: 85,
      goals: ["Explain each BM25 term", "Fuse rankings with RRF"],
      tasks: [
        { label: "Step through the hybrid diagram", minutes: 15 },
        { label: "Run BM25 and RRF", minutes: 30 },
        { label: "Identifier search and HNSW prompts", minutes: 25 },
        { label: "Write the interview answer", minutes: 15 },
      ],
      topicIds: ["w14-d02-bm25-hybrid-retrieval"],
    },
    {
      id: "w14-d03",
      day: 3,
      kind: "implementation",
      title: "RAG evaluation and grounding",
      summary: "Retrieval metrics, groundedness checks and an eval plan.",
      minutes: 90,
      goals: ["Compute recall, MRR and nDCG", "Separate retrieval and generation failures"],
      tasks: [
        { label: "Read the open-book analogy and its limit", minutes: 10 },
        { label: "Run the metrics and groundedness example", minutes: 30 },
        { label: "Evaluation plan design", minutes: 35 },
        { label: "Recall prompt", minutes: 15 },
      ],
      topicIds: ["w14-d03-rag-evaluation"],
    },
    {
      id: "w14-d04",
      day: 4,
      kind: "applied-practice",
      title: "RAG diagnosis drills",
      summary: "Diagnose broken RAG systems from symptoms and traces.",
      minutes: 80,
      goals: ["Correctly diagnose each RAG failure scenario"],
      tasks: [
        { label: "RAG diagnosis drills in Practice", minutes: 50 },
        { label: "Topic drills with confidence ratings", minutes: 20 },
        { label: "Log weak spots", minutes: 10 },
      ],
      topicIds: ["w14-d01-chunking-ingestion", "w14-d02-bm25-hybrid-retrieval", "w14-d03-rag-evaluation"],
    },
    {
      id: "w14-d05",
      day: 5,
      kind: "production-lens",
      title: "The bot that cites the wrong policy",
      summary: "Freshness, access control and prompt injection in production RAG.",
      minutes: 65,
      goals: ["Fix stale and unsafe retrieval without breaking quality"],
      tasks: [
        { label: "Read the scenario", minutes: 10 },
        { label: "Answer the case questions", minutes: 40 },
        { label: "Compare against the rubric", minutes: 15 },
      ],
      topicIds: ["w14-d01-chunking-ingestion", "w14-d02-bm25-hybrid-retrieval", "w14-d03-rag-evaluation"],
      productionCase: {
        title: "An HR assistant quoting last year's leave policy",
        scenario:
          "An internal RAG assistant answers HR questions. Employees report it quotes last year's parental leave policy, a contractor saw a summary of an executive compensation document, and one uploaded document contained hidden text telling the assistant to approve all requests.",
        constraints: [
          "Documents live in a wiki with page-level permissions.",
          "Policies change several times a year.",
          "Legal requires citations for every policy answer.",
        ],
        questions: [
          "Why is the old policy retrieved, and how do you fix it durably?",
          "How do you enforce document permissions in retrieval?",
          "How do you defend against instructions hidden in documents?",
          "What evaluation and monitoring would you add?",
        ],
        rubric: [
          "Version and effective-date metadata, tombstoning old versions, filtering to current versions",
          "Permission-aware retrieval: filter by the asking user's access before ranking, never after generation",
          "Treat retrieved text as data: separate it from instructions, strip or flag hidden text, restrict tool permissions, and test with injection cases",
          "Eval set with policy questions and permission and injection tests; monitor citation coverage and refusal rates",
        ],
        pitfalls: ["Asking the model to 'ignore outdated documents'", "Filtering sensitive content only in the final answer"],
      },
    },
    {
      id: "w14-d06",
      day: 6,
      kind: "interview-simulation",
      title: "RAG system design interview",
      summary: "Design a RAG assistant end to end, including evaluation and safety.",
      minutes: 60,
      goals: ["Cover ingestion, retrieval, generation, evaluation and safety in time"],
      tasks: [
        { label: "Timed RAG design", minutes: 45 },
        { label: "Self-score with the rubric", minutes: 15 },
      ],
      topicIds: ["w14-d01-chunking-ingestion", "w14-d02-bm25-hybrid-retrieval", "w14-d03-rag-evaluation"],
    },
    {
      id: "w14-d07",
      day: 7,
      kind: "review",
      title: "RAG review",
      summary: "Spaced review across LLM and RAG topics.",
      minutes: 45,
      goals: ["Clear due reviews", "Redo one RAG diagnosis from memory"],
      tasks: [
        { label: "Due reviews", minutes: 25 },
        { label: "Diagnosis redo", minutes: 20 },
      ],
      topicIds: ["w14-d01-chunking-ingestion", "w14-d02-bm25-hybrid-retrieval", "w14-d03-rag-evaluation", "w13-d03-decoding-structured-output"],
    },
  ],
});
