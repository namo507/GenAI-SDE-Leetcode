"use client";

import { DOMAIN_LABELS, type Domain } from "@/lib/curriculum";
import type { Catalog } from "@/lib/catalog";
import { ROUND_SCORE_LABELS } from "@/lib/content-types";
import {
  METRIC_DEFINITIONS,
  READINESS_FORMULA,
  READINESS_WEIGHTS,
  TOTAL_DAYS,
  averageConfidence,
  calibration,
  completion,
  masteryByDomain,
  overallMastery,
  readiness,
  retention,
  timeVsPlan,
} from "@/lib/progress/metrics";
import { daysBetween } from "@/lib/progress/srs";
import { useClientProgress, useToday } from "@/lib/progress/hooks";
import { Callout, EmptyState, Meter, pct } from "@/components/ui/primitives";
import { CalibrationChart, ChartFrame, DataTable, LegendItem, TimeVsPlanChart } from "./charts";

const fmt = (v: number | null) => (v === null ? "No data" : pct(v));

export function AnalyticsView({ catalog }: { catalog: Catalog }) {
  const progress = useClientProgress();
  const today = useToday();
  if (!progress || !today) return <div className="grid gap-6" aria-busy="true"><div className="tp-card h-40" /><div className="tp-card h-64" /></div>;

  const comp = completion(progress);
  const mastery = overallMastery(progress, catalog.topics);
  const conf = averageConfidence(progress);
  const ret = retention(progress, today);
  const cal = calibration(progress);
  const ready = readiness(progress, catalog, today);
  const domains = masteryByDomain(progress, catalog);
  const time = timeVsPlan(progress, catalog);
  const attemptedTopics = new Set(progress.attempts.map((a) => a.topicId).filter(Boolean)).size;
  const recentReviews = progress.reviewLog.filter((r) => daysBetween(r.at, today) <= 60).length;
  const doneDays = Object.values(progress.days).filter((d) => d.status === "done").length;
  const loggedTotal = time.reduce((s, w) => s + w.actual, 0);
  const plannedDone = time.reduce((s, w) => s + (w.actual > 0 ? w.planned : 0), 0);

  const contributions = [
    { name: "Mastery", value: ready.parts.mastery, weight: READINESS_WEIGHTS.mastery, used: ready.parts.mastery ?? 0 },
    { name: "Retention", value: ready.parts.retention, weight: READINESS_WEIGHTS.retention, used: ready.parts.retention ?? 0 },
    { name: "Completion", value: ready.parts.completion, weight: READINESS_WEIGHTS.completion, used: ready.parts.completion },
    {
      name: "Calibration (1 minus error)",
      value: ready.parts.calibration === null ? null : 1 - ready.parts.calibration,
      weight: READINESS_WEIGHTS.calibration,
      used: ready.parts.calibration === null ? 0 : 1 - ready.parts.calibration,
    },
  ];

  const kinds = new Map<string, { n: number; score: number; used: number; planned: number }>();
  for (const m of progress.mocks)
    for (const r of m.rounds) {
      const k = kinds.get(r.kind) ?? { n: 0, score: 0, used: 0, planned: 0 };
      if (r.score !== null) {
        k.n++;
        k.score += r.score;
      }
      k.used += r.usedSeconds;
      k.planned += r.plannedSeconds;
      kinds.set(r.kind, k);
    }

  return (
    <div className="grid gap-8">
      <section aria-labelledby="measures" className="grid gap-4">
        <h2 id="measures" className="t-heading">
          Four measures, kept separate
        </h2>
        <p className="prose-measure t-body-sm tp-muted">
          Finishing days is not the same as knowing the material, feeling sure is not the same as being right, and knowing something today is not the same as remembering it next
          month. Each measure below comes from its own records.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="tp-card grid gap-2">
            <Meter label="Completion" value={comp} variant="neutral" />
            <p className="t-caption tp-muted">
              {METRIC_DEFINITIONS.completion} {doneDays} of {TOTAL_DAYS} days.
            </p>
          </div>
          <div className="tp-card grid gap-2">
            <Meter label="Mastery" value={mastery} />
            <p className="t-caption tp-muted">
              {METRIC_DEFINITIONS.mastery} {attemptedTopics} of {catalog.topics.length} topics attempted.
            </p>
          </div>
          <div className="tp-card grid gap-2">
            <Meter label="Confidence" value={conf === null ? null : (conf - 1) / 4} variant="accent" format={() => `${conf!.toFixed(1)} of 5`} />
            <p className="t-caption tp-muted">
              {METRIC_DEFINITIONS.confidence} Last {Math.min(50, progress.attempts.length)} attempts.
            </p>
          </div>
          <div className="tp-card grid gap-2">
            <Meter label="Retention" value={ret} variant="positive" />
            <p className="t-caption tp-muted">
              {METRIC_DEFINITIONS.retention} {recentReviews} reviews in the window.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="indicator" className="tp-card grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-1">
            <h2 id="indicator" className="t-heading">
              Learning indicator
            </h2>
            <p className="t-body-sm tp-muted">A weighted summary of your study data. It is not a hiring probability and it does not predict interview outcomes.</p>
          </div>
          <p className="t-numeral" aria-label={`Learning indicator ${pct(ready.value)}`}>
            {pct(ready.value)}
          </p>
        </div>
        <p className="rounded-[var(--radius-md)] bg-surface-sunken p-3 font-mono text-[13px] leading-5">{READINESS_FORMULA}</p>
        <DataTable
          caption="How the learning indicator is computed"
          head={["Input", "Your value", "Weight", "Contribution"]}
          rows={contributions.map((c) => [c.name, fmt(c.value), c.weight.toFixed(2), `${(c.weight * c.used * 100).toFixed(1)} points`])}
        />
      </section>

      <section aria-labelledby="domains" className="tp-card grid gap-4">
        <div className="grid gap-1">
          <h2 id="domains" className="t-heading">
            Mastery by domain
          </h2>
          <p className="t-body-sm tp-muted">Average recent mastery over the topics you have attempted in each domain. Untouched domains show no data rather than zero.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {domains.map((d) => (
            <Meter key={d.domain} label={DOMAIN_LABELS[d.domain as Domain]} value={d.mastery} hint={`${d.attempted} of ${d.total} topics attempted`} />
          ))}
        </div>
      </section>

      {progress.attempts.length === 0 ? (
        <section aria-labelledby="cal-empty" className="grid gap-2">
          <h2 id="cal-empty" className="t-heading">
            Calibration
          </h2>
          <EmptyState title="No attempts yet">Rate your confidence and check answers on any practice item. Calibration compares the two.</EmptyState>
        </section>
      ) : (
        <ChartFrame
          id="calibration"
          title="Calibration"
          description={
            <>
              {METRIC_DEFINITIONS.calibration} Your error is {cal.error === null ? "not measurable yet" : pct(cal.error)}. Points above the dashed line mean you were right more often than
              you claimed; below it, less often.
            </>
          }
          legend={
            <>
              <LegendItem swatch={<span className="inline-block h-3 w-3 rounded-full bg-[var(--chart-1)]" aria-hidden />} label="Your accuracy at each confidence level" />
              <LegendItem swatch={<span className="inline-block w-5 border-t-2 border-dashed border-[var(--chart-reference)]" aria-hidden />} label="Perfect calibration" />
            </>
          }
          chart={
            <CalibrationChart
              rows={cal.rows}
              summary={`Calibration plot. ${cal.rows
                .filter((r) => r.accuracy !== null)
                .map((r) => `${r.label}: claimed ${pct(r.stated)}, correct ${pct(r.accuracy!)} over ${r.n} attempts`)
                .join("; ")}.`}
            />
          }
          table={
            <DataTable
              caption="Calibration by confidence level"
              head={["Confidence", "Claims", "Attempts", "Correct"]}
              rows={cal.rows.map((r) => [r.label, pct(r.stated), r.n, r.accuracy === null ? "No data" : pct(r.accuracy)])}
            />
          }
        />
      )}

      <ChartFrame
        id="time"
        title="Time against plan"
        description={
          loggedTotal
            ? `You logged ${Math.round(loggedTotal / 60)} hours on days marked done, against ${Math.round(plannedDone / 60)} hours planned for those weeks.`
            : "Mark days done on the roadmap and log your minutes to compare them with the plan."
        }
        legend={
          <>
            <LegendItem swatch={<span className="tp-swatch bg-[var(--chart-2)]" aria-hidden />} label="Planned minutes" />
            <LegendItem swatch={<span className="tp-swatch bg-[var(--chart-1)]" aria-hidden />} label="Logged minutes (days done)" />
          </>
        }
        chart={<TimeVsPlanChart data={time} summary={`Planned versus logged minutes for 16 weeks. ${loggedTotal} minutes logged in total.`} />}
        table={<DataTable caption="Planned and logged minutes per week" head={["Week", "Planned (min)", "Logged (min)"]} rows={time.map((w) => [`Week ${w.week}`, w.planned, w.actual])} />}
      />

      <section aria-labelledby="mocks" className="tp-card grid gap-4">
        <div className="grid gap-1">
          <h2 id="mocks" className="t-heading">
            Mock interview self-scores
          </h2>
          <p className="t-body-sm tp-muted">Averages of your own scores per round type (Not yet 0 to Strong 3) and the time you used compared with the time planned.</p>
        </div>
        {kinds.size === 0 ? (
          <p className="t-body-sm tp-muted">No mock loops saved yet.</p>
        ) : (
          <DataTable
            caption="Mock interview averages by round type"
            head={["Round type", "Scored rounds", "Average self-score", "Time used"]}
            rows={[...kinds.entries()].map(([k, v]) => [
              k.replace("-", " "),
              v.n,
              v.n ? `${(v.score / v.n).toFixed(1)} (${ROUND_SCORE_LABELS[Math.round(v.score / v.n)]})` : "No data",
              v.planned ? `${Math.round((v.used / v.planned) * 100)}% of planned` : "No data",
            ])}
          />
        )}
      </section>

      <Callout tone="note" title="Where these numbers come from">
        Everything is computed in your browser from what you record here. Self-grading is honest only if you are, and small samples swing a lot: treat any measure based on a
        handful of attempts as a rough signal.
      </Callout>
    </div>
  );
}
