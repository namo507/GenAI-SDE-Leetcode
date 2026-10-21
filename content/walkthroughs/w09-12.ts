import type { WalkthroughStepInput } from "@/lib/curriculum";

export const walkthroughs: Record<string, WalkthroughStepInput[]> = {
  "w09-d01-backpropagation": [
    { python: "X, Y = 1", pythonLines: 2, r: "x <- 1.5", rLines: 3, eli5: "One input, one target, and four knobs: two weights and two nudges (biases)." },
    { python: "def loss", pythonLines: 4, r: "loss <- function", rLines: 5, eli5: "The forward pass: squash w1 times x with tanh, scale it by w2, and measure how far the guess is from the target." },
    { python: "def gradients", pythonLines: 6, r: "gradients", rLines: 7, eli5: "Backpropagation walks the chain backwards: how much does the error change if each knob moves a tiny bit? Each step multiplies by one more link of the chain." },
    { python: "def numeric_gradients", pythonLines: 8, r: "numeric_gradients", rLines: 9, eli5: "Double-check by actually wiggling each knob up and down a hair and watching the error." },
    { python: "g = gradients", pythonLines: 8, r: "g <- gradients", rLines: 6, eli5: "Both ways agree, and one small step downhill cuts the error from 0.132 to 0.076." },
  ],
  "w09-d02-optimizers-regularization": [
    { python: "def f(x:", pythonLines: 6, r: "f <- function", rLines: 2, eli5: "A long narrow valley: steep in one direction (y) and gentle in the other (x). The arrow downhill is the gradient." },
    { python: "def gd(lr", pythonLines: 6, r: "gd <- function", rLines: 5, eli5: "Plain gradient descent takes a fixed-size step downhill each time." },
    { python: "def momentum", pythonLines: 7, r: "momentum", rLines: 9, eli5: "Momentum is a rolling ball: it keeps some speed from earlier steps, so it zooms along the gentle direction." },
    { python: "def adam", pythonLines: 12, r: "adam <- function", rLines: 12, eli5: "Adam gives each direction its own step size, using a running average of the slope and of its size." },
    { python: "print(f\"start", pythonLines: 5, r: "cat(sprintf", rLines: 5, eli5: "A step of 0.09 reaches the bottom, but 0.105 is too big and bounces out of the valley to a loss of about 551,000." },
  ],
  "w09-d03-attention-transformers": [
    { python: "Q = [[1.0", pythonLines: 3, r: "Q <- matrix", rLines: 3, eli5: "Three words, each with a question (Q), a label (K) and a message (V)." },
    { python: "def softmax", pythonLines: 5, r: "softmax_rows", rLines: 4, eli5: "Softmax turns scores into shares that add up to 1." },
    { python: "def attention", pythonLines: 10, r: "attention", rLines: 6, eli5: "Each word compares its question with every label, turns the matches into shares, and mixes the messages by those shares." },
    { python: "if causal", pythonLines: 2, r: "if (causal", eli5: "Causal mode: a word may not peek at words that come after it, so those scores become minus infinity." },
    { python: "for causal", pythonLines: 5, r: "for (causal", rLines: 9, eli5: "Print the shares and mixed messages, without and with the no-peeking rule. The first word can then only listen to itself." },
  ],
  "w09-d04-cnn-rnn": [
    { python: "def conv1d", pythonLines: 2, r: "conv1d <", eli5: "Slide a 3-wide window along the signal and multiply by 1, 0, minus 1: it lights up where the signal changes." },
    { python: "relu = [max", pythonLines: 4, r: "conv <- conv1d", rLines: 5, eli5: "ReLU keeps only the positive answers, and pooling keeps the biggest of each pair." },
    { python: "def rnn(inputs", pythonLines: 6, r: "rnn <- function", rLines: 9, eli5: "A recurrent net reads one number at a time and carries a memory h forward, mixing old memory with the new input." },
    { python: "jac = 1.0", pythonLines: 4, r: "jac <- prod", rLines: 2, eli5: "Multiply how much each step passes back through the memory. The result shrinks to 0.26 after three steps: that is the vanishing gradient." },
  ],
  "w10-d01-estimation-api-design": [
    { python: "DAU = 50_000_000", pythonLines: 5, r: "dau <- 50e6", rLines: 8, eli5: "Write down the assumptions: 50 million daily users, 20 reads and 2 writes each, 1 KB per object, peaks 3 times the average, 3 copies of everything." },
    { python: "read_qps", pythonLines: 4, r: "read_qps", rLines: 4, eli5: "Turn per-day numbers into per-second numbers, and multiply out a year of storage." },
    { python: "print(f\"average", pythonLines: 5, r: "cat(sprintf", rLines: 5, eli5: "About 11,574 reads a second on average, 34,722 at peak, and about 110 TB a year of storage." },
  ],
  "w10-d02-caching-load-balancing": [
    { python: "def lru_simulate", pythonLines: 13, r: "lru_simulate", rLines: 16, eli5: "A small shelf holds 3 items. Using an item moves it to the front; when the shelf is full, the item unused the longest falls off." },
    { python: "def stable_hash", pythonLines: 5, r: "mul_mod32", rLines: 11, eli5: "Turn a key into a big number the same way every time. R splits the multiplication in two so it stays exact." },
    { python: "def ring_owner", pythonLines: 5, r: "ring_owner", rLines: 5, eli5: "On a ring of servers, a key belongs to the first server clockwise from its spot." },
    { python: "keys = [f", pythonLines: 6, r: "keys <- sprintf", rLines: 6, eli5: "Add a fourth server: with 'number mod servers', 16 of 20 keys move; with the ring, only 3 move." },
  ],
  "w10-d03-replication-queues": [
    { python: "MESSAGES", r: "ids <- c", rLines: 2, eli5: "The same message can arrive twice, like a letter delivered again by mistake." },
    { python: "def apply_idempotent", pythonLines: 10, r: "apply_idempotent", rLines: 14, eli5: "Keep a list of message ids already handled and skip repeats, so each payment counts once." },
    { python: "balance, skipped =", pythonLines: 2, r: "res <- apply_idempotent", rLines: 2, eli5: "Counting blindly gives 170; skipping repeats gives the right 100." },
    { python: "N = 3", pythonLines: 4, r: "n <- 3", rLines: 8, eli5: "With 3 copies, write to W and read from R. If W plus R is more than 3, the read always meets the latest write." },
  ],
  "w11-d01-etl-elt-cdc": [
    { python: "SNAPSHOT_LSN", pythonLines: 6, r: "snapshot_lsn", rLines: 2, eli5: "A photo of the table taken at change number 100." },
    { python: "EVENTS =", pythonLines: 8, r: "events <", rLines: 8, eli5: "The change log arrives jumbled: out of order, with one repeat and one change the photo already includes." },
    { python: "def apply_cdc", pythonLines: 7, r: "apply_cdc", rLines: 10, eli5: "Sort the changes by number and skip any change at or before the last one applied, so repeats and old changes do nothing." },
    { python: "if op ==", pythonLines: 8, r: "if (e$op", rLines: 11, eli5: "Apply inserts, updates and deletes, remembering the last change number." },
    { python: "table, applied, skipped, last =", pythonLines: 4, r: "res <- apply_cdc", rLines: 5, eli5: "Four changes applied, two skipped, and the table ends at change 104." },
  ],
  "w11-d02-formats-spark-shuffle": [
    { python: "def stable_hash", pythonLines: 5, r: "mul_mod32", rLines: 11, eli5: "A hash that gives the same number for a word on every machine, so every copy of a word goes to the same reducer." },
    { python: "mapped =", pythonLines: 4, r: "mapped <", rLines: 4, eli5: "Map turns each line into (word, 1) pairs. Combining counts inside each task first means fewer pairs travel over the network: 10 instead of 12." },
    { python: "reduced:", pythonLines: 6, r: "reduced <", rLines: 13, eli5: "Shuffle sends each word to partition hash(word) mod 3, where reducers add up the counts. One partition gets nothing, which is skew in miniature." },
  ],
  "w11-d03-streaming-windows": [
    { python: "ARRIVALS", pythonLines: 2, r: "arrivals", eli5: "Events arrive out of time order. Windows are 10 seconds long, and we wait 5 extra seconds for stragglers." },
    { python: "for t in", pythonLines: 7, r: "for (t in", rLines: 9, eli5: "Put each event in its window. The watermark is the latest time seen minus 5: our promise that older events are done arriving." },
    { python: "for s in", pythonLines: 4, r: "for (s in", rLines: 8, eli5: "Once the watermark passes a window's end, send its count and close it." },
    { python: "if start", pythonLines: 3, r: "if (start", rLines: 4, eli5: "An event for a window that is already closed is too late and gets dropped, like the event at 9 seconds." },
    { python: "log.append(f\"flush", r: "log <- c(log, sprintf(\"flush", eli5: "At the end, flush whatever windows are still open." },
  ],
  "w11-d04-data-quality-orchestration": [
    { python: "BATCH = [", r: "batch <-", eli5: "A batch of five rows: one id is repeated and the data is 26 hours old." },
    { python: "def run_checks", pythonLines: 9, r: "run_checks", rLines: 9, eli5: "The data contract: ids present and unique, amounts in range, and data fresher than 24 hours. Each rule says whether a failure blocks or only warns." },
    { python: "def run_dag", pythonLines: 7, r: "run_dag <", rLines: 8, eli5: "Run the pipeline in order. A blocking failure in validation means transform and publish are skipped, so bad data never reaches users." },
    { python: "results = run_checks", pythonLines: 5, r: "results <", rLines: 7, eli5: "Print each check and each task's status." },
  ],
  "w12-d01-cicd-canary": [
    { python: "def p95(samples", pythonLines: 3, r: "p95 <- function", eli5: "p95 latency: sort the times and take the one 95% of the way up." },
    { python: "def worse_error_rate", pythonLines: 5, r: "worse_error_rate", rLines: 7, eli5: "Is the canary's error rate worse than the old version's by more than luck would explain? A one-sided z-test answers that." },
    { python: "p1, p2, z =", pythonLines: 3, r: "e <- worse_error_rate", rLines: 3, eli5: "Two gates: the error z-score must stay under 1.645, and p95 latency may grow by at most 10%." },
    { python: "print(f\"error", pythonLines: 3, r: "cat(sprintf", rLines: 3, eli5: "Latency passes but errors fail, so the release rolls back." },
  ],
  "w12-d02-feature-stores-serving": [
    { python: "LABELS =", pythonLines: 2, r: "labels <", rLines: 6, eli5: "Labels happen at certain times, and the feature value changes over time." },
    { python: "def as_of", pythonLines: 3, r: "as_of <-", rLines: 4, eli5: "Point-in-time join: use the latest feature value known at or before the label's time." },
    { python: "def latest", pythonLines: 2, r: "latest <", rLines: 4, eli5: "The leaky way: always grab the newest value, even if it came after the label." },
    { python: "leaks = 0", pythonLines: 7, r: "leaks <-", rLines: 10, eli5: "Every row of the leaky join used a value from the future, which makes offline results look too good." },
  ],
  "w12-d03-drift-observability": [
    { python: "BASELINE", pythonLines: 2, r: "baseline", rLines: 2, eli5: "How a feature's values were spread across 5 buckets in training, and how they are spread now for two features." },
    { python: "def psi(expected", pythonLines: 7, r: "psi <- function", rLines: 5, eli5: "PSI adds up, for each bucket, how much the share moved times the log of how much it changed. A tiny floor avoids dividing by zero." },
    { python: "def status", pythonLines: 2, r: "status <", eli5: "Below 0.1 is stable, 0.1 to 0.25 is worth a look, above 0.25 is a big shift." },
    { python: "for name", pythonLines: 3, r: "for (name", rLines: 4, eli5: "Feature a barely moved; feature b shifted a lot (0.43) and needs attention." },
  ],
};
