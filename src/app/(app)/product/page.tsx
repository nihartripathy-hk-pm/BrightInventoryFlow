import {
  getProductConfigGlobal,
  getSKUs,
  getBrands,
  getInventoryConditions,
  getPendingChanges,
  type Brand,
  type SKU,
  type InventoryCondition,
  type ProductConfigGlobal,
} from "@/lib/gsheets";
import { ProductTabs } from "./ProductTabs";

export default async function ProductPage() {
  const [config, skus, brands, inventoryConditions, pending] = await Promise.all([
    getProductConfigGlobal(),
    getSKUs(),
    getBrands(),
    getInventoryConditions(),
    getPendingChanges(),
  ]);

  // Build pending overlays
  const pendingBrand: Record<string, { shelfLifeOverridePct: number | null; isActive: boolean }> = {};
  const pendingSku: Record<string, { shelfLifeOverridePct: number | null; isIgnored: boolean }> = {};
  const pendingGlobalProduct: Record<string, unknown> = {};
  const pendingCondition: Record<string, boolean> = {};

  for (const c of pending) {
    if (c.module !== "product_config") continue;
    if (c.entity === "brand_shelf_life") {
      const brandId = (c.payload.brandId as string) ?? c.targetId;
      if (brandId) {
        pendingBrand[brandId] = {
          shelfLifeOverridePct: (c.payload.shelfLifeOverridePct as number | null) ?? null,
          isActive: (c.payload.isActive as boolean) ?? false,
        };
      }
    } else if (c.entity === "sku_config" && c.targetId) {
      pendingSku[c.targetId] = {
        shelfLifeOverridePct: (c.payload.shelfLifeOverridePct as number | null) ?? null,
        isIgnored: (c.payload.isIgnored as boolean) ?? false,
      };
    } else if (c.entity === "global_product_config") {
      const field = c.payload.field as string;
      if (field) pendingGlobalProduct[field] = c.payload.value;
    } else if (c.entity === "inventory_condition" && c.targetId) {
      pendingCondition[c.targetId] = (c.payload.enabled as boolean) ?? false;
    }
  }

  // Merge: produce effective brands/skus/config/conditions
  const effectiveBrands: Brand[] = brands.map((b) =>
    pendingBrand[b.id] ? { ...b, ...pendingBrand[b.id] } : b
  );
  // Pending brands that don't exist in committed list (shouldn't normally happen, but safe)
  for (const [brandId, patch] of Object.entries(pendingBrand)) {
    if (!effectiveBrands.find((b) => b.id === brandId)) {
      const found = brands.find((b) => b.id === brandId);
      if (found) effectiveBrands.push({ ...found, ...patch });
    }
  }

  const effectiveSkus: SKU[] = skus.map((s) =>
    pendingSku[s.id] ? { ...s, ...pendingSku[s.id] } : s
  );

  const effectiveConfig: ProductConfigGlobal = { ...config, ...pendingGlobalProduct };

  const effectiveConditions: InventoryCondition[] = inventoryConditions.map((c) =>
    c.conditionType in pendingCondition ? { ...c, isEnabled: pendingCondition[c.conditionType] } : c
  );

  const brandOverrides = effectiveBrands.filter(
    (b) => b.isActive && b.shelfLifeOverridePct !== null
  ).length;
  const skuOverrides = effectiveSkus.filter((s) => s.shelfLifeOverridePct !== null).length;
  const ignoredSkus = effectiveSkus.filter((s) => s.isIgnored).length;

  const pendingBrandIds = new Set(Object.keys(pendingBrand));
  const pendingSkuIds = new Set(Object.keys(pendingSku));
  const pendingConditionIds = new Set(Object.keys(pendingCondition));
  const pendingGlobalFields = new Set(Object.keys(pendingGlobalProduct));

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Product Configuration</h1>
          <p className="text-muted text-sm mt-1">Shelf life thresholds · Eligibility rules · SKU overrides · Inventory conditions</p>
        </div>
        <div className="flex items-start gap-8">
          <div className="text-right">
            <p className="text-2xl font-semibold text-blue-400 leading-none">{brandOverrides}</p>
            <p className="text-xs text-muted mt-1">Brand Overrides</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-violet-400 leading-none">{skuOverrides}</p>
            <p className="text-xs text-muted mt-1">SKU Overrides</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-red-400 leading-none">{ignoredSkus}</p>
            <p className="text-xs text-muted mt-1">Ignored SKUs</p>
          </div>
        </div>
      </div>
      <ProductTabs
        config={effectiveConfig}
        skus={effectiveSkus}
        brands={effectiveBrands}
        inventoryConditions={effectiveConditions}
        pendingBrandIds={pendingBrandIds}
        pendingSkuIds={pendingSkuIds}
        pendingConditionIds={pendingConditionIds}
        pendingGlobalFields={pendingGlobalFields}
      />
    </div>
  );
}
