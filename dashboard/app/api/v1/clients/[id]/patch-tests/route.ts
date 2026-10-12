// ============================================================
// GET /api/v1/clients/[id]/patch-tests — List patch test history
// POST /api/v1/clients/[id]/patch-tests — Record a new patch test
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, requireAuth } from '@/lib/api/auth';

const VALID_RESULTS = ['pass', 'fail', 'reaction'];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!requireAuth(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;

    const tests = await prisma.client_patch_tests.findMany({
      where: { client_id: id },
      orderBy: { test_date: 'desc' },
    });

    // Compute status from the most recent test
    const now = new Date();
    let status: 'current' | 'expired' | 'failed' | 'never_tested' = 'never_tested';
    if (tests.length > 0) {
      const latest = tests[0];
      if (latest.result === 'fail' || latest.result === 'reaction') {
        status = 'failed';
      } else if (latest.expiry_date && new Date(latest.expiry_date) < now) {
        status = 'expired';
      } else {
        status = 'current';
      }
    }

    return NextResponse.json({ tests, status });
  } catch (err) {
    console.error('[patch-tests] GET error:', err);
    return NextResponse.json({ error: 'Failed to load patch tests' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!requireAuth(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const body = await req.json();

    const { test_date, product_brand, product_shade, result, notes, expiry_date, salon_id } = body;

    if (!test_date) {
      return NextResponse.json({ error: 'test_date is required' }, { status: 400 });
    }
    if (!VALID_RESULTS.includes(result)) {
      return NextResponse.json(
        { error: `result must be one of: ${VALID_RESULTS.join(', ')}` },
        { status: 400 }
      );
    }

    // Default expiry: 6 months from test date (industry standard for patch tests)
    const testDate = new Date(test_date);
    const defaultExpiry = new Date(testDate);
    defaultExpiry.setMonth(defaultExpiry.getMonth() + 6);

    const test = await prisma.client_patch_tests.create({
      data: {
        client_id: id,
        salon_id: salon_id || undefined,
        test_date: testDate,
        product_brand: product_brand || undefined,
        product_shade: product_shade || undefined,
        result,
        notes: notes || undefined,
        tested_by: user.id || undefined,
        expiry_date: expiry_date ? new Date(expiry_date) : defaultExpiry,
      },
    });

    return NextResponse.json({ test }, { status: 201 });
  } catch (err) {
    console.error('[patch-tests] POST error:', err);
    return NextResponse.json({ error: 'Failed to record patch test' }, { status: 500 });
  }
}
