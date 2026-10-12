/**
 * TypeScript port of verify-brands.py validation logic (without web crawling).
 * Validates ALL_PRODUCTS for structural integrity and data quality.
 * Run: npx ts-node --project tsconfig.json scripts/validate-brand-data.ts
 */
import { ALL_PRODUCTS } from '../lib/products';
import type { Product } from '../lib/products';

const VALID_TONES = new Set([
  'warm', 'cool', 'neutral', 'ash', 'golden', 'copper',
  'red', 'violet', 'pearl', 'beige', 'mahogany', 'chocolate',
]);

interface ValidationIssue {
  productId: string;
  brand: string;
  issue: string;
}

function validate(): void {
  const issues: ValidationIssue[] = [];
  const seenIds = new Set<string>();
  const brandStats: Record<string, { count: number; levels: Set<number>; tones: Set<string> }> = {};

  for (const p of ALL_PRODUCTS) {
    // Duplicate ID check
    if (seenIds.has(p.id)) {
      issues.push({ productId: p.id, brand: p.brand, issue: 'Duplicate product ID' });
    }
    seenIds.add(p.id);

    // Required fields
    if (!p.id)       issues.push({ productId: p.id, brand: p.brand, issue: 'Missing id' });
    if (!p.brand)    issues.push({ productId: p.id, brand: p.brand, issue: 'Missing brand' });
    if (!p.line)     issues.push({ productId: p.id, brand: p.brand, issue: 'Missing line' });
    if (!p.shadeCode)issues.push({ productId: p.id, brand: p.brand, issue: 'Missing shadeCode' });
    if (!p.shadeName)issues.push({ productId: p.id, brand: p.brand, issue: 'Missing shadeName' });

    // Level range 1-10
    if (p.level < 1 || p.level > 10 || !Number.isInteger(p.level)) {
      issues.push({ productId: p.id, brand: p.brand, issue: `Invalid level: ${p.level}` });
    }

    // Valid tone
    if (!VALID_TONES.has(p.tone)) {
      issues.push({ productId: p.id, brand: p.brand, issue: `Unknown tone: "${p.tone}"` });
    }
    if (p.secondaryTone && !VALID_TONES.has(p.secondaryTone)) {
      issues.push({ productId: p.id, brand: p.brand, issue: `Unknown secondaryTone: "${p.secondaryTone}"` });
    }

    // UPT range
    if (p.upt !== undefined && (p.upt < 0 || p.upt > 100)) {
      issues.push({ productId: p.id, brand: p.brand, issue: `UPT out of range: ${p.upt}` });
    }

    // Mixing ratio format
    if (p.mixingRatio && !/^\d+:\d+(\.\d+)?$/.test(p.mixingRatio)) {
      issues.push({ productId: p.id, brand: p.brand, issue: `Invalid mixingRatio format: "${p.mixingRatio}"` });
    }

    // Accumulate brand stats
    if (!brandStats[p.brand]) {
      brandStats[p.brand] = { count: 0, levels: new Set(), tones: new Set() };
    }
    brandStats[p.brand].count++;
    brandStats[p.brand].levels.add(p.level);
    brandStats[p.brand].tones.add(p.tone);
  }

  // ── Report ──────────────────────────────────────────────────────────────────
  console.log('=== ColorIq Brand Data Validation ===\n');
  console.log('Brand Coverage:');

  const brandList = Object.entries(brandStats).sort((a, b) => b[1].count - a[1].count);
  for (const [brand, stats] of brandList) {
    const levelSpan = stats.levels.size;
    const toneCount = stats.tones.size;
    const flags: string[] = [];
    if (levelSpan < 5) flags.push(`⚠ only ${levelSpan} levels`);
    if (toneCount < 3) flags.push(`⚠ only ${toneCount} tones`);
    console.log(
      `  ${brand.padEnd(35)} ${String(stats.count).padStart(4)} shades  ` +
      `levels:${levelSpan}  tones:${toneCount}  ${flags.join(' ')}`
    );
  }

  const totalShades = ALL_PRODUCTS.length;
  const totalBrands = brandList.length;
  console.log(`\n  TOTAL: ${totalShades} shades across ${totalBrands} brands\n`);

  if (issues.length === 0) {
    console.log('✓ No validation issues found.\n');
  } else {
    console.log(`✗ ${issues.length} validation issue${issues.length !== 1 ? 's' : ''} found:\n`);
    for (const issue of issues.slice(0, 50)) {
      console.log(`  [${issue.brand}] ${issue.productId}: ${issue.issue}`);
    }
    if (issues.length > 50) {
      console.log(`  ... and ${issues.length - 50} more`);
    }
    process.exit(1);
  }
}

validate();
