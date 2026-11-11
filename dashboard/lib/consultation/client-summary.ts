/**
 * Client profile summary feed (repeat-letter seam 1, beta plan §5.1).
 *
 * The cadence job needs, per client, the latest stylist-CONFIRMED
 * consultation record — to fill the repeat letter's read-back AND to decide
 * which letter the client gets (confirmed profile on file -> repeat letter;
 * none -> full letter). This module shapes that read; the route does the
 * auth + the queries.
 *
 * Shape note: the summary returns the confirmed record's `fields` as-is
 * (the pinned contract keys) plus the consent answers from the confirmed
 * report. The letter copy is the cadence job's job; COLORiq owns the data.
 * Consent booleans are `boolean | null`: false means the client answered
 * no, null means no confirmed report carries an answer (never conflate them
 * — the letter's "(b) last time you [agreed / did not agree]" line needs
 * the distinction).
 */

export interface ConfirmedProfileSummary {
  /** The confirmed record's fields (pinned contract keys). */
  fields: Record<string, unknown>;
  /** ISO timestamp of the confirmation. */
  confirmedAt: string;
  confirmedReportId: string | null;
  appointmentId: string;
  serviceConsent: boolean | null;
  featuringConsent: boolean | null;
}

export interface ConfirmedRecordLike {
  fields: unknown;
  confirmedAt: Date | string | null;
  confirmedReportId: string | null;
  appointmentId: string;
}

export interface ConfirmedReportLike {
  serviceConsent: boolean | null;
  featuringConsent: boolean | null;
}

/** Null record -> null summary (no confirmed profile on file). */
export function buildClientSummary(
  record: ConfirmedRecordLike | null,
  report: ConfirmedReportLike | null,
): ConfirmedProfileSummary | null {
  if (!record) return null;
  return {
    fields: (record.fields ?? {}) as Record<string, unknown>,
    confirmedAt:
      record.confirmedAt instanceof Date
        ? record.confirmedAt.toISOString()
        : String(record.confirmedAt ?? ''),
    confirmedReportId: record.confirmedReportId,
    appointmentId: record.appointmentId,
    serviceConsent: report?.serviceConsent ?? null,
    featuringConsent: report?.featuringConsent ?? null,
  };
}
