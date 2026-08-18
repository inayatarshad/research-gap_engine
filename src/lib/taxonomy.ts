/**
 * Domain taxonomy for the Research Gap & Discovery Engine.
 *
 * Three gazetteers drive both ingest-time enrichment and query-time expansion:
 *   LANGUAGES: with resource tiers from Joshi et al. (ACL 2020), "The State and
 *                Fate of Linguistic Diversity and Inclusion in the NLP World".
 *   TASKS: NLP task taxonomy with surface aliases.
 *   METHODS: modelling families, bucketed by methodological era.
 *
 * Keeping this explicit (rather than letting an LLM guess) is what makes every
 * downstream number reproducible and auditable.
 */

export type ResourceTier = 0 | 1 | 2 | 3 | 4 | 5;

export interface LanguageEntry {
  /** Canonical display name. */
  name: string;
  /** ISO 639-1/3 code, used as a stable id. */
  code: string;
  /**
   * Joshi et al. (2020) class. 5 = "the winners" (English), 0 = "the left-behinds".
   * Lower tier => scarcer labelled + unlabelled data => higher gap opportunity.
   */
  tier: ResourceTier;
  /** Approximate speaker count in millions: used for the impact term. */
  speakersM: number;
  family: string;
  script: string;
  /** Surface forms to match in titles/abstracts. */
  aliases: string[];
}

export interface TaskEntry {
  name: string;
  id: string;
  /** Coarse grouping used for the landscape's task-mix chart. */
  group:
    | "Understanding"
    | "Generation"
    | "Resources"
    | "Social & Safety"
    | "Speech"
    | "Structure";
  aliases: string[];
}

export interface MethodEntry {
  name: string;
  id: string;
  era: "Rule-based" | "Statistical" | "Neural" | "Transformer" | "LLM";
  /** Approximate first-appearance year, used to date a subfield's frontier. */
  since: number;
  aliases: string[];
}

/* ------------------------------------------------------------------ *
 * Languages
 * ------------------------------------------------------------------ */

export const LANGUAGES: LanguageEntry[] = [
  // --- Tier 5 / 4: the reference points a gap is measured against ---
  { name: "English", code: "en", tier: 5, speakersM: 1500, family: "Indo-European", script: "Latin", aliases: ["english"] },
  { name: "Mandarin Chinese", code: "zh", tier: 5, speakersM: 1100, family: "Sino-Tibetan", script: "Han", aliases: ["chinese", "mandarin", "simplified chinese"] },
  { name: "Spanish", code: "es", tier: 5, speakersM: 560, family: "Indo-European", script: "Latin", aliases: ["spanish", "castilian"] },
  { name: "German", code: "de", tier: 5, speakersM: 135, family: "Indo-European", script: "Latin", aliases: ["german", "deutsch"] },
  { name: "French", code: "fr", tier: 5, speakersM: 310, family: "Indo-European", script: "Latin", aliases: ["french"] },
  { name: "Arabic", code: "ar", tier: 5, speakersM: 420, family: "Afro-Asiatic", script: "Arabic", aliases: ["arabic", "msa", "modern standard arabic"] },
  { name: "Japanese", code: "ja", tier: 5, speakersM: 125, family: "Japonic", script: "Japanese", aliases: ["japanese"] },
  { name: "Russian", code: "ru", tier: 4, speakersM: 260, family: "Indo-European", script: "Cyrillic", aliases: ["russian"] },
  { name: "Portuguese", code: "pt", tier: 4, speakersM: 260, family: "Indo-European", script: "Latin", aliases: ["portuguese", "brazilian portuguese"] },
  { name: "Italian", code: "it", tier: 4, speakersM: 68, family: "Indo-European", script: "Latin", aliases: ["italian"] },
  { name: "Dutch", code: "nl", tier: 4, speakersM: 25, family: "Indo-European", script: "Latin", aliases: ["dutch"] },
  { name: "Korean", code: "ko", tier: 4, speakersM: 82, family: "Koreanic", script: "Hangul", aliases: ["korean"] },
  { name: "Turkish", code: "tr", tier: 4, speakersM: 90, family: "Turkic", script: "Latin", aliases: ["turkish"] },
  { name: "Hindi", code: "hi", tier: 4, speakersM: 610, family: "Indo-European", script: "Devanagari", aliases: ["hindi"] },
  { name: "Persian", code: "fa", tier: 4, speakersM: 130, family: "Indo-European", script: "Arabic", aliases: ["persian", "farsi"] },
  { name: "Indonesian", code: "id", tier: 3, speakersM: 200, family: "Austronesian", script: "Latin", aliases: ["indonesian", "bahasa indonesia"] },
  { name: "Vietnamese", code: "vi", tier: 3, speakersM: 85, family: "Austroasiatic", script: "Latin", aliases: ["vietnamese"] },
  { name: "Hebrew", code: "he", tier: 3, speakersM: 9, family: "Afro-Asiatic", script: "Hebrew", aliases: ["hebrew"] },
  { name: "Greek", code: "el", tier: 3, speakersM: 13, family: "Indo-European", script: "Greek", aliases: ["greek"] },
  { name: "Polish", code: "pl", tier: 3, speakersM: 40, family: "Indo-European", script: "Latin", aliases: ["polish"] },
  { name: "Czech", code: "cs", tier: 3, speakersM: 11, family: "Indo-European", script: "Latin", aliases: ["czech"] },
  { name: "Thai", code: "th", tier: 3, speakersM: 60, family: "Kra-Dai", script: "Thai", aliases: ["thai"] },
  { name: "Romanian", code: "ro", tier: 3, speakersM: 24, family: "Indo-European", script: "Latin", aliases: ["romanian"] },
  { name: "Ukrainian", code: "uk", tier: 3, speakersM: 40, family: "Indo-European", script: "Cyrillic", aliases: ["ukrainian"] },
  { name: "Bengali", code: "bn", tier: 3, speakersM: 270, family: "Indo-European", script: "Bengali", aliases: ["bengali", "bangla"] },

  // --- Tier 2: some labelled data, thin unlabelled ---
  { name: "Urdu", code: "ur", tier: 2, speakersM: 230, family: "Indo-European", script: "Arabic", aliases: ["urdu", "roman urdu"] },
  { name: "Tamil", code: "ta", tier: 2, speakersM: 85, family: "Dravidian", script: "Tamil", aliases: ["tamil"] },
  { name: "Swahili", code: "sw", tier: 2, speakersM: 80, family: "Niger-Congo", script: "Latin", aliases: ["swahili", "kiswahili"] },
  { name: "Malay", code: "ms", tier: 2, speakersM: 80, family: "Austronesian", script: "Latin", aliases: ["malay", "bahasa melayu"] },
  { name: "Tagalog", code: "tl", tier: 2, speakersM: 82, family: "Austronesian", script: "Latin", aliases: ["tagalog", "filipino"] },
  { name: "Marathi", code: "mr", tier: 2, speakersM: 95, family: "Indo-European", script: "Devanagari", aliases: ["marathi"] },
  { name: "Telugu", code: "te", tier: 2, speakersM: 95, family: "Dravidian", script: "Telugu", aliases: ["telugu"] },
  { name: "Malayalam", code: "ml", tier: 2, speakersM: 38, family: "Dravidian", script: "Malayalam", aliases: ["malayalam"] },
  { name: "Kannada", code: "kn", tier: 2, speakersM: 60, family: "Dravidian", script: "Kannada", aliases: ["kannada"] },
  { name: "Gujarati", code: "gu", tier: 2, speakersM: 60, family: "Indo-European", script: "Gujarati", aliases: ["gujarati"] },
  { name: "Amharic", code: "am", tier: 2, speakersM: 35, family: "Afro-Asiatic", script: "Ge'ez", aliases: ["amharic"] },
  { name: "Nepali", code: "ne", tier: 2, speakersM: 32, family: "Indo-European", script: "Devanagari", aliases: ["nepali"] },
  { name: "Sinhala", code: "si", tier: 2, speakersM: 17, family: "Indo-European", script: "Sinhala", aliases: ["sinhala", "sinhalese"] },
  { name: "Yoruba", code: "yo", tier: 2, speakersM: 45, family: "Niger-Congo", script: "Latin", aliases: ["yoruba"] },
  { name: "Hausa", code: "ha", tier: 2, speakersM: 80, family: "Afro-Asiatic", script: "Latin", aliases: ["hausa"] },
  { name: "Punjabi", code: "pa", tier: 2, speakersM: 125, family: "Indo-European", script: "Gurmukhi", aliases: ["punjabi", "panjabi", "shahmukhi"] },

  // --- Tier 1 / 0: the left-behinds ---
  { name: "Pashto", code: "ps", tier: 1, speakersM: 60, family: "Indo-European", script: "Arabic", aliases: ["pashto", "pushto"] },
  { name: "Sindhi", code: "sd", tier: 1, speakersM: 32, family: "Indo-European", script: "Arabic", aliases: ["sindhi"] },
  { name: "Igbo", code: "ig", tier: 1, speakersM: 31, family: "Niger-Congo", script: "Latin", aliases: ["igbo"] },
  { name: "Zulu", code: "zu", tier: 1, speakersM: 28, family: "Niger-Congo", script: "Latin", aliases: ["zulu", "isizulu"] },
  { name: "Xhosa", code: "xh", tier: 1, speakersM: 19, family: "Niger-Congo", script: "Latin", aliases: ["xhosa", "isixhosa"] },
  { name: "Wolof", code: "wo", tier: 1, speakersM: 10, family: "Niger-Congo", script: "Latin", aliases: ["wolof"] },
  { name: "Oromo", code: "om", tier: 1, speakersM: 37, family: "Afro-Asiatic", script: "Latin", aliases: ["oromo", "afaan oromo"] },
  { name: "Tigrinya", code: "ti", tier: 1, speakersM: 9, family: "Afro-Asiatic", script: "Ge'ez", aliases: ["tigrinya"] },
  { name: "Somali", code: "so", tier: 1, speakersM: 22, family: "Afro-Asiatic", script: "Latin", aliases: ["somali"] },
  { name: "Khmer", code: "km", tier: 1, speakersM: 17, family: "Austroasiatic", script: "Khmer", aliases: ["khmer", "cambodian"] },
  { name: "Lao", code: "lo", tier: 1, speakersM: 30, family: "Kra-Dai", script: "Lao", aliases: ["lao", "laotian"] },
  { name: "Burmese", code: "my", tier: 1, speakersM: 43, family: "Sino-Tibetan", script: "Myanmar", aliases: ["burmese", "myanmar language"] },
  { name: "Uyghur", code: "ug", tier: 1, speakersM: 12, family: "Turkic", script: "Arabic", aliases: ["uyghur", "uighur"] },
  { name: "Kurdish", code: "ku", tier: 1, speakersM: 30, family: "Indo-European", script: "Arabic", aliases: ["kurdish", "kurmanji", "sorani"] },
  { name: "Assamese", code: "as", tier: 1, speakersM: 15, family: "Indo-European", script: "Bengali", aliases: ["assamese"] },
  { name: "Odia", code: "or", tier: 1, speakersM: 35, family: "Indo-European", script: "Odia", aliases: ["odia", "oriya"] },
  { name: "Tibetan", code: "bo", tier: 1, speakersM: 6, family: "Sino-Tibetan", script: "Tibetan", aliases: ["tibetan"] },
  { name: "Balochi", code: "bal", tier: 0, speakersM: 9, family: "Indo-European", script: "Arabic", aliases: ["balochi", "baluchi"] },
  { name: "Saraiki", code: "skr", tier: 0, speakersM: 26, family: "Indo-European", script: "Arabic", aliases: ["saraiki", "seraiki"] },
  { name: "Brahui", code: "brh", tier: 0, speakersM: 3, family: "Dravidian", script: "Arabic", aliases: ["brahui"] },
  { name: "Kashmiri", code: "ks", tier: 0, speakersM: 7, family: "Indo-European", script: "Arabic", aliases: ["kashmiri"] },
  { name: "Dhivehi", code: "dv", tier: 0, speakersM: 0.4, family: "Indo-European", script: "Thaana", aliases: ["dhivehi", "maldivian"] },
  { name: "Tswana", code: "tn", tier: 0, speakersM: 6, family: "Niger-Congo", script: "Latin", aliases: ["tswana", "setswana"] },
  { name: "Shona", code: "sn", tier: 0, speakersM: 12, family: "Niger-Congo", script: "Latin", aliases: ["shona"] },
  { name: "Luganda", code: "lg", tier: 0, speakersM: 11, family: "Niger-Congo", script: "Latin", aliases: ["luganda", "ganda"] },
  { name: "Twi", code: "tw", tier: 0, speakersM: 17, family: "Niger-Congo", script: "Latin", aliases: ["twi", "akan"] },
  { name: "Fulfulde", code: "ff", tier: 0, speakersM: 25, family: "Niger-Congo", script: "Latin", aliases: ["fulfulde", "fula", "fulani"] },
  { name: "Quechua", code: "qu", tier: 0, speakersM: 8, family: "Quechuan", script: "Latin", aliases: ["quechua"] },
  { name: "Guarani", code: "gn", tier: 0, speakersM: 6, family: "Tupian", script: "Latin", aliases: ["guarani"] },
  { name: "Nahuatl", code: "nah", tier: 0, speakersM: 2, family: "Uto-Aztecan", script: "Latin", aliases: ["nahuatl"] },
  { name: "Maori", code: "mi", tier: 0, speakersM: 0.2, family: "Austronesian", script: "Latin", aliases: ["maori", "te reo"] },
  { name: "Javanese", code: "jv", tier: 1, speakersM: 82, family: "Austronesian", script: "Latin", aliases: ["javanese"] },
  { name: "Sundanese", code: "su", tier: 1, speakersM: 32, family: "Austronesian", script: "Latin", aliases: ["sundanese"] },
  { name: "Bhojpuri", code: "bho", tier: 0, speakersM: 52, family: "Indo-European", script: "Devanagari", aliases: ["bhojpuri"] },
  { name: "Maithili", code: "mai", tier: 0, speakersM: 34, family: "Indo-European", script: "Devanagari", aliases: ["maithili"] },
];

/** Pseudo-language buckets: not languages, but first-class objects of study. */
export const CODE_MIXED_ALIASES = [
  "code-mixed",
  "code mixed",
  "code-mixing",
  "code mixing",
  "code-switched",
  "code switching",
  "code-switching",
  "romanized",
  "transliterated",
  "hinglish",
  "urdlish",
  "roman urdu",
  "banglish",
];

/* ------------------------------------------------------------------ *
 * Tasks
 * ------------------------------------------------------------------ */

export const TASKS: TaskEntry[] = [
  { name: "Machine Translation", id: "mt", group: "Generation", aliases: ["machine translation", "neural machine translation", "nmt", "translation system", "smt", "statistical machine translation"] },
  { name: "Sentiment Analysis", id: "sentiment", group: "Social & Safety", aliases: ["sentiment analysis", "sentiment classification", "opinion mining", "polarity detection", "aspect-based sentiment"] },
  { name: "Hate Speech & Toxicity", id: "toxicity", group: "Social & Safety", aliases: ["hate speech", "toxicity", "toxic", "offensive language", "abusive language", "cyberbullying", "hostility detection", "harmful content", "profanity", "aggression detection"] },
  { name: "Named Entity Recognition", id: "ner", group: "Structure", aliases: ["named entity recognition", "named entity", "ner", "entity extraction", "entity recognition", "nested ner"] },
  { name: "Part-of-Speech Tagging", id: "pos", group: "Structure", aliases: ["part-of-speech", "part of speech", "pos tagging", "morphological tagging", "tagger"] },
  { name: "Dependency Parsing", id: "parsing", group: "Structure", aliases: ["dependency parsing", "syntactic parsing", "constituency parsing", "treebank", "universal dependencies"] },
  { name: "Text Classification", id: "classification", group: "Understanding", aliases: ["text classification", "document classification", "topic classification", "text categorization", "intent classification"] },
  { name: "Question Answering", id: "qa", group: "Understanding", aliases: ["question answering", "reading comprehension", "extractive qa", "open-domain qa", "machine reading"] },
  { name: "Summarization", id: "summarization", group: "Generation", aliases: ["summarization", "summarisation", "abstractive summar", "extractive summar", "headline generation"] },
  { name: "Speech Recognition", id: "asr", group: "Speech", aliases: ["speech recognition", "asr", "automatic speech recognition", "speech-to-text", "spoken language"] },
  { name: "Text-to-Speech", id: "tts", group: "Speech", aliases: ["text-to-speech", "text to speech", "speech synthesis", "tts", "voice cloning"] },
  { name: "Information Retrieval", id: "ir", group: "Understanding", aliases: ["information retrieval", "document retrieval", "search engine", "ranking model", "dense retrieval", "semantic search"] },
  { name: "Language Modelling", id: "lm", group: "Generation", aliases: ["language model", "language modelling", "language modeling", "pretraining", "pre-training", "masked language model", "causal language model"] },
  { name: "Word Embeddings", id: "embeddings", group: "Resources", aliases: ["word embedding", "word vector", "distributional semantics", "sentence embedding", "word2vec", "fasttext"] },
  { name: "Corpus & Dataset Construction", id: "corpus", group: "Resources", aliases: ["corpus construction", "corpus development", "dataset creation", "annotated corpus", "we present a dataset", "new dataset", "benchmark dataset", "data collection", "treebank construction", "lexicon development"] },
  { name: "Morphological Analysis", id: "morphology", group: "Structure", aliases: ["morphological analysis", "morphological analyzer", "lemmatization", "stemming", "stemmer", "morpheme segmentation"] },
  { name: "Word Sense & Semantics", id: "semantics", group: "Understanding", aliases: ["word sense disambiguation", "semantic similarity", "semantic role labeling", "textual entailment", "natural language inference", "paraphrase detection"] },
  { name: "Misinformation & Fake News", id: "misinfo", group: "Social & Safety", aliases: ["fake news", "misinformation", "disinformation", "fact checking", "fact-checking", "claim verification", "rumour detection", "propaganda detection"] },
  { name: "Emotion Recognition", id: "emotion", group: "Social & Safety", aliases: ["emotion detection", "emotion recognition", "emotion classification", "affective computing", "sarcasm detection", "irony detection"] },
  { name: "Optical Character Recognition", id: "ocr", group: "Resources", aliases: ["optical character recognition", "ocr", "handwriting recognition", "text recognition", "document image"] },
  { name: "Dialogue & Conversational AI", id: "dialogue", group: "Generation", aliases: ["dialogue system", "conversational agent", "chatbot", "task-oriented dialogue", "response generation"] },
  { name: "Transliteration & Normalisation", id: "translit", group: "Resources", aliases: ["transliteration", "text normalization", "text normalisation", "spelling correction", "spell check", "grapheme-to-phoneme", "orthographic normalization"] },
  { name: "Cross-lingual Transfer", id: "xlingual", group: "Understanding", aliases: ["cross-lingual", "crosslingual", "zero-shot transfer", "multilingual transfer", "language transfer", "few-shot cross-lingual"] },
  { name: "Bias & Fairness Evaluation", id: "bias", group: "Social & Safety", aliases: ["bias evaluation", "social bias", "fairness", "stereotype", "debiasing", "representational harm"] },
  { name: "Model Evaluation & Benchmarking", id: "eval", group: "Resources", aliases: ["benchmark suite", "evaluation framework", "shared task", "leaderboard", "evaluation metric", "meta-evaluation"] },
  { name: "Language Identification", id: "langid", group: "Understanding", aliases: ["language identification", "language detection", "dialect identification", "dialect detection"] },
];

/* ------------------------------------------------------------------ *
 * Methods
 * ------------------------------------------------------------------ */

export const METHODS: MethodEntry[] = [
  { name: "Rule-based / Finite-state", id: "rules", era: "Rule-based", since: 1990, aliases: ["rule-based", "rule based", "finite-state", "finite state transducer", "hand-crafted rules", "grammar-based"] },
  { name: "Classical ML (SVM / NB / LR)", id: "classical", era: "Statistical", since: 1998, aliases: ["support vector machine", "svm", "naive bayes", "logistic regression", "random forest", "decision tree", "gradient boosting", "xgboost", "n-gram model", "tf-idf"] },
  { name: "HMM / CRF Sequence Models", id: "crf", era: "Statistical", since: 1996, aliases: ["conditional random field", "crf", "hidden markov model", "hmm", "structured perceptron"] },
  { name: "RNN / LSTM / GRU", id: "rnn", era: "Neural", since: 2013, aliases: ["lstm", "bilstm", "recurrent neural network", "rnn", "gru", "seq2seq", "sequence-to-sequence", "encoder-decoder"] },
  { name: "CNN", id: "cnn", era: "Neural", since: 2014, aliases: ["convolutional neural network", "cnn", "textcnn"] },
  { name: "Static Embeddings", id: "static_emb", era: "Neural", since: 2013, aliases: ["word2vec", "glove", "fasttext", "skip-gram", "cbow"] },
  { name: "BERT-family Encoders", id: "bert", era: "Transformer", since: 2018, aliases: ["bert", "roberta", "distilbert", "electra", "deberta", "albert", "encoder-only"] },
  { name: "Multilingual Pretrained Models", id: "mbert", era: "Transformer", since: 2019, aliases: ["mbert", "multilingual bert", "xlm-r", "xlm-roberta", "xlm", "mt5", "muril", "afriberta", "indicbert", "labse", "rembert"] },
  { name: "Transformer Seq2Seq", id: "t5", era: "Transformer", since: 2019, aliases: ["t5", "bart", "mbart", "pegasus", "marian", "transformer architecture"] },
  { name: "Large Language Models", id: "llm", era: "LLM", since: 2022, aliases: ["gpt-3", "gpt-4", "gpt-3.5", "chatgpt", "llama", "llama-2", "llama 3", "mistral", "gemini", "claude", "palm", "large language model", "llm", "instruction-tuned", "instruction tuning"] },
  { name: "Prompting & In-context Learning", id: "prompting", era: "LLM", since: 2021, aliases: ["prompting", "prompt engineering", "in-context learning", "chain-of-thought", "few-shot prompting", "zero-shot prompting"] },
  { name: "Parameter-efficient Fine-tuning", id: "peft", era: "LLM", since: 2021, aliases: ["lora", "adapter", "parameter-efficient", "peft", "qlora", "prefix tuning"] },
  { name: "Transfer & Multi-task Learning", id: "transfer", era: "Neural", since: 2017, aliases: ["transfer learning", "multi-task learning", "domain adaptation", "fine-tuning", "continual pretraining"] },
  { name: "Data Augmentation & Synthesis", id: "augment", era: "Neural", since: 2016, aliases: ["data augmentation", "back-translation", "backtranslation", "synthetic data", "self-training", "pseudo-labeling", "distant supervision"] },
  { name: "Knowledge Distillation & Compression", id: "distill", era: "Transformer", since: 2019, aliases: ["knowledge distillation", "model compression", "quantization", "pruning", "student model"] },
  { name: "Retrieval-Augmented Generation", id: "rag", era: "LLM", since: 2020, aliases: ["retrieval-augmented", "retrieval augmented generation", "rag", "retrieval-augmented generation"] },
];

/* ------------------------------------------------------------------ *
 * Well-known resources: matched literally, then supplemented by the
 * pattern-based extractor in scripts/ingest.mjs.
 * ------------------------------------------------------------------ */

export const KNOWN_DATASETS = [
  "Universal Dependencies", "UD Treebank", "OntoNotes", "CoNLL-2003", "CoNLL-2002",
  "WikiAnn", "MasakhaNER", "MasakhaNEWS", "AfriSenti", "NaijaSenti",
  "XNLI", "XTREME", "XGLUE", "XQuAD", "TyDi QA", "MLQA", "Belebele",
  "FLORES-200", "FLORES-101", "OPUS", "OSCAR", "CC-100", "mC4", "Common Crawl",
  "WMT", "IWSLT", "Tatoeba", "JW300", "Samanantar", "IndicCorp", "IndicGLUE",
  "AI4Bharat", "IndicNLPSuite", "Bhasha", "MuRIL",
  "HASOC", "OffensEval", "SemEval", "HatEval", "Jigsaw", "Davidson",
  "Founta", "OLID", "TRAC", "DravidianCodeMix", "HateCheck", "Multilingual HateCheck",
  "Twitter", "Reddit", "YouTube comments", "Facebook",
  "Wikipedia", "WikiText", "Leipzig Corpus", "Bible corpus", "PMIndia",
  "Common Voice", "FLEURS", "MLS", "VoxPopuli", "LibriSpeech",
  "MASSIVE", "Universal Declaration of Human Rights", "PAN", "GLUE", "SuperGLUE",
  "SQuAD", "MultiNLI", "SNLI", "PAWS-X", "Tatoeba Challenge",
  "EMILLE", "CLE Urdu", "UrduHack", "Roman Urdu Dataset", "COUNTER", "UNLT",
  "MegaCOV", "MultiCoNER", "Aya", "SEACrowd", "NusaX", "IndoNLU",
];

/* ------------------------------------------------------------------ *
 * Lookup helpers
 * ------------------------------------------------------------------ */

export const LANG_BY_CODE = new Map(LANGUAGES.map((l) => [l.code, l]));
export const TASK_BY_ID = new Map(TASKS.map((t) => [t.id, t]));
export const METHOD_BY_ID = new Map(METHODS.map((m) => [m.id, m]));

/** Tier label used across the UI. */
export const TIER_LABEL: Record<ResourceTier, string> = {
  0: "Left-behind",
  1: "Scraping-by",
  2: "Hopeful",
  3: "Rising star",
  4: "Underdog",
  5: "Winner",
};

/** Short gloss shown in tooltips, paraphrasing Joshi et al.'s class definitions. */
export const TIER_GLOSS: Record<ResourceTier, string> = {
  0: "Virtually no labelled or unlabelled data. Excluded from nearly all multilingual work.",
  1: "Some unlabelled text exists, but almost no labelled resources and little community.",
  2: "A collector's paradise: unlabelled data exists and labelling efforts have begun.",
  3: "A strong web presence and a growing cultural community pushing resources forward.",
  4: "Large unlabelled corpora and a good spread of labelled datasets across tasks.",
  5: "Dominant in NLP research; industrial investment and every benchmark by default.",
};

/* ------------------------------------------------------------------ *
 * Language groups
 *
 * People ask about regions and families ("African languages", "Dravidian",
 * "South Asian NLP") far more often than they enumerate language codes.
 * Without these, such a query degrades to free text and the analysis drifts
 * to whatever the retrieval happens to surface.
 * ------------------------------------------------------------------ */

export interface LanguageGroup {
  id: string;
  name: string;
  aliases: string[];
  codes: string[];
}

export const LANGUAGE_GROUPS: LanguageGroup[] = [
  {
    id: "african",
    name: "African languages",
    aliases: ["african languages", "african language", "african nlp", "africa nlp", "languages of africa"],
    codes: ["sw", "yo", "ha", "am", "zu", "ig", "xh", "wo", "om", "ti", "so", "tn", "sn", "lg", "tw", "ff"],
  },
  {
    id: "bantu",
    name: "Bantu languages",
    aliases: ["bantu"],
    codes: ["sw", "zu", "xh", "sn", "lg", "tn"],
  },
  {
    id: "south-asian",
    name: "South Asian languages",
    aliases: ["south asian", "south-asian", "indian languages", "indic languages", "indic", "languages of india", "subcontinent"],
    codes: ["hi", "ur", "bn", "ta", "te", "ml", "kn", "mr", "gu", "pa", "ne", "si", "as", "or", "sd", "ks", "bho", "mai", "skr"],
  },
  {
    id: "dravidian",
    name: "Dravidian languages",
    aliases: ["dravidian"],
    codes: ["ta", "te", "ml", "kn", "brh"],
  },
  {
    id: "southeast-asian",
    name: "Southeast Asian languages",
    aliases: ["southeast asian", "south-east asian", "south east asian", "sea languages"],
    codes: ["id", "ms", "tl", "vi", "th", "km", "lo", "my", "jv", "su"],
  },
  {
    id: "pakistani",
    name: "Languages of Pakistan",
    aliases: ["pakistani languages", "languages of pakistan", "pakistan nlp"],
    codes: ["ur", "pa", "sd", "ps", "bal", "skr", "brh", "ks"],
  },
  {
    id: "indigenous-american",
    name: "Indigenous American languages",
    aliases: ["indigenous languages", "indigenous american", "native american languages", "amerindian"],
    codes: ["qu", "gn", "nah"],
  },
  {
    id: "middle-eastern",
    name: "Middle Eastern languages",
    aliases: ["middle eastern", "middle-east", "west asian"],
    codes: ["ar", "fa", "he", "tr", "ku", "ps"],
  },
  {
    id: "arabic-script",
    name: "Arabic-script languages",
    aliases: ["arabic script", "arabic-script", "perso-arabic", "nastaliq"],
    codes: ["ar", "fa", "ur", "ps", "sd", "ug", "ku", "bal", "skr", "ks", "brh"],
  },
];

export const GROUP_BY_ID = new Map(LANGUAGE_GROUPS.map((g) => [g.id, g]));
