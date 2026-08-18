import { NextResponse } from "next/server";

import { normaliseScope, previewCount } from "@/lib/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Backs the composer's live "N papers in scope" readout. */
export async function POST(req: Request) {
  try {
    const scope = normaliseScope((await req.json()) ?? {});
    if (!scope.query.trim() && !scope.languages.length && !scope.tasks.length) {
      return NextResponse.json({ count: 0, interpreted: [] });
    }
    return NextResponse.json(previewCount(scope));
  } catch {
    return NextResponse.json({ count: 0, interpreted: [] });
  }
}
