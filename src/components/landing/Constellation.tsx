"use client";

import { useMemo, useState } from "react";

import type { Overview } from "@/lib/overview";
import { useInView } from "../motion";

/**
 * The negative space map.
 *
 * Languages are plotted as nodes sized by how much research exists on them and
 * wired to their nearest neighbours, so the well-studied ones pull into a dense
 * bright core. The copper perimeter marks the region where the corpus has
 * almost nothing, and the sparse nodes sit around its rim rather than inside
 * it. The picture is the headline: the mass has a shape, and so does the hole.
 */

const W = 460;
const H = 440;

/** Dense core, where the saturated languages pile up. */
const CORE = { x: 296, y: 150 };
/** The void, deliberately left empty. */
const VOID = { x: 138, y: 316, rx: 84, ry: 66 };

interface Node {
  code: string;
  name: string;
  papers: number;
  tier: number;
  x: number;
  y: number;
  r: number;
  sparse: boolean;
}

function layout(overview: Overview): Node[] {
  const nodes: Node[] = [];
  const dense = overview.topLanguages.slice(0, 9);
  const sparse = overview.underServed.slice(0, 7);
  const maxPapers = Math.max(1, ...dense.map((d) => d.papers));

  // Golden-angle spiral keeps the core evenly packed without overlaps.
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  dense.forEach((l, i) => {
    const t = i / Math.max(1, dense.length - 1);
    const radius = 16 + t * 104;
    const a = i * GOLDEN;
    nodes.push({
      code: l.code,
      name: l.name,
      papers: l.papers,
      tier: l.tier,
      x: CORE.x + Math.cos(a) * radius * 1.06,
      y: CORE.y + Math.sin(a) * radius * 0.88,
      r: 5 + (l.papers / maxPapers) * 17,
      sparse: false,
    });
  });

  // Sparse languages ring the void without entering it.
  sparse.forEach((l, i) => {
    const a = -Math.PI * 0.15 + (i / sparse.length) * Math.PI * 1.75;
    const radius = 1.34;
    nodes.push({
      code: l.code,
      name: l.name,
      papers: l.papers,
      tier: l.tier,
      x: VOID.x + Math.cos(a) * VOID.rx * radius,
      y: VOID.y + Math.sin(a) * VOID.ry * radius,
      r: 3.2,
      sparse: true,
    });
  });

  return nodes;
}

/** Filaments between near neighbours, so density reads as connectedness. */
function links(nodes: Node[]) {
  const out: { a: Node; b: Node; d: number }[] = [];
  const dense = nodes.filter((n) => !n.sparse);
  for (let i = 0; i < dense.length; i++) {
    const rest = dense
      .filter((_, j) => j !== i)
      .map((b) => ({ b, d: Math.hypot(dense[i].x - b.x, dense[i].y - b.y) }))
      .sort((x, y) => x.d - y.d)
      .slice(0, 2);
    for (const { b, d } of rest) {
      if (!out.some((l) => (l.a === b && l.b === dense[i]) || (l.a === dense[i] && l.b === b))) {
        out.push({ a: dense[i], b, d });
      }
    }
  }
  return out;
}

export function Constellation({ overview }: { overview: Overview }) {
  const [ref, seen] = useInView<HTMLDivElement>("-40px");
  const [hover, setHover] = useState<Node | null>(null);

  const nodes = useMemo(() => layout(overview), [overview]);
  const edges = useMemo(() => links(nodes), [nodes]);
  const maxPapers = Math.max(...nodes.map((n) => n.papers));

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
        role="img"
        aria-label="Map of language coverage, with a marked region where the corpus has almost no research"
      >
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#3b507d" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#3b507d" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="voidGlow" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#a2662f" stopOpacity="0.13" />
            <stop offset="70%" stopColor="#a2662f" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#a2662f" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* atmosphere */}
        <ellipse cx={CORE.x} cy={CORE.y} rx={150} ry={128} fill="url(#coreGlow)" />
        <ellipse cx={VOID.x} cy={VOID.y} rx={VOID.rx * 1.5} ry={VOID.ry * 1.5} fill="url(#voidGlow)" />

        {/* filaments */}
        <g>
          {edges.map((e, i) => (
            <line
              key={i}
              x1={e.a.x}
              y1={e.a.y}
              x2={e.b.x}
              y2={e.b.y}
              stroke="var(--sapphire)"
              strokeWidth={0.7}
              strokeOpacity={seen ? 0.3 : 0}
              style={{ transition: `stroke-opacity .8s ease ${0.5 + i * 0.045}s` }}
            />
          ))}
        </g>

        {/* the void perimeter */}
        <ellipse
          cx={VOID.x}
          cy={VOID.y}
          rx={VOID.rx}
          ry={VOID.ry}
          fill="none"
          stroke="var(--copper)"
          strokeWidth={1.4}
          strokeDasharray="5 5"
          strokeOpacity={seen ? 0.85 : 0}
          style={{
            transition: "stroke-opacity 1s ease 1.1s",
            animation: seen ? "spinSlow 46s linear infinite" : "none",
            transformOrigin: `${VOID.x}px ${VOID.y}px`,
          }}
        />
        <ellipse
          cx={VOID.x}
          cy={VOID.y}
          rx={VOID.rx}
          ry={VOID.ry}
          fill="none"
          stroke="var(--copper)"
          strokeWidth={7}
          strokeOpacity={0.09}
          style={{ animation: seen ? "voidPulse 3.6s ease-in-out infinite" : "none" }}
        />

        {/* nodes */}
        <g>
          {nodes.map((n, i) => (
            <g
              key={n.code}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={n.x}
                cy={n.y}
                r={n.r}
                fill={n.sparse ? "var(--copper)" : "var(--ink)"}
                fillOpacity={n.sparse ? 0.85 : 0.16 + (n.papers / maxPapers) * 0.72}
                stroke={n.sparse ? "var(--copper)" : "var(--sapphire)"}
                strokeWidth={n.sparse ? 1 : 0.8}
                strokeOpacity={0.5}
                style={{
                  opacity: seen ? 1 : 0,
                  transform: seen ? "scale(1)" : "scale(0.2)",
                  transformOrigin: `${n.x}px ${n.y}px`,
                  transition: `opacity .6s ease ${i * 0.055}s, transform .7s cubic-bezier(.22,1,.36,1) ${i * 0.055}s`,
                }}
              />
              {/* invisible hit target, so the smallest dots stay hoverable */}
              <circle cx={n.x} cy={n.y} r={Math.max(11, n.r)} fill="transparent" />
            </g>
          ))}
        </g>

        {/* void label */}
        <g
          style={{
            opacity: seen ? 1 : 0,
            transition: "opacity .9s ease 1.4s",
          }}
        >
          <line
            x1={VOID.x + VOID.rx * 0.72}
            y1={VOID.y - VOID.ry * 0.72}
            x2={VOID.x + VOID.rx + 34}
            y2={VOID.y - VOID.ry - 16}
            stroke="var(--copper)"
            strokeWidth={0.9}
            strokeOpacity={0.6}
          />
          <circle cx={VOID.x + VOID.rx + 34} cy={VOID.y - VOID.ry - 16} r={2.4} fill="var(--copper)" />
        </g>
      </svg>

      {/* label rendered in HTML so it uses real type rather than SVG text */}
      <div
        style={{
          position: "absolute",
          left: `${((VOID.x + VOID.rx + 40) / W) * 100}%`,
          top: `${((VOID.y - VOID.ry - 30) / H) * 100}%`,
          opacity: seen ? 1 : 0,
          transition: "opacity .9s ease 1.5s",
          pointerEvents: "none",
        }}
      >
        <div className="eyebrow" style={{ color: "var(--copper)", fontSize: 9, marginBottom: 2 }}>
          Under-researched
        </div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", whiteSpace: "nowrap" }}>
          {overview.voids} pairings, no papers
        </div>
      </div>

      {/* core label */}
      <div
        style={{
          position: "absolute",
          left: `${((CORE.x + 96) / W) * 100}%`,
          top: `${((CORE.y - 116) / H) * 100}%`,
          opacity: seen ? 1 : 0,
          transition: "opacity .9s ease 1.2s",
          pointerEvents: "none",
        }}
      >
        <div className="eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>Saturated</div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", whiteSpace: "nowrap" }}>
          {overview.topLanguages[0]?.papers.toLocaleString()} papers on {overview.topLanguages[0]?.name}
        </div>
      </div>

      {hover && (
        <div
          className="glass"
          style={{
            position: "absolute",
            left: `${(hover.x / W) * 100}%`,
            top: `${(hover.y / H) * 100}%`,
            transform: "translate(-50%, calc(-100% - 14px))",
            padding: "7px 11px",
            borderRadius: 10,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 5,
          }}
        >
          <span style={{ fontSize: 12.5, fontWeight: 500 }}>{hover.name}</span>
          <span className="mono" style={{ fontSize: 11, color: hover.sparse ? "var(--copper)" : "var(--muted)", marginLeft: 8 }}>
            {hover.papers} papers
          </span>
        </div>
      )}
    </div>
  );
}
