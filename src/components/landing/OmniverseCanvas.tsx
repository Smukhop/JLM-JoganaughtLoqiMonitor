'use client';

import { useEffect, useRef } from 'react';

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  ◆ WEBGL MOUNT POINT — port the standalone Nine Worlds scene here ◆
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  Migration recipe from `Loqi_Omniverse_Nine_Worlds_Sol_Quasar_Standalone.html`:
 *
 *  1. <script> body  → the `boot()` function below, or `src/lib/omniverse/scene.ts`
 *                      if it is large (recommended past ~300 lines).
 *  2. <style> block  → `src/app/globals.css` under a `.omniverse-scene` scope,
 *                      or a co-located CSS module.
 *  3. <canvas> tag   → already here as `canvasRef`. Pass it to your renderer
 *                      instead of `document.getElementById(...)`.
 *  4. CDN <script>s  → `npm i three` (etc.) and import at the top of this file.
 *                      The CSP in next.config.mjs blocks third-party script hosts
 *                      by design; add the host to `script-src` only if you must.
 *  5. `window.onload`/`DOMContentLoaded` → the effect below already runs post-mount.
 *
 *  Contract this component must keep:
 *  - Every listener, RAF handle, observer and GL context is released in cleanup.
 *    React 18 StrictMode mounts twice in dev; a leak here shows up as a
 *    doubled render loop and a halved frame rate.
 *  - Honour `prefers-reduced-motion` — render one static frame instead.
 *  - Never touch `window`/`document` outside the effect (this file is 'use client'
 *    but still gets pre-rendered on the server).
 */

export interface OmniverseCanvasProps {
  /** Fires when a world is clicked in the scene — wire this to routing. */
  onWorldSelect?: (worldId: string) => void;
  className?: string;
}

export default function OmniverseCanvas({ onWorldSelect, className }: OmniverseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const worlds = Array.from({ length: 9 }, (_, i) => ({
      angle: (i / 9) * Math.PI * 2,
      radius: 0.26 + (i % 3) * 0.1,
      speed: 0.00013 + (i % 4) * 0.00005,
      size: 2.4 + (i % 3) * 1.1,
      hue: [28, 190, 265, 8, 48, 165, 300, 215, 38][i]
    }));

    const draw = (t: number) => {
      const cx = width / 2;
      const cy = height / 2;
      const scale = Math.min(width, height);

      ctx.clearRect(0, 0, width, height);
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 0.34);
      core.addColorStop(0, 'rgba(255,196,107,.42)');
      core.addColorStop(0.32, 'rgba(255,91,46,.16)');
      core.addColorStop(1, 'rgba(255,91,46,0)');
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, width, height);

      for (const w of worlds) {
        const a = w.angle + (reduced ? 0 : t * w.speed);
        const r = scale * w.radius;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r * 0.42;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * 0.42, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${w.hue},70%,60%,.07)`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, w.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${w.hue} 82% 66%)`;
        ctx.shadowBlur = 16;
        ctx.shadowColor = `hsl(${w.hue} 82% 60%)`;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (!reduced) rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    const handleClick = (e: MouseEvent) => {
      if (!onWorldSelect) return;
      const rect = canvas.getBoundingClientRect();
      const index = Math.floor(((e.clientX - rect.left) / rect.width) * 9);
      onWorldSelect(String(Math.max(0, Math.min(8, index))));
    };
    canvas.addEventListener('click', handleClick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener('click', handleClick);
      observer.disconnect();
    };
  }, [onWorldSelect]);

  return <canvas ref={canvasRef} className={className} aria-label="Loqi Omniverse — nine worlds orbiting the Sol Quasar core" role="img" />;
}
