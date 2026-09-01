import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { auth } from '~/auth';
import { db } from '@/lib/server/db';
import { AGENTS } from '@/lib/agents/registry';
import type { AgentId, TaskStatus } from '@/lib/agents/types';
import Markdown from '@/components/ui/Markdown';
import { StatusPill } from '@/components/ui/StatusPill';
import { relativeTime } from '@/lib/utils';

export const metadata: Metadata = { title: 'Mission record' };

export default async function MissionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;

  const mission = await db.mission.findFirst({
    where: { id, userId: session!.user.id },
    include: {
      tasks: { orderBy: { startedAt: 'asc' } },
      artifacts: { select: { id: true, filename: true, language: true, agentId: true } }
    }
  });

  if (!mission) notFound();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/missions" className="kicker transition hover:text-ash">
        ← All missions
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <h1 className="max-w-2xl font-display text-lg leading-snug text-white">{mission.objective}</h1>
        <StatusPill status={mission.status} />
      </div>

      <dl className="mt-6 flex flex-wrap gap-6 font-mono text-[11px] text-ash-dim">
        <div>{relativeTime(mission.createdAt)}</div>
        <div>{mission.tasks.length} tasks</div>
        <div>{mission.tokensIn.toLocaleString()} in / {mission.tokensOut.toLocaleString()} out</div>
        <div>{mission.toolCalls} tool calls</div>
      </dl>

      {mission.report && (
        <section className="ticked panel mt-8 p-6">
          <p className="kicker mb-4">Mission report</p>
          <Markdown>{mission.report}</Markdown>
        </section>
      )}

      {mission.artifacts.length > 0 && (
        <section className="ticked panel mt-6 p-6">
          <p className="kicker mb-4">Artefacts</p>
          <ul className="divide-y divide-seam">
            {mission.artifacts.map((a) => (
              <li key={a.id} className="flex items-center gap-4 py-2.5">
                <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-ash">{a.filename}</span>
                <span className="font-mono text-[10px] uppercase text-ash-dim">{a.language}</span>
                <a
                  href={`/api/artifacts/${a.id}`}
                  className="font-mono text-[10px] uppercase tracking-wider text-quasar transition hover:text-quasar-glow"
                >
                  download
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <p className="kicker mb-4">Task returns</p>
        <div className="space-y-3">
          {mission.tasks.map((task) => {
            const agent = AGENTS[task.agentId as AgentId];
            return (
              <details key={task.id} className="panel overflow-hidden">
                <summary className="flex cursor-pointer items-center gap-3 px-4 py-3">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: agent?.accent ?? '#5b6480' }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-white">{task.title}</span>
                    <span className="block font-mono text-[10px] uppercase tracking-[.18em] text-ash-dim">
                      {agent?.callsign ?? task.agentId}
                      {task.dependsOn.length > 0 && ` ← ${task.dependsOn.join(', ')}`}
                    </span>
                  </span>
                  <StatusPill status={task.status as TaskStatus} />
                </summary>
                <div className="border-t border-seam px-4 py-4">
                  {task.error && <p className="mb-3 font-mono text-[11px] text-quasar-hot">{task.error}</p>}
                  {task.output ? (
                    <Markdown>{task.output}</Markdown>
                  ) : (
                    <p className="text-sm text-ash-dim">No return recorded.</p>
                  )}
                  <p className="mt-3 flex gap-4 font-mono text-[10px] text-ash-dim">
                    <span>{task.tokensIn.toLocaleString()} in / {task.tokensOut.toLocaleString()} out</span>
                    {task.toolCalls > 0 && <span>{task.toolCalls} tool calls</span>}
                  </p>
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}
