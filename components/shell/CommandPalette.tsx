"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { BookOpen, CalendarDays, CornerDownLeft, Dumbbell, FileText, Search, type LucideIcon } from "lucide-react";
import { SEARCH_KIND_LABELS, rankEntries, type SearchEntry, type SearchKind } from "@/lib/search";

const KIND_ICON: Record<SearchKind, LucideIcon> = { page: FileText, topic: BookOpen, day: CalendarDays, term: BookOpen, problem: Dumbbell };

let cache: SearchEntry[] | null = null;
async function loadIndex(): Promise<SearchEntry[]> {
  if (cache) return cache;
  const res = await fetch("/search.json");
  cache = (await res.json()) as SearchEntry[];
  return cache;
}

/**
 * ⌘K / Ctrl+K search over pages, topics, days, glossary terms and practice items.
 * Combobox pattern: focus stays in the input, arrows move the active option.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<SearchEntry[] | null>(cache);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    loadIndex()
      .then((e) => alive && setEntries(e))
      .catch(() => alive && setFailed(true));
    requestAnimationFrame(() => input.current?.focus());
    return () => {
      alive = false;
    };
  }, [open]);

  const results = useMemo(() => (entries ? rankEntries(entries, query) : []), [entries, query]);
  const go = useCallback(
    (e: SearchEntry | undefined) => {
      if (!e) return;
      onClose();
      setQuery("");
      setActive(0);
      router.push(e.href);
    },
    [onClose, router],
  );

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Tab") {
      // The input is the dialog's only focus stop; keep focus inside the modal.
      e.preventDefault();
    }
  };

  useEffect(() => {
    document.getElementById(`${id}-opt-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, id]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid justify-items-center bg-ink/30 px-4 pt-[12vh] backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search TechPrep OS"
            className="tp-cmdk self-start"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
          >
            <div className="relative">
              <Search className="tp-icon pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 tp-muted" aria-hidden />
              <input
                ref={input}
                className="tp-cmdk__input"
                role="combobox"
                aria-expanded="true"
                aria-controls={`${id}-list`}
                aria-activedescendant={results.length ? `${id}-opt-${active}` : undefined}
                aria-autocomplete="list"
                aria-label="Search topics, days, terms and practice"
                placeholder="Search topics, days, terms, practice…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onKey}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div id={`${id}-list`} role="listbox" aria-label="Results" className="tp-cmdk__list">
              {failed && <p className="px-3 py-6 text-center t-body-sm tp-muted">Search is unavailable offline until it has loaded once.</p>}
              {!failed && entries && results.length === 0 && <p className="px-3 py-6 text-center t-body-sm tp-muted">No results for “{query}”.</p>}
              {results.map((r, i) => {
                const Icon = KIND_ICON[r.kind];
                const header = i === 0 || results[i - 1]!.kind !== r.kind ? SEARCH_KIND_LABELS[r.kind] : null;
                return (
                  <div key={`${r.kind}-${r.href}-${r.title}`} role="presentation">
                    {header && (
                      <div className="tp-cmdk__group" role="presentation">
                        {header}
                      </div>
                    )}
                    <div
                      id={`${id}-opt-${i}`}
                      role="option"
                      aria-selected={i === active}
                      className="tp-cmdk__item"
                      onMouseMove={() => setActive(i)}
                      onClick={() => go(r)}
                    >
                      <Icon className="tp-icon tp-muted" aria-hidden />
                      <span className="min-w-0 truncate">{r.title}</span>
                      <span className="tp-sr-only">, </span>
                      <span className="tp-cmdk__meta hidden sm:inline">{r.meta}</span>
                      <CornerDownLeft className="tp-icon tp-cmdk__go" aria-hidden />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-3 border-t border-border px-4 py-2 t-caption tp-muted">
              <span className="inline-flex items-center gap-1">
                <kbd className="tp-kbd">↑</kbd>
                <kbd className="tp-kbd">↓</kbd> to move
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="tp-kbd">↵</kbd> to open
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="tp-kbd">esc</kbd> to close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
