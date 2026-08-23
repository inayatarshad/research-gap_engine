"use client";

import { useEffect, useRef, useState } from "react";

import { useInView } from "../motion";

/**
 * Kinetic typography.
 *
 * Everything here is triggered by scroll position rather than by mount. An
 * animation that runs once on load is invisible to anyone who arrives at the
 * page and then scrolls, which is almost everyone.
 */

/** Words masked and slid up on a stagger, fired when the line scrolls into view. */
export function KineticLine({
  text,
  delay = 0,
  step = 0.055,
  color,
  weight = 300,
}: {
  text: string;
  delay?: number;
  step?: number;
  color?: string;
  weight?: number;
}) {
  const [ref, seen] = useInView<HTMLSpanElement>("-10%");
  const words = text.split(" ");

  return (
    <span ref={ref}>
      {words.map((w, i) => (
        <span key={`${w}-${i}`}>
          <span className="kin">
            <span
              style={{
                display: "inline-block",
                transform: seen ? "translateY(0)" : "translateY(105%)",
                transition: `transform .86s cubic-bezier(.16,1,.3,1) ${delay + i * step}s`,
                color,
                fontWeight: weight,
              }}
            >
              {w}
            </span>
          </span>
          {i < words.length - 1 && " "}
        </span>
      ))}
    </span>
  );
}

/**
 * Scroll-linked word reveal. Each word brightens as the block travels through
 * the viewport, so the sentence is literally written by the act of scrolling.
 */
export function ScrollWords({
  text,
  accentFrom,
}: {
  text: string;
  /** Word index from which the copper accent applies. */
  accentFrom?: number;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [progress, setProgress] = useState(0);
  const words = text.split(" ");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || document.hidden) {
      setProgress(1);
      return;
    }

    const measure = () => {
      const r = el.getBoundingClientRect();
      // 0 when the block's top reaches 82% of the viewport, 1 once its bottom
      // has risen past 38%, so the sentence completes while it is still on screen.
      const start = window.innerHeight * 0.82;
      const end = window.innerHeight * 0.38;
      const p = (start - r.top) / Math.max(1, start - end + r.height * 0.4);
      setProgress(Math.max(0, Math.min(1, p)));
    };
    // Measured straight off the scroll event rather than throttled through
    // requestAnimationFrame. A single getBoundingClientRect is cheap, and rAF
    // is suspended whenever the tab is not being painted, which would freeze
    // the sentence at whatever opacity it happened to hold.
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);

  const lit = progress * (words.length + 3);

  return (
    <p
      ref={ref}
      className="display"
      style={{
        fontSize: "clamp(24px, 3.4vw, 44px)",
        lineHeight: 1.28,
        fontWeight: 300,
        margin: 0,
        maxWidth: 980,
      }}
    >
      {words.map((w, i) => {
        const on = Math.max(0, Math.min(1, lit - i));
        const accent = accentFrom !== undefined && i >= accentFrom;
        return (
          <span
            key={`${w}-${i}`}
            style={{
              display: "inline-block",
              color: accent ? "var(--copper)" : "var(--ink)",
              opacity: 0.14 + on * 0.86,
              transform: `translateY(${(1 - on) * 9}px)`,
              transition: "opacity .18s linear, transform .18s linear",
              marginRight: "0.26em",
            }}
          >
            {w}
          </span>
        );
      })}
    </p>
  );
}

/**
 * Vertical word rotator. Swaps a single term on a timer with an in/out slide,
 * used to show the breadth of subjects without listing them.
 */
export function Rotator({
  words,
  interval = 2300,
  color = "var(--copper)",
}: {
  words: string[];
  interval?: number;
  color?: string;
}) {
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("in");

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const out = setTimeout(() => setPhase("out"), interval);
    const next = setTimeout(() => {
      setI((v) => (v + 1) % words.length);
      setPhase("in");
    }, interval + 420);
    return () => {
      clearTimeout(out);
      clearTimeout(next);
    };
  }, [i, phase, interval, words.length]);

  // Reserve the width of the longest option so the line never reflows.
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), "");

  return (
    <span className="rotator" style={{ color }}>
      <span aria-hidden style={{ visibility: "hidden", whiteSpace: "nowrap" }}>
        {longest}
      </span>
      <span
        key={`${i}-${phase}`}
        style={{
          whiteSpace: "nowrap",
          animation: `${phase === "in" ? "rotIn" : "rotOut"} .42s cubic-bezier(.22,1,.36,1) both`,
        }}
      >
        {words[i]}
      </span>
    </span>
  );
}
