import { BookOpen, ChartLine, Dumbbell, FolderKanban, LayoutDashboard, Library, Map as MapIcon, Settings, Timer, type LucideIcon } from "lucide-react";

export type NavPage = { href: string; label: string; icon: LucideIcon; section: string; keywords: string };

/** Navigation, grouped the way a learner's week flows: plan, learn, practice, review. */
export const NAV_PAGES: NavPage[] = [
  { href: "/dashboard", label: "Today", icon: LayoutDashboard, section: "Plan", keywords: "dashboard home today plan reviews due weak areas" },
  { href: "/roadmap", label: "Roadmap", icon: MapIcon, section: "Plan", keywords: "16 weeks days schedule calendar chronological" },
  { href: "/topics", label: "Topics", icon: Library, section: "Learn", keywords: "library categories dsa sql statistics machine learning deep learning genai cloud system design" },
  { href: "/glossary", label: "Glossary", icon: BookOpen, section: "Learn", keywords: "terminology definitions terms vocabulary" },
  { href: "/practice", label: "Practice", icon: Dumbbell, section: "Practice", keywords: "drills coding problems leetcode sql statistics review spaced repetition quiz" },
  { href: "/interviews", label: "Mock interviews", icon: Timer, section: "Practice", keywords: "mock loop timed rounds behavioral" },
  { href: "/projects", label: "Projects", icon: FolderKanban, section: "Practice", keywords: "capstone portfolio briefs" },
  { href: "/analytics", label: "Analytics", icon: ChartLine, section: "Insights", keywords: "progress mastery calibration retention completion" },
  { href: "/settings", label: "Settings", icon: Settings, section: "Account", keywords: "theme motion export import reset roles start date" },
];

export const NAV_SECTIONS = ["Plan", "Learn", "Practice", "Insights"] as const;

export function isCurrent(pathname: string, href: string) {
  if (href === "/topics") return pathname.startsWith("/topics") || pathname.startsWith("/learn");
  return pathname === href || pathname.startsWith(`${href}/`);
}
