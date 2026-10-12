/**
 * Phorest Appointment Integration
 *
 * Pulls appointment data from Phorest for client tracking and service history.
 * Maps Phorest appointments to COLORiq visit tracking.
 *
 * @see https://developer.phorest.com/reference/getappointments.md
 */

import { prisma } from '@/lib/prisma';
import { PhorestClient } from './phorest-client';
import {
  PhorestCredentials,
  PhorestAppointment,
  PhorestServiceHistory,
  PhorestSyncResult,
} from './types';

// ── Date Helpers ──

function phorestDateToDateTime(dateStr: string, timeStr?: string): Date {
  if (timeStr) {
    return new Date(`${dateStr}T${timeStr}`);
  }
  return new Date(dateStr);
}

function getDateString(daysAgo = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

function getDateTimeString(daysAgo = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

// ── Sync Appointments ──

export interface AppointmentSyncOptions {
  salonId: string;
  branchId: string;
  credentials: PhorestCredentials;
  fromDate?: string; // yyyy-MM-dd
  toDate?: string; // yyyy-MM-dd
  clientId?: string;
  staffId?: string;
  includeCancelled?: boolean;
  includeDeleted?: boolean;
  includeArchived?: boolean;
  dryRun?: boolean;
}

/**
 * Sync appointments from Phorest to COLORiq client_visits
 */
export async function syncPhorestAppointments(
  options: AppointmentSyncOptions
): Promise<PhorestSyncResult> {
  const {
    salonId,
    branchId,
    credentials,
    fromDate,
    toDate,
    clientId,
    staffId,
    includeCancelled = false,
    includeDeleted = false,
    includeArchived = false,
    dryRun = false,
  } = options;

  const startTime = Date.now();
  const client = new PhorestClient(credentials);

  const result: PhorestSyncResult = {
    success: true,
    entityType: 'appointments',
    itemsSynced: 0,
    itemsFailed: 0,
    errors: [],
    hasMore: false,
    durationMs: 0,
  };

  let page = 0;
  let totalSynced = 0;
  const pageSize = 100;

  // Default date range: last 30 days to next 30 days
  const defaultFrom = fromDate || getDateString(30);
  const defaultTo = toDate || getDateString(-30);

  try {
    do {
      const response = await client.listAppointments(branchId, {
        page,
        size: pageSize,
        from_date: defaultFrom,
        to_date: defaultTo,
        staff_id: staffId,
        client_id: clientId,
        fetch_canceled: includeCancelled,
        fetch_deleted: includeDeleted,
        fetch_archived: includeArchived,
        fetch_online_category: true,
        fetch_notes: true,
      });

      const appointments = response._embedded || {};
      const appointmentList: PhorestAppointment[] = Object.values(appointments).flat() as PhorestAppointment[];
      const pageMeta = response.page;

      if (dryRun) {
        totalSynced += appointmentList.length;
        console.log(`[Phorest Appointments] Dry run: page ${page}, ${appointmentList.length} appointments`);
      } else {
        for (const appt of appointmentList) {
          try {
            if (!appt.clientId) {
              // Walk-in or unlinked appointment — skip or create placeholder
              console.log(`[Phorest Appointments] Skipping appointment ${appt.appointmentId} — no client linked`);
              continue;
            }

            // Find or create the client in our system
            // First, try to find by external mapping (we'd store phorest_client_id)
            // For now, we'll look up by matching or create a minimal record
            let cgClient = await prisma.clients.findFirst({
              where: {
                salon_id: salonId,
                OR: [
                  // Match by general notes containing Phorest client ID
                  { general_notes: { contains: appt.clientId } },
                ],
              },
            });

            // If not found, try to fetch client details from Phorest and create
            if (!cgClient) {
              try {
                const phClient = await client.getClient(appt.clientId);
                cgClient = await prisma.clients.create({
                  data: {
                    salon_id: salonId,
                    first_name: phClient.firstName || 'Unknown',
                    last_name: phClient.lastName || 'Client',
                    email: phClient.email || null,
                    phone: phClient.mobile || null,
                    date_of_birth: phClient.birthDate ? new Date(phClient.birthDate) : null,
                    gender: phClient.gender?.toLowerCase() || null,
                    general_notes: `Phorest client ID: ${phClient.clientId}\n${phClient.notes || ''}`,
                    marketing_consent: phClient.emailMarketingConsent || false,
                    last_visit_at: new Date(),
                    total_visits: 1,
                  },
                });
              } catch (clientError) {
                // If we can't fetch client details, create placeholder
                cgClient = await prisma.clients.create({
                  data: {
                    salon_id: salonId,
                    first_name: 'Unknown',
                    last_name: 'Client',
                    general_notes: `Phorest client ID: ${appt.clientId}`,
                    last_visit_at: new Date(),
                    total_visits: 1,
                  },
                });
              }
            }

            // Create or update visit record
            const visitDate = phorestDateToDateTime(appt.appointmentDate, appt.startTime);
            const visitId = `phorest-${appt.appointmentId}`;

            // Check if visit already exists by custom ID
            const existingVisit = await prisma.client_visits.findFirst({
              where: {
                client_id: cgClient.id,
                visit_date: visitDate,
              },
            });

            if (existingVisit) {
              await prisma.client_visits.update({
                where: { id: existingVisit.id },
                data: {
                  services: appt.serviceId ? [appt.serviceId] : [],
                  notes: `Phorest appointment ${appt.appointmentId}. Price: $${appt.price || 0}. Confirmed: ${appt.confirmed ? 'Yes' : 'No'}`,
                },
              });
            } else {
              await prisma.client_visits.create({
                data: {
                  id: visitId,
                  client_id: cgClient.id,
                  salon_id: salonId,
                  stylist_id: null, // We'd need to map Phorest staffId to our stylist
                  visit_date: visitDate,
                  services: appt.serviceId ? [appt.serviceId] : [],
                  products_used: [],
                  notes: `Phorest appointment ${appt.appointmentId}. Price: $${appt.price || 0}. Confirmed: ${appt.confirmed ? 'Yes' : 'No'}`,
                  satisfaction_rating: null,
                  before_photo_url: null,
                  after_photo_url: null,
                },
              });
            }

            // Update client's last visit
            await prisma.clients.update({
              where: { id: cgClient.id },
              data: {
                last_visit_at: visitDate > (cgClient.last_visit_at || new Date(0)) ? visitDate : cgClient.last_visit_at,
              },
            });

            totalSynced++;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            result.itemsFailed++;
            result.errors.push({
              itemId: appt.appointmentId,
              error: message,
            });
            console.error(`[Phorest Appointments] Failed to sync appointment ${appt.appointmentId}:`, message);
          }
        }
      }

      page++;
      result.hasMore = page < (pageMeta?.totalPages || 0);
    } while (result.hasMore && totalSynced < 5000); // Safety limit

    result.itemsSynced = totalSynced;
    result.success = result.itemsFailed === 0 || result.itemsSynced > 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Phorest Appointments] Sync failed:', message);
    result.success = false;
    result.errors.push({ error: message });
  }

  result.durationMs = Date.now() - startTime;
  return result;
}

// ── Service History ──

export interface ServiceHistorySyncOptions {
  salonId: string;
  credentials: PhorestCredentials;
  clientIds?: string[]; // Phorest client IDs
  updatedAfter?: string;
  dryRun?: boolean;
}

/**
 * Sync client service histories from Phorest.
 * Service histories are richer than appointments — they contain actual service details.
 */
export async function syncPhorestServiceHistories(
  options: ServiceHistorySyncOptions
): Promise<PhorestSyncResult> {
  const { salonId, credentials, clientIds, dryRun = false } = options;

  const startTime = Date.now();
  const client = new PhorestClient(credentials);

  const result: PhorestSyncResult = {
    success: true,
    entityType: 'services',
    itemsSynced: 0,
    itemsFailed: 0,
    errors: [],
    hasMore: false,
    durationMs: 0,
  };

  try {
    if (clientIds && clientIds.length > 0) {
      // Sync specific clients
      for (const phClientId of clientIds) {
        try {
          const response = await client.getClientServiceHistories(phClientId);
          const histories = response._embedded?.serviceHistories || [];

          if (dryRun) {
            result.itemsSynced += histories.length;
            continue;
          }

          // Find COLORiq client
          const cgClient = await prisma.clients.findFirst({
            where: {
              salon_id: salonId,
              general_notes: { contains: phClientId },
            },
          });

          if (!cgClient) {
            result.errors.push({ itemId: phClientId, error: 'Client not found in COLORiq' });
            continue;
          }

          // Update visit records with service history
          for (const history of histories) {
            await prisma.client_visits.upsert({
              where: {
                id: cgClient.id, // This needs a proper unique key
              },
              update: {
                services: [history.serviceName],
                notes: `Service: ${history.serviceName} | Staff: ${history.staffName} | Price: $${history.price}`,
              },
              create: {
                client_id: cgClient.id,
                salon_id: salonId,
                visit_date: new Date(history.appointmentDate),
                services: [history.serviceName],
                notes: `Service: ${history.serviceName} | Staff: ${history.staffName} | Price: $${history.price}`,
              },
            });

            result.itemsSynced++;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          result.itemsFailed++;
          result.errors.push({ itemId: phClientId, error: message });
        }
      }
    } else {
      // Sync all clients (paginated)
      let clientPage = 0;
      const pageSize = 50;

      do {
        const response = await client.listClients({
          page: clientPage,
          size: pageSize,
          includeDeleted: false,
        });

        const clients = response._embedded || {};
        const clientList = Object.values(clients).flat() as unknown as Array<{ clientId: string }>;

        if (clientList.length === 0) break;

        for (const phClient of clientList) {
          try {
            const historyResponse = await client.getClientServiceHistories(phClient.clientId);
            const histories = historyResponse._embedded?.serviceHistories || [];

            if (dryRun) {
              result.itemsSynced += histories.length;
              continue;
            }

            // Find COLORiq client
            const cgClient = await prisma.clients.findFirst({
              where: {
                salon_id: salonId,
                general_notes: { contains: phClient.clientId },
              },
            });

            if (!cgClient) continue;

            for (const history of histories) {
              await prisma.client_visits.upsert({
                where: { id: cgClient.id },
                update: {
                  services: [history.serviceName],
                  notes: `Service: ${history.serviceName} | Staff: ${history.staffName} | Price: $${history.price}`,
                },
                create: {
                  client_id: cgClient.id,
                  salon_id: salonId,
                  visit_date: new Date(history.appointmentDate),
                  services: [history.serviceName],
                  notes: `Service: ${history.serviceName} | Staff: ${history.staffName} | Price: $${history.price}`,
                },
              });

              result.itemsSynced++;
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            result.itemsFailed++;
            result.errors.push({ itemId: phClient.clientId, error: message });
          }
        }

        clientPage++;
      } while (result.itemsSynced < 10000);
    }

    result.success = result.itemsFailed === 0 || result.itemsSynced > 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.success = false;
    result.errors.push({ error: message });
  }

  result.durationMs = Date.now() - startTime;
  return result;
}

/**
 * Get upcoming appointments for a salon
 */
export async function getPhorestUpcomingAppointments(
  salonId: string,
  options: {
    credentials: PhorestCredentials;
    branchId: string;
    days?: number;
    staffId?: string;
  }
) {
  const { credentials, branchId, days = 7, staffId } = options;
  const client = new PhorestClient(credentials);

  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);

  const fromDate = today.toISOString().split('T')[0];
  const toDate = futureDate.toISOString().split('T')[0];

  const response = await client.listAppointments(branchId, {
    from_date: fromDate,
    to_date: toDate,
    staff_id: staffId,
    fetch_canceled: false,
    fetch_deleted: false,
    fetch_archived: false,
    size: 100,
  });

  const appointments = response._embedded || {};
  const apptList: PhorestAppointment[] = Object.values(appointments).flat() as PhorestAppointment[];

  return {
    appointments: apptList.map((appt) => ({
      id: appt.appointmentId,
      clientId: appt.clientId,
      staffId: appt.staffId,
      date: appt.appointmentDate,
      startTime: appt.startTime,
      endTime: appt.endTime,
      serviceId: appt.serviceId,
      price: appt.price,
      confirmed: appt.confirmed,
    })),
    total: apptList.length,
    dateRange: { from: fromDate, to: toDate },
  };
}
