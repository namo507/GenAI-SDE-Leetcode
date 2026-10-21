import { REVIEWED, code, defineTopic, edge, node, step } from "../helpers";
import type { ExtraWeek } from "./types";

/** Cloud prices in this week are hypothetical by design: real prices differ by provider, region and date. */
export const w12: ExtraWeek = {
  schedule: [
    {
      dayId: "w12-d01",
      topicId: "w12-d01-cloud-fundamentals",
      tasks: [
        { label: "Cloud fundamentals: regions, zones, availability and pricing models", minutes: 30 },
        { label: "Compose availability and pick a purchase mix", minutes: 15 },
      ],
    },
    {
      dayId: "w12-d02",
      topicId: "w12-d02-containers-kubernetes",
      tasks: [
        { label: "Containers and Kubernetes: requests, scheduling, autoscaling", minutes: 30 },
        { label: "Bin-pack pods and trace the autoscaler", minutes: 15 },
      ],
    },
    {
      dayId: "w12-d03",
      topicId: "w12-d03-cloud-networking-iam",
      tasks: [
        { label: "IAM policy evaluation, VPCs and CIDR blocks", minutes: 30 },
        { label: "Least-privilege policy prompt", minutes: 15 },
      ],
    },
    {
      dayId: "w12-d04",
      topicId: "w12-d04-iac-cost",
      tasks: [
        { label: "Infrastructure as code: plan, drift, policy and cost", minutes: 30 },
        { label: "Review a plan before apply", minutes: 15 },
      ],
    },
    {
      dayId: "w12-d05",
      topicId: "w12-d05-managed-ai-services",
      tasks: [
        { label: "Managed AI services versus self-hosting: cost and control", minutes: 30 },
        { label: "Break-even and routing exercise", minutes: 15 },
      ],
    },
  ],
  topics: [
    defineTopic({
      id: "w12-d01-cloud-fundamentals",
      slug: "cloud-fundamentals",
      title: "Cloud fundamentals: regions, availability and pricing",
      domain: "cloud",
      roles: ["sde", "ml-engineer", "genai-engineer", "data-engineer", "data-scientist", "data-analyst"],
      difficulty: "beginner",
      minutes: 45,
      prerequisites: ["w10-d01-estimation-api-design"],
      objectives: [
        "Explain regions, availability zones and the shared responsibility model",
        "Compose availability for components in series and in parallel and convert it to downtime",
        "Choose a mix of on-demand, committed and spot capacity for a workload with a daily peak",
      ],
      summary:
        "Cloud providers rent compute, storage and managed services by the hour or request. A region is a geographic area made of several isolated availability zones; spreading copies across zones survives a zone failure. Availability multiplies along a chain of dependencies, so the weakest component dominates. Cost depends as much on how you buy (on-demand, commitments, spot) as on what you run.",
      eli5: {
        analogy:
          "A city with several power stations. If your lamp is plugged into one station and it fails, you are in the dark. Plug two lamps into two different stations and you almost never are. But if both lamps share one extension cord, that cord is now the weak spot.",
        steps: [
          "Things in a chain all have to work, so their chances multiply and get smaller.",
          "Copies side by side only fail if all of them fail at once, so their chance of working goes up.",
          "Pay a lower price for machines you promise to use all the time.",
          "Use cheap 'leftover' machines for extra work that can be restarted.",
        ],
        analogyLimit:
          "Real failures are not independent: a bad deploy or a regional outage can take down every copy at once, so the parallel formula is an upper bound.",
      },
      senior: {
        definition:
          "Cloud computing delivers on-demand infrastructure (IaaS), platforms (PaaS) and software (SaaS) with metered billing. Regions contain multiple availability zones with independent power and networking. Under the shared responsibility model the provider secures the underlying infrastructure, while the customer is responsible for configuration, identity, data and code.",
        invariants: [
          "Serial availability is the product of component availabilities.",
          "Parallel availability is 1 − Π(1 − aᵢ), valid only if failures are independent.",
          "Committed capacity is paid whether or not it is used, so commit only to the steady baseline.",
        ],
        mechanism: [
          "A single-zone design (99.99% load balancer, 99.5% app, 99.9% database) gives 99.3906%: about 263 minutes of downtime a month.",
          "Two app copies in two zones plus a multi-zone database give 99.9375%, about 27 minutes a month.",
          "A third app copy only reaches 99.9400%, because the database (99.95%) now dominates the chain.",
          "With hypothetical prices, committing to the baseline and running the daily peak on spot costs USD 2,332.80 a month versus USD 4,320.00 all on-demand and USD 5,400.00 committing to the peak.",
        ],
        complexity:
          "Availability math is O(components). Cost models are linear in instance-hours by purchase type, plus storage, requests and data transfer.",
        tradeoffs: [
          { option: "On-demand", choose: "Unpredictable or short-lived workloads.", cost: "Highest unit price." },
          { option: "Commitments (reserved capacity, savings plans)", choose: "Steady 24/7 baseline load.", cost: "Paid even when idle; locked to a term." },
          { option: "Spot or preemptible", choose: "Batch, CI, training with checkpoints, stateless peaks.", cost: "Can be reclaimed at short notice; needs retries and fallbacks." },
          { option: "Multi-region", choose: "Strict availability or data-residency needs.", cost: "Data replication, consistency and cost roughly double." },
        ],
        failureModes: [
          "Counting zone redundancy as protection against regional outages or bad deploys.",
          "Putting every replica in one zone because it was the default.",
          "Ignoring data transfer (egress, cross-zone) costs, which can exceed compute for chatty systems.",
          "Running critical stateful services on spot capacity without fallbacks.",
        ],
        production:
          "Teams set availability targets per service, spread replicas across zones, use managed databases with standby replicas, tag every resource with owner and cost center, and review cost dashboards monthly. Commitment coverage is sized to the observed baseline and revisited as traffic changes. Provider prices and discount programs change often, so always check the current pricing pages.",
        interviewAnswer:
          "I start from the availability target, compose it through the dependency chain (multiply in series, 1 minus the product of failure rates in parallel), and put redundancy where the weakest link is, usually across zones. For cost, I commit to the steady baseline, run predictable peaks on demand or spot with fallbacks, and watch data transfer, which is easy to miss.",
      },
      implementation: {
        problem: "Compute availability and monthly downtime for three designs, then the monthly cost of four purchase mixes for a workload with a daily peak.",
        input: "Component availabilities from 99.5% to 99.99%; 10 instances all month plus 20 for 6 hours a day; hypothetical prices USD 0.40 on-demand, 0.25 committed, 0.12 spot per hour",
        python: {
          code: code`
            MONTH_MIN = 30 * 24 * 60
            HOURS = 30 * 24


            def serial(*parts):
                total = 1.0
                for a in parts:
                    total *= a
                return total


            def parallel(a, copies):
                return 1 - (1 - a) ** copies  # assumes failures are independent


            designs = {
                "single zone": serial(0.9999, 0.995, 0.999),
                "two zones": serial(0.9999, parallel(0.995, 2), 0.9995),
                "two zones, 3 app copies": serial(0.9999, parallel(0.995, 3), 0.9995),
            }
            for name, a in designs.items():
                print(f"{name:24s} availability {100 * a:.4f}%  downtime {(1 - a) * MONTH_MIN:6.1f} min/month")

            # Hypothetical hourly prices for one instance size; real prices vary by provider, region and date.
            ON_DEMAND, COMMITTED, SPOT = 0.40, 0.25, 0.12
            baseline_hours = 10 * HOURS          # 10 instances all month
            peak_hours = 20 * 6 * 30             # 20 more instances for 6 hours a day
            spot_fallback = 0.10                 # share of spot hours lost to interruptions and rerun on demand
            plans = {
                "all on-demand": (baseline_hours + peak_hours) * ON_DEMAND,
                "commit to the peak (30)": 30 * HOURS * COMMITTED,
                "commit baseline + on-demand peak": baseline_hours * COMMITTED + peak_hours * ON_DEMAND,
                "commit baseline + spot peak": baseline_hours * COMMITTED + peak_hours * ((1 - spot_fallback) * SPOT + spot_fallback * ON_DEMAND),
            }
            cheapest = min(plans, key=plans.get)
            for name, cost in plans.items():
                print(f"{name:34s} USD {cost:8.2f} per month{'  <- cheapest' if name == cheapest else ''}")
          `,
        },
        r: {
          code: code`
            month_min <- 30 * 24 * 60
            hours <- 30 * 24

            serial <- function(...) {
              total <- 1
              for (a in c(...)) total <- total * a
              total
            }

            parallel <- function(a, copies) 1 - (1 - a)^copies # assumes failures are independent

            designs <- c(
              "single zone" = serial(0.9999, 0.995, 0.999),
              "two zones" = serial(0.9999, parallel(0.995, 2), 0.9995),
              "two zones, 3 app copies" = serial(0.9999, parallel(0.995, 3), 0.9995)
            )
            for (name in names(designs)) {
              a <- designs[[name]]
              cat(sprintf("%-24s availability %.4f%%  downtime %6.1f min/month\n", name, 100 * a, (1 - a) * month_min))
            }

            # Hypothetical hourly prices for one instance size; real prices vary by provider, region and date.
            on_demand <- 0.40
            committed <- 0.25
            spot <- 0.12
            baseline_hours <- 10 * hours # 10 instances all month
            peak_hours <- 20 * 6 * 30 # 20 more instances for 6 hours a day
            spot_fallback <- 0.10 # share of spot hours lost to interruptions and rerun on demand
            plans <- c(
              "all on-demand" = (baseline_hours + peak_hours) * on_demand,
              "commit to the peak (30)" = 30 * hours * committed,
              "commit baseline + on-demand peak" = baseline_hours * committed + peak_hours * on_demand,
              "commit baseline + spot peak" = baseline_hours * committed + peak_hours * ((1 - spot_fallback) * spot + spot_fallback * on_demand)
            )
            cheapest <- names(plans)[which.min(plans)]
            for (name in names(plans)) {
              cat(sprintf("%-34s USD %8.2f per month%s\n", name, plans[[name]], if (name == cheapest) "  <- cheapest" else ""))
            }
          `,
        },
        expectedOutput: code`
        single zone              availability 99.3906%  downtime  263.3 min/month
        two zones                availability 99.9375%  downtime   27.0 min/month
        two zones, 3 app copies  availability 99.9400%  downtime   25.9 min/month
        all on-demand                      USD  4320.00 per month
        commit to the peak (30)            USD  5400.00 per month
        commit baseline + on-demand peak   USD  3240.00 per month
        commit baseline + spot peak        USD  2332.80 per month  <- cheapest
      `,
        tests: {
          python: code`
            def test_parallel_copies_beat_one():
                assert parallel(0.99, 2) > 0.99 and abs(parallel(0.99, 2) - 0.9999) < 1e-12


            def test_serial_chain_is_weaker_than_its_weakest_link():
                assert serial(0.999, 0.99) < 0.99


            def test_committing_to_the_peak_wastes_money():
                assert plans["commit to the peak (30)"] > plans["all on-demand"]
          `,
          r: code`
            test_that("parallel copies beat one", {
              expect_equal(parallel(0.99, 2), 0.9999, tolerance = 1e-12)
            })

            test_that("a chain is weaker than its weakest link", {
              expect_lt(serial(0.999, 0.99), 0.99)
            })
          `,
        },
        eli5Trace: [
          "Everything in one power station: the lights are off for about 263 minutes a month.",
          "Two lamps on two stations and a sturdier database: only about 27 minutes.",
          "A third lamp barely helps, because the database is now the weak spot.",
          "Promising to rent 10 machines all month and borrowing cheap leftover machines for the busy hours is the cheapest plan.",
        ],
        complexity: { time: "O(components + plans)", space: "O(1)" },
        edgeCases: [
          "Correlated failures (shared dependency, bad deploy) make parallel availability far lower than the formula.",
          "Maintenance windows and planned downtime may or may not count against an SLA; read the definition.",
          "Spot interruption rates vary by instance type and time; measure rather than assume 10%.",
          "Committed discounts may apply across instance families or only to one; terms differ by provider.",
        ],
        incorrect: {
          language: "python",
          code: code`
            availability = min(0.9999, 0.995, 0.999)  # "as good as the weakest part"
          `,
          whyWrong: "Components in series must all work, so their availabilities multiply. The minimum overstates the result: 99.5% versus the true 99.39%, which is about 47 more minutes of downtime a month.",
          fix: "Multiply availabilities for components in series, and use 1 − Π(1 − a) only for truly independent redundant copies.",
        },
        walkthrough: [
          { python: "def serial(*parts):", pythonLines: 5, r: "serial <- function(...) {", rLines: 5, eli5: "Things in a chain: multiply their chances of working." },
          { python: "def parallel(a, copies):", pythonLines: 2, r: "parallel <- function(a, copies)", eli5: "Copies side by side: everything fails only if every copy fails, so take 1 minus the chance they all fail." },
          { python: "designs = {", pythonLines: 7, r: "designs <- c(", rLines: 9, eli5: "Try three designs and turn each into minutes of darkness per month." },
          { python: "# Hypothetical hourly prices", pythonLines: 5, r: "# Hypothetical hourly prices", rLines: 7, eli5: "Pretend prices for three ways to rent a machine, and a workload with a busy six hours every day." },
          { python: "plans = {", pythonLines: 9, r: "plans <- c(", rLines: 10, eli5: "Add up four ways to buy the same work and point at the cheapest one." },
        ],
      },
      flow: {
        title: "A request path across zones",
        nodes: [
          node("user", "Users", 0, 120, "internet"),
          node("lb", "Load balancer", 220, 120, "regional, 99.99%"),
          node("app1", "App, zone A", 450, 40, "99.5%"),
          node("app2", "App, zone B", 450, 200, "99.5%"),
          node("db", "Database", 690, 120, "primary + standby"),
        ],
        edges: [edge("user", "lb"), edge("lb", "app1"), edge("lb", "app2"), edge("app1", "db"), edge("app2", "db")],
        steps: [
          step("user lb", "user-lb", "Every request passes through the load balancer, so its availability multiplies into everything."),
          step("lb app1 app2", "lb-app1 lb-app2", "Two app copies in different zones fail together only if both zones fail: 1 − 0.005² ≈ 99.9975%."),
          step("app1 app2 db", "app1-db app2-db", "The database is in series with everything, so at 99.95% it becomes the limit."),
          step("db", "", "The fix for the next nine is at the weakest serial link, not more app copies."),
        ],
      },
      practice: [
        {
          id: "w12-cloud-recall-1",
          type: "recall",
          prompt: "Under the shared responsibility model, name two things the customer is always responsible for.",
          answer: "Identity and access configuration (who can do what) and their data and its protection (encryption settings, backups, classification), plus their application code and resource configuration such as public exposure.",
          rubric: ["IAM", "Data", "Configuration or code"],
        },
        {
          id: "w12-cloud-case-1",
          type: "case",
          prompt: "Your monthly cloud bill doubled while traffic stayed flat. Where do you look first?",
          answer: "Cost explorer grouped by service and tag to find the line that grew: often data transfer (a new cross-zone or cross-region path), storage growth without lifecycle rules, forgotten resources from experiments, logging volume, or autoscaling stuck at maximum. Then add budgets and alerts by team tag.",
          rubric: ["Group by service and tag", "Data transfer", "Orphaned resources", "Budgets and alerts"],
        },
        {
          id: "w12-cloud-recall-2",
          type: "recall",
          prompt: "How many minutes of downtime per 30-day month does 99.9% availability allow?",
          answer: "0.1% of 43,200 minutes, which is 43.2 minutes.",
          rubric: ["43,200 minutes", "43.2"],
        },
      ],
      references: [
        { title: "AWS Well-Architected Framework", url: "https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html", versionSensitive: true },
        { title: "Google Cloud Architecture Framework", url: "https://cloud.google.com/architecture/framework", versionSensitive: true },
      ],
      lastReviewed: REVIEWED,
    }),

    defineTopic({
      id: "w12-d02-containers-kubernetes",
      slug: "containers-kubernetes",
      title: "Containers and Kubernetes: scheduling and autoscaling",
      domain: "cloud",
      roles: ["sde", "ml-engineer", "genai-engineer", "data-engineer"],
      difficulty: "intermediate",
      minutes: 50,
      prerequisites: ["w12-d01-cloud-fundamentals"],
      objectives: [
        "Explain images, containers, pods, deployments and services",
        "Pack pods onto nodes by resource requests and see why ordering matters",
        "Trace the Horizontal Pod Autoscaler formula through a traffic spike and recovery",
      ],
      summary:
        "A container packages an application with its dependencies so it runs the same everywhere. Kubernetes runs containers in pods across a cluster of nodes, places them using their CPU and memory requests, restarts failed ones, and scales replicas with the Horizontal Pod Autoscaler (HPA), which aims to keep average utilization near a target.",
      eli5: {
        analogy:
          "Shipping containers on cargo ships. Every box has a label saying how heavy and big it is (requests), and the port manager fits boxes onto ships without overloading any ship. When more cargo arrives, the manager calls in more boxes of the same kind, and sends some home when it is quiet.",
        steps: [
          "Pack the app and everything it needs into a box (container image).",
          "Label each box with how much space it needs.",
          "Fit boxes onto ships: big boxes first leaves fewer awkward gaps.",
          "Watch how busy the boxes are and add or remove copies to stay near the target.",
        ],
        analogyLimit:
          "Real pods can use more than their request (up to a limit) and can be evicted when a node runs short of memory, so labels and reality can disagree.",
      },
      senior: {
        definition:
          "Kubernetes is a container orchestrator. A Deployment declares the desired replicas of a pod template; the scheduler binds each pod to a node whose allocatable CPU and memory cover the pod's requests; a Service gives pods a stable virtual address; the HPA adjusts replicas from metrics. Limits cap usage: exceeding the memory limit kills the container, while CPU is throttled.",
        invariants: [
          "The scheduler places pods by requests, not by actual usage.",
          "HPA desired replicas = ceil(current replicas × current metric / target), skipped when the ratio is within a tolerance (0.1 by default).",
          "Replicas stay between the configured minimum and maximum.",
        ],
        mechanism: [
          "Pods arriving smallest first need 4 nodes of 4 CPU and 16 GiB; sorting largest first (first-fit decreasing) fits the same 13 pods into 3 full-CPU nodes.",
          "Demand of 1,500 millicores on 3 pods requesting 500 each is 100% of requests, so the HPA scales to ceil(3 × 100 / 60) = 5.",
          "At 72% on 5 pods it scales to 6; at 60% it holds; as demand falls to 40% and 30% it scales down to 4 and then the minimum of 2.",
          "Real HPAs also apply a scale-down stabilization window (5 minutes by default) so replicas do not flap; this simulation omits it to keep the arithmetic visible.",
        ],
        complexity:
          "First-fit decreasing is O(pods × nodes) and uses at most about 11/9 of the optimal number of bins plus a constant; exact bin packing is NP-hard.",
        tradeoffs: [
          { option: "Kubernetes", choose: "Many services, teams and environments needing a common platform.", cost: "Operational complexity; needs platform engineering." },
          { option: "Serverless containers (Cloud Run, Fargate, Container Apps)", choose: "Stateless services that should scale to zero with little ops.", cost: "Less control over networking, GPUs and long-running work; cold starts." },
          { option: "Functions (Lambda, Cloud Functions)", choose: "Event-driven glue and spiky low-volume tasks.", cost: "Execution time limits, cold starts, vendor-specific packaging." },
        ],
        failureModes: [
          "No resource requests, so the scheduler overpacks nodes and pods get evicted under pressure.",
          "Memory limits below real peak usage, causing OOMKilled restarts.",
          "Autoscaling on CPU for a service bound by I/O or a queue; scale on queue depth or latency instead.",
          "Liveness probes that fail during slow startup, causing restart loops; use startup probes.",
        ],
        production:
          "Teams build small images with pinned base versions, scan them for vulnerabilities, deploy with rolling updates or canaries, set requests from observed usage, use the cluster autoscaler to add nodes when pods are pending, and run GPU workloads on dedicated node pools with taints so only GPU pods land there.",
        interviewAnswer:
          "Containers package the app; Kubernetes schedules pods by their CPU and memory requests, keeps the declared replica count, and exposes them through Services. I set requests from measured usage, limits to protect neighbors, and readiness and startup probes. The HPA computes ceil(replicas × current / target utilization) with a tolerance and a stabilization window, and the cluster autoscaler adds nodes when pods cannot be placed.",
      },
      implementation: {
        problem: "Bin-pack 13 pods onto 4-CPU, 16-GiB nodes in arrival order and with first-fit decreasing, then trace the HPA over 7 minutes of changing demand.",
        input: "6 api (500m, 1 GiB), 3 worker (1500m, 4 GiB), 2 model (2000m, 8 GiB), 2 cron (250m, 512 MiB); HPA target 60% of a 500m request, 2 to 10 replicas",
        python: {
          code: code`
            from math import ceil

            NODE_CPU, NODE_MEM = 4000, 16384  # millicores and MiB per node
            PODS = [("api", 500, 1024)] * 6 + [("worker", 1500, 4096)] * 3 + [("model", 2000, 8192)] * 2 + [("cron", 250, 512)] * 2


            def pack(pods):
                nodes = []  # each node: [cpu_used, mem_used, names]
                for name, cpu, mem in pods:
                    for n in nodes:
                        if n[0] + cpu <= NODE_CPU and n[1] + mem <= NODE_MEM:
                            n[0] += cpu
                            n[1] += mem
                            n[2].append(name)
                            break
                    else:
                        nodes.append([cpu, mem, [name]])
                return nodes


            def describe(nodes):
                for i, (cpu, mem, names) in enumerate(nodes, start=1):
                    counts = {}
                    for name in names:
                        counts[name] = counts.get(name, 0) + 1
                    pods = ", ".join(f"{k} x{v}" for k, v in counts.items())
                    print(f"  node {i}: CPU {cpu:4d}/{NODE_CPU}m  memory {mem:5d}/{NODE_MEM} MiB  [{pods}]")


            arrival = pack(sorted(PODS, key=lambda p: (p[1], p[2], p[0])))  # pods arrive smallest first
            print(f"first fit in arrival order: {len(arrival)} nodes")
            ffd = pack(sorted(PODS, key=lambda p: (-p[1], -p[2], p[0])))
            print(f"first fit decreasing: {len(ffd)} nodes")
            describe(ffd)

            REQUEST, TARGET, TOLERANCE, MIN_R, MAX_R = 500, 60, 0.1, 2, 10
            replicas = 3
            for minute, demand in enumerate([900, 1500, 1800, 1800, 1200, 600, 600]):
                capacity = replicas * REQUEST
                util = 100 * demand / capacity
                if abs(util / TARGET - 1) <= TOLERANCE:
                    action, new = "hold", replicas
                else:
                    new = min(MAX_R, max(MIN_R, ceil(100 * demand / (TARGET * REQUEST))))
                    action = "scale up" if new > replicas else "scale down"
                print(f"minute {minute}: demand {demand:4d}m on {replicas} pods = {util:5.1f}% of requests -> {action} to {new}")
                replicas = new
          `,
        },
        r: {
          code: code`
            node_cpu <- 4000 # millicores per node
            node_mem <- 16384 # MiB per node
            pods <- data.frame(
              name = c(rep("api", 6), rep("worker", 3), rep("model", 2), rep("cron", 2)),
              cpu = c(rep(500, 6), rep(1500, 3), rep(2000, 2), rep(250, 2)),
              mem = c(rep(1024, 6), rep(4096, 3), rep(8192, 2), rep(512, 2))
            )

            pack <- function(pods) {
              nodes <- list() # each node: cpu used, memory used, pod names
              for (i in seq_len(nrow(pods))) {
                placed <- FALSE
                for (j in seq_along(nodes)) {
                  if (nodes[[j]]$cpu + pods$cpu[i] <= node_cpu && nodes[[j]]$mem + pods$mem[i] <= node_mem) {
                    nodes[[j]]$cpu <- nodes[[j]]$cpu + pods$cpu[i]
                    nodes[[j]]$mem <- nodes[[j]]$mem + pods$mem[i]
                    nodes[[j]]$names <- c(nodes[[j]]$names, pods$name[i])
                    placed <- TRUE
                    break
                  }
                }
                if (!placed) nodes[[length(nodes) + 1]] <- list(cpu = pods$cpu[i], mem = pods$mem[i], names = pods$name[i])
              }
              nodes
            }

            describe <- function(nodes) {
              for (i in seq_along(nodes)) {
                n <- nodes[[i]]
                kinds <- unique(n$names)
                counts <- paste(sprintf("%s x%d", kinds, vapply(kinds, function(k) sum(n$names == k), integer(1))), collapse = ", ")
                cat(sprintf("  node %d: CPU %4d/%dm  memory %5d/%d MiB  [%s]\n", i, as.integer(n$cpu), as.integer(node_cpu), as.integer(n$mem), as.integer(node_mem), counts))
              }
            }

            arrival <- pack(pods[order(pods$cpu, pods$mem, pods$name), ]) # pods arrive smallest first
            cat(sprintf("first fit in arrival order: %d nodes\n", length(arrival)))
            ffd <- pack(pods[order(-pods$cpu, -pods$mem, pods$name), ])
            cat(sprintf("first fit decreasing: %d nodes\n", length(ffd)))
            describe(ffd)

            request <- 500
            target <- 60
            tolerance <- 0.1
            min_r <- 2
            max_r <- 10
            replicas <- 3
            demands <- c(900, 1500, 1800, 1800, 1200, 600, 600)
            for (minute in seq_along(demands)) {
              demand <- demands[minute]
              util <- 100 * demand / (replicas * request)
              if (abs(util / target - 1) <= tolerance) {
                action <- "hold"
                new <- replicas
              } else {
                new <- min(max_r, max(min_r, ceiling(100 * demand / (target * request))))
                action <- if (new > replicas) "scale up" else "scale down"
              }
              cat(sprintf("minute %d: demand %4dm on %d pods = %5.1f%% of requests -> %s to %d\n",
                          minute - 1L, as.integer(demand), as.integer(replicas), util, action, as.integer(new)))
              replicas <- new
            }
          `,
        },
        expectedOutput: code`
        first fit in arrival order: 4 nodes
        first fit decreasing: 3 nodes
          node 1: CPU 4000/4000m  memory 16384/16384 MiB  [model x2]
          node 2: CPU 4000/4000m  memory 10240/16384 MiB  [worker x2, api x2]
          node 3: CPU 4000/4000m  memory  9216/16384 MiB  [worker x1, api x4, cron x2]
        minute 0: demand  900m on 3 pods =  60.0% of requests -> hold to 3
        minute 1: demand 1500m on 3 pods = 100.0% of requests -> scale up to 5
        minute 2: demand 1800m on 5 pods =  72.0% of requests -> scale up to 6
        minute 3: demand 1800m on 6 pods =  60.0% of requests -> hold to 6
        minute 4: demand 1200m on 6 pods =  40.0% of requests -> scale down to 4
        minute 5: demand  600m on 4 pods =  30.0% of requests -> scale down to 2
        minute 6: demand  600m on 2 pods =  60.0% of requests -> hold to 2
      `,
        tests: {
          python: code`
            def test_no_node_is_overcommitted():
                for cpu, mem, _ in ffd:
                    assert cpu <= NODE_CPU and mem <= NODE_MEM


            def test_every_pod_is_placed_once():
                assert sum(len(names) for _, _, names in ffd) == len(PODS)


            def test_hpa_formula():
                assert ceil(3 * 100 / 60) == 5 and ceil(5 * 72 / 60) == 6
          `,
          r: code`
            test_that("no node is overcommitted", {
              for (n in ffd) {
                expect_lte(n$cpu, node_cpu)
                expect_lte(n$mem, node_mem)
              }
            })

            test_that("every pod is placed once", {
              expect_equal(sum(vapply(ffd, function(n) length(n$names), integer(1))), nrow(pods))
            })
          `,
        },
        eli5Trace: [
          "Loading small boxes first leaves awkward gaps, so we need 4 ships.",
          "Loading the biggest boxes first fills 3 ships exactly.",
          "Traffic jumps to 100% of what 3 copies asked for, so the manager calls in 5 copies.",
          "Still a bit busy at 72%, so 6 copies; then it is just right at 60%.",
          "When it gets quiet the manager sends copies home, but always keeps at least 2.",
        ],
        complexity: { time: "Packing O(pods × nodes); HPA O(1) per decision", space: "O(nodes)" },
        edgeCases: [
          "A pod larger than any node can never be scheduled and stays Pending.",
          "Memory can be the binding constraint even when CPU is free (node 1 here is full on both).",
          "Missing metrics make the HPA skip scaling rather than guess.",
          "Scaling to zero needs an event-driven autoscaler such as KEDA; the HPA minimum is 1 or more.",
        ],
        incorrect: {
          language: "python",
          code: code`
            desired = current_replicas + 1 if cpu_utilization > target else current_replicas - 1
          `,
          whyWrong: "Stepping by one replica reacts far too slowly to a spike (it would need many intervals to go from 3 to 6) and oscillates around the target.",
          fix: "Scale proportionally: ceil(current × utilization / target), skip changes within a tolerance, clamp to min and max, and stabilize scale-down decisions over a window.",
        },
        walkthrough: [
          { python: "def pack(pods):", pythonLines: 12, r: "pack <- function(pods) {", rLines: 17, eli5: "Put each box on the first ship with enough room for both its CPU and memory; if none has room, bring a new ship." },
          { python: "def describe(nodes):", pythonLines: 7, r: "describe <- function(nodes) {", rLines: 8, eli5: "Print what ended up on each ship and how full it is." },
          { python: "arrival = pack(", pythonLines: 5, r: "arrival <- pack(", rLines: 5, eli5: "Load the same boxes twice: smallest first, then biggest first. Biggest first needs one ship fewer." },
          { python: "for minute, demand in enumerate(", pythonLines: 10, r: "for (minute in seq_along(demands)) {", rLines: 14, eli5: "Each minute, check how busy the copies are compared to the 60% target, and call in or send home copies to match." },
        ],
      },
      flow: {
        title: "From image to scaled replicas",
        nodes: [
          node("image", "Container image", 0, 120, "app + dependencies"),
          node("deploy", "Deployment", 220, 120, "desired replicas"),
          node("sched", "Scheduler", 440, 40, "fits requests to nodes"),
          node("nodes", "Nodes", 660, 40, "CPU, memory, GPU"),
          node("metrics", "Metrics", 440, 210, "CPU, queue depth, latency"),
          node("hpa", "HPA", 660, 210, "ceil(r × current / target)"),
        ],
        edges: [edge("image", "deploy"), edge("deploy", "sched"), edge("sched", "nodes"), edge("nodes", "metrics"), edge("metrics", "hpa"), edge("hpa", "deploy")],
        steps: [
          step("image deploy", "image-deploy", "A Deployment declares which image to run and how many replicas."),
          step("deploy sched nodes", "deploy-sched sched-nodes", "The scheduler binds each pod to a node whose free allocatable resources cover its requests."),
          step("nodes metrics", "nodes-metrics", "Running pods report utilization relative to their requests."),
          step("metrics hpa deploy", "metrics-hpa hpa-deploy", "The HPA computes the desired replica count and updates the Deployment, closing the loop."),
        ],
      },
      practice: [
        {
          id: "w12-k8s-recall-1",
          type: "recall",
          prompt: "What is the difference between a resource request and a limit in Kubernetes?",
          answer: "The request is what the scheduler reserves and uses for placement and for HPA utilization. The limit is the most the container may use: over the memory limit it is killed (OOMKilled), over the CPU limit it is throttled.",
          rubric: ["Request for scheduling", "Limit caps usage", "Memory kill vs CPU throttle"],
        },
        {
          id: "w12-k8s-case-1",
          type: "case",
          prompt: "A model server pod restarts every few minutes with OOMKilled during traffic peaks. What do you do?",
          answer: "Check memory usage against the limit during peaks: raise the limit and request to the measured peak plus headroom, cap concurrency or batch size per pod, check for leaks, and scale out on a request-rate or queue metric before memory pressure builds.",
          rubric: ["Compare usage to limit", "Right-size request and limit", "Cap concurrency", "Scale on the right metric"],
        },
        {
          id: "w12-k8s-design-1",
          type: "design",
          prompt: "Design the deployment of a GPU inference service on Kubernetes that must handle 10x traffic spikes.",
          answer: "Dedicated GPU node pool with taints and tolerations, pods requesting one GPU each, readiness probes that pass only after the model is loaded, HPA on requests in flight or queue depth rather than CPU, cluster autoscaler for GPU nodes with a warm minimum because GPU nodes start slowly, request batching in the server, a queue to absorb spikes, and load shedding with 429 when the queue is full.",
          rubric: ["GPU node pool", "Readiness after model load", "Right scaling metric", "Warm capacity", "Queue and shedding"],
        },
      ],
      references: [
        { title: "Kubernetes documentation: Horizontal Pod Autoscaling", url: "https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/", versionSensitive: true },
        { title: "Kubernetes documentation: Resource management for pods and containers", url: "https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/", versionSensitive: true },
      ],
      lastReviewed: REVIEWED,
    }),

    defineTopic({
      id: "w12-d03-cloud-networking-iam",
      slug: "cloud-networking-iam",
      title: "Cloud identity, storage access and networking",
      domain: "cloud",
      roles: ["sde", "data-engineer", "ml-engineer", "genai-engineer"],
      difficulty: "intermediate",
      minutes: 45,
      prerequisites: ["w12-d01-cloud-fundamentals"],
      objectives: [
        "Evaluate IAM-style policies: explicit deny beats allow, and anything not allowed is denied",
        "Write least-privilege policies for object storage with wildcards",
        "Do CIDR arithmetic for VPCs and subnets and detect overlapping address ranges",
      ],
      summary:
        "Cloud security starts with identity: every call is checked against policies that allow or deny actions on resources. The rules are simple but strict: an explicit deny always wins, an allow is needed for anything to happen, and everything else is denied by default. Networks are private address ranges (VPCs) split into subnets written in CIDR notation.",
      eli5: {
        analogy:
          "A building pass. Your pass lists the rooms you may enter. A sign on a door that says 'nobody gets in here' beats your pass. And if a room is not on your pass at all, the door stays shut.",
        steps: [
          "Look for any rule that says 'no'. If one matches, the answer is no.",
          "Otherwise look for a rule that says 'yes'. If one matches, the answer is yes.",
          "If nothing matched, the answer is still no.",
          "Addresses on the private network are like house numbers on streets: a /24 street has 256 numbers.",
        ],
        analogyLimit:
          "Real clouds stack several kinds of rules (organization guardrails, resource policies, permission boundaries, session policies), and all of them must allow the action.",
      },
      senior: {
        definition:
          "Identity and access management evaluates a request (principal, action, resource, context) against identity-based and resource-based policies. In AWS's evaluation logic an explicit Deny in any applicable policy overrides any Allow, and a request with no matching Allow is implicitly denied. A VPC is an isolated virtual network with an IPv4 CIDR block divided into subnets, route tables, gateways and security rules.",
        invariants: [
          "Explicit deny > explicit allow > implicit deny.",
          "Action names are matched case-insensitively; resource ARNs case-sensitively.",
          "Address ranges of networks that must be connected (peering, VPN) must not overlap.",
        ],
        mechanism: [
          "GetObject on reports/2026/q3.csv is allowed by statement 1, but on reports/salaries/2026.csv statement 4's explicit deny wins.",
          "PutObject on reports is denied implicitly: nothing allows it. PutObject on scratch is allowed by s3:*.",
          "DeleteObject on scratch matches the allow in statement 2 and the deny in statement 3; the deny wins.",
          "10.20.0.0/16 holds 65,536 addresses: 256 subnets of /24, each with 251 usable addresses in AWS, which reserves 5 per subnet.",
        ],
        complexity:
          "Wildcard matching by dynamic programming is O(pattern length × text length) per pattern; CIDR checks are O(1) integer arithmetic.",
        tradeoffs: [
          { option: "Roles with short-lived credentials", choose: "Workloads and humans accessing cloud APIs.", cost: "Needs federation or workload identity setup." },
          { option: "Long-lived access keys", choose: "Almost never; legacy integrations only.", cost: "Leak risk; rotation burden." },
          { option: "Broad wildcards (s3:*)", choose: "Sandboxes and scratch buckets.", cost: "Grants actions you did not think of, including future ones." },
          { option: "Private endpoints to managed services", choose: "Data that must not traverse the public internet.", cost: "Per-endpoint cost and DNS configuration." },
        ],
        failureModes: [
          "Public buckets or wildcard principals exposing data.",
          "Access keys committed to repositories.",
          "Overlapping VPC CIDRs that block peering later and force a painful re-addressing.",
          "Subnets sized too small for autoscaling node groups that consume one IP per pod.",
        ],
        production:
          "Teams grant least privilege through roles, use workload identity for pods and CI, block public access at the account level, enable audit logging, review access with automated analyzers, plan non-overlapping address space across accounts and regions up front, and reach managed services through private endpoints.",
        interviewAnswer:
          "Every request is evaluated against all applicable policies: an explicit deny wins, otherwise an allow is required, and anything unmatched is denied. I give workloads roles with short-lived credentials and least-privilege policies scoped to specific actions and resource prefixes, add guardrail denies for sensitive data, and plan VPC CIDR ranges so networks that must connect never overlap.",
      },
      implementation: {
        problem: "Evaluate six API requests against a four-statement policy with wildcards, then check subnet membership and range overlap with CIDR arithmetic.",
        input: "Allow reads on reports, allow everything on scratch, deny all deletes, deny the salaries prefix; VPC 10.20.0.0/16",
        python: {
          code: code`
            POLICY = [  # simplified IAM-style statements attached to one role
                ("Allow", ["s3:GetObject", "s3:ListBucket"], ["arn:aws:s3:::reports", "arn:aws:s3:::reports/*"]),
                ("Allow", ["s3:*"], ["arn:aws:s3:::scratch/*"]),
                ("Deny", ["s3:DeleteObject"], ["arn:aws:s3:::*"]),
                ("Deny", ["s3:*"], ["arn:aws:s3:::reports/salaries/*"]),
            ]
            REQUESTS = [
                ("s3:GetObject", "arn:aws:s3:::reports/2026/q3.csv"),
                ("s3:GetObject", "arn:aws:s3:::reports/salaries/2026.csv"),
                ("s3:PutObject", "arn:aws:s3:::reports/2026/q3.csv"),
                ("s3:PutObject", "arn:aws:s3:::scratch/tmp.parquet"),
                ("s3:DeleteObject", "arn:aws:s3:::scratch/tmp.parquet"),
                ("ec2:StartInstances", "arn:aws:ec2:us-east-1:111122223333:instance/i-0abc"),
            ]


            def matches(pattern, text):
                """'*' matches any run of characters and '?' exactly one (dynamic programming)."""
                p, t = len(pattern), len(text)
                ok = [[False] * (t + 1) for _ in range(p + 1)]
                ok[0][0] = True
                for i in range(1, p + 1):
                    if pattern[i - 1] == "*":
                        ok[i][0] = ok[i - 1][0]
                    for j in range(1, t + 1):
                        if pattern[i - 1] == "*":
                            ok[i][j] = ok[i - 1][j] or ok[i][j - 1]
                        elif pattern[i - 1] == "?" or pattern[i - 1] == text[j - 1]:
                            ok[i][j] = ok[i - 1][j - 1]
                return ok[p][t]


            def decide(action, resource):
                allowed_by = None
                for n, (effect, actions, resources) in enumerate(POLICY, start=1):
                    hit = any(matches(a.lower(), action.lower()) for a in actions) and any(matches(r, resource) for r in resources)
                    if hit and effect == "Deny":
                        return f"DENY  (explicit deny, statement {n})"
                    if hit and allowed_by is None:
                        allowed_by = n
                return f"ALLOW (statement {allowed_by})" if allowed_by else "DENY  (implicit: nothing allows it)"


            for action, resource in REQUESTS:
                print(f"{action:18s} {resource:52s} -> {decide(action, resource)}")


            def ip_to_int(ip):
                a, b, c, d = (int(x) for x in ip.split("."))
                return ((a * 256 + b) * 256 + c) * 256 + d


            def cidr(block):
                ip, prefix = block.split("/")
                size = 2 ** (32 - int(prefix))
                start = ip_to_int(ip) // size * size
                return start, start + size - 1


            vpc = "10.20.0.0/16"
            lo, hi = cidr(vpc)
            print(f"{vpc}: {hi - lo + 1:,} addresses; split into /24 subnets: {(hi - lo + 1) // 256} subnets of 256, 251 usable each (AWS reserves 5)")
            for ip, block in [("10.20.37.14", "10.20.32.0/20"), ("10.20.48.1", "10.20.32.0/20")]:
                s, e = cidr(block)
                print(f"{ip} in {block}: {'yes' if s <= ip_to_int(ip) <= e else 'no'}")
            for other in ["10.20.128.0/17", "10.21.0.0/16"]:
                s, e = cidr(other)
                print(f"{vpc} overlaps {other}: {'yes' if s <= hi and lo <= e else 'no'}")
          `,
        },
        r: {
          code: code`
            policy <- list( # simplified IAM-style statements attached to one role
              list(effect = "Allow", actions = c("s3:GetObject", "s3:ListBucket"), resources = c("arn:aws:s3:::reports", "arn:aws:s3:::reports/*")),
              list(effect = "Allow", actions = "s3:*", resources = "arn:aws:s3:::scratch/*"),
              list(effect = "Deny", actions = "s3:DeleteObject", resources = "arn:aws:s3:::*"),
              list(effect = "Deny", actions = "s3:*", resources = "arn:aws:s3:::reports/salaries/*")
            )
            requests <- data.frame(
              action = c("s3:GetObject", "s3:GetObject", "s3:PutObject", "s3:PutObject", "s3:DeleteObject", "ec2:StartInstances"),
              resource = c("arn:aws:s3:::reports/2026/q3.csv", "arn:aws:s3:::reports/salaries/2026.csv", "arn:aws:s3:::reports/2026/q3.csv",
                           "arn:aws:s3:::scratch/tmp.parquet", "arn:aws:s3:::scratch/tmp.parquet", "arn:aws:ec2:us-east-1:111122223333:instance/i-0abc")
            )

            # '*' matches any run of characters and '?' exactly one (dynamic programming).
            matches <- function(pattern, text) {
              pc <- strsplit(pattern, "")[[1]]
              tc <- strsplit(text, "")[[1]]
              ok <- matrix(FALSE, length(pc) + 1, length(tc) + 1)
              ok[1, 1] <- TRUE
              for (i in seq_along(pc)) {
                if (pc[i] == "*") ok[i + 1, 1] <- ok[i, 1]
                for (j in seq_along(tc)) {
                  if (pc[i] == "*") {
                    ok[i + 1, j + 1] <- ok[i, j + 1] || ok[i + 1, j]
                  } else if (pc[i] == "?" || pc[i] == tc[j]) {
                    ok[i + 1, j + 1] <- ok[i, j]
                  }
                }
              }
              ok[length(pc) + 1, length(tc) + 1]
            }

            decide <- function(action, resource) {
              allowed_by <- NA
              for (n in seq_along(policy)) {
                st <- policy[[n]]
                hit <- any(vapply(st$actions, function(a) matches(tolower(a), tolower(action)), logical(1))) &&
                  any(vapply(st$resources, function(r) matches(r, resource), logical(1)))
                if (hit && st$effect == "Deny") return(sprintf("DENY  (explicit deny, statement %d)", n))
                if (hit && is.na(allowed_by)) allowed_by <- n
              }
              if (!is.na(allowed_by)) sprintf("ALLOW (statement %d)", allowed_by) else "DENY  (implicit: nothing allows it)"
            }

            for (i in seq_len(nrow(requests))) {
              cat(sprintf("%-18s %-52s -> %s\n", requests$action[i], requests$resource[i], decide(requests$action[i], requests$resource[i])))
            }

            ip_to_int <- function(ip) {
              p <- as.numeric(strsplit(ip, ".", fixed = TRUE)[[1]])
              ((p[1] * 256 + p[2]) * 256 + p[3]) * 256 + p[4]
            }

            cidr <- function(block) {
              parts <- strsplit(block, "/", fixed = TRUE)[[1]]
              size <- 2^(32 - as.numeric(parts[2]))
              start <- ip_to_int(parts[1]) %/% size * size
              c(start, start + size - 1)
            }

            vpc <- "10.20.0.0/16"
            range_vpc <- cidr(vpc)
            n_addr <- range_vpc[2] - range_vpc[1] + 1
            cat(sprintf("%s: %s addresses; split into /24 subnets: %d subnets of 256, 251 usable each (AWS reserves 5)\n",
                        vpc, formatC(n_addr, format = "d", big.mark = ","), as.integer(n_addr %/% 256)))
            for (pair in list(c("10.20.37.14", "10.20.32.0/20"), c("10.20.48.1", "10.20.32.0/20"))) {
              r <- cidr(pair[2])
              x <- ip_to_int(pair[1])
              cat(sprintf("%s in %s: %s\n", pair[1], pair[2], if (r[1] <= x && x <= r[2]) "yes" else "no"))
            }
            for (other in c("10.20.128.0/17", "10.21.0.0/16")) {
              r <- cidr(other)
              cat(sprintf("%s overlaps %s: %s\n", vpc, other, if (r[1] <= range_vpc[2] && range_vpc[1] <= r[2]) "yes" else "no"))
            }
          `,
        },
        expectedOutput: code`
        s3:GetObject       arn:aws:s3:::reports/2026/q3.csv                     -> ALLOW (statement 1)
        s3:GetObject       arn:aws:s3:::reports/salaries/2026.csv               -> DENY  (explicit deny, statement 4)
        s3:PutObject       arn:aws:s3:::reports/2026/q3.csv                     -> DENY  (implicit: nothing allows it)
        s3:PutObject       arn:aws:s3:::scratch/tmp.parquet                     -> ALLOW (statement 2)
        s3:DeleteObject    arn:aws:s3:::scratch/tmp.parquet                     -> DENY  (explicit deny, statement 3)
        ec2:StartInstances arn:aws:ec2:us-east-1:111122223333:instance/i-0abc   -> DENY  (implicit: nothing allows it)
        10.20.0.0/16: 65,536 addresses; split into /24 subnets: 256 subnets of 256, 251 usable each (AWS reserves 5)
        10.20.37.14 in 10.20.32.0/20: yes
        10.20.48.1 in 10.20.32.0/20: no
        10.20.0.0/16 overlaps 10.20.128.0/17: yes
        10.20.0.0/16 overlaps 10.21.0.0/16: no
      `,
        tests: {
          python: code`
            def test_wildcards():
                assert matches("s3:get*", "s3:getobject")
                assert matches("arn:aws:s3:::reports/*", "arn:aws:s3:::reports/a/b.csv")
                assert not matches("arn:aws:s3:::reports/*", "arn:aws:s3:::reports")
                assert matches("file-?.txt", "file-7.txt") and not matches("file-?.txt", "file-77.txt")


            def test_explicit_deny_beats_allow():
                assert decide("s3:DeleteObject", "arn:aws:s3:::scratch/x").startswith("DENY  (explicit")


            def test_cidr_bounds():
                assert cidr("10.20.32.0/20") == (ip_to_int("10.20.32.0"), ip_to_int("10.20.47.255"))
          `,
          r: code`
            test_that("wildcards match like IAM patterns", {
              expect_true(matches("arn:aws:s3:::reports/*", "arn:aws:s3:::reports/a/b.csv"))
              expect_false(matches("arn:aws:s3:::reports/*", "arn:aws:s3:::reports"))
            })

            test_that("explicit deny beats allow", {
              expect_match(decide("s3:DeleteObject", "arn:aws:s3:::scratch/x"), "explicit deny")
            })
          `,
        },
        eli5Trace: [
          "Reading this quarter's report: your pass allows it, so yes.",
          "Reading the salaries file: a 'nobody gets in' sign covers that folder, so no, even though your pass mentions reports.",
          "Writing a report: nothing on your pass says you may, so no.",
          "Deleting from scratch: your pass allows everything there, but a 'no deleting anywhere' sign wins.",
          "The private network has 65,536 house numbers; split into streets of 256, each street keeps 5 numbers for the city.",
        ],
        complexity: { time: "O(statements × pattern × text) per request", space: "O(pattern × text)" },
        edgeCases: [
          "A resource pattern for a bucket (arn:aws:s3:::reports) does not match its objects (reports/*); list and read permissions need both.",
          "Conditions (source IP, MFA, tags) can make the same statement match some requests and not others.",
          "A /32 is a single address; a /0 is the whole IPv4 space.",
          "Some managed services consume many IPs per node or pod; size subnets for peak scale.",
        ],
        incorrect: {
          language: "python",
          code: code`
            for effect, actions, resources in POLICY:
                if matches_any(actions, action) and matches_any(resources, resource):
                    return effect  # first matching statement wins
          `,
          whyWrong: "IAM is not first-match like a firewall rule list. Statement order does not matter: a deny later in the list must still override an earlier allow.",
          fix: "Collect all matching statements; if any is Deny return deny, else if any is Allow return allow, else deny implicitly.",
        },
        walkthrough: [
          { python: "def matches(pattern, text):", pythonLines: 14, r: "matches <- function(pattern, text) {", rLines: 17, eli5: "Check whether a pattern like reports/* fits a name, where * means 'anything' and ? means 'exactly one letter'." },
          { python: "def decide(action, resource):", pythonLines: 9, r: "decide <- function(action, resource) {", rLines: 11, eli5: "Look at every rule. Any matching 'no' wins straight away; otherwise a matching 'yes' lets you in; otherwise the door stays shut." },
          { python: "def cidr(block):", pythonLines: 5, r: "cidr <- function(block) {", rLines: 6, eli5: "Turn 10.20.32.0/20 into the first and last house numbers on that street." },
          { python: 'vpc = "10.20.0.0/16"', pythonLines: 9, r: 'vpc <- "10.20.0.0/16"', rLines: 14, eli5: "Count addresses, check which street a house is on, and check whether two neighborhoods overlap." },
        ],
      },
      flow: {
        title: "How a cloud API call is authorized",
        nodes: [
          node("call", "API call", 0, 120, "principal, action, resource"),
          node("deny", "Any explicit deny?", 240, 120, "all applicable policies"),
          node("no1", "Denied", 480, 30, "deny wins"),
          node("allow", "Any allow?", 480, 210, "identity or resource policy"),
          node("yes", "Allowed", 720, 150, "request proceeds"),
          node("no2", "Implicit deny", 720, 270, "nothing allowed it"),
        ],
        edges: [edge("call", "deny"), edge("deny", "no1"), edge("deny", "allow"), edge("allow", "yes"), edge("allow", "no2")],
        steps: [
          step("call deny", "call-deny", "Every applicable policy is gathered; order does not matter."),
          step("deny no1", "deny-no1", "If any statement explicitly denies the action on this resource, the request is denied."),
          step("deny allow", "deny-allow", "Otherwise the evaluator looks for at least one matching allow."),
          step("allow yes", "allow-yes", "A matching allow lets the request through."),
          step("allow no2", "allow-no2", "With no matching allow, the default answer is deny."),
        ],
      },
      practice: [
        {
          id: "w12-iam-recall-1",
          type: "recall",
          prompt: "Write the least-privilege actions and resources for a job that reads files under s3://reports/2026/ and lists that prefix.",
          answer: "Allow s3:GetObject on arn:aws:s3:::reports/2026/* and s3:ListBucket on arn:aws:s3:::reports with a condition limiting the s3:prefix to 2026/. Nothing else.",
          rubric: ["GetObject on object ARN", "ListBucket on bucket ARN", "Prefix condition"],
        },
        {
          id: "w12-iam-case-1",
          type: "case",
          prompt: "An access key for a production role appears in a public repository. What do you do, in order?",
          answer: "Deactivate and delete the key immediately, check audit logs for its use since creation, rotate any secrets the role could read, remove the key from the repository history, replace long-lived keys with role-based short-lived credentials, and add secret scanning to CI.",
          rubric: ["Revoke first", "Audit usage", "Rotate exposed secrets", "Prevent with roles and scanning"],
        },
        {
          id: "w12-net-recall-1",
          type: "recall",
          prompt: "How many usable addresses does an AWS /26 subnet have?",
          answer: "A /26 has 2^6 = 64 addresses; AWS reserves 5, leaving 59 usable.",
          rubric: ["64", "Minus 5", "59"],
        },
      ],
      references: [
        { title: "AWS IAM User Guide: Policy evaluation logic", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html", versionSensitive: true },
        { title: "Amazon VPC User Guide: Subnet CIDR blocks", url: "https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html", versionSensitive: true },
      ],
      lastReviewed: REVIEWED,
    }),

    defineTopic({
      id: "w12-d04-iac-cost",
      slug: "iac-cost",
      title: "Infrastructure as code: plans, drift, policy and cost",
      domain: "cloud",
      roles: ["sde", "data-engineer", "ml-engineer"],
      difficulty: "intermediate",
      minutes: 45,
      prerequisites: ["w12-d03-cloud-networking-iam", "w12-d01-cicd-canary"],
      objectives: [
        "Compute a plan (create, update, destroy) by diffing declared resources against refreshed reality",
        "Detect drift and explain why applying code reverts manual changes",
        "Gate applies with policy checks and show the monthly cost change in review",
      ],
      summary:
        "Infrastructure as code (Terraform or OpenTofu, Pulumi, CloudFormation, Bicep) declares the resources you want in version-controlled files. A plan compares that declaration with what exists and lists what will be created, changed or destroyed. Reviewing the plan, running policy checks and estimating the cost change before apply turns infrastructure changes into ordinary code review.",
      eli5: {
        analogy:
          "A shopping list for building blocks. Your list says what the tower should look like. Before building, you compare the list with the tower on the table: add missing blocks, swap wrong ones, remove extras. If someone moved a block while you were away, the list puts it back.",
        steps: [
          "Write down the tower you want.",
          "Look at the real tower on the table.",
          "Make a to-do list: add, change, remove.",
          "Let a grown-up check the list for unsafe blocks and price before you build.",
        ],
        analogyLimit:
          "Some real changes cannot be done in place: changing certain settings forces the cloud to destroy and recreate the resource, which can mean downtime or data loss.",
      },
      senior: {
        definition:
          "Declarative IaC tools keep a state file mapping declared resources to real ones. A plan refreshes state from the provider APIs, diffs it against the configuration, and produces create, update-in-place, replace and destroy actions. Policy as code (Open Policy Agent, Sentinel, Checkov and similar) evaluates the plan before apply.",
        invariants: [
          "The plan is computed against refreshed reality, so manual changes show up as diffs.",
          "Applies run from CI with reviewed plans, not from laptops.",
          "Destroys and replacements of stateful resources require explicit approval.",
        ],
        mechanism: [
          "Someone scaled vm.etl from 2 to 4 by hand: the refresh reports drift, and the plan sets it back to the declared 3.",
          "The plan has 1 add (bucket.exports), 2 changes (versioning on bucket.raw; size and count on vm.etl) and 1 destroy (vm.legacy).",
          "The policy check blocks the apply because bucket.exports is public; after fixing it the check passes.",
          "With hypothetical prices the monthly cost falls from USD 535.00 to USD 230.00, a change reviewers see before approving.",
        ],
        complexity:
          "Planning is O(resources) API reads and diffs; large estates split state into smaller stacks so plans stay fast and blast radius stays small.",
        tradeoffs: [
          { option: "Terraform or OpenTofu (HCL)", choose: "Multi-cloud and SaaS providers with one workflow.", cost: "State file management and locking." },
          { option: "Pulumi or CDK (general-purpose languages)", choose: "Teams that want loops, types and tests in a familiar language.", cost: "Easier to write overly clever infrastructure code." },
          { option: "Provider-native (CloudFormation, Bicep, Deployment Manager)", choose: "Single-cloud shops wanting managed state.", cost: "Lock-in to one provider's syntax and features." },
        ],
        failureModes: [
          "Applying without reading the plan and replacing a database because one immutable setting changed.",
          "Shared state without locking, so two applies corrupt it.",
          "Secrets stored in state files in plain text.",
          "Long-lived manual console changes that the next apply silently reverts.",
        ],
        production:
          "Pull requests run format, validate, plan, policy checks and a cost estimate, and post them as comments; merges trigger apply from CI with short-lived credentials. State lives in a locked remote backend with encryption and versioning, and scheduled drift detection opens tickets when reality diverges.",
        interviewAnswer:
          "I keep infrastructure in version control and run plan on every pull request: it refreshes real state, diffs it against the code, and lists creates, updates, replacements and destroys. CI runs policy checks (no public buckets, required tags, approved regions) and a cost estimate, and only reviewed plans are applied from CI. Drift detection runs on a schedule because manual changes will be reverted by the next apply.",
      },
      implementation: {
        problem: "Detect drift, compute a plan between refreshed reality and the declared configuration, run two policy rules, and estimate the monthly cost change.",
        input: "State with 3 resources, one scaled by hand; a configuration that changes 2, adds 1 public bucket and removes 1; hypothetical monthly prices",
        python: {
          code: code`
            PRICES = {"bucket": 25.0, "small": 30.0, "medium": 60.0, "large": 120.0}  # hypothetical USD per month
            STATE = {  # what the last apply recorded
                "bucket.raw": {"type": "bucket", "versioning": "no", "public": "no", "team": "data"},
                "vm.etl": {"type": "vm", "size": "large", "count": 2, "team": "data"},
                "vm.legacy": {"type": "vm", "size": "small", "count": 1, "team": ""},
            }
            ACTUAL = {name: dict(attrs) for name, attrs in STATE.items()}
            ACTUAL["vm.etl"]["count"] = 4  # someone scaled it by hand in the console
            DESIRED = {  # what the code in the repository declares
                "bucket.raw": {"type": "bucket", "versioning": "yes", "public": "no", "team": "data"},
                "vm.etl": {"type": "vm", "size": "medium", "count": 3, "team": "data"},
                "bucket.exports": {"type": "bucket", "versioning": "yes", "public": "yes", "team": "data"},
            }


            def diff(old, new):
                return [f"{k} {old.get(k)} -> {v}" for k, v in new.items() if old.get(k) != v]


            def plan(state, desired):
                lines, counts = [], {"add": 0, "change": 0, "destroy": 0}
                for name in sorted(set(state) | set(desired)):
                    if name not in state:
                        lines.append(f"  + {name}")
                        counts["add"] += 1
                    elif name not in desired:
                        lines.append(f"  - {name}")
                        counts["destroy"] += 1
                    elif diff(state[name], desired[name]):
                        lines.append(f"  ~ {name}: " + ", ".join(diff(state[name], desired[name])))
                        counts["change"] += 1
                return counts, lines


            def violations(desired):
                found = []
                for name, r in sorted(desired.items()):
                    if r.get("public") == "yes":
                        found.append(f"{name}: buckets must not be public")
                    if not r.get("team"):
                        found.append(f"{name}: missing team tag")
                return found


            def monthly_cost(resources):
                total = 0.0
                for r in resources.values():
                    total += PRICES["bucket"] if r["type"] == "bucket" else r["count"] * PRICES[r["size"]]
                return total


            for name in sorted(STATE):
                for change in diff(STATE[name], ACTUAL[name]):
                    print(f"drift: {name} {change} (changed outside code)")
            counts, lines = plan(ACTUAL, DESIRED)  # refresh first, then compare reality with the code
            print(f"plan after refresh: {counts['add']} to add, {counts['change']} to change, {counts['destroy']} to destroy")
            print("\n".join(lines))
            problems = violations(DESIRED)
            print("policy check: " + ("; ".join(problems) if problems else "passed") + (" -> apply blocked" if problems else ""))
            before, after = monthly_cost(ACTUAL), monthly_cost(DESIRED)
            print(f"cost: USD {before:.2f} -> USD {after:.2f} per month ({after - before:+.2f})")
            DESIRED["bucket.exports"]["public"] = "no"
            print(f"after fixing the bucket: policy check {'passed' if not violations(DESIRED) else 'failed'}")
          `,
        },
        r: {
          code: code`
            prices <- c(bucket = 25, small = 30, medium = 60, large = 120) # hypothetical USD per month
            state <- list( # what the last apply recorded
              "bucket.raw" = list(type = "bucket", versioning = "no", public = "no", team = "data"),
              "vm.etl" = list(type = "vm", size = "large", count = 2, team = "data"),
              "vm.legacy" = list(type = "vm", size = "small", count = 1, team = "")
            )
            actual <- state
            actual[["vm.etl"]]$count <- 4 # someone scaled it by hand in the console
            desired <- list( # what the code in the repository declares
              "bucket.raw" = list(type = "bucket", versioning = "yes", public = "no", team = "data"),
              "vm.etl" = list(type = "vm", size = "medium", count = 3, team = "data"),
              "bucket.exports" = list(type = "bucket", versioning = "yes", public = "yes", team = "data")
            )

            diff_attrs <- function(old, new) {
              out <- character(0)
              for (k in names(new)) {
                if (!identical(old[[k]], new[[k]])) out <- c(out, sprintf("%s %s -> %s", k, format(old[[k]]), format(new[[k]])))
              }
              out
            }

            plan <- function(state, desired) {
              lines <- character(0)
              counts <- c(add = 0L, change = 0L, destroy = 0L)
              for (name in sort(union(names(state), names(desired)), method = "radix")) {
                if (!name %in% names(state)) {
                  lines <- c(lines, sprintf("  + %s", name))
                  counts[["add"]] <- counts[["add"]] + 1L
                } else if (!name %in% names(desired)) {
                  lines <- c(lines, sprintf("  - %s", name))
                  counts[["destroy"]] <- counts[["destroy"]] + 1L
                } else if (length(diff_attrs(state[[name]], desired[[name]])) > 0) {
                  lines <- c(lines, sprintf("  ~ %s: %s", name, paste(diff_attrs(state[[name]], desired[[name]]), collapse = ", ")))
                  counts[["change"]] <- counts[["change"]] + 1L
                }
              }
              list(counts = counts, lines = lines)
            }

            violations <- function(desired) {
              found <- character(0)
              for (name in sort(names(desired), method = "radix")) {
                r <- desired[[name]]
                if (identical(r$public, "yes")) found <- c(found, sprintf("%s: buckets must not be public", name))
                if (is.null(r$team) || r$team == "") found <- c(found, sprintf("%s: missing team tag", name))
              }
              found
            }

            monthly_cost <- function(resources) {
              total <- 0
              for (r in resources) total <- total + if (r$type == "bucket") prices[["bucket"]] else r$count * prices[[r$size]]
              total
            }

            for (name in sort(names(state), method = "radix")) {
              for (change in diff_attrs(state[[name]], actual[[name]])) cat(sprintf("drift: %s %s (changed outside code)\n", name, change))
            }
            p <- plan(actual, desired) # refresh first, then compare reality with the code
            cat(sprintf("plan after refresh: %d to add, %d to change, %d to destroy\n", p$counts[["add"]], p$counts[["change"]], p$counts[["destroy"]]))
            cat(paste(p$lines, collapse = "\n"), "\n", sep = "")
            problems <- violations(desired)
            cat(sprintf("policy check: %s%s\n", if (length(problems)) paste(problems, collapse = "; ") else "passed", if (length(problems)) " -> apply blocked" else ""))
            before <- monthly_cost(actual)
            after <- monthly_cost(desired)
            cat(sprintf("cost: USD %.2f -> USD %.2f per month (%+.2f)\n", before, after, after - before))
            desired[["bucket.exports"]]$public <- "no"
            cat(sprintf("after fixing the bucket: policy check %s\n", if (length(violations(desired)) == 0) "passed" else "failed"))
          `,
        },
        expectedOutput: code`
        drift: vm.etl count 2 -> 4 (changed outside code)
        plan after refresh: 1 to add, 2 to change, 1 to destroy
          + bucket.exports
          ~ bucket.raw: versioning no -> yes
          ~ vm.etl: size large -> medium, count 4 -> 3
          - vm.legacy
        policy check: bucket.exports: buckets must not be public -> apply blocked
        cost: USD 535.00 -> USD 230.00 per month (-305.00)
        after fixing the bucket: policy check passed
      `,
        tests: {
          python: code`
            def test_plan_is_empty_when_reality_matches_code():
                counts, lines = plan(DESIRED, DESIRED)
                assert counts == {"add": 0, "change": 0, "destroy": 0} and lines == []


            def test_missing_tag_is_a_violation():
                assert violations({"vm.x": {"type": "vm", "size": "small", "count": 1, "team": ""}}) == ["vm.x: missing team tag"]


            def test_cost_counts_instances():
                assert monthly_cost({"vm.y": {"type": "vm", "size": "large", "count": 3, "team": "a"}}) == 360.0
          `,
          r: code`
            test_that("plan is empty when reality matches code", {
              p <- plan(desired, desired)
              expect_equal(sum(p$counts), 0)
            })

            test_that("cost counts instances", {
              expect_equal(monthly_cost(list(y = list(type = "vm", size = "large", count = 3, team = "a"))), 360)
            })
          `,
        },
        eli5Trace: [
          "Someone added two blocks to the tower by hand. The checker notices the tower no longer matches the list.",
          "The to-do list: add a new box, change two towers, remove an old one.",
          "The grown-up stops the build: the new box would be open to strangers.",
          "The new tower would cost less each month, 230 instead of 535 pretend dollars.",
          "Close the box and the grown-up says go.",
        ],
        complexity: { time: "O(resources × attributes)", space: "O(resources)" },
        edgeCases: [
          "Renaming a resource in code looks like destroy plus create unless you move it in state.",
          "Some attribute changes force replacement; plans mark these and they deserve extra review.",
          "Resources created outside IaC are invisible to the plan until imported.",
          "Cost estimates miss usage-based charges such as requests and data transfer.",
        ],
        incorrect: {
          language: "python",
          code: code`
            counts, lines = plan(STATE, DESIRED)  # skip the refresh to save time
          `,
          whyWrong: "Planning against the stored state ignores the manual change, so the plan says count 2 -> 3 and reviewers underestimate what apply will do (it will actually remove one of four machines).",
          fix: "Always refresh from the real resources before diffing (the default in Terraform's plan), and alert on drift separately.",
        },
        walkthrough: [
          { python: "ACTUAL = {name", pythonLines: 2, r: "actual <- state", rLines: 2, eli5: "Copy the last known tower and pretend someone added blocks by hand." },
          { python: "def diff(old, new):", pythonLines: 2, r: "diff_attrs <- function(old, new) {", rLines: 7, eli5: "List every setting that differs between two versions of one thing." },
          { python: "def plan(state, desired):", pythonLines: 13, r: "plan <- function(state, desired) {", rLines: 17, eli5: "Go through every name: on the list but not the table means add, on the table but not the list means remove, different settings mean change." },
          { python: "def violations(desired):", pythonLines: 8, r: "violations <- function(desired) {", rLines: 9, eli5: "The safety rules: no boxes open to strangers, and every block must say which team owns it." },
          { python: "for name in sorted(STATE):", pythonLines: 3, r: "for (name in sort(names(state)", rLines: 3, eli5: "Spot the hand-made changes first." },
          { python: "counts, lines = plan(ACTUAL, DESIRED)", pythonLines: 5, r: "p <- plan(actual, desired)", rLines: 5, eli5: "Make the to-do list from the real tower and run the safety rules." },
          { python: "before, after = ", pythonLines: 4, r: "before <- monthly_cost(actual)", rLines: 5, eli5: "Show the price change, fix the unsafe box, and check again." },
        ],
      },
      flow: {
        title: "Infrastructure change through review",
        nodes: [
          node("pr", "Pull request", 0, 120, "code change"),
          node("plan", "Refresh + plan", 220, 120, "diff vs reality"),
          node("policy", "Policy checks", 440, 40, "public? tags? region?"),
          node("cost", "Cost estimate", 440, 200, "monthly delta"),
          node("review", "Human review", 660, 120, "read the plan"),
          node("apply", "Apply from CI", 880, 120, "locked state"),
        ],
        edges: [edge("pr", "plan"), edge("plan", "policy"), edge("plan", "cost"), edge("policy", "review"), edge("cost", "review"), edge("review", "apply")],
        steps: [
          step("pr plan", "pr-plan", "CI refreshes state from the provider and computes the plan; drift shows up here."),
          step("plan policy", "plan-policy", "Policy as code evaluates the planned resources and can block the merge."),
          step("plan cost", "plan-cost", "A cost estimate shows the monthly change next to the diff."),
          step("policy cost review", "policy-review cost-review", "A reviewer reads creates, replacements and destroys, especially for stateful resources."),
          step("review apply", "review-apply", "After merge, CI applies exactly the reviewed plan with short-lived credentials and a state lock."),
        ],
      },
      practice: [
        {
          id: "w12-iac-recall-1",
          type: "recall",
          prompt: "Why should state files be stored remotely with locking and encryption?",
          answer: "Locking stops two applies from writing state at once and corrupting it; remote storage lets the team and CI share one source of truth; encryption matters because state can contain secrets and resource details; versioning allows recovery from bad writes.",
          rubric: ["Locking", "Shared source of truth", "Secrets in state", "Versioning"],
        },
        {
          id: "w12-iac-case-1",
          type: "case",
          prompt: "A plan shows your production database will be replaced because a parameter changed. What do you do?",
          answer: "Stop: replacement means a new empty database. Check whether the parameter can change in place via another path, use lifecycle protections (prevent_destroy), take and test a backup, and plan a migration (snapshot restore or replication cutover) in a maintenance window if replacement is truly required.",
          rubric: ["Recognize data loss risk", "Prevent destroy guard", "Backup", "Planned migration"],
        },
        {
          id: "w12-iac-recall-2",
          type: "recall",
          prompt: "What is drift and how do you detect it?",
          answer: "Drift is any difference between real infrastructure and its declared configuration, usually from manual changes or other tools. Detect it with scheduled refresh-only plans that alert when the diff is not empty.",
          rubric: ["Definition", "Scheduled plan", "Alert"],
        },
      ],
      references: [
        { title: "Terraform documentation: terraform plan", url: "https://developer.hashicorp.com/terraform/cli/commands/plan", versionSensitive: true },
        { title: "OpenTofu documentation", url: "https://opentofu.org/docs/", versionSensitive: true },
        { title: "Open Policy Agent documentation", url: "https://www.openpolicyagent.org/docs/latest/", versionSensitive: true },
      ],
      lastReviewed: REVIEWED,
    }),

    defineTopic({
      id: "w12-d05-managed-ai-services",
      slug: "managed-ai-services",
      title: "Managed AI services versus self-hosting",
      domain: "cloud",
      roles: ["genai-engineer", "ml-engineer", "sde", "data-scientist"],
      difficulty: "intermediate",
      minutes: 45,
      prerequisites: ["w12-d01-cloud-fundamentals", "w09-d05-training-at-scale"],
      objectives: [
        "Compare pay-per-token APIs with self-hosted models on cost, latency, control and compliance",
        "Compute a break-even volume when capacity comes in whole GPU instances",
        "Cut cost with model routing and know which inputs to re-check because prices change quickly",
      ],
      summary:
        "Teams can call a hosted model API (from a model provider or a cloud's managed AI platform), deploy an open-weights model on managed endpoints, or run it themselves on GPUs. APIs cost nothing when idle and scale instantly; self-hosting has a fixed floor (at least two instances for availability, plus people) but a lower marginal cost at high, steady volume. Routing easy requests to a smaller model often saves more than any infrastructure change.",
      eli5: {
        analogy:
          "Taking a taxi versus buying a car. A taxi costs nothing when you stay home and a lot if you ride all day. A car costs money even when parked (insurance, parking, a mechanic), but each trip is cheap once you drive a lot. And for short trips around the corner, a bike (a small model) is cheaper than either.",
        steps: [
          "Add up what the taxi (API) costs for your monthly rides.",
          "Add up what owning cars (GPUs) costs: at least two, plus a mechanic.",
          "Find the number of rides where owning becomes cheaper.",
          "Send easy trips by bike to save even more.",
        ],
        analogyLimit:
          "Model prices and GPU prices change every few months, and quality differs between models, so the 'cheaper' choice must also pass your quality bar.",
      },
      senior: {
        definition:
          "Managed AI services range from serverless model APIs billed per token, to provisioned throughput, to dedicated endpoints for custom or open-weights models, to self-managed inference on GPU instances or Kubernetes with servers such as vLLM or TGI. The decision weighs cost per token at expected volume, latency and throughput, data governance, customization and operational burden.",
        invariants: [
          "Self-hosted cost = instances × hourly price × hours + operations, with instances ≥ the availability minimum.",
          "Instance capacity = throughput × achievable utilization × seconds in the period.",
          "Any comparison is only valid at equal quality on your own evaluation set.",
        ],
        mechanism: [
          "One batched instance at a hypothetical 2,500 tokens per second and 50% utilization serves about 3.24B tokens a month.",
          "At 1B tokens a month the API costs USD 1,000 and self-hosting USD 7,350, because two instances and operations are a fixed floor.",
          "Self-hosting is first cheaper at 9.2B tokens a month but loses again at 10B when a fourth instance is needed; it is always cheaper above 10.9B.",
          "Routing 70% of traffic to a small model at a hypothetical USD 0.10 per million tokens cuts the blended price to USD 0.37 per million, so 5B tokens cost USD 1,850 instead of USD 5,000.",
        ],
        complexity:
          "Cost is linear in tokens for APIs and a staircase in tokens for self-hosting (one step per instance).",
        tradeoffs: [
          { option: "Hosted model API", choose: "Variable or low volume, fastest time to market, frontier quality.", cost: "Per-token price, rate limits, data leaves your boundary under the provider's terms." },
          { option: "Cloud managed endpoint or provisioned throughput", choose: "Steady volume with enterprise controls and private networking.", cost: "Committed spend; less flexibility than full self-hosting." },
          { option: "Self-hosted open-weights model", choose: "Very high steady volume, strict data control, deep customization.", cost: "GPU capacity planning, on-call, upgrades, security patches." },
          { option: "Model routing and caching", choose: "Mixed difficulty traffic, repeated prompts.", cost: "Router mistakes on hard queries; needs evaluation." },
        ],
        failureModes: [
          "Comparing list prices without measuring real tokens per request (system prompts and retrieved context dominate).",
          "Assuming 100% GPU utilization; real traffic has peaks and valleys.",
          "Ignoring the people cost of running inference reliably.",
          "Switching models for cost without re-running quality and safety evaluations.",
        ],
        production:
          "Teams log tokens per feature, cache repeated prompts and embeddings, route by difficulty, set per-tenant budgets, and revisit the API versus self-host decision quarterly because prices, models and volumes all move. Contracts and data-processing terms are reviewed with legal before sending sensitive data to any provider.",
        interviewAnswer:
          "I model cost per month at expected and peak volume: API cost is linear in tokens, self-hosting is a staircase of whole instances plus operations, with a minimum of two for availability. Below the break-even I use the API; above it, or when data control requires it, I self-host or use provisioned capacity. Either way, routing easy traffic to a smaller model and caching usually give the biggest savings, and every swap is gated by evaluation on our own test set. I always re-check prices, which change frequently.",
      },
      implementation: {
        problem: "Compare monthly API and self-hosting cost at four volumes, scan for the break-even with whole instances, and price a 70/30 small/large routing policy.",
        input: "Hypothetical: USD 1.00 per million API tokens; USD 2.50 per GPU-hour; 2,500 tokens/s at 50% utilization; 2-instance minimum; USD 3,750 a month operations",
        python: {
          code: code`
            from math import ceil

            # Every price and throughput here is hypothetical; real numbers change often, so check current pricing.
            API_PER_M = 1.00                 # USD per million tokens, blended input and output
            GPU_HOUR = 2.50                  # USD per GPU instance hour
            TOKENS_PER_SEC = 2_500           # sustained throughput of one batched instance at full load
            UTILIZATION = 0.5                # realistic average load, traffic is not flat
            MIN_INSTANCES = 2                # two for availability
            OPS_PER_MONTH = 3_750.0          # share of an engineer's time to run it
            HOURS = 30 * 24
            per_instance = int(TOKENS_PER_SEC * UTILIZATION * 3600 * HOURS)


            def api_cost(tokens):
                return tokens / 1e6 * API_PER_M


            def self_host(tokens):
                instances = max(MIN_INSTANCES, ceil(tokens / per_instance))
                return instances, instances * GPU_HOUR * HOURS + OPS_PER_MONTH


            print(f"one instance serves about {per_instance / 1e9:.3f}B tokens a month at {UTILIZATION:.0%} utilization")
            for tokens in [100e6, 1e9, 10e9, 50e9]:
                n, cost = self_host(tokens)
                api = api_cost(tokens)
                print(f"{tokens / 1e9:5.1f}B tokens/month: API USD {api:9,.2f}  self-host USD {cost:9,.2f} ({n} instances) -> {'API' if api <= cost else 'self-host'}")
            first_cheaper, last_api_win = None, None
            for step in range(1, 501):  # scan 0.1B to 50B tokens in 0.1B steps
                tokens = step * 100e6
                if self_host(tokens)[1] < api_cost(tokens):
                    first_cheaper = first_cheaper or tokens
                else:
                    last_api_win = tokens
            print(f"self-hosting is first cheaper at {first_cheaper / 1e9:.1f}B tokens a month and always cheaper above {last_api_win / 1e9:.1f}B (whole instances make the cost a staircase)")
            small_share, small_price = 0.7, 0.10
            blended = small_share * small_price + (1 - small_share) * API_PER_M
            print(f"route {small_share:.0%} of traffic to a small model at USD {small_price:.2f}/M: blended USD {blended:.2f}/M, 5B tokens cost USD {5e9 / 1e6 * blended:,.2f}")
          `,
        },
        r: {
          code: code`
            # Every price and throughput here is hypothetical; real numbers change often, so check current pricing.
            api_per_m <- 1.00 # USD per million tokens, blended input and output
            gpu_hour <- 2.50 # USD per GPU instance hour
            tokens_per_sec <- 2500 # sustained throughput of one batched instance at full load
            utilization <- 0.5 # realistic average load, traffic is not flat
            min_instances <- 2 # two for availability
            ops_per_month <- 3750 # share of an engineer's time to run it
            hours <- 30 * 24
            per_instance <- tokens_per_sec * utilization * 3600 * hours

            api_cost <- function(tokens) tokens / 1e6 * api_per_m

            self_host <- function(tokens) {
              instances <- max(min_instances, ceiling(tokens / per_instance))
              c(instances = instances, cost = instances * gpu_hour * hours + ops_per_month)
            }

            usd <- function(x, width = 9) formatC(x, format = "f", digits = 2, big.mark = ",", width = width)
            cat(sprintf("one instance serves about %.3fB tokens a month at %.0f%% utilization\n", per_instance / 1e9, 100 * utilization))
            for (tokens in c(100e6, 1e9, 10e9, 50e9)) {
              sh <- self_host(tokens)
              api <- api_cost(tokens)
              cat(sprintf("%5.1fB tokens/month: API USD %s  self-host USD %s (%d instances) -> %s\n",
                          tokens / 1e9, usd(api), usd(sh[["cost"]]), as.integer(sh[["instances"]]), if (api <= sh[["cost"]]) "API" else "self-host"))
            }
            first_cheaper <- NA
            last_api_win <- NA
            for (step in 1:500) { # scan 0.1B to 50B tokens in 0.1B steps
              tokens <- step * 100e6
              if (self_host(tokens)[["cost"]] < api_cost(tokens)) {
                if (is.na(first_cheaper)) first_cheaper <- tokens
              } else {
                last_api_win <- tokens
              }
            }
            cat(sprintf("self-hosting is first cheaper at %.1fB tokens a month and always cheaper above %.1fB (whole instances make the cost a staircase)\n",
                        first_cheaper / 1e9, last_api_win / 1e9))
            small_share <- 0.7
            small_price <- 0.10
            blended <- small_share * small_price + (1 - small_share) * api_per_m
            cat(sprintf("route %.0f%% of traffic to a small model at USD %.2f/M: blended USD %.2f/M, 5B tokens cost USD %s\n",
                        100 * small_share, small_price, blended, usd(5e9 / 1e6 * blended, 0)))
          `,
        },
        expectedOutput: code`
        one instance serves about 3.240B tokens a month at 50% utilization
          0.1B tokens/month: API USD    100.00  self-host USD  7,350.00 (2 instances) -> API
          1.0B tokens/month: API USD  1,000.00  self-host USD  7,350.00 (2 instances) -> API
         10.0B tokens/month: API USD 10,000.00  self-host USD 10,950.00 (4 instances) -> API
         50.0B tokens/month: API USD 50,000.00  self-host USD 32,550.00 (16 instances) -> self-host
        self-hosting is first cheaper at 9.2B tokens a month and always cheaper above 10.9B (whole instances make the cost a staircase)
        route 70% of traffic to a small model at USD 0.10/M: blended USD 0.37/M, 5B tokens cost USD 1,850.00
      `,
        tests: {
          python: code`
            def test_minimum_instances_apply_at_low_volume():
                assert self_host(1)[0] == MIN_INSTANCES


            def test_capacity_steps_add_one_instance():
                assert self_host(per_instance * 3)[0] == 3 and self_host(per_instance * 3 + 1)[0] == 4


            def test_routing_is_cheaper_than_large_only():
                assert blended < API_PER_M
          `,
          r: code`
            test_that("minimum instances apply at low volume", {
              expect_equal(self_host(1)[["instances"]], min_instances)
            })

            test_that("capacity steps add one instance", {
              expect_equal(self_host(per_instance * 3 + 1)[["instances"]], 4)
            })
          `,
        },
        eli5Trace: [
          "One pretend car can do about 3.2 billion word-trips a month if it is busy half the time.",
          "For a few rides, the taxi is far cheaper, because owning means paying for two cars and a mechanic.",
          "Around 9 billion rides owning starts to win, then loses briefly when you must buy a fourth car, and wins for good after about 11 billion.",
          "Sending 7 in 10 easy trips by bike makes the average trip cost 0.37 instead of 1.00.",
        ],
        complexity: { time: "O(volume steps) for the scan", space: "O(1)" },
        edgeCases: [
          "Input and output tokens are often priced differently; blend them by your real ratio.",
          "Long contexts raise memory per request and lower throughput per GPU.",
          "Provisioned capacity may be billed even when idle, like self-hosting.",
          "Data residency or contractual rules can rule out options before cost matters.",
        ],
        incorrect: {
          language: "python",
          code: code`
            per_instance = TOKENS_PER_SEC * 3600 * HOURS  # assume the GPU is always busy
            instances = tokens / per_instance               # fractional GPUs
          `,
          whyWrong: "Real traffic is uneven, so average utilization is well below 100%, and you cannot rent 2.7 instances or run a single copy in production. Both errors make self-hosting look much cheaper than it is.",
          fix: "Use measured utilization, round instances up, apply the availability minimum, and include operations cost.",
        },
        walkthrough: [
          { python: "API_PER_M = ", pythonLines: 8, r: "api_per_m <- ", rLines: 8, eli5: "All the pretend prices: taxi price per ride, car price per hour, how many rides a car does, and the mechanic." },
          { python: "def self_host(tokens):", pythonLines: 3, r: "self_host <- function(tokens) {", rLines: 4, eli5: "Owning: buy enough whole cars for the rides, never fewer than two, and pay the mechanic." },
          { python: "for tokens in [", pythonLines: 4, r: "for (tokens in c(", rLines: 6, eli5: "Compare taxi and car costs for four amounts of riding." },
          { python: "first_cheaper, last_api_win = None, None", pythonLines: 8, r: "first_cheaper <- NA", rLines: 12, eli5: "Step through ride counts to see where owning first wins and where it wins for good." },
          { python: "small_share, small_price", pythonLines: 3, r: "small_share <- 0.7", rLines: 5, eli5: "Send most easy trips by bike and see how much the average trip costs." },
        ],
      },
      flow: {
        title: "Choosing where a model runs",
        nodes: [
          node("req", "Request", 0, 120, "prompt + context"),
          node("router", "Router", 220, 120, "difficulty, tenant, budget"),
          node("small", "Small model", 460, 30, "cheap, fast"),
          node("api", "Hosted API", 460, 130, "pay per token"),
          node("self", "Self-hosted", 460, 230, "GPU instances"),
          node("eval", "Evaluation", 700, 130, "quality, cost, latency"),
        ],
        edges: [edge("req", "router"), edge("router", "small"), edge("router", "api"), edge("router", "self"), edge("small", "eval"), edge("api", "eval"), edge("self", "eval")],
        steps: [
          step("req router", "req-router", "A router looks at the request (task type, length, tenant, budget) before choosing a model."),
          step("router small", "router-small", "Easy, high-volume requests go to a small model."),
          step("router api self", "router-api router-self", "Hard requests go to a large model, hosted by a provider or self-hosted, depending on volume and data rules."),
          step("small api self eval", "small-eval api-eval self-eval", "Offline and online evaluation keeps checking that the cheaper path still meets the quality bar."),
        ],
      },
      practice: [
        {
          id: "w12-ai-recall-1",
          type: "recall",
          prompt: "List four inputs you need before comparing a hosted API with self-hosting.",
          answer: "Monthly token volume and its peak-to-average ratio, real tokens per request (input and output), measured throughput and latency per GPU for the chosen model, current prices for both options, availability requirements, and the people cost of operating inference.",
          rubric: ["Volume and peaks", "Tokens per request", "Throughput per GPU", "Current prices", "Ops cost"],
        },
        {
          id: "w12-ai-case-1",
          type: "case",
          prompt: "Finance asks you to cut a USD 80,000 monthly LLM bill by half within a month. What do you try first?",
          answer: "Measure tokens by feature to find the biggest consumers; trim prompts and retrieved context; cache repeated prompts and responses; route easy traffic to a smaller model after an evaluation; batch offline jobs; and only then consider provisioned capacity or self-hosting, which take longer and need capacity planning.",
          rubric: ["Measure by feature", "Prompt and context trimming", "Caching", "Routing with evaluation", "Infrastructure last"],
        },
        {
          id: "w12-ai-recall-2",
          type: "recall",
          prompt: "Why is self-hosting cost a staircase rather than a straight line?",
          answer: "Capacity comes in whole instances: once volume exceeds what n instances can serve at the target utilization, you pay for a full extra instance, so cost jumps and then stays flat until the next step.",
          rubric: ["Whole instances", "Jumps at capacity"],
        },
      ],
      references: [
        { title: "vLLM documentation", url: "https://docs.vllm.ai/en/latest/", versionSensitive: true },
        { title: "Amazon Bedrock documentation", url: "https://docs.aws.amazon.com/bedrock/", versionSensitive: true },
        { title: "Google Cloud Vertex AI documentation", url: "https://cloud.google.com/vertex-ai/docs", versionSensitive: true },
      ],
      lastReviewed: REVIEWED,
    }),
  ],
};
