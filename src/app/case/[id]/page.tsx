"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { EvidenceCapture } from "@/components/EvidenceCapture";
import { DeltaBars, RulingPanel } from "@/components/Ruling";
import { ScoreChart } from "@/components/ScoreChart";
import { VERDICT_META, daysAgo, formatDate, useDemoMode, useHydrated } from "@/components/ui";
import { CONCERN_INFO } from "@/lib/claims";
import { deleteCase, saveCase, useCase } from "@/lib/store";
import type { Analysis, Case, Evidence, Ruling } from "@/lib/types";
import { analyzeCase, sortEvidence } from "@/lib/verdict";

export default function CasePage() {
  const { id } = useParams<{ id: string }>();
  const c = useCase(id);
  const hydrated = useHydrated();
  const router = useRouter();
  const [capturing, setCapturing] = useState(false);
  const [deliberating, setDeliberating] = useState(false);
  const [justRuled, setJustRuled] = useState(false);
  const [error, setError] = useState("");
  const demo = useDemoMode();

  if (!hydrated) return null;
  if (!c) {
    return (
      <div className="py-20 text-center">
        <p className="font-serif text-3xl font-bold">Case not found</p>
        <Link href="/" className="btn btn-ghost mt-6">Back to the docket</Link>
      </div>
    );
  }

  const evidence = sortEvidence(c.evidence);
  const live = analyzeCase(c);
  const stale = !c.analysis || c.analysis.scanCount !== evidence.length;
  const latestYouCam = [...evidence].reverse().find((e) => e.source === "youcam" && e.maskUrls && Object.keys(e.maskUrls).length);

  // Demo mode: shift every scan (and the case start) back in time, as if days had passed.
  // Scores are untouched; only the dates move. Used to record a demo in one sitting.
  function fastForward(days: number) {
    const shift = (iso: string) => new Date(new Date(iso).getTime() - days * 86_400_000).toISOString();
    saveCase({ ...c!, startedAt: shift(c!.startedAt), evidence: c!.evidence.map((e) => ({ ...e, takenAt: shift(e.takenAt) })) });
  }

  function addEvidence(e: Evidence) {
    saveCase({ ...c!, evidence: [...c!.evidence, e] });
    setCapturing(false);
  }

  async function callVerdict() {
    setDeliberating(true);
    setError("");
    const started = Date.now();
    try {
      // Photos stay on the device: only scores and notes go to the judge.
      const brief: Case = { ...c!, evidence: c!.evidence.map((e) => ({ ...e, thumbnail: undefined, maskUrls: undefined })) };
      const res = await fetch("/api/verdict", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(brief) });
      const data = (await res.json()) as { analysis: Analysis; ruling: Ruling; error?: string };
      if (!res.ok) throw new Error(data.error ?? "The court is in recess. Try again.");
      // Let the gavel land before the reveal.
      await new Promise((r) => setTimeout(r, Math.max(0, 1400 - (Date.now() - started))));
      saveCase({ ...c!, analysis: data.analysis, ruling: data.ruling });
      setJustRuled(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setDeliberating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-muted hover:text-ink">← Docket</Link>
          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-muted">Case No. {c.id.toUpperCase()} · The People v.</p>
          <h1 className="font-serif text-4xl font-black sm:text-5xl">{c.productName}</h1>
          <p className="mt-1 text-ink-2">
            {c.brand ? `${c.brand} · ` : ""}{c.category}{c.price ? ` · $${c.price}` : ""} · on trial since {formatDate(c.startedAt)}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-sm text-ink-2">Claims to:</span>
            {c.claims.map((k) => (
              <span key={k} className="rounded-full bg-paper-2 px-2.5 py-0.5 text-sm ring-1 ring-line">
                {CONCERN_INFO[k].emoji} {CONCERN_INFO[k].claim.toLowerCase()} <span className="text-muted">({CONCERN_INFO[k].expectedDays}d to judge)</span>
              </span>
            ))}
          </div>
        </div>
        <button onClick={() => setCapturing(true)} className="btn btn-primary">
          📸 {evidence.length ? "Submit new evidence" : "Take baseline scan"}
        </button>
      </div>

      {evidence.at(-1)?.limited && (
        <p className="rounded-xl border border-continued/40 bg-continued/10 px-4 py-3 text-sm">
          ⏳ This public demo has hit today&apos;s limit of real YouCam scans, so your latest scan was <b>simulated</b>. Everything
          else works the same. To run unlimited real scans, run the app locally with your own YouCam key (see the README).
        </p>
      )}

      {evidence.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-5xl">📸</p>
          <h2 className="mt-3 font-serif text-2xl font-bold">The court needs a baseline</h2>
          <p className="mx-auto mt-2 max-w-md text-ink-2">
            Take a bare-faced selfie before (or right as) you start using {c.productName}. Every future scan is compared to this one.
          </p>
          <button onClick={() => setCapturing(true)} className="btn btn-primary mt-6">Take baseline scan</button>
        </div>
      ) : (
        <>
          <section>
            {deliberating ? (
              <div className="card grid place-items-center gap-3 p-12 text-center">
                <span className="gavel-bang text-6xl">🔨</span>
                <p className="font-serif text-2xl font-bold">Order in the court!</p>
                <p className="text-ink-2">The judge is reviewing {evidence.length} exhibits…</p>
              </div>
            ) : c.analysis && c.ruling && !stale ? (
              <RulingPanel analysis={c.analysis} ruling={c.ruling} animate={justRuled} />
            ) : (
              <div className="card flex flex-wrap items-center justify-between gap-4 p-6">
                <div>
                  <p className="font-serif text-xl font-bold">
                    {evidence.length < 2 ? "Baseline on file. Come back for a check-in." : "New evidence is in. Ready for a verdict?"}
                  </p>
                  <p className="text-sm text-ink-2">
                    {evidence.length < 2
                      ? "Scan again in a few days. The court needs at least two scans to compare."
                      : `${evidence.length} scans over ${live.daysOnTrial} days. Early read: ${VERDICT_META[live.verdict].label.toLowerCase()}.`}
                  </p>
                  {error && <p className="mt-2 text-sm text-guilty">{error}</p>}
                </div>
                <button onClick={callVerdict} disabled={evidence.length < 2} className="btn btn-primary">
                  🔨 {c.ruling ? "Reconvene the court" : "Call the verdict"}
                </button>
              </div>
            )}
            {c.analysis?.verdict === "continued" && !stale && c.analysis.nextHearingInDays && (
              <p className="mt-3 text-center text-sm text-continued">
                ⏳ Next hearing: scan again around {formatDate(new Date(new Date(evidence.at(-1)!.takenAt).getTime() + c.analysis.nextHearingInDays * 86_400_000).toISOString())}
              </p>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <div className="space-y-6">
              {evidence.length < 2 && (
                <section className="card p-6">
                  <h3 className="font-serif text-xl font-bold">Baseline recorded</h3>
                  <p className="mt-1 text-sm text-ink-2">These are your starting scores. Every check-in is compared against them.</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {(Object.keys(CONCERN_INFO) as (keyof typeof CONCERN_INFO)[]).map((k) => (
                      <div key={k} className={`rounded-xl p-3 ${c.claims.includes(k) ? "bg-ink text-paper-2" : "bg-paper"}`}>
                        <p className="text-xs opacity-75">{CONCERN_INFO[k].emoji} {CONCERN_INFO[k].label}{c.claims.includes(k) && " ★"}</p>
                        <p className="font-serif text-2xl font-black tabular-nums">{evidence[0].scores[k]}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-sm text-ink-2">
                    ★ = what {c.productName} claims to fix. Next check-in: in about 3-5 days, same spot, same light.
                  </p>
                </section>
              )}
              {evidence.length >= 2 && (
                <section className="card p-5">
                  <h3 className="mb-3 font-serif text-xl font-bold">Exhibit A · Scores over time</h3>
                  <ScoreChart evidence={evidence} claims={c.claims} />
                </section>
              )}
              {evidence.length >= 2 && (
                <section className="card p-5">
                  <h3 className="mb-1 font-serif text-xl font-bold">Exhibit B · Change since baseline</h3>
                  <p className="mb-4 text-sm text-ink-2">Every concern, not just the claimed ones, so side effects can&apos;t hide.</p>
                  <DeltaBars findings={live.findings} />
                </section>
              )}
              {latestYouCam && (
                <section className="card p-5">
                  <h3 className="mb-1 font-serif text-xl font-bold">Forensic photos</h3>
                  <p className="mb-4 text-sm text-ink-2">Where YouCam detected each concern on your latest scan (YouCam keeps these for 2 hours).</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {Object.entries(latestYouCam.maskUrls!).map(([k, url]) => (
                      <figure key={k}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`${k} detection`} className="aspect-square w-full rounded-xl bg-paper object-cover" onError={(e) => (e.currentTarget.parentElement!.style.display = "none")} />
                        <figcaption className="mt-1 text-center text-xs text-ink-2">{CONCERN_INFO[k as keyof typeof CONCERN_INFO].label}</figcaption>
                      </figure>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className="card h-fit p-5">
              <h3 className="mb-4 font-serif text-xl font-bold">Evidence locker</h3>
              <ol className="relative space-y-4 border-l-2 border-dashed border-line pl-5">
                {[...evidence].reverse().map((e, i) => {
                  const day = Math.round((new Date(e.takenAt).getTime() - new Date(evidence[0].takenAt).getTime()) / 86_400_000);
                  const isBaseline = i === evidence.length - 1;
                  return (
                    <li key={e.id} className="relative">
                      <span className="absolute -left-[27px] top-2 h-3 w-3 rounded-full border-2 border-paper-2 bg-mahogany" />
                      <div className="flex gap-3">
                        {e.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={e.thumbnail} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-paper text-2xl">🧑</span>
                        )}
                        <div className="min-w-0 text-sm">
                          <p className="font-semibold">
                            Exhibit {String.fromCharCode(65 + evidence.length - 1 - i)} · Day {day}
                            {isBaseline && <span className="ml-1 text-muted">(baseline)</span>}
                          </p>
                          <p className="text-xs text-muted">
                            {daysAgo(e.takenAt)} · {e.source === "youcam" ? "YouCam Skin AI" : "simulated scan"}
                          </p>
                          {e.confounders.length > 0 && <p className="mt-1 text-xs text-continued">Witness: {e.confounders.join(", ")}</p>}
                          {e.note && <p className="mt-1 truncate text-xs italic text-ink-2">&ldquo;{e.note}&rdquo;</p>}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <button onClick={() => setCapturing(true)} className="btn btn-ghost mt-5 w-full text-sm">+ Add evidence</button>
              {demo && (
                <div className="mt-3 rounded-xl border border-dashed border-continued/50 p-3 text-xs">
                  <p className="mb-2 font-semibold text-continued">⏩ Demo time travel</p>
                  <div className="flex gap-2">
                    {[3, 7].map((d) => (
                      <button key={d} onClick={() => fastForward(d)} className="btn btn-ghost flex-1 !px-2 !py-1.5 text-xs">+{d} days</button>
                    ))}
                  </div>
                  <p className="mt-2 text-muted">Moves existing scans back in time. Scores stay real.</p>
                </div>
              )}
              <button
                onClick={() => {
                  if (confirm(`Dismiss the case against ${c.productName}? This deletes its scans.`)) {
                    deleteCase(c.id);
                    router.push("/");
                  }
                }}
                className="mt-3 w-full text-xs text-muted underline"
              >
                Dismiss case
              </button>
            </aside>
          </div>
        </>
      )}

      {capturing && <EvidenceCapture c={c} onClose={() => setCapturing(false)} onAdded={addEvidence} />}
    </div>
  );
}
