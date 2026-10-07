"use client";

import { createContext, memo, useContext, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BaseEdge,
  Handle,
  Position,
  ReactFlow,
  getStraightPath,
  useInternalNode,
  useReactFlow,
  useStore,
  type Edge,
  type EdgeProps,
  type InternalNode,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { Pause, Play, RotateCcw, StepBack, StepForward } from "lucide-react";
import type { Flow } from "@/lib/curriculum";
import { useProgress } from "@/lib/progress/store";
import { useReducedMotionPreference } from "@/components/shell/Providers";

type StepState = { active: Set<string>; visited: Set<string> };
const StepContext = createContext<StepState>({ active: new Set(), visited: new Set() });

type StepNodeData = { label: string; detail?: string };
type StepNode = Node<StepNodeData, "step">;
type StepEdge = Edge<Record<string, never>, "floating">;

const StepNodeView = memo(function StepNodeView({ id, data }: NodeProps<StepNode>) {
  const { active, visited } = useContext(StepContext);
  return (
    <div className="tp-node" data-active={active.has(id)} data-visited={visited.has(id)}>
      <Handle type="target" position={Position.Left} isConnectable={false} className="tp-handle" />
      {data.label}
      {data.detail && <span className="tp-node__detail">{data.detail}</span>}
      <Handle type="source" position={Position.Right} isConnectable={false} className="tp-handle" />
    </div>
  );
});

/** Where the line between two node centers crosses the border of `node`. */
function borderPoint(node: InternalNode, other: InternalNode) {
  const w = (node.measured.width ?? 0) / 2;
  const h = (node.measured.height ?? 0) / 2;
  const cx = node.internals.positionAbsolute.x + w;
  const cy = node.internals.positionAbsolute.y + h;
  const ox = other.internals.positionAbsolute.x + (other.measured.width ?? 0) / 2;
  const oy = other.internals.positionAbsolute.y + (other.measured.height ?? 0) / 2;
  if (!w || !h) return { x: cx, y: cy };
  const xx = (ox - cx) / (2 * w) - (oy - cy) / (2 * h);
  const yy = (ox - cx) / (2 * w) + (oy - cy) / (2 * h);
  const a = 1 / (Math.abs(xx) + Math.abs(yy) || 1);
  return { x: w * (a * xx + a * yy) + cx, y: h * (-a * xx + a * yy) + cy };
}

/** A straight edge between node borders, so any layout (row, column, fan) reads cleanly. */
const FloatingEdge = memo(function FloatingEdge({ id, source, target, label }: EdgeProps<StepEdge>) {
  const { active, visited } = useContext(StepContext);
  const reduced = useReducedMotionPreference();
  const s = useInternalNode(source);
  const t = useInternalNode(target);
  if (!s || !t) return null;
  const a = borderPoint(s, t);
  const b = borderPoint(t, s);
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const tip = { x: b.x - 3 * Math.cos(angle), y: b.y - 3 * Math.sin(angle) };
  const back = (d: number, side: number) => ({
    x: tip.x - 9 * Math.cos(angle) + side * d * Math.sin(angle),
    y: tip.y - 9 * Math.sin(angle) - side * d * Math.cos(angle),
  });
  const l = back(4.5, 1);
  const r = back(4.5, -1);
  const lineEnd = back(0, 0);
  const [path, labelX, labelY] = getStraightPath({ sourceX: a.x, sourceY: a.y, targetX: lineEnd.x, targetY: lineEnd.y });
  const isActive = active.has(id);
  return (
    <>
      <BaseEdge id={id} path={path} label={label} labelX={labelX} labelY={labelY} className="tp-edge" data-active={isActive} data-visited={visited.has(id)} />
      <path d={`M ${tip.x} ${tip.y} L ${l.x} ${l.y} L ${r.x} ${r.y} Z`} className="tp-edge-arrow" data-active={isActive} data-visited={visited.has(id)} aria-hidden />
      {isActive && !reduced && (
        // A dot travelling source to target shows the direction data moves in this step.
        <circle r={4.5} className="tp-pulse" aria-hidden>
          <animateMotion dur="1.2s" repeatCount="indefinite" path={path} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1" />
        </circle>
      )}
    </>
  );
});

const nodeTypes = { step: StepNodeView };
const edgeTypes = { floating: FloatingEdge };

const ARIA = {
  "node.a11yDescription.default": "Diagram node. Tab moves through nodes and connections; the narration below explains each step.",
  "node.a11yDescription.keyboardDisabled": "Diagram node. Tab moves through nodes and connections; the narration below explains each step.",
  "edge.a11yDescription.default": "Diagram connection between two nodes.",
};

/** Refit the diagram whenever the canvas changes size, since panning and zooming are off. */
function FitOnResize() {
  const { fitView } = useReactFlow();
  const width = useStore((s) => s.width);
  const height = useStore((s) => s.height);
  useEffect(() => {
    if (width && height) void fitView({ padding: 0.12, duration: 0 });
  }, [width, height, fitView]);
  return null;
}

function subscribeVisibility(cb: () => void) {
  document.addEventListener("visibilitychange", cb);
  return () => document.removeEventListener("visibilitychange", cb);
}
const useDocumentHidden = () => useSyncExternalStore(subscribeVisibility, () => document.hidden, () => false);

const SPEEDS = [0.5, 1, 1.5, 2] as const;
const STEP_MS = 1600;

export function FlowPlayer({ flow }: { flow: Flow }) {
  const { settings } = useProgress();
  const reduced = useReducedMotionPreference();
  const hidden = useDocumentHidden();
  const uid = useId();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const canvas = useRef<HTMLDivElement>(null);
  const autoplayed = useRef(false);
  const last = flow.steps.length - 1;

  const labels = useMemo(() => new Map(flow.nodes.map((n) => [n.id, n.label])), [flow.nodes]);
  const nodes = useMemo<StepNode[]>(
    () =>
      flow.nodes.map((n) => ({
        id: n.id,
        type: "step",
        position: { x: n.x, y: n.y },
        data: { label: n.label, ...(n.detail ? { detail: n.detail } : {}) },
        ariaLabel: n.detail ? `${n.label}: ${n.detail}` : n.label,
        draggable: false,
        connectable: false,
        selectable: false,
      })),
    [flow.nodes],
  );
  const edges = useMemo<StepEdge[]>(
    () =>
      flow.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: "floating",
        ...(e.label ? { label: e.label } : {}),
        ariaLabel: `${labels.get(e.source)} to ${labels.get(e.target)}${e.label ? `: ${e.label}` : ""}`,
        selectable: false,
      })),
    [flow.edges, labels],
  );

  const stepState = useMemo<StepState>(() => {
    const visited = new Set<string>();
    flow.steps.slice(0, index + 1).forEach((s) => [...s.nodes, ...s.edges].forEach((id) => visited.add(id)));
    const current = flow.steps[index]!;
    return { active: new Set([...current.nodes, ...current.edges]), visited };
  }, [flow.steps, index]);

  // Advance while playing; the timer stops while the tab is hidden and resumes when it is visible.
  useEffect(() => {
    if (!playing || hidden || index >= last) return;
    const t = setTimeout(() => {
      setIndex(index + 1);
      if (index + 1 >= last) setPlaying(false);
    }, STEP_MS / speed);
    return () => clearTimeout(t);
  }, [playing, hidden, index, last, speed]);

  // Optional autoplay (Settings), once, when the diagram first scrolls into view. Never with reduced motion.
  useEffect(() => {
    if (!settings.autoplayFlows || reduced || autoplayed.current || !canvas.current) return;
    const el = canvas.current;
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && !autoplayed.current) {
        autoplayed.current = true;
        setPlaying(true);
        io.disconnect();
      }
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [settings.autoplayFlows, reduced]);

  const togglePlay = () => {
    if (playing) setPlaying(false);
    else {
      if (index >= last) setIndex(0);
      setPlaying(true);
    }
  };
  const go = (i: number) => {
    setPlaying(false);
    setIndex(Math.max(0, Math.min(last, i)));
  };

  const step = flow.steps[index]!;
  return (
    <figure className="tp-flow m-0" aria-labelledby={`${uid}-title`}>
      <figcaption id={`${uid}-title`} className="border-b border-border px-4 py-3 t-subheading">
        {flow.title}
      </figcaption>
      <div className="tp-flow__canvas" ref={canvas}>
        <StepContext.Provider value={stepState}>
          <ReactFlow
            defaultNodes={nodes}
            defaultEdges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            nodesFocusable
            edgesFocusable
            disableKeyboardA11y
            panOnDrag={false}
            panOnScroll={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            preventScrolling={false}
            fitView
            fitViewOptions={{ padding: 0.12 }}
            minZoom={0.2}
            maxZoom={1.25}
            ariaLabelConfig={ARIA}
          >
            <FitOnResize />
          </ReactFlow>
        </StepContext.Provider>
      </div>
      <div className="tp-flow__controls">
        <button type="button" className="tp-btn tp-btn--primary tp-btn--sm" onClick={togglePlay} aria-label={playing ? "Pause" : index >= last ? "Replay from the start" : "Play"}>
          {playing ? <Pause className="tp-icon" aria-hidden /> : <Play className="tp-icon" aria-hidden />}
          {playing ? "Pause" : index >= last ? "Replay" : "Play"}
        </button>
        <button type="button" className="tp-btn tp-btn--secondary tp-btn--sm tp-btn--icon" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous step">
          <StepBack className="tp-icon" aria-hidden />
        </button>
        <button type="button" className="tp-btn tp-btn--secondary tp-btn--sm tp-btn--icon" onClick={() => go(index + 1)} disabled={index === last} aria-label="Next step">
          <StepForward className="tp-icon" aria-hidden />
        </button>
        <button type="button" className="tp-btn tp-btn--ghost tp-btn--sm" onClick={() => go(0)} disabled={index === 0 && !playing}>
          <RotateCcw className="tp-icon" aria-hidden />
          Reset
        </button>
        <label className="tp-flow__speed">
          Speed
          <select className="tp-select" value={speed} onChange={(e) => setSpeed(Number(e.target.value) as (typeof SPEEDS)[number])}>
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}x
              </option>
            ))}
          </select>
        </label>
        <span className="tp-flow__step" aria-hidden>
          Step {index + 1} of {flow.steps.length}
        </span>
      </div>
      <div className="tp-flow__progress" aria-hidden>
        <span style={{ width: `${((index + 1) / flow.steps.length) * 100}%` }} />
      </div>
      <div className="tp-flow__narration" aria-live="polite" aria-atomic="true">
        <span className="tp-sr-only">
          Step {index + 1} of {flow.steps.length}.{" "}
        </span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={index}
            className="block"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
          >
            {step.narration}
          </motion.span>
        </AnimatePresence>
      </div>
      <details className="border-t border-border px-4 py-3">
        <summary className="cursor-pointer t-label">Transcript of all {flow.steps.length} steps</summary>
        <ol className="mt-3 grid gap-1">
          {flow.steps.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                className="w-full rounded-[var(--radius-sm)] px-2 py-1 text-left t-body-sm hover:bg-surface-sunken aria-[current=step]:bg-brand-soft aria-[current=step]:text-brand-ink"
                aria-current={i === index ? "step" : undefined}
                onClick={() => go(i)}
              >
                <span className="font-mono tp-muted">{i + 1}.</span> {s.narration}
              </button>
            </li>
          ))}
        </ol>
      </details>
    </figure>
  );
}
