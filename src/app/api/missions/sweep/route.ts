import { NextRequest } from 'next/server';
import { db } from '@/lib/server/db';
import { log } from '@/lib/server/logger';

export const runtime = 'nodejs';
export const maxDuration = 60;

const STALE_MS = 20 * 60_000;

/**
 * Cron target (see vercel.json). A serverless function that dies mid-mission —
 * timeout, deploy, OOM — leaves rows stuck in RUNNING forever with no client
 * left to update them. This sweeps them so the UI and the history page stay
 * truthful instead of showing perpetual in-flight work.
 *
 * Vercel signs cron invocations with CRON_SECRET as a bearer token.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });
  }

  const cutoff = new Date(Date.now() - STALE_MS);

  const stale = await db.mission.findMany({
    where: { status: { in: ['PLANNING', 'RUNNING'] }, updatedAt: { lt: cutoff } },
    select: { id: true, updatedAt: true }
  });

  if (!stale.length) {
    return Response.json({ swept: 0, checkedBefore: cutoff.toISOString() });
  }

  const ids = stale.map((m) => m.id);

  const [tasks, missions] = await db.$transaction([
    db.task.updateMany({
      where: { missionId: { in: ids }, status: { in: ['QUEUED', 'RUNNING'] } },
      data: { status: 'FAILED', error: 'Abandoned — execution context terminated' }
    }),
    db.mission.updateMany({
      where: { id: { in: ids } },
      data: {
        status: 'FAILED',
        report: 'Mission abandoned: the execution context terminated before completion (function timeout, redeploy, or crash). Re-dispatch to retry.'
      }
    })
  ]);

  log.warn('missions.swept', { missions: missions.count, tasks: tasks.count, ids });

  return Response.json({
    swept: missions.count,
    tasksFailed: tasks.count,
    checkedBefore: cutoff.toISOString()
  });
}
