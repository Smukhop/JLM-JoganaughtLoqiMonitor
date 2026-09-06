import { describe, expect, it } from 'vitest';
import { rateLimit } from '../ratelimit';

describe('rateLimit', () => {
  it('allows up to the limit then refuses', () => {
    const key = `t-${Math.random()}`;
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    expect(rateLimit(key, 3, 60_000).ok).toBe(false);
  });

  it('reports remaining correctly', () => {
    const key = `t-${Math.random()}`;
    expect(rateLimit(key, 5, 60_000).remaining).toBe(4);
    expect(rateLimit(key, 5, 60_000).remaining).toBe(3);
  });

  it('resets after the window elapses', async () => {
    const key = `t-${Math.random()}`;
    expect(rateLimit(key, 1, 40).ok).toBe(true);
    expect(rateLimit(key, 1, 40).ok).toBe(false);
    await new Promise((r) => setTimeout(r, 60));
    expect(rateLimit(key, 1, 40).ok).toBe(true);
  });

  it('keeps buckets independent per key', () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    expect(rateLimit(a, 1, 60_000).ok).toBe(true);
    expect(rateLimit(a, 1, 60_000).ok).toBe(false);
    expect(rateLimit(b, 1, 60_000).ok).toBe(true);
  });
});
