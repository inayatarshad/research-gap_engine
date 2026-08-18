import { NextResponse } from "next/server";

import { getCorpus } from "@/lib/engine";
import { LANG_BY_CODE, TASK_BY_ID, METHOD_BY_ID } from "@/lib/taxonomy";
import type { Paper } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resolves any statistic shown in the UI back to the papers that produced it.
 * This is the anti-hallucination contract: no number is rendered anywhere
 * without a path back to its evidence.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) ?? {};
    const languages: string[] = body.languages ?? [];
    const tasks: string[] = body.tasks ?? [];
    const datasets: string[] = body.datasets ?? [];
    const methods: string[] = body.methods ?? [];
    const venues: string[] = body.venues ?? [];
    const years: number[] | undefined = body.years;

    const match = (p: Paper) =>
      (!languages.length || p.languages.some((l) => languages.includes(l))) &&
      (!tasks.length || p.tasks.some((t) => tasks.includes(t))) &&
      (!datasets.length || p.datasets.some((d) => datasets.includes(d))) &&
      (!methods.length || p.methods.some((m) => methods.includes(m))) &&
      (!venues.length || venues.includes(p.venue)) &&
      (!years?.length || years.includes(p.year));

    const all = getCorpus().papers.filter(match);
    const papers = [...all]
      .sort((a, b) => b.prominence - a.prominence || b.year - a.year)
      .slice(0, 80);

    const label = [
      ...languages.map((l) => LANG_BY_CODE.get(l)?.name ?? l),
      ...tasks.map((t) => TASK_BY_ID.get(t)?.name ?? t),
      ...methods.map((m) => METHOD_BY_ID.get(m)?.name ?? m),
      ...datasets,
      ...venues,
    ].join(" · ");

    return NextResponse.json({ total: all.length, papers, label });
  } catch {
    return NextResponse.json({ total: 0, papers: [], label: "" }, { status: 500 });
  }
}
