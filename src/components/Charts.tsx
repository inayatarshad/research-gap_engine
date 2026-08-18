"use client";

import { useState } from "react";

import type { Landscape } from "@/lib/types";
import { Bar, EvidenceLink, Trend } from "./primitives";

/* ================================================================== *
 * Saturation / opportunity quadrant
 * ================================================================== */

const QUAD_COPY = {
  emerging: { label: "Emerging", note: "Growing from a small base — the most room for a new entrant." },
  hot: { label: "Hot", note: "Large and still accelerating — competitive, but funded and visible." },
  crowded: { label: "Crowded", note: "High volume, flat or falling momentum — hard to add to." },
  dormant: { label: "Dormant", note: "Small and cooling — either solved, or blocked on something." },
} as const;

export function Quadrant({
  landscape,
  onTask,
}: {
  landscape: Landscape;
  onTask: (taskId: string, label: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const pts = landscape.quadrant.filter((q) => q.volume > 0);
  if (pts.length === 0) return null;

  const maxVol = Math.max(...pts.map((p) => p.volume));
  const maxMom = Math.max(1.8, ...pts.map((p) => p.momentum));
  // Log scale on volume: a few dominant tasks would otherwise squash everything
  // else against the left edge.
  const x = (v: number) => (Math.log1p(v) / Math.log1p(maxVol)) * 100;
  const y = (m: number) => Math.min(100, (m / maxMom) * 100);

  const midX = x(Math.exp(Math.log1p(maxVol) / 2) - 1);
  const midY = y(1);

  const hovered = hover ? pts.find((q) => q.taskId === hover) : null;

  return (
    <div className="card" style={{ padding: 18 }}>
      <div
        style={{
          position: "relative",
          height: 340,
          background:
            "linear-gradient(to top right, rgba(231,226,206,.28), transparent 55%), var(--paper)",
          border: "1px solid var(--line-soft)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", left: `${midX}%`, top: 0, bottom: 0, width: 1, background: "var(--line)" }} />
        <div style={{ position: "absolute", top: `${100 - midY}%`, left: 0, right: 0, height: 1, background: "var(--line)" }} />

        <QuadLabel x="4%" y="5%" text="Emerging · sparse but rising" align="left" />
        <QuadLabel x="96%" y="5%" text="Hot · big and rising" align="right" />
        <QuadLabel x="4%" y="92%" text="Dormant" align="left" />
        <QuadLabel x="96%" y="92%" text="Crowded · big but cooling" align="right" />

        {pts.map((p) => {
          const px = x(p.volume);
          const py = y(p.momentum);
          const on = hover === p.taskId;
          const color =
            p.quadrant === "emerging"
              ? "var(--copper)"
              : p.quadrant === "hot"
                ? "var(--sapphire)"
                : p.quadrant === "crowded"
                  ? "var(--taupe)"
                  : "var(--faint)";
          const r = 6 + (p.volume / maxVol) * 13;
          return (
            <button
              key={p.taskId}
              onMouseEnter={() => setHover(p.taskId)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(p.taskId)}
              onBlur={() => setHover(null)}
              onClick={() => onTask(p.taskId, p.label)}
              aria-label={`${p.label}: ${p.volume} papers, ${p.momentum.toFixed(2)} times momentum`}
              style={{
                position: "absolute",
                left: `calc(${Math.min(97, Math.max(3, px))}% - ${r}px)`,
                top: `calc(${Math.min(97, Math.max(3, 100 - py))}% - ${r}px)`,
                width: r * 2,
                height: r * 2,
                borderRadius: 999,
                background: color,
                opacity: on ? 1 : 0.68,
                border: `1.5px solid ${on ? "var(--ink)" : "rgba(255,255,255,.7)"}`,
                cursor: "pointer",
                transition: "opacity .15s, transform .15s",
                transform: on ? "scale(1.16)" : "none",
                zIndex: on ? 6 : 1,
                padding: 0,
              }}
            />
          );
        })}

        {hovered && (
          <div
            className="card fade"
            style={{
              position: "absolute",
              left: 12,
              bottom: 12,
              padding: 11,
              maxWidth: 268,
              boxShadow: "var(--shadow-md)",
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            <div className="serif" style={{ fontSize: 15.5, marginBottom: 4 }}>
              {hovered.label}
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 12.4, color: "var(--muted)", marginBottom: 6 }}>
              <span className="mono">{hovered.volume} papers</span>
              <Trend value={hovered.momentum} />
            </div>
            <div style={{ fontSize: 12, color: "var(--faint)", lineHeight: 1.45 }}>
              {QUAD_COPY[hovered.quadrant].note}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 9,
          fontSize: 11.5,
          color: "var(--faint)",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span className="eyebrow">← fewer papers · more papers →</span>
        <span className="eyebrow">↑ accelerating · cooling ↓</span>
      </div>
    </div>
  );
}

function QuadLabel({
  x,
  y,
  text,
  align,
}: {
  x: string;
  y: string;
  text: string;
  align: "left" | "right";
}) {
  return (
    <div
      className="eyebrow"
      style={{
        position: "absolute",
        left: align === "left" ? x : undefined,
        right: align === "right" ? `calc(100% - ${x})` : undefined,
        top: y,
        fontSize: 9.5,
        color: "var(--taupe)",
        pointerEvents: "none",
      }}
    >
      {text}
    </div>
  );
}

/* ================================================================== *
 * Timeline
 * ================================================================== */

export function Timeline({
  landscape,
  onYear,
}: {
  landscape: Landscape;
  onYear: (year: number) => void;
}) {
  const pts = landscape.timeline.filter((t) => t.year <= 2026);
  const max = Math.max(1, ...pts.map((p) => p.count));
  const maxCorpus = Math.max(1, ...pts.map((p) => p.corpusCount));

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 168 }}>
        {pts.map((p) => {
          const h = (p.count / max) * 100;
          // Faint backdrop = the whole corpus that year, so the cohort's share of
          // overall field activity stays readable.
          const hc = (p.corpusCount / maxCorpus) * 100;
          return (
            <button
              key={p.year}
              onClick={() => onYear(p.year)}
              title={`${p.year}: ${p.count} papers in scope · ${p.corpusCount} corpus-wide${p.era ? ` · mostly ${p.era}-era methods` : ""}`}
              style={{
                flex: 1,
                height: "100%",
                display: "flex",
                alignItems: "flex-end",
                position: "relative",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: `${hc}%`,
                  background: "rgba(17,34,80,.055)",
                  borderRadius: "3px 3px 0 0",
                }}
              />
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: `${h}%`,
                  background: p.year >= 2024 ? "var(--copper)" : "var(--sapphire)",
                  borderRadius: "3px 3px 0 0",
                  opacity: 0.9,
                  transition: "height .6s cubic-bezier(.22,1,.36,1)",
                }}
              />
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
        {pts.map((p) => (
          <div
            key={p.year}
            className="mono"
            style={{ flex: 1, textAlign: "center", fontSize: 9, color: "var(--faint)" }}
          >
            {String(p.year).slice(2)}
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 12,
          fontSize: 12,
          color: "var(--faint)",
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <LegendDot color="var(--sapphire)" label="papers in scope" />
        <LegendDot color="var(--copper)" label="last three years" />
        <LegendDot color="rgba(17,34,80,.14)" label="whole corpus that year" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 9, height: 9, borderRadius: 2, background: color }} />
      <span className="eyebrow" style={{ fontSize: 9.5 }}>
        {label}
      </span>
    </span>
  );
}

/* ================================================================== *
 * Dataset concentration
 * ================================================================== */

export function Concentration({
  landscape,
  onDataset,
}: {
  landscape: Landscape;
  onDataset: (name: string) => void;
}) {
  const { concentration: c, datasetFacets } = landscape;
  const max = Math.max(1, ...datasetFacets.map((d) => d.count));
  // 0.25 is the conventional "highly concentrated" threshold for an HHI.
  const level = c.hhi >= 0.25 ? "high" : c.hhi >= 0.15 ? "moderate" : "low";
  const color = level === "high" ? "var(--copper)" : level === "moderate" ? "#8a6b96" : "var(--sage)";

  return (
    <div className="conc-grid">
      <div className="card" style={{ padding: 18 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          Concentration index
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span className="mono" style={{ fontSize: 42, lineHeight: 1, color }}>
            {c.hhi.toFixed(2)}
          </span>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>HHI</span>
        </div>
        <div
          style={{
            marginTop: 14,
            marginBottom: 8,
            position: "relative",
            height: 7,
            background: "rgba(17,34,80,.07)",
            borderRadius: 999,
          }}
        >
          <div
            style={{
              width: `${Math.min(100, c.hhi * 250)}%`,
              height: "100%",
              background: color,
              borderRadius: 999,
              transition: "width .7s cubic-bezier(.22,1,.36,1)",
            }}
          />
          <div
            title="0.15 — moderate"
            style={{ position: "absolute", left: "37.5%", top: -3, bottom: -3, width: 1, background: "var(--line-strong)" }}
          />
          <div
            title="0.25 — high"
            style={{ position: "absolute", left: "62.5%", top: -3, bottom: -3, width: 1, background: "var(--line-strong)" }}
          />
        </div>
        <div className="eyebrow" style={{ fontSize: 9, display: "flex", justifyContent: "space-between" }}>
          <span>diverse</span>
          <span>moderate</span>
          <span>concentrated</span>
        </div>
        <p style={{ margin: "14px 0 0", fontSize: 13, color: "var(--muted)", lineHeight: 1.56 }}>{c.verdict}</p>
        <div className="hairline" style={{ marginTop: 13, paddingTop: 11, display: "grid", gap: 6, fontSize: 12.5 }}>
          <Row label="Distinct resources" value={String(c.distinctDatasets)} />
          <Row label="Papers naming one" value={`${c.papersWithDataset} of ${landscape.cohortSize}`} />
          {c.topName && <Row label="Most reused" value={c.topName} />}
        </div>
      </div>

      <div className="card" style={{ padding: 18 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>
          Resources this field leans on
        </div>
        {datasetFacets.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--muted)" }}>
            No named resources could be extracted from these abstracts — itself a signal that work
            here is not anchored to shared, citable datasets.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 7 }}>
            {datasetFacets.slice(0, 11).map((d) => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.8 }}>
                <EvidenceLink onClick={() => onDataset(d.id)}>
                  <span
                    style={{
                      display: "inline-block",
                      minWidth: 132,
                      maxWidth: 132,
                      textAlign: "left",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {d.label}
                  </span>
                </EvidenceLink>
                <Bar value={d.count} max={max} color={d.id === c.topName ? "var(--copper)" : "var(--sapphire)"} />
                <span className="mono" style={{ minWidth: 30, textAlign: "right", color: "var(--muted)" }}>
                  {d.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <span style={{ color: "var(--faint)" }}>{label}</span>
      <span className="mono" style={{ color: "var(--ink)", textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}
