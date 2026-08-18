"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import type { Overview } from "@/lib/overview";

/**
 * The studio's empty state. Once the landing page carries the argument, this
 * screen only has to get the user to a scope quickly, so it stays a heading,
 * the composer and a line of context.
 */
export function StudioStart({
  overview,
  children,
}: {
  overview: Overview;
  children: ReactNode;
}) {
  return (
    <div style={{ paddingTop: "clamp(40px, 8vw, 76px)" }}>
      <div className="eyebrow" style={{ marginBottom: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span>
          {overview.papers.toLocaleString()} papers · {overview.languages} languages ·{" "}
          {overview.yearFrom} to {overview.yearTo}
        </span>
        <Link href="/" style={{ color: "var(--copper)" }}>
          ← Overview
        </Link>
      </div>

      <h1
        className="display rise"
        style={{ fontSize: "clamp(32px, 4.6vw, 54px)", margin: "0 0 10px", fontWeight: 300, maxWidth: 780 }}
      >
        What field should I map?
      </h1>
      <p
        className="rise"
        style={{
          margin: "0 0 26px",
          fontSize: 16,
          color: "var(--muted)",
          maxWidth: 620,
          lineHeight: 1.6,
          animationDelay: ".08s",
        }}
      >
        Name a language, a task, or a region. Everything below is computed from the indexed corpus
        and traces back to the papers behind it.
      </p>

      {children}
    </div>
  );
}
