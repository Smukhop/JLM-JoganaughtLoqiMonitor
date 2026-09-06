# Changelog

## 2.0.0 — Full-stack extraction

Broke the standalone `Loqi_Omniverse_Nine_Worlds_Sol_Quasar_Standalone.html`
out into a deployable Next.js 15 application.

### Added
- **Landing page** — hero with WebGL canvas mount, nine-world roster grid, mission
  doctrine section, CTA. Server Component, reads the agent registry directly.
- **OAuth** — Auth.js v5 with GitHub and Google. Prisma adapter for user/account
  persistence, JWT sessions so edge middleware can gate routes. Optional email
  allowlist via `LOQI_MEMBER_ALLOWLIST`.
- **ChatStudio** — per-agent streaming chat over SSE, persistent threads, thread
  rail, live world switcher.
- **War Room** — mission dispatch console. Streams the plan, then every task's
  status and token deltas live, then the reduced report.
- **Agentic Army** — nine-agent registry, LLM planner with graph validation, and a
  concurrent dependency-aware orchestrator.
- **Infra** — Prisma schema, Vercel config with per-route durations, GitHub Actions
  CI (typecheck/lint/test/build) and deploy workflows, CSP and security headers,
  per-user rate limiting, Vitest suite.

### Verified
- 9/9 graph-validation cases (cycles, self-deps, dangling keys, duplicates,
  unknown agents, command-fieldwork rejection).
- 7/7 scheduler behaviours (concurrency cap, dependency ordering, failure
  containment, no deadlock).
- 36/36 TypeScript files parse clean.

### Outstanding
- The WebGL scene is a placeholder. See `PORTING.md`.

## 2.1.0 — Completeness pass

Audit of 2.0.0 found six real gaps. All closed.

### Fixed
- **Release manifest/lockfile drift** — removed non-runtime helper packages that were declared in `package.json` but absent from the committed lockfile, restoring deterministic `npm ci` installs.
- **`package-lock.json` was missing** — CI runs `npm ci`, which hard-fails without
  one. Generated: 547 resolved packages, lockfileVersion 3.
- **`/api/missions/sweep` was wired into the Vercel cron but did not exist.** Now
  implemented, with `CRON_SECRET` bearer checking.
- **`public/` and `src/components/ui/` were empty directories.**
- **`ratelimit.ts` had a typing bug** — `setInterval().unref?.()` does not
  typecheck when the DOM lib is present, since the return narrows to `number`.

### Added — the tool layer
- `src/lib/agents/tools.ts` — five tools with Anthropic schemas, Zod arg
  validation, and capability-scoped granting enforced at both grant and call time.
- `src/lib/agents/calc.ts` — hand-written tokeniser and recursive-descent parser
  for `calculate`. No `eval`. Rejects `globalThis`, `constructor`, IIFEs,
  assignments and statement separators at parse time.
- Tool-use loop in `completeFull()`: bounded rounds, forced answer on ceiling,
  per-agent `maxToolRounds` budgets.
- SSRF guard on `web_fetch` — loopback, RFC1918, link-local, `.internal`,
  `.local` and cloud-metadata hosts blocked.

### Added — the vault
- `KbEntry` and `Artifact` Prisma models; token and tool-call accounting on
  `Mission` and `Task`.
- `/api/kb` (read, manual commit, delete), `/api/artifacts/[id]` (download).
- `/vault` page grouped by world, with confidence, provenance and supersessions.

### Added — UI
- Hand-written streaming-safe markdown renderer. An unterminated fence renders as
  an open block instead of swallowing the document; no `dangerouslySetInnerHTML`.
- `ToolTrace` — expandable per-call audit trail. Without it there is no way to
  tell a grounded finding from a fabricated one.
- `/missions` archive and `/missions/[id]` full record with artefact downloads.
- Skeleton, StatusPill, Empty primitives; loading states; chat stop button;
  thread delete; token/tool usage counters.
- `/api/health` dependency probe, generated OG image, sitemap, robots, manifest,
  favicon.
- `prisma/seed.ts` — demo operator, worked mission, 3 vault entries.
- Prettier, EditorConfig, `.npmrc`; `npm run verify` gate.

### Verified
- 62/62 TypeScript files parse clean.
- 49/49 logic assertions pass, executed not just written: 25 calc (13 arithmetic,
  12 injection-rejection), 14 markdown (including all 96 prefixes of a document
  parsing without throwing), 5 rate-limit, 6 registry (adding the 9/9 graph and
  7/7 scheduler cases from 2.0.0 → 63 total).
- Every `db.X` model exists in the schema; every local import resolves; every
  `vercel.json` cron and function target points at a real file.
