"use client";

import { useEffect, useRef, useState } from "react";

import type { Overview } from "@/lib/overview";
import { useInView } from "../motion";

/**
 * What the system does, as four slides with a working visual on each rather
 * than a paragraph. Auto-advances, pauses on hover, and can be driven by the
 * dots or the arrow keys.
 */

export function Carousel({ overview }: { overview: Overview }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [ref, seen] = useInView<HTMLDivElement>("-70px");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const slides = [
    {
      kicker: "01 · Frame",
      title: "Name a scope, see it resolve",
      body: "Type a language, a task, or a region. The engine expands it through an explicit taxonomy and tells you how many papers it matched before you commit.",
      visual: <FrameVisual />,
    },
    {
      kicker: "02 · Map",
      title: "Read the field as a grid",
      body: "Every language against every task, drawn from the whole corpus. Hatched squares are pairings nobody has published on.",
      visual: <GridVisual overview={overview} />,
    },
    {
      kicker: "03 · Score",
      title: "Gaps ranked, with the maths shown",
      body: "Five weighted components decide each score. Peer evidence carries the most: a task solved in a related language and missing here is tractable, not hypothetical.",
      visual: <ScoreVisual />,
    },
    {
      kicker: "04 · Verify",
      title: "Every number opens the papers",
      body: "No figure appears anywhere in the system without a path back to the records behind it. A claim that cannot be resolved this way is not made.",
      visual: <VerifyVisual />,
    },
  ];

  useEffect(() => {
    if (paused || !seen) return;
    timer.current = setInterval(() => setI((v) => (v + 1) % slides.length), 5600);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused, seen, slides.length]);

  return (
    <div
      ref={ref}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") setI((v) => (v + 1) % slides.length);
        if (e.key === "ArrowLeft") setI((v) => (v - 1 + slides.length) % slides.length);
      }}
      tabIndex={0}
      role="region"
      aria-label="What the system does"
      style={{ outline: "none" }}
    >
      <div className="card" style={{ overflow: "hidden", padding: 0 }}>
        <div className="slides" style={{ transform: `translateX(-${i * 100}%)` }}>
          {slides.map((s, si) => (
            <div key={s.kicker} className="slide">
              <div className="carousel-inner">
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div className="eyebrow" style={{ color: "var(--copper)", marginBottom: 12 }}>
                    {s.kicker}
                  </div>
                  <h3
                    className="display"
                    style={{ fontSize: "clamp(23px, 2.8vw, 32px)", margin: "0 0 14px", fontWeight: 400 }}
                  >
                    {s.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: 15, color: "var(--muted)", lineHeight: 1.65 }}>
                    {s.body}
                  </p>
                </div>
                <div
                  style={{
                    display: "grid",
                    placeItems: "center",
                    minHeight: 230,
                    opacity: si === i ? 1 : 0.25,
                    transition: "opacity .6s ease",
                  }}
                >
                  {s.visual}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 9, marginTop: 16, alignItems: "center", justifyContent: "center" }}>
        {slides.map((s, si) => (
          <button
            key={s.kicker}
            onClick={() => setI(si)}
            aria-label={`Slide ${si + 1}`}
            style={{
              height: 5,
              width: si === i ? 34 : 18,
              borderRadius: 999,
              border: "none",
              padding: 0,
              cursor: "pointer",
              background: si === i ? "var(--ink)" : "rgba(17,34,80,.16)",
              transition: "width .45s cubic-bezier(.22,1,.36,1), background .3s",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------------- slide visuals ---------------- */

function FrameVisual() {
  return (
    <div style={{ width: "100%", maxWidth: 320, display: "grid", gap: 10 }}>
      <div className="glass" style={{ borderRadius: 12, padding: "12px 14px", fontSize: 14 }}>
        low-resource toxicity detection
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {["Hate Speech & Toxicity · task", "Urdu · language", "code-mixed · phenomenon"].map((t, i) => (
          <span
            key={t}
            className="tag"
            style={{
              background: "var(--paper)",
              animation: `kinUp .6s cubic-bezier(.16,1,.3,1) ${0.3 + i * 0.16}s both`,
            }}
          >
            {t}
          </span>
        ))}
      </div>
      <div
        className="mono"
        style={{ fontSize: 12, color: "var(--muted)", display: "flex", gap: 7, alignItems: "center" }}
      >
        <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--sage)" }} />
        646 papers in scope
      </div>
    </div>
  );
}

function GridVisual({ overview }: { overview: Overview }) {
  const { cells, scale } = overview.matrix;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cells[0].length}, 1fr)`,
        gap: 4,
        width: "100%",
        maxWidth: 300,
      }}
    >
      {cells.flatMap((row, ri) =>
        row.map((n, ci) => {
          const v = n === 0 ? null : Math.min(1, Math.log1p(n) / Math.log1p(scale * 1.6));
          return (
            <div
              key={`${ri}-${ci}`}
              style={{
                aspectRatio: "1",
                borderRadius: 3,
                background:
                  v === null
                    ? "repeating-linear-gradient(-45deg, transparent 0 3px, rgba(162,102,47,.3) 3px 4px), #faf7f0"
                    : `rgba(17,34,80,${0.1 + v * 0.85})`,
                animation: `kinUp .5s cubic-bezier(.16,1,.3,1) ${(ri * row.length + ci) * 0.008}s both`,
              }}
            />
          );
        }),
      )}
    </div>
  );
}

function ScoreVisual() {
  const parts = [
    { label: "Scarcity", w: 15, c: "#a2662f" },
    { label: "Peer evidence", w: 26, c: "#3b507d" },
    { label: "Momentum", w: 14, c: "#647a5c" },
    { label: "Impact", w: 13, c: "#8a6b96" },
    { label: "Feasibility", w: 10, c: "#b6b7a7" },
  ];
  return (
    <div style={{ width: "100%", maxWidth: 300 }}>
      <div className="display" style={{ fontSize: 42, lineHeight: 1, marginBottom: 4 }}>
        78
        <span style={{ fontSize: 17, color: "var(--faint)" }}> / 100</span>
      </div>
      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
        Bias &amp; Fairness Evaluation in Urdu
      </div>
      <div style={{ display: "flex", height: 10, borderRadius: 999, overflow: "hidden", marginBottom: 12 }}>
        {parts.map((p, i) => (
          <div
            key={p.label}
            style={{
              width: `${p.w}%`,
              background: p.c,
              animation: `growX .8s cubic-bezier(.22,1,.36,1) ${i * 0.1}s both`,
            }}
          />
        ))}
        <div style={{ flex: 1, background: "rgba(17,34,80,.07)" }} />
      </div>
      <div style={{ display: "grid", gap: 5 }}>
        {parts.slice(0, 3).map((p) => (
          <div key={p.label} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: p.c }} />
            <span style={{ flex: 1, color: "var(--muted)" }}>{p.label}</span>
            <span className="mono" style={{ color: "var(--faint)" }}>
              {p.w}.0
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VerifyVisual() {
  return (
    <div style={{ width: "100%", maxWidth: 310, display: "grid", gap: 8 }}>
      {[
        { y: "2024", t: "Abusive content detection for code-mixed Urdu-English" },
        { y: "2022", t: "Roman Urdu hate speech: a shared task overview" },
        { y: "2021", t: "Offensive language identification in low-resource settings" },
      ].map((p, i) => (
        <div
          key={p.t}
          className="glass"
          style={{
            borderRadius: 10,
            padding: "10px 12px",
            animation: `kinUp .6s cubic-bezier(.16,1,.3,1) ${0.2 + i * 0.14}s both`,
          }}
        >
          <div className="mono" style={{ fontSize: 10.5, color: "var(--copper)", marginBottom: 3 }}>
            {p.y}
          </div>
          <div style={{ fontSize: 12.8, lineHeight: 1.42 }}>{p.t}</div>
        </div>
      ))}
    </div>
  );
}
