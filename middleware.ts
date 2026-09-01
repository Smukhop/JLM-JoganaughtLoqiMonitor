import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// Edge middleware uses the Prisma-free config; the DB adapter lives in auth.ts.
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp|woff2)$).*)']
};
