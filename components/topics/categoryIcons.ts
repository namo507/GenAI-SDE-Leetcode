import { Binary, Bot, Brain, ChartPie, Cloud, Cpu, Database, GraduationCap, Network, Server, Sigma, Terminal, type LucideIcon } from "lucide-react";
import type { CategoryId } from "@/lib/curriculum";

/** One monochrome icon per category: identity comes from the label, the icon only helps scanning. */
export const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  foundations: Terminal,
  dsa: Binary,
  sql: Database,
  statistics: Sigma,
  analytics: ChartPie,
  ml: Brain,
  "deep-learning": Cpu,
  genai: Bot,
  "system-design": Network,
  "data-engineering": Server,
  cloud: Cloud,
  career: GraduationCap,
};
