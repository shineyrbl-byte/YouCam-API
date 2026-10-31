import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { CONCERN_INFO } from "./claims";
import type { Analysis, Case, Ruling } from "./types";

const MODEL = "claude-opus-5-5";

const SYSTEM = `You are the Honorable Judge Dewey Glow, presiding over the Skincare Court in the app "Product on Trial".
A user's skincare product is the defendant. The evidence is a series of YouCam AI skin scans (0-100 per concern, higher = healthier).

The verdict has ALREADY been decided by the court's analysis engine. Never change it, never contradict the numbers, and never invent data.
Your job is to deliver the ruling: witty and theatrical courtroom voice, but every claim must cite the evidence you were given.

Rules:
- headline: max 9 words, punchy, like a tabloid court headline.
- ruling: 2-4 sentences. Reference specific numbers from the exhibits. If there are objections (lifestyle confounders like bad sleep or a new product), acknowledge them fairly.
- sentence: 2-4 concrete next steps the user should take (keep using / stop / patch test / re-scan in N days / pair with X). Practical and safe. No medical diagnoses; suggest a dermatologist for severe or persistent irritation.
- quip: one short closing line, a pun or joke.
- Keep it kind to the user. Roast the product, never the person's skin.`;

const SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    ruling: { type: "string" },
    sentence: { type: "array", items: { type: "string" } },
    quip: { type: "string" },
  },
  required: ["headline", "ruling", "sentence", "quip"],
  additionalProperties: false,
};

function caseBrief(c: Case, a: Analysis) {
  return JSON.stringify(
    {
      defendant: `${c.brand ? c.brand + " " : ""}${c.productName} (${c.category})`,
      claims: c.claims.map((k) => CONCERN_INFO[k].claim),
      verdict: a.verdict,
      confidence: a.confidence,
      days_on_trial: a.daysOnTrial,
      scans: a.scanCount,
      average_change_on_claims: a.claimedDelta,
      exhibits: a.exhibits,
      charges: a.charges,
      objections: a.objections,
      next_hearing_in_days: a.nextHearingInDays ?? null,
      user_notes: c.evidence.map((e) => e.note).filter(Boolean),
    },
    null,
    2,
  );
}

export async function deliverRuling(c: Case, a: Analysis): Promise<Ruling> {
  if (!process.env.ANTHROPIC_API_KEY) return clerkRuling(c, a);

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      // Refused requests get retried on a fallback model automatically.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: "user", content: `Deliver the ruling for this case:\n${caseBrief(c, a)}` }],
    });
    if (response.stop_reason === "refusal") return clerkRuling(c, a);
    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return clerkRuling(c, a);
    const parsed = JSON.parse(text.text) as Omit<Ruling, "author">;
    return { ...parsed, author: "claude" };
  } catch (err) {
    console.error("Judge unavailable, the clerk will read the ruling instead:", err);
    return clerkRuling(c, a);
  }
}

// Template ruling, used when no Anthropic key is set or the call fails.
export function clerkRuling(c: Case, a: Analysis): Ruling {
  const name = c.productName;
  const best = [...a.findings].filter((f) => f.claimed).sort((x, y) => y.delta - x.delta)[0];
  const worst = [...a.findings].sort((x, y) => x.delta - y.delta)[0];
  const label = (k: keyof typeof CONCERN_INFO) => CONCERN_INFO[k].label.toLowerCase();

  if (a.verdict === "acquitted") {
    return {
      headline: `${name} walks free: the glow is real`,
      ruling: `Across ${a.scanCount} scans and ${a.daysOnTrial} days, the claimed concerns improved by ${a.claimedDelta} points on average${best ? `, led by ${label(best.concern)} (${best.baseline} → ${best.latest})` : ""}. The court finds the defendant did what it promised.`,
      sentence: [
        "Keep using it exactly as you have been.",
        "Re-scan every 2 weeks so the court can tell if results plateau.",
        "Don't add a new active ingredient right now, or you won't know what's working.",
      ],
      quip: "Case dismissed. Skin, you're glowing.",
      author: "clerk",
    };
  }
  if (a.verdict === "guilty") {
    const irritation = a.charges.find((ch) => ch.title === "Aggravated Irritation");
    return {
      headline: irritation ? `${name} convicted of irritating conduct` : `${name} guilty of empty promises`,
      ruling: irritation
        ? `${irritation.detail} With ${a.scanCount} scans over ${a.daysOnTrial} days, the court cannot ignore this.${a.objections.length ? " The court notes the defense's objections but finds the trend too clear." : ""}`
        : `After ${a.daysOnTrial} days, the claimed concerns moved only ${a.claimedDelta} points on average. ${worst ? `Meanwhile ${label(worst.concern)} went ${worst.baseline} → ${worst.latest}.` : ""}`,
      sentence: irritation
        ? [
            "Stop using it and let your skin settle for 1-2 weeks.",
            "Patch-test on your jaw before ever trying it again.",
            "If irritation lasts more than a week, see a dermatologist.",
          ]
        : [
            "Stop paying for it: it had a fair trial.",
            "Look for a product with a different active ingredient for the same goal.",
            "Open a new case when you start the replacement.",
          ],
      quip: "Off to product jail. No parole.",
      author: "clerk",
    };
  }
  return {
    headline: `Case continued: ${name} needs more time`,
    ruling:
      a.scanCount < 2
        ? "The court has the baseline scan but needs at least one follow-up before ruling."
        : `After ${a.daysOnTrial} days the evidence is inconclusive (average change on claims: ${a.claimedDelta}). Most products need several weeks before a fair verdict.`,
    sentence: [
      `Come back for another scan in ${a.nextHearingInDays ?? 5} days.`,
      "Scan in the same spot with the same lighting each time.",
      "Log anything else that changed (sleep, stress, new products) as a witness statement.",
    ],
    quip: "The jury is still out, and so is the moisturizer.",
    author: "clerk",
  };
}
