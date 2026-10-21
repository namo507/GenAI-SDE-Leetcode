import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/primitives";
import { TopicsView } from "@/components/topics/TopicsView";
import { catalogWithoutPractice, contentCounts } from "@/lib/site";

export const metadata: Metadata = {
  title: "Topics",
  description: "Every topic by category: DSA, SQL, statistics, analytics, machine learning, deep learning, GenAI, system design, data engineering and cloud.",
};

export default function TopicsPage() {
  return (
    <>
      <PageHeader eyebrow={`${contentCounts.topics} topics · ${contentCounts.pairedExamples} with Python and R`} title="Topics">
        Each topic explains itself twice (like you are five, then at senior depth), animates the idea step by step, and runs real Python and R in your browser.
      </PageHeader>
      <TopicsView topics={catalogWithoutPractice.topics} />
    </>
  );
}
