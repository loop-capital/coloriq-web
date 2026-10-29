/**
 * PINNED CLIENT-REPORT CONTRACT — Phase 1 item 7 (pre-appointment doors).
 *
 * Single shared field definition imported by the client-report endpoint, the
 * review/confirm endpoints, and the form + guest-chat pages. Nothing else in
 * item 7 defines consultation fields; if a field is not in PINNED_CONTRACT,
 * it cannot be submitted, reviewed, or merged.
 *
 * -- 28-vs-26 RECONCILIATION (part d) --
 * The Oct 25 design note asserts a "26-field consultation contract" but never
 * enumerates it — the note itself says "the exact 26 keys are not yet in hand"
 * and that the mapping "must be pinned from the POST /api/consultation/dictate
 * schema before this payload ships". Enumeration of that schema
 * (dashboard/lib/consultation/field-mapping.ts, FIELD_SCHEMA) yields 28 keys:
 * 12 top-level keys + 14 condition.* keys + 2 preference keys (brandPreference,
 * linePreference). Reconciliation outcome:
 *   - DROPPED: none. All 28 dictate keys are accounted for below.
 *   - MERGED: none. Dotted keys (condition.*) are kept as-is so the contract
 *     stays compatible with the dictate tool and the wizard fd state.
 *   - ADDED: 8 client-only keys (source 'client-added'). Each traces to a
 *     design group that has no dictate key: the dictate schema captures
 *     structured observations, not the client's own words, stated needs,
 *     avoidances, inspiration descriptions, timing constraints, subjective
 *     condition, or verbatim allergy detail.
 *   - The "26" figure is RETIRED, not silently adjusted: no enumerated 26-key
 *     list exists anywhere to reconcile against. Plausible reading (NOT a
 *     verified mapping, flagged as an inference): 26 = 28 minus the 2
 *     preference keys, which are product preferences rather than consultation
 *     observations. OPEN QUESTION: if the design's 26 excluded a different
 *     pair, that pair is unrecoverable from evidence — the enumeration below
 *     supersedes the count, and any future claim about "26 fields" must cite
 *     this file, not the design note.
 *   - Total pinned keys: 36 (28 dictate + 8 client-added). Client-reportable:
 *     21 (13 dictate + 8 added). Photo/stylist-observed: 15.
 *
 * -- TRUST CLASSES --
 * reportableBy 'client': the client can truthfully self-report this before
 *   the appointment. These are the ONLY keys the client-report endpoint
 *   accepts; anything else in a client payload is a 422 refusal, never a
 *   silent drop (fail-closed; this intentionally differs from the design
 *   note's drop-and-log proposal, which would hide invalid submissions).
 * reportableBy 'photo': observed values that come ONLY from the chair photo
 *   (design exclusion). A client payload containing one is refused.
 * reportableBy 'stylist': values the stylist supplies at review/confirm.
 *   (No dictate key is classified 'stylist' today; the class exists so the
 *   merge validator can distinguish merge-time keys from client keys.)
 * Client-reported data is NEVER auto-merged: it lands PENDING and becomes
 * part of a consultation record only when the stylist confirms it. Conflicts
 * are surfaced, never silently resolved — the confirm endpoint refuses to
 * confirm while a conflict key is unresolved.
 * Allergies are recorded, never interpreted: sensitivities enum values are
 * canonicalized to the dictate enum (a spelling normalization, not a medical
 * judgment) and allergyDetails free text is stored trimmed-only, never
 * rewritten, mapped, or inferred from.
 *
 * -- CONSENT SHAPE (values only, no wording) --
 * Consent rides ALONGSIDE the contract, not inside it: service_consent (a)
 * and featuring_consent (b) are separate boolean fields on the report.
 * (b) defaults to false when omitted, is never bundled into (a), is never a
 * condition of service, and never extends to sponsors or third parties.
 * These doors capture VALUES only. No consent wording text is written,
 * cleared, or shipped here: UI labels on the form/chat pages are functional
 * prompts marked provisional, and the exact (b) wording remains Gideon-gated
 * (item 4's payload gate) and must replace those labels before any payload
 * ships under a cleared wording.
 *
 * -- APPOINTMENTS WITHOUT A BOOKINGS SYSTEM --
 * COLORiq owns no bookings, so there is no appointments table on main. Item 7
 * introduces a MINIMAL appointment record (consultation_appointments) created
 * by the stylist (client + scheduled time + stylist + salon) purely as the
 * scoping anchor for tokens and reports. It is NOT a bookings system: no
 * calendar sync, no booking flow, no availability logic. OPEN QUESTION (needs
 * Jason's call): the appointment TRIGGER — how appointments come to exist
 * (manual stylist creation vs a future booking integration). Until he rules,
 * manual stylist creation is the only trigger, and it is documented as such
 * wherever appointments are created.
 */

import {
  FIELD_SCHEMA,
  TONE_LETTERS,
  validateAndNormalizeUpdates,
  type FieldDef,
} from './field-mapping';

export type ReportChannel = 'form' | 'guest-chat' | 'client-muse';
export const REPORT_CHANNELS: ReportChannel[] = ['form', 'guest-chat', 'client-muse'];

export type ReportableBy = 'client' | 'stylist' | 'photo';

export type ContractGroup =
  | 'history'
  | 'sensitivities'
  | 'target'
  | 'grey'
  | 'condition-subjective'
  | 'timing'
  | 'avoids'
  | 'inspiration'
  | 'service'
  | 'hair'
  | 'preferences'
  | 'observed';

export type ContractSource = 'dictate' | 'client-added';

export interface PinnedFieldDef {
  key: string;
  label: string;
  kind: FieldDef['kind'];
  enumValues?: { value: string; label: string }[];
  min?: number;
  max?: number;
  maxLength?: number;
  reportableBy: ReportableBy;
  group: ContractGroup;
  source: ContractSource;
  note?: string;
}

/** Classification of every dictate key. 13 client-reportable, 15 observed. */
const DICTATE_CLASS: Record<string, { reportableBy: ReportableBy; group: ContractGroup; note?: string }> = {
  currentLevel: { reportableBy: 'photo', group: 'observed', note: 'Observed level comes only from the chair photo (design exclusion).' },
  currentTone: { reportableBy: 'photo', group: 'observed', note: 'Observed tone comes only from the chair photo (design exclusion).' },
  targetLevel: { reportableBy: 'client', group: 'target' },
  targetTone: { reportableBy: 'client', group: 'target' },
  hairType: { reportableBy: 'client', group: 'hair' },
  texture: { reportableBy: 'client', group: 'hair' },
  hairPattern: { reportableBy: 'client', group: 'hair' },
  density: { reportableBy: 'client', group: 'hair' },
  serviceType: { reportableBy: 'client', group: 'service' },
  chemicalHistory: { reportableBy: 'client', group: 'history' },
  sensitivities: { reportableBy: 'client', group: 'sensitivities', note: 'Enum values only; verbatim detail rides allergyDetails. Never interpreted.' },
  lastChemicalService: { reportableBy: 'client', group: 'history' },
  'condition.type': { reportableBy: 'photo', group: 'observed', note: 'History-flavored values (virgin / previously colored / bleached) are covered for the client by chemicalHistory, lastChemicalService, and condition.previousLightener; the condition.type value itself stays observed-only.' },
  'condition.porosity': { reportableBy: 'photo', group: 'observed', note: 'Porosity evidence comes only from the chair photo (design exclusion).' },
  'condition.grayPercent': { reportableBy: 'photo', group: 'observed', note: 'Observed grey percent only. The client states a coverage NEED via greyCoverageNeed, never a percentage.' },
  'condition.highlights': { reportableBy: 'photo', group: 'observed' },
  'condition.highlightedPercent': { reportableBy: 'photo', group: 'observed' },
  'condition.banding': { reportableBy: 'photo', group: 'observed' },
  'condition.hotRoots': { reportableBy: 'photo', group: 'observed' },
  'condition.previousLightener': { reportableBy: 'client', group: 'history', note: 'Lightener use is history the client knows (design group 2).' },
  'condition.multipleColors': { reportableBy: 'photo', group: 'observed' },
  'condition.greenCast': { reportableBy: 'photo', group: 'observed' },
  'condition.muddyToner': { reportableBy: 'photo', group: 'observed' },
  'condition.overAshy': { reportableBy: 'photo', group: 'observed' },
  'condition.colorGrab': { reportableBy: 'photo', group: 'observed' },
  'condition.hollowEnds': { reportableBy: 'photo', group: 'observed' },
  brandPreference: { reportableBy: 'client', group: 'preferences' },
  linePreference: { reportableBy: 'client', group: 'preferences' },
};

/** 8 client-only keys for design groups with no dictate key. */
const CLIENT_ADDED_FIELDS: PinnedFieldDef[] = [
  {
    key: 'targetDescription', label: 'Target in your own words', kind: 'string', maxLength: 500,
    reportableBy: 'client', group: 'target', source: 'client-added',
    note: 'Design group 4 requires the target in the client\'s own words; dictate has only structured targetLevel/targetTone.',
  },
  {
    key: 'greyCoverageNeed', label: 'Grey coverage need', kind: 'enum',
    enumValues: [
      { value: 'full', label: 'Cover all grey' },
      { value: 'blend', label: 'Blend grey' },
      { value: 'none', label: 'No grey coverage needed' },
      { value: 'unknown', label: 'Not sure yet' },
    ],
    reportableBy: 'client', group: 'grey', source: 'client-added',
    note: 'Stated coverage NEED (design group 5), never an observed percentage.',
  },
  {
    key: 'conditionNotes', label: 'How your hair feels', kind: 'string', maxLength: 500,
    reportableBy: 'client', group: 'condition-subjective', source: 'client-added',
    note: 'Subjective condition as the client experiences it: dryness, breakage, scalp comfort (design group 6).',
  },
  {
    key: 'timingConstraints', label: 'Timing constraints', kind: 'string', maxLength: 500,
    reportableBy: 'client', group: 'timing', source: 'client-added',
    note: 'Design group 7.',
  },
  {
    key: 'wantsAvoid', label: 'What you do NOT want', kind: 'string', maxLength: 500,
    reportableBy: 'client', group: 'avoids', source: 'client-added',
    note: 'Design group 8.',
  },
  {
    key: 'inspirationNotes', label: 'Looks you like', kind: 'string', maxLength: 500,
    reportableBy: 'client', group: 'inspiration', source: 'client-added',
    note: 'Descriptions only. Images are reference-only and are not collected by these doors (design group 9).',
  },
  {
    key: 'allergyDetails', label: 'Allergy / reaction details', kind: 'string', maxLength: 1000,
    reportableBy: 'client', group: 'sensitivities', source: 'client-added',
    note: 'Verbatim allergy/reaction text, recorded exactly as stated, never interpreted (design group 3).',
  },
  {
    key: 'patchTestHistory', label: 'Patch-test history', kind: 'string', maxLength: 500,
    reportableBy: 'client', group: 'sensitivities', source: 'client-added',
    note: 'Patch-test history as stated (design group 3).',
  },
];

export const PINNED_CONTRACT: PinnedFieldDef[] = [
  ...FIELD_SCHEMA.map((def) => {
    const c = DICTATE_CLASS[def.key];
    return {
      key: def.key,
      label: def.label,
      kind: def.kind,
      enumValues: def.enumValues?.map((o) => ({ value: o.value, label: o.label })),
      min: def.min,
      max: def.max,
      maxLength: def.maxLength,
      reportableBy: c.reportableBy,
      group: c.group,
      source: 'dictate' as ContractSource,
      note: c.note,
    };
  }),
  ...CLIENT_ADDED_FIELDS,
];

export const PINNED_MAP: Map<string, PinnedFieldDef> = new Map(
  PINNED_CONTRACT.map((d) => [d.key, d]),
);

/** Design-group order used by the guest-chat walk and the form sections. */
export const GROUP_ORDER: ContractGroup[] = [
  'history',
  'sensitivities',
  'target',
  'grey',
  'condition-subjective',
  'timing',
  'avoids',
  'inspiration',
  'service',
  'hair',
  'preferences',
  'observed',
];

/** Client-reportable fields, in guest-chat walk order (stable within group). */
export const CLIENT_REPORTABLE_FIELDS: PinnedFieldDef[] = PINNED_CONTRACT.filter(
  (d) => d.reportableBy === 'client',
).sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));

/** Tone letter options for form/chat selects (from the dictate tone map). */
export const TONE_OPTIONS: { value: string; label: string }[] = Object.entries(TONE_LETTERS).map(
  ([value, label]) => ({ value, label }),
);

export type FieldValidation =
  | { ok: true; normalized: Record<string, unknown> }
  | { ok: false; errors: string[] };

function validateAddedValue(def: PinnedFieldDef, raw: unknown): { value?: unknown; error?: string } {
  if (def.kind === 'enum') {
    if (typeof raw !== 'string') return { error: `must be one of: ${(def.enumValues ?? []).map((o) => o.value).join(', ')}` };
    const hit = (def.enumValues ?? []).find((o) => o.value === raw);
    if (!hit) return { error: `not a recognized ${def.label.toLowerCase()} value` };
    return { value: raw };
  }
  // Added string keys: non-empty after trim, length-capped. Trim only — no
  // content change, so verbatim fields (allergyDetails) stay verbatim.
  if (typeof raw !== 'string' || raw.trim() === '') return { error: 'must not be empty' };
  const capped = raw.trim().slice(0, def.maxLength ?? 500);
  return { value: capped };
}

function validateValues(
  entries: [string, unknown][],
  allowed: (def: PinnedFieldDef) => boolean,
  notAllowedReason: (def: PinnedFieldDef) => string,
): FieldValidation {
  const errors: string[] = [];
  const dictateSubset: Record<string, unknown> = {};
  const addedSubset: [PinnedFieldDef, unknown][] = [];
  const normalized: Record<string, unknown> = {};

  for (const [key, raw] of entries) {
    const def = PINNED_MAP.get(key);
    if (!def) {
      errors.push(`unknown field: ${key}`);
      continue;
    }
    if (!allowed(def)) {
      errors.push(notAllowedReason(def));
      continue;
    }
    if (def.source === 'dictate') {
      // An explicit empty list means "none reported" (differs from omitted =
      // unknown, which matters for conflict detection). The dictate validator
      // drops empty lists silently, so handle them here.
      if (def.kind === 'stringList' && Array.isArray(raw) && raw.length === 0) {
        normalized[key] = [];
      } else {
        dictateSubset[key] = raw;
      }
    } else {
      addedSubset.push([def, raw]);
    }
  }

  const { normalized: dictNormalized, rejected } = validateAndNormalizeUpdates(dictateSubset);
  for (const r of rejected) errors.push(`${r.key}: ${r.reason}`);
  Object.assign(normalized, dictNormalized);

  for (const [def, raw] of addedSubset) {
    const res = validateAddedValue(def, raw);
    if (res.error) errors.push(`${def.key}: ${res.error}`);
    else normalized[def.key] = res.value;
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, normalized };
}

/**
 * Validate a CLIENT payload. Fail-closed: unknown keys, photo/stylist-only
 * keys, and unusable values are all refusals (422 with the list), never
 * partial acceptance and never silent drops.
 */
export function validateClientReportFields(fields: unknown): FieldValidation {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    return { ok: false, errors: ['fields must be an object'] };
  }
  return validateValues(
    Object.entries(fields as Record<string, unknown>),
    (def) => def.reportableBy === 'client',
    (def) =>
      def.reportableBy === 'photo'
        ? `field not client-reportable: ${def.key} (photo-observed value; comes only from the chair photo)`
        : `field not client-reportable: ${def.key}`,
  );
}

/**
 * Validate a STYLIST merge payload (confirm). The stylist may resolve any
 * pinned key — client values, observed values, or both — but unknown keys
 * and unusable values are still refusals.
 */
export function validateMergeFields(fields: unknown): FieldValidation {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    return { ok: false, errors: ['resolvedFields must be an object'] };
  }
  return validateValues(
    Object.entries(fields as Record<string, unknown>),
    () => true,
    (def) => `unknown field: ${def.key}`,
  );
}

export interface ConsentValues {
  serviceConsent: boolean;
  featuringConsent: boolean;
}

export type ConsentValidation =
  | { ok: true; values: ConsentValues }
  | { ok: false; errors: string[] };

/**
 * Validate the split consent shape. service_consent (a) must be an explicit
 * boolean answer; featuring_consent (b) defaults to false when omitted and
 * is never bundled into (a). Values only — no wording is validated here.
 */
export function validateConsents(input: unknown): ConsentValidation {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: ['consents must be an object'] };
  }
  const rec = input as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof rec.service_consent !== 'boolean') {
    errors.push('service_consent must be an explicit true/false answer');
  }
  let featuring = false;
  if (rec.featuring_consent !== undefined) {
    if (typeof rec.featuring_consent !== 'boolean') {
      errors.push('featuring_consent must be true/false when provided');
    } else {
      featuring = rec.featuring_consent;
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, values: { serviceConsent: rec.service_consent as boolean, featuringConsent: featuring } };
}

export interface FieldConflict {
  key: string;
  clientValue: unknown;
  currentValue: unknown;
}

/**
 * Conflicts: keys present on BOTH sides with different values. Absent on
 * either side is new information, not a conflict.
 */
export function detectConflicts(
  clientFields: Record<string, unknown>,
  currentFields: Record<string, unknown>,
): FieldConflict[] {
  const conflicts: FieldConflict[] = [];
  for (const [key, clientValue] of Object.entries(clientFields ?? {})) {
    if (!Object.prototype.hasOwnProperty.call(currentFields ?? {}, key)) continue;
    const currentValue = (currentFields as Record<string, unknown>)[key];
    if (JSON.stringify(clientValue) !== JSON.stringify(currentValue)) {
      conflicts.push({ key, clientValue, currentValue });
    }
  }
  return conflicts;
}

/** Merge: resolved values win; untouched current values are preserved. */
export function applyMerge(
  currentFields: Record<string, unknown>,
  resolvedFields: Record<string, unknown>,
): Record<string, unknown> {
  return { ...(currentFields ?? {}), ...(resolvedFields ?? {}) };
}
