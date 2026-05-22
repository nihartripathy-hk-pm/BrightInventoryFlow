"use client";

import React, { useState, useTransition } from "react";
import type {
  ThresholdsGlobal,
  ThresholdsCategory,
  ThresholdsBrand,
  Category,
  Brand,
} from "@/lib/gsheets";
import { TabBar } from "@/components/ui/TabBar";
import { InlineEditNumber } from "@/components/ui/InlineEditNumber";
import { PendingBadge } from "@/components/ui/PendingBadge";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  saveGlobalThresholdAction,
  saveCategoryThresholdAction,
  clearCategoryThresholdAction,
  saveBrandThresholdAction,
  clearBrandThresholdAction,
} from "@/server/actions/thresholds";

type Props = {
  globalThresholds: ThresholdsGlobal;
  categoryThresholds: ThresholdsCategory[];
  brandThresholds: ThresholdsBrand[];
  allCategories: Category[];
  allBrands: Brand[];
  pendingGlobalFields: Set<string>;
  pendingCategoryIds: Set<string>;
  pendingBrandIds: Set<string>;
};

// ─── Tab 1: Global Default ────────────────────────────────────────────────────

const TIER_ITEMS = [
  {
    tier: "TIER 01",
    label: "Brand Override",
    desc: "Per-brand",
    active: false,
  },
  {
    tier: "TIER 02",
    label: "Category Override",
    desc: "Per-category",
    active: false,
  },
  {
    tier: "TIER 03",
    label: "Global Default",
    desc: "Network-wide",
    active: true,
  },
];

function GlobalTab({
  globalThresholds,
  pendingGlobalFields,
}: {
  globalThresholds: ThresholdsGlobal;
  pendingGlobalFields: Set<string>;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSave(field: string, value: number | null) {
    startTransition(async () => {
      await saveGlobalThresholdAction(field, value);
    });
  }

  const isConfigured = (min: number | null, max: number | null) =>
    min !== null || max !== null;

  return (
    <div className={isPending ? "opacity-60 pointer-events-none" : ""}>
      {/* Tier hierarchy */}
      <div className="flex items-center gap-2 mb-6">
        {TIER_ITEMS.map((t, i) => (
          <React.Fragment key={t.tier}>
            <div
              className={`flex-1 rounded-lg p-3 border ${
                t.active
                  ? "border-accent bg-accent/5"
                  : "border-border bg-card"
              }`}
            >
              <div className="text-xs text-muted">{t.tier}</div>
              <div
                className={`text-sm font-medium ${
                  t.active ? "text-accent" : "text-primary"
                }`}
              >
                {t.label}
              </div>
              <div className="text-xs text-muted-dark">{t.desc}</div>
            </div>
            {i < 2 && (
              <svg
                className="w-4 h-4 text-muted flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* COGS row */}
      <div className="bg-card border border-border rounded-xl p-4 mb-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 w-40 shrink-0">
            <svg
              className="w-4 h-4 text-muted shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium text-primary">COGS</span>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-muted-dark uppercase tracking-wider">
              MIN
            </span>
            <InlineEditNumber
              value={globalThresholds.cogsMin}
              onSave={(v) => handleSave("cogsMin", v)}
              prefix="₹"
            />
            <span className="text-muted-dark">—</span>
            <span className="text-xs text-muted-dark uppercase tracking-wider">
              MAX
            </span>
            <InlineEditNumber
              value={globalThresholds.cogsMax}
              onSave={(v) => handleSave("cogsMax", v)}
              prefix="₹"
            />
          </div>
          <div className="shrink-0 flex items-center gap-1.5">
            {isConfigured(globalThresholds.cogsMin, globalThresholds.cogsMax) ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-teal-900/20 text-teal-400 border border-teal-800/30">
                Configured
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-row text-muted border border-border">
                Not set
              </span>
            )}
            {(pendingGlobalFields.has("cogsMin") || pendingGlobalFields.has("cogsMax")) && <PendingBadge />}
          </div>
        </div>
      </div>

      {/* Units row */}
      <div className="bg-card border border-border rounded-xl p-4 mb-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 w-40 shrink-0">
            <svg
              className="w-4 h-4 text-muted shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <span className="text-sm font-medium text-primary">Units</span>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-muted-dark uppercase tracking-wider">
              MIN
            </span>
            <InlineEditNumber
              value={globalThresholds.unitsMin}
              onSave={(v) => handleSave("unitsMin", v)}
              suffix=" units"
            />
            <span className="text-muted-dark">—</span>
            <span className="text-xs text-muted-dark uppercase tracking-wider">
              MAX
            </span>
            <InlineEditNumber
              value={globalThresholds.unitsMax}
              onSave={(v) => handleSave("unitsMax", v)}
              suffix=" units"
            />
          </div>
          <div className="shrink-0 flex items-center gap-1.5">
            {isConfigured(globalThresholds.unitsMin, globalThresholds.unitsMax) ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-teal-900/20 text-teal-400 border border-teal-800/30">
                Configured
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-row text-muted border border-border">
                Not set
              </span>
            )}
            {(pendingGlobalFields.has("unitsMin") || pendingGlobalFields.has("unitsMax")) && <PendingBadge />}
          </div>
        </div>
      </div>

      {/* Weight row */}
      <div className="bg-card border border-border rounded-xl p-4 mb-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 w-40 shrink-0">
            <svg
              className="w-4 h-4 text-muted shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
              />
            </svg>
            <span className="text-sm font-medium text-primary">Weight</span>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-muted-dark uppercase tracking-wider">
              MIN
            </span>
            <InlineEditNumber
              value={globalThresholds.weightMin}
              onSave={(v) => handleSave("weightMin", v)}
              suffix=" kg"
            />
            <span className="text-muted-dark">—</span>
            <span className="text-xs text-muted-dark uppercase tracking-wider">
              MAX
            </span>
            <InlineEditNumber
              value={globalThresholds.weightMax}
              onSave={(v) => handleSave("weightMax", v)}
              suffix=" kg"
            />
          </div>
          <div className="shrink-0 flex items-center gap-1.5">
            {isConfigured(
              globalThresholds.weightMin,
              globalThresholds.weightMax
            ) ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-teal-900/20 text-teal-400 border border-teal-800/30">
                Configured
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-row text-muted border border-border">
                Not set
              </span>
            )}
            {(pendingGlobalFields.has("weightMin") || pendingGlobalFields.has("weightMax")) && <PendingBadge />}
          </div>
        </div>
      </div>

      {globalThresholds.updateDt && (
        <p className="text-xs text-muted-dark mt-3">
          Last updated: {globalThresholds.updateDt}
        </p>
      )}
    </div>
  );
}

// ─── Tab 2: Category Overrides ────────────────────────────────────────────────

function hasAnyValue(t: ThresholdsCategory): boolean {
  return (
    t.cogsMin !== null || t.cogsMax !== null ||
    t.unitsMin !== null || t.unitsMax !== null ||
    t.weightMin !== null || t.weightMax !== null
  );
}

function CategoryOverridesTab({
  allCategories,
  categoryThresholds,
  pendingCategoryIds,
}: {
  allCategories: Category[];
  categoryThresholds: ThresholdsCategory[];
  pendingCategoryIds: Set<string>;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [addCategoryId, setAddCategoryId] = useState("");
  const [localIds, setLocalIds] = useState<string[]>([]);

  // Show a category row if it has a committed override, a pending change, or was just added locally
  const committedIds = new Set(categoryThresholds.filter(hasAnyValue).map((c) => c.categoryId));
  const visibleIds = new Set([...committedIds, ...pendingCategoryIds, ...localIds]);
  const visibleCategories = allCategories.filter((c) => visibleIds.has(c.id));
  const addableCategories = allCategories
    .filter((c) => !visibleIds.has(c.id))
    .map((c) => ({ id: c.id, name: c.name }));

  function handleAdd() {
    if (!addCategoryId || visibleIds.has(addCategoryId)) return;
    setLocalIds((prev) => [...prev, addCategoryId]);
    setAddCategoryId("");
    setShowAdd(false);
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-muted">
          {visibleCategories.length} categor{visibleCategories.length === 1 ? "y" : "ies"} with overrides
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
            <p className="text-[10px] uppercase tracking-wider text-muted mb-1">Category</p>
            <SearchableSelect
              options={addableCategories}
              value={addCategoryId}
              onChange={setAddCategoryId}
              placeholder="Pick category…"
              searchPlaceholder="Search category…"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!addCategoryId}
            className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-md hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add override
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted uppercase tracking-wider border-b border-border">
              <th className="text-left pb-2 font-medium pr-4">Category</th>
              <th className="text-center pb-2 font-medium pr-4" colSpan={2}>COGS</th>
              <th className="text-center pb-2 font-medium pr-4" colSpan={2}>Units</th>
              <th className="text-center pb-2 font-medium pr-4" colSpan={2}>Weight</th>
              <th className="text-center pb-2 font-medium pr-4">Status</th>
              <th className="text-center pb-2 font-medium">Clear</th>
            </tr>
            <tr className="text-xs text-muted-dark border-b border-border">
              <th className="pb-2 pr-4"></th>
              <th className="pb-2 font-normal text-center">Min</th>
              <th className="pb-2 font-normal text-center pr-4">Max</th>
              <th className="pb-2 font-normal text-center">Min</th>
              <th className="pb-2 font-normal text-center pr-4">Max</th>
              <th className="pb-2 font-normal text-center">Min</th>
              <th className="pb-2 font-normal text-center pr-4">Max</th>
              <th className="pb-2 pr-4"></th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {visibleCategories.map((cat) => {
              const override = categoryThresholds.find((c) => c.categoryId === cat.id) ?? null;
              return (
                <CategoryRow
                  key={cat.id}
                  category={cat}
                  override={override}
                  hasPendingChange={pendingCategoryIds.has(cat.id)}
                />
              );
            })}
            {visibleCategories.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-muted py-12 text-sm">
                  No category overrides yet. Use + Add override to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategoryRow({
  category,
  override,
  hasPendingChange,
}: {
  category: Category;
  override: ThresholdsCategory | null;
  hasPendingChange: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const hasOverride =
    override !== null &&
    (override.cogsMin !== null ||
      override.cogsMax !== null ||
      override.unitsMin !== null ||
      override.unitsMax !== null ||
      override.weightMin !== null ||
      override.weightMax !== null);

  function handleSave(field: string, value: number | null) {
    startTransition(async () => {
      await saveCategoryThresholdAction(category.id, category.name, field, value);
    });
  }

  function handleClear() {
    startTransition(async () => {
      await clearCategoryThresholdAction(category.id);
    });
  }

  return (
    <tr
      className={`border-b border-border transition-opacity ${
        isPending ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      <td className="py-3 pr-4">
        <div className="font-medium text-primary">{category.name}</div>
        <div className="text-xs text-muted-dark font-mono">{category.id}</div>
      </td>
      {/* COGS min */}
      <td className="py-3 text-center">
        <InlineEditNumber
          value={override?.cogsMin ?? null}
          onSave={(v) => handleSave("cogsMin", v)}
          prefix="₹"
        />
      </td>
      {/* COGS max */}
      <td className="py-3 pr-4 text-center">
        <InlineEditNumber
          value={override?.cogsMax ?? null}
          onSave={(v) => handleSave("cogsMax", v)}
          prefix="₹"
        />
      </td>
      {/* Units min */}
      <td className="py-3 text-center">
        <InlineEditNumber
          value={override?.unitsMin ?? null}
          onSave={(v) => handleSave("unitsMin", v)}
        />
      </td>
      {/* Units max */}
      <td className="py-3 pr-4 text-center">
        <InlineEditNumber
          value={override?.unitsMax ?? null}
          onSave={(v) => handleSave("unitsMax", v)}
        />
      </td>
      {/* Weight min */}
      <td className="py-3 text-center">
        <InlineEditNumber
          value={override?.weightMin ?? null}
          onSave={(v) => handleSave("weightMin", v)}
          suffix=" kg"
        />
      </td>
      {/* Weight max */}
      <td className="py-3 pr-4 text-center">
        <InlineEditNumber
          value={override?.weightMax ?? null}
          onSave={(v) => handleSave("weightMax", v)}
          suffix=" kg"
        />
      </td>
      {/* Status */}
      <td className="py-3 pr-4 text-center">
        <div className="flex items-center justify-center gap-1.5">
          {hasOverride ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-900/20 text-teal-400 border border-teal-800/30 whitespace-nowrap">
              Category Override
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-row text-muted border border-border whitespace-nowrap">
              Using Global
            </span>
          )}
          {hasPendingChange && <PendingBadge />}
        </div>
      </td>
      {/* Clear */}
      <td className="py-3 text-center">
        {hasOverride && (
          <button
            onClick={handleClear}
            title="Clear override"
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── Tab 3: Brand Overrides ───────────────────────────────────────────────────

function hasAnyBrandValue(t: ThresholdsBrand): boolean {
  return (
    t.cogsMin !== null || t.cogsMax !== null ||
    t.unitsMin !== null || t.unitsMax !== null ||
    t.weightMin !== null || t.weightMax !== null
  );
}

function BrandOverridesTab({
  allBrands,
  brandThresholds,
  pendingBrandIds,
}: {
  allBrands: Brand[];
  brandThresholds: ThresholdsBrand[];
  pendingBrandIds: Set<string>;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [addBrandId, setAddBrandId] = useState("");
  const [localIds, setLocalIds] = useState<string[]>([]);

  const committedIds = new Set(brandThresholds.filter(hasAnyBrandValue).map((b) => b.brandId));
  const visibleIds = new Set([...committedIds, ...pendingBrandIds, ...localIds]);
  const visibleBrands = allBrands.filter((b) => visibleIds.has(b.id));
  const addableBrands = allBrands
    .filter((b) => !visibleIds.has(b.id))
    .map((b) => ({ id: b.id, name: b.name }));

  function handleAdd() {
    if (!addBrandId || visibleIds.has(addBrandId)) return;
    setLocalIds((prev) => [...prev, addBrandId]);
    setAddBrandId("");
    setShowAdd(false);
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-muted">
          {visibleBrands.length} brand{visibleBrands.length === 1 ? "" : "s"} with overrides
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
              options={addableBrands}
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

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted uppercase tracking-wider border-b border-border">
              <th className="text-left pb-2 font-medium pr-4">Brand</th>
              <th className="text-center pb-2 font-medium pr-4" colSpan={2}>COGS</th>
              <th className="text-center pb-2 font-medium pr-4" colSpan={2}>Units</th>
              <th className="text-center pb-2 font-medium pr-4" colSpan={2}>Weight</th>
              <th className="text-center pb-2 font-medium pr-4">Status</th>
              <th className="text-center pb-2 font-medium">Clear</th>
            </tr>
            <tr className="text-xs text-muted-dark border-b border-border">
              <th className="pb-2 pr-4"></th>
              <th className="pb-2 font-normal text-center">Min</th>
              <th className="pb-2 font-normal text-center pr-4">Max</th>
              <th className="pb-2 font-normal text-center">Min</th>
              <th className="pb-2 font-normal text-center pr-4">Max</th>
              <th className="pb-2 font-normal text-center">Min</th>
              <th className="pb-2 font-normal text-center pr-4">Max</th>
              <th className="pb-2 pr-4"></th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {visibleBrands.map((brand) => {
              const override = brandThresholds.find((b) => b.brandId === brand.id) ?? null;
              return (
                <BrandRow
                  key={brand.id}
                  brand={brand}
                  override={override}
                  hasPendingChange={pendingBrandIds.has(brand.id)}
                />
              );
            })}
            {visibleBrands.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-muted py-12 text-sm">
                  No brand overrides yet. Use + Add override to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BrandRow({
  brand,
  override,
  hasPendingChange,
}: {
  brand: Brand;
  override: ThresholdsBrand | null;
  hasPendingChange: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const hasOverride =
    override !== null &&
    (override.cogsMin !== null ||
      override.cogsMax !== null ||
      override.unitsMin !== null ||
      override.unitsMax !== null ||
      override.weightMin !== null ||
      override.weightMax !== null);

  function handleSave(field: string, value: number | null) {
    startTransition(async () => {
      await saveBrandThresholdAction(brand.id, brand.name, field, value);
    });
  }

  function handleClear() {
    startTransition(async () => {
      await clearBrandThresholdAction(brand.id);
    });
  }

  return (
    <tr
      className={`border-b border-border transition-opacity ${
        isPending ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      <td className="py-3 pr-4">
        <div className="font-medium text-primary">{brand.name}</div>
        <div className="text-xs text-muted-dark mt-0.5 font-mono">
          {brand.categoryId}
        </div>
        <div className="text-xs text-muted font-mono">{brand.id}</div>
      </td>
      {/* COGS min */}
      <td className="py-3 text-center">
        <InlineEditNumber
          value={override?.cogsMin ?? null}
          onSave={(v) => handleSave("cogsMin", v)}
          prefix="₹"
        />
      </td>
      {/* COGS max */}
      <td className="py-3 pr-4 text-center">
        <InlineEditNumber
          value={override?.cogsMax ?? null}
          onSave={(v) => handleSave("cogsMax", v)}
          prefix="₹"
        />
      </td>
      {/* Units min */}
      <td className="py-3 text-center">
        <InlineEditNumber
          value={override?.unitsMin ?? null}
          onSave={(v) => handleSave("unitsMin", v)}
        />
      </td>
      {/* Units max */}
      <td className="py-3 pr-4 text-center">
        <InlineEditNumber
          value={override?.unitsMax ?? null}
          onSave={(v) => handleSave("unitsMax", v)}
        />
      </td>
      {/* Weight min */}
      <td className="py-3 text-center">
        <InlineEditNumber
          value={override?.weightMin ?? null}
          onSave={(v) => handleSave("weightMin", v)}
          suffix=" kg"
        />
      </td>
      {/* Weight max */}
      <td className="py-3 pr-4 text-center">
        <InlineEditNumber
          value={override?.weightMax ?? null}
          onSave={(v) => handleSave("weightMax", v)}
          suffix=" kg"
        />
      </td>
      {/* Status */}
      <td className="py-3 pr-4 text-center">
        <div className="flex items-center justify-center gap-1.5">
          {hasOverride ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-900/20 text-teal-400 border border-teal-800/30 whitespace-nowrap">
              Brand Override
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-row text-muted border border-border whitespace-nowrap">
              Using Global
            </span>
          )}
          {hasPendingChange && <PendingBadge />}
        </div>
      </td>
      {/* Clear */}
      <td className="py-3 text-center">
        {hasOverride && (
          <button
            onClick={handleClear}
            title="Clear override"
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

const TABS = [
  { key: "global", label: "Global Default" },
  { key: "category", label: "Category Overrides" },
  { key: "brand", label: "Brand Overrides" },
];

export function ThresholdsTabs({
  globalThresholds,
  categoryThresholds,
  brandThresholds,
  allCategories,
  allBrands,
  pendingGlobalFields,
  pendingCategoryIds,
  pendingBrandIds,
}: Props) {
  const [activeTab, setActiveTab] = useState("global");

  return (
    <div>
      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />
      <div className="mt-6">
        {activeTab === "global" && (
          <GlobalTab
            globalThresholds={globalThresholds}
            pendingGlobalFields={pendingGlobalFields}
          />
        )}
        {activeTab === "category" && (
          <CategoryOverridesTab
            allCategories={allCategories}
            categoryThresholds={categoryThresholds}
            pendingCategoryIds={pendingCategoryIds}
          />
        )}
        {activeTab === "brand" && (
          <BrandOverridesTab
            allBrands={allBrands}
            brandThresholds={brandThresholds}
            pendingBrandIds={pendingBrandIds}
          />
        )}
      </div>
    </div>
  );
}
