import { buildClientSummary } from '../client-summary';

describe('buildClientSummary', () => {
  const record = {
    fields: { targetLevel: 7, hairType: 'normal', greyCoverageNeed: 'blend' },
    confirmedAt: new Date('2026-11-12T16:00:00.000Z'),
    confirmedReportId: 'rep-1',
    appointmentId: 'appt-1',
  };
  const report = { serviceConsent: true, featuringConsent: false };

  it('returns null when there is no confirmed record', () => {
    expect(buildClientSummary(null, report)).toBeNull();
    expect(buildClientSummary(null, null)).toBeNull();
  });

  it('passes the confirmed fields through and takes consents from the report', () => {
    const s = buildClientSummary(record, report);
    expect(s).toEqual({
      fields: { targetLevel: 7, hairType: 'normal', greyCoverageNeed: 'blend' },
      confirmedAt: '2026-11-12T16:00:00.000Z',
      confirmedReportId: 'rep-1',
      appointmentId: 'appt-1',
      serviceConsent: true,
      featuringConsent: false,
    });
  });

  it('reports consents as null (not false) when no confirmed report carries them', () => {
    const s = buildClientSummary(record, null);
    expect(s?.serviceConsent).toBeNull();
    expect(s?.featuringConsent).toBeNull();
  });

  it('treats an answered-no as false, distinct from unknown', () => {
    const s = buildClientSummary(record, { serviceConsent: true, featuringConsent: false });
    expect(s?.featuringConsent).toBe(false);
  });
});
