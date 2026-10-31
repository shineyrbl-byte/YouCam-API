import { clerkRuling } from "./clerk";
import { analyzeCase } from "./verdict";
import { CONCERNS, type Case, type Concern, type Confounder, type Evidence, type Scores } from "./types";

// Small seeded RNG so sample data and simulated scans are repeatable.
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10_000) / 10_000;
  };
}

export function hashBytes(bytes: Uint8Array) {
  let h = 2166136261;
  const step = Math.max(1, Math.floor(bytes.length / 4096));
  for (let i = 0; i < bytes.length; i += step) {
    h ^= bytes[i];
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const clamp = (n: number) => Math.max(5, Math.min(98, Math.round(n)));

/**
 * Used only when no YouCam API key is configured, so the app can be tried end to end.
 * Claimed concerns drift up a little; everything else wobbles within scan noise.
 */
export function simulateScores(seed: number, previous: Scores | undefined, claims: Concern[]): Scores {
  const r = rng(seed);
  const out = {} as Scores;
  for (const c of CONCERNS) {
    if (!previous) out[c] = clamp(48 + r() * 30);
    else out[c] = clamp(previous[c] + (claims.includes(c) ? r() * 6 - 1 : r() * 5 - 2.5));
  }
  return out;
}

function sampleEvidence(
  start: number,
  plan: { day: number; scores: Scores; confounders?: Confounder[]; note?: string }[],
): Evidence[] {
  return plan.map((p, i) => ({
    id: `sample-${start}-${i}`,
    takenAt: new Date(start + p.day * 86_400_000).toISOString(),
    scores: p.scores,
    source: "simulated",
    confounders: p.confounders ?? [],
    note: p.note,
  }));
}

const s = (acne: number, redness: number, oiliness: number, pore: number, texture: number, moisture: number, radiance: number, wrinkle: number): Scores => ({
  acne, redness, oiliness, pore, texture, moisture, radiance, wrinkle,
});

// A pre-filled docket so a first-time visitor sees every verdict type immediately.
export function sampleCases(now = Date.now()): Case[] {
  return rawSamples(now).map((c) => {
    const analysis = analyzeCase(c);
    return { ...c, analysis, ruling: clerkRuling(c, analysis) };
  });
}

function rawSamples(now: number): Case[] {
  const ago = (d: number) => now - d * 86_400_000;
  return [
    {
      id: "sample-glow",
      productName: "Sunrise C-15 Serum",
      category: "Serum",
      claims: ["radiance", "texture"],
      price: 34,
      startedAt: new Date(ago(28)).toISOString(),
      isSample: true,
      evidence: sampleEvidence(ago(28), [
        { day: 0, scores: s(71, 66, 58, 62, 54, 60, 49, 77), note: "Baseline, morning light" },
        { day: 9, scores: s(72, 65, 59, 62, 58, 61, 55, 77) },
        { day: 18, scores: s(70, 67, 57, 63, 61, 62, 60, 78), confounders: ["Bad sleep"] },
        { day: 27, scores: s(72, 66, 58, 64, 64, 61, 63, 78), note: "Friends asked what I changed" },
      ]),
    },
    {
      id: "sample-mask",
      productName: "Deep Clean Clay Mask",
      category: "Mask",
      claims: ["pore", "oiliness"],
      price: 22,
      startedAt: new Date(ago(20)).toISOString(),
      isSample: true,
      evidence: sampleEvidence(ago(20), [
        { day: 0, scores: s(68, 70, 47, 52, 60, 55, 58, 80) },
        { day: 6, scores: s(65, 64, 50, 53, 59, 50, 57, 80), note: "Skin feels tight after" },
        { day: 13, scores: s(61, 60, 51, 52, 57, 47, 56, 79) },
        { day: 19, scores: s(60, 59, 52, 54, 56, 46, 55, 79), confounders: ["Stress"] },
      ]),
    },
    {
      id: "sample-gel",
      productName: "Cloud Water Gel Cream",
      category: "Moisturizer",
      claims: ["moisture", "redness"],
      price: 28,
      startedAt: new Date(ago(4)).toISOString(),
      isSample: true,
      evidence: sampleEvidence(ago(4), [
        { day: 0, scores: s(74, 61, 63, 66, 63, 44, 57, 81) },
        { day: 4, scores: s(74, 63, 62, 66, 63, 47, 58, 81) },
      ]),
    },
  ];
}
