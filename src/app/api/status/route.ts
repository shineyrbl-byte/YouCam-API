import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    youcam: Boolean(process.env.YOUCAM_API_KEY) && process.env.DEMO_MODE !== "1",
    judge: Boolean(process.env.ANTHROPIC_API_KEY),
  });
}
