import { NextRequest, NextResponse } from 'next/server';
import { analyzeImageBuffer } from '@/lib/photo-analysis-server';
import { ALL_PRODUCTS } from '@/lib/products';

/**
 * POST /api/color-match
 * 
 * Accepts a multipart/form-data image upload, runs AI vision analysis,
 * maps the extracted color to the nearest COLORiq formula, and returns
 * a match result with confidence score.
 * 
 * Form fields:
 *   - image: File (JPEG/PNG/WebP, max 10MB)
 * 
 * Response:
 *   200: { success: true, extractedColor, matchedFormula, confidence, matchDetails }
 *   400: { error: string }
 *   413: { error: string }
 *   500: { error: string }
 */

export const runtime = 'nodejs';
export const maxDuration = 30;

interface MatchedFormula {
  id: string;
  brand: string;
  line: string;
  shadeCode: string;
  shadeName: string;
  level: number;
  tone: string;
  secondaryTone?: string;
  mixingRatio: string;
  developerRequired: string;
}

interface ColorMatchResult {
  success: boolean;
  extractedColor: {
    primaryHex: string;
    colorFamily: string;
    level: number;
    toneFamily: string;
    secondaryTone?: string;
  };
  matchedFormula: MatchedFormula | null;
  confidence: number; // 0-100
  matchDetails: {
    levelDistance: number;
    toneMatch: boolean;
    brand?: string;
    colorName: string;
  };
  prefillQuery?: string;
}

function getColorFamily(level: number): string {
  if (level <= 2) return 'Black';
  if (level <= 3) return 'Dark Brunette';
  if (level <= 5) return 'Brunette';
  if (level <= 6) return 'Dark Blonde';
  if (level <= 7) return 'Medium Blonde';
  if (level <= 8) return 'Light Blonde';
  if (level <= 9) return 'Very Light Blonde';
  return 'Platinum Blonde';
}

function getToneFamilyName(tone: string): string {
  const names: Record<string, string> = {
    warm: 'Warm',
    cool: 'Cool',
    neutral: 'Natural',
    ash: 'Ash',
    golden: 'Golden',
    copper: 'Copper',
    red: 'Red',
    violet: 'Violet',
    pearl: 'Pearl',
    beige: 'Beige',
    mahogany: 'Mahogany',
    chocolate: 'Chocolate',
  };
  return names[tone] || tone;
}

function findNearestFormula(
  level: number,
  tone: string,
  secondaryTone?: string,
  brandPreference?: string
): { formula: MatchedFormula | null; confidence: number; details: ColorMatchResult['matchDetails'] } {
  // Filter by level ±1
  const levelCandidates = ALL_PRODUCTS.filter(p => Math.abs(p.level - level) <= 1);
  if (levelCandidates.length === 0) {
    return {
      formula: null,
      confidence: 0,
      details: { levelDistance: 0, toneMatch: false, colorName: 'Unknown' },
    };
  }

  // Score each candidate
  type Scored = { product: typeof ALL_PRODUCTS[number]; score: number; levelDiff: number };
  const scored: Scored[] = levelCandidates.map(product => {
    let score = 0;
    const levelDiff = Math.abs(product.level - level);
    score += (1 - levelDiff / 1) * 40; // max 40 pts for level match

    // Tone match
    if (product.tone === tone) score += 30;
    else if (product.secondaryTone === tone) score += 20;
    if (secondaryTone && (product.tone === secondaryTone || product.secondaryTone === secondaryTone)) score += 15;

    // Brand preference bonus
    if (brandPreference && product.brand.toLowerCase().includes(brandPreference.toLowerCase())) score += 10;

    return { product, score, levelDiff };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  const p = best.product;

  const confidence = Math.min(98, Math.round(best.score));
  const formula: MatchedFormula = {
    id: p.id,
    brand: p.brand,
    line: p.line,
    shadeCode: p.shadeCode,
    shadeName: p.shadeName,
    level: p.level,
    tone: p.tone,
    secondaryTone: p.secondaryTone,
    mixingRatio: p.mixingRatio,
    developerRequired: p.developerRequired,
  };

  return {
    formula,
    confidence,
    details: {
      levelDistance: best.levelDiff,
      toneMatch: p.tone === tone || p.secondaryTone === tone,
      brand: p.brand,
      colorName: p.shadeName,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const imageFile = formData.get('image');

    if (!imageFile || !(imageFile instanceof File)) {
      return NextResponse.json({ error: 'Missing or invalid image file. Use multipart/form-data with field name "image".' }, { status: 400 });
    }

    if (imageFile.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large. Max 10MB.' }, { status: 413 });
    }

    const brandPreference = formData.get('brand')?.toString() || undefined;

    // Convert File → Buffer
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Run AI analysis (existing server-side pipeline)
    const analysis = await analyzeImageBuffer(buffer);

    // Map to nearest formula
    const level = analysis.currentLevel;
    const tone = analysis.currentTone;
    const primaryHex = analysis.dominantHex;

    const { formula, confidence, details } = findNearestFormula(
      level,
      tone,
      undefined, // secondary tone not surfaced by analyzeImageBuffer yet
      brandPreference
    );

    const result: ColorMatchResult = {
      success: true,
      extractedColor: {
        primaryHex,
        colorFamily: getColorFamily(level),
        level,
        toneFamily: getToneFamilyName(tone),
        secondaryTone: analysis.secondaryHex,
      },
      matchedFormula: formula,
      confidence,
      matchDetails: details,
      prefillQuery: formula
        ? `brand=${encodeURIComponent(formula.brand)}&line=${encodeURIComponent(formula.line)}&shade=${encodeURIComponent(formula.shadeCode)}&level=${formula.level}&tone=${formula.tone}`
        : undefined,
    };

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[Color Match Error]', error);
    return NextResponse.json(
      { error: error.message || 'Color match analysis failed' },
      { status: 500 }
    );
  }
}
