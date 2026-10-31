import type { Concern } from "./types";

interface ConcernInfo {
  label: string; // skin metric name
  claim: string; // what a product label would promise
  emoji: string;
  // Roughly how long a product needs before a fair judgement on this concern.
  // Skin turnover is ~28 days; hydration and oil respond much faster.
  expectedDays: number;
}

export const CONCERN_INFO: Record<Concern, ConcernInfo> = {
  acne: { label: "Acne", claim: "Clears breakouts", emoji: "🔴", expectedDays: 42 },
  redness: { label: "Redness", claim: "Calms redness", emoji: "🌡️", expectedDays: 14 },
  oiliness: { label: "Oiliness", claim: "Controls oil", emoji: "💧", expectedDays: 14 },
  pore: { label: "Pores", claim: "Minimizes pores", emoji: "🔍", expectedDays: 28 },
  texture: { label: "Texture", claim: "Smooths texture", emoji: "🧱", expectedDays: 28 },
  moisture: { label: "Moisture", claim: "Hydrates", emoji: "🫧", expectedDays: 7 },
  radiance: { label: "Radiance", claim: "Boosts glow", emoji: "✨", expectedDays: 21 },
  wrinkle: { label: "Fine lines", claim: "Reduces fine lines", emoji: "〰️", expectedDays: 56 },
};

export const CATEGORIES = [
  "Serum",
  "Moisturizer",
  "Cleanser",
  "Toner",
  "Sunscreen",
  "Spot treatment",
  "Exfoliant",
  "Mask",
  "Other",
];

// Concerns where getting worse usually means irritation, the classic "side effect".
export const IRRITATION_SIGNALS: Concern[] = ["redness", "acne"];
