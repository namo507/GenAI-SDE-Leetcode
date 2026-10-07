"use client";

import { useId } from "react";
import { CONFIDENCE_LEVELS } from "@/lib/progress/schema";

/**
 * Confidence is rated before the answer is shown, so calibration compares
 * what the learner believed with what turned out to be true.
 */
export function ConfidencePicker({ value, onChange, disabled }: { value: number | null; onChange: (v: number) => void; disabled?: boolean }) {
  const name = useId();
  return (
    <fieldset className="grid gap-2" disabled={disabled}>
      <legend className="mb-2 t-label">How sure are you? Rate before you check.</legend>
      <div className="flex flex-wrap gap-2">
        {CONFIDENCE_LEVELS.map((lvl) => {
          const checked = value === lvl.value;
          return (
            <label
              key={lvl.value}
              className={`tp-chip cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)] ${checked ? "tp-chip--brand" : ""}`}
            >
              <input type="radio" className="tp-sr-only" name={name} value={lvl.value} checked={checked} onChange={() => onChange(lvl.value)} />
              <span aria-hidden className="font-mono">
                {lvl.value}
              </span>{" "}
              {lvl.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export const confidenceLabel = (v: number) => CONFIDENCE_LEVELS.find((l) => l.value === v)?.label ?? String(v);
