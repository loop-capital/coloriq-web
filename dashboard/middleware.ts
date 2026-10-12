import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'coloriq-prod-secret-2026'
);

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/privacy',
  '/tools',         // Free public calculator tools (SEO/lead-gen) — no login required
  '/api',           // All API routes are public (handle own auth via Bearer token)
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/apple',
  '/api/auth/apple/callback',
  '/api/auth/google',
  '/api/auth/google/callback',
  '/api/health',
  '/monitoring',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));

  if (!isPublic) {
    // Check for cookie-based auth (web dashboard)
    const token = request.cookies.get('colorgenius_token')?.value;
    // Check for Bearer token auth (mobile app)
    const authHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    
    const authToken = token || authHeader;
    
    if (!authToken) {
      return redirectToLogin(request);
    }
    try {
      await jwtVerify(authToken, JWT_SECRET);
    } catch {
      return redirectToLogin(request);
    }
  }

  const response = NextResponse.next();
  if (pathname.startsWith('/api')) {
    // API responses are per-user/session (auth/me, etc.) — never let a shared
    // or edge cache serve one response body to a different caller.
    response.headers.set('Cache-Control', 'private, no-store, must-revalidate');
    response.headers.set('Vercel-CDN-Cache-Control', 'no-store');
  } else {
    response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    response.headers.set('Vercel-CDN-Cache-Control', 'public, max-age=0, must-revalidate');
  }
  return response;
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('from', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
