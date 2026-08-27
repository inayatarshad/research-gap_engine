"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Small motion primitives. The landing page needs to feel like an instrument
 * warming up rather than a static poster, so numbers count in, bars grow and
 * grids fill cell by cell, all driven from real data.
 */

const EASE_OUT = (t: number) => 1 - Math.pow(1 - t, 3);

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * A hidden tab suspends requestAnimationFrame and IntersectionObserver. Any
 * animation that starts there would freeze part-way and show a zero, so when
 * the document is not being painted we jump straight to the final state.
 */
function cannotAnimate() {
  return prefersReducedMotion() || (typeof document !== "undefined" && document.hidden);
}

/**
 * Fires once when the element first scrolls into view.
 *
 * An earlier version carried a blanket 2.5s timeout as a safety net against
 * IntersectionObserver never firing. That defeated the whole point: every
 * element on the page, however far below the fold, revealed itself two and a
 * half seconds after load, so by the time a reader scrolled down everything
 * had already animated off screen. The observer is supported everywhere this
 * app runs, so it is trusted, and only a genuinely missing implementation or
 * an explicit reduced-motion preference short circuits to the final state.
 */
export function useInView<T extends HTMLElement>(rootMargin = "-40px") {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;

    // Respect the preference, and cover the case where there is nothing to
    // observe with.
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }

    // Already on screen at mount: reveal without waiting for a scroll that may
    // never come.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setSeen(true);
      return;
    }

    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          obs.disconnect();
        }
      },
      { rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [seen, rootMargin]);

  return [ref, seen] as const;
}

export function useCountUp(target: number, active: boolean, duration = 1400, delay = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (cannotAnimate()) {
      setValue(target);
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start - delay) / duration);
      if (t >= 0) setValue(target * EASE_OUT(t));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setValue(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration, delay]);
  return value;
}

export function Counter({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  duration,
  delay,
  active = true,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  delay?: number;
  active?: boolean;
}) {
  const n = useCountUp(value, active, duration, delay);
  return (
    <span className="mono">
      {prefix}
      {decimals > 0
        ? n.toFixed(decimals)
        : Math.round(n).toLocaleString()}
      {suffix}
    </span>
  );
}

/** Staggered reveal wrapper. */
export function Reveal({
  children,
  delay = 0,
  y = 12,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
}) {
  const [ref, seen] = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{
        opacity: seen ? 1 : 0,
        transform: seen ? "none" : `translateY(${y}px)`,
        transition: `opacity .6s cubic-bezier(.22,1,.36,1) ${delay}s, transform .6s cubic-bezier(.22,1,.36,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Rotates through phrases with a typing effect. Used once, in the hero, to
 * show the range of questions the engine accepts without listing them as prose.
 */
export function Typewriter({ phrases, speed = 46 }: { phrases: string[]; speed?: number }) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (cannotAnimate()) {
      setText(phrases[0]);
      return;
    }
    const full = phrases[index % phrases.length];
    if (!deleting && text === full) {
      const t = setTimeout(() => setDeleting(true), 2100);
      return () => clearTimeout(t);
    }
    if (deleting && text === "") {
      setDeleting(false);
      setIndex((i) => i + 1);
      return;
    }
    const t = setTimeout(
      () => setText(deleting ? full.slice(0, text.length - 1) : full.slice(0, text.length + 1)),
      deleting ? speed / 2.2 : speed,
    );
    return () => clearTimeout(t);
  }, [text, deleting, index, phrases, speed]);

  return (
    <span>
      {text}
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: 2,
          height: "0.95em",
          background: "var(--copper)",
          marginLeft: 3,
          verticalAlign: "-0.12em",
          animation: "blink 1.05s steps(2) infinite",
        }}
      />
    </span>
  );
}
