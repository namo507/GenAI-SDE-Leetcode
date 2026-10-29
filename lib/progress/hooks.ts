"use client";

import type { DayStatus } from "@/components/roadmap/DayTile";
import { todayIso, type Progress } from "./schema";
import { useHydrated, useProgress } from "./store";

/** Today's local date, or null before hydration so server and client markup agree. */
export function useToday(): string | null {
  const hydrated = useHydrated();
  return hydrated ? todayIso() : null;
}

export function dayStatus(p: Progress, dayId: string): DayStatus {
  const rec = p.days[dayId];
  return rec?.status === "done" ? "done" : rec?.status === "in-progress" ? "active" : "none";
}

/** Progress after hydration, or null before it (server render and first client render). */
export function useClientProgress(): Progress | null {
  const p = useProgress();
  return useHydrated() ? p : null;
}
