# ColorIq — Today's Fixes (2026-05-13)

> **Date:** 2026-05-13
> **Status:** In Progress (Vercel deploy limit resets 8 PM ET)

---

## Completed Today (Morning Session)

| # | Page | Fix | Status |
|---|------|-----|--------|
| 1 | Questionnaire | Title font size `text-2xl` → `text-3xl` | ✅ Deployed |
| 2 | Service | Title font size `text-2xl` → `text-3xl` | ✅ Deployed |
| 3 | History | Search input freeze fix (debounced 300ms, no spinner on refinement) | ✅ Deployed |
| 4 | Gallery | Title "Gallery" gets purple-pink gradient | ✅ Deployed |
| 5 | Pricing Rules | Title font size `text-2xl` → `text-3xl` | ✅ Deployed |
| 6 | Inventory | Title font size `text-2xl` → `text-3xl` | ✅ Deployed |

**Deploy URL:** https://getCOLORiq.co
**Vercel limit:** Hit — resets ~8 PM ET

---

## Pending (Blocked by Vercel Limit)

| # | Page | Issue | Priority |
|---|------|-------|----------|
| 7 | Subscription | **404 Error** — link in nav sidebar points to `/subscription` but page doesn't exist | 🔴 High |
| 8 | Library | **"This page couldn't load"** — API `/api/v1/formulas/list` returns 500; needs fallback + graceful error handling | 🔴 High |

---

## Notes
- All font size fixes: `text-2xl` → `text-3xl` (30px) matching other page titles
- History fix: `fetchHistory(false)` on debounced search to avoid spinner unmounting input
- Gallery: added gradient span wrapper matching "Formulation", "Color Service" etc.

---

## Backup Plan
- After 8 PM ET deploy session, commit all changes to GitHub
- Push local branch or create PR for full backup
- Tag the commit: `v0.x.x-morning-fixes`
