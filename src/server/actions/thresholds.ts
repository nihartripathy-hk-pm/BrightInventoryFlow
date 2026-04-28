"use server";

import { revalidatePath } from "next/cache";
import {
  stageChange,
  getThresholdsGlobal,
  getThresholdsCategory,
  getThresholdsBrand,
} from "@/lib/gsheets";
import { randomUUID } from "crypto";

export async function saveGlobalThresholdAction(
  field: string,
  value: number | null
): Promise<void> {
  const now = new Date().toISOString();

  await stageChange({
    id: randomUUID(),
    module: "transfer_thresholds",
    entity: "global_threshold",
    op: "set",
    targetId: field,
    payload: { field, value },
    createdAt: now,
  });

  revalidatePath("/thresholds");
}

export async function saveCategoryThresholdAction(
  categoryId: string,
  categoryName: string,
  field: string,
  value: number | null
): Promise<void> {
  const now = new Date().toISOString();

  await stageChange({
    id: randomUUID(),
    module: "transfer_thresholds",
    entity: "category_threshold",
    op: "set",
    targetId: `${categoryId}:${field}`,
    payload: { categoryId, categoryName, field, value },
    createdAt: now,
  });

  revalidatePath("/thresholds");
}

export async function clearCategoryThresholdAction(
  categoryId: string
): Promise<void> {
  const now = new Date().toISOString();

  await stageChange({
    id: randomUUID(),
    module: "transfer_thresholds",
    entity: "category_threshold_clear",
    op: "clear",
    targetId: categoryId,
    payload: { categoryId },
    createdAt: now,
  });

  revalidatePath("/thresholds");
}

export async function saveBrandThresholdAction(
  brandId: string,
  brandName: string,
  field: string,
  value: number | null
): Promise<void> {
  const now = new Date().toISOString();

  await stageChange({
    id: randomUUID(),
    module: "transfer_thresholds",
    entity: "brand_threshold",
    op: "set",
    targetId: `${brandId}:${field}`,
    payload: { brandId, brandName, field, value },
    createdAt: now,
  });

  revalidatePath("/thresholds");
}

export async function clearBrandThresholdAction(
  brandId: string
): Promise<void> {
  const now = new Date().toISOString();

  await stageChange({
    id: randomUUID(),
    module: "transfer_thresholds",
    entity: "brand_threshold_clear",
    op: "clear",
    targetId: brandId,
    payload: { brandId },
    createdAt: now,
  });

  revalidatePath("/thresholds");
}
