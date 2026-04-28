# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Next.js dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run seed         # Populate all 17 Google Sheets tabs with synthetic data (requires .env.local)
npm run auth-setup   # Legacy OAuth2 setup helper (not needed when using service account)
```

**No test suite exists** — this is a prototype.

## Environment

Create `.env.local` in the project root:

```
GOOGLE_SPREADSHEET_ID=1U-T91N__ouV1EmnaCDcJPq_0Ta3OlutI7chizUMgRTc
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}  # full JSON on one line
```

The service account must have **Editor** access on the spreadsheet. Without credentials the app renders empty states (no crash) — a yellow banner appears in the layout.

After changing `.env.local`, restart the dev server. If you see stale errors after deleting files, run `rm -rf .next` before restarting.

## Architecture Overview

### Data Layer: Google Sheets as Database

`src/lib/gsheets.ts` is the **entire data access layer**. It authenticates (service account JSON from env var, then falls back to OAuth2 token files, then ADC), then reads/writes 17 named tabs on a single spreadsheet. All exported types (`Warehouse`, `DonorSetting`, `SKU`, `AuditEntry`, etc.) are defined here.

**Tab → Type mapping** (abbreviated):
- `Warehouses` → `Warehouse`
- `DonorSettings` → `DonorSetting`
- `RoutePairOverrides` → `RoutePairOverride`
- `ThresholdsGlobal/Category/Brand` → `ThresholdsGlobal/Category/Brand`
- `ProductConfigGlobal`, `BrandShelfLife`, `SKUs` → product config types
- `Batches`, `TransferOrders`, `OrderLineItems` → approval workflow types
- `PendingChanges` → `PendingChange` (draft staging queue)
- `AuditLog` → `AuditEntry`

### Draft / Commit Workflow

**Every user mutation is two-phase:**
1. **Stage**: `stageChange()` appends a row to the `PendingChanges` sheet with `{module, entity, op, targetId, payload}`.
2. **Commit**: `commitAllAction()` in `src/server/actions/draft.ts` reads all pending changes, applies each one to its target sheet, clears `PendingChanges`, and writes an `AuditLog` entry.

The sidebar shows pending count (read in `layout.tsx` server component), and the **Commit Configuration** / **Discard all changes** buttons trigger `commitAllAction` / `discardAllAction` server actions.

### Server Actions

All mutations are Next.js Server Actions in `src/server/actions/`:
- `warehouse.ts` — `setMasterSinkAction`, `clearMasterSinkAction`, `toggleDonorAction`, `setPairOverrideAction`, `clearPairOverrideAction`
- `thresholds.ts` — global/category/brand threshold save actions
- `product.ts` — global config, brand shelf life, SKU config actions
- `approval.ts` — batch authorize/reject, transaction cancel
- `draft.ts` — `commitAllAction`, `discardAllAction` (applies all staged changes atomically)

### Page Structure

All app pages live under `src/app/(app)/` with a shared layout (`layout.tsx`) that renders the sidebar server-side (reads pending count from Sheets).

Each page follows the pattern:
- `page.tsx` — async Server Component, fetches data from `gsheets.ts`, passes to a `*Tabs.tsx` client component
- `*Tabs.tsx` — `"use client"`, manages tab state, renders tab content, calls server actions on interaction

Routes:
- `/warehouse` — Warehouse Network, Donor Network, Route Pair Overrides
- `/thresholds` — Global Default, Category Overrides, Brand Overrides
- `/product` — Global Rules, Brand Overrides, SKU Configuration
- `/approval` — Pending Approval (batch auth gate), Manage Transactions
- `/audit` — Audit Log with filters and expandable before/after diffs

### Design System

Dark theme via Tailwind custom colors (in `tailwind.config.ts`):

| Token | Hex | Usage |
|---|---|---|
| `bg-app` | `#0a0e17` | Outermost background |
| `bg-card` | `#141922` | Cards, panels |
| `bg-row` | `#1a1f2e` | Table rows, hover states |
| `border` | `#1e2333` | All borders |
| `text-primary` | `#e2e8f0` | Body text |
| `text-muted` | `#94a3b8` | Secondary text |
| `accent` | `#0d9488` | Teal — buttons, active states, toggles |
| `accent-hover` | `#0f766e` | Button hover |

Shared UI components in `src/components/ui/`: `Badge`, `Toggle`, `InlineEditNumber`, `TabBar`.

### Key Conventions

- **Date formatting**: always pass `'en-GB'` locale to `toLocaleTimeString`/`toLocaleDateString` to avoid SSR/client hydration mismatches.
- **No native `confirm()`**: use inline Cancel/Confirm button UI (example: `DiscardButton` in `SidebarClient.tsx`).
- **Imports**: `Toggle` and other UI components use named exports — `import { Toggle } from "@/components/ui/Toggle"`.
- **All server actions** import from `@/lib/gsheets` only; never import server actions from other server action files.
- **`revalidatePath`** must be called at the end of every server action that mutates data.
