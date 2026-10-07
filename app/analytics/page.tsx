import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/primitives";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";
import { catalogWithoutPractice } from "@/lib/site";

export const metadata: Metadata = { title: "Analytics", description: "Completion, mastery, confidence, retention, calibration and time against plan, each measured separately." };

export default function AnalyticsPage() {
  return (
    <>
      <PageHeader eyebrow="Analytics" title="How your study is going">
        Every number has its formula next to it. None of them predicts whether you will get an offer.
      </PageHeader>
      <AnalyticsView catalog={catalogWithoutPractice} />
    </>
  );
}
