import type { Metadata } from "next";
import { catalogWithoutPractice } from "@/lib/site";
import { PageHeader } from "@/components/ui/primitives";
import { LabsView } from "@/components/labs/LabsView";

export const metadata: Metadata = { title: "Learning studio", description: "Predict, experiment and explain the concepts behind six technical interview roles." };
export default function LabsPage() {
  const topics = Object.fromEntries(catalogWithoutPractice.topics.map((topic) => [topic.id, { title: topic.title, href: topic.href }]));
  return <><PageHeader title="Learning studio" eyebrow="Learn by changing the mechanism">Make a prediction, inspect a counterexample and carry the explanation into an interview.</PageHeader><LabsView topics={topics} /></>;
}
