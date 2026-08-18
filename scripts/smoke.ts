/**
 * Engine smoke test: exercises retrieval + analysis without booting Next.
 *   npx tsx scripts/smoke.ts "Urdu NLP"
 */

import fs from "node:fs";
import { analyse } from "../src/lib/analysis";
import { buildIndex, parseQuery, retrieve, trimTail } from "../src/lib/retrieval";
import type { Corpus, Scope } from "../src/lib/types";

const corpus: Corpus = JSON.parse(fs.readFileSync("data/corpus.json", "utf8"));

let t = Date.now();
const index = buildIndex(corpus.papers);
console.log(`index built in ${Date.now() - t} ms over ${corpus.papers.length} papers`);

const queries = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["Urdu NLP", "Low-resource multilingual toxicity detection", "code-mixed sentiment analysis"];

for (const q of queries) {
  const scope: Scope = { query: q, languages: [], tasks: [], yearFrom: 2010, yearTo: 2026 };
  t = Date.now();
  const parsed = parseQuery(q);
  const cohort = trimTail(retrieve(index, parsed, scope, 1200), 40);
  const L = analyse({
    corpus,
    scope,
    cohort,
    interpreted: parsed.interpreted,
    unmatched: parsed.unmatched,
    inferredLanguages: parsed.languages,
    inferredTasks: parsed.tasks,
    corpusFreq: index.df,
  });
  const ms = Date.now() - t;

  console.log(`\n${"=".repeat(78)}\n"${q}", ${L.cohortSize} papers, ${ms} ms`);
  console.log(`understood: ${L.resolved.interpreted.join(" | ") || "(free text only)"}`);
  console.log(`\nHEADLINE: ${L.narrative.headline}`);
  console.log(`\n${L.narrative.paragraphs.map((p) => `  ${p}`).join("\n\n")}`);
  console.log(`\nTHEMES: ${L.themes.map((t2) => `${t2.label}(${t2.count},${t2.trend})`).join("  ")}`);
  console.log(`TOP LANGS: ${L.languageFacets.slice(0, 8).map((f) => `${f.label}:${f.count}`).join("  ")}`);
  console.log(`MATRIX: ${L.matrix.languages.length}x${L.matrix.tasks.length}, max ${L.matrix.max}, voids ${L.matrix.cells.filter((c) => c.state === "void").length}`);
  console.log(`\nTOP GAPS:`);
  for (const g of L.gaps.slice(0, 5)) {
    console.log(`  [${g.score}] ${g.headline}  (${g.kind})`);
    console.log(`        ${g.components.map((c) => `${c.label} ${c.points.toFixed(1)}`).join(" · ")}`);
    console.log(`        Q: ${g.questions[0]?.text}`);
  }
  console.log(`\nQUADRANT: ${L.quadrant.slice(0, 6).map((q2) => `${q2.label}[${q2.quadrant}]`).join("  ")}`);
  console.log(`TOP PAPERS: ${L.papers.slice(0, 3).map((p) => `\n   ${p.paper.year} ${p.paper.title.slice(0, 78)}`).join("")}`);
}
