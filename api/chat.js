/* ═══════════════════════════════════════════════════════════════════════════
   /api/chat — the only place an Anthropic key exists.

   Browser credentials are deliberately unsupported. The client posts its
   request here without credentials; this function attaches ANTHROPIC_API_KEY
   from the environment, validates the spend controls and streams the response.
   ═══════════════════════════════════════════════════════════════════════════ */

export const config = { runtime: 'nodejs', maxDuration: 60 };

const UPSTREAM = 'https://api.anthropic.com/v1/messages';
const VERSION = '2023-06-01';

/* Models the deployment is willing to bill for. An allowlist, not a filter:
   the client is untrusted input and `model` is a spend lever. */
const ALLOWED = new Set([
  'claude-sonnet-5',
  'claude-opus-5',
  'claude-haiku-4-5-20251001',
  'server-default'
]);
const FALLBACK_MODEL = 'claude-sonnet-5';
const configuredModel = process.env.ANTHROPIC_MODEL;
const DEFAULT_MODEL = ALLOWED.has(configuredModel) && configuredModel !== 'server-default'
  ? configuredModel
  : FALLBACK_MODEL;

const MAX_TOKENS_CEIL = 4096;
const MAX_BODY_BYTES = 256 * 1024;
const MAX_MESSAGES = 24;

/* Coarse per-IP token bucket. Edge instances are not shared state, so this is a
   speed bump against a loop in a browser tab, not a real rate limiter — put a
   WAF or Vercel's own rate limiting in front for anything public. */
const BUCKETS = new Map();
const RATE = { capacity: 12, refillPerSec: 0.2 };

function allow(ip) {
  const now = Date.now() / 1000;
  let b = BUCKETS.get(ip);
  if (!b) { b = { tokens: RATE.capacity, at: now }; BUCKETS.set(ip, b); }
  b.tokens = Math.min(RATE.capacity, b.tokens + (now - b.at) * RATE.refillPerSec);
  b.at = now;
  if (BUCKETS.size > 5000) BUCKETS.clear();
  if (b.tokens < 1) return false;
  b.tokens -= 1;
  return true;
}

const json = (status, obj) => new Response(JSON.stringify(obj), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
});

function sanitise(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('body must be a JSON object');

  const model = ALLOWED.has(raw.model) && raw.model !== 'server-default'
    ? raw.model
    : DEFAULT_MODEL;

  const max_tokens = Math.max(
    128,
    Math.min(MAX_TOKENS_CEIL, parseInt(raw.max_tokens, 10) || 2048)
  );

  const system = typeof raw.system === 'string' ? raw.system.slice(0, 60000) : undefined;

  if (!Array.isArray(raw.messages) || !raw.messages.length) {
    throw new Error('messages must be a non-empty array');
  }
  const messages = raw.messages.slice(-MAX_MESSAGES).map(m => {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) {
      throw new Error('each message needs role "user" or "assistant"');
    }
    if (typeof m.content !== 'string') throw new Error('message content must be a string');
    return { role: m.role, content: m.content.slice(0, 40000) };
  });
  /* The API rejects a leading assistant turn; trimming history can produce one. */
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (!messages.length) throw new Error('no user turn in the window');

  return { model, max_tokens, system, messages, stream: raw.stream !== false };
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { allow: 'POST, OPTIONS', 'cache-control': 'no-store' }
    });
  }
  if (req.method !== 'POST') {
    const response = json(405, { error: { message: 'POST only' } });
    response.headers.set('allow', 'POST, OPTIONS');
    return response;
  }

  if (!(req.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) {
    return json(415, { error: { message: 'Content-Type must be application/json' } });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return json(503, {
      error: {
        message: 'No ANTHROPIC_API_KEY on this deployment. Set it in Project → ' +
          'Settings → Environment Variables, or use the Simulacrum provider.'
      }
    });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'anon';
  if (!allow(ip)) {
    return json(429, { error: { message: 'Slow down — this deployment throttles by IP.' } });
  }

  const len = parseInt(req.headers.get('content-length') || '0', 10);
  if (len > MAX_BODY_BYTES) return json(413, { error: { message: 'Request body too large' } });

  let payload;
  try {
    const raw = await req.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return json(413, { error: { message: 'Request body too large' } });
    }
    payload = sanitise(JSON.parse(raw));
  } catch (e) {
    return json(400, { error: { message: String(e.message || e) } });
  }

  let upstream;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': VERSION
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (e) {
    return json(502, { error: { message: 'Model provider is temporarily unreachable' } });
  } finally {
    clearTimeout(timeout);
  }

  if (!upstream.ok) {
    /* Pass the upstream status through, but never the upstream body verbatim —
       error envelopes have carried request metadata before now. */
    return json(upstream.status, {
      error: { message: 'Model provider rejected the request (' + upstream.status + ')' }
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'text/event-stream',
      'cache-control': 'no-store, no-transform',
      'x-accel-buffering': 'no'
    }
  });
}
