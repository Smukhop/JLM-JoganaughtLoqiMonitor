# Deploy runbook

From a cold clone to a live URL. There is no build step — the app is one HTML
document plus a vendored `three`, so most of the elapsed time is dependency installation.

---

## 1 · Get it into Git

```bash
unzip loqi-omniverse-vercel.zip -d loqi-omniverse
cd loqi-omniverse
git init -b main
git add -A
git commit -m "Loqi Omniverse OS — unified build"
```

`.gitignore` already excludes `node_modules/`, `.vercel/`, captured screenshots
and `*.bak`. Confirm nothing unexpected went in before you push:

```bash
git ls-files | head -40
```

Push to a new empty GitHub repo:

```bash
git remote add origin git@github.com:Smukhop/JLM-JoganaughtLoqiMonitor.git
git push -u origin main
```

## 2 · Prove it green locally

```bash
npm ci
npx playwright install --with-deps chromium   # first run only
npm test
```

Expected tail:

```
135/135 passed · 0 failed
GATE: GREEN — safe to deploy
```

The gate fails on a single assertion **or** a single uncaught page error. Do not
deploy around a red gate — the rAF scheduler catches per-task throws by design,
so a dead subsystem is otherwise completely silent.

## 3 · Deploy

```bash
npx vercel            # first run: links the project, deploys a preview
npx vercel --prod
```

Or import the GitHub repo at vercel.com/new. The framework preset is
**Other**; leave Build Command and Output Directory blank — `vercel.json`
sets `outputDirectory: "."` already.

`npm run deploy` runs the gate first via `predeploy`, so it cannot ship red.

## 4 · Wire the key (optional)

Live chat needs one variable:

**Project → Settings → Environment Variables**

| Name | Value | Environments |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | your key | Production, Preview, Development |
| `ANTHROPIC_MODEL` | `claude-sonnet-5` (optional) | Production, Preview, Development |

Redeploy after adding it — Vercel does not inject new variables into an existing
deployment.

Then in the app: **Studio → Harness → Provider → Server proxy (`/api/chat`)**.

Skip this entirely if you want a pure front-end demo. The Simulacrum is the
default, composes the same system prompt, applies the same skill contracts, and
makes no network calls at all.

## 5 · Verify the deployment

```bash
curl -sI https://<your-app>.vercel.app | grep -i 'content-security-policy\|strict-transport'
```

Then open `https://<your-app>.vercel.app/?test=1` — the harness runs in the
browser and paints its own report. 135 green is the same gate CI runs.

Check the proxy is alive:

```bash
curl -s -X POST https://<your-app>.vercel.app/api/chat \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"ping"}],"max_tokens":128}' | head -c 400
```

- streaming SSE → key is wired
- `503 No ANTHROPIC_API_KEY` → variable missing, or you did not redeploy
- `429` → the per-IP token bucket; wait a few seconds

## 6 · CI

`.github/workflows/gate.yml` runs the same gate on every push to `main` and
every pull request, on SwiftShader (CI runners have no GPU — the engine still
has to boot). Make it a required status check:

**GitHub → Settings → Branches → Add branch protection rule → `main` →
Require status checks to pass → `harness`**

---

## Troubleshooting

**Blank page, no errors.** Almost always the importmap: `vendor/three.module.js`
did not upload. Check `.vercelignore` has not grown a `vendor` entry, and that
`vendor/` is tracked in Git (`git ls-files vendor | wc -l` should be 7).

**Gate times out in CI.** Raise the job `timeout-minutes`. Software rendering on
a cold runner can take 60–90s just to reach `cosmos:ready`.

**Fonts do not load.** `style-src` and `font-src` in `vercel.json` allow only
`fonts.googleapis.com` and `fonts.gstatic.com`. If you swap the font stack,
widen those two directives — nothing else.

**Chat returns 503.** `ANTHROPIC_API_KEY` is not available to the deployed
function, or the project was not redeployed after adding it. The Simulacrum
remains available without a credential.

**Auth appears to accept demo users.** That is intentional for previewing the
workflow. It is not production authentication; connect a verified identity
provider before attaching private data or operational tools.
