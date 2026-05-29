import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  const protectedPaths = ['/dashboard', '/assessment', '/library', '/admin'];
  const isProtected = protectedPaths.some(p => pathname.startsWith(p));

  const projectId = 'uqspozzkzyytwwidojxv';
  const hasSession = request.cookies.getAll().some(c =>
    c.name.startsWith(`sb-${projectId}`) || c.name === 'sb-access-token'
  );

  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  if (pathname.startsWith('/auth') && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
