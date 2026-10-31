import { CONCERN_INFO } from "./claims";
import type { Analysis, Case, Concern, ConcernFinding, Ruling } from "./types";

// Rule-based ruling writer. Used when no LLM key is configured (the default), so it has to
// read like a real ruling: specific numbers, concern-aware advice, and some variety.

const label = (k: Concern) => CONCERN_INFO[k].label.toLowerCase();

// Same case + same evidence => same wording; new evidence => fresh wording.
function picker(c: Case, a: Analysis) {
  let h = a.scanCount * 7919;
  for (const ch of c.id + c.productName) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return <T,>(options: T[]) => options[h++ % options.length];
}

const fmt = (f: ConcernFinding) => `${label(f.concern)} ${f.baseline} → ${f.latest} (${f.delta > 0 ? "+" : ""}${f.delta})`;

// Advice keyed by concern, for "keep using it" and "it hurt you" situations.
const KEEP_TIPS: Partial<Record<Concern, string>> = {
  moisture: "Apply it on slightly damp skin to lock in even more hydration.",
  radiance: "Pair it with daily SPF so the glow doesn't fade into sun damage.",
  acne: "Don't stack another acne active on top. More isn't better here.",
  texture: "Keep exfoliation to 2-3 nights a week so you don't undo the progress.",
  pore: "Keep up with gentle cleansing. Clogged pores will hide the gains.",
  oiliness: "Don't overcorrect with harsh cleansers. Your skin is balancing.",
  redness: "Keep your routine simple while your skin stays calm.",
  wrinkle: "Fine lines change slowly, so keep going and re-check monthly.",
};

const HARM_TIPS: Partial<Record<Concern, string>> = {
  redness: "Switch to a fragrance-free, minimal routine (gentle cleanser + plain moisturizer) until redness settles.",
  acne: "Check the label for heavy oils or comedogenic ingredients. That's a likely culprit for new breakouts.",
  moisture: "Your skin is drying out. Add a barrier-repair moisturizer with ceramides.",
  texture: "Rough texture after a new product often means over-exfoliation. Give your skin a break.",
  oiliness: "Rebound oiliness can mean your skin is stripped. Try a gentler cleanser.",
};

export function clerkRuling(c: Case, a: Analysis): Ruling {
  const pick = picker(c, a);
  const name = c.productName;
  const claimed = a.findings.filter((f) => f.claimed).sort((x, y) => y.delta - x.delta);
  const best = claimed[0];
  const worst = [...a.findings].sort((x, y) => x.delta - y.delta)[0];
  const objection = a.objections.length
    ? ` The defense raised ${a.objections.length === 1 ? "an objection" : "objections"} (${a.objections.join("; ")}), which the court has weighed.`
    : "";

  if (a.verdict === "acquitted") {
    const sideEffect = a.charges.find((ch) => ch.severity === "minor");
    return {
      headline: pick([
        `${name} walks free: the glow is real`,
        `Not guilty! ${name} kept its promise`,
        `${name} acquitted on all counts`,
        `The evidence is clear: ${name} works`,
      ]),
      ruling:
        `Over ${a.daysOnTrial} days and ${a.scanCount} scans, the claimed concerns improved by ${a.claimedDelta} points on average` +
        (best ? `, led by ${fmt(best)}` : "") +
        `${claimed.length > 1 ? `, with ${claimed.slice(1).map(fmt).join(" and ")}` : ""}.` +
        (sideEffect ? ` One minor note for the record: ${sideEffect.detail.toLowerCase()}` : " No side effects showed up in the other concerns.") +
        objection,
      sentence: [
        "Keep using it exactly as you have been.",
        (best && KEEP_TIPS[best.concern]) || "Keep your routine steady so the results stay measurable.",
        "Re-scan every 2 weeks so the court can tell if results plateau.",
      ],
      quip: pick([
        "Case dismissed. Skin, you're glowing.",
        "The defendant may return to the shelf.",
        "Justice is served. So is the glow-up.",
        "Not guilty. Totally gorgeous.",
      ]),
      author: "clerk",
    };
  }

  if (a.verdict === "guilty") {
    const irritation = a.charges.find((ch) => ch.title === "Aggravated Irritation" || ch.title === "Breach of Promise");
    if (irritation) {
      return {
        headline: pick([
          `${name} convicted of irritating conduct`,
          `Guilty: ${name} turned on your skin`,
          `${name} caught red-handed`,
          `${name} sentenced for skin sabotage`,
        ]),
        ruling:
          `${irritation.detail} Across ${a.scanCount} scans and ${a.daysOnTrial} days, ${fmt(worst)} is the clearest evidence. ` +
          (best && best.delta > 0 ? `It did help ${label(best.concern)} (+${best.delta}), but that doesn't excuse the damage.` : "It didn't deliver on its claims either.") +
          objection,
        sentence: [
          "Stop using it and let your skin settle for 1-2 weeks before trying anything new.",
          HARM_TIPS[worst.concern] ?? "Go back to a simple routine you know your skin tolerates.",
          "Patch-test on your jawline before giving it a second chance.",
          "If irritation lasts more than a week, see a dermatologist.",
        ],
        quip: pick([
          "Off to product jail. No parole.",
          "The court finds you guilty of crimes against complexion.",
          "Lock it up and throw away the pump.",
          "Your skin pleads the fifth. The scans did the talking.",
        ]),
        author: "clerk",
      };
    }
    return {
      headline: pick([
        `${name} guilty of empty promises`,
        `Convicted: ${name} did absolutely nothing`,
        `${name} found guilty of false advertising`,
      ]),
      ruling:
        `${name} had ${a.daysOnTrial} days, longer than its claims need, and the claimed concerns moved only ${a.claimedDelta} points on average` +
        (claimed.length ? ` (${claimed.map(fmt).join(", ")})` : "") +
        `. That's within normal scan-to-scan noise. In plain terms: it isn't doing anything for you.` +
        objection,
      sentence: [
        c.price ? `Stop buying it. That's $${c.price} back in your pocket next time.` : "Stop buying it.",
        "Look for a product with a different active ingredient for the same goal.",
        "Open a new case when you start the replacement, and take the baseline first.",
      ],
      quip: pick([
        "All talk, no glow. Guilty.",
        "Off to product jail for impersonating skincare.",
        "Nice packaging. Shame about the results.",
      ]),
      author: "clerk",
    };
  }

  const pending = claimed.filter((f) => a.daysOnTrial < f.expectedDays);
  return {
    headline: pick([
      `Case continued: ${name} needs more time`,
      `The jury is still out on ${name}`,
      `${name} granted an extension`,
    ]),
    ruling:
      a.scanCount < 2
        ? "The court has the baseline scan on file but needs at least one follow-up before it can rule."
        : `After ${a.daysOnTrial} days, the claimed concerns have moved ${a.claimedDelta} points on average` +
          (best ? ` (best so far: ${fmt(best)})` : "") +
          `. ` +
          (pending.length
            ? `${pending.map((f) => `${CONCERN_INFO[f.concern].claim} usually takes ~${f.expectedDays} days`).join("; ")}, so it's too early to convict or acquit.`
            : "The trend isn't clear enough yet to rule either way.") +
          objection,
    sentence: [
      `Come back for another scan in ${a.nextHearingInDays ?? 5} days.`,
      "Scan in the same spot with the same lighting each time, so the evidence is comparable.",
      "Don't start any other new product until the verdict is in, or the case gets muddy.",
    ],
    quip: pick([
      "The jury is still out, and so is the moisturizer.",
      "Court adjourned. Same face, same place, next week.",
      "Patience, counselor. Skin takes time.",
    ]),
    author: "clerk",
  };
}
