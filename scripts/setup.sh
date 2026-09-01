#!/usr/bin/env bash
# One-shot local bootstrap for the Loqi Omniverse.
set -euo pipefail

echo "▸ Loqi Omniverse — local bootstrap"

command -v node >/dev/null || { echo "✗ Node.js 20+ required"; exit 1; }
MAJOR=$(node -p "process.versions.node.split('.')[0]")
[ "$MAJOR" -ge 20 ] || { echo "✗ Node 20+ required (found $MAJOR)"; exit 1; }

if [ ! -f .env ]; then
  cp .env.example .env
  SECRET=$(openssl rand -base64 32)
  # Portable in-place sed across GNU and BSD.
  sed -i.bak "s|^AUTH_SECRET=.*|AUTH_SECRET=\"$SECRET\"|" .env && rm -f .env.bak
  echo "▸ Wrote .env with a generated AUTH_SECRET"
  echo "  Fill in: DATABASE_URL, ANTHROPIC_API_KEY, and your OAuth credentials."
else
  echo "▸ .env already exists — leaving it alone"
fi

echo "▸ Installing dependencies…"
npm install

echo "▸ Generating Prisma client…"
npx prisma generate

cat <<'NEXT'

▸ Ready. Remaining steps:

  1. Fill in .env (DATABASE_URL, ANTHROPIC_API_KEY, AUTH_GITHUB_*, AUTH_GOOGLE_*)
  2. npx prisma db push
  3. npm run dev

  OAuth callbacks to register:
    http://localhost:3000/api/auth/callback/github
    http://localhost:3000/api/auth/callback/google

NEXT
