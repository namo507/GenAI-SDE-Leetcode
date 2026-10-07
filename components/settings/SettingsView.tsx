"use client";

import { useId, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { motion } from "motion/react";
import { Download, TriangleAlert, Upload } from "lucide-react";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/curriculum";
import { todayIso } from "@/lib/progress/schema";
import { actions, isStorageAvailable, useHydrated, useProgress } from "@/lib/progress/store";
import { Callout } from "@/components/ui/primitives";

function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <span id={`${id}-label`} className="tp-field__label">
        {label}
      </span>
      <div className="tp-seg w-fit" role="group" aria-labelledby={`${id}-label`}>
        {options.map((o) => (
          <button key={o.id} type="button" className="tp-seg__btn" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
            {value === o.id && <motion.span layoutId={`${id}-ind`} className="tp-seg__indicator" transition={{ duration: 0.2 }} aria-hidden />}
            <span className="tp-seg__label">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Section({ title, children, description }: { title: string; children: ReactNode; description?: string }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="tp-card grid gap-5">
      <div className="grid gap-1">
        <h2 id={id} className="t-heading">
          {title}
        </h2>
        {description && <p className="t-body-sm tp-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function SettingsView() {
  const hydrated = useHydrated();
  const progress = useProgress();
  const { settings } = progress;
  const file = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  if (!hydrated) return <div className="grid gap-6" aria-busy="true"><div className="tp-card h-64" /><div className="tp-card h-48" /></div>;

  const primary = settings.roles[0]!;
  const setPrimary = (r: Role) => actions.updateSettings({ roles: [r, ...settings.roles.filter((x) => x !== r)] });
  const toggleRole = (r: Role, on: boolean) =>
    actions.updateSettings({ roles: on ? [...settings.roles, r] : settings.roles.filter((x) => x !== r) });

  const exportProgress = () => {
    const blob = new Blob([actions.exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `techprep-os-progress-${todayIso()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importProgress = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 5_000_000) {
      setImportMsg({ ok: false, text: "That file is larger than 5 MB, which is far bigger than any progress export." });
      return;
    }
    const error = actions.importJson(await f.text());
    setImportMsg(error ? { ok: false, text: error } : { ok: true, text: `Imported ${f.name}. Your previous progress in this browser was replaced.` });
  };

  const counts = {
    days: Object.keys(progress.days).length,
    attempts: progress.attempts.length,
    reviews: Object.keys(progress.reviews).length,
    mocks: progress.mocks.length,
  };

  return (
    <div className="grid gap-6">
      {!isStorageAvailable() && (
        <Callout tone="risk" title="This browser is not saving your progress">
          Storage is blocked or full, so progress lasts only until this tab closes. Export before leaving, or allow site data for this page.
        </Callout>
      )}

      <Section title="Plan" description="Changes apply immediately and are saved in this browser.">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="tp-field">
            <label htmlFor="s-primary" className="tp-field__label">
              Main target role
            </label>
            <select id="s-primary" className="tp-select" value={primary} onChange={(e) => setPrimary(e.target.value as Role)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <span className="tp-field__hint">Weighted highest when ranking weak areas.</span>
          </div>
          <fieldset className="grid gap-1">
            <legend className="mb-1 tp-field__label">Also preparing for</legend>
            {ROLES.filter((r) => r !== primary).map((r) => (
              <label key={r} className="tp-check">
                <input type="checkbox" checked={settings.roles.includes(r)} onChange={(e) => toggleRole(r, e.target.checked)} />
                {ROLE_LABELS[r]}
              </label>
            ))}
          </fieldset>
          <div className="tp-field">
            <label htmlFor="s-start" className="tp-field__label">
              Start date
            </label>
            <input
              id="s-start"
              type="date"
              className="tp-input"
              value={settings.startDate}
              onChange={(e) => {
                if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) actions.updateSettings({ startDate: e.target.value });
              }}
            />
            <span className="tp-field__hint">Week 1, day 1. Moving it changes which day is today.</span>
          </div>
          <div className="tp-field">
            <label htmlFor="s-minutes" className="tp-field__label">
              Minutes per day
            </label>
            <input
              id="s-minutes"
              type="number"
              className="tp-input"
              min={15}
              max={240}
              step={5}
              value={settings.minutesPerDay}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isInteger(n) && n >= 15 && n <= 240) actions.updateSettings({ minutesPerDay: n });
              }}
            />
            <span className="tp-field__hint">15 to 240. The dashboard warns when a day is planned longer than this.</span>
          </div>
        </div>
      </Section>

      <Section title="Display and motion">
        <Segmented
          label="Show code first in"
          options={[
            { id: "python", label: "Python" },
            { id: "r", label: "R" },
          ]}
          value={settings.language}
          onChange={(v) => actions.updateSettings({ language: v })}
        />
        <Segmented
          label="Theme"
          options={[
            { id: "system", label: "Match system" },
            { id: "light", label: "Light" },
            { id: "dark", label: "Dark" },
          ]}
          value={settings.theme}
          onChange={(v) => actions.updateSettings({ theme: v })}
        />
        <Segmented
          label="Motion"
          options={[
            { id: "system", label: "Match system" },
            { id: "reduce", label: "Reduce" },
            { id: "full", label: "Full" },
          ]}
          value={settings.motion}
          onChange={(v) => actions.updateSettings({ motion: v })}
        />
        <label className="tp-check">
          <input type="checkbox" checked={settings.autoplayFlows} onChange={(e) => actions.updateSettings({ autoplayFlows: e.target.checked })} />
          Play step-by-step diagrams automatically when they scroll into view (never with reduced motion)
        </label>
      </Section>

      <Section title="Your data" description={`Stored only in this browser: ${counts.days} days logged, ${counts.attempts} practice attempts, ${counts.reviews} topics in review, ${counts.mocks} mock loops.`}>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="tp-btn tp-btn--secondary" onClick={exportProgress}>
            <Download className="tp-icon" aria-hidden />
            Export progress (JSON)
          </button>
          <button type="button" className="tp-btn tp-btn--secondary" onClick={() => file.current?.click()}>
            <Upload className="tp-icon" aria-hidden />
            Import progress
          </button>
          <input ref={file} type="file" accept="application/json,.json" className="tp-sr-only" tabIndex={-1} aria-hidden onChange={(e) => void importProgress(e)} />
        </div>
        <div role="status" aria-live="polite">
          {importMsg && (
            <Callout tone={importMsg.ok ? "positive" : "risk"} title={importMsg.ok ? "Import complete" : "Import failed"}>
              {importMsg.text}
            </Callout>
          )}
        </div>
        <div className="grid gap-3 border-t border-border pt-5">
          <h3 className="t-subheading">Reset</h3>
          <p className="t-body-sm tp-muted">Erases every setting and record in this browser. Export first if you might want it back.</p>
          {!confirmReset ? (
            <div>
              <button
                type="button"
                className="tp-btn tp-btn--danger"
                onClick={() => {
                  setConfirmReset(true);
                  setResetDone(false);
                }}
              >
                Reset progress
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] bg-critical-soft p-3" role="group" aria-labelledby="reset-q">
              <TriangleAlert className="tp-icon text-critical" aria-hidden />
              <span id="reset-q" className="t-body-sm font-semibold">
                Erase all progress? This cannot be undone.
              </span>
              <button
                type="button"
                className="tp-btn tp-btn--danger tp-btn--sm"
                onClick={() => {
                  actions.reset();
                  setConfirmReset(false);
                  setResetDone(true);
                }}
              >
                Yes, erase everything
              </button>
              <button type="button" className="tp-btn tp-btn--secondary tp-btn--sm" onClick={() => setConfirmReset(false)} autoFocus>
                Cancel
              </button>
            </div>
          )}
          <p role="status" className="t-body-sm">
            {resetDone ? "Progress erased. You are starting fresh." : ""}
          </p>
        </div>
      </Section>
    </div>
  );
}
