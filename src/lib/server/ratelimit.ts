const buckets = new Map<string, { count: number; resetAt: number }>();

export interface LimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): LimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }

  bucket.count += 1;
  return {
    ok: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt
  };
}

if (typeof setInterval !== 'undefined') {
  const handle: unknown = setInterval(() => {
    const now = Date.now();
    for (const [key, b] of buckets) if (b.resetAt < now) buckets.delete(key);
  }, 60_000);

  if (handle && typeof handle === 'object' && 'unref' in handle) {
    (handle as { unref: () => void }).unref();
  }
}
