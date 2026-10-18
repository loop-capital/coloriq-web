import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getAuthTokenCookie } from '@/lib/cookie-keys';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'coloriq-prod-secret-2026'
);

/**
 * HARD CLOSE (Jason, 2026-10-17): no product access without a subscription.
 * No free layer. A login alone grants nothing.
 *
 * Access = valid JWT AND (active subscription OR active grant).
 * Grants: founding cohort, team/test, Jason — named, revocable, in the
 * subscriptions table as tier='grant:*'.
 *
 * Public surfaces (no auth, no entitlement):
 * - Marketing pages: /, /privacy, /tools (lead-gen calculators), /monitoring
 * - Auth flows: /login, /register, /api/auth/{login,register,logout,apple,google,entitlement}
 * - /get-access (the subscribe/founding-application door)
 * - /api/health, /api/square/webhook
 * - /api/v1/transformations/* (own API-key auth via resolveStylist at route level)
 */

const PUBLIC_PAGES = [
  '/',
  '/login',
  '/register',
  '/privacy',
  '/tools',
  '/monitoring',
  '/get-access',
];

const PUBLIC_API_EXACT = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/apple',
  '/api/auth/apple/callback',
  '/api/auth/google',
  '/api/auth/google/callback',
  '/api/auth/entitlement',
  '/api/health',
  '/api/square/webhook',
];

// Integration routes with their own API-key auth (route-level, resolveStylist)
const PUBLIC_API_PREFIX = ['/api/v1/transformations/'];

function isPublicPath(pathname: string): boolean {
  if (!pathname.startsWith('/api')) {
    return PUBLIC_PAGES.some((p) => pathname === p || pathname.startsWith(p + '/'));
  }
  if (PUBLIC_API_EXACT.includes(pathname)) return true;
  return PUBLIC_API_PREFIX.some((p) => pathname.startsWith(p));
}

function extractToken(request: NextRequest): string | null {
  const cookieToken = getAuthTokenCookie((n) => request.cookies.get(n)?.value);
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return cookieToken || bearer || null;
}

async function checkEntitlement(request: NextRequest): Promise<boolean> {
  try {
    const url = new URL('/api/auth/entitlement', request.nextUrl.origin);
    const headers: Record<string, string> = {};
    const cookie = request.headers.get('cookie');
    const auth = request.headers.get('authorization');
    if (cookie) headers['cookie'] = cookie;
    if (auth) headers['authorization'] = auth;
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) return false;
    const data = (await res.json()) as { hasAccess?: boolean };
    return data.hasAccess === true;
  } catch {
    // Fail closed: entitlement check error => no access
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith('/api');

  if (!isPublicPath(pathname)) {
    const token = extractToken(request);
    if (!token) {
      return denyUnauthenticated(request, isApi);
    }
    try {
      await jwtVerify(token, JWT_SECRET);
    } catch {
      return denyUnauthenticated(request, isApi);
    }
    // JWT valid — now the hard close: subscription or grant required
    const entitled = await checkEntitlement(request);
    if (!entitled) {
      return denyUnentitled(request, isApi);
    }
  }

  const response = NextResponse.next();
  if (isApi) {
    response.headers.set('Cache-Control', 'private, no-store, must-revalidate');
    response.headers.set('Vercel-CDN-Cache-Control', 'no-store');
  } else {
    response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    response.headers.set('Vercel-CDN-Cache-Control', 'public, max-age=0, must-revalidate');
  }
  return response;
}

function denyUnauthenticated(request: NextRequest, isApi: boolean) {
  if (isApi) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('from', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

function denyUnentitled(request: NextRequest, isApi: boolean) {
  if (isApi) {
    return NextResponse.json(
      { error: 'subscription_required', message: 'COLORiq requires an active subscription.' },
      { status: 403 }
    );
  }
  const url = new URL('/get-access', request.url);
  url.searchParams.set('from', request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
