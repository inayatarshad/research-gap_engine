/**
 * Shared taxonomy loading and rule-based enrichment, used by both corpus
 * builders. Every tag it attaches is traceable to a literal surface string in
 * the paper's title or abstract: no model guesses, so the downstream counts
 * are reproducible.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..", "..");
export const OUT_DIR = path.join(ROOT, "data");

export async function loadTaxonomy() {
  const src = await fs.readFile(path.join(ROOT, "src", "lib", "taxonomy.ts"), "utf8");
  const js = src
    .replace(/^import[\s\S]*?;$/gm, "")
    .replace(/export interface [\s\S]*?\n}\n/g, "")
    .replace(/export type [^\n]*\n/g, "")
    .replace(/:\s*(LanguageEntry|TaskEntry|MethodEntry)\[\]\s*=/g, " =")
    .replace(/:\s*Record<ResourceTier,\s*string>\s*=/g, " =")
    .replace(/export const/g, "const");
  const mod = `${js}\nexport { LANGUAGES, TASKS, METHODS, KNOWN_DATASETS, CODE_MIXED_ALIASES };`;
  await fs.mkdir(path.join(ROOT, ".cache"), { recursive: true });
  const tmp = path.join(ROOT, ".cache", `taxonomy-${Date.now()}.mjs`);
  await fs.writeFile(tmp, mod);
  const loaded = await import(`file://${tmp.replace(/\\/g, "/")}`);
  await fs.unlink(tmp).catch(() => {});
  return loaded;
}

export const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function buildMatcher(entries) {
  return entries.map((e) => ({
    entry: e,
    patterns: e.aliases.map((a) => new RegExp(`(?<![\\w-])${esc(a)}(?![\\w-])`, "gi")),
  }));
}

export function countMatches(matcher, title, abstract) {
  const out = [];
  for (const { entry, patterns } of matcher) {
    let titleHits = 0;
    let absHits = 0;
    for (const re of patterns) {
      re.lastIndex = 0;
      titleHits += (title.match(re) || []).length;
      re.lastIndex = 0;
      absHits += (abstract.match(re) || []).length;
    }
    if (titleHits + absHits > 0) {
      out.push({ id: entry.id ?? entry.code, titleHits, absHits, score: titleHits * 4 + absHits });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

/** A survey name-checking 30 languages does not "study" all 30. */
export function selectStudied(hits, maxPrimary = 4) {
  if (hits.length === 0) return { primary: [], mentioned: [] };
  const titled = hits.filter((h) => h.titleHits > 0);
  if (titled.length > 0 && titled.length <= 6) {
    return { primary: titled.slice(0, maxPrimary).map((h) => h.id), mentioned: hits.map((h) => h.id) };
  }
  const top = hits[0].score;
  const strong = hits.filter((h) => h.score >= Math.max(1, top * 0.5));
  return { primary: strong.slice(0, maxPrimary).map((h) => h.id), mentioned: hits.map((h) => h.id) };
}

const DATASET_PATTERN =
  /\b([A-Z][A-Za-z0-9]{2,}(?:[- ][A-Z0-9][A-Za-z0-9]*){0,3})\s+(?:corpus|dataset|treebank|benchmark|corpora)\b/g;

const DATASET_STOPWORDS = new Set(
  `the this these those we our a an in for using new large small two three massive huge
   entire whole same such both each several many other another first second third text
   training test testing development gold raw parallel monolingual annotated labelled
   labeled target source news web social media benchmark evaluation standard full final
   original public open combined resulting proposed`
    .split(/\s+/)
    .filter(Boolean),
);

const CASE_SENSITIVE = /^[A-Z0-9-]{2,10}$/;

export function extractDatasets(text, knownMatcher, languageNames) {
  const found = new Map();
  for (const { entry, patterns } of knownMatcher) {
    const strict = CASE_SENSITIVE.test(entry.name);
    for (const re of patterns) {
      const probe = strict ? new RegExp(`(?<![\\w-])${esc(entry.name)}(?![\\w-])`) : re;
      probe.lastIndex = 0;
      if (probe.test(text)) {
        found.set(entry.name, (found.get(entry.name) ?? 0) + 1);
        break;
      }
    }
  }
  DATASET_PATTERN.lastIndex = 0;
  let m;
  while ((m = DATASET_PATTERN.exec(text)) !== null) {
    const name = m[1].trim();
    const lower = name.toLowerCase();
    if (name.length < 3 || name.length > 40) continue;
    if (DATASET_STOPWORDS.has(lower)) continue;
    if (languageNames.has(lower)) continue;
    found.set(name, (found.get(name) ?? 0) + 1);
  }
  return [...found.keys()].slice(0, 6);
}

export const NLP_SIGNAL =
  /\b(nlp|natural language|linguistic|corpus|corpora|text|speech|language model|translation|annotat|token|lexic|morpholog|syntax|semantic|sentiment|word|sentence|document|transformer|bert|embedding)/i;

/**
 * Builds the reusable enrichment closure. Returns null for papers that carry no
 * usable signal, so callers can count what was filtered and why.
 */
export function createEnricher(tax) {
  const { LANGUAGES, TASKS, METHODS, KNOWN_DATASETS, CODE_MIXED_ALIASES } = tax;
  const langMatcher = buildMatcher(LANGUAGES);
  const taskMatcher = buildMatcher(TASKS);
  const methodMatcher = buildMatcher(METHODS);
  const datasetMatcher = buildMatcher(KNOWN_DATASETS.map((d) => ({ name: d, aliases: [d] })));
  const codeMixRe = CODE_MIXED_ALIASES.map((a) => new RegExp(`(?<![\\w-])${esc(a)}(?![\\w-])`, "i"));
  const languageNames = new Set(
    LANGUAGES.flatMap((l) => [l.name.toLowerCase(), ...l.aliases.map((a) => a.toLowerCase())]),
  );

  return function enrich(title, abstract) {
    const text = `${title}. ${abstract}`;
    if (!NLP_SIGNAL.test(text)) return null;

    const langHits = countMatches(langMatcher, title, abstract);
    const taskHits = countMatches(taskMatcher, title, abstract);
    if (taskHits.length === 0 && langHits.length === 0) return null;

    const methodHits = countMatches(methodMatcher, title, abstract);
    const langs = selectStudied(langHits);
    const tasks = selectStudied(taskHits, 3);

    return {
      languages: langs.primary,
      languagesMentioned: langs.mentioned.slice(0, 12),
      tasks: tasks.primary,
      tasksMentioned: tasks.mentioned.slice(0, 6),
      methods: methodHits.slice(0, 4).map((h) => h.id),
      datasets: extractDatasets(text, datasetMatcher, languageNames),
      codeMixed: codeMixRe.some((re) => re.test(text)),
    };
  };
}

/** Title key for cross-source de-duplication. */
export function titleKey(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 90);
}
