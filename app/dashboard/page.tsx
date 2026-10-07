import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { catalogWithoutPractice } from "@/lib/site";

export const metadata: Metadata = { title: "Today", description: "Today's plan, reviews due, weak areas and four separate progress measures." };

export default function DashboardPage() {
  return <DashboardView catalog={catalogWithoutPractice} />;
}
