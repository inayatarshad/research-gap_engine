"use client";

import Link from "next/link";

import type { Overview } from "@/lib/overview";
import { PRESETS } from "@/lib/presets";

import { Reveal, useInView } from "../motion";
import { Architecture } from "./Architecture";
import { Carousel } from "./Carousel";
import { GlassNav } from "./GlassNav";
import { KineticLine, Rotator } from "./Kinetic";
import { Orbit } from "./Orbit";

export function LandingPage({ overview }: { overview: Overview }) {
  return (
    <>
      <GlassNav />

      <main style={{ paddingBottom: 90 }}>
        <Hero overview={overview} />

        <div className="wrap" style={{ display: "grid", gap: 92 }}>
          <section id="what" style={{ scrollMarginTop: 110 }}>
            <Head
              kicker="What it does"
              title="Four moves, end to end"
              sub="From a phrase to a defensible list of research openings, with the evidence attached."
            />
            <Carousel overview={overview} />
          </section>

          <section id="coverage" style={{ scrollMarginTop: 110 }}>
            <Head
              kicker="What it finds"
              title="Research attention is not distributed like speakers are"
              sub={`${overview.voids} of ${overview.totalCells} language and task pairings in the sample below have no indexed paper at all.`}
            />
            <Inequality overview={overview} />
          </section>

          <section id="architecture" style={{ scrollMarginTop: 110 }}>
            <Head
              kicker="How it is built"
              title="A pipeline you can audit"
              sub="Deterministic from source to score, so the same query always returns the same answer."
            />
            <Architecture />
          </section>

          <CallToAction />
        </div>
      </main>
    </>
  );
}

/* ================================================================== */

function Hero({ overview }: { overview: Overview }) {
  return (
    <section style={{ position: "relative", overflow: "hidden" }}>
      <div
        className="blob"
        style={{ width: 460, height: 460, left: "-6%", top: -80, background: "#c6d0e9", animation: "drift 20s ease-in-out infinite" }}
      />
      <div
        className="blob"
        style={{ width: 400, height: 400, right: "-4%", top: 20, background: "#ecdcc4", animation: "drift 26s ease-in-out infinite reverse" }}
      />

      <div className="wrap" style={{ position: "relative", paddingTop: "clamp(120px, 15vw, 168px)" }}>
        <div
          className="eyebrow"
          style={{ display: "flex", gap: 9, alignItems: "center", marginBottom: 20, animation: "fade .8s ease .5s both" }}
        >
          <span style={{ position: "relative", width: 7, height: 7 }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: 99, background: "var(--sage)" }} />
            <span
              style={{ position: "absolute", inset: 0, borderRadius: 99, background: "var(--sage)", animation: "pulseRing 2.4s cubic-bezier(0,0,.2,1) infinite" }}
            />
          </span>
          Research gap and discovery engine
        </div>

        <h1
          className="display"
          style={{ fontSize: "clamp(38px, 6.4vw, 82px)", margin: 0, maxWidth: 1000, fontWeight: 300 }}
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
            maxWidth: 700,
            lineHeight: 1.6,
            animation: "fade .9s ease 1.05s both",
          }}
        >
          HERMÈS reads {overview.papers.toLocaleString()} papers to find what nobody has studied in{" "}
          <Rotator words={["Urdu", "Sindhi", "Yoruba", "Saraiki", "Amharic", "Maithili"]} />
        </div>

        <div
          style={{ display: "flex", gap: 11, marginTop: 30, flexWrap: "wrap", animation: "fade .9s ease 1.25s both" }}
        >
          <Link href="/studio" className="btn btn-primary" style={{ padding: "12px 22px", fontSize: 14.5 }}>
            Enter system
            <span aria-hidden style={{ opacity: 0.75 }}>
              →
            </span>
          </Link>
          <a href="#what" className="btn" style={{ padding: "12px 20px", fontSize: 14.5 }}>
            See how it works
          </a>
        </div>

        <Orbit overview={overview} />
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
      <div className="eyebrow" style={{ marginBottom: 16 }}>
        Millions of speakers per indexed paper
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {rows.map((r, i) => (
          <div key={r.code} style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <span style={{ minWidth: 88, fontSize: 14 }}>{r.name}</span>
            <span className="tier" data-t={r.tier} style={{ fontSize: 9, flexShrink: 0 }}>
              T{r.tier}
            </span>
            <div style={{ flex: 1, height: 24, background: "rgba(17,34,80,.05)", borderRadius: 5, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: seen ? `${Math.max(4, (r.ratio / max) * 100)}%` : "0%",
                  background: "linear-gradient(90deg, var(--sapphire), var(--copper))",
                  borderRadius: 5,
                  transition: `width 1.1s cubic-bezier(.22,1,.36,1) ${i * 0.09}s`,
                }}
              />
            </div>
            <span className="mono" style={{ minWidth: 146, textAlign: "right", fontSize: 12.5, color: "var(--muted)" }}>
              {Math.round(r.ratio)}M
              <span style={{ color: "var(--faint)" }}> per paper · {r.papers} total</span>
            </span>
          </div>
        ))}
      </div>
      <p className="hairline" style={{ marginTop: 18, paddingTop: 14, fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6 }}>
        English has {overview.topLanguages[0]?.papers.toLocaleString()} indexed papers in the same
        corpus.
      </p>
    </div>
  );
}

function CallToAction() {
  return (
    <Reveal>
      <div
        className="glass"
        style={{ borderRadius: 20, padding: "clamp(28px, 5vw, 52px)", position: "relative", overflow: "hidden" }}
      >
        <div
          className="blob"
          style={{ width: 300, height: 300, right: "-4%", top: -60, background: "#dfd2ba", animation: "drift 18s ease-in-out infinite" }}
        />
        <div style={{ position: "relative" }}>
          <h2
            className="display"
            style={{ fontSize: "clamp(26px, 3.6vw, 42px)", margin: "0 0 14px", fontWeight: 300, maxWidth: 620 }}
          >
            Pick a starting point, or bring your own question.
          </h2>
          <p style={{ margin: "0 0 24px", fontSize: 15.5, color: "var(--muted)", maxWidth: 560, lineHeight: 1.6 }}>
            Every run produces a downloadable brief, a shareable link, and the papers behind each
            claim.
          </p>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            {PRESETS.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                href={`/studio?q=${encodeURIComponent(p.query)}${p.languages.length ? `&lang=${p.languages.join(",")}` : ""}${p.tasks.length ? `&task=${p.tasks.join(",")}` : ""}`}
                className="btn"
                style={{ background: "var(--paper)" }}
              >
                {p.title}
                <span aria-hidden style={{ color: "var(--copper)" }}>
                  →
                </span>
              </Link>
            ))}
          </div>
          <div style={{ marginTop: 26 }}>
            <Link href="/studio" className="btn btn-primary" style={{ padding: "12px 22px", fontSize: 14.5 }}>
              Enter system
              <span aria-hidden style={{ opacity: 0.75 }}>
                →
              </span>
            </Link>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

function Head({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <Reveal>
      <div style={{ marginBottom: 24, maxWidth: 760 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          {kicker}
        </div>
        <h2 className="display" style={{ fontSize: "clamp(27px, 3.6vw, 40px)", margin: 0, fontWeight: 300 }}>
          {title}
        </h2>
        {sub && (
          <p style={{ margin: "12px 0 0", fontSize: 15.5, color: "var(--muted)", lineHeight: 1.62 }}>{sub}</p>
        )}
      </div>
    </Reveal>
  );
}
