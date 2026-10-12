import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generatePortalToken } from '@/lib/portal-token'

// POST /api/v1/clients/[id]/send-portal-link — generate token & send SMS
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params
    const body = await req.json()
    const { phone, stylistId } = body

    // Find client
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        first_name: true,
        phone: true,
        portal_token: true,
        portal_enabled: true,
        primary_stylist_id: true,
        stylists: {
          select: {
            portal_enabled: true,
            first_name: true,
            display_name: true,
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Check if stylist has portal enabled
    if (!client.stylists?.portal_enabled) {
      return NextResponse.json({ error: 'Client portal is disabled for this stylist' }, { status: 403 })
    }

    // Generate or reuse persistent token
    let token = client.portal_token
    if (!token) {
      token = generatePortalToken()
      await prisma.clients.update({
        where: { id: clientId },
        data: { portal_token: token },
      })
    }

    const targetPhone = phone || client.phone
    if (!targetPhone) {
      return NextResponse.json({ error: 'No phone number available', token }, { status: 400 })
    }

    const stylistName = client.stylists?.display_name || client.stylists?.first_name || 'Your stylist'
    const portalUrl = `https://coloriq.co/c/${token}`

    const message = `Hi ${client.first_name}! ${stylistName} has shared your color history with you. View your before/after photos, formula details, and care tips: ${portalUrl}`

    // Send SMS via Twilio (if configured)
    const twilioSid = process.env.TWILIO_ACCOUNT_SID
    const twilioToken = process.env.TWILIO_AUTH_TOKEN
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER

    if (twilioSid && twilioToken && twilioFrom) {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`
      const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')

      const smsRes = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: targetPhone,
          From: twilioFrom,
          Body: message,
        }),
      })

      if (!smsRes.ok) {
        const err = await smsRes.json()
        console.error('Twilio error:', err)
        return NextResponse.json({
          error: 'SMS send failed',
          token,
          portalUrl,
          message: 'Token generated but SMS failed. Copy the link manually.',
        }, { status: 502 })
      }
    } else {
      // No SMS provider configured — return the link for manual sending
      console.log('[Portal Link] No Twilio configured. Link:', portalUrl)
    }

    return NextResponse.json({
      ok: true,
      token,
      portalUrl,
      phone: targetPhone,
      smsSent: !!(twilioSid && twilioToken),
      message: twilioSid ? 'SMS sent successfully' : 'Portal link generated. Configure Twilio to send SMS automatically.',
    })
  } catch (error: any) {
    console.error('Send portal link error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
