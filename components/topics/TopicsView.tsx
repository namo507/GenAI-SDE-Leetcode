"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { ArrowRight, Code, Search, X } from "lucide-react";
import { CATEGORIES, DIFFICULTIES, ROLES, ROLE_LABELS, categoryOf, type CategoryId, type Difficulty, type Role } from "@/lib/curriculum";
import type { CatalogTopic } from "@/lib/catalog";
import { topicMastery } from "@/lib/progress/metrics";
import { useClientProgress } from "@/lib/progress/hooks";
import { EmptyState, pct } from "@/components/ui/primitives";
import { CATEGORY_ICONS } from "./categoryIcons";

const DIFFICULTY_LABEL: Record<Difficulty, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };
const norm = (s: string) => s.toLowerCase();

export function TopicsView({ topics }: { topics: CatalogTopic[] }) {
  const progress = useClientProgress();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<Role | "all">("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [codeOnly, setCodeOnly] = useState(false);

  const byCategory = useMemo(() => {
    const map = new Map<CategoryId, CatalogTopic[]>();
    for (const t of topics) {
      const id = categoryOf(t.domain).id;
      map.set(id, [...(map.get(id) ?? []), t]);
    }
    return map;
  }, [topics]);

  const q = norm(query.trim());
  const matches = (t: CatalogTopic) =>
    (role === "all" || t.roles.includes(role)) &&
    (difficulty === "all" || t.difficulty === difficulty) &&
    (!codeOnly || t.hasCode) &&
    (!q || norm(`${t.title} ${t.summary}`).includes(q));
  const shownCount = topics.filter(matches).length;
  const filtered = q !== "" || role !== "all" || difficulty !== "all" || codeOnly;

  return (
    <div className="grid gap-10">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Categories">
        {CATEGORIES.map((c, i) => {
          const list = byCategory.get(c.id) ?? [];
          if (!list.length) return null;
          const Icon = CATEGORY_ICONS[c.id];
          const practiced = progress ? list.filter((t) => topicMastery(progress, t.id) !== null).length : 0;
          return (
            <motion.li key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, duration: 0.25 }}>
              <a href={`#${c.id}`} className="tp-card group grid h-full content-start gap-2 !p-4">
                <span className="flex items-center justify-between gap-2">
                  <span className="inline-grid h-8 w-8 place-items-center rounded-[var(--radius-md)] bg-surface-sunken">
                    <Icon className="tp-icon text-brand" aria-hidden />
                  </span>
                  <span className="t-caption tp-muted tp-num">
                    {list.length} topics{progress && practiced ? ` · ${practiced} practiced` : ""}
                  </span>
                </span>
                <span className="font-semibold t-body-sm">{c.label}</span>
                <span className="t-caption tp-muted">{c.blurb}</span>
              </a>
            </motion.li>
          );
        })}
      </ul>

      <div className="sticky top-14 z-20 -mx-4 grid gap-3 border-b border-border bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="tp-icon pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 tp-muted" aria-hidden />
            <input type="search" className="tp-input pl-9" placeholder="Filter topics" aria-label="Filter topics by title or summary" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select className="tp-select w-auto" aria-label="Role" value={role} onChange={(e) => setRole(e.target.value as Role | "all")}>
            <option value="all">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <select className="tp-select w-auto" aria-label="Difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty | "all")}>
            <option value="all">Any level</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {DIFFICULTY_LABEL[d]}
              </option>
            ))}
          </select>
          <button type="button" className="tp-chip min-h-9" aria-pressed={codeOnly} onClick={() => setCodeOnly((v) => !v)}>
            <Code className="tp-icon" aria-hidden />
            Python and R code
          </button>
          {filtered && (
            <button
              type="button"
              className="tp-btn tp-btn--ghost tp-btn--sm"
              onClick={() => {
                setQuery("");
                setRole("all");
                setDifficulty("all");
                setCodeOnly(false);
              }}
            >
              <X className="tp-icon" aria-hidden />
              Clear
            </button>
          )}
        </div>
        <p className="t-caption tp-muted" role="status">
          {shownCount} of {topics.length} topics
        </p>
      </div>

      {shownCount === 0 && <EmptyState title="No topics match">Try a shorter word, another role or clear the filters.</EmptyState>}

      {CATEGORIES.map((c) => {
        const list = (byCategory.get(c.id) ?? []).filter(matches);
        if (!list.length) return null;
        const Icon = CATEGORY_ICONS[c.id];
        return (
          <section key={c.id} id={c.id} aria-labelledby={`${c.id}-title`} className="grid scroll-mt-40 gap-3">
            <div className="flex items-center gap-2">
              <Icon className="tp-icon tp-icon--20 text-brand" aria-hidden />
              <h2 id={`${c.id}-title`} className="t-heading">
                {c.label}
              </h2>
              <span className="tp-chip">{list.length}</span>
            </div>
            <ul className="grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-border bg-border">
              <AnimatePresence initial={false}>
                {list.map((t) => {
                  const m = progress ? topicMastery(progress, t.id) : null;
                  return (
                    <motion.li key={t.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="bg-surface">
                      <Link href={t.href} className="group grid gap-1 px-4 py-3 transition-colors hover:bg-surface-sunken/60 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4">
                        <span className="grid min-w-0 gap-0.5">
                          <span className="font-semibold t-body-sm">{t.title}</span>
                          <span className="line-clamp-1 t-caption tp-muted">{t.summary}</span>
                        </span>
                        <span className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                          <span className="t-caption tp-muted tp-num">
                            W{t.week} D{t.day} · {t.minutes}m
                          </span>
                          <span className="tp-chip">{DIFFICULTY_LABEL[t.difficulty]}</span>
                          {t.hasCode && <span className="tp-chip">Py · R</span>}
                          {m !== null && <span className={`tp-chip ${m >= 0.7 ? "tp-chip--positive" : "tp-chip--caution"}`}>{pct(m)}</span>}
                          <ArrowRight className="tp-icon hidden text-ink-muted transition-transform group-hover:translate-x-0.5 sm:block" aria-hidden />
                        </span>
                      </Link>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </section>
        );
      })}
    </div>
  );
}
