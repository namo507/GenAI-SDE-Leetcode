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
  useNodesInitialized,
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

type Point = { x: number; y: number };
type Box = { x: number; y: number; w: number; h: number };

const boxOf = (n: InternalNode): Box => ({ x: n.internals.positionAbsolute.x, y: n.internals.positionAbsolute.y, w: n.measured.width ?? 0, h: n.measured.height ?? 0 });
const centerOf = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

/** Where the line from the center of `box` toward `toward` crosses the border of `box`. */
function borderPoint(box: Box, toward: Point): Point {
  const w = box.w / 2;
  const h = box.h / 2;
  const c = centerOf(box);
  if (!w || !h) return c;
  const xx = (toward.x - c.x) / (2 * w) - (toward.y - c.y) / (2 * h);
  const yy = (toward.x - c.x) / (2 * w) + (toward.y - c.y) / (2 * h);
  const a = 1 / (Math.abs(xx) + Math.abs(yy) || 1);
  return { x: w * (a * xx + a * yy) + c.x, y: h * (-a * xx + a * yy) + c.y };
}

/** True when the straight line from a to b passes through any of the boxes (with a little margin). */
function crossesAny(a: Point, b: Point, boxes: Box[]) {
  for (let i = 1; i < 24; i++) {
    const x = a.x + ((b.x - a.x) * i) / 24;
    const y = a.y + ((b.y - a.y) * i) / 24;
    if (boxes.some((r) => x > r.x - 6 && x < r.x + r.w + 6 && y > r.y - 6 && y < r.y + r.h + 6)) return true;
  }
  return false;
}

/**
 * An edge between node borders. It is straight unless it would run through
 * another node or on top of an edge going the other way; then it bows into a
 * curve so loops and skips stay visible and their labels clear the nodes.
 */
const FloatingEdge = memo(function FloatingEdge({ id, source, target, label }: EdgeProps<StepEdge>) {
  const { active, visited } = useContext(StepContext);
  const reduced = useReducedMotionPreference();
  const s = useInternalNode(source);
  const t = useInternalNode(target);
  const lookup = useStore((st) => st.nodeLookup);
  const reverse = useStore((st) => st.edges.some((e) => e.source === target && e.target === source));
  if (!s || !t) return null;
  const sb = boxOf(s);
  const tb = boxOf(t);
  const others = [...lookup.values()].filter((n) => n.id !== source && n.id !== target).map(boxOf);
  const sc = centerOf(sb);
  const tc = centerOf(tb);
  let control: Point | null = null;
  if (reverse || crossesAny(sc, tc, others)) {
    const dx = tc.x - sc.x;
    const dy = tc.y - sc.y;
    const dist = Math.hypot(dx, dy) || 1;
    // Bow to the same side of the direction of travel: in a row, edges pointing back arc above it and
    // forward skips arc below, and a pair of edges going both ways separates.
    const bend = -Math.min(130, Math.max(46, dist * 0.32));
    control = { x: (sc.x + tc.x) / 2 + (dy / dist) * bend, y: (sc.y + tc.y) / 2 - (dx / dist) * bend };
  }
  const a = borderPoint(sb, control ?? tc);
  const b = borderPoint(tb, control ?? sc);
  const from = control ?? a;
  const angle = Math.atan2(b.y - from.y, b.x - from.x);
  const tip = { x: b.x - 3 * Math.cos(angle), y: b.y - 3 * Math.sin(angle) };
  const back = (d: number, side: number) => ({
    x: tip.x - 9 * Math.cos(angle) + side * d * Math.sin(angle),
    y: tip.y - 9 * Math.sin(angle) - side * d * Math.cos(angle),
  });
  const l = back(4.5, 1);
  const r = back(4.5, -1);
  const lineEnd = back(0, 0);
  let path: string;
  let labelX: number;
  let labelY: number;
  if (control) {
    path = `M ${a.x} ${a.y} Q ${control.x} ${control.y} ${lineEnd.x} ${lineEnd.y}`;
    labelX = (a.x + 2 * control.x + lineEnd.x) / 4;
    labelY = (a.y + 2 * control.y + lineEnd.y) / 4;
  } else {
    [path, labelX, labelY] = getStraightPath({ sourceX: a.x, sourceY: a.y, targetX: lineEnd.x, targetY: lineEnd.y });
    // A label on a short edge along a row would sit on top of both nodes; lift it above the row instead.
    if (label && Math.abs(tc.y - sc.y) < 8) labelY = Math.min(sb.y, tb.y) - 12;
  }
  const isActive = active.has(id);
  return (
    <>
      <BaseEdge id={id} path={path} label={label} labelX={labelX} labelY={labelY} labelBgPadding={[4, 2]} labelBgBorderRadius={4} className="tp-edge" data-active={isActive} data-visited={visited.has(id)} />
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

/** Reports the measured size of the diagram, which replaces the estimate once the nodes have rendered. */
function ReportBounds({ onBounds }: { onBounds: (size: { width: number; height: number }) => void }) {
  const ready = useNodesInitialized();
  const { getNodes, getNodesBounds } = useReactFlow();
  useEffect(() => {
    if (!ready) return;
    const b = getNodesBounds(getNodes());
    onBounds({ width: b.width, height: b.height });
  }, [ready, getNodes, getNodesBounds, onBounds]);
  return null;
}

/** Refit the diagram whenever the canvas changes size, since panning and zooming are off. */
function FitOnResize() {
  const { fitView } = useReactFlow();
  const width = useStore((s) => s.width);
  const height = useStore((s) => s.height);
  useEffect(() => {
    if (width && height) void fitView({ padding: FIT_PADDING, duration: 0 });
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
/** The smallest zoom the diagram renders at; narrower screens scroll sideways instead of shrinking text. */
const MIN_ZOOM = 0.75;
const FIT_PADDING = "24px";
const PAD_PX = 24;
/** Clear space kept between neighbouring nodes in a row, in diagram units. */
const NODE_GAP = 48;
/** Share of the authored spacing kept between columns that share no row. */
const KEEP_SPACING = 0.4;

/** A generous estimate of a node's rendered width (13px semibold label, 12px mono detail, 88 to 200 px). */
const nodeWidth = (n: Flow["nodes"][number]) => Math.min(200, Math.max(88, Math.max(n.label.length * 7.4, (n.detail?.length ?? 0) * 7.3) + 28));
const nodeHeight = (n: Flow["nodes"][number]) => (n.detail ? 58 : 38);

/**
 * Authored layouts space columns evenly for the widest label, which leaves
 * short labels far apart and the diagram too wide for the column. This keeps
 * the column order and alignment but closes each column up to its neighbours,
 * leaving NODE_GAP between nodes that share a row or a mostly level edge.
 */
function compactColumns(flow: Flow): Map<string, number> {
  const { nodes } = flow;
  const linked = new Set(flow.edges.flatMap((e) => [`${e.source}>${e.target}`, `${e.target}>${e.source}`]));
  const needsGap = (a: Flow["nodes"][number], b: Flow["nodes"][number]) =>
    Math.abs(a.y - b.y) < 64 || (linked.has(`${a.id}>${b.id}`) && Math.abs(a.y - b.y) < b.x - a.x);
  const cols = [...new Set(nodes.map((n) => n.x))].sort((a, b) => a - b);
  const at = new Map<number, number>();
  cols.forEach((x, i) => {
    const prev = cols[i - 1];
    let next = prev === undefined ? x : at.get(prev)! + (x - prev) * KEEP_SPACING;
    for (const b of nodes) {
      if (b.x !== x) continue;
      for (const a of nodes) if (a.x < x && needsGap(a, b)) next = Math.max(next, at.get(a.x)! + nodeWidth(a) + NODE_GAP);
    }
    at.set(x, next);
  });
  return new Map(nodes.map((n) => [n.id, at.get(n.x)!]));
}

export function FlowPlayer({ flow }: { flow: Flow }) {
  const { settings } = useProgress();
  const reduced = useReducedMotionPreference();
  const hidden = useDocumentHidden();
  const uid = useId();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const canvas = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const autoplayed = useRef(false);
  const last = flow.steps.length - 1;

  const [boxWidth, setBoxWidth] = useState(0);

  const labels = useMemo(() => new Map(flow.nodes.map((n) => [n.id, n.label])), [flow.nodes]);
  const [measured, setMeasured] = useState<{ width: number; height: number } | null>(null);
  const xs = useMemo(() => compactColumns(flow), [flow]);
  const nodes = useMemo<StepNode[]>(
    () =>
      flow.nodes.map((n) => ({
        id: n.id,
        type: "step",
        position: { x: xs.get(n.id)!, y: n.y },
        data: { label: n.label, ...(n.detail ? { detail: n.detail } : {}) },
        ariaLabel: n.detail ? `${n.label}: ${n.detail}` : n.label,
        draggable: false,
        connectable: false,
        selectable: false,
      })),
    [flow.nodes, xs],
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

  // Canvas size that keeps the diagram at MIN_ZOOM or more: estimated for the first paint, then measured.
  const minSize = useMemo(() => {
    const left = Math.min(...flow.nodes.map((n) => xs.get(n.id)!));
    const right = Math.max(...flow.nodes.map((n) => xs.get(n.id)! + nodeWidth(n)));
    const top = Math.min(...flow.nodes.map((n) => n.y));
    const bottom = Math.max(...flow.nodes.map((n) => n.y + nodeHeight(n)));
    const size = measured ?? { width: right - left, height: bottom - top };
    return {
      // A box this wide shows the whole diagram at about MIN_ZOOM by giving up some of the fit padding.
      tight: Math.ceil(size.width * MIN_ZOOM + PAD_PX),
      width: Math.ceil(size.width * MIN_ZOOM + 2 * PAD_PX),
      height: Math.ceil(size.height * MIN_ZOOM + 2 * PAD_PX),
    };
  }, [flow.nodes, xs, measured]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Narrower boxes scroll sideways, and say so, since overlay scrollbars stay hidden until used.
  const overflows = boxWidth > 0 && boxWidth < minSize.tight;

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
    // Observe the scrolling box, not the canvas: a canvas wider than the screen is never 60% visible.
    if (!settings.autoplayFlows || reduced || autoplayed.current || !scroller.current) return;
    const el = scroller.current;
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

  // When the diagram is wider than the screen, keep the step's first node in view.
  useEffect(() => {
    const el = scroller.current;
    const first = flow.steps[index]?.nodes[0];
    if (!el || !first || el.scrollWidth <= el.clientWidth) return;
    const node = el.querySelector<HTMLElement>(`.react-flow__node[data-id="${CSS.escape(first)}"]`);
    if (!node) return;
    const box = node.getBoundingClientRect();
    const view = el.getBoundingClientRect();
    const left = el.scrollLeft + box.left - view.left - (view.width - box.width) / 2;
    el.scrollTo({ left, behavior: reduced ? "auto" : "smooth" });
  }, [index, flow.steps, reduced]);

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
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-border px-4 py-3">
        <span id={`${uid}-title`} className="t-subheading">
          {flow.title}
        </span>
        {overflows && <span className="t-caption tp-muted">Scroll sideways to see the whole diagram</span>}
      </figcaption>
      <div className="tp-flow__scroller" ref={scroller}>
      <div className="tp-flow__canvas" ref={canvas} style={{ minWidth: boxWidth && !overflows ? undefined : `max(100%, ${minSize.width}px)`, minHeight: minSize.height }}>
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
            fitViewOptions={{ padding: FIT_PADDING }}
            minZoom={0.2}
            maxZoom={1.25}
            ariaLabelConfig={ARIA}
          >
            <FitOnResize />
            <ReportBounds onBounds={setMeasured} />
          </ReactFlow>
        </StepContext.Provider>
      </div>
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
