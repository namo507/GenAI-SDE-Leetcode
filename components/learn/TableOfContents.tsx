"use client";

import { motion } from "motion/react";
import { useEffect, useId, useState } from "react";

export type TocItem = { id: string; label: string };

/** Section links with scrollspy: the section nearest the top of the viewport is marked current. */
export function TableOfContents({ items, variant }: { items: TocItem[]; variant: "rail" | "inline" }) {
  const [current, setCurrent] = useState(items[0]?.id ?? "");
  const layoutId = useId();

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => e !== null);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setCurrent(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);

  if (variant === "inline") {
    return (
      <nav aria-label="On this page" className="flex flex-wrap gap-2">
        {items.map((i) => (
          <a key={i.id} href={`#${i.id}`} className="tp-chip hover:border-border-strong hover:text-ink">
            {i.label}
          </a>
        ))}
      </nav>
    );
  }

  return (
    <nav aria-label="On this page" className="grid gap-1">
      <p className="tp-eyebrow mb-1">On this page</p>
      <ul className="relative grid gap-0.5 border-l border-border">
        {items.map((i) => {
          const isCurrent = i.id === current;
          return (
            <li key={i.id} className="relative">
              {isCurrent && <motion.span layoutId={layoutId} className="absolute -left-px top-0 h-full w-0.5 rounded bg-brand" transition={{ duration: 0.2 }} aria-hidden />}
              <a
                href={`#${i.id}`}
                aria-current={isCurrent ? "location" : undefined}
                className={`block py-1 pl-3 t-body-sm transition-colors ${isCurrent ? "font-medium text-ink" : "tp-muted hover:text-ink"}`}
              >
                {i.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
