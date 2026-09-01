export function Empty({ kicker, title, body }: { kicker: string; title: string; body?: string }) {
  return (
    <div className="mx-auto max-w-sm py-16 text-center">
      <p className="kicker mb-3">{kicker}</p>
      <p className="font-display text-sm text-white">{title}</p>
      {body && <p className="mt-3 text-sm leading-relaxed text-ash-dim">{body}</p>}
    </div>
  );
}
