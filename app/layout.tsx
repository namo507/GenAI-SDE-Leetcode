import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next } from "next/font/google";
import "@xyflow/react/dist/base.css";
import "./globals.css";
import { AppShell } from "@/components/shell/AppShell";
import { Providers } from "@/components/shell/Providers";
import { STORAGE_KEY } from "@/lib/progress/schema";

const sans = Atkinson_Hyperlegible_Next({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-atkinson-next", display: "swap", adjustFontFallback: false, fallback: ["ui-sans-serif", "system-ui", "sans-serif"] });
const mono = Atkinson_Hyperlegible_Mono({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-atkinson-mono", display: "swap", adjustFontFallback: false, fallback: ["ui-monospace", "monospace"] });

export const metadata: Metadata = {
  title: { default: "TechPrep OS", template: "%s · TechPrep OS" },
  description:
    "A 16-week study system for software engineering, data science, ML and GenAI interviews, with ELI5 and Senior explanations, runnable Python and R, and step-by-step diagrams.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1012" },
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
