// Server-side Photo Analysis — GPT-4o-mini vision, k-means pixel pipeline as
// fallback/supplement

import sharp from 'sharp';
import { HAIR_LEVELS, TONE_DESCRIPTORS, ToneFamily } from './products';

// ─── Types (mirrored from photo-analysis.ts) ──────────────────────────────────

export interface HairAnalysisResult {
  currentLevel: number;           // 1-10
  currentLevelName: string;
  currentTone: ToneFamily;
  toneName: string;
  grayPercent: number;           // 0-100
  condition: HairCondition;
  conditionScore: number;        // 0-100 (100 = perfect)
  damageIndicators: DamageIndicators;
  warmthRatio: number;
  saturation: number;
  dominantHex: string;
  secondaryHex?: string;
  confidence: number;            // 0-1 overall
  faceDetected: boolean;
  hairRegionFound: boolean;
  recommendations: string[];
  rawMetrics: RawMetrics;
}

export type HairCondition =
  | 'excellent'   // 85-100
  | 'good'        // 70-84
  | 'fair'        // 55-69
  | 'damaged'     // 40-54
  | 'severely_damaged'; // <40

export interface DamageIndicators {
  porosityEstimate: 'low' | 'medium' | 'high';
  splitEndDetected: boolean;
  drynessScore: number;          // 0-100
  shineScore: number;            // 0-100
  texture: 'smooth' | 'rough' | 'frizzy' | 'brittle';
}

export interface RawMetrics {
  avgBrightness: number;
  brightnessStdDev: number;
  redRatio: number;
  yellowRatio: number;
  blueRatio: number;
  grayPixelRatio: number;
  darkPixelRatio: number;
  lightPixelRatio: number;
  uniformity: number;             // 0-1, 1 = very uniform
  sampleSize: number;
}

// ─── Color Math Helpers ─────────────────────────────────────────────────────

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s, l };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}

function colorDistance(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }): number {
  return Math.sqrt(
    Math.pow(a.r - b.r, 2) +
    Math.pow(a.g - b.g, 2) +
    Math.pow(a.b - b.b, 2)
  );
}

// ─── Level Reference Database ─────────────────────────────────────────────

const LEVEL_REFERENCES = [
  { level: 1,  r: 9,   g: 8,   b: 13,  name: 'Black' },
  { level: 2,  r: 28,  g: 16,  b: 8,   name: 'Darkest Brown' },
  { level: 3,  r: 59,  g: 35,  b: 32,  name: 'Dark Brown' },
  { level: 4,  r: 92,  g: 58,  b: 40,  name: 'Medium Brown' },
  { level: 5,  r: 125, g: 80,  b: 56,  name: 'Light Brown' },
  { level: 6,  r: 156, g: 107, b: 64,  name: 'Dark Blonde' },
  { level: 7,  r: 192, g: 140, b: 90,  name: 'Medium Blonde' },
  { level: 8,  r: 212, g: 170, b: 125, name: 'Light Blonde' },
  { level: 9,  r: 232, g: 201, b: 155, name: 'Very Light Blonde' },
  { level: 10, r: 245, g: 230, b: 211, name: 'Lightest Blonde' },
];

// ─── Face / Hair Detection ───────────────────────────────────────────────────

function isSkinTone(r: number, g: number, b: number): boolean {
  const brightness = (r + g + b) / 3;
  if (brightness < 40 || brightness > 230) return false;
  if (r < g || g < b * 0.7) return false;
  const rg = r - g;
  const rb = r - b;
  return rg > 8 && rb > 8 && rg < 80 && rb < 120;
}

function detectFaceRegion(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): { x: number; y: number; w: number; h: number } | null {
  const skinMask = new Uint8Array(width * height);
  let skinCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (isSkinTone(pixels[i], pixels[i + 1], pixels[i + 2])) {
        skinMask[y * width + x] = 1;
        skinCount++;
      }
    }
  }

  if (skinCount < width * height * 0.005) return null;

  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (skinMask[y * width + x]) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  const w = maxX - minX;
  const h = maxY - minY;
  if (w < 20 || h < 20 || w / h > 2.5 || h / w > 2.5) return null;

  return { x: minX, y: minY, w, h };
}

function extractHairPixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  face: { x: number; y: number; w: number; h: number } | null
): Array<{ r: number; g: number; b: number; x: number; y: number }> {
  const hairPixels: Array<{ r: number; g: number; b: number; x: number; y: number }> = [];

  let searchY1 = 0, searchY2 = height;
  let searchX1 = 0, searchX2 = width;

  if (face) {
    searchY2 = Math.min(height, face.y + Math.floor(face.h * 0.3));
    searchX1 = Math.max(0, face.x - Math.floor(face.w * 0.2));
    searchX2 = Math.min(width, face.x + face.w + Math.floor(face.w * 0.2));
  }

  for (let y = searchY1; y < searchY2; y++) {
    for (let x = searchX1; x < searchX2; x++) {
      const i = (y * width + x) * 4;
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2], a = pixels[i + 3];
      if (a < 128) continue;

      const brightness = (r + g + b) / 3;
      if (brightness < 12) continue;
      if (brightness > 248) continue;
      if (isSkinTone(r, g, b) && brightness > 80) continue;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      if (saturation > 0.85 && brightness > 120) continue;

      hairPixels.push({ r, g, b, x, y });
    }
  }

  return hairPixels;
}

// ─── Preprocessing ──────────────────────────────────────────────────────────

function normalizeBrightness(pixels: Array<{ r: number; g: number; b: number }>): Array<{ r: number; g: number; b: number }> {
  if (pixels.length === 0) return pixels;
  const brightnesses = pixels.map(p => (p.r + p.g + p.b) / 3);
  const avgBrightness = brightnesses.reduce((a, b) => a + b, 0) / brightnesses.length;
  const scale = Math.min(128 / Math.max(avgBrightness, 1), 1.8);
  return pixels.map(p => ({
    r: Math.min(255, Math.round(p.r * scale)),
    g: Math.min(255, Math.round(p.g * scale)),
    b: Math.min(255, Math.round(p.b * scale)),
  }));
}

function autoContrast(pixels: Array<{ r: number; g: number; b: number }>): Array<{ r: number; g: number; b: number }> {
  if (pixels.length === 0) return pixels;
  const brightnesses = pixels.map(p => (p.r + p.g + p.b) / 3);
  const minB = Math.min(...brightnesses);
  const maxB = Math.max(...brightnesses);
  if (maxB - minB < 10) return pixels;

  const range = maxB - minB;
  const targetMin = 15;
  const targetMax = 240;

  return pixels.map(p => {
    const b = (p.r + p.g + p.b) / 3;
    const norm = (b - minB) / range;
    const newB = targetMin + norm * (targetMax - targetMin);
    const factor = newB / Math.max(b, 1);
    return {
      r: Math.min(255, Math.round(p.r * factor)),
      g: Math.min(255, Math.round(p.g * factor)),
      b: Math.min(255, Math.round(p.b * factor)),
    };
  });
}

// ─── Gray Detection ─────────────────────────────────────────────────────────

function detectGrayPixels(pixels: Array<{ r: number; g: number; b: number }>): {
  grayPixels: Array<{ r: number; g: number; b: number }>;
  grayPercent: number;
} {
  const grayThreshold = 18;
  const grayPixels: Array<{ r: number; g: number; b: number }> = [];

  for (const p of pixels) {
    const avg = (p.r + p.g + p.b) / 3;
    const diff = Math.max(Math.abs(p.r - avg), Math.abs(p.g - avg), Math.abs(p.b - avg));
    if (diff < grayThreshold && avg > 30 && avg < 220) {
      grayPixels.push(p);
    }
  }

  const grayPercent = pixels.length > 0 ? (grayPixels.length / pixels.length) * 100 : 0;
  return { grayPixels, grayPercent };
}

// ─── Level Detection ────────────────────────────────────────────────────────

function detectLevel(r: number, g: number, b: number): { level: number; confidence: number } {
  let closestLevel = 1;
  let minDistance = Infinity;

  for (const ref of LEVEL_REFERENCES) {
    const dist = colorDistance({ r, g, b }, { r: ref.r, g: ref.g, b: ref.b });
    if (dist < minDistance) {
      minDistance = dist;
      closestLevel = ref.level;
    }
  }

  const confidence = Math.max(0, 1 - minDistance / 150);
  return { level: closestLevel, confidence };
}

// ─── Tone Detection ─────────────────────────────────────────────────────────

function detectTone(
  r: number, g: number, b: number, level: number
): { tone: ToneFamily; warmthRatio: number; confidence: number } {
  const hsl = rgbToHsl(r, g, b);
  const { h, s } = hsl;

  let warmthRatio = 0;
  if (h >= 15 && h <= 60) warmthRatio = (h - 15) / 45;
  else if (h > 60 && h <= 120) warmthRatio = 1 - (h - 60) / 60;
  else if (h >= 180 && h <= 270) warmthRatio = -(h - 180) / 90 - 0.2;
  else if (h > 0 && h < 15) warmthRatio = -0.1;
  else warmthRatio = -0.1;

  let tone: ToneFamily = 'neutral';

  if (s < 0.08) {
    tone = 'neutral';
  } else if (level <= 3) {
    if (warmthRatio > 0.3) tone = 'mahogany';
    else if (warmthRatio < -0.3) tone = 'cool';
    else tone = 'neutral';
  } else if (level <= 6) {
    if (h >= 0 && h <= 30) tone = 'red';
    else if (h > 30 && h <= 55) tone = 'copper';
    else if (h > 55 && h <= 75) tone = 'golden';
    else if (h >= 200 && h <= 270) tone = 'ash';
    else if (h >= 270 && h <= 330) tone = 'violet';
    else tone = 'neutral';
  } else {
    if (h >= 45 && h <= 75) tone = 'golden';
    else if (h >= 20 && h <= 45) tone = 'beige';
    else if (h >= 200 && h <= 270) tone = 'ash';
    else if (h >= 270 && h <= 330) tone = 'pearl';
    else if (h >= 330 || h <= 15) tone = 'warm';
    else tone = 'neutral';
  }

  const confidence = Math.abs(warmthRatio) > 0.3 ? 0.85 : s < 0.08 ? 0.4 : 0.65;
  return { tone, warmthRatio, confidence };
}

// ─── Damage Assessment ────────────────────────────────────────────────────────

function assessCondition(
  pixels: Array<{ r: number; g: number; b: number }>,
  grayPercent: number,
  uniformity: number,
  brightnessStdDev: number
): { condition: HairCondition; score: number; indicators: DamageIndicators } {
  const brightnesses = pixels.map(p => (p.r + p.g + p.b) / 3);
  const avgBrightness = brightnesses.reduce((a, b) => a + b, 0) / brightnesses.length;

  let localVarianceSum = 0;
  const windowSize = 9;
  for (let i = windowSize; i < brightnesses.length - windowSize; i += windowSize) {
    const window = brightnesses.slice(i - windowSize, i + windowSize);
    const winAvg = window.reduce((a, b) => a + b, 0) / window.length;
    const variance = window.reduce((s, b) => s + Math.pow(b - winAvg, 2), 0) / window.length;
    localVarianceSum += variance;
  }
  const avgLocalVariance = localVarianceSum / Math.max(1, Math.floor(brightnesses.length / windowSize));

  const highlightPixels = brightnesses.filter(b => b > avgBrightness * 1.3);
  const highlightRatio = highlightPixels.length / brightnesses.length;
  const shineScore = Math.min(100, highlightRatio * 500 + 20);

  const sats = pixels.map(p => {
    const max = Math.max(p.r, p.g, p.b);
    const min = Math.min(p.r, p.g, p.b);
    return max === 0 ? 0 : (max - min) / max;
  });
  const avgSat = sats.reduce((a, b) => a + b, 0) / sats.length;
  const drynessScore = Math.min(100, (1 - avgSat) * 80 + avgLocalVariance * 0.5);

  let porosityEstimate: 'low' | 'medium' | 'high' = 'medium';
  if (uniformity < 0.5 || avgLocalVariance > 400) porosityEstimate = 'high';
  else if (uniformity > 0.8 && avgLocalVariance < 100) porosityEstimate = 'low';

  const splitEndDetected = avgLocalVariance > 600 && avgBrightness > 100;

  let texture: DamageIndicators['texture'] = 'smooth';
  if (avgLocalVariance > 800) texture = 'brittle';
  else if (avgLocalVariance > 400) texture = 'frizzy';
  else if (avgLocalVariance > 200) texture = 'rough';

  let score = 70;
  score += shineScore * 0.2;
  score -= drynessScore * 0.2;
  score -= grayPercent * 0.3;
  score += uniformity * 15;
  score -= brightnessStdDev * 0.1;
  if (splitEndDetected) score -= 15;
  if (texture === 'brittle') score -= 10;
  if (texture === 'frizzy') score -= 5;

  score = Math.max(0, Math.min(100, Math.round(score)));

  let condition: HairCondition;
  if (score >= 85) condition = 'excellent';
  else if (score >= 70) condition = 'good';
  else if (score >= 55) condition = 'fair';
  else if (score >= 40) condition = 'damaged';
  else condition = 'severely_damaged';

  return {
    condition,
    score,
    indicators: {
      porosityEstimate,
      splitEndDetected,
      drynessScore: Math.round(drynessScore),
      shineScore: Math.round(shineScore),
      texture,
    },
  };
}

// ─── K-Means Clustering ─────────────────────────────────────────────────────

function kMeans(
  pixels: Array<{ r: number; g: number; b: number }>,
  k: number = 4
): Array<{ r: number; g: number; b: number; count: number }> {
  if (pixels.length === 0) return [];
  if (pixels.length < k) k = pixels.length;

  const centroids: Array<{ r: number; g: number; b: number }> = [];
  const used = new Set<number>();
  while (centroids.length < k) {
    const idx = Math.floor(Math.random() * pixels.length);
    if (!used.has(idx)) {
      used.add(idx);
      centroids.push({ ...pixels[idx] });
    }
  }

  for (let iter = 0; iter < 12; iter++) {
    const clusters: Array<Array<{ r: number; g: number; b: number }>> = Array.from({ length: k }, () => []);
    for (const p of pixels) {
      let minDist = Infinity, closest = 0;
      for (let c = 0; c < k; c++) {
        const dist = colorDistance(p, centroids[c]);
        if (dist < minDist) { minDist = dist; closest = c; }
      }
      clusters[closest].push(p);
    }
    for (let c = 0; c < k; c++) {
      if (clusters[c].length === 0) continue;
      centroids[c] = {
        r: Math.round(clusters[c].reduce((s, p) => s + p.r, 0) / clusters[c].length),
        g: Math.round(clusters[c].reduce((s, p) => s + p.g, 0) / clusters[c].length),
        b: Math.round(clusters[c].reduce((s, p) => s + p.b, 0) / clusters[c].length),
      };
    }
  }

  const clusters: Array<Array<{ r: number; g: number; b: number }>> = Array.from({ length: k }, () => []);
  for (const p of pixels) {
    let minDist = Infinity, closest = 0;
    for (let c = 0; c < k; c++) {
      const dist = colorDistance(p, centroids[c]);
      if (dist < minDist) { minDist = dist; closest = c; }
    }
    clusters[closest].push(p);
  }

  return centroids
    .map((c, i) => ({ ...c, count: clusters[i].length }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count);
}

// ─── Vision Analysis (GPT-4o-mini) ───────────────────────────────────────────
// Was Kimi K2.6 via a local Ollama instance, with GPT-4o-mini as fallback.
// Dropped Kimi entirely: both the web app and the iOS app (mobile/src/api/
// client.ts, API_BASE = coloriq.co) run through this same Vercel-deployed
// backend, which can never reach a local Ollama server (127.0.0.1) — so that
// path could never succeed for any real user, only in local dev on the one
// machine running Ollama. Not worth maintaining two providers for that.

const VALID_TONES = new Set([
  'neutral','ash','golden','copper','red','violet','pearl','beige','mahogany','chocolate','warm','cool',
]);
const VALID_CONDITIONS = new Set(['excellent','good','fair','damaged','severely_damaged']);

// Vision uses its own key (OPENAI_VISION_KEY) so photo-analysis spend and rate
// limits stay separate from the assistant/dictation key. Falls back to
// OPENAI_API_KEY for single-key setups. gpt-4o-mini: vision-capable,
// $0.15/$0.60 per 1M tokens — at this task's size (~1 photo + short JSON out)
// that's roughly $0.0003/photo.
const OPENAI_VISION_MODEL = process.env.OPENAI_VISION_MODEL ?? 'gpt-4o-mini';
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS ?? 20000); // 20 s

const VISION_PROMPT = `You are a professional colorist. Analyze this hair photo and respond with ONLY a JSON object — no prose, no markdown fences.

Required fields:
- level: integer 1-10 (1=black, 10=lightest blonde)
- tone: one of: neutral, ash, golden, copper, red, violet, pearl, beige, mahogany, chocolate, warm, cool
- grayPercent: integer 0-100 (percentage of visible gray/white hair)
- condition: one of: excellent, good, fair, damaged, severely_damaged
- porosity: one of: low, medium, high
- highlights: boolean (true if balayage, foils, or hand-painted highlights visible)
- isMultiTonal: boolean (true if two or more distinct color levels/tones are present)
- recommendations: array of up to 3 short strings, each a specific colorist note

Assess the OVERALL hair color (not just highlights), ignoring background and skin.`;

interface VisionResult {
  level: number;
  tone: ToneFamily;
  grayPercent: number;
  condition: HairCondition;
  porosity: 'low' | 'medium' | 'high';
  highlights: boolean;
  isMultiTonal: boolean;
  recommendations: string[];
}

function parseVisionJSON(text: string): VisionResult | null {
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    const parsed = JSON.parse(clean) as Record<string, unknown>;
    const level = typeof parsed.level === 'number' ? Math.max(1, Math.min(10, Math.round(parsed.level))) : null;
    const tone = typeof parsed.tone === 'string' && VALID_TONES.has(parsed.tone) ? parsed.tone as ToneFamily : null;
    const condition = typeof parsed.condition === 'string' && VALID_CONDITIONS.has(parsed.condition) ? parsed.condition as HairCondition : null;
    if (level === null || tone === null || condition === null) return null;
    return {
      level,
      tone,
      grayPercent: typeof parsed.grayPercent === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.grayPercent))) : 0,
      condition,
      porosity: (parsed.porosity === 'low' || parsed.porosity === 'high') ? parsed.porosity : 'medium',
      highlights: parsed.highlights === true,
      isMultiTonal: parsed.isMultiTonal === true,
      recommendations: Array.isArray(parsed.recommendations)
        ? (parsed.recommendations as unknown[]).filter(r => typeof r === 'string').slice(0, 3) as string[]
        : [],
    };
  } catch {
    return null;
  }
}

async function analyzeWithOpenAI(jpegBase64: string): Promise<VisionResult | null> {
  const apiKey = process.env.OPENAI_VISION_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'placeholder') return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: OPENAI_VISION_MODEL,
        response_format: { type: 'json_object' },
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: VISION_PROMPT },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${jpegBase64}` } },
          ],
        }],
      }),
    }).finally(() => clearTimeout(timer));

    if (!response.ok) return null;
    const data = await response.json();
    const text: string = data.choices?.[0]?.message?.content?.trim() || '';
    return text ? parseVisionJSON(text) : null;
  } catch {
    return null;
  }
}


// ─── Main Server-side Entry Point ─────────────────────────────────────────────

export async function analyzeImageBuffer(buffer: Buffer): Promise<HairAnalysisResult> {
  // 1. Decode & resize with sharp — produce both raw pixels AND a JPEG for GPT-4o-mini
  const [pixelResult, jpegBuffer] = await Promise.all([
    sharp(buffer)
      .raw()
      .ensureAlpha()
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .toBuffer({ resolveWithObject: true }),
    sharp(buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer(),
  ]);

  const pixels = new Uint8ClampedArray(pixelResult.data);
  const width = pixelResult.info.width;
  const height = pixelResult.info.height;

  // 2. K-means pixel pipeline (always runs — provides raw metrics & hex colors)
  const faceRegion = detectFaceRegion(pixels, width, height);
  const faceDetected = faceRegion !== null;

  const hairPixelsRaw = extractHairPixels(pixels, width, height, faceRegion);
  let hairRegionFound = hairPixelsRaw.length > 50;

  if (!hairRegionFound) {
    const marginX = Math.floor(width * 0.2);
    const marginY = Math.floor(height * 0.2);
    for (let y = marginY; y < height - marginY; y += 2) {
      for (let x = marginX; x < width - marginX; x += 2) {
        const i = (y * width + x) * 4;
        hairPixelsRaw.push({ r: pixels[i], g: pixels[i + 1], b: pixels[i + 2], x, y });
      }
    }
    hairRegionFound = hairPixelsRaw.length > 50;
  }

  const hairColors = hairPixelsRaw.map(p => ({ r: p.r, g: p.g, b: p.b }));
  const normalizedColors = normalizeBrightness(hairColors);
  const processedColors = autoContrast(normalizedColors);

  const { grayPercent: pixelGrayPercent } = detectGrayPixels(processedColors);
  const clusters = kMeans(processedColors, 4);
  const hairClusters = clusters.filter(c => {
    const b = (c.r + c.g + c.b) / 3;
    return b > 12 && b < 248;
  });
  const dominant = hairClusters[0] || clusters[0];
  const secondary = hairClusters[1];

  if (!dominant) {
    throw new Error('Could not detect hair color. Please use a clearer, well-lit photo.');
  }

  const hsl = rgbToHsl(dominant.r, dominant.g, dominant.b);
  const brightnesses = processedColors.map(p => (p.r + p.g + p.b) / 3);
  const avgBrightness = brightnesses.reduce((a, b) => a + b, 0) / brightnesses.length;
  const brightnessStdDev = Math.sqrt(
    brightnesses.reduce((s, b) => s + Math.pow(b - avgBrightness, 2), 0) / brightnesses.length
  );
  const uniformity = 1 - Math.min(1, brightnessStdDev / 80);
  const { condition: pixelCondition, score: pixelConditionScore, indicators } = assessCondition(
    processedColors, pixelGrayPercent, uniformity, brightnessStdDev
  );
  const { level: pixelLevel, confidence: levelConf } = detectLevel(dominant.r, dominant.g, dominant.b);
  const { tone: pixelTone, warmthRatio, confidence: toneConf } = detectTone(dominant.r, dominant.g, dominant.b, pixelLevel);

  // 3. GPT-4o-mini vision (jpegBuffer already produced above via Promise.all on sharp)
  const jpegBase64 = jpegBuffer.toString('base64');
  const vision = await analyzeWithOpenAI(jpegBase64);

  // 4. Merge: vision wins on semantic fields when available; k-means fills pixel metrics
  const currentLevel = vision?.level ?? pixelLevel;
  const currentTone = vision?.tone ?? pixelTone;
  const grayPercent = vision?.grayPercent ?? Math.round(pixelGrayPercent);
  const condition = vision?.condition ?? pixelCondition;
  const conditionScore = VALID_CONDITIONS.has(condition)
    ? { excellent: 90, good: 77, fair: 62, damaged: 47, severely_damaged: 25 }[condition] ?? pixelConditionScore
    : pixelConditionScore;

  // Porosity: GPT-4o-mini's read overrides pixel estimate when available
  if (vision?.porosity) {
    indicators.porosityEstimate = vision.porosity;
  }

  // 5. Recommendations: GPT-4o-mini's are more nuanced; append pixel-derived ones only if unique
  const recommendations: string[] = vision ? [...vision.recommendations] : [];

  if (!vision) {
    if (grayPercent > 30) recommendations.push(`High gray coverage (${grayPercent}%) — use permanent color with higher developer volume`);
    else if (grayPercent > 10) recommendations.push(`Moderate gray (${grayPercent}%) — consider demi-permanent or permanent with low-volume developer`);
    if (condition === 'damaged' || condition === 'severely_damaged') {
      recommendations.push('Hair condition compromised — pre-treat with bond builder, use lower developer volume');
      if (indicators.porosityEstimate === 'high') recommendations.push('High porosity detected — color may grab darker; go 1/2 level lighter');
    }
  }
  if (vision?.isMultiTonal && !recommendations.some(r => r.toLowerCase().includes('multi'))) {
    recommendations.push('Multi-tonal hair detected — balayage or color melting technique recommended');
  }
  if (!faceDetected && !vision) {
    recommendations.push('Face not clearly detected — for best results, use a front-facing photo with good lighting');
  }

  // 6. Confidence: GPT-4o-mini gives 0.92 baseline; k-means fallback gives its own score
  const confidence = vision
    ? 0.92 * (hairRegionFound ? 1 : 0.9)
    : Math.min(0.95, ((levelConf + toneConf) / 2) * (hairRegionFound ? 1 : 0.7));

  return {
    currentLevel,
    currentLevelName: HAIR_LEVELS[currentLevel]?.name || 'Unknown',
    currentTone,
    toneName: TONE_DESCRIPTORS[currentTone] || currentTone,
    grayPercent,
    condition,
    conditionScore,
    damageIndicators: indicators,
    warmthRatio,
    saturation: hsl.s,
    dominantHex: rgbToHex(dominant.r, dominant.g, dominant.b),
    secondaryHex: secondary ? rgbToHex(secondary.r, secondary.g, secondary.b) : undefined,
    confidence: Math.round(confidence * 100) / 100,
    faceDetected,
    hairRegionFound,
    recommendations,
    rawMetrics: {
      avgBrightness: Math.round(avgBrightness),
      brightnessStdDev: Math.round(brightnessStdDev),
      redRatio: Math.round(processedColors.reduce((s, p) => s + p.r, 0) / processedColors.length / 255 * 100) / 100,
      yellowRatio: Math.round(processedColors.reduce((s, p) => s + Math.min(p.r, p.g) / Math.max(p.b, 1), 0) / processedColors.length * 100) / 100,
      blueRatio: Math.round(processedColors.reduce((s, p) => s + p.b, 0) / processedColors.length / 255 * 100) / 100,
      grayPixelRatio: Math.round(pixelGrayPercent) / 100,
      darkPixelRatio: Math.round(brightnesses.filter(b => b < 50).length / brightnesses.length * 100) / 100,
      lightPixelRatio: Math.round(brightnesses.filter(b => b > 200).length / brightnesses.length * 100) / 100,
      uniformity: Math.round(uniformity * 100) / 100,
      sampleSize: processedColors.length,
    },
  };
}
