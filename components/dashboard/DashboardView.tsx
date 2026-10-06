"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Check, Clock, Repeat, Search, Target } from "lucide-react";
import { CATEGORIES, DAY_KIND_LABELS, ROLE_LABELS, categoryOf } from "@/lib/curriculum";
import type { Catalog } from "@/lib/catalog";
import { TOTAL_DAYS, averageConfidence, completion, dueReviews, overallMastery, retention, todaysDay, topicMastery, weakAreas } from "@/lib/progress/metrics";
import { dayStatus, useClientProgress, useToday } from "@/lib/progress/hooks";
import { actions } from "@/lib/progress/store";
import { Callout, Meter, pct } from "@/components/ui/primitives";
import { DayTile } from "@/components/roadmap/DayTile";
import { CATEGORY_ICONS } from "@/components/topics/categoryIcons";

const longDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

const fadeUp = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

export function DashboardView({ catalog }: { catalog: Catalog }) {
  const progress = useClientProgress();
  const today = useToday();
  if (!progress || !today)
    return (
      <div className="grid gap-6" aria-busy="true" aria-label="Loading your plan">
        <div className="tp-skeleton h-10 w-72" />
        <div className="tp-skeleton h-52" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="tp-skeleton h-24" />
          ))}
        </div>
      </div>
    );

  const { settings } = progress;
  const { day, offset } = todaysDay(catalog, settings.startDate, today);
  const current = day ?? catalog.days[0]!;
  const notStarted = offset < 0;
  const finished = offset >= TOTAL_DAYS;
  const status = dayStatus(progress, current.id);
  const weekDays = catalog.days.filter((d) => d.week === current.week);
  const due = dueReviews(progress, catalog, today);
  const weak = weakAreas(progress, catalog, today, 4);
  const topicsById = new Map(catalog.topics.map((t) => [t.id, t]));
  const doneCount = Object.values(progress.days).filter((d) => d.status === "done").length;
  const expected = Math.max(0, Math.min(TOTAL_DAYS, offset + 1));
  const pace = doneCount - expected;
  const conf = averageConfidence(progress);
  const attempts = progress.attempts.length;
  const roles = new Set(settings.roles);

  const categories = CATEGORIES.map((c) => {
    const topics = catalog.topics.filter((t) => categoryOf(t.domain).id === c.id);
    const relevant = topics.filter((t) => t.roles.some((r) => roles.has(r)));
    const masteries = topics.map((t) => topicMastery(progress, t.id)).filter((m): m is number => m !== null);
    return { ...c, total: topics.length, relevant: relevant.length, attempted: masteries.length, mastery: masteries.length ? masteries.reduce((a, b) => a + b, 0) / masteries.length : null };
  }).filter((c) => c.total > 0);

  return (
    <motion.div className="grid gap-8" initial="hidden" animate="show" transition={{ staggerChildren: 0.05 }}>
      <motion.header variants={fadeUp} className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <p className="t-body-sm tp-muted">{longDate(today)}</p>
          <h1 className="t-title">{notStarted ? "Your plan starts soon" : finished ? "You finished the 16 weeks" : `Week ${current.week} · Day ${current.day}`}</h1>
          <p className="t-body-sm tp-muted">
            {settings.onboarded ? settings.roles.map((r) => ROLE_LABELS[r]).join(" · ") : "Default plan for every role"} · {settings.minutesPerDay} min/day ·{" "}
            <Link className="tp-link" href={settings.onboarded ? "/settings" : "/"}>
              {settings.onboarded ? "Edit" : "Personalize"}
            </Link>
          </p>
        </div>
        <Link href="/topics" className="tp-btn tp-btn--secondary">
          <Search className="tp-icon" aria-hidden />
          Browse all topics
        </Link>
      </motion.header>

      {!settings.onboarded && (
        <motion.div variants={fadeUp}>
          <Callout tone="note" title="Make the plan yours">
            Choose your target role, start date and daily time on the{" "}
            <Link className="tp-link" href="/">
              welcome page
            </Link>
            . Weak areas and category progress then focus on your role.
          </Callout>
        </motion.div>
      )}

      <motion.section variants={fadeUp} aria-labelledby="today-title" className="tp-card grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="grid content-start gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="tp-chip tp-chip--brand">{notStarted ? "First day" : finished ? "Final day" : "Today"}</span>
            <span className="tp-chip">{current.label ?? DAY_KIND_LABELS[current.kind]}</span>
            <span className="tp-chip">
              <Clock className="tp-icon" aria-hidden />
              {current.minutes} min
            </span>
          </div>
          <h2 id="today-title" className="t-heading">
            {current.title}
          </h2>
          <p className="prose-measure t-body-sm tp-muted">{current.summary}</p>
          <ol className="mt-1 grid gap-1.5">
            {current.tasks.map((t, i) => (
              <li key={t.label} className="flex items-baseline justify-between gap-4 border-b border-border pb-1.5 t-body-sm last:border-0">
                <span className="flex gap-2">
                  <span className="w-4 shrink-0 font-mono text-[12px] tp-muted">{i + 1}</span>
                  {t.label}
                </span>
                <span className="shrink-0 tp-num tp-muted">{t.minutes}m</span>
              </li>
            ))}
          </ol>
          {current.minutes > settings.minutesPerDay && (
            <p className="t-caption tp-muted">Planned for {current.minutes} minutes against your {settings.minutesPerDay}. Work top to bottom and carry the rest into review day.</p>
          )}
          {current.topicIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {current.topicIds.map((id) => {
                const t = topicsById.get(id);
                return t ? (
                  <Link key={id} href={t.href} className="tp-chip hover:border-border-strong hover:text-ink">
                    {t.title}
                  </Link>
                ) : null;
              })}
            </div>
          )}
        </div>
        <div className="flex flex-wrap content-start gap-2 lg:w-44 lg:flex-col">
          <Link className="tp-btn tp-btn--primary" href={current.href}>
            Start the day
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
              Mark done
            </button>
          )}
          {!notStarted && settings.onboarded && (
            <p className="t-caption tp-muted lg:mt-2">
              {pace === 0 ? "On plan." : pace > 0 ? `${pace} ${pace === 1 ? "day" : "days"} ahead.` : `${-pace} ${pace === -1 ? "day" : "days"} behind. Review days are there to catch up.`}
            </p>
          )}
        </div>
      </motion.section>

      <motion.section variants={fadeUp} aria-labelledby="metrics" className="grid gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="metrics" className="t-subheading">
            Four separate measures
          </h2>
          <Link className="tp-link t-body-sm" href="/analytics">
            Formulas
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="tp-card !p-4">
            <Meter label="Completion" value={completion(progress)} variant="neutral" hint={`${doneCount} of ${TOTAL_DAYS} days marked done.`} />
          </div>
          <div className="tp-card !p-4">
            <Meter label="Mastery" value={overallMastery(progress, catalog.topics)} hint={attempts ? `From ${attempts} practice attempts.` : "Answer practice items to measure it."} />
          </div>
          <div className="tp-card !p-4">
            <Meter label="Confidence" value={conf === null ? null : (conf - 1) / 4} variant="accent" format={() => `${conf!.toFixed(1)} / 5`} hint="Self-rating before checking answers." />
          </div>
          <div className="tp-card !p-4">
            <Meter label="Retention" value={retention(progress, today)} variant="positive" hint={progress.reviewLog.length ? "On-time reviews graded Good or Easy." : "Starts with spaced reviews."} />
          </div>
        </div>
      </motion.section>

      <motion.div variants={fadeUp} className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="reviews" className="tp-card grid content-start gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 id="reviews" className="t-subheading inline-flex items-center gap-2">
              <Repeat className="tp-icon tp-muted" aria-hidden />
              Reviews due
            </h2>
            <span className={`tp-chip ${due.length ? "tp-chip--accent" : ""}`}>{due.length}</span>
          </div>
          {due.length === 0 ? (
            <p className="t-body-sm tp-muted">
              {Object.keys(progress.reviews).length ? "Nothing due today. Topics return on a growing schedule." : "Topics enter spaced review when you practice them or mark them studied."}
            </p>
          ) : (
            <>
              <ul className="grid gap-1.5 t-body-sm">
                {due.slice(0, 5).map((d) => (
                  <li key={d.topic.id} className="flex justify-between gap-3">
                    <Link className="tp-link truncate" href={d.topic.href}>
                      {d.topic.title}
                    </Link>
                    <span className="shrink-0 tp-muted">{d.overdueDays === 0 ? "today" : `${d.overdueDays}d late`}</span>
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
            <Target className="tp-icon tp-muted" aria-hidden />
            Focus next
          </h2>
          {weak.length === 0 ? (
            <p className="t-body-sm tp-muted">Weak areas appear when recent mastery is under 70% or a review is overdue.</p>
          ) : (
            <ul className="grid gap-1.5 t-body-sm">
              {weak.map((w) => (
                <li key={w.topic.id} className="flex justify-between gap-3">
                  <Link className="tp-link truncate" href={w.topic.href}>
                    {w.topic.title}
                  </Link>
                  <span className="shrink-0 tp-muted">
                    {w.mastery === null ? "not practiced" : pct(w.mastery)}
                    {w.overdueDays > 0 ? ` · ${w.overdueDays}d late` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </motion.div>

      <motion.section variants={fadeUp} aria-labelledby="this-week" className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="this-week" className="t-subheading">
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
      </motion.section>

      <motion.section variants={fadeUp} aria-labelledby="by-category" className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="by-category" className="t-subheading">
            Progress by category
          </h2>
          <Link className="tp-link t-body-sm" href="/topics">
            All {catalog.topics.length} topics
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((c) => {
            const Icon = CATEGORY_ICONS[c.id];
            return (
              <li key={c.id}>
                <Link href={`/topics#${c.id}`} className="tp-card grid gap-3 !p-4">
                  <span className="flex items-center gap-2 font-semibold t-body-sm">
                    <Icon className="tp-icon text-brand" aria-hidden />
                    {c.label}
                  </span>
                  <Meter label="Mastery" value={c.mastery} hint={`${c.attempted} of ${c.total} practiced${c.relevant < c.total ? ` · ${c.relevant} for your roles` : ""}`} />
                </Link>
              </li>
            );
          })}
        </ul>
      </motion.section>
    </motion.div>
  );
}
