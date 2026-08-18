"use client";

import { useEffect, useState } from "react";

import { useInView } from "../motion";

/**
 * The pipeline, drawn. Stages light in sequence and the connectors carry a
 * moving dash, so the diagram reads as a system running rather than a static
 * block chart. Every figure on it is the real one.
 */

const STAGES = [
  {
    id: "source",
    title: "Sources",
    lines: ["ACL Anthology bulk export", "OpenAlex sweep"],
    figure: "130,930",
    figureLabel: "entries scanned",
  },
  {
    id: "gate",
    title: "Relevance gate",
    lines: ["Low-resource or multilingual", "Abstract required"],
    figure: "16,605",
    figureLabel: "papers kept",
  },
  {
    id: "enrich",
    title: "Gazetteer enrichment",
    lines: ["Languages, tasks, methods", "Datasets, code-mixing"],
    figure: "73",
    figureLabel: "languages tagged",
  },
  {
    id: "index",
    title: "Retrieval",
    lines: ["BM25 over title and abstract", "Taxonomy expansion"],
    figure: "57,722",
    figureLabel: "distinct terms",
  },
  {
    id: "engine",
    title: "Gap engine",
    lines: ["Coverage matrix, momentum", "Five-component scoring"],
    figure: "0–100",
    figureLabel: "opportunity score",
  },
];

export function Architecture() {
  const [ref, seen] = useInView<HTMLDivElement>("-80px");
  const [lit, setLit] = useState(-1);

  useEffect(() => {
    if (!seen) return;
    let n = -1;
    const id = setInterval(() => {
      n = (n + 1) % (STAGES.length + 2);
      setLit(n);
    }, 900);
    return () => clearInterval(id);
  }, [seen]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        className="blob"
        style={{ width: 380, height: 380, left: "18%", top: -40, background: "#ccd5ea", animation: "drift 19s ease-in-out infinite" }}
      />
      <div
        className="blob"
        style={{ width: 300, height: 300, right: "12%", bottom: -60, background: "#e9dcc6", animation: "drift 23s ease-in-out infinite reverse" }}
      />

      <div className="arch-grid">
        {STAGES.map((s, i) => (
          <div key={s.id} style={{ position: "relative", display: "flex", alignItems: "stretch" }}>
            <div
              className="glass"
              style={{
                borderRadius: 14,
                padding: "16px 16px 14px",
                flex: 1,
                opacity: seen ? 1 : 0,
                transform: seen ? "none" : "translateY(16px)",
                transition: `opacity .6s ease ${i * 0.11}s, transform .6s cubic-bezier(.22,1,.36,1) ${i * 0.11}s, border-color .4s, box-shadow .4s`,
                borderColor: lit === i ? "rgba(162,102,47,.55)" : undefined,
                boxShadow:
                  lit === i
                    ? "0 0 0 1px rgba(162,102,47,.25), 0 12px 34px -14px rgba(162,102,47,.5)"
                    : undefined,
              }}
            >
              <div
                className="mono"
                style={{ fontSize: 10, color: "var(--faint)", marginBottom: 9, letterSpacing: ".1em" }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="serif" style={{ fontSize: 16, marginBottom: 9, lineHeight: 1.25 }}>
                {s.title}
              </div>
              <div style={{ display: "grid", gap: 3, marginBottom: 12 }}>
                {s.lines.map((l) => (
                  <div key={l} style={{ fontSize: 12.3, color: "var(--muted)", lineHeight: 1.45 }}>
                    {l}
                  </div>
                ))}
              </div>
              <div className="hairline" style={{ paddingTop: 10 }}>
                <div
                  className="mono"
                  style={{ fontSize: 17, color: lit === i ? "var(--copper)" : "var(--ink)", transition: "color .4s" }}
                >
                  {s.figure}
                </div>
                <div className="eyebrow" style={{ fontSize: 9, marginTop: 3 }}>
                  {s.figureLabel}
                </div>
              </div>
            </div>

            {i < STAGES.length - 1 && (
              <svg
                className="arch-link"
                viewBox="0 0 40 12"
                preserveAspectRatio="none"
                aria-hidden
              >
                <line
                  x1="0"
                  y1="6"
                  x2="40"
                  y2="6"
                  stroke="var(--line-strong)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  vectorEffect="non-scaling-stroke"
                  style={{ animation: seen ? "flowDash 3.4s linear infinite" : "none" }}
                />
              </svg>
            )}
          </div>
        ))}
      </div>

      <div
        className="glass"
        style={{
          marginTop: 16,
          borderRadius: 14,
          padding: "15px 18px",
          display: "flex",
          gap: 14,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 99,
            background: "var(--sage)",
            animation: "nodeGlow 2.4s ease-in-out infinite",
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 13.6, color: "var(--muted)", lineHeight: 1.55, flex: 1, minWidth: 240 }}>
          No model sits anywhere in this chain. Every tag is a literal string match against an
          explicit gazetteer, which is what makes each number reproducible from the source text and
          traceable back to the papers behind it.
        </span>
      </div>
    </div>
  );
}
