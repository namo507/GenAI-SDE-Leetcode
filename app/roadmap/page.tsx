import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/primitives";
import { RoadmapView } from "@/components/roadmap/RoadmapView";
import { DAY_KIND_LABELS, DAY_KINDS } from "@/lib/curriculum";
import { catalogWithoutPractice } from "@/lib/site";

export const metadata: Metadata = { title: "Roadmap", description: "Sixteen weeks of seven days each, from foundations to GenAI systems and capstones." };

export default function RoadmapPage() {
  return (
    <>
      <PageHeader eyebrow="16 weeks · 112 days · 5 phases" title="Roadmap">
        Every week follows the same seven-day rhythm: {DAY_KINDS.map((k) => DAY_KIND_LABELS[k].toLowerCase()).join(", ")}. Open any day to see its goals, tasks and topics.
      </PageHeader>
      <RoadmapView catalog={catalogWithoutPractice} />
    </>
  );
}
