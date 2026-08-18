# HERMÈS, Research Gap & Discovery Engine

**Every field has a shape. The holes have one too.**

HERMÈS maps what NLP research is studying and, more usefully, what it keeps skipping. It scores
under-researched language and task pairings, argues why each one is a real gap rather than a
non-problem, and shows the papers behind every number it prints.

Built over **16,605 papers** spanning **73 languages**, **26 tasks** and **2008–2026**.

---

## Why this exists

Finding a research gap is normally done by reading for months and noticing an absence. That works,
but it does not scale and it cannot tell you whether the absence you found is a genuine opportunity
or a subject nobody studies because it does not matter.

HERMÈS makes that judgement explicit. For any language × task pairing it asks: *how little exists
here, how much exists in comparable languages, is the field moving on this, how many people speak
it, and is there enough groundwork to start?* Those five terms produce a score, and the score is
always shown decomposed so a reader can disagree with the weighting rather than the conclusion.

## What makes it more than a search box

- **A coverage matrix where the voids are the point.** Empty cells are hatched in copper, not left
  blank: a blank cell in a heatmap reads as "no data" when here it means "no research". Hover an
  empty cell and it tells you how many related languages have solved the same task: the adjacency
  argument that separates a real gap from a non-problem.
- **Peer evidence weighted by transfer plausibility.** Shared script counts for more than shared
  family, because "Indo-European" is far too coarse to justify a claim that methods transfer from
  Polish to Urdu.
- **Dataset concentration (HHI).** When most results in an area come from one corpus, published
  performance describes that corpus as much as it describes the language. If most papers name no
  resource at all, it says that instead, the more telling signal.
- **A saturation/opportunity quadrant.** Volume against momentum: crowded and cooling in one
  corner, emerging and sparse in another.
- **Every number is a button.** Any statistic opens a drawer with the actual papers behind it.
  This is the credibility contract: a claim that cannot be resolved to records does not get made.
- **An honest reliability guard.** A cohort too small to characterise a field says so, in the
  interface, above the analysis.
- **Exportable brief.** A full Markdown research brief, including method and limitations.
- **Shareable URLs.** Every analysis has a link that reopens it exactly.

## Method

| Stage | Approach |
| --- | --- |
| Corpus | ACL Anthology complete bulk export, supplemented with an OpenAlex sweep for journal and regional venues that never reach an ACL venue |
| Filtering | Papers must touch a lower-resource or multilingual setting, and carry a usable abstract |
| Tagging | Explicit gazetteer matched against title and abstract, no model inference, so every count is reproducible from source text |
| Resource tiers | Joshi et al. (ACL 2020), *The State and Fate of Linguistic Diversity and Inclusion in the NLP World* |
| Retrieval | BM25 over title + abstract with taxonomy expansion, a query naming a concept is expanded to every surface form before scoring |
| Themes | Log-odds ratio with an informative Dirichlet prior (Monroe et al. 2008) against the whole corpus |
| Concentration | Herfindahl–Hirschman Index over named resources; 0.25 is the conventional "highly concentrated" threshold |

Taxonomy expansion is what lets *"toxic language in Roman Urdu"* reach a paper titled *"Abusive
content detection for code-mixed Urdu-English"*, a match plain keyword search misses entirely.
Because the expansion table is explicit rather than learned, the interface can show the user
precisely which concepts it understood.

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

To rebuild the corpus from source (downloads ~42 MB from the ACL Anthology, takes a few minutes):

```bash
npm run build:corpus
```

To exercise the engine without booting Next:

```bash
npm run smoke -- "Urdu NLP"
```

## Deploying

The app is a standard Next.js App Router project and deploys to Vercel unchanged. The corpus is read
from disk at runtime and traced into the serverless bundle via `outputFileTracingIncludes`, so no
database or environment variable is required.

```bash
npx vercel deploy --prod
```

Cold start is ~3 s while the 23 MB corpus is parsed and the inverted index is built; subsequent
requests on a warm instance return in ~250 ms.

## Architecture

```
data/corpus.json            16,605 enriched papers (generated, committed)
scripts/
  build-corpus.mjs          ACL Anthology + OpenAlex -> enriched corpus
  ingest.mjs                OpenAlex sweep (supplementary source)
  lib/enrich.mjs            shared gazetteer matching
  smoke.ts                  engine harness, no Next required
src/lib/
  taxonomy.ts               languages (with tiers), tasks, methods, groups
  retrieval.ts              BM25 + taxonomy expansion
  analysis.ts               the gap engine: facets, matrix, scoring, narrative
  engine.ts                 server-side singletons
  brief.ts                  Markdown export
src/components/             the interface
```

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind v4. No database, no model API, no runtime
dependencies beyond the framework: the analysis is deterministic, which is what makes it
reproducible and auditable.
