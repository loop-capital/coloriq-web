// ============================================================
// GET /api/v1/accuracy/stats — Formula accuracy analytics
// Query params: salon_id, period (7d|30d|90d|all), service_type
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, requireAuth } from '@/lib/api/auth';

function periodStart(period: string): Date | undefined {
  const now = new Date();
  if (period === '7d') return new Date(now.getTime() - 7 * 86400000);
  if (period === '30d') return new Date(now.getTime() - 30 * 86400000);
  if (period === '90d') return new Date(now.getTime() - 90 * 86400000);
  return undefined;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!requireAuth(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const salonId = searchParams.get('salon_id') || undefined;
    const period = searchParams.get('period') || '30d';
    const serviceType = searchParams.get('service_type') || undefined;

    const where: any = {};
    if (salonId) where.salon_id = salonId;
    if (serviceType) where.service_type = serviceType;
    const start = periodStart(period);
    if (start) where.created_at = { gte: start };

    const records = await prisma.formula_accuracy.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    const total = records.length;
    const nailedIt = records.filter((r) => r.outcome === 'nailed_it').length;
    const neededAdjustment = records.filter((r) => r.outcome === 'needed_adjustment').length;
    const missed = records.filter((r) => r.outcome === 'missed').length;
    const firstTryAccuracy = total > 0 ? Math.round((nailedIt / total) * 1000) / 10 : 0;

    const rated = records.filter((r) => r.rating != null);
    const avgRating =
      rated.length > 0
        ? Math.round((rated.reduce((s, r) => s + (r.rating as number), 0) / rated.length) * 10) / 10
        : null;

    // Accuracy by service type
    const byService: Record<string, { total: number; nailedIt: number; accuracy: number }> = {};
    for (const r of records) {
      const key = r.service_type || 'unspecified';
      if (!byService[key]) byService[key] = { total: 0, nailedIt: 0, accuracy: 0 };
      byService[key].total++;
      if (r.outcome === 'nailed_it') byService[key].nailedIt++;
    }
    for (const key of Object.keys(byService)) {
      byService[key].accuracy =
        Math.round((byService[key].nailedIt / byService[key].total) * 1000) / 10;
    }

    // Trend: bucket by week
    const byWeek: Record<string, { total: number; nailedIt: number }> = {};
    for (const r of records) {
      if (!r.created_at) continue;
      const d = new Date(r.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      if (!byWeek[key]) byWeek[key] = { total: 0, nailedIt: 0 };
      byWeek[key].total++;
      if (r.outcome === 'nailed_it') byWeek[key].nailedIt++;
    }
    const trend = Object.entries(byWeek)
      .map(([week, v]) => ({
        week,
        total: v.total,
        accuracy: v.total > 0 ? Math.round((v.nailedIt / v.total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => a.week.localeCompare(b.week));

    // Formulas needing retraining review
    const needsRetraining = records.filter((r) => r.needs_retraining);

    return NextResponse.json({
      summary: {
        total,
        nailedIt,
        neededAdjustment,
        missed,
        firstTryAccuracy,
        avgRating,
        retrainingCount: needsRetraining.length,
      },
      byService,
      trend,
      needsRetraining: needsRetraining.slice(0, 50).map((r) => ({
        id: r.id,
        formulation_id: r.formulation_id,
        service_type: r.service_type,
        outcome: r.outcome,
        rating: r.rating,
        adjustment_notes: r.adjustment_notes,
        created_at: r.created_at,
      })),
    });
  } catch (err) {
    console.error('[accuracy] stats error:', err);
    return NextResponse.json({ error: 'Failed to load accuracy stats' }, { status: 500 });
  }
}
