"use client";

import { useEffect, useState } from "react";

import type { Overview } from "@/lib/overview";
import { PRESETS, type Preset } from "@/lib/presets";
import { TIER_LABEL } from "@/lib/taxonomy";

import { Counter, Reveal, Typewriter, useInView } from "./motion";

/**
 * The landing page argues the premise by showing it. Every figure below is
 * computed from the indexed corpus, so the page doubles as evidence that the
 * engine behind it is real and already loaded.
 */

/** Sits above the composer, so the first thing seen is the claim. */
export function HeroBlock({ overview }: { overview: Overview }) {
  return <Hero overview={overview} />;
}

/** Everything below the composer: the evidence for the claim. */
export function LandingBody({
  overview,
  onPick,
}: {
  overview: Overview;
  onPick: (p: Preset) => void;
}) {
  return (
    <>
      <MetricRow overview={overview} />
      <CoverageDemo overview={overview} />
      <Inequality overview={overview} />
      <HowItWorks />
      <Expeditions onPick={onPick} />
    </>
  );
}

/* ================================================================== *
 * Hero
 * ================================================================== */

function Hero({ overview }: { overview: Overview }) {
  return (
    <section style={{ padding: "clamp(46px, 8vw, 88px) 0 26px" }}>
      <div
        className="eyebrow rise"
        style={{ marginBottom: 18, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}
      >
        <LiveDot />
        <span>
          {overview.papers.toLocaleString()} papers indexed · {overview.languages} languages ·{" "}
          {overview.yearFrom} to {overview.yearTo}
        </span>
      </div>

      <h1
        className="display rise"
        style={{
          fontSize: "clamp(40px, 6.6vw, 78px)",
          margin: 0,
          maxWidth: 1080,
          fontWeight: 300,
          animationDelay: ".05s",
        }}
      >
        Every field has a shape.
        <br />
        <span style={{ color: "var(--copper)", fontWeight: 400 }}>The holes have one too.</span>
      </h1>

      <div
        className="rise"
        style={{
          marginTop: 22,
          fontSize: "clamp(16px, 1.6vw, 19px)",
          color: "var(--muted)",
          maxWidth: 680,
          lineHeight: 1.6,
          animationDelay: ".12s",
        }}
      >
        Ask HERMÈS about{" "}
        <span className="serif" style={{ color: "var(--ink)" }}>
          <Typewriter
            phrases={[
              "Urdu NLP",
              "hate speech in code-mixed text",
              "speech for African languages",
              "evaluation beyond English",
            ]}
          />
        </span>
      </div>
    </section>
  );
}

function LiveDot() {
  return (
    <span style={{ position: "relative", width: 7, height: 7, display: "inline-block" }}>
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 99,
          background: "var(--sage)",
        }}
      />
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 99,
          background: "var(--sage)",
          animation: "ping 2.2s cubic-bezier(0,0,.2,1) infinite",
        }}
      />
    </span>
  );
}

/* ================================================================== *
 * Metric row
 * ================================================================== */

function MetricRow({ overview }: { overview: Overview }) {
  const [ref, seen] = useInView<HTMLDivElement>();
  const items = [
    { value: overview.papers, label: "Papers indexed", detail: "ACL Anthology and OpenAlex" },
    { value: overview.languages, label: "Languages tagged", detail: `across ${overview.tasks} research tasks` },
    { value: overview.venues, label: "Venues covered", detail: "conferences, journals, workshops" },
    {
      value: overview.highResourceShare * 100,
      label: "Study English or peers only",
      detail: "of every paper with a language tag",
      suffix: "%",
      accent: true,
    },
  ];

  return (
    <div ref={ref} className="metric-row">
      {items.map((m, i) => (
        <div
          key={m.label}
          className="card"
          style={{
            padding: "18px 20px",
            opacity: seen ? 1 : 0,
            transform: seen ? "none" : "translateY(14px)",
            transition: `opacity .6s cubic-bezier(.22,1,.36,1) ${i * 0.09}s, transform .6s cubic-bezier(.22,1,.36,1) ${i * 0.09}s`,
          }}
        >
          <div
            className="display"
            style={{
              fontSize: "clamp(30px, 3.6vw, 42px)",
              lineHeight: 1,
              marginBottom: 9,
              color: m.accent ? "var(--copper)" : "var(--ink)",
              fontWeight: 400,
            }}
          >
            <Counter
              value={m.value}
              active={seen}
              decimals={m.suffix === "%" ? 0 : 0}
              suffix={m.suffix ?? ""}
              delay={i * 90}
            />
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>{m.label}</div>
          <div style={{ fontSize: 12.8, color: "var(--faint)" }}>{m.detail}</div>
        </div>
      ))}
    </div>
  );
}

/* ================================================================== *
 * Coverage demo: the grid fills itself in
 * ================================================================== */

function CoverageDemo({ overview }: { overview: Overview }) {
  const [ref, seen] = useInView<HTMLDivElement>("-80px");
  const { languages, tasks, cells, scale } = overview.matrix;
  const [hover, setHover] = useState<{ l: number; t: number } | null>(null);

  const shade = (n: number) => {
    if (n === 0) return null;
    const v = Math.min(1, Math.log1p(n) / Math.log1p(scale * 1.6));
    return v;
  };

  const hovered = hover ? { lang: languages[hover.l], task: tasks[hover.t], n: cells[hover.l][hover.t] } : null;

  return (
    <section ref={ref} style={{ marginTop: 62 }}>
      <SectionHead
        kicker="What it looks at"
        title="Coverage is not evenly spread"
        sub={`${overview.voids} of ${overview.totalCells} pairings below have no indexed paper at all.`}
      />

      <div className="demo-grid">
        <div className="card" style={{ padding: "20px 22px", overflowX: "auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `minmax(96px, 118px) repeat(${tasks.length}, minmax(38px, 1fr))`,
              gap: 4,
              minWidth: 560,
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
                  height: 76,
                  justifySelf: "center",
                  textAlign: "right",
                  letterSpacing: ".08em",
                }}
              >
                {t.short}
              </div>
            ))}

            {languages.map((l, li) => (
              <Row
                key={l.code}
                lang={l}
                li={li}
                tasks={tasks}
                counts={cells[li]}
                shade={shade}
                seen={seen}
                setHover={setHover}
              />
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: "20px 22px", display: "flex", flexDirection: "column" }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            {hovered ? "Selected pairing" : "Read the grid"}
          </div>

          {hovered ? (
            <div className="fade" key={`${hover?.l}-${hover?.t}`}>
              <div className="display" style={{ fontSize: 24, lineHeight: 1.15, marginBottom: 10 }}>
                {hovered.lang.name}
                <br />
                <span style={{ color: "var(--muted)" }}>{hovered.task.name}</span>
              </div>
              <div
                className="display"
                style={{
                  fontSize: 46,
                  color: hovered.n === 0 ? "var(--copper)" : "var(--ink)",
                  lineHeight: 1,
                  marginBottom: 6,
                }}
              >
                {hovered.n}
              </div>
              <div style={{ fontSize: 13.4, color: "var(--muted)", lineHeight: 1.55 }}>
                {hovered.n === 0
                  ? "No indexed paper covers this pairing. That absence is what the engine scores."
                  : `indexed ${hovered.n === 1 ? "paper" : "papers"} pair this language with this task.`}
              </div>
              <div style={{ marginTop: 12 }}>
                <span className="tier" data-t={hovered.lang.tier}>
                  T{hovered.lang.tier} {TIER_LABEL[hovered.lang.tier]}
                </span>
              </div>
            </div>
          ) : (
            <>
              <p style={{ margin: "0 0 14px", fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>
                Each square is one language paired with one research task. Darker means more
                published work. Hatched squares are pairings nobody has published on.
              </p>
              <p style={{ margin: 0, fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>
                Hover any square to see the count.
              </p>
            </>
          )}

          <div style={{ flex: 1, minHeight: 14 }} />
          <div className="hairline" style={{ paddingTop: 13, display: "flex", gap: 13, flexWrap: "wrap" }}>
            <LegendSwatch label="none" voidCell />
            <LegendSwatch label="few" alpha={0.28} />
            <LegendSwatch label="many" alpha={1} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({
  lang,
  li,
  tasks,
  counts,
  shade,
  seen,
  setHover,
}: {
  lang: { code: string; name: string; tier: 0 | 1 | 2 | 3 | 4 | 5 };
  li: number;
  tasks: { id: string }[];
  counts: number[];
  shade: (n: number) => number | null;
  seen: boolean;
  setHover: (h: { l: number; t: number } | null) => void;
}) {
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          paddingRight: 6,
          opacity: seen ? 1 : 0,
          transition: `opacity .45s ease ${li * 0.05}s`,
        }}
      >
        <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {lang.name}
        </span>
        <span className="tier" data-t={lang.tier} style={{ fontSize: 9 }}>
          T{lang.tier}
        </span>
      </div>
      {tasks.map((t, ti) => {
        const n = counts[ti];
        const v = shade(n);
        const delay = (li * tasks.length + ti) * 0.014;
        return (
          <button
            key={t.id}
            onMouseEnter={() => setHover({ l: li, t: ti })}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover({ l: li, t: ti })}
            onBlur={() => setHover(null)}
            aria-label={`${lang.name}, ${n} papers`}
            style={{
              aspectRatio: "1.5 / 1",
              minHeight: 26,
              border: "1px solid rgba(255,255,255,.6)",
              borderRadius: 4,
              cursor: "pointer",
              padding: 0,
              background:
                v === null
                  ? "repeating-linear-gradient(-45deg, transparent 0 4px, rgba(162,102,47,.26) 4px 5px), #faf7f0"
                  : `rgba(17,34,80,${0.1 + v * 0.86})`,
              opacity: seen ? 1 : 0,
              transform: seen ? "none" : "scale(.72)",
              transition: `opacity .42s ease ${delay}s, transform .42s cubic-bezier(.22,1,.36,1) ${delay}s, outline-color .12s`,
              outline: "2px solid transparent",
              outlineOffset: -2,
            }}
            onMouseOver={(e) => (e.currentTarget.style.outlineColor = "var(--ink)")}
            onMouseOut={(e) => (e.currentTarget.style.outlineColor = "transparent")}
          />
        );
      })}
    </>
  );
}

function LegendSwatch({ label, alpha, voidCell }: { label: string; alpha?: number; voidCell?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 15,
          height: 11,
          borderRadius: 3,
          border: "1px solid rgba(255,255,255,.6)",
          background: voidCell
            ? "repeating-linear-gradient(-45deg, transparent 0 4px, rgba(162,102,47,.26) 4px 5px), #faf7f0"
            : `rgba(17,34,80,${0.1 + (alpha ?? 0) * 0.86})`,
        }}
      />
      <span className="eyebrow" style={{ fontSize: 9 }}>
        {label}
      </span>
    </span>
  );
}

/* ================================================================== *
 * Inequality bars
 * ================================================================== */

function Inequality({ overview }: { overview: Overview }) {
  const [ref, seen] = useInView<HTMLDivElement>("-60px");
  const rows = overview.underServed;
  const max = Math.max(...rows.map((r) => r.ratio));

  return (
    <section ref={ref} style={{ marginTop: 62 }}>
      <SectionHead
        kicker="What it measures"
        title="Speakers carried per published paper"
        sub="Languages spoken by tens of millions of people, divided by how much research exists on them."
      />

      <div className="card" style={{ padding: "22px 24px" }}>
        <div style={{ display: "grid", gap: 13 }}>
          {rows.map((r, i) => (
            <div key={r.code} style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ minWidth: 92, fontSize: 14 }}>{r.name}</span>
              <span className="tier" data-t={r.tier} style={{ fontSize: 9 }}>
                T{r.tier}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 26,
                  background: "rgba(17,34,80,.05)",
                  borderRadius: 5,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: seen ? `${Math.max(4, (r.ratio / max) * 100)}%` : "0%",
                    background: `linear-gradient(90deg, var(--sapphire), var(--copper))`,
                    borderRadius: 5,
                    transition: `width 1.1s cubic-bezier(.22,1,.36,1) ${i * 0.1}s`,
                  }}
                />
              </div>
              <span
                style={{ minWidth: 152, textAlign: "right", fontSize: 13, color: "var(--muted)" }}
              >
                <Counter value={Math.round(r.ratio)} active={seen} delay={i * 100} suffix="M" />
                <span style={{ color: "var(--faint)" }}>
                  {" per paper · "}
                  {r.papers} total
                </span>
              </span>
            </div>
          ))}
        </div>
        <p
          className="hairline"
          style={{ marginTop: 18, paddingTop: 14, fontSize: 13.4, color: "var(--muted)", lineHeight: 1.6 }}
        >
          For comparison, English has {overview.topLanguages[0]?.papers.toLocaleString()} indexed
          papers in this corpus.
        </p>
      </div>
    </section>
  );
}

/* ================================================================== *
 * How it works
 * ================================================================== */

const STEPS = [
  {
    n: "01",
    title: "Frame a scope",
    body: "Name a language, a task, or just describe an area. The engine shows how many papers it matched before you commit.",
  },
  {
    n: "02",
    title: "See the field",
    body: "Themes, coverage, momentum, dataset concentration and publication history, computed over the whole corpus.",
  },
  {
    n: "03",
    title: "Get scored gaps",
    body: "Ranked opportunities with a transparent score, generated research questions, and the papers behind every number.",
  },
];

function HowItWorks() {
  const [ref, seen] = useInView<HTMLDivElement>("-60px");
  return (
    <section ref={ref} style={{ marginTop: 62 }}>
      <SectionHead kicker="How it works" title="Three moves" />
      <div className="step-grid">
        {STEPS.map((s, i) => (
          <div
            key={s.n}
            className="card"
            style={{
              padding: "20px 22px",
              opacity: seen ? 1 : 0,
              transform: seen ? "none" : "translateY(16px)",
              transition: `opacity .6s cubic-bezier(.22,1,.36,1) ${i * 0.12}s, transform .6s cubic-bezier(.22,1,.36,1) ${i * 0.12}s`,
            }}
          >
            <div
              className="mono"
              style={{ fontSize: 12, color: "var(--copper)", marginBottom: 12, letterSpacing: ".08em" }}
            >
              {s.n}
            </div>
            <div className="serif" style={{ fontSize: 20, marginBottom: 8 }}>
              {s.title}
            </div>
            <p style={{ margin: 0, fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ================================================================== *
 * Expeditions
 * ================================================================== */

function Expeditions({ onPick }: { onPick: (p: Preset) => void }) {
  const [ref, seen] = useInView<HTMLDivElement>("-60px");
  return (
    <section ref={ref} style={{ marginTop: 62 }}>
      <SectionHead kicker="Start here" title="Run one now" />
      <div className="grid-auto">
        {PRESETS.map((p, i) => (
          <button
            key={p.id}
            onClick={() => onPick(p)}
            className="card card-lift"
            style={{
              padding: 18,
              textAlign: "left",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: 7,
              minHeight: 138,
              opacity: seen ? 1 : 0,
              transform: seen ? "none" : "translateY(14px)",
              transition: `opacity .55s cubic-bezier(.22,1,.36,1) ${i * 0.07}s, transform .55s cubic-bezier(.22,1,.36,1) ${i * 0.07}s, box-shadow .22s, border-color .22s`,
            }}
          >
            <div className="serif" style={{ fontSize: 19, lineHeight: 1.25 }}>
              {p.title}
            </div>
            <div style={{ fontSize: 13.4, color: "var(--muted)" }}>{p.blurb}</div>
            <div style={{ flex: 1 }} />
            <div
              className="hairline"
              style={{
                paddingTop: 10,
                fontSize: 13,
                color: "var(--faint)",
                lineHeight: 1.45,
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <span style={{ flex: 1 }}>{p.expect}</span>
              <span style={{ color: "var(--copper)" }}>→</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ================================================================== */

function SectionHead({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <Reveal>
      <div style={{ marginBottom: 20, maxWidth: 720 }}>
        <div className="eyebrow" style={{ marginBottom: 9 }}>
          {kicker}
        </div>
        <h2 className="display" style={{ fontSize: "clamp(26px, 3.2vw, 36px)", margin: 0, fontWeight: 400 }}>
          {title}
        </h2>
        {sub && (
          <p style={{ margin: "10px 0 0", fontSize: 15, color: "var(--muted)", lineHeight: 1.6 }}>{sub}</p>
        )}
      </div>
    </Reveal>
  );
}
