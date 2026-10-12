import { Decimal } from '@prisma/client/runtime/library'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyBearerToken } from '@/lib/auth'
import { priceCompletedSession } from '@/lib/pricing'
import { recordFormulaOutcome } from '@/lib/formula-memory'

interface CompletedStep {
  product: string
  shadeCode: string
  brand: string
  targetGrams: number
  actualGrams: number
  role: string
}

interface CompletedBody {
  steps: CompletedStep[]
  // Accepted but no longer trusted for the stored/charged amount — see
  // priceCompletedSession(). Money has to come from the server's own
  // pricing rules, not a number the client happened to send.
  totalCost?: number
  formulaId?: string
  clientId?: string
  createClientFormula?: boolean // opt-in to create a reusable formula record
}

// POST /api/v1/color-bar/session/:id/complete
// Mark a Color Bar session as completed, consume inventory, record formula usage,
// create reusable formula history (ClientFormulaUsage), and write stock audit logs.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await verifyBearerToken(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = (await req.json()) as CompletedBody
    const { steps, formulaId, clientId, createClientFormula } = body

    if (!steps || !Array.isArray(steps)) {
      return NextResponse.json({ error: 'Steps array is required' }, { status: 400 })
    }
    if (steps.length === 0) {
      return NextResponse.json({ error: 'Steps cannot be empty' }, { status: 400 })
    }

    // Load existing session to tie everything together.
    const session = await prisma.color_bar_sessions.findUnique({
      where: { id },
    })

    const salonId = session?.salon_id || undefined
    const stylistId = session?.stylist_id || user.userId
    const sessionClientId = session?.client_id || clientId

    // The charged amount is computed here from the salon's own pricing
    // rules (per-product cost × grams actually weighed, marked up per
    // costPlusPricing) — never from a client-supplied number. A salon with
    // no cost set yet for a product gets a $0 contribution for that
    // portion (surfaced via `pricingWarnings` below) rather than silently
    // trusting whatever the device sent.
    const pricing = salonId
      ? await priceCompletedSession(salonId, steps)
      : { totalCost: 0, wholesaleCost: 0, markupPercent: 0, missingCost: [], steps: [] }
    const safeTotalCost = pricing.totalCost

    // ── Update the session record ───────────────────────────────────────
    await prisma.color_bar_sessions.update({
      where: { id },
      data: {
        status: 'completed',
        steps: steps as any,
        total_cost: safeTotalCost,
        completed_at: new Date(),
      },
    })

    // ── Formula memory: log real target-vs-actual per ingredient ─────────
    // This is what a future visit's GET /color-bar/formulas/:clientId reads
    // to suggest a smaller mix (see lib/formula-memory.ts) — Vish's actual
    // "reweigh and learn" behavior, not a leftover-product-reuse concept.
    if (sessionClientId) {
      await Promise.all(
        steps
          .filter((s) => s.brand && s.shadeCode && s.targetGrams > 0 && s.actualGrams > 0)
          .map((s) =>
            recordFormulaOutcome({
              clientId: sessionClientId,
              brand: s.brand,
              shadeCode: s.shadeCode,
              targetGrams: s.targetGrams,
              actualGrams: s.actualGrams,
              source: 'color_bar',
            })
          )
      )
    }

    // ── UsageLog: only for sessions built from a real marketplace listing ──
    // formula_usage_log.formulaId has a real FK to formula_listings — a
    // color-bar session's formulaId (when the mobile app sends one at all)
    // is a synthetic client-side id, not a formula_listings row, and this
    // previously fell back to the session's OWN id when absent. Both cases
    // violated the FK and threw on every completion, 500ing the whole
    // request and (per the mobile client bug fixed earlier) getting
    // silently swallowed as a fake "success" toward the stylist. The
    // session's own color_bar_sessions.update() above is the real record
    // of what happened either way — this is supplementary marketplace
    // bookkeeping, only meaningful when a real listing is actually involved.
    if (salonId && formulaId) {
      const listing = await prisma.formula_listings.findUnique({ where: { id: formulaId } })
      if (listing) {
        await prisma.formula_usage_log.create({
          data: {
            salonId,
            formulaId,
            stylistId: stylistId || undefined,
            clientId: sessionClientId || undefined,
            feeAmount: safeTotalCost,
            creatorPayout: 0,
            platformFee: 0,
          },
        })
      }
    }

    // ── ClientFormulaUsage: create a reusable formula record if requested ─
    if (createClientFormula && sessionClientId) {
      // Build a formula name based on the primary brand + first shade.
      const primaryBrand = steps[0]?.brand || 'Custom'
      const primaryShade = steps[0]?.shadeCode || 'Mix'
      const formulaName = `${primaryBrand} ${primaryShade}`

      const formula = await prisma.formulas.create({
        data: {
          client_id: sessionClientId,
          stylist_id: stylistId,
          name: formulaName,
          product_brand: primaryBrand,
          product_line: steps[0]?.product || undefined,
          product_shade: primaryShade,
          notes: `Auto-saved from Color Bar session ${id}.`,
        },
      })

      // Persist each step as a formulation_component.
      await Promise.all(
        steps.map((step, index) =>
          prisma.formulation_components.create({
            data: {
              formulation_id: formula.id,
              component_type: step.role === 'developer' ? 'developer' : 'color',
              brand: step.brand,
              product_line: step.product,
              shade_code: step.shadeCode,
              amount_ml: new Decimal(step.actualGrams || 0),
              purpose: step.role,
              sequence_order: index + 1,
            },
          })
        )
      )
    }

    // ── Inventory + StockTransaction audit per used item ─────────────────
    // Idempotency: skip if this session was already deducted (prevents double-count
    // when both color-bar completion and visit completion fire for the same session)
    const existingDeductions = await prisma.inventory_transactions.findFirst({
      where: {
        reference_type: 'color_bar_session',
        reference_id: id,
        transaction_type: 'usage',
      },
      select: { id: true },
    })
    const alreadyDeducted = !!existingDeductions

    const stockUpdates: {
      brand: string
      shadeCode: string
      quantityUsed: number
      quantityBefore: number
      quantityAfter: number
      itemId: string
    }[] = []

    let totalWasteGrams = 0
    let totalWasteCost = 0

    for (const step of steps) {
      if (alreadyDeducted) continue
      if (!step.brand || !step.shadeCode) continue

      const gramsUsed = Math.max(step.actualGrams || step.targetGrams || 0, 0)
      if (gramsUsed <= 0) continue

      // Find or initialize inventory item for this salon/brand/shade.
      let item = salonId
        ? await prisma.inventory_items.findUnique({
            where: {
              salon_id_brand_shade_code: {
                salon_id: salonId,
                brand: step.brand,
                shade_code: step.shadeCode,
              },
            },
          })
        : null

      if (!item && salonId) {
        item = await prisma.inventory_items.create({
          data: {
            salon_id: salonId,
            brand: step.brand,
            product_line: step.product || undefined,
            shade_code: step.shadeCode,
            shade_name: `${step.brand} ${step.shadeCode}`,
            source: 'color-bar',
            quantity_on_hand: 0,
          },
        })
      }

      if (item) {
        const quantityBefore = item.quantity_on_hand
        const quantityAfter = Math.max(quantityBefore - gramsUsed, 0)

        await prisma.inventory_items.update({
          where: { id: item.id },
          data: {
            quantity_on_hand: quantityAfter,
            updated_at: new Date(),
          },
        })

        await prisma.inventory_transactions.create({
          data: {
            salon_id: item.salon_id,
            item_id: item.id,
            transaction_type: 'usage',
            quantity_change: -gramsUsed,
            quantity_before: quantityBefore,
            quantity_after: quantityAfter,
            reason: 'Color Bar session usage',
            reference_type: 'color_bar_session',
            reference_id: id,
            performed_by: stylistId || undefined,
            notes: `Used ${gramsUsed}g of ${step.brand} ${step.shadeCode} (${step.role}).`,
          },
        })

        stockUpdates.push({
          brand: step.brand,
          shadeCode: step.shadeCode,
          quantityUsed: gramsUsed,
          quantityBefore,
          quantityAfter,
          itemId: item.id,
        })

        // ── Waste tracking: over-mixed product (target - actual) ──────────
        // If the stylist mixed more than was applied, the excess also left
        // the tube — record it as a waste transaction so inventory stays
        // accurate and the waste dashboard has real data.
        const wasteGrams = Math.max((step.targetGrams || 0) - gramsUsed, 0)
        if (wasteGrams >= 0.5) {
          const wasteQty = Math.round(wasteGrams)
          const wasteBefore = quantityAfter
          const wasteAfter = Math.max(wasteBefore - wasteQty, 0)
          const costPerGram = item.cost_per_unit != null ? Number(item.cost_per_unit) : null

          await prisma.inventory_items.update({
            where: { id: item.id },
            data: { quantity_on_hand: wasteAfter, updated_at: new Date() },
          })

          await prisma.inventory_transactions.create({
            data: {
              salon_id: item.salon_id,
              item_id: item.id,
              transaction_type: 'waste',
              quantity_change: -wasteQty,
              quantity_before: wasteBefore,
              quantity_after: wasteAfter,
              unit_cost: costPerGram != null ? new Decimal(costPerGram) : null,
              total_cost: costPerGram != null ? new Decimal(costPerGram * wasteQty) : null,
              reason: 'Color Bar session waste',
              reference_type: 'color_bar_session',
              reference_id: id,
              performed_by: stylistId || undefined,
              notes: `Wasted ${wasteQty}g of ${step.brand} ${step.shadeCode} (mixed ${step.targetGrams}g, applied ${gramsUsed}g).`,
            },
          })

          stockUpdates.push({
            brand: step.brand,
            shadeCode: step.shadeCode,
            quantityUsed: wasteQty,
            quantityBefore: wasteBefore,
            quantityAfter: wasteAfter,
            itemId: item.id,
          })
          totalWasteGrams += wasteQty
          if (costPerGram != null) totalWasteCost += costPerGram * wasteQty
        }
      }
    }

    // Build receipt URL
    const receiptUrl = `/receipts/color-bar/${id}`

    return NextResponse.json({
      transactionId: id,
      receiptUrl,
      totalCost: safeTotalCost,
      wholesaleCost: pricing.wholesaleCost,
      markupPercent: pricing.markupPercent,
      pricingWarnings: pricing.missingCost.map(
        (m) => `No cost set for ${m.brand} ${m.shadeCode} — charged $0 for that portion. Set it in Inventory.`
      ),
      stepsCount: steps.length,
      totalGrams: steps.reduce((sum: number, s: CompletedStep) => sum + s.actualGrams, 0),
      stockUpdates,
      totalWasteGrams,
      totalWasteCost: Math.round(totalWasteCost * 100) / 100,
      formulaSaved: createClientFormula && !!sessionClientId,
      usageLogged: !!salonId,
    })
  } catch (error) {
    console.error('Color bar session complete error:', error)
    return NextResponse.json({ error: 'Failed to complete session' }, { status: 500 })
  }
}
