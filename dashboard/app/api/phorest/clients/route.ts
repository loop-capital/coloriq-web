/**
 * GET /api/phorest/clients
 * Search clients in Phorest and sync to COLORiq
 *
 * POST /api/phorest/clients
 * Sync specific clients or all clients from Phorest
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncPhorestServiceHistories, loadPhorestConnection, createPhorestClient } from '@/integrations/phorest';
import { prisma } from '@/lib/prisma';

import { getUserFromRequest } from '@/lib/auth';
import { getSalonIdForUser } from '@/lib/stylist';

async function resolveSalonId(request: NextRequest): Promise<string | null> {
  const authUser = await getUserFromRequest(request);
  if (!authUser) return null;
  return getSalonIdForUser(authUser.userId);
}

export async function GET(request: NextRequest) {
  const salonId = await resolveSalonId(request);
  if (!salonId) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '0', 10);
    const size = Math.min(parseInt(searchParams.get('size') || '20', 10), 100);

    const connection = await loadPhorestConnection(salonId);
    if (!connection) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_CONNECTED', message: 'Phorest not connected' },
      }, { status: 400 });
    }

    const credentials = {
      username: connection.username,
      password: connection.password,
      businessId: connection.business_id,
      region: connection.region,
    };

    const client = createPhorestClient(credentials);

    // Search clients in Phorest
    const response = await client.listClients({
      page,
      size,
      firstName: search || undefined,
      lastName: search || undefined,
      email: search?.includes('@') ? search : undefined,
      phone: search?.match(/^\d/) ? search : undefined,
      includeArchived: false,
    });

    const clients = response._embedded?.clients || [];

    return NextResponse.json({
      success: true,
      data: {
        clients: clients.map((c) => ({
          phorest_client_id: c.clientId,
          first_name: c.firstName,
          last_name: c.lastName,
          email: c.email,
          phone: c.mobile,
          date_of_birth: c.birthDate,
          gender: c.gender,
          notes: c.notes,
          marketing_consent: c.emailMarketingConsent,
          preferred_staff_id: c.preferredStaffId,
          external_id: c.externalId,
          creating_branch_id: c.creatingBranchId,
        })),
        page: {
          number: response.page?.number ?? 0,
          size: response.page?.size ?? 0,
          totalElements: response.page?.totalElements ?? 0,
          totalPages: response.page?.totalPages ?? 0,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to search clients';
    return NextResponse.json({
      success: false,
      error: { code: 'SEARCH_FAILED', message },
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const salonId = await resolveSalonId(request);
  if (!salonId) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { clientIds, dryRun = false, syncServiceHistory = true } = body;

    const connection = await loadPhorestConnection(salonId);
    if (!connection) {
      return NextResponse.json({
        success: false,
        error: { code: 'NOT_CONNECTED', message: 'Phorest not connected' },
      }, { status: 400 });
    }

    const credentials = {
      username: connection.username,
      password: connection.password,
      businessId: connection.business_id,
      region: connection.region,
    };

    const results: Array<{ type: string; synced: number; failed: number }> = [];

    // Sync clients directly via list
    const client = createPhorestClient(credentials);
    let totalSynced = 0;
    let totalFailed = 0;

    if (clientIds && clientIds.length > 0) {
      // Sync specific clients by ID
      for (const phClientId of clientIds) {
        try {
          const phClient = await client.getClient(phClientId);

          if (!dryRun) {
            // Check if client exists
            const existing = await prisma.clients.findFirst({
              where: {
                salon_id: salonId,
                OR: [
                  { email: phClient.email || undefined },
                  { general_notes: { contains: phClientId } },
                ],
              },
            });

            if (existing) {
              // Update
              await prisma.clients.update({
                where: { id: existing.id },
                data: {
                  first_name: phClient.firstName,
                  last_name: phClient.lastName,
                  email: phClient.email || existing.email,
                  phone: phClient.mobile || existing.phone,
                  date_of_birth: phClient.birthDate ? new Date(phClient.birthDate) : existing.date_of_birth,
                  gender: phClient.gender?.toLowerCase() || existing.gender,
                  general_notes: `Phorest client ID: ${phClientId}\n${phClient.notes || ''}`,
                  marketing_consent: phClient.emailMarketingConsent || false,
                  updated_at: new Date(),
                },
              });
            } else {
              // Create
              await prisma.clients.create({
                data: {
                  salon_id: salonId,
                  first_name: phClient.firstName,
                  last_name: phClient.lastName,
                  email: phClient.email || null,
                  phone: phClient.mobile || null,
                  date_of_birth: phClient.birthDate ? new Date(phClient.birthDate) : null,
                  gender: phClient.gender?.toLowerCase() || null,
                  general_notes: `Phorest client ID: ${phClientId}\n${phClient.notes || ''}`,
                  marketing_consent: phClient.emailMarketingConsent || false,
                },
              });
            }
          }

          totalSynced++;
        } catch (error) {
          totalFailed++;
          console.error(`[Phorest Clients] Failed to sync client ${phClientId}:`, error);
        }
      }

      results.push({ type: 'clients', synced: totalSynced, failed: totalFailed });

      // Sync service histories
      if (syncServiceHistory && !dryRun) {
        const historyResult = await syncPhorestServiceHistories({
          salonId,
          credentials,
          clientIds,
        });
        results.push({ type: 'service_history', synced: historyResult.itemsSynced, failed: historyResult.itemsFailed });
      }
    } else {
      // Bulk sync — paginate all clients
      let page = 0;
      const pageSize = 100;

      do {
        const response = await client.listClients({
          page,
          size: pageSize,
          includeArchived: false,
        });

        const clients = response._embedded?.clients || [];
        if (clients.length === 0) break;

        for (const phClient of clients) {
          try {
            if (!dryRun) {
              const existing = await prisma.clients.findFirst({
                where: {
                  salon_id: salonId,
                  OR: [
                    ...(phClient.email ? [{ email: phClient.email }] : []),
                    { general_notes: { contains: phClient.clientId } },
                  ],
                },
              });

              if (existing) {
                await prisma.clients.update({
                  where: { id: existing.id },
                  data: {
                    first_name: phClient.firstName,
                    last_name: phClient.lastName,
                    email: phClient.email || existing.email,
                    phone: phClient.mobile || existing.phone,
                    date_of_birth: phClient.birthDate ? new Date(phClient.birthDate) : existing.date_of_birth,
                    gender: phClient.gender?.toLowerCase() || existing.gender,
                    general_notes: `Phorest client ID: ${phClient.clientId}\n${phClient.notes || ''}`,
                    marketing_consent: phClient.emailMarketingConsent || false,
                    updated_at: new Date(),
                  },
                });
              } else {
                await prisma.clients.create({
                  data: {
                    salon_id: salonId,
                    first_name: phClient.firstName,
                    last_name: phClient.lastName,
                    email: phClient.email || null,
                    phone: phClient.mobile || null,
                    date_of_birth: phClient.birthDate ? new Date(phClient.birthDate) : null,
                    gender: phClient.gender?.toLowerCase() || null,
                    general_notes: `Phorest client ID: ${phClient.clientId}\n${phClient.notes || ''}`,
                    marketing_consent: phClient.emailMarketingConsent || false,
                  },
                });
              }
            }
            totalSynced++;
          } catch (error) {
            totalFailed++;
            console.error(`[Phorest Clients] Failed to sync client ${phClient.clientId}:`, error);
          }
        }

        page++;
      } while (totalSynced < 20000);

      results.push({ type: 'clients', synced: totalSynced, failed: totalFailed });
    }

    return NextResponse.json({
      success: totalFailed < totalSynced,
      data: {
        results,
        totalSynced,
        totalFailed,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Client sync failed';
    return NextResponse.json({
      success: false,
      error: { code: 'SYNC_FAILED', message },
    }, { status: 500 });
  }
}
