import { z } from 'zod';
import { db } from '@/lib/server/db';
import { evaluate } from './calc';
import type { AgentSpec, Capability } from './types';

export interface ToolContext {
  userId: string;
  missionId?: string;
  agentId: string;
}

export interface ToolDefinition<S extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  schema: S;
  requires: Capability[];
  handler: (args: z.infer<S>, ctx: ToolContext) => Promise<string>;
}

const KbSearchArgs = z.object({
  query: z.string().min(1).max(400),
  world: z.string().optional(),
  limit: z.number().int().min(1).max(20).default(5)
});

const kbSearch: ToolDefinition<typeof KbSearchArgs> = {
  name: 'kb_search',
  description:
    'Search the Omniverse knowledge base for previously committed facts. Use before asserting anything the army may already know. Returns entries with their source, confidence and commit date.',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Keywords or a phrase to match against entry claims and sources.' },
      world: { type: 'string', description: 'Optional: restrict to one world\'s vault, e.g. "itachi".' },
      limit: { type: 'number', description: 'Max entries to return (1-20, default 5).' }
    },
    required: ['query']
  },
  schema: KbSearchArgs,
  requires: ['memory', 'research', 'analyse', 'harvest', 'validate'],
  async handler({ query, world, limit }, ctx) {
    const terms = query.split(/\s+/).filter((t) => t.length > 2).slice(0, 6);
    if (!terms.length) return 'No searchable terms in query.';

    const entries = await db.kbEntry.findMany({
      where: {
        userId: ctx.userId,
        ...(world ? { world } : {}),
        OR: terms.flatMap((t) => [
          { claim: { contains: t, mode: 'insensitive' as const } },
          { source: { contains: t, mode: 'insensitive' as const } },
          { tags: { has: t.toLowerCase() } }
        ])
      },
      orderBy: [{ confidence: 'desc' }, { updatedAt: 'desc' }],
      take: limit
    });

    if (!entries.length) return `No knowledge-base entries match "${query}". Nothing committed on this yet.`;

    return entries
      .map(
        (e, i) =>
          `[${i + 1}] world=${e.world} confidence=${e.confidence}\n` +
          `    claim: ${e.claim}\n` +
          `    source: ${e.source ?? 'unattributed'}\n` +
          `    committed: ${e.updatedAt.toISOString().slice(0, 10)}` +
          (e.supersedes ? `\n    supersedes: ${e.supersedes}` : '')
      )
      .join('\n\n');
  }
};

const KbCommitArgs = z.object({
  world: z.string().min(1).max(40),
  claim: z.string().min(4).max(2000),
  source: z.string().max(500).optional(),
  confidence: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  tags: z.array(z.string().max(40)).max(8).default([]),
  supersedes: z.string().max(120).optional()
});

const kbCommit: ToolDefinition<typeof KbCommitArgs> = {
  name: 'kb_commit',
  description:
    'Commit a durable fact into a world\'s vault. Only commit things that will still be true and useful later — not transient task state. If this supersedes an earlier entry, name it in `supersedes` rather than silently contradicting it.',
  input_schema: {
    type: 'object',
    properties: {
      world: { type: 'string', description: 'Destination world id, e.g. "itachi" or "kairo".' },
      claim: { type: 'string', description: 'The fact, stated in one self-contained sentence.' },
      source: { type: 'string', description: 'Where this came from — URL, document name, or "derived".' },
      confidence: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
      tags: { type: 'array', items: { type: 'string' }, description: 'Lowercase keywords for retrieval.' },
      supersedes: { type: 'string', description: 'Claim text or id this replaces, if any.' }
    },
    required: ['world', 'claim']
  },
  schema: KbCommitArgs,
  requires: ['memory', 'harvest'],
  async handler(args, ctx) {
    const existing = await db.kbEntry.findFirst({
      where: { userId: ctx.userId, world: args.world, claim: args.claim }
    });

    if (existing) {
      await db.kbEntry.update({
        where: { id: existing.id },
        data: { confidence: args.confidence, source: args.source, tags: args.tags.map((t) => t.toLowerCase()) }
      });
      return `Updated existing entry ${existing.id} in ${args.world} (claim already present).`;
    }

    const entry = await db.kbEntry.create({
      data: {
        userId: ctx.userId,
        world: args.world,
        claim: args.claim,
        source: args.source,
        confidence: args.confidence,
        tags: args.tags.map((t) => t.toLowerCase()),
        supersedes: args.supersedes,
        committedBy: ctx.agentId,
        missionId: ctx.missionId
      }
    });

    return `Committed entry ${entry.id} to ${args.world} at ${args.confidence} confidence.`;
  }
};

const WebFetchArgs = z.object({
  url: z.string().url(),
  maxChars: z.number().int().min(500).max(60_000).default(12_000)
});

function assertPublicUrl(raw: string): URL {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`Blocked scheme: ${url.protocol}`);
  }
  const host = url.hostname.toLowerCase();
  const blocked = [
    /^localhost$/,
    /^127\./,
    /^0\./,
    /^10\./,
    /^192\.168\./,
    /^169\.254\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^\[?::1\]?$/,
    /^\[?fc00:/,
    /^\[?fe80:/,
    /\.internal$/,
    /\.local$/,
    /^metadata\./
  ];
  if (blocked.some((re) => re.test(host))) {
    throw new Error(`Blocked host (private or link-local): ${host}`);
  }
  return url;
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const webFetch: ToolDefinition<typeof WebFetchArgs> = {
  name: 'web_fetch',
  description:
    'Fetch a public URL and return its readable text. Use for primary sources. Private, loopback and link-local addresses are blocked. Always cite the URL in your findings.',
  input_schema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Absolute http(s) URL.' },
      maxChars: { type: 'number', description: 'Truncate the extracted text at this length (default 12000).' }
    },
    required: ['url']
  },
  schema: WebFetchArgs,
  requires: ['harvest', 'research'],
  async handler({ url, maxChars }) {
    const target = assertPublicUrl(url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);

    try {
      const res = await fetch(target, {
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': 'LoqiOmniverse/2.1 (+agentic-army)', Accept: 'text/html,text/plain,application/json' }
      });

      if (!res.ok) return `Fetch failed: HTTP ${res.status} ${res.statusText} for ${url}`;

      const type = res.headers.get('content-type') ?? '';
      const size = Number(res.headers.get('content-length') ?? 0);
      if (size > 8_000_000) return `Refused: payload too large (${size} bytes).`;

      const raw = await res.text();
      const text = type.includes('html') ? htmlToText(raw) : raw;
      const clipped = text.slice(0, maxChars);

      return `SOURCE: ${url}\nCONTENT-TYPE: ${type}\nEXTRACTED ${clipped.length} of ${text.length} chars\n\n${clipped}${
        text.length > maxChars ? '\n\n[truncated]' : ''
      }`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return `Fetch failed for ${url}: ${msg}`;
    } finally {
      clearTimeout(timer);
    }
  }
};

const CalculateArgs = z.object({
  expression: z.string().min(1).max(500),
  label: z.string().max(120).optional()
});

const calculate: ToolDefinition<typeof CalculateArgs> = {
  name: 'calculate',
  description:
    'Evaluate an arithmetic expression exactly. Use this instead of doing arithmetic in your head — a wrong number in a report is worse than a slow one. Supports + - * / % ^, parentheses, and sqrt/abs/min/max/round/floor/ceil/ln/log/exp.',
  input_schema: {
    type: 'object',
    properties: {
      expression: { type: 'string', description: 'e.g. "(1250 * 0.85) / 12" or "sqrt(2) * 1e6".' },
      label: { type: 'string', description: 'What this figure represents, for the audit trail.' }
    },
    required: ['expression']
  },
  schema: CalculateArgs,
  requires: ['metrics', 'analyse', 'build'],
  async handler({ expression, label }) {
    try {
      const value = evaluate(expression);
      return `${label ? label + ': ' : ''}${expression} = ${value}`;
    } catch (err) {
      return `Cannot evaluate "${expression}": ${err instanceof Error ? err.message : 'invalid expression'}`;
    }
  }
};

const EmitArtifactArgs = z.object({
  filename: z.string().min(1).max(200),
  language: z.string().max(40).default('text'),
  content: z.string().min(1).max(200_000)
});

const emitArtifact: ToolDefinition<typeof EmitArtifactArgs> = {
  name: 'emit_artifact',
  description:
    'Emit a named file artefact (code, config, schema, document) attached to this mission. Use this for anything the human will copy out — it keeps deliverables out of the prose and makes them downloadable.',
  input_schema: {
    type: 'object',
    properties: {
      filename: { type: 'string', description: 'Target path, e.g. "src/lib/parser.ts".' },
      language: { type: 'string', description: 'Syntax hint: typescript, python, sql, yaml, markdown…' },
      content: { type: 'string', description: 'Complete file content. No ellipses, no omitted sections.' }
    },
    required: ['filename', 'content']
  },
  schema: EmitArtifactArgs,
  requires: ['build', 'write'],
  async handler({ filename, language, content }, ctx) {
    const artifact = await db.artifact.create({
      data: {
        userId: ctx.userId,
        missionId: ctx.missionId,
        agentId: ctx.agentId,
        filename,
        language,
        content
      }
    });
    return `Emitted artefact ${artifact.id}: ${filename} (${content.split('\n').length} lines, ${content.length} bytes).`;
  }
};

export const TOOLS: ToolDefinition[] = [
  kbSearch,
  kbCommit,
  webFetch,
  calculate,
  emitArtifact
] as ToolDefinition[];

export const TOOLS_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

export function toolsForAgent(agent: AgentSpec): ToolDefinition[] {
  return TOOLS.filter((tool) => tool.requires.some((cap) => agent.capabilities.includes(cap)));
}

export function toolSchemasFor(agent: AgentSpec) {
  return toolsForAgent(agent).map(({ name, description, input_schema }) => ({
    name,
    description,
    input_schema
  }));
}

export async function runTool(
  name: string,
  rawArgs: unknown,
  agent: AgentSpec,
  ctx: ToolContext
): Promise<{ content: string; isError: boolean }> {
  const tool = TOOLS_BY_NAME.get(name);
  if (!tool) return { content: `Unknown tool "${name}".`, isError: true };

  if (!tool.requires.some((cap) => agent.capabilities.includes(cap))) {
    return {
      content: `Tool "${name}" is not authorised for ${agent.callsign}. Required capability: one of ${tool.requires.join(', ')}.`,
      isError: true
    };
  }

  const parsed = tool.schema.safeParse(rawArgs);
  if (!parsed.success) {
    return {
      content: `Invalid arguments for "${name}": ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`,
      isError: true
    };
  }

  try {
    return { content: await tool.handler(parsed.data, ctx), isError: false };
  } catch (err) {
    return { content: `Tool "${name}" failed: ${err instanceof Error ? err.message : String(err)}`, isError: true };
  }
}
