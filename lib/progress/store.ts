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

/** A plain-language reason an imported file was rejected, instead of the validator's internal path. */
function importProblem(data: unknown, path: PropertyKey[]): string {
  const base = "That file is not a TechPrep OS progress export";
  if (typeof data !== "object" || data === null || Array.isArray(data)) return `${base}: it does not contain a progress object.`;
  const version = (data as { version?: unknown }).version;
  if (version !== PROGRESS_VERSION) return `${base} from this version of the app (expected format ${PROGRESS_VERSION}, found ${version === undefined ? "none" : String(version)}).`;
  const section: Record<string, string> = {
    settings: "the settings",
    days: "the roadmap days",
    attempts: "the practice attempts",
    reviews: "the spaced-review cards",
    reviewLog: "the review history",
    mocks: "the mock interview results",
  };
  const where = section[String(path[0] ?? "")];
  return `${base}: ${where ? `${where} are` : "part of it is"} in an unexpected format. Export again from Settings and import that file.`;
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
    if (!parsed.success) return importProblem(data, parsed.error.issues[0]?.path ?? []);
    update(() => parsed.data);
    return null;
  },

  reset() {
    update(() => defaultProgress());
  },

  newId: uid,
};
