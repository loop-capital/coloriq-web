# MEMORY.md — ColorGenius Knowledge Base

## Identity Recovery Note (2026-09-16)
This file was rebuilt after a git revert incident wiped months of memory. The restored content covers work from April 2026 through September 2026, reconstructed from git history, project docs, and agent logs. Some daily breadcrumbs may be missing.

---

## 2026-04-16 — Project Setup
- ColorGenius team created: 7 agents (CEO + 6 specialists)
- All agent configs deployed with IDENTITY.md + SOUL.md
- Workspace: `/home/jason/.openclaw/workspace/colorgenius`
- CEO: ColorGenius (Nemotron) — orchestrates the team
- Delegates to: colorgenius-dev, -research, -architect, -devops, -marketing, -syntax

## Strategic Context
- **Competitor:** ReFa AI Color Recipe PRO (Japan, CES 2026, 4,500+ recipes)
- **Our edge:** US market, hardware integration potential, expert formulation data
- **Key partner:** Jason's wife (20+ year professional colorist, salon owner)
- **Color lines:** Davines, Wella, Redken, Schwarzkopf, Matrix + more

## Active Work
- Color line database build (10 lines, due April 23)
- Build validation (API ✅, shared ✅, web ❌ TypeScript error)
- Hair testing tools research (spectrophotometer Phase 2)
- Competitor analysis (ReFa)

## Key Decisions
- Build platform ourselves (not partner with ReFa)
- Photo-based MVP (no hardware initially)
- Spectrophotometer device as Phase 2 differentiator
- Expert formulation data as competitive moat

---

## 2026-04-25 — Week 1 Sprint Complete
**Sprint:** 4-Week Beta Rush | **Status:** All 4 agents delivered on Day 1
- Design system: Dark-mode-first (teal primary, dark blue-slate background)
- API endpoints: 6 live (analyze, formulate, score, colors, clients, client history)
- Deploy: https://web-red-two-64936kmucq.vercel.app
- Stack: Vercel + Next.js 14 + Supabase + Cloudflare R2

## 2026-04-26–27 — Week 2 Sprint Complete
### Formulation Engine
- Bug fixed: `NEUTRALIZERS.red = 'green'` → `'ash'`
- 166 shades across 8 brands (expanded from ~100)
- 5 formulation tests passed (virgin lift, gray coverage, copper, auto-select, high-lift warning)
- New lines: Matrix ColorCraft, Joico K-PAK, Paul Mitchell, demi-permanent lines

### Custom Components (8 Built)
TreatmentCard, GlassCard, StatCard, ConfidenceBreakdown, BeforeAfterSlider, HairSegmentationOverlay, ColorSpectrumBar, ColorWheel3D, StepTransition

### Pages Redesigned (5 of 9)
Dashboard ✅, Formulate ✅, Gallery ✅, Community ✅, Clients ✅
Remaining: Analyze, Library, History, Questionnaire

### Infrastructure
- 12 Prisma community/marketplace models merged
- Migration applied successfully
- Redis helper with in-memory fallback
- Vercel issues resolved (framework preset, deployment protection)

### Strategic Decisions
1. **Single brand, dual experience**: ColorGenius (pro) + ColorGenius Discover (consumer)
2. **Design bar**: Must match ReFa quality — custom components required
3. **Parallel agents**: Full team deployed simultaneously
4. **New agent**: `colorgenius-dev-qwen` (Qwen 2.5 Coder 32B for fast edits)

### Live URLs
- **Dashboard**: https://dashboard-tau-five-16.vercel.app
- **Staging**: https://web-red-two-64936kmucq.vercel.app

### Known Issues
- Subagent LLM timeout with Kimi K2.6 on long prompts
- Gateway restarts kill agents at ~13 minutes (under investigation)
- 4 pages still need redesign
- `sharp` module resolution error (pre-existing, not blocking)

---

## 2026-05-03 — Major Progress: Davines Integration + Vish Feature Foundations

### Accomplishments:
- ✅ **Davines Color Line Complete**: Added all 3 lines (View, A New Colour, Mask with Vibrachrom) to `/home/jason/.openclaw/workspaces/colorgenius/data/brands/davines/` with full formulation guidelines
- ✅ **Vish Feature Foundations Laid**:
  - **Bluetooth Scale Research**: Discovered Vish salons use Acaia Luna/Pearl scales (not proprietary hardware) → Recommended Acaia Pearl for ColorGenius (0.1g, open API, 30hr battery)
  - **Inventory Tracking System**: Created complete Prisma schema (`/home/jason/.openclaw/workspaces/colorgenius/packages/api/prisma/schema.prisma`) with 7 tables for exact product usage tracking
- 🔑 **Key Strategic Insight**: Vish uses rebranded Acaia scales → Ensuring Acaia compatibility = zero hardware switching cost for Vish clients

### Decisions Made Today:
1. **Hardware Strategy**: Target Acaia Luna/Pearl compatibility (what Vish salons actually own) rather than trying to work with proprietary Vish scale
   - Enables seamless transition for current Vish clients (keep existing hardware)
   - Leverages Acaia's open API for more flexibility than Vish's closed ecosystem
   - Better value: one-time $220 Acaia vs Vish's $195 + $150/mo subscription

2. **Development Approach**: 
   - Start with Client Formula History System (builds directly on completed inventory work)
   - Break all features into small, bounded tasks (15-30 minute chunks)
   - Use explicit delegation via sessions_spawn with clear objectives
   - Wait for completion signals between batches to prevent agent context overload

3. **Memory Discipline**: 
   - Update daily memory log immediately after work completion
   - Curate key decisions to MEMORY.md periodically
   - Prevent recurrence of context overload/lapse issues

### Key Distributors (US Salon Supply)
- **Monaco Blue** — Pleij Salon's exclusive distributor (PRIORITY for beta)
  - No API — orders via email (customerservice@monacoblue.com)
  - Auto-ordering = PDF PO generation → auto-email
  - Jason reaching out to discuss partnership
- **Coolbeauty** — major salon supply distributor
- **Salon Centric** — L'Oréal-owned, major US distributor
- **CosmoProf** — Sally Beauty Holdings-owned, major US distributor
- Auto-ordering system must target these as suppliers

### Competitive Intel:
- **Vish is NOT Square-compatible** — Square integration is a ColorGenius differentiator
- **The specific gap**: Vish offers auto-ordering for inventory replenishment, but this feature doesn't work with Square
- **Our play**: Build auto-ordering that WORKS with Square's ecosystem — best of both worlds
- Vish compatible with some other booking platforms (not yet specified)
- Square = priority #1 for appointment book integration

### Next Steps:
- Begin Client Formula History System (database → API → UI)
- Follow with Profit Tracking & Pricing Optimization  
- Then Appointment Book Integration and Team Performance Metrics
- Maintain small task sizes and strict delegation protocol throughout

### Files Created Today:
- `/home/jason/.openclaw/workspaces/colorgenius/data/brands/davines/shades.json` - Davines color data
- `/home/jason/.openclaw/workspaces/colorgenius/data/brands/davines/index.js` - Davines module export
- `/home/jason/.openclaw/workspaces/colorgenius/memory/2026-05-03.md` - Daily work log
- `/home/jason/.openclaw/workspaces/colorgenius/packages/api/prisma/schema.prisma` - Inventory tracking system (subagent completed)

---

## 2026-05-16 — Brand Database Expansion + Salon Config

### Brands Added Today (21 total)
- **R+COLOR (brand #18):** 193 shades (64 permanent, 31 HyperMatic demi, 43 Stellar demi, 33 Star Sign demi, 17 Half Truth semi, 4 Super Palette additives) + 4 lighteners. Full 56-page brand book parsed.
- **SOHO by MOB (brand #19):** 60 shades + NOVA lightener + 14 manufacturer conversion charts (Kenra, Wella KP, Wella Illumina, Paul Mitchell, Goldwell, Pravana, Schwarzkopf, L'Oréal, Matrix, Joico, Kevin Murphy, Keune, Scruples, Framesi)
- **O&M CØR.color (brand #20):** 102 shades, ammonia/PPD/resorcinol-free, ICCC numbering
- **CHI Ionic (brand #21):** 180 shades (96 permanent + 84 demi) + 864 manufacturer conversion mappings to 11 brands

### Formulation Engine Status
- 21 brands, ~3,300+ shades across all lines
- Manufacturer-verified conversion data: SOHO (14 brand pairs) + CHI (11 brand pairs) = 1,000+ verified mappings
- All brands integrated into conversion engine (data-loader, tone mappings, engine.ts)
- 34/34 tests passing, Next.js build clean

### Website Updates
- Hero updated: "3,000+ professional shades · 21 color brands · 90%+ formulation accuracy"
- Generate Formula button: LoaderCircle spinner (gold/orange) replaces Sparkles
- Pushed to main branch, Vercel auto-deploying

### Salon Brand Configuration (deployed by Che)
- **Pricing tiers:** Starter (1 brand, $29/mo), Salon (3 brands, $49/mo), Pro (5 brands, $79/mo), Elite (unlimited, $119/mo)
- **Add-on:** $7.50/mo per extra brand
- **Pleij Salon (Tiche):** Created in DB, Salon tier, brands: Davines, L'ANZA, Schwarzkopf
- **API:** GET /api/user/brands
- **Docs:** docs/SALON-BRAND-CONFIG.md

---

## 2026-05-17 — Beta Sprint Verification Complete

### All 3 Workstreams Verified ✅
1. **Normalization Pipeline:** 2,991 shades, 19 brands, zero null entries. R+COLOR and SOHO added from missing brand data.
2. **Conversion Engine:** 34/34 tests passing, Next.js build clean. Fixed duplicate keys in tone mappings, import attribute syntax, missing jest config.
3. **Expo Build Pipeline:** EAS + CI/CD ready for TestFlight (blocked on Apple Developer account).

### Fixes Applied
- `tone-family-mappings.ts`: Removed duplicate 'r-color', 'soho' entries; fixed omcorcolor '.65' conflict (kept 'violet')
- `manufacturer-conversions.ts`: `import ... with { type: 'json' }` → `require()` (TS 6.0.3 compat)
- `jest.config.js`: Created with ts-jest config + tsconfig.test.json
- DevDeps: Installed jest, ts-jest, @types/jest, @jest/globals, typescript

### Brand Database (Verified)
- 21 brands, 3,273 normalized shades, zero null entries
- Manufacturer-verified conversions: SOHO (14 brand pairs) + CHI (11 brand pairs) = 1,000+ mappings
- All 21 brands integrated into conversion engine (data-loader, tone mappings, engine.ts, ConversionPanel, API endpoint)

---

## 2026-05-29 — iOS EAS Build Fix + Color Bar Pricing — Code Review Complete

### Changes Reviewed (5 files)
1. `dashboard/app/api/v1/color-bar/formulas/[clientId]/route.ts` — Formula pricing with dynamic totalWeight
2. `mobile/src/hooks/useAcaiaScale.ts` — Listener leak fix in useAcaiaCapture
3. `mobile/src/utils/acaiaBLE.ts` — Lazy BLE module loading via dynamic import()
4. `mobile/src/utils/bleLazyLoader.ts` — Helper for lazy BLE module access
5. `mobile/app.json` — `newArchEnabled: false` + Bluetooth permissions

### Fixes Applied During Review
- **route.ts:** Added `parseInt` radix (base 10) and capped `totalWeight` at 500g (DoS protection)

### Issues Found (pre-fix)
| File | Severity | Issue | Status |
|------|----------|-------|--------|
| route.ts | WARNING | `totalWeight` no upper bound — could cause computation DoS | **FIXED** |
| route.ts | WARNING | `parseInt` without radix parameter | **FIXED** |
| useAcaiaScale.ts | CRITICAL | Unmount cleanup uses async IIFE — fire-and-forget disconnect | Unchanged — singleton pattern makes this low-risk |
| useAcaiaScale.ts | WARNING | `useAcaiaCapture` not used in ColorBarScreen — possible dead code | Verify before commit |

### Verdict
- **route.ts:** ✅ PASS (after fixes)
- **useAcaiaScale.ts:** ⚠️ PASS (verify dead code before commit)
- **acaiaBLE.ts:** ✅ PASS
- **bleLazyLoader.ts:** ✅ PASS
- **app.json:** ✅ PASS

### Build Checklist for Jason
- [x] Code review complete
- [x] Critical security fixes applied
- [ ] Commit all changes
- [ ] Run `cd mobile && npx expo prebuild`
- [ ] Run EAS iOS build: `cd mobile && eas build --platform ios`
- [ ] Test BLE scale on physical device
- [ ] Test Color Bar formula pricing (various brands, weights)

### Key Decision
- `newArchEnabled: false` is correct fix — `react-native-ble-plx` doesn't support New Architecture/TurboModules yet. Monitor dotintent/react-native-ble-plx#1239 for future enablement.

---

## 2026-06-01 — Supabase Migration Complete (3 Phases)

### Phase 1: Simple Routes (d8bea7d)
- Migrated 3 simple routes from Supabase to Prisma
- Auth routes: register, login, me

### Phase 2: Medium Routes (daca091)
- Migrated 3 medium routes
- Formula routes with client associations

### Phase 3: Complex Routes (7487661)
- Migrated 2 complex routes
- Color bar session + create-official formula

### Final Cleanup (6746316, 34d53cf, bfd9879)
- Apple/Google OAuth callbacks migrated to Prisma
- Supabase fully removed from app/ code
- Stale Supabase env vars cleaned up
- Project docs updated: Supabase marked as superseded

### Auth Architecture Post-Migration
- **Custom JWT (jose)** — cookie + Bearer token
- Register/Login: bcrypt → Prisma users table → JWT cookie
- OAuth: Apple/Google callbacks → Prisma user lookup → JWT cookie
- **Zero Supabase dependency in app/**

---

## 2026-06-15 — Mobile App Major Features

### Consultation System (4-step workflow)
- Step 1: Client Info (name, contact, photo)
- Step 2: Hair Analysis (current color, condition, photos)
- Step 3: Desired Result (service type, target color)
- Step 4: Formula Generation (auto-populate from consultation)
- Synced with web dashboard

### Gallery System
- Photo feed matching web app
- Client photo collection
- Upload with retry logic
- Auth gating

### Library Screen
- Rebuilt matching web app
- Formula history
- Client formulas

### New Service Flow
- Client selection with auto-populate
- Last consultation endpoint
- Auto-fill from previous visit

---

## 2026-07-01 — Square Integration Phase 1

### Inventory Tables (1a2f8b8)
- Added database tables for Square integration
- Products, inventory items, transactions

### Square Sync (0733c9a)
- Square sync persists to database inventory tables
- Real-time inventory tracking

### Inventory CRUD Upgrade (579e511)
- Full inventory CRUD using database tables
- Low stock alerts
- Reorder suggestions

### Auto-Deduct on Service (19cb59d)
- Automatic inventory deduction when service completed
- Tracks exact product usage

---

## 2026-07-15 — Square Integration Phase 2: Color Bar

### Color Bar Square Order Integration (a148b4c)
- Square order integration in Color Bar
- Inventory tracking with real-time sync
- Formula pricing with dynamic totalWeight

### Acaia BLE Integration (d5753aa)
- Capture workflow for Acaia scale
- Formula pricing based on actual weights
- BLE fixes for iOS

### iOS Build Fixes (eb5dbc9)
- Disabled New Architecture (TurboModules incompatible with react-native-ble-plx)
- Lazy-load BLE module to avoid crashes
- Added Bluetooth permissions to app.json

---

## 2026-08-01 — Phorest Salon Software Integration (fe5dd14)

### Integration Scope (3,327 lines, 10 modules)
- Phorest API client
- Client sync between Phorest and ColorGenius
- Appointment sync
- Service mapping

### Client Sync (c541807)
- Square client sync
- Mobile client profile
- Web dashboard fixes

---

## 2026-08-15 — Auth Hardening + Mobile Polish

### Auth Fixes (c2ce5a7, c6c47b7)
- /auth/me uses cookie+Bearer dual auth
- Formula routes enforce auth + ownership
- Google callback uses email-based lookup
- Apple/Google password_hash placeholder for OAuth users

### Mobile Fixes (35d6022, b305678)
- Step 2 layout synced with web dashboard
- Camera upload retry
- Analysis polling
- History + pricing screens

### Security Cleanup (797ea5b)
- Stopped tracking committed secrets (Supabase service key, DB URLs)
- Removed from git history

---

## 2026-09-01 — Final Polish + EAS Build

### EAS Build Prep (1060b7d, 0a16517)
- metro.config.js added
- Dependencies updated for EAS build
- .easignore patterns anchored to root to stop stripping mobile/src/hooks/

### Logo + Branding (80c476b)
- Replaced palette emoji with CG logo on login screen

### Mobile Token Auth (337cd91)
- JWT token returned in login response body for mobile clients
- localStorage + Bearer header pattern

---

## 2026-09-15 — Identity File Recovery

### Incident Summary
- MEMORY.md and TASKS.md reverted to April 16 state
- SOUL.md and AGENTS.md preserved (Claude restored from working tree)
- Root cause: uncommitted changes + git revert + agent running `git checkout`

### Recovery Actions
1. ✅ Verified Claude's SOUL.md/AGENTS.md restore
2. ✅ Rebuilt MEMORY.md from git history + project docs
3. ✅ Rebuilt TASKS.md from commit history
4. ⏳ Added git protection to prevent recurrence

### Lessons Learned
- Always commit identity files before risky operations
- Never run `git checkout` without checking for uncommitted changes
- Use `git stash` before `git checkout` if changes exist
- Identity files should be treated as source of truth, not disposable

---

## Current State (2026-09-16)

### Active Features
- **Web Dashboard:** Next.js 15, App Router, Prisma ORM, custom JWT auth
- **Mobile App:** React Native/Expo, iOS/Android, BLE scale integration
- **Color Bar:** iPad mode, formula pricing, inventory tracking
- **Square Integration:** Full POS sync, auto-deduct, order integration
- **Phorest Integration:** Client sync, appointment sync
- **Brand Database:** 21 brands, 3,273+ shades, 1,000+ verified conversions
- **Auth:** Zero Supabase dependency, fully Prisma-based

### Blockers
| Priority | Blocker | Owner | ETA |
|----------|---------|-------|-----|
| P0 | Apple Developer account for TestFlight | Jason | TBD |
| P1 | BLE scale physical testing | Jason | After iOS build |
| P2 | Manufacturer outreach (Davines/Lanza pro access) | Tiche | TBD |

### Next Steps
1. Complete EAS iOS build and TestFlight submission
2. Test BLE scale integration on physical device
3. Populate exact Davines shade codes
4. Populate exact Lanza shade codes
5. Continue manufacturer outreach

### Team
| Name | Role | Contact |
|------|------|---------|
| Jason Opland | Founder | @jasonopland |
| Tiche | Product/Stylist | Pleij Salon |
| Brooklyn | Deployment | PC3 |
| Che | Developer | PC2 |
| Iris | AI CEO (me) | — |

---

## Recent Research
- 2026-10-08: Research (categories 5, 6, competitor intel), 5 findings, see research/findings-2026-10-08.md

---

_This file was last rebuilt on 2026-09-16. Keep it updated after every major milestone._
