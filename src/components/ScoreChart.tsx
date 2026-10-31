"use client";

import { useMemo, useState } from "react";
import { CONCERN_INFO } from "@/lib/claims";
import { CONCERNS, type Concern, type Evidence } from "@/lib/types";
import { formatDate } from "./ui";

const SLOTS = ["var(--series-1)", "var(--series-2)", "var(--series-3)"];
const MAX_SERIES = 3;
const W = 640;
const H = 260;
const PAD = { l: 36, r: 92, t: 16, b: 30 };

/** Score-over-time for up to three concerns. Claimed concerns are shown first by default. */
export function ScoreChart({ evidence, claims }: { evidence: Evidence[]; claims: Concern[] }) {
  const [selected, setSelected] = useState<Concern[]>(() => {
    const order = [...claims, ...CONCERNS.filter((c) => !claims.includes(c))];
    return order.slice(0, Math.min(MAX_SERIES, Math.max(1, claims.length)));
  });
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  const t0 = new Date(evidence[0].takenAt).getTime();
  const pts = evidence.map((e) => ({ day: (new Date(e.takenAt).getTime() - t0) / 86_400_000, e }));
  const maxDay = Math.max(1, ...pts.map((p) => p.day));

  const [lo, hi] = useMemo(() => {
    const vals = pts.flatMap((p) => selected.map((c) => p.e.scores[c]));
    const min = Math.max(0, Math.floor((Math.min(...vals) - 8) / 10) * 10);
    const max = Math.min(100, Math.ceil((Math.max(...vals) + 8) / 10) * 10);
    return [min, max];
  }, [pts, selected]);

  const x = (d: number) => PAD.l + (d / maxDay) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const ticks = Array.from({ length: (hi - lo) / 10 + 1 }, (_, i) => lo + i * 10);
  // Color follows the concern (its position in the selection), never its rank in the data.
  const colorOf = (c: Concern) => SLOTS[selected.indexOf(c)];

  function toggle(c: Concern) {
    setSelected((cur) => (cur.includes(c) ? (cur.length > 1 ? cur.filter((k) => k !== c) : cur) : cur.length < MAX_SERIES ? [...cur, c] : cur));
  }

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    pts.forEach((p, i) => {
      if (Math.abs(x(p.day) - px) < Math.abs(x(pts[best].day) - px)) best = i;
    });
    setHover(best);
  }

  const hp = hover !== null ? pts[hover] : null;

  // End-of-line labels: push apart so close values don't overlap.
  const labelY = new Map<Concern, number>();
  const lastScores = pts[pts.length - 1].e.scores;
  [...selected]
    .sort((a, b) => lastScores[b] - lastScores[a])
    .forEach((c, i, arr) => {
      const want = y(lastScores[c]) + 4;
      const prev = i ? labelY.get(arr[i - 1])! : -Infinity;
      labelY.set(c, Math.max(want, prev + 15));
    });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {CONCERNS.map((c) => (
          <button
            key={c}
            onClick={() => toggle(c)}
            aria-pressed={selected.includes(c)}
            className="chip flex items-center gap-1.5 !text-xs"
            title={selected.length >= MAX_SERIES && !selected.includes(c) ? "Up to 3 at a time" : undefined}
          >
            {selected.includes(c) && <span className="h-2 w-2 rounded-full" style={{ background: colorOf(c) }} />}
            {CONCERN_INFO[c].label}
            {claims.includes(c) && <span className="opacity-60">★</span>}
          </button>
        ))}
        <button onClick={() => setAsTable((v) => !v)} className="ml-auto text-xs text-ink-2 underline">
          {asTable ? "Show chart" : "Show table"}
        </button>
      </div>

      {asTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="py-1 pr-3 font-medium">Scan</th>
                {CONCERNS.map((c) => <th key={c} className="px-2 py-1 font-medium">{CONCERN_INFO[c].label}</th>)}
              </tr>
            </thead>
            <tbody>
              {pts.map((p, i) => (
                <tr key={p.e.id} className="border-t border-line">
                  <td className="py-1.5 pr-3 text-ink-2">Day {Math.round(p.day)} · {formatDate(p.e.takenAt)}{i === 0 ? " (baseline)" : ""}</td>
                  {CONCERNS.map((c) => <td key={c} className="px-2 py-1.5">{p.e.scores[c]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full touch-none select-none"
            role="img"
            aria-label={`Skin scores over ${Math.round(maxDay)} days for ${selected.map((c) => CONCERN_INFO[c].label).join(", ")}`}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke={t === lo ? "var(--axis)" : "var(--grid)"} strokeWidth={1} />
                <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)" className="tabular-nums">{t}</text>
              </g>
            ))}
            {pts.map((p) => (
              <text key={p.e.id} x={x(p.day)} y={H - 10} textAnchor="middle" fontSize="11" fill="var(--muted)">
                Day {Math.round(p.day)}
              </text>
            ))}
            {hp && <line x1={x(hp.day)} x2={x(hp.day)} y1={PAD.t} y2={H - PAD.b} stroke="var(--axis)" strokeDasharray="3 3" />}
            {selected.map((c) => {
              const d = pts.map((p, i) => `${i ? "L" : "M"}${x(p.day)},${y(p.e.scores[c])}`).join(" ");
              const lastPt = pts[pts.length - 1];
              return (
                <g key={c}>
                  <path d={d} fill="none" stroke={colorOf(c)} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  {pts.map((p) => (
                    <circle key={p.e.id} cx={x(p.day)} cy={y(p.e.scores[c])} r={4.5} fill={colorOf(c)} stroke="var(--paper-2)" strokeWidth={2} />
                  ))}
                  <text x={x(lastPt.day) + 10} y={labelY.get(c)} fontSize="12" fill="var(--ink-2)">
                    {CONCERN_INFO[c].label} {lastPt.e.scores[c]}
                  </text>
                </g>
              );
            })}
          </svg>
          {hp && (
            <div
              className="pointer-events-none absolute top-2 z-10 rounded-xl border border-line bg-paper-2 px-3 py-2 text-xs shadow-lg"
              style={{ left: `${Math.min(70, (x(hp.day) / W) * 100)}%` }}
            >
              <p className="mb-1 font-semibold">Day {Math.round(hp.day)} · {formatDate(hp.e.takenAt)}</p>
              {selected.map((c) => (
                <p key={c} className="flex items-center gap-2 tabular-nums">
                  <span className="h-2 w-2 rounded-full" style={{ background: colorOf(c) }} />
                  <span className="text-ink-2">{CONCERN_INFO[c].label}</span>
                  <span className="ml-auto font-semibold">{hp.e.scores[c]}</span>
                </p>
              ))}
              {hp.e.confounders.length > 0 && <p className="mt-1 text-muted">Noted: {hp.e.confounders.join(", ")}</p>}
            </div>
          )}
        </div>
      )}
      <p className="mt-2 text-xs text-muted">YouCam score, 0-100. Higher means healthier skin. ★ = what the product claims to fix.</p>
    </div>
  );
}
