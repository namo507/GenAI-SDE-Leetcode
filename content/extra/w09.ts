import { REVIEWED, code, defineTopic, edge, node, step } from "../helpers";
import type { ExtraWeek } from "./types";

export const w09: ExtraWeek = {
  schedule: [
    {
      dayId: "w09-d05",
      topicId: "w09-d05-training-at-scale",
      tasks: [
        { label: "Training at scale: accumulation, data parallelism, sharding", minutes: 30 },
        { label: "Memory and compute estimates for a 7B model", minutes: 15 },
      ],
    },
  ],
  topics: [
    defineTopic({
      id: "w09-d05-training-at-scale",
      slug: "training-at-scale",
      title: "Training at scale: batches, parallelism and memory",
      domain: "deep-learning",
      roles: ["ml-engineer", "genai-engineer", "data-scientist"],
      difficulty: "advanced",
      minutes: 50,
      prerequisites: ["w09-d02-optimizers-regularization"],
      objectives: [
        "Show that gradient accumulation and data parallelism reproduce the large-batch gradient",
        "Estimate training memory for mixed-precision Adam and how ZeRO or FSDP sharding divides it",
        "Turn the 6 × parameters × tokens rule into accelerator-hours and days",
      ],
      summary:
        "Big models do not fit on one device and big batches do not fit in one pass. Gradient accumulation adds up small batches before one update, data parallelism splits a batch across devices and averages their gradients, and sharding (ZeRO, FSDP) splits weights, gradients and optimizer state so each device holds only a slice. Back-of-envelope memory and compute math tells you which tools you need before you rent a cluster.",
      eli5: {
        analogy:
          "Grading a huge stack of homework. You can grade it all at once, or four friends each grade a quarter and you average their marks. You get the same answer as long as you average properly. And if the answer key is too heavy for one backpack, each friend carries one part of it.",
        steps: [
          "Split the big pile into small piles.",
          "Work out the 'fix it' arrow for each small pile.",
          "Average the arrows so it is exactly like doing the big pile at once.",
          "Share the heavy notebooks between friends so nobody's backpack bursts.",
        ],
        analogyLimit:
          "Friends who must share notes constantly spend time talking instead of grading. Real clusters lose speed to communication, so splitting work is never perfectly free.",
      },
      senior: {
        definition:
          "Data parallelism replicates the model on each device, gives each a shard of the batch and all-reduces gradients so every replica takes the same step. Sharded data parallelism (ZeRO stages 1 to 3, PyTorch FSDP) partitions optimizer state, gradients and weights across devices and gathers them when needed. Tensor and pipeline parallelism split individual layers or layer stacks. Gradient accumulation sums micro-batch gradients before a single optimizer step.",
        invariants: [
          "The accumulated gradient must equal the large-batch mean, so each micro-batch loss is divided by the number of accumulation steps.",
          "All data-parallel replicas hold identical weights after every step.",
          "Effective batch = micro-batch × accumulation steps × data-parallel replicas; learning rate and warmup are tuned for the effective batch.",
        ],
        mechanism: [
          "The full batch of 8 gives grad_w = −19.4125. Four micro-batches of 2, each divided by 4, give exactly the same, and so do two workers averaging their halves.",
          "Forgetting to divide makes the gradient 4.00 times too large, which with SGD acts like a 4 times higher learning rate and also changes when gradient clipping kicks in.",
          "Mixed-precision Adam stores 16 bytes per parameter (2 for bf16 weights, 2 for gradients, 12 for fp32 master weights and two Adam moments): 112 GB for 7B parameters before activations.",
          "Sharding everything (ZeRO-3) across 8 GPUs leaves 14 GB per GPU; sharding only optimizer states (ZeRO-1) leaves 38.5 GB.",
          "Training compute is roughly 6 × parameters × tokens: 4.2 × 10²² FLOPs for 7B parameters and 1 trillion tokens, about 72,917 accelerator-hours at a hypothetical 400 TFLOP/s peak and 40% utilization.",
        ],
        complexity:
          "All-reduce moves about 2 × model size bytes per step per device with ring algorithms; ZeRO-3 adds weight all-gathers in forward and backward. Compute per token is about 6 FLOPs per parameter for training and 2 for inference.",
        tradeoffs: [
          { option: "Data parallel (DDP)", choose: "The model and optimizer state fit on one device.", cost: "Every device holds a full copy; gradient all-reduce bandwidth." },
          { option: "Sharded data parallel (ZeRO, FSDP)", choose: "Optimizer state or weights do not fit per device.", cost: "More communication and some configuration complexity." },
          { option: "Tensor and pipeline parallel", choose: "Single layers are too large or the model spans many nodes.", cost: "Needs fast interconnects; pipeline bubbles; complex code." },
          { option: "Gradient accumulation", choose: "Memory limits the micro-batch but you want a larger effective batch.", cost: "No speedup; fewer optimizer steps per hour." },
        ],
        failureModes: [
          "Summing micro-batch losses without dividing, which silently multiplies the learning rate.",
          "Forgetting activation memory, which often dominates at long sequence lengths, and running out of memory at step one.",
          "fp16 overflow without loss scaling, producing NaN losses; bf16 has fp32's exponent range and avoids most of this.",
          "Batch normalization statistics differ between micro-batches and the full batch, so accumulation is not exactly equivalent with BatchNorm.",
          "Scaling the batch and learning rate up without warmup, which causes early divergence.",
        ],
        production:
          "Production runs use bf16 mixed precision, FSDP or DeepSpeed ZeRO, activation checkpointing, gradient clipping, frequent sharded checkpoints to object storage, and dashboards for loss, gradient norm, throughput and model FLOPs utilization. Data loaders must resume deterministically after a restart, and spot or preemptible capacity needs automatic resume.",
        interviewAnswer:
          "I estimate first: 16 bytes per parameter for mixed-precision Adam plus activations tells me whether plain data parallelism fits. If not, I shard with FSDP or ZeRO, add activation checkpointing, and use gradient accumulation to reach the target effective batch, dividing each micro-batch loss by the number of steps so the gradient equals the large-batch mean. For time and cost I use about 6 FLOPs per parameter per token and a realistic utilization of 30 to 50 percent.",
      },
      implementation: {
        problem: "Check that gradient accumulation and data-parallel averaging reproduce the full-batch gradient, then estimate memory per GPU and training time for a 7B model.",
        input: "8 (x, y) points for a linear model at w = 0.5, b = 0; 7B parameters, 8 GPUs, 1 trillion tokens",
        python: {
          code: code`
            X = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0]
            Y = [1.1, 2.1, 2.9, 4.2, 5.1, 5.8, 7.2, 8.1]


            def grad(xs, ys, w, b):
                gw = gb = 0.0
                for x, y in zip(xs, ys):
                    err = w * x + b - y
                    gw += 2 * err * x
                    gb += 2 * err
                return gw / len(xs), gb / len(xs)


            def same(a, b):
                return "yes" if abs(a[0] - b[0]) < 1e-12 and abs(a[1] - b[1]) < 1e-12 else "no"


            w, b = 0.5, 0.0
            full = grad(X, Y, w, b)
            print(f"full batch of 8: grad_w {full[0]:.4f}, grad_b {full[1]:.4f}")
            acc = [0.0, 0.0]
            for k in range(0, 8, 2):
                gw, gb = grad(X[k:k + 2], Y[k:k + 2], w, b)
                acc[0] += gw / 4
                acc[1] += gb / 4
            print(f"4 micro-batches of 2, accumulated / 4: grad_w {acc[0]:.4f}, grad_b {acc[1]:.4f}, same as full batch: {same(acc, full)}")
            workers = [grad(X[:4], Y[:4], w, b), grad(X[4:], Y[4:], w, b)]
            reduced = [(workers[0][0] + workers[1][0]) / 2, (workers[0][1] + workers[1][1]) / 2]
            print(f"2 data-parallel workers, all-reduce mean: grad_w {reduced[0]:.4f}, same as full batch: {same(reduced, full)}")
            print(f"forgot to divide by the number of micro-batches: grad_w is {4 * acc[0] / full[0]:.2f}x too large")

            params = 7e9
            per_param = {"bf16 weights": 2, "bf16 gradients": 2, "fp32 master weights": 4, "Adam first moment": 4, "Adam second moment": 4}
            total_bytes = 0
            for name, size in per_param.items():
                total_bytes += size
            print(f"mixed-precision Adam needs {total_bytes} bytes per parameter: {params * total_bytes / 1e9:.0f} GB for 7B parameters before activations")
            gpus = 8
            stages = [("ZeRO-1 (shard optimizer states)", 2 + 2 + 12 / gpus),
                      ("ZeRO-2 (+ shard gradients)", 2 + (2 + 12) / gpus),
                      ("ZeRO-3 (+ shard weights)", (2 + 2 + 12) / gpus)]
            for name, bytes_per_param in stages:
                print(f"{name} on {gpus} GPUs: {params * bytes_per_param / 1e9:.2f} GB per GPU")
            tokens = 1e12
            flops = 6 * params * tokens
            peak, utilization, cluster = 400e12, 0.40, 512  # hypothetical accelerator
            gpu_hours = flops / (peak * utilization) / 3600
            print(f"training compute ~6 x params x tokens = {flops:.2e} FLOPs")
            print(f"at a hypothetical 400 TFLOP/s peak and 40% utilization: {gpu_hours:,.0f} accelerator-hours, {gpu_hours / cluster / 24:.1f} days on {cluster}")
          `,
        },
        r: {
          code: code`
            x_all <- c(0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0)
            y_all <- c(1.1, 2.1, 2.9, 4.2, 5.1, 5.8, 7.2, 8.1)

            grad <- function(xs, ys, w, b) {
              gw <- 0
              gb <- 0
              for (i in seq_along(xs)) {
                err <- w * xs[i] + b - ys[i]
                gw <- gw + 2 * err * xs[i]
                gb <- gb + 2 * err
              }
              c(gw, gb) / length(xs)
            }

            same <- function(a, b) if (all(abs(a - b) < 1e-12)) "yes" else "no"

            w <- 0.5
            b <- 0
            full <- grad(x_all, y_all, w, b)
            cat(sprintf("full batch of 8: grad_w %.4f, grad_b %.4f\n", full[1], full[2]))
            acc <- c(0, 0)
            for (k in seq(1, 8, by = 2)) {
              g <- grad(x_all[k:(k + 1)], y_all[k:(k + 1)], w, b)
              acc <- acc + g / 4
            }
            cat(sprintf("4 micro-batches of 2, accumulated / 4: grad_w %.4f, grad_b %.4f, same as full batch: %s\n", acc[1], acc[2], same(acc, full)))
            workers <- list(grad(x_all[1:4], y_all[1:4], w, b), grad(x_all[5:8], y_all[5:8], w, b))
            reduced <- (workers[[1]] + workers[[2]]) / 2
            cat(sprintf("2 data-parallel workers, all-reduce mean: grad_w %.4f, same as full batch: %s\n", reduced[1], same(reduced, full)))
            cat(sprintf("forgot to divide by the number of micro-batches: grad_w is %.2fx too large\n", 4 * acc[1] / full[1]))

            params <- 7e9
            per_param <- c("bf16 weights" = 2, "bf16 gradients" = 2, "fp32 master weights" = 4, "Adam first moment" = 4, "Adam second moment" = 4)
            total_bytes <- sum(per_param)
            cat(sprintf("mixed-precision Adam needs %d bytes per parameter: %.0f GB for 7B parameters before activations\n", as.integer(total_bytes), params * total_bytes / 1e9))
            gpus <- 8
            stages <- c(
              "ZeRO-1 (shard optimizer states)" = 2 + 2 + 12 / gpus,
              "ZeRO-2 (+ shard gradients)" = 2 + (2 + 12) / gpus,
              "ZeRO-3 (+ shard weights)" = (2 + 2 + 12) / gpus
            )
            for (name in names(stages)) {
              cat(sprintf("%s on %d GPUs: %.2f GB per GPU\n", name, as.integer(gpus), params * stages[[name]] / 1e9))
            }
            tokens <- 1e12
            flops <- 6 * params * tokens
            peak <- 400e12 # hypothetical accelerator
            utilization <- 0.40
            cluster <- 512
            gpu_hours <- flops / (peak * utilization) / 3600
            cat(sprintf("training compute ~6 x params x tokens = %.2e FLOPs\n", flops))
            cat(sprintf("at a hypothetical 400 TFLOP/s peak and 40%% utilization: %s accelerator-hours, %.1f days on %d\n",
                        formatC(gpu_hours, format = "f", digits = 0, big.mark = ","), gpu_hours / cluster / 24, as.integer(cluster)))
          `,
        },
        expectedOutput: code`
        full batch of 8: grad_w -19.4125, grad_b -6.8750
        4 micro-batches of 2, accumulated / 4: grad_w -19.4125, grad_b -6.8750, same as full batch: yes
        2 data-parallel workers, all-reduce mean: grad_w -19.4125, same as full batch: yes
        forgot to divide by the number of micro-batches: grad_w is 4.00x too large
        mixed-precision Adam needs 16 bytes per parameter: 112 GB for 7B parameters before activations
        ZeRO-1 (shard optimizer states) on 8 GPUs: 38.50 GB per GPU
        ZeRO-2 (+ shard gradients) on 8 GPUs: 26.25 GB per GPU
        ZeRO-3 (+ shard weights) on 8 GPUs: 14.00 GB per GPU
        training compute ~6 x params x tokens = 4.20e+22 FLOPs
        at a hypothetical 400 TFLOP/s peak and 40% utilization: 72,917 accelerator-hours, 5.9 days on 512
      `,
        tests: {
          python: code`
            def test_accumulation_matches_full_batch():
                assert same(acc, full) == "yes"


            def test_zero3_divides_model_states_by_gpu_count():
                assert abs(params * (2 + 2 + 12) / gpus - params * 16 / 8) < 1e-3


            def test_uneven_micro_batches_need_weighting():
                parts = [grad(X[:3], Y[:3], w, b), grad(X[3:], Y[3:], w, b)]
                naive = (parts[0][0] + parts[1][0]) / 2
                weighted = (3 * parts[0][0] + 5 * parts[1][0]) / 8
                assert abs(weighted - full[0]) < 1e-12 and abs(naive - full[0]) > 1e-6
          `,
          r: code`
            test_that("accumulation matches the full batch", {
              expect_equal(acc, full, tolerance = 1e-12)
            })

            test_that("forgetting to divide gives a 4x gradient", {
              expect_equal(4 * acc[1] / full[1], 4)
            })
          `,
        },
        eli5Trace: [
          "Grading all 8 sheets at once gives a 'fix it' arrow of about −19.4.",
          "Grading 2 sheets at a time and averaging the four small arrows gives exactly the same arrow.",
          "Two friends grading 4 sheets each and averaging also give the same arrow.",
          "Forget to average and the arrow is 4 times too long, so the model overshoots.",
          "Each of the 7 billion numbers needs 16 bytes of backpack space while training: 112 GB. Shared across 8 backpacks it is 14 GB each.",
        ],
        complexity: { time: "O(n) per gradient; communication O(model size) per step", space: "16 bytes × parameters for mixed-precision Adam, divided by devices when sharded" },
        edgeCases: [
          "Micro-batches of unequal size must be weighted by their size, not averaged equally (the third test shows the difference).",
          "Padding tokens should not count toward the loss denominator in language models.",
          "Activation memory grows with batch × sequence length × hidden size × layers and is not in the 16-byte figure.",
          "Optimizers like Adam are nearly scale-invariant, so a gradient scaling bug may hide until clipping or weight decay interacts with it.",
        ],
        incorrect: {
          language: "python",
          code: code`
            for micro in micro_batches:
                loss = loss_fn(model(micro.x), micro.y)
                loss.backward()  # gradients add up across micro-batches
            optimizer.step()
          `,
          whyWrong: "backward() adds into the existing gradients, so after 4 micro-batches the gradient is the sum of 4 means, 4 times the large-batch mean. The model trains as if the learning rate were 4 times higher.",
          fix: "Divide each micro-batch loss by the number of accumulation steps before backward(), or weight by tokens when micro-batches have different sizes, and call optimizer.zero_grad() after each step.",
        },
        walkthrough: [
          { python: "def grad(xs, ys, w, b):", pythonLines: 7, r: "grad <- function(xs, ys, w, b) {", rLines: 10, eli5: "Work out the 'fix it' arrow for a pile of points: how far each guess is off, averaged over the pile." },
          { python: "acc = [0.0, 0.0]", pythonLines: 6, r: "acc <- c(0, 0)", rLines: 6, eli5: "Do 4 small piles of 2 and add a quarter of each arrow. It lands exactly on the big-pile arrow." },
          { python: "workers = [", pythonLines: 3, r: "workers <- list(", rLines: 3, eli5: "Two friends each take half and average their arrows. Same answer again." },
          { python: "per_param = {", pythonLines: 5, r: "per_param <- c(", rLines: 3, eli5: "Count backpack space per number during training: 2 + 2 + 4 + 4 + 4 = 16 bytes." },
          { python: "stages = [", pythonLines: 5, r: "stages <- c(", rLines: 8, eli5: "Share more and more of the heavy notebooks across 8 friends, and each backpack gets lighter." },
          { python: "flops = 6 * params * tokens", pythonLines: 5, r: "flops <- 6 * params * tokens", rLines: 8, eli5: "Count the sums needed to learn from a trillion words, then divide by how fast the pretend machines work to get hours and days." },
        ],
      },
      flow: {
        title: "One optimizer step across devices",
        nodes: [
          node("batch", "Global batch", 0, 120, "micro × steps × replicas"),
          node("micro", "Micro-batches", 220, 120, "fit in memory"),
          node("fb", "Forward and backward", 440, 120, "loss / steps"),
          node("acc", "Accumulate", 660, 40, "sum scaled gradients"),
          node("reduce", "All-reduce", 660, 200, "average across replicas"),
          node("step", "Sharded optimizer step", 880, 120, "ZeRO / FSDP"),
        ],
        edges: [edge("batch", "micro"), edge("micro", "fb"), edge("fb", "acc"), edge("acc", "reduce"), edge("reduce", "step")],
        steps: [
          step("batch micro", "batch-micro", "The global batch is split across replicas and then into micro-batches that fit in device memory."),
          step("micro fb", "micro-fb", "Each micro-batch runs forward and backward with its loss divided by the number of accumulation steps."),
          step("fb acc", "fb-acc", "Gradients add up in place until the last micro-batch."),
          step("acc reduce", "acc-reduce", "Replicas average their gradients with an all-reduce, so every replica sees the global-batch gradient."),
          step("reduce step", "reduce-step", "Each device updates only its shard of the optimizer state, then weights are gathered for the next step."),
        ],
      },
      practice: [
        {
          id: "w09-scale-recall-1",
          type: "recall",
          prompt: "What is the effective batch size with a micro-batch of 4, 8 accumulation steps and 16 data-parallel GPUs?",
          answer: "4 × 8 × 16 = 512 examples per optimizer step.",
          rubric: ["Multiply all three", "512"],
        },
        {
          id: "w09-scale-case-1",
          type: "case",
          prompt: "Full fine-tuning a 13B model runs out of memory on 8 GPUs with 80 GB each using plain data parallelism. What are your options?",
          answer: "Model states alone are about 13B × 16 bytes = 208 GB per replica, so plain DDP cannot fit. Shard with FSDP or ZeRO-3 (about 26 GB per GPU for states), add activation checkpointing, lower the micro-batch and use accumulation, or switch to parameter-efficient fine-tuning (LoRA, QLoRA) so optimizer state covers only small adapters. CPU offload is a last resort because it is slow.",
          rubric: ["Compute 16 bytes per parameter", "Sharding", "Activation checkpointing", "LoRA or QLoRA"],
        },
        {
          id: "w09-scale-recall-2",
          type: "recall",
          prompt: "Why is bf16 usually preferred over fp16 for training large models?",
          answer: "bf16 keeps fp32's 8-bit exponent, so it has the same dynamic range and rarely overflows, and it does not need loss scaling. It has fewer mantissa bits, so master weights and some reductions stay in fp32.",
          rubric: ["Same exponent range as fp32", "No loss scaling", "Lower precision mantissa"],
        },
      ],
      references: [
        { title: "PyTorch documentation: FullyShardedDataParallel", url: "https://pytorch.org/docs/stable/fsdp.html", versionSensitive: true },
        { title: "DeepSpeed tutorial: Zero Redundancy Optimizer", url: "https://www.deepspeed.ai/tutorials/zero/", versionSensitive: true },
        { title: "ZeRO: Memory Optimizations Toward Training Trillion Parameter Models (Rajbhandari et al., 2020)", versionSensitive: false },
        { title: "Scaling Laws for Neural Language Models (Kaplan et al., 2020)", versionSensitive: false },
      ],
      lastReviewed: REVIEWED,
    }),
  ],
};
