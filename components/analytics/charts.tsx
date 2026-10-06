"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Table, ChartColumn } from "lucide-react";

/** Width of an element, tracked with ResizeObserver so charts draw at real pixel size. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry?.contentRect.width ?? 0)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

type Tip = { x: number; y: number; title: string; lines: string[] } | null;

function Tooltip({ tip, width }: { tip: Tip; width: number }) {
  if (!tip) return null;
  const left = Math.min(Math.max(tip.x, 90), Math.max(90, width - 90));
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 -translate-y-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 shadow-[var(--elevation-2)]"
      style={{ left, top: tip.y - 10 }}
      aria-hidden
    >
      <p className="t-label">{tip.title}</p>
      {tip.lines.map((l) => (
        <p key={l} className="t-caption tp-muted">
          {l}
        </p>
      ))}
    </div>
  );
}

export function LegendItem({ swatch, label }: { swatch: ReactNode; label: string }) {
  return (
    <li className="inline-flex items-center gap-2 t-caption">
      {swatch}
      {label}
    </li>
  );
}

/** Chart with a title, a short description, a legend slot and a table view the learner can switch to. */
export function ChartFrame({ id, title, description, legend, chart, table }: { id: string; title: string; description: ReactNode; legend?: ReactNode; chart: ReactNode; table: ReactNode }) {
  const [showTable, setShowTable] = useState(false);
  return (
    <section aria-labelledby={id} className="tp-card grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 id={id} className="t-heading">
            {title}
          </h2>
          <p className="prose-measure t-body-sm tp-muted">{description}</p>
        </div>
        <button type="button" className="tp-btn tp-btn--ghost tp-btn--sm" aria-pressed={showTable} onClick={() => setShowTable((s) => !s)}>
          {showTable ? <ChartColumn className="tp-icon" aria-hidden /> : <Table className="tp-icon" aria-hidden />}
          {showTable ? "Show chart" : "Show data table"}
        </button>
      </div>
      {!showTable && legend && <ul className="flex flex-wrap gap-4">{legend}</ul>}
      {showTable ? table : chart}
    </section>
  );
}

export function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
      <table className="w-full border-collapse text-left t-body-sm">
        <caption className="tp-sr-only">{caption}</caption>
        <thead className="bg-surface-sunken">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-3 py-2 t-label">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border">
              {r.map((c, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="px-3 py-1.5 font-semibold">
                    {c}
                  </th>
                ) : (
                  <td key={j} className="px-3 py-1.5 tabular-nums">
                    {c}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const hoursLabel = (m: number) => (m === 0 ? "0" : `${Math.round((m / 60) * 10) / 10} h`);

/** Rounded-top bar anchored to the baseline: 4px radius on the data end only. */
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  if (h <= 0) return "";
  return `M ${x} ${y + h} V ${y + r} Q ${x} ${y} ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h} Z`;
}

/** Planned versus logged minutes per week: two series on one minutes axis. */
export function TimeVsPlanChart({ data, summary }: { data: { week: number; planned: number; actual: number }[]; summary: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<Tip>(null);
  const height = 240;
  const m = { top: 12, right: 8, bottom: 28, left: 44 };
  const innerW = Math.max(0, width - m.left - m.right);
  const innerH = height - m.top - m.bottom;
  const max = Math.max(60, ...data.map((d) => Math.max(d.planned, d.actual)));
  const stepH = Math.ceil(max / 60 / 4) * 60;
  const top = stepH * 4;
  const y = (v: number) => m.top + innerH - (v / top) * innerH;
  const band = innerW / data.length;
  const gap = 2;
  const barW = Math.max(2, Math.min(18, (band - 6 - gap) / 2));
  const everyOther = band < 26;

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setTip(null)}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={summary} className="block">
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <line x1={m.left} x2={width - m.right} y1={y(stepH * i)} y2={y(stepH * i)} stroke="var(--chart-grid)" strokeWidth={1} />
              <text x={m.left - 6} y={y(stepH * i)} textAnchor="end" dominantBaseline="middle" className="fill-[var(--ink-muted)] text-[12px]">
                {hoursLabel(stepH * i)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = m.left + band * i + band / 2;
            const x0 = cx - barW - gap / 2;
            const x1 = cx + gap / 2;
            return (
              <g key={d.week}>
                <path d={barPath(x0, y(d.planned), barW, m.top + innerH - y(d.planned))} fill="var(--chart-2)" />
                <path d={barPath(x1, y(d.actual), barW, m.top + innerH - y(d.actual))} fill="var(--chart-1)" />
                {(!everyOther || i % 2 === 0) && (
                  <text x={cx} y={height - 8} textAnchor="middle" className="fill-[var(--ink-muted)] text-[12px]">
                    {d.week}
                  </text>
                )}
                <rect
                  x={m.left + band * i}
                  y={m.top}
                  width={band}
                  height={innerH}
                  fill="transparent"
                  onMouseMove={() =>
                    setTip({
                      x: cx,
                      y: Math.min(y(d.planned), y(d.actual)),
                      title: `Week ${d.week}`,
                      lines: [`Planned: ${d.planned} min`, `Logged: ${d.actual} min`, d.planned ? `${Math.round((d.actual / d.planned) * 100)}% of plan` : ""].filter(Boolean),
                    })
                  }
                />
              </g>
            );
          })}
          <line x1={m.left} x2={width - m.right} y1={y(0)} y2={y(0)} stroke="var(--chart-reference)" strokeWidth={1} />
        </svg>
      )}
      <Tooltip tip={tip} width={width} />
      <p className="mt-1 text-center t-caption tp-muted">Week</p>
    </div>
  );
}

/** Stated confidence (x) against observed accuracy (y). Points on the diagonal are perfectly calibrated. */
export function CalibrationChart({ rows, summary }: { rows: { label: string; stated: number; accuracy: number | null; n: number }[]; summary: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [tip, setTip] = useState<Tip>(null);
  const size = Math.min(width, 420);
  const m = { top: 12, right: 16, bottom: 36, left: 44 };
  const inner = Math.max(0, size - m.left - m.right);
  const height = inner + m.top + m.bottom;
  const x = (v: number) => m.left + v * inner;
  const y = (v: number) => m.top + inner - v * inner;
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setTip(null)}>
      {width > 0 && (
        <svg width={size} height={height} role="img" aria-label={summary} className="block">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={x(0)} x2={x(1)} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" />
              <text x={m.left - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-[var(--ink-muted)] text-[12px]">
                {Math.round(t * 100)}%
              </text>
              <text x={x(t)} y={m.top + inner + 16} textAnchor="middle" className="fill-[var(--ink-muted)] text-[12px]">
                {Math.round(t * 100)}%
              </text>
            </g>
          ))}
          <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke="var(--chart-reference)" strokeWidth={2} strokeDasharray="5 4" />
          <text x={x(0.5)} y={height - 2} textAnchor="middle" className="fill-[var(--ink-muted)] text-[12px]">
            Confidence you stated
          </text>
          {rows
            .filter((r) => r.accuracy !== null)
            .map((r) => (
              <g key={r.label}>
                <circle cx={x(r.stated)} cy={y(r.accuracy!)} r={6} fill="var(--chart-1)" stroke="var(--surface)" strokeWidth={2} />
                <circle
                  cx={x(r.stated)}
                  cy={y(r.accuracy!)}
                  r={16}
                  fill="transparent"
                  onMouseMove={() =>
                    setTip({ x: x(r.stated), y: y(r.accuracy!), title: r.label, lines: [`Claimed: ${Math.round(r.stated * 100)}%`, `Correct: ${Math.round(r.accuracy! * 100)}%`, `${r.n} attempts`] })
                  }
                />
              </g>
            ))}
        </svg>
      )}
      <p className="t-caption tp-muted">Vertical axis: share of answers that were correct.</p>
      <Tooltip tip={tip} width={size} />
    </div>
  );
}
