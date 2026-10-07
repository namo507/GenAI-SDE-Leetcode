"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { Pause, Play, StepBack, StepForward } from "lucide-react";
import { findAnchorLine, type Language, type WalkthroughStep } from "@/lib/curriculum";
import { tokenize } from "@/components/ui/CodeBlock";
import { useReducedMotionPreference } from "@/components/shell/Providers";

const LINE = 22;
const PAD = 12;
const STEP_MS = 4200;

function subscribeVisibility(cb: () => void) {
  document.addEventListener("visibilitychange", cb);
  return () => document.removeEventListener("visibilitychange", cb);
}

/** Resolves each step's anchor to a line range, searching forward from the previous step. */
export function resolveSteps(code: string, steps: WalkthroughStep[], lang: Language) {
  let from = 0;
  return steps.map((s) => {
    const start = Math.max(0, findAnchorLine(code, s[lang], from));
    from = start;
    const span = lang === "python" ? s.pythonLines : s.rLines;
    return { start, end: start + span - 1, eli5: s.eli5 };
  });
}

/**
 * "Explain like I'm five" tour of a program: a highlight band slides to the
 * lines being explained while a plain-language caption says what they do.
 */
export function CodeTour({ code, steps, lang, label }: { code: string; steps: WalkthroughStep[]; lang: Language; label: string }) {
  const reduced = useReducedMotionPreference();
  const hidden = useSyncExternalStore(subscribeVisibility, () => document.hidden, () => false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const scroller = useRef<HTMLPreElement>(null);
  const lines = useMemo(() => code.split("\n"), [code]);
  const resolved = useMemo(() => resolveSteps(code, steps, lang), [code, steps, lang]);
  const current = resolved[Math.min(index, resolved.length - 1)]!;
  const last = resolved.length - 1;

  useEffect(() => {
    if (!playing || hidden || index >= last) return;
    const t = setTimeout(() => {
      setIndex(index + 1);
      if (index + 1 >= last) setPlaying(false);
    }, STEP_MS);
    return () => clearTimeout(t);
  }, [playing, hidden, index, last]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const top = PAD + current.start * LINE;
    const bottom = PAD + (current.end + 1) * LINE;
    if (top < el.scrollTop + 16 || bottom > el.scrollTop + el.clientHeight - 16) {
      el.scrollTo({ top: Math.max(0, top - 48), behavior: reduced ? "auto" : "smooth" });
    }
  }, [current.start, current.end, reduced]);

  const go = (i: number) => {
    setPlaying(false);
    setIndex(Math.max(0, Math.min(last, i)));
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(index - 1);
    }
  };

  return (
    <div className="tp-tour" role="group" aria-roledescription="code walkthrough" aria-label={label} onKeyDown={onKey}>
      <pre ref={scroller} className="tp-tour__code" tabIndex={0} aria-label={`${label}: program with the explained lines highlighted`}>
        <motion.div
          className="tp-tour__band"
          aria-hidden
          initial={false}
          animate={{ top: PAD + current.start * LINE, height: (current.end - current.start + 1) * LINE }}
          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 38 }}
        />
        {lines.map((line, i) => {
          const inStep = i >= current.start && i <= current.end;
          return (
            <span key={i} className="tp-tour__line" data-dim={!inStep}>
              <span className="tp-tour__ln" aria-hidden>
                {i + 1}
              </span>
              <span>
                {tokenize(line, lang).map((t, j) =>
                  t.type === "plain" ? (
                    <span key={j}>{t.text}</span>
                  ) : (
                    <span key={j} className={`syn-${t.type}`}>
                      {t.text}
                    </span>
                  ),
                )}
                {line === "" ? " " : null}
                {inStep && <span className="tp-sr-only"> (explained in this step)</span>}
              </span>
            </span>
          );
        })}
      </pre>
      <div className="tp-tour__panel">
        <div className="flex items-center justify-between gap-2">
          <span className="tp-eyebrow">
            Step {index + 1} of {resolved.length} · lines {current.start + 1}
            {current.end > current.start ? `–${current.end + 1}` : ""}
          </span>
        </div>
        <div aria-live="polite" aria-atomic="true" className="min-h-[100px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={index}
              className="tp-tour__say"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            >
              {current.eli5}
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="tp-btn tp-btn--secondary tp-btn--sm tp-btn--icon" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous step">
            <StepBack className="tp-icon" aria-hidden />
          </button>
          <button
            type="button"
            className="tp-btn tp-btn--primary tp-btn--sm"
            onClick={() => {
              if (playing) setPlaying(false);
              else {
                if (index >= last) setIndex(0);
                setPlaying(true);
              }
            }}
          >
            {playing ? <Pause className="tp-icon" aria-hidden /> : <Play className="tp-icon" aria-hidden />}
            {playing ? "Pause" : index >= last ? "Replay" : "Play"}
          </button>
          <button type="button" className="tp-btn tp-btn--secondary tp-btn--sm tp-btn--icon" onClick={() => go(index + 1)} disabled={index === last} aria-label="Next step">
            <StepForward className="tp-icon" aria-hidden />
          </button>
        </div>
        <div className="tp-tour__dots" role="group" aria-label="Jump to step">
          {resolved.map((_, i) => (
            <button key={i} type="button" className="tp-tour__dot" aria-label={`Step ${i + 1}`} aria-current={i === index ? "step" : undefined} onClick={() => go(i)} />
          ))}
        </div>
        <p className="t-caption tp-muted">Tip: focus the walkthrough and use the left and right arrow keys.</p>
      </div>
    </div>
  );
}
