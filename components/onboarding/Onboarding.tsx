"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { ROLES, ROLE_LABELS, type Language, type Role } from "@/lib/curriculum";
import { todayIso } from "@/lib/progress/schema";
import { actions, isStorageAvailable, useHydrated, useProgress } from "@/lib/progress/store";
import { Callout } from "@/components/ui/primitives";

const MINUTES = [30, 45, 60, 90, 120, 150];

export function Onboarding() {
  const hydrated = useHydrated();
  const progress = useProgress();
  const router = useRouter();
  const [primary, setPrimary] = useState<Role>("data-scientist");
  const [also, setAlso] = useState<Set<Role>>(new Set());
  const [start, setStart] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(90);
  const [language, setLanguage] = useState<Language>("python");

  if (!hydrated) return <div className="tp-card h-64" aria-hidden />;

  if (progress.settings.onboarded) {
    return (
      <div className="tp-card grid gap-3">
        <h2 className="t-heading">Welcome back</h2>
        <p className="t-body tp-muted">
          Your plan started on {progress.settings.startDate} for {ROLE_LABELS[progress.settings.roles[0]!]}. You can change it any time in Settings.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link className="tp-btn tp-btn--primary" href="/dashboard">
            Go to today
            <ArrowRight className="tp-icon" aria-hidden />
          </Link>
          <Link className="tp-btn tp-btn--secondary" href="/settings">
            Settings
          </Link>
        </div>
      </div>
    );
  }

  const startDate = start ?? todayIso();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    actions.updateSettings({
      roles: [primary, ...ROLES.filter((r) => r !== primary && also.has(r))],
      startDate,
      minutesPerDay: minutes,
      language,
      onboarded: true,
    });
    router.push("/dashboard");
  };

  return (
    <form onSubmit={submit} className="tp-card grid gap-5" aria-labelledby="onboarding-title">
      <div className="grid gap-1">
        <h2 id="onboarding-title" className="t-heading">
          Set up your plan
        </h2>
        <p className="t-body-sm tp-muted">Takes ten seconds. Everything stays in this browser and can be changed later.</p>
      </div>
      {!isStorageAvailable() && (
        <Callout tone="limit" title="Browser storage is blocked">
          Your progress will last only until you close this tab. Allow site data for this page, or export your progress from Settings before leaving.
        </Callout>
      )}
      <div className="tp-field">
        <label htmlFor="primary-role" className="tp-field__label">
          Main target role
        </label>
        <select id="primary-role" className="tp-select" value={primary} onChange={(e) => setPrimary(e.target.value as Role)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <span className="tp-field__hint">Weak-area ranking weights topics for this role highest.</span>
      </div>
      <fieldset className="grid gap-1">
        <legend className="mb-1 tp-field__label">Also preparing for (optional)</legend>
        {ROLES.filter((r) => r !== primary).map((r) => (
          <label key={r} className="tp-check">
            <input
              type="checkbox"
              checked={also.has(r)}
              onChange={(e) =>
                setAlso((prev) => {
                  const next = new Set(prev);
                  if (e.target.checked) next.add(r);
                  else next.delete(r);
                  return next;
                })
              }
            />
            {ROLE_LABELS[r]}
          </label>
        ))}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="tp-field">
          <label htmlFor="start-date" className="tp-field__label">
            Start date
          </label>
          <input id="start-date" type="date" className="tp-input" value={startDate} onChange={(e) => setStart(e.target.value || null)} required />
          <span className="tp-field__hint">Day 1 of week 1. Today is assumed.</span>
        </div>
        <div className="tp-field">
          <label htmlFor="minutes" className="tp-field__label">
            Minutes per day
          </label>
          <select id="minutes" className="tp-select" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            {MINUTES.map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </select>
          <span className="tp-field__hint">Most days are planned at 60 to 120 minutes.</span>
        </div>
      </div>
      <fieldset className="grid gap-1">
        <legend className="mb-1 tp-field__label">Show code first in</legend>
        <div className="flex gap-4">
          {(["python", "r"] as const).map((l) => (
            <label key={l} className="tp-check">
              <input type="radio" name="language" value={l} checked={language === l} onChange={() => setLanguage(l)} />
              {l === "python" ? "Python" : "R"}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <button type="submit" className="tp-btn tp-btn--primary">
          Start my 16 weeks
          <ArrowRight className="tp-icon" aria-hidden />
        </button>
      </div>
    </form>
  );
}
