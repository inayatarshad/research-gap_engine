/**
 * Corpus builder.
 *
 *   ACL Anthology (complete bulk dump)  ─┐
 *                                        ├─►  dedupe ─► enrich ─► src/data/corpus.json
 *   OpenAlex sweep (journals, non-ACL)  ─┘
 *
 * The Anthology is the primary source: it is the venue of record for this field,
 * it includes LREC and the workshop tracks where most low-resource work appears,
 * and it ships abstracts. OpenAlex supplements it with journal and regional
 * publications that never reach an ACL venue, plus citation counts.
 *
 * Usage:  node scripts/build-corpus.mjs
 */

import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {
  ROOT,
  OUT_DIR,
  loadTaxonomy,
  createEnricher,
  titleKey,
} from "./lib/enrich.mjs";

const BIB_URL = "https://aclanthology.org/anthology+abstracts.bib.gz";
const CACHE = path.join(ROOT, ".cache", "anthology.bib");

/* ------------------------------------------------------------------ *
 * BibTeX
 * ------------------------------------------------------------------ */

/** Strips the brace-protection ACL uses for casing: "{M}etrical{ARGS}" -> "MetricalARGS". */
function cleanValue(v) {
  return v
    .replace(/[{}]/g, "")
    .replace(/\\&/g, "&")
    .replace(/\\%/g, "%")
    .replace(/\\_/g, "_")
    .replace(/\\"\{?(\w)\}?/g, "$1")
    .replace(/\\'\{?(\w)\}?/g, "$1")
    .replace(/\\`\{?(\w)\}?/g, "$1")
    .replace(/\\~\{?(\w)\}?/g, "$1")
    .replace(/\\^\{?(\w)\}?/g, "$1")
    .replace(/\\[a-zA-Z]+\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Reads one field value starting at `i`, handling quoted and braced forms. */
function readValue(src, i) {
  while (i < src.length && /\s/.test(src[i])) i++;
  const open = src[i];
  if (open === '"' || open === "{") {
    const close = open === '"' ? '"' : "}";
    let depth = 0;
    let j = i + 1;
    for (; j < src.length; j++) {
      const c = src[j];
      if (c === "\\") {
        j++;
        continue;
      }
      if (c === "{") depth++;
      else if (c === "}") {
        if (open === "{" && depth === 0) break;
        depth--;
      } else if (c === close && depth === 0) break;
    }
    return { value: src.slice(i + 1, j), next: j + 1 };
  }
  // Bare value, e.g. `month = may,`
  let j = i;
  while (j < src.length && !",\n}".includes(src[j])) j++;
  return { value: src.slice(i, j), next: j };
}

function* parseBib(src) {
  const entryRe = /@(\w+)\s*\{\s*([^,]+),/g;
  let m;
  while ((m = entryRe.exec(src)) !== null) {
    const type = m[1].toLowerCase();
    const key = m[2].trim();
    let i = entryRe.lastIndex;
    const fields = {};
    let depth = 0;
    while (i < src.length) {
      const c = src[i];
      if (c === "{") depth++;
      else if (c === "}") {
        if (depth === 0) break;
        depth--;
      } else if (/[a-zA-Z]/.test(c) && depth === 0) {
        const fm = /^([a-zA-Z]+)\s*=/.exec(src.slice(i, i + 40));
        if (fm) {
          const { value, next } = readValue(src, i + fm[0].length);
          fields[fm[1].toLowerCase()] = value;
          i = next;
          continue;
        }
      }
      i++;
    }
    entryRe.lastIndex = i;
    yield { type, key, fields };
  }
}

/* ------------------------------------------------------------------ *
 * Venue handling
 * ------------------------------------------------------------------ */

// Order matters: the specific conference patterns must be tested before the
// journal pattern, or "Association for Computational Linguistics" is swallowed
// by the "Computational Linguistics" journal rule.
const VENUE_RULES = [
  [/\bTransactions of the Association for Computational Linguistics\b/i, "TACL", 6],
  [/Findings of the Association for Computational Linguistics/i, "ACL Findings", 5],
  [/Annual Meeting of the Association for Computational Linguistics/i, "ACL", 6],
  [/Empirical Methods in Natural Language Processing/i, "EMNLP", 6],
  [/^Computational Linguistics(,|$| Volume)/i, "Computational Linguistics (journal)", 6],
  [/North American Chapter of the Association for Computational Linguistics/i, "NAACL", 6],
  [/European Chapter of the Association for Computational Linguistics/i, "EACL", 5],
  [/International Conference on Computational Linguistics|COLING/i, "COLING", 5],
  [/Language Resources and Evaluation Conference|LREC/i, "LREC", 5],
  [/Asia-Pacific Chapter|AACL/i, "AACL-IJCNLP", 4],
  [/International Joint Conference on Natural Language Processing|IJCNLP/i, "IJCNLP", 4],
  [/Conference on Machine Translation|\bWMT\b/i, "WMT", 4],
  [/Workshop on Semantic Evaluation|SemEval/i, "SemEval", 4],
  [/Conference on Computational Natural Language Learning|CoNLL/i, "CoNLL", 4],
  [/Spoken Language Translation|IWSLT/i, "IWSLT", 3],
  [/Technologies for Machine Translation of Low-Resource|LoResMT/i, "LoResMT", 3],
  [/African(?:NLP)?|AfricaNLP/i, "AfricaNLP", 3],
  [/Indian Language|WILDRE/i, "WILDRE", 3],
  [/South(?:east)? Asian|SEALP/i, "SE Asian NLP", 3],
  [/Speech and Language Technolog/i, "SLT Workshop", 3],
  [/Computational Approaches to Linguistic Code-Switching|CALCS/i, "CALCS", 3],
  [/Abusive Language|WOAH|Online Harms/i, "WOAH", 3],
];

/** "Proceedings of the 5th Workshop on Foo (WS 2021)" -> "Workshop on Foo". */
function tidyVenue(raw) {
  return raw
    .replace(/^Proceedings of (the )?/i, "")
    .replace(/^\d+(st|nd|rd|th)\s+/i, "")
    .replace(/\s*\(.*?\)\s*$/, "")
    .replace(/\s*,\s*(Volume|Part)\s.*$/i, "")
    .replace(/\s+\d{4}$/, "")
    .replace(/^(The\s+)?\d+(st|nd|rd|th)\s+/i, "")
    .trim()
    .slice(0, 62);
}

function resolveVenue(booktitle, journal) {
  const raw = (journal || booktitle || "").trim();
  if (!raw) return { venue: "ACL Anthology", weight: 2 };
  for (const [re, name, weight] of VENUE_RULES) {
    if (re.test(raw)) return { venue: name, weight };
  }
  // Keep the real workshop name rather than collapsing every workshop into one
  // bucket — venue diversity is itself part of the landscape.
  const cleaned = tidyVenue(raw);
  return { venue: cleaned || "ACL Anthology", weight: /workshop/i.test(raw) ? 2 : 3 };
}

/* ------------------------------------------------------------------ *
 * Relevance gate
 * ------------------------------------------------------------------ */

const SCARCITY_SIGNAL =
  /\b(low[- ]resource|under[- ]resourced|under[- ]represented|resource[- ]poor|scarce|endangered|indigenous|minority language|less[- ]resourced|multiling|cross[- ]lingual|crosslingual|zero[- ]shot|code[- ]mix|code[- ]switch|romani[sz]ed|transliterat|linguistic diversity|language coverage|dialect)/i;

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

async function ensureBib() {
  if (fsSync.existsSync(CACHE)) {
    const { size } = await fs.stat(CACHE);
    if (size > 10_000_000) return;
  }
  console.log("  downloading ACL Anthology bulk dump (~42 MB)…");
  const res = await fetch(BIB_URL, { signal: AbortSignal.timeout(600_000) });
  if (!res.ok) throw new Error(`Anthology download failed: HTTP ${res.status}`);
  const gz = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(path.dirname(CACHE), { recursive: true });
  await fs.writeFile(CACHE, zlib.gunzipSync(gz));
}

async function main() {
  console.log("\n  Research Gap Engine — corpus build\n");
  await ensureBib();

  const tax = await loadTaxonomy();
  const enrich = createEnricher(tax);
  const lowResourceNames = new RegExp(
    `\\b(${tax.LANGUAGES.filter((l) => l.tier <= 3)
      .flatMap((l) => l.aliases)
      .map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|")})\\b`,
    "i",
  );

  const src = await fs.readFile(CACHE, "utf8");
  console.log(`  parsing ${(src.length / 1048576).toFixed(0)} MB of BibTeX…`);

  const seen = new Map();
  const papers = [];
  let scanned = 0;
  let noAbstract = 0;
  let offTopic = 0;
  let notRelevant = 0;

  for (const entry of parseBib(src)) {
    if (entry.type === "proceedings") continue;
    scanned++;
    const f = entry.fields;
    const title = cleanValue(f.title || "");
    const abstract = cleanValue(f.abstract || "");
    if (!title) continue;
    if (abstract.length < 120) {
      noAbstract++;
      continue;
    }

    const text = `${title}. ${abstract}`;
    // Gate: the paper must plausibly concern a lower-resource or multilingual
    // setting. Without this the Anthology's 130k English-centric papers swamp
    // every statistic.
    if (!SCARCITY_SIGNAL.test(text) && !lowResourceNames.test(text)) {
      notRelevant++;
      continue;
    }

    const tags = enrich(title, abstract);
    if (!tags) {
      offTopic++;
      continue;
    }

    const key = titleKey(title);
    if (seen.has(key)) continue;

    const year = Number(f.year) || 0;
    if (year < 2008) continue;
    const { venue, weight } = resolveVenue(cleanValue(f.booktitle || ""), cleanValue(f.journal || ""));

    const paper = {
      id: `acl:${entry.key}`,
      title,
      abstract: abstract.length > 900 ? `${abstract.slice(0, 900)}…` : abstract,
      year,
      authors: cleanValue(f.author || "")
        .split(/\s+and\s+/)
        .map((a) => {
          const [last, first] = a.split(",").map((s) => s.trim());
          return first ? `${first} ${last}` : last;
        })
        .filter(Boolean)
        .slice(0, 6),
      affiliations: [],
      venue,
      doi: f.doi ? `https://doi.org/${cleanValue(f.doi)}` : null,
      url: cleanValue(f.url || "") || null,
      oa: true,
      citations: 0,
      prominence: weight,
      source: "ACL Anthology",
      topics: [],
      ...tags,
    };
    seen.set(key, papers.length);
    papers.push(paper);
  }

  console.log(`  Anthology: ${papers.length} papers kept from ${scanned} scanned`);
  console.log(`    dropped — no abstract ${noAbstract} · out of scope ${notRelevant} · untaggable ${offTopic}`);

  /* --- merge the OpenAlex sweep -------------------------------- */

  let merged = 0;
  let enrichedWithCitations = 0;
  const oaPath = path.join(OUT_DIR, "openalex-corpus.json");
  if (fsSync.existsSync(oaPath)) {
    const oa = JSON.parse(await fs.readFile(oaPath, "utf8"));
    for (const p of oa.papers) {
      const key = titleKey(p.title);
      const existing = seen.get(key);
      if (existing !== undefined) {
        // Same paper from both sources: keep the Anthology record but take the
        // citation count, which the Anthology does not carry.
        if (p.citations > 0) {
          papers[existing].citations = p.citations;
          papers[existing].prominence = Math.max(papers[existing].prominence, p.citations);
          enrichedWithCitations++;
        }
        continue;
      }
      seen.set(key, papers.length);
      papers.push({
        ...p,
        id: `oa:${p.id}`,
        abstract: p.abstract.length > 900 ? `${p.abstract.slice(0, 900)}…` : p.abstract,
        prominence: p.citations || 1,
        source: "OpenAlex",
      });
      merged++;
    }
    console.log(`  OpenAlex: +${merged} unique papers, ${enrichedWithCitations} citation counts merged in`);
  }

  papers.sort((a, b) => b.year - a.year || b.prominence - a.prominence);

  const years = papers.map((p) => p.year).filter(Boolean);
  const meta = {
    builtAt: new Date().toISOString(),
    source: "ACL Anthology + OpenAlex",
    paperCount: papers.length,
    queryCount: 0,
    yearRange: [Math.min(...years), Math.max(...years)],
    languagesCovered: new Set(papers.flatMap((p) => p.languages)).size,
    tasksCovered: new Set(papers.flatMap((p) => p.tasks)).size,
    venueCount: new Set(papers.map((p) => p.venue)).size,
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  const outFile = path.join(OUT_DIR, "corpus.json");
  await fs.writeFile(outFile, JSON.stringify({ meta, papers }));
  const { size } = await fs.stat(outFile);

  console.log(`
  ── corpus built ─────────────────────────────
   papers            ${meta.paperCount}
   years             ${meta.yearRange[0]}–${meta.yearRange[1]}
   languages tagged  ${meta.languagesCovered}
   tasks tagged      ${meta.tasksCovered}
   venues            ${meta.venueCount}
   file size         ${(size / 1048576).toFixed(1)} MB
  ─────────────────────────────────────────────
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
