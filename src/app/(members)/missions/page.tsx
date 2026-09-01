import Link from 'next/link';
import type { Metadata } from 'next';
import { auth } from '~/auth';
import { db } from '@/lib/server/db';
import { StatusPill } from '@/components/ui/StatusPill';
import { Empty } from '@/components/ui/Empty';
import { relativeTime } from '@/lib/utils';

export const metadata: Metadata = { title: 'Missions' };

export default async function MissionsPage() {
  const session = await auth();

  const missions = await db.mission.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: 'desc' },
    take: 60,
    include: { _count: { select: { tasks: true, artifacts: true } } }
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="kicker mb-2">Archive</p>
          <h1 className="font-display text-lg text-white">Missions</h1>
        </div>
        <Link href="/army" className="btn-primary">New mission</Link>
      </div>

      {missions.length === 0 ? (
        <Empty
          kicker="Archive empty"
          title="No missions dispatched yet"
          body="Open the war room, state an objective, and the army will leave a record here."
        />
      ) : (
        <ul className="space-y-2">
          {missions.map((m) => (
            <li key={m.id}>
              <Link
                href={`/missions/${m.id}`}
                className="panel flex items-center gap-4 px-5 py-4 transition hover:bg-plate/70"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] text-white">{m.objective}</span>
                  <span className="mt-1 flex flex-wrap gap-3 font-mono text-[10px] text-ash-dim">
                    <span>{relativeTime(m.createdAt)}</span>
                    <span>{m._count.tasks} tasks</span>
                    {m._count.artifacts > 0 && <span>{m._count.artifacts} artefacts</span>}
                    <span>{(m.tokensIn + m.tokensOut).toLocaleString()} tokens</span>
                  </span>
                </span>
                <StatusPill status={m.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
