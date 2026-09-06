# Loqi Omniverse — Vercel deployment runbook

This repository is a Next.js 15 App Router application. The production entry point is `src/app/page.tsx`; Vercel should import the repository root directly (no subdirectory and no static `index.html` output directory).

## 1. Vercel project

Import `Smukhop/JLM-JoganaughtLoqiMonitor` into Vercel and keep **Framework Preset = Next.js**. `vercel.json` already defines `npm ci`, the Prisma + Next build, function duration overrides, the primary region, and the mission sweep cron.

## 2. Required production environment variables

Copy the keys from `.env.example` into Vercel Project Settings → Environment Variables.

Required for the full authenticated application:

- `AUTH_SECRET`
- `AUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- at least one OAuth pair: `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` or `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`
- `DATABASE_URL`
- `ANTHROPIC_API_KEY`
- `CRON_SECRET`

Recommended operational settings are also documented in `.env.example` (`LOQI_MODEL_*`, concurrency/task limits, log level, and optional member allowlist).

For production, set both URL variables to the canonical HTTPS deployment URL, not `localhost`.

## 3. Database

Provision a PostgreSQL database (Neon, Supabase, or another Vercel-compatible Postgres provider), set `DATABASE_URL`, then initialize the schema once from a trusted shell:

```bash
npx prisma db push
```

Use migrations instead of `db push` once schema evolution is managed as a production release process.

## 4. OAuth callbacks

Register the production callbacks with the providers you enable:

```text
https://YOUR-DOMAIN/api/auth/callback/github
https://YOUR-DOMAIN/api/auth/callback/google
```

The public landing page works without signing in, but `/studio`, `/army`, `/missions`, `/vault`, and `/settings` are members-only.

## 5. Pre-production gate

GitHub Actions runs `.github/workflows/gate.yml` on pull requests and on `main`. It installs with the committed lockfile, generates Prisma Client, typechecks, lints, tests, and performs a production Next.js build.

Do not promote a release while this gate is red.

## 6. Deploy and smoke test

After the project is linked and environment variables are configured, merge the release branch into `main` to let Vercel's Git integration create the production deployment.

Verify:

1. `/` renders the v2.1.0 Nine Worlds landing page.
2. `/signin` shows the configured provider(s).
3. `/api/health` returns `status: "ok"`; `degraded` means one or more dependencies are not configured or reachable.
4. Authenticated navigation reaches `/studio` and `/army`.
5. A small ChatStudio request streams successfully.
6. A small mission reaches a terminal state and appears in `/missions`.
7. The cron endpoint is protected by `CRON_SECRET` and Vercel shows the configured schedule.

## 7. Vercel plan note

`src/app/api/agents/dispatch/route.ts` is configured for a 300-second maximum duration. Confirm the selected Vercel plan supports that duration; otherwise reduce mission duration/concurrency or move long-running dispatch to a background execution model before production traffic.
