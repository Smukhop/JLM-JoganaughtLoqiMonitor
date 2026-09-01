import { NextRequest } from 'next/server';
import { auth } from '~/auth';
import { db } from '@/lib/server/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  const missionId = req.nextUrl.searchParams.get('missionId') ?? undefined;

  const artifacts = await db.artifact.findMany({
    where: { userId: session.user.id, ...(missionId ? { missionId } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { id: true, filename: true, language: true, agentId: true, createdAt: true, missionId: true }
  });

  return Response.json(artifacts);
}
