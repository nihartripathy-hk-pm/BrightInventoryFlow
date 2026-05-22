"use client";

import { useState, useTransition } from "react";
import { ProductConfigGlobal, SKU, Brand, InventoryCondition } from "@/lib/gsheets";
import { Toggle } from "@/components/ui/Toggle";
import { InlineEditNumber } from "@/components/ui/InlineEditNumber";
import { TabBar } from "@/components/ui/TabBar";
import { CsvUploadPanel } from "@/components/ui/CsvUploadPanel";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { PendingBadge } from "@/components/ui/PendingBadge";
import {
  saveProductGlobalAction,
  saveBrandShelfLifeAction,
  saveSKUConfigAction,
  saveInventoryConditionAction,
} from "@/server/actions/product";

interface Props {
  config: ProductConfigGlobal;
  skus: SKU[];
  brands: Brand[];
  inventoryConditions: InventoryCondition[];
  pendingBrandIds: Set<string>;
  pendingSkuIds: Set<string>;
  pendingConditionIds: Set<string>;
  pendingGlobalFields: Set<string>;
}

const TABS = [
  { key: "global",     label: "Global Rules" },
  { key: "brands",     label: "Brand Overrides" },
  { key: "skus",       label: "SKU Configuration" },
  { key: "conditions", label: "Inventory Conditions" },
];

/* ─────────────────────── Tab 1: Global Rules ─────────────────────── */

function GlobalRulesTab({
  config,
  skus,
  pendingGlobalFields,
}: {
  config: ProductConfigGlobal;
  skus: SKU[];
  pendingGlobalFields: Set<string>;
}) {
  const [, startTransition] = useTransition();
  const [standardPct, setStandardPct] = useState(config.standardShelfLifePct);
  const [opPct, setOpPct] = useState(config.opShelfLifePct);
  const [standardMinPct, setStandardMinPct] = useState<number | null>(config.standardShelfLifeMinPct);
  const [opMinPct, setOpMinPct] = useState<number | null>(config.opShelfLifeMinPct);
  const [standardEnabled, setStandardEnabled] = useState(config.standardEnabled);
  const [opEnabled, setOpEnabled] = useState(config.opEnabled);

  const standardCount = skus.filter((s) => s.type === "standard").length;
  const opCount = skus.filter((s) => s.type === "op").length;

  function handleSlider(
    field: "standardShelfLifePct" | "opShelfLifePct",
    value: number,
    setter: (v: number) => void
  ) {
    setter(value);
    startTransition(() => { saveProductGlobalAction(field, value); });
  }

  function handleMin(
    field: "standardShelfLifeMinPct" | "opShelfLifeMinPct",
    value: number | null,
    setter: (v: number | null) => void
  ) {
    setter(value);
    startTransition(() => { saveProductGlobalAction(field, value as number); });
  }

  function handleToggle(
    field: "standardEnabled" | "opEnabled",
    current: boolean,
    setter: (v: boolean) => void
  ) {
    setter(!current);
    startTransition(() => { saveProductGlobalAction(field, !current); });
  }

  return (
    <div className="space-y-4">
      {/* Precedence Hierarchy */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="6" cy="6" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="12" cy="18" r="2" />
            <path strokeLinecap="round" d="M6 8v2a2 2 0 002 2h8a2 2 0 002-2V8M12 12v4" />
          </svg>
          <h3 className="text-sm font-semibold text-primary">Precedence Hierarchy</h3>
          <span className="text-xs text-muted">Highest wins</span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-3">
          {/* Tier 01 */}
          <div className="bg-row border border-border rounded-lg p-4">
            <p className="text-[10px] font-mono text-muted tracking-wider mb-2">TIER 01</p>
            <span className="inline-block text-xs font-medium bg-violet-900/30 text-violet-400 border border-violet-800/30 px-2.5 py-1 rounded-md mb-2">
              SKU Override
            </span>
            <p className="text-sm text-primary font-medium">Per-SKU threshold</p>
            <p className="text-xs text-muted italic mt-0.5">Highest priority</p>
          </div>

          <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>

          {/* Tier 02 */}
          <div className="bg-row border border-border rounded-lg p-4">
            <p className="text-[10px] font-mono text-muted tracking-wider mb-2">TIER 02</p>
            <span className="inline-block text-xs font-medium bg-accent/15 text-accent border border-accent/30 px-2.5 py-1 rounded-md mb-2">
              Brand Override
            </span>
            <p className="text-sm text-primary font-medium">Per-brand threshold</p>
            <p className="text-xs text-muted italic mt-0.5">Falls back if SKU null</p>
          </div>

          <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>

          {/* Tier 03 */}
          <div className="bg-row border border-border rounded-lg p-4">
            <p className="text-[10px] font-mono text-muted tracking-wider mb-2">TIER 03</p>
            <span className="inline-block text-xs font-medium bg-row text-muted border border-border px-2.5 py-1 rounded-md mb-2">
              Global Default
            </span>
            <p className="text-sm text-primary font-medium">System-wide baseline</p>
            <p className="text-xs text-muted italic mt-0.5">Lowest priority</p>
          </div>
        </div>
      </div>

      {/* Global Shelf Life Threshold */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-primary">Global Shelf Life Threshold</h3>
            <p className="text-xs text-muted mt-1">
              Default liquidation trigger — applied when no Brand or SKU override exists
            </p>
          </div>
          <span className="text-xs bg-row text-muted border border-border px-2.5 py-1 rounded-md whitespace-nowrap">
            System Default
          </span>
        </div>

        <div className="grid grid-cols-2 gap-6 mt-2">
          {/* Standard */}
          <div className="bg-row/40 border border-border rounded-lg p-4 space-y-4">
            <p className="text-xs font-medium text-muted uppercase tracking-wider">Standard SKUs</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted flex items-center gap-2">
                Min
                {pendingGlobalFields.has("standardShelfLifeMinPct") && <PendingBadge />}
              </p>
              <InlineEditNumber
                value={standardMinPct}
                suffix="%"
                placeholder="—"
                onSave={(v) => handleMin("standardShelfLifeMinPct", v, setStandardMinPct)}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted flex items-center gap-2">
                Max
                {pendingGlobalFields.has("standardShelfLifePct") && <PendingBadge />}
              </p>
              <InlineEditNumber
                value={standardPct}
                suffix="%"
                placeholder="—"
                onSave={(v) => handleSlider("standardShelfLifePct", v ?? standardPct, setStandardPct)}
              />
            </div>
          </div>

          {/* OP */}
          <div className="bg-row/40 border border-border rounded-lg p-4 space-y-4">
            <p className="text-xs font-medium text-muted uppercase tracking-wider">OP SKUs</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted flex items-center gap-2">
                Min
                {pendingGlobalFields.has("opShelfLifeMinPct") && <PendingBadge />}
              </p>
              <InlineEditNumber
                value={opMinPct}
                suffix="%"
                placeholder="—"
                onSave={(v) => handleMin("opShelfLifeMinPct", v, setOpMinPct)}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted flex items-center gap-2">
                Max
                {pendingGlobalFields.has("opShelfLifePct") && <PendingBadge />}
              </p>
              <InlineEditNumber
                value={opPct}
                suffix="%"
                placeholder="—"
                onSave={(v) => handleSlider("opShelfLifePct", v ?? opPct, setOpPct)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Asset Class Eligibility */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-primary">Asset Class Eligibility</h3>
        <p className="text-xs text-muted mt-1 mb-4">
          Global switches to enable or disable entire inventory classes from liquidation
        </p>

        <div className="space-y-3">
          {/* Standard */}
          <div className="bg-row/40 border border-border rounded-lg p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-primary font-semibold">Standard SKUs</p>
                <span className="text-[10px] font-medium bg-row border border-border text-muted px-1.5 py-0.5 rounded">
                  {standardCount} SKUs
                </span>
              </div>
              <p className="text-xs text-muted">
                Regular active inventory eligible for liquidation. Individual SKU overrides are still respected.
              </p>
            </div>
            <button className="text-xs text-primary bg-row border border-border hover:border-accent/40 px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors">
              Manage SKUs
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              {pendingGlobalFields.has("standardEnabled") && <PendingBadge />}
              <span className={`text-xs font-medium ${standardEnabled ? "text-green-400" : "text-muted"}`}>
                {standardEnabled ? "Enabled" : "Disabled"}
              </span>
              <Toggle
                checked={standardEnabled}
                onChange={() => handleToggle("standardEnabled", standardEnabled, setStandardEnabled)}
              />
            </div>
          </div>

          {/* OP */}
          <div className="bg-row/40 border border-border rounded-lg p-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-primary font-semibold">OP SKUs (Outdated Packaging)</p>
                <span className="text-[10px] font-medium bg-amber-900/20 border border-amber-800/40 text-amber-400 px-1.5 py-0.5 rounded">
                  {opCount} SKUs
                </span>
              </div>
              <p className="text-xs text-muted">
                Inventory with outdated packaging. These are prioritised for liquidation when enabled.
              </p>
            </div>
            <button className="text-xs text-primary bg-row border border-border hover:border-accent/40 px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors">
              Manage SKUs
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              {pendingGlobalFields.has("opEnabled") && <PendingBadge />}
              <span className={`text-xs font-medium ${opEnabled ? "text-green-400" : "text-muted"}`}>
                {opEnabled ? "Enabled" : "Disabled"}
              </span>
              <Toggle
                checked={opEnabled}
                onChange={() => handleToggle("opEnabled", opEnabled, setOpEnabled)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Tab 2: Brand Overrides ─────────────────────── */

function BrandOverridesTab({
  brands,
  config,
  pendingBrandIds,
}: {
  brands: Brand[];
  config: ProductConfigGlobal;
  pendingBrandIds: Set<string>;
}) {
  const [, startTransition] = useTransition();
  const [addBrandId, setAddBrandId] = useState<string>("");
  const [showAdd, setShowAdd] = useState(false);

  // Show a brand if it's active OR if it has a pending change (so a disable-in-flight stays visible with a Pending badge)
  const activeBrands = brands.filter((b) => b.isActive || pendingBrandIds.has(b.id));
  const inactiveBrandOptions = brands
    .filter((b) => !b.isActive && !pendingBrandIds.has(b.id))
    .map((b) => ({ id: b.id, name: b.name }));

  function handleShelfLife(brand: Brand, value: number | null) {
    startTransition(() => {
      saveBrandShelfLifeAction(
        brand.id, brand.name, brand.categoryId,
        value,
        true
      );
    });
  }

  function handleToggle(brand: Brand, newActive: boolean) {
    startTransition(() => {
      saveBrandShelfLifeAction(
        brand.id, brand.name, brand.categoryId,
        brand.shelfLifeOverridePct,
        newActive
      );
    });
  }

  function handleAdd() {
    if (!addBrandId) return;
    const brand = brands.find((b) => b.id === addBrandId);
    if (!brand) return;
    setAddBrandId("");
    setShowAdd(false);
    startTransition(() => {
      saveBrandShelfLifeAction(
        brand.id, brand.name, brand.categoryId,
        brand.shelfLifeOverridePct ?? config.standardShelfLifePct,
        true
      );
    });
  }

  return (
    <div>
      {/* CSV Upload */}
      <CsvUploadPanel
        title="Brand Overrides Bulk Upload"
        columns={["brand_id", "shelf_life_pct", "active"]}
        onUpload={async (rows) => {
          for (const row of rows) {
            const id = row["brand_id"];
            if (!id) continue;
            const brand = brands.find((b) => b.id === id);
            if (!brand) continue;
            const rawPct = row["shelf_life_pct"]?.trim();
            const pct = rawPct && rawPct !== "" ? parseFloat(rawPct) : null;
            const rawActive = (row["active"] ?? "").toLowerCase().trim();
            const active = rawActive === "true" || rawActive === "1" || rawActive === "yes";
            await saveBrandShelfLifeAction(
              brand.id, brand.name, brand.categoryId,
              pct !== null && !isNaN(pct) ? pct : null,
              active
            );
          }
        }}
      />

      {/* Add button row */}
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <span className="text-xs text-muted-dark whitespace-nowrap">
          {activeBrands.length} brand override{activeBrands.length === 1 ? "" : "s"}
        </span>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="px-3 py-2 text-xs font-medium bg-accent/10 text-accent border border-accent/30 rounded-lg hover:bg-accent/20 transition-colors"
        >
          {showAdd ? "Cancel" : "+ Add override"}
        </button>
      </div>

      {showAdd && (
        <div className="bg-card border border-accent/30 rounded-xl p-4 mb-4 flex flex-wrap items-end gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted mb-1">Brand</p>
            <SearchableSelect
              options={inactiveBrandOptions}
              value={addBrandId}
              onChange={setAddBrandId}
              placeholder="Pick brand…"
              searchPlaceholder="Search brand…"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!addBrandId}
            className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-md hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add override
          </button>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-row">
              {["Brand", "Category", "Shelf Life Override", "Status"].map((col) => (
                <th key={col} className="text-left text-xs font-medium text-muted uppercase tracking-wide px-4 py-3">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeBrands.map((brand) => (
              <tr key={brand.id} className="border-b border-border hover:bg-row/50 transition-colors">
                {/* Brand */}
                <td className="px-4 py-3">
                  <p className="font-medium text-primary">{brand.name}</p>
                  <p className="text-xs text-muted font-mono">{brand.id}</p>
                </td>

                {/* Category */}
                <td className="px-4 py-3 text-sm text-muted font-mono">{brand.categoryId}</td>

                {/* Shelf Life Override (inline edit) */}
                <td className="px-4 py-3">
                  <InlineEditNumber
                    value={brand.shelfLifeOverridePct}
                    placeholder={`Global (${config.standardShelfLifePct}%)`}
                    suffix="%"
                    onSave={(value) => handleShelfLife(brand, value)}
                  />
                </td>

                {/* Status toggle */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Toggle
                      checked={brand.isActive}
                      onChange={(val) => handleToggle(brand, val)}
                    />
                    <span className="text-xs bg-teal-900/30 text-teal-400 border border-teal-800/30 px-2 py-0.5 rounded-full">
                      Brand Override
                    </span>
                    {pendingBrandIds.has(brand.id) && <PendingBadge />}
                  </div>
                </td>
              </tr>
            ))}
            {activeBrands.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-muted text-sm">
                  No brand overrides yet. Use + Add override or the bulk CSV upload to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────── Tab 3: SKU Configuration ─────────────────────── */

type EligibilityFilter = "all" | "eligible" | "ignored";
type TypeFilter = "all" | "standard" | "op";

function SKUConfigTab({
  skus,
  brands,
  config,
  pendingSkuIds,
}: {
  skus: SKU[];
  brands: Brand[];
  config: ProductConfigGlobal;
  pendingSkuIds: Set<string>;
}) {
  const [, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [eligibilityFilter, setEligibilityFilter] = useState<EligibilityFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [addSkuId, setAddSkuId] = useState<string>("");
  const [showAdd, setShowAdd] = useState(false);

  function sourceOf(sku: SKU): "sku" | "brand" | "global" {
    if (sku.shelfLifeOverridePct !== null) return "sku";
    const brandOverride = brands.find((b) => b.id === sku.brandId);
    if (brandOverride?.isActive) return "brand";
    return "global";
  }

  const skusWithOverride = skus.filter((s) => sourceOf(s) === "sku");

  const filtered = skusWithOverride.filter((s) => {
    if (
      searchQuery &&
      !s.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !s.id.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !s.brandName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !s.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    if (eligibilityFilter === "eligible" && s.isIgnored) return false;
    if (eligibilityFilter === "ignored" && !s.isIgnored) return false;
    if (typeFilter === "standard" && s.type !== "standard") return false;
    if (typeFilter === "op" && s.type !== "op") return false;
    return true;
  });

  const globalSkuOptions = skus
    .filter((s) => sourceOf(s) !== "sku")
    .map((s) => ({ id: s.id, name: s.name }));

  function handleAddSkuOverride() {
    if (!addSkuId) return;
    const sku = skus.find((s) => s.id === addSkuId);
    if (!sku) return;
    setAddSkuId("");
    setShowAdd(false);
    startTransition(() => {
      saveSKUConfigAction(sku.id, config.standardShelfLifePct, sku.isIgnored);
    });
  }

  function handleSKUShelfLife(sku: SKU, value: number | null) {
    startTransition(() => { saveSKUConfigAction(sku.id, value, sku.isIgnored); });
  }

  function handleSKUToggle(sku: SKU, val: boolean) {
    startTransition(() => { saveSKUConfigAction(sku.id, sku.shelfLifeOverridePct, !val); });
  }

  const segBase = "px-3 py-2 text-xs font-medium transition-colors";
  const segActive = "bg-accent/10 text-accent";
  const segInactive = "text-muted hover:text-primary";

  return (
    <div>
      {/* CSV Upload */}
      <CsvUploadPanel
        title="SKU Configuration Bulk Upload"
        columns={["sku_id", "override_days", "ignored"]}
        onUpload={async (rows) => {
          for (const row of rows) {
            const skuId = row["sku_id"];
            if (!skuId) continue;
            const rawDays = row["override_days"]?.trim();
            const overridePct = rawDays && rawDays !== "" ? parseFloat(rawDays) : null;
            const rawIgnored = (row["ignored"] ?? "").toLowerCase().trim();
            const isIgnored = rawIgnored === "true" || rawIgnored === "1" || rawIgnored === "yes";
            await saveSKUConfigAction(
              skuId,
              overridePct !== null && !isNaN(overridePct) ? overridePct : null,
              isIgnored
            );
          }
        }}
      />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search SKU, name, brand, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-row border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-primary placeholder:text-muted-dark focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Eligibility filter */}
        <div className="flex items-center rounded-lg border border-border overflow-hidden">
          {(["all", "eligible", "ignored"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setEligibilityFilter(f)}
              className={`${segBase} ${eligibilityFilter === f ? segActive : segInactive}`}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex items-center rounded-lg border border-border overflow-hidden">
          {(["all", "standard", "op"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`${segBase} ${typeFilter === f ? segActive : segInactive}`}
            >
              {f === "all" ? "All Types" : f === "standard" ? "Standard" : "OP"}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowAdd((v) => !v)}
          className="px-3 py-2 text-xs font-medium bg-accent/10 text-accent border border-accent/30 rounded-lg hover:bg-accent/20 transition-colors whitespace-nowrap"
        >
          {showAdd ? "Cancel" : "+ Add override"}
        </button>

        <span className="text-xs text-muted-dark whitespace-nowrap">
          {filtered.length} / {skusWithOverride.length} overridden SKUs
        </span>
      </div>

      {showAdd && (
        <div className="bg-card border border-accent/30 rounded-xl p-4 mb-4 flex flex-wrap items-end gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted mb-1">SKU</p>
            <SearchableSelect
              options={globalSkuOptions}
              value={addSkuId}
              onChange={setAddSkuId}
              placeholder="Pick SKU…"
              searchPlaceholder="Search SKU…"
            />
          </div>
          <button
            onClick={handleAddSkuOverride}
            disabled={!addSkuId}
            className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-md hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add override
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-row">
              {["SKU", "Brand / Category", "Type", "Shelf Life", "Source", "Stock", "Eligibility"].map((col) => (
                <th key={col} className="text-left text-xs font-medium text-muted uppercase tracking-wide px-4 py-3">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((sku) => {
              const brandOverride = brands.find((b) => b.id === sku.brandId);
              const source = sourceOf(sku);

              return (
                <tr key={sku.id} className="border-b border-border hover:bg-row/50 transition-colors">
                  {/* SKU */}
                  <td className="px-4 py-3 max-w-[280px]">
                    <p className="font-medium text-primary">{sku.name}</p>
                    <p className="text-xs text-muted font-mono">{sku.id}</p>
                  </td>

                  {/* Brand / Category */}
                  <td className="px-4 py-3">
                    <p className="text-sm text-primary">{sku.brandName}</p>
                    <p className="text-xs text-muted">{sku.categoryName}</p>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3">
                    {sku.type === "op" ? (
                      <span className="text-xs bg-amber-900/30 text-amber-400 border border-amber-800/30 px-2 py-0.5 rounded-full">
                        OP
                      </span>
                    ) : (
                      <span className="text-xs bg-blue-900/30 text-blue-400 border border-blue-800/30 px-2 py-0.5 rounded-full">
                        Standard
                      </span>
                    )}
                  </td>

                  {/* Shelf Life (inline edit) */}
                  <td className="px-4 py-3">
                    <InlineEditNumber
                      value={sku.shelfLifeOverridePct}
                      suffix="%"
                      placeholder={`${
                        brandOverride?.isActive && brandOverride.shelfLifeOverridePct
                          ? brandOverride.shelfLifeOverridePct
                          : config.standardShelfLifePct
                      }%`}
                      onSave={(value) => handleSKUShelfLife(sku, value)}
                    />
                  </td>

                  {/* Source badge */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs bg-violet-900/30 text-violet-400 border border-violet-800/30 px-2 py-0.5 rounded-full">
                        SKU Override
                      </span>
                      {pendingSkuIds.has(sku.id) && <PendingBadge />}
                    </div>
                  </td>

                  {/* Stock */}
                  <td className="px-4 py-3 text-sm text-muted whitespace-nowrap">
                    {sku.stockUnits.toLocaleString()} u
                  </td>

                  {/* Eligibility toggle */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Toggle checked={!sku.isIgnored} onChange={(val) => handleSKUToggle(sku, val)} />
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        !sku.isIgnored
                          ? "bg-green-900/30 text-green-400 border border-green-800/30"
                          : "bg-red-900/30 text-red-400 border border-red-800/30"
                      }`}>
                        {sku.isIgnored ? "Ignored" : "Eligible"}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted text-sm">
                  {skusWithOverride.length === 0
                    ? "No SKU overrides yet. Use + Add override or the bulk CSV upload above."
                    : "No SKUs match the current filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────── Tab 4: Inventory Conditions ─────────────────────── */

const CONDITION_META = {
  good: {
    label: "Good",
    description: "Saleable inventory in full sellable condition.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    dotColor: "bg-green-400",
    activeDot: "bg-green-400",
    inactiveDot: "bg-[#2d3748]",
  },
  damaged: {
    label: "Damaged",
    description: "Inventory with packaging or product damage — still movable.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
    dotColor: "bg-amber-400",
    activeDot: "bg-amber-400",
    inactiveDot: "bg-[#2d3748]",
  },
  expired: {
    label: "Expired",
    description: "Past expiry date. Requires special handling / disposal.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    dotColor: "bg-red-400",
    activeDot: "bg-red-400",
    inactiveDot: "bg-[#2d3748]",
  },
} as const;

function InventoryConditionsTab({
  initialConditions,
  pendingConditionIds,
}: {
  initialConditions: InventoryCondition[];
  pendingConditionIds: Set<string>;
}) {
  const [, startTransition] = useTransition();
  const [conditions, setConditions] = useState(initialConditions);

  function handleToggle(conditionType: InventoryCondition["conditionType"], isEnabled: boolean) {
    setConditions((prev) =>
      prev.map((c) => (c.conditionType === conditionType ? { ...c, isEnabled } : c))
    );
    startTransition(() => { saveInventoryConditionAction(conditionType, isEnabled); });
  }

  const enabledCount = conditions.filter((c) => c.isEnabled).length;

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="bg-card border border-border rounded-xl p-4 flex gap-3 border-l-2 border-l-accent">
        <svg className="w-4 h-4 text-accent mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" />
        </svg>
        <p className="text-sm text-muted">
          <span className="text-accent font-semibold">Inventory Condition Rules</span>{" "}
          define which physical states of inventory are planned for movement in this liquidation run.
          Enable a condition, then select the allowed disposition methods for it.
        </p>
      </div>

      {/* Condition cards */}
      <div className="space-y-3">
        {conditions.map((c) => {
          const meta = CONDITION_META[c.conditionType];
          return (
            <div key={c.conditionType} className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
              {/* Icon */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                c.isEnabled ? "bg-accent/15 text-accent" : "bg-row text-muted"
              }`}>
                {meta.icon}
              </div>

              {/* Label + description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-primary">{meta.label}</span>
                  {!c.isEnabled && (
                    <span className="text-xs font-medium bg-red-900/30 text-red-400 border border-red-800/30 px-2 py-0.5 rounded-md">
                      Out of Scope
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted">{meta.description}</p>
              </div>

              {/* Toggle */}
              <div className="flex items-center gap-2 shrink-0">
                {pendingConditionIds.has(c.conditionType) && <PendingBadge />}
                <span className={`text-xs font-medium ${c.isEnabled ? "text-green-400" : "text-muted"}`}>
                  {c.isEnabled ? "Enabled" : "Disabled"}
                </span>
                <Toggle checked={c.isEnabled} onChange={(val) => handleToggle(c.conditionType, val)} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary bar */}
      <div className="bg-card border border-border rounded-xl flex items-stretch overflow-hidden">
        <div className="px-5 py-3 flex items-center">
          <span className="text-sm text-muted">
            <span className="text-primary font-semibold">{enabledCount}</span> of 3 conditions in scope for this run
          </span>
        </div>
        <div className="w-px bg-border" />
        <div className="px-5 py-3 flex items-center gap-4">
          {conditions.map((c) => {
            const meta = CONDITION_META[c.conditionType];
            return (
              <div key={c.conditionType} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${c.isEnabled ? meta.activeDot : meta.inactiveDot}`} />
                <span className={`text-xs ${c.isEnabled ? "text-primary" : "text-muted"}`}>{meta.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Root Component ─────────────────────── */

export function ProductTabs({
  config,
  skus,
  brands,
  inventoryConditions,
  pendingBrandIds,
  pendingSkuIds,
  pendingConditionIds,
  pendingGlobalFields,
}: Props) {
  const [activeTab, setActiveTab] = useState("global");

  return (
    <div>
      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />
      <div className="mt-6">
        {activeTab === "global" && (
          <GlobalRulesTab config={config} skus={skus} pendingGlobalFields={pendingGlobalFields} />
        )}
        {activeTab === "brands" && (
          <BrandOverridesTab brands={brands} config={config} pendingBrandIds={pendingBrandIds} />
        )}
        {activeTab === "skus" && (
          <SKUConfigTab skus={skus} brands={brands} config={config} pendingSkuIds={pendingSkuIds} />
        )}
        {activeTab === "conditions" && (
          <InventoryConditionsTab
            initialConditions={inventoryConditions}
            pendingConditionIds={pendingConditionIds}
          />
        )}
      </div>
    </div>
  );
}
