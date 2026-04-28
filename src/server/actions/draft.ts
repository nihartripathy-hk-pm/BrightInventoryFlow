"use server";

import { revalidatePath } from "next/cache";
import {
  getPendingChanges,
  discardPendingChanges,
  stageChange,
  appendAuditLog,
  getMasterSinkId,
  setMasterSinkId,
  getDonorSettings,
  saveDonorSettings,
  getRoutePairOverrides,
  saveRoutePairOverrides,
  getThresholdsGlobal,
  saveThresholdsGlobal,
  getThresholdsCategory,
  saveThresholdsCategory,
  getThresholdsBrand,
  saveThresholdsBrand,
  getProductConfigGlobal,
  saveProductConfigGlobal,
  getBrandShelfLife,
  saveBrandShelfLife,
  getSKUs,
  saveSKUs,
  PendingChange,
} from "@/lib/gsheets";
import { randomUUID } from "crypto";

export async function commitAllAction(): Promise<{ applied: number }> {
  const changes = await getPendingChanges();

  if (changes.length === 0) {
    throw new Error("No pending changes");
  }

  // ── warehouse_setup ─────────────────────────────────────────────────────────
  const warehouseChanges = changes.filter((c) => c.module === "warehouse_setup");

  for (const c of warehouseChanges) {
    if (c.entity === "master_sink") {
      if (c.op === "set") {
        await setMasterSinkId(c.payload.warehouseId as string);
      } else if (c.op === "clear") {
        await setMasterSinkId(null as unknown as string);
      }
    } else if (c.entity === "donor_participation") {
      const donors = await getDonorSettings();
      const idx = donors.findIndex((d) => d.warehouseId === c.targetId);
      if (idx >= 0) {
        donors[idx].isParticipating = c.payload.isParticipating as boolean;
      } else {
        donors.push({
          warehouseId: c.targetId as string,
          isParticipating: c.payload.isParticipating as boolean,
        });
      }
      await saveDonorSettings(donors);
    } else if (c.entity === "pair_override") {
      const overrides = await getRoutePairOverrides();
      const idx = overrides.findIndex((o) => o.donorWarehouseId === c.targetId);
      if (c.op === "set") {
        if (idx >= 0) {
          overrides[idx].sinkWarehouseId = c.payload.sinkId as string;
          overrides[idx].isActive = true;
        } else {
          overrides.push({
            donorWarehouseId: c.targetId as string,
            sinkWarehouseId: c.payload.sinkId as string,
            isActive: true,
          });
        }
      } else if (c.op === "clear") {
        if (idx >= 0) {
          overrides[idx].isActive = false;
        }
      }
      await saveRoutePairOverrides(overrides);
    }
  }

  // ── transfer_thresholds ─────────────────────────────────────────────────────
  const thresholdChanges = changes.filter((c) => c.module === "transfer_thresholds");

  for (const c of thresholdChanges) {
    if (c.entity === "global_threshold") {
      const global = await getThresholdsGlobal();
      (global as Record<string, unknown>)[c.payload.field as string] = c.payload.value;
      global.updatedAt = new Date().toISOString();
      await saveThresholdsGlobal(global);
    } else if (c.entity === "category_threshold") {
      const categories = await getThresholdsCategory();
      const idx = categories.findIndex((cat) => cat.categoryId === c.payload.categoryId);
      if (idx >= 0) {
        (categories[idx] as Record<string, unknown>)[c.payload.field as string] = c.payload.value;
      } else {
        categories.push({
          categoryId: c.payload.categoryId as string,
          categoryName: c.payload.categoryName as string,
          cogsMin: null,
          cogsMax: null,
          unitsMin: null,
          unitsMax: null,
          weightMin: null,
          weightMax: null,
          [c.payload.field as string]: c.payload.value,
        });
      }
      await saveThresholdsCategory(categories);
    } else if (c.entity === "category_threshold_clear") {
      const categories = await getThresholdsCategory();
      const filtered = categories.filter((cat) => cat.categoryId !== c.targetId);
      await saveThresholdsCategory(filtered);
    } else if (c.entity === "brand_threshold") {
      const brands = await getThresholdsBrand();
      const idx = brands.findIndex((b) => b.brandId === c.payload.brandId);
      if (idx >= 0) {
        (brands[idx] as Record<string, unknown>)[c.payload.field as string] = c.payload.value;
      } else {
        brands.push({
          brandId: c.payload.brandId as string,
          brandName: c.payload.brandName as string,
          categoryName: "",
          cogsMin: null,
          cogsMax: null,
          unitsMin: null,
          unitsMax: null,
          weightMin: null,
          weightMax: null,
          [c.payload.field as string]: c.payload.value,
        });
      }
      await saveThresholdsBrand(brands);
    } else if (c.entity === "brand_threshold_clear") {
      const brands = await getThresholdsBrand();
      const filtered = brands.filter((b) => b.brandId !== c.targetId);
      await saveThresholdsBrand(filtered);
    }
  }

  // ── product_config ──────────────────────────────────────────────────────────
  const productChanges = changes.filter((c) => c.module === "product_config");

  for (const c of productChanges) {
    if (c.entity === "global_product_config") {
      const global = await getProductConfigGlobal();
      (global as Record<string, unknown>)[c.payload.field as string] = c.payload.value;
      global.updatedAt = new Date().toISOString();
      await saveProductConfigGlobal(global);
    } else if (c.entity === "brand_shelf_life") {
      const brands = await getBrandShelfLife();
      const idx = brands.findIndex((b) => b.brandId === c.payload.brandId);
      if (idx >= 0) {
        brands[idx] = {
          ...brands[idx],
          brandName: c.payload.brandName as string,
          categoryId: c.payload.categoryId as string,
          categoryName: c.payload.categoryName as string,
          shelfLifeOverridePct: c.payload.shelfLifeOverridePct as number | null,
          isActive: c.payload.isActive as boolean,
        };
      } else {
        brands.push({
          brandId: c.payload.brandId as string,
          brandName: c.payload.brandName as string,
          categoryId: c.payload.categoryId as string,
          categoryName: c.payload.categoryName as string,
          shelfLifeOverridePct: c.payload.shelfLifeOverridePct as number | null,
          isActive: c.payload.isActive as boolean,
        });
      }
      await saveBrandShelfLife(brands);
    } else if (c.entity === "sku_config") {
      const skus = await getSKUs();
      const idx = skus.findIndex((s) => s.id === c.targetId);
      if (idx >= 0) {
        skus[idx].shelfLifeOverridePct = c.payload.shelfLifeOverridePct as number | null;
        skus[idx].isIgnored = c.payload.isIgnored as boolean;
      }
      await saveSKUs(skus);
    }
  }

  // ── Finalize ────────────────────────────────────────────────────────────────
  await discardPendingChanges();

  const now = new Date().toISOString();
  await appendAuditLog({
    id: randomUUID(),
    timestamp: now,
    module: "draft",
    action: "configuration_committed",
    entity: "draft",
    summary: `${changes.length} changes committed`,
    userId: "prototype_user",
    beforeJson: JSON.stringify({ pendingCount: changes.length }),
    afterJson: JSON.stringify({ pendingCount: 0 }),
    sessionId: "sess_prototype",
  });

  revalidatePath("/warehouse");
  revalidatePath("/thresholds");
  revalidatePath("/product");
  revalidatePath("/audit");

  return { applied: changes.length };
}

export async function discardAllAction(): Promise<void> {
  await discardPendingChanges();

  revalidatePath("/warehouse");
  revalidatePath("/thresholds");
  revalidatePath("/product");
  revalidatePath("/audit");
}
