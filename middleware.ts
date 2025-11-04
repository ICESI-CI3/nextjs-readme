import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const ADMIN_PATH = '/admin';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith(ADMIN_PATH)) {
    const role = request.cookies.get('role')?.value;
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/books/:path*',
    '/reviews/:path*',
    '/clubs/:path*',
    '/reports/:path*',
    '/admin/:path*',
    '/reading/:path*',
  ],
};
