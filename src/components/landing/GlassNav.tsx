"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const LINKS = [
  { id: "what", label: "What it does" },
  { id: "coverage", label: "Coverage" },
  { id: "architecture", label: "Architecture" },
];

/**
 * Centred floating navigation. It sits over the page rather than in it, so the
 * hero keeps its full height, and it tightens on scroll so the mark stays
 * present without competing with the content underneath.
 */
export function GlassNav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
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
    <nav
      style={{
        position: "fixed",
        top: scrolled ? 12 : 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 80,
        transition: "top .35s cubic-bezier(.22,1,.36,1)",
        maxWidth: "calc(100vw - 24px)",
      }}
    >
      <div
        className="glass"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: scrolled ? "6px 6px 6px 12px" : "8px 8px 8px 14px",
          borderRadius: 999,
          transition: "padding .35s cubic-bezier(.22,1,.36,1)",
        }}
      >
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 9, paddingRight: 6 }}
          aria-label="HERMÈS"
        >
          <img
            src="/logo.png"
            alt=""
            width={30}
            height={25}
            style={{ height: 25, width: "auto", borderRadius: 6, display: "block" }}
          />
          <span
            className="display"
            style={{ fontSize: 18, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}
          >
            HERMÈS
          </span>
        </Link>

        <span className="nav-links" style={{ display: "flex", gap: 2, alignItems: "center" }}>
          <span style={{ width: 1, height: 20, background: "var(--line)", margin: "0 6px" }} />
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
                background: active === l.id ? "rgba(231,226,206,.85)" : "transparent",
                transition: "background .2s, color .2s",
              }}
            >
              {l.label}
            </a>
          ))}
        </span>

        <Link
          href="/studio"
          className="btn btn-primary"
          style={{ marginLeft: 4, paddingLeft: 17, paddingRight: 15 }}
        >
          Enter system
          <span aria-hidden style={{ opacity: 0.75 }}>
            →
          </span>
        </Link>
      </div>
    </nav>
  );
}
