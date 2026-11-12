/**
 * GET    /api/account — the signed-in user's account + current plan state
 * DELETE /api/account — permanently delete the signed-in user's account
 *
 * Both require a valid JWT (Bearer or cookie) and enforce it here.
 * Middleware lists this path as entitlement-exempt on purpose: a person
 * whose subscription lapsed must still be able to see that and to delete
 * their account (Apple Guideline 5.1.1(v)). What gets deleted vs.
 * anonymized is documented in lib/account-deletion.ts.
 *
 * DELETE requires body { "confirm": "DELETE" } so a stray request can't
 * wipe an account.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, clearAuthCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteAccount, getAccountPlanState } from '@/lib/account-deletion';

const MANAGE_PLAN_URL = 'https://getcoloriq.co/get-access';

function unauthorized() {
  return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
}

export async function GET(request: NextRequest) {
  const authUser = await getUserFromRequest(request);
  if (!authUser) return unauthorized();

  try {
    const user = await prisma.users.findUnique({
      where: { id: authUser.userId },
      select: { id: true, email: true, first_name: true, last_name: true, created_at: true },
    });
    if (!user) return unauthorized();

    const plan = await getAccountPlanState(user.id);
    return NextResponse.json({
      success: true,
      data: {
        account: {
          id: user.id,
          email: user.email,
          name: [user.first_name, user.last_name].filter(Boolean).join(' ') || null,
          createdAt: user.created_at ? user.created_at.toISOString() : null,
        },
        plan,
        manageUrl: MANAGE_PLAN_URL,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authUser = await getUserFromRequest(request);
  if (!authUser) return unauthorized();

  const body = await request.json().catch(() => ({}));
  if (body?.confirm !== 'DELETE') {
    return NextResponse.json(
      { success: false, error: { code: 'CONFIRMATION_REQUIRED', message: 'Send { "confirm": "DELETE" } to delete this account.' } },
      { status: 400 }
    );
  }

  try {
    const result = await deleteAccount(authUser.userId);
    if (!result) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
    }
    await clearAuthCookie().catch(() => {});
    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error: any) {
    console.error('[account] deletion failed', authUser.userId, error?.code || error?.message);
    return NextResponse.json(
      { success: false, error: { code: 'DELETION_FAILED', message: 'Account deletion failed. Nothing was deleted — please try again or contact support.' } },
      { status: 500 }
    );
  }
}
