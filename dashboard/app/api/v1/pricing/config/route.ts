import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

import { JWT_SECRET_KEY as JWT_SECRET } from '@/lib/auth';
import { getAuthTokenCookie } from '@/lib/cookie-keys';

const DEFAULT_CONFIG = {
  costPlusMode: true,
  markupPercent: 100, // 2x (cost * 2 = cost + 100%)
  applyToColor: true,
  applyToDeveloper: true,
};

async function getSalonId(request: NextRequest): Promise<string | null> {
  const token = getAuthTokenCookie((n) => request.cookies.get(n)?.value);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    // payload.userId is users.id — this previously looked it up as if it
    // were a stylists.id (they're different rows, linked via
    // stylists.user_id), so this never matched and every real salon
    // silently fell back to defaults on GET and got "No salon linked to
    // your account" on every PUT.
    const userId = payload.userId as string;
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { salon_id: true },
    });
    return user?.salon_id || null;
  } catch {
    return null;
  }
}

// GET /api/v1/pricing/config — get cost-plus config for current user's salon
export async function GET(request: NextRequest) {
  try {
    const salonId = await getSalonId(request);

    if (!salonId) {
      // No salon linked — return defaults
      return NextResponse.json({ config: DEFAULT_CONFIG });
    }

    const salon = await prisma.salons.findUnique({
      where: { id: salonId },
      select: { settings: true },
    });

    const settings = (salon?.settings as any) || {};
    const pricing = settings.costPlusPricing || DEFAULT_CONFIG;

    return NextResponse.json({ config: pricing });
  } catch (err: any) {
    console.error('[pricing/config GET]', err);
    return NextResponse.json({ config: DEFAULT_CONFIG });
  }
}

// PUT /api/v1/pricing/config — update cost-plus config
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { markupPercent, applyToColor, applyToDeveloper } = body;

    const salonId = await getSalonId(request);

    if (!salonId) {
      return NextResponse.json({ error: 'No salon linked to your account' }, { status: 400 });
    }

    if (markupPercent === undefined || markupPercent < 0 || markupPercent > 1000) {
      return NextResponse.json({ error: 'markupPercent must be 0–1000' }, { status: 400 });
    }

    const salon = await prisma.salons.findUnique({
      where: { id: salonId },
      select: { settings: true },
    });

    const currentSettings = (salon?.settings as any) || {};

    const updatedSettings = {
      ...currentSettings,
      costPlusPricing: {
        costPlusMode: true,
        markupPercent: Number(markupPercent),
        applyToColor: applyToColor !== false,
        applyToDeveloper: applyToDeveloper !== false,
      },
    };

    await prisma.salons.update({
      where: { id: salonId },
      data: { settings: updatedSettings },
    });

    return NextResponse.json({
      success: true,
      config: updatedSettings.costPlusPricing,
    });
  } catch (err: any) {
    console.error('[pricing/config PUT]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
