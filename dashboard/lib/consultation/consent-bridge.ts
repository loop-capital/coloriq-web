/**
 * Consent bridge (repeat-letter seam 3 / beta plan §5.2): the consultation
 * flow captures (a) service and (b) featuring consent on the client report,
 * but the item-4 consent_records store — the push-time check's source —
 * never saw them. At confirm (when the stylist confirms the report at the
 * chair), sync the report's consent values into consent_records so the
 * push-time gate reads what the client actually answered.
 *
 * Rules:
 * - One record per kind per appointment from this flow (source client_direct,
 *   method digital, attested by the client, attested at the report's filing
 *   time). wording_version is NULL for both — service always null; featuring
 *   null until Gideon clears a wording version, so the push-time check still
 *   refuses featuring until the wording is cleared (the correct lock).
 * - A "yes" supersedes: any existing unrevoked client_direct record for
 *   (appointment, kind) is revoked first, then the new one is created. The
 *   latest confirmed report is the effective consent — this is what makes
 *   the repeat letter's (b) keep-or-change work.
 * - A "no" revokes: a change to "no" removes the prior yes (no record is
 *   created). Absence after revocation is refusal, per the consent model.
 * - Idempotent per report: confirm 409s on a non-pending report, so the
 *   sync runs at most once per report. The revoke-before-create also makes
 *   a retry safe.
 */

import { prisma } from '@/lib/prisma';
import {
  createConsentRecord,
  revokeConsentRecord,
} from '@/lib/consent-store';
import type { ConsentKind } from '@/lib/consent';
import { decideConsentSync } from './consent-bridge-decisions';

export interface ReportConsentsInput {
  appointmentId: string;
  clientId: string;
  stylistId: string;
  serviceConsent: boolean;
  featuringConsent: boolean;
  /** The report's filing time — the closest timestamp to the client's approval. */
  attestedAt: Date;
  reportId: string;
  channel: string;
}

async function syncOneKind(
  input: ReportConsentsInput,
  kind: ConsentKind,
  value: boolean,
): Promise<void> {
  const existing = await prisma.consent_records.findMany({
    where: {
      appointment_id: input.appointmentId,
      kind,
      source: 'client_direct',
      revoked_at: null,
    },
    select: { id: true },
  });
  const action = decideConsentSync(existing.length > 0, value);
  if (action === 'none') return;
  for (const row of existing) {
    await revokeConsentRecord(row.id, `superseded by client-report ${input.reportId}`);
  }
  if (action === 'create') {
    await createConsentRecord(
      {
        appointment_id: input.appointmentId,
        kind,
        source: 'client_direct',
        method: 'digital',
        attested_by: input.clientId,
        attested_at: input.attestedAt.toISOString(),
        wording_version: null,
        note: `client-report ${input.reportId} via ${input.channel}`,
      },
      { stylist_id: input.stylistId, client_id: input.clientId },
    );
  }
}

/** Write both kinds from a confirmed report. Called by the confirm route. */
export async function syncReportConsentsToStore(input: ReportConsentsInput): Promise<void> {
  await syncOneKind(input, 'service', input.serviceConsent);
  await syncOneKind(input, 'featuring', input.featuringConsent);
}
