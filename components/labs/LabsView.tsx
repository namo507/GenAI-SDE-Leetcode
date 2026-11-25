"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, FlaskConical, Timer } from "lucide-react";
import { labs } from "@/lib/labs";
import { ROLE_LABELS, ROLES, DOMAIN_LABELS, type Role } from "@/lib/curriculum";
import { rolePaths } from "@/content/role-paths";
import { useClientProgress } from "@/lib/progress/hooks";
import { PracticeCard } from "@/components/practice/PracticeCard";

export function LabsView({ topics }: { topics: Record<string, { title: string; href: string }> }) {
  const progress = useClientProgress();
  const [role, setRole] = useState<Role | "all" | null>(null);
  const current = role ?? (progress?.settings.onboarded ? progress.settings.roles[0] : "all") ?? "all";
  const shown = labs.filter((lab) => current === "all" || lab.roles.includes(current));
  const paths = rolePaths.filter((path) => current === "all" || path.role === current);
  return <div className="grid gap-10">
    <section className="tp-card grid gap-4" aria-labelledby="method-title">
      <h2 id="method-title" className="t-heading">An idea is clearer when you can make it fail</h2>
      <ol className="grid gap-4 md:grid-cols-3">{[
        ["1. Predict", "Commit to an outcome before seeing it. Rate how sure you are."],
        ["2. Experiment", "Change one input, inspect the calculation and compare a counterexample."],
        ["3. Explain", "Rebuild the mechanism in plain language, then defend the assumptions in an interview case."],
      ].map(([title, text]) => <li key={title} className="grid gap-1"><h3 className="t-subheading text-brand">{title}</h3><p className="t-body-sm tp-muted">{text}</p></li>)}</ol>
      <p className="t-caption tp-muted">Every experiment states its limits. A correct answer is evidence about that question, not proof of hiring readiness.</p>
    </section>
    <div className="tp-field max-w-sm"><label htmlFor="lab-role" className="tp-field__label">Prepare for a role</label><select id="lab-role" className="tp-select" value={current} onChange={(e) => setRole(e.target.value as Role | "all")}><option value="all">All six roles</option>{ROLES.map((value) => <option key={value} value={value}>{ROLE_LABELS[value]}</option>)}</select></div>
    <section className="grid gap-4" aria-labelledby="labs-title"><div className="flex flex-wrap items-baseline justify-between gap-2"><h2 id="labs-title" className="t-heading">Experiment library</h2><p role="status" className="t-caption tp-muted">{shown.length} of {labs.length} experiments</p></div>
      <ul className="grid gap-4 md:grid-cols-2">{shown.map((lab) => <li key={lab.id}><Link className="tp-card group grid h-full content-start gap-3" href={`/labs/${lab.id}`}><div className="flex flex-wrap items-center gap-2"><FlaskConical className="tp-icon text-brand" aria-hidden /><span className="tp-chip">{DOMAIN_LABELS[lab.domain]}</span><span className="t-caption tp-muted">{lab.minutes} min</span>{progress?.labNotes[lab.id] && <span className="tp-chip tp-chip--positive">Notes saved</span>}</div><h3 className="t-subheading">{lab.title}</h3><p className="t-body-sm tp-muted">{lab.summary}</p><span className="tp-link t-body-sm inline-flex items-center gap-2">Open experiment<ArrowRight className="tp-icon" aria-hidden /></span></Link></li>)}</ul>
    </section>
    <section className="grid gap-5" aria-labelledby="role-paths"><h2 id="role-paths" className="t-heading">Connect concepts to the interview</h2><p className="prose-measure t-body-sm tp-muted">Use these short loops alongside the 16-week roadmap. Read the foundations, manipulate the mechanism, then explain a realistic failure. Preparing for several roles can share the same foundation.</p>
      {paths.map((path) => <article key={path.role} className="tp-card grid gap-5" id={`role-${path.role}`} aria-labelledby={`path-${path.role}`}>
        <div className="grid gap-1"><h3 id={`path-${path.role}`} className="t-heading">{ROLE_LABELS[path.role]}</h3><p className="prose-measure t-body-sm tp-muted">{path.goal}</p></div>
        <div className="grid gap-5 md:grid-cols-2"><section className="grid content-start gap-2"><h4 className="t-subheading flex items-center gap-2"><BookOpen className="tp-icon" aria-hidden />Build the explanation</h4><ol className="grid list-decimal gap-2 pl-5 t-body-sm">{path.topicIds.map((id) => topics[id] && <li key={id}><Link className="tp-link" href={topics[id].href}>{topics[id].title}</Link></li>)}</ol></section><section className="grid content-start gap-2"><h4 className="t-subheading flex items-center gap-2"><FlaskConical className="tp-icon" aria-hidden />Test the mechanism</h4><ul className="grid gap-2 t-body-sm">{path.labIds.map((id) => <li key={id}><Link className="tp-link" href={`/labs/${id}`}>{labs.find((lab) => lab.id === id)!.title}</Link></li>)}</ul></section></div>
        <details><summary className="cursor-pointer t-label">Try the {ROLE_LABELS[path.role].toLowerCase()} transfer case</summary><div className="mt-4"><PracticeCard item={{ id: `role-${path.role}-mission`, type: "case", ...path.mission }} topicId={path.topicIds[0]!} context="Role transfer case · self-graded" headingLevel={4} /></div></details>
        <div className="flex flex-wrap gap-3"><Link className="tp-btn tp-btn--secondary" href={`/interviews#${path.mockLoopId}`}><Timer className="tp-icon" aria-hidden />Rehearse a timed loop</Link><Link className="tp-btn tp-btn--secondary" href={`/projects#${path.projectIds[0]}`}>Build a role capstone<ArrowRight className="tp-icon" aria-hidden /></Link></div>
      </article>)}
    </section>
  </div>;
}
