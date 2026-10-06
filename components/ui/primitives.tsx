import { CircleAlert, CircleCheck, Info, OctagonAlert } from "lucide-react";
import { useId, type ReactNode } from "react";

const CALLOUT_ICONS = { note: Info, limit: CircleAlert, risk: OctagonAlert, positive: CircleCheck } as const;

export function Callout({ tone, title, children, className }: { tone: keyof typeof CALLOUT_ICONS; title: string; children: ReactNode; className?: string }) {
  const Icon = CALLOUT_ICONS[tone];
  return (
    <div className={`tp-callout tp-callout--${tone} ${className ?? ""}`}>
      <Icon className="tp-icon" aria-hidden />
      <div>
        <p className="tp-callout__title">{title}</p>
        <div className="tp-callout__body">{children}</div>
      </div>
    </div>
  );
}

export const pct = (v: number) => `${Math.round(v * 100)}%`;

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
          <div className="tp-meter__fill" style={{ width: `${clamped * 100}%` }} />
        </div>
      )}
      {hint && <div className="tp-meter__hint">{hint}</div>}
    </div>
  );
}

export function Stat({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="tp-stat">
      <span className="tp-stat__label">{label}</span>
      <span className="tp-stat__value">{value}</span>
      {note && <span className="tp-stat__note">{note}</span>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, children, actions }: { eyebrow?: ReactNode; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="grid gap-2">
        {eyebrow && <div className="t-label tp-muted">{eyebrow}</div>}
        <h1 className="t-title">{title}</h1>
        {children && <div className="prose-measure t-body tp-muted">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function SectionHeading({ id, title, children }: { id?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-4 grid gap-1">
      <h2 id={id} className="t-heading scroll-mt-24">
        {title}
      </h2>
      {children && <p className="prose-measure t-body-sm tp-muted">{children}</p>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-border-strong p-6 text-center">
      <p className="t-subheading">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-[52ch] t-body-sm tp-muted">{children}</div>}
    </div>
  );
}

/** A visually hidden polite live region. */
export function LiveRegion({ children }: { children: ReactNode }) {
  return (
    <span className="tp-sr-only" role="status" aria-live="polite">
      {children}
    </span>
  );
}
