"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  BookOpen,
  ChartLine,
  Dumbbell,
  FolderKanban,
  LayoutDashboard,
  Map as MapIcon,
  Menu,
  Moon,
  Settings,
  Sun,
  Timer,
  WifiOff,
  X,
} from "lucide-react";
import { actions, useProgress } from "@/lib/progress/store";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/roadmap", label: "Roadmap", icon: MapIcon },
  { href: "/practice", label: "Practice", icon: Dumbbell },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/interviews", label: "Interviews", icon: Timer },
  { href: "/analytics", label: "Analytics", icon: ChartLine },
  { href: "/glossary", label: "Glossary", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function isCurrent(pathname: string, href: string) {
  if (href === "/roadmap") return pathname.startsWith("/roadmap") || pathname.startsWith("/learn");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function useOnline() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

function subscribeScheme(cb: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function ThemeToggle() {
  const { settings } = useProgress();
  const systemDark = useSyncExternalStore(subscribeScheme, () => window.matchMedia("(prefers-color-scheme: dark)").matches, () => false);
  const dark = settings.theme === "dark" || (settings.theme === "system" && systemDark);
  return (
    <button
      type="button"
      className="tp-btn tp-btn--ghost tp-btn--icon"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => actions.updateSettings({ theme: dark ? "light" : "dark" })}
    >
      {dark ? <Sun className="tp-icon tp-icon--20" aria-hidden /> : <Moon className="tp-icon tp-icon--20" aria-hidden />}
    </button>
  );
}

function Wordmark({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/" className="tp-wordmark" onClick={onNavigate} aria-label="TechPrep OS home">
      TechPrep <span className="tp-wordmark__os">OS</span>
    </Link>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="tp-nav" aria-label="Main">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className="tp-nav__item" aria-current={isCurrent(pathname, href) ? "page" : undefined} onClick={onNavigate}>
          <Icon className="tp-icon" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const online = useOnline();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    menuButton.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const el = drawer.current;
    el?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab" && el) {
        const focusables = [...el.querySelectorAll<HTMLElement>("a, button")];
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="min-h-dvh lg:grid lg:grid-cols-[var(--sidebar)_1fr]">
        <aside className="no-print hidden border-r border-border bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col" aria-label="Sidebar">
          <div className="flex items-center justify-between px-4 pb-1 pt-4">
            <Wordmark />
            <ThemeToggle />
          </div>
          <NavLinks pathname={pathname} />
          <p className="mt-auto px-6 pb-5 t-caption tp-muted">Your progress is stored in this browser. Export it from Settings.</p>
        </aside>

        <div className="min-w-0">
          <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface px-4 py-2 lg:hidden">
            <Wordmark />
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <button
                ref={menuButton}
                type="button"
                className="tp-btn tp-btn--ghost tp-btn--icon"
                aria-label="Open navigation"
                aria-expanded={open}
                aria-controls="mobile-nav"
                onClick={() => setOpen(true)}
              >
                <Menu className="tp-icon tp-icon--20" aria-hidden />
              </button>
            </div>
          </header>

          {!online && (
            <div role="status" className="flex items-start gap-3 border-b border-border bg-caution-soft px-4 py-3 t-body-sm text-ink">
              <WifiOff className="tp-icon mt-1 text-caution" aria-hidden />
              <p>
                You are offline. Pages you have opened still work, and runtimes already downloaded keep running. Loading a runtime for the first time needs a connection.
              </p>
            </div>
          )}

          <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[var(--content-max)] px-4 pb-16 pt-6 outline-none sm:px-6 lg:px-10 lg:pt-10">
            {children}
          </main>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <div className="absolute inset-0 bg-ink/40" onClick={close} aria-hidden />
            <motion.div
              ref={drawer}
              id="mobile-nav"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              className="absolute inset-y-0 left-0 flex w-[min(85vw,var(--sidebar))] flex-col bg-surface shadow-[var(--elevation-2)]"
              initial={{ x: -24 }}
              animate={{ x: 0 }}
              exit={{ x: -24 }}
              transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
            >
              <div className="flex items-center justify-between px-4 pb-1 pt-3">
                <Wordmark onNavigate={() => setOpen(false)} />
                <button type="button" className="tp-btn tp-btn--ghost tp-btn--icon" aria-label="Close navigation" onClick={close}>
                  <X className="tp-icon tp-icon--20" aria-hidden />
                </button>
              </div>
              <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
