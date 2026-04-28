"use client";

import { useState, useTransition } from "react";
import { ProductConfigGlobal, BrandShelfLife, SKU, Brand } from "@/lib/gsheets";
import { Toggle } from "@/components/ui/Toggle";
import { InlineEditNumber } from "@/components/ui/InlineEditNumber";
import { TabBar } from "@/components/ui/TabBar";
import { CsvUploadPanel } from "@/components/ui/CsvUploadPanel";
import {
  saveProductGlobalAction,
  saveBrandShelfLifeAction,
  saveSKUConfigAction,
} from "@/server/actions/product";

interface Props {
  config: ProductConfigGlobal;
  brandShelfLife: BrandShelfLife[];
  skus: SKU[];
  brands: Brand[];
}

const TABS = [
  { key: "global", label: "Global Rules" },
  { key: "brands", label: "Brand Overrides" },
  { key: "skus",   label: "SKU Configuration" },
];

/* ─────────────────────── Tab 1: Global Rules ─────────────────────── */

function GlobalRulesTab({
  config,
  skus,
}: {
  config: ProductConfigGlobal;
  skus: SKU[];
}) {
  const [, startTransition] = useTransition();
  const [standardPct, setStandardPct] = useState(config.standardShelfLifePct);
  const [opPct, setOpPct] = useState(config.opShelfLifePct);
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
          <div>
            <p className="text-xs text-muted mb-2">STANDARD SKUs — Days Before Expiry (%)</p>
            <div className="flex items-center gap-3">
              <input
                type="range" min={10} max={100} step={5} value={standardPct}
                onChange={(e) => handleSlider("standardShelfLifePct", Number(e.target.value), setStandardPct)}
                className="flex-1 accent-accent"
              />
              <span className="text-sm font-semibold bg-accent/10 text-accent border border-accent/30 px-3 py-1.5 rounded-md w-16 text-center">
                {standardPct}%
              </span>
            </div>
          </div>

          {/* OP */}
          <div>
            <p className="text-xs text-muted mb-2">OP SKUs — Days Before Expiry (%)</p>
            <div className="flex items-center gap-3">
              <input
                type="range" min={10} max={100} step={5} value={opPct}
                onChange={(e) => handleSlider("opShelfLifePct", Number(e.target.value), setOpPct)}
                className="flex-1 accent-amber-500"
              />
              <span className="text-sm font-semibold bg-amber-900/20 text-amber-400 border border-amber-800/40 px-3 py-1.5 rounded-md w-16 text-center">
                {opPct}%
              </span>
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
  brandShelfLife,
  config,
}: {
  brands: Brand[];
  brandShelfLife: BrandShelfLife[];
  config: ProductConfigGlobal;
}) {
  const [, startTransition] = useTransition();

  function handleShelfLife(brand: Brand, currentOverride: BrandShelfLife | undefined, value: number | null) {
    startTransition(() => {
      saveBrandShelfLifeAction(
        brand.id, brand.name, brand.categoryId, brand.categoryName,
        value,
        currentOverride?.isActive ?? (value !== null)
      );
    });
  }

  function handleToggle(brand: Brand, currentOverride: BrandShelfLife | undefined, newActive: boolean) {
    startTransition(() => {
      saveBrandShelfLifeAction(
        brand.id, brand.name, brand.categoryId, brand.categoryName,
        currentOverride?.shelfLifeOverridePct ?? null,
        newActive
      );
    });
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-row">
            {["Brand", "Category", "Shelf Life Override", "SKUs Affected", "Status"].map((col) => (
              <th key={col} className="text-left text-xs font-medium text-muted uppercase tracking-wide px-4 py-3">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {brands.map((brand) => {
            const override = brandShelfLife.find((b) => b.brandId === brand.id);
            const isActive = override?.isActive ?? false;

            return (
              <tr key={brand.id} className="border-b border-border hover:bg-row/50 transition-colors">
                {/* Brand */}
                <td className="px-4 py-3">
                  <p className="font-medium text-primary">{brand.name}</p>
                  <p className="text-xs text-muted font-mono">{brand.id}</p>
                </td>

                {/* Category */}
                <td className="px-4 py-3 text-sm text-muted">{brand.categoryName}</td>

                {/* Shelf Life Override (inline edit) */}
                <td className="px-4 py-3">
                  <InlineEditNumber
                    value={override?.shelfLifeOverridePct ?? null}
                    placeholder={`Global (${config.standardShelfLifePct}%)`}
                    suffix="%"
                    onSave={(value) => handleShelfLife(brand, override, value)}
                  />
                </td>

                {/* SKUs Affected */}
                <td className="px-4 py-3 text-sm text-muted">
                  {brand.skuCount != null ? (
                    <span>{brand.skuCount} SKU{brand.skuCount !== 1 ? "s" : ""}</span>
                  ) : "—"}
                </td>

                {/* Status toggle */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Toggle
                      checked={isActive}
                      onChange={(val) => handleToggle(brand, override, val)}
                    />
                    {isActive ? (
                      <span className="text-xs bg-teal-900/30 text-teal-400 border border-teal-800/30 px-2 py-0.5 rounded-full">
                        Brand Override
                      </span>
                    ) : (
                      <span className="text-xs bg-row text-muted border border-border px-2 py-0.5 rounded-full">
                        Using Global
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {brands.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-12 text-center text-muted text-sm">
                No brands found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────── Tab 3: SKU Configuration ─────────────────────── */

type EligibilityFilter = "all" | "eligible" | "ignored";
type TypeFilter = "all" | "standard" | "op";

function SKUConfigTab({
  skus,
  brandShelfLife,
  config,
}: {
  skus: SKU[];
  brandShelfLife: BrandShelfLife[];
  config: ProductConfigGlobal;
}) {
  const [, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [eligibilityFilter, setEligibilityFilter] = useState<EligibilityFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const filtered = skus.filter((s) => {
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

        <span className="text-xs text-muted-dark whitespace-nowrap">
          {filtered.length} / {skus.length} SKUs
        </span>
      </div>

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
              const brandOverride = brandShelfLife.find((b) => b.brandId === sku.brandId);
              const source =
                sku.shelfLifeOverridePct !== null
                  ? "sku"
                  : brandOverride?.isActive
                  ? "brand"
                  : "global";

              return (
                <tr key={sku.id} className="border-b border-border hover:bg-row/50 transition-colors">
                  {/* SKU */}
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="font-medium text-primary truncate">{sku.name}</p>
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
                    {source === "sku" ? (
                      <span className="text-xs bg-violet-900/30 text-violet-400 border border-violet-800/30 px-2 py-0.5 rounded-full">
                        SKU Override
                      </span>
                    ) : source === "brand" ? (
                      <span className="text-xs bg-blue-900/30 text-blue-400 border border-blue-800/30 px-2 py-0.5 rounded-full">
                        Brand ({brandOverride?.brandName})
                      </span>
                    ) : (
                      <span className="text-xs bg-row text-muted border border-border px-2 py-0.5 rounded-full">
                        Global Default
                      </span>
                    )}
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
                  No SKUs match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────── Root Component ─────────────────────── */

export function ProductTabs({ config, brandShelfLife, skus, brands }: Props) {
  const [activeTab, setActiveTab] = useState("global");

  return (
    <div>
      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />
      <div className="mt-6">
        {activeTab === "global" && <GlobalRulesTab config={config} skus={skus} />}
        {activeTab === "brands" && (
          <BrandOverridesTab brands={brands} brandShelfLife={brandShelfLife} config={config} />
        )}
        {activeTab === "skus" && (
          <SKUConfigTab skus={skus} brandShelfLife={brandShelfLife} config={config} />
        )}
      </div>
    </div>
  );
}
