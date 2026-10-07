import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/primitives";
import { PracticeView } from "@/components/practice/PracticeView";
import { catalog, practiceSets } from "@/lib/site";

export const metadata: Metadata = { title: "Practice", description: "Spaced review, topic drills, SQL, coding, statistics, system design and RAG diagnosis." };

export default function PracticePage() {
  return (
    <>
      <PageHeader eyebrow="Practice" title="Drills and review">
        SQL runs in SQLite and Python runs in Pyodide, both inside your browser. Rate your confidence before every check: calibration compares it with your results.
      </PageHeader>
      <PracticeView topics={catalog.topics} sets={practiceSets} />
    </>
  );
}
