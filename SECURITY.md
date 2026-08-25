# Security policy

## Supported release

Security fixes are applied to the current `main` branch and the latest deployed
release. Please reproduce a report against that version before submitting it.

## Reporting

Do not open a public issue for a suspected vulnerability or include credentials,
tokens, personal data, or provider responses in a report. Use GitHub's private
security-advisory flow for this repository instead.

Include the affected URL or commit, browser, clear reproduction steps, expected
and observed behavior, and the smallest safe proof of impact. Never test against
accounts or data you do not own.

## Trust boundaries

- `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` are server-side Vercel variables.
- `/api/chat` is the only live-model boundary. The browser has no API-key field
  and no direct provider route.
- The visible clearance screen is a demo workflow, not production identity or
  authorization. Connect a verified identity provider before protecting real
  operator data or tools.
- The in-memory function throttle is only a burst guard. Add Vercel Firewall or
  another durable rate limiter before making paid inference publicly available.

Rotate any credential immediately if it is ever committed, pasted into a URL,
or exposed to a browser bundle.
