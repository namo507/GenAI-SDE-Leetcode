"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, Check, Repeat, Target } from "lucide-react";
import { DAY_KIND_LABELS, ROLE_LABELS } from "@/lib/curriculum";
import type { Catalog } from "@/lib/catalog";
import { TOTAL_DAYS, averageConfidence, completion, dueReviews, overallMastery, retention, todaysDay, weakAreas } from "@/lib/progress/metrics";
import { dayStatus, useClientProgress, useToday } from "@/lib/progress/hooks";
import { actions } from "@/lib/progress/store";
import { Callout, EmptyState, Meter, pct } from "@/components/ui/primitives";
import { DayTile } from "@/components/roadmap/DayTile";

const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

export function DashboardView({ catalog }: { catalog: Catalog }) {
  const progress = useClientProgress();
  const today = useToday();
  if (!progress || !today) return <div className="grid gap-6" aria-busy="true"><div className="tp-card h-48" /><div className="tp-card h-32" /></div>;

  const { settings } = progress;
  const { day, offset } = todaysDay(catalog, settings.startDate, today);
  const current = day ?? catalog.days[0]!;
  const notStarted = offset < 0;
  const finished = offset >= TOTAL_DAYS;
  const status = dayStatus(progress, current.id);
  const weekDays = catalog.days.filter((d) => d.week === current.week);
  const due = dueReviews(progress, catalog, today);
  const weak = weakAreas(progress, catalog, today, 3);
  const topicsById = new Map(catalog.topics.map((t) => [t.id, t]));
  const doneCount = Object.values(progress.days).filter((d) => d.status === "done").length;
  const expected = Math.max(0, Math.min(TOTAL_DAYS, offset + 1));
  const pace = doneCount - expected;
  const conf = averageConfidence(progress);
  const attempts = progress.attempts.length;

  return (
    <div className="grid gap-10">
      <header className="grid gap-2">
        <p className="t-label tp-muted">{longDate(today)}</p>
        <h1 className="t-title">
          {notStarted ? "Your plan has not started yet" : finished ? "You have reached the end of the plan" : `Week ${current.week}, day ${current.day}`}
        </h1>
        <p className="t-body-sm tp-muted">
          {settings.onboarded ? `Preparing for ${settings.roles.map((r) => ROLE_LABELS[r]).join(", ")} · ${settings.minutesPerDay} minutes a day` : "Using default settings."}{" "}
          <Link className="tp-link" href={settings.onboarded ? "/settings" : "/"}>
            {settings.onboarded ? "Change" : "Set up your plan"}
          </Link>
        </p>
      </header>

      {!settings.onboarded && (
        <Callout tone="note" title="Your plan starts today by default">
          Set your target role, start date and daily time on the{" "}
          <Link className="tp-link" href="/">
            welcome page
          </Link>{" "}
          so today and weak-area ranking match you.
        </Callout>
      )}

      <section aria-labelledby="today-title" className="tp-card grid gap-5 lg:grid-cols-[1fr_auto]">
        <div className="grid content-start gap-3">
          <p className="t-label text-brand">
            {notStarted ? `Starts ${longDate(settings.startDate)} · first day` : finished ? "Final day" : "Today"} · {current.label ?? DAY_KIND_LABELS[current.kind]} · {current.minutes} min
          </p>
          <h2 id="today-title" className="t-heading">
            {current.title}
          </h2>
          <p className="prose-measure t-body tp-muted">{current.summary}</p>
          <ol className="grid gap-1">
            {current.tasks.map((t, i) => (
              <li key={t.label} className="flex justify-between gap-4 t-body-sm">
                <span>
                  <span className="mr-2 font-mono tp-muted">{i + 1}.</span>
                  {t.label}
                </span>
                <span className="shrink-0 tp-muted">{t.minutes} min</span>
              </li>
            ))}
          </ol>
          {current.minutes > settings.minutesPerDay && (
            <p className="t-caption tp-muted">
              Today is planned at {current.minutes} minutes and your budget is {settings.minutesPerDay}. Do the tasks in order and carry the rest into the review day.
            </p>
          )}
          {current.topicIds.length > 0 && (
            <ul className="flex flex-wrap gap-x-4 gap-y-1 t-body-sm">
              {current.topicIds.map((id) => {
                const t = topicsById.get(id);
                return t ? (
                  <li key={id}>
                    <Link className="tp-link" href={t.href}>
                      {t.title}
                    </Link>
                  </li>
                ) : null;
              })}
            </ul>
          )}
        </div>
        <div className="flex flex-wrap content-start gap-2 lg:flex-col">
          <Link className="tp-btn tp-btn--primary" href={current.href}>
            Open day
            <ArrowRight className="tp-icon" aria-hidden />
          </Link>
          {status === "done" ? (
            <button type="button" className="tp-btn tp-btn--secondary" onClick={() => actions.setDay(current.id, "in-progress", progress.days[current.id]?.minutesSpent ?? null)}>
              <Check className="tp-icon text-positive" aria-hidden />
              Done (undo)
            </button>
          ) : (
            <button type="button" className="tp-btn tp-btn--secondary" onClick={() => actions.setDay(current.id, "done", progress.days[current.id]?.minutesSpent ?? current.minutes)}>
              <Check className="tp-icon" aria-hidden />
              Mark day done
            </button>
          )}
        </div>
      </section>

      <section aria-labelledby="metrics" className="grid gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="metrics" className="t-heading">
            Four separate measures
          </h2>
          <Link className="tp-link t-body-sm" href="/analytics">
            Details and formulas
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="tp-card">
            <Meter label="Completion" value={completion(progress)} variant="neutral" hint={`${doneCount} of ${TOTAL_DAYS} days marked done.`} />
          </div>
          <div className="tp-card">
            <Meter label="Mastery" value={overallMastery(progress, catalog.topics)} hint={attempts ? `From ${attempts} practice attempts.` : "Answer practice items to measure it."} />
          </div>
          <div className="tp-card">
            <Meter
              label="Confidence"
              value={conf === null ? null : (conf - 1) / 4}
              variant="accent"
              format={() => `${conf!.toFixed(1)} of 5`}
              hint="Your average self-rating before checking answers."
            />
          </div>
          <div className="tp-card">
            <Meter label="Retention" value={retention(progress, today)} variant="positive" hint={progress.reviewLog.length ? "On-time reviews graded Good or Easy, last 60 days." : "Starts once you do spaced reviews."} />
          </div>
        </div>
        {!notStarted && settings.onboarded && (
          <p className="t-body-sm tp-muted">
            Pace: {doneCount} days done against {expected} scheduled so far,{" "}
            {pace === 0 ? "exactly on plan." : pace > 0 ? `${pace} ${pace === 1 ? "day" : "days"} ahead.` : `${-pace} ${pace === -1 ? "day" : "days"} behind. Skipping ahead is fine; the review days are there to catch up.`}
          </p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="reviews" className="tp-card grid content-start gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 id="reviews" className="t-subheading inline-flex items-center gap-2">
              <Repeat className="tp-icon" aria-hidden />
              Reviews due
            </h2>
            <span className="tp-chip">{due.length}</span>
          </div>
          {due.length === 0 ? (
            <p className="t-body-sm tp-muted">
              {Object.keys(progress.reviews).length ? "Nothing due today. Reviewed topics come back on a growing schedule." : "Topics enter spaced review when you practice them or mark them studied."}
            </p>
          ) : (
            <>
              <ul className="grid gap-1 t-body-sm">
                {due.slice(0, 5).map((d) => (
                  <li key={d.topic.id} className="flex justify-between gap-3">
                    <Link className="tp-link" href={d.topic.href}>
                      {d.topic.title}
                    </Link>
                    <span className="shrink-0 tp-muted">{d.overdueDays === 0 ? "due today" : `${d.overdueDays} d overdue`}</span>
                  </li>
                ))}
              </ul>
              <Link className="tp-btn tp-btn--primary tp-btn--sm w-fit" href="/practice#review">
                Start review
              </Link>
            </>
          )}
        </section>
        <section aria-labelledby="weak" className="tp-card grid content-start gap-3">
          <h2 id="weak" className="t-subheading inline-flex items-center gap-2">
            <Target className="tp-icon" aria-hidden />
            Weak areas
          </h2>
          {weak.length === 0 ? (
            <p className="t-body-sm tp-muted">No weak areas yet. They appear when a topic&apos;s recent mastery is under 70% or its review is overdue.</p>
          ) : (
            <ul className="grid gap-2 t-body-sm">
              {weak.map((w) => (
                <li key={w.topic.id} className="flex justify-between gap-3">
                  <Link className="tp-link" href={w.topic.href}>
                    {w.topic.title}
                  </Link>
                  <span className="shrink-0 tp-muted">
                    {w.mastery === null ? "not practiced" : `mastery ${pct(w.mastery)}`}
                    {w.overdueDays > 0 ? `, ${w.overdueDays} d overdue` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="this-week" className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="this-week" className="t-heading inline-flex items-center gap-2">
            <CalendarClock className="tp-icon tp-icon--20" aria-hidden />
            Week {current.week}: {catalog.weeks[current.week - 1]?.title}
          </h2>
          <Link className="tp-link t-body-sm" href={`/roadmap#week-${current.week}`}>
            Full roadmap
          </Link>
        </div>
        <ol className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
          {weekDays.map((d) => (
            <li key={d.id} className="grid">
              <DayTile day={d} status={dayStatus(progress, d.id)} today={!notStarted && !finished && d.id === current.id} />
            </li>
          ))}
        </ol>
      </section>

      {attempts === 0 && (
        <EmptyState title="No practice yet">
          Open today&apos;s topic and answer its practice items. Rate your confidence first; that is what makes calibration and spaced review work.
        </EmptyState>
      )}
    </div>
  );
}
