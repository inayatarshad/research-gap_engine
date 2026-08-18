/**
 * Hybrid retrieval over the paper corpus.
 *
 * Two signals are combined:
 *   1. BM25 over title + abstract, with the title weighted up.
 *   2. Taxonomy expansion: a query naming a language, task or method is
 *      expanded to every surface alias for that concept before scoring, and
 *      papers tagged with the concept get a structural bonus.
 *
 * The second signal is what lets "toxic language in Roman Urdu" find a paper
 * titled "Abusive content detection for code-mixed Urdu-English", which a plain
 * keyword search misses entirely. Because the expansion table is explicit, the
 * UI can show the user exactly which concepts were understood.
 */

import { LANGUAGES, TASKS, METHODS, CODE_MIXED_ALIASES, LANGUAGE_GROUPS, LANG_BY_CODE } from "./taxonomy";
import type { Paper, Scope, ScoredPaper } from "./types";

const STOPWORDS = new Set(
  `a an the of for in on at to and or with using via by from as is are was were be been
   this that these those we our their its it study paper approach method model based new
   novel propose proposed present presents show shows results result performance use used
   uses can could may also however thus therefore between into than then them they there
   which while about across after all among any both each more most other over such some
   only same very when where who whom whose how what why not no nor but if so out up down
   have has had do does did been being toward towards through during before under above`
    .split(/\s+/)
    .filter(Boolean),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ\s-]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^-+|-+$/g, ""))
    .filter((t) => t.length > 2 && t.length < 30 && !STOPWORDS.has(t));
}

/* ------------------------------------------------------------------ *
 * Index
 * ------------------------------------------------------------------ */

export interface Index {
  papers: Paper[];
  /** term -> [docIndex, termFrequency][] */
  postings: Map<string, [number, number][]>;
  docLen: number[];
  avgDocLen: number;
  df: Map<string, number>;
  N: number;
}

export function buildIndex(papers: Paper[]): Index {
  const postings = new Map<string, [number, number][]>();
  const docLen: number[] = new Array(papers.length).fill(0);
  const df = new Map<string, number>();

  papers.forEach((p, i) => {
    // Title terms are repeated so BM25 weights them without a separate field model.
    const terms = [
      ...tokenize(p.title),
      ...tokenize(p.title),
      ...tokenize(p.title),
      ...tokenize(p.abstract),
      ...tokenize(p.venue),
      ...p.datasets.flatMap((d) => tokenize(d)),
      ...p.topics.flatMap((t) => tokenize(t)),
    ];
    docLen[i] = terms.length;
    const tf = new Map<string, number>();
    for (const t of terms) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const [term, freq] of tf) {
      let list = postings.get(term);
      if (!list) postings.set(term, (list = []));
      list.push([i, freq]);
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  });

  const avgDocLen = docLen.reduce((a, b) => a + b, 0) / Math.max(1, papers.length);
  return { papers, postings, docLen, avgDocLen, df, N: papers.length };
}

/* ------------------------------------------------------------------ *
 * Query understanding
 * ------------------------------------------------------------------ */

export interface ParsedQuery {
  languages: string[];
  tasks: string[];
  methods: string[];
  codeMixed: boolean;
  /** Expanded terms actually fed to BM25, with per-term weights. */
  terms: Map<string, number>;
  interpreted: string[];
  unmatched: string[];
}

function matchAlias(haystack: string, alias: string): boolean {
  const re = new RegExp(`(?<![\\w-])${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`, "i");
  return re.test(haystack);
}

export function parseQuery(raw: string): ParsedQuery {
  const q = ` ${raw.toLowerCase()} `;
  const languages: string[] = [];
  const tasks: string[] = [];
  const methods: string[] = [];
  const interpreted: string[] = [];
  const terms = new Map<string, number>();
  const consumed: string[] = [];

  const add = (t: string, w: number) => {
    if (!t || STOPWORDS.has(t)) return;
    terms.set(t, Math.max(terms.get(t) ?? 0, w));
  };

  // Regions and families first: "African languages" must resolve to a set of
  // languages, not degrade into free text.
  for (const group of LANGUAGE_GROUPS) {
    const hit = group.aliases.find((a) => matchAlias(q, a));
    if (!hit) continue;
    interpreted.push(`${group.name} · ${group.codes.length} languages`);
    consumed.push(...tokenize(hit));
    // Prefer the lower-resource members: they are what such a query is about.
    const ranked = group.codes
      .map((c) => LANG_BY_CODE.get(c))
      .filter((l): l is (typeof LANGUAGES)[number] => Boolean(l))
      .sort((a, b) => a.tier - b.tier || b.speakersM - a.speakersM)
      .slice(0, 12);
    for (const l of ranked) {
      languages.push(l.code);
      for (const a of l.aliases) tokenize(a).forEach((t) => add(t, 1.6));
    }
  }

  for (const lang of LANGUAGES) {
    const hit = lang.aliases.find((a) => matchAlias(q, a));
    if (hit) {
      languages.push(lang.code);
      interpreted.push(`${lang.name} · language`);
      consumed.push(...tokenize(hit));
      for (const a of lang.aliases) tokenize(a).forEach((t) => add(t, 2.4));
    }
  }

  for (const task of TASKS) {
    const hit = task.aliases.find((a) => matchAlias(q, a));
    if (hit) {
      tasks.push(task.id);
      interpreted.push(`${task.name} · task`);
      consumed.push(...tokenize(hit));
      // Expanding to sibling aliases is the whole point: it bridges vocabulary.
      for (const a of task.aliases) tokenize(a).forEach((t) => add(t, 1.9));
    }
  }

  for (const method of METHODS) {
    const hit = method.aliases.find((a) => matchAlias(q, a));
    if (hit) {
      methods.push(method.id);
      interpreted.push(`${method.name} · method`);
      consumed.push(...tokenize(hit));
      for (const a of method.aliases) tokenize(a).forEach((t) => add(t, 1.5));
    }
  }

  const codeMixed = CODE_MIXED_ALIASES.some((a) => matchAlias(q, a));
  if (codeMixed) {
    interpreted.push("Code-mixed / romanised text · phenomenon");
    for (const a of CODE_MIXED_ALIASES) tokenize(a).forEach((t) => add(t, 1.8));
  }

  // Whatever the taxonomy did not absorb still contributes as free text.
  const consumedSet = new Set(consumed);
  const unmatched: string[] = [];
  for (const t of tokenize(raw)) {
    add(t, 1);
    if (!consumedSet.has(t)) unmatched.push(t);
  }

  return {
    languages: [...new Set(languages)],
    tasks: [...new Set(tasks)],
    methods: [...new Set(methods)],
    codeMixed,
    terms,
    interpreted: [...new Set(interpreted)],
    unmatched: [...new Set(unmatched)],
  };
}

/* ------------------------------------------------------------------ *
 * Scoring
 * ------------------------------------------------------------------ */

const K1 = 1.4;
const B = 0.72;

export function retrieve(
  index: Index,
  parsed: ParsedQuery,
  scope: Scope,
  limit = 400,
): ScoredPaper[] {
  const { papers, postings, docLen, avgDocLen, df, N } = index;
  const scores = new Float64Array(N);
  const matchedTerms: Map<number, Set<string>> = new Map();

  for (const [term, weight] of parsed.terms) {
    const list = postings.get(term);
    if (!list) continue;
    const n = df.get(term) ?? 0;
    // Very common terms carry no discriminative signal.
    if (n > N * 0.5) continue;
    const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
    for (const [doc, freq] of list) {
      const norm = freq * (K1 + 1) / (freq + K1 * (1 - B + B * (docLen[doc] / avgDocLen)));
      scores[doc] += idf * norm * weight;
      if (weight >= 1.5) {
        let s = matchedTerms.get(doc);
        if (!s) matchedTerms.set(doc, (s = new Set()));
        if (s.size < 6) s.add(term);
      }
    }
  }

  const wantLangs = new Set([...parsed.languages, ...scope.languages]);
  const wantTasks = new Set([...parsed.tasks, ...scope.tasks]);
  const hardLangs = new Set(scope.languages);
  const hardTasks = new Set(scope.tasks);

  const out: ScoredPaper[] = [];
  for (let i = 0; i < N; i++) {
    const p = papers[i];
    if (p.year < scope.yearFrom || p.year > scope.yearTo) continue;

    // Explicit chip filters are hard constraints; query-inferred ones are soft.
    if (hardLangs.size && !p.languages.some((l) => hardLangs.has(l))) continue;
    if (hardTasks.size && !p.tasks.some((t) => hardTasks.has(t))) continue;

    let s = scores[i];

    // Structural bonuses: tagged concepts beat incidental word overlap.
    if (wantLangs.size && p.languages.some((l) => wantLangs.has(l))) s *= 1.85;
    else if (wantLangs.size && p.languagesMentioned.some((l) => wantLangs.has(l))) s *= 1.2;
    if (wantTasks.size && p.tasks.some((t) => wantTasks.has(t))) s *= 1.75;
    else if (wantTasks.size && p.tasksMentioned.some((t) => wantTasks.has(t))) s *= 1.15;
    if (parsed.methods.length && p.methods.some((m) => parsed.methods.includes(m))) s *= 1.25;
    if (parsed.codeMixed && p.codeMixed) s *= 1.5;

    if (s <= 0) continue;

    // Gentle recency and citation priors: enough to break ties, not enough to
    // bury a foundational older paper.
    const age = Math.max(0, 2026 - p.year);
    s *= 1 + 0.22 * Math.exp(-age / 7);
    s *= 1 + Math.log1p(p.citations) / 22;

    out.push({ paper: p, score: s, matched: [...(matchedTerms.get(i) ?? [])] });
  }

  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limit);
}

/**
 * When filters are broad the tail of BM25 results is noise. Cut where the score
 * falls off a cliff relative to the best hit, but always keep a usable cohort.
 */
export function trimTail(results: ScoredPaper[], min = 40): ScoredPaper[] {
  if (results.length <= min) return results;
  const top = results[0].score;
  const cutoff = top * 0.08;
  const kept = results.filter((r) => r.score >= cutoff);
  return kept.length >= min ? kept : results.slice(0, min);
}
