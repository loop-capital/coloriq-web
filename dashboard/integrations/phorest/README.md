# Phorest Integration for COLORiq

## Overview
Full Phorest salon software integration supporting client sync, appointment tracking, inventory management, and multi-branch support.

## Files Created

| File | Purpose |
|------|---------|
| `types.ts` | TypeScript interfaces for all Phorest entities |
| `phorest-auth.ts` | Authentication module (Basic Auth) |
| `phorest-client.ts` | API client with rate limiting (95 RPS) and retry logic |
| `phorest-sync.ts` | Full sync orchestrator with job tracking |
| `phorest-inventory.ts` | Inventory pull and COLORiq product mapping |
| `phorest-appointments.ts` | Appointment sync with visit tracking |
| `index.ts` | Clean exports for all modules |
| `README.md` | This file |
| `test.ts` | Test utilities (optional) |

## API Routes Created

| Route | Method | Description |
|-------|--------|-------------|
| `/api/phorest/status` | POST/GET/DELETE | Connect, check, disconnect Phorest |
| `/api/phorest/sync` | POST/GET | Trigger sync, check status |
| `/api/phorest/inventory` | GET/POST | Query inventory, force sync |
| `/api/phorest/appointments` | GET/POST | Query appointments, force sync |
| `/api/phorest/clients` | GET/POST | Query clients, force sync |

## Authentication
- **Method**: Basic Auth
- **Username format**: `global/email@example.com`
- **Password**: Phorest account password
- **Region URLs**:
  - US/CAN/AUS: `https://api-gateway-us.phorest.com/third-party-api-server`
  - EU: `https://api-gateway-eu.phorest.com/third-party-api-server`

## Key Features
1. **Rate Limiting**: Client enforces 95 requests/second (API cap is 100 RPS)
2. **Retry Logic**: Exponential backoff with jitter for 429/5xx errors
3. **Multi-branch**: Discovers and syncs all branches automatically
4. **Real-time Sync**: Job tracking with start/poll/complete workflow
5. **Error Resilience**: Individual item failures don't stop batch sync

## Data Mapping

| Phorest Entity | COLORiq Table | Notes |
|---------------|-------------------|-------|
| Client | `clients` | Matched by email/phone, upserted |
| Appointment | `client_visits` | Creates visit records with services |
| Product | `inventory_items` | Mapped by brand + shade_code |
| Service | Stored in settings JSON | Reference for service mapping |
| Branch | Stored in settings JSON | Used for multi-branch sync |

## Usage

### Connect a Salon
```bash
POST /api/phorest/status
{
  "salon_id": "uuid",
  "business_id": "phorest-business-id",
  "branch_id": "phorest-branch-id",
  "username": "global/salon@email.com",
  "password": "password",
  "region": "us"
}
```

### Trigger Full Sync
```bash
POST /api/phorest/sync
{
  "salon_id": "uuid",
  "entities": ["clients", "appointments", "products"]
}
```

### Query Inventory
```bash
GET /api/phorest/inventory?salon_id=uuid&search=brand_name
```

## Environment Variables
```
PHOREST_TEST_USERNAME=global/test@example.com
PHOREST_TEST_PASSWORD=test-password
PHOREST_TEST_BUSINESS_ID=phorest-business-id
```

## Status
✅ **COMPLETE** — All TypeScript compiles cleanly. Integration ready for testing with live Phorest credentials.

## Next Steps
1. Test with live Phorest credentials
2. Add webhook support for real-time updates (if Phorest supports webhooks)
3. Add service history sync (individual client service history endpoint)
4. Consider adding `phorest_client_id` and `phorest_appointment_id` columns to database for better matching

## Notes
- The `inventory_items` table does not currently have a `barcode` column — Phorest barcodes are matched via brand+shade_code
- Client matching uses email first, then phone number
- The sync uses `findFirst` + `create`/`update` pattern instead of `upsert` since there's no unique constraint on external IDs
