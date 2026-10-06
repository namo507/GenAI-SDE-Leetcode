"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ChevronDown, Crosshair } from "lucide-react";
import { DOMAIN_LABELS, TRACK_LABELS, type Track } from "@/lib/curriculum";
import type { Catalog } from "@/lib/catalog";
import { todaysDay } from "@/lib/progress/metrics";
import { dayStatus, useClientProgress, useToday } from "@/lib/progress/hooks";
import { DayTile } from "./DayTile";

const hours = (m: number) => `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`;

/** Phases group the 16 weeks into the order a learner actually climbs. */
export const PHASES = [
  { title: "Foundations and core CS", weeks: [1, 4], note: "Python and R, complexity, SQL and the algorithm patterns every interview uses." },
  { title: "Statistics, analytics and machine learning", weeks: [5, 8], note: "Inference and experiments, analyst craft, classical and advanced ML." },
  { title: "Deep learning, systems, data and cloud", weeks: [9, 12], note: "Neural networks, system design, data engineering and cloud operations." },
  { title: "GenAI and LLM engineering", weeks: [13, 15], note: "LLMs, retrieval and agents, from tokens to production guardrails." },
  { title: "Capstone and interview loops", weeks: [16, 16], note: "Ship a portfolio project and rehearse full interview loops." },
] as const;

type Props = { catalog: Pick<Catalog, "weeks" | "days" | "topics"> };

const subscribeHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

/** Week number named by the URL hash (#week-5 or #w05-d03), if any. */
function weekFromHash(hash: string): number | null {
  const m = /^week-(\d+)$/.exec(hash) ?? /^w(\d{2})-d\d{2}$/.exec(hash);
  return m ? Number(m[1]) : null;
}

export function RoadmapView({ catalog }: Props) {
  const progress = useClientProgress();
  const today = useToday();
  const [track, setTrack] = useState<Track | "all">("all");
  const todayDay = progress && today && progress.settings.onboarded ? todaysDay(catalog, progress.settings.startDate, today).day : null;
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash.slice(1), () => "");
  const hashWeek = weekFromHash(hash);
  const [openWeeks, setOpenWeeks] = useState<Set<number> | null>(null);
  const expanded = openWeeks ?? new Set([hashWeek ?? todayDay?.week ?? 1]);

  // A deep link to a collapsed week or day expands it above; bring it into view once it exists.
  useEffect(() => {
    if (hash) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ block: "start" }));
  }, [hash, progress]);
  const tracks = [...new Set(catalog.weeks.map((w) => w.track))];
  const daysById = new Map(catalog.days.map((d) => [d.id, d]));
  const topicsByWeek = new Map<number, { title: string; href: string }[]>();
  for (const t of catalog.topics) topicsByWeek.set(t.week, [...(topicsByWeek.get(t.week) ?? []), { title: t.title, href: t.href }]);

  const toggle = (n: number) => {
    const next = new Set(expanded);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    setOpenWeeks(next);
  };
  const visible = catalog.weeks.filter((w) => track === "all" || w.track === track);

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter weeks by track">
          <button type="button" className="tp-chip min-h-8" aria-pressed={track === "all"} onClick={() => setTrack("all")}>
            All tracks
          </button>
          {tracks.map((t) => (
            <button key={t} type="button" className="tp-chip min-h-8" aria-pressed={track === t} onClick={() => setTrack(t)}>
              {TRACK_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="tp-btn tp-btn--ghost tp-btn--sm" onClick={() => setOpenWeeks(new Set(catalog.weeks.map((w) => w.number)))}>
            Expand all
          </button>
          <button type="button" className="tp-btn tp-btn--ghost tp-btn--sm" onClick={() => setOpenWeeks(new Set())}>
            Collapse all
          </button>
          {todayDay && (
            <a
              className="tp-btn tp-btn--secondary tp-btn--sm"
              href={`#${todayDay.id}`}
              onClick={() => {
                setTrack("all");
                setOpenWeeks(new Set([...expanded, todayDay.week]));
              }}
            >
              <Crosshair className="tp-icon" aria-hidden />
              Today
            </a>
          )}
        </div>
      </div>
      <p className="tp-sr-only" role="status">
        Showing {visible.length} of {catalog.weeks.length} weeks
      </p>

      {PHASES.map((phase, pi) => {
        const weeks = visible.filter((w) => w.number >= phase.weeks[0] && w.number <= phase.weeks[1]);
        if (!weeks.length) return null;
        return (
          <section key={phase.title} aria-labelledby={`phase-${pi}`} className="grid gap-3">
            <div className="grid gap-0.5">
              <p className="tp-eyebrow">
                Phase {pi + 1} · Weeks {phase.weeks[0]}
                {phase.weeks[1] !== phase.weeks[0] ? `–${phase.weeks[1]}` : ""}
              </p>
              <h2 id={`phase-${pi}`} className="t-heading">
                {phase.title}
              </h2>
              <p className="t-body-sm tp-muted">{phase.note}</p>
            </div>
            <ol className="grid gap-2">
              {weeks.map((w) => {
                const done = progress ? w.dayIds.filter((id) => progress.days[id]?.status === "done").length : 0;
                const isOpen = expanded.has(w.number);
                const topics = topicsByWeek.get(w.number) ?? [];
                return (
                  <li key={w.number} id={`week-${w.number}`} className="tp-card scroll-mt-24 !p-0">
                    <h3>
                      <button
                        type="button"
                        className="flex w-full items-center gap-4 rounded-[var(--radius-lg)] px-5 py-4 text-left hover:bg-surface-sunken/60"
                        aria-expanded={isOpen}
                        aria-controls={`week-${w.number}-body`}
                        onClick={() => toggle(w.number)}
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-md)] border border-border font-mono text-[13px] font-semibold tp-num">{w.number}</span>
                        <span className="grid min-w-0 flex-1 gap-0.5">
                          <span className="t-subheading">{w.title}</span>
                          <span className="truncate t-caption tp-muted">
                            {TRACK_LABELS[w.track]} · {hours(w.minutes)} · {topics.length} topics · {w.domains.map((d) => DOMAIN_LABELS[d]).join(", ")}
                          </span>
                        </span>
                        <span className="hidden w-28 shrink-0 sm:grid sm:gap-1">
                          <span className="text-right t-caption tp-muted tp-num">{progress ? `${done}/7 days` : "7 days"}</span>
                          <span className="h-1.5 overflow-hidden rounded-full bg-surface-sunken" aria-hidden>
                            <span className="block h-full rounded-full bg-positive" style={{ width: `${(done / 7) * 100}%` }} />
                          </span>
                        </span>
                        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0 tp-muted" aria-hidden>
                          <ChevronDown className="tp-icon" />
                        </motion.span>
                      </button>
                    </h3>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          id={`week-${w.number}-body`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="grid gap-4 border-t border-border px-5 pb-5 pt-4">
                            <p className="prose-measure t-body-sm tp-muted">{w.summary}</p>
                            <ol className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
                              {w.dayIds.map((id) => {
                                const d = daysById.get(id)!;
                                return (
                                  <li key={id} id={id} className="scroll-mt-24 grid">
                                    <DayTile day={d} status={progress ? dayStatus(progress, id) : "none"} today={id === todayDay?.id} />
                                  </li>
                                );
                              })}
                            </ol>
                            {topics.length > 0 && (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="t-caption tp-muted">Topics:</span>
                                {topics.map((t) => (
                                  <Link key={t.href} href={t.href} className="tp-chip hover:border-border-strong hover:text-ink">
                                    {t.title}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
