import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, signOut } from '~/auth';
import { initials } from '@/lib/utils';

const NAV = [
  { href: '/studio', label: 'ChatStudio' },
  { href: '/army', label: 'War Room' },
  { href: '/missions', label: 'Missions' },
  { href: '/vault', label: 'Vault' },
  { href: '/settings', label: 'Settings' }
];

export default async function MembersLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/signin');

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-50 border-b border-white/[.05] bg-void/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-5">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-quasar shadow-halo" />
            <span className="font-display text-[12px] tracking-[.18em] text-white">LOQI</span>
          </Link>

          <nav className="flex items-center gap-1 overflow-x-auto">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-[.16em] text-ash transition hover:bg-white/[.04] hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden font-mono text-[11px] text-ash-dim sm:block">
              {session.user.email}
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-full border border-seam bg-plate font-mono text-[11px] text-quasar">
              {initials(session.user.name)}
            </span>
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/' });
              }}
            >
              <button className="font-mono text-[11px] uppercase tracking-[.16em] text-ash-dim transition hover:text-quasar">
                Exit
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex-1">{children}</div>
    </div>
  );
}
