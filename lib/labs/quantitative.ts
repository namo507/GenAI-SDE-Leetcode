import type { LabDefinition } from "./types";

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const compare = (a: number, b: number) => Math.abs(a - b) < 1e-10 ? 0 : a > b ? 1 : -1;

function integerIn(value: number, min: number, max: number, name: string) {
  if (!Number.isInteger(value) || value < min || value > max) throw new RangeError(`${name} must be an integer from ${min} to ${max}.`);
}

/** Count array-value reads, not elapsed time or every CPU instruction. */
export function calculateWindowWork(n: number, width: number) {
  integerIn(n, 1, 64, "Array length");
  integerIn(width, 1, n, "Window width");
  const values = Array.from({ length: n }, (_, i) => i % 7 + 1);
  let total = values.slice(0, width).reduce((sum, value) => sum + value, 0);
  const windows = [{ start: 0, end: width - 1, outgoing: null as number | null, incoming: values.slice(0, width).join(", "), sum: total }];
  for (let start = 1; start <= n - width; start++) {
    const outgoing = values[start - 1]!;
    const incoming = values[start + width - 1]!;
    total += incoming - outgoing;
    windows.push({ start, end: start + width - 1, outgoing, incoming: String(incoming), sum: total });
  }
  return { values, windows, rescanningReads: (n - width + 1) * width, rollingReads: width + 2 * (n - width) };
}

const facts = [
  { id: "o1", customer: "c1", amount: 10 },
  { id: "o2", customer: "c1", amount: 20 },
  { id: "o3", customer: "c2", amount: 30 },
  { id: "o4", customer: "c3", amount: 40 },
  { id: "o5", customer: null, amount: 50 },
  { id: "o6", customer: "unknown", amount: 60 },
] as const;

/** An equality join: SQL NULL never matches NULL under ordinary '='. */
export function calculateJoinFanout(copies: number, includeC3: boolean, leftJoin: boolean) {
  integerIn(copies, 1, 4, "c1 dimension copies");
  const dimension: { id: string; key: string | null }[] = [
    ...Array.from({ length: copies }, (_, i) => ({ id: `d-c1-${i + 1}`, key: "c1" })),
    { id: "d-c2", key: "c2" },
    ...(includeC3 ? [{ id: "d-c3", key: "c3" }] : []),
    { id: "d-null", key: null },
  ];
  const rows: { order: string; key: string | null; dimension: string | null; amount: number }[] = [];
  for (const fact of facts) {
    const matches = dimension.filter((row) => fact.customer !== null && row.key !== null && fact.customer === row.key);
    if (matches.length) {
      for (const match of matches) rows.push({ order: fact.id, key: fact.customer, dimension: match.id, amount: fact.amount });
    } else if (leftJoin) rows.push({ order: fact.id, key: fact.customer, dimension: null, amount: fact.amount });
  }
  return {
    rows,
    countStar: rows.length,
    countDimensionId: rows.filter((row) => row.dimension !== null).length,
    distinctOrders: new Set(rows.map((row) => row.order)).size,
    sourceTotal: facts.reduce((sum, fact) => sum + fact.amount, 0),
    joinedTotal: rows.reduce((sum, row) => sum + row.amount, 0),
  };
}

/** Expected counts for 10,000 items; these are assumed rates, not random draws. */
export function calculateBayes(prevalence: number, sensitivity: number, specificity: number) {
  integerIn(prevalence, 1, 50, "Base rate percent");
  integerIn(sensitivity, 50, 100, "Sensitivity percent");
  integerIn(specificity, 80, 100, "Specificity percent");
  const positive = 100 * prevalence;
  const negative = 10_000 - positive;
  const truePositive = positive * sensitivity / 100;
  const falseNegative = positive - truePositive;
  const trueNegative = negative * specificity / 100;
  const falsePositive = negative - trueNegative;
  const flagged = truePositive + falsePositive;
  return { positive, negative, truePositive, falsePositive, trueNegative, falseNegative, flagged, posterior: truePositive / flagged };
}

/** Two observational cohorts of 1,000 visitors per variant, with explicit weights. */
export function calculateSimpson(aEasyShare: number, bEasyShare: number, bAdvantage: number) {
  integerIn(aEasyShare, 10, 90, "A easy-cohort percent");
  integerIn(bEasyShare, 10, 90, "B easy-cohort percent");
  integerIn(bAdvantage, 0, 20, "B within-cohort advantage");
  const aEasy = 10 * aEasyShare;
  const bEasy = 10 * bEasyShare;
  const aHard = 1000 - aEasy;
  const bHard = 1000 - bEasy;
  const rows = [
    { variant: "A", cohort: "Easy", visitors: aEasy, conversions: aEasy * 0.8, rate: 0.8 },
    { variant: "A", cohort: "Hard", visitors: aHard, conversions: aHard * 0.3, rate: 0.3 },
    { variant: "B", cohort: "Easy", visitors: bEasy, conversions: bEasy * (80 + bAdvantage) / 100, rate: (80 + bAdvantage) / 100 },
    { variant: "B", cohort: "Hard", visitors: bHard, conversions: bHard * (30 + bAdvantage) / 100, rate: (30 + bAdvantage) / 100 },
  ];
  const aPooled = (rows[0]!.conversions + rows[1]!.conversions) / 1000;
  const bPooled = (rows[2]!.conversions + rows[3]!.conversions) / 1000;
  const aStandardized = 0.5 * rows[0]!.rate + 0.5 * rows[1]!.rate;
  const bStandardized = 0.5 * rows[2]!.rate + 0.5 * rows[3]!.rate;
  return { rows, aPooled, bPooled, aStandardized, bStandardized, reversal: bAdvantage > 0 && aPooled > bPooled };
}

export const classificationFixture = [
  { id: "r1", score: 95, label: 1 }, { id: "r2", score: 85, label: 1 },
  { id: "r3", score: 80, label: 0 }, { id: "r4", score: 70, label: 1 },
  { id: "r5", score: 60, label: 0 }, { id: "r6", score: 55, label: 1 },
  { id: "r7", score: 40, label: 0 }, { id: "r8", score: 30, label: 1 },
  { id: "r9", score: 20, label: 0 }, { id: "r10", score: 10, label: 0 },
] as const;

/** A fixed labelled sample; score >= threshold is the positive decision rule. */
export function calculateThreshold(threshold: number, falsePositiveCost: number, falseNegativeCost: number) {
  integerIn(threshold, 5, 100, "Threshold percent");
  integerIn(falsePositiveCost, 1, 10, "False-positive cost");
  integerIn(falseNegativeCost, 1, 10, "False-negative cost");
  let tp = 0; let fp = 0; let tn = 0; let fn = 0;
  const rows = classificationFixture.map((row) => {
    const prediction = row.score >= threshold ? 1 : 0;
    const outcome = prediction ? row.label ? "True positive" : "False positive" : row.label ? "False negative" : "True negative";
    if (prediction && row.label) tp++;
    else if (prediction) fp++;
    else if (row.label) fn++;
    else tn++;
    return { ...row, prediction, outcome };
  });
  const fpCost = fp * falsePositiveCost;
  const fnCost = fn * falseNegativeCost;
  return { rows, tp, fp, tn, fn, precision: tp + fp ? tp / (tp + fp) : null, recall: tp / (tp + fn), accuracy: (tp + tn) / rows.length, fpCost, fnCost, totalCost: fpCost + fnCost };
}

const windowLab: LabDefinition = {
  id: "window-cost",
  title: "Slide the window, count the work",
  domain: "dsa",
  roles: ["sde", "ml-engineer", "data-engineer", "genai-engineer"],
  minutes: 12,
  summary: "Change the array and window sizes. Predict when reusing a sum saves array reads, inspect every window, and find the small-window counterexample.",
  topicIds: ["w03-d02-sliding-window", "w01-d02-big-o-complexity", "w03-d03-prefix-sums-intervals"],
  controls: [
    { key: "n", label: "Array length", min: 8, max: 64, step: 8, defaultValue: 16, unit: "values", help: "The input repeats the values 1 through 7. The length is at least the largest allowed window." },
    { key: "width", label: "Window width", min: 1, max: 8, step: 1, defaultValue: 4, unit: "values", help: "Every complete window moves right by one position. There are n - k + 1 windows." },
  ],
  presets: [
    { id: "overlap", label: "Overlapping work", description: "A wide window rereads many of the same values.", values: { n: 64, width: 8 } },
    { id: "one-value", label: "Counterexample: width one", description: "A generic remove-and-add loop can read more values than direct inspection.", values: { n: 16, width: 1 } },
    { id: "whole-array", label: "Just one window", description: "When the window spans the entire input, both approaches read it once.", values: { n: 8, width: 8 } },
  ],
  evaluate: (p) => {
    const r = calculateWindowWork(p.n!, p.width!);
    return {
      metrics: [
        { label: "Complete windows", value: r.windows.length, detail: "n - k + 1. Partial windows are excluded." },
        { label: "Rescanning reads", value: r.rescanningReads, unit: "array reads", detail: "Read k values separately for every window." },
        { label: "Rolling reads", value: r.rollingReads, unit: "array reads", detail: "Read the first k values, then one outgoing and one incoming value per move." },
      ],
      bars: { title: "Array-value reads for the same window sums", unit: "reads", items: [{ label: "Rescan", value: r.rescanningReads }, { label: "Reuse sum", value: r.rollingReads }] },
      table: { caption: "Every complete window, using zero-based indices", columns: ["Window indices", "Value removed", "Value added", "Sum"], rows: r.windows.map((w) => [`${w.start} to ${w.end}`, w.outgoing ?? "None", w.incoming, w.sum]) },
      steps: ["Generate the repeating input 1, 2, 3, 4, 5, 6, 7, 1, and so on.", `Read ${p.width} values to form the first sum.`, "Move one place: subtract the departing value and add the arriving value.", `Stop after ${r.windows.length} complete windows. The two methods produce identical sums; this experiment compares their read counts.`],
      insight: compare(r.rescanningReads, r.rollingReads) > 0 ? "Overlapping windows reward reuse. The rolling implementation reads fewer array values here." : compare(r.rescanningReads, r.rollingReads) < 0 ? "Width one is a useful counterexample: direct inspection needs one read per value, while this generic rolling implementation reads departing values again." : "The read counts tie here. An asymptotic bound does not promise a strict improvement for every input size and parameter.",
    };
  },
  predict: (p) => {
    const r = calculateWindowWork(p.n!, p.width!);
    return { prompt: "Which implementation reads fewer array values with these settings?", choices: ["Rescan each window", "Reuse the rolling sum", "They read the same number"], correctIndex: r.rescanningReads === r.rollingReads ? 2 : r.rescanningReads < r.rollingReads ? 0 : 1, explanation: `Rescanning reads (${p.n} - ${p.width} + 1) × ${p.width} = ${r.rescanningReads}. Rolling reads ${p.width} + 2 × (${p.n} - ${p.width}) = ${r.rollingReads}. These are array reads, not benchmark timings.` };
  },
  eli5: {
    analogy: "Put a little picture frame over a row of numbered toy blocks. To know the total inside it, you can count every block again. Or remember the old total, take away the block that left, and add the block that entered.",
    steps: ["Count the blocks inside the first frame.", "Slide the frame one place.", "Subtract the old left block. Add the new right block.", "Keep going until the frame reaches the last full group."],
    limit: "A computer still has to read the departing and arriving numbers. With a one-block frame, remembering and updating can do more work than simply reading that block. This sum trick also does not directly maintain a maximum; a maximum may need a monotonic deque.",
  },
  senior: {
    principle: "Maintain the invariant that the running sum equals the sum of exactly the current k-element interval.",
    assumptions: ["The input is random-access, k is valid, and every window advances one position.", "The operation being reused is an invertible sum. We count array-value reads with the stated implementations, excluding comparisons and writes.", "Arithmetic is exact for these small integers; very long floating-point streams can accumulate rounding error."],
    mechanism: ["The naive read count is (n - k + 1)k. Initialize the rolling sum with k reads, then spend two reads for each of n - k moves.", "The rolling algorithm is O(n) time and O(1) extra space when only the running sum is retained. This visualization retains all outputs, which takes O(n - k + 1) space.", "If k is fixed independently of n, rescanning is also O(n). If k grows near n/2, rescanning is quadratic; if k=n there is only one window and both are linear."],
    tradeoffs: ["A rolling sum is suitable for one sequential pass; prefix sums spend O(n) storage to answer arbitrary interval-sum queries in O(1).", "Special-case width one when simplicity or constant factors matter. Compare measured time on the real workload before making performance claims."],
    failureModes: ["Using n-k instead of n-k+1 drops the last window.", "Adding the incoming value without removing the outgoing value changes the invariant.", "Assuming the same subtraction trick maintains every aggregate, or calling all nested loops quadratic without examining k."],
    interviewAnswer: "I first state that my running total covers exactly the current k values. After initializing once, each step removes one outgoing value and adds one incoming value, giving O(n) time and O(1) auxiliary state. The exact benefit depends on k: width one needs no elaborate update, and k=n creates only one window. Prefix sums are a better trade when many arbitrary range queries follow.",
  },
  challenges: [
    { id: "window-last", prompt: "An array has 10 elements and the window width is 4. How many complete windows exist?", choices: ["6", "7", "10"], correctIndex: 1, explanation: "The starting indices are 0 through 6 inclusive: 10 - 4 + 1 = 7.", hint: "Include the window whose right edge is the final array element." },
    { id: "window-max", prompt: "Can you maintain a window maximum by subtracting the outgoing maximum and adding the incoming value?", choices: ["Yes, every aggregate is invertible", "No, a maximum does not retain the next-largest candidate", "Only when the input is sorted randomly"], correctIndex: 1, explanation: "A maximum discards information about other candidates. A monotonic deque can preserve the relevant candidates for a sliding maximum; subtraction is a sum-specific mechanism.", hint: "Imagine the outgoing element was the largest. What tells you the new largest?" },
  ],
  transfer: { prompt: "Your service computes a 60-event moving total for millions of events. Explain the invariant, algorithm and limits before writing code.", checklist: ["State the exact window boundaries and warm-up behavior", "Initialize once; remove outgoing and add incoming", "Distinguish O(1) algorithm state from the buffer needed for a stream", "Discuss floating-point drift and out-of-order events"], sampleAnswer: "For each full 60-event interval, my total equals exactly the values inside that interval. I initialize the first sum, then subtract the evicted value and add the arriving value. That is constant update work, but a real stream needs a 60-value buffer unless departures are supplied externally. I would define warm-up, ordering and numeric precision rather than silently applying this event-count window to event-time data." },
  references: [{ title: "MIT 6.006: rolling-window hashing and initialization cost", url: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/6dc78f0c2cabbd8c5243433ed43dd1ad_MIT6_006F11_rec10.pdf" }],
};

const joinLab: LabDefinition = {
  id: "join-fanout", title: "Catch the join that changes your metric", domain: "sql",
  roles: ["sde", "data-scientist", "data-analyst", "ml-engineer", "data-engineer", "genai-engineer"], minutes: 14,
  summary: "Inspect an equality join row by row. Duplicate dimension keys inflate sums, missing keys change coverage, and COUNT(*) does not mean COUNT of matched rows.",
  topicIds: ["w02-d01-joins-and-keys", "w02-d01-sql-query-order", "w06-d01-data-quality-eda"],
  controls: [
    { key: "copies", label: "Dimension rows with key c1", min: 1, max: 4, step: 1, defaultValue: 2, unit: "rows", help: "Orders o1 and o2 both have customer c1. Every duplicate dimension row creates another matching joined row." },
    { key: "includeC3", label: "Customer c3 dimension row", min: 0, max: 1, step: 1, defaultValue: 1, help: "Removing c3 creates another unmatched order.", options: [{ value: 0, label: "Missing" }, { value: 1, label: "Present" }] },
    { key: "leftJoin", label: "Join type", min: 0, max: 1, step: 1, defaultValue: 1, help: "Join condition: orders.customer_id = customers.customer_id. NULL equality does not evaluate to true.", options: [{ value: 0, label: "Inner join" }, { value: 1, label: "Left join" }] },
  ],
  presets: [
    { id: "fanout", label: "Duplicate key", description: "A left join keeps missing orders but doubles the c1 matches.", values: { copies: 2, includeC3: 1, leftJoin: 1 } },
    { id: "safe-grain", label: "Counterexample: unique keys", description: "A unique right key preserves the left fact grain, even with unmatched keys.", values: { copies: 1, includeC3: 1, leftJoin: 1 } },
    { id: "coverage", label: "Dropped coverage", description: "An inner join excludes NULL, unknown and missing c3 keys.", values: { copies: 1, includeC3: 0, leftJoin: 0 } },
  ],
  evaluate: (p) => {
    const r = calculateJoinFanout(p.copies!, Boolean(p.includeC3), Boolean(p.leftJoin));
    return {
      metrics: [
        { label: "COUNT(*)", value: r.countStar, unit: "joined rows", detail: "Includes null-extended rows from a left join." },
        { label: "COUNT(dimension.id)", value: r.countDimensionId, unit: "matched rows", detail: "Counts non-NULL right-side IDs. A right-side NULL-key row never matches this equality condition." },
        { label: "SUM(order.amount)", value: r.joinedTotal, unit: "hypothetical units", detail: `The six source orders total ${r.sourceTotal}. A join may repeat or drop their values.` },
        { label: "Distinct source orders retained", value: r.distinctOrders, unit: "of 6 orders", detail: "Distinct order IDs measure coverage but do not repair a duplicated sum." },
      ],
      bars: { title: "Fact amount before and after the join", unit: "hypothetical units", items: [{ label: "Six source orders", value: r.sourceTotal }, { label: "Joined sum", value: r.joinedTotal }] },
      table: { caption: "Every joined row; source orders o1..o6 have amounts 10,20,30,40,50,60", columns: ["Order", "Source customer key", "Matched dimension ID", "Order amount"], rows: r.rows.map((row) => [row.order, row.key ?? "NULL", row.dimension ?? "NULL (no match)", row.amount]) },
      steps: ["Start with six orders: c1, c1, c2, c3, NULL and unknown. Their amounts total 210.", `For each c1 order, the equality condition finds ${p.copies} matching dimension rows.`, `A ${p.leftJoin ? "left" : "inner"} join ${p.leftJoin ? "keeps each unmatched order once, with NULL right-side fields" : "drops every unmatched order"}. The dimension's own NULL key does not match the order's NULL key.`, `Aggregate the actual result: ${r.countStar} rows, ${r.countDimensionId} non-NULL dimension IDs, and amount ${r.joinedTotal}.`],
      insight: r.joinedTotal > r.sourceTotal ? "The left fact values were repeated by a nonunique right key. Counting distinct order IDs alone would hide the inflation in SUM(amount)." : r.joinedTotal < r.sourceTotal ? "The inner join removed part of the source population. Even a unique dimension key does not guarantee complete fact coverage." : "The total is preserved in this setting. The reason is the unique right key plus left-join coverage, not a general guarantee that joins preserve measures.",
    };
  },
  predict: (p) => {
    const r = calculateJoinFanout(p.copies!, Boolean(p.includeC3), Boolean(p.leftJoin));
    return { prompt: "Compared with the source order total of 210, what will SUM(order.amount) return after this join?", choices: ["The same total", "A higher total", "A lower total"], correctIndex: compare(r.joinedTotal, 210) > 0 ? 1 : compare(r.joinedTotal, 210) < 0 ? 2 : 0, explanation: `The joined sum is ${r.joinedTotal}. Each c1 order appears ${p.copies} time(s), while ${p.leftJoin ? "the left join retains unmatched orders with NULL right-side IDs" : "the inner join drops orders without a true equality match"}. Row grain and coverage explain the result.` };
  },
  eli5: { analogy: "You have six lunch tickets. To add each child's classroom, you look up a class list. If one child appears twice on the list, you accidentally photocopy that child's ticket twice before counting lunch money.", steps: ["Keep the original tickets and their total nearby.", "Make one result ticket for every matching class-list entry.", "Decide whether tickets with no matching name stay or disappear.", "Count result tickets, matched names and money separately."], limit: "SQL follows exact equality and NULL rules, not human name recognition. Two unknown names do not become a true match just because both are missing. A real database may use many physical join algorithms, but they must preserve the query's logical row semantics." },
  senior: {
    principle: "A join changes row multiplicity according to key cardinality. State the fact grain, right-key uniqueness and unmatched-key policy before aggregating.",
    assumptions: ["This is an ordinary SQL equality join. Each source order ID is unique and amount is non-NULL.", "The dimension has stable non-NULL row IDs, although one key value is NULL. NULL = NULL is not true.", "The calculator implements logical join semantics, not a database planner or physical performance benchmark."],
    mechanism: ["Each left row with m matching right rows emits m rows. A left join emits one null-extended row when m=0; an inner join emits none.", "COUNT(*) counts result rows; COUNT(right.id) counts non-NULL right IDs. SUM(left.amount) repeats each amount m times for matched rows.", "A unique right key prevents fan-out. Validate source coverage independently; preaggregate or deduplicate according to a justified business rule before joining."],
    tradeoffs: ["A left join preserves unmatched facts but requires an explicit missing-dimension category or remediation policy. An inner join may be correct for a restricted population if the restriction is intentional.", "COUNT(DISTINCT order_id) answers a coverage question. SUM(DISTINCT amount) is not a generic fix: two different orders can legitimately have the same amount."],
    failureModes: ["Summing a measure after a one-to-many join and reporting it at the original grain.", "Using COUNT(right.id) as the number of all retained left facts.", "Moving a right-side filter from ON into WHERE and removing null-extended rows.", "Keeping an arbitrary duplicate without checking which dimension version is valid as of the fact timestamp."],
    interviewAnswer: "I define the left grain as one row per order, then check whether the right join key is unique and whether every fact has a match. Duplicate dimension keys repeat fact measures, while inner joins remove unmatched facts. I reconcile source and result counts and sums, and distinguish COUNT(*) from COUNT of a nullable right-side ID. I fix the cardinality or as-of logic rather than hiding fan-out with SUM(DISTINCT amount).",
  },
  challenges: [
    { id: "join-count-null", prompt: "A left join retains one order with no matching customer. What does that row contribute to COUNT(*) and COUNT(customer.id)?", choices: ["One and one", "One and zero", "Zero and zero"], correctIndex: 1, explanation: "The null-extended result row exists, so COUNT(*) includes it. Its right-side ID is NULL, so COUNT(customer.id) excludes it.", hint: "Separate the existence of a result row from the value in a particular column." },
    { id: "join-distinct-sum", prompt: "Two valid orders both cost 10. Is SUM(DISTINCT amount) a safe general repair for join duplication?", choices: ["Yes, DISTINCT always restores the fact grain", "No, it would collapse different orders that share an amount", "Yes, if COUNT(*) is large"], correctIndex: 1, explanation: "DISTINCT operates on the amount value, not the order identity. Fix the join grain or aggregate at the correct key before summing.", hint: "Which identity does DISTINCT use in that expression?" },
  ],
  transfer: { prompt: "A revenue dashboard jumps after a customer-dimension join. Explain the investigation and a durable fix.", checklist: ["Name source and desired result grain", "Check right-key uniqueness and version validity", "Reconcile counts, coverage and sums", "Fix business-key or temporal join semantics before aggregating"], sampleAnswer: "I compare revenue before and after the join at the order grain, then inspect the number of right-side matches for each order. I would check duplicate customer keys, effective-date overlaps and unmatched IDs. If this is SCD2 data, I use the valid version at the order timestamp and enforce nonoverlapping intervals. Distinct order counts help diagnose coverage, but they do not repair duplicated revenue." },
  references: [{ title: "PostgreSQL documentation: aggregate COUNT and NULL behavior", url: "https://www.postgresql.org/docs/current/functions-aggregate.html" }, { title: "PostgreSQL documentation: joined tables and outer joins", url: "https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-JOIN" }],
};

const bayesLab: LabDefinition = {
  id: "bayes-base-rates", title: "See Bayes' rule in 10,000 items", domain: "statistics",
  roles: ["data-scientist", "data-analyst", "ml-engineer", "genai-engineer"], minutes: 12,
  summary: "Build a four-cell natural-frequency table. Change the base rate and detector quality, then see why a sensitive detector can still produce mostly false alarms.",
  topicIds: ["w05-d01-probability-distributions", "w05-d04-bayesian-ab", "w07-d03-classification-metrics"],
  controls: [
    { key: "prevalence", label: "Actual positive base rate", min: 1, max: 50, step: 1, defaultValue: 1, unit: "%", help: "The percentage of 10,000 manufactured items that truly have the target defect. This is a quality-control teaching example." },
    { key: "sensitivity", label: "Sensitivity", min: 50, max: 100, step: 5, defaultValue: 90, unit: "%", help: "P(flagged | truly positive): the detector catches this share of defective items." },
    { key: "specificity", label: "Specificity", min: 80, max: 100, step: 1, defaultValue: 95, unit: "%", help: "P(not flagged | truly negative). The false-positive rate is 100% minus specificity." },
  ],
  presets: [
    { id: "rare", label: "Rare defect", description: "A 90% sensitive detector can still have mostly false alarms.", values: { prevalence: 1, sensitivity: 90, specificity: 95 } },
    { id: "common", label: "Change only the base rate", description: "The same detector screens a population where the target is common.", values: { prevalence: 30, sensitivity: 90, specificity: 95 } },
    { id: "no-false-alarms", label: "Counterexample: no false alarms", description: "Under the assumed model, perfect specificity makes every flag a true positive.", values: { prevalence: 1, sensitivity: 90, specificity: 100 } },
  ],
  evaluate: (p) => {
    const r = calculateBayes(p.prevalence!, p.sensitivity!, p.specificity!);
    return {
      metrics: [
        { label: "True positives among flags", value: percent(r.posterior), detail: `${r.truePositive} true positives / ${r.flagged} flagged items. This reverses the condition used by sensitivity.` },
        { label: "True positive flags", value: r.truePositive, unit: "items", detail: `${r.positive} actual positives × ${p.sensitivity}% sensitivity.` },
        { label: "False positive flags", value: r.falsePositive, unit: "items", detail: `${r.negative} actual negatives × ${100 - p.specificity!}% false-positive rate.` },
      ],
      bars: { title: "Who is in the flagged group?", unit: "expected items", items: [{ label: "True positives", value: r.truePositive }, { label: "False positives", value: r.falsePositive }] },
      table: { caption: "Expected natural frequencies out of 10,000 items, not a random simulation", columns: ["Actual status", "Flagged", "Not flagged", "Total"], rows: [["Positive", r.truePositive, r.falseNegative, r.positive], ["Negative", r.falsePositive, r.trueNegative, r.negative], ["Total", r.flagged, r.falseNegative + r.trueNegative, 10_000]] },
      steps: [`Split 10,000 items into ${r.positive} true positives and ${r.negative} true negatives using the base rate.`, `Sensitivity flags ${r.truePositive} actual positives; ${r.falseNegative} are missed.`, `The false-positive rate flags ${r.falsePositive} actual negatives, even though the defect is absent.`, `Condition on the ${r.flagged} flagged items: ${r.truePositive} / ${r.flagged} = ${percent(r.posterior)} are truly positive.`],
      insight: r.posterior < 0.5 ? "There are more false alarms than true detections among the flags. A large negative population can outweigh a good sensitivity." : "Most flags are true positives under these assumed rates. That conclusion depends on the target population's base rate and detector behavior.",
    };
  },
  predict: (p) => {
    const r = calculateBayes(p.prevalence!, p.sensitivity!, p.specificity!);
    const relation = compare(r.truePositive, r.falsePositive);
    return { prompt: "Among the flagged items, are true positives or false positives more numerous?", choices: ["True positives", "False positives", "They are equally numerous"], correctIndex: relation > 0 ? 0 : relation < 0 ? 1 : 2, explanation: `The detector flags ${r.truePositive} truly positive items and ${r.falsePositive} truly negative items. The desired fraction is ${r.truePositive} / (${r.truePositive} + ${r.falsePositive}) = ${percent(r.posterior)}, not simply the ${p.sensitivity}% sensitivity.` };
  },
  eli5: { analogy: "A toy inspector puts red stickers on blocks that might be cracked. Imagine a huge pile of good blocks and a tiny pile of cracked ones. Even a small mistake rate on the huge good pile can create lots of wrong red stickers.", steps: ["Count how many blocks are really cracked before inspecting.", "Put correct red stickers on the cracked pile.", "Put mistaken red stickers on the much larger good pile.", "Look only at red-sticker blocks and count which pile they came from."], limit: "The table is an expected count built from assumed rates. A real batch is random, the detector can behave differently after a process change, and not knowing a block's truth makes sensitivity and specificity harder to measure. A high score alone does not prove the target is present." },
  senior: {
    principle: "Reverse a conditional probability with Bayes' rule: P(T|+) = sensitivity × prevalence / [sensitivity × prevalence + (1-specificity) × (1-prevalence)].",
    assumptions: ["The target is binary, the flag is binary, and the rates apply to the same target population.", "Sensitivity and specificity are treated as known constants. This lab does not estimate uncertainty in those rates or simulate independent draws.", "The 10,000-item denominator only makes the probability arithmetic visible; it adds no empirical evidence."],
    mechanism: ["Partition the population by actual status before applying the detector's conditional rates.", "The flagged denominator combines two paths: true positives and false positives. Divide the true-positive path by their sum.", "A prevalence shift changes precision even if sensitivity and specificity stay fixed. It can also invalidate those fixed-rate assumptions in real systems."],
    tradeoffs: ["Natural frequencies make denominators concrete; algebra generalizes to arbitrary populations and continuous evidence.", "Increasing specificity usually reduces false-positive burden, but a real detector's sensitivity/specificity trade-off depends on its threshold and score distributions. These controls vary rates independently only as a teaching model."],
    failureModes: ["Confusing P(flag | target) with P(target | flag).", "Ignoring base-rate change when deploying a detector in a new population.", "Treating the expected counts as a measured validation dataset or a certainty about an individual item."],
    interviewAnswer: "I write down which condition is on the right of the probability before calculating. Sensitivity describes flags among true positives; the question about a flagged item needs true positives divided by all flags. I combine the positive path with the false-positive path using the base rate. Under a population shift, precision changes and I recheck whether the detector's conditional rates still apply.",
  },
  challenges: [
    { id: "bayes-condition", prompt: "Sensitivity is 90%. Does that alone determine the share of flags that are true positives?", choices: ["Yes, it is always 90%", "No, the base rate and false-positive rate are also needed", "Only the number of flags is needed"], correctIndex: 1, explanation: "Sensitivity conditions on actual positives. Precision conditions on flags, which include false positives from the negative population.", hint: "Draw two paths into the flagged group." },
    { id: "bayes-shift", prompt: "Hold sensitivity and specificity fixed below 100%. What usually happens to precision when the target becomes rarer?", choices: ["It decreases", "It must increase", "It stays fixed because sensitivity is fixed"], correctIndex: 0, explanation: "For positive sensitivity and a nonzero false-positive rate, lowering prevalence reduces the true-positive share of flags. The exception of zero false positives is intentionally shown by a preset.", hint: "Compare the size of the positive pile with the negative pile." },
  ],
  transfer: { prompt: "A fraud alert model is moved from an enriched evaluation set to normal traffic. Why could its alert precision fall without a coding bug?", checklist: ["Distinguish prevalence, sensitivity and precision", "Use the deployment population's base rate", "Count true and false alerts in a shared denominator", "Recheck rate stability, label delay and uncertainty"], sampleAnswer: "An enriched evaluation set has more true fraud than ordinary traffic. Even at the same true-positive and false-positive rates, normal traffic can produce many more false alerts relative to true alerts, reducing precision. I would estimate rates and prevalence for the deployment population, account for delayed labels and uncertainty, and size the review queue using the resulting alert volume. I would also check whether the feature distribution changed enough to alter those conditional rates." },
  references: [{ title: "MIT probability lecture: conditional probability and Bayes' rule", url: "https://ocw.mit.edu/courses/18-440-probability-and-random-variables-spring-2014/12910b423f3a2710f90fbfeabd5c6b2b_MIT18_440S14_Lecture16.pdf" }, { title: "ProbabilityCourse textbook: Bayes' rule and total probability", url: "https://www.probabilitycourse.com/chapter1/1_4_3_bayes_rule.php" }],
};

const simpsonLab: LabDefinition = {
  id: "simpsons-paradox", title: "Find the audience hidden inside an average", domain: "analytics",
  roles: ["data-analyst", "data-scientist", "ml-engineer", "data-engineer"], minutes: 15,
  summary: "Move the audience mix while keeping cohort rates explicit. Make a variant win within both cohorts yet lose overall, then separate descriptive standardization from causal evidence.",
  topicIds: ["w06-d02-metrics-funnels", "w06-d03-cohort-retention", "w08-d04-causal-identification"],
  controls: [
    { key: "aEasy", label: "A visitors from the easy cohort", min: 10, max: 90, step: 10, defaultValue: 90, unit: "%", help: "A has 1,000 visitors. Easy-cohort conversion is 80%; hard-cohort conversion is 30%." },
    { key: "bEasy", label: "B visitors from the easy cohort", min: 10, max: 90, step: 10, defaultValue: 10, unit: "%", help: "B also has 1,000 visitors. Different audience weights can change its overall rate." },
    { key: "advantage", label: "B advantage within each cohort", min: 0, max: 20, step: 5, defaultValue: 10, unit: "percentage points", help: "Add this many percentage points to both of A's cohort rates. At 10 points, B has 90% and 40%." },
  ],
  presets: [
    { id: "reversal", label: "Simpson reversal", description: "B wins both cohorts, but A gets many more easy-cohort visitors.", values: { aEasy: 90, bEasy: 10, advantage: 10 } },
    { id: "same-mix", label: "Counterexample: same audience mix", description: "Equal weights remove the pooled reversal in this example.", values: { aEasy: 50, bEasy: 50, advantage: 10 } },
    { id: "no-effect", label: "Same subgroup rates", description: "A pooled gap can exist even with no within-cohort rate difference.", values: { aEasy: 90, bEasy: 10, advantage: 0 } },
  ],
  evaluate: (p) => {
    const r = calculateSimpson(p.aEasy!, p.bEasy!, p.advantage!);
    return {
      metrics: [
        { label: "A pooled conversion", value: percent(r.aPooled), detail: "A's total conversions divided by its 1,000 visitors, using A's observed mix." },
        { label: "B pooled conversion", value: percent(r.bPooled), detail: "B's total conversions divided by its 1,000 visitors, using B's observed mix." },
        { label: "B minus A at a common 50/50 mix", value: `${((r.bStandardized - r.aStandardized) * 100).toFixed(1)} pp`, detail: "A descriptive standardization to the same chosen cohort weights, not automatically a causal effect." },
      ],
      bars: { title: "Observed pooled rates versus a common cohort mix", unit: "percent conversion", items: [{ label: "A observed mix", value: r.aPooled * 100 }, { label: "B observed mix", value: r.bPooled * 100 }, { label: "A at 50/50", value: r.aStandardized * 100 }, { label: "B at 50/50", value: r.bStandardized * 100 }] },
      table: { caption: "All cohort denominators and expected conversions; 1,000 visitors per variant", columns: ["Variant", "Cohort", "Visitors", "Conversions", "Conversion rate"], rows: r.rows.map((row) => [row.variant, row.cohort, row.visitors, row.conversions, percent(row.rate)]) },
      steps: ["Keep the two cohort conversion rates separate before combining rows.", `A's easy-cohort weight is ${p.aEasy}%; B's is ${p.bEasy}%. Each pooled rate uses its own weights.`, "Multiply each cohort rate by that cohort's visitor count, add conversions, then divide by the variant's total visitors.", "For a descriptive like-for-like comparison, choose the same target weights for both variants. Whether adjustment estimates a causal effect depends on the data-generating process."],
      insight: r.reversal ? "The direction reverses: B has a higher rate within both cohorts, but A has the higher pooled rate because it received more easy-cohort visitors." : p.advantage === 0 ? "There is no within-cohort advantage. Any pooled gap here is explained by different cohort weights, not a change in those subgroup rates." : "The pooled comparison currently agrees with the subgroup comparison. Simpson reversal is possible under different weights, not inevitable whenever groups are combined.",
    };
  },
  predict: (p) => {
    const r = calculateSimpson(p.aEasy!, p.bEasy!, p.advantage!);
    return { prompt: "Which variant has the higher observed pooled conversion rate with this audience mix?", choices: ["A", "B", "They tie"], correctIndex: compare(r.aPooled, r.bPooled) > 0 ? 0 : compare(r.aPooled, r.bPooled) < 0 ? 1 : 2, explanation: `A = ${p.aEasy}% × 80% + ${100 - p.aEasy!}% × 30% = ${percent(r.aPooled)}. B = ${p.bEasy}% × ${80 + p.advantage!}% + ${100 - p.bEasy!}% × ${30 + p.advantage!}% = ${percent(r.bPooled)}. The weights, as well as the subgroup rates, determine the pooled result.` };
  },
  eli5: { analogy: "Two children fill baskets from low and high shelves. The low shelf is easy to reach. One child gets mostly low shelves, while the other gets mostly high shelves. A single full-basket score can hide who did better at each shelf height.", steps: ["Compare low shelves with low shelves and high shelves with high shelves.", "Count how many tries each child had at each height.", "Combine successful tries using those counts, not by blindly averaging two percentages.", "Try giving both children the same mix of shelf heights and compare again."], limit: "Real audience groups may be causes, consequences or selection effects. Comparing within every group is not always the right causal adjustment. The shelf example explains weighted averages; it does not prove what caused a product's outcome." },
  senior: {
    principle: "An aggregate rate is a denominator-weighted average of subgroup rates. Different group weights can reverse an association seen within every subgroup.",
    assumptions: ["Cohorts are mutually exclusive and exhaustive, outcomes share a definition, and both cohorts have nonzero denominators.", "These are deterministic expected counts from an observational teaching fixture, not an A/B randomization or significance calculation.", "The common 50/50 target mix is an explicit descriptive estimand. Causal identification needs timing, assignment and a defensible graph or experimental design."],
    mechanism: ["Compute each pooled conversion rate as total conversions / total eligible visitors. Never average subgroup percentages without their denominators unless equal weights are the intended estimand.", "B's within-cohort rate advantage is held constant while each variant's audience weights change. The resulting aggregate gap can reverse sign.", "Standardization applies common target weights. Whether to adjust for cohort depends on whether it is a pre-treatment confounder, mediator, collider or an intentional population characteristic."],
    tradeoffs: ["Pooled rates answer what happened for the observed population; standardized rates answer a chosen common-mix comparison. Both can be useful if labelled.", "More segmentation can reveal composition but also creates small cells and multiple-comparison risks. Prespecify important cuts and quantify uncertainty in real data."],
    failureModes: ["Averaging percentages without checking their denominators.", "Treating a pooled reversal as proof of fraud or as proof of a causal effect.", "Always conditioning on every available segment, including post-treatment mediators or colliders.", "Comparing cohorts with changing eligibility or outcome windows."],
    interviewAnswer: "I decompose the overall rate into subgroup rates and subgroup weights. If the direction reverses, I check denominator definitions and composition before attributing it to product performance. I can standardize both variants to an explicit common population, but I need assignment and causal assumptions before interpreting that standardized gap as an effect. I would report the observed and target-population questions separately with uncertainty.",
  },
  challenges: [
    { id: "simpson-weights", prompt: "Two cohorts convert at 90% and 10%. Their visitor counts are 100 and 900. What is the pooled rate?", choices: ["50%", "18%", "80%"], correctIndex: 1, explanation: "There are 90 + 90 = 180 conversions among 1,000 visitors: 18%. The unweighted 50% average answers a different, equal-cohort-weight question.", hint: "Convert both percentages back to counts first." },
    { id: "simpson-adjustment", prompt: "Does Simpson's paradox mean you should always adjust for every segment?", choices: ["Yes, more adjustment is always less biased", "No, the correct adjustment depends on the causal process and target question", "No, you should always use only the pooled rate"], correctIndex: 1, explanation: "A pre-treatment confounder, a mediator and a collider play different roles. Statistical reversal alone cannot tell you which effect or population you should target.", hint: "Ask whether the segment existed before treatment or was affected by it." },
  ],
  transfer: { prompt: "A new onboarding design has lower overall activation but higher activation in every acquisition channel. How would you explain the result and decide what to investigate?", checklist: ["Check counts, eligibility and windows", "Decompose rate changes into within-channel performance and channel mix", "Specify a common target population if useful", "Inspect assignment and timing before making a causal claim"], sampleAnswer: "I would verify the activation definition and each channel denominator, then reconstruct the pooled rates from channel conversion counts. The new design may have received more visitors from low-activation channels. I would show both the observed-population result and a common-mix comparison, while checking whether assignment was randomized and whether channel was measured before treatment. A composition explanation does not by itself establish which design caused better activation." },
  references: [{ title: "Judea Pearl: Understanding Simpson's Paradox", url: "https://ftp.cs.ucla.edu/pub/stat_ser/r414.pdf" }],
};

const thresholdLab: LabDefinition = {
  id: "classification-threshold", title: "Move a threshold, pay for the mistakes", domain: "ml",
  roles: ["data-scientist", "ml-engineer", "data-analyst", "genai-engineer"], minutes: 14,
  summary: "Turn fixed scores into decisions, inspect every confusion-matrix outcome, and change the cost of false positives and false negatives without retraining a model.",
  topicIds: ["w07-d03-classification-metrics", "w07-d02-linear-logistic-regression", "w07-d01-splits-and-leakage"],
  controls: [
    { key: "threshold", label: "Positive decision threshold", min: 5, max: 100, step: 5, defaultValue: 50, unit: "% score", help: "Predict positive when score is greater than or equal to this threshold. The ten scores and true labels remain fixed." },
    { key: "fpCost", label: "Cost of a false positive", min: 1, max: 10, step: 1, defaultValue: 1, unit: "hypothetical units", help: "One cost per negative item incorrectly flagged. Correct decisions cost zero in this simplified model." },
    { key: "fnCost", label: "Cost of a false negative", min: 1, max: 10, step: 1, defaultValue: 5, unit: "hypothetical units", help: "One cost per positive item missed. These are configurable teaching values, not real business prices." },
  ],
  presets: [
    { id: "default", label: "The familiar 0.5 threshold", description: "A conventional threshold is not automatically the least costly policy.", values: { threshold: 50, fpCost: 1, fnCost: 5 } },
    { id: "catch-all", label: "Misses are expensive", description: "Lower the threshold and compare the added false alerts with the removed misses.", values: { threshold: 30, fpCost: 1, fnCost: 5 } },
    { id: "no-positive", label: "Counterexample: predict none", description: "Precision is undefined when there are no positive predictions.", values: { threshold: 100, fpCost: 1, fnCost: 5 } },
    { id: "alerts-expensive", label: "False alerts are expensive", description: "Changing the costs can change which decision policy you prefer.", values: { threshold: 85, fpCost: 10, fnCost: 1 } },
  ],
  evaluate: (p) => {
    const r = calculateThreshold(p.threshold!, p.fpCost!, p.fnCost!);
    return {
      metrics: [
        { label: "Precision", value: r.precision === null ? "Undefined" : percent(r.precision), detail: r.precision === null ? "No items were predicted positive, so TP / (TP + FP) has a zero denominator." : `${r.tp} true positives / ${r.tp + r.fp} positive predictions.` },
        { label: "Recall", value: percent(r.recall), detail: `${r.tp} true positives / 5 actual positives.` },
        { label: "Accuracy", value: percent(r.accuracy), detail: `${r.tp + r.tn} correct decisions / 10 fixed labelled records.` },
        { label: "Total error cost", value: r.totalCost, unit: "hypothetical units", detail: `${r.fp} false positives × ${p.fpCost} + ${r.fn} false negatives × ${p.fnCost}. No real service is called.` },
      ],
      bars: { title: "Where the configured error cost comes from", unit: "hypothetical cost units", items: [{ label: "False-positive cost", value: r.fpCost }, { label: "False-negative cost", value: r.fnCost }] },
      table: { caption: "Every fixed record and its current decision; equality with the threshold predicts positive", columns: ["Record", "Score", "Actual label", "Prediction", "Outcome"], rows: r.rows.map((row) => [row.id, `${row.score}%`, row.label, row.prediction, row.outcome]) },
      steps: [`Keep the ten labelled scores fixed. Apply score ≥ ${p.threshold}% to each record.`, `Count TP=${r.tp}, FP=${r.fp}, FN=${r.fn}, TN=${r.tn}. These four counts must add to ten.`, "Precision conditions on predicted positives; recall conditions on actual positives. Their denominators answer different questions.", `Multiply each error count by its configured cost: ${r.fpCost} + ${r.fnCost} = ${r.totalCost}. Use a separate validation set to choose a policy in a real deployment.`],
      insight: r.precision === null ? "Predicting no positives does not demonstrate perfect precision. Precision has no defined value at this operating point, while all five positives are missed." : "Moving the threshold changes decisions and costs without changing any model score. A lower threshold cannot reduce recall on this fixed sample, but it can add false positives.",
    };
  },
  predict: (p) => {
    const r = calculateThreshold(p.threshold!, p.fpCost!, p.fnCost!);
    const relation = compare(r.fpCost, r.fnCost);
    return { prompt: "Which error type contributes more total cost at the current threshold and costs?", choices: ["False positives", "False negatives", "They contribute the same cost"], correctIndex: relation > 0 ? 0 : relation < 0 ? 1 : 2, explanation: `There are ${r.fp} false positives costing ${r.fp} × ${p.fpCost} = ${r.fpCost}, and ${r.fn} false negatives costing ${r.fn} × ${p.fnCost} = ${r.fnCost}. Compare the total contributions, not only the unit costs.` };
  },
  eli5: { analogy: "You sort toy blocks into a 'check again' basket when a sticker score is high enough. A low bar catches more cracked blocks but sends more good blocks for checking. A high bar saves checking work but lets more cracked blocks through.", steps: ["Keep each block's score and true condition unchanged.", "Choose the score bar for sending it to the basket.", "Count wrong checks and missed cracked blocks separately.", "Give each kind of mistake a cost, then add the costs."], limit: "These ten blocks are a fixed teaching sample. Their sticker scores are not proven probabilities, and this experiment does not show calibration, generalization or a confidence interval. Real costs can vary per item and include capacity or fairness constraints." },
  senior: {
    principle: "Separate a model's scores from the decision policy. Threshold choice changes the confusion matrix and expected utility, while score calibration is a different property.",
    assumptions: ["The positive class and score ≥ threshold rule are explicit. True labels and scores are fixed for ten records.", "Error costs are constant per error type and correct decisions cost zero. This omits capacity limits and heterogeneous or downstream costs.", "Metrics describe this fixture only. Tuning and evaluation require separate data and uncertainty estimates in practice."],
    mechanism: ["TP and FP rise or stay unchanged as the threshold falls; FN and TN fall or stay unchanged. Recall is monotone on the fixed sample, while precision need not be.", "Compute precision = TP/(TP+FP), recall = TP/(TP+FN), and total cost = c_FP FP + c_FN FN. Report undefined precision when no positives are predicted.", "If scores are calibrated deployment probabilities and costs have this simple form, choose positive when p ≥ c_FP/(c_FP+c_FN). Those assumptions are not established by this toy score fixture."],
    tradeoffs: ["Threshold tuning can optimize a deployment metric without retraining the ranking model, but it must use separate validation data and reflect deployment prevalence.", "A high-precision operating point can burden recall. A single aggregate metric can hide subgroup performance, review capacity and changing cost structures."],
    failureModes: ["Choosing 0.5 by habit without a utility or capacity argument.", "Reporting precision as 100% when no positive predictions exist.", "Assuming a score of 0.8 means 80% probability without a calibration assessment.", "Choosing a threshold on the final test set, then using the same test set as an unbiased performance report."],
    interviewAnswer: "I separate score quality from the action threshold. I inspect the confusion matrix and evaluate the business cost of false positives and false negatives on validation data, rather than assuming 0.5 is optimal. I report undefined precision honestly when no positives are predicted, and I do not equate a score with a calibrated probability. The chosen policy then needs an untouched evaluation set, capacity checks and monitoring for population shift.",
  },
  challenges: [
    { id: "threshold-none", prompt: "A classifier predicts zero positive items. What should you report for precision TP/(TP+FP)?", choices: ["100%, because it made no false positive predictions", "Undefined, because the denominator is zero", "Always 0%, regardless of reporting convention"], correctIndex: 1, explanation: "The mathematical ratio is 0/0. A library may offer a configurable reporting convention, but the absence of positive predictions should be explicit.", hint: "Write the denominator before deciding the result." },
    { id: "threshold-recall", prompt: "On the same fixed labelled scores, what happens to recall when you lower the positive threshold?", choices: ["It can only stay the same or increase", "It must decrease", "It can change in either direction"], correctIndex: 0, explanation: "Lowering the threshold retains every previous positive prediction and may add more. True positives cannot decrease, and the number of actual positives is fixed.", hint: "Can an item previously above the threshold become below it when the bar moves down?" },
  ],
  transfer: { prompt: "A support-triage classifier has 90% accuracy but misses expensive escalations. How would you choose and validate a different decision policy?", checklist: ["Define the positive class, error costs and review capacity", "Inspect precision/recall and subgroup confusion matrices", "Choose a threshold on validation data, checking calibration if using probabilities", "Evaluate once on a held-out set and monitor deployment shift"], sampleAnswer: "Accuracy may hide costly false negatives, especially with an imbalanced target. I would define escalation costs and review capacity, then compare thresholds using confusion matrices and a policy metric on validation data. If I use a probability-based cost rule, I first assess calibration in the deployment population. I then report held-out performance and uncertainty, monitor class prevalence and error costs, and reassess the policy without repeatedly tuning on the test set." },
  references: [{ title: "scikit-learn: classification metrics and undefined metric conventions", url: "https://scikit-learn.org/stable/modules/model_evaluation.html#classification-metrics" }, { title: "scikit-learn: cost-sensitive threshold selection", url: "https://scikit-learn.org/stable/auto_examples/model_selection/plot_cost_sensitive_learning.html" }],
};

export const quantitativeLabs: LabDefinition[] = [windowLab, joinLab, bayesLab, simpsonLab, thresholdLab];
