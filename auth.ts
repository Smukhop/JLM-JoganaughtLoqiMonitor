import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '@/lib/server/db';
import { authConfig } from './auth.config';

/**
 * Full auth instance — adapter included. Server Components, route handlers and
 * server actions import from here. `middleware.ts` must NOT (Prisma is not
 * edge-compatible); it imports auth.config.ts instead.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  callbacks: {
    ...authConfig.callbacks,

    /**
     * Runs on sign-in and on every session read. The `user` argument is only
     * present on the initial sign-in, so we stamp id and role into the token
     * once and read them back from the token thereafter.
     */
    async jwt({ token, user }) {
      if (user?.id) {
        token.uid = user.id;
        const record = await db.user.findUnique({
          where: { id: user.id },
          select: { role: true }
        });
        token.role = record?.role ?? 'MEMBER';
      }
      return token;
    },

    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? session.user.id;
        session.user.role = (token.role as 'MEMBER' | 'OPERATOR' | 'ADMIN') ?? 'MEMBER';
      }
      return session;
    }
  }
});

/** Throws a 401 Response if there is no session. Use at the top of protected routes. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Response('Unauthorized', { status: 401 });
  return session;
}
