import {
  getThresholdsGlobal,
  getThresholdsCategory,
  getThresholdsBrand,
  getCategories,
  getBrands,
} from "@/lib/gsheets";
import { ThresholdsTabs } from "./ThresholdsTabs";

export default async function ThresholdsPage() {
  const [global, categories, brands, allCategories, allBrands] =
    await Promise.all([
      getThresholdsGlobal(),
      getThresholdsCategory(),
      getThresholdsBrand(),
      getCategories(),
      getBrands(),
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
        globalThresholds={global}
        categoryThresholds={categories}
        brandThresholds={brands}
        allCategories={allCategories}
        allBrands={allBrands}
      />
    </div>
  );
}
