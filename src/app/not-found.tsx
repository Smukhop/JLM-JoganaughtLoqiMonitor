import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="kicker mb-4">Signal lost</p>
        <h1 className="font-display text-3xl text-white">404 · world not found</h1>
        <p className="mt-4 text-ash">That coordinate does not resolve to any of the nine.</p>
        <Link href="/" className="btn-primary mt-8">Return to the core</Link>
      </div>
    </main>
  );
}
