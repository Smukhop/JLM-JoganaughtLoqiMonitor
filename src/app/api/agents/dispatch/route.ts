import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '~/auth';
import { db } from '@/lib/server/db';
import { rateLimit } from '@/lib/server/ratelimit';
import { planMission } from '@/lib/agents/planner';
import { runMission } from '@/lib/agents/orchestrator';
import type { ArmyEvent } from '@/lib/agents/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

const Body = z.object({ objective: z.string().min(8).max(8000) });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  // Missions are expensive — a much tighter window than chat.
  const limit = rateLimit(`mission:${session.user.id}`, 5, 10 * 60_000);
  if (!limit.ok) {
    return new Response('Mission rate limit reached. Try again shortly.', {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((limit.resetAt - Date.now()) / 1000)) }
    });
  }

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response(parsed.error.message, { status: 400 });
  const { objective } = parsed.data;

  const mission = await db.mission.create({
    data: { userId: session.user.id, objective, status: 'PLANNING' }
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ArmyEvent | { type: 'mission'; id: string }) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

      // Keep intermediaries from closing an idle connection mid-mission.
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          /* stream already closed */
        }
      }, 15_000);

      try {
        send({ type: 'mission', id: mission.id });

        const plan = await planMission(objective);

        await db.$transaction([
          db.mission.update({
            where: { id: mission.id },
            data: { status: 'RUNNING', plan: plan as unknown as object }
          }),
          db.task.createMany({
            data: plan.tasks.map((t) => ({
              missionId: mission.id,
              agentId: t.agentId,
              title: t.title,
              brief: t.brief,
              dependsOn: t.dependsOn
            }))
          })
        ]);

        const { results, report, usage } = await runMission(
          plan,
          { userId: session.user.id, missionId: mission.id },
          (event) => send(event)
        );

        // Persist per-task outcomes so the history page reflects reality.
        await Promise.all(
          [...results.values()].map((r) =>
            db.task.updateMany({
              where: { missionId: mission.id, title: plan.tasks.find((t) => t.key === r.key)?.title },
              data: {
                status: r.status,
                output: r.output ?? null,
                error: r.error ?? null,
                tokensIn: r.usage?.inputTokens ?? 0,
                tokensOut: r.usage?.outputTokens ?? 0,
                toolCalls: r.toolCalls ?? 0,
                endedAt: new Date()
              }
            })
          )
        );

        const failed = [...results.values()].some((r) => r.status === 'FAILED');
        await db.mission.update({
          where: { id: mission.id },
          data: {
            status: failed ? 'FAILED' : 'SUCCEEDED',
            report,
            tokensIn: usage.inputTokens,
            tokensOut: usage.outputTokens,
            toolCalls: usage.toolCalls
          }
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Mission failed';
        send({ type: 'error', message });
        await db.mission
          .update({ where: { id: mission.id }, data: { status: 'FAILED', report: message } })
          .catch(() => {});
      } finally {
        clearInterval(heartbeat);
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
