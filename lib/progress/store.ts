"use client";

/**
 * A tiny external store for learner progress, persisted to localStorage.
 * Every read and write is wrapped so private browsing or blocked storage
 * degrades to an in-memory session instead of breaking the app.
 */
import { useSyncExternalStore } from "react";
import {
  PROGRESS_VERSION,
  ProgressSchema,
  STORAGE_KEY,
  defaultProgress,
  todayIso,
  type Attempt,
  type DayRecord,
  type MockResult,
  type Progress,
  type Settings,
} from "./schema";
import { newCard, schedule } from "./srs";

const SERVER_SNAPSHOT: Progress = defaultProgress("2026-01-01");
let state: Progress | null = null;
let storageAvailable = true;
const listeners = new Set<() => void>();

function read(): Progress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = ProgressSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : defaultProgress();
  } catch {
    storageAvailable = false;
    return defaultProgress();
  }
}

function write(next: Progress) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function getProgress(): Progress {
  if (state === null) state = read();
  return state;
}

function update(fn: (draft: Progress) => Progress) {
  state = fn(getProgress());
  write(state);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      state = read();
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getProgress, () => SERVER_SNAPSHOT);
}

const noopSubscribe = () => () => {};
/** True after hydration, so client-only values (today, stored progress) can render. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function isStorageAvailable() {
  return storageAvailable;
}

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export const actions = {
  updateSettings(patch: Partial<Settings>) {
    update((p) => ({ ...p, settings: { ...p.settings, ...patch } }));
  },

  setDay(dayId: string, status: DayRecord["status"] | null, minutesSpent: number | null = null) {
    update((p) => {
      const days = { ...p.days };
      if (status === null) delete days[dayId];
      else days[dayId] = { status, minutesSpent, updatedAt: new Date().toISOString() };
      return { ...p, days };
    });
  },

  /** Starts spaced review for a topic the first time it is studied. */
  markStudied(topicId: string) {
    update((p) => (p.reviews[topicId] ? p : { ...p, reviews: { ...p.reviews, [topicId]: newCard(todayIso()) } }));
  },

  recordAttempt(a: Omit<Attempt, "id" | "at">) {
    update((p) => {
      const attempt: Attempt = { ...a, id: uid(), at: new Date().toISOString() };
      const reviews = a.topicId && !p.reviews[a.topicId] ? { ...p.reviews, [a.topicId]: newCard(todayIso()) } : p.reviews;
      return { ...p, attempts: [...p.attempts, attempt], reviews };
    });
  },

  gradeReview(topicId: string, grade: number) {
    update((p) => {
      const today = todayIso();
      const card = p.reviews[topicId] ?? newCard(today);
      return {
        ...p,
        reviews: { ...p.reviews, [topicId]: schedule(card, grade, today) },
        reviewLog: [...p.reviewLog, { topicId, at: today, due: card.due, grade }],
      };
    });
  },

  saveMock(result: MockResult) {
    update((p) => ({ ...p, mocks: [...p.mocks.filter((m) => m.id !== result.id), result] }));
  },

  deleteMock(id: string) {
    update((p) => ({ ...p, mocks: p.mocks.filter((m) => m.id !== id) }));
  },

  exportJson(): string {
    return JSON.stringify(getProgress(), null, 2);
  },

  /** Returns an error message, or null when the import succeeded. */
  importJson(text: string): string | null {
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return "That file is not valid JSON.";
    }
    const parsed = ProgressSchema.safeParse(data);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return `That file does not match the TechPrep OS progress format (version ${PROGRESS_VERSION}): ${first?.path.join(".") || "root"} ${first?.message ?? ""}`.trim();
    }
    update(() => parsed.data);
    return null;
  },

  reset() {
    update(() => defaultProgress());
  },

  newId: uid,
};
