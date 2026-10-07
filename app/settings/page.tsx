import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/primitives";
import { SettingsView } from "@/components/settings/SettingsView";

export const metadata: Metadata = { title: "Settings", description: "Plan, display, motion and data settings. Export, import or reset your progress." };

export default function SettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Settings" title="Settings">
        Nothing leaves your browser. There is no account and no server-side copy, so export a backup if you switch devices.
      </PageHeader>
      <SettingsView />
    </>
  );
}
