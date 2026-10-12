// Voice-to-field dictation layer — consultation field schema, mapping prompt,
// structured-output JSON schema, and validation/normalization helpers.
//
// This module is schema-only: it performs no I/O, reads no secrets, and is
// safe to import from both server code (/api/consultation/dictate) and client
// code (DictationWidget).
//
// The field keys are the dotted paths of the consultation wizard state in
// dashboard/app/formulate/page.tsx (the `fd` object), which is the canonical
// consultation field shape. Values use the same conventions as the wizard:
// tones are single-letter codes (N, A, G, K, R, V, P, B, M, Ch, W, C).

// ─── Tone codes (wizard convention, see toneMap in app/formulate/page.tsx) ───

export type ToneLetter =
  | 'N' | 'A' | 'G' | 'K' | 'R' | 'V'
  | 'P' | 'B' | 'M' | 'Ch' | 'W' | 'C';

export const TONE_LETTERS: Record<ToneLetter, string> = {
  N: 'Natural', A: 'Ash', G: 'Gold', K: 'Copper', R: 'Red', V: 'Violet',
  P: 'Pearl', B: 'Beige', M: 'Mahogany', Ch: 'Chocolate', W: 'Warm', C: 'Cool',
};

const TONE_LETTER_SET = new Set<string>(Object.keys(TONE_LETTERS));

// Spoken color words (and ToneFamily names from the formulation engine) to
// wizard letter codes. Everything is matched case-insensitively.
const TONE_WORD_MAP: Record<string, ToneLetter> = {
  natural: 'N', neutral: 'N',
  ash: 'A', ashy: 'A',
  gold: 'G', golden: 'G',
  copper: 'K', coppery: 'K',
  red: 'R', reddish: 'R', auburn: 'R',
  violet: 'V', purple: 'V', violetish: 'V',
  pearl: 'P', pearly: 'P',
  beige: 'B',
  mahogany: 'M',
  chocolate: 'Ch', brown: 'Ch', brunette: 'Ch',
  warm: 'W',
  cool: 'C',
};

export function normalizeToneWord(input: string): ToneLetter | null {
  const cleaned = input.trim().toLowerCase();
  if (TONE_LETTER_SET.has(cleaned.toUpperCase())) {
    return cleaned.toUpperCase() as ToneLetter;
  }
  return TONE_WORD_MAP[cleaned] ?? null;
}

// ─── Field schema ────────────────────────────────────────────────────────────

export type FieldKind =
  | 'level'      // integer 1-10
  | 'tone'       // ToneLetter
  | 'enum'       // one of enumValues
  | 'int'        // bounded integer
  | 'percent'    // integer 0-100
  | 'boolean'    // true/false
  | 'stringList' // array of enumValues
  | 'string';    // free text, normalized + length-capped

export interface EnumOption {
  value: string;
  label: string;
  aliases?: string[];
}

export interface FieldDef {
  /** Dotted path in the wizard `fd` state, e.g. 'condition.grayPercent'. */
  key: string;
  /** Human-readable label, used for confirmation chips. */
  label: string;
  kind: FieldKind;
  enumValues?: EnumOption[];
  min?: number;
  max?: number;
  maxLength?: number;
  /** Example utterances that map to this field (for the LLM prompt). */
  examples?: string[];
  /** Normalization guidance for the LLM prompt. */
  hint?: string;
}

const porosityValues: EnumOption[] = [
  { value: 'low', label: 'Low', aliases: ['low porosity', 'closed cuticle'] },
  { value: 'normal', label: 'Normal', aliases: ['normal porosity', 'average porosity'] },
  { value: 'high', label: 'High', aliases: ['high porosity', 'porous', 'very porous'] },
];

const conditionTypeValues: EnumOption[] = [
  { value: 'virgin', label: 'Virgin', aliases: ['virgin hair', 'never colored', 'never dyed', 'never treated'] },
  { value: 'bleached', label: 'Bleached/Lightened', aliases: ['bleached', 'lightened', 'lifted', 'blonded', 'pre-lightened'] },
  { value: 'gray_coverage', label: 'Gray Coverage', aliases: ['needs gray coverage', 'covering gray', 'gray blending'] },
  { value: 'oily_scalp', label: 'Oily Scalp', aliases: ['oily scalp', 'greasy roots'] },
  { value: 'previously_colored', label: 'Previously Colored', aliases: ['previously colored', 'colored before', 'already colored', 'dyed before', 'has color on it'] },
  { value: 'damaged', label: 'Damaged', aliases: ['damaged', 'over-processed', 'compromised'] },
  { value: 'dry_brittle', label: 'Dry/Brittle', aliases: ['dry', 'brittle', 'dry and brittle', 'lacks moisture'] },
  { value: 'highly_damaged', label: 'Highly Damaged', aliases: ['highly damaged', 'severely damaged', 'severely compromised'] },
];

export const FIELD_SCHEMA: FieldDef[] = [
  {
    key: 'currentLevel', label: 'Current level', kind: 'level',
    examples: ['current level 6', 'she is a natural 5', 'base is at 7'],
    hint: 'Only map when the speaker marks it as the CURRENT/starting/natural level. A bare number with no level context is unmatched.',
  },
  {
    key: 'currentTone', label: 'Current tone', kind: 'tone',
    examples: ['current tone is ash', 'natural base is warm'],
    hint: 'Current/starting tone only. Emit the single-letter code (A for ash, K for copper, etc).',
  },
  {
    key: 'targetLevel', label: 'Target level', kind: 'level',
    examples: ['target level 8', 'taking her to a 9', 'we want level 7'],
    hint: 'Only map when the speaker marks it as the GOAL/target/desired level.',
  },
  {
    key: 'targetTone', label: 'Target tone', kind: 'tone',
    examples: ['target copper', 'she wants ash', 'goal is a warm blonde'],
    hint: 'Goal/desired tone. Emit the single-letter code.',
  },
  {
    key: 'hairType', label: 'Hair type', kind: 'string', maxLength: 32,
    examples: ['oily hair type', 'normal'],
    hint: 'Free text, lowercase. Usually oily, normal, or dry.',
  },
  {
    key: 'texture', label: 'Texture', kind: 'enum',
    enumValues: [
      { value: 'fine', label: 'Fine', aliases: ['fine hair', 'thin strands'] },
      { value: 'medium', label: 'Medium', aliases: ['medium texture', 'average strands'] },
      { value: 'coarse', label: 'Coarse', aliases: ['coarse hair', 'thick strands', 'wiry'] },
    ],
    examples: ['fine texture', 'coarse strands'],
  },
  {
    key: 'hairPattern', label: 'Pattern', kind: 'enum',
    enumValues: [
      { value: 'straight', label: 'Straight', aliases: ['type 1', 'straight hair'] },
      { value: 'wavy', label: 'Wavy', aliases: ['type 2', 'wavy hair'] },
      { value: 'curly', label: 'Curly', aliases: ['type 3', 'curly hair', 'curls'] },
      { value: 'coily', label: 'Coily', aliases: ['type 4', 'coily hair', 'kinky'] },
    ],
    examples: ['type 3 curls', 'coily pattern'],
  },
  {
    key: 'density', label: 'Density', kind: 'enum',
    enumValues: [
      { value: 'thin', label: 'Thin', aliases: ['low density', 'sparse'] },
      { value: 'medium', label: 'Medium', aliases: ['medium density', 'average density'] },
      { value: 'thick', label: 'Thick', aliases: ['high density', 'very dense', 'lots of hair'] },
    ],
    examples: ['thick density', 'very dense'],
  },
  {
    key: 'serviceType', label: 'Service', kind: 'enum',
    enumValues: [
      { value: 'full_head', label: 'Full Head', aliases: ['full head', 'all over', 'all-over color', 'global color'] },
      { value: 'retouch', label: 'Retouch', aliases: ['retouch', 'root retouch', 'regrowth', 'new growth'] },
      { value: 'balayage', label: 'Balayage', aliases: ['balayage', 'hand painted', 'hand-painted'] },
      { value: 'foils', label: 'Foils', aliases: ['foils', 'foil highlights', 'highlights', 'lowlights'] },
      { value: 'corrective', label: 'Corrective', aliases: ['corrective', 'color correction', 'fix'] },
      { value: 'gloss_toner', label: 'Gloss/Toner', aliases: ['gloss', 'toner', 'tone refresh', 'glaze'] },
    ],
    examples: ['doing a full head', 'just a retouch'],
  },
  {
    key: 'chemicalHistory', label: 'Chemical history', kind: 'stringList',
    enumValues: [
      { value: 'box_dye', label: 'Box Dye', aliases: ['box dye', 'box color', 'home color', 'drugstore dye', 'at-home kit'] },
      { value: 'metallic_salts', label: 'Metallic Salts', aliases: ['metallic dye', 'metallic salts', 'mineral buildup'] },
      { value: 'henna', label: 'Henna', aliases: ['henna'] },
      { value: 'keratin', label: 'Keratin Treatment', aliases: ['keratin', 'brazilian blowout', 'smoothing treatment'] },
      { value: 'relaxer', label: 'Relaxer', aliases: ['relaxer', 'japanese straightening', 'chemical straightening', 'perm'] },
      { value: 'hard_water', label: 'Hard Water', aliases: ['hard water', 'well water'] },
      { value: 'medication', label: 'Medication/Mineral Buildup', aliases: ['medication', 'thyroid meds', 'mineral buildup'] },
    ],
    examples: ['box dye last year', 'she did henna', 'keratin three months ago'],
  },
  {
    key: 'sensitivities', label: 'Sensitivities', kind: 'stringList',
    enumValues: [
      { value: 'ppd_allergy', label: 'PPD Allergy', aliases: ['ppd allergy', 'allergic to ppd', 'ppd'] },
      { value: 'pregnancy', label: 'Pregnancy', aliases: ['pregnant', 'pregnancy'] },
      { value: 'breastfeeding', label: 'Breastfeeding', aliases: ['breastfeeding', 'nursing'] },
      { value: 'chemotherapy', label: 'Active Chemotherapy', aliases: ['chemo', 'chemotherapy', 'on chemo'] },
    ],
    examples: ['client is pregnant', 'ppd allergy'],
  },
  {
    key: 'lastChemicalService', label: 'Last chemical service', kind: 'enum',
    enumValues: [
      { value: 'never', label: 'Never', aliases: ['never'] },
      { value: '6_plus_months', label: '6+ months ago', aliases: ['six months ago', 'over six months ago', 'more than six months ago', 'last year', 'a year ago'] },
      { value: '3_to_6_months', label: '3-6 months ago', aliases: ['three to six months ago', 'a few months ago', 'four months ago', 'five months ago'] },
      { value: '1_to_3_months', label: '1-3 months ago', aliases: ['a month ago', 'two months ago', 'three months ago', 'last month'] },
      { value: '3_to_4_weeks', label: '3-4 weeks ago', aliases: ['three weeks ago', 'four weeks ago'] },
      { value: '1_to_2_weeks', label: '1-2 weeks ago', aliases: ['last week', 'two weeks ago', 'a week ago'] },
      { value: 'this_week', label: 'This week', aliases: ['this week', 'yesterday', 'today', 'a few days ago'] },
    ],
    examples: ['last colored three months ago', 'colored last year'],
    hint: 'Map from phrases like "last colored X ago". When a phrase could match two buckets, pick the closest.',
  },
  {
    key: 'condition.type', label: 'Hair condition', kind: 'enum', enumValues: conditionTypeValues,
    examples: ['virgin hair', 'previously colored', 'damaged ends'],
  },
  {
    key: 'condition.porosity', label: 'Porosity', kind: 'enum', enumValues: porosityValues,
    examples: ['high porosity', 'porous ends'],
  },
  {
    key: 'condition.grayPercent', label: 'Gray', kind: 'percent',
    examples: ['40 percent gray', 'half gray', 'no gray', 'about 25 percent white'],
    hint: 'Numeric only. "no gray" -> 0, "half gray" -> 50, "mostly gray" -> 80, "a little/some gray" -> 10, "a lot of gray" -> 75. Vague quantifiers beyond these conventions are unmatched.',
  },
  {
    key: 'condition.highlights', label: 'Highlights', kind: 'boolean',
    examples: ['has highlights', 'no highlights'],
  },
  {
    key: 'condition.highlightedPercent', label: 'Highlighted %', kind: 'int', min: 0, max: 100,
    examples: ['about 30 percent highlighted'],
  },
  {
    key: 'condition.banding', label: 'Banding', kind: 'boolean',
    examples: ['banding at the mids', 'visible bands'],
  },
  {
    key: 'condition.hotRoots', label: 'Hot roots', kind: 'boolean',
    examples: ['hot roots'],
  },
  {
    key: 'condition.previousLightener', label: 'Previous lightener', kind: 'boolean',
    examples: ['bleach in the hair', 'previous lightener'],
  },
  {
    key: 'condition.multipleColors', label: 'Multiple colors', kind: 'boolean',
    examples: ['different colors on different sections'],
  },
  {
    key: 'condition.greenCast', label: 'Green cast', kind: 'boolean',
    examples: ['green cast', 'greenish tone'],
  },
  {
    key: 'condition.muddyToner', label: 'Muddy toner', kind: 'boolean',
    examples: ['muddy toner'],
  },
  {
    key: 'condition.overAshy', label: 'Over-ashy', kind: 'boolean',
    examples: ['too ashy', 'over ashy', 'went too cool'],
  },
  {
    key: 'condition.colorGrab', label: 'Color grab', kind: 'boolean',
    examples: ['ends grabbing color', 'color grab'],
  },
  {
    key: 'condition.hollowEnds', label: 'Hollow ends', kind: 'boolean',
    examples: ['hollow ends', 'see-through ends'],
  },
  {
    key: 'brandPreference', label: 'Brand', kind: 'string', maxLength: 64,
    examples: ['using redken', 'wella please'],
    hint: 'Brand display name as spoken (e.g. "Redken"). Free text.',
  },
  {
    key: 'linePreference', label: 'Line', kind: 'string', maxLength: 64,
    examples: ['shades eq', 'koleston'],
    hint: 'Product line as spoken. Free text.',
  },
];

export const FIELD_KEYS = FIELD_SCHEMA.map((f) => f.key);
export const FIELD_LABELS: Record<string, string> = Object.fromEntries(
  FIELD_SCHEMA.map((f) => [f.key, f.label])
);

export function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

// ─── Validation & normalization (server-side guard for LLM output) ──────────

export interface RejectedUpdate {
  key: string;
  reason: string;
}

function normalizeEnumValue(def: FieldDef, raw: unknown): string | null {
  if (typeof raw !== 'string' || !def.enumValues) return null;
  const cleaned = raw.trim().toLowerCase();
  for (const opt of def.enumValues) {
    if (opt.value.toLowerCase() === cleaned) return opt.value;
    if (opt.label.toLowerCase() === cleaned) return opt.value;
    if (opt.aliases?.some((a) => a.toLowerCase() === cleaned)) return opt.value;
  }
  return null;
}

function normalizeBoolean(raw: unknown): boolean | null {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw !== 0;
  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase();
    if (['true', 'yes', 'y', '1'].includes(s)) return true;
    if (['false', 'no', 'n', '0', 'none'].includes(s)) return false;
  }
  return null;
}

/**
 * Validate + normalize a raw updates object (dotted keys -> values).
 * Returns the normalized updates plus a list of rejected keys with reasons.
 * Unknown keys are rejected; known keys with unusable values are rejected.
 */
export function validateAndNormalizeUpdates(
  updates: Record<string, unknown>
): { normalized: Record<string, unknown>; rejected: RejectedUpdate[] } {
  const normalized: Record<string, unknown> = {};
  const rejected: RejectedUpdate[] = [];

  for (const [key, raw] of Object.entries(updates ?? {})) {
    const def = FIELD_SCHEMA.find((f) => f.key === key);
    if (!def) {
      rejected.push({ key, reason: 'unknown field' });
      continue;
    }

    switch (def.kind) {
      case 'level': {
        const n = typeof raw === 'string' ? Number(raw) : raw;
        if (typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 10) {
          normalized[key] = n;
        } else {
          rejected.push({ key, reason: 'level must be an integer from 1 to 10' });
        }
        break;
      }
      case 'tone': {
        if (typeof raw !== 'string') {
          rejected.push({ key, reason: 'tone must be a letter code or color word' });
          break;
        }
        const letter = normalizeToneWord(raw);
        if (letter) normalized[key] = letter;
        else rejected.push({ key, reason: `unrecognized tone "${raw}"` });
        break;
      }
      case 'enum': {
        const value = normalizeEnumValue(def, raw);
        if (value) normalized[key] = value;
        else rejected.push({ key, reason: `not a recognized ${def.label.toLowerCase()} value` });
        break;
      }
      case 'int': {
        const n = typeof raw === 'string' ? Number(raw) : raw;
        const min = def.min ?? Number.MIN_SAFE_INTEGER;
        const max = def.max ?? Number.MAX_SAFE_INTEGER;
        if (typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max) {
          normalized[key] = Math.round(n);
        } else {
          rejected.push({ key, reason: `must be a number between ${min} and ${max}` });
        }
        break;
      }
      case 'percent': {
        const n = typeof raw === 'string' ? Number(raw) : raw;
        if (typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100) {
          normalized[key] = Math.round(n);
        } else {
          rejected.push({ key, reason: 'percent must be a number from 0 to 100' });
        }
        break;
      }
      case 'boolean': {
        const b = normalizeBoolean(raw);
        if (b !== null) normalized[key] = b;
        else rejected.push({ key, reason: 'must be true/false' });
        break;
      }
      case 'stringList': {
        const arr = Array.isArray(raw) ? raw : [raw];
        const kept: string[] = [];
        for (const item of arr) {
          const value = normalizeEnumValue(def, item);
          if (value) {
            if (!kept.includes(value)) kept.push(value);
          } else {
            rejected.push({ key, reason: `unrecognized ${def.label.toLowerCase()} item "${String(item)}"` });
          }
        }
        if (kept.length > 0) normalized[key] = kept;
        break;
      }
      case 'string': {
        if (typeof raw !== 'string' || raw.trim() === '') {
          rejected.push({ key, reason: 'empty value' });
          break;
        }
        const capped = raw.trim().slice(0, def.maxLength ?? 64);
        normalized[key] = def.key === 'hairType' ? capped.toLowerCase() : capped;
        break;
      }
    }
  }

  return { normalized, rejected };
}

// ─── Human-readable rendering for confirmation chips ─────────────────────────

export function describeUpdate(key: string, value: unknown): string {
  const def = FIELD_SCHEMA.find((f) => f.key === key);
  const label = fieldLabel(key);
  if (!def) return `${label}: ${String(value)}`;

  switch (def.kind) {
    case 'tone': {
      const letter = typeof value === 'string' ? value.toUpperCase() : '';
      const name = TONE_LETTERS[letter as ToneLetter];
      return name ? `${label}: ${name} (${letter})` : `${label}: ${String(value)}`;
    }
    case 'percent':
      return `${label}: ${value}%`;
    case 'level':
      return `${label}: ${value}`;
    case 'boolean':
      return `${label}: ${value === true ? 'Yes' : 'No'}`;
    case 'enum': {
      const opt = def.enumValues?.find((o) => o.value === value);
      return `${label}: ${opt?.label ?? String(value)}`;
    }
    case 'stringList': {
      const items = Array.isArray(value) ? value : [value];
      const labels = items.map((v) => def.enumValues?.find((o) => o.value === v)?.label ?? String(v));
      return `${label}: ${labels.join(', ')}`;
    }
    default:
      return `${label}: ${String(value)}`;
  }
}

// ─── LLM prompt + structured-output schema ───────────────────────────────────

function buildFieldSummary(): string {
  return FIELD_SCHEMA.map((def) => {
    const parts = [`- ${def.key} (${def.label}, ${def.kind})`];
    if (def.kind === 'tone') {
      parts.push(`  codes: ${Object.entries(TONE_LETTERS).map(([c, n]) => `${c}=${n}`).join(', ')}`);
    }
    if (def.kind === 'enum' || def.kind === 'stringList') {
      const values = (def.enumValues ?? []).map((o) =>
        o.aliases && o.aliases.length > 0 ? `${o.value} (say: ${o.aliases.slice(0, 3).join(' / ')})` : o.value
      );
      parts.push(`  values: ${values.join(' | ')}`);
    }
    if (def.kind === 'level') parts.push('  range: 1-10');
    if (def.kind === 'int') parts.push(`  range: ${def.min ?? '-'}-${def.max ?? '-'}`);
    if (def.hint) parts.push(`  note: ${def.hint}`);
    if (def.examples?.length) parts.push(`  e.g. "${def.examples.join('", "')}"`);
    return parts.join('\n');
  }).join('\n');
}

export const DICTATION_SYSTEM_PROMPT = `You are a hair-color consultation field mapper for the COLORiq pro salon app.
A stylist dictates consultation notes by voice; a browser speech-to-text engine produced the transcript below.
Map each concrete, explicit statement to the matching consultation field. Output JSON only.

RULES:
- Keys in "updates" MUST be one of the field keys listed below. NEVER invent a key.
- Only include fields the transcript EXPLICITLY mentions. Do not echo back the current field values, do not fill in defaults, do not guess.
- Normalize spoken variants into the exact allowed values ("forty percent gray" -> 40, "ash" -> "A", "half gray" -> 50).
- A bare number with no level context is ambiguous -> put it in "unmatched", not in updates.
- Ranges ("between 6 and 7", "6 to 7") are ambiguous -> unmatched.
- If two fields could plausibly match one fragment, put the fragment in "unmatched" instead of guessing.
- "unmatched" holds short verbatim transcript fragments that mention hair/color but map to no field, or that you could not confidently map. Small talk ("hey", "okay", "thanks") is ignored entirely — never in unmatched.
- Tones use the single-letter codes. Distinguish CURRENT (starting/natural/base) from TARGET (goal/desired/wants) carefully: "current level 6, target copper 7" -> currentLevel 6, targetLevel 7, targetTone "K".
- chemicalHistory / sensitivities are arrays of the listed values; a transcript may yield several items.
- lastChemicalService: map phrases like "last colored three months ago" to the nearest bucket.
- brandPreference / linePreference are free text as spoken ("Redken", "Shades EQ").

FIELDS:
${buildFieldSummary()}

Output JSON shape: { "updates": { <field key>: <value> }, "unmatched": [<verbatim fragments>] }.
"updates" may be empty if nothing maps. "unmatched" may be empty if everything mapped.`;

/**
 * JSON Schema for OpenAI response_format (json_schema). Kept non-strict so
 * "updates" can be a free-form object keyed by field keys; the server
 * validates every key/value against FIELD_SCHEMA anyway.
 */
export const DICTATION_JSON_SCHEMA = {
  name: 'consultation_field_updates',
  strict: false,
  schema: {
    type: 'object',
    properties: {
      updates: {
        type: 'object',
        description:
          'Field updates keyed by field key (e.g. currentLevel, targetTone, condition.grayPercent). Values must be the exact typed/allowed values from the field list.',
        additionalProperties: { type: ['string', 'number', 'boolean', 'array'] },
      },
      unmatched: {
        type: 'array',
        description:
          'Short verbatim transcript fragments that mention hair/color but could not be confidently mapped to any field.',
        items: { type: 'string' },
      },
    },
    required: ['updates', 'unmatched'],
    additionalProperties: false,
  },
} as const;

// ─── Typed API contract (shared by the route and the widget) ────────────────

export interface DictationRequest {
  transcript: string;
  currentFields?: Record<string, unknown>;
}

export interface DictationResponse {
  updates: Record<string, unknown>;
  unmatched: string[];
  billing: { billedCents: number; billedMinutes: number };
}
