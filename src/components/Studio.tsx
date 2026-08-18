"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { renderBrief } from "@/lib/brief";
import { type Preset } from "@/lib/presets";
import { LANG_BY_CODE, TASK_BY_ID } from "@/lib/taxonomy";
import type { Overview } from "@/lib/overview";
import type { CorpusMeta, Landscape, Scope } from "@/lib/types";

import { Composer } from "./Composer";
import { HeroBlock, LandingBody } from "./Landing";
import { Concentration, Quadrant, Timeline } from "./Charts";
import { EvidenceDrawer, PaperRow, type EvidenceQuery } from "./EvidenceDrawer";
import { GapCard } from "./GapCard";
import { GapMatrix } from "./GapMatrix";
import { Bar, EvidenceLink, Empty, Section, TierBadge, Trend } from "./primitives";

const EMPTY_SCOPE: Scope = { query: "", languages: [], tasks: [], yearFrom: 2010, yearTo: 2026 };

/* ---- shareable scope in the query string ---- */

function writeUrl(s: Scope) {
  const p = new URLSearchParams();
  if (s.query) p.set("q", s.query);
  if (s.languages.length) p.set("lang", s.languages.join(","));
  if (s.tasks.length) p.set("task", s.tasks.join(","));
  if (s.yearFrom !== EMPTY_SCOPE.yearFrom) p.set("from", String(s.yearFrom));
  if (s.yearTo !== EMPTY_SCOPE.yearTo) p.set("to", String(s.yearTo));
  const qs = p.toString();
  window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
}

function readUrl(): Scope | null {
  const p = new URLSearchParams(window.location.search);
  const query = p.get("q") ?? "";
  const languages = p.get("lang")?.split(",").filter(Boolean) ?? [];
  const tasks = p.get("task")?.split(",").filter(Boolean) ?? [];
  if (!query && !languages.length && !tasks.length) return null;
  return {
    query,
    languages,
    tasks,
    yearFrom: Number(p.get("from")) || EMPTY_SCOPE.yearFrom,
    yearTo: Number(p.get("to")) || EMPTY_SCOPE.yearTo,
  };
}

const SECTIONS = [
  { id: "reading", label: "Reading" },
  { id: "matrix", label: "Coverage" },
  { id: "gaps", label: "Gaps" },
  { id: "themes", label: "Themes" },
  { id: "resources", label: "Resources" },
  { id: "papers", label: "Papers" },
];

export function Studio({ meta, overview }: { meta: CorpusMeta; overview: Overview }) {
  const [scope, setScope] = useState<Scope>(EMPTY_SCOPE);
  const [landscape, setLandscape] = useState<Landscape | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [evidence, setEvidence] = useState<EvidenceQuery | null>(null);
  const [active, setActive] = useState("reading");
  const [scopeOpen, setScopeOpen] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Reaching the scope should never require finding it on screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setScopeOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const run = useCallback(async (s: Scope) => {
    setBusy(true);
    setError(null);
    writeUrl(s);
    try {
      const res = await fetch("/api/landscape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Analysis failed");
      setLandscape(json.landscape);
      setElapsed(json.elapsedMs);
      requestAnimationFrame(() =>
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }, []);

  const runPreset = (p: Preset) => {
    const s: Scope = { ...EMPTY_SCOPE, query: p.query, languages: p.languages, tasks: p.tasks };
    setScope(s);
    run(s);
  };

  // A landscape is worth linking to: restore one from the URL on load so an
  // analysis can be shared or cited directly.
  useEffect(() => {
    const s = readUrl();
    if (s) {
      setScope(s);
      run(s);
    }
    // Intentionally once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll spy for the sticky section nav.
  useEffect(() => {
    if (!landscape) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: [0.05, 0.3] },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [landscape]);

  const openEvidence = useCallback((q: EvidenceQuery) => setEvidence(q), []);

  return (
    <>
      <Header
        meta={meta}
        landscape={landscape}
        active={active}
        scope={scope}
        scopeOpen={scopeOpen}
        onToggleScope={() => setScopeOpen((v) => !v)}
        onReset={() => {
          setLandscape(null);
          setScopeOpen(false);
        }}
      />

      {/*
        Once results exist the composer moves out of the document flow and
        becomes a panel hung off the header. Left inline it occupied roughly
        180px of permanent vertical space above every screen of content.
      */}
      {landscape && (
        <ScopePanel open={scopeOpen} onClose={() => setScopeOpen(false)}>
          <Composer
            scope={scope}
            setScope={setScope}
            onRun={(s) => {
              setScopeOpen(false);
              run(s);
            }}
            busy={busy}
          />
        </ScopePanel>
      )}

      <main className="wrap" style={{ paddingBottom: 100 }}>
        {!landscape && <HeroBlock overview={overview} />}

        {!landscape && (
          <Composer scope={scope} setScope={setScope} onRun={run} busy={busy} />
        )}

        {!landscape && !busy && <LandingBody overview={overview} onPick={runPreset} />}

        {error && (
          <div
            className="card"
            style={{
              marginTop: 20,
              padding: 16,
              borderColor: "rgba(162,102,47,.35)",
              background: "var(--copper-soft)",
              fontSize: 13.5,
            }}
          >
            {error}
          </div>
        )}

        {busy && !landscape && <LoadingState />}

        <div ref={resultsRef}>
          {landscape && (
            <Results landscape={landscape} elapsed={elapsed} onEvidence={openEvidence} scope={scope} />
          )}
        </div>
      </main>

      <EvidenceDrawer query={evidence} onClose={() => setEvidence(null)} />
    </>
  );
}

/* ================================================================== *
 * Chrome
 * ================================================================== */

function Header({
  meta,
  landscape,
  active,
  scope,
  scopeOpen,
  onToggleScope,
  onReset,
}: {
  meta: CorpusMeta;
  landscape: Landscape | null;
  active: string;
  scope: Scope;
  scopeOpen: boolean;
  onToggleScope: () => void;
  onReset: () => void;
}) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(245,244,240,.86)",
        backdropFilter: "blur(12px) saturate(1.4)",
        borderBottom: "1px solid var(--line-soft)",
      }}
    >
      <div
        className="wrap"
        style={{ height: 56, display: "flex", alignItems: "center", gap: 18 }}
      >
        <button
          onClick={onReset}
          aria-label="HERMÈS: back to start"
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 11,
          }}
        >
          {/* The mark carries its own navy ground, so it is set as a tile
              rather than floated on the ivory page. */}
          <img
            src="/logo.png"
            alt=""
            width={34}
            height={28}
            style={{
              height: 28,
              width: "auto",
              borderRadius: 7,
              display: "block",
              boxShadow: "0 1px 3px rgba(17,34,80,.18)",
            }}
          />
          <span style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
            <span className="display" style={{ fontSize: 23, letterSpacing: "-0.02em" }}>
              HERMÈS
            </span>
            <span className="eyebrow brand-sub" style={{ fontSize: 9 }}>
              research gap engine
            </span>
          </span>
        </button>

        {landscape && (
          <nav style={{ display: "flex", gap: 2, marginLeft: 8, overflowX: "auto" }} className="scroll-thin section-nav">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                style={{
                  padding: "5px 11px",
                  borderRadius: 999,
                  fontSize: 12.5,
                  color: active === s.id ? "var(--ink)" : "var(--muted)",
                  background: active === s.id ? "var(--champagne)" : "transparent",
                  whiteSpace: "nowrap",
                  transition: "background .18s, color .18s",
                }}
              >
                {s.label}
              </a>
            ))}
          </nav>
        )}

        <div style={{ flex: 1, minWidth: 8 }} />

        {landscape ? (
          <ScopePill scope={scope} landscape={landscape} open={scopeOpen} onClick={onToggleScope} />
        ) : (
          <span className="mono" style={{ fontSize: 11, color: "var(--faint)", whiteSpace: "nowrap" }}>
            {meta.paperCount.toLocaleString()} papers · {meta.languagesCovered} languages
          </span>
        )}
      </div>
    </header>
  );
}

/**
 * The scope, reduced to one line. It reads as a control rather than a label:
 * the current query, what constrains it, and how many papers that returned,
 * with the full composer one click or one keystroke away.
 */
function ScopePill({
  scope,
  landscape,
  open,
  onClick,
}: {
  scope: Scope;
  landscape: Landscape;
  open: boolean;
  onClick: () => void;
}) {
  const constraints = scope.languages.length + scope.tasks.length;
  const label =
    scope.query.trim() ||
    [
      ...scope.languages.map((l) => LANG_BY_CODE.get(l)?.name ?? l),
      ...scope.tasks.map((t) => TASK_BY_ID.get(t)?.name ?? t),
    ].join(", ") ||
    "All papers";

  return (
    <button
      onClick={onClick}
      aria-expanded={open}
      title="Edit scope (⌘K)"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        maxWidth: "min(46vw, 430px)",
        padding: "6px 8px 6px 13px",
        borderRadius: 999,
        border: `1px solid ${open ? "var(--ink)" : "var(--line-strong)"}`,
        background: open ? "var(--champagne)" : "var(--paper)",
        cursor: "pointer",
        transition: "background .16s, border-color .16s",
        flexShrink: 1,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontSize: 13,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          minWidth: 0,
        }}
      >
        {label}
      </span>
      {constraints > 0 && (
        <span className="tag" style={{ fontSize: 10, flexShrink: 0 }}>
          +{constraints}
        </span>
      )}
      <span
        className="mono"
        style={{
          fontSize: 11,
          color: "var(--muted)",
          background: "var(--ivory)",
          border: "1px solid var(--line-soft)",
          borderRadius: 999,
          padding: "3px 9px",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {landscape.cohortSize.toLocaleString()}
      </span>
      <span
        aria-hidden
        style={{
          fontSize: 10,
          color: "var(--faint)",
          transform: open ? "rotate(180deg)" : "none",
          transition: "transform .2s",
          flexShrink: 0,
        }}
      >
        ▾
      </span>
    </button>
  );
}

/** Drops the composer out of the header without displacing the page. */
function ScopePanel({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        className="fade"
        style={{ position: "fixed", inset: "56px 0 0", background: "rgba(17,34,80,.16)", zIndex: 44 }}
      />
      <div
        className="wrap"
        style={{ position: "fixed", top: 56, left: 0, right: 0, zIndex: 45, paddingTop: 10 }}
      >
        <div
          style={{
            animation: "dropIn .24s cubic-bezier(.22,1,.36,1) both",
            boxShadow: "var(--shadow-lg)",
            borderRadius: "var(--radius)",
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}

function LoadingState() {
  const steps = [
    "Retrieving cohort",
    "Tagging languages and tasks",
    "Building coverage matrix",
    "Scoring gaps against peer evidence",
  ];
  return (
    <div style={{ marginTop: 34 }}>
      <div className="eyebrow" style={{ marginBottom: 14 }}>
        Mapping the field
      </div>
      <div style={{ display: "grid", gap: 9, marginBottom: 22 }}>
        {steps.map((s, i) => (
          <div
            key={s}
            className="rise"
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              fontSize: 13.5,
              color: "var(--muted)",
              animationDelay: `${i * 0.14}s`,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 99,
                background: "var(--copper)",
                flexShrink: 0,
              }}
            />
            {s}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        <div className="skeleton" style={{ height: 128 }} />
        <div className="skeleton" style={{ height: 250 }} />
      </div>
    </div>
  );
}

/* ================================================================== *
 * Results
 * ================================================================== */

function Results({
  landscape: l,
  elapsed,
  onEvidence,
  scope,
}: {
  landscape: Landscape;
  elapsed: number | null;
  onEvidence: (q: EvidenceQuery) => void;
  scope: Scope;
}) {
  const focusGaps = l.gaps.filter((g) => g.focus);
  const adjacentGaps = l.gaps.filter((g) => !g.focus);

  if (l.cohortSize === 0) {
    return (
      <div style={{ marginTop: 40 }}>
        <Empty
          title="No papers matched this scope"
          hint="Usually a scoping artefact rather than a finding, widen the years, drop a filter, or describe the area differently."
        />
      </div>
    );
  }

  return (
    <div style={{ marginTop: 30, display: "grid", gap: 62 }}>
      <Section
        id="reading"
        eyebrow={`${l.cohortSize.toLocaleString()} papers in scope${elapsed ? ` · analysed in ${elapsed} ms` : ""}`}
        title={l.narrative.headline}
        aside={<BriefButton landscape={l} />}
      >
        {l.reliability.level !== "good" && (
          <div
            className="card"
            style={{
              marginBottom: 16,
              padding: "13px 16px",
              display: "flex",
              gap: 11,
              alignItems: "flex-start",
              background: l.reliability.level === "thin" ? "var(--copper-soft)" : "var(--paper)",
              borderColor:
                l.reliability.level === "thin" ? "rgba(162,102,47,.35)" : "var(--line)",
            }}
          >
            <span style={{ color: "var(--copper)", fontSize: 15, lineHeight: 1.3 }}>△</span>
            <div>
              <div className="eyebrow" style={{ marginBottom: 3, color: "var(--copper)" }}>
                {l.reliability.level === "thin" ? "Thin evidence base" : "Narrow evidence base"}
              </div>
              <div style={{ fontSize: 13.4, lineHeight: 1.55 }}>{l.reliability.note}</div>
            </div>
          </div>
        )}

        <Signals landscape={l} onEvidence={onEvidence} />

        <div className="read-grid" style={{ marginTop: 18 }}>
          <div className="card" style={{ padding: "20px 22px" }}>
            {l.narrative.paragraphs.map((p, i) => (
              <p
                key={i}
                style={{
                  margin: i === 0 ? "0 0 13px" : "0 0 13px",
                  fontSize: i === 0 ? 16 : 14.4,
                  lineHeight: 1.66,
                  color: i === 0 ? "var(--ink)" : "var(--muted)",
                }}
              >
                {p}
              </p>
            ))}
            <div className="hairline" style={{ paddingTop: 13, marginTop: 4 }}>
              <Interpretation landscape={l} />
            </div>
          </div>

          <EquityPanel landscape={l} onEvidence={onEvidence} />
        </div>
      </Section>

      <Section
        id="matrix"
        eyebrow="Coverage matrix"
        title="Which languages get which tasks"
        lede="Each cell is a language–task pairing across the whole index, not just this cohort. Hatched cells have no indexed paper at all: hover one to see whether related languages have solved it."
      >
        <GapMatrix
          landscape={l}
          onCell={(langCode, taskId) =>
            onEvidence({
              languages: [langCode],
              tasks: [taskId],
              title: `${LANG_BY_CODE.get(langCode)?.name ?? langCode} × ${TASK_BY_ID.get(taskId)?.name ?? taskId}`,
            })
          }
        />

        <div className="split-grid" style={{ marginTop: 16 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              Saturation vs opportunity
            </div>
            <Quadrant
              landscape={l}
              onTask={(taskId, label) => onEvidence({ tasks: [taskId], title: label })}
            />
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              Publication activity
            </div>
            <Timeline landscape={l} onYear={(year) => onEvidence({ years: [year], title: `Papers from ${year}` })} />
          </div>
        </div>
      </Section>

      <Section
        id="gaps"
        eyebrow={`${l.gaps.length} scored opportunities`}
        title="Where the gaps are"
        lede="Each gap is scored out of 100 from five transparent components. Peer evidence carries the most weight: a task that comparable languages have already solved, and this one has not, is a tractable gap rather than a non-problem."
      >
        {focusGaps.length > 0 && (
          <>
            <div className="eyebrow" style={{ marginBottom: 11 }}>
              In your scope
            </div>
            <div style={{ display: "grid", gap: 13, marginBottom: 30 }}>
              {focusGaps.map((g, i) => (
                <GapCard
                  key={g.id}
                  gap={g}
                  rank={i + 1}
                  onEvidence={(filter, label) => onEvidence({ ...filter, title: label })}
                />
              ))}
            </div>
          </>
        )}

        {adjacentGaps.length > 0 && (
          <>
            <div className="eyebrow" style={{ marginBottom: 5 }}>
              Adjacent opportunities
            </div>
            <p style={{ margin: "0 0 13px", fontSize: 13.5, color: "var(--muted)", maxWidth: 640 }}>
              Outside the exact scope you asked for, but close enough that the methods and often the
              data transfer.
            </p>
            <div style={{ display: "grid", gap: 13 }}>
              {adjacentGaps.map((g, i) => (
                <GapCard
                  key={g.id}
                  gap={g}
                  rank={focusGaps.length + i + 1}
                  onEvidence={(filter, label) => onEvidence({ ...filter, title: label })}
                />
              ))}
            </div>
          </>
        )}
      </Section>

      <Section
        id="themes"
        eyebrow="Major themes"
        title="What this area is actually about"
        lede="Themes are the tasks the cohort clusters into, each with the terms that appear unusually often here compared with the rest of the corpus."
      >
        <div className="grid-auto">
          {l.themes.map((t) => (
            <div key={t.id} className="card card-lift" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <h3 className="serif" style={{ margin: 0, fontSize: 17.5, lineHeight: 1.25 }}>
                  {t.label}
                </h3>
                <Trend value={t.momentum} />
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "9px 0 11px" }}>
                <EvidenceLink onClick={() => onEvidence({ tasks: [t.id], title: t.label })}>
                  <span className="mono" style={{ fontSize: 15 }}>
                    {t.count}
                  </span>
                </EvidenceLink>
                <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
                  papers · {Math.round(t.share * 100)}% of cohort
                </span>
                <span
                  className="tag"
                  style={{
                    marginLeft: "auto",
                    background:
                      t.trend === "surging" || t.trend === "growing" ? "var(--sage-soft)" : "var(--ivory)",
                  }}
                >
                  {t.trend}
                </span>
              </div>
              {t.distinctiveTerms.length > 0 && (
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 11 }}>
                  {t.distinctiveTerms.map((d) => (
                    <span key={d} className="tag" style={{ fontSize: 10.5 }}>
                      {d}
                    </span>
                  ))}
                </div>
              )}
              <div className="hairline" style={{ paddingTop: 10 }}>
                <div className="eyebrow" style={{ fontSize: 9, marginBottom: 6 }}>
                  Notable work
                </div>
                <ul style={{ margin: 0, paddingLeft: 15, fontSize: 12.2, color: "var(--muted)", lineHeight: 1.5 }}>
                  {t.topPapers.map((p) => (
                    <li key={p.id} style={{ marginBottom: 4 }}>
                      {p.title} <span className="mono" style={{ color: "var(--faint)" }}>({p.year})</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="resources"
        eyebrow="Datasets and methods"
        title="What the work is built on"
        lede="Concentration matters: when most results in an area come from one corpus, published performance describes that corpus as much as it describes the language."
      >
        <Concentration
          landscape={l}
          onDataset={(name) => onEvidence({ datasets: [name], title: name })}
        />

        <div className="split-grid" style={{ marginTop: 16 }}>
          <FacetPanel
            title="Methods in use"
            note={l.methodLag.verdict}
            items={l.methodFacets.slice(0, 10).map((f) => ({
              id: f.id,
              label: f.label,
              count: f.count,
              sub: String(f.meta?.era ?? ""),
            }))}
            onPick={(id, label) => onEvidence({ methods: [id], title: label })}
          />
          <FacetPanel
            title="Where it gets published"
            note={`${l.venueFacets.length}+ distinct venues in this cohort.`}
            items={l.venueFacets.slice(0, 10).map((f) => ({ id: f.id, label: f.label, count: f.count }))}
            onPick={(id, label) => onEvidence({ venues: [id], title: label })}
          />
        </div>
      </Section>

      <Section
        id="papers"
        eyebrow={`Top ${Math.min(l.papers.length, 40)} of ${l.cohortSize.toLocaleString()}`}
        title="The papers behind all of this"
        lede="Ranked by relevance to your scope. Every figure elsewhere on this page resolves back into this set."
      >
        <div className="card" style={{ padding: "4px 20px 8px" }}>
          {l.papers.slice(0, 40).map((sp) => (
            <PaperRow key={sp.paper.id} paper={sp.paper} />
          ))}
        </div>
        <Method scope={scope} landscape={l} />
      </Section>
    </div>
  );
}

/* ================================================================== *
 * Result sub-components
 * ================================================================== */

function Signals({ landscape: l, onEvidence }: { landscape: Landscape; onEvidence: (q: EvidenceQuery) => void }) {
  return (
    <div className="grid-auto">
      {l.narrative.signals.map((s) => (
        <div key={s.label} className="card" style={{ padding: "14px 16px" }}>
          <div className="eyebrow" style={{ marginBottom: 7 }}>
            {s.label}
          </div>
          <div className="mono" style={{ fontSize: 27, lineHeight: 1.05, marginBottom: 5 }}>
            {s.value}
          </div>
          <div style={{ fontSize: 12, color: "var(--faint)", lineHeight: 1.4 }}>{s.detail}</div>
        </div>
      ))}
    </div>
  );
}

function Interpretation({ landscape: l }: { landscape: Landscape }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 12.5 }}>
      <span className="eyebrow">Understood as</span>
      {l.resolved.interpreted.length ? (
        l.resolved.interpreted.map((i) => (
          <span key={i} className="tag">
            {i}
          </span>
        ))
      ) : (
        <span style={{ color: "var(--faint)" }}>free text only</span>
      )}
      {l.resolved.unmatched.length > 0 && (
        <>
          <span style={{ color: "var(--taupe)" }}>·</span>
          <span className="eyebrow">matched loosely</span>
          {l.resolved.unmatched.slice(0, 5).map((u) => (
            <span key={u} className="tag" style={{ color: "var(--faint)" }}>
              {u}
            </span>
          ))}
        </>
      )}
    </div>
  );
}

function EquityPanel({ landscape: l, onEvidence }: { landscape: Landscape; onEvidence: (q: EvidenceQuery) => void }) {
  const rows = l.equity.speakersPerPaper.slice(0, 7);
  const max = Math.max(1, ...rows.map((r) => r.ratio));
  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div className="eyebrow" style={{ marginBottom: 4 }}>
        Speakers per paper
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 12.6, color: "var(--muted)", lineHeight: 1.5 }}>
        Millions of speakers for each paper in this cohort. Longer bars are languages carrying more
        people per unit of research attention.
      </p>
      {rows.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--faint)" }}>
          No lower-resource languages appear in this cohort, itself the finding.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 9 }}>
          {rows.map((r) => (
            <div key={r.langName} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.6 }}>
              <span style={{ minWidth: 86, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.langName}
              </span>
              <Bar value={r.ratio} max={max} color="var(--copper)" />
              <span className="mono" style={{ minWidth: 62, textAlign: "right", color: "var(--muted)" }}>
                {Math.round(r.ratio)}M / paper
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="hairline" style={{ marginTop: 14, paddingTop: 12, display: "grid", gap: 7, fontSize: 12.5 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--faint)" }}>Touch a tier 0–2 language</span>
          <span className="mono">{Math.round(l.equity.lowResourceShare * 100)}%</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--faint)" }}>Only tier 4–5 languages</span>
          <span className="mono">{Math.round(l.equity.highResourceShare * 100)}%</span>
        </div>
      </div>
      <div style={{ marginTop: 13, display: "flex", gap: 5, flexWrap: "wrap" }}>
        {l.languageFacets.slice(0, 9).map((f) => (
          <button
            key={f.id}
            className="tag"
            style={{ cursor: "pointer" }}
            onClick={() => onEvidence({ languages: [f.id], title: f.label })}
          >
            {f.label} <strong style={{ color: "var(--ink)" }}>{f.count}</strong>
            {f.meta?.tier !== undefined && <TierBadge tier={f.meta.tier as 0} showLabel={false} />}
          </button>
        ))}
      </div>
    </div>
  );
}

function FacetPanel({
  title,
  note,
  items,
  onPick,
}: {
  title: string;
  note?: string;
  items: { id: string; label: string; count: number; sub?: string }[];
  onPick: (id: string, label: string) => void;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="eyebrow" style={{ marginBottom: note ? 6 : 12 }}>
        {title}
      </div>
      {note && (
        <p style={{ margin: "0 0 13px", fontSize: 12.6, color: "var(--muted)", lineHeight: 1.5 }}>{note}</p>
      )}
      <div style={{ display: "grid", gap: 7 }}>
        {items.map((i) => (
          <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.8 }}>
            <EvidenceLink onClick={() => onPick(i.id, i.label)}>
              <span
                style={{
                  display: "inline-block",
                  minWidth: 150,
                  maxWidth: 150,
                  textAlign: "left",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={i.label}
              >
                {i.label}
              </span>
            </EvidenceLink>
            <Bar value={i.count} max={max} />
            <span className="mono" style={{ minWidth: 32, textAlign: "right", color: "var(--muted)" }}>
              {i.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BriefButton({ landscape }: { landscape: Landscape }) {
  const [done, setDone] = useState(false);
  const md = useMemo(() => renderBrief(landscape), [landscape]);

  const download = () => {
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug =
      (landscape.scope.query || landscape.resolved.languages[0]?.name || "research")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48) || "research";
    a.href = url;
    a.download = `gap-brief-${slug}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setDone(true);
    setTimeout(() => setDone(false), 2200);
  };

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <CopyLink />
      <button
        className="btn"
        onClick={() => {
          navigator.clipboard?.writeText(md);
          setDone(true);
          setTimeout(() => setDone(false), 2200);
        }}
      >
        Copy brief
      </button>
      <button className="btn btn-primary" onClick={download}>
        {done ? "Done ✓" : "Download brief"}
      </button>
    </div>
  );
}

function CopyLink() {
  const [done, setDone] = useState(false);
  return (
    <button
      className="btn"
      title="Copy a link that reopens this exact analysis"
      onClick={() => {
        navigator.clipboard?.writeText(window.location.href);
        setDone(true);
        setTimeout(() => setDone(false), 2200);
      }}
    >
      {done ? "Link copied ✓" : "Copy link"}
    </button>
  );
}

function Method({ scope, landscape }: { scope: Scope; landscape: Landscape }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card" style={{ marginTop: 18, padding: 18, background: "transparent", boxShadow: "none" }}>
      <button
        className="btn btn-ghost"
        onClick={() => setOpen(!open)}
        style={{ padding: 0, fontSize: 12.8 }}
        aria-expanded={open}
      >
        <span className="eyebrow">How these numbers were produced</span>
        <span style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▾</span>
      </button>
      {open && (
        <div className="fade" style={{ marginTop: 13, fontSize: 13.2, color: "var(--muted)", lineHeight: 1.66, maxWidth: 760 }}>
          <p style={{ margin: "0 0 11px" }}>
            Papers come from the ACL Anthology bulk export supplemented with OpenAlex records,
            filtered to work touching lower-resource or multilingual settings. Language, task, method
            and dataset tags are assigned by matching an explicit gazetteer against each title and
            abstract, with no model inference, so every count is reproducible from the source text.
          </p>
          <p style={{ margin: "0 0 11px" }}>
            Retrieval is BM25 over title and abstract with taxonomy expansion: a query naming a
            concept is expanded to every surface form of that concept before scoring, which is why
            “toxic language in Roman Urdu” reaches papers titled “abusive content detection for
            code-mixed Urdu-English”. Resource tiers follow Joshi et al. (2020). Momentum compares
            the last three publication years against the three before. Concentration is a
            Herfindahl–Hirschman Index over named resources.
          </p>
          <p style={{ margin: 0, color: "var(--ink)" }}>
            <strong style={{ fontWeight: 500 }}>Limitations.</strong> Absence from this index is not
            proof of absence from the literature: a paper is missed if it has no abstract, sits
            outside the indexed venues, or names its language in vocabulary the gazetteer does not
            carry. Tags reflect what a paper mentions, which over-counts languages listed in passing
            by multilingual surveys. Treat these counts as a defensible starting point for a
            literature search, not a replacement for one.
          </p>
          <p style={{ margin: "11px 0 0", fontSize: 12, color: "var(--faint)" }} className="mono">
            scope: {JSON.stringify(scope)} · cohort {landscape.cohortSize} / {landscape.corpusSize}
          </p>
        </div>
      )}
    </div>
  );
}
