import type { ResourceTier } from "./taxonomy";

export interface Paper {
  id: string;
  title: string;
  abstract: string;
  year: number;
  authors: string[];
  affiliations: string[];
  venue: string;
  doi: string | null;
  url: string | null;
  oa: boolean;
  citations: number;
  /** Citation count where known, otherwise a venue-weight stand-in. */
  prominence: number;
  source: string;
  /** Languages the paper appears to actually study. */
  languages: string[];
  /** Every language mentioned, including passing references. */
  languagesMentioned: string[];
  tasks: string[];
  tasksMentioned: string[];
  methods: string[];
  datasets: string[];
  codeMixed: boolean;
  topics: string[];
}

export interface CorpusMeta {
  builtAt: string;
  source: string;
  paperCount: number;
  queryCount: number;
  yearRange: [number, number];
  languagesCovered: number;
  tasksCovered: number;
}

export interface Corpus {
  meta: CorpusMeta;
  papers: Paper[];
}

/* ------------------------------------------------------------------ */

export interface Scope {
  query: string;
  languages: string[];
  tasks: string[];
  yearFrom: number;
  yearTo: number;
}

export interface ScoredPaper {
  paper: Paper;
  score: number;
  /** Which query terms matched: drives the "why this paper" affordance. */
  matched: string[];
}

export interface FacetItem {
  id: string;
  label: string;
  count: number;
  share: number;
  /** Papers/yr over the last 3 years vs the 3 before that. */
  momentum: number;
  meta?: Record<string, string | number>;
}

export type CellState = "void" | "thin" | "emerging" | "active" | "saturated";

export interface MatrixCell {
  langCode: string;
  taskId: string;
  count: number;
  state: CellState;
  recentCount: number;
  /** Papers on this task in languages of the same family or adjacent tier. */
  peerCount: number;
}

export interface GapComponent {
  key: "scarcity" | "peer" | "momentum" | "impact" | "feasibility";
  label: string;
  /** 0–1 before weighting. */
  raw: number;
  /** Points contributed to the 0–100 total. */
  points: number;
  explanation: string;
}

export type GapKind =
  | "untouched"
  | "thin-evidence"
  | "single-dataset"
  | "method-lag"
  | "evaluation-void"
  | "cooling";

export interface Gap {
  id: string;
  kind: GapKind;
  langCode: string;
  langName: string;
  tier: ResourceTier;
  taskId: string;
  taskName: string;
  score: number;
  /**
   * True when the gap sits inside the language the user actually asked about.
   * Adjacent gaps are still surfaced, since a neighbouring language is often where
   * the method transfers, but they never outrank the user's own scope.
   */
  focus: boolean;
  components: GapComponent[];
  headline: string;
  reasoning: string;
  /** Counts that back the claim, each clickable through to papers. */
  evidence: {
    label: string;
    count: number;
    filter: { languages?: string[]; tasks?: string[]; datasets?: string[] };
  }[];
  questions: ResearchQuestion[];
  peerExamples: { langName: string; count: number }[];
  startingPoints: string[];
}

export interface ResearchQuestion {
  text: string;
  rationale: string;
  difficulty: "Starter" | "Substantial" | "Ambitious";
  /** e.g. "≈ 1 MSc thesis", helps a reader judge fit. */
  shape: string;
}

export interface TimelinePoint {
  year: number;
  count: number;
  /** Same year across the whole corpus, for a "share of field" comparison. */
  corpusCount: number;
  /** Dominant methodological era that year within the cohort. */
  era: string | null;
}

export interface DatasetConcentration {
  /** Herfindahl–Hirschman Index over dataset usage, 0–1. */
  hhi: number;
  verdict: string;
  topShare: number;
  topName: string | null;
  distinctDatasets: number;
  papersWithDataset: number;
}

export interface Theme {
  id: string;
  label: string;
  count: number;
  share: number;
  momentum: number;
  /** Terms unusually frequent here versus the whole corpus (log-odds). */
  distinctiveTerms: string[];
  topPapers: { id: string; title: string; year: number; citations: number }[];
  trend: "surging" | "growing" | "steady" | "cooling" | "dormant";
}

export interface Landscape {
  scope: Scope;
  resolved: {
    languages: { code: string; name: string; tier: ResourceTier }[];
    tasks: { id: string; name: string }[];
    /** Terms from the free-text query that were understood. */
    interpreted: string[];
    /** Terms we could not map onto the taxonomy. */
    unmatched: string[];
  };
  cohortSize: number;
  corpusSize: number;
  papers: ScoredPaper[];
  themes: Theme[];
  languageFacets: FacetItem[];
  taskFacets: FacetItem[];
  methodFacets: FacetItem[];
  datasetFacets: FacetItem[];
  venueFacets: FacetItem[];
  countryFacets: FacetItem[];
  timeline: TimelinePoint[];
  matrix: {
    languages: { code: string; name: string; tier: ResourceTier; total: number }[];
    tasks: { id: string; name: string; total: number }[];
    cells: MatrixCell[];
    max: number;
  };
  gaps: Gap[];
  /** Volume vs momentum, for the saturation/opportunity quadrant. */
  quadrant: {
    taskId: string;
    label: string;
    volume: number;
    momentum: number;
    quadrant: "emerging" | "hot" | "crowded" | "dormant";
  }[];
  concentration: DatasetConcentration;
  methodLag: {
    cohortMedianEra: string;
    corpusMedianEra: string;
    lagYears: number;
    verdict: string;
  };
  /**
   * How much weight the cohort can bear. A handful of loosely-matched papers
   * cannot support a confident claim about a field, and the interface should
   * say so rather than render the same assured layout over noise.
   */
  reliability: {
    level: "thin" | "moderate" | "good";
    note: string;
  };
  narrative: {
    headline: string;
    paragraphs: string[];
    /** Short, quotable facts for the summary strip. */
    signals: { label: string; value: string; detail: string }[];
  };
  equity: {
    /** Share of cohort papers whose only studied language is tier 4–5. */
    highResourceShare: number;
    lowResourceShare: number;
    speakersPerPaper: { langName: string; speakersM: number; papers: number; ratio: number }[];
  };
}
