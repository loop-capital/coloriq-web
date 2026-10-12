/**
 * POST /api/square/sync
 * Sync a salon's Square product catalog into COLORiq inventory_items table
 *
 * Pulls all catalog items from the salon's Square account
 * and upserts them into inventory_items with source="square"
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSalonClient, getConnection, saveConnection } from '@/lib/square-multi';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { getSalonIdForUser } from '@/lib/stylist';

async function resolveSalonId(request: NextRequest): Promise<string | null> {
  const authUser = await getUserFromRequest(request);
  if (!authUser) return null;
  return getSalonIdForUser(authUser.userId);
}

interface SyncedProduct {
  square_catalog_id: string;
  name: string;
  category?: string;
  sku?: string;
  price_cents?: number;
}

/**
 * Map Square catalog category names to our internal category codes
 */
function mapCategory(squareCategory?: string): string {
  if (!squareCategory) return 'other';
  const lower = squareCategory.toLowerCase();
  if (lower.includes('hair color') || lower.includes('haircolor') || lower.includes('colour')) return 'color';
  if (lower.includes('developer') || lower.includes('oxidant') || lower.includes('peroxide')) return 'developer';
  if (lower.includes('treatment') || lower.includes('conditioner') || lower.includes('mask')) return 'treatment';
  return 'other';
}

export async function POST(request: NextRequest) {
  try {
    const salonId = await resolveSalonId(request);
    if (!salonId) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } }, { status: 401 });
    }

    // Check that the salon has inventory_management enabled
    const salon = await prisma.salons.findUnique({ where: { id: salonId } });
    if (!salon) {
      return NextResponse.json({
        success: false,
        error: { code: 'SALON_NOT_FOUND', message: 'Salon not found.' },
      }, { status: 404 });
    }

    const features = salon.features_enabled as Record<string, unknown> | null;
    if (!features || features.inventory_management !== true) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVENTORY_DISABLED', message: 'Inventory management is not enabled for this salon. Enable it in salon settings first.' },
      }, { status: 403 });
    }

    const client = await createSalonClient(salonId);
    if (!client) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_CONNECTED', message: 'Square not connected. Connect first.' },
      }, { status: 400 });
    }

    const connection = await getConnection(salonId);

    // Note: we intentionally don't pull Square's inventory counts here.
    // Square tracks whole retail units (bottles/tubes); ColorIq tracks
    // grams consumed via formula usage and the scale-bowl feature. Those are
    // different, non-convertible units — writing Square's count into
    // quantity_on_hand previously corrupted it (e.g. "12" bottles read as
    // "12" grams, then real gram deductions drove it negative). Matches
    // Vish's own model: a manual stock count/entry establishes the real
    // gram baseline (see POST /api/v1/inventory/receive), catalog sync is
    // metadata only.
    const products: SyncedProduct[] = [];
    let cursor: string | undefined;

    do {
      const response = await client.catalog.list({
        types: 'ITEM',
        cursor,
      });

      for (const obj of response.data || []) {
        if (obj.type !== 'ITEM' || !obj.itemData) continue;

        const item = obj.itemData;
        const variation = item.variations?.[0];
        const price = variation?.itemVariationData?.priceMoney;

        products.push({
          square_catalog_id: obj.id || '',
          name: item.name || 'Unknown',
          category: item.categories?.[0]?.name,
          sku: variation?.itemVariationData?.sku || undefined,
          price_cents: price ? Number(price.amount) : undefined,
        });
      }

      cursor = response.cursor;
    } while (cursor);

    // Upsert each product into inventory_items
    const upsertResults = await Promise.all(
      products.map(async (product) => {
        const category = mapCategory(product.category);
        const shadeCode = product.sku || product.square_catalog_id;
        const brand = product.name.split(' ')[0] || 'Unknown';
        const productLine = product.name;
        const retailPrice = product.price_cents ? product.price_cents / 100 : null;

        return prisma.inventory_items.upsert({
          where: {
            salon_id_brand_shade_code: {
              salon_id: salonId,
              brand: brand,
              shade_code: shadeCode,
            },
          },
          update: {
            // quantity_on_hand is deliberately NOT set here — it's our own
            // gram-native ledger (see POST /api/v1/inventory/receive and
            // the scale-bowl deduction), not Square's whole-unit count.
            // Re-syncing the catalog must never clobber real stock levels.
            source: 'square',
            square_catalog_object_id: product.square_catalog_id,
            square_variation_id: product.sku || null,
            shade_name: product.name,
            category: category,
            retail_price: retailPrice,
            last_synced_at: new Date(),
            updated_at: new Date(),
          },
          create: {
            salon_id: salonId,
            source: 'square',
            square_catalog_object_id: product.square_catalog_id,
            square_variation_id: product.sku || null,
            brand: brand,
            product_line: productLine,
            shade_code: shadeCode,
            shade_name: product.name,
            category: category,
            // Starts at 0 — a brand-new item has no known gram baseline
            // until the salon does a Receive Stock entry or manual count.
            quantity_on_hand: 0,
            unit_of_measure: 'grams',
            low_stock_threshold: 50,
            retail_price: retailPrice,
            reorder_point: 25,
            reorder_quantity: 100,
            last_synced_at: new Date(),
          },
        });
      })
    );

    // Update connection sync timestamp
    if (connection) {
      connection.catalog_synced_at = new Date().toISOString();
      await saveConnection(connection);
    }

    return NextResponse.json({
      success: true,
      data: {
        products_synced: products.length,
        products: products.slice(0, 20), // Return first 20 for preview
        synced_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json({
      success: false,
      error: { code: 'SYNC_FAILED', message },
    }, { status: 500 });
  }
}

/**
 * GET /api/square/sync
 * Get synced products for a salon from the database
 */
export async function GET(request: NextRequest) {
  const salonId = await resolveSalonId(request);
  if (!salonId) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } }, { status: 401 });
  }

  const items = await prisma.inventory_items.findMany({
    where: {
      salon_id: salonId,
      source: 'square',
    },
    orderBy: { updated_at: 'desc' },
  });

  const connection = await getConnection(salonId);

  return NextResponse.json({
    success: true,
    data: {
      products: items.map((item) => ({
        id: item.id,
        square_catalog_id: item.square_catalog_object_id,
        name: item.shade_name || item.shade_code || '',
        category: item.category,
        sku: item.square_variation_id || undefined,
        price_cents: item.retail_price ? Number(item.retail_price) * 100 : undefined,
        quantity: item.quantity_on_hand,
        brand: item.brand,
        product_line: item.product_line,
      })),
      total: items.length,
      last_synced: connection?.catalog_synced_at || null,
    },
  });
}