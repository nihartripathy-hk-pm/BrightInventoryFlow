import { getProductConfigGlobal, getSKUs, getBrands, getInventoryConditions } from "@/lib/gsheets";
import { ProductTabs } from "./ProductTabs";

export default async function ProductPage() {
  const [config, skus, brands, inventoryConditions] = await Promise.all([
    getProductConfigGlobal(), getSKUs(), getBrands(), getInventoryConditions()
  ]);

  const brandOverrides = brands.filter(b => b.isActive && b.shelfLifeOverridePct !== null).length;
  const skuOverrides = skus.filter(s => s.shelfLifeOverridePct !== null).length;
  const ignoredSkus = skus.filter(s => s.isIgnored).length;

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
      <ProductTabs config={config} skus={skus} brands={brands} inventoryConditions={inventoryConditions} />
    </div>
  );
}
