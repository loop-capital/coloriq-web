// ============================================================
// POST /api/v1/accuracy — Record a formula accuracy outcome
// Called when a stylist completes a session and rates the result.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, requireAuth } from '@/lib/api/auth';

const VALID_OUTCOMES = ['nailed_it', 'needed_adjustment', 'missed'];
// Records rated 1-2 or marked 'missed' are flagged for retraining review
const RETRAINING_RATING_THRESHOLD = 2;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!requireAuth(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();

    const {
      formulation_id,
      formula_id,
      client_id,
      service_type,
      predicted_level,
      actual_level,
      predicted_tone,
      actual_tone,
      outcome,
      rating,
      adjustment_notes,
      salon_id,
    } = body;

    if (!VALID_OUTCOMES.includes(outcome)) {
      return NextResponse.json(
        { error: `outcome must be one of: ${VALID_OUTCOMES.join(', ')}` },
        { status: 400 }
      );
    }
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'rating must be 1-5' }, { status: 400 });
    }

    const needs_retraining =
      outcome === 'missed' || (typeof rating === 'number' && rating <= RETRAINING_RATING_THRESHOLD);

    const record = await prisma.formula_accuracy.create({
      data: {
        formulation_id: formulation_id || undefined,
        formula_id: formula_id || undefined,
        client_id: client_id || undefined,
        stylist_id: user.id || undefined,
        salon_id: salon_id || undefined,
        service_type: service_type || undefined,
        predicted_level: predicted_level ?? undefined,
        actual_level: actual_level ?? undefined,
        predicted_tone: predicted_tone || undefined,
        actual_tone: actual_tone || undefined,
        outcome,
        rating: rating ?? undefined,
        adjustment_notes: adjustment_notes || undefined,
        needs_retraining,
      },
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (err) {
    console.error('[accuracy] POST error:', err);
    return NextResponse.json({ error: 'Failed to record accuracy' }, { status: 500 });
  }
}
