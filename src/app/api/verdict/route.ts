import { NextResponse } from "next/server";
import { deliverRuling } from "@/lib/judge";
import type { Case } from "@/lib/types";
import { analyzeCase } from "@/lib/verdict";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const c = (await req.json().catch(() => null)) as Case | null;
  if (!c || !Array.isArray(c.evidence) || !Array.isArray(c.claims)) {
    return NextResponse.json({ error: "Invalid case file." }, { status: 400 });
  }
  const analysis = analyzeCase(c);
  const ruling = await deliverRuling(c, analysis);
  return NextResponse.json({ analysis, ruling });
}
