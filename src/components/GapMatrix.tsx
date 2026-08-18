"use client";

import { useState } from "react";

import type { Landscape, MatrixCell } from "@/lib/types";
import { TierBadge } from "./primitives";

/**
 * Language x task coverage. The design intent is that the *absences* read
 * loudest: empty cells are hatched in copper rather than left blank, because a
 * blank cell in a heatmap reads as "no data" when here it means "no research".
 */

const STATE_COPY: Record<MatrixCell["state"], string> = {
  void: "Nothing indexed",
  thin: "1–2 papers",
  emerging: "Emerging",
  active: "Active",
  saturated: "Saturated",
};

export function GapMatrix({
  landscape,
  onCell,
}: {
  landscape: Landscape;
  onCell: (langCode: string, taskId: string) => void;
}) {
  const [hover, setHover] = useState<MatrixCell | null>(null);
  const { languages, tasks, cells } = landscape.matrix;
  const focus = new Set(landscape.resolved.languages.map((l) => l.code));
  const focusTasks = new Set(landscape.resolved.tasks.map((t) => t.id));

  const byKey = new Map(cells.map((c) => [`${c.langCode}|${c.taskId}`, c]));
  const voids = cells.filter((c) => c.state === "void").length;
  const thin = cells.filter((c) => c.state === "thin").length;

  const langName = (code: string) => languages.find((l) => l.code === code)?.name ?? code;
  const taskName = (id: string) => tasks.find((t) => t.id === id)?.name ?? id;

  return (
    <div className="card" style={{ padding: 18, position: "relative", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 13, color: "var(--muted)", maxWidth: 520 }}>
          <strong style={{ color: "var(--ink)", fontWeight: 500 }}>
            {voids} empty {voids === 1 ? "cell" : "cells"}
          </strong>{" "}
          and {thin} near-empty out of {cells.length}. Hatched cells are pairings no indexed paper
          covers.
        </div>
        <Legend />
      </div>

      <div style={{ overflowX: "auto" }} className="scroll-thin">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `minmax(132px, 152px) repeat(${tasks.length}, minmax(42px, 1fr))`,
            gap: 3,
            minWidth: 720,
          }}
        >
          {/* header */}
          <div />
          {tasks.map((t) => (
            <div
              key={t.id}
              title={`${t.name} — ${t.total} papers corpus-wide`}
              style={{
                fontSize: 10.5,
                lineHeight: 1.15,
                color: focusTasks.has(t.id) ? "var(--copper)" : "var(--muted)",
                fontWeight: focusTasks.has(t.id) ? 600 : 400,
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                height: 104,
                justifySelf: "center",
                textAlign: "right",
                paddingBottom: 4,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.01em",
              }}
            >
              {t.name}
            </div>
          ))}

          {/* rows */}
          {languages.map((l) => (
            <RowFragment
              key={l.code}
              code={l.code}
              name={l.name}
              tier={l.tier}
              total={l.total}
              isFocus={focus.has(l.code)}
              tasks={tasks}
              byKey={byKey}
              onCell={onCell}
              setHover={setHover}
            />
          ))}
        </div>
      </div>

      {hover && (
        <Tooltip cell={hover} langName={langName(hover.langCode)} taskName={taskName(hover.taskId)} />
      )}
    </div>
  );
}

function RowFragment({
  code,
  name,
  tier,
  total,
  isFocus,
  tasks,
  byKey,
  onCell,
  setHover,
}: {
  code: string;
  name: string;
  tier: 0 | 1 | 2 | 3 | 4 | 5;
  total: number;
  isFocus: boolean;
  tasks: { id: string; name: string }[];
  byKey: Map<string, MatrixCell>;
  onCell: (l: string, t: string) => void;
  setHover: (c: MatrixCell | null) => void;
}) {
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12.5,
          paddingRight: 8,
          color: isFocus ? "var(--copper)" : "var(--ink)",
          fontWeight: isFocus ? 600 : 400,
          borderRight: isFocus ? "2px solid var(--copper)" : "none",
        }}
      >
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </span>
        <TierBadge tier={tier} showLabel={false} />
        <span className="mono" style={{ fontSize: 10, color: "var(--faint)", minWidth: 28, textAlign: "right" }}>
          {total}
        </span>
      </div>
      {tasks.map((t) => {
        const cell = byKey.get(`${code}|${t.id}`);
        if (!cell) return <div key={t.id} />;
        return (
          <button
            key={t.id}
            className="cellbtn"
            data-state={cell.state}
            data-focus={isFocus || undefined}
            onMouseEnter={() => setHover(cell)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(cell)}
            onBlur={() => setHover(null)}
            onClick={() => onCell(code, t.id)}
            aria-label={`${name}, ${t.name}: ${cell.count} papers`}
          >
            {cell.state === "void" && cell.peerCount > 4 && (
              <span
                aria-hidden
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 99,
                  background: "var(--copper)",
                }}
              />
            )}
          </button>
        );
      })}
    </>
  );
}

function Legend() {
  const items: { state: MatrixCell["state"]; label: string }[] = [
    { state: "void", label: "none" },
    { state: "thin", label: "1–2" },
    { state: "emerging", label: "few" },
    { state: "active", label: "active" },
    { state: "saturated", label: "saturated" },
  ];
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      {items.map((i) => (
        <span key={i.state} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span
            className="cellbtn"
            data-state={i.state}
            style={{ width: 14, height: 11, minHeight: 0, aspectRatio: "auto", cursor: "default", pointerEvents: "none" }}
          />
          <span className="eyebrow" style={{ fontSize: 9.5 }}>
            {i.label}
          </span>
        </span>
      ))}
    </div>
  );
}

function Tooltip({
  cell,
  langName,
  taskName,
}: {
  cell: MatrixCell;
  langName: string;
  taskName: string;
}) {
  return (
    <div
      className="card fade"
      style={{
        position: "absolute",
        right: 18,
        bottom: 18,
        width: 290,
        padding: 13,
        boxShadow: "var(--shadow-lg)",
        pointerEvents: "none",
        zIndex: 20,
      }}
    >
      <div className="eyebrow" style={{ marginBottom: 5 }}>
        {STATE_COPY[cell.state]}
      </div>
      <div className="serif" style={{ fontSize: 16.5, lineHeight: 1.25, marginBottom: 8 }}>
        {langName} × {taskName}
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 12.5, color: "var(--muted)" }}>
        <span>
          <span className="mono" style={{ color: "var(--ink)", fontSize: 15 }}>
            {cell.count}
          </span>{" "}
          papers
        </span>
        <span>
          <span className="mono" style={{ color: "var(--ink)", fontSize: 15 }}>
            {cell.recentCount}
          </span>{" "}
          since 2022
        </span>
      </div>
      {/* The adjacency argument: what makes an absence a gap rather than a non-problem. */}
      {cell.count === 0 && cell.peerCount > 0 && (
        <div
          style={{
            marginTop: 9,
            paddingTop: 9,
            borderTop: "1px solid var(--line-soft)",
            fontSize: 12.3,
            color: "var(--copper)",
            lineHeight: 1.45,
          }}
        >
          {cell.peerCount} papers do this in related languages — the task matters here too, nobody
          has done it.
        </div>
      )}
      {cell.count === 0 && cell.peerCount === 0 && (
        <div
          style={{
            marginTop: 9,
            paddingTop: 9,
            borderTop: "1px solid var(--line-soft)",
            fontSize: 12.3,
            color: "var(--faint)",
            lineHeight: 1.45,
          }}
        >
          No related language attempts this either — likely genuinely unexplored rather than
          overlooked.
        </div>
      )}
      <div style={{ marginTop: 9, fontSize: 11.5, color: "var(--faint)" }}>Click to see the papers</div>
    </div>
  );
}
