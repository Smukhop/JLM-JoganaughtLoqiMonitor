# Porting `Loqi_Omniverse_Nine_Worlds_Sol_Quasar_Standalone.html`

The standalone file is one HTML document: markup, `<style>`, and a `<script>` that
owns the whole scene. This repo splits those three concerns. Here is the mapping.

## 1. Where each part goes

| In the standalone file | In this repo |
|---|---|
| `<canvas>` element | Already exists — `canvasRef` in `OmniverseCanvas.tsx` |
| `<script>` body | `boot()` inside the `useEffect`, or `src/lib/omniverse/scene.ts` if >300 lines |
| `<style>` block | `src/app/globals.css` under a `.omniverse-scene` scope |
| CDN `<script src>` | `npm i three` etc., then a real ESM import |
| `window.onload` / `DOMContentLoaded` | Delete — the effect already runs post-mount |
| Nine world names / colours | `src/lib/agents/registry.ts` (`world`, `accent`) |

## 2. The four things that will bite you

**StrictMode double-mount.** React 18 mounts effects twice in development. If your
scene registers listeners or starts a RAF loop without cleanup, you get two render
loops and half the frame rate. Every handle must be released in the effect's return.

**SSR.** `OmniverseCanvas.tsx` is `'use client'`, but Next still pre-renders it on the
server. Any `window`, `document` or `navigator` reference outside the `useEffect` will
throw at build time. If your scene can't tolerate that, load it dynamically:

```tsx
const OmniverseCanvas = dynamic(() => import('@/components/landing/OmniverseCanvas'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-void" />
});
```

**CSP.** `next.config.mjs` restricts `script-src` to `'self'`. A CDN `<script>` tag will
be blocked. Install the library from npm instead — better for caching and integrity
anyway. If you genuinely must keep the CDN, add the host to `script-src`.

**Context loss.** Mobile browsers drop WebGL contexts under memory pressure. Handle it:

```ts
canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); cancelAnimationFrame(raf); });
canvas.addEventListener('webglcontextrestored', () => { initScene(); });
```

## 3. Three.js skeleton

```tsx
'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function OmniverseCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
    camera.position.z = 12;

    // ── your standalone scene construction goes here ──

    let raf = 0;
    const tick = () => { renderer.render(scene, camera); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); }
      });
      renderer.dispose();
    };
  }, []);

  return <canvas ref={ref} className={className} />;
}
```

## 4. Wiring world clicks to the app

`OmniverseCanvas` takes an `onWorldSelect(worldId)` prop. Raycast in your scene, resolve
the hit to an `AgentId` from the registry, and call it. On the landing page:

```tsx
'use client';
const router = useRouter();
<OmniverseCanvas onWorldSelect={(id) => router.push(`/studio?agent=${id}`)} />
```

Note `page.tsx` is currently a Server Component — extract the hero into a small client
component before adding the router, or pass a server action down.

## 5. Verify

```bash
npm run dev            # visual check, watch the console for GL warnings
npm run build          # catches SSR-time window/document access
npm run typecheck
```

Frame budget: 16.6ms at 60fps. Profile with the Performance tab before shipping — a
landing page that janks costs more conversions than a scene that renders one fewer star.
