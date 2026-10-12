/**
 * Phorest API TypeScript Type Definitions
 * Maps Phorest REST API responses to typed structures
 * @see https://developer.phorest.com/
 */

// ── Server Endpoints ──
export const PHOREST_EU_BASE = 'https://api-gateway-eu.phorest.com/third-party-api-server';
export const PHOREST_US_BASE = 'https://api-gateway-us.phorest.com/third-party-api-server';

export type PhorestRegion = 'eu' | 'us';

export function getPhorestBaseUrl(region: PhorestRegion = 'us'): string {
  return region === 'eu' ? PHOREST_EU_BASE : PHOREST_US_BASE;
}

// ── Authentication ──
export interface PhorestCredentials {
  username: string; // e.g. "global/email@example.com"
  password: string;
  region: PhorestRegion;
  businessId: string;
}

export interface PhorestConnection {
  salon_id: string;
  business_id: string;
  username: string;
  password_encrypted: string;
  region: PhorestRegion;
  status: 'connected' | 'disconnected' | 'error';
  connected_at: string;
  last_sync_at?: string;
  sync_error?: string;
  sync_error_at?: string;
  auto_sync_enabled: boolean;
  sync_interval_minutes: number;
  default_branch_id?: string;
  branch_ids: string[];
  created_at: string;
  updated_at: string;
}

// ── Pagination ──
export interface PageMetadata {
  size: number;
  totalElements: number;
  totalPages: number;
  number: number; // current page (0-indexed)
}

export interface PhorestPagedResponse<T> {
  _embedded: {
    [key: string]: T[];
  };
  page: PageMetadata;
}

// ── Error Response ──
export interface PhorestErrorResponse {
  statusCode: number;
  id: string;
  detail: string;
  errorCode: string;
}

// ── Branch ──
export interface PhorestBranch {
  branchId: string;
  name: string;
  timeZone: string;
  latitude?: number;
  longitude?: number;
  streetAddress1?: string;
  streetAddress2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  currencyCode?: string;
  accountId?: number;
}

export type PhorestBranchesResponse = PhorestPagedResponse<PhorestBranch>;

// ── Client ──
export interface PhorestAddress {
  streetAddress1?: string;
  streetAddress2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export type PhorestGender = 'MALE' | 'FEMALE' | 'NON_BINARY' | 'NOT_SPECIFIED' | 'PREFER_NOT_TO_SAY' | 'UNKNOWN';

export interface PhorestClientData {
  clientId: string;
  version: number;
  firstName: string;
  lastName: string;
  mobile?: string;
  linkedClientMobile?: string;
  landLine?: string;
  email?: string;
  address?: PhorestAddress;
  birthDate?: string; // ISO date
  clientSince?: string; // ISO date-time
  gender?: PhorestGender;
  notes?: string;
  smsMarketingConsent?: boolean;
  emailMarketingConsent?: boolean;
  smsReminderConsent?: boolean;
  emailReminderConsent?: boolean;
  preferredStaffId?: string;
  externalId?: string;
  creatingBranchId?: string;
  archived?: boolean;
  banned?: boolean;
  clientCategoryIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type PhorestClientsResponse = PhorestPagedResponse<PhorestClientData>;

// ── Client Service History ──
export interface PhorestServiceHistory {
  appointmentId: string;
  appointmentDate: string;
  serviceId: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  branchId: string;
  price: number;
  duration: number;
  notes?: string;
}

export interface PhorestServiceHistoriesResponse {
  _embedded: {
    serviceHistories: PhorestServiceHistory[];
  };
}

// ── Appointment ──
export interface PhorestAppointment {
  appointmentId: string;
  version: number;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  price?: number;
  staffId: string;
  roomId?: string;
  machineId?: string;
  confirmed?: boolean;
  serviceId?: string;
  clientId?: string;
  createdAt?: string;
  updatedAt?: string;
  staffRequest?: boolean;
  preferredStaff?: boolean;
  cancelled?: boolean;
  deleted?: boolean;
  archived?: boolean;
  notes?: string;
  onlineCategory?: {
    id: string;
    name: string;
  };
}

export type PhorestAppointmentsResponse = PhorestPagedResponse<PhorestAppointment>;

// ── Service (Branch Service) ──
export interface PhorestService {
  serviceId: string;
  version: number;
  name: string;
  archived?: boolean;
  categoryId?: string;
  duration: number; // minutes
  gapTime?: number; // minutes
  price?: number;
  onlineCategories?: Array<{
    id: string;
    name: string;
  }>;
  disqualifiedStaff?: string[];
}

export type PhorestServicesResponse = PhorestPagedResponse<PhorestService>;

// ── Product ──
export type PhorestProductType = 'RETAIL' | 'COLOUR' | 'PROFESSIONAL';

export interface PhorestProduct {
  productId: string;
  parentProductId?: string;
  name: string;
  brandId?: string;
  brandName?: string;
  categoryId?: string;
  categoryName?: string;
  archived?: boolean;
  price?: number;
  minQuantity?: number;
  maxQuantity?: number;
  type?: string; // e.g. "RETAIL, COLOUR, PROFESSIONAL"
  barcode?: string;
  measurementQuantity?: number;
  measurementUnit?: string;
  reorderCount?: number;
  reorderCost?: number;
  quantityInStock?: number;
  code?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PhorestProductsResponse = PhorestPagedResponse<PhorestProduct>;

// ── Staff ──
export interface PhorestStaff {
  staffId: string;
  version: number;
  firstName: string;
  lastName: string;
  mobile?: string;
  email?: string;
  address?: PhorestAddress;
  birthDate?: string;
  gender?: PhorestGender;
  notes?: string;
  jobTitle?: string;
  displayName?: string;
  appointmentColor?: string;
  deleted?: boolean;
  archived?: boolean;
  branches?: string[];
}

export type PhorestStaffResponse = PhorestPagedResponse<PhorestStaff>;

// ── CSV Export Job ──
export interface PhorestCsvExportJob {
  jobId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  reportType: string;
  fromDate?: string;
  toDate?: string;
  branchId?: string;
  downloadUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ── COLORiq Mapped Types ──
export interface PhorestSyncedClient {
  phorest_client_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: Date;
  gender?: string;
  notes?: string;
  marketing_consent: boolean;
  preferred_stylist_id?: string;
  external_id?: string;
  creating_branch_id?: string;
  service_history_count: number;
  last_service_date?: Date;
  synced_at: Date;
}

export interface PhorestSyncedAppointment {
  phorest_appointment_id: string;
  client_id?: string;
  staff_id: string;
  branch_id: string;
  service_id?: string;
  appointment_date: Date;
  start_time: string;
  end_time?: string;
  price?: number;
  confirmed: boolean;
  cancelled: boolean;
  notes?: string;
  synced_at: Date;
}

export interface PhorestSyncedProduct {
  phorest_product_id: string;
  name: string;
  brand_name?: string;
  category_name?: string;
  barcode?: string;
  price?: number;
  quantity_in_stock?: number;
  measurement_quantity?: number;
  measurement_unit?: string;
  product_type?: string;
  reorder_count?: number;
  synced_at: Date;
}

export interface PhorestSyncResult {
  success: boolean;
  entityType: 'clients' | 'appointments' | 'products' | 'services' | 'branches';
  itemsSynced: number;
  itemsFailed: number;
  errors: Array<{
    itemId?: string;
    error: string;
  }>;
  nextPage?: number;
  hasMore: boolean;
  durationMs: number;
}

export interface PhorestFullSyncResult {
  salon_id: string;
  business_id: string;
  branches_synced: PhorestSyncResult;
  clients_synced: PhorestSyncResult;
  appointments_synced: PhorestSyncResult;
  products_synced: PhorestSyncResult;
  services_synced: PhorestSyncResult;
  started_at: string;
  completed_at: string;
  total_duration_ms: number;
}
