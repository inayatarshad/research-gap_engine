"use client";

import type { Overview } from "@/lib/overview";
import { Counter, useInView } from "../motion";

/**
 * The arc. Languages sit on a curve ordered by how much research exists on
 * them, densest on the right, thinning to nothing on the left, with the
 * headline figures held in the middle. It states the product's premise as a
 * picture before any prose does.
 */

interface Node {
  label: string;
  papers: number;
  tier: number;
  /** 0 at the left tip of the arc, 1 at the right. */
  t: number;
}

export function Orbit({ overview }: { overview: Overview }) {
  const [ref, seen] = useInView<HTMLDivElement>("-60px");

  // Densest languages on the right, the emptiest on the left.
  const dense = overview.topLanguages.slice(0, 4);
  const sparse = overview.underServed.slice(0, 4);
  const nodes: Node[] = [
    ...sparse.map((l, i) => ({
      label: l.name,
      papers: l.papers,
      tier: l.tier,
      t: 0.06 + i * 0.1,
    })),
    ...dense.map((l, i) => ({
      label: l.name,
      papers: l.papers,
      tier: l.tier,
      t: 0.58 + i * 0.11,
    })),
  ];

  // Quadratic arc, matching the SVG path below.
  const pos = (t: number) => {
    const p0 = { x: 4, y: 78 };
    const p1 = { x: 50, y: -18 };
    const p2 = { x: 96, y: 78 };
    const x = (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p1.x + t ** 2 * p2.x;
    const y = (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p1.y + t ** 2 * p2.y;
    return { x, y };
  };

  return (
    <div ref={ref} style={{ position: "relative", padding: "26px 0 8px" }}>
      <div className="blob" style={{ width: 320, height: 320, left: "6%", top: 30, background: "#c9d2e8", animation: "drift 17s ease-in-out infinite" }} />
      <div className="blob" style={{ width: 280, height: 280, right: "8%", top: 10, background: "#e8d6bf", animation: "drift 21s ease-in-out infinite reverse" }} />

      <div style={{ position: "relative", height: "clamp(280px, 30vw, 360px)" }}>
        <svg
          viewBox="0 0 100 88"
          preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          <path
            d="M 4 78 Q 50 -18 96 78"
            fill="none"
            stroke="var(--line-strong)"
            strokeWidth="0.28"
            strokeDasharray="1.4 1.4"
            vectorEffect="non-scaling-stroke"
            style={{
              strokeDashoffset: seen ? 0 : 300,
              transition: "stroke-dashoffset 2.2s cubic-bezier(.22,1,.36,1)",
            }}
          />
        </svg>

        {nodes.map((n, i) => {
          const { x, y } = pos(n.t);
          const empty = n.papers < 30;
          return (
            <div
              key={n.label}
              style={{
                position: "absolute",
                left: `${x}%`,
                top: `${(y / 88) * 100}%`,
                transform: "translate(-50%, -50%)",
                opacity: seen ? 1 : 0,
                transition: `opacity .6s ease ${0.25 + i * 0.09}s`,
              }}
            >
              <div
                className="glass"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "6px 11px",
                  borderRadius: 999,
                  whiteSpace: "nowrap",
                  animation: `bob ${4.2 + (i % 4) * 0.7}s ease-in-out ${i * 0.3}s infinite`,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 99,
                    background: empty ? "var(--copper)" : "var(--sapphire)",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>{n.label}</span>
                <span className="mono" style={{ fontSize: 11, color: empty ? "var(--copper)" : "var(--faint)" }}>
                  {n.papers}
                </span>
              </div>
            </div>
          );
        })}

        {/* headline figures, held at the centre of the arc */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "62%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            width: "min(92%, 620px)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "clamp(20px, 5vw, 54px)",
              flexWrap: "wrap",
            }}
          >
            <Figure value={overview.papers} label="Papers indexed" seen={seen} delay={0} />
            <Figure value={overview.languages} label="Languages" seen={seen} delay={120} />
            <Figure
              value={overview.highResourceShare * 100}
              suffix="%"
              label="Study English or peers only"
              seen={seen}
              delay={240}
              accent
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Figure({
  value,
  label,
  seen,
  delay,
  suffix,
  accent,
}: {
  value: number;
  label: string;
  seen: boolean;
  delay: number;
  suffix?: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        opacity: seen ? 1 : 0,
        transform: seen ? "none" : "translateY(10px)",
        transition: `opacity .7s ease ${delay / 1000}s, transform .7s cubic-bezier(.22,1,.36,1) ${delay / 1000}s`,
      }}
    >
      <div
        className="display"
        style={{
          fontSize: "clamp(30px, 4.4vw, 50px)",
          lineHeight: 1,
          color: accent ? "var(--copper)" : "var(--ink)",
          fontWeight: 400,
        }}
      >
        <Counter value={value} active={seen} suffix={suffix ?? ""} delay={delay} />
      </div>
      <div
        className="eyebrow"
        style={{ marginTop: 8, fontSize: 9.5, maxWidth: 130, marginInline: "auto", lineHeight: 1.4 }}
      >
        {label}
      </div>
    </div>
  );
}
