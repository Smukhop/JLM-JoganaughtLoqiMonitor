import { auth } from '~/auth';
import { db } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const mission = await db.mission.findFirst({
    where: { id, userId: session.user.id },
    include: { tasks: { orderBy: { startedAt: 'asc' } } }
  });

  if (!mission) return new Response('Not found', { status: 404 });
  return Response.json(mission);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const { count } = await db.mission.deleteMany({ where: { id, userId: session.user.id } });
  return count ? new Response(null, { status: 204 }) : new Response('Not found', { status: 404 });
}
