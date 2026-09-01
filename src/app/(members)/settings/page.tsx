import type { Metadata } from 'next';
import { auth } from '~/auth';
import { db } from '@/lib/server/db';
import { AGENT_LIST } from '@/lib/agents/registry';
import { relativeTime } from '@/lib/utils';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [threadCount, missions] = await Promise.all([
    db.thread.count({ where: { userId } }),
    db.mission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, objective: true, status: true, createdAt: true }
    })
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <p className="kicker mb-2">Account</p>
      <h1 className="mb-10 font-display text-xl text-white">Settings</h1>

      <section className="ticked panel mb-6 p-6">
        <p className="kicker mb-4">Identity</p>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-ash-dim">Name</dt><dd className="text-white">{session!.user.name ?? '—'}</dd></div>
          <div><dt className="text-ash-dim">Email</dt><dd className="text-white">{session!.user.email}</dd></div>
          <div><dt className="text-ash-dim">Role</dt><dd className="font-mono text-quasar">{session!.user.role}</dd></div>
          <div><dt className="text-ash-dim">Transmissions</dt><dd className="text-white">{threadCount}</dd></div>
        </dl>
      </section>

      <section className="ticked panel mb-6 p-6">
        <p className="kicker mb-4">Recent missions</p>
        {missions.length === 0 ? (
          <p className="text-sm text-ash-dim">No missions dispatched yet.</p>
        ) : (
          <ul className="divide-y divide-seam">
            {missions.map((m) => (
              <li key={m.id} className="flex items-center gap-4 py-3">
                <span className="min-w-0 flex-1 truncate text-sm text-ash">{m.objective}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-ash-dim">
                  {relativeTime(m.createdAt)}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-quasar">{m.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ticked panel p-6">
        <p className="kicker mb-4">Army roster</p>
        <ul className="grid gap-2 sm:grid-cols-3">
          {AGENT_LIST.map((a) => (
            <li key={a.id} className="flex items-center gap-2 text-xs">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: a.accent }} />
              <span className="text-ash">{a.world}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
