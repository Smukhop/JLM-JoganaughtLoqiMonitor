import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { auth, signIn } from '~/auth';

export const metadata: Metadata = { title: 'Access' };

const PROVIDERS = [
  { id: 'github', label: 'Continue with GitHub', hint: 'Recommended for operators' },
  { id: 'google', label: 'Continue with Google', hint: 'Workspace accounts supported' }
];

const ERRORS: Record<string, string> = {
  AccessDenied: 'That account is not on the member allowlist for this deployment.',
  OAuthAccountNotLinked: 'That email is already registered with a different provider. Sign in with the original one.',
  Configuration: 'Auth is misconfigured on the server. Check AUTH_SECRET and the provider credentials.',
  Verification: 'That sign-in link has expired. Request a new one.'
};

export default async function SignInPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect('/studio');

  const { error, callbackUrl } = await searchParams;

  return (
    <main className="relative grid min-h-dvh place-items-center px-6 py-16">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-quasar/10 blur-[130px]" />

      <div className="stagger relative w-full max-w-md">
        <Link href="/" className="mb-10 flex items-center justify-center gap-3">
          <span className="relative grid h-9 w-9 place-items-center">
            <span className="absolute inset-0 rounded-full border border-quasar/60" />
            <span className="absolute inset-0 rounded-full border border-quasar/40 animate-pulseRing" />
            <span className="h-2 w-2 rounded-full bg-quasar shadow-halo" />
          </span>
          <span className="font-display text-sm tracking-[.2em] text-white">LOQI OMNIVERSE</span>
        </Link>

        <div className="ticked panel p-8">
          <p className="kicker mb-2">Command authorisation</p>
          <h1 className="font-display text-xl leading-tight text-white">Enter the Omniverse</h1>
          <p className="mt-3 text-sm leading-relaxed text-ash-dim">
            Membership unlocks the ChatStudio and the Agentic Army war room. We store
            your name, email and avatar — nothing else.
          </p>

          {error && (
            <div className="mt-6 rounded-md border border-quasar-hot/40 bg-quasar-hot/[.08] px-4 py-3 text-sm text-quasar-glow">
              {ERRORS[error] ?? 'Sign-in failed. Try again.'}
            </div>
          )}

          <div className="mt-7 space-y-3">
            {PROVIDERS.map((provider) => (
              <form
                key={provider.id}
                action={async () => {
                  'use server';
                  await signIn(provider.id, { redirectTo: callbackUrl ?? '/studio' });
                }}
              >
                <button type="submit" className="btn-ghost w-full justify-between px-5 py-4">
                  <span>{provider.label}</span>
                  <span className="font-mono text-[10px] normal-case tracking-normal text-ash-dim">
                    {provider.hint}
                  </span>
                </button>
              </form>
            ))}
          </div>

          <p className="mt-7 border-t border-seam pt-5 text-xs leading-relaxed text-ash-dim">
            By continuing you agree that mission transcripts are stored against your
            account so you can return to them.
          </p>
        </div>

        <p className="mt-6 text-center">
          <Link href="/" className="font-mono text-[11px] uppercase tracking-[.18em] text-ash-dim transition hover:text-ash">
            ← Back to the worlds
          </Link>
        </p>
      </div>
    </main>
  );
}
