// Skin concerns we track on every scan. These map 1:1 to YouCam SD skin-analysis actions.
export const CONCERNS = [
  "acne",
  "redness",
  "oiliness",
  "pore",
  "texture",
  "moisture",
  "radiance",
  "wrinkle",
] as const;

export type Concern = (typeof CONCERNS)[number];

// ui_score from YouCam: 0-100, higher = healthier skin for that concern.
export type Scores = Record<Concern, number>;

export const CONFOUNDERS = [
  "Bad sleep",
  "Stress",
  "Period",
  "Started another product",
  "Weather change",
  "Lots of sun",
  "Ate differently",
] as const;

export type Confounder = (typeof CONFOUNDERS)[number];

export interface Evidence {
  id: string;
  takenAt: string; // ISO date
  scores: Scores;
  thumbnail?: string; // small data URL, kept locally only
  maskUrls?: Partial<Record<Concern, string>>;
  source: "youcam" | "simulated";
  confounders: Confounder[];
  note?: string;
}

export type VerdictKind = "acquitted" | "guilty" | "continued";

export interface Charge {
  title: string;
  detail: string;
  severity: "major" | "minor";
}

export interface ConcernFinding {
  concern: Concern;
  claimed: boolean;
  baseline: number;
  latest: number;
  delta: number;
  slopePerWeek: number;
  expectedDays: number;
  status: "improved" | "worse" | "unchanged";
}

export interface Analysis {
  verdict: VerdictKind;
  confidence: number; // 0-1
  daysOnTrial: number;
  scanCount: number;
  claimedDelta: number;
  findings: ConcernFinding[];
  charges: Charge[];
  exhibits: string[]; // factual one-liners the judge can cite
  objections: string[]; // confounders that weaken the evidence
  nextHearingInDays?: number;
}

export interface Ruling {
  headline: string;
  ruling: string;
  sentence: string[];
  quip: string;
  author: "claude" | "clerk"; // clerk = template fallback when no LLM key
}

export interface Case {
  id: string;
  productName: string;
  brand?: string;
  category: string;
  claims: Concern[];
  price?: number;
  startedAt: string;
  evidence: Evidence[];
  analysis?: Analysis;
  ruling?: Ruling;
  isSample?: boolean;
}
