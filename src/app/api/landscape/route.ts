import { NextResponse } from "next/server";

import { normaliseScope, runLandscape } from "@/lib/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const scope = normaliseScope(body ?? {});
    if (!scope.query.trim() && scope.languages.length === 0 && scope.tasks.length === 0) {
      return NextResponse.json({ error: "Describe an area, or pick a language or task." }, { status: 400 });
    }
    const started = Date.now();
    const landscape = runLandscape(scope);
    return NextResponse.json({ landscape, elapsedMs: Date.now() - started });
  } catch (err) {
    console.error("[landscape]", err);
    return NextResponse.json({ error: "Analysis failed. Try a narrower scope." }, { status: 500 });
  }
}
