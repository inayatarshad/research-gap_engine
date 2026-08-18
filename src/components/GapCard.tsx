"use client";

import { useState } from "react";

import type { Gap, GapKind } from "@/lib/types";
import { EvidenceLink, TierBadge } from "./primitives";

const KIND_LABEL: Record<GapKind, string> = {
  untouched: "Untouched pairing",
  "thin-evidence": "Thin evidence",
  "single-dataset": "Single-dataset dependence",
  "method-lag": "Methodological lag",
  "evaluation-void": "No shared benchmark",
  cooling: "Gone quiet",
};

const COMPONENT_COLOR: Record<string, string> = {
  scarcity: "#a2662f",
  peer: "#3b507d",
  momentum: "#647a5c",
  impact: "#8a6b96",
  feasibility: "#b6b7a7",
};

export function GapCard({
  gap,
  rank,
  onEvidence,
}: {
  gap: Gap;
  rank: number;
  onEvidence: (filter: { languages?: string[]; tasks?: string[] }, label: string) => void;
}) {
  const [open, setOpen] = useState(rank === 1);

  return (
    <article className="card card-lift" style={{ overflow: "hidden" }}>
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <ScoreDial score={gap.score} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
              <span className="tag" style={{ background: "var(--champagne)", borderColor: "transparent" }}>
                {KIND_LABEL[gap.kind]}
              </span>
              <TierBadge tier={gap.tier} />
              {gap.focus && (
                <span className="tag" style={{ color: "var(--copper)", borderColor: "rgba(162,102,47,.3)" }}>
                  in your scope
                </span>
              )}
            </div>

            <h3 className="serif" style={{ fontSize: 20, margin: "0 0 7px", lineHeight: 1.24 }}>
              {gap.headline}
            </h3>

            <p style={{ margin: 0, fontSize: 13.6, color: "var(--muted)", lineHeight: 1.58 }}>
              {gap.reasoning}
            </p>

            <div style={{ display: "flex", gap: 7, marginTop: 11, flexWrap: "wrap" }}>
              {gap.evidence.map((e) => (
                <button
                  key={e.label}
                  className="tag"
                  style={{ cursor: "pointer", background: "var(--paper)" }}
                  onClick={() => onEvidence(e.filter, e.label)}
                >
                  {e.label} <strong style={{ color: "var(--ink)" }}>{e.count}</strong>
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          className="btn btn-ghost"
          style={{ marginTop: 12, fontSize: 12.5 }}
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          {open ? "Hide" : "Show"} score breakdown and {gap.questions.length} research questions
          <span style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▾</span>
        </button>
      </div>

      {open && (
        <div
          className="fade"
          style={{ background: "var(--ivory)", borderTop: "1px solid var(--line-soft)", padding: "16px 18px" }}
        >
          <ScoreBreakdown gap={gap} />

          {gap.peerExamples.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div className="eyebrow" style={{ marginBottom: 7 }}>
                Where the method already works
              </div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {gap.peerExamples.map((p) => (
                  <span key={p.langName} className="tag" style={{ background: "var(--paper)" }}>
                    {p.langName} <strong style={{ color: "var(--ink)" }}>{p.count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 9 }}>
              Research questions this supports
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {gap.questions.map((q, i) => (
                <div
                  key={i}
                  className="card"
                  style={{ padding: 13, boxShadow: "none", background: "var(--paper)" }}
                >
                  <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                    <span
                      className="mono"
                      style={{ color: "var(--faint)", fontSize: 11, paddingTop: 3, minWidth: 16 }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div className="serif" style={{ fontSize: 16, lineHeight: 1.32, marginBottom: 6 }}>
                        {q.text}
                      </div>
                      <p style={{ margin: "0 0 8px", fontSize: 12.8, color: "var(--muted)", lineHeight: 1.55 }}>
                        {q.rationale}
                      </p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <span
                          className="tag"
                          style={{
                            background:
                              q.difficulty === "Starter"
                                ? "var(--sage-soft)"
                                : q.difficulty === "Ambitious"
                                  ? "var(--copper-soft)"
                                  : "var(--champagne)",
                            borderColor: "transparent",
                            color: "var(--ink)",
                          }}
                        >
                          {q.difficulty}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--faint)" }}>{q.shape}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {gap.startingPoints.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div className="eyebrow" style={{ marginBottom: 7 }}>
                Read these first
              </div>
              <ul style={{ margin: 0, paddingLeft: 17, fontSize: 12.8, color: "var(--muted)", lineHeight: 1.65 }}>
                {gap.startingPoints.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function ScoreDial({ score }: { score: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
      <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(17,34,80,.08)" strokeWidth="4" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke="var(--copper)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          style={{ transition: "stroke-dashoffset .8s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          flexDirection: "column",
        }}
      >
        <span className="mono" style={{ fontSize: 17, fontWeight: 500, lineHeight: 1 }}>
          {score}
        </span>
      </div>
    </div>
  );
}

/**
 * The score is shown as its parts, not as a verdict. A reader who disagrees
 * with the weighting can see exactly which term carried it.
 */
function ScoreBreakdown({ gap }: { gap: Gap }) {
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        How this score of {gap.score} was reached
      </div>

      <div style={{ display: "flex", height: 11, borderRadius: 999, overflow: "hidden", marginBottom: 11 }}>
        {gap.components.map((c) => (
          <div
            key={c.key}
            title={`${c.label}: ${c.points.toFixed(1)} points`}
            style={{
              width: `${c.points}%`,
              background: COMPONENT_COLOR[c.key],
              transition: "width .6s cubic-bezier(.22,1,.36,1)",
            }}
          />
        ))}
        <div style={{ flex: 1, background: "rgba(17,34,80,.06)" }} />
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {gap.components.map((c) => (
          <div key={c.key} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12.7 }}>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 3,
                background: COMPONENT_COLOR[c.key],
                marginTop: 5,
                flexShrink: 0,
              }}
            />
            <span style={{ minWidth: 104, fontWeight: 500 }}>{c.label}</span>
            <span className="mono" style={{ minWidth: 44, color: "var(--faint)" }}>
              {c.points.toFixed(1)}
            </span>
            <span style={{ color: "var(--muted)", lineHeight: 1.5, flex: 1 }}>{c.explanation}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { KIND_LABEL };
