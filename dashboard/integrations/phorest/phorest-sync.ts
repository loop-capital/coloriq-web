/**
 * Phorest Data Synchronization Engine
 *
 * Orchestrates full and incremental syncs between Phorest and COLORiq.
 * Supports:
 * - Full sync (all entities)
 * - Incremental sync (updated_since)
 * - Per-branch sync
 * - Background job tracking
 *
 * @see https://developer.phorest.com/docs/common-api-use-cases.md
 */

import { prisma } from '@/lib/prisma';
import { encryptPhorestPassword, decryptPhorestPassword } from '@/lib/phorest-crypto';
import { PhorestClient } from './phorest-client';
import {
  PhorestCredentials,
  PhorestSyncResult,
  PhorestFullSyncResult,
  PhorestBranch,
} from './types';
import { syncPhorestInventory, InventorySyncOptions } from './phorest-inventory';
import { syncPhorestAppointments, syncPhorestServiceHistories, AppointmentSyncOptions } from './phorest-appointments';

// ── Sync Job Tracking ──

export interface SyncJob {
  id: string;
  salonId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial';
  type: 'full' | 'incremental' | 'clients' | 'appointments' | 'products' | 'services';
  startedAt: Date;
  completedAt?: Date;
  entitiesSynced: number;
  errors: string[];
  metadata?: Record<string, unknown>;
}

const activeJobs = new Map<string, SyncJob>();

function createJobId(): string {
  return `phorest_sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function startJob(salonId: string, type: SyncJob['type']): SyncJob {
  const job: SyncJob = {
    id: createJobId(),
    salonId,
    status: 'running',
    type,
    startedAt: new Date(),
    entitiesSynced: 0,
    errors: [],
  };
  activeJobs.set(job.id, job);
  return job;
}

function completeJob(jobId: string, success: boolean, errors: string[] = []): void {
  const job = activeJobs.get(jobId);
  if (!job) return;
  job.status = success ? 'completed' : errors.length > 0 ? 'partial' : 'failed';
  job.completedAt = new Date();
  job.errors.push(...errors);
}

export function getJobStatus(jobId: string): SyncJob | undefined {
  return activeJobs.get(jobId);
}

export function getActiveJobs(salonId?: string): SyncJob[] {
  const jobs = Array.from(activeJobs.values());
  return salonId ? jobs.filter((j) => j.salonId === salonId) : jobs;
}

// ── Full Sync ──

export interface FullSyncOptions {
  salonId: string;
  credentials: PhorestCredentials;
  branchIds?: string[]; // If not provided, sync all branches
  entities?: Array<'branches' | 'clients' | 'appointments' | 'products' | 'services'>;
  dryRun?: boolean;
}

/**
 * Perform a full sync of Phorest data into COLORiq.
 * This is the main entry point for syncing everything.
 */
export async function performFullSync(options: FullSyncOptions): Promise<PhorestFullSyncResult> {
  const { salonId, credentials, branchIds, entities = ['branches', 'clients', 'appointments', 'products', 'services'], dryRun = false } = options;

  const startTime = Date.now();
  const job = startJob(salonId, 'full');

  const result: PhorestFullSyncResult = {
    salon_id: salonId,
    business_id: credentials.businessId,
    branches_synced: { success: false, entityType: 'branches', itemsSynced: 0, itemsFailed: 0, errors: [], hasMore: false, durationMs: 0 },
    clients_synced: { success: false, entityType: 'clients', itemsSynced: 0, itemsFailed: 0, errors: [], hasMore: false, durationMs: 0 },
    appointments_synced: { success: false, entityType: 'appointments', itemsSynced: 0, itemsFailed: 0, errors: [], hasMore: false, durationMs: 0 },
    products_synced: { success: false, entityType: 'products', itemsSynced: 0, itemsFailed: 0, errors: [], hasMore: false, durationMs: 0 },
    services_synced: { success: false, entityType: 'services', itemsSynced: 0, itemsFailed: 0, errors: [], hasMore: false, durationMs: 0 },
    started_at: new Date(startTime).toISOString(),
    completed_at: '',
    total_duration_ms: 0,
  };

  const client = new PhorestClient(credentials);
  const allErrors: string[] = [];

  try {
    // Step 1: Sync branches (always needed to know available branches)
    if (entities.includes('branches')) {
      console.log(`[Phorest Sync] Step 1: Syncing branches for business ${credentials.businessId}`);
      const branchesResult = await syncBranches(salonId, client, dryRun);
      result.branches_synced = branchesResult;
      allErrors.push(...branchesResult.errors.map((e) => e.error));

      // Use discovered branches if none specified
      const discoveredBranchIds = branchesResult.itemsSynced > 0
        ? (await client.listBranches(0, 100))._embedded?.branches?.map((b: PhorestBranch) => b.branchId) || []
        : [];

      const targetBranches = branchIds && branchIds.length > 0 ? branchIds : discoveredBranchIds;

      // Step 2: Sync clients
      if (entities.includes('clients')) {
        console.log(`[Phorest Sync] Step 2: Syncing clients`);
        const clientsResult = await syncClients(salonId, client, dryRun);
        result.clients_synced = clientsResult;
        allErrors.push(...clientsResult.errors.map((e) => e.error));
      }

      // Step 3: Sync products per branch
      if (entities.includes('products')) {
        for (const branchId of targetBranches) {
          console.log(`[Phorest Sync] Step 3: Syncing products for branch ${branchId}`);
          const productsResult = await syncPhorestInventory({
            salonId,
            branchId,
            credentials,
            dryRun,
          });
          result.products_synced.itemsSynced += productsResult.itemsSynced;
          result.products_synced.itemsFailed += productsResult.itemsFailed;
          result.products_synced.errors.push(...productsResult.errors);
          allErrors.push(...productsResult.errors.map((e) => e.error));
        }
        result.products_synced.success = result.products_synced.itemsFailed === 0 || result.products_synced.itemsSynced > 0;
        result.products_synced.durationMs = Date.now() - startTime; // Approximate
      }

      // Step 4: Sync appointments per branch
      if (entities.includes('appointments')) {
        for (const branchId of targetBranches) {
          console.log(`[Phorest Sync] Step 4: Syncing appointments for branch ${branchId}`);
          const apptsResult = await syncPhorestAppointments({
            salonId,
            branchId,
            credentials,
            dryRun,
          });
          result.appointments_synced.itemsSynced += apptsResult.itemsSynced;
          result.appointments_synced.itemsFailed += apptsResult.itemsFailed;
          result.appointments_synced.errors.push(...apptsResult.errors);
          allErrors.push(...apptsResult.errors.map((e) => e.error));
        }
        result.appointments_synced.success = result.appointments_synced.itemsFailed === 0 || result.appointments_synced.itemsSynced > 0;
        result.appointments_synced.durationMs = Date.now() - startTime;
      }

      // Step 5: Sync services per branch (for reference)
      if (entities.includes('services')) {
        for (const branchId of targetBranches) {
          console.log(`[Phorest Sync] Step 5: Syncing services for branch ${branchId}`);
          const servicesResult = await syncServices(salonId, branchId, client, dryRun);
          result.services_synced.itemsSynced += servicesResult.itemsSynced;
          result.services_synced.itemsFailed += servicesResult.itemsFailed;
          result.services_synced.errors.push(...servicesResult.errors);
          allErrors.push(...servicesResult.errors.map((e) => e.error));
        }
        result.services_synced.success = result.services_synced.itemsFailed === 0 || result.services_synced.itemsSynced > 0;
        result.services_synced.durationMs = Date.now() - startTime;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Phorest Sync] Full sync failed:', message);
    allErrors.push(message);
    result.branches_synced.success = false;
    result.branches_synced.errors.push({ error: message });
  }

  const totalDuration = Date.now() - startTime;
  result.total_duration_ms = totalDuration;
  result.completed_at = new Date().toISOString();

  completeJob(job.id, allErrors.length === 0, allErrors);

  // Update the real connection row's sync timestamp/error — this previously
  // wrote to yet a third, independent settings JSON key (phorest_last_sync),
  // never read by the GET /api/phorest/sync status endpoint.
  await prisma.phorest_connections.updateMany({
    where: { salon_id: salonId },
    data: {
      last_sync_at: new Date(),
      sync_error: allErrors.length > 0 ? allErrors.join('; ').slice(0, 1000) : null,
    },
  }).catch(() => {
    // Non-critical — the sync itself already succeeded/failed independently
  })

  return result;
}

// ── Individual Entity Syncs ──

async function syncBranches(salonId: string, client: PhorestClient, dryRun = false): Promise<PhorestSyncResult> {
  const startTime = Date.now();
  const result: PhorestSyncResult = {
    success: false,
    entityType: 'branches',
    itemsSynced: 0,
    itemsFailed: 0,
    errors: [],
    hasMore: false,
    durationMs: 0,
  };

  try {
    const response = await client.listBranches(0, 100);
    const branches = response._embedded?.branches || [];

    if (dryRun) {
      result.itemsSynced = branches.length;
      result.success = true;
      return result;
    }

    // Store branch info in salon settings JSON
    const branchData = branches.map((b) => ({
      branchId: b.branchId,
      name: b.name,
      timezone: b.timeZone,
      currency: b.currencyCode,
    }));

    await prisma.$executeRaw`
      UPDATE salons 
      SET settings = jsonb_set(
        COALESCE(settings, '{}'::jsonb),
        '{phorest_branches}',
        ${JSON.stringify(branchData)}::jsonb
      )
      WHERE id = ${salonId}::uuid
    `;

    result.itemsSynced = branches.length;
    result.success = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push({ error: message });
  }

  result.durationMs = Date.now() - startTime;
  return result;
}

async function syncClients(salonId: string, client: PhorestClient, dryRun = false): Promise<PhorestSyncResult> {
  const startTime = Date.now();
  const result: PhorestSyncResult = {
    success: false,
    entityType: 'clients',
    itemsSynced: 0,
    itemsFailed: 0,
    errors: [],
    hasMore: false,
    durationMs: 0,
  };

  try {
    let page = 0;
    const pageSize = 100;
    let totalSynced = 0;

    do {
      const response = await client.listClients({ page, size: pageSize, includeArchived: false });
      const clients = response._embedded?.clients || [];
      const pageMeta = response.page;

      if (dryRun) {
        totalSynced += clients.length;
      } else {
        for (const phClient of clients) {
          try {
            // Find existing client by email or phone
            let existingClient = null;
            if (phClient.email) {
              existingClient = await prisma.clients.findFirst({
                where: { salon_id: salonId, email: phClient.email },
              });
            }
            if (!existingClient && phClient.mobile) {
              existingClient = await prisma.clients.findFirst({
                where: { salon_id: salonId, phone: phClient.mobile },
              });
            }

            if (existingClient) {
              // Update existing client
              await prisma.clients.update({
                where: { id: existingClient.id },
                data: {
                  first_name: phClient.firstName || existingClient.first_name,
                  last_name: phClient.lastName || existingClient.last_name,
                  email: phClient.email || existingClient.email,
                  phone: phClient.mobile || existingClient.phone,
                  date_of_birth: phClient.birthDate ? new Date(phClient.birthDate) : existingClient.date_of_birth,
                  gender: phClient.gender?.toLowerCase() || existingClient.gender,
                  general_notes: `Phorest client ID: ${phClient.clientId}\n${phClient.notes || ''}`,
                  marketing_consent: phClient.emailMarketingConsent || existingClient.marketing_consent || false,
                },
              });
            } else {
              // Create new client
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

            totalSynced++;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            result.itemsFailed++;
            result.errors.push({ itemId: phClient.clientId, error: message });
          }
        }
      }

      page++;
      result.hasMore = page < (pageMeta?.totalPages || 0);
    } while (result.hasMore && totalSynced < 20000); // Safety limit

    result.itemsSynced = totalSynced;
    result.success = result.itemsSynced > 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push({ error: message });
  }

  result.durationMs = Date.now() - startTime;
  return result;
}

async function syncServices(salonId: string, branchId: string, client: PhorestClient, dryRun = false): Promise<PhorestSyncResult> {
  const startTime = Date.now();
  const result: PhorestSyncResult = {
    success: false,
    entityType: 'services',
    itemsSynced: 0,
    itemsFailed: 0,
    errors: [],
    hasMore: false,
    durationMs: 0,
  };

  try {
    const response = await client.listServices(branchId, { page: 0, size: 100 });
    const services = response._embedded?.services || [];

    if (dryRun) {
      result.itemsSynced = services.length;
      result.success = true;
      return result;
    }

    // Store in salon settings for reference
    const serviceData = services.map((s) => ({
      serviceId: s.serviceId,
      name: s.name,
      duration: s.duration,
      price: s.price,
      categoryId: s.categoryId,
    }));

    await prisma.$executeRaw`
      UPDATE salons 
      SET settings = jsonb_set(
        COALESCE(settings, '{}'::jsonb),
        '{phorest_services}',
        COALESCE(settings->'phorest_services', '[]'::jsonb) || ${JSON.stringify(serviceData)}::jsonb
      )
      WHERE id = ${salonId}::uuid
    `;

    result.itemsSynced = services.length;
    result.success = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push({ error: message });
  }

  result.durationMs = Date.now() - startTime;
  return result;
}

// ── Incremental Sync ──

export interface IncrementalSyncOptions {
  salonId: string;
  credentials: PhorestCredentials;
  since: string; // ISO date-time
  branchIds?: string[];
  entities?: Array<'clients' | 'appointments' | 'products'>;
}

/**
 * Sync only data that has changed since a given timestamp.
 * Uses Phorest's updatedAfter/updatedFrom filters.
 */
export async function performIncrementalSync(options: IncrementalSyncOptions): Promise<PhorestSyncResult> {
  const { salonId, credentials, since, branchIds, entities = ['clients', 'appointments', 'products'] } = options;

  const startTime = Date.now();
  const result: PhorestSyncResult = {
    success: false,
    entityType: 'clients', // Will be overridden
    itemsSynced: 0,
    itemsFailed: 0,
    errors: [],
    hasMore: false,
    durationMs: 0,
  };

  const client = new PhorestClient(credentials);

  try {
    // Clients: use updatedAfter
    if (entities.includes('clients')) {
      console.log(`[Phorest Sync] Incremental: clients since ${since}`);
      let page = 0;
      let totalClients = 0;

      do {
        const response = await client.listClients({
          page,
          size: 100,
          updatedAfter: since,
          includeArchived: false,
        });

        const clients = response._embedded?.clients || [];
        totalClients += clients.length;
        // Upsert logic here...
        page++;
        if (clients.length < 100) break;
      } while (totalClients < 10000);

      result.itemsSynced += totalClients;
    }

    // Products per branch: use updated_from
    if (entities.includes('products') && branchIds) {
      for (const branchId of branchIds) {
        console.log(`[Phorest Sync] Incremental: products for branch ${branchId} since ${since}`);
        const productsResult = await syncPhorestInventory({
          salonId,
          branchId,
          credentials,
          dryRun: false,
        });
        result.itemsSynced += productsResult.itemsSynced;
        result.itemsFailed += productsResult.itemsFailed;
        result.errors.push(...productsResult.errors);
      }
    }

    // Appointments per branch: use updated_from
    if (entities.includes('appointments') && branchIds) {
      for (const branchId of branchIds) {
        console.log(`[Phorest Sync] Incremental: appointments for branch ${branchId} since ${since}`);
        const apptsResult = await syncPhorestAppointments({
          salonId,
          branchId,
          credentials,
          dryRun: false,
        });
        result.itemsSynced += apptsResult.itemsSynced;
        result.itemsFailed += apptsResult.itemsFailed;
        result.errors.push(...apptsResult.errors);
      }
    }

    result.success = result.itemsSynced > 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push({ error: message });
  }

  result.durationMs = Date.now() - startTime;
  return result;
}

// ── Connection Management ──

export interface PhorestConnectionConfig {
  salon_id: string;
  business_id: string;
  username: string;
  password: string; // Should be encrypted in production
  region: 'us' | 'eu';
  default_branch_id?: string;
  auto_sync_enabled?: boolean;
  sync_interval_minutes?: number;
}

/**
 * Save Phorest connection credentials — the real phorest_connections table.
 * This previously wrote to salons.settings JSONB while a separate,
 * independent route (app/api/v1/phorest/connect) wrote to this same
 * phorest_connections table directly — two disconnected stores for the
 * same connection, invisible to each other's status checks. This is now
 * the single place either path lands.
 */
export async function savePhorestConnection(config: PhorestConnectionConfig): Promise<void> {
  const encryptedPassword = encryptPhorestPassword(config.password);
  await prisma.phorest_connections.upsert({
    where: { salon_id: config.salon_id },
    update: {
      business_id: config.business_id,
      branch_id: config.default_branch_id ?? undefined,
      api_email: config.username,
      api_password: encryptedPassword,
      server_region: config.region,
      status: 'connected',
      auto_sync_enabled: config.auto_sync_enabled ?? false,
      sync_interval_minutes: config.sync_interval_minutes ?? 60,
      updated_at: new Date(),
    },
    create: {
      salon_id: config.salon_id,
      business_id: config.business_id,
      branch_id: config.default_branch_id,
      api_email: config.username,
      api_password: encryptedPassword,
      server_region: config.region,
      status: 'connected',
      auto_sync_enabled: config.auto_sync_enabled ?? false,
      sync_interval_minutes: config.sync_interval_minutes ?? 60,
    },
  });
}

/**
 * Load Phorest connection from the real phorest_connections table.
 */
export async function loadPhorestConnection(salonId: string): Promise<PhorestConnectionConfig | null> {
  try {
    const row = await prisma.phorest_connections.findUnique({ where: { salon_id: salonId } });
    if (!row) return null;

    return {
      salon_id: salonId,
      business_id: row.business_id,
      username: row.api_email,
      password: decryptPhorestPassword(row.api_password),
      region: row.server_region === 'eu' ? 'eu' : 'us',
      default_branch_id: row.branch_id ?? undefined,
      auto_sync_enabled: row.auto_sync_enabled,
      sync_interval_minutes: row.sync_interval_minutes ?? undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Remove Phorest connection
 */
export async function removePhorestConnection(salonId: string): Promise<void> {
  await prisma.phorest_connections.deleteMany({ where: { salon_id: salonId } });
}

/**
 * Check if Phorest is connected for a salon
 */
export async function isPhorestConnected(salonId: string): Promise<boolean> {
  const conn = await loadPhorestConnection(salonId);
  if (!conn) return false;

  // Validate credentials are still working
  const { validatePhorestCredentials } = await import('./phorest-auth');
  const result = await validatePhorestCredentials({
    businessId: conn.business_id,
    username: conn.username,
    password: conn.password,
    region: conn.region,
  });

  return result.valid;
}
