# Loqi Omniverse OS

A single-page WebGL omniverse — Earth orbit → Sol → Sagittarius A*, driven by
one continuous scroll spine — with an agentic operator studio, a clearance gate,
and a 135-case BDD harness that runs inside the page and gates the deploy.

Three previously separate builds (the Gravitas lens monitor, the JLM
orchestration OS, and the Cosmic OS unified shell) are merged here into one
document with one scheduler, one pointer model and one gravitational field.

---

## Deploy

```bash
npm ci
npm test                 # boots the page headless, gates on __LOQI_TEST__.fail === 0
npx vercel deploy --prod
```

`predeploy` is wired to `npm test`, so `npm run deploy` cannot ship a red build.

There is no build step. The app is `index.html` plus a vendored `three` under
`vendor/`; Vercel serves the directory as-is (`outputDirectory: "."`).

### Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | for live chat | Read by `/api/chat` only. Never reaches the browser. |
| `ANTHROPIC_MODEL` | optional | Server-selected allowlisted model; defaults to `claude-sonnet-5`. |

Set it in **Project → Settings → Environment Variables**. Without it the studio
still runs: the provider falls back to the **Simulacrum**, a deterministic
offline responder that composes the same system prompt and applies the same
skill contracts, and makes no network calls at all.

### Providers

Open the Studio → **Harness** tab:

- **Simulacrum** — offline, deterministic, zero network. The default.
- **Server proxy (`/api/chat`)** — the production path. The key stays on the
  server function; the browser never sees it.

---

See **[DEPLOY.md](DEPLOY.md)** for the full runbook — Git, CI, environment
variables, and how to verify a live deployment.

---

## Layout

```
index.html            the entire app — 8 IIFE "PARTs" over one LX kernel
vendor/               pinned three.module.js, served with immutable caching
api/chat.js           Vercel function: allowlists the model, caps tokens, streams SSE
scripts/serve.mjs      dependency-free local static server
tests/gate.mjs        the deploy gate — static server + headless Chromium + exit code
tests/surfaces.mjs    captures loader / landing / gate / studio for visual diffing
vercel.json           CSP, security headers, cache policy
.github/workflows/    the same gate, on every push and pull request
.env.example          the one variable that matters, and where it goes
DEPLOY.md             cold clone → live URL
```

### The LX kernel

Everything hangs off one global namespace and one requestAnimationFrame loop:

- `LX.every(fn, name)` — the single scheduler. Per-task throws are caught and
  logged so one broken subsystem cannot stop the frame.
- `LX.on` / `LX.emit` — the event bus.
- `LX.store` — namespaced storage in three tiers: memory, `sessionStorage`,
  `localStorage`. Callers choose with `store.set(k, v, ephemeral)`.
- `LX.ptr` — one pointer model. Nothing else registers a `pointermove` listener
  for position; consumers read `LX.ptr` from the tick.
- `LX.lensField(nx, ny, out)` — one deflection field, two couplings. Light gets
  `4GM/c²b`; matter gets half that, because general relativity says so. The dust
  and the shader therefore agree by construction rather than by tuning.

### The harness

135 cases in 16 groups, asserting against the live DOM and the live engine —
not mocks. Run them from the page with `?test=1`, the **⧉ TESTS** chip, the `T`
key, or `/tests` in the Studio. Results publish to `window.__LOQI_TEST__`.

`tests/gate.mjs` additionally fails on any uncaught page error. This matters:
the scheduler swallows per-task throws by design, so a dead subsystem is silent.
It is exactly how a whole 2D layer once ran broken for a full build cycle.

---

## Hardening notes

Fixes carried in this merge, each pinned by a case in the
`hardening regressions` group:

- **Credentials.** No API key is read from the query string — a URL lands in
  history, referrers and every access log in between. No key is written to
  browser storage because there is no browser credential surface. Production
  routes through `/api/chat` only.
- **Double escaping.** The simulacrum pre-escaped output that `md()` then
  escaped again, so every quote rendered as `&quot;`.
- **Session persistence.** "Remember this console" was recorded and then
  ignored; an unchecked box still left a session in `localStorage` forever. It
  now selects the storage tier.
- **Window drag.** The un-snap anchor reduced algebraically to `r.left`, so a
  maximised window always jumped its left edge to the cursor.
- **Streaming re-render.** The transcript was re-parsed on every SSE delta —
  quadratic in answer length. Paints now coalesce to one per frame, and back off
  to ~8 Hz past 6 kB.
- **Pointer load.** Four window-level `pointermove` listeners, one walking a
  seven-selector `closest()` on every sample. Position now comes from `LX.ptr`
  and hit-tests happen once per frame, only when the target changed.
- **Reduced motion.** `prefers-reduced-motion` was honoured in CSS and read
  nowhere in JS. It now seeds `lowFX`, collapses the engine to its cheapest
  profile, stops the autopilot, and tracks changes live.
- **Teardown.** There was not one `.dispose()` in the build. `COSMOS.dispose()`
  walks the graph, drops geometries, materials, textures and render targets, and
  releases the WebGL context; it runs on `pagehide`.

## Security headers

`vercel.json` sets CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`,
`frame-ancestors 'none'` and a `Permissions-Policy` denying geolocation,
microphone, camera and payment.

The clearance screen intentionally emulates an operator workflow; it is not a
production identity boundary. Wire a verified identity provider and enforce
authorization on the server before connecting real tools, data, or operators.
See **[SECURITY.md](SECURITY.md)** for the deployment trust boundaries.

`script-src` keeps `'unsafe-inline'`: the app is deliberately one document with
inline `<script>` blocks. If that trade is unacceptable for your deployment,
extract the eight PARTs to files under `/js` and drop the directive — the
harness will tell you immediately if the extraction broke anything.
