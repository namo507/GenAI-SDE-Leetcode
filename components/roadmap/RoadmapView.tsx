"use client";

import { useState } from "react";
import { Crosshair } from "lucide-react";
import { DOMAIN_LABELS, TRACK_LABELS, type Track } from "@/lib/curriculum";
import type { Catalog } from "@/lib/catalog";
import { todaysDay } from "@/lib/progress/metrics";
import { dayStatus, useClientProgress, useToday } from "@/lib/progress/hooks";
import { DayTile } from "./DayTile";

const hours = (m: number) => `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`;

export function RoadmapView({ catalog }: { catalog: Pick<Catalog, "weeks" | "days"> }) {
  const progress = useClientProgress();
  const today = useToday();
  const [track, setTrack] = useState<Track | "all">("all");
  const tracks = [...new Set(catalog.weeks.map((w) => w.track))];
  const todayId = progress && today && progress.settings.onboarded ? todaysDay(catalog, progress.settings.startDate, today).day?.id : undefined;
  const daysById = new Map(catalog.days.map((d) => [d.id, d]));
  const weeks = catalog.weeks.filter((w) => track === "all" || w.track === track);

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
        {todayId && (
          <a className="tp-btn tp-btn--secondary tp-btn--sm" href={`#${todayId}`} onClick={() => setTrack("all")}>
            <Crosshair className="tp-icon" aria-hidden />
            Jump to today
          </a>
        )}
      </div>
      <p className="tp-sr-only" role="status">
        Showing {weeks.length} of {catalog.weeks.length} weeks
      </p>

      {weeks.map((w) => {
        const done = progress ? w.dayIds.filter((id) => progress.days[id]?.status === "done").length : 0;
        return (
          <section key={w.number} id={`week-${w.number}`} aria-labelledby={`week-${w.number}-title`} className="scroll-mt-24 grid gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="grid gap-1">
                <p className="t-label tp-muted">
                  Week {w.number} · {TRACK_LABELS[w.track]} · {hours(w.minutes)}
                </p>
                <h2 id={`week-${w.number}-title`} className="t-heading">
                  {w.title}
                </h2>
                <p className="prose-measure t-body-sm tp-muted">{w.summary}</p>
                <p className="t-caption tp-muted">{w.domains.map((d) => DOMAIN_LABELS[d]).join(" · ")}</p>
              </div>
              <span className={`tp-chip ${done === 7 ? "tp-chip--positive" : ""}`}>{progress ? `${done} of 7 days done` : "7 days"}</span>
            </div>
            <ol className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
              {w.dayIds.map((id) => {
                const d = daysById.get(id)!;
                return (
                  <li key={id} id={id} className="scroll-mt-24 grid">
                    <DayTile day={d} status={progress ? dayStatus(progress, id) : "none"} today={id === todayId} />
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
