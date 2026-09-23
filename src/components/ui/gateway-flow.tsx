"use client";

/**
 * Gateway Flow — Prother hero background.
 *
 * Ported from the Neuform "Gateway Flow" component: dashed bezier streams
 * converge on the center while particles ride the curves; clicks send
 * shockwave rings that bend the flow. Rebuilt as a self-contained canvas
 * (no iframe / CDN dependencies — the original pulled GSAP+Tailwind from
 * CDNs) and re-tuned to the Prother ember palette:
 *   paths     → ember @ 32% (dark ink) / deeper ember (light cream)
 *   particles → ember-hot, every 9th one an ember-tint "hot" spark w/ glow
 *
 * Knobs: mode, speed (0–3, applied live), size, density (0.25–2.5),
 * opacity, hue/saturation/brightness (CSS filter), interactive (click
 * shockwaves), dither (2px film-grain overlay from the source design).
 *
 * The root element establishes the positioning context (pass e.g.
 * `absolute inset-0`); it never captures pointer events — clicks are
 * observed on window and filtered to the component's own bounds.
 * Honors prefers-reduced-motion (single static frame, no loop/shockwaves).
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";

export type GatewayFlowProps = {
  mode?: "dark" | "light";
  speed?: number;
  size?: number;
  density?: number;
  opacity?: number;
  hue?: number;
  saturation?: number;
  brightness?: number;
  interactive?: boolean;
  dither?: boolean;
  className?: string;
  style?: CSSProperties;
};

type Palette = { path: string; particle: string; hot: string };

const PALETTES: Record<"dark" | "light", Palette> = {
  dark: {
    path: "rgba(255, 106, 0, 0.32)",
    particle: "rgba(255, 138, 61, 0.85)",
    hot: "rgba(255, 184, 119, 0.95)",
  },
  light: {
    path: "rgba(255, 106, 0, 0.38)",
    particle: "rgba(224, 90, 10, 0.9)",
    hot: "rgba(255, 106, 0, 1)",
  },
};

/* 2px checkerboard film grain (same recipe as the source component). */
const DITHER_URI =
  "data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%202%202%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%221%22%20height%3D%221%22%20fill%3D%22%23ffffff%22%2F%3E%3Crect%20x%3D%221%22%20y%3D%221%22%20width%3D%221%22%20height%3D%221%22%20fill%3D%22%23ffffff%22%2F%3E%3C%2Fsvg%3E";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

type Particle = { t: number; speed: number };
type FlowPath = { isLeft: boolean; frac: number; particles: Particle[] };
type Explosion = { x: number; y: number; radius: number; life: number };
type Point = { x: number; y: number };

export default function GatewayFlow({
  mode,
  speed = 1,
  size = 1,
  density = 1,
  opacity = 1,
  hue = 0,
  saturation = 1,
  brightness = 1,
  interactive = true,
  dither = true,
  className,
  style,
}: GatewayFlowProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speedRef = useRef(clamp(speed, 0, 3));

  /* Theme-reactive palette: when no explicit mode prop is passed, follow
     the html.light class (next-themes) via MutationObserver. The palette
     lives in a ref so the animation loop picks up the swap next frame
     without tearing down observers/particles. */
  const [autoMode, setAutoMode] = useState<"dark" | "light">("dark");

  useEffect(() => {
    if (mode) return;
    const doc = document.documentElement;
    const sync = () =>
      setAutoMode(doc.classList.contains("light") ? "light" : "dark");
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(doc, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, [mode]);

  const activeMode = mode ?? autoMode;
  const paletteRef = useRef(PALETTES[activeMode]);

  useEffect(() => {
    paletteRef.current = PALETTES[activeMode];
  }, [activeMode]);

  useEffect(() => {
    speedRef.current = clamp(speed, 0, 3);
  }, [speed]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const palette = paletteRef;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const pathCount = Math.max(12, Math.round(80 * clamp(density, 0.25, 2.5)));
    const lineWidth = 1.2 * clamp(size, 0.05, 8);

    // Same seeding as the source: alternating edges, evenly spread anchors,
    // one particle per stream at a random phase.
    const paths: FlowPath[] = Array.from({ length: pathCount }, (_, i) => ({
      isLeft: i % 2 === 0,
      frac: i / pathCount,
      particles: [{ t: Math.random(), speed: 0.0015 + Math.random() * 0.002 }],
    }));

    let explosions: Explosion[] = [];
    let width = 1;
    let height = 1;
    let raf = 0;
    let running = false;
    let inView = true;
    let last = 0;

    const resize = () => {
      const rect = root.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      // setTransform (not scale) — repeated resizes must not accumulate.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced) drawFrame(0);
    };

    const bezierPoint = (t: number, p0: Point, p1: Point, p2: Point, p3: Point) => {
      const u = 1 - t;
      return {
        x:
          u ** 3 * p0.x +
          3 * u ** 2 * t * p1.x +
          3 * u * t ** 2 * p2.x +
          t ** 3 * p3.x,
        y:
          u ** 3 * p0.y +
          3 * u ** 2 * t * p1.y +
          3 * u * t ** 2 * p2.y +
          t ** 3 * p3.y,
      };
    };

    /** step = frames elapsed since last draw (1 at 60fps), 0 = static. */
    const drawFrame = (step: number) => {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;

      for (const exp of explosions) {
        exp.radius += 15 * step;
        exp.life -= 0.015 * step;
      }
      explosions = explosions.filter((exp) => exp.life > 0);

      ctx.strokeStyle = palette.current.path;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash([1, 4]);

      for (let pi = 0; pi < paths.length; pi++) {
        const path = paths[pi];
        const y = (path.frac * 1.4 - 0.2) * height;
        const p0: Point = { x: path.isLeft ? 0 : width, y };
        const p1: Point = { x: path.isLeft ? cx * 0.5 : width - cx * 0.5, y };
        const p2: Point = { x: path.isLeft ? cx * 0.8 : width - cx * 0.8, y: cy };
        const p3: Point = { x: cx, y: cy };

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
        ctx.stroke();

        for (let si = 0; si < path.particles.length; si++) {
          const p = path.particles[si];
          p.t += p.speed * speedRef.current * step;
          if (p.t > 1) {
            p.t = 0;
            // Re-anchor the stream near its band (clamped vs. the source's
            // unbounded drift so long sessions never degrade).
            path.frac = clamp(
              path.frac + (Math.random() - 0.5) * (10 / height),
              -0.2,
              1.2,
            );
          }
          const pos = bezierPoint(p.t, p0, p1, p2, p3);

          // Shockwave deflection (verbatim falloff from the source).
          let dxTotal = 0;
          let dyTotal = 0;
          for (const exp of explosions) {
            const dx = pos.x - exp.x;
            const dy = pos.y - exp.y;
            const dist = Math.hypot(dx, dy) || 1;
            if (dist < exp.radius + 120 && dist > exp.radius - 120) {
              const force =
                (1 - Math.abs(dist - exp.radius) / 120) * exp.life;
              dxTotal += (dx / dist) * force * 80;
              dyTotal += (dy / dist) * force * 80;
            }
          }
          const px = pos.x + dxTotal;
          const py = pos.y + dyTotal;

          if ((pi + si) % 9 === 0) {
            ctx.save();
            ctx.shadowColor = "rgba(255, 106, 0, 0.8)";
            ctx.shadowBlur = 10;
            ctx.fillStyle = palette.current.hot;
            ctx.fillRect(px - 2.5, py - 2.5, 5, 5);
            ctx.restore();
          } else {
            ctx.fillStyle = palette.current.particle;
            ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
          }
        }
      }
      ctx.setLineDash([]);
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!inView) return;
      const dt = Math.min(50, now - last || 16.7);
      last = now;
      drawFrame(dt / 16.7);
    };

    const start = () => {
      if (running || reduced) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    // Pause the loop entirely while the hero is off-screen.
    const io = new IntersectionObserver(
      (entries) => {
        inView = entries[0]?.isIntersecting ?? true;
        if (inView) start();
        else stop();
      },
      { threshold: 0 },
    );
    io.observe(root);

    const ro = new ResizeObserver(resize);
    ro.observe(root);
    resize();

    const onClick = (event: MouseEvent) => {
      const rect = root.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
      explosions.push({ x, y, radius: 0, life: 1 });
    };
    if (interactive && !reduced) window.addEventListener("click", onClick);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("click", onClick);
    };
  }, [mode, size, density, interactive]);

  const safeOpacity = clamp(opacity, 0.05, 1);
  const filter =
    hue === 0 && saturation === 1 && brightness === 1
      ? undefined
      : `hue-rotate(${clamp(hue, -180, 180)}deg) saturate(${clamp(
          saturation,
          0,
          2,
        )}) brightness(${clamp(brightness, 0.35, 1.65)})`;

  return (
    <div
      ref={rootRef}
      aria-hidden
      className={`pointer-events-none select-none ${className ?? ""}`}
      style={style}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ opacity: safeOpacity, filter }}
      />
      {dither ? (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage: `url("${DITHER_URI}")`,
            backgroundSize: "2px 2px",
            opacity: activeMode === "dark" ? 0.05 : 0.08,
          }}
        />
      ) : null}
    </div>
  );
}
