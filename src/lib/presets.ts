/**
 * Starting points shown on the landing screen. An empty search box asks the
 * user to already know what they are looking for, which is precisely what
 * someone hunting for research gaps does not yet know.
 */

export interface Preset {
  id: string;
  title: string;
  query: string;
  languages: string[];
  tasks: string[];
  blurb: string;
  /** Rendered as the card's quiet subtitle — what this expedition tends to reveal. */
  expect: string;
}

export const PRESETS: Preset[] = [
  {
    id: "urdu",
    title: "Urdu NLP",
    query: "Urdu natural language processing",
    languages: ["ur"],
    tasks: [],
    blurb: "230M speakers, tier 2 resources.",
    expect: "Where a large language stays thinly covered",
  },
  {
    id: "toxicity",
    title: "Low-resource toxicity detection",
    query: "low-resource multilingual toxicity and hate speech detection",
    languages: [],
    tasks: ["toxicity"],
    blurb: "Safety work outside English.",
    expect: "How safety research concentrates on a handful of corpora",
  },
  {
    id: "codemix",
    title: "Code-mixed & romanised text",
    query: "code-mixed code-switching romanised social media text",
    languages: [],
    tasks: [],
    blurb: "How billions actually write online.",
    expect: "A phenomenon studied far less than it is used",
  },
  {
    id: "african",
    title: "African language technology",
    query: "African languages natural language processing resources",
    languages: ["sw", "yo", "ha", "am", "zu", "ig"],
    tasks: [],
    blurb: "Six languages, 200M+ speakers.",
    expect: "Which tasks the momentum has reached, and which it has not",
  },
  {
    id: "speech",
    title: "Speech for under-served languages",
    query: "speech recognition dataset under-resourced languages",
    languages: [],
    tasks: ["asr", "tts"],
    blurb: "Where audio data does not exist.",
    expect: "The sharpest resource cliff in the field",
  },
  {
    id: "llm-eval",
    title: "LLM evaluation beyond English",
    query: "large language model evaluation multilingual benchmark",
    languages: [],
    tasks: ["eval", "lm"],
    blurb: "Who the new benchmarks measure.",
    expect: "How fast evaluation is narrowing back to high-resource languages",
  },
];
