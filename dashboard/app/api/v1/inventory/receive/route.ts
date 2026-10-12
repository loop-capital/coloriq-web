import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { getSalonIdForUser } from "@/lib/stylist";
import { defaultContainerGrams } from "@/lib/inventory/container-defaults";

/**
 * POST /api/v1/inventory/receive
 * Manual "I opened/received a new container" entry — the gram-native
 * baseline ColorIq relies on instead of Square's per-bottle count
 * (which is a different, incompatible unit). Matches Vish's own onboarding
 * flow: a manual stock count/entry to establish real gram numbers, since
 * neither Square's catalog nor a distributor order exposes container
 * weight. Increments quantity_on_hand for an existing item, or creates one
 * if this is the first time this product has been received.
 */
const receiveSchema = z.object({
  item_id: z.string().uuid().optional(),
  brand: z.string().min(1).max(100).optional(),
  shade_code: z.string().min(1).max(50).optional(),
  shade_name: z.string().max(100).optional(),
  category: z.enum(["color", "developer", "treatment", "other"]).optional(),
  grams: z.number().positive(),
  save_as_default: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  // Convenience for the Receive Stock form: given a product, what grams
  // should we prefill? Salon-saved typical_container_grams if set,
  // otherwise the generic per-category default.
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const salon_id = await getSalonIdForUser(user.userId);
  if (!salon_id) return NextResponse.json({ error: "Your account isn't linked to a salon yet." }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("item_id");
  const category = searchParams.get("category");

  if (itemId) {
    const item = await prisma.inventory_items.findFirst({ where: { id: itemId, salon_id } });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    return NextResponse.json({
      suggested_grams: item.typical_container_grams ?? defaultContainerGrams(item.category),
      is_saved_default: item.typical_container_grams != null,
    });
  }

  return NextResponse.json({ suggested_grams: defaultContainerGrams(category), is_saved_default: false });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const salon_id = await getSalonIdForUser(user.userId);
    if (!salon_id) return NextResponse.json({ error: "Your account isn't linked to a salon yet." }, { status: 400 });

    const body = await req.json();
    const parsed = receiveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
    }
    const data = parsed.data;

    if (!data.item_id && !(data.brand && data.shade_code)) {
      return NextResponse.json(
        { error: "Provide either item_id or brand + shade_code" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = data.item_id
        ? await tx.inventory_items.findFirst({ where: { id: data.item_id, salon_id } })
        : await tx.inventory_items.findFirst({
            where: { salon_id, brand: data.brand, shade_code: data.shade_code },
          });

      if (existing) {
        const quantityBefore = existing.quantity_on_hand;
        const quantityAfter = quantityBefore + data.grams;
        const updated = await tx.inventory_items.update({
          where: { id: existing.id },
          data: {
            quantity_on_hand: quantityAfter,
            is_active: true,
            updated_at: new Date(),
            ...(data.save_as_default ? { typical_container_grams: data.grams } : {}),
          },
        });
        await tx.inventory_transactions.create({
          data: {
            salon_id,
            item_id: existing.id,
            transaction_type: "receive",
            quantity_change: data.grams,
            quantity_before: quantityBefore,
            quantity_after: quantityAfter,
            reason: "container_received",
            notes: "Received new container",
          },
        });
        return updated;
      }

      if (!data.brand || !data.shade_code) {
        throw new Error("NEW_ITEM_NEEDS_BRAND_AND_SHADE");
      }

      const created = await tx.inventory_items.create({
        data: {
          salon_id,
          source: "manual",
          brand: data.brand,
          shade_code: data.shade_code,
          shade_name: data.shade_name || data.shade_code,
          category: data.category || "other",
          quantity_on_hand: data.grams,
          unit_of_measure: "grams",
          ...(data.save_as_default ? { typical_container_grams: data.grams } : {}),
        },
      });
      await tx.inventory_transactions.create({
        data: {
          salon_id,
          item_id: created.id,
          transaction_type: "receive",
          quantity_change: data.grams,
          quantity_before: 0,
          quantity_after: data.grams,
          reason: "container_received",
          notes: "Received first container — item created",
        },
      });
      return created;
    });

    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    if (e instanceof Error && e.message === "NEW_ITEM_NEEDS_BRAND_AND_SHADE") {
      return NextResponse.json(
        { error: "No matching item found — provide brand and shade_code to create one" },
        { status: 404 },
      );
    }
    console.error("POST /api/v1/inventory/receive error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
