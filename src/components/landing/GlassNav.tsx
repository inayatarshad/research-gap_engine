"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const LINKS = [
  { id: "problem", label: "The problem" },
  { id: "vision", label: "The vision" },
  { id: "solves", label: "What it solves" },
  { id: "how", label: "How it works" },
  { id: "architecture", label: "Architecture" },
];

/**
 * Full-width glass bar. Deliberately transparent enough that the page keeps
 * moving underneath it: the blur and a hairline carry the separation instead of
 * an opaque fill, and it deepens slightly once the page has scrolled so the
 * links stay readable over dense content.
 */
export function GlassNav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 30);
      const max = document.body.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (vis) setActive(vis.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const l of LINKS) {
      const el = document.getElementById(l.id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, []);

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 80,
        background: scrolled ? "rgba(245,244,240,0.55)" : "rgba(245,244,240,0.22)",
        backdropFilter: "blur(26px) saturate(180%)",
        borderBottom: `1px solid ${scrolled ? "rgba(17,34,80,0.09)" : "rgba(17,34,80,0.04)"}`,
        transition: "background .4s ease, border-color .4s ease",
      }}
    >
      <div
        className="wrap"
        style={{ height: 62, display: "flex", alignItems: "center", gap: 16 }}
      >
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}
          aria-label="Lacuņa"
        >
          <img
            src="/logo.png"
            alt=""
            width={31}
            height={26}
            style={{ height: 26, width: "auto", borderRadius: 6, display: "block" }}
          />
          <span
            className="display"
            style={{ fontSize: 20, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}
          >
            Lacuņa
          </span>
        </Link>

        <nav className="nav-links" style={{ display: "flex", gap: 2, alignItems: "center", marginLeft: 12 }}>
          {LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              style={{
                padding: "7px 13px",
                borderRadius: 999,
                fontSize: 13,
                whiteSpace: "nowrap",
                color: active === l.id ? "var(--ink)" : "var(--muted)",
                background: active === l.id ? "rgba(231,226,206,.8)" : "transparent",
                transition: "background .2s, color .2s",
              }}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div style={{ flex: 1, minWidth: 6 }} />

        <Link
          href="/studio"
          className="btn btn-primary"
          style={{ paddingLeft: 18, paddingRight: 16, flexShrink: 0 }}
        >
          Enter system
          <span aria-hidden style={{ opacity: 0.75 }}>
            →
          </span>
        </Link>
      </div>

      {/* Reading progress, doubling as the bar's only solid edge. */}
      <div
        style={{
          height: 2,
          width: `${progress * 100}%`,
          background: "linear-gradient(90deg, var(--sapphire), var(--copper))",
          transition: "width .1s linear",
        }}
      />
    </header>
  );
}
