# Product Requirements Document — Liquidation Control Center (LCC)

**Owner:** Brightlife Care Operations  
**Status:** Prototype  
**Last updated:** 2026-05-05

---

## 1. Product Overview

The **Liquidation Control Center (LCC)** is an internal operations tool for Brightlife Care that automates the identification, planning, and approval of inventory transfers from regional distribution centers to a designated liquidation sink warehouse.

| Attribute | Value |
|---|---|
| Stack | Next.js 14 App Router, Google Sheets (DB), Redshift (schema source of truth), Cube.js (analytics) |
| Users | Internal ops and finance team at Brightlife Care |
| Data layer | `src/lib/gsheets.ts` — 17 GSheet tabs mirror the Redshift `inventory` schema |
| Schema source | `db/schema.sql` — Redshift DDL; GSheet headers must match column order exactly |
| Analytics layer | `model/cubes/` — Cube.js YAML semantic models |

---

## 2. Problem Statement

Brightlife Care holds slow-moving, near-expiry, or physically damaged inventory across regional distribution centers. Without a structured system:

- **Finance** cannot predict recovery value for batches of liquidation transfers.
- **Ops** has no repeatable workflow to identify eligible inventory, route it correctly, or get the right approval before orders go in-transit.
- **Compliance** has no immutable audit trail of who changed what configuration and when.

LCC addresses all three by providing:
1. A configurable eligibility engine (shelf-life rules, warehouse participation, inventory condition scope).
2. Engine-generated batch planning with threshold-validated transfer orders.
3. A structured approval gate before any order moves to in-transit.
4. An append-only audit log for every configuration change and batch commitment.

---

## 3. Configuration Workflow (Draft / Commit)

### 3.1 Overview

All configuration changes are **staged before they take effect.** This prevents partial or conflicting configurations from being read by the batch engine mid-edit.

```
User edits UI  →  stageChange()  →  PendingChanges tab
                                         │
                           commitAllAction() or discardAllAction()
                                         │
                           Changes applied to target tabs + AuditLog written
```

### 3.2 Configurable Modules

| Module | Entities | Operations |
|---|---|---|
| `warehouse_setup` | `master_sink`, `donor_participation`, `pair_override` | `set`, `clear` |
| `transfer_thresholds` | `global_threshold`, `category_threshold`, `category_threshold_clear`, `brand_threshold`, `brand_threshold_clear` | `set`, `clear` |
| `product_config` | `global_product_config`, `brand_shelf_life`, `sku_config`, `inventory_condition` | `set`, `clear` |

### 3.3 Deduplication Rule

The staging queue deduplicates by `(module, entity, targetId)`. A second `stageChange` call for the same key **replaces** the first — only the latest value for each entity is ever committed. Exception: `master_sink` deduplicates across all `master_sink` rows (only one can ever be pending).

### 3.4 Commit Behaviour

`commitAllAction()`:
1. Reads all rows from `PendingChanges`.
2. Groups by module and applies each change to its target GSheet tab.
3. Writes one `AuditLog` entry per change (with before/after JSON) and one aggregate `configuration_committed` entry. All entries in a session share a `session_id`.
4. Clears `PendingChanges`.

`discardAllAction()` clears `PendingChanges` without applying any changes.

### 3.5 Audit Trail

Every table (except `TransferOrders`, `OrderLineItems`, `PendingChanges`) carries `createdBy`, `createDt`, `updatedBy`, `updateDt`. `AuditLog` is append-only (no `updatedBy`/`updateDt`). The `session_id` field links per-change entries to their parent `configuration_committed` row.

---

## 4. Batch Generation Logic (Core Engine)

> **Current status:** The engine is not yet implemented as running code. Batches are currently seeded manually via `scripts/seed.ts`. This section defines the intended algorithm that the engine must implement.

### 4.1 Inputs

The engine reads the following committed configuration at run time:

| Input | Source | Key filter |
|---|---|---|
| Donor warehouses | `DonorSettings` | `isParticipating = true` |
| Master sink | `MasterSinkConfig` | `isActive = true` (exactly one row) |
| Route overrides | `RoutePairOverrides` | `isActive = true` |
| Inventory conditions | `InventoryConditions` | `isEnabled = true` |
| Asset-class flags | `ProductConfigGlobal` | `standardEnabled`, `opEnabled` |
| Global shelf life | `ProductConfigGlobal` | `standardShelfLifePct`, `opShelfLifePct` |
| Category shelf life | `Categories` | `shelfLifeOverridePct` (NULL → fall through) |
| Brand shelf life | `Brands` | `shelfLifeOverridePct` (NULL → fall through) |
| SKU shelf life + ignore | `SKUs` | `shelfLifeOverridePct`, `isIgnored` |
| Thresholds | `ThresholdsGlobal/Category/Brand` | all `min/max` fields |

### 4.2 SKU Eligibility — Step-by-Step

For each SKU across all donor warehouses, apply these checks in order. Fail any one → exclude.

**Step 1 — Hard gates**
- `sku.isIgnored === false`
- `sku.isActive === true`

**Step 2 — Asset-class gate**
- `type === 'standard'` → `productConfig.standardEnabled === true`
- `type === 'op'` → `productConfig.opEnabled === true`

**Step 3 — Inventory condition gate**
- The SKU's physical state (good / damaged / expired) must have `isEnabled = true` in `InventoryConditions`.

**Step 4 — Shelf-life threshold check**

Resolve the effective shelf-life percentage (first non-null wins):
```
effectivePct =
  sku.shelfLifeOverridePct
  ?? brand.shelfLifeOverridePct
  ?? category.shelfLifeOverridePct
  ?? (type === 'standard' ? productConfig.standardShelfLifePct : productConfig.opShelfLifePct)
```
Defaults: standard = 30%, OP = 50%.

The SKU is eligible if its **remaining shelf-life % < effectivePct**.

### 4.3 Order Assembly

For each participating donor warehouse:
1. Collect all eligible SKUs at that warehouse (from Step 4.2).
2. Determine the destination:
   - Check `RoutePairOverrides` for a row with `donorWarehouseId = warehouse.id` and `isActive = true` → use its `sinkWarehouseId`.
   - Otherwise use the active master sink.
3. Build one `TransferOrder` per donor warehouse (aggregating all eligible SKU quantities).
4. Attach one `OrderLineItem` per eligible SKU to that order.

### 4.4 Threshold Validation

After aggregating line items into an order, validate the order totals against the applicable threshold. **Orders that fail any bound are dropped from the batch.**

Threshold precedence per dimension (first non-null wins):
```
Brand-level threshold (if row exists for any SKU's brand in the order)
?? Category-level threshold (if row exists for the order's category)
?? Global threshold
```

Bounds (null = unconstrained):
```
cogsMin  ≤ order.cogs    ≤ cogsMax
unitsMin ≤ order.units   ≤ unitsMax
weightMin ≤ order.weight ≤ weightMax
```

### 4.5 Batch Record Creation

Once all valid orders are assembled:

```
1. Create batch_run row: status = 'pending_approval', generatedAt = now
2. For each transfer order: create TransferOrder row (status = 'pending')
3. For each line item: create OrderLineItem row
```

ID formats:
- Batch run: `LIQ-YYYY-NNNN`
- Transfer order: `TXN-NNNN-NNN`
- Line item: `LI-NNN`
- Warehouse: `WH-[CITY]-NN`

### 4.6 Batch Status Transitions

```
Batch run:       pending_approval → committed | rejected
Transfer order:  pending → in_transit (on commit) | cancelled (manual cancel, pending only)
```

### 4.7 Order Type Mapping

| Type | Meaning |
|---|---|
| `wh_transfer` | Standard warehouse-to-warehouse move within the company |
| `b2b` | Cross-company or 3PL destination |
| `liq_stock` | Direct liquidation to sink (non-standard channel) |

---

## 5. Approval Workflow

> Covered briefly — the primary focus is batch generation and configuration.

1. **Review:** Ops reviews generated orders and SKU-level line items (including expiry dates).
2. **Auth gate:** User must type the batch ID exactly to enable the "Authorize Batch" button — prevents accidental commits.
3. **Commit:** `commitBatchAction()` — `pending_approval → committed`; all orders move to `in_transit`.
4. **Reject:** `rejectBatchAction()` — `pending_approval → rejected`.
5. **Cancel:** Individual `pending` orders can be cancelled via `cancelTransactionAction()` or bulk-cancelled by batch ID or source warehouse.

---

## 6. Analytics & Reporting Requirements

Analytics run on top of Redshift tables that mirror the GSheet structure. Cube.js provides the semantic layer at `model/cubes/`.

### 6.1 Existing Semantic Models

| Model file | Domain | Key measures |
|---|---|---|
| `warehouse_network.yaml` | Warehouses, donors, master sink | `total_stock_units`, `avg_capacity_pct`, donor/sink flags |
| `sku_catalog.yaml` | SKU catalog, brand, category | `active_skus`, `ignored_skus`, standard vs. OP counts, `effective_shelf_life_source` |
| `transfer_thresholds.yaml` | Category & brand threshold overrides | All min/max dimensions; active-only segment |
| `batches.yaml` | Batch runs and per-donor batches | `approval_lag_days`, status breakdowns, temporal grouping |
| `audit_log.yaml` | Configuration & batch events | Commit counts vs. individual changes, by module/action/entity |
| `inventory_conditions.yaml` | Condition type scope | `in_scope_label`, enabled/disabled counts |

### 6.2 Dashboard Requirements

| Dashboard | Key questions answered |
|---|---|
| **Batch throughput** | How many batches per week? What is average approval lag? |
| **Donor contribution** | Which warehouses contribute the most COGS / units per batch? |
| **SKU eligibility funnel** | Of all active SKUs, how many are ignored, out of scope, or eligible? |
| **Threshold breach rate** | What % of assembled orders are dropped for failing threshold bounds? |
| **Audit commit frequency** | How often are configuration changes committed? By which module? |
| **Capacity & stock** | Which warehouses are above 80% capacity? What is the total stock at donors? |

### 6.3 Key Dimensions for Slicing

- `batch_run.status`, `batch_run.generated_at` (week/month)
- `audit_log.module`, `audit_log.action`, `audit_log.user_id`
- `sku.type` (standard/OP), `sku.category_id`, `sku.brand_id`
- `transfer_order.type`, `transfer_order.status`, `transfer_order.source_warehouse_id`

---

## 7. Data Model Reference

### 7.1 Entity Summary (all 17 GSheet tabs → Redshift tables)

| Tab / Table | Purpose |
|---|---|
| `Warehouses` | All warehouse nodes (donors + sink) |
| `MasterSinkConfig` | Active liquidation destination (one `isActive=true` row) |
| `DonorSettings` | Per-warehouse participation flag |
| `RoutePairOverrides` | Custom donor → sink routing |
| `ThresholdsGlobal` | Single-row global COGS/units/weight bounds |
| `ThresholdsCategory` | Per-category threshold overrides |
| `ThresholdsBrand` | Per-brand threshold overrides |
| `ProductConfigGlobal` | Global shelf-life % and asset-class enable flags |
| `Categories` | Product category with optional shelf-life override |
| `Brands` | Brand with optional shelf-life override |
| `SKUs` | Individual products (standard / OP) with override and ignore flag |
| `InventoryConditions` | Three seed rows (good/damaged/expired); toggled per run |
| `Batches` | Per-donor entries within a batch run (`batch_runs` in Redshift) |
| `TransferOrders` | Actual transfer orders (no audit columns) |
| `OrderLineItems` | SKU-level line items per order (no audit columns) |
| `PendingChanges` | Internal staging queue — no Redshift equivalent |
| `AuditLog` | Append-only event log (no `updatedBy`/`updateDt`) |

### 7.2 Audit Column Convention

Tables **with** full audit columns: `Warehouses`, `MasterSinkConfig`, `DonorSettings`, `RoutePairOverrides`, `ThresholdsGlobal/Category/Brand`, `ProductConfigGlobal`, `Categories`, `Brands`, `SKUs`, `InventoryConditions`, `Batches`

Tables **without** audit columns: `TransferOrders`, `OrderLineItems`, `PendingChanges`

`AuditLog`: append-only — has `createdBy` + `createDt` only.

### 7.3 Status & Enum Values

| Field | Values |
|---|---|
| `batch_run.status` | `pending_approval`, `committed`, `rejected` |
| `transfer_order.status` | `pending`, `in_transit`, `cancelled` |
| `transfer_order.type` | `wh_transfer`, `b2b`, `liq_stock` |
| `sku.type` | `standard`, `op` |
| `inventory_condition.condition_type` | `good`, `damaged`, `expired` |
| `audit_log.module` | `warehouse_setup`, `transfer_thresholds`, `product_config`, `draft`, `transfer_approval` |

---

## 8. Open Technical Decisions & Known Gaps

| Item | Status |
|---|---|
| **Batch generation engine** | Not yet implemented; batches are currently seeded manually via `scripts/seed.ts` |
| **Shelf-life remaining % calculation** | Logic defined in this PRD; requires `expiryDate` and `totalShelfLife` per SKU — `totalShelfLife` field not currently in the schema |
| **Threshold level selection for mixed-brand orders** | Not resolved: a single transfer order may contain SKUs from multiple brands/categories — which threshold level applies? Current assumption: most restrictive wins |
| **Test suite** | No automated tests — prototype stage |
| **Cube.js ↔ Redshift connection** | Cube.js models are defined but not connected to a live Redshift instance in the current environment |
| **Engine trigger** | No scheduled or event-driven trigger for batch generation — manual for now |
