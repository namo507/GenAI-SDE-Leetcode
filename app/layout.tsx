import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";
import { Providers } from "@/components/shell/Providers";
import { STORAGE_KEY } from "@/lib/progress/schema";

const sans = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: { default: "TechPrep OS", template: "%s · TechPrep OS" },
  description:
    "A 16-week interview prep dashboard for software, data science, data analyst, ML and GenAI roles: ELI5 and senior explanations, runnable Python and R, animated diagrams and practice.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

/** Applies the saved theme and motion settings before first paint to avoid a flash. */
const preferenceScript = `(function(){try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||"null");var p=s&&s.settings;var d=document.documentElement;if(p&&(p.theme==="light"||p.theme==="dark"))d.setAttribute("data-theme",p.theme);if(p&&(p.motion==="reduce"||p.motion==="full"))d.setAttribute("data-motion",p.motion);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: preferenceScript }} />
      </head>
      <body className="tp-root">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
