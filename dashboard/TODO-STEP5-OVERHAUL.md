# ColorIq — Full Platform Scope

> **Date:** 2026-05-12
> **Priority:** P0 — Core platform build
> **Blocked by:** Vercel deploy limit (resets ~midnight)

---

## Scope

### 1. Auto-Populate Brands from Vish Inventory
- **Replace** hardcoded `BRANDS` and `BRAND_LINES` arrays in formulate page
- **Data source priority:**
  1. Vish inventory (`inventoryItem` table) — salon's actual stock = brands & shades available
  2. Salon `preferred_brands` — fallback if no inventory items
  3. All brands — last resort
- **New API route:** `/api/user/brands` → query inventory for salon's brands
- **New API route:** `/api/user/shades?brand=X` → return shades from inventory for that brand (with stock levels)

### 2. Step 5: Edit-in-Place Formula
Stylists need to modify the AI-generated formula before saving. Make Step 5 editable:

- **Brand/Line** — dropdown populated from salon's inventory (auto-populated)
- **Shade codes** — tap to open shade picker, filtered by brand/line from inventory
- **Developer volume** — selector (10/20/30/40vol)
- **Processing time** — number input with +/- buttons
- **Mixing ratio** — preset buttons (1:1, 1:1.5, 1:2) or custom
- **Notes** — free text for application instructions
- **Scale integration** — when Acaia connected, ratio controls calculate actual grams per product
- **"Modified" badge** — show if stylist changed anything from AI suggestion, with revert option

### 3. Stock Check & Alternative Recommendations
After formula is generated, cross-reference each product against inventory:

- ✅ In stock — show quantity, green badge
- ⚠️ Low stock — show quantity + nearest in-stock alternative from same brand/line
- ❌ Out of stock — red badge + alternative recommendation

**Alternative matching logic (NOT AI — simple lookup):**
- Same brand, same tone family (A, G, N, etc.), closest level
- Example: 6/1 Ash out → suggest 6/11 Extra Ash (same tone, same level)
- Show: product name, shade code, stock quantity
- Stylist can accept alternative or keep ideal and order more

**What we're NOT doing:**
- Not re-generating the formula with stock constraints (would compromise quality)
- Not adding extra AI calls (alternatives are shade-code pattern matching)

### 4. Scale Connection — Better Error Logging
- Add detailed BLE error logging to `acaia.ts` so we can diagnose connection failures
- Log: which filter matched, GATT connection step, service/characteristic discovery
- Surface specific error messages to user ("Service not found" vs "Connection refused" etc.)

### 5. Login Page — Fix Defaults
- Remove hardcoded `tiche@pleijsalon.com` default — email field should be blank on first visit
- Add "Remember me" checkbox — stores email in localStorage, pre-fills on return
- Pre-fill email from localStorage if "Remember me" was checked previously

### 6. PIN-Protected Client Contact Information
Salon owners don't want staff seeing client contact details (phone, email). Protect with a PIN.

**Account model:**
- **Shared salon account** — all stylists use the salon's login (no individual accounts)
- `subscription_seats` controls device limit (prevents sharing outside salon)
- Owner sets a 4-6 digit **salon PIN** during setup

**Stylist mode (default):**
- Full formulate access — generate formulas, use scale, check inventory
- Can see client hair history, formulas, condition notes
- **Client contact info is masked:**
  - Phone: `(***) ***-4567`
  - Email: `t***@pleijsalon.com`
- Tap to reveal → PIN prompt → contact info shows for that session
- Tap-to-call / tap-to-email works without revealing full contact (app handles the action)

**Owner mode:**
- Enter PIN → full access to all client contact info
- Can set PIN, manage subscription, view billing
- Can grant permanent PIN-free access to specific "trusted" stylists (optional)

**Implementation:**
- `salon_pin` field on `salons` table (hashed, not plaintext)
- `salon_pin_set` boolean — if false, first login prompts to set PIN
- Client contact fields in UI get a `ContactMask` wrapper component
- PIN prompt modal — reuses across all contact reveal points
- Session-level PIN cache — once entered, stays valid until logout/close

**Trusted stylist bypass:**
- Owner can grant specific stylists permanent contact access
- `trusted_stylists` array on salon model (user IDs or device IDs)
- Trusted stylists skip PIN prompt for contact info
- Owner can revoke at any time

**Files:**
- `prisma/schema.prisma` — add `salon_pin`, `salon_pin_set`, `trusted_stylists` to salons model
- `components/ui/contact-mask.tsx` — NEW masking + PIN prompt wrapper
- `app/clients/[id]/page.tsx` — wrap contact fields with ContactMask
- `app/api/salon/pin/route.ts` — NEW set/verify PIN endpoint
- `app/api/salon/trusted/route.ts` — NEW add/remove trusted stylists

### 7. Per-Use Formula Licensing
Each time a formula is applied to a client, the creator gets paid. One purchase = one application.

**How it works:**
- Subscription covers platform access (formulation, inventory, scale, etc.)
- Community/paid formulas are per-use — each APPLICATION triggers a fee
- Revenue split: 70% creator / 30% platform
- Usage tracked per salon — formula use = `salon_id` + `formula_id` + `timestamp`

**Within shared salon account:**
- All stylists can SEE purchased formulas (browse library)
- Each APPLICATION to a client costs the per-use fee
- Owner can set monthly budget cap on community formula usage
- Or pre-purchase a block of uses (buy 20 uses at a discount)

**Anti-sharing enforcement:**
- Formulas are encrypted/obfuscated — can't copy the recipe
- Usage tracked per salon — formula showing up at another salon without purchase = violation
- Formula fingerprinting — shade codes tied to purchasing salon's account

**Schema:**
- `formula_usage_log` table: `id`, `salon_id`, `formula_id`, `stylist_id` (optional), `client_id`, `used_at`, `fee_amount`, `creator_id`, `creator_payout`, `platform_fee`
- `formula_purchases` table: `id`, `salon_id`, `formula_id`, `purchased_at`, `total_uses`, `remaining_uses` (if block purchase), `per_use_fee`
- `salon_formula_budget` field on salons model — monthly cap

**Files:**
- `prisma/schema.prisma` — add formula_usage_log, formula_purchases tables
- `app/api/formulas/use/route.ts` — NEW log formula use + charge
- `app/api/formulas/purchase/route.ts` — NEW purchase formula or block of uses
- `components/formula/use-counter.tsx` — shows usage count + cost to stylist before applying
- `app/library/page.tsx` — show per-use pricing on community formulas

### 8. Phone-to-iPad Session Codes
Stylists capture photos on their phones but run ColorIq on the salon's iPad. Need a bridge.

**Flow:**
1. iPad shows a 4-digit session code (auto-generated per active formulation session)
2. Stylist goes to `getCOLORiq.co/c` on their phone (short URL, easy to type)
3. Enters the 4-digit code
4. Uploads the hair photo
5. Photo appears on iPad instantly in that formulation session
6. No app install, no account needed for the upload

**Technical:**
- Session codes are short-lived (10 min expiry), 4 digits, generated per formulation session
- WebSocket or polling for real-time photo delivery to iPad
- Phone gets a simple upload page — camera capture or file select
- Photo stored in Supabase storage, linked to the session

**Schema:**
- `session_codes` table: `id`, `salon_id`, `code` (4 digits), `formulation_session_id`, `created_at`, `expires_at`, `used` (bool)
- `formulation_sessions` table: `id`, `salon_id`, `stylist_id`, `client_id`, `status`, `photo_url`, `created_at`, `completed_at`

**Files:**
- `prisma/schema.prisma` — add session_codes, formulation_sessions tables
- `app/api/sessions/route.ts` — NEW create session + generate code
- `app/api/sessions/[code]/upload/route.ts` — NEW photo upload via session code
- `app/c/page.tsx` — NEW mobile upload page (camera + code entry)
- `app/formulate/page.tsx` — show session code, listen for incoming photo

### 9. Device Limit Enforcement
Prevent sharing salon account outside the salon.

- `subscription_seats` = max active devices
- Track device logins: `salon_devices` table
- When new device connects and seats are full → oldest device gets bumped
- Soft warning before hard lockout
- Owner can see/manage active devices from settings

**Schema:**
- `salon_devices` table: `id`, `salon_id`, `device_fingerprint`, `device_name`, `last_seen`, `created_at`

**Files:**
- `prisma/schema.prisma` — add salon_devices table
- `app/api/salon/devices/route.ts` — NEW list/manage devices
- `lib/device-fingerprint.ts` — NEW generate device fingerprint from browser
- `middleware.ts` — check device limit on auth (when auth is re-enabled)

---

## Files to Modify

| File | Change |
|------|--------|
| `app/api/user/brands/route.ts` | Query inventory → fallback to salon brands → fallback to all |
| `app/api/user/shades/route.ts` | NEW — return shades for a brand from inventory |
| `app/formulate/page.tsx` | Replace hardcoded brands, Step 5 edit-in-place, stock check, session code |
| `lib/scale/acaia.ts` | Better error logging for BLE diagnostics |
| `components/scale-widget.tsx` | Surface specific BLE errors to user |
| `app/login/page.tsx` | Remove hardcoded default, add "Remember me" |
| `prisma/schema.prisma` | Add salon_pin, trusted_stylists, formula_usage_log, formula_purchases, salon_formula_budget, session_codes, formulation_sessions, salon_devices |
| `components/ui/contact-mask.tsx` | NEW — masking + PIN prompt wrapper |
| `app/clients/[id]/page.tsx` | Wrap contact fields with ContactMask |
| `app/api/salon/pin/route.ts` | NEW — set/verify PIN endpoint |
| `app/api/salon/trusted/route.ts` | NEW — add/remove trusted stylists |
| `app/api/formulas/use/route.ts` | NEW — log formula use + charge |
| `app/api/formulas/purchase/route.ts` | NEW — purchase formula or block of uses |
| `components/formula/use-counter.tsx` | NEW — usage count + cost display |
| `app/library/page.tsx` | Show per-use pricing on community formulas |
| `prisma/schema.prisma` | Add session_codes, formulation_sessions, salon_devices |
| `app/api/sessions/route.ts` | NEW — create session + generate code |
| `app/api/sessions/[code]/upload/route.ts` | NEW — photo upload via session code |
| `app/c/page.tsx` | NEW — mobile upload page |
| `app/api/salon/devices/route.ts` | NEW — list/manage devices |
| `lib/device-fingerprint.ts` | NEW — browser fingerprint |

## Implementation Order
**Phase 1 — Tonight (core formulate + login fix):**
1. `/api/user/brands` — inventory-first query
2. `/api/user/shades` — shades by brand from inventory
3. Formulate page — wire up API calls, replace hardcoded data
4. Step 5 edit-in-place UI
5. Stock check + alternative recommendations
6. Scale error logging
7. Login page fixes (no hardcoded email, remember me)

**Phase 2 — PIN + salon access controls:**
8. Schema: salon_pin, salon_pin_set, trusted_stylists
9. PIN API endpoint (set/verify)
10. ContactMask component + wrap client fields
11. Trusted stylist management

**Phase 3 — Formula licensing:**
12. Schema: formula_usage_log, formula_purchases, salon_formula_budget
13. Formula use + purchase API routes
14. Use counter UI + per-use pricing display in library

**Phase 4 — Session codes + device limits:**
15. Schema: session_codes, formulation_sessions, salon_devices
16. Session code generation + photo upload API
17. Mobile upload page (/c)
18. Device fingerprint + limit enforcement

## Notes
- Tiche confirmed: stock-checking at formulation time is common practice
- This eliminates need for separate onboarding brand setup (inventory IS the setup)
- Scale integration ties directly into ratio/weight calculations on Step 5
- "Modified" badge preserves trust in AI recommendations while allowing override
- Shared salon account = same model as Square, Vagaro, etc. (proven, simple)
- Client list protection is a major selling point for salon owners
- Per-use licensing = creators earn from every application, not just first purchase
- Phone-to-iPad = QR/code bridge, no app install required, works on any phone
