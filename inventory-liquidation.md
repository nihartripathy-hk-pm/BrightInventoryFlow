---
name: inventory-liquidation
description: Apply Brightlife Care LCC liquidation inventory data-generation logic — SKU eligibility, batch creation, threshold validation, and GSheet schema conventions.
triggers:
  - generate batch
  - liquidation run
  - create inventory data
  - seed transfer orders
  - eligible SKUs
  - batch generation
  - shelf life
  - transfer order
---

# Inventory Liquidation — Data-Generation Logic

## 1. Business Context

Brightlife Care's **Liquidation Control Center (LCC)** identifies near-expiry, damaged, or slow-moving warehouse inventory and moves it to a single master liquidation sink via structured transfer orders. The engine reads configuration state (warehouse network, product rules, thresholds) and produces a batch of transfer orders that must pass a human approval gate before execution.

All configuration is stored in Google Sheets (17 tabs mirroring a Redshift schema). `src/lib/gsheets.ts` is the sole data-access layer. Never bypass it to write directly to sheet tabs.

---

## 2. Configuration Inputs the Engine Consumes

| Input | Source tab | Key fields |
|---|---|---|
| Active donor warehouses | `DonorSettings` | `isParticipating = true`, `isActive = true` |
| Master sink | `MasterSinkConfig` | row where `isActive = true` (exactly one) |
| Route overrides | `RoutePairOverrides` | `isActive = true` — overrides master sink per donor |
| Enabled inventory conditions | `InventoryConditions` | `isEnabled = true` — controls which physical states (good/damaged/expired) are in scope |
| Asset-class flags | `ProductConfigGlobal` | `standardEnabled`, `opEnabled` |
| Global shelf life | `ProductConfigGlobal` | `standardShelfLifePct` (default 30%), `opShelfLifePct` (default 50%) |
| Category shelf life overrides | `Categories` | `shelfLifeOverridePct` (NULL = use global) |
| Brand shelf life overrides | `Brands` | `shelfLifeOverridePct` (NULL = fall through to category) |
| SKU shelf life overrides | `SKUs` | `shelfLifeOverridePct` (NULL = fall through to brand) |
| SKU ignore list | `SKUs` | `isIgnored = true` → excluded from all batches |
| Thresholds (global) | `ThresholdsGlobal` | `cogsMin/Max`, `unitsMin/Max`, `weightMin/Max` |
| Thresholds (category) | `ThresholdsCategory` | per-category overrides; NULL field = fall through to global |
| Thresholds (brand) | `ThresholdsBrand` | per-brand overrides; NULL field = fall through to category |

---

## 3. SKU Eligibility Algorithm

For each SKU, apply **all** checks in order. Fail any one → SKU excluded.

### 3a. Hard gates
```
sku.isIgnored === false
sku.isActive === true
```

### 3b. Asset-class gate
```
if sku.type === 'standard'  →  productConfig.standardEnabled === true
if sku.type === 'op'        →  productConfig.opEnabled === true
```

### 3c. Inventory condition gate
At least one condition that applies to this SKU's physical state must be `isEnabled = true`.

Condition types: `'good' | 'damaged' | 'expired'`

### 3d. Shelf-life threshold check

Resolve the **effective shelf-life percentage** for this SKU using the precedence cascade (first non-null wins):

```
effectivePct =
  sku.shelfLifeOverridePct
  ?? brand.shelfLifeOverridePct      (brand matching sku.brandId)
  ?? category.shelfLifeOverridePct   (category matching sku.categoryId)
  ?? (sku.type === 'standard'
        ? productConfig.standardShelfLifePct   // default 30
        : productConfig.opShelfLifePct)        // default 50
```

The SKU is eligible if its **remaining shelf-life % is below** `effectivePct`.

> Remaining shelf-life % = `(expiryDate - today) / totalShelfLife × 100`

---

## 4. Warehouse Network Rules

1. Only warehouses with `DonorSetting.isParticipating = true` contribute inventory.
2. The master sink (`MasterSinkConfig` row where `isActive = true`) is the **default destination**.
3. If a `RoutePairOverride` row exists with `donorWarehouseId = donor.id` and `isActive = true`, use its `sinkWarehouseId` instead of the master sink.
4. The master sink warehouse is **automatically excluded** from donor participation.
5. There is always exactly one active master sink at a time. When changing it: flip the previous row to `isActive = false`, insert a new row with `isActive = true`.

---

## 5. Transfer Order Threshold Validation

After assembling line items for a donor warehouse, validate the aggregated order totals against the applicable threshold. An order that fails any bound is **excluded from the batch**.

### 5a. Threshold precedence (first non-null wins per dimension)
```
effectiveThreshold[dim] =
  brand-level threshold row (matching sku's brandId) — if row exists and field not null
  ?? category-level threshold row (matching sku's categoryId) — if row exists and field not null
  ?? global threshold
```

Note: Thresholds are applied at the **order level** (per donor warehouse), not per SKU.

### 5b. Bounds check
```
cogsMin  ≤ order.cogs    ≤ cogsMax
unitsMin ≤ order.units   ≤ unitsMax
weightMin ≤ order.weight ≤ weightMax
```

Null bounds are treated as unconstrained (no lower/upper limit on that dimension).

---

## 6. Batch Data Structure & ID Formats

### Hierarchy
```
batch_run  (one per engine run)
  └─ transfer_orders  (one per donor warehouse)
        └─ order_line_items  (one per eligible SKU in that order)
```

### ID conventions (must match existing patterns)
| Entity | Format | Example |
|---|---|---|
| Batch run | `LIQ-YYYY-NNNN` | `LIQ-2024-0047` |
| Transfer order | `TXN-NNNN-NNN` | `TXN-0047-001` |
| Line item | `LI-NNN` | `LI-001` |
| Warehouse | `WH-[CITY]-NN` | `WH-MUM-01` |

### Batch run fields
```typescript
{
  id,               // LIQ-YYYY-NNNN
  masterSinkId,     // FK to active MasterSinkConfig
  masterSinkName,
  status: 'pending_approval',
  generatedAt,      // ISO timestamp
  committedBy: null,
  committedAt: null,
  isActive: true,
  createdBy: 'prototype_user',
  createDt: now,
  updatedBy: null,
  updateDt: null,
}
```

### Transfer order fields
```typescript
{
  id,               // TXN-NNNN-NNN
  batchId,          // FK to batch_run.id
  type: 'wh_transfer' | 'b2b' | 'liq_stock',
  sourceWarehouseId,
  sourceName,
  destinationWarehouseId,
  destinationName,
  units,            // aggregated from line items
  cogs,             // aggregated from line items
  weight,           // aggregated from line items
  status: 'pending',
}
```

Order type guide:
- `wh_transfer` — standard warehouse-to-warehouse within the company
- `b2b` — cross-company or 3PL destination
- `liq_stock` — direct liquidation to sink (non-standard channel)

### Order line item fields
```typescript
{
  id,           // LI-NNN
  orderId,      // FK to transfer_order.id
  skuId,
  skuName,
  units,
  cogs,
  expiryDate,   // ISO date string or null
}
```

---

## 7. Status State Machines

**Batch run:**
```
pending_approval → committed   (via commitBatchAction)
pending_approval → rejected    (via rejectBatchAction)
```

**Transfer order:**
```
pending → in_transit   (when batch committed)
pending → cancelled    (via cancelTransactionAction — only from pending)
```

---

## 8. Draft / Commit Workflow (Configuration Changes)

All config mutations must go through the two-phase draft system. **Never write directly to GSheet tabs.**

```
stageChange(pendingChange)   →  appends/replaces row in PendingChanges tab
commitAllAction()            →  applies all pending changes, writes AuditLog entries, clears PendingChanges
discardAllAction()           →  clears PendingChanges without applying
```

Deduplication key: `(module, entity, targetId)` — a second stage for the same key replaces the first. Exception: `master_sink` entity deduplicates across all `master_sink` rows.

Modules: `warehouse_setup` | `transfer_thresholds` | `product_config`

Audit trail: every committed change produces one `AuditLog` entry (before/after JSON) plus one aggregate `configuration_committed` entry, all linked by a shared `session_id`.

---

## 9. Column-Positional Parsing — Critical Convention

`gsheets.ts` maps GSheet rows by **numeric index** (`r[0]`, `r[1]`, …). When adding, removing, or reordering columns:
1. Update `SHEET_HEADERS` array
2. Update the `get*` function's index mapping
3. Update the matching `save*` serialization
4. Run `npm run seed` to rewrite column headers on the sheet

Parsing helpers (private to `gsheets.ts`): `str(v)`, `nullStr(v)`, `num(v)`, `bool(v)`.

---

## 10. Audit Trail Column Convention

Every table **except** `TransferOrders`, `OrderLineItems`, and `PendingChanges` carries:
```
createdBy, createDt, updatedBy (nullable), updateDt (nullable)
```

`AuditLog` is append-only — it only has `createdBy` and `createDt`.

When creating a new entity: pass `createdBy: 'prototype_user', createDt: now`.
When updating an existing entity: pass `updatedBy: 'prototype_user', updateDt: now`.
