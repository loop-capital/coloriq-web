/**
 * Provider-agnostic "push a completed Color Bar session onto the salon's
 * own connected POS" — checks which provider (if any) the salon has
 * connected and pushes through that one. Line items and prices always
 * come from priceCompletedSession (server-side pricing rules), never from
 * client input, regardless of provider.
 *
 * Only Square and Clover can actually create a real order today. Phorest's
 * push happens automatically on their side (Sync+, see lib/phorest docs) once
 * connected, not via an API call from here. Vagaro/Zenoti/Mindbody have no
 * connection UI yet — see clover_connections/vagaro_connections/etc. for the
 * schema already in place for when real API access exists.
 */

import { prisma } from '@/lib/prisma'
import { createSalonClient, getConnection as getSquareConnection } from '@/lib/square-multi'
import { getConnection as getCloverConnection, createCloverOrder } from '@/lib/clover-multi'
import { priceCompletedSession } from '@/lib/pricing'

interface StoredStep {
  shadeCode: string
  brand: string
  role: string
  actualGrams: number
  targetGrams?: number
}

export type PosPushResult =
  | { ok: true; provider: 'square' | 'clover'; orderId: string; totalCost: number; pricingWarnings: string[] }
  | { ok: false; code: 'NOT_CONNECTED' | 'ALREADY_PUSHED' | 'NO_CHARGE'; message: string; existingOrderId?: string }

export async function pushSessionToConnectedPos(salonId: string, sessionId: string): Promise<PosPushResult> {
  const session = await prisma.color_bar_sessions.findUnique({ where: { id: sessionId } })
  if (!session || session.salon_id !== salonId) {
    return { ok: false, code: 'NOT_CONNECTED', message: 'Session not found' }
  }
  if (session.square_order_id) {
    return { ok: false, code: 'ALREADY_PUSHED', message: 'Already pushed', existingOrderId: session.square_order_id }
  }

  const steps = (session.steps as unknown as StoredStep[]) || []
  const pricing = await priceCompletedSession(salonId, steps)
  if (pricing.steps.length === 0) {
    return { ok: false, code: 'NO_CHARGE', message: 'Nothing to charge — no product was weighed' }
  }

  // Try Square first (most common), then Clover.
  const [squareClient, squareConn] = await Promise.all([createSalonClient(salonId), getSquareConnection(salonId)])
  if (squareClient && squareConn && squareConn.location_ids[0]) {
    const lineItems = pricing.steps.map((s) => ({
      name: `${s.brand} ${s.shadeCode}`,
      quantity: '1',
      basePriceMoney: { amount: BigInt(Math.round(s.clientCost * 100)), currency: 'USD' as const },
    }))
    const response = await squareClient.orders.create({
      order: { locationId: squareConn.location_ids[0], lineItems, state: 'OPEN', source: { name: 'COLORiq Color Bar' } },
      idempotencyKey: `colorbar-${sessionId}-${Date.now()}`,
    })
    const order = response.order
    if (!order?.id) throw new Error('Square order creation returned no order')
    await prisma.color_bar_sessions.update({ where: { id: sessionId }, data: { square_order_id: order.id } }).catch(() => {})
    return { ok: true, provider: 'square', orderId: order.id, totalCost: pricing.totalCost, pricingWarnings: pricing.missingCost.map((m) => `No cost set for ${m.brand} ${m.shadeCode}.`) }
  }

  const cloverConn = await getCloverConnection(salonId)
  if (cloverConn) {
    const lineItems = pricing.steps.map((s) => ({ name: `${s.brand} ${s.shadeCode}`, priceCents: Math.round(s.clientCost * 100) }))
    const { orderId } = await createCloverOrder(cloverConn, lineItems)
    // Reusing color_bar_sessions.square_order_id as the generic "pushed POS
    // order id" column (pre-existing, provider-agnostic in spirit even
    // though it predates multi-provider support) — the `provider` field on
    // this function's return is what actually distinguishes Clover from Square.
    await prisma.color_bar_sessions.update({ where: { id: sessionId }, data: { square_order_id: orderId } }).catch(() => {})
    return { ok: true, provider: 'clover', orderId, totalCost: pricing.totalCost, pricingWarnings: pricing.missingCost.map((m) => `No cost set for ${m.brand} ${m.shadeCode}.`) }
  }

  return { ok: false, code: 'NOT_CONNECTED', message: 'This salon hasn’t connected a POS yet. Connect one from Settings first.' }
}
