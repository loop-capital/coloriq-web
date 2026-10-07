import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveStylist, canWrite } from '@/lib/transformation-auth';
import {
  serializeTransformation,
  validateConsent,
  PUBLIC_STYLIST_SELECT,
} from '@/lib/transformations';

/**
 * POST /api/v1/transformations/:id/consent — record the marketing consent
 * attestation for a transformation.
 *
 * This is the dedicated endpoint for the consent step of the publishing flow.
 * It wraps the same validateConsent() used by PATCH and publish, but with
 * connector-friendly semantics:
 *
 * Body: { method: "verbal" | "signed" | "digital", client_ref?: string, note?: string }
 *   - attested_by is derived from auth (the stylist), attested_at is now.
 *   - client_ref is an opaque salon-side identifier (no client PII).
 *
 * Semantics: IDEMPOTENT-OVERWRITE (last attestation wins).
 *   Recording consent twice does not 409 — e.g. a verbal confirmation later
 *   upgraded to a signed form. This matches PATCH behavior (client_consent is
 *   overwritable there) and the agent-retry philosophy of the publish endpoint.
 *   Agents retry; the latest attestation is the truthful one.
 *
 * Responses:
 *   200 — consent recorded (returns the serialized transformation)
 *   400 — invalid method or malformed body
 *   401 — unauthenticated
 *   403 — token lacks transformations:write scope
 *   404 — transformation not found (or not owned by this stylist)
 *
 * The bright line, enforced: this endpoint records consent. It never publishes.
 * Publishing is POST .../:id/publish, which 422s without a consent record.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const stylist = await resolveStylist(req);
  if (!stylist) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!canWrite(stylist)) {
    return NextResponse.json({ error: 'Insufficient scope' }, { status: 403 });
  }

  const t = await prisma.transformations.findFirst({
    where: { id, stylist_id: stylist.id },
    include: { stylist: { select: PUBLIC_STYLIST_SELECT } },
  });
  if (!t) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // attested_by / attested_at are server-derived — the caller supplies only
  // the method and optional salon-side references. Never trust client timestamps
  // for the attestation itself.
  const v = validateConsent(
    {
      method: body?.method,
      client_ref: body?.client_ref,
      note: body?.note,
    },
    stylist.id
  );
  if (!v.ok) {
    return NextResponse.json({ error: v.error }, { status: 400 });
  }

  const updated = await prisma.transformations.update({
    where: { id: t.id },
    data: { client_consent: v.consent as any },
    include: { stylist: { select: PUBLIC_STYLIST_SELECT } },
  });

  return NextResponse.json(await serializeTransformation(updated));
}
