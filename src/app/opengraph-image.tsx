import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Loqi Omniverse — Nine Worlds Agentic OS';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Generated per-deploy rather than a checked-in PNG, so it never goes stale. */
export default async function OpengraphImage() {
  const accents = ['#ff8a3d', '#c2413f', '#f5d24a', '#3ec9a7', '#4de8ff', '#8b6cff', '#ff5b7f', '#7fb2ff', '#ffc46b'];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background:
            'radial-gradient(900px 500px at 80% 0%, rgba(255,138,61,.28), transparent 60%), radial-gradient(700px 400px at 5% 100%, rgba(139,108,255,.24), transparent 60%), #05060a'
        }}
      >
        <div style={{ display: 'flex', gap: 14, marginBottom: 44 }}>
          {accents.map((c) => (
            <div key={c} style={{ width: 14, height: 14, borderRadius: 99, background: c }} />
          ))}
        </div>

        <div style={{ fontSize: 26, letterSpacing: 10, color: '#8f98b3', marginBottom: 22 }}>
          LOQI OMNIVERSE
        </div>

        <div style={{ fontSize: 82, lineHeight: 1.05, color: '#fff', fontWeight: 700, maxWidth: 920 }}>
          Nine worlds.
        </div>
        <div style={{ fontSize: 82, lineHeight: 1.05, color: '#ff8a3d', fontWeight: 700 }}>
          One command core.
        </div>

        <div style={{ fontSize: 27, color: '#8f98b3', marginTop: 40, maxWidth: 800 }}>
          Autonomous agentic OS — plan a mission, watch the army execute it in parallel.
        </div>
      </div>
    ),
    size
  );
}
