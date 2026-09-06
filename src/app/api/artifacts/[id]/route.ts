import { auth } from '~/auth';
import { db } from '@/lib/server/db';

export const runtime = 'nodejs';

/** Returns the artefact as a downloadable file, not JSON. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const artifact = await db.artifact.findFirst({ where: { id, userId: session.user.id } });
  if (!artifact) return new Response('Not found', { status: 404 });

  const safeName = artifact.filename.replace(/[^\w.\-/]/g, '_').split('/').pop() || 'artifact.txt';

  return new Response(artifact.content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Cache-Control': 'private, max-age=3600'
    }
  });
}
