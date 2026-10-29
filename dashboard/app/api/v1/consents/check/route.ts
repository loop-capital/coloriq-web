import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveStylist, canRead, canWrite } from '@/lib/transformation-auth';
import { checkFeaturingConsentForAppointment } from '@/lib/consent-store';

// GET /api/v1/consents/check?appointment_id=... — push-time (b)-on-file
// check (Phase 1 item 4). The gate publication/featuring flows call
// before pushing a post: it answers against CURRENT revocation state, not
// intake-time state.
//
// Blind state by scoping: the check only considers the caller's OWN
// records — stylist_id for stylist auth, client_id for portal-token auth.
// Cross-owner probes return the same shape as absence (allowed: false),
// never another party's consent state. Unauthorized callers get 401.
export async function GET(req: NextRequest) {
  const appointmentId = req.nextUrl.searchParams.get('appointment_id');
  const kind = req.nextUrl.searchParams.get('kind');
  if (!appointmentId) {
    return NextResponse.json({ error: 'appointment_id is required' }, { status: 400 });
  }
  if (kind !== null && kind !== 'featuring') {
    return NextResponse.json({ error: 'kind must be featuring' }, { status: 400 });
  }

  const stylist = await resolveStylist(req);
  let scope: { stylist_id: string } | { client_id: string } | null = null;
  if (stylist && (canRead(stylist) || canWrite(stylist))) {
    scope = { stylist_id: stylist.id };
  } else {
    const portalToken = req.nextUrl.searchParams.get('portal_token');
    if (portalToken) {
      const client = await prisma.clients.findUnique({
        where: { portal_token: portalToken },
        select: { id: true, portal_enabled: true },
      });
      if (client && client.portal_enabled !== false) scope = { client_id: client.id };
    }
  }
  if (!scope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await checkFeaturingConsentForAppointment(appointmentId, scope);
  return NextResponse.json({
    appointment_id: appointmentId,
    featuring_allowed: result.allowed,
    reason: result.reason,
  });
}
