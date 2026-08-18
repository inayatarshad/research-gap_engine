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
  const results = retrieve(getIndex(), parsed, scope, 4000);
  return { count: trimTail(results, 20).length, interpreted: parsed.interpreted };
}

export function runLandscape(scope: Scope): Landscape {
  const corpus = getCorpus();
  const index = getIndex();
  const parsed = parseQuery(scope.query);
  const results = retrieve(index, parsed, scope, 1200);
  const cohort = trimTail(results, 40);

  return analyse({
    corpus,
    scope,
    cohort,
    interpreted: parsed.interpreted,
    unmatched: parsed.unmatched,
    inferredLanguages: parsed.languages,
    inferredTasks: parsed.tasks,
    corpusFreq: index.df,
  });
}
