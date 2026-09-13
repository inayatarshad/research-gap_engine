# Lacuņa

**Every field has a map. We trace what is left uncharted.**

Lacuņa maps what NLP research is studying and, more usefully, what it keeps skipping. It scores
under-researched language and task pairings, argues why each one is a real gap rather than a
non-problem, and shows the papers behind every number it prints.

Built over **16,612 papers**, **79 languages**, **26 tasks** and **1,722 venues**, spanning
2008 to 2026.

*Used to scope a **top 25 of 250+** entry at **NeuroLogic '26: Global NLP Datathon**.*

> A *lacuna* is a gap in a manuscript, the place where the text is missing.

---

## The problem

Finding a research gap normally means reading for months and noticing an absence. Three things go
wrong with that.

1. **It does not scale.** A literature review is bounded by how much one person can read.
2. **An absence is ambiguous.** Nothing published on a topic can mean it is untouched, or that it
   is a non-problem. Reading alone cannot separate the two.
3. **The bias is invisible from inside.** If your field studies English, the shape of what it skips
   never appears in the papers you read, only in the ones nobody wrote.

The corpus bears this out. **48%** of papers carrying a language tag never leave the highest
resource tier. Saraiki has roughly **13 million speakers for every indexed paper** written about
it, against **3,577** for English.

## What it does

For any language and task pairing it asks five questions: how little exists here, how much exists
in comparable languages, whether the field is moving on this, how many people speak it, and whether
there is enough groundwork to start. Those terms produce a score out of 100, always shown decomposed
so a reader can disagree with the weighting rather than the conclusion.

- **A coverage matrix where the voids are the point.** Empty cells are hatched in copper, not left
  blank: a blank cell in a heatmap reads as "no data" when here it means "no research". Hovering an
  empty cell reports how many related languages have solved the same task, which is the adjacency
  argument that separates a real gap from a non-problem.
- **Peer evidence weighted by transfer plausibility.** Shared script counts for more than shared
  family, because "Indo-European" is far too coarse to justify a claim that a method transfers from
  Polish to Urdu.
- **Dataset concentration (HHI).** When most results in an area come from one corpus, published
  performance describes that corpus as much as it describes the language. When most papers name no
  resource at all, it says that instead, which is the more telling signal.
- **A saturation and opportunity quadrant.** Volume against momentum: crowded and cooling in one
  corner, emerging and sparse in another.
- **Every number is a button.** Any statistic opens a drawer with the actual papers behind it. A
  claim that cannot be resolved to records does not get made.
- **No dead ends.** An exact scope that matches nothing is reported as the finding it is. The engine
  widens along a fallback ladder to show the nearest evidence while the ranked gaps stay centred on
  the original question.
- **An honest reliability guard.** A cohort too small to characterise a field says so, above the
  analysis rather than in a footnote.
- **Exportable brief and shareable links.** Every run produces a Markdown research brief including
  method and limitations, and a URL that reopens the exact analysis.

## Used in practice

Lacuņa was built to answer a question about a field, and it was first put to work on one.
**Challenge 3 of NeuroLogic '26: Global NLP Datathon** asked for a multi-label classifier detecting
threats, obscenity, insults and identity-based hate across multilingual text, scored on mean
ROC-AUC.

It served as the reconnaissance step before any modelling. The coverage matrix showed which
languages carried genuine toxicity literature and which were close to empty, and the concentration
index exposed how far published toxicity work leans on a small number of corpora. That shaped two
decisions: which languages to treat as transfer sources rather than train targets, and where a
strong reported benchmark score was likely to be corpus-specific rather than evidence of real
generalisation.

The entry placed **top 25 out of 250+ projects**.

## Method

| Stage | Approach |
| --- | --- |
| Corpus | ACL Anthology complete bulk export, supplemented with an OpenAlex sweep for journal and regional venues that never reach an ACL venue |
| Filtering | Papers must touch a lower-resource or multilingual setting and carry a usable abstract |
| Tagging | Explicit gazetteer matched against title and abstract, no model inference, so every count is reproducible from source text |
| Resource tiers | Joshi et al. (ACL 2020), *The State and Fate of Linguistic Diversity and Inclusion in the NLP World* |
| Retrieval | BM25 over title and abstract with taxonomy expansion, where a query naming a concept is expanded to every surface form before scoring |
| Themes | Log-odds ratio with an informative Dirichlet prior (Monroe et al. 2008) against the whole corpus |
| Concentration | Herfindahl-Hirschman Index over named resources, where 0.25 is the conventional "highly concentrated" threshold |

Taxonomy expansion is what lets *"toxic language in Roman Urdu"* reach a paper titled *"Abusive
content detection for code-mixed Urdu-English"*, a match plain keyword search misses entirely.
Because the expansion table is explicit rather than learned, the interface can show precisely which
concepts it understood.

### Limitations, stated plainly

Absence from this index is not proof of absence from the literature. A paper is missed if it has no
abstract, sits outside the indexed venues, or names its language in vocabulary the gazetteer does
not carry. Tags reflect what a paper *mentions*, which over-counts languages listed in passing by
multilingual surveys. Treat these counts as a defensible starting point for a literature search,
not a replacement for one.

## Running it

```bash
npm install
```

The corpus ships in `data/corpus.json`, so the app runs immediately:

```bash
npm run dev
```

- `/` is the landing page: what the system is, the problem, the vision, and how it works.
- `/studio` is the system itself.

To rebuild the corpus from source (downloads about 42 MB from the ACL Anthology, takes a few
minutes):

```bash
npm run build:corpus
```

To exercise the engine without booting Next:

```bash
npm run smoke -- "Urdu NLP"
```

## Deploying

A standard Next.js App Router project that deploys to Vercel unchanged. The corpus is read from disk
at runtime and traced into the serverless bundle via `outputFileTracingIncludes`, so there is no
database and no environment variable to set.

```bash
npx vercel deploy --prod
```

Cold start is about 3 s while the corpus is parsed and the inverted index is built. Warm requests
return in roughly 250 ms. The runtime footprint is about 410 MB RSS, 175 MB of it the parsed corpus
and the rest an inverted index over 57,730 distinct terms. Both are process-wide singletons, and
Fluid Compute reuses instances across concurrent requests, so that cost is paid once per instance
rather than once per request.

## Architecture

```
data/corpus.json              16,612 enriched papers (generated, committed)

scripts/
  build-corpus.mjs            ACL Anthology + OpenAlex -> enriched corpus
  ingest.mjs                  OpenAlex sweep (supplementary source)
  lib/enrich.mjs              shared gazetteer matching
  smoke.ts                    engine harness, no Next required

src/lib/
  taxonomy.ts                 languages with resource tiers, tasks, methods, language groups
  retrieval.ts                BM25 with taxonomy expansion
  analysis.ts                 the gap engine: facets, matrix, scoring, narrative
  engine.ts                   server-side singletons and the widening ladder
  overview.ts                 corpus figures for the landing page
  brief.ts                    Markdown export

src/components/
  landing/                    landing page: glass nav, kinetic type, constellation,
                              carousel, architecture diagram
  Studio.tsx                  the system: scope, results, evidence drawer
```

Papers are never sent to the client. The 23 MB corpus stays server-side behind three routes:
`/api/landscape` for a full analysis, `/api/preview` for the live scope counter, and `/api/evidence`
for resolving any statistic back to its papers.

## Stack

Next.js 16, React 19, TypeScript, Tailwind v4. No database, no model API, no runtime dependency
beyond the framework. The analysis is deterministic, which is what makes it reproducible and
auditable.
