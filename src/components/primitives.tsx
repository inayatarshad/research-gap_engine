"use client";

import type { ReactNode } from "react";

import { TIER_GLOSS, TIER_LABEL, type ResourceTier } from "@/lib/taxonomy";

export function Section({
  id,
  eyebrow,
  title,
  lede,
  aside,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lede?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} style={{ scrollMarginTop: 96 }}>
      <header
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 24,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <div style={{ maxWidth: 760 }}>
          <div className="eyebrow" style={{ marginBottom: 7 }}>
            {eyebrow}
          </div>
          <h2 className="display" style={{ fontSize: "clamp(25px, 3vw, 33px)", margin: 0 }}>
            {title}
          </h2>
          {lede && (
            <p style={{ margin: "9px 0 0", color: "var(--muted)", fontSize: 14.5, maxWidth: 720 }}>
              {lede}
            </p>
          )}
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function TierBadge({ tier, showLabel = true }: { tier: ResourceTier; showLabel?: boolean }) {
  return (
    <span className="tier" data-t={tier} title={`Tier ${tier}: ${TIER_LABEL[tier]}. ${TIER_GLOSS[tier]}`}>
      T{tier}
      {showLabel && <span style={{ opacity: 0.75 }}>{TIER_LABEL[tier]}</span>}
    </span>
  );
}

/** Any number that can be traced to papers renders through this. */
export function EvidenceLink({
  onClick,
  children,
  title,
}: {
  onClick: () => void;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title ?? "Show the papers behind this number"}
      style={{
        background: "none",
        border: "none",
        borderBottom: "1px dashed rgba(59,80,125,0.45)",
        padding: 0,
        cursor: "pointer",
        color: "inherit",
        font: "inherit",
        transition: "color .15s, border-color .15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--sapphire)";
        e.currentTarget.style.borderColor = "var(--sapphire)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "inherit";
        e.currentTarget.style.borderColor = "rgba(59,80,125,0.45)";
      }}
    >
      {children}
    </button>
  );
}

export function Trend({ value }: { value: number }) {
  const up = value >= 1.15;
  const down = value < 0.8;
  const color = up ? "var(--sage)" : down ? "var(--copper)" : "var(--faint)";
  return (
    <span className="mono" style={{ color, fontSize: 11.5, display: "inline-flex", gap: 3 }}>
      {up ? "▲" : down ? "▼" : ", "}
      {value ? `${value.toFixed(2)}×` : ", "}
    </span>
  );
}

export function Bar({
  value,
  max,
  color = "var(--sapphire)",
  height = 6,
}: {
  value: number;
  max: number;
  color?: string;
  height?: number;
}) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div
      style={{
        height,
        background: "rgba(17,34,80,0.07)",
        borderRadius: 999,
        overflow: "hidden",
        flex: 1,
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: color,
          borderRadius: 999,
          transition: "width .5s cubic-bezier(.22,1,.36,1)",
        }}
      />
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div
      className="card"
      style={{ padding: "36px 28px", textAlign: "center", color: "var(--muted)" }}
    >
      <div className="serif" style={{ fontSize: 19, color: "var(--ink)", marginBottom: 5 }}>
        {title}
      </div>
      <div style={{ fontSize: 13.5 }}>{hint}</div>
    </div>
  );
}
