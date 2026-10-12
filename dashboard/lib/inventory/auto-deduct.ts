import { prisma } from "@/lib/prisma";

/**
 * Auto-deduct inventory when a service (visit) is completed with a formula.
 *
 * Looks up inventory items matching the formula's brand/line/shade and deducts
 * the specified grams. Creates an inventory_transaction record for audit.
 *
 * Graceful degradation: if no matching inventory item exists, logs and returns
 * without failing the parent operation.
 */
export async function autoDeductInventory(
  formulaId: string,
  salonId: string,
  gramsUsed: number = 30,
): Promise<{
  deducted: boolean;
  itemId?: string;
  remaining?: number;
  lowStock?: boolean;
  error?: string;
}> {
  try {
    // 1. Look up the formula to get brand/line/shade info
    const formula = await prisma.formulas.findUnique({
      where: { id: formulaId },
      select: {
        id: true,
        product_brand: true,
        product_line: true,
        product_shade: true,
      },
    });

    if (!formula) {
      console.warn(`[auto-deduct] Formula ${formulaId} not found, skipping deduction`);
      return { deducted: false, error: "Formula not found" };
    }

    const brand = formula.product_brand;
    const shadeCode = formula.product_shade;

    if (!brand || !shadeCode) {
      console.warn(
        `[auto-deduct] Formula ${formulaId} missing brand/shade (brand=${brand}, shade=${shadeCode}), skipping deduction`,
      );
      return { deducted: false, error: "Formula missing brand or shade" };
    }

    // 2. Find matching inventory item by salon_id + brand + shade_code (unique constraint)
    const inventoryItem = await prisma.inventory_items.findFirst({
      where: {
        salon_id: salonId,
        brand: brand,
        shade_code: shadeCode,
        is_active: true,
      },
    });

    if (!inventoryItem) {
      // Also try matching by shade_name if shade_code doesn't match
      const altItem = await prisma.inventory_items.findFirst({
        where: {
          salon_id: salonId,
          brand: brand,
          shade_name: shadeCode,
          is_active: true,
        },
      });

      if (!altItem) {
        console.warn(
          `[auto-deduct] No inventory item found for salon=${salonId} brand=${brand} shade=${shadeCode}, skipping deduction`,
        );
        return { deducted: false, error: "No matching inventory item" };
      }

      return await performDeduction(altItem, gramsUsed, formulaId, salonId);
    }

    return await performDeduction(inventoryItem, gramsUsed, formulaId, salonId);
  } catch (error) {
    console.error("[auto-deduct] Error during auto-deduction:", error);
    // Graceful degradation — don't throw, just report
    return {
      deducted: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Perform the actual deduction within a Prisma transaction.
 */
async function performDeduction(
  item: {
    id: string;
    salon_id: string;
    brand: string | null;
    shade_code: string | null;
    shade_name: string | null;
    quantity_on_hand: number;
    low_stock_threshold: number | null;
  },
  gramsUsed: number,
  formulaId: string,
  salonId: string,
): Promise<{
  deducted: boolean;
  itemId: string;
  remaining: number;
  lowStock: boolean;
}> {
  const result = await prisma.$transaction(async (tx) => {
    // Re-read inside transaction for consistency
    const currentItem = await tx.inventory_items.findUnique({
      where: { id: item.id },
    });

    if (!currentItem) {
      throw new Error(`Inventory item ${item.id} not found during transaction`);
    }

    const newQty = currentItem.quantity_on_hand - gramsUsed;
    const lowStock =
      currentItem.low_stock_threshold !== null &&
      currentItem.low_stock_threshold !== undefined &&
      newQty <= currentItem.low_stock_threshold;

    // Update inventory quantity
    await tx.inventory_items.update({
      where: { id: currentItem.id },
      data: {
        quantity_on_hand: newQty,
        updated_at: new Date(),
      },
    });

    // Create transaction record
    await tx.inventory_transactions.create({
      data: {
        salon_id: salonId,
        item_id: currentItem.id,
        transaction_type: "deduct",
        quantity_change: gramsUsed,
        quantity_before: currentItem.quantity_on_hand,
        quantity_after: newQty,
        reason: "formula_mix",
        notes: "Auto-deducted on service completion",
        reference_type: "formula",
        reference_id: formulaId,
      },
    });

    return {
      itemId: currentItem.id,
      remaining: newQty,
      lowStock,
    };
  });

  return {
    deducted: true,
    itemId: result.itemId,
    remaining: result.remaining,
    lowStock: result.lowStock,
  };
}

/**
 * Deduct inventory for all shade components of a formulation.
 * Used when a formulation (with multiple shade components) is completed.
 */
export async function autoDeductFormulation(
  formulationId: string,
  salonId: string,
  defaultGramsPerComponent: number = 30,
): Promise<
  Array<{
    componentType: string;
    shadeCode: string | null;
    deducted: boolean;
    remaining?: number;
    lowStock?: boolean;
    error?: string;
  }>
> {
  try {
    // Get formulation components
    const components = await prisma.formulation_components.findMany({
      where: { formulation_id: formulationId },
      orderBy: { sequence_order: "asc" },
    });

    if (components.length === 0) {
      console.warn(
        `[auto-deduct] No components found for formulation ${formulationId}, skipping`,
      );
      return [];
    }

    const results: Array<{
      componentType: string;
      shadeCode: string | null;
      deducted: boolean;
      remaining?: number;
      lowStock?: boolean;
      error?: string;
    }> = [];

    for (const component of components) {
      // Developer is a real cost (20-40% of product volume) -- deduct it like
      // other components. Developer inventory items are matched by brand + volume
      // label (e.g. "20 Vol") stored as shade_code.
      const brand = component.brand;
      const shadeCode = component.shade_code;

      if (!brand || !shadeCode) {
        results.push({
          componentType: component.component_type,
          shadeCode: shadeCode,
          deducted: false,
          error: "Missing brand or shade code",
        });
        continue;
      }

      // Calculate grams from amount_oz if available, otherwise use default
      const gramsUsed = component.amount_oz
        ? Math.round(Number(component.amount_oz) * 28.35)
        : defaultGramsPerComponent;

      // Find matching inventory item
      const inventoryItem = await prisma.inventory_items.findFirst({
        where: {
          salon_id: salonId,
          brand: brand,
          shade_code: shadeCode,
          is_active: true,
        },
      });

      if (!inventoryItem) {
        // Try shade_name fallback
        const altItem = await prisma.inventory_items.findFirst({
          where: {
            salon_id: salonId,
            brand: brand,
            shade_name: shadeCode,
            is_active: true,
          },
        });

        if (!altItem) {
          results.push({
            componentType: component.component_type,
            shadeCode: shadeCode,
            deducted: false,
            error: "No matching inventory item",
          });
          continue;
        }

        const deduction = await performDeduction(
          altItem,
          gramsUsed,
          formulationId,
          salonId,
        );
        results.push({
          componentType: component.component_type,
          shadeCode: shadeCode,
          ...deduction,
        });
        continue;
      }

      const deduction = await performDeduction(
        inventoryItem,
        gramsUsed,
        formulationId,
        salonId,
      );
      results.push({
        componentType: component.component_type,
        shadeCode: shadeCode,
        ...deduction,
      });
    }

    return results;
  } catch (error) {
    console.error("[auto-deduct] Error during formulation deduction:", error);
    return [
      {
        componentType: "unknown",
        shadeCode: null,
        deducted: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    ];
  }
}