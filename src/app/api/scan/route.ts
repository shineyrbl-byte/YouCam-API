import { NextResponse } from "next/server";
import { hashBytes, simulateScores } from "@/lib/demo";
import { clientIp, refundScan, takeScan } from "@/lib/limit";
import { CONCERNS, type Concern, type Scores } from "@/lib/types";
import { analyzeSkin, hasYouCamKey, YouCamError } from "@/lib/youcam";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  const form = await req.formData();
  const image = form.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json({ error: "Attach a photo to submit as evidence." }, { status: 400 });
  }
  if (image.size > MAX_BYTES) {
    return NextResponse.json({ error: "Photo is over 10MB." }, { status: 400 });
  }
  if (!["image/jpeg", "image/png"].includes(image.type)) {
    return NextResponse.json({ error: "Use a JPG or PNG photo." }, { status: 400 });
  }

  const bytes = new Uint8Array(await image.arrayBuffer());

  const ip = clientIp(req);
  const live = hasYouCamKey() && process.env.DEMO_MODE !== "1";
  const limited = live && !takeScan(ip);

  if (!live || limited) {
    const claims = parseJSON<Concern[]>(form.get("claims"), []).filter((c) => CONCERNS.includes(c));
    const previous = parseJSON<Scores | undefined>(form.get("previous"), undefined);
    const scores = simulateScores(hashBytes(bytes) ^ Date.now(), previous, claims);
    return NextResponse.json({ scores, maskUrls: {}, source: "simulated", limited });
  }

  try {
    const { scores, maskUrls } = await analyzeSkin(bytes, image.type);
    return NextResponse.json({ scores, maskUrls, source: "youcam" });
  } catch (err) {
    refundScan(ip);
    if (err instanceof YouCamError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 422 });
    }
    console.error(err);
    return NextResponse.json({ error: "Skin scan failed. Try again." }, { status: 500 });
  }
}

function parseJSON<T>(value: FormDataEntryValue | null, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
