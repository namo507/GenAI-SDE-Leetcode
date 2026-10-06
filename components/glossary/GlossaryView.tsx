"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { Search } from "lucide-react";
import { DOMAIN_LABELS, type Domain, type GlossaryTerm } from "@/lib/curriculum";
import { EmptyState } from "@/components/ui/primitives";
import type { TopicIndex } from "@/components/practice/Drills";

const norm = (s: string) => s.toLowerCase().normalize("NFKD");

export function GlossaryView({ terms, topics }: { terms: GlossaryTerm[]; topics: TopicIndex }) {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState<Domain | "all">("all");
  const q = norm(query.trim());
  const byslug = new Map(terms.map((t) => [t.slug, t]));
  const domains = [...new Set(terms.map((t) => t.domain))];
  const shown = terms
    .filter((t) => (domain === "all" || t.domain === domain) && (!q || norm(`${t.term} ${t.definition} ${t.seniorNote ?? ""}`).includes(q)))
    .sort((a, b) => a.term.localeCompare(b.term));

  const jump = (e: MouseEvent<HTMLAnchorElement>, slug: string) => {
    e.preventDefault();
    setQuery("");
    setDomain("all");
    window.history.replaceState(null, "", `#${slug}`);
    requestAnimationFrame(() => {
      const el = document.getElementById(slug);
      el?.scrollIntoView({ block: "start" });
      el?.focus();
    });
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-[1fr_260px]">
        <div className="tp-field">
          <label htmlFor="glossary-search" className="tp-field__label">
            Search terms and definitions
          </label>
          <div className="relative">
            <Search className="tp-icon pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 tp-muted" aria-hidden />
            <input id="glossary-search" type="search" className="tp-input pl-9" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
          </div>
        </div>
        <div className="tp-field">
          <label htmlFor="glossary-domain" className="tp-field__label">
            Domain
          </label>
          <select id="glossary-domain" className="tp-select" value={domain} onChange={(e) => setDomain(e.target.value as Domain | "all")}>
            <option value="all">All domains</option>
            {domains.map((d) => (
              <option key={d} value={d}>
                {DOMAIN_LABELS[d]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="t-body-sm tp-muted" role="status">
        {shown.length} of {terms.length} terms
      </p>
      {shown.length === 0 ? (
        <EmptyState title="No matching terms">Try a shorter word or choose All domains.</EmptyState>
      ) : (
        <ul className="grid gap-3">
          {shown.map((t) => (
            <li key={t.slug} id={t.slug} tabIndex={-1} className="tp-card scroll-mt-24 grid gap-2 outline-none focus-visible:outline-2 focus-visible:outline-[var(--focus)]">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="t-subheading">{t.term}</h2>
                <span className="tp-chip">{DOMAIN_LABELS[t.domain]}</span>
              </div>
              <p className="prose-measure t-body">{t.definition}</p>
              {t.seniorNote && (
                <p className="prose-measure t-body-sm">
                  <span className="font-semibold">Senior depth: </span>
                  {t.seniorNote}
                </p>
              )}
              {(t.prerequisites.length > 0 || t.topicIds.length > 0) && (
                <div className="flex flex-wrap gap-x-6 gap-y-1 t-body-sm">
                  {t.prerequisites.length > 0 && (
                    <p>
                      <span className="tp-muted">Know first: </span>
                      {t.prerequisites.map((p, i) => (
                        <span key={p}>
                          {i > 0 && ", "}
                          <a className="tp-link" href={`#${p}`} onClick={(e) => jump(e, p)}>
                            {byslug.get(p)?.term ?? p}
                          </a>
                        </span>
                      ))}
                    </p>
                  )}
                  {t.topicIds.length > 0 && (
                    <p>
                      <span className="tp-muted">Learn it in: </span>
                      {t.topicIds.map((id, i) =>
                        topics[id] ? (
                          <span key={id}>
                            {i > 0 && ", "}
                            <Link className="tp-link" href={topics[id].href}>
                              {topics[id].title}
                            </Link>
                          </span>
                        ) : null,
                      )}
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
