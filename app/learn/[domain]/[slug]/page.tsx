import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, ExternalLink } from "lucide-react";
import { DAY_KIND_LABELS, ROLE_LABELS, categoryOf } from "@/lib/curriculum";
import { topicHref } from "@/lib/catalog";
import { anchorDayId, curriculum, findTopic, getDay, getTopic, glossary, neighbors } from "@/lib/site";
import { Explainer } from "@/components/learn/Explainer";
import { FlowPlayer } from "@/components/learn/FlowPlayer";
import { CodeRunner } from "@/components/learn/CodeRunner";
import { StudyStatus } from "@/components/learn/StudyStatus";
import { TableOfContents, type TocItem } from "@/components/learn/TableOfContents";
import { PracticeCard } from "@/components/practice/PracticeCard";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Callout, SectionHeading } from "@/components/ui/primitives";

type Params = { params: Promise<{ domain: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return curriculum.topics.map((t) => ({ domain: t.domain, slug: t.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { domain, slug } = await params;
  const topic = findTopic(domain, slug);
  return topic ? { title: topic.title, description: topic.summary } : {};
}

const DIFFICULTY_LABEL = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" } as const;

export default async function LearnPage({ params }: Params) {
  const { domain, slug } = await params;
  const topic = findTopic(domain, slug);
  if (!topic) notFound();

  const anchor = getDay(anchorDayId(topic.id))!;
  const category = categoryOf(topic.domain);
  const index = curriculum.topics.indexOf(topic);
  const { prev, next } = neighbors(curriculum.topics, index);
  const impl = topic.implementation;
  const terms = glossary.filter((g) => g.topicIds.includes(topic.id)).sort((a, b) => a.term.localeCompare(b.term));
  const toc: TocItem[] = [
    { id: "explanation", label: "Explanation" },
    { id: "workflow", label: "Workflow animation" },
    ...(impl ? [{ id: "code", label: "Code in Python and R" }] : topic.referenceSnippet ? [{ id: "reference-code", label: "Reference code" }] : []),
    { id: "practice", label: "Practice" },
    ...(terms.length ? [{ id: "key-terms", label: "Key terms" }] : []),
    { id: "references", label: "References" },
  ];

  return (
    <article className="grid gap-10">
      <header className="grid gap-4">
        <nav aria-label="Breadcrumb" className="t-body-sm">
          <ol className="flex flex-wrap items-center gap-1 tp-muted">
            <li>
              <Link className="hover:text-ink" href="/topics">
                Topics
              </Link>
              <span aria-hidden> / </span>
            </li>
            <li>
              <Link className="hover:text-ink" href={`/topics#${category.id}`}>
                {category.label}
              </Link>
              <span aria-hidden> / </span>
            </li>
            <li>
              <Link className="hover:text-ink" href={`/roadmap/${anchor.day.id}`}>
                Week {anchor.week.number}, day {anchor.day.day} · {anchor.day.label ?? DAY_KIND_LABELS[anchor.day.kind]}
              </Link>
            </li>
          </ol>
        </nav>
        <h1 className="t-display">{topic.title}</h1>
        <p className="prose-measure t-body tp-muted">{topic.summary}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="tp-chip tp-chip--brand">{category.label}</span>
          <span className="tp-chip">{DIFFICULTY_LABEL[topic.difficulty]}</span>
          <span className="tp-chip">
            <Clock className="tp-icon" aria-hidden />
            {topic.minutes} min
          </span>
          {impl && <span className="tp-chip">Python · R</span>}
          {topic.roles.map((r) => (
            <span key={r} className="tp-chip">
              {ROLE_LABELS[r]}
            </span>
          ))}
        </div>
        <div className="xl:hidden">
          <TableOfContents items={toc} variant="inline" />
        </div>
      </header>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_200px]">
        <div className="grid min-w-0 content-start gap-12">
          <section aria-labelledby="objectives" className="tp-card grid gap-3">
            <h2 id="objectives" className="t-subheading">
              You will be able to
            </h2>
            <ul className="grid list-disc gap-1 pl-5 t-body">
              {topic.objectives.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
            {topic.prerequisites.length > 0 && (
              <div className="grid gap-1 border-t border-border pt-3">
                <h3 className="t-label tp-muted">Builds on</h3>
                <ul className="flex flex-wrap gap-2">
                  {topic.prerequisites.map((id) => {
                    const p = getTopic(id)!;
                    return (
                      <li key={id}>
                        <Link className="tp-chip hover:border-border-strong hover:text-ink" href={topicHref(p)}>
                          {p.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>

          <div id="explanation" className="scroll-mt-24">
            <Explainer topic={topic} />
          </div>

          <section aria-labelledby="workflow" className="grid gap-4">
            <SectionHeading id="workflow" title="Workflow animation">
              Press play to watch the idea move step by step, or step through it yourself. Every step is narrated and listed in the transcript.
            </SectionHeading>
            <FlowPlayer flow={topic.flow} />
          </section>

          {impl && (
            <section aria-labelledby="code" className="grid gap-5">
              <SectionHeading id="code" title="Code in Python and R">
                {impl.problem}
                {impl.walkthrough ? " Choose “Explain like I'm 5” for a guided, line-by-line tour." : ""}
              </SectionHeading>
              <div className="grid gap-1">
                <p className="t-label tp-muted">Shared input</p>
                <code className="inline-code w-fit whitespace-pre-wrap">{impl.input}</code>
              </div>
              <CodeRunner implementation={impl} title={topic.title} />
              <div className="grid gap-6 lg:grid-cols-2">
                <section className="tp-card grid content-start gap-2" aria-labelledby="trace">
                  <h3 id="trace" className="t-subheading">
                    What happens to the input
                  </h3>
                  <ol className="grid list-decimal gap-1.5 pl-5 t-body-sm">
                    {impl.eli5Trace.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                </section>
                <div className="grid content-start gap-6">
                  <section className="tp-card grid gap-2" aria-labelledby="complexity">
                    <h3 id="complexity" className="t-subheading">
                      Complexity
                    </h3>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 t-body-sm">
                      <dt className="font-medium tp-muted">Time</dt>
                      <dd>{impl.complexity.time}</dd>
                      <dt className="font-medium tp-muted">Space</dt>
                      <dd>{impl.complexity.space}</dd>
                    </dl>
                    {impl.complexity.note && <p className="t-caption tp-muted">{impl.complexity.note}</p>}
                  </section>
                  <section className="tp-card grid gap-2" aria-labelledby="edge-cases">
                    <h3 id="edge-cases" className="t-subheading">
                      Edge cases
                    </h3>
                    <ul className="grid list-disc gap-1 pl-5 t-body-sm">
                      {impl.edgeCases.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </section>
                </div>
              </div>
              <section className="grid gap-3" aria-labelledby="mistake">
                <h3 id="mistake" className="t-subheading">
                  A common mistake
                </h3>
                <CodeBlock code={impl.incorrect.code} language={impl.incorrect.language} label={`Incorrect (${impl.incorrect.language === "r" ? "R" : impl.incorrect.language === "sql" ? "SQL" : "Python"})`} />
                <div className="grid gap-3 md:grid-cols-2">
                  <Callout tone="risk" title="Why it is wrong">
                    {impl.incorrect.whyWrong}
                  </Callout>
                  <Callout tone="positive" title="The fix">
                    {impl.incorrect.fix}
                  </Callout>
                </div>
              </section>
            </section>
          )}

          {topic.referenceSnippet && (
            <section aria-labelledby="reference-code" className="grid gap-3">
              <SectionHeading id="reference-code" title={impl ? `Reference code: ${topic.referenceSnippet.label}` : "Reference code"}>
                {impl ? undefined : topic.referenceSnippet.label}
              </SectionHeading>
              <Callout tone="note" title="Read-only">
                This code uses a library that does not run in the browser, so it is shown for reference and not executed here. Library APIs change between versions; check the version you install.
              </Callout>
              <CodeBlock code={topic.referenceSnippet.code} language={topic.referenceSnippet.language} label={topic.referenceSnippet.language} />
            </section>
          )}
          {!impl && !topic.referenceSnippet && (
            <Callout tone="note" title="No code for this topic">
              This topic is practiced through writing and speaking rather than programming, so it has no runnable example.
            </Callout>
          )}

          <section aria-labelledby="practice" className="grid gap-4">
            <SectionHeading id="practice" title="Practice">
              Rate your confidence, reveal the model answer, then record honestly whether you got it. Your answers drive mastery, calibration and spaced review.
            </SectionHeading>
            <div className="grid gap-4">
              {topic.practice.map((p) => (
                <PracticeCard key={p.id} item={p} topicId={topic.id} />
              ))}
            </div>
          </section>

          {terms.length > 0 && (
            <section aria-labelledby="key-terms" className="grid gap-3">
              <SectionHeading id="key-terms" title="Key terms" />
              <dl className="grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-border bg-border sm:grid-cols-2">
                {terms.map((g) => (
                  <div key={g.slug} className="grid content-start gap-1 bg-surface p-4">
                    <dt>
                      <Link className="font-semibold t-body-sm hover:text-brand" href={`/glossary#${g.slug}`}>
                        {g.term}
                      </Link>
                    </dt>
                    <dd className="t-body-sm tp-muted">{g.definition}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section aria-labelledby="references" className="grid gap-3">
            <SectionHeading id="references" title="References" />
            <ul className="grid gap-2 t-body-sm">
              {topic.references.map((r) => (
                <li key={r.title} className="flex flex-wrap items-baseline gap-2">
                  {r.url ? (
                    <a className="tp-link inline-flex items-baseline gap-1" href={r.url} target="_blank" rel="noopener noreferrer">
                      {r.title}
                      <ExternalLink className="tp-icon self-center" aria-hidden />
                      <span className="tp-sr-only">(opens in a new tab)</span>
                    </a>
                  ) : (
                    <span>{r.title}</span>
                  )}
                  {r.versionSensitive && <span className="tp-chip tp-chip--caution">Version-sensitive: check current docs</span>}
                  {r.note && <span className="t-caption tp-muted">{r.note}</span>}
                </li>
              ))}
            </ul>
          </section>

          <footer className="grid gap-6 border-t border-border pt-6">
            <StudyStatus topicId={topic.id} title={topic.title} />
            <p className="t-caption tp-muted">Content last reviewed {topic.lastReviewed}.</p>
            <nav aria-label="Topic navigation" className="flex flex-wrap justify-between gap-3">
              {prev ? (
                <Link className="tp-btn tp-btn--secondary h-auto min-w-0 max-w-full whitespace-normal py-2 text-left" href={topicHref(prev)}>
                  <ArrowLeft className="tp-icon" aria-hidden />
                  <span>
                    <span className="tp-sr-only">Previous topic: </span>
                    {prev.title}
                  </span>
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link className="tp-btn tp-btn--secondary ml-auto h-auto min-w-0 max-w-full whitespace-normal py-2 text-right" href={topicHref(next)}>
                  <span>
                    <span className="tp-sr-only">Next topic: </span>
                    {next.title}
                  </span>
                  <ArrowRight className="tp-icon" aria-hidden />
                </Link>
              )}
            </nav>
          </footer>
        </div>
        <aside className="hidden xl:block" aria-label="Lesson outline">
          <div className="sticky top-24">
            <TableOfContents items={toc} variant="rail" />
          </div>
        </aside>
      </div>
    </article>
  );
}
