/**
 * Corpus builder for the Research Gap & Discovery Engine.
 *
 *   OpenAlex  ->  dedupe  ->  taxonomy enrichment  ->  src/data/corpus.json
 *
 * The enrichment step is deliberately rule-based rather than model-based: every
 * language / task / method / dataset label attached to a paper can be traced
 * back to a specific surface string in its title or abstract, which is what
 * makes the downstream gap statistics auditable.
 *
 * Usage:  node scripts/ingest.mjs [--limit N] [--quick]
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "src", "data");

const MAILTO = process.env.OPENALEX_MAILTO || "sidraharshad04@gmail.com";
const API = "https://api.openalex.org/works";
const PER_PAGE = 100;
const FROM_YEAR = 2008;

const args = process.argv.slice(2);
const QUICK = args.includes("--quick");

/* ------------------------------------------------------------------ *
 * Taxonomy (mirrored from src/lib/taxonomy.ts via a tiny TS-strip load)
 * ------------------------------------------------------------------ */

async function loadTaxonomy() {
  const src = await fs.readFile(path.join(ROOT, "src", "lib", "taxonomy.ts"), "utf8");
  // Strip TS type annotations well enough to eval the data arrays.
  const js = src
    .replace(/^import[\s\S]*?;$/gm, "")
    .replace(/export interface [\s\S]*?\n}\n/g, "")
    .replace(/export type [^\n]*\n/g, "")
    .replace(/:\s*(LanguageEntry|TaskEntry|MethodEntry)\[\]\s*=/g, " =")
    .replace(/:\s*Record<ResourceTier,\s*string>\s*=/g, " =")
    .replace(/export const/g, "const");
  const mod = `${js}\nexport { LANGUAGES, TASKS, METHODS, KNOWN_DATASETS, CODE_MIXED_ALIASES };`;
  const tmp = path.join(OUT_DIR, ".taxonomy.mjs");
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(tmp, mod);
  const loaded = await import(`file://${tmp}?v=${Date.now()}`);
  await fs.unlink(tmp).catch(() => {});
  return loaded;
}

/* ------------------------------------------------------------------ *
 * HTTP with retry
 * ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** OpenAlex throttles bursts; back off hard and long rather than dropping queries. */
async function getJSON(url, attempt = 0) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": `research-gap-engine (mailto:${MAILTO})` },
      signal: AbortSignal.timeout(45000),
    });
    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get("retry-after")) || 0;
      throw Object.assign(new Error(`HTTP ${res.status}`), { retryAfter });
    }
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    if (attempt >= 6) {
      process.stdout.write(` !`);
      return null;
    }
    const wait = err?.retryAfter
      ? err.retryAfter * 1000
      : Math.min(30000, 2000 * 2 ** attempt) + Math.random() * 800;
    await sleep(wait);
    return getJSON(url, attempt + 1);
  }
}

const SELECT = [
  "id", "doi", "title", "publication_year", "authorships", "primary_location",
  "cited_by_count", "abstract_inverted_index", "type", "open_access",
  "referenced_works_count", "topics", "language",
].join(",");

async function search(query, perPage = PER_PAGE) {
  const url =
    `${API}?filter=title_and_abstract.search:${encodeURIComponent(query)}` +
    `,from_publication_date:${FROM_YEAR}-01-01,type:article|preprint|book-chapter` +
    `&per-page=${perPage}&select=${SELECT}&mailto=${encodeURIComponent(MAILTO)}`;
  const data = await getJSON(url);
  return data?.results ?? [];
}

/* ------------------------------------------------------------------ *
 * Query plan
 * ------------------------------------------------------------------ */

function buildQueries(LANGUAGES, TASKS) {
  const queries = [];
  const lowResource = LANGUAGES.filter((l) => l.tier <= 3);
  const midHigh = LANGUAGES.filter((l) => l.tier >= 4);

  // 1. Per-language sweeps — the backbone of the corpus.
  for (const lang of lowResource) {
    queries.push(`${lang.name} natural language processing`);
    queries.push(`${lang.name} corpus dataset annotation`);
    queries.push(`${lang.name} text classification model`);
    if (!QUICK) {
      queries.push(`${lang.name} machine translation low-resource`);
      queries.push(`${lang.name} language model pretrained`);
    }
  }

  // 2. High-resource anchors — needed so "under-studied" is measured against
  //    something rather than asserted.
  for (const lang of midHigh) {
    queries.push(`${lang.name} natural language processing benchmark`);
    queries.push(`${lang.name} hate speech sentiment dataset`);
  }

  // 3. Task sweeps framed around scarcity.
  for (const task of TASKS) {
    queries.push(`low-resource languages ${task.name}`);
    if (!QUICK) queries.push(`multilingual ${task.name} evaluation`);
  }

  // 4. Cross-cutting themes.
  const themes = [
    "code-mixed social media text processing",
    "code-switching language identification",
    "Roman Urdu sentiment analysis",
    "romanized text normalization south asian",
    "linguistic diversity NLP inclusion",
    "language coverage multilingual models",
    "African languages natural language processing",
    "South Asian languages NLP resources",
    "indigenous languages language technology",
    "endangered language documentation computational",
    "digital divide language technology",
    "zero-shot cross-lingual transfer unseen languages",
    "annotation guidelines low-resource language",
    "data scarcity neural machine translation",
    "participatory research African NLP",
    "multilingual toxicity detection cross-lingual",
    "offensive language identification Dravidian",
    "speech dataset under-resourced language",
    "benchmark contamination multilingual evaluation",
    "large language models low-resource languages evaluation",
    "cultural bias multilingual language models",
    "tokenizer fertility low-resource languages",
  ];
  for (const t of themes) queries.push(t);

  return [...new Set(queries)];
}

/* ------------------------------------------------------------------ *
 * Abstract reconstruction
 * ------------------------------------------------------------------ */

function inflateAbstract(inv) {
  if (!inv) return "";
  const slots = [];
  for (const [word, positions] of Object.entries(inv)) {
    for (const p of positions) slots[p] = word;
  }
  return slots.join(" ").replace(/\s+/g, " ").trim();
}

/* ------------------------------------------------------------------ *
 * Enrichment
 * ------------------------------------------------------------------ */

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function buildMatcher(entries, key = "aliases") {
  return entries.map((e) => ({
    entry: e,
    patterns: e[key].map((a) => new RegExp(`(?<![\\w-])${esc(a)}(?![\\w-])`, "gi")),
  }));
}

function countMatches(matcher, title, abstract) {
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

const DATASET_PATTERN =
  /\b([A-Z][A-Za-z0-9]{2,}(?:[- ][A-Z0-9][A-Za-z0-9]*){0,3})\s+(?:corpus|dataset|treebank|benchmark|corpora)\b/g;

/**
 * Words that the "<Name> corpus" pattern picks up but which name a language,
 * a size or a generic noun rather than an actual resource.
 */
const DATASET_STOPWORDS = new Set(
  [
    "the", "this", "these", "those", "we", "our", "a", "an", "in", "for", "using",
    "new", "large", "small", "two", "three", "massive", "huge", "entire", "whole",
    "same", "such", "both", "each", "several", "many", "other", "another", "first",
    "second", "third", "text", "training", "test", "testing", "development", "gold",
    "raw", "parallel", "monolingual", "annotated", "labelled", "labeled", "target",
    "source", "news", "web", "social", "media", "twitter data", "our own",
  ].map((w) => w.toLowerCase()),
);

/** Short all-caps entries collide with ordinary words, so match them case-sensitively. */
const CASE_SENSITIVE_DATASETS = /^[A-Z0-9-]{2,10}$/;

function extractDatasets(text, knownMatcher, languageNames) {
  const found = new Map();
  for (const { entry, patterns } of knownMatcher) {
    const strict = CASE_SENSITIVE_DATASETS.test(entry.name);
    for (const re of patterns) {
      const probe = strict
        ? new RegExp(`(?<![\\w-])${esc(entry.name)}(?![\\w-])`)
        : re;
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
    // "Bengali corpus" describes the language, not a named resource.
    if (languageNames.has(lower)) continue;
    found.set(name, (found.get(name) ?? 0) + 1);
  }
  return [...found.keys()].slice(0, 6);
}

/** Papers that mention 20 languages equally are surveys, not studies of each. */
function selectStudied(hits, maxPrimary = 4) {
  if (hits.length === 0) return { primary: [], mentioned: [] };
  const titled = hits.filter((h) => h.titleHits > 0);
  if (titled.length > 0 && titled.length <= 6) {
    return {
      primary: titled.slice(0, maxPrimary).map((h) => h.id),
      mentioned: hits.map((h) => h.id),
    };
  }
  const top = hits[0].score;
  // A single abstract mention is still evidence; only drop the long tail of a
  // survey that name-checks two dozen languages.
  const strong = hits.filter((h) => h.score >= Math.max(1, top * 0.5));
  return {
    primary: strong.slice(0, maxPrimary).map((h) => h.id),
    mentioned: hits.map((h) => h.id),
  };
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

async function main() {
  const { LANGUAGES, TASKS, METHODS, KNOWN_DATASETS, CODE_MIXED_ALIASES } = await loadTaxonomy();

  const langMatcher = buildMatcher(LANGUAGES);
  const taskMatcher = buildMatcher(TASKS);
  const methodMatcher = buildMatcher(METHODS);
  const datasetMatcher = buildMatcher(
    KNOWN_DATASETS.map((d) => ({ name: d, aliases: [d] })),
  );
  const codeMixRe = CODE_MIXED_ALIASES.map(
    (a) => new RegExp(`(?<![\\w-])${esc(a)}(?![\\w-])`, "i"),
  );
  const languageNames = new Set(
    LANGUAGES.flatMap((l) => [l.name.toLowerCase(), ...l.aliases.map((a) => a.toLowerCase())]),
  );

  const queries = buildQueries(LANGUAGES, TASKS);
  console.log(`\n  Research Gap Engine — corpus ingest`);
  console.log(`  ${queries.length} OpenAlex queries queued\n`);

  const raw = new Map();
  let done = 0;

  const CONCURRENCY = 2;
  for (let i = 0; i < queries.length; i += CONCURRENCY) {
    const batch = queries.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((q) => search(q)));
    for (const list of results) {
      for (const w of list) if (w?.id) raw.set(w.id, w);
    }
    done += batch.length;
    process.stdout.write(
      `\n  fetched ${String(done).padStart(4)}/${queries.length} queries · ${raw.size} unique works`,
    );
    await sleep(450);
  }
  console.log(`\n\n  ${raw.size} unique works retrieved. Enriching…`);

  const papers = [];
  let skippedNoAbstract = 0;
  let skippedOffTopic = 0;

  const NLP_SIGNAL =
    /\b(nlp|natural language|linguistic|corpus|corpora|text|speech|language model|translation|annotat|token|lexic|morpholog|syntax|semantic|sentiment|word|sentence|document|transformer|bert|embedding)/i;

  for (const w of raw.values()) {
    const title = (w.title || "").trim();
    const abstract = inflateAbstract(w.abstract_inverted_index);
    if (!title) continue;
    if (abstract.length < 120) {
      skippedNoAbstract++;
      continue;
    }
    const text = `${title}. ${abstract}`;
    if (!NLP_SIGNAL.test(text)) {
      skippedOffTopic++;
      continue;
    }

    const langHits = countMatches(langMatcher, title, abstract);
    const taskHits = countMatches(taskMatcher, title, abstract);
    const methodHits = countMatches(methodMatcher, title, abstract);

    // Require at least a task or a language signal; otherwise it is generic.
    if (taskHits.length === 0 && langHits.length === 0) {
      skippedOffTopic++;
      continue;
    }

    const langs = selectStudied(langHits);
    const tasks = selectStudied(taskHits, 3);

    const venue =
      w.primary_location?.source?.display_name?.replace(/\s*\(.*?\)\s*$/, "") || "Unindexed";

    papers.push({
      id: w.id.replace("https://openalex.org/", ""),
      title,
      abstract: abstract.length > 1800 ? `${abstract.slice(0, 1800)}…` : abstract,
      year: w.publication_year ?? 0,
      authors: (w.authorships ?? [])
        .slice(0, 6)
        .map((a) => a.author?.display_name)
        .filter(Boolean),
      affiliations: [
        ...new Set(
          (w.authorships ?? [])
            .flatMap((a) => (a.institutions ?? []).map((i) => i.country_code))
            .filter(Boolean),
        ),
      ].slice(0, 6),
      venue,
      doi: w.doi ?? null,
      url: w.primary_location?.landing_page_url ?? w.doi ?? null,
      oa: Boolean(w.open_access?.is_oa),
      citations: w.cited_by_count ?? 0,
      languages: langs.primary,
      languagesMentioned: langs.mentioned.slice(0, 12),
      tasks: tasks.primary,
      tasksMentioned: tasks.mentioned.slice(0, 6),
      methods: methodHits.slice(0, 4).map((h) => h.id),
      datasets: extractDatasets(text, datasetMatcher, languageNames),
      codeMixed: codeMixRe.some((re) => re.test(text)),
      topics: (w.topics ?? []).slice(0, 2).map((t) => t.display_name),
    });
  }

  papers.sort((a, b) => b.year - a.year || b.citations - a.citations);

  const years = papers.map((p) => p.year).filter(Boolean);
  const meta = {
    builtAt: new Date().toISOString(),
    source: "OpenAlex",
    paperCount: papers.length,
    queryCount: queries.length,
    yearRange: [Math.min(...years), Math.max(...years)],
    languagesCovered: new Set(papers.flatMap((p) => p.languages)).size,
    tasksCovered: new Set(papers.flatMap((p) => p.tasks)).size,
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(
    path.join(OUT_DIR, "corpus.json"),
    JSON.stringify({ meta, papers }),
  );

  console.log(`
  ── corpus built ─────────────────────────────
   papers kept        ${meta.paperCount}
   dropped (no abs)   ${skippedNoAbstract}
   dropped (off-topic)${String(skippedOffTopic).padStart(4)}
   years              ${meta.yearRange[0]}–${meta.yearRange[1]}
   languages tagged   ${meta.languagesCovered}
   tasks tagged       ${meta.tasksCovered}
   written to         src/data/corpus.json
  ─────────────────────────────────────────────
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
