import type { Landscape } from "./types";
import { TIER_LABEL } from "./taxonomy";

/**
 * Renders a landscape as a self-contained Markdown research brief.
 *
 * The export is deliberately verbose about method and limitations: the point of
 * the tool is to make a defensible argument about where the gaps are, and a
 * brief that hides how its numbers were produced cannot be defended in a
 * supervision meeting.
 */
export function renderBrief(l: Landscape): string {
  const date = new Date().toISOString().slice(0, 10);
  const scopeLine = [
    l.scope.query && `“${l.scope.query}”`,
    l.resolved.languages.length && `languages: ${l.resolved.languages.map((x) => x.name).join(", ")}`,
    l.resolved.tasks.length && `tasks: ${l.resolved.tasks.map((x) => x.name).join(", ")}`,
    `years ${l.scope.yearFrom}–${l.scope.yearTo}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const out: string[] = [];

  out.push(`# Research Gap Brief`);
  out.push(``);
  out.push(`**Scope**: ${scopeLine}`);
  out.push(`**Generated**: ${date} by HERMÈS, over ${l.corpusSize.toLocaleString()} indexed papers`);
  out.push(``);
  out.push(`> ${l.narrative.headline}`);
  out.push(``);

  out.push(`## At a glance`);
  out.push(``);
  out.push(`| Signal | Value | Detail |`);
  out.push(`| --- | --- | --- |`);
  for (const s of l.narrative.signals) out.push(`| ${s.label} | ${s.value} | ${s.detail} |`);
  out.push(``);

  out.push(`## The landscape`);
  out.push(``);
  for (const p of l.narrative.paragraphs) out.push(`${p}\n`);

  out.push(`## Research themes`);
  out.push(``);
  for (const t of l.themes) {
    out.push(
      `- **${t.label}**: ${t.count} papers (${Math.round(t.share * 100)}% of cohort), ${t.trend}, ${t.momentum.toFixed(2)}× momentum. Distinctive terms: ${t.distinctiveTerms.join(", ") || ", "}.`,
    );
  }
  out.push(``);

  out.push(`## Coverage`);
  out.push(``);
  out.push(`**Languages studied**`);
  out.push(``);
  out.push(`| Language | Tier | Papers | Share | Momentum |`);
  out.push(`| --- | --- | --- | --- | --- |`);
  for (const f of l.languageFacets.slice(0, 14)) {
    const tier = f.meta?.tier;
    out.push(
      `| ${f.label} | ${tier !== undefined ? `T${tier} ${TIER_LABEL[tier as 0]}` : ", "} | ${f.count} | ${Math.round(f.share * 100)}% | ${f.momentum.toFixed(2)}× |`,
    );
  }
  out.push(``);

  out.push(`**Tasks**`);
  out.push(``);
  out.push(`| Task | Papers | Share | Momentum |`);
  out.push(`| --- | --- | --- | --- |`);
  for (const f of l.taskFacets.slice(0, 14)) {
    out.push(`| ${f.label} | ${f.count} | ${Math.round(f.share * 100)}% | ${f.momentum.toFixed(2)}× |`);
  }
  out.push(``);

  if (l.datasetFacets.length) {
    out.push(`**Most-reused resources**: ${l.datasetFacets.slice(0, 10).map((d) => `${d.label} (${d.count})`).join(", ")}`);
    out.push(``);
    out.push(`Dataset concentration (HHI): **${l.concentration.hhi.toFixed(2)}**. ${l.concentration.verdict}`);
    out.push(``);
  }

  out.push(`## Coverage voids`);
  out.push(``);
  const voids = l.matrix.cells.filter((c) => c.state === "void");
  if (voids.length === 0) {
    out.push(`Every language × task pairing shown in the matrix has at least one indexed paper.`);
  } else {
    out.push(`Pairings with no indexed paper, ordered by how much evidence exists in related languages:`);
    out.push(``);
    const name = (code: string) => l.matrix.languages.find((x) => x.code === code)?.name ?? code;
    const task = (id: string) => l.matrix.tasks.find((x) => x.id === id)?.name ?? id;
    for (const c of [...voids].sort((a, b) => b.peerCount - a.peerCount).slice(0, 16)) {
      out.push(`- **${name(c.langCode)} × ${task(c.taskId)}**: 0 indexed papers; ${c.peerCount} in related languages.`);
    }
  }
  out.push(``);

  out.push(`## Ranked opportunities`);
  out.push(``);
  l.gaps.forEach((g, i) => {
    out.push(`### ${i + 1}. ${g.headline}`);
    out.push(``);
    out.push(
      `**Score ${g.score}/100** · ${g.langName} (tier ${g.tier}, ${TIER_LABEL[g.tier]}) × ${g.taskName}${g.focus ? " · in your scope" : " · adjacent to your scope"}`,
    );
    out.push(``);
    out.push(g.reasoning);
    out.push(``);
    out.push(`| Component | Points | Basis |`);
    out.push(`| --- | --- | --- |`);
    for (const c of g.components) out.push(`| ${c.label} | ${c.points.toFixed(1)} | ${c.explanation} |`);
    out.push(``);
    if (g.peerExamples.length) {
      out.push(`Already demonstrated in: ${g.peerExamples.map((p) => `${p.langName} (${p.count})`).join(", ")}.`);
      out.push(``);
    }
    out.push(`**Questions this supports**`);
    out.push(``);
    for (const q of g.questions) {
      out.push(`- *${q.text}*`);
      out.push(`  - ${q.rationale}`);
      out.push(`  - ${q.difficulty} · ${q.shape}`);
    }
    out.push(``);
    if (g.startingPoints.length) {
      out.push(`**Read first**`);
      out.push(``);
      for (const s of g.startingPoints) out.push(`- ${s}`);
      out.push(``);
    }
  });

  out.push(`## Method and limitations`);
  out.push(``);
  out.push(
    `Papers come from the ACL Anthology bulk export supplemented with OpenAlex records, filtered to work touching lower-resource or multilingual settings. Language, task, method and dataset tags are assigned by matching an explicit gazetteer against each title and abstract, no model inference, so every count here is reproducible from the source text.`,
  );
  out.push(``);
  out.push(
    `Language resource tiers follow Joshi et al. (2020), *The State and Fate of Linguistic Diversity and Inclusion in the NLP World*. Momentum compares the last three publication years against the three before. Dataset concentration is a Herfindahl–Hirschman Index over named resources, where 0.25 is the conventional threshold for a highly concentrated market.`,
  );
  out.push(``);
  out.push(`**Limitations worth stating plainly.** Absence from this index is not proof of absence from the literature: a paper is missed if it has no abstract, sits outside the indexed venues, or names its language or task in vocabulary the gazetteer does not carry. Tags reflect what a paper *mentions*, which over-counts languages listed in passing by multilingual surveys. Counts are therefore a defensible starting point for a literature search, not a substitute for one.`);
  out.push(``);

  return out.join("\n");
}
