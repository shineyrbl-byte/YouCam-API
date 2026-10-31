"use client";

import Link from "next/link";
import { CONCERN_INFO } from "@/lib/claims";
import { restoreSamples, useCases } from "@/lib/store";
import type { Case } from "@/lib/types";
import { VERDICT_META, VerdictStamp, daysAgo, useDemoMode, useHydrated } from "@/components/ui";

export default function Docket() {
  const cases = useCases();
  const hydrated = useHydrated();
  const demo = useDemoMode();

  const jailed = cases.filter((c) => c.analysis?.verdict === "guilty");
  const acquitted = cases.filter((c) => c.analysis?.verdict === "acquitted");
  const open = cases.filter((c) => !c.analysis || c.analysis.verdict === "continued");
  const saved = jailed.reduce((sum, c) => sum + (c.price ?? 0), 0);

  return (
    <div className="space-y-12">
      {demo && (
        <p className="rounded-xl border border-dashed border-continued/50 px-4 py-2 text-center text-sm text-continued">
          ⏩ Demo mode is on: case pages show &ldquo;time travel&rdquo; buttons. Turn it off with <code>?demo=0</code>.
        </p>
      )}
      <section className="grid items-center gap-8 md:grid-cols-[1.3fr_1fr]">
        <div className="fade-up">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-mahogany">The Skincare Court is in session</p>
          <h1 className="font-serif text-4xl font-black leading-[1.05] sm:text-6xl">
            Is your skincare <em className="text-mahogany">actually</em> working?
            <br />Put it on trial.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-2">
            Every product promises results. Few people can tell if they got them. Take a quick skin scan when you start a
            product, check in every few days, and the court rules on the evidence: keep it, bin it, or give it more time.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/case/new" className="btn btn-primary text-base">🔨 File a case</Link>
            <a href="#docket" className="btn btn-ghost text-base">See the docket</a>
          </div>
        </div>
        <ol className="card divide-y divide-line p-2 fade-up">
          {[
            ["📁", "File the case", "Name the product and what it claims to do."],
            ["📸", "Submit evidence", "YouCam Skin AI scores 8 skin concerns from a selfie, then again at each check-in."],
            ["⚖️", "Hear the verdict", "The court compares every scan, weighs your lifestyle notes, and rules."],
          ].map(([icon, title, body], i) => (
            <li key={title} className="flex gap-4 p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-paper text-xl">{icon}</span>
              <div>
                <p className="font-semibold">{i + 1}. {title}</p>
                <p className="text-sm text-ink-2">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {hydrated && (
        <section className="grid grid-cols-3 gap-3">
          <Stat value={String(cases.length)} label="cases filed" />
          <Stat value={String(acquitted.length)} label="proven to work" />
          <Stat value={`$${saved}`} label="no longer wasted on duds" />
        </section>
      )}

      <section id="docket" className="space-y-10 scroll-mt-24">
        <Shelf title="On trial" subtitle="Collecting evidence" cases={open} empty="No open cases. File one!" />
        <Shelf title="Acquitted" subtitle="These stay on your shelf" cases={acquitted} empty="No product has proven itself yet." />
        <Shelf title="Product jail" subtitle="Convicted. Stop buying these." cases={jailed} empty="The cells are empty. For now." jail />
        {hydrated && !cases.some((c) => c.isSample) && (
          <button onClick={restoreSamples} className="text-sm text-muted underline">Restore the sample cases</button>
        )}
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="card px-4 py-5 text-center">
      <p className="font-serif text-3xl font-black">{value}</p>
      <p className="text-xs text-ink-2 sm:text-sm">{label}</p>
    </div>
  );
}

function Shelf({ title, subtitle, cases, empty, jail }: { title: string; subtitle: string; cases: Case[]; empty: string; jail?: boolean }) {
  return (
    <div>
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="font-serif text-2xl font-bold">{title}</h2>
        <span className="text-sm text-muted">{subtitle}</span>
      </div>
      {cases.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">{empty}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => <CaseCard key={c.id} c={c} jail={jail} />)}
        </div>
      )}
    </div>
  );
}

function CaseCard({ c, jail }: { c: Case; jail?: boolean }) {
  const last = c.evidence.at(-1);
  const verdict = c.analysis?.verdict;
  return (
    <Link href={`/case/${c.id}`} className="card group relative block overflow-hidden p-5 transition hover:-translate-y-0.5">
      {jail && <div className="jail-bars absolute inset-0 opacity-[0.12] transition group-hover:opacity-25" />}
      <div className="relative">
        <p className="text-xs uppercase tracking-widest text-muted">The People v.</p>
        <h3 className="font-serif text-xl font-bold leading-tight">{c.productName}</h3>
        <p className="text-sm text-ink-2">{c.brand ? `${c.brand} · ` : ""}{c.category}{c.price ? ` · $${c.price}` : ""}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {c.claims.map((k) => (
            <span key={k} className="rounded-full bg-paper px-2 py-0.5 text-xs">{CONCERN_INFO[k].emoji} {CONCERN_INFO[k].claim}</span>
          ))}
        </div>
        <div className="mt-4 flex items-end justify-between">
          <p className="text-xs text-muted">
            {c.evidence.length} scan{c.evidence.length === 1 ? "" : "s"}{last ? ` · last scan ${daysAgo(last.takenAt)}` : " · awaiting baseline"}
          </p>
          {verdict ? <VerdictStamp kind={verdict} size="sm" /> : <span className="text-xs font-semibold text-continued">{VERDICT_META.continued.icon} No verdict yet</span>}
        </div>
      </div>
      {c.isSample && <span className="absolute right-3 top-3 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-gold">Sample</span>}
    </Link>
  );
}
