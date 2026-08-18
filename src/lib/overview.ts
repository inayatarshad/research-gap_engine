import "server-only";

import { getCorpus } from "./engine";
import { LANG_BY_CODE, TASK_BY_ID } from "./taxonomy";
import type { ResourceTier } from "./taxonomy";

/**
 * Corpus-level figures for the landing page.
 *
 * The landing page argues the product's premise by showing the actual data
 * rather than describing it, so every number here is computed from the real
 * corpus at server render time and cached for the life of the instance.
 */

export interface OverviewLanguage {
  code: string;
  name: string;
  tier: ResourceTier;
  papers: number;
  speakersM: number;
  /** Millions of speakers carried per indexed paper. */
  ratio: number;
}

export interface OverviewMatrix {
  languages: { code: string; name: string; tier: ResourceTier }[];
  tasks: { id: string; name: string; short: string }[];
  /** Row-major counts, languages x tasks. */
  cells: number[][];
  scale: number;
}

export interface Overview {
  papers: number;
  languages: number;
  tasks: number;
  venues: number;
  yearFrom: number;
  yearTo: number;
  recentPapers: number;
  /** Papers that study only tier 4-5 languages, as a share of tagged papers. */
  highResourceShare: number;
  topLanguages: OverviewLanguage[];
  underServed: OverviewLanguage[];
  matrix: OverviewMatrix;
  yearCurve: { year: number; count: number }[];
  voids: number;
  totalCells: number;
}

/** Rows chosen to make the coverage gradient legible in a single glance. */
const DEMO_LANGS = ["en", "zh", "ar", "hi", "bn", "ur", "sw", "am", "yo", "sd"];
const DEMO_TASKS: [string, string][] = [
  ["mt", "Translation"],
  ["ner", "NER"],
  ["sentiment", "Sentiment"],
  ["toxicity", "Toxicity"],
  ["qa", "QA"],
  ["asr", "Speech"],
  ["summarization", "Summarisation"],
  ["dialogue", "Dialogue"],
];

let cache: Overview | null = null;

export function getOverview(): Overview {
  if (cache) return cache;

  const { meta, papers } = getCorpus();

  const langCounts = new Map<string, number>();
  const pairCounts = new Map<string, number>();
  const yearCounts = new Map<string, number>();
  let highResourceOnly = 0;
  let tagged = 0;

  for (const p of papers) {
    yearCounts.set(String(p.year), (yearCounts.get(String(p.year)) ?? 0) + 1);
    for (const l of p.languages) {
      langCounts.set(l, (langCounts.get(l) ?? 0) + 1);
      for (const t of p.tasks) {
        const k = `${l}|${t}`;
        pairCounts.set(k, (pairCounts.get(k) ?? 0) + 1);
      }
    }
    if (p.languages.length) {
      tagged++;
      if (p.languages.every((l) => (LANG_BY_CODE.get(l)?.tier ?? 0) >= 4)) highResourceOnly++;
    }
  }

  const toLang = (code: string): OverviewLanguage | null => {
    const l = LANG_BY_CODE.get(code);
    if (!l) return null;
    const n = langCounts.get(code) ?? 0;
    return {
      code,
      name: l.name,
      tier: l.tier,
      papers: n,
      speakersM: l.speakersM,
      ratio: l.speakersM / Math.max(1, n),
    };
  };

  const topLanguages = [...langCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 9)
    .map(([c]) => toLang(c))
    .filter((x): x is OverviewLanguage => Boolean(x));

  // Languages carrying the most speakers per paper: the inequality headline.
  const underServed = [...LANG_BY_CODE.values()]
    .filter((l) => l.tier <= 2 && l.speakersM >= 15)
    .map((l) => toLang(l.code))
    .filter((x): x is OverviewLanguage => Boolean(x))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 7);

  const matrixLangs = DEMO_LANGS.map((c) => {
    const l = LANG_BY_CODE.get(c);
    return l ? { code: l.code, name: l.name, tier: l.tier } : null;
  }).filter((x): x is { code: string; name: string; tier: ResourceTier } => Boolean(x));

  const matrixTasks = DEMO_TASKS.map(([id, short]) => ({
    id,
    name: TASK_BY_ID.get(id)?.name ?? id,
    short,
  }));

  const cells = matrixLangs.map((l) =>
    matrixTasks.map((t) => pairCounts.get(`${l.code}|${t.id}`) ?? 0),
  );
  const flat = cells.flat();
  const nonZero = flat.filter((n) => n > 0).sort((a, b) => a - b);
  const scale = nonZero[Math.floor(nonZero.length * 0.8)] || 1;

  const yearCurve = [];
  for (let y = 2012; y <= meta.yearRange[1]; y++) {
    yearCurve.push({ year: y, count: yearCounts.get(String(y)) ?? 0 });
  }

  cache = {
    papers: meta.paperCount,
    languages: meta.languagesCovered,
    tasks: meta.tasksCovered,
    venues: (meta as { venueCount?: number }).venueCount ?? 0,
    yearFrom: meta.yearRange[0],
    yearTo: meta.yearRange[1],
    recentPapers: papers.filter((p) => p.year >= 2024).length,
    highResourceShare: tagged ? highResourceOnly / tagged : 0,
    topLanguages,
    underServed,
    matrix: { languages: matrixLangs, tasks: matrixTasks, cells, scale },
    yearCurve,
    voids: flat.filter((n) => n === 0).length,
    totalCells: flat.length,
  };
  return cache;
}
