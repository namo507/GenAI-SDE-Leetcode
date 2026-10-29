"use client";

import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

/** Wall-clock stopwatch. Elapsed time comes from timestamps, so throttled background tabs stay accurate. */
export function useStopwatch() {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [banked, setBanked] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (startedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [startedAt]);

  const elapsedMs = banked + (startedAt === null ? 0 : Math.max(0, now - startedAt));
  return {
    running: startedAt !== null,
    elapsedMs,
    start() {
      const t = Date.now();
      setStartedAt(t);
      setNow(t);
    },
    pause() {
      const t = Date.now();
      setBanked((b) => b + (startedAt === null ? 0 : t - startedAt));
      setStartedAt(null);
    },
    reset() {
      setStartedAt(null);
      setBanked(0);
      setNow(0);
    },
  };
}

export type Stopwatch = ReturnType<typeof useStopwatch>;

export const clock = (totalSeconds: number) => {
  const s = Math.abs(Math.round(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/** A countdown display with start, pause and reset. Past zero it counts overtime instead of stopping. */
export function Countdown({ watch, seconds, label }: { watch: Stopwatch; seconds: number; label: string }) {
  const remaining = seconds - watch.elapsedMs / 1000;
  const over = remaining <= 0;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className={`font-mono text-2xl font-semibold tabular-nums ${over ? "text-caution" : ""}`} role="timer" aria-label={`${label}: ${over ? "overtime" : "remaining"} ${clock(remaining)}`}>
        {over ? "+" : ""}
        {clock(remaining)}
      </span>
      <span className="tp-sr-only" role="status">
        {over ? `${label}: time is up.` : ""}
      </span>
      {watch.running ? (
        <button type="button" className="tp-btn tp-btn--secondary tp-btn--sm" onClick={watch.pause}>
          <Pause className="tp-icon" aria-hidden />
          Pause
        </button>
      ) : (
        <button type="button" className="tp-btn tp-btn--primary tp-btn--sm" onClick={watch.start}>
          <Play className="tp-icon" aria-hidden />
          {watch.elapsedMs > 0 ? "Resume" : "Start timer"}
        </button>
      )}
      <button type="button" className="tp-btn tp-btn--ghost tp-btn--sm" onClick={watch.reset} disabled={watch.elapsedMs === 0 && !watch.running}>
        <RotateCcw className="tp-icon" aria-hidden />
        Reset
      </button>
    </div>
  );
}
