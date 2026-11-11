/**
 * Pure decision for the consent bridge (see consent-bridge.ts): what does
 * one confirmed report's boolean do to the consent state on file?
 *
 * Kept in its own module with no `@/` imports so the root jest config
 * (which has no path-alias mapping) can load it. The DB execution lives
 * in consent-bridge.ts; the route wires the two together.
 */
export type ConsentSyncAction = 'create' | 'revoke' | 'none';

/**
 * Yes always creates (the executor revokes any prior record first, so the
 * latest confirmed report is the effective consent). No revokes a prior
 * yes, and does nothing when nothing is on file.
 */
export function decideConsentSync(
  hasCurrentRecord: boolean,
  reportValue: boolean,
): ConsentSyncAction {
  if (reportValue) return 'create';
  return hasCurrentRecord ? 'revoke' : 'none';
}
