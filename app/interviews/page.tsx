import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/primitives";
import { InterviewsView } from "@/components/interviews/InterviewsView";
import { catalog, mockLoops } from "@/lib/site";

export const metadata: Metadata = { title: "Interviews", description: "Timed mock interview loops by role, with rubrics, self-scoring and history." };

export default function InterviewsPage() {
  const ids = new Set(mockLoops.flatMap((l) => l.rounds.flatMap((r) => r.topicIds)));
  const topics = Object.fromEntries(
    catalog.topics.filter((t) => ids.has(t.id)).map((t) => [t.id, { title: t.title, href: t.href, practice: t.practice }]),
  );
  return (
    <>
      <PageHeader eyebrow={`${mockLoops.length} timed loops`} title="Mock interviews">
        Run a loop end to end with a timer per round. Questions come from the lessons, rotate each time you retake a loop, and you score yourself against what interviewers
        usually look for.
      </PageHeader>
      <InterviewsView loops={mockLoops} topics={topics} />
    </>
  );
}
