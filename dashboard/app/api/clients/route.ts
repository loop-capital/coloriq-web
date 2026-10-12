import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIdentifier } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  // Rate limiting
  const clientIdentifier = getClientIdentifier(request);
  const rateLimitResult = rateLimit(clientIdentifier, 60000, 30);
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const search = searchParams.get('search');

    if (id) {
      const client = await prisma.clients.findUnique({ where: { id } });
      if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      return NextResponse.json({
        client: {
          id: client.id,
          salonId: client.salon_id,
          name: `${client.first_name} ${client.last_name}`,
          email: client.email,
          phone: client.phone,
          notes: client.general_notes,
          createdAt: client.created_at,
          lastVisit: client.last_visit_at,
          favoriteBrand: null,
          conditions: [],
        }
      });
    }

    const where: any = {};
    if (search) {
      const q = search.toLowerCase();
      where.OR = [
        { first_name: { contains: q, mode: 'insensitive' } },
        { last_name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ];
    }

    const clients = await prisma.clients.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    const mapped = clients.map(c => ({
      id: c.id,
      salonId: c.salon_id,
      name: `${c.first_name} ${c.last_name}`,
      email: c.email,
      phone: c.phone,
      notes: c.general_notes,
      createdAt: c.created_at,
      lastVisit: c.last_visit_at,
      favoriteBrand: null,
      conditions: [],
      visits: c.total_visits,
    }));

    return NextResponse.json({ clients: mapped, total: mapped.length });
  } catch (error) {
    console.error('GET /api/clients error:', error);
    return NextResponse.json({ error: 'Failed to load clients' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
    }

    const nameParts = body.name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    const client = await prisma.clients.create({
      data: {
        first_name: firstName,
        last_name: lastName,
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        general_notes: body.notes?.trim() || null,
        // Persist questionnaire hair data when provided (questionnaire sends hairProfile/allergies)
        ...(body.hairProfile ? { hair_profile: body.hairProfile } : {}),
        ...(body.allergies ? { allergies_legacy: body.allergies } : {}),
      },
    });

    return NextResponse.json({
      client: {
        id: client.id,
        name: `${client.first_name} ${client.last_name}`,
        email: client.email,
        phone: client.phone,
        notes: client.general_notes,
        createdAt: client.created_at,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/clients error:', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
