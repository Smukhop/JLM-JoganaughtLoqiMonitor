import { auth } from '~/auth';
import { db } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  const threads = await db.thread.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: { id: true, title: true, agentId: true, updatedAt: true }
  });

  return Response.json(threads);
}
