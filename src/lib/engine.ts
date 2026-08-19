import "server-only";

import fs from "node:fs";
import path from "node:path";

import { analyse } from "./analysis";
import { buildIndex, parseQuery, retrieve, trimTail, type Index } from "./retrieval";
import type { Corpus, Landscape, Scope } from "./types";

/**
 * Process-wide singletons. The corpus is ~23 MB of JSON and the inverted index
 * takes a couple of seconds to build, so both are constructed once per server
 * instance and reused across requests.
 *
 * The path is a single static expression on purpose: anything more dynamic
 * makes the bundler trace the entire project into the serverless output.
 */

const CORPUS_PATH = path.join(process.cwd(), "data", "corpus.json");

let corpusCache: Corpus | null = null;
let indexCache: Index | null = null;

export function getCorpus(): Corpus {
  if (!corpusCache) {
    corpusCache = JSON.parse(fs.readFileSync(CORPUS_PATH, "utf8")) as Corpus;
  }
  return corpusCache;
}

export function getIndex(): Index {
  if (!indexCache) indexCache = buildIndex(getCorpus().papers);
  return indexCache;
}

/**
 * One limit for both the composer preview and the analysis. They used to
 * differ (4000 vs 1200), so the composer advertised a larger figure than the
 * results then reported, which undermines the point of every number being
 * checkable.
 */
const COHORT_LIMIT = 1200;

/* ------------------------------------------------------------------ */

export const DEFAULT_SCOPE: Scope = {
  query: "",
  languages: [],
  tasks: [],
  yearFrom: 2010,
  yearTo: 2026,
};

export function normaliseScope(input: Partial<Scope>): Scope {
  const from = Math.max(2008, Math.min(2026, Number(input.yearFrom) || DEFAULT_SCOPE.yearFrom));
  const to = Math.max(2008, Math.min(2026, Number(input.yearTo) || DEFAULT_SCOPE.yearTo));
  return {
    query: (input.query ?? "").slice(0, 240),
    languages: (input.languages ?? []).slice(0, 6),
    tasks: (input.tasks ?? []).slice(0, 6),
    yearFrom: Math.min(from, to),
    yearTo: Math.max(from, to),
  };
}

/** Cheap count used by the composer's live "N papers in scope" readout. */
export function previewCount(scope: Scope): { count: number; interpreted: string[] } {
  const parsed = parseQuery(scope.query);
  const results = retrieve(getIndex(), parsed, scope, COHORT_LIMIT);
  return { count: trimTail(results, 20).length, interpreted: parsed.interpreted };
}

/** Below this a cohort cannot support any reading of a field, so widen. */
const MIN_COHORT = 8;

/**
 * Widening ladder, tried in order until a usable cohort appears.
 *
 * An exact scope returning nothing is the single most on-message result this
 * tool can produce: it means the pairing the user asked about has never been
 * published on. Dead-ending there with an error would throw away the finding,
 * so instead each step drops the narrowest constraint and records what it gave
 * up, and the interface reports the absence as the headline.
 */
function ladder(scope: Scope): { scope: Scope; note: string | null; dropped: string[] }[] {
  const full: Scope = { ...scope, yearFrom: 2008, yearTo: 2026 };
  const steps: { scope: Scope; note: string | null; dropped: string[] }[] = [
    { scope, note: null, dropped: [] },
  ];

  if (scope.yearFrom > 2008 || scope.yearTo < 2026) {
    steps.push({ scope: full, note: "widened the year range to the whole corpus", dropped: ["years"] });
  }
  if (scope.tasks.length) {
    steps.push({
      scope: { ...full, tasks: [] },
      note: "released the task filter",
      dropped: ["tasks"],
    });
  }
  if (scope.languages.length) {
    steps.push({
      scope: { ...full, languages: [] },
      note: "released the language filter",
      dropped: ["languages"],
    });
  }
  if (scope.languages.length || scope.tasks.length) {
    steps.push({
      scope: { ...full, languages: [], tasks: [] },
      note: "released every filter and kept only the description",
      dropped: ["languages", "tasks"],
    });
  }
  if (scope.query.trim()) {
    steps.push({
      scope: { ...full, query: "", languages: scope.languages, tasks: [] },
      note: "kept the language and searched across all of its work",
      dropped: ["query", "tasks"],
    });
  }
  // Floor: the whole corpus. This can never be empty.
  steps.push({
    scope: { query: "", languages: [], tasks: [], yearFrom: 2008, yearTo: 2026 },
    note: "fell back to the whole corpus, because nothing in the request matched",
    dropped: ["everything"],
  });

  return steps;
}

export function runLandscape(scope: Scope): Landscape {
  const corpus = getCorpus();
  const index = getIndex();
  // Concepts are always taken from what the user actually asked for, even when
  // the cohort had to be widened, so the analysis stays centred on their
  // question rather than drifting to whatever the fallback surfaced.
  const parsed = parseQuery(scope.query);

  let chosen = { scope, note: null as string | null, dropped: [] as string[] };
  let cohort = trimTail(retrieve(index, parsed, scope, COHORT_LIMIT), 40);
  let exactCount = cohort.length;

  if (cohort.length < MIN_COHORT) {
    for (const step of ladder(scope).slice(1)) {
      const stepParsed = step.scope.query === scope.query ? parsed : parseQuery(step.scope.query);
      const next = trimTail(retrieve(index, stepParsed, step.scope, COHORT_LIMIT), 40);
      if (next.length >= MIN_COHORT) {
        chosen = step;
        cohort = next;
        break;
      }
    }
  }

  return analyse({
    corpus,
    scope,
    cohort,
    interpreted: parsed.interpreted,
    unmatched: parsed.unmatched,
    inferredLanguages: parsed.languages,
    inferredTasks: parsed.tasks,
    corpusFreq: index.df,
    relaxation: chosen.note
      ? { applied: true, note: chosen.note, dropped: chosen.dropped, exactCount }
      : { applied: false, note: null, dropped: [], exactCount },
  });
}
