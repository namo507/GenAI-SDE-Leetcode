import { REVIEWED, code, defineTopic, edge, node, step } from "../helpers";
import type { ExtraWeek } from "./types";

export const w08: ExtraWeek = {
  schedule: [
    {
      dayId: "w08-d01",
      topicId: "w08-d01-knn-naive-bayes",
      tasks: [
        { label: "k-nearest neighbors and Naive Bayes from scratch", minutes: 30 },
        { label: "Choosing k and smoothing prompts", minutes: 15 },
      ],
    },
    {
      dayId: "w08-d02",
      topicId: "w08-d02-recommender-systems",
      tasks: [
        { label: "Item-item collaborative filtering and cold start", minutes: 30 },
        { label: "Offline evaluation: leave-one-out hit rate", minutes: 15 },
      ],
    },
    {
      dayId: "w08-d04",
      topicId: "w08-d04-model-interpretability",
      tasks: [
        { label: "Permutation importance and SHAP for a linear model", minutes: 30 },
        { label: "Explaining a single prediction to a stakeholder", minutes: 15 },
      ],
    },
  ],
  topics: [
    defineTopic({
      id: "w08-d01-knn-naive-bayes",
      slug: "knn-naive-bayes",
      title: "k-nearest neighbors and Naive Bayes",
      domain: "ml",
      roles: ["data-scientist", "ml-engineer", "data-analyst"],
      difficulty: "beginner",
      minutes: 45,
      prerequisites: ["w07-d01-feature-engineering", "w05-d01-probability-distributions"],
      objectives: [
        "Classify with k-nearest neighbors and explain how k trades noise for smoothness",
        "Train a multinomial Naive Bayes text classifier with Laplace smoothing in log space",
        "Say when these simple baselines beat heavier models and when they fail",
      ],
      summary:
        "Two classic baselines. k-nearest neighbors labels a point by asking its k closest neighbors to vote, so it needs no training but needs scaled features and a good k. Naive Bayes multiplies per-word probabilities as if words were independent, which is wrong but fast, and often a strong first model for text.",
      eli5: {
        analogy:
          "kNN is asking the kids sitting nearest to you which team they are on and joining the most popular one. Naive Bayes is a detective with a notebook: 'free' shows up a lot in junk mail and rarely in letters from friends, so every clue nudges the guess one way or the other.",
        steps: [
          "kNN: measure how far you are from every known point.",
          "kNN: let the k closest points vote; the most votes wins.",
          "Naive Bayes: count how often each word appears in spam and in normal mail.",
          "Naive Bayes: for a new message, add up the evidence from each word and see which pile it fits better.",
        ],
        analogyLimit:
          "Real neighbors can be far away in a hundred dimensions, where 'closest' stops meaning much, and real words are not independent clues: 'New' and 'York' travel together.",
      },
      senior: {
        definition:
          "kNN is a non-parametric, instance-based classifier: predict the majority label among the k training points nearest to the query under a distance metric. Multinomial Naive Bayes is a generative classifier: P(class | words) is proportional to P(class) times the product of P(word | class), assuming words are conditionally independent given the class.",
        invariants: [
          "kNN distances are only meaningful when features are on comparable scales.",
          "Naive Bayes needs smoothing so a word never seen with a class does not zero out the whole product.",
          "Probabilities are combined as sums of logs to avoid underflow.",
        ],
        mechanism: [
          "At query (3.0, 3.0), the single nearest point is the noisy B at (3.2, 3.0), so k = 1 says B; with k = 3 two A points outvote it.",
          "Laplace smoothing adds alpha = 1 to every word count: P(w | c) = (count + 1) / (total words in c + vocabulary size).",
          "Words outside the vocabulary are ignored, so 'hello world' falls back to the prior P(spam) = 3/7 ≈ 0.429.",
          "Scores are converted back to probabilities with a stable softmax: subtract the largest log score before exponentiating.",
        ],
        complexity:
          "kNN: no training, O(n · d) per query by brute force (KD-trees or approximate indexes speed this up). Naive Bayes: O(total tokens) to train, O(words in the message) to predict.",
        tradeoffs: [
          { option: "kNN", choose: "Small, low-dimensional data with a meaningful distance; quick baseline.", cost: "Slow queries on big data, sensitive to scaling and irrelevant features." },
          { option: "Naive Bayes", choose: "Text, many sparse features, little data, need for speed.", cost: "Probabilities are poorly calibrated because of the independence assumption." },
          { option: "Logistic regression", choose: "When you want calibrated probabilities and can afford training.", cost: "Needs more data and tuning than Naive Bayes." },
        ],
        failureModes: [
          "Running kNN on unscaled features, so income in dollars swamps age in years.",
          "Choosing k = 1, which memorizes label noise.",
          "Forgetting smoothing, so one unseen word sets a class probability to zero.",
          "Trusting Naive Bayes probabilities as calibrated risk scores.",
        ],
        production:
          "kNN at scale becomes vector search: approximate nearest neighbor indexes (HNSW, IVF) answer queries in milliseconds. Naive Bayes remains a common spam and intent baseline because it trains in one pass and updates incrementally.",
        interviewAnswer:
          "kNN predicts by majority vote of the k closest training points, so I scale features first and pick k by cross-validation: small k overfits noise, large k blurs boundaries. Naive Bayes multiplies P(word | class) under an independence assumption, with Laplace smoothing and log probabilities. It is fast and strong on text, but its probabilities are overconfident, so I calibrate them if decisions depend on the numbers.",
      },
      implementation: {
        problem: "Classify 3 query points with kNN for k = 1, 3, 5, then train a multinomial Naive Bayes spam filter on 7 messages and score 5 new ones.",
        input: "8 labeled 2D points (one noisy B near the A cluster); 7 messages labeled spam or ham",
        python: {
          code: code`
            from math import exp, log, sqrt

            POINTS = [((1.0, 1.0), "A"), ((1.5, 2.0), "A"), ((2.0, 1.2), "A"), ((2.6, 2.4), "A"),
                      ((5.0, 5.5), "B"), ((6.0, 5.0), "B"), ((5.5, 6.5), "B"), ((3.2, 3.0), "B")]
            DOCS = [("win money now", "spam"), ("free money offer", "spam"), ("win a free prize", "spam"),
                    ("meeting at noon", "ham"), ("lunch money tomorrow", "ham"), ("project meeting notes", "ham"),
                    ("see you at lunch", "ham")]


            def knn(query, k):
                dists = []
                for (x, y), label in POINTS:
                    dists.append((sqrt((x - query[0]) ** 2 + (y - query[1]) ** 2), label))
                dists.sort()
                votes = {}
                for _, label in dists[:k]:
                    votes[label] = votes.get(label, 0) + 1
                winner = sorted(votes.items(), key=lambda kv: (-kv[1], kv[0]))[0][0]
                return winner, votes


            def train_nb(docs, alpha=1.0):
                classes = sorted({c for _, c in docs})
                vocab = sorted({w for d, _ in docs for w in d.split()})
                model = {"classes": classes, "vocab": set(vocab), "log_prior": {}, "log_like": {}}
                for c in classes:
                    texts = [d for d, label in docs if label == c]
                    model["log_prior"][c] = log(len(texts) / len(docs))
                    counts = {w: 0 for w in vocab}
                    total = 0
                    for d in texts:
                        for w in d.split():
                            counts[w] += 1
                            total += 1
                    model["log_like"][c] = {w: log((counts[w] + alpha) / (total + alpha * len(vocab))) for w in vocab}
                return model


            def p_spam(model, text):
                scores = {}
                for c in model["classes"]:
                    s = model["log_prior"][c]
                    for w in text.split():
                        if w in model["vocab"]:
                            s += model["log_like"][c][w]
                    scores[c] = s
                top = max(scores.values())
                weights = {c: exp(s - top) for c, s in scores.items()}
                return weights["spam"] / (weights["ham"] + weights["spam"])


            for q in [(2.0, 2.0), (3.0, 3.0), (4.5, 4.5)]:
                for k in (1, 3, 5):
                    label, votes = knn(q, k)
                    print(f"knn query ({q[0]:.1f}, {q[1]:.1f}) k={k}: {label} (votes A={votes.get('A', 0)} B={votes.get('B', 0)})")
            nb = train_nb(DOCS)
            print(f"naive bayes vocabulary {len(nb['vocab'])} words, prior P(spam) {exp(nb['log_prior']['spam']):.3f}")
            for text in ["free money", "lunch meeting at noon", "win lunch", "free prize meeting", "hello world"]:
                print(f"P(spam | '{text}') = {p_spam(nb, text):.3f}")
          `,
        },
        r: {
          code: code`
            points <- data.frame(
              x = c(1.0, 1.5, 2.0, 2.6, 5.0, 6.0, 5.5, 3.2),
              y = c(1.0, 2.0, 1.2, 2.4, 5.5, 5.0, 6.5, 3.0),
              label = c("A", "A", "A", "A", "B", "B", "B", "B")
            )
            docs <- data.frame(
              text = c("win money now", "free money offer", "win a free prize", "meeting at noon",
                       "lunch money tomorrow", "project meeting notes", "see you at lunch"),
              label = c("spam", "spam", "spam", "ham", "ham", "ham", "ham")
            )

            knn <- function(qx, qy, k) {
              d <- sqrt((points$x - qx)^2 + (points$y - qy)^2)
              nearest <- points$label[order(d, points$label)][seq_len(k)]
              votes <- c(A = sum(nearest == "A"), B = sum(nearest == "B"))
              list(label = names(votes)[order(-votes, names(votes))][1], votes = votes)
            }

            words_of <- function(text) strsplit(text, " ", fixed = TRUE)[[1]]

            train_nb <- function(docs, alpha = 1) {
              classes <- sort(unique(docs$label))
              vocab <- sort(unique(unlist(lapply(docs$text, words_of))))
              log_prior <- c()
              log_like <- list()
              for (cl in classes) {
                texts <- docs$text[docs$label == cl]
                log_prior[cl] <- log(length(texts) / nrow(docs))
                tokens <- unlist(lapply(texts, words_of))
                counts <- vapply(vocab, function(w) sum(tokens == w), numeric(1))
                log_like[[cl]] <- log((counts + alpha) / (length(tokens) + alpha * length(vocab)))
              }
              list(classes = classes, vocab = vocab, log_prior = log_prior, log_like = log_like)
            }

            p_spam <- function(model, text) {
              scores <- c()
              for (cl in model$classes) {
                s <- model$log_prior[[cl]]
                for (w in words_of(text)) if (w %in% model$vocab) s <- s + model$log_like[[cl]][[w]]
                scores[cl] <- s
              }
              weights <- exp(scores - max(scores))
              weights[["spam"]] / (weights[["ham"]] + weights[["spam"]])
            }

            for (q in list(c(2, 2), c(3, 3), c(4.5, 4.5))) {
              for (k in c(1, 3, 5)) {
                res <- knn(q[1], q[2], k)
                cat(sprintf("knn query (%.1f, %.1f) k=%d: %s (votes A=%d B=%d)\n", q[1], q[2], k, res$label, res$votes[["A"]], res$votes[["B"]]))
              }
            }
            nb <- train_nb(docs)
            cat(sprintf("naive bayes vocabulary %d words, prior P(spam) %.3f\n", length(nb$vocab), exp(nb$log_prior[["spam"]])))
            for (text in c("free money", "lunch meeting at noon", "win lunch", "free prize meeting", "hello world")) {
              cat(sprintf("P(spam | '%s') = %.3f\n", text, p_spam(nb, text)))
            }
          `,
        },
        expectedOutput: code`
        knn query (2.0, 2.0) k=1: A (votes A=1 B=0)
        knn query (2.0, 2.0) k=3: A (votes A=3 B=0)
        knn query (2.0, 2.0) k=5: A (votes A=4 B=1)
        knn query (3.0, 3.0) k=1: B (votes A=0 B=1)
        knn query (3.0, 3.0) k=3: A (votes A=2 B=1)
        knn query (3.0, 3.0) k=5: A (votes A=4 B=1)
        knn query (4.5, 4.5) k=1: B (votes A=0 B=1)
        knn query (4.5, 4.5) k=3: B (votes A=0 B=3)
        knn query (4.5, 4.5) k=5: B (votes A=1 B=4)
        naive bayes vocabulary 16 words, prior P(spam) 0.429
        P(spam | 'free money') = 0.808
        P(spam | 'lunch meeting at noon') = 0.021
        P(spam | 'win lunch') = 0.483
        P(spam | 'free prize meeting') = 0.675
        P(spam | 'hello world') = 0.429
      `,
        tests: {
          python: code`
            def test_knn_k1_follows_the_noisy_point():
                assert knn((3.2, 3.0), 1)[0] == "B"


            def test_unknown_words_return_the_prior():
                assert abs(p_spam(nb, "zzz qqq") - 3 / 7) < 1e-12


            def test_smoothing_keeps_probabilities_inside_zero_one():
                p = p_spam(nb, "prize")
                assert 0.0 < p < 1.0
          `,
          r: code`
            test_that("k = 1 follows the noisy point", {
              expect_equal(knn(3.2, 3.0, 1)$label, "B")
            })

            test_that("unknown words return the prior", {
              expect_equal(p_spam(nb, "zzz qqq"), 3 / 7, tolerance = 1e-12)
            })
          `,
        },
        eli5Trace: [
          "A point at (2, 2) sits in the middle of the A kids, so every k says A.",
          "A point at (3, 3) has one B kid right next to it. Asking only that one kid (k = 1) says B; asking three kids says A.",
          "The detective learns 16 words. Three of the seven practice letters were junk, so before reading anything it guesses junk 43% of the time.",
          "'free money' looks like junk (81%), while 'lunch meeting at noon' looks like a friend's note (2%).",
          "'hello world' has no words the detective knows, so it stays at its starting guess of 43%.",
        ],
        complexity: { time: "kNN O(n · d) per query; NB O(tokens)", space: "kNN O(n · d); NB O(classes · vocabulary)" },
        edgeCases: [
          "Ties in kNN votes need a rule: here the alphabetically first label wins; odd k avoids two-class ties.",
          "Duplicate points at distance 0 make k = 1 return the training label exactly.",
          "Messages made only of unseen words fall back to the prior.",
          "Very long messages produce tiny probabilities that underflow without log space.",
        ],
        incorrect: {
          language: "python",
          code: code`
            p = prior[c]
            for w in words:
                p *= counts[c][w] / totals[c]  # no smoothing, raw product
          `,
          whyWrong: "One word never seen with class c makes the whole product exactly 0, and multiplying many small numbers underflows to 0 even when every word was seen.",
          fix: "Add Laplace smoothing (count + alpha over total + alpha times vocabulary size) and sum log probabilities instead of multiplying.",
        },
        walkthrough: [
          { python: "POINTS = [", pythonLines: 2, r: "points <- data.frame(", rLines: 5, eli5: "Eight kids on a playground map, each wearing a team shirt, A or B. One B kid wandered close to the A group." },
          { python: "def knn(query, k):", pythonLines: 10, r: "knn <- function(qx, qy, k) {", rLines: 6, eli5: "Measure how far the new kid is from everyone, line them up from nearest to farthest, and let the k nearest vote." },
          { python: "def train_nb(docs, alpha=1.0):", pythonLines: 15, r: "train_nb <- function(docs, alpha = 1) {", rLines: 14, eli5: "The detective counts every word in junk mail and in friendly mail, adding 1 to every count so no word is ever 'impossible'." },
          { python: "def p_spam(model, text):", pythonLines: 11, r: "p_spam <- function(model, text) {", rLines: 10, eli5: "For a new letter, add up how junk-like and how friendly each known word is, then turn the two totals into a probability." },
          { python: "for q in [(2.0, 2.0), (3.0, 3.0), (4.5, 4.5)]:", pythonLines: 4, r: "for (q in list(c(2, 2), c(3, 3), c(4.5, 4.5))) {", rLines: 6, eli5: "Ask about three new kids with 1, 3 and 5 neighbors voting. Watch the middle kid change teams as k grows." },
          { python: "nb = train_nb(DOCS)", pythonLines: 4, r: "nb <- train_nb(docs)", rLines: 5, eli5: "Train the detective once and score five new letters." },
        ],
      },
      flow: {
        title: "Two simple classifiers",
        nodes: [
          node("query", "New example", 0, 120, "point or message"),
          node("dist", "Distances", 230, 30, "to every training point"),
          node("vote", "k nearest vote", 460, 30, "majority label"),
          node("counts", "Word evidence", 230, 210, "smoothed log P(word | class)"),
          node("post", "Posterior", 460, 210, "prior + evidence"),
          node("label", "Prediction", 690, 120, "class"),
        ],
        edges: [edge("query", "dist"), edge("dist", "vote"), edge("vote", "label"), edge("query", "counts"), edge("counts", "post"), edge("post", "label")],
        steps: [
          step("query dist", "query-dist", "kNN measures the distance from the query to every stored example, after features are scaled."),
          step("dist vote", "dist-vote", "The k closest examples vote. Small k follows noise; large k smooths the boundary."),
          step("query counts", "query-counts", "Naive Bayes looks up each known word's smoothed log probability under each class."),
          step("counts post", "counts-post", "Adding the log prior and the word evidence gives each class a score; a softmax turns scores into probabilities."),
          step("vote post label", "vote-label post-label", "Either way the output is a class, with a vote share or a probability attached."),
        ],
      },
      practice: [
        {
          id: "w08-knn-recall-1",
          type: "recall",
          prompt: "Why does kNN get worse as the number of features grows, even with lots of data?",
          answer: "In high dimensions distances concentrate: the nearest and farthest points end up at similar distances, so 'nearest' carries little information (the curse of dimensionality). Irrelevant features add noise to every distance. Feature selection, dimensionality reduction or learned embeddings help.",
          rubric: ["Distance concentration", "Irrelevant features add noise", "Mitigation"],
        },
        {
          id: "w08-nb-recall-1",
          type: "recall",
          prompt: "What does Laplace smoothing fix in Naive Bayes, and what does it cost?",
          answer: "It prevents zero probabilities for words never seen with a class, which would otherwise veto the class entirely. It biases estimates toward uniform, which matters most for rare words and small datasets; alpha can be tuned by cross-validation.",
          rubric: ["Zero-probability veto", "Bias toward uniform", "Tune alpha"],
        },
        {
          id: "w08-knn-case-1",
          type: "case",
          prompt: "A kNN churn model works offline but takes 2 seconds per prediction in production with 5 million customers. What do you do?",
          answer: "Replace brute-force search with an approximate nearest neighbor index (HNSW or IVF via FAISS or a vector database), reduce dimensionality, precompute neighbors for known customers, or switch to a parametric model such as logistic regression or boosting that predicts in constant time.",
          rubric: ["ANN index", "Dimensionality reduction", "Precompute", "Parametric alternative"],
        },
      ],
      references: [
        { title: "scikit-learn user guide: Nearest Neighbors", url: "https://scikit-learn.org/stable/modules/neighbors.html", versionSensitive: true },
        { title: "scikit-learn user guide: Naive Bayes", url: "https://scikit-learn.org/stable/modules/naive_bayes.html", versionSensitive: true },
      ],
      lastReviewed: REVIEWED,
    }),

    defineTopic({
      id: "w08-d02-recommender-systems",
      slug: "recommender-systems",
      title: "Recommender systems: collaborative filtering and cold start",
      domain: "advanced-ml",
      roles: ["data-scientist", "ml-engineer"],
      difficulty: "intermediate",
      minutes: 50,
      prerequisites: ["w08-d01-knn-naive-bayes"],
      objectives: [
        "Compute item-item cosine similarity from a ratings matrix and rank unseen items for a user",
        "Fall back to popularity with a minimum-count rule for brand-new users",
        "Evaluate a recommender offline with leave-one-out hit rate and know its limits",
      ],
      summary:
        "Recommenders predict what a user will like from what similar users or items did. Item-item collaborative filtering says 'people who liked this also liked that'. New users and new items have no history (cold start), so systems blend in popularity and content features, and they are judged with ranking metrics like hit rate and NDCG, then confirmed with online tests.",
      eli5: {
        analogy:
          "A librarian notices that kids who loved 'Brave' usually also loved 'Moana'. So when you say you loved 'Brave', she hands you 'Moana'. If you are brand new and have not read anything, she hands you whatever most kids liked.",
        steps: [
          "Write down who liked which movies.",
          "Two movies are 'similar' if the same people liked both.",
          "For you, add up how similar each movie you have not seen is to the movies you liked.",
          "Show the highest scores. If you are new, show the crowd favorites.",
        ],
        analogyLimit:
          "Real systems have millions of users and items, mostly empty ratings, and feedback loops: what you recommend changes what people click, which changes future training data.",
      },
      senior: {
        definition:
          "Collaborative filtering predicts preferences from the user-item interaction matrix alone. Item-item CF scores an unseen item i for user u as a similarity-weighted combination of u's ratings on items similar to i. Matrix factorization learns low-dimensional user and item vectors whose dot product approximates interactions.",
        invariants: [
          "Never recommend items the user already interacted with unless re-consumption is the goal.",
          "Offline evaluation must hide interactions from training before scoring, as leave-one-out does here.",
          "Cold-start users and items need a non-collaborative fallback.",
        ],
        mechanism: [
          "Cosine similarity between item columns: dot product over users divided by the product of norms. Dune's nearest items are alien (0.97) and gravity (0.77).",
          "For ranking, each unseen item scores the sum of similarity × rating over the user's rated items; Chloe, who rates only family films, gets moana at 11.29 and alien at only 2.97.",
          "Dividing that sum by the total similarity would estimate a star rating instead, but with few ratings it ranks almost every item near the user's average.",
          "Popularity uses the mean rating with a minimum of 3 ratings, so one enthusiastic rating cannot crown an item.",
        ],
        complexity:
          "Item-item similarity is O(items² · users) naively; sparse matrix products and approximate nearest neighbor search make it practical. Scoring one user is O(unseen items × rated items).",
        tradeoffs: [
          { option: "Item-item CF", choose: "Stable catalogs, explainable 'because you liked X'.", cost: "Cold start for new items; popularity bias." },
          { option: "Matrix factorization or two-tower models", choose: "Large sparse data, need for embeddings and retrieval.", cost: "Training cost, harder to explain." },
          { option: "Content-based", choose: "New items with good metadata or text.", cost: "Recommends more of the same; needs features." },
        ],
        failureModes: [
          "Evaluating on interactions the model trained on, which inflates offline metrics.",
          "Popularity bias: the same blockbusters for everyone.",
          "Feedback loops where recommended items get more clicks only because they were shown.",
          "Treating missing ratings as dislikes rather than unknown.",
        ],
        production:
          "Large systems use a two-stage design: fast candidate generation (item-item lists, embeddings with approximate nearest neighbor search) followed by a ranking model with rich features, then business rules for diversity, freshness and filtering. Offline metrics pick candidates; online A/B tests decide.",
        interviewAnswer:
          "I start with item-item collaborative filtering: cosine similarity between item vectors, then score unseen items by similarity-weighted ratings, with a popularity fallback for cold-start users and content features for new items. I evaluate offline with a temporal or leave-one-out split using hit rate, recall@k or NDCG, then confirm with an A/B test, because offline gains often do not transfer when recommendations change user behavior.",
      },
      implementation: {
        problem: "Build item-item collaborative filtering on a 6 user × 8 movie ratings matrix, recommend 2 movies for two users, handle a cold-start user, and evaluate with leave-one-out hit rate@2.",
        input: "6 users rate 8 movies from 1 to 5 (0 = not rated); sci-fi fans and family-film fans",
        python: {
          code: code`
            from math import sqrt

            ITEMS = ["alien", "brave", "coco", "dune", "elf", "frozen", "gravity", "moana"]
            RATINGS = {  # 0 means not rated
                "ana":   [5, 0, 0, 5, 0, 1, 0, 2],
                "ben":   [4, 1, 0, 5, 0, 0, 5, 0],
                "chloe": [0, 5, 4, 0, 4, 5, 0, 0],
                "dev":   [1, 4, 5, 0, 5, 0, 1, 5],
                "emma":  [5, 0, 0, 4, 1, 2, 4, 0],
                "finn":  [0, 5, 0, 1, 4, 4, 0, 5],
            }


            def cosine(i, j, ratings):
                dot = norm_i = norm_j = 0.0
                for row in ratings.values():
                    dot += row[i] * row[j]
                    norm_i += row[i] * row[i]
                    norm_j += row[j] * row[j]
                return dot / sqrt(norm_i * norm_j) if norm_i and norm_j else 0.0


            def similarity_matrix(ratings):
                n = len(ITEMS)
                return [[cosine(i, j, ratings) for j in range(n)] for i in range(n)]


            def recommend(user_row, sim, k):
                scored = []
                for i in range(len(ITEMS)):
                    if user_row[i] == 0:
                        score = 0.0
                        for j, r in enumerate(user_row):
                            if r > 0:
                                score += sim[i][j] * r
                        scored.append((score, ITEMS[i]))
                scored.sort(key=lambda s: (-s[0], s[1]))
                return scored[:k]


            def popular(ratings, k, min_count=3):
                stats = []
                for i, name in enumerate(ITEMS):
                    seen = [row[i] for row in ratings.values() if row[i] > 0]
                    if len(seen) >= min_count:
                        total = 0.0
                        for r in seen:
                            total += r
                        stats.append((total / len(seen), name))
                stats.sort(key=lambda s: (-s[0], s[1]))
                return stats[:k]


            sim = similarity_matrix(RATINGS)
            order = sorted((j for j in range(len(ITEMS)) if j != 3), key=lambda j: (-sim[3][j], ITEMS[j]))
            print("most similar to dune: " + ", ".join(f"{ITEMS[j]} {sim[3][j]:.2f}" for j in order[:4]))
            for user in ("ana", "chloe"):
                recs = recommend(RATINGS[user], sim, 2)
                print(f"for {user}: " + ", ".join(f"{name} (score {score:.2f})" for score, name in recs))
            print("new user (cold start), most popular: " + ", ".join(f"{name} ({score:.2f})" for score, name in popular(RATINGS, 2)))
            hits = 0
            for user, row in RATINGS.items():
                liked = max(range(len(ITEMS)), key=lambda i: (row[i], -i))
                held = row[:]
                held[liked] = 0
                train = dict(RATINGS)
                train[user] = held
                top = [name for _, name in recommend(held, similarity_matrix(train), 2)]
                hit = ITEMS[liked] in top
                hits += hit
                print(f"leave-one-out {user}: hid {ITEMS[liked]}, top-2 {' '.join(top)} -> {'hit' if hit else 'miss'}")
            print(f"hit rate@2 = {hits}/{len(RATINGS)}")
          `,
        },
        r: {
          code: code`
            items <- c("alien", "brave", "coco", "dune", "elf", "frozen", "gravity", "moana")
            ratings <- rbind( # 0 means not rated
              ana   = c(5, 0, 0, 5, 0, 1, 0, 2),
              ben   = c(4, 1, 0, 5, 0, 0, 5, 0),
              chloe = c(0, 5, 4, 0, 4, 5, 0, 0),
              dev   = c(1, 4, 5, 0, 5, 0, 1, 5),
              emma  = c(5, 0, 0, 4, 1, 2, 4, 0),
              finn  = c(0, 5, 0, 1, 4, 4, 0, 5)
            )
            colnames(ratings) <- items

            cosine <- function(i, j, ratings) {
              dot <- 0
              norm_i <- 0
              norm_j <- 0
              for (u in seq_len(nrow(ratings))) {
                dot <- dot + ratings[u, i] * ratings[u, j]
                norm_i <- norm_i + ratings[u, i] * ratings[u, i]
                norm_j <- norm_j + ratings[u, j] * ratings[u, j]
              }
              if (norm_i > 0 && norm_j > 0) dot / sqrt(norm_i * norm_j) else 0
            }

            similarity_matrix <- function(ratings) {
              n <- ncol(ratings)
              outer(seq_len(n), seq_len(n), Vectorize(function(i, j) cosine(i, j, ratings)))
            }

            recommend <- function(user_row, sim, k) {
              candidates <- which(user_row == 0)
              scores <- vapply(candidates, function(i) {
                score <- 0
                for (j in which(user_row > 0)) score <- score + sim[i, j] * user_row[j]
                score
              }, numeric(1))
              keep <- order(-scores, items[candidates])[seq_len(min(k, length(candidates)))]
              data.frame(item = items[candidates][keep], score = scores[keep])
            }

            popular <- function(ratings, k, min_count = 3) {
              avg <- c()
              for (i in seq_along(items)) {
                seen <- ratings[ratings[, i] > 0, i]
                if (length(seen) >= min_count) {
                  total <- 0
                  for (r in seen) total <- total + r
                  avg[items[i]] <- total / length(seen)
                }
              }
              keep <- order(-avg, names(avg))[seq_len(k)]
              data.frame(item = names(avg)[keep], score = avg[keep])
            }

            sim <- similarity_matrix(ratings)
            others <- setdiff(seq_along(items), 4)
            others <- others[order(-sim[4, others], items[others])][1:4]
            cat(sprintf("most similar to dune: %s\n", paste(sprintf("%s %.2f", items[others], sim[4, others]), collapse = ", ")))
            for (user in c("ana", "chloe")) {
              recs <- recommend(ratings[user, ], sim, 2)
              cat(sprintf("for %s: %s\n", user, paste(sprintf("%s (score %.2f)", recs$item, recs$score), collapse = ", ")))
            }
            top <- popular(ratings, 2)
            cat(sprintf("new user (cold start), most popular: %s\n", paste(sprintf("%s (%.2f)", top$item, top$score), collapse = ", ")))
            hits <- 0
            for (user in rownames(ratings)) {
              liked <- which.max(ratings[user, ])
              train <- ratings
              train[user, liked] <- 0
              top2 <- recommend(train[user, ], similarity_matrix(train), 2)$item
              hit <- items[liked] %in% top2
              hits <- hits + hit
              cat(sprintf("leave-one-out %s: hid %s, top-2 %s -> %s\n", user, items[liked], paste(top2, collapse = " "), if (hit) "hit" else "miss"))
            }
            cat(sprintf("hit rate@2 = %d/%d\n", as.integer(hits), nrow(ratings)))
          `,
        },
        expectedOutput: code`
        most similar to dune: alien 0.97, gravity 0.77, frozen 0.31, moana 0.25
        for ana: gravity (score 8.12), elf (score 3.79)
        for chloe: moana (score 11.29), alien (score 2.97)
        new user (cold start), most popular: moana (4.00), alien (3.75)
        leave-one-out ana: hid alien, top-2 gravity alien -> hit
        leave-one-out ben: hid dune, top-2 dune frozen -> hit
        leave-one-out chloe: hid brave, top-2 moana brave -> hit
        leave-one-out dev: hid coco, top-2 frozen coco -> hit
        leave-one-out emma: hid alien, top-2 alien brave -> hit
        leave-one-out finn: hid brave, top-2 coco brave -> hit
        hit rate@2 = 6/6
      `,
        tests: {
          python: code`
            def test_similarity_is_symmetric_with_unit_diagonal():
                for i in range(len(ITEMS)):
                    assert abs(sim[i][i] - 1.0) < 1e-12
                    for j in range(len(ITEMS)):
                        assert abs(sim[i][j] - sim[j][i]) < 1e-12


            def test_never_recommends_rated_items():
                for row in RATINGS.values():
                    for _, name in recommend(row, sim, 3):
                        assert row[ITEMS.index(name)] == 0


            def test_cold_start_respects_min_count():
                names = [name for _, name in popular(RATINGS, 8, min_count=4)]
                assert "moana" not in names
          `,
          r: code`
            test_that("similarity is symmetric with unit diagonal", {
              expect_equal(sim, t(sim))
              expect_equal(diag(sim), rep(1, length(items)))
            })

            test_that("never recommends rated items", {
              recs <- recommend(ratings["ana", ], sim, 3)
              expect_true(all(ratings["ana", recs$item] == 0))
            })
          `,
        },
        eli5Trace: [
          "People who liked Dune also liked Alien (similarity 0.97) and Gravity (0.77), so those three are space-movie friends.",
          "Ana loves Alien and Dune, so Gravity gets the biggest score for her.",
          "Chloe only watches family films, so Moana scores far higher than any space movie.",
          "A brand-new kid gets the crowd favorite, but only movies at least 3 kids rated can win.",
          "To test the librarian, hide each kid's favorite movie and see if it comes back in the top 2. Here it comes back for all 6 kids, which is easy on such a tiny library.",
        ],
        complexity: { time: "O(items² · users) for similarities, O(items²) per user to score", space: "O(items²)" },
        edgeCases: [
          "An item nobody rated has zero norm; similarity is defined as 0 to avoid dividing by zero.",
          "A user who rated everything has nothing to recommend.",
          "Ties in scores need a deterministic tie-break (alphabetical here) so tests are stable.",
          "Implicit feedback (clicks, plays) has no negatives; missing does not mean dislike.",
        ],
        incorrect: {
          language: "python",
          code: code`
            sim = similarity_matrix(RATINGS)  # built with the held-out rating still inside
            held = RATINGS[user][:]
            held[liked] = 0
            top = recommend(held, sim, 2)
          `,
          whyWrong: "The similarity matrix was computed with the hidden rating included, so the evaluation leaks the answer and the hit rate is optimistic.",
          fix: "Remove the held-out interaction, rebuild similarities from the training data only, then score. In production style evaluation, split by time instead.",
        },
        walkthrough: [
          { python: "ITEMS = [", pythonLines: 10, r: "items <- c(", rLines: 10, eli5: "Six kids rate eight movies from 1 to 5. A 0 means the kid has not seen it yet." },
          { python: "def cosine(i, j, ratings):", pythonLines: 7, r: "cosine <- function(i, j, ratings) {", rLines: 10, eli5: "Two movies are similar when the same kids gave both high stars. Cosine turns that into a number between 0 and 1." },
          { python: "def recommend(user_row, sim, k):", pythonLines: 11, r: "recommend <- function(user_row, sim, k) {", rLines: 9, eli5: "For every movie the kid has not seen, add up 'how similar is it to each movie they rated, times their stars'. Show the biggest totals." },
          { python: "def popular(ratings, k, min_count=3):", pythonLines: 11, r: "popular <- function(ratings, k, min_count = 3) {", rLines: 12, eli5: "For a brand-new kid, show the movies with the best average stars, but only if enough kids rated them." },
          { python: "hits = 0", pythonLines: 12, r: "hits <- 0", rLines: 11, eli5: "The test: hide each kid's favorite movie, rebuild everything without it, and check whether it comes back in the top 2." },
        ],
      },
      flow: {
        title: "Candidate generation to ranking",
        nodes: [
          node("events", "Interactions", 0, 120, "ratings, clicks, plays"),
          node("sim", "Item similarity", 220, 30, "cosine over users"),
          node("pop", "Popularity", 220, 210, "cold-start fallback"),
          node("cands", "Candidates", 450, 120, "unseen items, scored"),
          node("rank", "Rank and filter", 680, 120, "top k, diversity, rules"),
          node("eval", "Evaluate", 900, 120, "offline hit rate, online A/B"),
        ],
        edges: [edge("events", "sim"), edge("events", "pop"), edge("sim", "cands"), edge("pop", "cands"), edge("cands", "rank"), edge("rank", "eval")],
        steps: [
          step("events sim", "events-sim", "Item vectors come from who interacted with what; similar items share their fans."),
          step("events pop", "events-pop", "Popularity with a minimum count covers users with no history."),
          step("sim pop cands", "sim-cands pop-cands", "Known users get similarity-weighted scores; new users get popular items."),
          step("cands rank", "cands-rank", "A ranker and business rules turn candidates into the final top k."),
          step("rank eval", "rank-eval", "Offline metrics on held-out interactions choose models; online tests confirm real impact."),
        ],
      },
      practice: [
        {
          id: "w08-rec-recall-1",
          type: "recall",
          prompt: "Name three ways to handle a brand-new item that nobody has interacted with.",
          answer: "Content-based similarity from its metadata or text embeddings, exploration slots that show it to a small share of users (bandits), and editorial or popularity-within-category placement until it collects interactions.",
          rubric: ["Content features", "Exploration", "Category or editorial fallback"],
        },
        {
          id: "w08-rec-design-1",
          type: "design",
          prompt: "Design the recommendation pipeline for a video app with 50 million users and 2 million videos.",
          answer: "Two stages. Candidate generation retrieves a few hundred items per user from several sources: two-tower embeddings with an approximate nearest neighbor index, item-item co-watch lists, and trending items. A ranking model scores candidates with user, item and context features to predict watch time or satisfaction. Re-ranking applies diversity, freshness and policy filters. Embeddings refresh daily, features stream in near real time, and changes ship through A/B tests on watch time and retention.",
          rubric: ["Candidate generation + ranking", "ANN retrieval", "Re-ranking rules", "Freshness", "Online evaluation"],
        },
        {
          id: "w08-rec-case-1",
          type: "case",
          prompt: "Offline NDCG improved by 8% but the A/B test shows no change in engagement. List plausible reasons.",
          answer: "Offline data reflects the old system's exposure (selection bias), the metric does not match the business goal, the improvement is in positions users rarely see, latency increased, or novelty effects and seasonality hide the effect. Check logging, position-level metrics and counterfactual estimators.",
          rubric: ["Exposure bias", "Metric mismatch", "Position effects", "Latency or novelty"],
        },
      ],
      references: [
        { title: "Google for Developers: Recommendation systems course", url: "https://developers.google.com/machine-learning/recommendation", versionSensitive: true },
        { title: "Item-based collaborative filtering recommendation algorithms (Sarwar, Karypis, Konstan and Riedl, 2001)", versionSensitive: false },
      ],
      lastReviewed: REVIEWED,
    }),

    defineTopic({
      id: "w08-d04-model-interpretability",
      slug: "model-interpretability",
      title: "Model interpretability: permutation importance and SHAP",
      domain: "advanced-ml",
      roles: ["data-scientist", "ml-engineer", "data-analyst"],
      difficulty: "intermediate",
      minutes: 45,
      prerequisites: ["w07-d02-bias-variance-regularization", "w07-d04-trees-boosting"],
      objectives: [
        "Compute permutation importance and explain what a rise in error means",
        "Compute SHAP values for a linear model and check that they add up to the prediction",
        "Explain the limits: correlated features, causality, and global versus local explanations",
      ],
      summary:
        "Interpretability answers two questions: which features does the model rely on overall (global), and why did it make this one prediction (local)? Permutation importance breaks one feature at a time and measures how much worse the model gets. SHAP splits a single prediction into additive contributions that sum to the gap between that prediction and the average one.",
      eli5: {
        analogy:
          "To find out which ingredient matters in a cake, swap the sugar for a random ingredient and taste it. If it is now awful, sugar mattered. To explain one slice, you say: an average slice scores 6, this slice got +13 for extra chocolate and +5 for less salt, so it scores 24.",
        steps: [
          "Train the model and measure its normal error.",
          "Scramble one column so it no longer lines up with the right rows, and measure the error again.",
          "A big jump means the model leaned on that column.",
          "For one row, split its prediction into pieces, one per feature, that add up exactly.",
        ],
        analogyLimit:
          "If two ingredients always come together (eggs and flour), scrambling one barely hurts because the other still carries the information, so importance gets split or hidden.",
      },
      senior: {
        definition:
          "Permutation importance is the drop in a model's score when one feature's values are randomly permuted, breaking its relationship with the target while keeping its distribution. SHAP values are Shapley values from cooperative game theory: each feature's average marginal contribution over all orderings, which sum to f(x) minus the expected prediction.",
        invariants: [
          "SHAP contributions plus the base value equal the model's prediction exactly (local accuracy).",
          "Importance describes the model, not the real world: it says what the model uses, not what causes the outcome.",
          "Compute permutation importance on held-out data when the question is generalization.",
        ],
        mechanism: [
          "The fitted coefficients recover the true ones closely: tenure +3.022, support_calls -2.011, plan_price +0.005.",
          "Rotating the tenure column raises MSE by 145.1 and support_calls by 70.8; plan_price moves it by less than 0.001, so the model ignores it.",
          "Here the shuffle is a deterministic rotation of the column by half its length, a stand-in for a random permutation that keeps the output reproducible; real use averages several random shuffles.",
          "For a linear model with independent features, SHAP value_j = coefficient_j × (x_j − mean_j). Row 0 has few support calls, so a negative coefficient still contributes +4.98.",
        ],
        complexity:
          "Permutation importance costs features × repeats × one prediction pass. Exact Shapley values are exponential in features; TreeSHAP is polynomial for tree ensembles and linear SHAP is O(features).",
        tradeoffs: [
          { option: "Permutation importance", choose: "Any model, global view, cheap to explain.", cost: "Misleading with correlated features; needs repeats for stable numbers." },
          { option: "SHAP", choose: "Local explanations that add up, consistent global summaries.", cost: "Expensive for generic models; background data choice changes values." },
          { option: "Built-in impurity importance (trees)", choose: "Quick look during development.", cost: "Biased toward high-cardinality features and computed on training data." },
        ],
        failureModes: [
          "Reading importance as causation ('raise tenure to raise the score').",
          "Correlated features splitting or hiding importance.",
          "Computing importance on training data for an overfit model.",
          "Explaining with a background dataset that does not match the population being scored.",
        ],
        production:
          "Teams log SHAP values for high-stakes predictions (credit, fraud review) to give reason codes, monitor global importance over time as a drift signal, and keep model cards that record what explanations can and cannot claim.",
        interviewAnswer:
          "For global importance I use permutation importance on a held-out set: shuffle one feature, measure the score drop, repeat and average. For a single prediction I use SHAP, whose contributions sum exactly to the prediction minus the average prediction; for linear models that is coefficient times the feature's deviation from its mean. I warn that both describe the model rather than causation, and that correlated features share or hide credit, so I group correlated features or use conditional methods.",
      },
      implementation: {
        problem: "Fit a linear model to 200 synthetic customers whose score depends on tenure and support calls but not on plan price, then compute permutation importance and SHAP values for one customer.",
        input: "200 rows; score = 3·tenure − 2·support_calls + noise; plan_price is irrelevant",
        python: {
          code: code`
            M = 2147483647
            NAMES = ["tenure", "support_calls", "plan_price"]


            def make_rng(seed):
                state = seed

                def uniform():
                    nonlocal state
                    state = (16807 * state) % M
                    return state / M

                return uniform


            def solve(a, b):
                n = len(b)
                m = [a[i][:] + [b[i]] for i in range(n)]
                for col in range(n):
                    piv = col
                    for r in range(col + 1, n):
                        if abs(m[r][col]) > abs(m[piv][col]):
                            piv = r
                    m[col], m[piv] = m[piv], m[col]
                    for r in range(col + 1, n):
                        f = m[r][col] / m[col][col]
                        for c in range(col, n + 1):
                            m[r][c] -= f * m[col][c]
                x = [0.0] * n
                for r in range(n - 1, -1, -1):
                    s = m[r][n]
                    for c in range(r + 1, n):
                        s -= m[r][c] * x[c]
                    x[r] = s / m[r][r]
                return x


            def fit_linear(rows, ys):
                p = len(rows[0]) + 1
                a = [[0.0] * p for _ in range(p)]
                b = [0.0] * p
                for row, y in zip(rows, ys):
                    z = [1.0] + row
                    for i in range(p):
                        b[i] += z[i] * y
                        for j in range(p):
                            a[i][j] += z[i] * z[j]
                return solve(a, b)


            def predict(coef, row):
                total = coef[0]
                for j, x in enumerate(row):
                    total += coef[j + 1] * x
                return total


            def mse(coef, rows, ys):
                total = 0.0
                for row, y in zip(rows, ys):
                    total += (predict(coef, row) - y) ** 2
                return total / len(rows)


            uniform = make_rng(123457)
            rows, ys = [], []
            for _ in range(200):
                tenure, calls, price = 10 * uniform(), 10 * uniform(), 10 * uniform()
                rows.append([tenure, calls, price])
                ys.append(3 * tenure - 2 * calls + 0.0 * price + 2 * (uniform() - 0.5))
            coef = fit_linear(rows, ys)
            print("fitted: " + ", ".join(f"{name} {c:+.3f}" for name, c in zip(NAMES, coef[1:])) + f", intercept {coef[0]:+.3f}")
            base = mse(coef, rows, ys)
            print(f"baseline MSE {base:.3f}")
            n = len(rows)
            for j, name in enumerate(NAMES):
                shuffled = [row[:] for row in rows]
                for i in range(n):
                    shuffled[i][j] = rows[(i + n // 2) % n][j]  # deterministic stand-in for a random shuffle
                print(f"permutation importance {name}: MSE rises by {mse(coef, shuffled, ys) - base:.3f}")
            means = []
            for j in range(len(NAMES)):
                total = 0.0
                for row in rows:
                    total += row[j]
                means.append(total / n)
            x = rows[0]
            expected = predict(coef, means)
            phis = [coef[j + 1] * (x[j] - means[j]) for j in range(len(NAMES))]
            print(f"explain row 0: prediction {predict(coef, x):.3f} = average prediction {expected:.3f}")
            for name, value, phi in zip(NAMES, x, phis):
                print(f"  {name} = {value:.2f} contributes {phi:+.3f}")
            check = expected
            for phi in phis:
                check += phi
            print(f"  sum of contributions + average = {check:.3f}")
          `,
        },
        r: {
          code: code`
            m_mod <- 2147483647
            feature_names <- c("tenure", "support_calls", "plan_price")

            make_rng <- function(seed) {
              state <- seed
              function() {
                state <<- (16807 * state) %% m_mod
                state / m_mod
              }
            }

            solve_ge <- function(a, b) {
              n <- length(b)
              m <- cbind(a, b)
              for (col in seq_len(n)) {
                piv <- col
                if (col < n) for (r in (col + 1):n) if (abs(m[r, col]) > abs(m[piv, col])) piv <- r
                tmp <- m[col, ]
                m[col, ] <- m[piv, ]
                m[piv, ] <- tmp
                if (col < n) for (r in (col + 1):n) {
                  f <- m[r, col] / m[col, col]
                  for (cc in col:(n + 1)) m[r, cc] <- m[r, cc] - f * m[col, cc]
                }
              }
              x <- numeric(n)
              for (r in n:1) {
                s <- m[r, n + 1]
                if (r < n) for (cc in (r + 1):n) s <- s - m[r, cc] * x[cc]
                x[r] <- s / m[r, r]
              }
              x
            }

            fit_linear <- function(rows, ys) {
              p <- ncol(rows) + 1
              a <- matrix(0, p, p)
              b <- numeric(p)
              for (k in seq_len(nrow(rows))) {
                z <- c(1, rows[k, ])
                for (i in seq_len(p)) {
                  b[i] <- b[i] + z[i] * ys[k]
                  for (j in seq_len(p)) a[i, j] <- a[i, j] + z[i] * z[j]
                }
              }
              solve_ge(a, b)
            }

            predict_row <- function(coef, row) {
              total <- coef[1]
              for (j in seq_along(row)) total <- total + coef[j + 1] * row[j]
              total
            }

            mse <- function(coef, rows, ys) {
              total <- 0
              for (k in seq_len(nrow(rows))) total <- total + (predict_row(coef, rows[k, ]) - ys[k])^2
              total / nrow(rows)
            }

            uniform <- make_rng(123457)
            rows <- matrix(0, 200, 3)
            ys <- numeric(200)
            for (k in 1:200) {
              tenure <- 10 * uniform()
              calls <- 10 * uniform()
              price <- 10 * uniform()
              rows[k, ] <- c(tenure, calls, price)
              ys[k] <- 3 * tenure - 2 * calls + 0 * price + 2 * (uniform() - 0.5)
            }
            coef <- fit_linear(rows, ys)
            cat(sprintf("fitted: %s, intercept %+.3f\n", paste(sprintf("%s %+.3f", feature_names, coef[-1]), collapse = ", "), coef[1]))
            base <- mse(coef, rows, ys)
            cat(sprintf("baseline MSE %.3f\n", base))
            n <- nrow(rows)
            for (j in seq_along(feature_names)) {
              shuffled <- rows
              shuffled[, j] <- rows[((0:(n - 1) + n %/% 2) %% n) + 1, j] # deterministic stand-in for a random shuffle
              cat(sprintf("permutation importance %s: MSE rises by %.3f\n", feature_names[j], mse(coef, shuffled, ys) - base))
            }
            means <- vapply(seq_along(feature_names), function(j) {
              total <- 0
              for (v in rows[, j]) total <- total + v
              total / n
            }, numeric(1))
            x <- rows[1, ]
            expected <- predict_row(coef, means)
            phis <- coef[-1] * (x - means)
            cat(sprintf("explain row 0: prediction %.3f = average prediction %.3f\n", predict_row(coef, x), expected))
            for (j in seq_along(feature_names)) {
              cat(sprintf("  %s = %.2f contributes %+.3f\n", feature_names[j], x[j], phis[j]))
            }
            check <- expected
            for (phi in phis) check <- check + phi
            cat(sprintf("  sum of contributions + average = %.3f\n", check))
          `,
        },
        expectedOutput: code`
        fitted: tenure +3.022, support_calls -2.011, plan_price +0.005, intercept -0.077
        baseline MSE 0.348
        permutation importance tenure: MSE rises by 145.068
        permutation importance support_calls: MSE rises by 70.794
        permutation importance plan_price: MSE rises by 0.000
        explain row 0: prediction 23.914 = average prediction 5.920
          tenure = 9.66 contributes +13.001
          support_calls = 2.61 contributes +4.982
          plan_price = 7.66 contributes +0.011
          sum of contributions + average = 23.914
      `,
        tests: {
          python: code`
            def test_shap_values_add_up_to_the_prediction():
                for row in rows[:20]:
                    total = predict(coef, means)
                    for j in range(len(NAMES)):
                        total += coef[j + 1] * (row[j] - means[j])
                    assert abs(total - predict(coef, row)) < 1e-9


            def test_irrelevant_feature_has_tiny_importance():
                shuffled = [row[:] for row in rows]
                for i in range(n):
                    shuffled[i][2] = rows[(i + n // 2) % n][2]
                assert mse(coef, shuffled, ys) - base < 0.05
          `,
          r: code`
            test_that("SHAP values add up to the prediction", {
              for (k in 1:20) {
                total <- predict_row(coef, means) + sum(coef[-1] * (rows[k, ] - means))
                expect_equal(total, predict_row(coef, rows[k, ]), tolerance = 1e-9)
              }
            })

            test_that("tenure matters more than plan price", {
              expect_gt(abs(coef[2]), 100 * abs(coef[4]))
            })
          `,
        },
        eli5Trace: [
          "The model learns the recipe almost exactly: +3 per year of tenure, about −2 per support call, and nothing for price.",
          "Scrambling tenure makes the error jump by about 145, so the model leans on it the most.",
          "Scrambling price changes nothing, because the model never used it.",
          "One customer scores 23.9 while an average customer scores 5.9.",
          "Long tenure adds +13.0 and having fewer calls than average adds +5.0. The pieces add back to exactly 23.9.",
        ],
        complexity: { time: "O(features × n) per permutation pass; O(features) per linear SHAP explanation", space: "O(n × features)" },
        edgeCases: [
          "Two near-duplicate features split importance, so each looks less important than the pair.",
          "Permuting can create impossible rows (age 5 with 30 years of tenure) that the model never saw.",
          "Importance can be slightly negative by chance when a feature is useless.",
          "SHAP values depend on the background data used for the average prediction.",
        ],
        incorrect: {
          language: "python",
          code: code`
            importance = {name: abs(c) for name, c in zip(NAMES, coef[1:])}  # raw coefficient size
          `,
          whyWrong: "Coefficient size depends on the feature's units: measure tenure in months instead of years and its coefficient shrinks 12 times without the model changing at all.",
          fix: "Standardize features before comparing coefficients, or use permutation importance or mean absolute SHAP values, which are on the scale of the prediction.",
        },
        walkthrough: [
          { python: "def solve(a, b):", pythonLines: 20, r: "solve_ge <- function(a, b) {", rLines: 21, eli5: "The same little equation solver as last week, written identically in both languages." },
          { python: "for _ in range(200):", pythonLines: 4, r: "for (k in 1:200) {", rLines: 7, eli5: "Make 200 pretend customers. Their score really depends on tenure and support calls, with a little noise. Price does nothing." },
          { python: "coef = fit_linear(rows, ys)", pythonLines: 2, r: "coef <- fit_linear(rows, ys)", rLines: 2, eli5: "Fit a straight-line model. It should find about +3, −2 and 0." },
          { python: "for j, name in enumerate(NAMES):", pythonLines: 5, r: "for (j in seq_along(feature_names)) {", rLines: 5, eli5: "Scramble one column at a time and see how much worse the guesses get. A big jump means that column mattered." },
          { python: "phis = [coef[j + 1] * (x[j] - means[j])", r: "phis <- coef[-1] * (x - means)", eli5: "Explain one customer: each feature's push is its weight times how far this customer is from average." },
          { python: "check = expected", pythonLines: 4, r: "check <- expected", rLines: 3, eli5: "Add the pushes to the average score and you land exactly on this customer's score." },
        ],
      },
      flow: {
        title: "Global and local explanations",
        nodes: [
          node("model", "Trained model", 0, 120, "f(x)"),
          node("perm", "Permute one feature", 230, 30, "break its link to y"),
          node("drop", "Score drop", 460, 30, "global importance"),
          node("row", "One prediction", 230, 210, "f(x) for a customer"),
          node("shap", "SHAP values", 460, 210, "additive contributions"),
          node("story", "Explanation", 690, 120, "what the model uses, not causes"),
        ],
        edges: [edge("model", "perm"), edge("perm", "drop"), edge("drop", "story"), edge("model", "row"), edge("row", "shap"), edge("shap", "story")],
        steps: [
          step("model perm", "model-perm", "Permutation importance shuffles one feature on held-out data, keeping its distribution but breaking its relationship to the target."),
          step("perm drop", "perm-drop", "The rise in error is that feature's global importance; repeat shuffles and average."),
          step("model row", "model-row", "A local explanation starts from one prediction and the average prediction over background data."),
          step("row shap", "row-shap", "SHAP splits the gap into per-feature contributions that add up exactly."),
          step("drop shap story", "drop-story shap-story", "Both describe the model's behavior. Neither proves that changing a feature would change the outcome."),
        ],
      },
      practice: [
        {
          id: "w08-interp-recall-1",
          type: "recall",
          prompt: "Why can two highly correlated features both show low permutation importance even though the model depends on them?",
          answer: "When one is shuffled, the model can still get most of the information from its correlated partner, so the error barely rises for either feature alone. Shuffling them together as a group reveals their joint importance.",
          rubric: ["Partner carries the signal", "Group permutation"],
        },
        {
          id: "w08-interp-case-1",
          type: "case",
          prompt: "A loan model's top SHAP feature is zip code. A product manager wants to say 'applicants are denied because of where they live'. What do you advise?",
          answer: "SHAP says the model relies on zip code, not that location causes default. Zip code can be a proxy for protected attributes, which raises fairness and legal concerns. Investigate proxies, test fairness metrics across groups, consider removing or constraining the feature, and phrase reason codes in terms of allowed, actionable factors after legal review.",
          rubric: ["Model behavior, not causation", "Proxy for protected attributes", "Fairness checks", "Reason codes"],
        },
        {
          id: "w08-interp-recall-2",
          type: "recall",
          prompt: "What is the local accuracy property of SHAP values?",
          answer: "The base value (the expected prediction over background data) plus the sum of a row's SHAP values equals the model's prediction for that row exactly.",
          rubric: ["Base value", "Sum equals prediction"],
        },
      ],
      references: [
        { title: "scikit-learn user guide: Permutation feature importance", url: "https://scikit-learn.org/stable/modules/permutation_importance.html", versionSensitive: true },
        { title: "SHAP documentation", url: "https://shap.readthedocs.io/en/latest/", versionSensitive: true },
        { title: "Interpretable Machine Learning (Christoph Molnar), free online book", url: "https://christophm.github.io/interpretable-ml-book/", versionSensitive: false },
        { title: "A Unified Approach to Interpreting Model Predictions (Lundberg and Lee, 2017)", versionSensitive: false },
      ],
      lastReviewed: REVIEWED,
    }),
  ],
};
