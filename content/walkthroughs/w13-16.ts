import type { WalkthroughStepInput } from "@/lib/curriculum";

export const walkthroughs: Record<string, WalkthroughStepInput[]> = {
  "w13-d01-tokenization-embeddings": [
    { python: "CORPUS =", r: "corpus <", eli5: "A tiny pile of words and how often each appears." },
    { python: "def merge_pair", pythonLines: 10, r: "merge_pair", rLines: 14, eli5: "Glue two neighboring pieces into one wherever that exact pair appears." },
    { python: "def train_bpe", pythonLines: 12, r: "train_bpe", rLines: 20, eli5: "Start with single letters. Six times, count every neighboring pair across all words and glue the most common pair. 'e' and 's' go first because 'newest' and 'widest' share them." },
    { python: "def encode", pythonLines: 5, r: "encode <", rLines: 5, eli5: "To split a new word, replay the glue steps in the same order: 'lowest' becomes 'low' and 'est_'." },
    { python: "def cosine", pythonLines: 3, r: "cosine <", eli5: "Cosine similarity: words whose number lists point the same way are similar, so king and queen score 0.996 while king and apple score 0.30." },
  ],
  "w13-d02-finetuning-lora": [
    { python: "LAYERS, D_MODEL", pythonLines: 3, r: "layers <", rLines: 4, eli5: "A 7-billion-number model with 32 layers, each 4096 wide." },
    { python: "full_qv =", pythonLines: 2, r: "full_qv <", rLines: 2, eli5: "Training the full question and value matrices would touch about a billion numbers." },
    { python: "for r in", pythonLines: 3, r: "for (r in", rLines: 4, eli5: "LoRA trains two thin strips instead of each big square. With rank 8 that is about 4 million numbers, less than a tenth of a percent of the model." },
    { python: "print(f\"base", pythonLines: 2, r: "cat(sprintf(\"base", rLines: 2, eli5: "Storing the model takes 14 GB in bf16 or 3.5 GB in 4-bit, while full training with Adam needs about 112 GB." },
  ],
  "w13-d03-decoding-structured-output": [
    { python: "TOKENS =", pythonLines: 2, r: "tokens <", rLines: 2, eli5: "Six possible next words and the model's raw scores for each." },
    { python: "def softmax", pythonLines: 6, r: "softmax <", rLines: 5, eli5: "Softmax turns scores into chances. Dividing by a temperature below 1 makes the favorite even more likely." },
    { python: "def top_k", pythonLines: 2, r: "top_k <-", rLines: 4, eli5: "Top-k keeps only the k most likely words and rescales their chances to add up to 1." },
    { python: "def top_p", pythonLines: 8, r: "top_p <-", rLines: 6, eli5: "Top-p keeps the smallest group of top words whose chances add up to at least 0.9." },
    { python: "probs = softmax", pythonLines: 6, r: "probs <-", rLines: 8, eli5: "Greedy picks 'the'. Lower temperature, top-k and top-p each trim the long tail in a different way." },
  ],
  "w13-d04-inference-kv-cache": [
    { python: "LAYERS, HEAD_DIM", pythonLines: 4, r: "layers <", rLines: 7, eli5: "A 32-layer model, 128 numbers per head, 2 bytes each, with 24 GiB of free memory." },
    { python: "def kv_bytes_per_token", pythonLines: 2, r: "kv_bytes_per_token", eli5: "Every token remembers a key and a value in every layer and every key-value head: that is the KV cache." },
    { python: "for name", pythonLines: 5, r: "configs <", rLines: 8, eli5: "With 32 KV heads each token costs 512 KiB; sharing heads (GQA, 8 heads) cuts it to 128 KiB, so 4 times as many requests fit." },
  ],
  "w14-d01-chunking-ingestion": [
    { python: "RAW = \"\"", pythonLines: 3, r: "raw <- \"Refunds", rLines: 3, eli5: "A messy policy text with extra spaces and line breaks." },
    { python: "def normalize", pythonLines: 2, r: "normalize", eli5: "Tidy it up: squash every run of spaces and line breaks into one space." },
    { python: "def chunk_words", pythonLines: 11, r: "chunk_words", rLines: 12, eli5: "Cut the words into pieces of 16, starting each new piece 12 words after the last, so neighbors share 4 words and no sentence is lost at a cut." },
    { python: "text = normalize", pythonLines: 5, r: "text <- normalize", rLines: 7, eli5: "51 words become 4 overlapping pieces ready to embed." },
  ],
  "w14-d02-bm25-hybrid-retrieval": [
    { python: "DOCS = {", pythonLines: 8, r: "docs <- c", rLines: 8, eli5: "Five short documents, plus the order a meaning-based (dense) search returned." },
    { python: "def bm25", pythonLines: 14, r: "bm25 <- function", rLines: 17, eli5: "BM25 scores each document: rare query words count more, repeated words help less and less, and long documents are evened out." },
    { python: "def rrf(rankings", pythonLines: 6, r: "rrf <- function", rLines: 10, eli5: "Reciprocal rank fusion: each list gives a document 1 / (60 + its rank) points, and we add them up." },
    { python: "scores = bm25", pythonLines: 6, r: "scores <", rLines: 7, eli5: "BM25 likes d5, dense likes d1; fused, d1 and d5 tie at the top and d3 is just behind." },
  ],
  "w14-d03-rag-evaluation": [
    { python: "RUNS = [", pythonLines: 5, r: "runs <- list", rLines: 5, eli5: "For three questions: which documents we fetched, and which ones were actually useful." },
    { python: "def metrics", pythonLines: 7, r: "metrics <", rLines: 9, eli5: "Recall counts how many useful documents we fetched. MRR rewards finding the first useful one early. nDCG rewards useful documents near the top." },
    { python: "def content_words", pythonLines: 2, r: "content_words", rLines: 4, eli5: "Keep the meaningful words: lowercase, at least 4 letters, not common filler." },
    { python: "context =", pythonLines: 9, r: "context <", rLines: 10, eli5: "For each answer sentence, what share of its meaningful words appear in the fetched text? The shipping sentence has no support, so it is flagged." },
  ],
  "w15-d01-workflows-vs-agents": [
    { python: "ALLOWED =", pythonLines: 6, r: "allowed <", rLines: 2, eli5: "The map of allowed moves: a refund can only go from step to step along these arrows." },
    { python: "def run_workflow", pythonLines: 9, r: "run_workflow", rLines: 8, eli5: "A fixed workflow: no receipt means reject; small refunds are approved automatically; big ones wait for a person." },
    { python: "def is_valid", pythonLines: 2, r: "is_valid", eli5: "Check every move in the path against the map." },
    { python: "for rid,", pythonLines: 3, r: "for (r in", rLines: 4, eli5: "Four requests take four different paths, and every move is allowed." },
  ],
  "w15-d02-tools-planning-memory": [
    { python: "def get_order", pythonLines: 6, r: "get_order", rLines: 2, eli5: "Two tools: look up an order, and convert money to dollars." },
    { python: "def plan", pythonLines: 8, r: "plan <- function", rLines: 8, eli5: "The planner looks at its notes: fetch any order it has not seen, convert any that are not in dollars, and only then answer." },
    { python: "def run_agent", pythonLines: 19, r: "run_agent", rLines: 25, eli5: "The loop: ask the planner, run the tool, write the result in the notes, and stop when it answers or runs out of steps." },
    { python: "for budget", pythonLines: 6, r: "for (budget", rLines: 6, eli5: "With 6 steps it answers 94.00 USD; with only 2 it stops before converting, and says so instead of guessing." },
  ],
  "w15-d03-guardrails-budgets-tracing": [
    { python: "STEPS = [", pythonLines: 8, r: "steps <-", rLines: 8, eli5: "A scripted run: plan, search, plan, a 500 USD refund, plan, answer, each with a token cost. The search result contains a sneaky instruction." },
    { python: "if used +", pythonLines: 4, r: "if (used", rLines: 5, eli5: "Before each step, check the token budget. If the step would go over, stop cleanly and record why." },
    { python: "if name =", pythonLines: 2, r: "if (s$name", rLines: 3, eli5: "Text that looks like orders inside a search result is flagged and kept as plain data." },
    { python: "if name == \"issue_refund", pythonLines: 2, r: "if (s$name == \"issue_refund", rLines: 3, eli5: "Refunds over 100 USD need a person to say yes. Here the person says no, so the refund is blocked." },
    { python: "for budget", pythonLines: 6, r: "for (budget", rLines: 6, eli5: "With 600 tokens the run completes safely; with 300 it stops before the refund step." },
  ],
  "w16-d03-remediation-planning": [
    { python: "TOPICS =", pythonLines: 8, r: "topics <", rLines: 7, eli5: "Six topics, each with how well you know it, how well you remember it, how many reviews are overdue, and how much it matters." },
    { python: "def priority", pythonLines: 2, r: "priority", eli5: "Priority grows when mastery is low, reviews are overdue and the topic matters, plus a little for weak recall." },
    { python: "ranked =", pythonLines: 7, r: "topics$p", rLines: 7, eli5: "Sort by priority and split 240 minutes across the top four in proportion: hypothesis testing gets the most time." },
  ],
};
