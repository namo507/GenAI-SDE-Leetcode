import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/primitives";
import { ProjectsView } from "@/components/projects/ProjectsView";
import { catalog, projects } from "@/lib/site";

export const metadata: Metadata = { title: "Projects", description: "Capstone project briefs for each target role, with metrics, baselines, milestones and rubrics." };

export default function ProjectsPage() {
  const topics = Object.fromEntries(catalog.topics.map((t) => [t.id, { title: t.title, href: t.href }]));
  return (
    <>
      <PageHeader eyebrow={`${projects.length} capstone briefs`} title="Projects">
        Each brief names a real user, the decision the work supports, a metric and a baseline to beat. Week 16 walks you through scoping and starting one; each is sized at about two weeks and becomes the story you bring to interviews.
      </PageHeader>
      <ProjectsView projects={projects} topics={topics} />
    </>
  );
}
