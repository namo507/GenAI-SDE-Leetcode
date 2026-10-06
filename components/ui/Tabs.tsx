"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";

export type TabItem<T extends string> = { id: T; label: ReactNode; icon?: ReactNode };

type TabListProps<T extends string> = {
  /** Shared prefix for tab and panel ids; pair it with the same prop on TabPanel. */
  idBase: string;
  label: string;
  tabs: readonly TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export const tabId = (idBase: string, id: string) => `${idBase}-tab-${id}`;
export const panelId = (idBase: string, id: string) => `${idBase}-panel-${id}`;

/**
 * WAI-ARIA tabs with automatic activation: arrow keys, Home and End move
 * between tabs, and only the selected tab is in the tab order. The underline
 * is a shared-layout indicator so it slides between tabs.
 */
export function TabList<T extends string>({ idBase, label, tabs, value, onChange, className }: TabListProps<T>) {
  const refs = useRef(new Map<T, HTMLButtonElement>());
  const layoutId = `${useId()}-indicator`;

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = tabs.findIndex((t) => t.id === value);
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    const target = tabs[next]!.id;
    onChange(target);
    refs.current.get(target)?.focus();
  };

  return (
    <div role="tablist" aria-label={label} className={`tp-tabs ${className ?? ""}`}>
      {tabs.map((t) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el) => {
              if (el) refs.current.set(t.id, el);
              else refs.current.delete(t.id);
            }}
            type="button"
            role="tab"
            id={tabId(idBase, t.id)}
            aria-selected={selected}
            aria-controls={selected ? panelId(idBase, t.id) : undefined}
            tabIndex={selected ? 0 : -1}
            className="tp-tab"
            onClick={() => onChange(t.id)}
            onKeyDown={onKeyDown}
          >
            {t.icon}
            {t.label}
            {selected && <motion.span layoutId={layoutId} className="tp-tab__indicator" transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }} aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}

/** The panel for the selected tab. Panels cross-fade with a short vertical shift. */
export function TabPanel({ idBase, value, children, className }: { idBase: string; value: string; children: ReactNode; className?: string }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={value}
        role="tabpanel"
        id={panelId(idBase, value)}
        aria-labelledby={tabId(idBase, value)}
        tabIndex={0}
        className={className}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
