"use client";

import { useSyncExternalStore } from "react";
import type { Language } from "@/lib/curriculum";
import { getPythonRuntime } from "@/lib/runtime/python";
import { getRRuntime } from "@/lib/runtime/r";
import type { Runtime, RuntimeSnapshot } from "@/lib/runtime/types";

export const runtimeFor = (lang: Language): Runtime => (lang === "python" ? getPythonRuntime() : getRRuntime());

const IDLE: Record<Language, RuntimeSnapshot> = {
  python: { state: "idle", detail: "Python runtime not loaded" },
  r: { state: "idle", detail: "R runtime not loaded" },
};

const subscribers = {
  python: (cb: () => void) => getPythonRuntime().subscribe(cb),
  r: (cb: () => void) => getRRuntime().subscribe(cb),
};
const snapshots = {
  python: () => getPythonRuntime().snapshot(),
  r: () => getRRuntime().snapshot(),
};

/** Live state of a language runtime (idle, loading, ready, running, error). */
export function useRuntimeState(lang: Language): RuntimeSnapshot {
  return useSyncExternalStore(subscribers[lang], snapshots[lang], () => IDLE[lang]);
}
