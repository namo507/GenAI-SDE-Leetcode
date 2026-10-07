import { REVIEWED, code, defineTopic, defineWeek, edge, node, step } from "../helpers";

export const topics = [
  defineTopic({
    id: "w13-d01-tokenization-embeddings",
    slug: "tokenization-embeddings",
    title: "Tokenization and embeddings",
    domain: "llm",
    roles: ["genai-engineer", "ml-engineer", "data-scientist"],
    difficulty: "intermediate",
    minutes: 75,
    prerequisites: ["w09-d03-attention-transformers"],
    objectives: [
      "Train byte-pair encoding merges on a tiny corpus and encode a new word",
      "Explain why subword tokenization handles unseen words",
      "Compute cosine similarity between embeddings and say what it captures",
    ],
    summary:
      "LLMs read tokens, not characters or words. Byte-pair encoding builds a vocabulary by repeatedly merging the most frequent adjacent pair, so common words become single tokens and rare words split into familiar pieces. Each token maps to an embedding vector whose geometry captures meaning.",
    eli5: {
      analogy:
        "Inventing shorthand while taking notes. You notice 'e' and 's' keep appearing together, so you invent one symbol for 'es'. Then 'es' and 't' together get their own symbol, and so on, until common chunks like 'est' are one quick mark.",
      steps: [
        "Start with every word split into single letters plus an end-of-word marker.",
        "Count every pair of neighboring symbols, weighted by how often each word appears.",
        "Merge the most common pair into a new symbol everywhere.",
        "Repeat a fixed number of times; the merge list is the tokenizer.",
        "A new word is split into letters and the merges are replayed in order.",
      ],
      analogyLimit:
        "Real tokenizers work on bytes, handle spaces and punctuation, and learn tens of thousands of merges from huge corpora. Token boundaries also explain odd model behavior, like miscounting letters in a word.",
    },
    senior: {
      definition:
        "BPE starts from a base vocabulary (characters or bytes) and greedily adds the most frequent adjacent symbol pair as a new token until the vocabulary reaches a target size. Encoding applies the learned merges in order. Embeddings map token ids to dense vectors; cosine similarity u.v / (|u||v|) compares directions.",
      invariants: [
        "Merges are applied in the order they were learned.",
        "Pair frequencies are weighted by word frequency in the training corpus.",
        "Ties are broken deterministically (here, alphabetically), so training is reproducible.",
      ],
      mechanism: [
        "In the toy corpus, 'es' and 'st' both appear 9 times; the alphabetical tie-break picks 'e s' first.",
        "After merging 'es', 'est' and 'est_', the suffix shared by newest and widest is one token.",
        "'lowest' was never in the corpus but encodes as low + est_, two familiar tokens.",
        "Cosine similarity ignores vector length, so king and queen point in nearly the same direction while apple points elsewhere.",
      ],
      complexity: "Naive BPE training is O(merges * corpus symbols); production tokenizers use priority queues and incremental pair counts.",
      tradeoffs: [
        { option: "Byte-level BPE", choose: "General LLMs that must encode any text.", cost: "Non-English text can need many more tokens per word." },
        { option: "Unigram (SentencePiece)", choose: "Probabilistic segmentation and multilingual models.", cost: "Different training algorithm and tooling." },
        { option: "Larger vocabulary", choose: "Fewer tokens per text and cheaper long contexts.", cost: "Bigger embedding and output matrices." },
      ],
      failureModes: [
        "Estimating cost or context limits with word counts instead of token counts.",
        "Mixing tokenizers between training and serving.",
        "Expecting character-level tasks (spelling, counting letters) to be easy for token-based models.",
        "Comparing embeddings from different models as if they shared a space.",
      ],
      production:
        "Token counts drive cost, latency and context limits; always measure them with the model's real tokenizer. Embeddings power semantic search and RAG (week 14).",
      interviewAnswer:
        "BPE starts from characters or bytes and repeatedly merges the most frequent adjacent pair, weighted by word frequency, until it reaches the target vocabulary. Encoding replays the merges, so unseen words split into known subwords. Each token has an embedding, and cosine similarity between embeddings measures semantic closeness by direction.",
    },
    implementation: {
      problem: "Learn six BPE merges from a tiny corpus, encode two words, and compare toy embeddings with cosine similarity.",
      input: "corpus low x5, lower x2, newest x6, widest x3 with end marker _; embeddings king (0.8, 0.6, 0.1), queen (0.75, 0.65, 0.15), apple (0.1, 0.2, 0.95)",
      python: {
        code: code`
          from collections import Counter
          from math import sqrt

          CORPUS = {"low": 5, "lower": 2, "newest": 6, "widest": 3}


          def merge_pair(symbols: list[str], a: str, b: str) -> list[str]:
              out, i = [], 0
              while i < len(symbols):
                  if i + 1 < len(symbols) and symbols[i] == a and symbols[i + 1] == b:
                      out.append(a + b)
                      i += 2
                  else:
                      out.append(symbols[i])
                      i += 1
              return out


          def train_bpe(corpus: dict[str, int], merges: int) -> list[tuple[str, str, int]]:
              words = [(list(w) + ["_"], f) for w, f in corpus.items()]
              learned = []
              for _ in range(merges):
                  pairs: Counter[tuple[str, str]] = Counter()
                  for symbols, f in words:
                      for a, b in zip(symbols, symbols[1:]):
                          pairs[(a, b)] += f
                  (a, b), count = min(pairs.items(), key=lambda kv: (-kv[1], kv[0]))
                  learned.append((a, b, count))
                  words = [(merge_pair(s, a, b), f) for s, f in words]
              return learned


          def encode(word: str, learned: list[tuple[str, str, int]]) -> list[str]:
              symbols = list(word) + ["_"]
              for a, b, _ in learned:
                  symbols = merge_pair(symbols, a, b)
              return symbols


          def cosine(u: list[float], v: list[float]) -> float:
              dot = sum(x * y for x, y in zip(u, v))
              return dot / (sqrt(sum(x * x for x in u)) * sqrt(sum(y * y for y in v)))


          learned = train_bpe(CORPUS, 6)
          for i, (a, b, count) in enumerate(learned, 1):
              print(f"merge {i}: {a} + {b} -> {a + b} (count {count})")
          for word in ["lowest", "newer"]:
              print(f"{word} -> {' '.join(encode(word, learned))}")
          king, queen, apple = [0.8, 0.6, 0.1], [0.75, 0.65, 0.15], [0.1, 0.2, 0.95]
          print(f"cos(king, queen)={cosine(king, queen):.4f} cos(king, apple)={cosine(king, apple):.4f}")
        `,
      },
      r: {
        code: code`
          corpus <- c(low = 5, lower = 2, newest = 6, widest = 3)

          merge_pair <- function(s, a, b) {
            out <- character(0)
            i <- 1
            while (i <= length(s)) {
              if (i < length(s) && s[i] == a && s[i + 1] == b) {
                out <- c(out, paste0(a, b))
                i <- i + 2
              } else {
                out <- c(out, s[i])
                i <- i + 1
              }
            }
            out
          }

          train_bpe <- function(corpus, merges) {
            words <- lapply(names(corpus), function(w) c(strsplit(w, "")[[1]], "_"))
            freqs <- unname(corpus)
            learned <- list()
            for (m in seq_len(merges)) {
              counts <- numeric(0)
              for (k in seq_along(words)) {
                s <- words[[k]]
                if (length(s) < 2) next
                for (key in paste(s[-length(s)], s[-1])) {
                  counts[key] <- (if (is.na(counts[key])) 0 else counts[[key]]) + freqs[k]
                }
              }
              best <- names(counts)[order(-counts, names(counts), method = "radix")[1]]
              pair <- strsplit(best, " ")[[1]]
              learned[[m]] <- list(a = pair[1], b = pair[2], count = counts[[best]])
              words <- lapply(words, merge_pair, a = pair[1], b = pair[2])
            }
            learned
          }

          encode <- function(word, learned) {
            s <- c(strsplit(word, "")[[1]], "_")
            for (mg in learned) s <- merge_pair(s, mg$a, mg$b)
            s
          }

          cosine <- function(u, v) sum(u * v) / (sqrt(sum(u^2)) * sqrt(sum(v^2)))

          learned <- train_bpe(corpus, 6)
          for (i in seq_along(learned)) {
            mg <- learned[[i]]
            cat(sprintf("merge %d: %s + %s -> %s (count %d)\n", i, mg$a, mg$b, paste0(mg$a, mg$b), as.integer(mg$count)))
          }
          for (word in c("lowest", "newer")) cat(sprintf("%s -> %s\n", word, paste(encode(word, learned), collapse = " ")))
          king <- c(0.8, 0.6, 0.1)
          queen <- c(0.75, 0.65, 0.15)
          apple <- c(0.1, 0.2, 0.95)
          cat(sprintf("cos(king, queen)=%.4f cos(king, apple)=%.4f\n", cosine(king, queen), cosine(king, apple)))
        `,
      },
      expectedOutput: code`
        merge 1: e + s -> es (count 9)
        merge 2: es + t -> est (count 9)
        merge 3: est + _ -> est_ (count 9)
        merge 4: l + o -> lo (count 7)
        merge 5: lo + w -> low (count 7)
        merge 6: e + w -> ew (count 6)
        lowest -> low est_
        newer -> n ew e r _
        cos(king, queen)=0.9963 cos(king, apple)=0.3008
      `,
      tests: {
        python: code`
          def test_encoding_round_trips():
              for w in ["lowest", "newer", "zzz"]:
                  assert "".join(encode(w, learned)) == w + "_"


          def test_first_merge_breaks_ties_alphabetically():
              assert learned[0][:2] == ("e", "s")


          def test_cosine_of_a_vector_with_itself_is_one():
              assert abs(cosine([3.0, 4.0], [3.0, 4.0]) - 1) < 1e-12
        `,
        r: code`
          test_that("encoding round-trips to the original word", {
            for (w in c("lowest", "newer", "zzz")) expect_identical(paste(encode(w, learned), collapse = ""), paste0(w, "_"))
          })

          test_that("the first merge breaks ties alphabetically", {
            expect_identical(c(learned[[1]]$a, learned[[1]]$b), c("e", "s"))
          })

          test_that("cosine ignores vector length", {
            expect_equal(cosine(c(1, 2), c(2, 4)), 1)
          })
        `,
      },
      eli5Trace: [
        "Count neighboring pairs: 'e s' and 's t' both appear 9 times (in newest x6 and widest x3); 'e s' wins alphabetically.",
        "Then 'es' + 't' becomes 'est', and 'est' + end marker becomes 'est_'.",
        "'l o' and 'lo w' appear 7 times (low x5, lower x2), giving 'low'.",
        "'lowest' was never seen, but it splits into two known pieces: low and est_.",
        "king and queen point almost the same way (cosine near 1); apple points elsewhere.",
      ],
      complexity: { time: "O(merges * total symbols)", space: "O(vocabulary + corpus)" },
      edgeCases: [
        "Characters never seen in training stay as single symbols (byte-level BPE avoids unknown tokens entirely).",
        "Several pairs with the same count need a deterministic tie-break.",
        "The end-of-word marker keeps 'est' at a word end distinct from 'est' inside a word.",
        "R's order(method = 'radix') sorts in C locale, matching Python's code point order.",
      ],
      incorrect: {
        language: "python",
        code: code`
          def encode(word, learned):
              symbols = list(word) + ["_"]
              for a, b, _ in sorted(learned, key=lambda m: -m[2]):
                  symbols = merge_pair(symbols, a, b)
              return symbols
        `,
        whyWrong: "Merges must be replayed in the order they were learned; re-sorting can apply a merge before the merges that create its parts, producing different tokens than training did.",
        fix: "Apply merges in their learned order.",
      },
    },
    flow: {
      title: "Learning BPE merges",
      nodes: [
        node("chars", "Characters + _", 0, 110, "n e w e s t _"),
        node("count", "Count pairs", 220, 110, "weighted by frequency"),
        node("merge", "Merge best pair", 440, 110, "e + s -> es"),
        node("repeat", "Repeat", 660, 110, "es+t, est+_, l+o..."),
        node("vocab", "Merge list", 880, 30, "the tokenizer"),
        node("encode", "Encode 'lowest'", 880, 190, "low est_"),
      ],
      edges: [edge("chars", "count"), edge("count", "merge"), edge("merge", "repeat"), edge("repeat", "count"), edge("repeat", "vocab"), edge("vocab", "encode")],
      steps: [
        step("chars", "", "Every word starts as characters plus an end-of-word marker."),
        step("chars count", "chars-count", "Count adjacent pairs, weighting each word by its frequency."),
        step("count merge", "count-merge", "'e s' ties with 's t' at 9; the alphabetical tie-break merges 'e s'."),
        step("merge repeat count", "merge-repeat repeat-count", "Recount and merge again: es+t, est+_, then l+o and lo+w."),
        step("vocab encode", "repeat-vocab vocab-encode", "Replay the merges in order on a new word: lowest becomes low + est_."),
      ],
    },
    practice: [
      {
        id: "w13-token-recall-1",
        type: "recall",
        prompt: "Why might an LLM struggle to count the letter 'r' in 'strawberry'?",
        answer: "It sees subword tokens, not letters; 'strawberry' may be one or a few tokens, so letter-level structure is not directly visible.",
        rubric: ["Tokens not characters", "Letter structure hidden"],
      },
      {
        id: "w13-embed-recall-1",
        type: "recall",
        prompt: "Why use cosine similarity rather than Euclidean distance for text embeddings?",
        answer: "Cosine compares direction and ignores magnitude, which often reflects length or frequency rather than meaning; many embedding models are trained with cosine objectives and normalized outputs, where the two are equivalent.",
        rubric: ["Direction versus magnitude", "Normalization equivalence"],
      },
    ],
    references: [
      { title: "Neural Machine Translation of Rare Words with Subword Units (Sennrich, Haddow, Birch, 2016)", url: "https://arxiv.org/abs/1508.07909", versionSensitive: false },
      { title: "Hugging Face documentation: tokenizer summary", url: "https://huggingface.co/docs/transformers/tokenizer_summary", versionSensitive: true },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w13-d02-finetuning-lora",
    slug: "finetuning-lora",
    title: "Pretraining, SFT and parameter-efficient fine-tuning",
    domain: "llm",
    roles: ["genai-engineer", "ml-engineer"],
    difficulty: "advanced",
    minutes: 80,
    prerequisites: ["w13-d01-tokenization-embeddings", "w09-d02-optimizers-regularization"],
    objectives: [
      "Describe the stages: pretraining, supervised fine-tuning and preference tuning",
      "Count LoRA trainable parameters for a given rank",
      "Estimate memory for full fine-tuning versus LoRA and QLoRA",
    ],
    summary:
      "Pretraining teaches next-token prediction on huge corpora; supervised fine-tuning teaches formats and tasks; preference tuning aligns behavior. LoRA freezes the base weights and learns small low-rank updates, cutting trainable parameters and memory dramatically; QLoRA also stores the frozen base in 4-bit.",
    eli5: {
      analogy:
        "A huge textbook that is expensive to reprint. Instead of rewriting pages, you add thin sticky notes next to a few key pages. The notes are tiny, cheap to write, and you can swap in a different set of notes for a different class.",
      steps: [
        "Keep the big textbook (the base model) exactly as it is.",
        "For a few pages (the attention projections), add two thin sticky notes whose product is the change.",
        "Only the sticky notes are trained.",
        "Store the textbook in a compressed print (4-bit) to save even more space.",
      ],
      analogyLimit:
        "Sticky notes cannot teach the book a whole new subject; LoRA adapts behavior and style well but adds limited new knowledge, and very different tasks may need full fine-tuning or retrieval instead.",
    },
    senior: {
      definition:
        "LoRA replaces a weight update Delta W (d_out x d_in) with B A, where B is d_out x r and A is r x d_in, so trainable parameters per matrix are r (d_in + d_out). QLoRA quantizes the frozen base weights to 4-bit (NF4) and trains LoRA adapters in higher precision.",
      invariants: [
        "Base weights are frozen; only A and B receive gradients and optimizer state.",
        "B is initialized to zero, so training starts exactly at the base model.",
        "At inference, B A can be merged into W, adding no latency.",
      ],
      mechanism: [
        "Applying rank-8 LoRA to the query and value projections of 32 layers of a 4096-dimensional model trains about 4.2 million parameters, well under 1% of those matrices.",
        "Full fine-tuning with Adam in mixed precision needs roughly 16 bytes per parameter (weights, gradients, two optimizer moments and a master copy); this is a common rule of thumb, not an exact figure.",
        "4-bit storage of a 7-billion-parameter base takes about 3.5 GB versus 14 GB in bf16, before quantization constants and activations.",
        "Stages: pretraining (next-token loss on raw text), SFT (instruction-response pairs), preference tuning (RLHF with PPO or direct methods such as DPO).",
      ],
      complexity: "LoRA trainable parameters scale with r (d_in + d_out) per adapted matrix instead of d_in d_out; compute per step still includes the full forward pass.",
      tradeoffs: [
        { option: "Prompting and retrieval", choose: "Adding knowledge that changes often.", cost: "Longer prompts and per-call cost." },
        { option: "LoRA or QLoRA", choose: "Adapting style, format or domain on modest hardware.", cost: "Limited capacity for new knowledge; rank and target modules to tune." },
        { option: "Full fine-tuning", choose: "Large distribution shifts with plenty of data and compute.", cost: "Memory, cost and catastrophic forgetting risk." },
      ],
      failureModes: [
        "Fine-tuning to add facts that retrieval would serve better and fresher.",
        "Training on low-quality or inconsistent instruction data.",
        "Overfitting small datasets: evaluate on held-out tasks, not training loss.",
        "Mismatched chat templates between fine-tuning and inference.",
      ],
      production:
        "Teams keep one base model and many LoRA adapters (per customer or task), hot-swapping them at serving time. Version adapters like models and evaluate each with the same eval suite.",
      interviewAnswer:
        "I would try prompting and retrieval first. If I need consistent format or domain behavior, I would fine-tune with LoRA: freeze the base, learn low-rank B A updates on attention projections, which for rank 8 on q and v of a 7B-class model is a few million parameters. QLoRA keeps the frozen base in 4-bit to fit on one GPU. I would evaluate on held-out tasks and merge adapters for serving.",
    },
    implementation: {
      problem: "Count LoRA trainable parameters for several ranks and estimate model memory under different precisions.",
      input: "32 layers, d_model 4096, LoRA on q and v projections; assumed total size 7,000,000,000 parameters; ranks 4, 8, 16",
      python: {
        code: code`
          LAYERS, D_MODEL = 32, 4096
          TOTAL_PARAMS = 7_000_000_000
          GB = 1e9

          full_qv = LAYERS * 2 * D_MODEL * D_MODEL
          print(f"full q and v matrices: {full_qv:,} parameters")
          for r in (4, 8, 16):
              lora = LAYERS * 2 * r * (D_MODEL + D_MODEL)
              print(f"LoRA rank {r}: {lora:,} trainable ({100 * lora / full_qv:.2f}% of q,v; {100 * lora / TOTAL_PARAMS:.3f}% of model)")
          print(f"base weights: bf16 {TOTAL_PARAMS * 2 / GB:.1f} GB, 4-bit {TOTAL_PARAMS * 0.5 / GB:.1f} GB")
          print(f"full fine-tune with Adam at about 16 bytes per parameter: {TOTAL_PARAMS * 16 / GB:.0f} GB")
        `,
      },
      r: {
        code: code`
          layers <- 32
          d_model <- 4096
          total_params <- 7e9
          gb <- 1e9
          commas <- function(x) formatC(x, format = "f", digits = 0, big.mark = ",")

          full_qv <- layers * 2 * d_model * d_model
          cat(sprintf("full q and v matrices: %s parameters\n", commas(full_qv)))
          for (r in c(4, 8, 16)) {
            lora <- layers * 2 * r * (d_model + d_model)
            cat(sprintf("LoRA rank %d: %s trainable (%.2f%% of q,v; %.3f%% of model)\n", as.integer(r), commas(lora), 100 * lora / full_qv, 100 * lora / total_params))
          }
          cat(sprintf("base weights: bf16 %.1f GB, 4-bit %.1f GB\n", total_params * 2 / gb, total_params * 0.5 / gb))
          cat(sprintf("full fine-tune with Adam at about 16 bytes per parameter: %.0f GB\n", total_params * 16 / gb))
        `,
      },
      expectedOutput: code`
        full q and v matrices: 1,073,741,824 parameters
        LoRA rank 4: 2,097,152 trainable (0.20% of q,v; 0.030% of model)
        LoRA rank 8: 4,194,304 trainable (0.39% of q,v; 0.060% of model)
        LoRA rank 16: 8,388,608 trainable (0.78% of q,v; 0.120% of model)
        base weights: bf16 14.0 GB, 4-bit 3.5 GB
        full fine-tune with Adam at about 16 bytes per parameter: 112 GB
      `,
      tests: {
        python: code`
          def lora_params(r: int, d_in: int, d_out: int) -> int:
              return r * (d_in + d_out)


          def test_rank_scales_linearly():
              assert lora_params(16, 4096, 4096) == 2 * lora_params(8, 4096, 4096)


          def test_lora_is_tiny_compared_with_full():
              assert lora_params(8, 4096, 4096) / (4096 * 4096) < 0.01
        `,
        r: code`
          test_that("rank scales parameters linearly", {
            lp <- function(r) r * (d_model + d_model)
            expect_equal(lp(16), 2 * lp(8))
          })

          test_that("commas formats billions", {
            expect_identical(commas(1073741824), "1,073,741,824")
          })
        `,
      },
      eli5Trace: [
        "The q and v pages of all 32 layers hold about a billion numbers.",
        "Rank-8 sticky notes on those pages hold about 4 million numbers: under half a percent.",
        "The textbook itself takes 14 GB in normal print and about 3.5 GB in compressed print.",
        "Rewriting the whole book with the Adam optimizer would need over 100 GB of memory.",
      ],
      complexity: { time: "O(1) arithmetic", space: "O(1)" },
      edgeCases: [
        "Grouped-query attention makes k and v projections smaller than q; count each matrix's real shape.",
        "Memory estimates exclude activations, which grow with batch and sequence length.",
        "4-bit formats store extra scale constants, so real sizes are somewhat larger than 0.5 bytes per weight.",
        "The 7B total is an assumption for illustration; check the real model card.",
      ],
      incorrect: {
        language: "python",
        code: code`
          lora = LAYERS * 2 * r * D_MODEL
        `,
        whyWrong: "LoRA learns two matrices per adapted weight (A is r x d_in and B is d_out x r), so parameters are r (d_in + d_out), not r d.",
        fix: "Count both factors: r * (d_in + d_out) per adapted matrix.",
      },
    },
    flow: {
      title: "Where LoRA sits in a frozen layer",
      nodes: [
        node("x", "Input x", 0, 110),
        node("w", "Frozen W", 260, 30, "4096 x 4096"),
        node("a", "A (r x d)", 260, 190, "trainable"),
        node("b", "B (d x r)", 480, 190, "starts at zero"),
        node("sum", "W x + B A x", 700, 110, "same output shape"),
        node("merge", "Merge for serving", 920, 110, "W + B A"),
      ],
      edges: [edge("x", "w"), edge("x", "a"), edge("a", "b"), edge("w", "sum"), edge("b", "sum"), edge("sum", "merge")],
      steps: [
        step("x w", "x-w", "The base weight W is frozen: no gradients, no optimizer state."),
        step("x a b", "x-a a-b", "The input also flows through a thin down-projection A and up-projection B."),
        step("sum", "w-sum b-sum", "Outputs add up. Because B starts at zero, training starts exactly at the base model."),
        step("merge", "sum-merge", "After training, B A can be folded into W so inference has no extra cost."),
      ],
    },
    practice: [
      {
        id: "w13-ft-recall-1",
        type: "recall",
        prompt: "When would you choose retrieval over fine-tuning to add company knowledge?",
        answer: "When the knowledge changes often, must be cited, or is large: retrieval updates instantly and grounds answers. Fine-tuning suits style, format and stable domain behavior.",
        rubric: ["Freshness", "Citations or grounding", "Fine-tuning for behavior"],
      },
      {
        id: "w13-ft-recall-2",
        type: "recall",
        prompt: "Name the three common LLM training stages and what each optimizes.",
        answer: "Pretraining: next-token prediction on raw text. Supervised fine-tuning: imitate curated instruction-response pairs. Preference tuning (RLHF, DPO): prefer responses humans or reward models rank higher.",
        rubric: ["Pretraining objective", "SFT objective", "Preference tuning objective"],
      },
    ],
    references: [
      { title: "LoRA: Low-Rank Adaptation of Large Language Models (Hu et al., 2021)", url: "https://arxiv.org/abs/2106.09685", versionSensitive: false },
      { title: "QLoRA: Efficient Finetuning of Quantized LLMs (Dettmers et al., 2023)", url: "https://arxiv.org/abs/2305.14314", versionSensitive: false },
      { title: "Hugging Face PEFT documentation", url: "https://huggingface.co/docs/peft/index", versionSensitive: true },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w13-d03-decoding-structured-output",
    slug: "decoding-structured-output",
    title: "Decoding strategies and structured output",
    domain: "llm",
    roles: ["genai-engineer", "ml-engineer"],
    difficulty: "intermediate",
    minutes: 75,
    prerequisites: ["w13-d01-tokenization-embeddings"],
    objectives: [
      "Apply temperature, top-k and top-p (nucleus) filtering to a next-token distribution",
      "Explain how decoding settings trade diversity for reliability",
      "Design structured output with schemas, constrained decoding and validation",
    ],
    summary:
      "A model outputs a probability for every next token; decoding decides which one to emit. Temperature reshapes the distribution, top-k and top-p cut off the unlikely tail. For structured output, constrain or validate against a schema instead of hoping.",
    eli5: {
      analogy:
        "Picking a snack from a menu where each item has a popularity score. Greedy always picks the most popular. Temperature makes your choices more adventurous or more cautious. Top-k only lets you choose from the k most popular; top-p lets you choose from the most popular items that together cover, say, 90% of orders.",
      steps: [
        "Turn scores into chances with softmax.",
        "Lower temperature sharpens the chances toward the favorite; higher flattens them.",
        "Top-k: keep the k best items and rescale their chances to add to 1.",
        "Top-p: keep the best items until their chances add up to p, then rescale.",
        "Pick an item at random from what is left (or the best one, for greedy).",
      ],
      analogyLimit:
        "A menu choice is one decision; a model makes thousands in sequence, and one odd early choice changes everything after it. That is why small decoding changes can shift long outputs a lot.",
    },
    senior: {
      definition:
        "Given logits z, sampling probabilities are softmax(z / T). Top-k keeps the k highest-probability tokens; top-p (nucleus) keeps the smallest set of highest-probability tokens whose cumulative probability reaches p; both renormalize before sampling. Greedy decoding picks argmax.",
      invariants: [
        "Temperature does not change the ranking of tokens, only how peaked the distribution is.",
        "After filtering, kept probabilities are renormalized to sum to 1.",
        "Top-p adapts the number of kept tokens to the distribution's shape; top-k does not.",
      ],
      mechanism: [
        "Softmax subtracts the maximum logit for numerical stability.",
        "At T = 0.5, the top token's probability rises from about 0.42 to about 0.64.",
        "Top-k = 3 keeps the, a, cat; top-p = 0.9 keeps tokens until the cumulative probability crosses 0.9.",
        "Structured output: JSON-schema or grammar-constrained decoding masks tokens that would break the schema; otherwise validate, then retry with the error message.",
      ],
      complexity: "O(V log V) to sort the vocabulary for top-k or top-p (O(V) with partial selection) per generated token.",
      tradeoffs: [
        { option: "Greedy or low temperature", choose: "Extraction, classification, code and structured output.", cost: "Repetitive or bland free text." },
        { option: "Higher temperature with top-p", choose: "Creative writing and brainstorming.", cost: "More factual errors and format breaks." },
        { option: "Constrained decoding", choose: "Outputs that must parse (JSON, SQL subsets, enums).", cost: "Provider or library support needed; schemas must be kept in sync." },
      ],
      failureModes: [
        "Parsing free-form JSON without validation and crashing on 2% of responses.",
        "Using temperature 0 and assuming outputs are perfectly deterministic across providers and hardware.",
        "Top-k too small for flat distributions, removing reasonable tokens.",
        "Schemas that allow ambiguous fields, so the output is valid but useless.",
      ],
      production:
        "For any machine-consumed output: a strict schema, constrained decoding where available, validation with a typed parser, bounded retries with the validation error, and logging of failures. Evaluate format compliance as a metric.",
      interviewAnswer:
        "Decoding turns logits into tokens: temperature scales logits before softmax, top-k keeps the k most likely, and top-p keeps the smallest set covering probability p, then we renormalize and sample, or take argmax for greedy. For structured output I use low temperature, a JSON schema with constrained decoding when supported, then validate and retry with the error message, and I track format failure rate.",
    },
    implementation: {
      problem: "Compute next-token probabilities at two temperatures, then apply top-k and top-p filtering.",
      input: "tokens the, a, cat, dog, <eos>, zebra with logits 2.0, 1.5, 1.0, 0.5, 0.0, -1.0; T = 1.0 and 0.5; k = 3; p = 0.9",
      python: {
        code: code`
          from math import exp

          TOKENS = ["the", "a", "cat", "dog", "<eos>", "zebra"]
          LOGITS = [2.0, 1.5, 1.0, 0.5, 0.0, -1.0]


          def softmax(logits: list[float], temperature: float = 1.0) -> list[float]:
              scaled = [z / temperature for z in logits]
              m = max(scaled)
              e = [exp(s - m) for s in scaled]
              total = sum(e)
              return [v / total for v in e]


          def renormalize(probs: list[float], keep: list[int]) -> list[tuple[str, float]]:
              total = sum(probs[i] for i in keep)
              return [(TOKENS[i], probs[i] / total) for i in keep]


          def top_k(probs: list[float], k: int) -> list[tuple[str, float]]:
              return renormalize(probs, sorted(range(len(probs)), key=lambda i: -probs[i])[:k])


          def top_p(probs: list[float], p: float) -> list[tuple[str, float]]:
              keep, cumulative = [], 0.0
              for i in sorted(range(len(probs)), key=lambda i: -probs[i]):
                  keep.append(i)
                  cumulative += probs[i]
                  if cumulative >= p:
                      break
              return renormalize(probs, keep)


          def show(pairs: list[tuple[str, float]]) -> str:
              return " ".join(f"{t}={p:.3f}" for t, p in pairs)


          probs = softmax(LOGITS)
          print(f"greedy: {TOKENS[probs.index(max(probs))]}")
          print(f"T=1.0: {show(list(zip(TOKENS, probs)))}")
          print(f"T=0.5: {show(list(zip(TOKENS, softmax(LOGITS, 0.5))))}")
          print(f"top-k=3: {show(top_k(probs, 3))}")
          print(f"top-p=0.9: {show(top_p(probs, 0.9))}")
        `,
      },
      r: {
        code: code`
          tokens <- c("the", "a", "cat", "dog", "<eos>", "zebra")
          logits <- c(2.0, 1.5, 1.0, 0.5, 0.0, -1.0)

          softmax <- function(z, temperature = 1) {
            s <- z / temperature
            e <- exp(s - max(s))
            e / sum(e)
          }

          show <- function(tok, p) paste(sprintf("%s=%.3f", tok, p), collapse = " ")

          top_k <- function(p, k) {
            keep <- order(-p)[seq_len(k)]
            list(tok = tokens[keep], p = p[keep] / sum(p[keep]))
          }

          top_p <- function(p, threshold) {
            o <- order(-p)
            n <- which(cumsum(p[o]) >= threshold)[1]
            keep <- o[seq_len(n)]
            list(tok = tokens[keep], p = p[keep] / sum(p[keep]))
          }

          probs <- softmax(logits)
          cat(sprintf("greedy: %s\n", tokens[which.max(probs)]))
          cat(sprintf("T=1.0: %s\n", show(tokens, probs)))
          cat(sprintf("T=0.5: %s\n", show(tokens, softmax(logits, 0.5))))
          k <- top_k(probs, 3)
          cat(sprintf("top-k=3: %s\n", show(k$tok, k$p)))
          tp <- top_p(probs, 0.9)
          cat(sprintf("top-p=0.9: %s\n", show(tp$tok, tp$p)))
        `,
      },
      expectedOutput: code`
        greedy: the
        T=1.0: the=0.420 a=0.255 cat=0.154 dog=0.094 <eos>=0.057 zebra=0.021
        T=0.5: the=0.635 a=0.234 cat=0.086 dog=0.032 <eos>=0.012 zebra=0.002
        top-k=3: the=0.506 a=0.307 cat=0.186
        top-p=0.9: the=0.455 a=0.276 cat=0.167 dog=0.102
      `,
      tests: {
        python: code`
          def test_probabilities_sum_to_one():
              assert abs(sum(softmax(LOGITS, 0.7)) - 1) < 1e-12


          def test_temperature_keeps_ranking():
              a, b = softmax(LOGITS, 0.3), softmax(LOGITS, 3.0)
              assert sorted(range(6), key=lambda i: -a[i]) == sorted(range(6), key=lambda i: -b[i])


          def test_top_p_keeps_at_least_one_token():
              assert len(top_p(softmax(LOGITS), 0.01)) == 1
        `,
        r: code`
          test_that("probabilities sum to one", {
            expect_equal(sum(softmax(logits, 0.7)), 1)
          })

          test_that("filtered probabilities are renormalized", {
            expect_equal(sum(top_k(probs, 3)$p), 1)
            expect_equal(sum(top_p(probs, 0.9)$p), 1)
          })

          test_that("lower temperature sharpens the top token", {
            expect_gt(max(softmax(logits, 0.5)), max(softmax(logits, 1)))
          })
        `,
      },
      eli5Trace: [
        "Greedy always picks 'the', the highest score.",
        "At normal temperature 'the' has a bit under half the chance; 'zebra' still has about 2%.",
        "At temperature 0.5, 'the' gets almost two thirds and the tail nearly vanishes.",
        "Top-3 keeps the, a, cat and rescales them; top-p keeps the most likely tokens until they cover 90%.",
      ],
      complexity: { time: "O(V log V) per token", space: "O(V)" },
      edgeCases: [
        "Temperature 0 is greedy decoding; dividing by zero must be special-cased.",
        "Ties at the top-k boundary need a deterministic rule.",
        "A tiny p keeps exactly one token, behaving like greedy.",
        "Very large logits overflow exp() without subtracting the maximum first.",
      ],
      incorrect: {
        language: "python",
        code: code`
          def top_k(probs, k):
              keep = sorted(range(len(probs)), key=lambda i: -probs[i])[:k]
              return [(TOKENS[i], probs[i]) for i in keep]
        `,
        whyWrong: "Without renormalizing, the kept probabilities sum to less than 1, so a sampler that assumes a distribution behaves incorrectly.",
        fix: "Divide each kept probability by the sum of the kept probabilities.",
      },
    },
    flow: {
      title: "From logits to the next token",
      nodes: [
        node("logits", "Logits", 0, 110, "one score per token"),
        node("temp", "Divide by T", 220, 110, "sharpen or flatten"),
        node("softmax", "Softmax", 440, 110, "probabilities"),
        node("filter", "Top-k / top-p", 660, 110, "cut the tail"),
        node("sample", "Sample or argmax", 880, 110, "next token"),
        node("validate", "Schema check", 880, 250, "for structured output"),
      ],
      edges: [edge("logits", "temp"), edge("temp", "softmax"), edge("softmax", "filter"), edge("filter", "sample"), edge("sample", "validate")],
      steps: [
        step("logits temp", "logits-temp", "Temperature divides the logits: below 1 sharpens, above 1 flattens. Ranking never changes."),
        step("softmax", "temp-softmax", "Softmax turns scores into probabilities that add to 1."),
        step("filter", "softmax-filter", "Top-k keeps a fixed number of tokens; top-p keeps enough to cover probability p. Then renormalize."),
        step("sample", "filter-sample", "Sample from what is left, or take the argmax for greedy decoding."),
        step("validate", "sample-validate", "For JSON or other formats, constrain decoding to the schema or validate and retry."),
      ],
    },
    practice: [
      {
        id: "w13-decode-design-1",
        type: "design",
        prompt: "Your extraction pipeline asks an LLM for JSON with fields name, date and amount. 2% of responses fail to parse. Design a fix.",
        answer: "Define a JSON schema with types and required fields; use the provider's structured output or constrained decoding; set low temperature; validate with a typed parser; on failure retry once with the validation error; log and route persistent failures to review; track parse failure rate as a metric.",
        rubric: ["Schema", "Constrained decoding", "Validation and bounded retry", "Monitoring"],
      },
      {
        id: "w13-decode-recall-1",
        type: "recall",
        prompt: "Why is top-p often preferred over top-k?",
        answer: "Top-p adapts to the distribution: when the model is confident it keeps few tokens, when uncertain it keeps more. A fixed k is too many in confident steps and too few in uncertain ones.",
        rubric: ["Adapts to distribution shape", "Fixed k problems"],
      },
    ],
    references: [
      { title: "The Curious Case of Neural Text Degeneration (Holtzman et al., 2019)", url: "https://arxiv.org/abs/1904.09751", versionSensitive: false },
      { title: "JSON Schema documentation", url: "https://json-schema.org/docs", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w13-d04-inference-kv-cache",
    slug: "inference-kv-cache",
    title: "LLM inference: KV cache, batching and serving",
    domain: "llm",
    roles: ["genai-engineer", "ml-engineer", "sde"],
    difficulty: "advanced",
    minutes: 75,
    prerequisites: ["w09-d03-attention-transformers", "w13-d03-decoding-structured-output"],
    objectives: [
      "Compute KV cache memory per token and per batch",
      "Explain how grouped-query attention shrinks the cache",
      "Separate prefill and decode costs and know what batching optimizes",
    ],
    summary:
      "During generation, each layer stores keys and values for every previous token so they are not recomputed. That KV cache, not the weights, often limits how many requests a GPU can serve at once. Grouped-query attention and paged caches are the main fixes.",
    eli5: {
      analogy:
        "A storyteller writing a long story keeps index cards summarizing every sentence so far, one stack per chapter. Each new sentence only needs the cards, not rereading the whole story. But the card boxes fill the desk as the story grows, and every listener's story needs its own box.",
      steps: [
        "Every new token adds a key card and a value card in every layer.",
        "Card size depends on the number of heads that keep cards and the size of each card.",
        "Multiply by story length and number of listeners to get desk space.",
        "Sharing card boxes between heads (grouped-query attention) shrinks the desk space a lot.",
      ],
      analogyLimit:
        "The desk is GPU memory, and it is also shared with the model weights and temporary work space. Real servers allocate cards in pages so stories of different lengths do not waste space.",
    },
    senior: {
      definition:
        "KV cache bytes = 2 (K and V) x layers x kv_heads x head_dim x bytes_per_value x sequence_length x batch. With grouped-query attention, kv_heads is smaller than the number of query heads.",
      invariants: [
        "Cache size grows linearly with sequence length and batch size.",
        "Prefill processes the whole prompt in parallel (compute-bound); decode generates one token per step (memory-bandwidth-bound).",
        "Free memory for the cache = GPU memory - weights - activations and workspace.",
      ],
      mechanism: [
        "For 32 layers, head_dim 128 and bf16, full multi-head attention with 32 KV heads stores 512 KiB per token.",
        "With 8 KV heads (GQA), it is 128 KiB per token, 4x smaller.",
        "At 4,096 tokens and batch 8, that is 16 GiB versus 4 GiB.",
        "Continuous batching admits new requests as others finish; paged attention (as in vLLM) allocates cache in blocks to avoid fragmentation.",
      ],
      complexity: "Per decode step O(sequence length) attention reads per layer; total generation O(n^2) attention work without caching, O(n) recomputation saved with it.",
      tradeoffs: [
        { option: "Grouped-query or multi-query attention", choose: "High-throughput serving with long contexts.", cost: "Some quality trade-off; decided at training time." },
        { option: "KV cache quantization (8-bit)", choose: "Memory-bound serving.", cost: "Small accuracy loss; kernel support needed." },
        { option: "Speculative decoding", choose: "Latency-sensitive generation with a good draft model.", cost: "Extra model and complexity; gains depend on acceptance rate." },
      ],
      failureModes: [
        "Sizing GPUs by weight memory alone and running out of cache under load.",
        "Static batching that waits for the longest request, wasting capacity.",
        "Long system prompts recomputed for every request instead of prefix caching.",
        "Measuring only tokens per second, ignoring time to first token.",
      ],
      production:
        "Serving stacks (vLLM, TGI, TensorRT-LLM) report time to first token, inter-token latency, throughput and cache utilization. Prefix caching for shared system prompts and right-sizing max sequence length often save more than new hardware.",
      interviewAnswer:
        "The KV cache stores keys and values for every past token in every layer: 2 x layers x KV heads x head dim x bytes per token. For a 32-layer model with 128-dim heads in bf16 that is 512 KiB per token with 32 KV heads, or 128 KiB with 8-head GQA, so batch and context length quickly dominate memory. I would use GQA models, paged attention with continuous batching, prefix caching, and track time to first token separately from throughput.",
    },
    implementation: {
      problem: "Compute KV cache size per token and for a batch, and the maximum batch that fits in 24 GiB, for MHA and GQA.",
      input: "32 layers, head_dim 128, bf16 (2 bytes); MHA 32 KV heads vs GQA 8 KV heads; 4,096 tokens per sequence; batch 8; 24 GiB free for cache",
      python: {
        code: code`
          LAYERS, HEAD_DIM, BYTES = 32, 128, 2
          SEQ, BATCH = 4096, 8
          GIB = 2**30
          FREE = 24 * GIB


          def kv_bytes_per_token(kv_heads: int) -> int:
              return 2 * LAYERS * kv_heads * HEAD_DIM * BYTES


          for name, kv_heads in [("MHA, 32 KV heads", 32), ("GQA, 8 KV heads", 8)]:
              per_token = kv_bytes_per_token(kv_heads)
              batch_bytes = per_token * SEQ * BATCH
              max_batch = FREE // (per_token * SEQ)
              print(f"{name}: {per_token // 1024} KiB per token, {batch_bytes / GIB:.2f} GiB for {BATCH} x {SEQ} tokens, max batch in 24 GiB: {max_batch}")
        `,
      },
      r: {
        code: code`
          layers <- 32
          head_dim <- 128
          bytes <- 2
          seq_len <- 4096
          batch <- 8
          gib <- 2^30
          free <- 24 * gib

          kv_bytes_per_token <- function(kv_heads) 2 * layers * kv_heads * head_dim * bytes

          configs <- c("MHA, 32 KV heads" = 32, "GQA, 8 KV heads" = 8)
          for (name in names(configs)) {
            per_token <- kv_bytes_per_token(configs[[name]])
            batch_bytes <- per_token * seq_len * batch
            max_batch <- free %/% (per_token * seq_len)
            cat(sprintf("%s: %d KiB per token, %.2f GiB for %d x %d tokens, max batch in 24 GiB: %d\n",
                        name, as.integer(per_token / 1024), batch_bytes / gib, as.integer(batch), as.integer(seq_len), as.integer(max_batch)))
          }
        `,
      },
      expectedOutput: code`
        MHA, 32 KV heads: 512 KiB per token, 16.00 GiB for 8 x 4096 tokens, max batch in 24 GiB: 12
        GQA, 8 KV heads: 128 KiB per token, 4.00 GiB for 8 x 4096 tokens, max batch in 24 GiB: 48
      `,
      tests: {
        python: code`
          def test_gqa_shrinks_cache_by_head_ratio():
              assert kv_bytes_per_token(32) == 4 * kv_bytes_per_token(8)


          def test_cache_is_linear_in_sequence_length():
              assert kv_bytes_per_token(8) * 2048 * 2 == kv_bytes_per_token(8) * 4096
        `,
        r: code`
          test_that("GQA shrinks the cache by the head ratio", {
            expect_equal(kv_bytes_per_token(32), 4 * kv_bytes_per_token(8))
          })

          test_that("doubles avoid integer overflow for large byte counts", {
            expect_gt(kv_bytes_per_token(32) * seq_len * batch, .Machine$integer.max)
          })
        `,
      },
      eli5Trace: [
        "Each new token adds key and value cards in all 32 layers for every head that keeps cards.",
        "With 32 card-keeping heads that is half a megabyte per token.",
        "Eight stories of 4,096 tokens fill 16 GiB of desk with full attention, but only 4 GiB with shared boxes.",
        "So the same 24 GiB desk holds 12 long stories with full attention or 48 with grouped-query attention.",
      ],
      complexity: { time: "O(1) arithmetic", space: "O(1)" },
      edgeCases: [
        "R's 32-bit integers overflow above about 2.1 billion; the R code keeps byte counts as doubles.",
        "Weights, activations and fragmentation also consume memory; 24 GiB here is what is left for the cache.",
        "Sliding-window attention caps the cache at the window length.",
        "KiB and GiB are binary units (1024-based), unlike the decimal GB used for weights earlier.",
      ],
      incorrect: {
        language: "python",
        code: code`
          per_token = LAYERS * kv_heads * HEAD_DIM * BYTES
        `,
        whyWrong: "It forgets the factor of 2: both keys and values are cached, so memory is underestimated by half and servers run out under load.",
        fix: "Multiply by 2 for K and V.",
      },
    },
    flow: {
      title: "Prefill, decode and the KV cache",
      nodes: [
        node("prompt", "Prompt", 0, 110, "4,096 tokens"),
        node("prefill", "Prefill", 220, 110, "parallel, compute-bound"),
        node("cache", "KV cache", 460, 110, "512 KiB/token (MHA)"),
        node("decode", "Decode step", 700, 110, "1 token, memory-bound"),
        node("out", "Output token", 920, 110),
        node("batch", "Continuous batching", 700, 250, "fill freed slots"),
      ],
      edges: [edge("prompt", "prefill"), edge("prefill", "cache"), edge("cache", "decode"), edge("decode", "out"), edge("out", "cache"), edge("batch", "decode")],
      steps: [
        step("prompt prefill", "prompt-prefill", "Prefill runs the whole prompt through the model in parallel: this dominates time to first token."),
        step("cache", "prefill-cache", "Every layer stores keys and values for every prompt token in the cache."),
        step("decode out", "cache-decode decode-out", "Each decode step reads the whole cache to produce one token: memory bandwidth bound."),
        step("cache", "out-cache", "The new token's keys and values are appended, so the cache grows every step."),
        step("batch", "batch-decode", "Continuous batching slots new requests in as others finish, keeping the GPU busy."),
      ],
    },
    practice: [
      {
        id: "w13-kv-recall-1",
        type: "recall",
        prompt: "Why is decode memory-bandwidth-bound while prefill is compute-bound?",
        answer: "Prefill processes many tokens at once, so each weight load serves many tokens (high arithmetic intensity). Decode produces one token per sequence per step, so weights and cache are reloaded for little compute.",
        rubric: ["Arithmetic intensity", "One token per step in decode"],
      },
      {
        id: "w13-kv-design-1",
        type: "design",
        prompt: "Your chat service has a 3,000-token shared system prompt. How do you cut cost and latency?",
        answer: "Prefix caching: compute the system prompt's KV once and reuse it across requests; shorten the prompt; route requests with the same prefix to the same replicas; measure time to first token before and after.",
        rubric: ["Prefix or prompt caching", "Routing for cache hits", "Measures TTFT"],
      },
    ],
    references: [
      { title: "Efficient Memory Management for Large Language Model Serving with PagedAttention (Kwon et al., 2023)", url: "https://arxiv.org/abs/2309.06180", versionSensitive: false },
      { title: "GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints (Ainslie et al., 2023)", url: "https://arxiv.org/abs/2305.13245", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),
];

export const week = defineWeek({
  number: 13,
  slug: "llm-and-genai",
  title: "LLMs and GenAI",
  track: "ai",
  domains: ["llm"],
  summary:
    "Tokenization, embeddings, attention in practice, pretraining and fine-tuning (SFT, LoRA, QLoRA), decoding, structured output and inference economics.",
  outcomes: [
    "Explain tokenization and embeddings with worked examples",
    "Choose between prompting, retrieval and LoRA fine-tuning with cost estimates",
    "Size LLM serving memory and design reliable structured outputs",
  ],
  roles: ["genai-engineer", "ml-engineer", "data-scientist", "sde"],
  days: [
    {
      id: "w13-d01",
      day: 1,
      kind: "concept-map",
      title: "Tokenization and embeddings",
      summary: "BPE merges by hand and cosine similarity between embeddings.",
      minutes: 80,
      goals: ["Train BPE merges", "Explain why token counts matter"],
      tasks: [
        { label: "Concept map and ELI5", minutes: 15 },
        { label: "Run BPE and cosine examples", minutes: 30 },
        { label: "Recall prompts", minutes: 20 },
        { label: "Count tokens of your own prompt with a real tokenizer", minutes: 15 },
      ],
      topicIds: ["w13-d01-tokenization-embeddings"],
    },
    {
      id: "w13-d02",
      day: 2,
      kind: "theory-lab",
      title: "Pretraining, SFT and LoRA",
      summary: "Training stages and parameter-efficient fine-tuning arithmetic.",
      minutes: 85,
      goals: ["Count LoRA parameters", "Decide between retrieval and fine-tuning"],
      tasks: [
        { label: "Step through the LoRA diagram", minutes: 15 },
        { label: "Run the parameter and memory calculator", minutes: 25 },
        { label: "Retrieval versus fine-tuning prompt", minutes: 25 },
        { label: "Training stages recall prompt", minutes: 20 },
      ],
      topicIds: ["w13-d02-finetuning-lora"],
    },
    {
      id: "w13-d03",
      day: 3,
      kind: "implementation",
      title: "Decoding and structured output",
      summary: "Temperature, top-k and top-p by hand, and schema-safe output design.",
      minutes: 80,
      goals: ["Apply each decoding filter", "Design a schema-validated extraction"],
      tasks: [
        { label: "Read the menu analogy and its limit", minutes: 10 },
        { label: "Run the decoding example and tests", minutes: 30 },
        { label: "JSON reliability design prompt", minutes: 25 },
        { label: "Recall prompt", minutes: 15 },
      ],
      topicIds: ["w13-d03-decoding-structured-output"],
    },
    {
      id: "w13-d04",
      day: 4,
      kind: "applied-practice",
      title: "Inference economics and LLM drills",
      summary: "KV cache sizing, batching and serving, then mixed LLM drills.",
      minutes: 90,
      goals: ["Size a serving deployment", "Solve the LLM drills"],
      tasks: [
        { label: "Inference lesson and example", minutes: 35 },
        { label: "LLM drills", minutes: 40 },
        { label: "Log weak spots", minutes: 15 },
      ],
      topicIds: ["w13-d04-inference-kv-cache", "w13-d01-tokenization-embeddings", "w13-d02-finetuning-lora", "w13-d03-decoding-structured-output"],
    },
    {
      id: "w13-d05",
      day: 5,
      kind: "production-lens",
      title: "JSON that breaks 2% of the time",
      summary: "Reliability engineering for LLM outputs consumed by machines.",
      minutes: 60,
      goals: ["Design an extraction pipeline with measurable reliability"],
      tasks: [
        { label: "Read the scenario", minutes: 10 },
        { label: "Answer the case questions", minutes: 35 },
        { label: "Compare against the rubric", minutes: 15 },
      ],
      topicIds: ["w13-d03-decoding-structured-output", "w13-d04-inference-kv-cache"],
      productionCase: {
        title: "An invoice extractor that occasionally returns broken JSON",
        scenario:
          "An LLM extracts vendor, date, line items and totals from 200,000 invoices a month into JSON for the finance system. About 2% of responses fail to parse, another 1% parse but have totals that do not match the line items, and costs doubled after a prompt change.",
        constraints: [
          "Finance requires 99.9% of invoices processed without manual work.",
          "Invoices can be up to 20 pages.",
          "Model and provider may change next quarter.",
        ],
        questions: [
          "How do you eliminate parse failures?",
          "How do you catch valid-but-wrong outputs?",
          "Why might costs have doubled, and how do you control them?",
          "How do you make the pipeline portable across providers?",
        ],
        rubric: [
          "Schema-constrained output or strict validation with bounded retries using the error message",
          "Business-rule validation (sum of line items equals total, date formats) with routing to review",
          "Token accounting: prompt length, retries and long documents; chunking or page selection; caching",
          "An evaluation set with expected outputs run on every prompt or model change, and an adapter layer per provider",
        ],
        pitfalls: ["Raising temperature to 'fix' failures", "Shipping prompt changes without an eval run"],
      },
    },
    {
      id: "w13-d06",
      day: 6,
      kind: "interview-simulation",
      title: "GenAI fundamentals interview",
      summary: "Timed questions on tokenization, fine-tuning, decoding and serving.",
      minutes: 55,
      goals: ["Explain each concept with one number"],
      tasks: [
        { label: "Timed GenAI questions", minutes: 35 },
        { label: "One sizing calculation", minutes: 10 },
        { label: "Self-score with the rubric", minutes: 10 },
      ],
      topicIds: ["w13-d01-tokenization-embeddings", "w13-d02-finetuning-lora", "w13-d03-decoding-structured-output", "w13-d04-inference-kv-cache"],
    },
    {
      id: "w13-d07",
      day: 7,
      kind: "review",
      title: "LLM review",
      summary: "Spaced review across deep learning and LLM topics.",
      minutes: 45,
      goals: ["Clear due reviews", "Recompute the KV cache for a different model"],
      tasks: [
        { label: "Due reviews", minutes: 25 },
        { label: "KV cache for another model", minutes: 20 },
      ],
      topicIds: ["w13-d01-tokenization-embeddings", "w13-d02-finetuning-lora", "w13-d03-decoding-structured-output", "w13-d04-inference-kv-cache", "w09-d03-attention-transformers"],
    },
  ],
});
