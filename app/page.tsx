import Link from "next/link";
import { Code, Gauge, Repeat, Workflow } from "lucide-react";
import { TRACK_LABELS } from "@/lib/curriculum";
import { catalog, contentCounts } from "@/lib/site";
import { Onboarding } from "@/components/onboarding/Onboarding";

const FEATURES = [
  {
    icon: Workflow,
    title: "ELI5 and Senior, side by side",
    body: "Every topic has a plain-language explanation with the point where its analogy breaks, and a senior-level one with invariants, trade-offs and failure modes.",
  },
  {
    icon: Code,
    title: "Python and R that really run",
    body: `${contentCounts.pairedExamples} paired programs run in your browser through Pyodide and webR. Both print identical output, and CI checks that on every change.`,
  },
  {
    icon: Repeat,
    title: "Practice that remembers",
    body: "Rate your confidence before you check an answer. Spaced review brings topics back before you forget them.",
  },
  {
    icon: Gauge,
    title: "Honest metrics",
    body: "Completion, mastery, confidence and retention are tracked separately. Nothing here predicts whether you will be hired.",
  },
];

export default function Home() {
  const tracks = [...new Set(catalog.weeks.map((w) => w.track))];
  return (
    <div className="grid gap-12">
      <section className="grid items-start gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="grid gap-5">
          <p className="t-label text-brand">TechPrep OS</p>
          <h1 className="t-display">Sixteen weeks to interview-ready, one day at a time.</h1>
          <p className="prose-measure t-body tp-muted">
            A study system for software, data science, ML, data engineering and GenAI interviews. Each day has a clear job, from concept map to interview
            simulation, and each topic explains itself twice: once simply, once at senior depth.
          </p>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              [contentCounts.weeks, "weeks"],
              [contentCounts.days, "planned days"],
              [contentCounts.topics, "topics"],
              [contentCounts.drills + contentCounts.practiceItems, "practice items"],
            ].map(([n, label]) => (
              <div key={label} className="grid">
                <dt className="order-2 t-caption tp-muted">{label}</dt>
                <dd className="t-numeral">{n}</dd>
              </div>
            ))}
          </dl>
          <p className="t-body-sm tp-muted">
            Tracks: {tracks.map((t) => TRACK_LABELS[t]).join(", ")}. Browse freely from the{" "}
            <Link className="tp-link" href="/roadmap">
              roadmap
            </Link>{" "}
            without setting anything up.
          </p>
        </div>
        <Onboarding />
      </section>

      <section aria-labelledby="how" className="grid gap-4">
        <h2 id="how" className="t-heading">
          How it works
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="tp-card grid content-start gap-2">
              <Icon className="tp-icon tp-icon--20 text-brand" aria-hidden />
              <h3 className="t-subheading">{title}</h3>
              <p className="t-body-sm tp-muted">{body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
