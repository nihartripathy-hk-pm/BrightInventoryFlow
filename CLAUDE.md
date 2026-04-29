# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Next.js dev server (localhost:3000)
npm run build        # Production build (also type-checks)
npm run lint         # ESLint
npm run seed         # Re-populate all 17 Google Sheets tabs with synthetic data (requires .env.local)
npm run auth-setup   # Legacy OAuth2 setup helper (not needed when using service account)
```

**No test suite exists** — this is a prototype.

If you see stale module errors after deleting files, run `rm -rf .next` before restarting the dev server.

## Environment

Create `.env.local` in the project root:

```
GOOGLE_SPREADSHEET_ID=1U-T91N__ouV1EmnaCDcJPq_0Ta3OlutI7chizUMgRTc
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}  # full JSON on one line
```

The service account must have **Editor** access on the spreadsheet. Without credentials the app renders empty states (no crash) — a yellow banner appears in the layout.

## Architecture Overview

### Schema Source of Truth

`db/schema.sql` contains the Redshift DDL for the `inventory` schema. Every GSheet tab must mirror the column structure of its corresponding DB table exactly, including column order and audit trail columns. When adding or changing columns, update both `db/schema.sql` and `src/lib/gsheets.ts` together.

`model/cubes/` contains Cube.js semantic layer YAML files (one per domain area) for analytics on top of the Redshift tables.

### Data Layer: Google Sheets as Database

`src/lib/gsheets.ts` is the **entire data access layer**. It authenticates via service account JSON from env var (falls back to OAuth2 token files, then ADC), then reads/writes 17 named tabs on a single spreadsheet.

**Critical: column-positional parsing.** Every `get*` function maps raw sheet rows by numeric index (`r[0]`, `r[1]`, …). The index must exactly match the position in `SHEET_HEADERS`. When adding, removing, or reordering columns, update `SHEET_HEADERS`, the `get*` function's index mapping, and the corresponding `save*` serialization in lockstep. Running `npm run seed` rewrites all headers.

**Parsing helpers** (private to `gsheets.ts`):
- `str(v)` — coerces undefined to `""`
- `nullStr(v)` — returns `null` for empty/undefined, else the string
- `num(v)` — parses float, returns `null` for empty/NaN
- `bool(v)` — true only for `"true"` or `"TRUE"`

**Tab → Type mapping:**
- `Warehouses` → `Warehouse`
- `MasterSinkConfig` → `MasterSinkConfig`
- `DonorSettings` → `DonorSetting`
- `RoutePairOverrides` → `RoutePairOverride`
- `ThresholdsGlobal/Category/Brand` → `ThresholdsGlobal/Category/Brand`
- `ProductConfigGlobal` → `ProductConfigGlobal`
- `Brands` → `Brand`
- `SKUs` → `SKU`
- `Categories` → `Category`
- `InventoryConditions` → `InventoryCondition`
- `Batches` → `Batch` (mirrors `batch_runs` DB table)
- `TransferOrders` → `TransferOrder`
- `OrderLineItems` → `OrderLineItem`
- `PendingChanges` → `PendingChange` (internal staging queue, no DB equivalent)
- `AuditLog` → `AuditEntry`

**Audit trail columns**: Every tab except `TransferOrders`, `OrderLineItems`, and `PendingChanges` has `created_by, create_dt, updated_by, update_dt` at the end (matching DB). `AuditLog` is append-only so only has `created_by, create_dt`. All types reflect this.

### Draft / Commit Workflow

**Every user mutation is two-phase:**
1. **Stage**: `stageChange()` appends a row to `PendingChanges`. It deduplicates by `(module, entity, targetId)` — a second call for the same key replaces the first, so only the latest value is staged. Exception: `master_sink` entity deduplicates across all `master_sink` rows (only one can ever be pending).
2. **Commit**: `commitAllAction()` in `src/server/actions/draft.ts` reads all pending changes, applies each to its target sheet, clears `PendingChanges`, and writes one `AuditLog` entry per committed change.

The sidebar shows pending count (read server-side in `layout.tsx`). The **Commit Configuration** / **Discard all changes** buttons trigger `commitAllAction` / `discardAllAction`.

### Server Actions

All mutations are Next.js Server Actions in `src/server/actions/`:
- `warehouse.ts` — `setMasterSinkAction`, `clearMasterSinkAction`, `toggleDonorAction`, `setPairOverrideAction`, `clearPairOverrideAction`
- `thresholds.ts` — global/category/brand threshold save actions
- `product.ts` — global config, brand shelf life, SKU config actions
- `approval.ts` — batch authorize/reject, transaction cancel
- `draft.ts` — `commitAllAction`, `discardAllAction`

### Page Structure

All app pages live under `src/app/(app)/` with a shared layout that renders the sidebar server-side.

Each page follows the pattern:
- `page.tsx` — async Server Component, fetches data from `gsheets.ts`, passes to a `*Tabs.tsx` client component
- `*Tabs.tsx` — `"use client"`, manages tab state, renders tab content, calls server actions on interaction

Routes:
- `/warehouse` — Warehouse Network, Donor Network, Route Pair Overrides
- `/thresholds` — Global Default, Category Overrides, Brand Overrides
- `/product` — Global Rules, Brand Overrides, SKU Configuration
- `/approval` — Pending Approval (batch auth gate), Manage Transactions
- `/audit` — Audit Log with filters and expandable before/after diffs

Approval page batch stats (total orders, SKUs, units, COGS, weight) are computed live from `TransferOrder` and `OrderLineItem` data passed as props — they are not stored on the `Batch` record.

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

Shared UI components in `src/components/ui/`: `Badge`, `Toggle`, `InlineEditNumber`, `TabBar`, `CsvUploadPanel`.

### Key Conventions

- **Date formatting**: always pass `'en-GB'` locale to `toLocaleTimeString`/`toLocaleDateString` to avoid SSR/client hydration mismatches.
- **No native `confirm()`**: use inline Cancel/Confirm button UI (example: `DiscardButton` in `SidebarClient.tsx`).
- **Imports**: UI components use named exports — `import { Toggle } from "@/components/ui/Toggle"`.
- **All server actions** import from `@/lib/gsheets` only; never import server actions from other server action files.
- **`revalidatePath`** must be called at the end of every server action that mutates data.
- **Audit fields on write**: every server action that creates a new entity passes `createdBy: "prototype_user", createDt: now`; every action that updates an existing record sets `updatedBy: "prototype_user", updateDt: now`. `appendAuditLog` calls always include `createdBy` and `createDt`.
