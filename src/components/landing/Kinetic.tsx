"use client";

import { useEffect, useState } from "react";

/**
 * Kinetic typography. Each word is masked and slides up on a stagger, so the
 * headline assembles itself rather than simply appearing.
 */
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
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <span key={`${w}-${i}`}>
          <span className="kin">
            <span style={{ animationDelay: `${delay + i * step}s`, color, fontWeight: weight }}>
              {w}
            </span>
          </span>
          {i < words.length - 1 && " "}
        </span>
      ))}
    </>
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
