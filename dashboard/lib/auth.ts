import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { TOKEN_COOKIE_NEW, TOKEN_COOKIE_LEGACY, getAuthTokenCookie } from './cookie-keys';

if (!process.env.JWT_SECRET) {
  console.warn('[auth] JWT_SECRET env var is not set — using insecure fallback. Set JWT_SECRET in production.');
}
export const JWT_SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'coloriq-prod-secret-2026'
);
// Legacy cookie name retired by the 2026-10-13 migration -- see lib/cookie-keys.ts.

export interface User {
  id: string;
  email: string;
  username: string;
  [key: string]: any;
}

export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
}

export async function generateToken(user: User): Promise<string> {
  return new SignJWT({ userId: user.id, username: user.username, email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET_KEY);
}

export async function getTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return getAuthTokenCookie((n) => cookieStore.get(n)?.value) || null;
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE_NEW, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  // Migration: the new cookie is written -- drop the legacy one.
  cookieStore.delete(TOKEN_COOKIE_LEGACY);
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  for (const name of [TOKEN_COOKIE_NEW, TOKEN_COOKIE_LEGACY]) {
    cookieStore.set(name, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
  }
}

/**
 * Verify a JWT token string directly.
 * Returns the decoded payload or null if invalid.
 */
export async function verifyToken(
  token: string
): Promise<{ userId: string; username: string; email: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY, {
      clockTolerance: 60,
    });
    const userId = payload.userId as string | undefined;
    const username = payload.username as string | undefined;
    const email = payload.email as string | undefined;

    if (!userId) return null;
    return { userId, username: username || '', email: email || '' };
  } catch {
    return null;
  }
}

/**
 * Verify a JWT token from Authorization: Bearer <token> header.
 * Returns the decoded payload or null if invalid.
 */
export async function verifyBearerToken(
  request: Request
): Promise<{ userId: string; username: string; email: string } | null> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;

  const token = auth.slice(7).trim();
  return verifyToken(token);
}

/**
 * Get token from cookie OR Bearer header, then verify it.
 * Returns the decoded payload or null if invalid/missing.
 */
export async function getUserFromRequest(
  request: Request
): Promise<{ userId: string; username: string; email: string } | null> {
  const cookieToken = await getTokenFromCookie();
  const bearerToken = request.headers.get('authorization')?.replace('Bearer ', '');
  
  // Try bearer token first (from localStorage), then cookie
  if (bearerToken) {
    const bearerUser = await verifyToken(bearerToken);
    if (bearerUser) return bearerUser;
  }
  
  if (cookieToken) {
    const cookieUser = await verifyToken(cookieToken);
    if (cookieUser) return cookieUser;
  }
  
  return null;
}
