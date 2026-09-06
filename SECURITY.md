# Security policy

## Supported release

Security fixes are applied to the current `main` branch and the latest production deployment.

## Reporting

Do not open a public issue for suspected vulnerabilities or include credentials, tokens, personal data, provider responses, or database records in a report. Use GitHub's private security-advisory flow for this repository.

## Production trust boundaries

- `ANTHROPIC_API_KEY`, OAuth client secrets, `AUTH_SECRET`, `DATABASE_URL`, and `CRON_SECRET` are server-side environment variables only. They must never be prefixed with `NEXT_PUBLIC_` or committed to the repository.
- Auth.js protects the members surfaces (`/studio`, `/army`, `/missions`, `/vault`, `/settings`). Treat authorization in server routes as the source of truth; UI visibility is not an authorization boundary.
- Prisma is the persistence boundary for users, missions, chat threads, vault entries, and artifacts. Production database credentials should use least privilege and TLS.
- `/api/missions/sweep` is a scheduled maintenance endpoint and must remain protected by `CRON_SECRET`.
- Agent tool calls are capability-scoped. The `web_fetch` tool includes SSRF protections for loopback, private, link-local, internal, local, and cloud-metadata targets; review those protections before widening network access.
- In-memory rate limiting is only a single-region burst guard. Add a durable distributed limiter/WAF before exposing paid inference at meaningful public scale.

Rotate any credential immediately if it is committed, pasted into a URL, logged publicly, or exposed to a browser bundle.
