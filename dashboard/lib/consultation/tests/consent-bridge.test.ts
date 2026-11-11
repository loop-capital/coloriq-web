import { decideConsentSync } from '../consent-bridge-decisions';

describe('decideConsentSync', () => {
  it('creates when the report says yes, whether or not a record exists', () => {
    expect(decideConsentSync(false, true)).toBe('create');
    expect(decideConsentSync(true, true)).toBe('create');
  });

  it('revokes when the report says no and a record exists (keep-or-change to no)', () => {
    expect(decideConsentSync(true, false)).toBe('revoke');
  });

  it('does nothing when the report says no and nothing is on file', () => {
    expect(decideConsentSync(false, false)).toBe('none');
  });
});
