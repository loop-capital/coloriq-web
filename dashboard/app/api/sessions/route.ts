import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { JWT_SECRET_KEY } from '@/lib/auth';
import { getAuthTokenCookie } from '@/lib/cookie-keys';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';

async function getSalonId(request: NextRequest, bodySalonId?: string): Promise<string | null> {
  if (bodySalonId) return bodySalonId;
  const token = getAuthTokenCookie((n) => request.cookies.get(n)?.value);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    const userId = payload.userId as string;
    const stylist = await prisma.stylists.findUnique({ where: { id: userId }, select: { salon_id: true } });
    return stylist?.salon_id || null;
  } catch { return null; }
}

/**
 * POST /api/sessions
 * Create a formulation session and generate a 4-digit code for phone-to-iPad photo transfer.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const salonId = await getSalonId(request, body.salonId);
    if (!salonId) {
      return NextResponse.json({ error: 'No salon found. Please log in.' }, { status: 400 });
    }

    const session = await prisma.formulation_sessions.create({
      data: {
        salonId,
        stylistId: body.stylistId || null,
        clientId: body.clientId || null,
        status: 'active',
      },
    });

    const code = String(Math.floor(1000 + Math.random() * 9000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.session_codes.create({
      data: {
        salonId,
        code,
        formulationSessionId: session.id,
        expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        code,
        expiresAt: expiresAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/sessions?code=XXXX
 * Look up a session by its 4-digit code.
 */
export async function GET(request: NextRequest) {
  try {
    const limit = rateLimit(getClientIdentifier(request), 60_000, 10);
    if (!limit.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    const sessionCode = await prisma.session_codes.findFirst({
      where: { code, used: false, expiresAt: { gt: new Date() } },
    });

    if (!sessionCode) {
      return NextResponse.json({ error: 'Session not found or code expired/used' }, { status: 404 });
    }

    const session = await prisma.formulation_sessions.findUnique({
      where: { id: sessionCode.formulationSessionId! },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        salonId: session.salonId,
        stylistId: session.stylistId,
        clientId: session.clientId,
        status: session.status,
        photoUrl: session.photoUrl,
        createdAt: session.createdAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
