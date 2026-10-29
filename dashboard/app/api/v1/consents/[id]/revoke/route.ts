import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveStylist, canWrite } from '@/lib/transformation-auth';
import { toBlindRevokeResponse } from '@/lib/consent';
import { revokeConsentRecord } from '@/lib/consent-store';

// POST /api/v1/consents/:id/revoke — immediate, per-appointment revocation
// (Phase 1 item 4). Idempotent: revoking twice keeps the first revoked_at.
//
// Blind state: only the party that owns the record may revoke it — the
// stylist who captured a stylist-attested record, or the client who
// captured a client-direct record (portal token). Everyone else gets 404,
// indistinguishable from a nonexistent record. The response carries only
// id, kind, and the revoked flag — never appointment/client details.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is fine — revocation needs no payload.
  }

  const record = await prisma.consent_records.findUnique({ where: { id } });
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const stylist = await resolveStylist(req);
  const stylistOwns = !!stylist && canWrite(stylist) && record.stylist_id === stylist.id;
  let clientOwns = false;
  if (typeof body.portal_token === 'string' && body.portal_token) {
    const client = await prisma.clients.findUnique({
      where: { portal_token: body.portal_token },
      select: { id: true, portal_enabled: true },
    });
    clientOwns =
      !!client && client.portal_enabled !== false && record.client_id === client.id;
  }
  if (!stylistOwns && !clientOwns) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let revokedBy: string | null = null;
  if (stylistOwns && stylist) revokedBy = stylist.id;
  else if (clientOwns && record.client_id) revokedBy = record.client_id;
  if (!revokedBy) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await revokeConsentRecord(id, revokedBy);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(toBlindRevokeResponse(updated));
}
