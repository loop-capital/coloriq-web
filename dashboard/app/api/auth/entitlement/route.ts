import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { hasProductAccess } from '@/lib/entitlements';

/**
 * GET /api/auth/entitlement
 * Returns whether the authenticated user has product access
 * (active subscription OR active grant). Used by middleware (Edge),
 * which cannot query Prisma directly.
 *
 * This route itself requires a valid JWT but no entitlement —
 * it is the entitlement oracle, not a gated resource.
 */
export async function GET(request: NextRequest) {
  const authUser = await getUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ hasAccess: false, reason: 'unauthenticated' }, { status: 401 });
  }
  try {
    const hasAccess = await hasProductAccess(authUser.userId);
    return NextResponse.json({ hasAccess });
  } catch {
    // Fail closed: DB error => no access (do not fail open on a security gate)
    return NextResponse.json({ hasAccess: false, reason: 'check_failed' }, { status: 503 });
  }
}
