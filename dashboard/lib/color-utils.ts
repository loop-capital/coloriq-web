// Color utility functions for ColorIq
// Extracted from formulate-content.tsx + ADR-013 Visual Outcome Simulator algorithms

import { ToneFamily, HAIR_LEVELS } from './products';
import type { FormulationInput, FormulationResult } from './formulation';

/**
 * Blend a level base color with a tone color.
 * @param levelHex - Base level color hex
 * @param toneHex - Tone color hex
 * @param toneWeight - 0-1, how much tone influence (higher = more tone)
 */
export function blendColor(levelHex: string, toneHex: string, toneWeight = 0.35): string {
  const parse = (h: string) => {
    const v = parseInt(h.replace('#', ''), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  };
  const [lr, lg, lb] = parse(levelHex);
  const [tr, tg, tb] = parse(toneHex);
  const r = Math.round(lr + (tr - lr) * toneWeight);
  const g = Math.round(lg + (tg - lg) * toneWeight);
  const b = Math.round(lb + (tb - lb) * toneWeight);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// ─── Underlying Pigment Hex Map ───────────────────────────────────────────────

const PIGMENT_HEX_MAP: Record<string, string> = {
  'red': '#A03030',
  'red-orange': '#B85A30',
  'orange': '#D47830',
  'yellow-orange': '#C49040',
  'yellow': '#D4A35A',
  'pale yellow': '#E8C99B',
};

/**
 * Map an underlying pigment name to its hex color.
 */
export function getPigmentHex(exposed: string | undefined): string {
  return PIGMENT_HEX_MAP[exposed || ''] || '#D4A35A';
}

// ─── Tone Hex Map ───────────────────────────────────────────────────────────
// Map ToneFamily to a representative hex for visual blending

const TONE_HEX_MAP: Record<ToneFamily, string> = {
  warm: '#D4A574',
  cool: '#7D8B9A',
  neutral: '#9C8B7A',
  ash: '#8A7D6E',
  golden: '#C4A35A',
  copper: '#B87333',
  red: '#A03030',
  violet: '#7B68A6',
  pearl: '#B8B0C4',
  beige: '#C4B5A0',
  mahogany: '#6B3A3A',
  chocolate: '#4A2C2A',
};

/**
 * Get a representative hex color for a tone family.
 */
export function getToneHex(tone: ToneFamily): string {
  return TONE_HEX_MAP[tone] || TONE_HEX_MAP.neutral;
}

// ─── Warmth Exposure ─────────────────────────────────────────────────────────

export interface WarmthExposure {
  root: string;
  midshaft: string;
  ends: string;
}

/**
 * Compute the warmth progression across root → midshaft → ends.
 */
export function computeWarmthExposure(
  input: FormulationInput,
  result: FormulationResult
): WarmthExposure {
  const currentLevelHex = HAIR_LEVELS[input.currentLevel]?.hex || HAIR_LEVELS[5].hex;
  const targetLevelHex = HAIR_LEVELS[input.targetLevel]?.hex || HAIR_LEVELS[5].hex;
  const underlying = result.underlyingPigment;

  // Root zone: closer to current color + some warmth from natural pigment
  const rootWarmthWeight = input.condition.type === 'virgin' ? 0.15 : 0.30;
  const rootHex = blendColor(currentLevelHex, getPigmentHex(underlying?.exposed), rootWarmthWeight);

  // Midshaft: blend of current and target, influenced by previous color
  const midBlendWeight = input.condition.type === 'previously_colored' ? 0.55 : 0.40;
  const midHex = blendColor(currentLevelHex, targetLevelHex, midBlendWeight);

  // Ends: closest to target, but shifted by porosity
  let endsHex = targetLevelHex;
  if (input.condition.porosity === 'high') {
    endsHex = blendColor(targetLevelHex, getPigmentHex(underlying?.exposed), 0.20);
  } else if (input.condition.porosity === 'low') {
    endsHex = blendColor(targetLevelHex, getPigmentHex(underlying?.exposed), 0.05);
  }

  return { root: rootHex, midshaft: midHex, ends: endsHex };
}

// ─── Zone Risk ────────────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'moderate' | 'high';

export interface ZoneRisk {
  root: RiskLevel;
  midshaft: RiskLevel;
  ends: RiskLevel;
}

export interface ZoneNotes {
  root: string;
  midshaft: string;
  ends: string;
}

/**
 * Compute risk levels and notes for each zone.
 */
export function computeZoneRisk(
  input: FormulationInput,
  result: FormulationResult
): { risk: ZoneRisk; notes: ZoneNotes } {
  const risk: ZoneRisk = { root: 'low', midshaft: 'low', ends: 'low' };
  const notes: ZoneNotes = { root: '', midshaft: '', ends: '' };

  const levelsToLift = input.targetLevel - input.currentLevel;

  // Root zone risk
  if (input.condition.hotRoots) {
    risk.root = 'high';
    notes.root = 'Hot roots detected — root area may process faster and lighter';
  } else if (levelsToLift > 2 && input.condition.type === 'previously_colored') {
    risk.root = 'moderate';
    notes.root = 'Regrowth zone with 2+ level lift — monitor for warmth';
  } else if (input.condition.type === 'virgin') {
    risk.root = 'low';
    notes.root = 'Virgin root — predictable processing';
  }

  // Midshaft risk
  if (input.condition.banding) {
    risk.midshaft = 'high';
    notes.midshaft = 'Banding detected — midshaft may take color unevenly';
  } else if (input.condition.type === 'previously_colored') {
    risk.midshaft = 'moderate';
    notes.midshaft = 'Previous color present — may shift target tone';
  } else if (input.condition.multipleColors) {
    risk.midshaft = 'high';
    notes.midshaft = 'Multiple previous colors — unpredictable absorption';
  }

  // Ends risk
  if (input.condition.hollowEnds) {
    risk.ends = 'high';
    notes.ends = 'Hollow ends — may not hold target tone';
  } else if (input.condition.porosity === 'high') {
    risk.ends = 'moderate';
    notes.ends = 'High porosity ends — may process faster and fade quicker';
  } else if (input.condition.type === 'damaged' || input.condition.type === 'highly_damaged') {
    risk.ends = 'moderate';
    notes.ends = 'Damaged ends — monitor for over-processing';
  }

  return { risk, notes };
}

// ─── Fade Preview ────────────────────────────────────────────────────────────

export interface FadePreview {
  level: number;
  tone: ToneFamily;
  hex: string;
}

// Tone warmth shift map: each tone shifts one step toward warmth when fading
const FADE_TONE_SHIFT: Record<ToneFamily, ToneFamily> = {
  ash: 'neutral',
  cool: 'neutral',
  neutral: 'warm',
  pearl: 'warm',
  beige: 'warm',
  warm: 'golden',
  golden: 'copper',
  copper: 'red',
  red: 'warm',
  violet: 'neutral',
  mahogany: 'warm',
  chocolate: 'warm',
};

/**
 * Compute the expected faded result after 4–6 weeks.
 */
export function computeFadePreview(input: FormulationInput): FadePreview {
  // Level drops by 1 (darkens slightly as tone deposits fade)
  const fadeLevel = Math.max(1, input.targetLevel - 1);

  // Tone shifts one step warmer
  const fadeTone = FADE_TONE_SHIFT[input.targetTone] || input.targetTone;

  // Compute hex: blend faded level with faded tone
  const fadeHex = blendColor(
    HAIR_LEVELS[fadeLevel]?.hex || HAIR_LEVELS[1].hex,
    getToneHex(fadeTone),
    0.30  // lighter tone influence on faded result
  );

  return { level: fadeLevel, tone: fadeTone, hex: fadeHex };
}

// ─── Warmth Gradient ──────────────────────────────────────────────────────────

/**
 * Compute a 7-stop gradient hex array for the warmth exposure bar.
 */
export function computeWarmthGradientHex(
  input: FormulationInput,
  result: FormulationResult
): string[] {
  const exposure = computeWarmthExposure(input, result);
  const stops = 7;
  const gradient: string[] = [];

  for (let i = 0; i < stops; i++) {
    const t = i / (stops - 1);  // 0 to 1
    if (t <= 0.33) {
      // Root zone
      const zoneT = t / 0.33;
      gradient.push(blendColor(exposure.root, exposure.midshaft, zoneT));
    } else if (t <= 0.66) {
      // Midshaft zone
      const zoneT = (t - 0.33) / 0.33;
      gradient.push(blendColor(exposure.midshaft, exposure.ends, zoneT));
    } else {
      // Ends zone
      gradient.push(exposure.ends);  // Solid ends
    }
  }

  return gradient;
}

/**
 * Convert a gradient hex array to a CSS linear-gradient string.
 */
export function gradientToCss(gradientHexes: string[]): string {
  const stops = gradientHexes.map((hex, i) => {
    const pct = Math.round((i / (gradientHexes.length - 1)) * 100);
    return `${hex} ${pct}%`;
  });
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

// ─── Visual Outcome Aggregator ───────────────────────────────────────────────

export interface VisualOutcome {
  expectedResultHex: string;
  warmthExposure: WarmthExposure;
  zoneRisk: ZoneRisk;
  zoneNotes: ZoneNotes;
  fadePreview: FadePreview;
  warmthGradientHex: string[];
}

/**
 * Aggregate all visual outcome computations into one object.
 * Call this at the end of formulate() before returning the result.
 */
export function computeVisualOutcome(
  input: FormulationInput,
  result: FormulationResult
): VisualOutcome {
  const expectedResultHex = blendColor(
    HAIR_LEVELS[input.targetLevel]?.hex || HAIR_LEVELS[5].hex,
    getToneHex(input.targetTone),
    0.45
  );

  const warmthExposure = computeWarmthExposure(input, result);
  const { risk: zoneRisk, notes: zoneNotes } = computeZoneRisk(input, result);
  const fadePreview = computeFadePreview(input);
  const warmthGradientHex = computeWarmthGradientHex(input, result);

  return {
    expectedResultHex,
    warmthExposure,
    zoneRisk,
    zoneNotes,
    fadePreview,
    warmthGradientHex,
  };
}
