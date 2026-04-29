"use server";

import { revalidatePath } from "next/cache";
import {
  getPendingChanges,
  discardPendingChanges,
  appendAuditLog,
  getMasterSinkId,
  setMasterSinkId,
  getWarehouses,
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
  getBrands,
  saveBrands,
  getSKUs,
  saveSKUs,
  getInventoryConditions,
  saveInventoryConditions,
  PendingChange,
} from "@/lib/gsheets";
import { randomUUID } from "crypto";

function deriveAuditAction(c: PendingChange): string {
  switch (c.entity) {
    case "donor_participation":      return "donor_participation_updated";
    case "master_sink":              return c.op === "set" ? "master_sink_updated" : "master_sink_cleared";
    case "pair_override":            return c.op === "set" ? "route_pair_override_set" : "route_pair_override_cleared";
    case "global_threshold":         return "global_threshold_updated";
    case "category_threshold":       return "category_threshold_updated";
    case "category_threshold_clear": return "category_threshold_cleared";
    case "brand_threshold":          return "brand_threshold_updated";
    case "brand_threshold_clear":    return "brand_threshold_cleared";
    case "global_product_config":    return "product_config_updated";
    case "brand_shelf_life":         return "brand_shelf_life_updated";
    case "sku_config": {
      if (c.payload.isIgnored === true)  return "sku_ignored";
      if (c.payload.isIgnored === false) return "sku_unignored";
      return "sku_shelf_life_override_set";
    }
    case "inventory_condition":      return "inventory_condition_updated";
    default:                          return `${c.entity}_${c.op}`;
  }
}

function buildAfterState(c: PendingChange): Record<string, unknown> {
  switch (c.entity) {
    case "donor_participation":      return { isParticipating: c.payload.isParticipating };
    case "master_sink":              return c.op === "set" ? { masterSinkWarehouseId: c.payload.warehouseId } : { masterSinkWarehouseId: null };
    case "pair_override":            return c.op === "set" ? { sinkWarehouseId: c.payload.sinkId, isActive: true } : { isActive: false };
    case "global_threshold":
    case "category_threshold":
    case "brand_threshold":
    case "global_product_config":    return { [c.payload.field as string]: c.payload.value };
    case "category_threshold_clear":
    case "brand_threshold_clear":    return {};
    case "brand_shelf_life":         return { shelfLifeOverridePct: c.payload.shelfLifeOverridePct, isActive: c.payload.isActive };
    case "sku_config":               return { shelfLifeOverridePct: c.payload.shelfLifeOverridePct, isIgnored: c.payload.isIgnored };
    case "inventory_condition":      return { enabled: c.payload.enabled };
    default:                          return { ...c.payload };
  }
}

function buildSummary(c: PendingChange, action: string): string {
  switch (c.entity) {
    case "donor_participation":      return `Donor participation ${c.payload.isParticipating ? "enabled" : "disabled"} for ${c.targetId}`;
    case "master_sink":              return c.op === "set" ? `Master sink set to ${c.payload.warehouseId}` : "Master sink cleared";
    case "pair_override":            return c.op === "set" ? `Route override set: ${c.targetId} → ${c.payload.sinkId}` : `Route override cleared for ${c.targetId}`;
    case "global_threshold":         return `Global threshold ${c.payload.field} updated to ${c.payload.value}`;
    case "category_threshold":       return `Category threshold ${c.payload.field} updated for ${c.payload.categoryName}`;
    case "category_threshold_clear": return `Category threshold cleared for ${c.targetId}`;
    case "brand_threshold":          return `Brand threshold ${c.payload.field} updated for ${c.payload.brandName}`;
    case "brand_threshold_clear":    return `Brand threshold cleared for ${c.targetId}`;
    case "global_product_config":    return `Product config ${c.payload.field} updated to ${c.payload.value}`;
    case "brand_shelf_life":         return `Shelf life override updated for brand ${c.payload.brandName}`;
    case "sku_config": {
      if (c.payload.isIgnored === true)  return `SKU ${c.targetId} marked as ignored`;
      if (c.payload.isIgnored === false) return `SKU ${c.targetId} unignored`;
      return `SKU ${c.targetId} shelf life override set to ${c.payload.shelfLifeOverridePct}%`;
    }
    case "inventory_condition":      return `Inventory condition ${c.targetId} ${c.payload.enabled ? "enabled" : "disabled"}`;
    default:                          return `${action} on ${c.targetId ?? c.entity}`;
  }
}

export async function commitAllAction(): Promise<{ applied: number }> {
  const changes = await getPendingChanges();

  if (changes.length === 0) {
    throw new Error("No pending changes");
  }

  const now = new Date().toISOString();
  const sessionId = `sess_${randomUUID().slice(0, 8)}`;

  // ── warehouse_setup ─────────────────────────────────────────────────────────
  const warehouseChanges = changes.filter((c) => c.module === "warehouse_setup");

  for (const c of warehouseChanges) {
    let beforeState: Record<string, unknown> = {};

    if (c.entity === "master_sink") {
      const prevSink = await getMasterSinkId();
      beforeState = { masterSinkWarehouseId: prevSink };
      if (c.op === "set") {
        const warehouses = await getWarehouses();
        const wh = warehouses.find((w) => w.id === c.payload.warehouseId);
        await setMasterSinkId(c.payload.warehouseId as string, wh?.name ?? "");
      } else if (c.op === "clear") {
        await setMasterSinkId(null);
      }
    } else if (c.entity === "donor_participation") {
      const donors = await getDonorSettings();
      const found = donors.find((d) => d.warehouseId === c.targetId);
      beforeState = { isParticipating: found?.isParticipating ?? null };
      const idx = donors.findIndex((d) => d.warehouseId === c.targetId);
      if (idx >= 0) {
        donors[idx].isParticipating = c.payload.isParticipating as boolean;
      } else {
        donors.push({
          warehouseId: c.targetId as string,
          isParticipating: c.payload.isParticipating as boolean,
          isActive: true,
          createdBy: "prototype_user",
          createDt: now,
          updatedBy: null,
          updateDt: null,
        });
      }
      await saveDonorSettings(donors);
    } else if (c.entity === "pair_override") {
      const overrides = await getRoutePairOverrides();
      const idx = overrides.findIndex((o) => o.donorWarehouseId === c.targetId);
      beforeState = idx >= 0
        ? { sinkWarehouseId: overrides[idx].sinkWarehouseId, isActive: overrides[idx].isActive }
        : {};
      if (c.op === "set") {
        if (idx >= 0) {
          overrides[idx].sinkWarehouseId = c.payload.sinkId as string;
          overrides[idx].isActive = true;
        } else {
          overrides.push({
            donorWarehouseId: c.targetId as string,
            sinkWarehouseId: c.payload.sinkId as string,
            isActive: true,
            createdBy: "prototype_user",
            createDt: now,
            updatedBy: null,
            updateDt: null,
          });
        }
      } else if (c.op === "clear") {
        if (idx >= 0) {
          overrides[idx].isActive = false;
        }
      }
      await saveRoutePairOverrides(overrides);
    }

    const action = deriveAuditAction(c);
    await appendAuditLog({
      id: randomUUID(),
      eventDt: now,
      module: c.module,
      action,
      entity: c.entity,
      entityId: c.targetId,
      summary: buildSummary(c, action),
      userId: "prototype_user",
      sessionId,
      beforeJson: JSON.stringify(beforeState),
      afterJson: JSON.stringify(buildAfterState(c)),
      createdBy: "prototype_user",
      createDt: now,
    });
  }

  // ── transfer_thresholds ─────────────────────────────────────────────────────
  const thresholdChanges = changes.filter((c) => c.module === "transfer_thresholds");

  for (const c of thresholdChanges) {
    let beforeState: Record<string, unknown> = {};

    if (c.entity === "global_threshold") {
      const global = await getThresholdsGlobal();
      const field = c.payload.field as string;
      beforeState = { [field]: (global as Record<string, unknown>)[field] };
      (global as Record<string, unknown>)[field] = c.payload.value;
      global.updateDt = now;
      global.updatedBy = "prototype_user";
      await saveThresholdsGlobal(global);
    } else if (c.entity === "category_threshold") {
      const categories = await getThresholdsCategory();
      const idx = categories.findIndex((cat) => cat.categoryId === c.payload.categoryId);
      const field = c.payload.field as string;
      beforeState = { [field]: idx >= 0 ? (categories[idx] as Record<string, unknown>)[field] : null };
      if (idx >= 0) {
        (categories[idx] as Record<string, unknown>)[field] = c.payload.value;
      } else {
        categories.push({
          categoryId: c.payload.categoryId as string,
          categoryName: c.payload.categoryName as string,
          cogsMin: null, cogsMax: null,
          unitsMin: null, unitsMax: null,
          weightMin: null, weightMax: null,
          isActive: true,
          createdBy: "prototype_user",
          createDt: now,
          updatedBy: null,
          updateDt: null,
          [field]: c.payload.value,
        });
      }
      await saveThresholdsCategory(categories);
    } else if (c.entity === "category_threshold_clear") {
      const categories = await getThresholdsCategory();
      const found = categories.find((cat) => cat.categoryId === c.targetId);
      beforeState = found ? { ...found } : {};
      const filtered = categories.filter((cat) => cat.categoryId !== c.targetId);
      await saveThresholdsCategory(filtered);
    } else if (c.entity === "brand_threshold") {
      const brands = await getThresholdsBrand();
      const idx = brands.findIndex((b) => b.brandId === c.payload.brandId);
      const field = c.payload.field as string;
      beforeState = { [field]: idx >= 0 ? (brands[idx] as Record<string, unknown>)[field] : null };
      if (idx >= 0) {
        (brands[idx] as Record<string, unknown>)[field] = c.payload.value;
      } else {
        brands.push({
          brandId: c.payload.brandId as string,
          brandName: c.payload.brandName as string,
          categoryId: (c.payload.categoryId as string) ?? "",
          categoryName: (c.payload.categoryName as string) ?? "",
          cogsMin: null, cogsMax: null,
          unitsMin: null, unitsMax: null,
          weightMin: null, weightMax: null,
          isActive: true,
          createdBy: "prototype_user",
          createDt: now,
          updatedBy: null,
          updateDt: null,
          [field]: c.payload.value,
        });
      }
      await saveThresholdsBrand(brands);
    } else if (c.entity === "brand_threshold_clear") {
      const brands = await getThresholdsBrand();
      const found = brands.find((b) => b.brandId === c.targetId);
      beforeState = found ? { ...found } : {};
      const filtered = brands.filter((b) => b.brandId !== c.targetId);
      await saveThresholdsBrand(filtered);
    }

    const action = deriveAuditAction(c);
    await appendAuditLog({
      id: randomUUID(),
      eventDt: now,
      module: c.module,
      action,
      entity: c.entity,
      entityId: c.targetId,
      summary: buildSummary(c, action),
      userId: "prototype_user",
      sessionId,
      beforeJson: JSON.stringify(beforeState),
      afterJson: JSON.stringify(buildAfterState(c)),
      createdBy: "prototype_user",
      createDt: now,
    });
  }

  // ── product_config ──────────────────────────────────────────────────────────
  const productChanges = changes.filter((c) => c.module === "product_config");

  for (const c of productChanges) {
    let beforeState: Record<string, unknown> = {};

    if (c.entity === "global_product_config") {
      const global = await getProductConfigGlobal();
      const field = c.payload.field as string;
      beforeState = { [field]: (global as Record<string, unknown>)[field] };
      (global as Record<string, unknown>)[field] = c.payload.value;
      global.updateDt = now;
      global.updatedBy = "prototype_user";
      await saveProductConfigGlobal(global);
    } else if (c.entity === "brand_shelf_life") {
      const brands = await getBrands();
      const idx = brands.findIndex((b) => b.id === c.payload.brandId);
      beforeState = idx >= 0
        ? { shelfLifeOverridePct: brands[idx].shelfLifeOverridePct, isActive: brands[idx].isActive }
        : {};
      if (idx >= 0) {
        brands[idx] = {
          ...brands[idx],
          shelfLifeOverridePct: c.payload.shelfLifeOverridePct as number | null,
          isActive: c.payload.isActive as boolean,
        };
        await saveBrands(brands);
      }
    } else if (c.entity === "sku_config") {
      const skus = await getSKUs();
      const idx = skus.findIndex((s) => s.id === c.targetId);
      beforeState = idx >= 0
        ? { shelfLifeOverridePct: skus[idx].shelfLifeOverridePct, isIgnored: skus[idx].isIgnored }
        : {};
      if (idx >= 0) {
        skus[idx].shelfLifeOverridePct = c.payload.shelfLifeOverridePct as number | null;
        skus[idx].isIgnored = c.payload.isIgnored as boolean;
      }
      await saveSKUs(skus);
    } else if (c.entity === "inventory_condition") {
      const conditions = await getInventoryConditions();
      const idx = conditions.findIndex((ic) => ic.conditionType === c.targetId);
      beforeState = idx >= 0 ? { isEnabled: conditions[idx].isEnabled } : {};
      if (idx >= 0) {
        conditions[idx].isEnabled = c.payload.enabled as boolean;
      }
      await saveInventoryConditions(conditions);
    }

    const action = deriveAuditAction(c);
    await appendAuditLog({
      id: randomUUID(),
      eventDt: now,
      module: c.module,
      action,
      entity: c.entity,
      entityId: c.targetId,
      summary: buildSummary(c, action),
      userId: "prototype_user",
      sessionId,
      beforeJson: JSON.stringify(beforeState),
      afterJson: JSON.stringify(buildAfterState(c)),
      createdBy: "prototype_user",
      createDt: now,
    });
  }

  // ── Finalize ────────────────────────────────────────────────────────────────
  await discardPendingChanges();

  const finalNow = new Date().toISOString();
  await appendAuditLog({
    id: randomUUID(),
    eventDt: finalNow,
    module: "draft",
    action: "configuration_committed",
    entity: "draft",
    entityId: null,
    summary: `${changes.length} changes committed`,
    userId: "prototype_user",
    sessionId,
    beforeJson: JSON.stringify({ pendingCount: changes.length }),
    afterJson: JSON.stringify({ pendingCount: 0 }),
    createdBy: "prototype_user",
    createDt: finalNow,
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
