import { NextRequest, NextResponse } from 'next/server'
import { verifyBearerToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSalonIdForUser } from '@/lib/stylist'
import { createSalonClient, getConnection } from '@/lib/square-multi'
import { priceCompletedSession } from '@/lib/pricing'

interface StoredStep {
  product?: string
  shadeCode: string
  brand: string
  role: string
  actualGrams: number
  targetGrams?: number
}

// POST /api/v1/color-bar/square-order
// Push a COMPLETED Color Bar session onto the salon's own connected Square
// account/location as a real order. Line items and their prices are always
// re-derived server-side from the session's stored steps + the salon's own
// pricing rules — never from client-supplied items/prices — so nobody can
// hand-craft the amount that lands on a client's ticket.
export async function POST(req: NextRequest) {
  try {
    const user = await verifyBearerToken(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { sessionId } = body as { sessionId: string }
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    const salonId = await getSalonIdForUser(user.userId)
    if (!salonId) {
      return NextResponse.json(
        { error: 'Your account isn’t linked to a salon yet.' },
        { status: 400 }
      )
    }

    const session = await prisma.color_bar_sessions.findUnique({ where: { id: sessionId } })
    if (!session || session.salon_id !== salonId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (session.square_order_id) {
      return NextResponse.json(
        { error: 'This session was already pushed to Square.', squareOrderId: session.square_order_id },
        { status: 409 }
      )
    }

    const steps = (session.steps as unknown as StoredStep[]) || []
    if (steps.length === 0) {
      return NextResponse.json({ error: 'Session has no formula steps to charge for' }, { status: 400 })
    }

    const pricing = await priceCompletedSession(salonId, steps)
    if (pricing.steps.length === 0) {
      return NextResponse.json({ error: 'Nothing to charge — no product was weighed' }, { status: 400 })
    }

    const [squareClient, connection] = await Promise.all([
      createSalonClient(salonId),
      getConnection(salonId),
    ])

    if (!squareClient || !connection || !connection.location_ids[0]) {
      return NextResponse.json(
        {
          error: 'This salon hasn’t connected Square yet. Connect it from Settings first.',
          code: 'SQUARE_NOT_CONNECTED',
        },
        { status: 400 }
      )
    }

    const lineItems = pricing.steps.map((step) => ({
      name: `${step.brand} ${step.shadeCode}`,
      quantity: '1',
      basePriceMoney: {
        amount: BigInt(Math.round(step.clientCost * 100)),
        currency: 'USD' as const,
      },
    }))

    const idempotencyKey = `colorbar-${sessionId}-${Date.now()}`

    const response = await squareClient.orders.create({
      order: {
        locationId: connection.location_ids[0],
        lineItems,
        state: 'OPEN',
        source: { name: 'COLORiq Color Bar' },
      },
      idempotencyKey,
    })

    const order = response.order
    if (!order) {
      throw new Error('Square order creation returned no order')
    }

    await prisma.color_bar_sessions.update({
      where: { id: sessionId },
      data: { square_order_id: order.id },
    }).catch((err) => {
      console.error('Failed to link square_order_id to session:', err)
    })

    return NextResponse.json({
      squareOrderId: order.id,
      status: order.state,
      totalMoney: order.totalMoney,
      totalCost: pricing.totalCost,
      pricingWarnings: pricing.missingCost.map(
        (m) => `No cost set for ${m.brand} ${m.shadeCode} — charged $0 for that portion.`
      ),
      message: 'Order pushed to Square Register. Complete payment at the register.',
    })
  } catch (error: any) {
    console.error('Square order POST error:', error)
    return NextResponse.json({
      error: 'Failed to create Square order',
      details: error?.message || String(error),
    }, { status: 500 })
  }
}
