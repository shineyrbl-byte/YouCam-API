import { CONCERN_INFO } from "./claims";
import type { Analysis, Case, Ruling } from "./types";

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
