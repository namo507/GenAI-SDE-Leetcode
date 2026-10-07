"use client";

import { useId, useState } from "react";
import { motion } from "motion/react";
import { actions, useHydrated, useProgress } from "@/lib/progress/store";

const STATUSES = [
  { id: "none", label: "Not started" },
  { id: "in-progress", label: "In progress" },
  { id: "done", label: "Done" },
] as const;

/** Day status (three toggle buttons) and the minutes actually spent, used by Analytics time-vs-plan. */
export function DayControls({ dayId, plannedMinutes }: { dayId: string; plannedMinutes: number }) {
  const progress = useProgress();
  const hydrated = useHydrated();
  const layoutId = `${useId()}-status`;
  const record = hydrated ? progress.days[dayId] : undefined;
  const status = record?.status ?? "none";
  const [draft, setDraft] = useState<string | null>(null);
  const minutes = draft ?? (record?.minutesSpent != null ? String(record.minutesSpent) : "");
  const parsed = minutes === "" ? null : Number(minutes);
  const invalid = parsed !== null && (!Number.isInteger(parsed) || parsed < 0 || parsed > 600);

  const setStatus = (s: (typeof STATUSES)[number]["id"]) => {
    if (s === "none") actions.setDay(dayId, null);
    else actions.setDay(dayId, s, s === "done" ? (record?.minutesSpent ?? plannedMinutes) : (record?.minutesSpent ?? null));
    setDraft(null);
  };

  const saveMinutes = () => {
    if (invalid || status === "none") return;
    actions.setDay(dayId, status, parsed);
    setDraft(null);
  };

  return (
    <div className="tp-card grid gap-4">
      <div className="grid gap-2">
        <span className="t-label" id={`${dayId}-status-label`}>
          Status
        </span>
        <div className="tp-seg w-fit" role="group" aria-labelledby={`${dayId}-status-label`}>
          {STATUSES.map((s) => (
            <button key={s.id} type="button" className="tp-seg__btn" aria-pressed={status === s.id} onClick={() => setStatus(s.id)} disabled={!hydrated}>
              {status === s.id && <motion.span layoutId={layoutId} className="tp-seg__indicator" transition={{ duration: 0.2 }} aria-hidden />}
              <span className="tp-seg__label">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          saveMinutes();
        }}
      >
        <div className="tp-field w-40">
          <label htmlFor={`${dayId}-minutes`} className="tp-field__label">
            Minutes spent
          </label>
          <input
            id={`${dayId}-minutes`}
            className="tp-input"
            type="number"
            inputMode="numeric"
            min={0}
            max={600}
            step={1}
            value={minutes}
            placeholder={String(plannedMinutes)}
            aria-invalid={invalid}
            aria-describedby={`${dayId}-minutes-hint`}
            disabled={!hydrated || status === "none"}
            onChange={(e) => setDraft(e.target.value)}
          />
        </div>
        <button type="submit" className="tp-btn tp-btn--secondary" disabled={!hydrated || status === "none" || invalid || draft === null}>
          Save minutes
        </button>
        <p id={`${dayId}-minutes-hint`} className={`basis-full t-caption ${invalid ? "text-critical" : "tp-muted"}`}>
          {invalid
            ? "Enter a whole number from 0 to 600."
            : status === "none"
              ? "Mark the day in progress or done to log time."
              : `Planned: ${plannedMinutes} minutes. Marking a day done logs the planned time unless you enter your own.`}
        </p>
      </form>
    </div>
  );
}
