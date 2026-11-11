import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveStylist } from '@/lib/transformation-auth';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// GET /api/v1/formulations/:id — read a single formulation, owner-scoped.
// Returns the full formulation: shades, ratios, developer, application order,
// and processing_instructions (drives the formula-aware processing reminders).
// Auth: session/JWT or per-stylist Bearer token (same resolveStylist as
// transformations). Stylists can only read their own formulations.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stylist = await resolveStylist(req);
  if (!stylist) return unauthorized();

  const f = await prisma.formulations.findFirst({
    where: { id, stylist_id: stylist.id },
  });
  if (!f) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    id: f.id,
    status: f.status,
    brand: f.brand,
    product_line: f.product_line,
    action_type: f.action_type,
    target_level: f.target_level,
    target_tone: f.target_tone,
    primary_formula: f.primary_formula,
    toning_formula: f.toning_formula,
    processing_instructions: f.processing_instructions,
    validation: f.validation,
    confidence_score: f.confidence_score ? Number(f.confidence_score) : null,
    cost_estimate: f.cost_estimate ? Number(f.cost_estimate) : null,
    suggested_price: f.suggested_price ? Number(f.suggested_price) : null,
    input_data: f.input_data,
    created_at: f.created_at,
    updated_at: f.updated_at,
  });
}
