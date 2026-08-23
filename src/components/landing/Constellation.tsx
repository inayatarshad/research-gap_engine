"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { GraphLanguage, Overview } from "@/lib/overview";

/**
 * The research map.
 *
 * Every tagged language in the corpus is a body in a force layout: sized by how
 * much research exists on it, bound to the languages it shares a family or a
 * script with, and pulled toward the centre in proportion to its coverage. The
 * well-studied ones collapse into a dense bright core and the neglected ones
 * are flung to the rim, so the shape of the field and the shape of its
 * absences are the same picture.
 *
 * It is a live simulation rather than a drawing: nodes can be dragged, the
 * whole field tilts toward the cursor, and the layout settles again afterwards.
 */

const W = 520;
const H = 500;
const CX = W / 2;
const CY = H / 2;

interface Body extends GraphLanguage {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  /** 0 = saturated core, 1 = neglected rim. Drives colour and target radius. */
  scarcity: number;
  /** Fake depth, used for parallax and draw order. */
  z: number;
}

interface Edge {
  a: number;
  b: number;
  strength: number;
}

/* ------------------------------------------------------------------ *
 * Layout
 * ------------------------------------------------------------------ */

/** Deterministic PRNG, so the layout is identical on server and client. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function build(langs: GraphLanguage[]): { bodies: Body[]; edges: Edge[] } {
  const rand = rng(20260818);
  const maxPapers = Math.max(1, ...langs.map((l) => l.papers));

  const bodies: Body[] = langs.map((l, i) => {
    // A log scale compressed almost every language into the same size, which
    // defeated the point. A power scale keeps English dominant while leaving
    // real visible spread across the rest of the distribution.
    const coverage = Math.pow(l.papers / maxPapers, 0.42);
    const scarcity = 1 - coverage;
    const a = i * 2.399963229728653 + rand() * 0.4;
    const radius = 40 + scarcity * 190;
    return {
      ...l,
      x: CX + Math.cos(a) * radius,
      y: CY + Math.sin(a) * radius,
      vx: 0,
      vy: 0,
      r: 3.2 + coverage * 16.5,
      scarcity,
      z: rand(),
    };
  });

  // Bind languages that plausibly share methods: same family, or same script.
  const edges: Edge[] = [];
  const degree = new Array(bodies.length).fill(0);
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const sameFamily = bodies[i].family === bodies[j].family;
      const sameScript = bodies[i].script === bodies[j].script;
      if (!sameFamily && !sameScript) continue;
      if (degree[i] > 5 || degree[j] > 5) continue;
      const strength = sameFamily && sameScript ? 1 : sameScript ? 0.7 : 0.45;
      edges.push({ a: i, b: j, strength });
      degree[i]++;
      degree[j]++;
    }
  }
  return { bodies, edges };
}

/** One step of a small spring/repulsion simulation. */
function step(bodies: Body[], edges: Edge[], held: number | null) {
  const n = bodies.length;

  for (let i = 0; i < n; i++) {
    const b = bodies[i];
    if (i === held) continue;

    // Coverage pulls inward: the more studied, the tighter to the core.
    const targetR = 34 + b.scarcity * 196;
    const dx = b.x - CX;
    const dy = b.y - CY;
    const d = Math.hypot(dx, dy) || 1;
    const pull = (targetR - d) * 0.016;
    b.vx += (dx / d) * pull;
    b.vy += (dy / d) * pull;
  }

  // Repulsion, so nodes never stack.
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = bodies[i];
      const b = bodies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d2 = dx * dx + dy * dy || 0.01;
      const min = a.r + b.r + 7;
      if (d2 > min * min * 5) continue;
      const d = Math.sqrt(d2);
      const force = Math.min(2.4, (min * min) / d2) * 0.32;
      const fx = (dx / d) * force;
      const fy = (dy / d) * force;
      if (i !== held) {
        a.vx -= fx;
        a.vy -= fy;
      }
      if (j !== held) {
        b.vx += fx;
        b.vy += fy;
      }
    }
  }

  // Springs along shared family or script.
  for (const e of edges) {
    const a = bodies[e.a];
    const b = bodies[e.b];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    const rest = 58;
    const f = (d - rest) * 0.0032 * e.strength;
    const fx = (dx / d) * f;
    const fy = (dy / d) * f;
    if (e.a !== held) {
      a.vx += fx;
      a.vy += fy;
    }
    if (e.b !== held) {
      b.vx -= fx;
      b.vy -= fy;
    }
  }

  let motion = 0;
  for (let i = 0; i < n; i++) {
    if (i === held) continue;
    const b = bodies[i];
    b.vx *= 0.86;
    b.vy *= 0.86;
    b.x += b.vx;
    b.y += b.vy;
    motion += Math.abs(b.vx) + Math.abs(b.vy);
    // Keep everything inside the frame.
    b.x = Math.max(b.r + 3, Math.min(W - b.r - 3, b.x));
    b.y = Math.max(b.r + 3, Math.min(H - b.r - 3, b.y));
  }
  return motion / n;
}

const TIER_FILL: Record<number, [string, string]> = {
  5: ["#28407a", "#0d1b3f"],
  4: ["#3b507d", "#16264d"],
  3: ["#5f6f97", "#2b3a63"],
  2: ["#9a8f7d", "#6b6252"],
  1: ["#c08a4e", "#8a4f22"],
  0: ["#d09a5c", "#a2662f"],
};

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */

export function Constellation({ overview }: { overview: Overview }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const initial = useMemo(() => build(overview.graph), [overview.graph]);
  const bodiesRef = useRef<Body[]>(initial.bodies.map((b) => ({ ...b })));
  const heldRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  const [, force] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);

  // Settle the layout before the first paint so it never appears mid-scramble.
  useMemo(() => {
    const b = bodiesRef.current;
    for (let i = 0; i < 320; i++) step(b, initial.edges, null);
  }, [initial.edges]);

  const tick = useCallback(() => {
    const motion = step(bodiesRef.current, initial.edges, heldRef.current);
    force((v) => v + 1);
    // Keep running while dragging or while the field is still moving.
    if (heldRef.current !== null || motion > 0.012) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      rafRef.current = 0;
    }
  }, [initial.edges]);

  const kick = useCallback(() => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => {
    setReady(true);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /* --- pointer --------------------------------------------------- */

  const toLocal = (e: { clientX: number; clientY: number }) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };

  const onPointerDown = (i: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    heldRef.current = i;
    kick();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const r = wrapRef.current!.getBoundingClientRect();
    // Whole-field parallax, strongest at the edges.
    setTilt({
      x: ((e.clientY - r.top) / r.height - 0.5) * -9,
      y: ((e.clientX - r.left) / r.width - 0.5) * 12,
    });
    if (heldRef.current === null) return;
    const p = toLocal(e);
    const b = bodiesRef.current[heldRef.current];
    b.x = p.x;
    b.y = p.y;
    b.vx = 0;
    b.vy = 0;
    force((v) => v + 1);
  };

  const release = () => {
    if (heldRef.current !== null) {
      heldRef.current = null;
      kick();
    }
  };

  const bodies = bodiesRef.current;
  const neighbours = useMemo(() => {
    if (hover === null) return new Set<number>();
    const s = new Set<number>();
    for (const e of initial.edges) {
      if (e.a === hover) s.add(e.b);
      if (e.b === hover) s.add(e.a);
    }
    return s;
  }, [hover, initial.edges]);

  const order = useMemo(
    () => bodies.map((_, i) => i).sort((a, b) => bodies[a].r - bodies[b].r),
    [bodies],
  );

  const hovered = hover !== null ? bodies[hover] : null;

  return (
    <div
      ref={wrapRef}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerLeave={() => {
        release();
        setTilt({ x: 0, y: 0 });
        setHover(null);
      }}
      style={{ position: "relative", width: "100%", perspective: 1200, touchAction: "none" }}
    >
      <div
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transformStyle: "preserve-3d",
          transition: heldRef.current === null ? "transform .5s cubic-bezier(.22,1,.36,1)" : "none",
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", height: "auto", display: "block", cursor: heldRef.current !== null ? "grabbing" : "default" }}
          role="img"
          aria-label={`Force layout of ${bodies.length} languages, sized by how much research exists on each`}
        >
          <defs>
            <radialGradient id="coreHalo" cx="50%" cy="50%">
              <stop offset="0%" stopColor="#3b507d" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b507d" stopOpacity="0" />
            </radialGradient>
            {Object.entries(TIER_FILL).map(([tier, [light, dark]]) => (
              <radialGradient key={tier} id={`sphere${tier}`} cx="34%" cy="30%" r="72%">
                <stop offset="0%" stopColor={light} />
                <stop offset="62%" stopColor={dark} />
                <stop offset="100%" stopColor={dark} stopOpacity="0.92" />
              </radialGradient>
            ))}
            <filter id="soften" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
          </defs>

          <ellipse cx={CX} cy={CY} rx={168} ry={158} fill="url(#coreHalo)" />

          {/* filaments */}
          <g>
            {initial.edges.map((e, i) => {
              const a = bodies[e.a];
              const b = bodies[e.b];
              const active = hover !== null && (e.a === hover || e.b === hover);
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={active ? "var(--copper)" : "var(--sapphire)"}
                  strokeWidth={active ? 1.1 : 0.5}
                  strokeOpacity={ready ? (active ? 0.75 : 0.16 + e.strength * 0.1) : 0}
                  style={{ transition: "stroke-opacity .35s ease, stroke .35s ease" }}
                />
              );
            })}
          </g>

          {/* bodies, small to large so the giants read on top */}
          <g>
            {order.map((i) => {
              const b = bodies[i];
              const dim = hover !== null && hover !== i && !neighbours.has(i);
              const lift = 1 + b.z * 0.35;
              return (
                <g
                  key={b.code}
                  onPointerDown={onPointerDown(i)}
                  onPointerEnter={() => setHover(i)}
                  style={{
                    cursor: "grab",
                    opacity: ready ? (dim ? 0.28 : 1) : 0,
                    transition: "opacity .35s ease",
                  }}
                >
                  {/* contact shadow, which is what sells the sphere */}
                  <ellipse
                    cx={b.x + 1.6 * lift}
                    cy={b.y + 2.4 * lift}
                    rx={b.r * 0.95}
                    ry={b.r * 0.85}
                    fill="#112250"
                    opacity={0.16}
                    filter="url(#soften)"
                  />
                  <circle cx={b.x} cy={b.y} r={b.r} fill={`url(#sphere${b.tier})`} />
                  {/* rim light */}
                  <circle
                    cx={b.x}
                    cy={b.y}
                    r={b.r}
                    fill="none"
                    stroke="#ffffff"
                    strokeOpacity={0.34}
                    strokeWidth={0.7}
                  />
                  {/* specular */}
                  <ellipse
                    cx={b.x - b.r * 0.3}
                    cy={b.y - b.r * 0.38}
                    rx={b.r * 0.3}
                    ry={b.r * 0.22}
                    fill="#ffffff"
                    opacity={0.42}
                  />
                  {hover === i && (
                    <circle
                      cx={b.x}
                      cy={b.y}
                      r={b.r + 6}
                      fill="none"
                      stroke="var(--copper)"
                      strokeWidth={1.2}
                      strokeOpacity={0.9}
                    />
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* readout, replacing the old floating captions */}
      <div
        className="glass"
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          padding: "11px 14px",
          borderRadius: 13,
          minWidth: 210,
          pointerEvents: "none",
          opacity: ready ? 1 : 0,
          transition: "opacity .5s ease .3s",
        }}
      >
        {hovered ? (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 14.5, fontWeight: 600 }}>{hovered.name}</span>
              <span className="tier" data-t={hovered.tier} style={{ fontSize: 9 }}>
                T{hovered.tier}
              </span>
            </div>
            <div className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>
              {hovered.papers.toLocaleString()} papers
              {hovered.topTask ? ` · mostly ${hovered.topTask.toLowerCase()}` : ""}
            </div>
          </>
        ) : (
          <>
            <div className="eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>
              {bodies.length} languages, by coverage
            </div>
            <div style={{ fontSize: 12.4, color: "var(--muted)", lineHeight: 1.45 }}>
              Centre is saturated, rim is neglected. Drag any node.
            </div>
          </>
        )}
      </div>

      {/* legend */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          pointerEvents: "none",
          opacity: ready ? 1 : 0,
          transition: "opacity .5s ease .4s",
        }}
      >
        {[
          { t: 5, l: "Saturated" },
          { t: 3, l: "Emerging" },
          { t: 0, l: "Neglected" },
        ].map((k) => (
          <span key={k.t} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 99,
                background: `linear-gradient(140deg, ${TIER_FILL[k.t][0]}, ${TIER_FILL[k.t][1]})`,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.5)",
              }}
            />
            <span className="eyebrow" style={{ fontSize: 9 }}>
              {k.l}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
