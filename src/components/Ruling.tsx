"use client";

import { CONCERN_INFO } from "@/lib/claims";
import type { Analysis, ConcernFinding, Ruling } from "@/lib/types";
import { VERDICT_META, VerdictStamp } from "./ui";

export function RulingPanel({ analysis, ruling, animate }: { analysis: Analysis; ruling: Ruling; animate?: boolean }) {
  const meta = VERDICT_META[analysis.verdict];
  return (
    <div className="card relative overflow-hidden" style={{ borderColor: meta.color }}>
      <div className="h-2" style={{ background: meta.color }} />
      <div className="space-y-5 p-6">
        <div className="flex flex-col-reverse items-start justify-between gap-4 sm:flex-row">
          <div className="min-w-0 max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">The court rules</p>
            <h2 className="mt-1 font-serif text-3xl font-black leading-tight">{ruling.headline}</h2>
          </div>
          <div className="shrink-0 sm:pt-3"><VerdictStamp kind={analysis.verdict} size="lg" animate={animate} /></div>
        </div>

        <p className="text-lg leading-relaxed text-ink-2">{ruling.ruling}</p>

        {analysis.charges.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold">Charges</p>
            <ul className="space-y-2">
              {analysis.charges.map((ch, i) => (
                <li key={i} className="flex gap-3 rounded-xl bg-paper p-3 text-sm">
                  <span className="font-mono text-xs text-muted">Count {i + 1}</span>
                  <span>
                    <b>{ch.title}</b>{ch.severity === "minor" && <span className="text-muted"> (minor)</span>}: {ch.detail}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysis.objections.length > 0 && (
          <div className="rounded-xl border border-dashed border-line p-3 text-sm">
            <p className="font-semibold">🙋 Objections from the defense</p>
            <p className="text-ink-2">Things that could explain changes besides the product: {analysis.objections.join(" · ")}</p>
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-semibold">The sentence (your next steps)</p>
          <ol className="space-y-1.5">
            {ruling.sentence.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-paper-2">{i + 1}</span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="font-serif text-lg italic">&ldquo;{ruling.quip}&rdquo;</p>
          <ConfidenceMeter value={analysis.confidence} />
        </div>
        <p className="text-xs text-muted">
          {ruling.author === "claude" ? "Ruling written by Judge Dewey Glow (Claude)." : "Ruling read by the court clerk (template)."} The verdict
          itself comes from the scan numbers, not the AI.
        </p>
      </div>
    </div>
  );
}

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const label = pct >= 70 ? "Strong case" : pct >= 45 ? "Reasonable case" : "Thin evidence";
  return (
    <div className="w-48" title="Based on number of scans, days on trial vs. how long the claims need, and trend consistency">
      <div className="mb-1 flex justify-between text-xs"><span className="text-ink-2">{label}</span><span className="font-semibold tabular-nums">{pct}%</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-paper">
        <div className="h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Diverging bars: change since baseline for every concern. Blue = better, red = worse. */
export function DeltaBars({ findings }: { findings: ConcernFinding[] }) {
  const max = Math.max(10, ...findings.map((f) => Math.abs(f.delta)));
  const sorted = [...findings].sort((a, b) => Number(b.claimed) - Number(a.claimed) || b.delta - a.delta);
  return (
    <ul className="space-y-2">
      {sorted.map((f) => {
        const w = (Math.abs(f.delta) / max) * 50;
        const up = f.delta >= 0;
        return (
          <li key={f.concern} className="grid grid-cols-[7.5rem_1fr_4.5rem] items-center gap-3 text-sm">
            <span className={f.claimed ? "font-semibold" : "text-ink-2"}>
              {CONCERN_INFO[f.concern].label}{f.claimed && " ★"}
            </span>
            <span className="relative h-5">
              <span className="absolute inset-y-0 left-1/2 w-px bg-[var(--axis)]" />
              <span
                className="absolute inset-y-0.5 rounded"
                style={{
                  left: up ? "50%" : `${50 - w}%`,
                  width: `${Math.max(w, 0.6)}%`,
                  background: up ? "var(--div-up)" : "var(--div-down)",
                  opacity: f.status === "unchanged" ? 0.35 : 1,
                }}
              />
            </span>
            <span className="text-right tabular-nums">
              {f.status === "improved" ? "▲" : f.status === "worse" ? "▼" : "•"} {f.delta > 0 ? "+" : ""}{f.delta}
            </span>
          </li>
        );
      })}
      <li className="flex justify-between pt-1 text-xs text-muted">
        <span>◀ worse</span><span>Faded = within scan noise (±5)</span><span>better ▶</span>
      </li>
    </ul>
  );
}
