"use server";

import { revalidatePath } from "next/cache";
import { stageChange } from "@/lib/gsheets";
import { randomUUID } from "crypto";

export async function saveProductGlobalAction(
  field: string,
  value: number | boolean
): Promise<void> {
  const now = new Date().toISOString();

  await stageChange({
    id: randomUUID(),
    module: "product_config",
    entity: "global_product_config",
    op: "set",
    targetId: field,
    payload: { field, value },
    createdAt: now,
  });

  revalidatePath("/product");
}

export async function saveBrandShelfLifeAction(
  brandId: string,
  brandName: string,
  categoryId: string,
  categoryName: string,
  shelfLifeOverridePct: number | null,
  isActive: boolean
): Promise<void> {
  const now = new Date().toISOString();

  await stageChange({
    id: randomUUID(),
    module: "product_config",
    entity: "brand_shelf_life",
    op: "set",
    targetId: brandId,
    payload: { brandId, brandName, categoryId, categoryName, shelfLifeOverridePct, isActive },
    createdAt: now,
  });

  revalidatePath("/product");
}

export async function saveSKUConfigAction(
  skuId: string,
  shelfLifeOverridePct: number | null,
  isIgnored: boolean
): Promise<void> {
  const now = new Date().toISOString();

  await stageChange({
    id: randomUUID(),
    module: "product_config",
    entity: "sku_config",
    op: "set",
    targetId: skuId,
    payload: { skuId, shelfLifeOverridePct, isIgnored },
    createdAt: now,
  });

  revalidatePath("/product");
}
