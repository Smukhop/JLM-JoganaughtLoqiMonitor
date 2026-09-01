# Loqi Omniverse — Nine Worlds Agentic OS

Full-stack Next.js 15 application: the Nine Worlds landing page, OAuth membership,
a members-only ChatStudio, and the autonomous **Agentic Army** — nine specialised
agents planned and reduced by the Sol Quasar command core.

```
Landing (public)  →  OAuth gate  →  Members area
                                     ├── ChatStudio   one agent, one thread, streaming
                                     ├── War Room     all nine, one mission, parallel DAG
                                     └── Settings     identity, mission history, roster
```

---

## Architecture

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 App Router | Server Components for the shell, route handlers for SSE |
| Auth | Auth.js v5 (`next-auth@beta`) | GitHub + Google OAuth, database sessions, edge-safe middleware split |
| Database | Postgres + Prisma | Neon / Supabase / Vercel Postgres all work unchanged |
| Model | Anthropic SDK, streaming | One `complete()` helper serves both chat and the army |
| Styling | Tailwind + custom design tokens | No component library — the console aesthetic is bespoke |
| Hosting | Vercel | `vercel.json` sets per-route `maxDuration`; dispatch gets 300s |

### The Agentic Army

Six files, in dependency order:

| File | Responsibility |
|---|---|
| `src/lib/agents/types.ts` | Shared contracts — `AgentSpec`, `MissionPlan`, `ArmyEvent` |
| `src/lib/agents/registry.ts` | **The nine worlds.** Single source of truth for prompts, capabilities, accents, tool budgets |
| `src/lib/agents/calc.ts` | Recursive-descent arithmetic parser backing the `calculate` tool |
| `src/lib/agents/tools.ts` | Tool definitions, capability-scoped granting, sandboxed execution |
| `src/lib/agents/planner.ts` | Sol Quasar decomposes an objective into a validated task DAG |
| `src/lib/agents/orchestrator.ts` | Concurrent dependency-aware scheduler + tool loop + report reduction |

### Tools — what makes it agentic rather than talkative

| Tool | Required capability | What it does |
|---|---|---|
| `kb_search` | memory, research, analyse, harvest, validate | Query the vault before asserting anything |
| `kb_commit` | memory, harvest | Write a durable fact, recording supersessions rather than overwriting |
| `web_fetch` | harvest, research | Fetch a public URL, HTML→text. SSRF-blocked, 15s timeout, size-capped |
| `calculate` | metrics, analyse, build | Exact arithmetic via a real parser — never `eval` |
| `emit_artifact` | build, write | Emit a downloadable file attached to the mission |

`toolsForAgent()` computes the permitted set from the agent's declared
capabilities at dispatch time, and `runTool()` re-checks it before execution. So
the routing contract in `registry.ts` is enforced at the tool boundary too, not
just at the planner. ZORO cannot reach the web; NARA cannot write to the vault.

The tool loop lives in `completeFull()`: send → execute any `tool_use` blocks →
append one `tool_result` turn → repeat, bounded by the agent's `maxToolRounds`.
On hitting the ceiling it makes a final call with tools withheld, forcing an
answer from what it has rather than looping forever.

**The `calculate` tool never uses `eval`, `new Function`, or regex-sanitised
eval.** Model output is untrusted input executing server-side with database
access in scope, so `calc.ts` is a hand-written tokeniser and recursive-descent
parser. `globalThis`, `constructor`, IIFEs, assignments and statement separators
are all rejected at parse time — see `calc.test.ts`.

**Execution model.** A task becomes eligible the moment every dependency has
`SUCCEEDED`. Eligible tasks run concurrently up to `LOQI_MAX_CONCURRENCY`. A failed
task marks its transitive dependents `SKIPPED` but sibling branches carry on — one
dead branch never takes the mission with it, and the final report states plainly
what it therefore cannot cover.

**Planner safety.** `validatePlan()` runs Kahn's algorithm over the returned graph
and rejects cycles, dangling dependencies, duplicate keys, unknown agents, and any
attempt to assign field work to the command core. Malformed planner output gets one
corrective retry, then falls back to a deterministic recon → assay → synthesis line
so a planner outage can never take a mission down.

**Context isolation.** Each agent sees its own brief plus the returns of its *direct*
upstream dependencies — nothing else. This bounds the context window and stops
unrelated branches contaminating one another.

---

## Local setup

```bash
npm install
cp .env.example .env          # then fill it in — see below
npx prisma db push            # create the schema
npm run dev                   # http://localhost:3000
```

### Environment

| Variable | Where to get it |
|---|---|
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_GITHUB_ID` / `_SECRET` | github.com/settings/developers → New OAuth App |
| `AUTH_GOOGLE_ID` / `_SECRET` | console.cloud.google.com → Credentials → OAuth client |
| `DATABASE_URL` | Neon, Supabase, or Vercel Postgres connection string |
| `ANTHROPIC_API_KEY` | console.anthropic.com |

OAuth callback URLs — register **both**:

```
http://localhost:3000/api/auth/callback/github
https://YOUR-DOMAIN.vercel.app/api/auth/callback/github
```

Set `LOQI_MEMBER_ALLOWLIST` to gate the members area, e.g. `@worley.com,me@gmail.com`.
Leave it blank to allow any authenticated user.

---

## Deploy to Vercel

```bash
gh repo create loqi-omniverse --private --source=. --push
vercel link && vercel --prod
```

Then in the Vercel dashboard:

1. **Storage → Create Database → Postgres** (or paste a Neon `DATABASE_URL`).
2. **Settings → Environment Variables** — add every key from `.env.example`.
   Set `AUTH_URL` and `NEXT_PUBLIC_APP_URL` to your production domain.
3. Add the production callback URL to both OAuth apps.
4. Run `npx prisma db push` once against the production `DATABASE_URL`.

The repository ships a `.github/workflows/gate.yml` quality gate for pull requests and pushes. Production deployment is intended to use Vercel's Git integration after the required environment variables and database are configured; see `DEPLOY.md`.

---

## Porting your WebGL scene

The landing hero renders a placeholder canvas. Your standalone HTML drops into
`src/components/landing/OmniverseCanvas.tsx` — the file carries a step-by-step
migration recipe in its header comment. See **`PORTING.md`** for the full walkthrough
including the CSP note (third-party CDN scripts are blocked by default).

---

## Re-skinning the army

Everything the user sees about an agent — world name, callsign, accent colour,
capabilities, system prompt — lives in `src/lib/agents/registry.ts`. Edit that one
file and the landing grid, the ChatStudio picker, the planner roster and the war
room all follow. Nothing else hardcodes an agent.

Adding a tenth world: add the entry, add its id to the `AgentId` union in `types.ts`,
and update the count assertion in `registry.test.ts`. That's the whole change.

---

## Scripts

| Command | Effect |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | `prisma generate && next build` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest — 5 suites: graph validation, registry, tools, calc, markdown, rate limit |
| `npm run verify` | typecheck + lint + test, the same gate CI runs |
| `npm run db:studio` | Prisma Studio |

---

## Routes

| Route | Access | Purpose |
|---|---|---|
| `/` | public | Landing — nine worlds, doctrine |
| `/signin` | public | OAuth gate |
| `/studio` | member | ChatStudio — one agent, one thread |
| `/army` | member | War Room — mission dispatch |
| `/missions`, `/missions/[id]` | member | Mission archive and full record |
| `/vault` | member | Knowledge base browser |
| `/settings` | member | Identity, usage, roster |
| `/api/chat` | member | SSE streaming chat |
| `/api/agents/dispatch` | member | SSE mission execution |
| `/api/kb` | member | KB read / manual commit / delete |
| `/api/artifacts/[id]` | member | Artefact download |
| `/api/missions/sweep` | cron | Reaps missions abandoned by a dead function |
| `/api/health` | public | Liveness + dependency probe |

## Production notes

- **Rate limits** are in-memory (`src/lib/server/ratelimit.ts`) — correct for a single
  region. Swap the `Map` for Upstash Redis when you scale past one instance; the call
  signature is unchanged.
- **Chat: 40 req/min per user. Missions: 5 per 10 min per user.** Missions are far more
  expensive; tune both in the route handlers.
- **CSP** is set in `next.config.mjs` and blocks third-party script hosts by design.
- **`maxDuration`** for dispatch is 300s, which requires a Vercel Pro plan. On Hobby
  the ceiling is 60s — either shrink the plans or move dispatch to a background worker.
- **System prompts never reach the client.** `/api/agents` strips them before serialising.
- **`/api/missions/sweep`** is a cron target (every 15 min). A function that dies
  mid-mission leaves rows stuck in `RUNNING` with no client left to update them;
  the sweep marks them failed so the UI stays truthful. Set `CRON_SECRET` in
  production — the route checks it as a bearer token.
- **`web_fetch` blocks SSRF targets**: loopback, RFC1918, link-local, `.internal`,
  `.local`, and cloud metadata hostnames. Review `assertPublicUrl()` before
  loosening it.
- **The markdown renderer is hand-written** (`src/components/ui/Markdown.tsx`) and
  streaming-safe: an unterminated code fence renders as an open block rather than
  swallowing the document. Nothing uses `dangerouslySetInnerHTML`, so model output
  cannot inject markup.
