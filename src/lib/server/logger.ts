type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN = LEVELS[(process.env.LOQI_LOG_LEVEL as Level) ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug')];

const REDACT = /^(authorization|cookie|api[-_]?key|secret|token|password|anthropic[-_]?api[-_]?key)$/i;

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[depth]';
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack?.split('\n').slice(0, 4) };
  if (Array.isArray(value)) return value.slice(0, 40).map((v) => scrub(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = REDACT.test(k) ? '[redacted]' : scrub(v, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > 2000) return value.slice(0, 2000) + '…';
  return value;
}

function emit(level: Level, event: string, fields?: Record<string, unknown>) {
  if (LEVELS[level] < MIN) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...(fields ? (scrub(fields) as Record<string, unknown>) : {})
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (event: string, fields?: Record<string, unknown>) => emit('debug', event, fields),
  info: (event: string, fields?: Record<string, unknown>) => emit('info', event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => emit('warn', event, fields),
  error: (event: string, fields?: Record<string, unknown>) => emit('error', event, fields),

  async span<T>(event: string, fields: Record<string, unknown>, fn: () => Promise<T>): Promise<T> {
    const started = Date.now();
    try {
      const result = await fn();
      emit('info', event, { ...fields, ms: Date.now() - started, ok: true });
      return result;
    } catch (err) {
      emit('error', event, { ...fields, ms: Date.now() - started, ok: false, error: err });
      throw err;
    }
  }
};
