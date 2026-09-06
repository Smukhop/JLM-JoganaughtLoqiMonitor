import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '~/auth';
import { db } from '@/lib/server/db';
import { anthropic, modelFor } from '@/lib/server/anthropic';
import { rateLimit } from '@/lib/server/ratelimit';
import { getAgent } from '@/lib/agents/registry';

export const runtime = 'nodejs';
export const maxDuration = 60;

const Body = z.object({
  threadId: z.string().optional(),
  agentId: z.string().default('sol-quasar'),
  message: z.string().min(1).max(24_000)
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  const limit = rateLimit(`chat:${session.user.id}`, 40, 60_000);
  if (!limit.ok) {
    return new Response('Rate limit exceeded', {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((limit.resetAt - Date.now()) / 1000)) }
    });
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response(parsed.error.message, { status: 400 });
  const { agentId, message } = parsed.data;

  let agent;
  try {
    agent = getAgent(agentId);
  } catch {
    return new Response('Unknown agent', { status: 400 });
  }

  // Resolve or create the thread, verifying ownership.
  let threadId = parsed.data.threadId;
  if (threadId) {
    const owned = await db.thread.findFirst({
      where: { id: threadId, userId: session.user.id },
      select: { id: true }
    });
    if (!owned) return new Response('Thread not found', { status: 404 });
  } else {
    const thread = await db.thread.create({
      data: {
        userId: session.user.id,
        agentId,
        title: message.slice(0, 70).replace(/\s+\S*$/, '') || 'Untitled transmission'
      }
    });
    threadId = thread.id;
  }

  const history = await db.message.findMany({
    where: { threadId },
    orderBy: { createdAt: 'asc' },
    take: 40,
    select: { role: true, content: true }
  });

  await db.message.create({ data: { threadId, role: 'user', content: message } });

  const messages = [
    ...history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: message }
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      send({ type: 'meta', threadId, agentId: agent.id });

      let full = '';
      try {
        const ms = anthropic().messages.stream({
          model: modelFor(agent.tier),
          max_tokens: agent.maxTokens,
          temperature: agent.temperature,
          system: agent.systemPrompt,
          messages
        });

        for await (const event of ms) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            full += event.delta.text;
            send({ type: 'delta', text: event.delta.text });
          }
        }

        const final = await ms.finalMessage();
        await db.message.create({
          data: {
            threadId: threadId!,
            role: 'assistant',
            content: full,
            agentId: agent.id,
            tokensIn: final.usage.input_tokens,
            tokensOut: final.usage.output_tokens
          }
        });
        await db.thread.update({ where: { id: threadId! }, data: { updatedAt: new Date() } });

        send({ type: 'done', usage: final.usage });
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : 'Stream failed' });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}
