/**
 * Spaced review scheduling, a simplified SM-2. A topic enters review when it is
 * first studied; each review is graded 0 (again) to 3 (easy).
 */
import type { ReviewCard } from "./schema";

export const GRADE_LABELS = ["Again", "Hard", "Good", "Easy"] as const;

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const toUtc = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(toIso) - toUtc(fromIso)) / 86_400_000);
}

export function newCard(today: string): ReviewCard {
  return { due: addDays(today, 1), interval: 1, ease: 2.5, reps: 0, lapses: 0, lastReviewed: null };
}

export function schedule(card: ReviewCard, grade: number, today: string): ReviewCard {
  if (grade < 2) {
    return { ...card, reps: 0, lapses: card.lapses + 1, interval: 1, ease: Math.max(1.3, card.ease - 0.2), due: addDays(today, 1), lastReviewed: today };
  }
  const reps = card.reps + 1;
  const ease = Math.min(3, Math.max(1.3, card.ease + (grade === 3 ? 0.15 : 0)));
  const interval = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(card.interval * ease * (grade === 3 ? 1.3 : 1));
  return { ...card, reps, ease, interval, due: addDays(today, interval), lastReviewed: today };
}
