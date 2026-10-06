"use client";

import { motion } from "motion/react";
import { useId, type ReactNode } from "react";

import { pct } from "@/lib/format";

export { pct };

/**
 * A labeled proportion. A null value renders "No data yet" instead of a zero,
 * so an empty metric never looks like a bad one.
 */
export function Meter({
  label,
  value,
  variant = "brand",
  hint,
  format = pct,
}: {
  label: string;
  value: number | null;
  variant?: "brand" | "accent" | "positive" | "neutral";
  hint?: ReactNode;
  format?: (v: number) => string;
}) {
  const id = useId();
  const clamped = value === null ? null : Math.min(1, Math.max(0, value));
  return (
    <div className={`tp-meter ${variant === "brand" ? "" : `tp-meter--${variant}`}`}>
      <div className="tp-meter__row">
        <span className="tp-meter__label" id={`${id}-label`}>
          {label}
        </span>
        <span className="tp-meter__value">{clamped === null ? "No data yet" : format(clamped)}</span>
      </div>
      {clamped === null ? (
        <div className="tp-meter__track" aria-hidden />
      ) : (
        <div
          className="tp-meter__track"
          role="meter"
          aria-labelledby={`${id}-label`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(clamped * 100)}
          aria-valuetext={format(clamped)}
        >
          <motion.div className="tp-meter__fill" initial={{ width: 0 }} animate={{ width: `${clamped * 100}%` }} transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }} />
        </div>
      )}
      {hint && <div className="tp-meter__hint">{hint}</div>}
    </div>
  );
}

