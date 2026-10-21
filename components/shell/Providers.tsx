"use client";

import { MotionConfig } from "motion/react";
import { useEffect, useSyncExternalStore } from "react";
import { useProgress } from "@/lib/progress/store";

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** True when motion should be reduced: the OS preference, unless the learner overrode it in Settings. */
export function useReducedMotionPreference(): boolean {
  const { settings } = useProgress();
  const os = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  if (settings.motion === "reduce") return true;
  if (settings.motion === "full") return false;
  return os;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const { settings } = useProgress();

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", settings.theme);
    if (settings.motion === "system") root.removeAttribute("data-motion");
    else root.setAttribute("data-motion", settings.motion);
  }, [settings.theme, settings.motion]);

  const reducedMotion = settings.motion === "reduce" ? "always" : settings.motion === "full" ? "never" : "user";
  return <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>;
}
