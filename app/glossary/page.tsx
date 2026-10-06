import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/primitives";
import { GlossaryView } from "@/components/glossary/GlossaryView";
import { catalog, glossary } from "@/lib/site";

export const metadata: Metadata = { title: "Glossary", description: "Plain definitions with senior-level notes, prerequisites and links to the lessons that teach each term." };

export default function GlossaryPage() {
  const topics = Object.fromEntries(catalog.topics.map((t) => [t.id, { title: t.title, href: t.href }]));
  return (
    <>
      <PageHeader eyebrow={`${glossary.length} terms`} title="Glossary">
        A plain definition first, senior depth where it matters, and links to what you should know first and where each term is taught.
      </PageHeader>
      <GlossaryView terms={glossary} topics={topics} />
    </>
  );
}
