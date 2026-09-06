'use client';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-md">
        <p className="kicker mb-4">Containment breach</p>
        <h1 className="font-display text-2xl text-white">Something failed in the core</h1>
        <p className="mt-4 font-mono text-xs text-ash-dim">{error.message}</p>
        <button onClick={reset} className="btn-primary mt-8">Re-initialise</button>
      </div>
    </main>
  );
}
