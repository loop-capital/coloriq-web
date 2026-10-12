import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createSalonClient, isConnected } from '@/lib/square-multi';
import { getUserFromRequest } from '@/lib/auth';
import { getSalonIdForUser } from '@/lib/stylist';

const prisma = new PrismaClient();

async function getAuthUser(request: Request) {
  const authUser = await getUserFromRequest(request);
  if (!authUser) return null;
  const salon_id = await getSalonIdForUser(authUser.userId);
  return { id: authUser.userId, email: authUser.email, salon_id: salon_id || undefined };
}

// Map Square customer to COLORiq client schema
function mapSquareCustomer(customer: any, salonId: string) {
  // Square SDK v44 customer fields are camelCase (givenName, emailAddress, ...),
  // not the snake_case this previously assumed — every synced client was
  // silently coming through as "Unknown" with no email/phone before this fix.
  const name = `${customer.givenName || ''} ${customer.familyName || ''}`.trim();
  return {
    first_name: customer.givenName || name || 'Unknown',
    last_name: customer.familyName || '',
    email: customer.emailAddress || null,
    phone: customer.phoneNumber || null,
    square_customer_id: customer.id,
    salon_id: salonId,
    general_notes: customer.note || null,
  };
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const salonId = body.salon_id || user.salon_id;

    if (!salonId) {
      return NextResponse.json({ error: 'Salon ID required' }, { status: 400 });
    }

    // Check Square is connected for this salon
    if (!(await isConnected(salonId))) {
      return NextResponse.json({ error: 'Square not connected for this salon' }, { status: 400 });
    }

    const squareConn = await prisma.square_connections.findFirst({
      where: { salon_id: salonId },
    });
    if (!squareConn) {
      return NextResponse.json({ error: 'Square not connected for this salon' }, { status: 400 });
    }

    const stats = { imported: 0, updated: 0, skipped: 0, errors: 0, details: [] as any[] };

    const square = await createSalonClient(salonId);
    if (!square) {
      return NextResponse.json({ error: 'Square not connected for this salon' }, { status: 400 });
    }

    // Paginate through all Square customers (100 per page)
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const result: any = await square.customers.list({ cursor, limit: 100 });
      const customers = result.data || [];

      for (const customer of customers) {
        try {
          const mapped = mapSquareCustomer(customer, salonId);

          // Upsert: match by square_customer_id first, then email
          let existing = await prisma.clients.findFirst({
            where: { square_customer_id: customer.id },
          });

          if (!existing && mapped.email) {
            existing = await prisma.clients.findFirst({
              where: {
                salon_id: salonId,
                email: mapped.email,
              },
            });
          }

          if (existing) {
            // Update — only overwrite fields Square provides, keep existing ones
            await prisma.clients.update({
              where: { id: existing.id },
              data: {
                first_name: mapped.first_name,
                last_name: mapped.last_name,
                email: mapped.email || existing.email,
                phone: mapped.phone || existing.phone,
                square_customer_id: mapped.square_customer_id,
                general_notes: mapped.general_notes || existing.general_notes,
                updated_at: new Date(),
              },
            });
            stats.updated++;
            stats.details.push({ square_id: customer.id, action: 'updated', client_id: existing.id });
          } else {
            // Create new client
            const newClient = await prisma.clients.create({
              data: mapped,
            });
            stats.imported++;
            stats.details.push({ square_id: customer.id, action: 'created', client_id: newClient.id });
          }
        } catch (err) {
          stats.errors++;
          stats.details.push({ square_id: customer.id, action: 'error', error: err instanceof Error ? err.message : 'Unknown error' });
        }
      }

      cursor = result.response?.cursor;
      hasMore = !!cursor && customers.length === 100;
    }

    // Update last sync timestamp
    await prisma.square_connections.update({
      where: { id: squareConn.id },
      data: { last_sync_at: new Date() },
    });

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('[square/clients/sync] Error:', error);
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 });
  }
}
