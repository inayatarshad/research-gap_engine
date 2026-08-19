/**
 * The gap engine.
 *
 * Turns a retrieved cohort of papers into a research landscape: themes, facets,
 * a language x task coverage matrix, a ranked set of scored gaps, and a
 * narrative built from those numbers.
 *
 * Design rule followed throughout: nothing is asserted that cannot be traced to
 * a count over the corpus. Every claim the UI renders carries the filter needed
 * to pull up the papers behind it.
 */

import {
  LANGUAGES,
  TASKS,
  METHODS,
  LANG_BY_CODE,
  TASK_BY_ID,
  METHOD_BY_ID,
  TIER_LABEL,
} from "./taxonomy";
import type { LanguageEntry, ResourceTier } from "./taxonomy";
import { tokenize } from "./retrieval";
import type {
  CellState,
  Corpus,
  DatasetConcentration,
  FacetItem,
  Gap,
  GapComponent,
  GapKind,
  Landscape,
  MatrixCell,
  Paper,
  ResearchQuestion,
  ScoredPaper,
  Scope,
  Theme,
  TimelinePoint,
} from "./types";

const NOW = 2026;
const RECENT_FROM = NOW - 4; // "recent" = last five publication years

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function momentumOf(papers: Paper[]): number {
  const recent = papers.filter((p) => p.year >= NOW - 2).length;
  const prior = papers.filter((p) => p.year >= NOW - 5 && p.year < NOW - 2).length;
  if (prior === 0) return recent > 0 ? 2 : 0;
  return recent / prior;
}

function tally<T>(items: T[]): Map<T, number> {
  const m = new Map<T, number>();
  for (const i of items) m.set(i, (m.get(i) ?? 0) + 1);
  return m;
}

/* ------------------------------------------------------------------ *
 * Facets
 * ------------------------------------------------------------------ */

function facet(
  papers: Paper[],
  pick: (p: Paper) => string[],
  label: (id: string) => string,
  meta?: (id: string) => Record<string, string | number>,
  limit = 24,
): FacetItem[] {
  const groups = new Map<string, Paper[]>();
  for (const p of papers) {
    for (const id of pick(p)) {
      let g = groups.get(id);
      if (!g) groups.set(id, (g = []));
      g.push(p);
    }
  }
  const total = papers.length || 1;
  return [...groups.entries()]
    .map(([id, ps]) => ({
      id,
      label: label(id),
      count: ps.length,
      share: ps.length / total,
      momentum: momentumOf(ps),
      meta: meta?.(id),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/* ------------------------------------------------------------------ *
 * Themes: distinctive terms via log-odds against the whole corpus
 * ------------------------------------------------------------------ */

function distinctiveTerms(
  cohort: Paper[],
  corpusFreq: Map<string, number>,
  corpusTotal: number,
  limit = 6,
): string[] {
  const local = new Map<string, number>();
  let localTotal = 0;
  for (const p of cohort) {
    for (const t of new Set(tokenize(`${p.title} ${p.abstract}`))) {
      local.set(t, (local.get(t) ?? 0) + 1);
      localTotal++;
    }
  }
  const scored: { term: string; z: number }[] = [];
  for (const [term, count] of local) {
    if (count < Math.max(3, cohort.length * 0.06)) continue;
    const a = count + 0.5;
    const b = (corpusFreq.get(term) ?? 0) + 0.5;
    // Log-odds ratio with an informative Dirichlet prior (Monroe et al. 2008).
    const lo = Math.log(a / (localTotal - a)) - Math.log(b / (corpusTotal - b));
    const variance = 1 / a + 1 / b;
    scored.push({ term, z: lo / Math.sqrt(variance) });
  }
  return scored
    .sort((x, y) => y.z - x.z)
    .slice(0, limit)
    .map((s) => s.term);
}

function trendOf(momentum: number, count: number): Theme["trend"] {
  if (count < 4) return "dormant";
  if (momentum >= 1.8) return "surging";
  if (momentum >= 1.15) return "growing";
  if (momentum >= 0.75) return "steady";
  return "cooling";
}

function buildThemes(
  cohort: Paper[],
  corpusFreq: Map<string, number>,
  corpusTotal: number,
): Theme[] {
  const byTask = new Map<string, Paper[]>();
  for (const p of cohort) {
    for (const t of p.tasks) {
      let g = byTask.get(t);
      if (!g) byTask.set(t, (g = []));
      g.push(p);
    }
  }
  const total = cohort.length || 1;
  return [...byTask.entries()]
    .filter(([, ps]) => ps.length >= 3)
    .map(([id, ps]) => {
      const m = momentumOf(ps);
      return {
        id,
        label: TASK_BY_ID.get(id)?.name ?? id,
        count: ps.length,
        share: ps.length / total,
        momentum: m,
        distinctiveTerms: distinctiveTerms(ps, corpusFreq, corpusTotal),
        topPapers: [...ps]
          .sort((a, b) => b.citations - a.citations || b.year - a.year)
          .slice(0, 3)
          .map((p) => ({ id: p.id, title: p.title, year: p.year, citations: p.citations })),
        trend: trendOf(m, ps.length),
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

/* ------------------------------------------------------------------ *
 * Coverage matrix
 * ------------------------------------------------------------------ */

/**
 * Cell shading is scaled against the 85th percentile of non-empty cells rather
 * than the maximum. One dominant English cell would otherwise flatten the whole
 * matrix into a single shade and hide exactly the variation that matters.
 */
function stateFor(count: number, scale: number): CellState {
  if (count === 0) return "void";
  if (count <= 2) return "thin";
  if (count <= Math.max(5, scale * 0.25)) return "emerging";
  if (count <= Math.max(12, scale * 0.7)) return "active";
  return "saturated";
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

/**
 * Languages comparable enough that "they solved it, we didn't" is a fair
 * argument: weighted by how plausibly a method actually transfers.
 *
 * Shared script matters most in practice (tokenisation, orthography, encoding
 * all carry over); shared family carries morphology. "Indo-European" alone is
 * far too coarse to justify the claim on its own, which is why a family-only
 * match is discounted rather than counted at full weight.
 */
export interface Peer {
  lang: LanguageEntry;
  proximity: number;
}

function peersOf(lang: LanguageEntry): Peer[] {
  const out: Peer[] = [];
  for (const l of LANGUAGES) {
    if (l.code === lang.code) continue;
    if (Math.abs(l.tier - lang.tier) > 2) continue;
    const sameFamily = l.family === lang.family;
    const sameScript = l.script === lang.script;
    if (!sameFamily && !sameScript) continue;
    const proximity = sameFamily && sameScript ? 1 : sameScript ? 0.75 : 0.5;
    out.push({ lang: l, proximity });
  }
  return out.sort((a, b) => b.proximity - a.proximity);
}

interface CoverageIndex {
  /** `${langCode}|${taskId}` -> papers in the full corpus. */
  pair: Map<string, Paper[]>;
  byLang: Map<string, Paper[]>;
  byTask: Map<string, Paper[]>;
}

function buildCoverage(papers: Paper[]): CoverageIndex {
  const pair = new Map<string, Paper[]>();
  const byLang = new Map<string, Paper[]>();
  const byTask = new Map<string, Paper[]>();
  const push = (m: Map<string, Paper[]>, k: string, p: Paper) => {
    let g = m.get(k);
    if (!g) m.set(k, (g = []));
    g.push(p);
  };
  for (const p of papers) {
    for (const l of p.languages) push(byLang, l, p);
    for (const t of p.tasks) push(byTask, t, p);
    for (const l of p.languages) for (const t of p.tasks) push(pair, `${l}|${t}`, p);
  }
  return { pair, byLang, byTask };
}

/* ------------------------------------------------------------------ *
 * Gap scoring
 * ------------------------------------------------------------------ */

const WEIGHTS = {
  scarcity: 30,
  peer: 26,
  momentum: 16,
  impact: 18,
  feasibility: 10,
} as const;

/** Infrastructure tasks: if these exist for a language, other work is tractable. */
const FOUNDATION_TASKS = ["corpus", "lm", "embeddings", "translit", "morphology"];

function scoreGap(
  lang: LanguageEntry,
  taskId: string,
  cov: CoverageIndex,
  taskMomentum: number,
  taskGlobalCount: number,
): { score: number; components: GapComponent[]; peerCount: number; peerExamples: { langName: string; count: number }[] } {
  const own = cov.pair.get(`${lang.code}|${taskId}`)?.length ?? 0;
  const taskName = TASK_BY_ID.get(taskId)?.name ?? taskId;

  // 1. Scarcity: how little exists here, saturating around a dozen papers.
  const scarcity = clamp01(1 - Math.log1p(own) / Math.log1p(14));

  // 2. Peer evidence: the discriminator between "a gap" and "a non-problem".
  //    Counts are weighted by transfer plausibility, so ten papers in a closely
  //    related language count for more than ten in a distant cousin.
  const peers = peersOf(lang);
  const peerCounts = peers
    .map((p) => ({
      langName: p.lang.name,
      count: cov.pair.get(`${p.lang.code}|${taskId}`)?.length ?? 0,
      proximity: p.proximity,
    }))
    .filter((p) => p.count > 0)
    .sort((a, b) => b.proximity - a.proximity || b.count - a.count);
  const peerCount = peerCounts.reduce((a, b) => a + b.count, 0);
  const weightedPeer = peerCounts.reduce((a, b) => a + b.count * b.proximity, 0);
  const peer = clamp01(Math.log1p(weightedPeer) / Math.log1p(40));

  // 3. Momentum: an absent task that the field is actively pushing on is urgent.
  const momentum = clamp01((taskMomentum - 0.5) / 1.8);

  // 4. Impact: many speakers, few resources.
  const speakerTerm = clamp01(Math.log1p(lang.speakersM) / Math.log1p(300));
  const tierTerm = (5 - lang.tier) / 5;
  const impact = clamp01(0.45 * speakerTerm + 0.55 * tierTerm);

  // 5. Feasibility: is there any groundwork to build on?
  const foundation = FOUNDATION_TASKS.reduce(
    (a, t) => a + (cov.pair.get(`${lang.code}|${t}`)?.length ?? 0),
    0,
  );
  const anyWork = cov.byLang.get(lang.code)?.length ?? 0;
  const feasibility = clamp01(0.6 * clamp01(Math.log1p(foundation) / Math.log1p(10)) +
    0.4 * clamp01(Math.log1p(anyWork) / Math.log1p(40)));

  const components: GapComponent[] = [
    {
      key: "scarcity",
      label: "Scarcity",
      raw: scarcity,
      points: scarcity * WEIGHTS.scarcity,
      explanation:
        own === 0
          ? `No paper in this index is tagged with both ${lang.name} and ${taskName}.`
          : `Only ${own} indexed paper${own === 1 ? "" : "s"} address ${taskName} for ${lang.name}.`,
    },
    {
      key: "peer",
      label: "Peer evidence",
      raw: peer,
      points: peer * WEIGHTS.peer,
      explanation:
        peerCount > 0
          ? `${peerCount} papers tackle ${taskName} in related languages (${peerCounts
              .slice(0, 3)
              .map((p) => `${p.langName} ${p.count}`)
              .join(", ")}), so the task is known to be worth doing and the methods transfer.`
          : `No comparable language has attempted ${taskName} either, this is unexplored territory rather than an obvious omission.`,
    },
    {
      key: "momentum",
      label: "Field momentum",
      raw: momentum,
      points: momentum * WEIGHTS.momentum,
      explanation:
        taskMomentum >= 1.2
          ? `${taskName} is growing across the field (${taskMomentum.toFixed(2)}x over the last three years, ${taskGlobalCount} papers total).`
          : `${taskName} activity is flat or declining field-wide (${taskMomentum.toFixed(2)}x), so the window is less urgent.`,
    },
    {
      key: "impact",
      label: "Speaker impact",
      raw: impact,
      points: impact * WEIGHTS.impact,
      explanation: `${lang.name} has roughly ${lang.speakersM}M speakers and sits at resource tier ${lang.tier} (${TIER_LABEL[lang.tier]}).`,
    },
    {
      key: "feasibility",
      label: "Feasibility",
      raw: feasibility,
      points: feasibility * WEIGHTS.feasibility,
      explanation:
        foundation > 0
          ? `${foundation} foundational papers (corpora, language models, normalisation) exist for ${lang.name} to build on.`
          : `Almost no foundational resources exist for ${lang.name}; groundwork would have to come first.`,
    },
  ];

  const score = components.reduce((a, c) => a + c.points, 0);
  return { score, components, peerCount, peerExamples: peerCounts.slice(0, 4) };
}

/* ------------------------------------------------------------------ *
 * Research questions
 * ------------------------------------------------------------------ */

function questionsFor(
  kind: GapKind,
  lang: LanguageEntry,
  taskName: string,
  peer: { langName: string; count: number }[],
  dominantDataset: string | null,
  cohortEra: string,
  fieldEra: string,
): ResearchQuestion[] {
  const peerName = peer[0]?.langName ?? "a higher-resource relative";
  const qs: ResearchQuestion[] = [];

  if (kind === "untouched" || kind === "thin-evidence") {
    qs.push({
      text: `How far does zero-shot cross-lingual transfer from ${peerName} carry ${taskName} in ${lang.name}, and what error classes remain?`,
      rationale: `${peer[0]?.count ?? 0} ${peerName} papers establish the task; ${lang.name} shares script or family, so transfer is the cheapest credible baseline and the residual errors define the real research problem.`,
      difficulty: "Starter",
      shape: "A focused empirical paper: an existing multilingual model, a small evaluation set, a careful error taxonomy.",
    });
    qs.push({
      text: `What does a first annotated ${taskName} dataset for ${lang.name} need to contain for annotators to reach acceptable agreement?`,
      rationale: `Without a reference set no ${lang.name} ${taskName} claim is falsifiable. Annotation guideline design is itself publishable when the language raises phenomena the source guidelines never anticipated.`,
      difficulty: "Substantial",
      shape: "A resource paper: guidelines, inter-annotator agreement, a baseline, a public release.",
    });
  }

  if (kind === "single-dataset" && dominantDataset) {
    qs.push({
      text: `Do ${lang.name} ${taskName} results hold outside ${dominantDataset}, or is reported performance an artefact of one corpus?`,
      rationale: `Work in this area concentrates on ${dominantDataset}. Cross-dataset evaluation routinely halves the scores reported on a single benchmark, and demonstrating that is a contribution in itself.`,
      difficulty: "Starter",
      shape: "A replication-and-generalisation study across two or three sources.",
    });
  }

  if (kind === "method-lag") {
    qs.push({
      text: `What is actually gained by moving ${lang.name} ${taskName} from ${cohortEra}-era methods to ${fieldEra}-era ones, and where does the gain disappear?`,
      rationale: `The wider field has moved to ${fieldEra} while this pairing is still reported with ${cohortEra} methods. Quantifying the delta: including where newer methods fail on this language's morphology or script: is a clean contribution.`,
      difficulty: "Starter",
      shape: "A controlled comparison with matched data and honest ablations.",
    });
  }

  if (kind === "evaluation-void") {
    qs.push({
      text: `What would a trustworthy evaluation benchmark for ${lang.name} ${taskName} look like, given the absence of any shared test set?`,
      rationale: `Results in this area are not comparable across papers because there is no common test set. A benchmark plus a leaderboard is the highest-leverage intervention available.`,
      difficulty: "Ambitious",
      shape: "A benchmark and shared-task proposal: high citation ceiling, high coordination cost.",
    });
  }

  if (kind === "cooling") {
    qs.push({
      text: `Why did ${lang.name} ${taskName} activity stall, and do modern methods dissolve the obstacle that stopped it?`,
      rationale: `Work here peaked and then declined. Dormancy usually signals either a solved problem or a blocked one; distinguishing the two is quick to establish and valuable to the field.`,
      difficulty: "Starter",
      shape: "A short position or survey paper with a reproduction of the last strong baseline.",
    });
  }

  qs.push({
    text: `Which ${lang.name}-specific linguistic properties, script, morphology, orthographic variation, do current ${taskName} models systematically mishandle?`,
    rationale: `Language-specific error analysis is consistently under-supplied relative to demand, transfers directly into dataset and model design, and does not require large compute.`,
    difficulty: "Substantial",
    shape: "A diagnostic study with a hand-built challenge set.",
  });

  return qs.slice(0, 4);
}

/* ------------------------------------------------------------------ *
 * Dataset concentration
 * ------------------------------------------------------------------ */

function concentrationOf(papers: Paper[]): DatasetConcentration {
  const counts = tally(papers.flatMap((p) => [...new Set(p.datasets)]));
  const withDataset = papers.filter((p) => p.datasets.length > 0).length;
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  if (total === 0) {
    return {
      hhi: 0,
      verdict: "No named datasets could be extracted: a signal in itself that resources here are informal or unpublished.",
      topShare: 0,
      topName: null,
      distinctDatasets: 0,
      papersWithDataset: 0,
    };
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const hhi = sorted.reduce((a, [, c]) => a + (c / total) ** 2, 0);
  const topShare = sorted[0][1] / total;
  const coverage = papers.length ? withDataset / papers.length : 0;

  let verdict: string;
  if (hhi >= 0.25)
    verdict = `Highly concentrated. ${(topShare * 100).toFixed(0)}% of dataset mentions point at ${sorted[0][0]}, so published results largely describe one resource rather than the language.`;
  else if (hhi >= 0.15)
    verdict = `Moderately concentrated around ${sorted[0][0]}. Cross-dataset generalisation is under-tested.`;
  else
    verdict = `Spread across ${sorted.length} named resources, so findings are less likely to be single-corpus artefacts.`;

  // A low HHI computed over a handful of papers is not evidence of a healthy
  // ecosystem: it usually means most papers never name a shared resource at
  // all, which is the more important thing to say.
  if (coverage < 0.4) {
    verdict += ` But only ${Math.round(coverage * 100)}% of papers here name a resource at all, so the index rests on a thin base, the more telling signal is how much work in this area is not anchored to any citable dataset.`;
  }

  return {
    hhi,
    verdict,
    topShare,
    topName: sorted[0][0],
    distinctDatasets: sorted.length,
    papersWithDataset: withDataset,
  };
}

/* ------------------------------------------------------------------ *
 * Method lag
 * ------------------------------------------------------------------ */

const ERA_ORDER = ["Rule-based", "Statistical", "Neural", "Transformer", "LLM"];

function medianEra(papers: Paper[]): { era: string; year: number } {
  const years: number[] = [];
  const eras: string[] = [];
  for (const p of papers) {
    for (const m of p.methods) {
      const entry = METHOD_BY_ID.get(m);
      if (entry) {
        years.push(entry.since);
        eras.push(entry.era);
      }
    }
  }
  if (years.length === 0) return { era: "Unclassified", year: 0 };
  years.sort((a, b) => a - b);
  const medYear = years[Math.floor(years.length * 0.6)];
  const counts = tally(eras);
  const era = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || ERA_ORDER.indexOf(b[0]) - ERA_ORDER.indexOf(a[0]),
  )[0][0];
  return { era, year: medYear };
}

/* ------------------------------------------------------------------ *
 * Main entry point
 * ------------------------------------------------------------------ */

export interface AnalyseInput {
  corpus: Corpus;
  scope: Scope;
  cohort: ScoredPaper[];
  interpreted: string[];
  unmatched: string[];
  inferredLanguages: string[];
  inferredTasks: string[];
  corpusFreq: Map<string, number>;
  relaxation: Landscape["relaxation"];
}

export function analyse(input: AnalyseInput): Landscape {
  const { corpus, scope, cohort, corpusFreq } = input;
  const papers = cohort.map((c) => c.paper);
  const cov = buildCoverage(corpus.papers);

  const focusLangs = [...new Set([...scope.languages, ...input.inferredLanguages])];
  const focusTasks = [...new Set([...scope.tasks, ...input.inferredTasks])];

  /* --- facets --------------------------------------------------- */

  const languageFacets = facet(
    papers,
    (p) => p.languages,
    (id) => LANG_BY_CODE.get(id)?.name ?? id,
    (id): Record<string, string | number> => {
      const l = LANG_BY_CODE.get(id);
      if (!l) return {};
      return { tier: l.tier, tierLabel: TIER_LABEL[l.tier], speakersM: l.speakersM, family: l.family };
    },
  );
  const taskFacets = facet(papers, (p) => p.tasks, (id) => TASK_BY_ID.get(id)?.name ?? id, (id) => ({
    group: TASK_BY_ID.get(id)?.group ?? "",
  }));
  const methodFacets = facet(papers, (p) => p.methods, (id) => METHOD_BY_ID.get(id)?.name ?? id, (id) => ({
    era: METHOD_BY_ID.get(id)?.era ?? "",
  }));
  const datasetFacets = facet(papers, (p) => [...new Set(p.datasets)], (id) => id, undefined, 18);
  const venueFacets = facet(papers, (p) => (p.venue ? [p.venue] : []), (id) => id, undefined, 12);
  const countryFacets = facet(papers, (p) => p.affiliations, (id) => id, undefined, 14);

  /* --- timeline -------------------------------------------------- */

  const yearCounts = tally(papers.map((p) => p.year));
  const corpusYearCounts = tally(corpus.papers.map((p) => p.year));
  const [minY, maxY] = [Math.max(2010, corpus.meta.yearRange[0]), corpus.meta.yearRange[1]];
  const timeline: TimelinePoint[] = [];
  for (let y = minY; y <= maxY; y++) {
    const inYear = papers.filter((p) => p.year === y);
    timeline.push({
      year: y,
      count: yearCounts.get(y) ?? 0,
      corpusCount: corpusYearCounts.get(y) ?? 0,
      era: inYear.length ? medianEra(inYear).era : null,
    });
  }

  /* --- matrix ---------------------------------------------------- */

  // Rows are chosen in priority bands so the matrix always contains a fair
  // comparison: the focus language, its structural peers (even sparse ones, 
  // those are the informative rows), then whatever dominates the cohort.
  const ROW_LIMIT = 14;
  const peerCodes = new Set<string>();
  for (const code of focusLangs) {
    const l = LANG_BY_CODE.get(code);
    if (!l) continue;
    for (const p of peersOf(l)) peerCodes.add(p.lang.code);
  }
  const toRow = (code: string) => {
    const l = LANG_BY_CODE.get(code);
    if (!l) return null;
    return { code: l.code, name: l.name, tier: l.tier as ResourceTier, total: cov.byLang.get(l.code)?.length ?? 0 };
  };
  type Row = NonNullable<ReturnType<typeof toRow>>;
  const rows: Row[] = [];
  const taken = new Set<string>();
  const push = (codes: string[], limit: number) => {
    const band = codes
      .filter((c) => !taken.has(c))
      .map(toRow)
      .filter((r): r is Row => Boolean(r))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
    for (const r of band) {
      taken.add(r.code);
      rows.push(r);
    }
  };
  push(focusLangs, ROW_LIMIT);
  // Peers are sampled from both ends of the coverage distribution. Taking only
  // the best-studied peers hides the sparse rows, which are the ones that make
  // the matrix legible as a story about inequality.
  const peerRows = [...peerCodes]
    .filter((c) => !taken.has(c))
    .map(toRow)
    .filter((r): r is Row => Boolean(r))
    .sort((a, b) => b.total - a.total);
  const peerBudget = Math.min(6, ROW_LIMIT - rows.length);
  push(
    [
      ...peerRows.slice(0, Math.ceil(peerBudget / 2)).map((r) => r.code),
      ...peerRows
        .filter((r) => r.total > 0)
        .slice(-Math.floor(peerBudget / 2))
        .map((r) => r.code),
    ],
    peerBudget,
  );
  push(languageFacets.map((f) => f.id), ROW_LIMIT - rows.length);
  const matrixLangs = rows
    .sort(
      (a, b) =>
        Number(focusLangs.includes(b.code)) - Number(focusLangs.includes(a.code)) ||
        b.total - a.total,
    )
    .slice(0, ROW_LIMIT);

  const colIds = new Set<string>(focusTasks);
  for (const f of taskFacets.slice(0, 12)) colIds.add(f.id);
  if (colIds.size < 10) for (const t of TASKS.slice(0, 12)) colIds.add(t.id);
  const matrixTasks = [...colIds]
    .map((id) => TASK_BY_ID.get(id))
    .filter((t): t is (typeof TASKS)[number] => Boolean(t))
    .map((t) => ({ id: t.id, name: t.name, total: cov.byTask.get(t.id)?.length ?? 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  const cellCounts: number[] = [];
  let matrixMax = 0;
  for (const l of matrixLangs)
    for (const t of matrixTasks) {
      const n = cov.pair.get(`${l.code}|${t.id}`)?.length ?? 0;
      matrixMax = Math.max(matrixMax, n);
      if (n > 0) cellCounts.push(n);
    }
  const matrixScale = percentile(cellCounts, 0.85) || matrixMax;

  const cells: MatrixCell[] = [];
  for (const l of matrixLangs) {
    const langEntry = LANG_BY_CODE.get(l.code)!;
    const peers = peersOf(langEntry);
    for (const t of matrixTasks) {
      const ps = cov.pair.get(`${l.code}|${t.id}`) ?? [];
      cells.push({
        langCode: l.code,
        taskId: t.id,
        count: ps.length,
        state: stateFor(ps.length, matrixScale),
        recentCount: ps.filter((p) => p.year >= RECENT_FROM).length,
        peerCount: peers.reduce((a, p) => a + (cov.pair.get(`${p.lang.code}|${t.id}`)?.length ?? 0), 0),
      });
    }
  }

  /* --- quadrant -------------------------------------------------- */

  const quadrantTasks = matrixTasks.length ? matrixTasks : taskFacets.slice(0, 10).map((f) => ({ id: f.id, name: f.label, total: f.count }));
  const volumes = quadrantTasks.map((t) => cov.byTask.get(t.id)?.length ?? 0);
  const medVolume = [...volumes].sort((a, b) => a - b)[Math.floor(volumes.length / 2)] ?? 0;
  const quadrant = quadrantTasks.map((t) => {
    const ps = cov.byTask.get(t.id) ?? [];
    const m = momentumOf(ps);
    const hot = m >= 1.15;
    const big = ps.length >= medVolume;
    return {
      taskId: t.id,
      label: t.name,
      volume: ps.length,
      momentum: m,
      quadrant: (hot && big ? "hot" : hot && !big ? "emerging" : !hot && big ? "crowded" : "dormant") as
        | "emerging"
        | "hot"
        | "crowded"
        | "dormant",
    };
  });

  /* --- gaps ------------------------------------------------------ */

  const taskMomentumCache = new Map<string, number>();
  const taskMomentum = (id: string) => {
    let m = taskMomentumCache.get(id);
    if (m === undefined) taskMomentumCache.set(id, (m = momentumOf(cov.byTask.get(id) ?? [])));
    return m;
  };

  // Candidate pairs: the focus languages against every task, plus every matrix
  // cell, so the ranking sees more than just what is on screen.
  const candidateLangs = focusLangs.length
    ? [...new Set([...focusLangs, ...matrixLangs.filter((l) => l.tier <= 3).map((l) => l.code)])]
    : matrixLangs.filter((l) => l.tier <= 3).map((l) => l.code);
  // Scan every task, not just the matrix columns. The matrix shows the twelve
  // busiest tasks, but a gap is by definition somewhere the volume is low, so
  // restricting the search to popular columns hides exactly what it should find.
  const candidateTasks = TASKS.map((t) => t.id);

  const gaps: Gap[] = [];
  for (const code of candidateLangs) {
    const lang = LANG_BY_CODE.get(code);
    if (!lang) continue;
    // Comparing a tier-5 language against itself is not a gap analysis.
    if (lang.tier >= 5 && focusLangs.length > 0 && !focusLangs.includes(code)) continue;

    for (const taskId of candidateTasks) {
      const task = TASK_BY_ID.get(taskId);
      if (!task) continue;
      const pairPapers = cov.pair.get(`${code}|${taskId}`) ?? [];
      const { score, components, peerCount, peerExamples } = scoreGap(
        lang,
        taskId,
        cov,
        taskMomentum(taskId),
        cov.byTask.get(taskId)?.length ?? 0,
      );

      // A pair nobody anywhere studies is noise, not opportunity.
      if (peerCount === 0 && pairPapers.length === 0) continue;

      const pairConc = concentrationOf(pairPapers);
      const pairEra = medianEra(pairPapers);
      const fieldEra = medianEra(cov.byTask.get(taskId) ?? []);
      const recent = pairPapers.filter((p) => p.year >= RECENT_FROM).length;

      // Classification runs most-specific first. Each branch has to clear a
      // real bar: an earlier, looser version of this labelled almost every
      // pairing an "evaluation void", which made the output useless.
      const anchored = pairPapers.filter(
        (p) =>
          p.tasks.includes("eval") ||
          p.tasks.includes("corpus") ||
          p.tasksMentioned.includes("eval") ||
          p.tasksMentioned.includes("corpus"),
      ).length;
      const datasetShare = pairPapers.length
        ? pairPapers.filter((p) => p.datasets.length > 0).length / pairPapers.length
        : 0;

      let kind: GapKind | null = null;
      if (pairPapers.length === 0) kind = "untouched";
      else if (pairPapers.length <= 3) kind = "thin-evidence";
      else if (pairConc.hhi >= 0.28 && pairConc.papersWithDataset >= 3) kind = "single-dataset";
      else if (
        pairEra.year > 0 &&
        fieldEra.year > 0 &&
        ERA_ORDER.indexOf(fieldEra.era) - ERA_ORDER.indexOf(pairEra.era) >= 2
      )
        kind = "method-lag";
      else if (recent === 0 && pairPapers.length >= 3) kind = "cooling";
      else if (
        // A genuine benchmark void: enough work to expect shared resources by
        // now, no benchmark or corpus paper, and most papers naming no dataset.
        pairPapers.length >= 5 &&
        pairPapers.length <= 25 &&
        anchored === 0 &&
        datasetShare < 0.4
      )
        kind = "evaluation-void";

      if (!kind) continue; // healthy: not a gap

      // Wording stays inside what the corpus can support: absence of a paper in
      // this index is not proof that no such paper exists anywhere.
      const headline =
        kind === "untouched"
          ? `No indexed paper pairs ${lang.name} with ${task.name}`
          : kind === "thin-evidence"
            ? `${task.name} in ${lang.name} rests on ${pairPapers.length} paper${pairPapers.length === 1 ? "" : "s"}`
            : kind === "single-dataset"
              ? `${lang.name} ${task.name} depends on one dataset`
              : kind === "method-lag"
                ? `${lang.name} ${task.name} is a methodological generation behind`
                : kind === "cooling"
                  ? `${lang.name} ${task.name} has gone quiet since ${Math.max(...pairPapers.map((p) => p.year))}`
                  : `${lang.name} ${task.name} has no shared benchmark`;

      const reasoning = components
        .filter((c) => c.raw > 0.25 || c.key === "scarcity")
        .map((c) => c.explanation)
        .join(" ");

      gaps.push({
        id: `${code}|${taskId}`,
        kind,
        langCode: code,
        langName: lang.name,
        tier: lang.tier,
        taskId,
        taskName: task.name,
        score: Math.round(score),
        // "In scope" means it matches every dimension the user actually named.
        focus:
          (focusLangs.length === 0 || focusLangs.includes(code)) &&
          (focusTasks.length === 0 || focusTasks.includes(taskId)) &&
          (focusLangs.length > 0 || focusTasks.length > 0),
        components,
        headline,
        reasoning,
        evidence: [
          { label: `${lang.name} × ${task.name}`, count: pairPapers.length, filter: { languages: [code], tasks: [taskId] } },
          { label: `All ${lang.name} work`, count: cov.byLang.get(code)?.length ?? 0, filter: { languages: [code] } },
          { label: `${task.name} field-wide`, count: cov.byTask.get(taskId)?.length ?? 0, filter: { tasks: [taskId] } },
        ],
        questions: questionsFor(
          kind,
          lang,
          task.name,
          peerExamples,
          pairConc.topName,
          pairEra.era,
          fieldEra.era,
        ),
        peerExamples,
        startingPoints: [...pairPapers, ...(cov.byTask.get(taskId) ?? [])]
          .filter((p) => peerExamples.some((pe) => p.languages.some((l) => LANG_BY_CODE.get(l)?.name === pe.langName)) || p.languages.includes(code))
          .sort((a, b) => b.citations - a.citations)
          .slice(0, 3)
          .map((p) => p.title),
      });
    }
  }

  // A question about Urdu must be answered about Urdu first. Adjacent-language
  // gaps stay in the list: they are genuinely useful leads, but below.
  gaps.sort((a, b) => b.score - a.score);

  /** Ten variations on one gap type is a worse answer than five distinct ones. */
  const diversify = (list: Gap[], limit: number, perKind: number) => {
    const used = new Map<GapKind, number>();
    const out: Gap[] = [];
    for (const g of list) {
      const n = used.get(g.kind) ?? 0;
      if (n >= perKind) continue;
      used.set(g.kind, n + 1);
      out.push(g);
      if (out.length >= limit) break;
    }
    return out;
  };

  const focusGaps = diversify(gaps.filter((g) => g.focus), 8, 3);
  const adjacentGaps = diversify(
    gaps.filter((g) => !g.focus),
    focusGaps.length ? 6 : 12,
    focusGaps.length ? 2 : 4,
  );
  const topGaps = [...focusGaps, ...adjacentGaps];

  /* --- concentration, method lag, equity ------------------------- */

  const concentration = concentrationOf(papers);
  const cohortEra = medianEra(papers);
  const corpusEra = medianEra(corpus.papers);
  const methodLag = {
    cohortMedianEra: cohortEra.era,
    corpusMedianEra: corpusEra.era,
    lagYears: Math.max(0, corpusEra.year - cohortEra.year),
    verdict:
      ERA_ORDER.indexOf(corpusEra.era) - ERA_ORDER.indexOf(cohortEra.era) >= 1
        ? `This area is still reported mainly with ${cohortEra.era}-era methods while the surrounding corpus has moved to ${corpusEra.era}. That distance is itself a publishable opportunity.`
        : `Methodologically current: this area tracks the wider corpus (${cohortEra.era}-era methods dominate both).`,
  };

  const lowRes = papers.filter((p) => p.languages.some((l) => (LANG_BY_CODE.get(l)?.tier ?? 5) <= 2));
  const highResOnly = papers.filter(
    (p) => p.languages.length > 0 && p.languages.every((l) => (LANG_BY_CODE.get(l)?.tier ?? 0) >= 4),
  );
  // Restricted to lower-resource languages: "110M speakers per paper" is only a
  // finding when the language is actually under-served, not when a tier-5
  // language happens to be mentioned twice in this cohort.
  const speakersPerPaper = languageFacets
    .filter((f) => (LANG_BY_CODE.get(f.id)?.tier ?? 5) <= 3)
    .map((f) => {
      const l = LANG_BY_CODE.get(f.id);
      if (!l) return null;
      return {
        langName: l.name,
        speakersM: l.speakersM,
        papers: f.count,
        ratio: l.speakersM / Math.max(1, f.count),
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 10);

  const equity = {
    highResourceShare: papers.length ? highResOnly.length / papers.length : 0,
    lowResourceShare: papers.length ? lowRes.length / papers.length : 0,
    speakersPerPaper,
  };

  /* --- themes and narrative -------------------------------------- */

  const themes = buildThemes(papers, corpusFreq, corpus.papers.length);

  // Guard against confident output over a cohort too small to support it. A
  // query the taxonomy did not understand at all is the usual cause.
  const understood = input.interpreted.length > 0;
  const reliability: Landscape["reliability"] =
    papers.length < 15
      ? {
          level: "thin",
          note: understood
            ? `Only ${papers.length} papers matched. That is too few to characterise a field: treat everything below as a lead to check, not a finding.`
            : `Only ${papers.length} papers matched, and nothing in this query mapped onto a known language, task or method. The analysis below is running on loose keyword overlap and should not be relied on, try naming a language or task directly.`,
        }
      : papers.length < 45
        ? {
            level: "moderate",
            note: `${papers.length} papers is a narrow base. The direction is probably right, but individual counts are sensitive to how a handful of papers were tagged.`,
          }
        : {
            level: "good",
            note: `${papers.length} papers is enough to read the shape of this area with reasonable confidence.`,
          };
  const narrative = buildNarrative({
    scope,
    papers,
    corpus,
    languageFacets,
    taskFacets,
    themes,
    concentration,
    methodLag,
    equity,
    gaps: topGaps,
    timeline,
    quadrant,
  });

  // When the scope had to be widened, the absence is the story. Say it first,
  // in the user's own terms, before any of the derived statistics.
  if (input.relaxation.applied) {
    const asked = [
      ...focusLangs.map((c) => LANG_BY_CODE.get(c)?.name ?? c),
      ...focusTasks.map((t) => TASK_BY_ID.get(t)?.name ?? t),
    ];
    const subject = asked.length ? asked.join(" and ") : `“${scope.query.trim()}”`;
    narrative.headline =
      input.relaxation.exactCount === 0
        ? `Nothing in the index matches ${subject}`
        : `Only ${input.relaxation.exactCount} indexed ${input.relaxation.exactCount === 1 ? "paper matches" : "papers match"} ${subject}`;
    narrative.paragraphs.unshift(
      `${input.relaxation.exactCount === 0 ? "No indexed paper covers" : `Only ${input.relaxation.exactCount} indexed papers cover`} exactly what you asked for, which is the finding rather than a failed search. To give you something to work from, the engine ${input.relaxation.note} and analysed the nearest evidence instead. Everything below describes that wider set, while the ranked gaps stay centred on your original question.`,
    );
  }

  return {
    scope,
    resolved: {
      languages: focusLangs
        .map((c) => LANG_BY_CODE.get(c))
        .filter((l): l is LanguageEntry => Boolean(l))
        .map((l) => ({ code: l.code, name: l.name, tier: l.tier })),
      tasks: focusTasks
        .map((t) => TASK_BY_ID.get(t))
        .filter((t): t is (typeof TASKS)[number] => Boolean(t))
        .map((t) => ({ id: t.id, name: t.name })),
      interpreted: input.interpreted,
      unmatched: input.unmatched.slice(0, 8),
    },
    cohortSize: papers.length,
    corpusSize: corpus.papers.length,
    papers: cohort.slice(0, 60),
    themes,
    languageFacets,
    taskFacets,
    methodFacets,
    datasetFacets,
    venueFacets,
    countryFacets,
    timeline,
    matrix: { languages: matrixLangs, tasks: matrixTasks, cells, max: matrixMax },
    gaps: topGaps,
    quadrant,
    concentration,
    methodLag,
    relaxation: input.relaxation,
    reliability,
    narrative,
    equity,
  };
}

/* ------------------------------------------------------------------ *
 * Narrative: assembled from the computed statistics, never invented
 * ------------------------------------------------------------------ */

function pct(x: number) {
  return `${Math.round(x * 100)}%`;
}

function buildNarrative(a: {
  scope: Scope;
  papers: Paper[];
  corpus: Corpus;
  languageFacets: FacetItem[];
  taskFacets: FacetItem[];
  themes: Theme[];
  concentration: DatasetConcentration;
  methodLag: Landscape["methodLag"];
  equity: Landscape["equity"];
  gaps: Gap[];
  timeline: TimelinePoint[];
  quadrant: Landscape["quadrant"];
}): Landscape["narrative"] {
  const n = a.papers.length;
  const topLang = a.languageFacets[0];
  const topTask = a.taskFacets[0];
  const recent = a.timeline.filter((t) => t.year >= NOW - 2).reduce((s, t) => s + t.count, 0);
  const prior = a.timeline.filter((t) => t.year >= NOW - 5 && t.year < NOW - 2).reduce((s, t) => s + t.count, 0);
  const growth = prior > 0 ? recent / prior : 0;

  const paragraphs: string[] = [];

  if (n === 0) {
    return {
      headline: "No papers matched this scope",
      paragraphs: [
        "Nothing in the indexed corpus matches the current filters. That is usually a scoping artefact rather than a finding, widen the year range, drop a filter, or describe the area in different words.",
      ],
      signals: [],
    };
  }

  paragraphs.push(
    `This scope returns ${n} papers out of ${a.corpus.meta.paperCount} indexed, spanning ${a.timeline.find((t) => t.count > 0)?.year ?? ", "} to ${[...a.timeline].reverse().find((t) => t.count > 0)?.year ?? ", "}. ` +
      (topLang
        ? `${topLang.label} is the most studied language here with ${topLang.count} papers (${pct(topLang.share)} of the cohort), and ${topTask ? `${topTask.label.toLowerCase()} is the dominant task at ${topTask.count} papers` : "task labels are thinly distributed"}.`
        : "No single language dominates the cohort."),
  );

  if (a.equity.lowResourceShare > 0 || a.equity.highResourceShare > 0) {
    const worst = a.equity.speakersPerPaper[0];
    paragraphs.push(
      `${pct(a.equity.lowResourceShare)} of these papers touch a tier 0–2 language, while ${pct(a.equity.highResourceShare)} study only tier 4–5 languages. ` +
        (worst
          ? `The sharpest imbalance is ${worst.langName}: roughly ${Math.round(worst.ratio)}M speakers for every paper in this scope, against ${worst.papers} paper${worst.papers === 1 ? "" : "s"} of coverage.`
          : ""),
    );
  }

  paragraphs.push(
    growth > 0
      ? `Publication activity is ${growth >= 1.25 ? "accelerating" : growth >= 0.9 ? "holding steady" : "slowing"}: ${recent} papers in the last three years against ${prior} in the three before, a ${growth.toFixed(2)}x change. ${a.methodLag.verdict}`
      : `${a.methodLag.verdict}`,
  );

  paragraphs.push(a.concentration.verdict);

  const emerging = a.quadrant.filter((q) => q.quadrant === "emerging").slice(0, 3);
  const crowded = a.quadrant.filter((q) => q.quadrant === "crowded").slice(0, 3);
  if (emerging.length || crowded.length) {
    paragraphs.push(
      (crowded.length
        ? `Attention concentrates on ${crowded.map((c) => c.label.toLowerCase()).join(", ")}: high volume, flat or falling momentum. `
        : "") +
        (emerging.length
          ? `Meanwhile ${emerging.map((c) => c.label.toLowerCase()).join(", ")} ${emerging.length === 1 ? "is" : "are"} growing from a small base, which is where a new entrant has the most room.`
          : ""),
    );
  }

  const g = a.gaps[0];
  if (g) {
    paragraphs.push(
      `The strongest single opportunity the engine can defend is ${g.langName} × ${g.taskName} (score ${g.score}/100). ${g.reasoning}`,
    );
  }

  const signals = [
    { label: "Papers in scope", value: String(n), detail: `of ${a.corpus.meta.paperCount} indexed` },
    {
      label: "Momentum",
      value: growth ? `${growth.toFixed(2)}×` : ", ",
      detail: "last 3 years vs the 3 before",
    },
    {
      label: "Dataset concentration",
      value: a.concentration.hhi ? a.concentration.hhi.toFixed(2) : ", ",
      detail: a.concentration.topName ? `HHI · top resource ${a.concentration.topName}` : "HHI over named resources",
    },
    {
      label: "Low-resource share",
      value: pct(a.equity.lowResourceShare),
      detail: "papers touching a tier 0–2 language",
    },
  ];

  const headline = g
    ? g.headline
    : topLang
      ? `${topLang.label} dominates this area with ${topLang.count} of ${n} papers`
      : "Research landscape";

  return { headline, paragraphs, signals };
}
