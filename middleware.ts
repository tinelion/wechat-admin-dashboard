import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Only protect non-API, non-static, non-login routes
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/api') || pathname.startsWith('/login') || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  // Check for any auth session cookie
  const cookies = request.cookies.getAll();
  const hasSession = cookies.some(c =>
    c.name.includes('authjs') || c.name.includes('next-auth')
  );

  if (!hasSession) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
