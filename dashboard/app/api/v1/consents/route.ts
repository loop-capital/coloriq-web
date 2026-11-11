import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveStylist, canWrite } from '@/lib/transformation-auth';
import { validateSplitConsent } from '@/lib/consent';
import { createConsentRecord } from '@/lib/consent-store';

// POST /api/v1/consents — client-direct OR stylist-attested split consent
// capture (Phase 1 item 4, GAP-1 consent set).
//
// Source is derived from auth, never from the body:
// - portal-token auth (body.portal_token -> clients.portal_token, portal
//   enabled) => source 'client_direct', actor = client id.
// - stylist auth (session JWT or API token, write scope) =>
//   source 'stylist_attested', actor = stylist id.
// Anything else => 401. A stylist cannot launder attestation as
// client-direct, and a client cannot mint stylist attestation.
//
// Appointment scope is an opaque string key (the repo has no appointments
// table); it is validated as non-empty only. Featuring records captured
// here do NOT authorize featuring until the push-time check passes, which
// requires a Gideon-cleared wording version (none cleared yet).
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Auth path 1: stylist (session or API token) with write scope.
  let source: 'client_direct' | 'stylist_attested' | null = null;
  let actorId: string | null = null;
  const owner: { stylist_id?: string | null; client_id?: string | null } = {};
  const stylist = await resolveStylist(req);
  if (stylist && canWrite(stylist)) {
    source = 'stylist_attested';
    actorId = stylist.id;
    owner.stylist_id = stylist.id;
  } else if (typeof body.portal_token === 'string' && body.portal_token) {
    // Auth path 2: client portal token (the client's own credential).
    const client = await prisma.clients.findUnique({
      where: { portal_token: body.portal_token },
      select: { id: true, portal_enabled: true },
    });
    if (client && client.portal_enabled !== false) {
      source = 'client_direct';
      actorId = client.id;
      owner.client_id = client.id;
    }
  }
  if (!source || !actorId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const v = validateSplitConsent(body, { source, actorId });
  if (!v.ok) {
    return NextResponse.json({ error: v.error }, { status: 422 });
  }
  const record = await createConsentRecord(v.consent, owner);
  return NextResponse.json(record, { status: 201 });
}
