import Link from 'next/link';
import { auth } from '~/auth';
import { AGENT_LIST } from '@/lib/agents/registry';
import OmniverseCanvas from '@/components/landing/OmniverseCanvas';

export default async function LandingPage() {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  return (
    <main className="relative min-h-dvh overflow-x-clip">
      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[.05] bg-void/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="group flex items-center gap-3">
            <span className="relative grid h-8 w-8 place-items-center">
              <span className="absolute inset-0 rounded-full border border-quasar/60" />
              <span className="absolute inset-0 rounded-full border border-quasar/40 animate-pulseRing" />
              <span className="h-2 w-2 rounded-full bg-quasar shadow-halo" />
            </span>
            <span className="font-display text-[13px] tracking-[.18em] text-white">LOQI</span>
            <span className="kicker hidden sm:block">Omniverse</span>
          </Link>

          <nav className="flex items-center gap-2">
            <a href="#worlds" className="hidden px-3 font-mono text-[11px] uppercase tracking-[.18em] text-ash transition hover:text-white md:block">
              Worlds
            </a>
            <a href="#doctrine" className="hidden px-3 font-mono text-[11px] uppercase tracking-[.18em] text-ash transition hover:text-white md:block">
              Doctrine
            </a>
            {signedIn ? (
              <Link href="/studio" className="btn-primary">Enter Studio</Link>
            ) : (
              <Link href="/signin" className="btn-primary">Request Access</Link>
            )}
          </nav>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-dvh items-center pt-16">
        <OmniverseCanvas className="absolute inset-0 h-full w-full opacity-90" />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-void to-transparent" />

        <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-6 lg:grid-cols-12">
          <div className="stagger lg:col-span-7">
            <p className="kicker mb-6 flex items-center gap-3">
              <span className="h-px w-10 bg-quasar/60" />
              v2.1.0 · nine worlds online
            </p>

            <h1 className="font-display text-[clamp(2.1rem,5.6vw,4.4rem)] leading-[1.04] text-white text-balance">
              Nine worlds.
              <br />
              <span className="bg-gradient-to-r from-quasar-glow via-quasar to-quasar-hot bg-clip-text text-transparent">
                One command core.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-[17px] leading-relaxed text-ash">
              Sol Quasar takes an objective, decomposes it into a dependency graph, and
              dispatches nine specialised agents across it in parallel. Recon, forge,
              assay, ledger, chorus — each one returns to command, and command returns
              one report.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href={signedIn ? '/army' : '/signin'} className="btn-primary">
                {signedIn ? 'Open the War Room' : 'Enlist with GitHub or Google'}
              </Link>
              <a href="#worlds" className="btn-ghost">See the roster</a>
            </div>

            <dl className="mt-14 grid max-w-lg grid-cols-3 gap-px overflow-hidden rounded-lg border border-white/[.06] bg-white/[.04]">
              {[
                ['09', 'agent worlds'],
                ['∞', 'parallel branches'],
                ['1', 'mission report']
              ].map(([value, label]) => (
                <div key={label} className="bg-hull/80 px-5 py-4">
                  <dt className="font-display text-2xl text-white">{value}</dt>
                  <dd className="kicker mt-1">{label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="h-10 w-px bg-gradient-to-b from-transparent to-quasar/60" />
        </div>
      </section>

      {/* ── Worlds ──────────────────────────────────────────────────── */}
      <section id="worlds" className="relative mx-auto max-w-7xl px-6 py-28">
        <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="kicker mb-3">§ 01 — the roster</p>
            <h2 className="font-display text-[clamp(1.5rem,3.2vw,2.4rem)] text-white">
              Every world does one thing
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-ash-dim">
            Capability tags are the routing contract. The planner may only hand a task
            to a world that declares the capability it needs — so the graph is
            auditable before a single token is spent.
          </p>
        </div>

        <div className="stagger grid gap-px overflow-hidden rounded-xl border border-white/[.06] bg-white/[.05] sm:grid-cols-2 lg:grid-cols-3">
          {AGENT_LIST.map((agent) => (
            <article
              key={agent.id}
              className="group relative bg-hull/85 p-7 transition-colors duration-300 hover:bg-plate/85"
            >
              <span
                className="absolute inset-x-0 top-0 h-px opacity-40 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: `linear-gradient(90deg, transparent, ${agent.accent}, transparent)` }}
              />

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[.28em]" style={{ color: agent.accent }}>
                    {agent.callsign}
                  </p>
                  <h3 className="mt-2 font-display text-[15px] leading-tight text-white">{agent.world}</h3>
                  <p className="mt-1 text-xs text-ash-dim">{agent.role}</p>
                </div>
                <span
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: agent.accent, boxShadow: `0 0 18px ${agent.accent}` }}
                />
              </div>

              <p className="mt-5 text-sm leading-relaxed text-ash">{agent.blurb}</p>

              <ul className="mt-6 flex flex-wrap gap-1.5">
                {agent.capabilities.map((cap) => (
                  <li
                    key={cap}
                    className="rounded border border-white/[.07] bg-void/60 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ash-dim"
                  >
                    {cap}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* ── Doctrine ────────────────────────────────────────────────── */}
      <section id="doctrine" className="relative border-y border-white/[.05] bg-hull/30">
        <div className="mx-auto max-w-7xl px-6 py-28">
          <p className="kicker mb-3">§ 02 — how a mission runs</p>
          <h2 className="mb-16 max-w-2xl font-display text-[clamp(1.5rem,3.2vw,2.4rem)] leading-tight text-white text-balance">
            Plan the graph. Run the branches. Reduce to one answer.
          </h2>

          <ol className="stagger grid gap-8 md:grid-cols-4">
            {[
              ['Decompose', 'Command turns the objective into a task DAG. Independent work is never chained — that is the whole point of the graph.'],
              ['Dispatch', 'Eligible tasks run concurrently up to the pool limit. Each agent sees only its own brief and its direct upstream returns.'],
              ['Contain', 'A failed branch poisons only its dependents. Siblings finish. The report states plainly what it therefore cannot cover.'],
              ['Reduce', 'Command synthesises every return into one report, preserving each caveat the field agents raised.']
            ].map(([title, copy], i) => (
              <li key={title} className="ticked panel p-6">
                <span className="font-mono text-[11px] text-quasar">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-3 font-display text-sm text-white">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ash-dim">{copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 py-32 text-center">
        <h2 className="mx-auto max-w-2xl font-display text-[clamp(1.6rem,4vw,2.8rem)] leading-tight text-white text-balance">
          Give it an objective. Take back a report.
        </h2>
        <p className="mx-auto mt-6 max-w-lg text-ash">
          Access is OAuth-gated through GitHub or Google. Members get the ChatStudio and
          the full Army war room.
        </p>
        <div className="mt-10 flex justify-center">
          <Link href={signedIn ? '/studio' : '/signin'} className="btn-primary">
            {signedIn ? 'Enter Studio' : 'Request Access'}
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/[.05] py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <p className="kicker">Loqi Omniverse · Agentic OS v2.1.0</p>
          <p className="font-mono text-[11px] text-ash-dim">
            Sol Quasar command core · nine worlds nominal
          </p>
        </div>
      </footer>
    </main>
  );
}
