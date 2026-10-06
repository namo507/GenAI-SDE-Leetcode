"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Menu, Moon, Search, Sun, WifiOff, X } from "lucide-react";
import { actions, useProgress } from "@/lib/progress/store";
import { CommandPalette } from "./CommandPalette";
import { NAV_PAGES, NAV_SECTIONS, isCurrent } from "./nav";

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}
const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);

function subscribeScheme(cb: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

const subscribeNoop = () => () => {};
/** "⌘" on Apple platforms, "Ctrl" elsewhere; decided on the client only. */
const useModKey = () => useSyncExternalStore(subscribeNoop, () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"), () => "Ctrl");

function ThemeToggle() {
  const { settings } = useProgress();
  const systemDark = useSyncExternalStore(subscribeScheme, () => window.matchMedia("(prefers-color-scheme: dark)").matches, () => false);
  const dark = settings.theme === "dark" || (settings.theme === "system" && systemDark);
  return (
    <button
      type="button"
      className="tp-btn tp-btn--ghost tp-btn--icon tp-btn--sm"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => actions.updateSettings({ theme: dark ? "light" : "dark" })}
    >
      {dark ? <Sun className="tp-icon" aria-hidden /> : <Moon className="tp-icon" aria-hidden />}
    </button>
  );
}

function Wordmark({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/" className="tp-wordmark" onClick={onNavigate} aria-label="TechPrep OS home">
      <span className="tp-wordmark__mark" aria-hidden>
        T
      </span>
      TechPrep <span className="tp-wordmark__os">OS</span>
    </Link>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="tp-nav" aria-label="Main">
      {NAV_SECTIONS.map((section) => (
        <div key={section} className="grid gap-px">
          <p className="tp-nav__section" aria-hidden>
            {section}
          </p>
          {NAV_PAGES.filter((p) => p.section === section).map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="tp-nav__item" aria-current={isCurrent(pathname, href) ? "page" : undefined} onClick={onNavigate}>
              <Icon className="tp-icon" aria-hidden />
              {label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}

function SearchButton({ onOpen, compact }: { onOpen: () => void; compact?: boolean }) {
  const mod = useModKey();
  if (compact)
    return (
      <button type="button" className="tp-btn tp-btn--ghost tp-btn--icon tp-btn--sm" aria-label="Search" onClick={onOpen}>
        <Search className="tp-icon" aria-hidden />
      </button>
    );
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-9 w-full max-w-sm items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface px-3 text-left t-body-sm tp-muted shadow-[var(--elevation-1)] transition-colors hover:border-border-strong"
      aria-keyshortcuts="Control+K Meta+K"
    >
      <Search className="tp-icon" aria-hidden />
      <span className="flex-1">Search topics, days, terms…</span>
      <kbd className="tp-kbd">{mod}</kbd>
      <kbd className="tp-kbd">K</kbd>
    </button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const online = useOnline();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const settingsHref = NAV_PAGES.find((p) => p.href === "/settings")!;

  const close = useCallback(() => {
    setOpen(false);
    menuButton.current?.focus();
  }, []);

  const openSearch = useCallback(() => {
    returnFocus.current = document.activeElement as HTMLElement | null;
    setOpen(false);
    setSearch(true);
  }, []);
  const closeSearch = useCallback(() => {
    setSearch(false);
    requestAnimationFrame(() => returnFocus.current?.focus?.());
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (search) closeSearch();
        else openSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [search, openSearch, closeSearch]);

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

  const SettingsIcon = settingsHref.icon;
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="min-h-dvh lg:grid lg:grid-cols-[var(--sidebar)_1fr]">
        <aside className="no-print hidden border-r border-border bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col" aria-label="Sidebar">
          <div className="flex h-14 items-center px-5">
            <Wordmark />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <NavLinks pathname={pathname} />
          </div>
          <div className="grid gap-1 border-t border-border p-3">
            <Link href="/settings" className="tp-nav__item" aria-current={isCurrent(pathname, "/settings") ? "page" : undefined}>
              <SettingsIcon className="tp-icon" aria-hidden />
              Settings
            </Link>
            <p className="px-2.5 pt-1 t-caption tp-muted">Progress stays in this browser.</p>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] px-4 backdrop-blur-md sm:px-6 lg:px-10">
            <div className="lg:hidden">
              <Wordmark />
            </div>
            <div className="ml-auto hidden flex-1 justify-end sm:flex lg:ml-0 lg:justify-start">
              <SearchButton onOpen={openSearch} />
            </div>
            <div className="ml-auto flex items-center gap-1 sm:ml-0">
              <span className="sm:hidden">
                <SearchButton onOpen={openSearch} compact />
              </span>
              <ThemeToggle />
              <button
                ref={menuButton}
                type="button"
                className="tp-btn tp-btn--ghost tp-btn--icon tp-btn--sm lg:hidden"
                aria-label="Open navigation"
                aria-expanded={open}
                aria-controls="mobile-nav"
                onClick={() => setOpen(true)}
              >
                <Menu className="tp-icon" aria-hidden />
              </button>
            </div>
          </header>

          {!online && (
            <div role="status" className="flex items-start gap-3 border-b border-border bg-caution-soft px-4 py-3 t-body-sm text-ink sm:px-6 lg:px-10">
              <WifiOff className="tp-icon mt-0.5 text-caution" aria-hidden />
              <p>You are offline. Pages you have opened still work, and runtimes already downloaded keep running. Loading a runtime for the first time needs a connection.</p>
            </div>
          )}

          <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[var(--content-max)] px-4 pb-20 pt-6 outline-none sm:px-6 lg:px-10 lg:pt-10">
            {children}
          </main>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <div className="absolute inset-0 bg-ink/30" onClick={close} aria-hidden />
            <motion.div
              ref={drawer}
              id="mobile-nav"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              className="absolute inset-y-0 left-0 flex w-[min(85vw,280px)] flex-col overflow-y-auto border-r border-border bg-surface shadow-[var(--elevation-2)]"
              initial={{ x: -24 }}
              animate={{ x: 0 }}
              exit={{ x: -24 }}
              transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
            >
              <div className="flex h-14 items-center justify-between px-4">
                <Wordmark onNavigate={() => setOpen(false)} />
                <button type="button" className="tp-btn tp-btn--ghost tp-btn--icon tp-btn--sm" aria-label="Close navigation" onClick={close}>
                  <X className="tp-icon" aria-hidden />
                </button>
              </div>
              <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
              <div className="mt-auto border-t border-border p-3">
                <Link href="/settings" className="tp-nav__item" aria-current={isCurrent(pathname, "/settings") ? "page" : undefined} onClick={() => setOpen(false)}>
                  <SettingsIcon className="tp-icon" aria-hidden />
                  Settings
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CommandPalette open={search} onClose={closeSearch} />
    </>
  );
}
