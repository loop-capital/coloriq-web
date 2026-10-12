/**
 * Phorest Inventory Integration
 *
 * Pulls products from Phorest and maps them to COLORiq inventory_items format.
 * Handles:
 * - Product categorization (color, developer, treatment, retail)
 * - Stock level tracking
 * - Barcode matching for shade codes
 * - Multi-branch support
 *
 * @see https://developer.phorest.com/reference/getproducts.md
 */

import { prisma } from '@/lib/prisma';
import { PhorestClient } from './phorest-client';
import {
  PhorestCredentials,
  PhorestProduct,
  PhorestSyncResult,
} from './types';

// ── Product Type Mapping ──
type ProductCategory = 'color' | 'developer' | 'treatment' | 'retail' | 'other';

interface CategoryMapping {
  keywords: string[];
  category: ProductCategory;
}

const CATEGORY_MAPPINGS: CategoryMapping[] = [
  {
    keywords: ['hair color', 'haircolour', 'hair colour', 'color', 'colour', 'tint', 'dye'],
    category: 'color',
  },
  {
    keywords: ['developer', 'oxidant', 'peroxide', 'cream developer', 'oil developer'],
    category: 'developer',
  },
  {
    keywords: ['treatment', 'conditioner', 'mask', 'repair', 'bond', 'plex', 'olaplex', 'k18'],
    category: 'treatment',
  },
  {
    keywords: ['shampoo', 'styling', 'spray', 'serum', 'oil', 'mousse', 'gel', 'wax'],
    category: 'retail',
  },
];

/**
 * Map a Phorest product type string or name to a COLORiq category
 */
export function mapProductCategory(product: PhorestProduct): ProductCategory {
  const searchText = `${product.type || ''} ${product.categoryName || ''} ${product.name || ''}`.toLowerCase();

  // Check Phorest product type first
  if (product.type) {
    const types = product.type.toUpperCase().split(',').map((t) => t.trim());
    if (types.includes('COLOUR') || types.includes('COLOR')) return 'color';
    if (types.includes('PROFESSIONAL') && searchText.includes('developer')) return 'developer';
    if (types.includes('RETAIL')) return 'retail';
  }

  // Fallback to keyword matching on name/category
  for (const mapping of CATEGORY_MAPPINGS) {
    for (const keyword of mapping.keywords) {
      if (searchText.includes(keyword)) {
        return mapping.category;
      }
    }
  }

  return 'other';
}

/**
 * Extract shade code from product name or barcode
 * Attempts to find patterns like "6N", "7.1", "5RR", etc.
 */
export function extractShadeCode(product: PhorestProduct): string | undefined {
  // Try barcode first (often contains the shade code)
  if (product.barcode && /^[0-9A-Z\-]{3,}$/i.test(product.barcode)) {
    return product.barcode;
  }

  // Try code field
  if (product.code) {
    return product.code;
  }

  // Try to extract from name using common patterns
  const name = product.name || '';

  // Pattern: numbers with optional decimal and letter (e.g., "6N", "7.1", "5RV")
  const shadeMatch = name.match(/\b(\d{1,2}(?:\.\d)?[A-Z]{0,3})\b/i);
  if (shadeMatch) {
    return shadeMatch[1].toUpperCase();
  }

  // Pattern: just a number at the end (e.g., "Color 6")
  const numberMatch = name.match(/(\d{1,2})\s*$/);
  if (numberMatch) {
    return numberMatch[1];
  }

  return undefined;
}

/**
 * Extract brand name from product name
 */
export function extractBrand(product: PhorestProduct): string {
  if (product.brandName) {
    return product.brandName;
  }

  // Extract first word as brand
  const name = product.name || '';
  const firstWord = name.split(' ')[0];
  return firstWord || 'Unknown';
}

/**
 * Extract product line from name (everything after brand)
 */
export function extractProductLine(product: PhorestProduct): string {
  const name = product.name || '';
  const brand = extractBrand(product);
  if (name.startsWith(brand)) {
    return name.slice(brand.length).trim();
  }
  return name;
}

// ── Sync Functions ──

export interface InventorySyncOptions {
  salonId: string;
  branchId: string;
  credentials: PhorestCredentials;
  productTypes?: string[];
  includeArchived?: boolean;
  dryRun?: boolean;
}

/**
 * Sync products from Phorest to COLORiq inventory_items
 */
export async function syncPhorestInventory(
  options: InventorySyncOptions
): Promise<PhorestSyncResult> {
  const { salonId, branchId, credentials, productTypes, includeArchived = false, dryRun = false } = options;

  const startTime = Date.now();
  const client = new PhorestClient(credentials);

  const result: PhorestSyncResult = {
    success: true,
    entityType: 'products',
    itemsSynced: 0,
    itemsFailed: 0,
    errors: [],
    hasMore: false,
    durationMs: 0,
  };

  let page = 0;
  let totalSynced = 0;
  const pageSize = 100;

  try {
    do {
      const response = await client.listProducts(branchId, {
        page,
        size: pageSize,
        productType: productTypes?.join(', '),
        includeArchived,
      });

      const products = response._embedded?.products || [];
      const pageMeta = response.page;

      if (dryRun) {
        // In dry run mode, just count
        totalSynced += products.length;
        console.log(`[Phorest Inventory] Dry run: page ${page}, ${products.length} products`);
      } else {
        // Upsert each product
        for (const product of products) {
          try {
            const category = mapProductCategory(product);
            const shadeCode = extractShadeCode(product) || product.productId;
            const brand = extractBrand(product);
            const productLine = extractProductLine(product);
            const retailPrice = product.price ?? null;

            await prisma.inventory_items.upsert({
              where: {
                salon_id_brand_shade_code: {
                  salon_id: salonId,
                  brand,
                  shade_code: shadeCode,
                },
              },
              update: {
                source: 'phorest',
                shade_name: product.name,
                category,
                product_line: productLine,
                quantity_on_hand: Math.max(0, product.quantityInStock ?? 0),
                unit_of_measure: product.measurementUnit || 'grams',
                retail_price: retailPrice ? Number(retailPrice) : null,
                reorder_count: product.reorderCount ?? undefined,
                reorder_cost: product.reorderCost ? Number(product.reorderCost) : undefined,
                barcode: product.barcode || undefined,
                is_active: !product.archived,
                last_synced_at: new Date(),
                updated_at: new Date(),
              },
              create: {
                salon_id: salonId,
                source: 'phorest',
                brand,
                product_line: productLine,
                shade_code: shadeCode,
                shade_name: product.name,
                category,
                quantity_on_hand: Math.max(0, product.quantityInStock ?? 0),
                unit_of_measure: product.measurementUnit || 'grams',
                retail_price: retailPrice ? Number(retailPrice) : null,
                reorder_count: product.reorderCount ?? undefined,
                reorder_cost: product.reorderCost ? Number(product.reorderCost) : undefined,
                barcode: product.barcode || undefined,
                is_active: !product.archived,
                last_synced_at: new Date(),
              },
            });

            totalSynced++;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            result.itemsFailed++;
            result.errors.push({
              itemId: product.productId,
              error: message,
            });
            console.error(`[Phorest Inventory] Failed to sync product ${product.productId}:`, message);
          }
        }
      }

      page++;
      result.hasMore = page < (pageMeta?.totalPages || 0);
    } while (result.hasMore && totalSynced < 10000); // Safety limit

    result.itemsSynced = totalSynced;
    result.success = result.itemsFailed === 0 || result.itemsSynced > 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Phorest Inventory] Sync failed:', message);
    result.success = false;
    result.errors.push({ error: message });
  }

  result.durationMs = Date.now() - startTime;
  return result;
}

/**
 * Get synced Phorest inventory for a salon
 */
export async function getPhorestInventory(
  salonId: string,
  options: {
    category?: string;
    search?: string;
    lowStock?: boolean;
    branchId?: string;
  } = {}
) {
  const where: Record<string, any> = {
    salon_id: salonId,
    source: 'phorest',
  };

  if (options.category) {
    where.category = options.category;
  }

  if (options.lowStock) {
    where.quantity_on_hand = {
      lte: 10, // Use a fixed low threshold
    };
  }

  if (options.search) {
    const q = options.search.toLowerCase();
    where.OR = [
      { brand: { contains: q, mode: 'insensitive' } },
      { shade_name: { contains: q, mode: 'insensitive' } },
      { shade_code: { contains: q, mode: 'insensitive' } },
    ];
  }

  const items = await prisma.inventory_items.findMany({
    where,
    orderBy: { updated_at: 'desc' },
    take: 500,
  });

  return {
    items: items.map((item) => ({
      id: item.id,
      phorest_product_id: item.shade_code,
      name: item.shade_name || item.shade_code,
      brand: item.brand,
      category: item.category,
      quantity: item.quantity_on_hand,
      unit: item.unit_of_measure,
      price: item.retail_price,
      is_active: item.is_active,
      low_stock: item.quantity_on_hand <= item.low_stock_threshold,
      last_synced: item.last_synced_at,
    })),
    total: items.length,
  };
}

/**
 * Check if Phorest products are low in stock
 */
export async function getPhorestLowStock(salonId: string, threshold?: number) {
  const items = await prisma.inventory_items.findMany({
    where: {
      salon_id: salonId,
      source: 'phorest',
      is_active: true,
      quantity_on_hand: {
        lte: threshold ?? 10,
      },
    },
    orderBy: { quantity_on_hand: 'asc' },
    take: 100,
  });

  return items.map((item) => ({
    id: item.id,
    name: item.shade_name || item.shade_code,
    brand: item.brand,
    current_stock: item.quantity_on_hand,
    threshold: threshold ?? item.low_stock_threshold,
    unit: item.unit_of_measure,
  }));
}
