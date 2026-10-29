/**
 * DB access for the GAP-1 consent set (Phase 1 item 4). Thin wrappers over
 * the consent_records delegate; all decision rules live in consent.ts.
 *
 * Owner scoping (blind state): every read filters by the caller's own
 * scope — stylist_id for stylist auth, client_id for portal-token auth.
 * A caller can never read another party's records for an appointment;
 * cross-owner probes are indistinguishable from absence.
 */
import { prisma } from '@/lib/prisma';
import {
  isFeaturingConsentOnFile,
  CLEARED_FEATURING_WORDING_VERSIONS,
  type ConsentCheckResult,
  type NormalizedConsent,
} from './consent';

export type ConsentOwnerScope = { stylist_id: string } | { client_id: string };

export async function createConsentRecord(
  consent: NormalizedConsent,
  owner: { stylist_id?: string | null; client_id?: string | null }
) {
  return prisma.consent_records.create({
    data: {
      appointment_id: consent.appointment_id,
      kind: consent.kind,
      source: consent.source,
      method: consent.method,
      attested_by: consent.attested_by,
      attested_at: new Date(consent.attested_at),
      wording_version: consent.wording_version,
      note: consent.note,
      stylist_id: owner.stylist_id ?? null,
      client_id: owner.client_id ?? null,
    },
  });
}

export async function revokeConsentRecord(id: string, revokedBy: string) {
  const existing = await prisma.consent_records.findUnique({ where: { id } });
  if (!existing) return null;
  if (existing.revoked_at) return existing;
  return prisma.consent_records.update({
    where: { id },
    data: { revoked_at: new Date(), revoked_by: revokedBy, updated_at: new Date() },
  });
}

export async function findFeaturingRecords(appointmentId: string, scope: ConsentOwnerScope) {
  const where: {
    appointment_id: string;
    kind: string;
    stylist_id?: string;
    client_id?: string;
  } = { appointment_id: appointmentId, kind: 'featuring' };
  if ('stylist_id' in scope) where.stylist_id = scope.stylist_id;
  else where.client_id = scope.client_id;
  return prisma.consent_records.findMany({
    where,
    orderBy: { created_at: 'asc' },
  });
}

/**
 * Push-time gate, DB-backed: loads the caller's own featuring records for
 * the appointment and runs the pure check. Defaults to the production
 * cleared set (empty until Gideon clearance lands) — fails closed.
 */
export async function checkFeaturingConsentForAppointment(
  appointmentId: string,
  scope: ConsentOwnerScope,
  clearedVersions: string[] = CLEARED_FEATURING_WORDING_VERSIONS
): Promise<ConsentCheckResult> {
  const records = await findFeaturingRecords(appointmentId, scope);
  return isFeaturingConsentOnFile(records, clearedVersions);
}
