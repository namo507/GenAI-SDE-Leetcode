import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { DAY_KIND_LABELS, DOMAIN_LABELS, TRACK_LABELS } from "@/lib/curriculum";
import { topicHref } from "@/lib/catalog";
import { catalog, getDay, getTopic, neighbors } from "@/lib/site";
import { DayControls } from "@/components/roadmap/DayControls";
import { Callout, SectionHeading } from "@/components/ui/primitives";

type Params = { params: Promise<{ dayId: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return catalog.days.map((d) => ({ dayId: d.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { dayId } = await params;
  const found = getDay(dayId);
  return found ? { title: `Week ${found.week.number}, day ${found.day.day}: ${found.day.title}`, description: found.day.summary } : {};
}

export default async function DayPage({ params }: Params) {
  const { dayId } = await params;
  const found = getDay(dayId);
  if (!found) notFound();
  const { week, day } = found;
  const index = catalog.days.findIndex((d) => d.id === dayId);
  const { prev, next } = neighbors(catalog.days, index);
  const anchored = day.topicIds.filter((id) => id.startsWith(day.id));
  const revisited = day.topicIds.filter((id) => !id.startsWith(day.id));
  const pc = day.productionCase;

  const topicList = (ids: string[]) => (
    <ul className="grid gap-3">
      {ids.map((id) => {
        const t = getTopic(id)!;
        return (
          <li key={id}>
            <Link href={topicHref(t)} className="tp-card grid gap-1">
              <span className="t-caption tp-muted">
                {DOMAIN_LABELS[t.domain]} · {t.minutes} min{t.implementation ? " · Python and R" : ""}
              </span>
              <span className="t-subheading">{t.title}</span>
              <span className="t-body-sm tp-muted">{t.summary}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <article className="grid gap-10">
      <header className="grid gap-3">
        <nav aria-label="Breadcrumb" className="t-body-sm">
          <ol className="flex flex-wrap gap-1 tp-muted">
            <li>
              <Link className="tp-link" href="/roadmap">
                Roadmap
              </Link>
              <span aria-hidden> / </span>
            </li>
            <li>
              <Link className="tp-link" href={`/roadmap#week-${week.number}`}>
                Week {week.number}: {week.title}
              </Link>
            </li>
          </ol>
        </nav>
        <p className="t-label text-brand">
          Day {day.day} · {day.label ?? DAY_KIND_LABELS[day.kind]}
        </p>
        <h1 className="t-display">{day.title}</h1>
        <p className="prose-measure t-body">{day.summary}</p>
        <div className="flex flex-wrap gap-2">
          <span className="tp-chip">
            <Clock className="tp-icon" aria-hidden />
            {day.minutes} min
          </span>
          <span className="tp-chip">{TRACK_LABELS[week.track]}</span>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="grid content-start gap-8">
          <section aria-labelledby="goals" className="grid gap-3">
            <SectionHeading id="goals" title="Goals" />
            <ul className="grid list-disc gap-1 pl-6 t-body">
              {day.goals.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="plan" className="grid gap-3">
            <SectionHeading id="plan" title="Plan">
              Tasks add up to the {day.minutes} minutes planned for the day.
            </SectionHeading>
            <ol className="grid gap-2">
              {day.tasks.map((t, i) => (
                <li key={t.label} className="flex items-start justify-between gap-4 border-b border-border pb-2 t-body">
                  <span>
                    <span className="mr-2 font-mono tp-muted">{i + 1}.</span>
                    {t.label}
                  </span>
                  <span className="shrink-0 t-body-sm tp-muted">{t.minutes} min</span>
                </li>
              ))}
            </ol>
          </section>
          {anchored.length > 0 && (
            <section aria-labelledby="learn" className="grid gap-3">
              <SectionHeading id="learn" title="Learn today" />
              {topicList(anchored)}
            </section>
          )}
          {revisited.length > 0 && (
            <section aria-labelledby="revisit" className="grid gap-3">
              <SectionHeading id="revisit" title={anchored.length ? "Also revisit" : "Topics for today"}>
                Taught earlier; today you apply or review them.
              </SectionHeading>
              {topicList(revisited)}
            </section>
          )}
          {pc && (
            <section aria-labelledby="case" className="grid gap-4">
              <SectionHeading id="case" title={`Production case: ${pc.title}`} />
              <p className="prose-measure t-body">{pc.scenario}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid content-start gap-2">
                  <h3 className="t-subheading">Constraints</h3>
                  <ul className="grid list-disc gap-1 pl-6 t-body-sm">
                    {pc.constraints.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
                <div className="grid content-start gap-2">
                  <h3 className="t-subheading">Questions to answer</h3>
                  <ol className="grid list-decimal gap-1 pl-6 t-body-sm">
                    {pc.questions.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ol>
                </div>
              </div>
              <details className="tp-card">
                <summary className="cursor-pointer t-label">Show the rubric and common pitfalls (after you have written your answer)</summary>
                <div className="mt-3 grid gap-4">
                  <div className="grid gap-2">
                    <h3 className="t-subheading">A strong answer covers</h3>
                    <ul className="grid list-disc gap-1 pl-6 t-body-sm">
                      {pc.rubric.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>
                  <Callout tone="risk" title="Pitfalls">
                    <ul className="grid list-disc gap-1 pl-5">
                      {pc.pitfalls.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </Callout>
                </div>
              </details>
            </section>
          )}
        </div>
        <aside className="grid content-start gap-4" aria-label="Your progress on this day">
          <DayControls dayId={day.id} plannedMinutes={day.minutes} />
        </aside>
      </div>

      <nav aria-label="Day navigation" className="flex flex-wrap justify-between gap-3 border-t border-border pt-6">
        {prev ? (
          <Link className="tp-btn tp-btn--secondary h-auto min-w-0 max-w-full whitespace-normal py-2 text-left" href={prev.href}>
            <ArrowLeft className="tp-icon" aria-hidden />
            <span>
              <span className="tp-sr-only">Previous day: </span>
              W{prev.week} D{prev.day}: {prev.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link className="tp-btn tp-btn--secondary ml-auto h-auto min-w-0 max-w-full whitespace-normal py-2 text-right" href={next.href}>
            <span>
              <span className="tp-sr-only">Next day: </span>
              W{next.week} D{next.day}: {next.title}
            </span>
            <ArrowRight className="tp-icon" aria-hidden />
          </Link>
        )}
      </nav>
    </article>
  );
}
