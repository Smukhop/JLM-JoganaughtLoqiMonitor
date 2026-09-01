import { auth } from '~/auth';
import { db } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  const missions = await db.mission.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, objective: true, status: true, createdAt: true }
  });

  return Response.json(missions);
}
