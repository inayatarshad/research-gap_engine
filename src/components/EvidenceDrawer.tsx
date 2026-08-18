"use client";

import { useEffect, useState } from "react";

import { LANG_BY_CODE, TASK_BY_ID } from "@/lib/taxonomy";
import type { Paper } from "@/lib/types";

export interface EvidenceQuery {
  languages?: string[];
  tasks?: string[];
  datasets?: string[];
  methods?: string[];
  venues?: string[];
  years?: number[];
  title: string;
}

/**
 * Resolves any statistic in the interface back to the papers behind it.
 *
 * This is the credibility contract of the whole tool: a reader who does not
 * believe a claim is always two clicks from the underlying records, and a claim
 * that cannot be resolved this way does not get made.
 */
export function EvidenceDrawer({
  query,
  onClose,
}: {
  query: EvidenceQuery | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<{ total: number; papers: Paper[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<"prominence" | "year">("prominence");

  useEffect(() => {
    if (!query) {
      setData(null);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    fetch("/api/evidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [query]);

  useEffect(() => {
    if (!query) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [query, onClose]);

  if (!query) return null;

  const papers = data?.papers
    ? [...data.papers].sort((a, b) =>
        sort === "year" ? b.year - a.year : b.prominence - a.prominence || b.year - a.year,
      )
    : [];

  return (
    <>
      <div
        onClick={onClose}
        className="fade"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(17,34,80,.24)",
          backdropFilter: "blur(2px)",
          zIndex: 90,
        }}
      />
      <aside
        role="dialog"
        aria-label={`Papers behind ${query.title}`}
        className="scroll-thin"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(560px, 100vw)",
          background: "var(--paper)",
          borderLeft: "1px solid var(--line)",
          boxShadow: "var(--shadow-lg)",
          zIndex: 91,
          display: "flex",
          flexDirection: "column",
          animation: "drawIn .32s cubic-bezier(.22,1,.36,1) both",
        }}
      >
        <header
          style={{
            padding: "16px 20px 13px",
            borderBottom: "1px solid var(--line-soft)",
            background: "var(--paper)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start" }}>
            <div style={{ minWidth: 0 }}>
              <div className="eyebrow" style={{ marginBottom: 5 }}>
                Evidence
              </div>
              <h3 className="serif" style={{ margin: 0, fontSize: 21, lineHeight: 1.22 }}>
                {query.title}
              </h3>
            </div>
            <button className="btn btn-ghost" onClick={onClose} aria-label="Close evidence panel">
              Esc ✕
            </button>
          </div>

          <div style={{ display: "flex", gap: 7, marginTop: 11, flexWrap: "wrap", alignItems: "center" }}>
            {query.languages?.map((l) => (
              <span key={l} className="tag">
                {LANG_BY_CODE.get(l)?.name ?? l}
              </span>
            ))}
            {query.tasks?.map((t) => (
              <span key={t} className="tag">
                {TASK_BY_ID.get(t)?.name ?? t}
              </span>
            ))}
            {query.datasets?.map((d) => (
              <span key={d} className="tag">
                {d}
              </span>
            ))}
            {query.years?.map((y) => (
              <span key={y} className="tag">
                {y}
              </span>
            ))}
            <div style={{ flex: 1 }} />
            {data && (
              <button
                className="btn btn-ghost"
                style={{ fontSize: 12 }}
                onClick={() => setSort(sort === "year" ? "prominence" : "year")}
              >
                sort: {sort === "year" ? "newest" : "most cited"}
              </button>
            )}
          </div>

          {data && (
            <div style={{ marginTop: 9, fontSize: 12.5, color: "var(--muted)" }}>
              <span className="mono" style={{ color: "var(--ink)" }}>
                {data.total.toLocaleString()}
              </span>{" "}
              matching {data.total === 1 ? "paper" : "papers"} in the index
              {data.total > papers.length && <span style={{ color: "var(--faint)" }}> · showing {papers.length}</span>}
            </div>
          )}
        </header>

        <div className="scroll-thin" style={{ flex: 1, overflowY: "auto", padding: "12px 20px 32px" }}>
          {loading && (
            <div style={{ display: "grid", gap: 10, paddingTop: 8 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 74 }} />
              ))}
            </div>
          )}

          {!loading && papers.length === 0 && (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted)" }}>
              <div className="serif" style={{ fontSize: 19, color: "var(--ink)", marginBottom: 6 }}>
                Nothing indexed here
              </div>
              <p style={{ fontSize: 13.5, lineHeight: 1.6, maxWidth: 340, margin: "0 auto" }}>
                That absence is the finding. It means no paper in this corpus carries both tags —
                not that no such work exists anywhere.
              </p>
            </div>
          )}

          {!loading &&
            papers.map((p) => (
              <PaperRow key={p.id} paper={p} />
            ))}
        </div>
      </aside>
    </>
  );
}

export function PaperRow({ paper: p, compact }: { paper: Paper; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <article
      style={{
        padding: "13px 0",
        borderBottom: "1px solid var(--line-soft)",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 4, flexWrap: "wrap" }}>
        <span className="mono" style={{ fontSize: 11.5, color: "var(--copper)" }}>
          {p.year}
        </span>
        <span className="tag" style={{ fontSize: 10 }}>
          {p.venue}
        </span>
        {p.citations > 0 && (
          <span className="mono" style={{ fontSize: 11, color: "var(--faint)" }}>
            {p.citations} citations
          </span>
        )}
      </div>

      <h4 style={{ margin: "0 0 5px", fontSize: 14.2, lineHeight: 1.4, fontWeight: 500 }}>
        {p.url ? (
          <a href={p.url} target="_blank" rel="noopener noreferrer" className="link">
            {p.title}
          </a>
        ) : (
          p.title
        )}
      </h4>

      {p.authors.length > 0 && (
        <div style={{ fontSize: 12.2, color: "var(--muted)", marginBottom: 6 }}>
          {p.authors.slice(0, 3).join(", ")}
          {p.authors.length > 3 && ` +${p.authors.length - 3}`}
        </div>
      )}

      {!compact && (
        <>
          <p
            className={open ? undefined : "clamp-2"}
            onClick={() => setOpen(!open)}
            style={{
              margin: "0 0 7px",
              fontSize: 12.6,
              color: "var(--muted)",
              lineHeight: 1.55,
              cursor: "pointer",
            }}
          >
            {p.abstract}
          </p>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {p.languages.slice(0, 4).map((l) => (
              <span key={l} className="tag" style={{ fontSize: 10 }}>
                {LANG_BY_CODE.get(l)?.name ?? l}
              </span>
            ))}
            {p.tasks.slice(0, 3).map((t) => (
              <span key={t} className="tag" style={{ fontSize: 10, background: "var(--champagne)" }}>
                {TASK_BY_ID.get(t)?.name ?? t}
              </span>
            ))}
            {p.datasets.slice(0, 2).map((d) => (
              <span key={d} className="tag" style={{ fontSize: 10, color: "var(--copper)" }}>
                {d}
              </span>
            ))}
          </div>
        </>
      )}
    </article>
  );
}
