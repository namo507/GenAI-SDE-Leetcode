import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { labs, findLab } from "@/lib/labs";
import { getTopic } from "@/lib/site";
import { topicHref } from "@/lib/catalog";
import { DOMAIN_LABELS, ROLE_LABELS } from "@/lib/curriculum";
import { LabWorkspace } from "@/components/labs/LabWorkspace";

type Params = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() { return labs.map((lab) => ({ slug: lab.id })); }
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const lab = findLab((await params).slug);
  return lab ? { title: lab.title, description: lab.summary } : {};
}
export default async function LabPage({ params }: Params) {
  const lab = findLab((await params).slug);
  if (!lab) notFound();
  const topics = lab.topicIds.map((id) => getTopic(id)).filter((topic) => !!topic).map((topic) => ({ id: topic.id, title: topic.title, href: topicHref(topic) }));
  return <article className="grid gap-8"><header className="grid gap-4"><Link href="/labs" className="tp-link t-body-sm w-fit">Learning studio / {DOMAIN_LABELS[lab.domain]}</Link><h1 className="t-title">{lab.title}</h1><p className="prose-measure t-body tp-muted">{lab.summary}</p><div className="flex flex-wrap gap-2"><span className="tp-chip">{lab.minutes} min</span>{lab.roles.map((role) => <span className="tp-chip" key={role}>{ROLE_LABELS[role]}</span>)}</div></header><LabWorkspace labId={lab.id} topics={topics} /></article>;
}
