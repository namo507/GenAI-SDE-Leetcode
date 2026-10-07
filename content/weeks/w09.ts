import { REVIEWED, code, defineTopic, defineWeek, edge, node, step } from "../helpers";

export const topics = [
  defineTopic({
    id: "w09-d01-backpropagation",
    slug: "backpropagation",
    title: "Tensors and backpropagation",
    domain: "deep-learning",
    roles: ["ml-engineer", "genai-engineer", "data-scientist"],
    difficulty: "intermediate",
    minutes: 80,
    prerequisites: ["w07-d02-linear-logistic-regression"],
    objectives: [
      "Run a forward pass and compute every gradient with the chain rule",
      "Verify analytic gradients with central finite differences",
      "Explain what autograd records and why it needs the forward values",
    ],
    summary:
      "Backpropagation is the chain rule applied from the loss back to every parameter, reusing values saved during the forward pass. A gradient check with finite differences catches most hand-derived mistakes.",
    eli5: {
      analogy:
        "A row of dominoes from each knob on a machine to the final score. To know how much turning one knob changes the score, multiply how much each domino pushes the next, starting from the score and walking backwards.",
      steps: [
        "Run the machine forward and write down every intermediate number.",
        "Start at the score: how much does the score change if the output changes a little?",
        "Walk backwards one step at a time, multiplying by how much each step changes the next.",
        "When you reach a knob, you know how much that knob moves the score.",
        "Double-check by nudging each knob a tiny bit and watching the score.",
      ],
      analogyLimit:
        "Real networks have millions of knobs and branching paths, so frameworks add up contributions from every path and store intermediate tensors in memory. That memory, not the arithmetic, is often what limits model size.",
    },
    senior: {
      definition:
        "For a computation graph L = f(g(h(theta))), reverse-mode differentiation computes dL/dtheta by propagating adjoints from the output: each node multiplies the incoming gradient by its local Jacobian and passes it to its inputs, summing over fan-out.",
      invariants: [
        "The backward pass needs the forward activations (here h = tanh(z1)), so they are cached.",
        "Each parameter's gradient is the sum over all paths from it to the loss.",
        "A correct gradient matches the central difference (f(theta + eps) - f(theta - eps)) / 2 eps to about eps^2.",
      ],
      mechanism: [
        "Forward: z1 = w1 x + b1, h = tanh(z1), y_hat = w2 h + b2, L = (y_hat - y)^2 / 2.",
        "Backward: dL/dy_hat = y_hat - y; dL/dw2 = dL/dy_hat h; dL/dh = dL/dy_hat w2; dL/dz1 = dL/dh (1 - h^2); dL/dw1 = dL/dz1 x.",
        "One SGD step subtracts the learning rate times each gradient, and the loss drops.",
        "PyTorch builds the same graph dynamically during the forward pass and calls these local backward functions on loss.backward().",
      ],
      complexity: "Reverse mode costs a small constant multiple of the forward pass, independent of the number of parameters; memory grows with stored activations.",
      tradeoffs: [
        { option: "Reverse-mode autodiff", choose: "Many parameters, scalar loss: every neural network.", cost: "Stores activations; memory heavy." },
        { option: "Forward-mode autodiff", choose: "Few inputs, many outputs (Jacobian-vector products).", cost: "One pass per input direction." },
        { option: "Activation checkpointing", choose: "Memory-bound training of large models.", cost: "Recomputes parts of the forward pass, about 30% more compute." },
      ],
      failureModes: [
        "Forgetting the (1 - h^2) derivative of tanh, or using the derivative of the wrong activation.",
        "Not zeroing gradients between steps in PyTorch, so they accumulate.",
        "Gradient checks with float32 and a large epsilon, giving false alarms.",
        "In-place operations that overwrite values the backward pass needs.",
      ],
      production:
        "You rarely write backprop by hand, but you debug it: exploding or NaN gradients, mixed-precision underflow, and memory blow-ups from saved activations. Gradient norms per layer are a standard training dashboard.",
      interviewAnswer:
        "Backprop is reverse-mode automatic differentiation: the forward pass caches activations, then the backward pass multiplies the upstream gradient by each local derivative, summing over paths, so all parameter gradients cost about one extra forward pass. I verify custom gradients with central differences and watch gradient norms in training.",
    },
    implementation: {
      problem: "Compute a tiny network's gradients with the chain rule, verify them numerically, and take one SGD step.",
      input: "x = 1.5, y = 0.5; w1 = 0.8, b1 = -0.2, w2 = 1.2, b2 = 0.1; learning rate 0.1",
      python: {
        code: code`
          from math import tanh

          X, Y = 1.5, 0.5
          PARAMS = {"w1": 0.8, "b1": -0.2, "w2": 1.2, "b2": 0.1}


          def loss(p: dict[str, float]) -> float:
              h = tanh(p["w1"] * X + p["b1"])
              y_hat = p["w2"] * h + p["b2"]
              return 0.5 * (y_hat - Y) ** 2


          def gradients(p: dict[str, float]) -> dict[str, float]:
              h = tanh(p["w1"] * X + p["b1"])
              y_hat = p["w2"] * h + p["b2"]
              d_yhat = y_hat - Y
              d_z1 = d_yhat * p["w2"] * (1 - h**2)
              return {"w1": d_z1 * X, "b1": d_z1, "w2": d_yhat * h, "b2": d_yhat}


          def numeric_gradients(p: dict[str, float], eps: float = 1e-6) -> dict[str, float]:
              out = {}
              for k in p:
                  up, down = dict(p), dict(p)
                  up[k] += eps
                  down[k] -= eps
                  out[k] = (loss(up) - loss(down)) / (2 * eps)
              return out


          g = gradients(PARAMS)
          num = numeric_gradients(PARAMS)
          print(f"loss={loss(PARAMS):.6f}")
          for k in ["w1", "b1", "w2", "b2"]:
              print(f"dL/d{k}={g[k]:.6f}")
          print(f"gradient check passed: {'yes' if max(abs(g[k] - num[k]) for k in g) < 1e-6 else 'no'}")
          updated = {k: v - 0.1 * g[k] for k, v in PARAMS.items()}
          print(f"loss after one SGD step={loss(updated):.6f}")
        `,
      },
      r: {
        code: code`
          x <- 1.5
          y <- 0.5
          params <- c(w1 = 0.8, b1 = -0.2, w2 = 1.2, b2 = 0.1)

          loss <- function(p) {
            h <- tanh(p[["w1"]] * x + p[["b1"]])
            y_hat <- p[["w2"]] * h + p[["b2"]]
            0.5 * (y_hat - y)^2
          }

          gradients <- function(p) {
            h <- tanh(p[["w1"]] * x + p[["b1"]])
            y_hat <- p[["w2"]] * h + p[["b2"]]
            d_yhat <- y_hat - y
            d_z1 <- d_yhat * p[["w2"]] * (1 - h^2)
            c(w1 = d_z1 * x, b1 = d_z1, w2 = d_yhat * h, b2 = d_yhat)
          }

          numeric_gradients <- function(p, eps = 1e-6) {
            sapply(names(p), function(k) {
              up <- p
              down <- p
              up[[k]] <- up[[k]] + eps
              down[[k]] <- down[[k]] - eps
              (loss(up) - loss(down)) / (2 * eps)
            })
          }

          g <- gradients(params)
          num <- numeric_gradients(params)
          cat(sprintf("loss=%.6f\n", loss(params)))
          for (k in c("w1", "b1", "w2", "b2")) cat(sprintf("dL/d%s=%.6f\n", k, g[[k]]))
          cat(sprintf("gradient check passed: %s\n", if (max(abs(g - num[names(g)])) < 1e-6) "yes" else "no"))
          cat(sprintf("loss after one SGD step=%.6f\n", loss(params - 0.1 * g)))
        `,
      },
      expectedOutput: code`
        loss=0.132053
        dL/dw1=0.388494
        dL/db1=0.258996
        dL/dw2=0.391393
        dL/db2=0.513913
        gradient check passed: yes
        loss after one SGD step=0.075651
      `,
      tests: {
        python: code`
          def test_sgd_step_reduces_loss():
              updated = {k: v - 0.01 * gradients(PARAMS)[k] for k, v in PARAMS.items()}
              assert loss(updated) < loss(PARAMS)


          def test_gradient_is_zero_at_a_perfect_fit():
              p = dict(PARAMS)
              p["b2"] = Y - p["w2"] * tanh(p["w1"] * X + p["b1"])
              assert all(abs(v) < 1e-12 for v in gradients(p).values())
        `,
        r: code`
          test_that("analytic and numeric gradients agree", {
            expect_equal(unname(gradients(params)), unname(numeric_gradients(params)[names(params)]), tolerance = 1e-6)
          })

          test_that("an SGD step reduces the loss", {
            expect_lt(loss(params - 0.01 * gradients(params)), loss(params))
          })
        `,
      },
      eli5Trace: [
        "Forward: 0.8 times 1.5 minus 0.2 is 1.0; tanh squashes it to about 0.76; the output is about 1.01.",
        "The target is 0.5, so the output is about 0.51 too high, and the loss is half that error squared.",
        "Backward: the output weight's gradient is the error times 0.76; the error flows back through w2 and the tanh slope to w1 and b1.",
        "Nudging each knob by a millionth confirms every gradient.",
        "One small step against the gradients lowers the loss.",
      ],
      complexity: { time: "O(parameters) for one backward pass", space: "O(activations)" },
      edgeCases: [
        "Large |z1| saturates tanh: 1 - h^2 approaches 0 and gradients vanish.",
        "A too-large epsilon in the numeric check adds truncation error; a too-small one adds rounding error.",
        "A learning rate that is too large can overshoot and increase the loss.",
        "Python dict and R named-vector updates must not mutate the original parameters during the check.",
      ],
      incorrect: {
        language: "python",
        code: code`
          d_z1 = d_yhat * p["w2"] * h
        `,
        whyWrong: "It multiplies by the activation h instead of the derivative of tanh, 1 - h^2, so w1 and b1 get wrong gradients; the numeric check fails.",
        fix: "Use the local derivative of tanh: (1 - h**2).",
      },
    },
    referenceSnippet: {
      language: "python",
      label: "PyTorch equivalent (reference only: PyTorch does not run in the browser runtime)",
      code: code`
        import torch

        x, y = torch.tensor(1.5), torch.tensor(0.5)
        w1 = torch.tensor(0.8, requires_grad=True)
        b1 = torch.tensor(-0.2, requires_grad=True)
        w2 = torch.tensor(1.2, requires_grad=True)
        b2 = torch.tensor(0.1, requires_grad=True)

        loss = 0.5 * (w2 * torch.tanh(w1 * x + b1) + b2 - y) ** 2
        loss.backward()
        print(w1.grad, b1.grad, w2.grad, b2.grad)
      `,
    },
    flow: {
      title: "Forward values, backward gradients",
      nodes: [
        node("x", "x, w1, b1", 0, 110, "1.5, 0.8, -0.2"),
        node("z1", "z1 = w1 x + b1", 210, 110, "1.0"),
        node("h", "h = tanh(z1)", 420, 110, "0.762"),
        node("yhat", "y_hat = w2 h + b2", 630, 110, "1.014"),
        node("loss", "L = (y_hat - y)^2 / 2", 860, 110, "0.132"),
      ],
      edges: [edge("x", "z1"), edge("z1", "h"), edge("h", "yhat"), edge("yhat", "loss")],
      steps: [
        step("x z1 h yhat loss", "x-z1 z1-h h-yhat yhat-loss", "Forward pass: compute and cache every intermediate value up to the loss."),
        step("loss yhat", "yhat-loss", "Backward starts at the loss: dL/dy_hat = y_hat - y, about 0.51."),
        step("yhat h", "h-yhat", "Multiply by w2 to reach h, and by h to get dL/dw2."),
        step("h z1", "z1-h", "Multiply by tanh's slope, 1 - h^2, to reach z1."),
        step("z1 x", "x-z1", "Multiply by x to get dL/dw1; dL/db1 is dL/dz1 itself."),
      ],
    },
    practice: [
      {
        id: "w09-backprop-recall-1",
        type: "recall",
        prompt: "Why does training memory grow with batch size and sequence length even though parameters stay the same?",
        answer: "The backward pass needs activations from the forward pass, and activations scale with batch and sequence length. Checkpointing trades recomputation for memory.",
        rubric: ["Activations are stored", "Scale with batch and length", "Checkpointing trade-off"],
      },
      {
        id: "w09-backprop-code-1",
        type: "code",
        prompt: "Replace tanh with ReLU in both languages and update the gradient.",
        answer: "h = max(0, z1) and the local derivative is 1 if z1 > 0 else 0; d_z1 = d_yhat * w2 * (1 if z1 > 0 else 0).",
        rubric: ["Correct forward", "Correct derivative including the zero region"],
      },
    ],
    references: [
      { title: "PyTorch documentation: autograd mechanics", url: "https://pytorch.org/docs/stable/notes/autograd.html", versionSensitive: true },
      { title: "Deep Learning (Goodfellow, Bengio, Courville), chapter 6", url: "https://www.deeplearningbook.org/", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w09-d02-optimizers-regularization",
    slug: "optimizers-regularization",
    title: "Optimization and regularization",
    domain: "deep-learning",
    roles: ["ml-engineer", "genai-engineer"],
    difficulty: "intermediate",
    minutes: 75,
    prerequisites: ["w09-d01-backpropagation"],
    objectives: [
      "Compare gradient descent, momentum and Adam on an ill-conditioned problem",
      "Explain why a learning rate above 2 / L diverges",
      "Name the regularizers used in deep learning and what each controls",
    ],
    summary:
      "Optimizers decide how far and in which direction to step. On stretched loss surfaces, plain gradient descent zigzags or diverges, momentum smooths the path, and Adam rescales each parameter by its own gradient history.",
    eli5: {
      analogy:
        "Rolling a ball into a long, narrow valley. A plain push sends it bouncing between the steep walls. A heavy ball (momentum) keeps rolling along the valley floor. A smart ball (Adam) takes small steps across the steep direction and bigger steps along the flat one.",
      steps: [
        "Start the ball on the valley side.",
        "Plain descent: step downhill by a fixed fraction of the slope.",
        "Momentum: keep part of the previous step's speed.",
        "Adam: divide each step by how steep that direction has recently been.",
        "If the steps are too big, the ball flies out of the valley instead of settling.",
      ],
      analogyLimit:
        "Real loss surfaces have millions of dimensions, noise from mini-batches, saddle points and flat regions. An optimizer that wins on a smooth bowl may generalize worse on a real network.",
    },
    senior: {
      definition:
        "For f(x, y) = x^2 + 10 y^2 the curvature is 2 along x and 20 along y (condition number 10). Gradient descent is stable only if the learning rate is below 2 / 20 = 0.1. Momentum: v = beta v + g, theta -= lr v. Adam keeps exponential averages of g and g^2 with bias correction and steps lr m_hat / (sqrt(v_hat) + eps).",
      invariants: [
        "On a quadratic, gradient descent multiplies each coordinate's error by (1 - lr curvature) per step; |1 - lr curvature| > 1 diverges.",
        "Momentum's effective step size is about lr / (1 - beta) along consistent directions.",
        "Adam's per-parameter scaling makes it roughly invariant to gradient scale.",
      ],
      mechanism: [
        "With lr = 0.09, the y coordinate shrinks by |1 - 1.8| = 0.8 per step and x by 0.82: slow but stable.",
        "With lr = 0.105, the y factor is |1 - 2.1| = 1.1, so y grows every step: divergence.",
        "Momentum accumulates velocity along x, where gradients agree step after step, and cancels zigzags along y.",
        "Regularizers: weight decay (L2, decoupled in AdamW), dropout, data augmentation, early stopping, label smoothing.",
      ],
      complexity: "O(parameters) per step for all three; Adam stores two extra tensors per parameter (optimizer state is 2x the model size).",
      tradeoffs: [
        { option: "SGD with momentum", choose: "Vision models where it often generalizes better.", cost: "More learning-rate tuning and schedules." },
        { option: "Adam or AdamW", choose: "Transformers and most new architectures.", cost: "Optimizer state memory; weight decay must be decoupled (AdamW)." },
        { option: "Learning rate warmup and decay", choose: "Large models and batch sizes.", cost: "More hyperparameters." },
      ],
      failureModes: [
        "Learning rate too high: loss spikes or becomes NaN.",
        "Using L2 penalty with Adam instead of decoupled weight decay.",
        "No warmup on large transformers, causing early divergence.",
        "Evaluating with dropout still active.",
      ],
      production:
        "Training runs log loss, gradient norm and learning rate together. Divergence usually traces to learning rate, missing warmup, bad data batches or mixed-precision overflow; gradient clipping and loss scaling are standard guards.",
      interviewAnswer:
        "On an ill-conditioned problem, gradient descent must use a step below 2 over the largest curvature, so it crawls along flat directions. Momentum accumulates velocity along consistent directions and damps oscillations. Adam normalizes each parameter's step by its running RMS gradient. For transformers I use AdamW with warmup and cosine decay, gradient clipping, and weight decay plus dropout as regularizers.",
    },
    implementation: {
      problem: "Minimize x^2 + 10 y^2 from (-4, 2) for 50 steps with gradient descent, momentum and Adam, and show divergence when the step is too large.",
      input: "start (-4, 2); GD lr 0.09 and 0.105; momentum lr 0.02, beta 0.9; Adam lr 0.3, betas 0.9 and 0.999",
      python: {
        code: code`
          from math import sqrt


          def f(x: float, y: float) -> float:
              return x * x + 10 * y * y


          def grad(x: float, y: float) -> tuple[float, float]:
              return 2 * x, 20 * y


          def gd(lr: float, steps: int = 50) -> float:
              x, y = -4.0, 2.0
              for _ in range(steps):
                  gx, gy = grad(x, y)
                  x, y = x - lr * gx, y - lr * gy
              return f(x, y)


          def momentum(lr: float, beta: float, steps: int = 50) -> float:
              x, y, vx, vy = -4.0, 2.0, 0.0, 0.0
              for _ in range(steps):
                  gx, gy = grad(x, y)
                  vx, vy = beta * vx + gx, beta * vy + gy
                  x, y = x - lr * vx, y - lr * vy
              return f(x, y)


          def adam(lr: float, b1: float = 0.9, b2: float = 0.999, eps: float = 1e-8, steps: int = 50) -> float:
              p = [-4.0, 2.0]
              m = [0.0, 0.0]
              v = [0.0, 0.0]
              for t in range(1, steps + 1):
                  g = grad(*p)
                  for i in range(2):
                      m[i] = b1 * m[i] + (1 - b1) * g[i]
                      v[i] = b2 * v[i] + (1 - b2) * g[i] ** 2
                      m_hat, v_hat = m[i] / (1 - b1**t), v[i] / (1 - b2**t)
                      p[i] -= lr * m_hat / (sqrt(v_hat) + eps)
              return f(*p)


          print(f"start loss: {f(-4, 2):.4e}")
          print(f"gd lr=0.09: {gd(0.09):.4e}")
          print(f"gd lr=0.105: {gd(0.105):.4e}")
          print(f"momentum lr=0.02 beta=0.9: {momentum(0.02, 0.9):.4e}")
          print(f"adam lr=0.3: {adam(0.3):.4e}")
        `,
      },
      r: {
        code: code`
          f <- function(p) p[1]^2 + 10 * p[2]^2
          grad <- function(p) c(2 * p[1], 20 * p[2])

          gd <- function(lr, steps = 50) {
            p <- c(-4, 2)
            for (k in seq_len(steps)) p <- p - lr * grad(p)
            f(p)
          }

          momentum <- function(lr, beta, steps = 50) {
            p <- c(-4, 2)
            v <- c(0, 0)
            for (k in seq_len(steps)) {
              v <- beta * v + grad(p)
              p <- p - lr * v
            }
            f(p)
          }

          adam <- function(lr, b1 = 0.9, b2 = 0.999, eps = 1e-8, steps = 50) {
            p <- c(-4, 2)
            m <- c(0, 0)
            v <- c(0, 0)
            for (t in seq_len(steps)) {
              g <- grad(p)
              m <- b1 * m + (1 - b1) * g
              v <- b2 * v + (1 - b2) * g^2
              p <- p - lr * (m / (1 - b1^t)) / (sqrt(v / (1 - b2^t)) + eps)
            }
            f(p)
          }

          cat(sprintf("start loss: %.4e\n", f(c(-4, 2))))
          cat(sprintf("gd lr=0.09: %.4e\n", gd(0.09)))
          cat(sprintf("gd lr=0.105: %.4e\n", gd(0.105)))
          cat(sprintf("momentum lr=0.02 beta=0.9: %.4e\n", momentum(0.02, 0.9)))
          cat(sprintf("adam lr=0.3: %.4e\n", adam(0.3)))
        `,
      },
      expectedOutput: code`
        start loss: 5.6000e+01
        gd lr=0.09: 4.6652e-08
        gd lr=0.105: 5.5122e+05
        momentum lr=0.02 beta=0.9: 8.4668e-02
        adam lr=0.3: 8.0601e-02
      `,
      tests: {
        python: code`
          def test_stable_gd_decreases_loss():
              assert gd(0.09) < f(-4, 2)


          def test_learning_rate_above_two_over_l_diverges():
              assert gd(0.105) > f(-4, 2)


          def test_all_stable_methods_make_progress():
              assert momentum(0.02, 0.9) < f(-4, 2) and adam(0.3) < f(-4, 2)
        `,
        r: code`
          test_that("stable gradient descent decreases the loss", {
            expect_lt(gd(0.09), f(c(-4, 2)))
          })

          test_that("a step above 2 / L diverges", {
            expect_gt(gd(0.105), f(c(-4, 2)))
          })
        `,
      },
      eli5Trace: [
        "The ball starts at loss 56, on the side of a valley that is 10 times steeper across than along.",
        "Plain steps of 0.09 bounce across the steep walls but slowly settle.",
        "Steps of 0.105 overshoot the steep walls more each time, and the ball flies off: the loss explodes.",
        "The heavy ball and the smart ball both settle; the printed losses show how close each gets in 50 steps.",
      ],
      complexity: { time: "O(steps * parameters)", space: "O(parameters), Adam 3x" },
      edgeCases: [
        "lr exactly 0.1 makes the y coordinate oscillate forever without growing or shrinking.",
        "Adam's eps prevents division by zero when a gradient is exactly zero.",
        "Bias correction matters in early steps when m and v start at zero.",
        "Exponent formatting (e+00) is identical in Python and R's sprintf.",
      ],
      incorrect: {
        language: "python",
        code: code`
          m_hat, v_hat = m[i], v[i]
          p[i] -= lr * m_hat / (sqrt(v_hat) + eps)
        `,
        whyWrong: "Without bias correction, the first steps divide a tiny m by a tiny sqrt(v) inconsistently, distorting the early step sizes (the averages start at zero).",
        fix: "Divide m by (1 - b1**t) and v by (1 - b2**t) before the update.",
      },
    },
    flow: {
      title: "Three optimizers, one valley",
      nodes: [
        node("start", "Start (-4, 2)", 0, 110, "loss 56"),
        node("gd", "Gradient descent", 260, 0, "lr 0.09: zigzag"),
        node("div", "Too-large step", 260, 110, "lr 0.105: diverges"),
        node("mom", "Momentum", 260, 220, "velocity along x"),
        node("adam", "Adam", 520, 220, "per-parameter scale"),
        node("min", "Minimum (0, 0)", 780, 110, "loss 0"),
      ],
      edges: [edge("start", "gd"), edge("start", "div"), edge("start", "mom"), edge("mom", "adam"), edge("gd", "min"), edge("adam", "min")],
      steps: [
        step("start", "", "The bowl is 10 times steeper in y than in x, so one learning rate must suit both."),
        step("start gd", "start-gd", "Gradient descent below 2/20 = 0.1 is stable but crawls along the flat x direction."),
        step("start div", "start-div", "At 0.105 each y step overshoots by more than it corrects, so the loss explodes."),
        step("start mom", "start-mom", "Momentum builds speed along x, where gradients agree, and cancels the y zigzag."),
        step("mom adam min gd", "mom-adam adam-min gd-min", "Adam rescales each coordinate by its recent gradient size and heads to the minimum."),
      ],
    },
    practice: [
      {
        id: "w09-opt-recall-1",
        type: "recall",
        prompt: "Why is AdamW preferred over Adam with an L2 penalty?",
        answer: "With Adam, an L2 penalty's gradient is rescaled by the adaptive denominator, so parameters with large gradients get little regularization. AdamW applies weight decay directly to the weights, decoupled from the adaptive step.",
        rubric: ["L2 gets rescaled by Adam", "Decoupled weight decay"],
      },
      {
        id: "w09-opt-case-1",
        type: "case",
        prompt: "Loss is fine for 10,000 steps, then spikes to NaN. List your first four checks.",
        answer: "Learning rate schedule and warmup, gradient norm history (add clipping), a bad batch or data corruption at that step, and mixed-precision overflow (loss scaling, bf16).",
        rubric: ["Learning rate", "Gradient norm and clipping", "Data batch", "Precision"],
      },
    ],
    references: [
      { title: "Adam: A Method for Stochastic Optimization (Kingma and Ba, 2014)", url: "https://arxiv.org/abs/1412.6980", versionSensitive: false },
      { title: "Decoupled Weight Decay Regularization (Loshchilov and Hutter)", url: "https://arxiv.org/abs/1711.05101", versionSensitive: false },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w09-d03-attention-transformers",
    slug: "attention-transformers",
    title: "Attention and transformers",
    domain: "deep-learning",
    roles: ["ml-engineer", "genai-engineer"],
    difficulty: "advanced",
    minutes: 90,
    prerequisites: ["w09-d01-backpropagation"],
    objectives: [
      "Compute scaled dot-product attention by hand",
      "Apply a causal mask and explain why decoders need it",
      "Describe the transformer block: attention, MLP, residuals and normalization",
    ],
    summary:
      "Attention lets each token build its representation as a weighted average of other tokens' values, with weights from query-key similarity. Stacking attention and MLP layers with residual connections gives the transformer, the architecture behind modern LLMs.",
    eli5: {
      analogy:
        "At a party, each guest asks a question (query), every guest wears a name tag describing what they know (key), and carries a notebook (value). Each guest listens most to people whose name tags match their question and mixes their notebooks accordingly.",
      steps: [
        "Compare my question with everyone's name tag to get a match score.",
        "Turn the scores into percentages that add up to 100 (softmax).",
        "Blend everyone's notebooks using those percentages.",
        "In a causal model, I can only listen to guests who arrived before me.",
      ],
      analogyLimit:
        "Guests at a party listen once. A transformer repeats this in many heads and many layers, each learning different questions, and the queries, keys and values are learned projections, not fixed facts.",
    },
    senior: {
      definition:
        "Attention(Q, K, V) = softmax(Q K^T / sqrt(d_k) + M) V, where M is 0 for allowed positions and minus infinity for masked ones. Multi-head attention runs h such maps on projected subspaces and concatenates them.",
      invariants: [
        "Each row of the attention weight matrix sums to 1.",
        "With a causal mask, token i only attends to positions j <= i, so training matches autoregressive generation.",
        "Scaling by sqrt(d_k) keeps dot products from growing with dimension and saturating the softmax.",
      ],
      mechanism: [
        "Scores Q K^T measure similarity between each query and each key.",
        "Softmax with max subtraction is numerically stable; masked entries become exactly 0 weight.",
        "The output row for a token is its weight-averaged value vectors.",
        "A transformer block: x + Attention(LayerNorm(x)), then x + MLP(LayerNorm(x)) (pre-norm), plus positional information through embeddings or rotary encodings.",
      ],
      complexity: "O(n^2 d) time and O(n^2) memory per head for sequence length n; FlashAttention reduces memory traffic but not the n^2 compute.",
      tradeoffs: [
        { option: "Full attention", choose: "Sequences up to several thousand tokens with optimized kernels.", cost: "Quadratic cost in sequence length." },
        { option: "Sliding-window or sparse attention", choose: "Very long contexts with mostly local dependencies.", cost: "Loses some long-range interactions." },
        { option: "Recurrent or state-space models", choose: "Linear-time streaming over long sequences.", cost: "Different trade-offs in in-context recall." },
      ],
      failureModes: [
        "Forgetting the causal mask during training, letting the model see future tokens.",
        "Omitting the sqrt(d_k) scale so softmax saturates and gradients vanish.",
        "Softmax overflow without subtracting the row maximum.",
        "Padding tokens not masked, so the model attends to padding.",
      ],
      production:
        "Attention dominates LLM inference cost at long contexts; KV caching, grouped-query attention and FlashAttention are the standard optimizations (week 13 covers inference).",
      interviewAnswer:
        "Each token's query is compared with every key by dot product, scaled by sqrt(d_k), turned into weights with softmax, and used to average the values. Decoders add a causal mask so position i only sees j <= i. A transformer block wraps multi-head attention and an MLP with residual connections and layer normalization; cost is quadratic in sequence length.",
    },
    implementation: {
      problem: "Compute scaled dot-product attention weights and outputs for three tokens, with and without a causal mask.",
      input: "Q = K = [[1, 0], [0, 1], [1, 1]]; V = [[1, 2], [3, 4], [5, 6]]; d_k = 2",
      python: {
        code: code`
          from math import exp, inf, sqrt

          Q = [[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]]
          K = [[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]]
          V = [[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]]


          def softmax(row: list[float]) -> list[float]:
              m = max(row)
              e = [exp(v - m) for v in row]
              s = sum(e)
              return [v / s for v in e]


          def attention(q, k, v, causal: bool = False):
              d = len(q[0])
              weights = []
              for i, qi in enumerate(q):
                  scores = [sum(a * b for a, b in zip(qi, kj)) / sqrt(d) for kj in k]
                  if causal:
                      scores = [s if j <= i else -inf for j, s in enumerate(scores)]
                  weights.append(softmax(scores))
              out = [[sum(w * vj[c] for w, vj in zip(wi, v)) for c in range(len(v[0]))] for wi in weights]
              return weights, out


          for causal in (False, True):
              w, out = attention(Q, K, V, causal)
              print("causal" if causal else "full")
              for i, (wi, oi) in enumerate(zip(w, out)):
                  print(f"  token {i}: weights={' '.join(f'{x:.3f}' for x in wi)} output={' '.join(f'{x:.3f}' for x in oi)}")
        `,
      },
      r: {
        code: code`
          Q <- matrix(c(1, 0, 0, 1, 1, 1), ncol = 2, byrow = TRUE)
          K <- Q
          V <- matrix(c(1, 2, 3, 4, 5, 6), ncol = 2, byrow = TRUE)

          softmax_rows <- function(s) {
            e <- exp(s - apply(s, 1, max))
            e / rowSums(e)
          }

          attention <- function(q, k, v, causal = FALSE) {
            scores <- q %*% t(k) / sqrt(ncol(q))
            if (causal) scores[upper.tri(scores)] <- -Inf
            w <- softmax_rows(scores)
            list(weights = w, out = w %*% v)
          }

          for (causal in c(FALSE, TRUE)) {
            a <- attention(Q, K, V, causal)
            cat(if (causal) "causal" else "full", "\n", sep = "")
            for (i in 1:3) {
              cat(sprintf("  token %d: weights=%s output=%s\n", i - 1,
                          paste(sprintf("%.3f", a$weights[i, ]), collapse = " "),
                          paste(sprintf("%.3f", a$out[i, ]), collapse = " ")))
            }
          }
        `,
      },
      expectedOutput: code`
        full
          token 0: weights=0.401 0.198 0.401 output=3.000 4.000
          token 1: weights=0.198 0.401 0.401 output=3.407 4.407
          token 2: weights=0.248 0.248 0.503 output=3.510 4.510
        causal
          token 0: weights=1.000 0.000 0.000 output=1.000 2.000
          token 1: weights=0.330 0.670 0.000 output=2.340 3.340
          token 2: weights=0.248 0.248 0.503 output=3.510 4.510
      `,
      tests: {
        python: code`
          def test_rows_sum_to_one():
              w, _ = attention(Q, K, V)
              assert all(abs(sum(r) - 1) < 1e-12 for r in w)


          def test_causal_mask_blocks_the_future():
              w, _ = attention(Q, K, V, causal=True)
              assert w[0][1] == 0 and w[0][2] == 0 and w[1][2] == 0


          def test_first_causal_token_copies_its_value():
              _, out = attention(Q, K, V, causal=True)
              assert out[0] == V[0]
        `,
        r: code`
          test_that("rows sum to one", {
            expect_equal(rowSums(attention(Q, K, V)$weights), c(1, 1, 1))
          })

          test_that("the causal mask blocks the future", {
            w <- attention(Q, K, V, causal = TRUE)$weights
            expect_equal(w[upper.tri(w)], c(0, 0, 0))
          })
        `,
      },
      eli5Trace: [
        "Token 2's question (1, 1) matches its own name tag best, so it listens most to itself.",
        "Token 0's question (1, 0) matches tokens 0 and 2 equally and token 1 less.",
        "Each output blends the three notebooks with those percentages.",
        "With the causal mask, token 0 can only listen to itself, so its output is exactly its own notebook (1, 2).",
      ],
      complexity: { time: "O(n^2 d)", space: "O(n^2) for the weights" },
      edgeCases: [
        "A fully masked row would divide by zero; real implementations always keep at least the token itself.",
        "Very large scores overflow exp without subtracting the row maximum.",
        "Padding must be masked like future tokens.",
        "exp(-inf) is exactly 0 in both languages, so masked weights print as 0.000.",
      ],
      incorrect: {
        language: "python",
        code: code`
          scores = [sum(a * b for a, b in zip(qi, kj)) for kj in k]
          weights.append(softmax(scores))
        `,
        whyWrong: "Without dividing by sqrt(d_k), scores grow with dimension; in real models (d_k = 64 or 128) the softmax saturates to near one-hot weights and gradients vanish.",
        fix: "Divide every score by sqrt(d_k) before the softmax.",
      },
    },
    referenceSnippet: {
      language: "python",
      label: "PyTorch equivalent (reference only: PyTorch does not run in the browser runtime)",
      code: code`
        import torch
        import torch.nn.functional as F

        q = k = torch.tensor([[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]]).unsqueeze(0)
        v = torch.tensor([[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]]).unsqueeze(0)
        out = F.scaled_dot_product_attention(q, k, v, is_causal=True)
      `,
    },
    flow: {
      title: "Scaled dot-product attention",
      nodes: [
        node("q", "Queries Q", 0, 30, "what I look for"),
        node("k", "Keys K", 0, 190, "what I contain"),
        node("scores", "Q K^T / sqrt(d)", 240, 110, "similarity"),
        node("mask", "Causal mask", 470, 110, "-inf above diagonal"),
        node("softmax", "Softmax", 690, 110, "rows sum to 1"),
        node("v", "Values V", 690, 250, "what I pass on"),
        node("out", "Weighted sum", 910, 170, "new representation"),
      ],
      edges: [edge("q", "scores"), edge("k", "scores"), edge("scores", "mask"), edge("mask", "softmax"), edge("softmax", "out"), edge("v", "out")],
      steps: [
        step("q k scores", "q-scores k-scores", "Every query is compared with every key by dot product, divided by sqrt(d_k)."),
        step("scores mask", "scores-mask", "In a decoder, future positions get minus infinity so they cannot be attended to."),
        step("mask softmax", "mask-softmax", "Softmax turns each row into weights that sum to 1; masked entries become exactly 0."),
        step("softmax v out", "softmax-out v-out", "Each token's output is the weighted average of the value vectors."),
      ],
    },
    practice: [
      {
        id: "w09-attn-recall-1",
        type: "recall",
        prompt: "Why do transformers need positional information?",
        answer: "Attention is permutation-equivariant: without positions, shuffling tokens shuffles outputs identically, so word order is lost. Positional embeddings or rotary encodings inject order.",
        rubric: ["Permutation equivariance", "Positional or rotary encodings"],
      },
      {
        id: "w09-attn-recall-2",
        type: "recall",
        prompt: "What is the time and memory cost of attention in sequence length, and why does it matter for long contexts?",
        answer: "O(n^2) per head for scores and weights, so doubling context quadruples attention work; it dominates long-context training and inference cost.",
        rubric: ["Quadratic in n", "Long context impact"],
      },
    ],
    references: [
      { title: "Attention Is All You Need (Vaswani et al., 2017)", url: "https://arxiv.org/abs/1706.03762", versionSensitive: false },
      { title: "PyTorch documentation: scaled_dot_product_attention", url: "https://pytorch.org/docs/stable/generated/torch.nn.functional.scaled_dot_product_attention.html", versionSensitive: true },
    ],
    lastReviewed: REVIEWED,
  }),

  defineTopic({
    id: "w09-d04-cnn-rnn",
    slug: "cnn-rnn",
    title: "Convolutions and recurrent networks",
    domain: "deep-learning",
    roles: ["ml-engineer", "genai-engineer"],
    difficulty: "intermediate",
    minutes: 70,
    prerequisites: ["w09-d01-backpropagation"],
    objectives: [
      "Compute a 1D convolution, ReLU and max pooling by hand",
      "Run a recurrent cell over a sequence and see how its state carries information",
      "Explain vanishing gradients in RNNs and how LSTMs and attention address them",
    ],
    summary:
      "Convolutions slide a small filter across the input to detect local patterns with shared weights. Recurrent networks carry a hidden state through time. Both remain useful, and their limits explain why transformers took over sequence modeling.",
    eli5: {
      analogy:
        "A convolution is a small stencil you slide along a strip of paper, marking where the pattern on the stencil matches. A recurrent network is reading a story one word at a time while keeping a short summary in your head.",
      steps: [
        "Slide the stencil one step at a time and multiply-and-add under it.",
        "Keep only positive matches (ReLU) and keep the strongest match in each pair of spots (max pooling).",
        "For the story, update your summary with each new word and a bit of the old summary.",
        "Notice that the first words fade from the summary as the story goes on.",
      ],
      analogyLimit:
        "Real CNNs stack many learned stencils over 2D images with channels, and real RNNs keep vectors, not single numbers. LSTMs add gates that decide what to keep, which slows the fading but does not remove it.",
    },
    senior: {
      definition:
        "A 1D convolution (cross-correlation in deep learning) computes y[i] = sum_k w[k] x[i + k]. An Elman RNN updates h_t = tanh(w_x x_t + w_h h_(t-1) + b); the gradient of h_T with respect to h_1 is the product over t of w_h (1 - h_t^2).",
      invariants: [
        "Weights are shared across positions (convolution) or time steps (RNN).",
        "Valid convolution output length is n - k + 1 at stride 1.",
        "The RNN's Jacobian product shrinks geometrically when |w_h (1 - h^2)| < 1, causing vanishing gradients.",
      ],
      mechanism: [
        "The kernel [1, 0, -1] responds to falling edges with positive values and rising edges with negative values.",
        "ReLU keeps positive responses and max pooling with size 2 and stride 2 halves the length.",
        "The RNN state after a 1 input decays when later inputs are 0, and the printed Jacobian product shows how little the first step influences the last.",
        "LSTM and GRU gates create additive paths that keep gradients alive longer; attention connects any two positions directly.",
      ],
      complexity: "Convolution O(n k) per channel pair. RNN O(T d^2) and inherently sequential across time.",
      tradeoffs: [
        { option: "CNN", choose: "Images, audio and local patterns with translation invariance.", cost: "Limited receptive field per layer." },
        { option: "RNN, LSTM or GRU", choose: "Streaming, low-latency sequence models on device.", cost: "Sequential training and fading long-range memory." },
        { option: "Transformer", choose: "Most text and multimodal tasks.", cost: "Quadratic attention cost and large memory." },
      ],
      failureModes: [
        "Mixing up convolution and cross-correlation when porting weights.",
        "Off-by-one output sizes when padding and stride change.",
        "Exploding RNN gradients without clipping.",
        "Expecting a plain RNN to remember dependencies hundreds of steps back.",
      ],
      production:
        "CNNs still run most on-device vision, and small RNNs or temporal convolutions run keyword spotting and sensor streams where latency and memory are tight.",
      interviewAnswer:
        "A convolution slides shared weights across the input, giving translation-equivariant local feature detectors; pooling adds some invariance and shrinks the map. An RNN reuses one cell over time, but gradients through time are products of Jacobians, so they vanish or explode. LSTMs add gated additive memory, and transformers replace recurrence with attention, which parallelizes training and connects distant positions directly.",
    },
    implementation: {
      problem: "Run a 1D convolution with ReLU and max pooling on a signal, then a scalar RNN over a sequence with its gradient decay.",
      input: "signal 0 0 1 1 1 0 0 2 2 0; kernel [1, 0, -1]; RNN w_x = 0.5, w_h = 0.8, b = 0 over inputs 1 0 0 1",
      python: {
        code: code`
          from math import tanh

          SIGNAL = [0, 0, 1, 1, 1, 0, 0, 2, 2, 0]
          KERNEL = [1, 0, -1]


          def conv1d(x: list[float], w: list[float]) -> list[float]:
              return [sum(w[k] * x[i + k] for k in range(len(w))) for i in range(len(x) - len(w) + 1)]


          def max_pool(x: list[float], size: int = 2) -> list[float]:
              return [max(x[i:i + size]) for i in range(0, len(x) - size + 1, size)]


          def rnn(inputs: list[float], w_x: float, w_h: float, b: float = 0.0) -> list[float]:
              h, states = 0.0, []
              for x in inputs:
                  h = tanh(w_x * x + w_h * h + b)
                  states.append(h)
              return states


          conv = conv1d(SIGNAL, KERNEL)
          relu = [max(0, v) for v in conv]
          print(f"conv: {' '.join(str(v) for v in conv)}")
          print(f"relu: {' '.join(str(v) for v in relu)}")
          print(f"pool: {' '.join(str(v) for v in max_pool(relu))}")

          states = rnn([1, 0, 0, 1], 0.5, 0.8)
          print("rnn states: " + " ".join(f"{h:.4f}" for h in states))
          jac = 1.0
          for h in states[1:]:
              jac *= 0.8 * (1 - h * h)
          print(f"d h4 / d h1 = {jac:.4f}")
        `,
      },
      r: {
        code: code`
          signal <- c(0, 0, 1, 1, 1, 0, 0, 2, 2, 0)
          kernel <- c(1, 0, -1)

          conv1d <- function(x, w) sapply(seq_len(length(x) - length(w) + 1), function(i) sum(w * x[i:(i + length(w) - 1)]))
          max_pool <- function(x, size = 2) sapply(seq(1, length(x) - size + 1, by = size), function(i) max(x[i:(i + size - 1)]))

          rnn <- function(inputs, w_x, w_h, b = 0) {
            h <- 0
            states <- numeric(0)
            for (x in inputs) {
              h <- tanh(w_x * x + w_h * h + b)
              states <- c(states, h)
            }
            states
          }

          conv <- conv1d(signal, kernel)
          relu <- pmax(0, conv)
          cat("conv:", conv, "\n")
          cat("relu:", relu, "\n")
          cat("pool:", max_pool(relu), "\n")

          states <- rnn(c(1, 0, 0, 1), 0.5, 0.8)
          cat("rnn states: ", paste(sprintf("%.4f", states), collapse = " "), "\n", sep = "")
          jac <- prod(0.8 * (1 - states[-1]^2))
          cat(sprintf("d h4 / d h1 = %.4f\n", jac))
        `,
      },
      expectedOutput: code`
        conv: -1 -1 0 1 1 -2 -2 2
        relu: 0 0 0 1 1 0 0 2
        pool: 0 1 1 2
        rnn states: 0.4621 0.3537 0.2757 0.6172
        d h4 / d h1 = 0.2562
      `,
      tests: {
        python: code`
          def test_valid_output_length():
              assert len(conv1d(SIGNAL, KERNEL)) == len(SIGNAL) - len(KERNEL) + 1


          def test_constant_signal_gives_zero_edges():
              assert conv1d([3, 3, 3, 3], KERNEL) == [0, 0]


          def test_state_decays_without_input():
              s = rnn([1, 0, 0, 0], 0.5, 0.8)
              assert s[0] > s[1] > s[2] > s[3] > 0
        `,
        r: code`
          test_that("valid output length", {
            expect_length(conv1d(signal, kernel), length(signal) - length(kernel) + 1)
          })

          test_that("a constant signal has no edges", {
            expect_equal(conv1d(c(3, 3, 3, 3), kernel), c(0, 0))
          })

          test_that("the state decays without input", {
            s <- rnn(c(1, 0, 0, 0), 0.5, 0.8)
            expect_true(all(diff(s) < 0))
          })
        `,
      },
      eli5Trace: [
        "Sliding the stencil [1, 0, -1]: where the signal steps up from 0 to 1 the match is -1; where it steps down it is +1.",
        "Keeping only positive matches leaves the falling edges, and pooling keeps the stronger of each pair.",
        "The reader's summary jumps after the first 1, then fades through the two 0s, then jumps again at the last 1.",
        "The final number shows how weakly the first step still influences the last one: the fading memory.",
      ],
      complexity: { time: "O(n k) for the convolution, O(T) for the scalar RNN", space: "O(n)" },
      edgeCases: [
        "A kernel longer than the signal produces no outputs.",
        "Pooling drops a trailing element when the length is odd.",
        "Integer outputs print without decimals: Python prints ints and R prints whole doubles the same way.",
        "w_h above 1 with small activations can make gradients explode instead of vanish.",
      ],
      incorrect: {
        language: "python",
        code: code`
          def conv1d(x, w):
              return [sum(w[k] * x[i + k] for k in range(len(w))) for i in range(len(x))]
        `,
        whyWrong: "It runs past the end of the signal (index error) because a valid convolution only has len(x) - len(w) + 1 positions.",
        fix: "Iterate i over range(len(x) - len(w) + 1), or pad the input explicitly.",
      },
    },
    flow: {
      title: "A recurrent cell unrolled through time",
      nodes: [
        node("h0", "h0 = 0", 0, 110),
        node("t1", "step 1", 220, 110, "x = 1"),
        node("t2", "step 2", 440, 110, "x = 0"),
        node("t3", "step 3", 660, 110, "x = 0"),
        node("t4", "step 4", 880, 110, "x = 1"),
      ],
      edges: [edge("h0", "t1"), edge("t1", "t2"), edge("t2", "t3"), edge("t3", "t4")],
      steps: [
        step("h0 t1", "h0-t1", "The first input of 1 pushes the state to tanh(0.5), about 0.46."),
        step("t1 t2", "t1-t2", "With input 0, the state shrinks to tanh(0.8 times the previous state)."),
        step("t2 t3", "t2-t3", "It shrinks again: the memory of step 1 fades."),
        step("t3 t4", "t3-t4", "A new 1 arrives. The gradient from step 4 back to step 1 is a product of three factors below 1."),
      ],
    },
    practice: [
      {
        id: "w09-cnn-recall-1",
        type: "recall",
        prompt: "Compute the output size of a 2D convolution with input 32x32, kernel 3x3, padding 1, stride 2.",
        answer: "floor((32 + 2 * 1 - 3) / 2) + 1 = 16, so 16x16.",
        rubric: ["Uses the size formula", "Gets 16"],
      },
      {
        id: "w09-rnn-recall-1",
        type: "recall",
        prompt: "How does an LSTM reduce vanishing gradients?",
        answer: "Its cell state is updated additively, c_t = f * c_(t-1) + i * g, so gradients can flow through the forget gate path with less shrinkage when f is near 1.",
        rubric: ["Additive cell state", "Forget gate"],
      },
    ],
    references: [
      { title: "Deep Learning (Goodfellow, Bengio, Courville), chapters 9 and 10", url: "https://www.deeplearningbook.org/", versionSensitive: false },
      { title: "PyTorch documentation: torch.nn.Conv1d", url: "https://pytorch.org/docs/stable/generated/torch.nn.Conv1d.html", versionSensitive: true },
    ],
    lastReviewed: REVIEWED,
  }),
];

export const week = defineWeek({
  number: 9,
  slug: "deep-learning",
  title: "Deep learning",
  track: "ai",
  domains: ["deep-learning"],
  summary:
    "Tensors, backpropagation, optimization and regularization, then the architectures (CNNs, RNNs, attention and transformers) that lead into LLMs. PyTorch equivalents are shown as reference.",
  outcomes: [
    "Derive and check gradients by hand",
    "Choose optimizers and regularizers and debug divergence",
    "Compute attention and explain the transformer block",
  ],
  roles: ["ml-engineer", "genai-engineer", "data-scientist"],
  days: [
    {
      id: "w09-d01",
      day: 1,
      kind: "concept-map",
      title: "Tensors and backpropagation",
      summary: "The chain rule from loss to parameters, verified numerically.",
      minutes: 85,
      goals: ["Compute every gradient by hand", "Pass the gradient check"],
      tasks: [
        { label: "Concept map and ELI5", minutes: 15 },
        { label: "Run the example and gradient check", minutes: 35 },
        { label: "ReLU variant drill", minutes: 20 },
        { label: "Recall prompt", minutes: 15 },
      ],
      topicIds: ["w09-d01-backpropagation"],
    },
    {
      id: "w09-d02",
      day: 2,
      kind: "theory-lab",
      title: "Optimization and regularization",
      summary: "Gradient descent, momentum and Adam in an ill-conditioned valley.",
      minutes: 80,
      goals: ["Predict the divergence threshold", "Explain AdamW"],
      tasks: [
        { label: "Step through the valley diagram", minutes: 15 },
        { label: "Run the optimizers", minutes: 30 },
        { label: "NaN loss case", minutes: 20 },
        { label: "Recall prompt", minutes: 15 },
      ],
      topicIds: ["w09-d02-optimizers-regularization"],
    },
    {
      id: "w09-d03",
      day: 3,
      kind: "implementation",
      title: "Attention and transformers",
      summary: "Scaled dot-product attention and causal masks by hand.",
      minutes: 95,
      goals: ["Compute attention weights and outputs", "Explain the transformer block"],
      tasks: [
        { label: "Read the party analogy and its limit", minutes: 10 },
        { label: "Run attention with and without the mask", minutes: 35 },
        { label: "Positional encoding prompt", minutes: 25 },
        { label: "Recall prompt", minutes: 25 },
      ],
      topicIds: ["w09-d03-attention-transformers"],
    },
    {
      id: "w09-d04",
      day: 4,
      kind: "applied-practice",
      title: "CNNs, RNNs and deep learning drills",
      summary: "Convolutions and recurrence by hand, then mixed deep learning drills.",
      minutes: 90,
      goals: ["Compute conv output sizes", "Explain vanishing gradients"],
      tasks: [
        { label: "CNN and RNN lesson and example", minutes: 35 },
        { label: "Mixed drills", minutes: 40 },
        { label: "Log weak spots", minutes: 15 },
      ],
      topicIds: ["w09-d04-cnn-rnn", "w09-d01-backpropagation", "w09-d02-optimizers-regularization", "w09-d03-attention-transformers"],
    },
    {
      id: "w09-d05",
      day: 5,
      kind: "production-lens",
      title: "The training run that diverged",
      summary: "Debugging a large training run: learning rate, data, precision and checkpoints.",
      minutes: 60,
      goals: ["Write a divergence runbook"],
      tasks: [
        { label: "Read the scenario", minutes: 10 },
        { label: "Answer the case questions", minutes: 35 },
        { label: "Compare against the rubric", minutes: 15 },
      ],
      topicIds: ["w09-d02-optimizers-regularization"],
      productionCase: {
        title: "Loss spikes to NaN at step 12,000 of a 3-day run",
        scenario:
          "A 1B-parameter transformer trains on 64 GPUs in mixed precision. Loss decreased normally, then spiked at step 12,000 and became NaN within 50 steps. The last checkpoint is from step 11,500.",
        constraints: [
          "Each hour of the cluster costs a lot; restarts must be targeted.",
          "The data pipeline shuffles from many shards.",
          "The team uses AdamW with a cosine schedule and 2,000 warmup steps.",
        ],
        questions: [
          "What do you look at first, and what does each signal suggest?",
          "How do you check whether a specific batch caused it?",
          "Which mitigations would you apply before restarting?",
          "What monitoring would catch this earlier next time?",
        ],
        rubric: [
          "Inspects gradient norm, learning rate and loss scale history around the spike",
          "Replays the batches from the spike window to find bad data",
          "Restarts from the checkpoint with gradient clipping, lower peak LR or bf16, and skips bad batches",
          "Adds alerts on gradient norm and loss spikes plus more frequent checkpoints",
        ],
        pitfalls: ["Restarting unchanged and hoping", "Lowering the learning rate for the whole run without diagnosis"],
      },
    },
    {
      id: "w09-d06",
      day: 6,
      kind: "interview-simulation",
      title: "Deep learning interview round",
      summary: "Timed questions on backprop, optimizers and attention, with one derivation.",
      minutes: 55,
      goals: ["Derive the attention formula from memory"],
      tasks: [
        { label: "Timed deep learning questions", minutes: 30 },
        { label: "One derivation on paper", minutes: 15 },
        { label: "Self-score with the rubric", minutes: 10 },
      ],
      topicIds: ["w09-d01-backpropagation", "w09-d02-optimizers-regularization", "w09-d03-attention-transformers", "w09-d04-cnn-rnn"],
    },
    {
      id: "w09-d07",
      day: 7,
      kind: "review",
      title: "Deep learning review",
      summary: "Spaced review and a redo of the attention computation from scratch.",
      minutes: 45,
      goals: ["Clear due reviews", "Recompute attention for a new example"],
      tasks: [
        { label: "Due reviews", minutes: 25 },
        { label: "Attention from scratch", minutes: 20 },
      ],
      topicIds: ["w09-d01-backpropagation", "w09-d02-optimizers-regularization", "w09-d03-attention-transformers", "w09-d04-cnn-rnn"],
    },
  ],
});
