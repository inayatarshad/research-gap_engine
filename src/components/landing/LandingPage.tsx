"use client";

import Link from "next/link";

import type { Overview } from "@/lib/overview";
import { PRESETS } from "@/lib/presets";

import { Counter, Reveal, useInView } from "../motion";
import { Architecture } from "./Architecture";
import { Carousel } from "./Carousel";
import { GlassNav } from "./GlassNav";
import { KineticLine, Rotator, ScrollWords } from "./Kinetic";
import { Constellation } from "./Constellation";

/**
 * Seven sections, in the order an unconvinced reader needs them:
 * the claim, the problem, the vision, what it solves, how it works,
 * how it is built, and where to start.
 */
export function LandingPage({ overview }: { overview: Overview }) {
  return (
    <>
      <GlassNav />

      <main style={{ paddingBottom: 90 }}>
        <Hero overview={overview} />

        <div className="wrap" style={{ display: "grid", gap: "clamp(72px, 9vw, 116px)" }}>
          <Problem overview={overview} />
          <Statement />
          <Vision />
          <Solves overview={overview} />
          <How overview={overview} />
          <Build />
          <Start />
        </div>
      </main>
    </>
  );
}

/* ================================================================== *
 * 1. Hero
 * ================================================================== */

function Hero({ overview }: { overview: Overview }) {
  return (
    <section id="hero" style={{ position: "relative", overflow: "hidden" }}>
      <div
        className="blob"
        style={{ width: 460, height: 460, left: "-6%", top: -60, background: "#c6d0e9", animation: "drift 20s ease-in-out infinite" }}
      />
      <div
        className="blob"
        style={{ width: 400, height: 400, right: "-4%", top: 40, background: "#ecdcc4", animation: "drift 26s ease-in-out infinite reverse" }}
      />

      <div className="wrap hero-grid" style={{ position: "relative", paddingTop: "clamp(120px, 13vw, 158px)" }}>
        <div>
        <div
          className="eyebrow"
          style={{ display: "flex", gap: 9, alignItems: "center", marginBottom: 20, animation: "fade .8s ease .5s both" }}
        >
          <span style={{ position: "relative", width: 7, height: 7 }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: 99, background: "var(--sage)" }} />
            <span style={{ position: "absolute", inset: 0, borderRadius: 99, background: "var(--sage)", animation: "pulseRing 2.4s cubic-bezier(0,0,.2,1) infinite" }} />
          </span>
          Research gap and discovery engine
        </div>

        <h1
          className="display"
          style={{ fontSize: "clamp(29px, 3.9vw, 55px)", margin: 0, fontWeight: 300, whiteSpace: "nowrap" }}
        >
          <KineticLine text="Every field has a shape." delay={0.1} />
          <br />
          <KineticLine text="The holes have one too." delay={0.42} color="var(--copper)" weight={400} />
        </h1>

        <div
          style={{
            marginTop: 24,
            fontSize: "clamp(16px, 1.7vw, 20px)",
            color: "var(--muted)",
            maxWidth: 720,
            lineHeight: 1.6,
            animation: "fade .9s ease 1.05s both",
          }}
        >
          Lacuņa reads {overview.papers.toLocaleString()} papers to find what nobody has studied in{" "}
          <Rotator words={["Urdu", "Sindhi", "Yoruba", "Saraiki", "Amharic", "Maithili"]} />
        </div>

        <div style={{ display: "flex", gap: 11, marginTop: 30, flexWrap: "wrap", animation: "fade .9s ease 1.25s both" }}>
          <Link href="/studio" className="btn btn-primary" style={{ padding: "12px 22px", fontSize: 14.5 }}>
            Enter system
            <span aria-hidden style={{ opacity: 0.75 }}>→</span>
          </Link>
          <a href="#problem" className="btn" style={{ padding: "12px 20px", fontSize: 14.5 }}>
            Why it exists
          </a>
        </div>

        <HeroMetrics overview={overview} />
        </div>

        <div className="hero-figure">
          <Constellation overview={overview} />
        </div>
      </div>
    </section>
  );
}

/** Compact headline figures under the hero copy. */
function HeroMetrics({ overview }: { overview: Overview }) {
  const [ref, seen] = useInView<HTMLDivElement>("-20px");
  const items = [
    { v: overview.papers, s: "", l: "papers indexed" },
    { v: overview.languages, s: "", l: "languages tagged" },
    { v: overview.highResourceShare * 100, s: "%", l: "study English or peers only", accent: true },
  ];
  return (
    <div
      ref={ref}
      className="hairline"
      style={{ display: "flex", gap: "clamp(22px, 4vw, 46px)", marginTop: 38, paddingTop: 22, flexWrap: "wrap" }}
    >
      {items.map((m, i) => (
        <div key={m.l}>
          <div
            className="display"
            style={{
              fontSize: "clamp(26px, 3vw, 36px)",
              lineHeight: 1,
              fontWeight: 400,
              color: m.accent ? "var(--copper)" : "var(--ink)",
              marginBottom: 6,
            }}
          >
            <Counter value={m.v} active={seen} suffix={m.s} delay={i * 110} />
          </div>
          <div className="eyebrow" style={{ fontSize: 9, maxWidth: 132, lineHeight: 1.4 }}>{m.l}</div>
        </div>
      ))}
    </div>
  );
}

/* ================================================================== *
 * 2. The problem
 * ================================================================== */

function Problem({ overview }: { overview: Overview }) {
  const [ref, seen] = useInView<HTMLDivElement>("-70px");
  const worst = overview.underServed[0];

  const facts = [
    {
      value: overview.highResourceShare * 100,
      suffix: "%",
      label: "of papers study English or its peers only",
      body: "Out of every paper in the corpus carrying a language tag, roughly half never leave the highest-resource tier.",
      accent: true,
    },
    {
      value: worst ? Math.round(worst.ratio) : 0,
      suffix: "M",
      label: `speakers per paper for ${worst?.name ?? "the worst served language"}`,
      body: `Tier ${worst?.tier ?? 0}, and the whole indexed literature on it amounts to ${worst?.papers ?? 0} papers.`,
    },
    {
      value: overview.voids,
      suffix: `/${overview.totalCells}`,
      label: "pairings with no paper at all",
      body: "In a small sample of ten languages against eight common tasks, this many combinations have never been published on.",
    },
  ];

  return (
    <section id="problem" style={{ scrollMarginTop: 110 }} ref={ref}>
      <Head
        kicker="01 · The problem"
        title="Finding a gap means reading for months, and still guessing"
        sub="A researcher choosing a direction has to hold an entire literature in their head, then bet that the absence they noticed is real and not simply a subject nobody needs."
      />

      <div className="fact-grid">
        {facts.map((f, i) => (
          <div
            key={f.label}
            className="card"
            style={{
              padding: "22px 22px 20px",
              opacity: seen ? 1 : 0,
              transform: seen ? "none" : "translateY(16px)",
              transition: `opacity .6s ease ${i * 0.1}s, transform .6s cubic-bezier(.22,1,.36,1) ${i * 0.1}s`,
            }}
          >
            <div
              className="display"
              style={{
                fontSize: "clamp(38px, 5vw, 56px)",
                lineHeight: 1,
                fontWeight: 300,
                color: f.accent ? "var(--copper)" : "var(--ink)",
                marginBottom: 12,
              }}
            >
              <Counter value={f.value} active={seen} suffix={f.suffix} delay={i * 110} />
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 500, marginBottom: 8, lineHeight: 1.4 }}>{f.label}</div>
            <div style={{ fontSize: 13.4, color: "var(--muted)", lineHeight: 1.6 }}>{f.body}</div>
          </div>
        ))}
      </div>

      <div className="prob-grid" style={{ marginTop: 18 }}>
        <div className="card" style={{ padding: "24px 26px" }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Three failures compound</div>
          <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 14 }}>
            {[
              ["It does not scale.", "A literature review is bounded by how much one person can read, so the map is always a decade and a subfield wide at best."],
              ["An absence is ambiguous.", "Nothing published on a topic can mean it is untouched, or that it is a non-problem. Reading alone cannot separate the two."],
              ["The bias is invisible from inside.", "If your field studies English, the shape of what it skips never appears in the papers you read, only in the ones that were never written."],
            ].map(([t, b]) => (
              <li key={t} style={{ fontSize: 14.4, lineHeight: 1.6 }}>
                <strong style={{ fontWeight: 600 }}>{t}</strong>{" "}
                <span style={{ color: "var(--muted)" }}>{b}</span>
              </li>
            ))}
          </ol>
        </div>
        <Inequality overview={overview} />
      </div>
    </section>
  );
}

function Inequality({ overview }: { overview: Overview }) {
  const [ref, seen] = useInView<HTMLDivElement>("-60px");
  const rows = overview.underServed;
  const max = Math.max(...rows.map((r) => r.ratio));

  return (
    <div ref={ref} className="card" style={{ padding: "24px 26px" }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>Speakers carried per indexed paper</div>
      <p style={{ margin: "0 0 16px", fontSize: 13.4, color: "var(--muted)", lineHeight: 1.55 }}>
        Millions of people who speak the language, divided by how much research exists on it.
      </p>
      <div style={{ display: "grid", gap: 11 }}>
        {rows.map((r, i) => (
          <div key={r.code} style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span style={{ minWidth: 78, fontSize: 13.5 }}>{r.name}</span>
            <span className="tier" data-t={r.tier} style={{ fontSize: 9, flexShrink: 0 }}>T{r.tier}</span>
            <div style={{ flex: 1, height: 20, background: "rgba(17,34,80,.05)", borderRadius: 5, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: seen ? `${Math.max(4, (r.ratio / max) * 100)}%` : "0%",
                  background: "linear-gradient(90deg, var(--sapphire), var(--copper))",
                  borderRadius: 5,
                  transition: `width 1.1s cubic-bezier(.22,1,.36,1) ${i * 0.08}s`,
                }}
              />
            </div>
            <span className="mono" style={{ minWidth: 116, textAlign: "right", fontSize: 12, color: "var(--muted)" }}>
              {Math.round(r.ratio)}M
              <span style={{ color: "var(--faint)" }}> · {r.papers} papers</span>
            </span>
          </div>
        ))}
      </div>
      <p className="hairline" style={{ marginTop: 16, paddingTop: 13, fontSize: 13.2, color: "var(--muted)", lineHeight: 1.55 }}>
        English holds {overview.topLanguages[0]?.papers.toLocaleString()} papers in the same corpus.
      </p>
    </div>
  );
}

/**
 * A single line written word by word as the reader scrolls through it. This is
 * the one place on the page where the typography is driven by scroll position
 * rather than by a timer.
 */
function Statement() {
  return (
    <section aria-label="Thesis" style={{ padding: "clamp(20px, 4vw, 56px) 0" }}>
      <ScrollWords
        text="A field records what it studied. It never records what it skipped, so the absence has to be measured instead of read."
        accentFrom={9}
      />
    </section>
  );
}

/* ================================================================== *
 * 3. The vision
 * ================================================================== */

const PRINCIPLES = [
  {
    n: "Absence is data",
    body: "An empty cell is not a missing record. It is a finding, and it should be scored, ranked and defended like any other result.",
  },
  {
    n: "A gap must be argued",
    body: "Nothing published is only interesting when comparable languages have solved the same task. That adjacency is what separates an opportunity from a non-problem.",
  },
  {
    n: "Every number is checkable",
    body: "A statistic with no path back to its records is a claim, not evidence. Each figure opens the papers that produced it.",
  },
  {
    n: "No black box",
    body: "Tags come from an explicit gazetteer, not model inference, so the same query returns the same answer and a reader can audit the reasoning.",
  },
];

function Vision() {
  const [ref, seen] = useInView<HTMLDivElement>("-70px");
  return (
    <section id="vision" style={{ scrollMarginTop: 110 }} ref={ref}>
      <Head
        kicker="02 · The vision"
        title="Treat the blank space as a measurable object"
        sub="If a field's coverage can be counted, then so can its absences. That turns choosing a research direction from an act of intuition into an argument with evidence attached."
      />
      <div className="principle-grid">
        {PRINCIPLES.map((p, i) => (
          <div
            key={p.n}
            className="glass"
            style={{
              borderRadius: 16,
              padding: "20px 22px",
              opacity: seen ? 1 : 0,
              transform: seen ? "none" : "translateY(16px)",
              transition: `opacity .6s ease ${i * 0.09}s, transform .6s cubic-bezier(.22,1,.36,1) ${i * 0.09}s`,
            }}
          >
            <div className="mono" style={{ fontSize: 11, color: "var(--copper)", marginBottom: 12, letterSpacing: ".1em" }}>
              {String(i + 1).padStart(2, "0")}
            </div>
            <div className="serif" style={{ fontSize: 18, marginBottom: 9, lineHeight: 1.25 }}>{p.n}</div>
            <p style={{ margin: 0, fontSize: 13.6, color: "var(--muted)", lineHeight: 1.62 }}>{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ================================================================== *
 * 4. What it solves
 * ================================================================== */

function Solves({ overview }: { overview: Overview }) {
  const [ref, seen] = useInView<HTMLDivElement>("-70px");
  const { languages, tasks, cells, scale } = overview.matrix;

  return (
    <section id="solves" style={{ scrollMarginTop: 110 }} ref={ref}>
      <Head
        kicker="03 · What it solves"
        title="The map, with its holes drawn in"
        sub={`Ten languages against eight common tasks. ${overview.voids} of these ${overview.totalCells} pairings have no indexed paper, and the hatched squares are exactly where a new contribution has no competition.`}
      />

      <div className="card" style={{ padding: "24px 26px", overflowX: "auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `minmax(104px, 132px) repeat(${tasks.length}, minmax(40px, 1fr))`,
            gap: 5,
            minWidth: 620,
            maxWidth: 940,
            marginInline: "auto",
          }}
        >
          <div />
          {tasks.map((t) => (
            <div
              key={t.id}
              className="eyebrow"
              style={{
                fontSize: 9,
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                height: 84,
                justifySelf: "center",
                textAlign: "right",
              }}
            >
              {t.short}
            </div>
          ))}

          {languages.map((l, li) => (
            <MatrixRow key={l.code} lang={l} li={li} tasks={tasks} counts={cells[li]} scale={scale} seen={seen} />
          ))}
        </div>

        <div className="hairline" style={{ marginTop: 18, paddingTop: 14, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Swatch label="no paper" voidCell />
          <Swatch label="a few" alpha={0.28} />
          <Swatch label="well covered" alpha={1} />
        </div>
      </div>
    </section>
  );
}

function MatrixRow({
  lang,
  li,
  tasks,
  counts,
  scale,
  seen,
}: {
  lang: { code: string; name: string; tier: 0 | 1 | 2 | 3 | 4 | 5 };
  li: number;
  tasks: { id: string; name: string }[];
  counts: number[];
  scale: number;
  seen: boolean;
}) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, paddingRight: 6 }}>
        <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lang.name}</span>
        <span className="tier" data-t={lang.tier} style={{ fontSize: 9 }}>T{lang.tier}</span>
      </div>
      {tasks.map((t, ti) => {
        const n = counts[ti];
        const v = n === 0 ? null : Math.min(1, Math.log1p(n) / Math.log1p(scale * 1.6));
        const delay = (li * tasks.length + ti) * 0.012;
        return (
          <div
            key={t.id}
            title={`${lang.name} × ${t.name}: ${n} papers`}
            style={{
              aspectRatio: "2 / 1",
              minHeight: 26,
              maxHeight: 48,
              borderRadius: 4,
              border: "1px solid rgba(255,255,255,.6)",
              background:
                v === null
                  ? "repeating-linear-gradient(-45deg, transparent 0 4px, rgba(162,102,47,.3) 4px 5px), #faf7f0"
                  : `rgba(17,34,80,${0.1 + v * 0.86})`,
              opacity: seen ? 1 : 0,
              transform: seen ? "none" : "scale(.7)",
              transition: `opacity .45s ease ${delay}s, transform .45s cubic-bezier(.22,1,.36,1) ${delay}s`,
            }}
          />
        );
      })}
    </>
  );
}

function Swatch({ label, alpha, voidCell }: { label: string; alpha?: number; voidCell?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
      <span
        style={{
          width: 16,
          height: 12,
          borderRadius: 3,
          border: "1px solid rgba(255,255,255,.6)",
          background: voidCell
            ? "repeating-linear-gradient(-45deg, transparent 0 4px, rgba(162,102,47,.3) 4px 5px), #faf7f0"
            : `rgba(17,34,80,${0.1 + (alpha ?? 0) * 0.86})`,
        }}
      />
      <span className="eyebrow" style={{ fontSize: 9 }}>{label}</span>
    </span>
  );
}

/* ================================================================== *
 * 5. How it works
 * ================================================================== */

function How({ overview }: { overview: Overview }) {
  return (
    <section id="how" style={{ scrollMarginTop: 110 }}>
      <Head
        kicker="04 · How it works"
        title="Four moves, from a phrase to a defensible shortlist"
        sub="Each step is visible in the interface, and each one can be interrogated rather than taken on trust."
      />
      <Carousel overview={overview} />
    </section>
  );
}

/* ================================================================== *
 * 6. How it is built
 * ================================================================== */

function Build() {
  return (
    <section id="architecture" style={{ scrollMarginTop: 110 }}>
      <Head
        kicker="05 · How it is built"
        title="A pipeline you can audit end to end"
        sub="Deterministic from source to score. No model sits in the chain, so the same question always returns the same answer."
      />
      <Architecture />
    </section>
  );
}

/* ================================================================== *
 * 7. Start
 * ================================================================== */

function Start() {
  return (
    <section id="start" style={{ scrollMarginTop: 110 }}>
      <Reveal>
        <div className="glass" style={{ borderRadius: 20, padding: "clamp(30px, 5vw, 56px)", position: "relative", overflow: "hidden" }}>
          <div
            className="blob"
            style={{ width: 320, height: 320, right: "-4%", top: -70, background: "#dfd2ba", animation: "drift 18s ease-in-out infinite" }}
          />
          <div style={{ position: "relative" }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>06 · Start</div>
            <h2 className="display" style={{ fontSize: "clamp(27px, 3.8vw, 44px)", margin: "0 0 14px", fontWeight: 300, maxWidth: 640 }}>
              <KineticLine text="Pick a starting point, or bring your own question." step={0.042} />
            </h2>
            <p style={{ margin: "0 0 26px", fontSize: 15.5, color: "var(--muted)", maxWidth: 580, lineHeight: 1.62 }}>
              Every run produces a ranked set of gaps, generated research questions, a downloadable
              brief and a link that reopens the exact analysis.
            </p>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginBottom: 26 }}>
              {PRESETS.slice(0, 4).map((p) => (
                <Link
                  key={p.id}
                  href={`/studio?q=${encodeURIComponent(p.query)}${p.languages.length ? `&lang=${p.languages.join(",")}` : ""}${p.tasks.length ? `&task=${p.tasks.join(",")}` : ""}`}
                  className="btn"
                  style={{ background: "var(--paper)" }}
                >
                  {p.title}
                  <span aria-hidden style={{ color: "var(--copper)" }}>→</span>
                </Link>
              ))}
            </div>
            <Link href="/studio" className="btn btn-primary" style={{ padding: "12px 22px", fontSize: 14.5 }}>
              Enter system
              <span aria-hidden style={{ opacity: 0.75 }}>→</span>
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ================================================================== */

function Head({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <Reveal>
      <div style={{ marginBottom: 26, maxWidth: 800 }}>
        <div className="eyebrow" style={{ marginBottom: 11, color: "var(--copper)" }}>{kicker}</div>
        <h2 className="display" style={{ fontSize: "clamp(27px, 3.8vw, 44px)", margin: 0, fontWeight: 300 }}>
          <KineticLine text={title} step={0.042} />
        </h2>
        {sub && (
          <p style={{ margin: "13px 0 0", fontSize: 15.5, color: "var(--muted)", lineHeight: 1.62 }}>{sub}</p>
        )}
      </div>
    </Reveal>
  );
}
