"use client";

import { useEffect, useRef, useState } from "react";

import { LANGUAGES, TASKS, TIER_LABEL } from "@/lib/taxonomy";
import type { Scope } from "@/lib/types";

/**
 * The framing instrument. Deliberately not a single prompt box: the user
 * assembles a scope from a description plus explicit language and task
 * constraints, and sees the corpus respond to each change before committing.
 */

const SUGGEST_LANGS = LANGUAGES.filter((l) => l.tier <= 3).sort(
  (a, b) => a.tier - b.tier || b.speakersM - a.speakersM,
);

export function Composer({
  scope,
  setScope,
  onRun,
  busy,
  compact,
}: {
  scope: Scope;
  setScope: (s: Scope) => void;
  onRun: (s: Scope) => void;
  busy: boolean;
  compact?: boolean;
}) {
  const [preview, setPreview] = useState<{ count: number; interpreted: string[] } | null>(null);
  const [picker, setPicker] = useState<"lang" | "task" | null>(null);
  const [filter, setFilter] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Live scope readout. Debounced so typing does not hammer the index.
  useEffect(() => {
    if (!scope.query.trim() && !scope.languages.length && !scope.tasks.length) {
      setPreview(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scope),
          signal: ctrl.signal,
        });
        setPreview(await res.json());
      } catch {
        /* aborted or offline — the readout is advisory only */
      }
    }, 260);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [scope]);

  useEffect(() => {
    if (!picker) return;
    const onDown = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPicker(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPicker(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [picker]);

  const toggle = (kind: "languages" | "tasks", id: string) => {
    const cur = scope[kind];
    setScope({
      ...scope,
      [kind]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(0, 6),
    });
  };

  const ready = Boolean(scope.query.trim() || scope.languages.length || scope.tasks.length);

  const langOptions = SUGGEST_LANGS.filter((l) =>
    l.name.toLowerCase().includes(filter.toLowerCase()),
  ).slice(0, 60);
  const taskOptions = TASKS.filter((t) =>
    t.name.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div
      className="card"
      style={{
        padding: compact ? 14 : "18px 18px 16px",
        boxShadow: compact ? "var(--shadow-sm)" : "var(--shadow-md)",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          ref={inputRef}
          value={scope.query}
          onChange={(e) => setScope({ ...scope, query: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter" && ready && !busy) onRun(scope);
          }}
          placeholder="Describe a research area — “Urdu NLP”, “hate speech in code-mixed text”, “speech for African languages”"
          aria-label="Research area"
          style={{
            flex: "1 1 340px",
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: compact ? 15 : 17.5,
            padding: "6px 4px",
            fontFamily: "var(--font-sans)",
          }}
        />
        <button className="btn btn-primary" disabled={!ready || busy} onClick={() => onRun(scope)}>
          {busy ? "Mapping…" : "Map the field"}
          {!busy && <span style={{ opacity: 0.6, fontSize: 11 }}>↵</span>}
        </button>
      </div>

      <div
        className="hairline"
        style={{
          marginTop: 12,
          paddingTop: 11,
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          className="chip"
          onClick={() => {
            setPicker(picker === "lang" ? null : "lang");
            setFilter("");
          }}
        >
          + Language
        </button>
        {scope.languages.map((code) => {
          const l = LANGUAGES.find((x) => x.code === code);
          return (
            <button key={code} className="chip" data-on="true" onClick={() => toggle("languages", code)}>
              {l?.name ?? code}
              <span style={{ opacity: 0.6 }}>×</span>
            </button>
          );
        })}

        <span style={{ width: 1, height: 18, background: "var(--line)", margin: "0 2px" }} />

        <button
          className="chip"
          onClick={() => {
            setPicker(picker === "task" ? null : "task");
            setFilter("");
          }}
        >
          + Task
        </button>
        {scope.tasks.map((id) => (
          <button key={id} className="chip" data-on="true" onClick={() => toggle("tasks", id)}>
            {TASKS.find((t) => t.id === id)?.name ?? id}
            <span style={{ opacity: 0.6 }}>×</span>
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <YearRange scope={scope} setScope={setScope} />
      </div>

      {/* live readout — the instrument responding before you commit */}
      <div
        style={{
          marginTop: 10,
          minHeight: 20,
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          fontSize: 12.5,
          color: "var(--muted)",
        }}
      >
        {preview ? (
          <>
            <span className="mono" style={{ color: "var(--ink)", fontWeight: 500 }}>
              {preview.count.toLocaleString()}
            </span>
            <span>papers in scope</span>
            {preview.interpreted.length > 0 && (
              <>
                <span style={{ color: "var(--taupe)" }}>·</span>
                <span>understood as</span>
                {preview.interpreted.slice(0, 4).map((i) => (
                  <span key={i} className="tag">
                    {i}
                  </span>
                ))}
              </>
            )}
          </>
        ) : (
          <span style={{ color: "var(--faint)" }}>
            Add a language or task to constrain the scope, or just describe the area.
          </span>
        )}
      </div>

      {picker && (
        <div
          ref={pickerRef}
          className="card scroll-thin rise"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 14,
            right: 14,
            zIndex: 40,
            maxHeight: 340,
            overflowY: "auto",
            boxShadow: "var(--shadow-lg)",
            padding: 12,
          }}
        >
          <input
            autoFocus
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={picker === "lang" ? "Filter languages…" : "Filter tasks…"}
            style={{
              width: "100%",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: "7px 10px",
              marginBottom: 10,
              outline: "none",
              background: "var(--ivory)",
              fontSize: 13,
            }}
          />
          {picker === "lang" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 5 }}>
              {langOptions.map((l) => (
                <button
                  key={l.code}
                  onClick={() => toggle("languages", l.code)}
                  className="btn btn-ghost"
                  style={{
                    justifyContent: "space-between",
                    width: "100%",
                    background: scope.languages.includes(l.code) ? "var(--champagne)" : undefined,
                  }}
                >
                  <span>{l.name}</span>
                  <span className="tier" data-t={l.tier} style={{ fontSize: 9 }}>
                    T{l.tier} {TIER_LABEL[l.tier]}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(215px,1fr))", gap: 5 }}>
              {taskOptions.map((t) => (
                <button
                  key={t.id}
                  onClick={() => toggle("tasks", t.id)}
                  className="btn btn-ghost"
                  style={{
                    justifyContent: "space-between",
                    width: "100%",
                    background: scope.tasks.includes(t.id) ? "var(--champagne)" : undefined,
                  }}
                >
                  <span style={{ textAlign: "left" }}>{t.name}</span>
                  <span className="eyebrow" style={{ fontSize: 9 }}>
                    {t.group}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function YearRange({ scope, setScope }: { scope: Scope; setScope: (s: Scope) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--muted)" }}>
      <span className="eyebrow">Years</span>
      <input
        type="range"
        min={2008}
        max={2026}
        value={scope.yearFrom}
        onChange={(e) =>
          setScope({ ...scope, yearFrom: Math.min(Number(e.target.value), scope.yearTo - 1) })
        }
        aria-label="Earliest publication year"
        style={{ width: 96, accentColor: "var(--sapphire)" }}
      />
      <span className="mono" style={{ minWidth: 76, textAlign: "right", color: "var(--ink)" }}>
        {scope.yearFrom}–{scope.yearTo}
      </span>
    </div>
  );
}
