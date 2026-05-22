import {
  getThresholdsGlobal,
  getThresholdsCategory,
  getThresholdsBrand,
  getCategories,
  getBrands,
  getPendingChanges,
  type ThresholdsGlobal,
  type ThresholdsCategory,
  type ThresholdsBrand,
} from "@/lib/gsheets";
import { ThresholdsTabs } from "./ThresholdsTabs";

export default async function ThresholdsPage() {
  const [global, categories, brands, allCategories, allBrands, pending] =
    await Promise.all([
      getThresholdsGlobal(),
      getThresholdsCategory(),
      getThresholdsBrand(),
      getCategories(),
      getBrands(),
      getPendingChanges(),
    ]);

  // Build pending overlays for thresholds
  const pendingGlobalFields: Record<string, unknown> = {};
  const pendingCategory: Record<string, Record<string, unknown>> = {};
  const pendingBrand: Record<string, Record<string, unknown>> = {};
  const pendingCategoryClears = new Set<string>();
  const pendingBrandClears = new Set<string>();

  for (const c of pending) {
    if (c.module !== "transfer_thresholds") continue;
    if (c.entity === "global_threshold") {
      const field = c.payload.field as string;
      if (field) pendingGlobalFields[field] = c.payload.value;
    } else if (c.entity === "category_threshold") {
      const categoryId = c.payload.categoryId as string;
      const field = c.payload.field as string;
      if (categoryId && field) {
        if (!pendingCategory[categoryId]) pendingCategory[categoryId] = {};
        pendingCategory[categoryId][field] = c.payload.value;
      }
    } else if (c.entity === "category_threshold_clear" && c.targetId) {
      pendingCategoryClears.add(c.targetId);
    } else if (c.entity === "brand_threshold") {
      const brandId = c.payload.brandId as string;
      const field = c.payload.field as string;
      if (brandId && field) {
        if (!pendingBrand[brandId]) pendingBrand[brandId] = {};
        pendingBrand[brandId][field] = c.payload.value;
      }
    } else if (c.entity === "brand_threshold_clear" && c.targetId) {
      pendingBrandClears.add(c.targetId);
    }
  }

  // Apply pending to effective threshold data
  const effectiveGlobal: ThresholdsGlobal = { ...global, ...pendingGlobalFields };

  const effectiveCategories: ThresholdsCategory[] = categories
    .filter((c) => !pendingCategoryClears.has(c.categoryId))
    .map((c) =>
      pendingCategory[c.categoryId] ? { ...c, ...pendingCategory[c.categoryId] } : c
    );

  const effectiveBrands: ThresholdsBrand[] = brands
    .filter((b) => !pendingBrandClears.has(b.brandId))
    .map((b) =>
      pendingBrand[b.brandId] ? { ...b, ...pendingBrand[b.brandId] } : b
    );

  const pendingGlobalFieldSet = new Set(Object.keys(pendingGlobalFields));
  const pendingCategoryIds = new Set([
    ...Object.keys(pendingCategory),
    ...pendingCategoryClears,
  ]);
  const pendingBrandIds = new Set([
    ...Object.keys(pendingBrand),
    ...pendingBrandClears,
  ]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-primary">
          Transfer Thresholds
        </h1>
        <p className="text-muted text-sm mt-1">
          Minimum viable load — financial circuit breaker for liquidation
          transfers
        </p>
      </div>
      <ThresholdsTabs
        globalThresholds={effectiveGlobal}
        categoryThresholds={effectiveCategories}
        brandThresholds={effectiveBrands}
        allCategories={allCategories}
        allBrands={allBrands}
        pendingGlobalFields={pendingGlobalFieldSet}
        pendingCategoryIds={pendingCategoryIds}
        pendingBrandIds={pendingBrandIds}
      />
    </div>
  );
}
