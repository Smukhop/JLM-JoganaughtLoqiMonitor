import { db } from '@/lib/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Liveness + dependency probe. Point uptime monitoring here, not at `/`. */
export async function GET() {
  const checks: Record<string, { ok: boolean; ms?: number; detail?: string }> = {};

  const started = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = { ok: true, ms: Date.now() - started };
  } catch (err) {
    checks.database = { ok: false, ms: Date.now() - started, detail: err instanceof Error ? err.message : 'unreachable' };
  }

  checks.anthropicKey = { ok: Boolean(process.env.ANTHROPIC_API_KEY) };
  checks.authSecret = { ok: Boolean(process.env.AUTH_SECRET) };
  checks.oauthProviders = {
    ok: Boolean(process.env.AUTH_GITHUB_ID || process.env.AUTH_GOOGLE_ID),
    detail: [process.env.AUTH_GITHUB_ID && 'github', process.env.AUTH_GOOGLE_ID && 'google']
      .filter(Boolean)
      .join(',') || 'none configured'
  };

  const healthy = Object.values(checks).every((c) => c.ok);

  return Response.json(
    { status: healthy ? 'ok' : 'degraded', version: '2.1.0', checks, ts: new Date().toISOString() },
    { status: healthy ? 200 : 503 }
  );
}
