import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';

/**
 * Edge-safe half of the auth config. `middleware.ts` imports THIS file only —
 * it must never pull in Prisma, which cannot run on the edge runtime.
 *
 * Session strategy is JWT, not database. This is deliberate: edge middleware
 * cannot reach Postgres, so a database strategy would make `authorized()` blind
 * and every members route would 302 to /signin forever. The Prisma adapter still
 * persists users and linked accounts — only the session itself lives in the cookie.
 */
export const authConfig = {
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
      authorization: { params: { prompt: 'consent', access_type: 'offline' } }
    })
  ],
  pages: {
    signIn: '/signin',
    error: '/signin'
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isMemberRoute =
        pathname.startsWith('/studio') ||
        pathname.startsWith('/army') ||
        pathname.startsWith('/settings') ||
        pathname.startsWith('/missions') ||
        pathname.startsWith('/vault');
      if (!isMemberRoute) return true;
      return Boolean(auth?.user);
    },
    /** Optional allowlist gate on the members area. */
    signIn({ user }) {
      const raw = process.env.LOQI_MEMBER_ALLOWLIST?.trim();
      if (!raw) return true;
      const email = user.email?.toLowerCase();
      if (!email) return false;
      return raw
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
        .some((rule) => (rule.startsWith('@') ? email.endsWith(rule) : email === rule));
    }
  },
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  trustHost: true
} satisfies NextAuthConfig;
