import type { FlowEdge, FlowNode, FlowStep, GlossaryTermInput, TopicInput, WeekInput } from "@/lib/curriculum";

/** Date the content in this release was last reviewed against current library behavior. */
export const REVIEWED = "2026-10-06";

/**
 * Tag for code blocks: keeps backslashes literal (so "\n" stays an escape inside
 * the Python or R string) and strips the common indentation.
 */
export function code(strings: TemplateStringsArray, ...values: unknown[]): string {
  const raw = String.raw({ raw: strings.raw }, ...values);
  const lines = raw.replace(/^\n/, "").replace(/\n\s*$/, "").split("\n");
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length));
  return lines.map((l) => l.slice(indent)).join("\n");
}

export const node = (id: string, label: string, x: number, y: number, detail?: string): FlowNode => ({
  id,
  label,
  x,
  y,
  ...(detail ? { detail } : {}),
});

/** Edge ids are always `source-target`, so steps can name them predictably. */
export const edge = (source: string, target: string, label?: string): FlowEdge => ({
  id: `${source}-${target}`,
  source,
  target,
  ...(label ? { label } : {}),
});

const words = (s: string) => s.split(/\s+/).filter(Boolean);

/** step("a b", "a-b", "Narration") activates nodes a and b and edge a-b. */
export const step = (nodes: string, edges: string, narration: string): FlowStep => ({
  nodes: words(nodes),
  edges: words(edges),
  narration,
});

export const defineTopic = (t: TopicInput): TopicInput => t;
export const defineWeek = (w: WeekInput): WeekInput => w;
export const defineTerms = (t: GlossaryTermInput[]): GlossaryTermInput[] => t;
