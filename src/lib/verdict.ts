import { CONCERN_INFO, IRRITATION_SIGNALS } from "./claims";
import {
  CONCERNS,
  type Analysis,
  type Case,
  type Charge,
  type ConcernFinding,
  type Evidence,
} from "./types";

// Scan-to-scan wobble from lighting/angle is a few points, so smaller moves are treated as noise.
export const NOISE = 5;
const IRRITATION_DROP = 6;
const DAY = 86_400_000;

const days = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / DAY;
const round1 = (n: number) => Math.round(n * 10) / 10;
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

function slopePerWeek(points: { x: number; y: number }[]) {
  if (points.length < 2) return 0;
  const mx = mean(points.map((p) => p.x));
  const my = mean(points.map((p) => p.y));
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  return den === 0 ? 0 : (num / den) * 7;
}

export function sortEvidence(evidence: Evidence[]) {
  return [...evidence].sort((a, b) => a.takenAt.localeCompare(b.takenAt));
}

/**
 * Turns a pile of skin scans into a verdict. Deterministic on purpose: the verdict is
 * decided by the numbers; the ruling text only explains it.
 */
export function analyzeCase(c: Pick<Case, "claims" | "evidence">): Analysis {
  const ev = sortEvidence(c.evidence);
  const scanCount = ev.length;

  if (scanCount < 2) {
    return {
      verdict: "continued",
      confidence: 0,
      daysOnTrial: 0,
      scanCount,
      claimedDelta: 0,
      findings: [],
      charges: [],
      exhibits: scanCount === 1 ? ["Baseline scan is on file. The court needs a follow-up scan."] : [],
      objections: [],
      nextHearingInDays: 3,
    };
  }

  const first = ev[0];
  const daysOnTrial = Math.max(0, Math.round(days(first.takenAt, ev[ev.length - 1].takenAt)));
  // Average the last two scans when we can: one bad-lighting photo shouldn't decide a case.
  const tail = scanCount >= 3 ? ev.slice(-2) : ev.slice(-1);

  const findings: ConcernFinding[] = CONCERNS.map((concern) => {
    const baseline = first.scores[concern];
    const latest = round1(mean(tail.map((e) => e.scores[concern])));
    const delta = round1(latest - baseline);
    const slope = slopePerWeek(ev.map((e) => ({ x: days(first.takenAt, e.takenAt), y: e.scores[concern] })));
    return {
      concern,
      claimed: c.claims.includes(concern),
      baseline,
      latest,
      delta,
      slopePerWeek: round1(slope),
      expectedDays: CONCERN_INFO[concern].expectedDays,
      status: delta >= NOISE ? "improved" : delta <= -NOISE ? "worse" : "unchanged",
    };
  });

  const claimed = findings.filter((f) => f.claimed);
  const claimedDelta = claimed.length ? round1(mean(claimed.map((f) => f.delta))) : 0;
  const charges: Charge[] = [];
  const exhibits: string[] = [];

  for (const f of findings) {
    const info = CONCERN_INFO[f.concern];
    const arrow = f.delta > 0 ? `+${f.delta}` : `${f.delta}`;
    if (f.claimed || f.status !== "unchanged") {
      exhibits.push(
        `${info.label}: ${f.baseline} → ${f.latest} (${arrow}) over ${daysOnTrial} days${f.claimed ? " [claimed]" : ""}`,
      );
    }

    if (IRRITATION_SIGNALS.includes(f.concern) && f.delta <= -IRRITATION_DROP && daysOnTrial >= 3) {
      charges.push({
        title: "Aggravated Irritation",
        detail: `${info.label} got worse by ${Math.abs(f.delta)} points while on this product.`,
        severity: "major",
      });
    } else if (f.claimed && f.status === "worse") {
      charges.push({
        title: "Breach of Promise",
        detail: `Promised "${info.claim.toLowerCase()}", but ${info.label.toLowerCase()} dropped ${Math.abs(f.delta)} points.`,
        severity: "major",
      });
    } else if (!f.claimed && f.status === "worse") {
      charges.push({
        title: "Collateral Damage",
        detail: `${info.label} slipped ${Math.abs(f.delta)} points, and that's not even what it was for.`,
        severity: "minor",
      });
    } else if (f.claimed && daysOnTrial >= f.expectedDays && f.delta < 2) {
      charges.push({
        title: "False Advertising",
        detail: `Had ${f.expectedDays}+ days to "${info.claim.toLowerCase()}" and moved ${arrow} points.`,
        severity: "major",
      });
    }
  }

  // Witness statements: lifestyle events that could explain changes without the product.
  const objections: string[] = [];
  for (const e of ev.slice(1)) {
    for (const cf of e.confounders) {
      objections.push(`Day ${Math.round(days(first.takenAt, e.takenAt))}: ${cf}`);
    }
  }
  const recentConfounders = tail.some((e) => e.confounders.length > 0);

  const hasMajor = charges.some((ch) => ch.severity === "major");
  const harmful = charges.some((ch) => ch.title === "Aggravated Irritation" || ch.title === "Breach of Promise");
  const allClaimsDue = claimed.length > 0 && claimed.every((f) => daysOnTrial >= f.expectedDays);

  let verdict: Analysis["verdict"];
  if (harmful) verdict = "guilty";
  else if (claimedDelta >= NOISE && !hasMajor) verdict = "acquitted";
  else if (allClaimsDue && claimedDelta < 2) verdict = "guilty";
  else verdict = "continued";

  let nextHearingInDays: number | undefined;
  if (verdict === "continued") {
    const pending = claimed.filter((f) => daysOnTrial < f.expectedDays).map((f) => f.expectedDays - daysOnTrial);
    nextHearingInDays = Math.min(14, Math.max(3, pending.length ? Math.min(...pending) : 5));
  }

  // Confidence: more scans, more time relative to what the claims need, and steady trends all help.
  const scanFactor = Math.min(1, (scanCount - 1) / 4);
  const neededDays = claimed.length ? mean(claimed.map((f) => f.expectedDays)) : 21;
  const timeFactor = Math.min(1, daysOnTrial / neededDays);
  const consistent = claimed.length
    ? claimed.filter((f) => Math.sign(f.slopePerWeek) === Math.sign(f.delta) || f.status === "unchanged").length /
      claimed.length
    : 1;
  let confidence = 0.4 * scanFactor + 0.4 * timeFactor + 0.2 * consistent;
  if (recentConfounders) confidence -= 0.15;
  confidence = Math.round(Math.min(0.98, Math.max(0.1, confidence)) * 100) / 100;

  return {
    verdict,
    confidence,
    daysOnTrial,
    scanCount,
    claimedDelta,
    findings,
    charges,
    exhibits,
    objections,
    nextHearingInDays,
  };
}
