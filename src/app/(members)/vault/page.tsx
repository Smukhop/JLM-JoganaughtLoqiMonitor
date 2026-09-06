import type { Metadata } from 'next';
import { auth } from '~/auth';
import { db } from '@/lib/server/db';
import { AGENT_LIST } from '@/lib/agents/registry';
import { Empty } from '@/components/ui/Empty';
import { relativeTime } from '@/lib/utils';

export const metadata: Metadata = { title: 'Vault' };

const CONF_COLOR: Record<string, string> = {
  HIGH: 'text-plasma',
  MEDIUM: 'text-quasar',
  LOW: 'text-ash-dim'
};

export default async function VaultPage() {
  const session = await auth();

  const entries = await db.kbEntry.findMany({
    where: { userId: session!.user.id },
    orderBy: [{ world: 'asc' }, { updatedAt: 'desc' }],
    take: 300
  });

  const byWorld = entries.reduce<Record<string, typeof entries>>((acc, e) => {
    (acc[e.world] ??= []).push(e);
    return acc;
  }, {});

  const worldName = (id: string) => AGENT_LIST.find((a) => a.id === id)?.world ?? id;
  const worldAccent = (id: string) => AGENT_LIST.find((a) => a.id === id)?.accent ?? '#5b6480';

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="kicker mb-2">Knowledge base</p>
      <h1 className="font-display text-lg text-white">The Vault</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-ash-dim">
        What the army has committed as durable. Agents holding the <code className="text-plasma">memory</code> or{' '}
        <code className="text-plasma">harvest</code> capability read this before asserting anything, and write back
        through <code className="text-plasma">kb_commit</code>.
      </p>

      {entries.length === 0 ? (
        <Empty
          kicker="Vault empty"
          title="Nothing committed yet"
          body="Kairo and LoqiSurfer commit facts here during missions. You can also seed it directly via POST /api/kb."
        />
      ) : (
        <div className="mt-8 space-y-8">
          {Object.entries(byWorld).map(([world, items]) => (
            <section key={world}>
              <p className="mb-3 flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: worldAccent(world) }} />
                <span className="font-display text-[13px] text-white">{worldName(world)}</span>
                <span className="font-mono text-[10px] text-ash-dim">{items.length} entries</span>
              </p>
              <ul className="space-y-2">
                {items.map((e) => (
                  <li key={e.id} className="panel px-5 py-4">
                    <p className="text-sm leading-relaxed text-ash">{e.claim}</p>
                    <p className="mt-2.5 flex flex-wrap items-center gap-3 font-mono text-[10px] text-ash-dim">
                      <span className={CONF_COLOR[e.confidence]}>{e.confidence}</span>
                      <span>{e.source ?? 'unattributed'}</span>
                      <span>via {e.committedBy}</span>
                      <span>{relativeTime(e.updatedAt)}</span>
                      {e.supersedes && <span className="text-horizon">supersedes: {e.supersedes}</span>}
                    </p>
                    {e.tags.length > 0 && (
                      <ul className="mt-2.5 flex flex-wrap gap-1.5">
                        {e.tags.map((t) => (
                          <li key={t} className="rounded border border-seam bg-void/60 px-2 py-0.5 font-mono text-[9px] text-ash-dim">
                            {t}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
