"use client";

import { useEffect, useRef, useState } from "react";
import type { DayPoint } from "@/lib/data/stats";

const HEIGHT = 240;
const PAD = { top: 12, right: 12, bottom: 28, left: 40 };
const R = 4; // rounded data-end radius

function niceMax(v: number) {
  if (v <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= v)!;
  return step * pow;
}

const fmtDay = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** Column rounded on the data end only, square at the baseline. */
function columnPath(x: number, w: number, base: number, end: number) {
  const up = end < base;
  const h = Math.abs(end - base);
  const r = Math.min(R, w / 2, h);
  if (h === 0) return "";
  return up
    ? `M${x},${base} V${end + r} Q${x},${end} ${x + r},${end} H${x + w - r} Q${x + w},${end} ${x + w},${end + r} V${base} Z`
    : `M${x},${base} V${end - r} Q${x},${end} ${x + r},${end} H${x + w - r} Q${x + w},${end} ${x + w},${end - r} V${base} Z`;
}

/**
 * Diverging daily columns: upvotes rise above the baseline (blue), downvotes
 * hang below it (red). Hover/arrow keys move a crosshair with one tooltip.
 */
export function VoteTrendChart({ data }: { data: DayPoint[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = Math.max(1, data.length);
  const plotW = width - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const maxUp = niceMax(Math.max(0, ...data.map((d) => d.up)));
  const maxDown = niceMax(Math.max(0, ...data.map((d) => d.down)));
  const unit = plotH / (maxUp + maxDown);
  const base = PAD.top + maxUp * unit;
  const band = plotW / n;
  const barW = Math.max(1, Math.min(24, band - 2)); // 2px surface gap between neighbors
  const xOf = (i: number) => PAD.left + i * band + (band - barW) / 2;

  const point = active !== null ? data[active] : null;
  const tipLeft = active !== null ? Math.min(Math.max(xOf(active) + barW / 2, 90), width - 90) : 0;
  const labelIdx = [...new Set([0, Math.floor((n - 1) / 2), n - 1])];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-sm text-ink-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-up" /> Upvotes
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-down" /> Downvotes
        </span>
      </div>
      <div ref={wrap} className="relative overflow-hidden">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label="Daily upvotes and downvotes. Use arrow keys to read values; a table view follows."
          tabIndex={0}
          className="block outline-none focus-visible:ring-2 focus-visible:ring-up/50 rounded"
          onPointerMove={(e) => {
            const x = e.clientX - e.currentTarget.getBoundingClientRect().left - PAD.left;
            setActive(Math.min(n - 1, Math.max(0, Math.floor(x / band))));
          }}
          onPointerLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setActive((a) => Math.min(n - 1, (a ?? -1) + 1));
            else if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? n) - 1));
            else return;
            e.preventDefault();
          }}
        >
          {/* gridlines + y ticks */}
          {[
            { y: PAD.top, label: maxUp },
            { y: base, label: 0 },
            { y: PAD.top + plotH, label: maxDown },
          ].map((t) => (
            <g key={t.y}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={t.y}
                y2={t.y}
                stroke={t.label === 0 ? "var(--axis)" : "var(--hairline)"}
                strokeWidth={1}
              />
              <text x={PAD.left - 8} y={t.y + 4} textAnchor="end" fontSize={11} fill="var(--ink-muted)" className="tabular-nums">
                {t.label}
              </text>
            </g>
          ))}

          {active !== null && (
            <line
              x1={xOf(active) + barW / 2}
              x2={xOf(active) + barW / 2}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="var(--axis)"
              strokeWidth={1}
            />
          )}

          {data.map((d, i) => (
            <g key={d.day} opacity={active === null || active === i ? 1 : 0.55}>
              <path d={columnPath(xOf(i), barW, base - 1, base - 1 - d.up * unit)} fill="var(--up)" />
              <path d={columnPath(xOf(i), barW, base + 1, base + 1 + d.down * unit)} fill="var(--down)" />
            </g>
          ))}

          {labelIdx.map((i) => (
            <text
              key={i}
              x={xOf(i) + barW / 2}
              y={HEIGHT - 8}
              textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
              fontSize={11}
              fill="var(--ink-muted)"
            >
              {data[i] ? fmtDay(data[i].day) : ""}
            </text>
          ))}
        </svg>

        {point && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 w-40 -translate-x-1/2 rounded-lg border border-hairline bg-surface px-3 py-2 text-sm shadow-lg"
            style={{ left: tipLeft }}
          >
            <div className="mb-1 text-xs text-ink-muted">{fmtDay(point.day)}</div>
            <TipRow color="bg-up" value={point.up} label="up" />
            <TipRow color="bg-down" value={point.down} label="down" />
            <div className="mt-1 border-t border-hairline pt-1 text-xs text-ink-secondary tabular-nums">
              Net {point.up - point.down > 0 ? "+" : ""}
              {point.up - point.down}
            </div>
          </div>
        )}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-ink-muted hover:text-foreground">Table view</summary>
        <div className="mt-2 max-h-64 overflow-auto">
          <table className="w-full text-left tabular-nums">
            <thead className="text-ink-secondary">
              <tr>
                <th className="py-1 font-medium">Day</th>
                <th className="py-1 text-right font-medium">Up</th>
                <th className="py-1 text-right font-medium">Down</th>
                <th className="py-1 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.day} className="border-t border-hairline">
                  <td className="py-1">{fmtDay(d.day)}</td>
                  <td className="py-1 text-right">{d.up}</td>
                  <td className="py-1 text-right">{d.down}</td>
                  <td className="py-1 text-right">{d.up - d.down}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function TipRow({ color, value, label }: { color: string; value: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className={`h-0.5 w-3 rounded ${color}`} />
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="text-ink-secondary">{label}</span>
    </div>
  );
}
