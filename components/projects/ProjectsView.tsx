"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/curriculum";
import type { Project } from "@/lib/content-types";
import { useClientProgress } from "@/lib/progress/hooks";
import type { TopicIndex } from "@/components/practice/Drills";

export function ProjectsView({ projects, topics }: { projects: Project[]; topics: TopicIndex }) {
  const progress = useClientProgress();
  const [role, setRole] = useState<Role | "all" | null>(null);
  const primary = progress?.settings.onboarded ? progress.settings.roles[0] : undefined;
  const active = role ?? primary ?? "all";
  const shown = projects.filter((p) => active === "all" || p.role === active);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter projects by role">
        <button type="button" className="tp-chip min-h-8" aria-pressed={active === "all"} onClick={() => setRole("all")}>
          All roles
        </button>
        {ROLES.map((r) => (
          <button key={r} type="button" className="tp-chip min-h-8" aria-pressed={active === r} onClick={() => setRole(r)}>
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>
      <p className="tp-sr-only" role="status">
        Showing {shown.length} projects
      </p>
      <ul className="grid gap-6">
        {shown.map((p) => (
          <li key={p.id}>
            <article className="tp-card grid gap-4" aria-labelledby={`${p.id}-title`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="tp-chip tp-chip--brand">{ROLE_LABELS[p.role]}</span>
                <span className="tp-chip">
                  {p.weeks} {p.weeks === 1 ? "week" : "weeks"}
                </span>
              </div>
              <h2 id={`${p.id}-title`} className="t-heading">
                {p.title}
              </h2>
              <p className="prose-measure t-body">{p.summary}</p>
              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Who it is for", p.user],
                  ["Decision it supports", p.decision],
                  ["Success metric", p.metric],
                  ["Baseline to beat", p.baseline],
                ].map(([k, v]) => (
                  <div key={k} className="grid gap-0.5">
                    <dt className="t-label tp-muted">{k}</dt>
                    <dd className="t-body-sm">{v}</dd>
                  </div>
                ))}
              </dl>
              <details>
                <summary className="cursor-pointer t-label">Data, milestones and rubric</summary>
                <div className="mt-3 grid gap-5">
                  <section className="grid gap-1">
                    <h3 className="t-subheading">Data</h3>
                    <ul className="grid gap-1 t-body-sm">
                      {p.data.map((d) => (
                        <li key={d.name}>
                          {d.url ? (
                            <a className="tp-link inline-flex items-baseline gap-1" href={d.url} target="_blank" rel="noopener noreferrer">
                              {d.name}
                              <ExternalLink className="tp-icon self-center" aria-hidden />
                              <span className="tp-sr-only">(opens in a new tab)</span>
                            </a>
                          ) : (
                            <span className="font-semibold">{d.name}</span>
                          )}
                          <span className="tp-muted">: {d.note}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="t-caption tp-muted">Check each source&apos;s current terms and availability before you start; they change over time.</p>
                  </section>
                  <section className="grid gap-1">
                    <h3 className="t-subheading">Milestones</h3>
                    <ol className="grid list-decimal gap-1 pl-6 t-body-sm">
                      {p.milestones.map((m) => (
                        <li key={m.title}>
                          <span className="font-semibold">{m.title}:</span> {m.deliverable}
                        </li>
                      ))}
                    </ol>
                  </section>
                  <section className="grid gap-1">
                    <h3 className="t-subheading">Reviewers will look for</h3>
                    <ul className="grid list-disc gap-1 pl-6 t-body-sm">
                      {p.rubric.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </section>
                  <section className="grid gap-1">
                    <h3 className="t-subheading">Stretch goals</h3>
                    <ul className="grid list-disc gap-1 pl-6 t-body-sm">
                      {p.stretch.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </section>
                </div>
              </details>
              <div className="grid gap-1">
                <p className="t-label tp-muted">Builds on</p>
                <ul className="flex flex-wrap gap-x-4 gap-y-1 t-body-sm">
                  {p.topicIds.map((id) =>
                    topics[id] ? (
                      <li key={id}>
                        <Link className="tp-link" href={topics[id].href}>
                          {topics[id].title}
                        </Link>
                      </li>
                    ) : null,
                  )}
                </ul>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
