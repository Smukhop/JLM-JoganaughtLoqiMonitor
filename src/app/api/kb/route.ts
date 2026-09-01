import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '~/auth';
import { db } from '@/lib/server/db';

export const runtime = 'nodejs';

const CreateBody = z.object({
  world: z.string().min(1).max(40),
  claim: z.string().min(4).max(2000),
  source: z.string().max(500).optional(),
  confidence: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  tags: z.array(z.string().max(40)).max(8).default([])
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  const world = req.nextUrl.searchParams.get('world') ?? undefined;
  const q = req.nextUrl.searchParams.get('q')?.trim();

  const entries = await db.kbEntry.findMany({
    where: {
      userId: session.user.id,
      ...(world ? { world } : {}),
      ...(q
        ? {
            OR: [
              { claim: { contains: q, mode: 'insensitive' } },
              { source: { contains: q, mode: 'insensitive' } }
            ]
          }
        : {})
    },
    orderBy: [{ world: 'asc' }, { updatedAt: 'desc' }],
    take: 200
  });

  return Response.json(entries);
}

/** Manual commit — lets a human seed the vault without dispatching a mission. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  const parsed = CreateBody.safeParse(await req.json());
  if (!parsed.success) return new Response(parsed.error.message, { status: 400 });

  const entry = await db.kbEntry.create({
    data: {
      ...parsed.data,
      tags: parsed.data.tags.map((t) => t.toLowerCase()),
      userId: session.user.id,
      committedBy: 'human'
    }
  });

  return Response.json(entry, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return new Response('Missing id', { status: 400 });

  const { count } = await db.kbEntry.deleteMany({ where: { id, userId: session.user.id } });
  return count ? new Response(null, { status: 204 }) : new Response('Not found', { status: 404 });
}
