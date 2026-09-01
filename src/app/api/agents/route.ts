import { auth } from '~/auth';
import { AGENT_LIST } from '@/lib/agents/registry';

export const runtime = 'nodejs';

/** Public-safe view of the roster — system prompts are never shipped to the client. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  return Response.json(
    AGENT_LIST.map(({ systemPrompt, ...spec }) => spec)
  );
}
