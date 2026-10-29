import type { LabDefinition, LabParameters, LabResult } from "./types";

const round = (n: number, places = 2) => Number(n.toFixed(places));
const pct = (n: number) => `${round(n * 100, 1)}%`;
const value = (p: LabParameters, key: string) => p[key]!;

/** One key, one read per second, cache-aside fills, immediate source updates. */
export function cacheModel(p: LabParameters) {
  const ttl = value(p, "ttl"), sourceInterval = value(p, "sourceInterval");
  const retries = value(p, "retries"), layers = value(p, "layers"), failure = value(p, "failure") / 100;
  let expires = -1, cachedVersion = -1, hits = 0, stale = 0;
  const rows: (number | string)[][] = [];
  for (let time = 0; time < 30; time++) {
    const sourceVersion = Math.floor(time / sourceInterval);
    const hit = time < expires;
    if (!hit) { cachedVersion = sourceVersion; expires = time + ttl; }
    else hits++;
    const outdated = cachedVersion !== sourceVersion;
    if (outdated) stale++;
    rows.push([time, sourceVersion, cachedVersion, hit ? (outdated ? "Stale cache hit" : "Fresh cache hit") : "Origin read", expires]);
  }
  const misses = 30 - hits;
  const expectedAttempts = Array.from({ length: retries + 1 }, (_, i) => failure ** i).reduce((a, b) => a + b, 0);
  return { hits, stale, misses, rows, expectedAttempts, expectedOrigin: misses * expectedAttempts, worstOrigin: misses * (retries + 1) ** layers, successProbability: 1 - failure ** (retries + 1) };
}

/** Explicit event-time teaching policy; it is not a runner-specific watermark implementation. */
export const STREAM_EVENTS = [
  { id: "A", event: 1 }, { id: "B", event: 7 }, { id: "C", event: 3 }, { id: "D", event: 12 },
  { id: "E", event: 6 }, { id: "F", event: 18 }, { id: "G", event: 9 }, { id: "H", event: 24 },
] as const;
export function streamingModel(p: LabParameters) {
  const lag = value(p, "lag"), allowance = value(p, "allowance"), windowSize = value(p, "window");
  let maximum = 0, onTime = 0, updated = 0, dropped = 0;
  const counts = new Map<number, number>();
  const rows = STREAM_EVENTS.map((event, arrival): (number | string)[] => {
    const watermark = maximum - lag;
    const start = Math.floor(event.event / windowSize) * windowSize, end = start + windowSize;
    const expired = watermark >= end + allowance;
    const late = watermark >= end;
    let status: string;
    if (expired) { dropped++; status = "Dropped: window state expired"; }
    else {
      if (late) { updated++; status = "Late: update retained window"; }
      else { onTime++; status = "On time"; }
      counts.set(start, (counts.get(start) ?? 0) + 1);
    }
    maximum = Math.max(maximum, event.event);
    return [arrival + 1, event.id, event.event, watermark, `[${start}, ${end})`, status];
  });
  return { onTime, updated, dropped, watermark: maximum - lag, rows, counts };
}

/** Fluid, steady-rate capacity model with fixed 100 requests/s per ready pod. */
export function autoscalingModel(p: LabParameters) {
  const demand = value(p, "demand"), current = value(p, "current"), target = value(p, "target") / 100;
  const maximum = value(p, "maximum"), delay = value(p, "delay");
  const rawDesired = Math.max(1, Math.ceil(demand / (100 * target)));
  const desired = Math.min(maximum, rawDesired);
  const capacity = desired * 100;
  const backlog = Math.max(0, demand - current * 100) * delay;
  const spare = capacity - demand;
  const drainSeconds = spare < 0 ? null : backlog === 0 ? 0 : spare > 0 ? backlog / spare : null;
  return { rawDesired, desired, capacity, backlog, spare, drainSeconds, utilization: demand / capacity, hourlyCost: desired * 0.12, limited: desired < rawDesired };
}

const ATTENTION_TOKENS = ["cat", "sat", "on", "mat"] as const;
const ATTENTION_KEYS = [[1, 0], [0.5, 1], [-0.5, 0.5], [2, 0]] as const;
const ATTENTION_VALUES = [10, 20, 30, 40] as const;
/** Stable softmax over allowed positions; extra temperature is a teaching knob. */
export function attentionModel(p: LabParameters) {
  const position = value(p, "position"), qx = value(p, "qx"), qy = value(p, "qy");
  const temperature = value(p, "temperature"), mask = value(p, "mask") === 1;
  const scores = ATTENTION_KEYS.map(([kx, ky]) => (qx * kx + qy * ky) / Math.sqrt(2) / temperature);
  const allowed = scores.map((_, i) => !mask || i <= position);
  const maximum = Math.max(...scores.filter((_, i) => allowed[i]));
  const numerators = scores.map((score, i) => allowed[i] ? Math.exp(score - maximum) : 0);
  const denominator = numerators.reduce((a, b) => a + b, 0);
  const weights = numerators.map((n) => n / denominator);
  const entropy = -weights.reduce((sum, w) => sum + (w > 0 ? w * Math.log2(w) : 0), 0);
  const weightedValue = weights.reduce((sum, w, i) => sum + w * ATTENTION_VALUES[i]!, 0);
  const topIndex = weights.indexOf(Math.max(...weights));
  const futureMass = weights.reduce((sum, w, i) => sum + (i > position ? w : 0), 0);
  return { scores, allowed, weights, entropy, weightedValue, topIndex, futureMass };
}

export const RAG_DOCUMENTS = [
  { id: "A", name: "Old policy with matching words", score: 0.94, rerank: 0.10, relevant: false, tokens: 180, authorized: true },
  { id: "B", name: "Current rule", score: 0.91, rerank: 0.95, relevant: true, tokens: 220, authorized: true },
  { id: "C", name: "Another tenant's private policy", score: 0.88, rerank: 0.90, relevant: false, tokens: 160, authorized: false },
  { id: "D", name: "Current rule's exception", score: 0.84, rerank: 0.94, relevant: true, tokens: 180, authorized: true },
  { id: "E", name: "Repeated irrelevant wording", score: 0.78, rerank: 0.20, relevant: false, tokens: 90, authorized: true },
  { id: "F", name: "Effective date and transition", score: 0.72, rerank: 0.93, relevant: true, tokens: 130, authorized: true },
  { id: "G", name: "Unrelated long handbook", score: 0.68, rerank: 0.05, relevant: false, tokens: 250, authorized: true },
  { id: "H", name: "Unrelated short note", score: 0.60, rerank: 0.30, relevant: false, tokens: 100, authorized: true },
] as const;
export function ragModel(p: LabParameters) {
  const topK = value(p, "topK"), budget = value(p, "budget"), rerank = value(p, "rerank") === 1, filter = value(p, "filter") === 1;
  const ranked = RAG_DOCUMENTS.filter((d) => !filter || d.authorized).sort((a, b) => b.score - a.score).slice(0, topK);
  const ordered = rerank ? [...ranked].sort((a, b) => b.rerank - a.rerank) : ranked;
  const context: typeof ordered = [];
  let tokens = 0;
  for (const doc of ordered) {
    if (tokens + doc.tokens > budget) break;
    tokens += doc.tokens;
    context.push(doc);
  }
  const retrievedRelevant = ranked.filter((d) => d.relevant).length;
  const contextRelevant = context.filter((d) => d.relevant).length;
  const unauthorized = context.filter((d) => !d.authorized).length;
  return { ranked, ordered, context, tokens, retrievedRelevant, contextRelevant, unauthorized, precision: retrievedRelevant / ranked.length, recall: retrievedRelevant / 3, contextRecall: contextRelevant / 3 };
}

const AGENT_PROPOSALS = [
  { id: "read-own", name: "Read your order", own: true, write: false, approval: false, cost: 1, operation: "read-42" },
  { id: "read-foreign", name: "Read another user's order", own: false, write: false, approval: false, cost: 1, operation: "read-99" },
  { id: "draft", name: "Draft a refund explanation", own: true, write: false, approval: false, cost: 2, operation: "draft-42" },
  { id: "refund", name: "Issue refund for your order", own: true, write: true, approval: true, cost: 4, operation: "refund-42" },
  { id: "retry-refund", name: "Retry the same refund after timeout", own: true, write: true, approval: true, cost: 4, operation: "refund-42" },
  { id: "delete-foreign", name: "Delete another user's order", own: false, write: true, approval: true, cost: 2, operation: "delete-99" },
] as const;
export function agentModel(p: LabParameters) {
  const write = value(p, "write") === 1, approved = value(p, "approved") === 1, idempotent = value(p, "idempotent") === 1;
  const budget = value(p, "budget"), maxSteps = value(p, "steps");
  let spent = 0, refunds = 0, executed = 0, blocked = 0, cached = 0, attempted = 0;
  const seen = new Set<string>();
  const rows = AGENT_PROPOSALS.map((proposal, i): (number | string)[] => {
    let status: string;
    if (i >= maxSteps) status = "Not attempted: step limit";
    else {
      attempted++;
      if (!proposal.own) { status = "Blocked: wrong user scope"; blocked++; }
      else if (proposal.write && !write) { status = "Blocked: no write capability"; blocked++; }
      else if (proposal.approval && !approved) { status = "Blocked: approval missing"; blocked++; }
      else if (idempotent && seen.has(proposal.operation)) { status = "Cached result: no repeated effect"; cached++; }
      else if (spent + proposal.cost > budget) { status = "Blocked: execution budget"; blocked++; }
      else {
        status = "Executed"; spent += proposal.cost; executed++; seen.add(proposal.operation);
        if (proposal.operation === "refund-42") refunds++;
      }
    }
    return [i + 1, proposal.name, proposal.cost, status, spent];
  });
  return { spent, refunds, executed, blocked, cached, attempted, rows };
}

function cacheResult(p: LabParameters): LabResult {
  const m = cacheModel(p);
  return {
    metrics: [
      { label: "Cache hits", value: m.hits, unit: "of 30 reads", detail: "A hit avoids a source read in this single-key trace." },
      { label: "Outdated reads", value: m.stale, unit: "of 30 reads", detail: "A cached version differs from the source version at that read." },
      { label: "Expected attempts at one retry layer", value: round(m.expectedOrigin), unit: "origin attempts", detail: "Misses × (1 + p + ... + p^r), assuming independent transient failures." },
      { label: "Nested retry worst case", value: m.worstOrigin, unit: "downstream attempts", detail: "Misses × (retries + 1)^layers when every layer exhausts its attempts." },
    ],
    table: { caption: "Thirty reads of one changing value; time and expiry are seconds", columns: ["Read time", "Source version", "Returned version", "Read path", "Cache expires"], rows: m.rows },
    bars: { title: "Freshness and source work in the trace", unit: "reads", items: [{ label: "Source reads", value: m.misses }, { label: "Cache hits (includes stale)", value: m.hits }, { label: "Outdated reads", value: m.stale }] },
    steps: ["Update the source version at each source-change interval.", "For each second, use the cache only while read time is strictly before expiry.", "A miss loads the current version and starts a new TTL; a hit does not extend it.", "Compare returned and current versions. Then calculate retry load separately from this successful-fill trace."],
    insight: m.stale ? `${m.stale} reads are outdated even though the cache hits. A high hit rate does not prove freshness. Nested retries can multiply a miss into ${((value(p, "retries") + 1) ** value(p, "layers"))} attempts.` : "This trace has no outdated reads. That is evidence about these request/update timings, not a guarantee for all traffic or concurrent cache misses.",
  };
}

export const systemsAiLabs: LabDefinition[] = [
  {
    id: "cache-retries", title: "Cache freshness and retry amplification", domain: "system-design", roles: ["sde", "ml-engineer", "data-engineer", "genai-engineer"], minutes: 15,
    summary: "Change TTL and update timing, inspect every returned version, then see how retries can multiply source traffic.", topicIds: ["w10-d02-caching-load-balancing", "w10-d04-service-reliability"],
    controls: [
      { key: "ttl", label: "Cache TTL", min: 0, max: 15, step: 1, defaultValue: 8, unit: "s", help: "Zero bypasses the cache. A hit does not refresh expiry." },
      { key: "sourceInterval", label: "Source changes every", min: 1, max: 15, step: 1, defaultValue: 5, unit: "s", help: "Source changes happen before the read at the same second." },
      { key: "retries", label: "Retries per layer", min: 0, max: 3, step: 1, defaultValue: 2, help: "Initial attempt plus this many retries." },
      { key: "layers", label: "Independent retrying layers", min: 1, max: 4, step: 1, defaultValue: 3, help: "Worst case assumes each layer exhausts all attempts." },
      { key: "failure", label: "Transient failure probability", min: 0, max: 100, step: 5, defaultValue: 20, unit: "%", help: "Used only for the one-layer expected-attempt calculation, not the cache trace." },
    ],
    presets: [
      { id: "fresh", label: "Fresh but busy", description: "Read the source every time; retries still add load.", values: { ttl: 0, sourceInterval: 5, retries: 2, layers: 1, failure: 20 } },
      { id: "stale", label: "High hit rate, stale answers", description: "A long TTL spans several source versions.", values: { ttl: 15, sourceInterval: 3, retries: 2, layers: 3, failure: 20 } },
      { id: "bounded", label: "Aligned refresh, one retry layer", description: "This particular timing avoids staleness and limits amplification.", values: { ttl: 5, sourceInterval: 5, retries: 1, layers: 1, failure: 20 } },
    ],
    evaluate: cacheResult,
    predict: (p) => { const m = cacheModel(p); return { prompt: "Will any of the 30 reads return an older source version at these settings?", choices: ["No outdated reads", "At least one outdated read"], correctIndex: m.stale > 0 ? 1 : 0, explanation: `${m.stale} reads return an older version. TTL controls reuse time, not whether the source changes during that time.` }; },
    eli5: { analogy: "You copy the lunch menu onto a card. You keep reading the card until its timer rings, even if the kitchen changes the menu. Asking three friends to keep asking for a new menu can turn one request into many.", steps: ["The kitchen's menu is the source. The card is the cache.", "When the timer has expired, copy the newest menu. Otherwise reuse the card.", "Check whether the card and kitchen still agree.", "Count how many requests repeated requests can create."], limit: "Real caches have many keys, concurrent readers, invalidation and network failures. This trace assumes successful cache fills and models retries separately; it does not simulate a stampede, an outage or a consistency protocol." },
    senior: {
      principle: "TTL bounds cache residence under a stated refresh policy; freshness depends on source changes and request timing. Retries trade transient-failure recovery against extra work.",
      assumptions: ["One key is read at integer seconds 0 through 29; cache-aside misses fetch the current source version successfully.", "Expiry is exclusive: a read at expiry is a miss. Source updates precede reads at the same timestamp.", "The expected-attempt model assumes independent, identical per-attempt failures at one retry layer. The nested-layer number is a worst-case bound, not an expected value."],
      mechanism: ["A hit requires t < expiry. A miss stores sourceVersion(t) and sets expiry = t + TTL.", "For r retries and failure probability p, expected attempts at one layer are sum from k=0 to r of p^k; success probability is 1 - p^(r+1).", "If d layers each permit r+1 attempts, an exhausted logical request can generate (r+1)^d downstream attempts. A deliberately chosen retry layer avoids this multiplication."],
      tradeoffs: ["Long TTL usually reduces source work but can increase staleness. Short TTL can increase misses and synchronized refresh pressure.", "Invalidation or version validation can improve freshness but adds coordination and failure paths.", "Bounded backoff and jitter spread retries; they do not make non-idempotent effects safe or add capacity to an overloaded service."],
      failureModes: ["Treating a high cache hit rate as a freshness guarantee.", "Using an incomplete tenant/user cache key and exposing another user's value.", "Retrying at every layer or treating timeout as proof that a side effect did not happen."],
      interviewAnswer: "I start with the permitted staleness and cache-key scope. A TTL is a reuse policy, so I evaluate update and read timing rather than reporting hit rate alone. I bound retries at one deliberate layer, propagate deadlines and use idempotency for repeated effects. I test synchronized expiry and dependency overload separately from this single-key trace.",
    },
    challenges: [
      { id: "cache-hit-fallacy", prompt: "A dashboard has 99% cache hits. What can you conclude about whether it shows the current source value?", choices: ["It is current for 99% of reads", "Freshness needs update timing and invalidation evidence", "A cache hit always validates the source"], correctIndex: 1, explanation: "Hit rate counts reuse, not agreement with the current source.", hint: "Separate a performance metric from a correctness requirement." },
      { id: "retry-three-layers", prompt: "Three layers each permit one initial attempt and two retries. What is the exhausted-call worst-case downstream attempt count?", choices: ["3", "9", "27"], correctIndex: 2, explanation: "Each of three layers can multiply calls by three: 3 × 3 × 3 = 27.", hint: "The layers multiply rather than add." },
    ],
    transfer: { prompt: "Design a cache and retry policy for a changing product price. What would you ask before choosing a TTL?", checklist: ["Permitted staleness and critical purchase-time validation", "User/tenant/product/currency cache-key scope", "Invalidation and concurrent expiry behavior", "One retry layer, deadline, retry budget and safe effects"], sampleAnswer: "I distinguish browsing prices from the authoritative price used at checkout. I choose a TTL from the permitted browsing staleness, key by product and price context, and validate the purchase against the source. I plan invalidation and stampede protection, then bound transient-fault retries at one layer with a deadline and idempotency where effects repeat." },
    references: [{ title: "Amazon Builders' Library: timeouts, retries and jitter", url: "https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/" }, { title: "Redis documentation: key expiration", url: "https://redis.io/docs/latest/commands/expire/" }],
  },
  {
    id: "streaming-watermarks", title: "Watermarks, late events and retained state", domain: "data-engineering", roles: ["data-engineer", "data-scientist", "data-analyst", "ml-engineer"], minutes: 15,
    summary: "Replay an out-of-order stream. Trade earlier results against late updates and inspect exactly which records get dropped.", topicIds: ["w11-d03-streaming-windows"],
    controls: [
      { key: "lag", label: "Watermark lag", min: 0, max: 12, step: 1, defaultValue: 2, unit: "s", help: "Watermark = maximum event time seen before this record minus this lag." },
      { key: "allowance", label: "Allowed lateness", min: 0, max: 12, step: 1, defaultValue: 4, unit: "s", help: "Retain a closed window until watermark reaches window end plus this allowance." },
      { key: "window", label: "Tumbling window size", min: 5, max: 10, step: 5, defaultValue: 5, unit: "s", help: "Half-open event-time windows: [start, end).", options: [{ value: 5, label: "5 seconds" }, { value: 10, label: "10 seconds" }] },
    ],
    presets: [
      { id: "eager", label: "Publish early, lose late data", description: "An aggressive watermark and no retained lateness drop delayed records.", values: { lag: 0, allowance: 0, window: 5 } },
      { id: "updates", label: "Allow late corrections", description: "Keep window state long enough to accept some delayed records.", values: { lag: 2, allowance: 6, window: 5 } },
      { id: "patient", label: "Wait for disorder", description: "A lagging watermark makes more events on time, with later window closure.", values: { lag: 12, allowance: 0, window: 10 } },
    ],
    evaluate: (p) => { const m = streamingModel(p); return {
      metrics: [{ label: "On-time events", value: m.onTime, unit: "of 8", detail: "Their window was not yet closed at arrival." }, { label: "Late corrections", value: m.updated, unit: "of 8", detail: "The window was closed but state was still retained." }, { label: "Dropped events", value: m.dropped, unit: "of 8", detail: "Watermark had reached window end plus allowed lateness." }, { label: "Final watermark", value: m.watermark, unit: "event-time s", detail: "This is an event-time progress estimate, not a wall clock." }],
      table: { caption: "Arrival order versus event time, with the watermark before each arrival", columns: ["Arrival", "Event", "Event time (s)", "Watermark (s)", "Window", "Decision"], rows: m.rows },
      bars: { title: "What happened to the eight events", unit: "events", items: [{ label: "On time", value: m.onTime }, { label: "Late correction", value: m.updated }, { label: "Dropped", value: m.dropped }] },
      steps: ["Read records in arrival order; assign each to its event-time window.", "Compare the previous watermark with the window end and retained-state deadline.", "Accept an on-time event, update a retained late window, or drop an expired event.", "Advance maximum observed event time. The watermark never moves backward in this fixture."],
      insight: `${m.dropped} records are dropped and ${m.updated} become late corrections. Increasing lag delays closure; increasing allowed lateness keeps correction state longer. Neither proves all future events will arrive.`,
    }; },
    predict: (p) => { const m = streamingModel(p); return { prompt: "Will this policy retain every event in the fixed eight-record stream?", choices: ["Yes, all eight are accepted", "No, at least one is dropped"], correctIndex: m.dropped ? 1 : 0, explanation: `${8 - m.dropped} are accepted. A watermark is an estimate used by a policy, not proof that no earlier event can arrive.` }; },
    eli5: { analogy: "Children mail postcards stamped with the day they wrote them. Some postcards arrive late. You sort them into daily boxes, announce a count, and keep the box open for corrections for a little longer.", steps: ["The writing date is event time. Arrival order is when the post reaches you.", "The watermark says how far along you think the mail has progressed.", "A closed box can still accept a correction while you keep its contents.", "Once the box is thrown away, a very late card cannot change that count under this policy."], limit: "A real watermark uses source partitions, idle-source handling and runner rules. This model uses maximum seen time minus a chosen lag, and an explicit expiry rule. It does not model all triggers, sinks, retractions or exactly-once processing." },
    senior: { principle: "Event-time windows separate the time an event describes from its processing arrival. Watermarks estimate progress; allowed lateness governs retained correction state.", assumptions: ["All timestamps use the same seconds scale. Window membership uses floor(eventTime/windowSize), with an exclusive end.", "Before each arrival, watermark = maximum prior event time - lag. Expiry occurs at watermark >= end + allowance.", "The fixed input contains no duplicates, timestamp corrections or partition-specific watermarks."], mechanism: ["A watermark at or beyond a window end closes its on-time period in this model.", "A late record updates state while watermark < end + allowed lateness; otherwise it is dropped.", "Watermark lag and allowed lateness solve different problems: delayed initial closure versus later corrections. Production sinks must support the resulting update semantics."], tradeoffs: ["Larger lag delays an on-time result but accepts more disorder before closure.", "Larger lateness retains more state and emits corrections that consumers must handle.", "Dropping very late data simplifies bounded state but requires an explicit completeness policy or reconciliation path."], failureModes: ["Treating processing time as the event's business time.", "Calling a watermark a guarantee that no late records remain.", "Appending corrected aggregates into a sink that treats each update as a new independent final result."], interviewAnswer: "I define event time, window boundaries and the late-data policy separately. A watermark estimates event-time progress, while allowed lateness determines how long a closed window can be corrected. I specify how the sink upserts or retracts corrections, monitor late/drop rates and use batch reconciliation when completeness matters. Partition idleness and skew need source-specific handling beyond this fixture." },
    challenges: [
      { id: "watermark-not-clock", prompt: "Does a watermark of 20 seconds mean the worker's wall clock is at 20 seconds?", choices: ["Yes", "No, it estimates progress in event time", "Only if the stream is sorted"], correctIndex: 1, explanation: "The timestamps describe the data, not the current wall clock.", hint: "Ask which clock each timestamp represents." },
      { id: "late-sink", prompt: "A retained window changes its count from 8 to 9. Which sink contract avoids treating that as 17 events?", choices: ["Append both numbers and sum them", "Upsert a window-keyed count or apply a documented delta", "Ignore all window identifiers"], correctIndex: 1, explanation: "A revised aggregate needs update or delta semantics, rather than summing snapshots.", hint: "Distinguish a complete count from a change to a count." },
    ],
    transfer: { prompt: "Design hourly revenue metrics when payments can arrive two days late.", checklist: ["Business event time and timezone", "Allowed correction horizon and reconciliation", "Window-keyed idempotent sink updates", "Late/drop monitoring and state-cost trade-off"], sampleAnswer: "I window by the payment's business timestamp and make timezone boundaries explicit. I retain a defined correction horizon, upsert each window's versioned result and monitor lateness. Very late records go to a reconciliation path rather than silently vanishing. The dashboard labels provisional and finalized values according to that contract." },
    references: [{ title: "Google Cloud Dataflow: streaming windows, watermarks and triggers", url: "https://docs.cloud.google.com/dataflow/docs/concepts/streaming-pipelines" }, { title: "Apache Beam programming guide: watermarks and late data", url: "https://beam.apache.org/documentation/programming-guide/#watermarks-and-late-data" }],
  },
  {
    id: "autoscaling-capacity", title: "Autoscaling headroom, backlog and cost", domain: "cloud", roles: ["sde", "ml-engineer", "data-engineer", "genai-engineer"], minutes: 15,
    summary: "Make demand jump, wait for new capacity and calculate whether the backlog can ever drain. Every price is hypothetical.", topicIds: ["w12-d02-containers-kubernetes", "w12-d04-iac-cost"],
    controls: [
      { key: "demand", label: "Incoming demand", min: 0, max: 1600, step: 50, defaultValue: 800, unit: "requests/s", help: "Constant demand after a sudden step increase." },
      { key: "current", label: "Initially ready pods", min: 1, max: 12, step: 1, defaultValue: 3, help: "Each pod has a fixed teaching capacity of 100 requests/s." },
      { key: "target", label: "Target utilization", min: 25, max: 100, step: 5, defaultValue: 70, unit: "%", help: "Desired replicas = ceil(demand / (100 × target fraction)), before the maximum." },
      { key: "maximum", label: "Maximum replicas", min: 1, max: 20, step: 1, defaultValue: 12, help: "A hard scale ceiling. The recommendation cannot exceed it." },
      { key: "delay", label: "Capacity startup delay", min: 0, max: 60, step: 5, defaultValue: 20, unit: "s", help: "Extra capacity is unavailable for this long. This is not an actual Kubernetes timing promise." },
    ],
    presets: [
      { id: "headroom", label: "Headroom can drain backlog", description: "Ready capacity grows beyond incoming demand after the delay.", values: { demand: 800, current: 3, target: 70, maximum: 12, delay: 20 } },
      { id: "ceiling", label: "Replica ceiling blocks recovery", description: "The scale limit leaves capacity below incoming demand.", values: { demand: 1000, current: 3, target: 70, maximum: 6, delay: 30 } },
      { id: "no-spare", label: "100% target, no drain capacity", description: "Matching incoming demand does not clear a backlog already accumulated.", values: { demand: 800, current: 3, target: 100, maximum: 12, delay: 20 } },
    ],
    evaluate: (p) => { const m = autoscalingModel(p); return {
      metrics: [{ label: "Desired ready replicas", value: m.desired, unit: "pods", detail: `Uncapped recommendation: ${m.rawDesired}. ${m.limited ? "The maximum clips it." : "The maximum does not clip it."}` }, { label: "Backlog before capacity change", value: m.backlog, unit: "requests", detail: "max(0, incoming rate - initial capacity) × startup delay; an unbounded queue is assumed." }, { label: "Queue recovery time", value: m.drainSeconds === null ? "Cannot drain" : round(m.drainSeconds), unit: m.drainSeconds === null ? undefined : "s", detail: "Backlog / spare capacity when positive. Zero means the queue starts empty and capacity at least matches continuing demand. Overload has no finite recovery." }, { label: "Hypothetical running cost", value: `$${m.hourlyCost.toFixed(2)}`, unit: "/ hour", detail: "A teaching price of $0.12 per ready pod-hour, excluding all other costs. Not a provider quote." }],
      table: { caption: "Fluid capacity before and after the scaling delay", columns: ["Phase", "Ready pods", "Capacity (requests/s)", "Incoming (requests/s)", "Net queue change (requests/s)"], rows: [["During startup delay", value(p, "current"), value(p, "current") * 100, value(p, "demand"), value(p, "demand") - value(p, "current") * 100], ["After capacity change", m.desired, m.capacity, value(p, "demand"), -m.spare]] },
      bars: { title: "Rate comparison", unit: "requests/s", items: [{ label: "Incoming demand", value: value(p, "demand") }, { label: "Initial capacity", value: value(p, "current") * 100 }, { label: "Scaled capacity", value: m.capacity }] },
      steps: ["Compute the uncapped replica recommendation from demand and target utilization.", "Apply the configured maximum replica count.", "Accumulate a fluid backlog while only the initial pods are ready.", "After scaling, use spare capacity to drain the queue. Capacity equal to demand sustains new work but cannot clear old work."],
      insight: m.spare < 0 ? `After the capacity change, demand exceeds capacity by ${-m.spare} requests/s. The queue grows even if it starts empty. More time does not repair overload.` : m.drainSeconds === null ? "The existing backlog cannot drain with zero spare capacity. New arrivals consume all throughput." : m.backlog === 0 ? "The queue starts empty and final capacity can serve the constant incoming demand. Zero spare capacity would leave no room for variation beyond this ideal model." : `The model drains the backlog in ${round(m.drainSeconds)} seconds after capacity changes. This excludes task-size variation, failures and real autoscaler stabilization behavior.`,
    }; },
    predict: (p) => { const m = autoscalingModel(p); return { prompt: "After the startup delay, can the modeled system clear the backlog while serving continuing demand?", choices: ["Yes, the queue clears or stays empty under this constant demand", "No, the queue persists or grows without sufficient capacity"], correctIndex: m.drainSeconds === null ? 1 : 0, explanation: `${m.backlog} requests accumulate. Scaled capacity is ${m.capacity} requests/s against ${value(p, "demand")} requests/s demand; spare capacity determines recovery.` }; },
    eli5: { analogy: "Three checkout counters can serve only so many shoppers. Opening more counters takes time. If the new counters can handle only the shoppers arriving now, the old line never gets shorter.", steps: ["Count arriving shoppers and each counter's capacity.", "Choose extra counters with some spare room.", "Count the line that forms while the counters are opening.", "Use capacity left after new arrivals to clear the old line."], limit: "Requests are not identical shoppers. Real pods have variable work, scheduling constraints, cold caches, CPU requests, metric delay and scale policies. This is a fluid rate model, not an HPA emulator, queueing-latency forecast or cloud bill." },
    senior: { principle: "Autoscaling is a delayed feedback process. A utilization target implies headroom, but maximum replicas and startup delays can dominate recovery.", assumptions: ["Every ready pod sustains 100 requests/s and all requests have equal work; demand is constant after a step.", "The queue has no size limit, deadlines or dropped work. Scaling changes ready capacity once after the selected delay.", "The target formula resembles proportional HPA reasoning but omits tolerance, missing metrics, stabilization, rate policies and scheduling."], mechanism: ["Recommendation = ceil(demand / (per-pod capacity × target utilization)), clamped to at least one and the selected maximum.", "Startup backlog = max(0, demand - initial capacity) × delay.", "After startup, drain time = backlog / (scaled capacity - demand) when the denominator is positive. A positive queue cannot drain at zero spare capacity."], tradeoffs: ["Lower target utilization buys recovery headroom at higher steady running cost.", "Higher maximum replicas permits scale-up only if the scheduler, quota and downstream dependencies can support it.", "Prewarming, load shedding and bounded queues can be more useful than relying solely on reactive scaling."], failureModes: ["Assuming a 100% utilization target clears an accumulated queue.", "Ignoring a replica ceiling, quota, unavailable GPU or downstream bottleneck.", "Presenting a fluid throughput calculation as a p99 latency or dollar-cost guarantee."], interviewAnswer: "I estimate per-replica sustainable throughput, select a headroom target and check replica and downstream limits. I model work accumulated during metric and startup delay, then ask whether spare capacity can drain it before deadlines. I combine reactive scaling with bounded queues, admission control and suitable prewarming. Load tests and actual resource metrics replace this simple rate model before production sizing." },
    challenges: [
      { id: "scale-no-spare", prompt: "A queue has 2,000 requests. Capacity and continuing demand are both 500 requests/s. When does it drain?", choices: ["In 4 seconds", "In 2,000 seconds", "It does not drain without spare capacity"], correctIndex: 2, explanation: "All capacity serves new arrivals, leaving zero throughput for the existing queue.", hint: "Subtract incoming rate from capacity before dividing the backlog." },
      { id: "scale-target", prompt: "Demand is 500 requests/s, each pod sustains 100 requests/s, and the target is 50%. What is the uncapped recommendation?", choices: ["3 pods", "5 pods", "10 pods"], correctIndex: 2, explanation: "Each pod is planned to carry 50 requests/s at the target, so ceil(500/50) = 10.", hint: "The target fraction changes usable planned capacity." },
    ],
    transfer: { prompt: "Size a model-serving service for a burst when GPU workers need time to become ready.", checklist: ["Measure sustainable throughput and latency under representative batching", "Include metric, scheduling and model-load delay", "Check quota, memory and downstream limits", "Plan backlog deadlines, admission control and prewarming"], sampleAnswer: "I benchmark representative requests and batching before choosing a throughput target. I include scheduling and model-load time, keep enough warm capacity for the expected burst and verify GPU quota and memory. I calculate whether spare capacity can drain queued work before deadlines, then bound the queue and reject or degrade work when it cannot. The final replica policy comes from load tests and observed tail latency." },
    references: [{ title: "Kubernetes: Horizontal Pod Autoscaling algorithm", url: "https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/" }],
  },
  {
    id: "attention-temperature", title: "Attention weights, masking and softmax", domain: "deep-learning", roles: ["data-scientist", "ml-engineer", "genai-engineer"], minutes: 15,
    summary: "Move a two-number query, mask future tokens and see each softmax weight and the resulting value mixture.", topicIds: ["w09-d03-attention-transformers", "w13-d03-decoding-structured-output"],
    controls: [
      { key: "qx", label: "Query coordinate x", min: -2, max: 2, step: 0.25, defaultValue: 1, help: "A toy learned query coordinate, not a word's literal meaning." },
      { key: "qy", label: "Query coordinate y", min: -2, max: 2, step: 0.25, defaultValue: 0, help: "Dot products compare this query with the four fixed keys." },
      { key: "temperature", label: "Softmax temperature", min: 0.25, max: 3, step: 0.25, defaultValue: 1, help: "An extra teaching knob on attention scores. Decoding temperature acts at a different stage." },
      { key: "position", label: "Current token position", min: 0, max: 3, step: 1, defaultValue: 1, help: "With a causal mask, positions after this token are excluded.", options: ATTENTION_TOKENS.map((token, i) => ({ value: i, label: `${i + 1}: ${token}` })) },
      { key: "mask", label: "Causal attention mask", min: 0, max: 1, step: 1, defaultValue: 1, help: "Masked positions receive exactly zero weight before normalization.", options: [{ value: 1, label: "Apply causal mask" }, { value: 0, label: "Allow all positions" }] },
    ],
    presets: [
      { id: "masked", label: "Hide the future", description: "The highest-scoring future key is unavailable to this token.", values: { qx: 1, qy: 0, temperature: 1, position: 1, mask: 1 } },
      { id: "sharp", label: "Concentrate the weights", description: "A lower temperature concentrates weight on the largest allowed score.", values: { qx: 1, qy: 0, temperature: 0.25, position: 3, mask: 0 } },
      { id: "uniform", label: "A zero query gives ties", description: "Every allowed dot product is zero, so weights are uniform.", values: { qx: 0, qy: 0, temperature: 2, position: 3, mask: 1 } },
    ],
    evaluate: (p) => { const m = attentionModel(p); return {
      metrics: [{ label: "Weighted value", value: round(m.weightedValue, 3), detail: "Sum of each toy scalar value times its attention weight; not a generated token." }, { label: "Weight entropy", value: round(m.entropy, 3), unit: "bits", detail: "-sum(w log2 w). Higher means a more spread distribution over allowed positions." }, { label: "Weight on future tokens", value: pct(m.futureMass), detail: "Causal masking sets this to zero. At the final position there are no future tokens." }, { label: "First maximum-weight token", value: ATTENTION_TOKENS[m.topIndex]!, detail: "Ties use the first displayed token. A high weight is not a causal explanation of a model's answer." }],
      table: { caption: "One toy attention head: fixed keys and values, scaled scores and normalized weights", columns: ["Token", "Key [x,y]", "Scalar value", "Score / temperature", "Mask status", "Weight"], rows: ATTENTION_TOKENS.map((token, i) => [token, `[${ATTENTION_KEYS[i]!.join(", ")}]`, ATTENTION_VALUES[i]!, round(m.scores[i]!, 3), m.allowed[i] ? "Allowed" : "Masked: zero weight", pct(m.weights[i]!)]) },
      bars: { title: "Attention allocated to each token", unit: "% weight", items: ATTENTION_TOKENS.map((token, i) => ({ label: token, value: round(m.weights[i]! * 100, 3) })) },
      steps: ["Compute each query-key dot product and divide by sqrt(2), the key dimension scale.", "Divide allowed scores by the selected teaching temperature; exclude masked positions.", "Subtract the largest allowed score before exponentiating, then divide by the exponent sum.", "Mix the scalar values with these weights. This fixture has one head and no learned training process."],
      insight: value(p, "qx") === 0 && value(p, "qy") === 0 ? "All allowed scores tie, so changing temperature cannot break the tie. The mask alone changes how many positions share the weight." : "Temperature changes concentration but preserves the ordering of allowed scores. A causal mask changes which positions can receive any weight.",
    }; },
    predict: (p) => { const m = attentionModel(p); return { prompt: "Which token is first in displayed order among those receiving the largest attention weight?", choices: [...ATTENTION_TOKENS], correctIndex: m.topIndex, explanation: `The first maximum is ${ATTENTION_TOKENS[m.topIndex]}. Compare allowed dot products; positive temperature preserves their order, while masked keys cannot receive weight.` }; },
    eli5: { analogy: "Four labelled jars hold different amounts of paint. A question card gives each jar a score. You pour a share from each jar according to those scores. A cover hides jars you are not allowed to look at yet.", steps: ["Compare the question card with each jar's label.", "Hide future jars if the cover is on.", "Turn the remaining scores into shares that add to one.", "Mix the paint using those shares. A sharper setting favors the highest-scoring jar."], limit: "Neural queries, keys and values are learned vectors, not labels or paint. This scalar value mixture is not text generation or a complete transformer. The extra temperature here changes attention; output-token decoding temperature is applied elsewhere." },
    senior: { principle: "Scaled dot-product attention normalizes query-key compatibility scores over allowed positions and forms a weighted value sum. Masking changes support; positive temperature changes concentration.", assumptions: ["One head uses four fixed two-dimensional keys and scalar values. There are no learned projections, positional encodings, residual blocks or training.", "Temperature is strictly positive. The causal mask permits the current and prior positions.", "The extra temperature is pedagogical: the standard scaled attention formula uses QK^T / sqrt(d_k), while decoding temperature rescales output logits at another stage."], mechanism: ["For allowed position i, score_i = q dot k_i / sqrt(2) / T. Masked positions contribute zero numerator.", "Compute exp(score_i - maxAllowedScore) and normalize. Subtracting a shared maximum preserves softmax and avoids overflow.", "Return sum(weight_i × value_i). Entropy measures spread of the weights, not model truthfulness, explanation quality or uncertainty calibration."], tradeoffs: ["Lower temperature concentrates mass but cannot fix wrong learned scores or break exact ties.", "Causal masks prevent future-token leakage in autoregressive training; bidirectional encoders use a different visibility contract.", "Multiple heads and layers provide richer transformations at additional compute and memory cost; a one-head scalar trace omits those effects."], failureModes: ["Confusing attention temperature with output decoding temperature.", "Applying a mask after normalization without renormalizing remaining mass.", "Treating the highest attention weight as proof of causal importance or factual correctness."], interviewAnswer: "I calculate QK compatibility, scale by the key dimension, apply visibility masking and normalize with a numerically stable softmax. The result mixes V rather than directly selecting the next token. Causal masking controls access to future positions, while a positive softmax temperature changes concentration without changing score order. This toy head helps inspect the mechanism but does not explain an entire transformer's behavior." },
    challenges: [
      { id: "attention-uniform", prompt: "All four allowed scores are identical. What happens when positive temperature is lowered?", choices: ["The first token gets all weight", "The weights remain uniform", "The weights no longer sum to one"], correctIndex: 1, explanation: "Identical scores remain identical after division, so all exponentials are equal.", hint: "Temperature rescales differences; there are no differences to rescale." },
      { id: "attention-mask", prompt: "Why must a future-position mask be applied before softmax normalization?", choices: ["So forbidden positions contribute no probability mass", "So future keys receive negative probabilities", "So temperature becomes zero"], correctIndex: 0, explanation: "The denominator must include only permitted positions. Masked positions receive zero, not negative, weight.", hint: "Look at which terms enter the softmax denominator." },
    ],
    transfer: { prompt: "An autoregressive model scores well in training but fails when generating without future text. What would you inspect?", checklist: ["Causal visibility in attention", "Shifted targets and future-label leakage", "Training versus generation input contract", "Attention computation distinct from decoding"], sampleAnswer: "I inspect the causal mask and target shift to ensure training cannot read the tokens it must predict. I compare training and generation inputs, padding masks and cache position handling. I verify attention normalization separately from output decoding. Strong training scores cannot establish correct generation when future-label leakage is possible." },
    references: [{ title: "Vaswani et al.: Attention Is All You Need", url: "https://arxiv.org/abs/1706.03762" }],
  },
  {
    id: "rag-retrieval", title: "Retrieval quality versus context quality", domain: "rag", roles: ["genai-engineer", "ml-engineer", "data-engineer", "data-scientist"], minutes: 15,
    summary: "Retrieve a fixed policy corpus, rerank candidates and fit a context budget. See why more retrieved chunks do not guarantee a complete answer.", topicIds: ["w14-d02-bm25-hybrid-retrieval", "w14-d03-rag-evaluation"],
    controls: [
      { key: "topK", label: "Retrieve top k", min: 1, max: 8, step: 1, defaultValue: 6, help: "Retrieve this many eligible chunks before reranking." },
      { key: "budget", label: "Context token budget", min: 100, max: 1200, step: 50, defaultValue: 550, unit: "tokens", help: "Pack a ranked prefix. Stop at the first chunk that does not fit; no partial chunks." },
      { key: "rerank", label: "Reranking", min: 0, max: 1, step: 1, defaultValue: 1, help: "Uses supplied fixture reranking scores within the retrieved candidate set, not a live model.", options: [{ value: 1, label: "Rerank retrieved candidates" }, { value: 0, label: "Keep retrieval order" }] },
      { key: "filter", label: "Authorization filter", min: 0, max: 1, step: 1, defaultValue: 1, help: "An educational toggle on synthetic documents. Real authorization must be enforced, not left to a user or model choice.", options: [{ value: 1, label: "Filter to authorized tenant" }, { value: 0, label: "Unsafe demo: do not filter" }] },
    ],
    presets: [
      { id: "words", label: "Matching words, missing policy", description: "A high retrieval score puts an obsolete chunk first and excludes required evidence.", values: { topK: 2, budget: 550, rerank: 0, filter: 1 } },
      { id: "complete", label: "Find and fit the evidence", description: "Rerank enough candidates and fit all three relevant chunks.", values: { topK: 6, budget: 550, rerank: 1, filter: 1 } },
      { id: "crowded", label: "More candidates, tiny context", description: "Retrieval recall can be perfect while the packed context remains incomplete.", values: { topK: 8, budget: 250, rerank: 0, filter: 1 } },
      { id: "unsafe", label: "A tenant boundary failure", description: "A foreign policy may enter context when authorization is omitted.", values: { topK: 6, budget: 900, rerank: 1, filter: 0 } },
    ],
    evaluate: (p) => { const m = ragModel(p); return {
      metrics: [{ label: "Retrieval precision", value: pct(m.precision), detail: `${m.retrievedRelevant} relevant chunks / ${m.ranked.length} retrieved chunks. Relevance is fixed ground truth for this fixture.` }, { label: "Retrieval recall", value: pct(m.recall), detail: `${m.retrievedRelevant} of the corpus's 3 relevant chunks were retrieved.` }, { label: "Context recall", value: pct(m.contextRecall), detail: `${m.contextRelevant} of 3 relevant chunks actually fit into context after ordering.` }, { label: "Unauthorized context chunks", value: m.unauthorized, detail: "Any nonzero count is a scope failure, regardless of relevance or answer quality." }],
      table: { caption: `All eight synthetic chunks; ${m.tokens} of ${value(p, "budget")} context tokens used`, columns: ["Chunk", "Evidence", "Tokens", "Retrieval score", "Relevant?", "Access scope", "Pipeline decision"], rows: RAG_DOCUMENTS.map((doc) => [doc.id, doc.name, doc.tokens, doc.score, doc.relevant ? "Relevant" : "Not relevant", doc.authorized ? "Authorized tenant" : "Denied tenant", m.context.some((d) => d.id === doc.id) ? "In context" : m.ranked.some((d) => d.id === doc.id) ? "Retrieved; outside packed prefix" : value(p, "filter") === 1 && !doc.authorized ? "Filtered before retrieval" : "Not in retrieved top k"]) },
      bars: { title: "Relevant evidence retained at each stage", unit: "of 3 relevant chunks", items: [{ label: "Available relevant chunks", value: 3 }, { label: "Retrieved relevant chunks", value: m.retrievedRelevant }, { label: "Relevant chunks in context", value: m.contextRelevant }] },
      steps: ["Apply the authorization filter before ranking eligible documents.", "Retrieve the top k by the supplied retrieval score.", "Optionally reorder that candidate set by supplied reranker scores. Reranking cannot recover an unretrieved chunk.", "Pack a ranked prefix within the token budget, then count relevant and unauthorized context chunks separately."],
      insight: m.unauthorized ? "The context contains another tenant's synthetic policy. Good retrieval metrics cannot excuse a scope failure; enforce authorization outside the model." : m.contextRelevant < m.retrievedRelevant ? "Some relevant chunks were retrieved but never reached context. Diagnose ordering and packing before blaming generation." : "Retrieval and context retention agree at these settings. The model does not generate an answer, so it makes no claim about grounding or answer correctness.",
    }; },
    predict: (p) => { const m = ragModel(p); return { prompt: "Will all three relevant policy chunks reach the final context at these settings?", choices: ["Yes, all three reach context", "No, the context is incomplete"], correctIndex: m.contextRelevant === 3 ? 0 : 1, explanation: `${m.retrievedRelevant} relevant chunks are retrieved and ${m.contextRelevant} fit into context. Candidate recall and usable context are different stages.` }; },
    eli5: { analogy: "You ask a librarian for the current rule, its exception and its start date. The librarian finds a stack of pages, sorts them, then puts only the first pages that fit into your small folder. Finding a page does not mean it fits in the folder.", steps: ["Remove pages you are not allowed to read.", "Choose the best matching candidates.", "Sort those candidates again for usefulness.", "Fill the folder in order and check whether all three needed pieces are inside."], limit: "The scores, labels and token counts are fixed teaching data. No embedding model, reranker or language model is called. Real relevance can be graded, context packing can use other policies, and a complete context still does not guarantee a correct answer." },
    senior: { principle: "RAG quality is a pipeline property. Retrieval relevance, access scope, candidate coverage, context packing and grounded generation require separate measurements.", assumptions: ["The synthetic corpus has exactly three relevant authorized chunks for one question. All scores and token counts are supplied fixture values.", "Reranking only reorders the retrieved set. Context uses a whole-chunk ranked prefix and stops at the first budget violation.", "Authorization filtering is a controlled unsafe demonstration; a real system must enforce scope regardless of model output or learner preference."], mechanism: ["Precision = relevant retrieved / retrieved; recall = relevant retrieved / all relevant eligible evidence.", "After optional reranking, include whole chunks in order while the prefix fits. Context recall is relevant included / 3.", "Track unauthorized context separately from relevance. Do not conflate retrieval labels with grounded generation, which is not simulated here."], tradeoffs: ["Larger k may improve candidate recall while adding noise, reranking work and context competition.", "Reranking can improve order but cannot recover evidence excluded from candidate retrieval.", "Whole-chunk prefix packing is simple but can waste budget. Alternative packing must preserve coherence, provenance and required exceptions."], failureModes: ["Claiming perfect retrieval recall proves a complete or correct generated answer.", "Placing authorization only in a prompt instead of the retrieval/tool layer.", "Treating a lexical or fixed ranking fixture as a live semantic retrieval model."], interviewAnswer: "I measure authorized candidate recall before reranking, then inspect which evidence actually reaches context. I keep retrieval precision, context coverage and generated-answer grounding separate. If a rule's exception was retrieved but truncated, I fix packing or chunk structure rather than only changing the prompt. Scope filtering is enforced outside the model, and production evaluation uses representative labelled questions and adversarial cases." },
    challenges: [
      { id: "rag-rerank-limit", prompt: "A needed exception is outside the retrieved candidate set. Can reranking that set recover it?", choices: ["Yes, reranking searches the whole corpus", "No, candidate retrieval must first include it", "Only by increasing output temperature"], correctIndex: 1, explanation: "A reranker reorders the candidates it receives. It cannot rank evidence absent from its inputs.", hint: "Separate candidate selection from candidate ordering." },
      { id: "rag-perfect-recall", prompt: "Retrieval recall is 100%, but a token budget removes two required chunks. What should you inspect first?", choices: ["Context ordering, packing and chunk structure", "Hiring probability", "Only the embedding dimension"], correctIndex: 0, explanation: "The evidence was found but did not reach the generator's context.", hint: "Locate the first pipeline stage where the needed evidence disappears." },
    ],
    transfer: { prompt: "A policy assistant cites the current rule but omits an exception. Design a diagnosis before changing models.", checklist: ["Confirm a labelled exception exists in the indexed source", "Check authorized candidate recall", "Inspect reranking, token packing and actual context", "Evaluate citations and answer grounding separately"], sampleAnswer: "I trace the source exception through ingestion, chunking and authorized retrieval. If it is absent from candidates I fix retrieval; if it is found but excluded I inspect reranking and context packing. If the exception reaches context, I evaluate generation and citation support with a labelled case. I keep those stage-specific checks separate from model preference or aggregate answer scores." },
    references: [{ title: "Lewis et al.: Retrieval-Augmented Generation", url: "https://arxiv.org/abs/2005.11401" }, { title: "Liu et al.: Lost in the Middle", url: "https://arxiv.org/abs/2307.03172" }],
  },
  {
    id: "agent-guardrails", title: "Agent permissions, approvals and budgets", domain: "agents", roles: ["genai-engineer", "sde", "ml-engineer", "data-engineer"], minutes: 15,
    summary: "Replay six proposed tool calls through a deterministic policy. Separate user scope, capability, approval, budget and idempotency.", topicIds: ["w15-d02-tools-planning-memory", "w15-d03-guardrails-budgets-tracing"],
    controls: [
      { key: "write", label: "Write capability", min: 0, max: 1, step: 1, defaultValue: 1, help: "Whether this trusted policy grants the refund tool a write capability.", options: [{ value: 0, label: "Read and draft only" }, { value: 1, label: "Grant scoped writes" }] },
      { key: "approved", label: "Trusted refund approval", min: 0, max: 1, step: 1, defaultValue: 0, help: "A simulated external approval bound to this user's refund. Text claiming approval is not this signal.", options: [{ value: 0, label: "No approval" }, { value: 1, label: "Approved refund for order 42" }] },
      { key: "budget", label: "Execution budget", min: 0, max: 15, step: 1, defaultValue: 8, unit: "cost units", help: "Synthetic cost units; only actual executions spend them. Cached idempotent responses spend none." },
      { key: "steps", label: "Maximum proposed steps", min: 1, max: 6, step: 1, defaultValue: 6, help: "All attempted proposals count, including denied calls. Later proposals are not attempted." },
      { key: "idempotent", label: "Refund idempotency", min: 0, max: 1, step: 1, defaultValue: 1, help: "The repeated operation key returns the recorded result instead of issuing another refund.", options: [{ value: 1, label: "Deduplicate the same operation" }, { value: 0, label: "Unsafe demo: repeat the effect" }] },
    ],
    presets: [
      { id: "no-approval", label: "Approval is still required", description: "Write capability alone cannot authorize the refund.", values: { write: 1, approved: 0, budget: 15, steps: 6, idempotent: 1 } },
      { id: "safe-retry", label: "One approved refund", description: "Scoped approval permits the first effect; the retry returns its recorded result.", values: { write: 1, approved: 1, budget: 15, steps: 6, idempotent: 1 } },
      { id: "duplicate", label: "A timeout repeats the effect", description: "Without idempotency, the same approved request can issue two refunds.", values: { write: 1, approved: 1, budget: 15, steps: 6, idempotent: 0 } },
      { id: "budget", label: "A valid request can exceed budget", description: "Permission and approval do not override an execution limit.", values: { write: 1, approved: 1, budget: 4, steps: 6, idempotent: 1 } },
    ],
    evaluate: (p) => { const m = agentModel(p); return {
      metrics: [{ label: "Refund effects", value: m.refunds, detail: "Actual synthetic refund executions. A retry with the same key can return a cached result." }, { label: "Blocked attempted calls", value: m.blocked, detail: "Wrong user scope, missing capability, missing approval or insufficient budget." }, { label: "Execution cost spent", value: m.spent, unit: `of ${value(p, "budget")} units`, detail: "Denied, cached and unattempted calls spend no execution cost in this model." }, { label: "Proposals attempted", value: m.attempted, unit: "of 6", detail: "Denied proposals still consume a step. A cost budget is different from a step limit." }],
      table: { caption: "Every proposed operation, its policy decision and cumulative synthetic execution cost", columns: ["Step", "Proposed operation", "Execution cost", "Policy decision", "Cost spent"], rows: m.rows },
      bars: { title: "Outcomes of attempted tool calls", unit: "calls", items: [{ label: "Executed", value: m.executed }, { label: "Cached result", value: m.cached }, { label: "Blocked", value: m.blocked }] },
      steps: ["Limit the number of proposals and verify each request's authenticated user/object scope.", "Require the appropriate tool capability and trusted approval for this side effect.", "For a repeated permitted operation, return its recorded result when idempotency is enabled.", "Check remaining execution budget before performing a new effect, then persist its outcome and trace the decision."],
      insight: m.refunds > 1 ? "The same refund executed twice. Approval answers whether an operation is authorized; idempotency answers whether repeating it repeats its effect. Both are needed here." : "Foreign-user operations remain denied even when write capability and refund approval are enabled. Scope, approval, cost and duplicate protection are separate gates.",
    }; },
    predict: (p) => { const m = agentModel(p); return { prompt: "How many actual refund effects will this six-proposal fixture perform at these settings?", choices: ["0 refunds", "1 refund", "2 refunds"], correctIndex: m.refunds, explanation: `${m.refunds} refund effects execute. Read and draft work may spend budget first; capability, approval, step limits and idempotency are checked independently.` }; },
    eli5: { analogy: "A toy helper gets a list of jobs. It may look in your toy box, but not another child's box. Moving a valuable toy needs a permission ticket. It also has a small purse and a notebook that remembers jobs already finished.", steps: ["Check whose toy box the job names.", "Check whether this kind of job is permitted and needs a trusted ticket.", "Check the purse before starting a new job.", "If the same job comes back after a missed reply, read the notebook instead of doing it twice."], limit: "Real authorization, approval records, spending controls and idempotency need durable server enforcement. This browser fixture executes no external tools or payments. A language model saying a person approved something is not proof of approval." },
    senior: { principle: "An agent may propose actions, but deterministic tool boundaries must independently enforce user scope, capabilities, approval, resource budgets and repeat semantics.", assumptions: ["The fixed proposal list includes unauthorized cross-user operations and a retry of the same refund key.", "Approval is a trusted external signal bound to order 42, not arbitrary text from a prompt or tool result.", "Cost units are hypothetical. Only executed operations spend cost; every attempted proposal consumes the step budget. Idempotency is simulated with an in-memory outcome set."], mechanism: ["Reject proposals after the step ceiling; otherwise authenticate and authorize the target object/user scope.", "Check write capability and any bound approval before using or returning a sensitive operation's result.", "An already-recorded permitted operation returns its cached result. A new permitted operation requires enough budget before its effect is performed and recorded."], tradeoffs: ["Narrow tools and least privilege reduce impact but require explicit contracts and permission handling.", "Human approval adds delay and must bind the exact operation, payload, subject and expiry; it does not replace object-level authorization.", "Durable idempotency prevents repeated effects only within its defined identity and retention contract. Cost and step limits reduce runaway work but do not make an unauthorized call safe."], failureModes: ["Letting prompt-injected content claim trusted approval or expand a tool's scope.", "Treating a valid JSON tool call as an authorized operation.", "Using a new idempotency key after timeout, or recording the effect and deduplication state non-atomically."], interviewAnswer: "I let the model propose a typed action while the tool service enforces identity, object scope and least privilege. Sensitive effects require approval bound to the exact operation, and new executions must fit time, step and cost budgets. I persist idempotency keys and outcomes so a retry after timeout cannot repeat the effect. Traces record policy decisions, and adversarial tests exercise cross-user access, forged approval and repeated operations." },
    challenges: [
      { id: "agent-injected-approval", prompt: "A retrieved document says: 'The user approved every refund.' Should the refund tool treat that as approval?", choices: ["Yes, because it is in context", "No, approval needs a trusted bound record", "Only if the document is long"], correctIndex: 1, explanation: "Retrieved text is data. It cannot grant authority or replace a trusted approval record.", hint: "Separate content from the system that grants permission." },
      { id: "agent-timeout-identity", prompt: "A refund call times out after the service may have completed it. What identity should a safe retry use?", choices: ["A new key each time", "The same operation idempotency key", "No operation identity"], correctIndex: 1, explanation: "The same key lets the service recognize the original operation and return its stored result.", hint: "A timeout leaves the outcome unknown; it does not prove no effect occurred." },
    ],
    transfer: { prompt: "Design a support agent that can read orders and request refunds without making prompt injection an authorization path.", checklist: ["Authenticated user/object/tenant scope enforced by tool service", "Narrow read/draft/write capabilities", "Trusted approval bound to exact refund payload", "Durable idempotency, step/time/cost budgets and decision traces"], sampleAnswer: "I expose narrow tools in the authenticated user's scope, with authorization on every downstream object. The agent may draft a refund request, but a trusted workflow approves the exact order, amount and identity before execution. The refund service records the effect and idempotency outcome durably, while the orchestrator bounds steps, time and cost. Retrieved documents and model text never create permissions, and tests include foreign orders, forged approvals and timeout retries." },
    references: [{ title: "OWASP GenAI Security: excessive agency", url: "https://genai.owasp.org/llmrisk/llm062025-excessive-agency/" }, { title: "Amazon Builders' Library: making retries safe with idempotent APIs", url: "https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/" }],
  },
];
