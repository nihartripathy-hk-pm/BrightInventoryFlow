import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import * as fs from "fs";
import * as path from "path";

// ─── Spreadsheet ID ───────────────────────────────────────────────────────────
const SPREADSHEET_ID = "1U-T91N__ouV1EmnaCDcJPq_0Ta3OlutI7chizUMgRTc";

// ─── Exported Types ───────────────────────────────────────────────────────────
export type Warehouse = {
  id: string;
  name: string;
  locationCode: string;
  city: string;
  region: string;
  pincode: string;
  stockUnits: number;
  capacityPct: number;
  isActive: boolean;
  createdBy: string;
  createDt: string;
  updatedBy: string | null;
  updateDt: string | null;
};

export type MasterSinkConfig = {
  id: string;
  warehouseId: string;
  warehouseName: string;
  isActive: boolean;
  createdBy: string;
  createDt: string;
  updatedBy: string | null;
  updateDt: string | null;
};

export type DonorSetting = {
  warehouseId: string;
  isParticipating: boolean;
  isActive: boolean;
  createdBy: string;
  createDt: string;
  updatedBy: string | null;
  updateDt: string | null;
};

export type RoutePairOverride = {
  donorWarehouseId: string;
  sinkWarehouseId: string;
  isActive: boolean;
  createdBy: string;
  createDt: string;
  updatedBy: string | null;
  updateDt: string | null;
};

export type ThresholdsGlobal = {
  id: string;
  cogsMin: number | null;
  cogsMax: number | null;
  unitsMin: number | null;
  unitsMax: number | null;
  weightMin: number | null;
  weightMax: number | null;
  isActive: boolean;
  createdBy: string;
  createDt: string;
  updatedBy: string | null;
  updateDt: string;
};

export type ThresholdsCategory = {
  categoryId: string;
  categoryName: string;
  cogsMin: number | null;
  cogsMax: number | null;
  unitsMin: number | null;
  unitsMax: number | null;
  weightMin: number | null;
  weightMax: number | null;
  isActive: boolean;
  createdBy: string;
  createDt: string;
  updatedBy: string | null;
  updateDt: string | null;
};

export type ThresholdsBrand = {
  brandId: string;
  brandName: string;
  categoryId: string;
  categoryName: string;
  cogsMin: number | null;
  cogsMax: number | null;
  unitsMin: number | null;
  unitsMax: number | null;
  weightMin: number | null;
  weightMax: number | null;
  isActive: boolean;
  createdBy: string;
  createDt: string;
  updatedBy: string | null;
  updateDt: string | null;
};

export type ProductConfigGlobal = {
  id: string;
  standardShelfLifePct: number;
  opShelfLifePct: number;
  standardEnabled: boolean;
  opEnabled: boolean;
  isActive: boolean;
  createdBy: string;
  createDt: string;
  updatedBy: string | null;
  updateDt: string;
};

export type Brand = {
  id: string;
  name: string;
  categoryId: string;
  shelfLifeOverridePct: number | null;
  isActive: boolean;
  createdBy: string;
  createDt: string;
  updatedBy: string | null;
  updateDt: string | null;
};

export type SKU = {
  id: string;
  name: string;
  brandId: string;
  brandName: string;
  categoryId: string;
  categoryName: string;
  type: "standard" | "op";
  shelfLifeOverridePct: number | null;
  isIgnored: boolean;
  isActive: boolean;
  stockUnits: number;
  createdBy: string;
  createDt: string;
  updatedBy: string | null;
  updateDt: string | null;
};

export type Category = {
  id: string;
  name: string;
  shelfLifeOverridePct: number | null;
  isActive: boolean;
  createdBy: string;
  createDt: string;
  updatedBy: string | null;
  updateDt: string | null;
};

export type InventoryCondition = {
  id: string;
  conditionType: "good" | "damaged" | "expired";
  description: string;
  isEnabled: boolean;
  isActive: boolean;
  createdBy: string;
  createDt: string;
  updatedBy: string | null;
  updateDt: string | null;
};

// Aligns with batch_runs DB table
export type Batch = {
  id: string;
  masterSinkId: string;
  masterSinkName: string;
  status: "pending_approval" | "committed" | "rejected";
  generatedAt: string;
  committedBy: string | null;
  committedAt: string | null;
  isActive: boolean;
  createdBy: string;
  createDt: string;
  updatedBy: string | null;
  updateDt: string | null;
};

export type TransferOrder = {
  id: string;
  batchId: string;
  type: "wh_transfer" | "b2b" | "liq_stock";
  sourceWarehouseId: string;
  sourceName: string;
  destinationWarehouseId: string;
  destinationName: string;
  units: number;
  cogs: number;
  weight: number;
  status: "pending" | "in_transit" | "cancelled";
};

export type OrderLineItem = {
  id: string;
  orderId: string;
  skuId: string;
  skuName: string;
  units: number;
  cogs: number;
  expiryDate: string | null;
};

export type PendingChange = {
  id: string;
  module: string;
  entity: string;
  op: "set" | "clear";
  targetId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type AuditEntry = {
  id: string;
  eventDt: string;
  module: string;
  action: string;
  entity: string;
  entityId: string | null;
  summary: string;
  userId: string;
  sessionId: string;
  beforeJson: string;
  afterJson: string;
  createdBy: string;
  createDt: string;
};

// ─── Sheet tab names ──────────────────────────────────────────────────────────
const SHEET_NAMES = {
  Warehouses: "Warehouses",
  MasterSinkConfig: "MasterSinkConfig",
  DonorSettings: "DonorSettings",
  RoutePairOverrides: "RoutePairOverrides",
  ThresholdsGlobal: "ThresholdsGlobal",
  ThresholdsCategory: "ThresholdsCategory",
  ThresholdsBrand: "ThresholdsBrand",
  ProductConfigGlobal: "ProductConfigGlobal",
  SKUs: "SKUs",
  Categories: "Categories",
  Brands: "Brands",
  Batches: "Batches",
  TransferOrders: "TransferOrders",
  OrderLineItems: "OrderLineItems",
  PendingChanges: "PendingChanges",
  AuditLog: "AuditLog",
  InventoryConditions: "InventoryConditions",
} as const;

const SHEET_HEADERS: Record<string, string[]> = {
  Warehouses: ["id", "name", "location_code", "city", "region", "pincode", "stock_units", "capacity_pct", "is_active", "created_by", "create_dt", "updated_by", "update_dt"],
  MasterSinkConfig: ["id", "warehouse_id", "warehouse_name", "is_active", "created_by", "create_dt", "updated_by", "update_dt"],
  DonorSettings: ["warehouse_id", "is_participating", "is_active", "created_by", "create_dt", "updated_by", "update_dt"],
  RoutePairOverrides: ["donor_warehouse_id", "sink_warehouse_id", "is_active", "created_by", "create_dt", "updated_by", "update_dt"],
  ThresholdsGlobal: ["id", "cogs_min", "cogs_max", "units_min", "units_max", "weight_min", "weight_max", "is_active", "created_by", "create_dt", "updated_by", "update_dt"],
  ThresholdsCategory: ["category_id", "category_name", "cogs_min", "cogs_max", "units_min", "units_max", "weight_min", "weight_max", "is_active", "created_by", "create_dt", "updated_by", "update_dt"],
  ThresholdsBrand: ["brand_id", "brand_name", "category_id", "category_name", "cogs_min", "cogs_max", "units_min", "units_max", "weight_min", "weight_max", "is_active", "created_by", "create_dt", "updated_by", "update_dt"],
  ProductConfigGlobal: ["id", "standard_shelf_life_pct", "op_shelf_life_pct", "standard_enabled", "op_enabled", "is_active", "created_by", "create_dt", "updated_by", "update_dt"],
  Brands: ["id", "name", "category_id", "shelf_life_override_pct", "is_active", "created_by", "create_dt", "updated_by", "update_dt"],
  SKUs: ["id", "name", "brand_id", "brand_name", "category_id", "category_name", "type", "shelf_life_override_pct", "is_ignored", "is_active", "stock_units", "created_by", "create_dt", "updated_by", "update_dt"],
  Categories: ["id", "name", "shelf_life_override_pct", "is_active", "created_by", "create_dt", "updated_by", "update_dt"],
  Batches: ["id", "master_sink_id", "master_sink_name", "status", "generated_at", "committed_by", "committed_at", "is_active", "created_by", "create_dt", "updated_by", "update_dt"],
  TransferOrders: ["id", "batch_id", "type", "source_warehouse_id", "source_name", "destination_warehouse_id", "destination_name", "units", "cogs", "weight", "status"],
  OrderLineItems: ["id", "order_id", "sku_id", "sku_name", "units", "cogs", "expiry_date"],
  PendingChanges: ["id", "module", "entity", "op", "target_id", "payload", "created_at"],
  AuditLog: ["id", "event_dt", "module", "action", "entity", "entity_id", "summary", "user_id", "session_id", "before_json", "after_json", "created_by", "create_dt"],
  InventoryConditions: ["id", "condition_type", "description", "is_enabled", "is_active", "created_by", "create_dt", "updated_by", "update_dt"],
};

// ─── Parsing helpers ──────────────────────────────────────────────────────────
const num = (v: string): number | null => {
  if (!v || v === "") return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};
const bool = (v: string): boolean => v === "true" || v === "TRUE";
const str = (v: string | undefined): string => v ?? "";
const nullStr = (v: string | undefined): string | null =>
  v && v !== "" ? v : null;

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function getAuthClient() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    return auth.getClient();
  }

  const tokenPath = path.resolve(process.cwd(), ".google-token.json");
  const credPath = path.resolve(process.cwd(), "credentials.json");
  if (fs.existsSync(tokenPath) && fs.existsSync(credPath)) {
    const credRaw = JSON.parse(fs.readFileSync(credPath, "utf-8"));
    const { client_id, client_secret } = credRaw.installed ?? credRaw.web;
    const oAuth2Client = new OAuth2Client(client_id, client_secret, "http://localhost:3456/callback");
    const token = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return auth.getClient();
}

async function getSheetsClient() {
  const authClient = await getAuthClient();
  return google.sheets({ version: "v4", auth: authClient as Parameters<typeof google.sheets>[0]["auth"] });
}

// ─── Low-level helpers ────────────────────────────────────────────────────────
function hasCredentials(): boolean {
  return (
    !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
    (typeof window === "undefined" &&
      (() => {
        try {
          return (
            require("fs").existsSync(require("path").resolve(process.cwd(), ".google-token.json")) &&
            require("fs").existsSync(require("path").resolve(process.cwd(), "credentials.json"))
          );
        } catch {
          return false;
        }
      })())
  );
}

async function readSheet(sheetName: string): Promise<string[][]> {
  if (!hasCredentials()) return [];
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}`,
    });
    return (response.data.values as string[][]) ?? [];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("Unable to parse range") ||
      msg.includes("Quota exceeded") ||
      msg.includes("No data found")
    ) {
      return [];
    }
    throw err;
  }
}

async function writeSheet(sheetName: string, rows: (string | number | boolean | null)[][]): Promise<void> {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: rows },
  });
}

async function createSheetTab(sheetName: string): Promise<void> {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
  });
}

async function clearAndWriteSheet(
  sheetName: string,
  headers: string[],
  rows: (string | number | boolean | null)[][]
): Promise<void> {
  const sheets = await getSheetsClient();
  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: sheetName,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Unable to parse range")) {
      await createSheetTab(sheetName);
    } else {
      throw err;
    }
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [headers, ...rows] },
  });
}

async function appendToSheet(
  sheetName: string,
  rows: (string | number | boolean | null)[][]
): Promise<void> {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });
}

// ─── ensureSheetsExist ────────────────────────────────────────────────────────
export async function ensureSheetsExist(): Promise<void> {
  const sheets = await getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existingTitles = new Set(
    (meta.data.sheets ?? []).map((s) => s.properties?.title ?? "")
  );

  const toCreate = Object.keys(SHEET_NAMES).filter((name) => !existingTitles.has(name));

  if (toCreate.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: toCreate.map((title) => ({
          addSheet: { properties: { title } },
        })),
      },
    });
  }

  for (const sheetName of Object.keys(SHEET_NAMES)) {
    const data = await readSheet(sheetName);
    if (data.length === 0) {
      await writeSheet(sheetName, [SHEET_HEADERS[sheetName]]);
    }
  }
}

// ─── Warehouses ───────────────────────────────────────────────────────────────
export async function getWarehouses(): Promise<Warehouse[]> {
  const rows = await readSheet(SHEET_NAMES.Warehouses);
  if (rows.length <= 1) return [];
  return rows.slice(1).map((r) => ({
    id: str(r[0]),
    name: str(r[1]),
    locationCode: str(r[2]),
    city: str(r[3]),
    region: str(r[4]),
    pincode: str(r[5]),
    stockUnits: num(r[6]) ?? 0,
    capacityPct: num(r[7]) ?? 0,
    isActive: bool(r[8]),
    createdBy: str(r[9]),
    createDt: str(r[10]),
    updatedBy: nullStr(r[11]),
    updateDt: nullStr(r[12]),
  }));
}

export async function upsertWarehouses(warehouses: Warehouse[]): Promise<void> {
  const rows = warehouses.map((w) => [
    w.id, w.name, w.locationCode, w.city, w.region, w.pincode,
    w.stockUnits, w.capacityPct, String(w.isActive),
    w.createdBy, w.createDt, w.updatedBy ?? "", w.updateDt ?? "",
  ]);
  await clearAndWriteSheet(SHEET_NAMES.Warehouses, SHEET_HEADERS.Warehouses, rows);
}

// ─── MasterSinkConfig ─────────────────────────────────────────────────────────
export async function getMasterSinkId(): Promise<string | null> {
  const rows = await readSheet(SHEET_NAMES.MasterSinkConfig);
  if (rows.length <= 1) return null;
  const row = rows.slice(1).find((r) => bool(r[3])); // is_active at index 3
  return row ? str(row[1]) : null;
}

export async function setMasterSinkId(warehouseId: string | null, warehouseName?: string): Promise<void> {
  const rows = await readSheet(SHEET_NAMES.MasterSinkConfig);
  const dataRows: string[][] = rows.length > 1 ? (rows.slice(1) as string[][]) : [];
  // Deactivate all existing rows, preserving their audit columns
  const updated = dataRows.map((r) => [
    str(r[0]), str(r[1]), str(r[2]), "false",
    str(r[4] ?? ""), str(r[5] ?? ""), str(r[6] ?? ""), str(r[7] ?? ""),
  ]);
  if (warehouseId !== null) {
    const now = new Date().toISOString();
    updated.push([`msc_${Date.now()}`, warehouseId, warehouseName ?? "", "true", "prototype_user", now, "", ""]);
  }
  await clearAndWriteSheet(SHEET_NAMES.MasterSinkConfig, SHEET_HEADERS.MasterSinkConfig, updated);
}

// ─── DonorSettings ────────────────────────────────────────────────────────────
export async function getDonorSettings(): Promise<DonorSetting[]> {
  const rows = await readSheet(SHEET_NAMES.DonorSettings);
  if (rows.length <= 1) return [];
  return rows.slice(1).map((r) => ({
    warehouseId: str(r[0]),
    isParticipating: bool(r[1]),
    isActive: bool(r[2]),
    createdBy: str(r[3]),
    createDt: str(r[4]),
    updatedBy: nullStr(r[5]),
    updateDt: nullStr(r[6]),
  }));
}

export async function saveDonorSettings(settings: DonorSetting[]): Promise<void> {
  const rows = settings.map((s) => [
    s.warehouseId, String(s.isParticipating), String(s.isActive),
    s.createdBy, s.createDt, s.updatedBy ?? "", s.updateDt ?? "",
  ]);
  await clearAndWriteSheet(SHEET_NAMES.DonorSettings, SHEET_HEADERS.DonorSettings, rows);
}

// ─── RoutePairOverrides ───────────────────────────────────────────────────────
export async function getRoutePairOverrides(): Promise<RoutePairOverride[]> {
  const rows = await readSheet(SHEET_NAMES.RoutePairOverrides);
  if (rows.length <= 1) return [];
  return rows.slice(1).map((r) => ({
    donorWarehouseId: str(r[0]),
    sinkWarehouseId: str(r[1]),
    isActive: bool(r[2]),
    createdBy: str(r[3]),
    createDt: str(r[4]),
    updatedBy: nullStr(r[5]),
    updateDt: nullStr(r[6]),
  }));
}

export async function saveRoutePairOverrides(overrides: RoutePairOverride[]): Promise<void> {
  const rows = overrides.map((o) => [
    o.donorWarehouseId, o.sinkWarehouseId, String(o.isActive),
    o.createdBy, o.createDt, o.updatedBy ?? "", o.updateDt ?? "",
  ]);
  await clearAndWriteSheet(SHEET_NAMES.RoutePairOverrides, SHEET_HEADERS.RoutePairOverrides, rows);
}

// ─── ThresholdsGlobal ─────────────────────────────────────────────────────────
// Columns: id(0) cogs_min(1) cogs_max(2) units_min(3) units_max(4) weight_min(5) weight_max(6)
//          is_active(7) created_by(8) create_dt(9) updated_by(10) update_dt(11)
export async function getThresholdsGlobal(): Promise<ThresholdsGlobal> {
  const rows = await readSheet(SHEET_NAMES.ThresholdsGlobal);
  if (rows.length <= 1) {
    return {
      id: "global",
      cogsMin: null, cogsMax: null,
      unitsMin: null, unitsMax: null,
      weightMin: null, weightMax: null,
      isActive: true,
      createdBy: "", createDt: "", updatedBy: null, updateDt: "",
    };
  }
  const r = rows[1];
  return {
    id: str(r[0]) || "global",
    cogsMin: num(r[1]),
    cogsMax: num(r[2]),
    unitsMin: num(r[3]),
    unitsMax: num(r[4]),
    weightMin: num(r[5]),
    weightMax: num(r[6]),
    isActive: r[7] !== undefined ? bool(r[7]) : true,
    createdBy: str(r[8]),
    createDt: str(r[9]),
    updatedBy: nullStr(r[10]),
    updateDt: str(r[11]),
  };
}

export async function saveThresholdsGlobal(t: ThresholdsGlobal): Promise<void> {
  const rows = [[
    t.id,
    t.cogsMin ?? "", t.cogsMax ?? "",
    t.unitsMin ?? "", t.unitsMax ?? "",
    t.weightMin ?? "", t.weightMax ?? "",
    String(t.isActive),
    t.createdBy, t.createDt, t.updatedBy ?? "", t.updateDt,
  ]];
  await clearAndWriteSheet(SHEET_NAMES.ThresholdsGlobal, SHEET_HEADERS.ThresholdsGlobal, rows);
}

// ─── ThresholdsCategory ───────────────────────────────────────────────────────
// Columns: category_id(0) category_name(1) cogs_min(2) cogs_max(3) units_min(4)
//          units_max(5) weight_min(6) weight_max(7) is_active(8)
//          created_by(9) create_dt(10) updated_by(11) update_dt(12)
export async function getThresholdsCategory(): Promise<ThresholdsCategory[]> {
  const rows = await readSheet(SHEET_NAMES.ThresholdsCategory);
  if (rows.length <= 1) return [];
  return rows.slice(1).map((r) => ({
    categoryId: str(r[0]),
    categoryName: str(r[1]),
    cogsMin: num(r[2]),
    cogsMax: num(r[3]),
    unitsMin: num(r[4]),
    unitsMax: num(r[5]),
    weightMin: num(r[6]),
    weightMax: num(r[7]),
    isActive: r[8] !== undefined ? bool(r[8]) : true,
    createdBy: str(r[9]),
    createDt: str(r[10]),
    updatedBy: nullStr(r[11]),
    updateDt: nullStr(r[12]),
  }));
}

export async function saveThresholdsCategory(rows: ThresholdsCategory[]): Promise<void> {
  const data = rows.map((r) => [
    r.categoryId, r.categoryName,
    r.cogsMin ?? "", r.cogsMax ?? "",
    r.unitsMin ?? "", r.unitsMax ?? "",
    r.weightMin ?? "", r.weightMax ?? "",
    String(r.isActive),
    r.createdBy, r.createDt, r.updatedBy ?? "", r.updateDt ?? "",
  ]);
  await clearAndWriteSheet(SHEET_NAMES.ThresholdsCategory, SHEET_HEADERS.ThresholdsCategory, data);
}

// ─── ThresholdsBrand ──────────────────────────────────────────────────────────
// Columns: brand_id(0) brand_name(1) category_id(2) category_name(3) cogs_min(4)
//          cogs_max(5) units_min(6) units_max(7) weight_min(8) weight_max(9)
//          is_active(10) created_by(11) create_dt(12) updated_by(13) update_dt(14)
export async function getThresholdsBrand(): Promise<ThresholdsBrand[]> {
  const rows = await readSheet(SHEET_NAMES.ThresholdsBrand);
  if (rows.length <= 1) return [];
  return rows.slice(1).map((r) => ({
    brandId: str(r[0]),
    brandName: str(r[1]),
    categoryId: str(r[2]),
    categoryName: str(r[3]),
    cogsMin: num(r[4]),
    cogsMax: num(r[5]),
    unitsMin: num(r[6]),
    unitsMax: num(r[7]),
    weightMin: num(r[8]),
    weightMax: num(r[9]),
    isActive: r[10] !== undefined ? bool(r[10]) : true,
    createdBy: str(r[11]),
    createDt: str(r[12]),
    updatedBy: nullStr(r[13]),
    updateDt: nullStr(r[14]),
  }));
}

export async function saveThresholdsBrand(rows: ThresholdsBrand[]): Promise<void> {
  const data = rows.map((r) => [
    r.brandId, r.brandName, r.categoryId, r.categoryName,
    r.cogsMin ?? "", r.cogsMax ?? "",
    r.unitsMin ?? "", r.unitsMax ?? "",
    r.weightMin ?? "", r.weightMax ?? "",
    String(r.isActive),
    r.createdBy, r.createDt, r.updatedBy ?? "", r.updateDt ?? "",
  ]);
  await clearAndWriteSheet(SHEET_NAMES.ThresholdsBrand, SHEET_HEADERS.ThresholdsBrand, data);
}

// ─── ProductConfigGlobal ──────────────────────────────────────────────────────
// Columns: id(0) standard_shelf_life_pct(1) op_shelf_life_pct(2) standard_enabled(3)
//          op_enabled(4) is_active(5) created_by(6) create_dt(7) updated_by(8) update_dt(9)
export async function getProductConfigGlobal(): Promise<ProductConfigGlobal> {
  const rows = await readSheet(SHEET_NAMES.ProductConfigGlobal);
  if (rows.length <= 1) {
    return {
      id: "global",
      standardShelfLifePct: 30,
      opShelfLifePct: 50,
      standardEnabled: true,
      opEnabled: true,
      isActive: true,
      createdBy: "", createDt: "", updatedBy: null, updateDt: "",
    };
  }
  const r = rows[1];
  return {
    id: str(r[0]) || "global",
    standardShelfLifePct: num(r[1]) ?? 30,
    opShelfLifePct: num(r[2]) ?? 50,
    standardEnabled: bool(r[3]),
    opEnabled: bool(r[4]),
    isActive: r[5] !== undefined ? bool(r[5]) : true,
    createdBy: str(r[6]),
    createDt: str(r[7]),
    updatedBy: nullStr(r[8]),
    updateDt: str(r[9]),
  };
}

export async function saveProductConfigGlobal(config: ProductConfigGlobal): Promise<void> {
  const rows = [[
    config.id,
    config.standardShelfLifePct,
    config.opShelfLifePct,
    String(config.standardEnabled),
    String(config.opEnabled),
    String(config.isActive),
    config.createdBy, config.createDt, config.updatedBy ?? "", config.updateDt,
  ]];
  await clearAndWriteSheet(SHEET_NAMES.ProductConfigGlobal, SHEET_HEADERS.ProductConfigGlobal, rows);
}

// ─── Brands ───────────────────────────────────────────────────────────────────
// Columns: id(0) name(1) category_id(2) shelf_life_override_pct(3) is_active(4)
//          created_by(5) create_dt(6) updated_by(7) update_dt(8)
export async function getBrands(): Promise<Brand[]> {
  const rows = await readSheet(SHEET_NAMES.Brands);
  if (rows.length <= 1) return [];
  return rows.slice(1).map((r) => ({
    id: str(r[0]),
    name: str(r[1]),
    categoryId: str(r[2]),
    shelfLifeOverridePct: num(r[3]),
    isActive: bool(r[4]),
    createdBy: str(r[5]),
    createDt: str(r[6]),
    updatedBy: nullStr(r[7]),
    updateDt: nullStr(r[8]),
  }));
}

export async function saveBrands(rows: Brand[]): Promise<void> {
  const data = rows.map((r) => [
    r.id, r.name, r.categoryId,
    r.shelfLifeOverridePct ?? "", String(r.isActive),
    r.createdBy, r.createDt, r.updatedBy ?? "", r.updateDt ?? "",
  ]);
  await clearAndWriteSheet(SHEET_NAMES.Brands, SHEET_HEADERS.Brands, data);
}

// ─── SKUs ─────────────────────────────────────────────────────────────────────
// Columns: id(0) name(1) brand_id(2) brand_name(3) category_id(4) category_name(5)
//          type(6) shelf_life_override_pct(7) is_ignored(8) is_active(9) stock_units(10)
//          created_by(11) create_dt(12) updated_by(13) update_dt(14)
export async function getSKUs(): Promise<SKU[]> {
  const rows = await readSheet(SHEET_NAMES.SKUs);
  if (rows.length <= 1) return [];
  return rows.slice(1).map((r) => ({
    id: str(r[0]),
    name: str(r[1]),
    brandId: str(r[2]),
    brandName: str(r[3]),
    categoryId: str(r[4]),
    categoryName: str(r[5]),
    type: (r[6] === "op" ? "op" : "standard") as "standard" | "op",
    shelfLifeOverridePct: num(r[7]),
    isIgnored: bool(r[8]),
    isActive: bool(r[9]),
    stockUnits: num(r[10]) ?? 0,
    createdBy: str(r[11]),
    createDt: str(r[12]),
    updatedBy: nullStr(r[13]),
    updateDt: nullStr(r[14]),
  }));
}

export async function saveSKUs(rows: SKU[]): Promise<void> {
  const data = rows.map((r) => [
    r.id, r.name, r.brandId, r.brandName, r.categoryId, r.categoryName,
    r.type, r.shelfLifeOverridePct ?? "",
    String(r.isIgnored), String(r.isActive), r.stockUnits,
    r.createdBy, r.createDt, r.updatedBy ?? "", r.updateDt ?? "",
  ]);
  await clearAndWriteSheet(SHEET_NAMES.SKUs, SHEET_HEADERS.SKUs, data);
}

// ─── Categories ───────────────────────────────────────────────────────────────
// Columns: id(0) name(1) shelf_life_override_pct(2) is_active(3)
//          created_by(4) create_dt(5) updated_by(6) update_dt(7)
export async function getCategories(): Promise<Category[]> {
  const rows = await readSheet(SHEET_NAMES.Categories);
  if (rows.length <= 1) return [];
  return rows.slice(1).map((r) => ({
    id: str(r[0]),
    name: str(r[1]),
    shelfLifeOverridePct: num(r[2]),
    isActive: bool(r[3]),
    createdBy: str(r[4]),
    createDt: str(r[5]),
    updatedBy: nullStr(r[6]),
    updateDt: nullStr(r[7]),
  }));
}

export async function saveCategories(rows: Category[]): Promise<void> {
  const data = rows.map((r) => [
    r.id, r.name, r.shelfLifeOverridePct ?? "", String(r.isActive),
    r.createdBy, r.createDt, r.updatedBy ?? "", r.updateDt ?? "",
  ]);
  await clearAndWriteSheet(SHEET_NAMES.Categories, SHEET_HEADERS.Categories, data);
}

// ─── InventoryConditions ──────────────────────────────────────────────────────
// Columns: id(0) condition_type(1) description(2) is_enabled(3) is_active(4)
//          created_by(5) create_dt(6) updated_by(7) update_dt(8)
const DEFAULT_CONDITIONS: InventoryCondition[] = [
  { id: "cond_good",    conditionType: "good",    description: "", isEnabled: false, isActive: true, createdBy: "system", createDt: "", updatedBy: null, updateDt: null },
  { id: "cond_damaged", conditionType: "damaged", description: "", isEnabled: false, isActive: true, createdBy: "system", createDt: "", updatedBy: null, updateDt: null },
  { id: "cond_expired", conditionType: "expired", description: "", isEnabled: false, isActive: true, createdBy: "system", createDt: "", updatedBy: null, updateDt: null },
];

export async function getInventoryConditions(): Promise<InventoryCondition[]> {
  const rows = await readSheet(SHEET_NAMES.InventoryConditions);
  if (rows.length <= 1) return DEFAULT_CONDITIONS;
  const saved = rows.slice(1).map((r) => ({
    id: str(r[0]),
    conditionType: str(r[1]) as InventoryCondition["conditionType"],
    description: str(r[2]),
    isEnabled: bool(r[3]),
    isActive: bool(r[4]),
    createdBy: str(r[5]),
    createDt: str(r[6]),
    updatedBy: nullStr(r[7]),
    updateDt: nullStr(r[8]),
  }));
  return DEFAULT_CONDITIONS.map(
    (d) => saved.find((s) => s.conditionType === d.conditionType) ?? d
  );
}

export async function saveInventoryConditions(rows: InventoryCondition[]): Promise<void> {
  const data = rows.map((r) => [
    r.id, r.conditionType, r.description,
    String(r.isEnabled), String(r.isActive),
    r.createdBy, r.createDt, r.updatedBy ?? "", r.updateDt ?? "",
  ]);
  await clearAndWriteSheet(SHEET_NAMES.InventoryConditions, SHEET_HEADERS.InventoryConditions, data);
}

// ─── Batches (maps to batch_runs DB table) ────────────────────────────────────
// Columns: id(0) master_sink_id(1) master_sink_name(2) status(3) generated_at(4)
//          committed_by(5) committed_at(6) is_active(7)
//          created_by(8) create_dt(9) updated_by(10) update_dt(11)
export async function getBatches(): Promise<Batch[]> {
  const rows = await readSheet(SHEET_NAMES.Batches);
  if (rows.length <= 1) return [];
  return rows.slice(1).map((r) => ({
    id: str(r[0]),
    masterSinkId: str(r[1]),
    masterSinkName: str(r[2]),
    status: str(r[3]) as Batch["status"],
    generatedAt: str(r[4]),
    committedBy: nullStr(r[5]),
    committedAt: nullStr(r[6]),
    isActive: r[7] !== undefined ? bool(r[7]) : true,
    createdBy: str(r[8]),
    createDt: str(r[9]),
    updatedBy: nullStr(r[10]),
    updateDt: nullStr(r[11]),
  }));
}

export async function saveBatches(rows: Batch[]): Promise<void> {
  const data = rows.map((r) => [
    r.id, r.masterSinkId, r.masterSinkName, r.status, r.generatedAt,
    r.committedBy ?? "", r.committedAt ?? "", String(r.isActive),
    r.createdBy, r.createDt, r.updatedBy ?? "", r.updateDt ?? "",
  ]);
  await clearAndWriteSheet(SHEET_NAMES.Batches, SHEET_HEADERS.Batches, data);
}

// ─── TransferOrders ───────────────────────────────────────────────────────────
export async function getTransferOrders(batchId?: string): Promise<TransferOrder[]> {
  const rows = await readSheet(SHEET_NAMES.TransferOrders);
  if (rows.length <= 1) return [];
  const all = rows.slice(1).map((r) => ({
    id: str(r[0]),
    batchId: str(r[1]),
    type: str(r[2]) as TransferOrder["type"],
    sourceWarehouseId: str(r[3]),
    sourceName: str(r[4]),
    destinationWarehouseId: str(r[5]),
    destinationName: str(r[6]),
    units: num(r[7]) ?? 0,
    cogs: num(r[8]) ?? 0,
    weight: num(r[9]) ?? 0,
    status: str(r[10]) as TransferOrder["status"],
  }));
  return batchId ? all.filter((o) => o.batchId === batchId) : all;
}

export async function saveTransferOrders(rows: TransferOrder[]): Promise<void> {
  const data = rows.map((r) => [
    r.id, r.batchId, r.type,
    r.sourceWarehouseId, r.sourceName,
    r.destinationWarehouseId, r.destinationName,
    r.units, r.cogs, r.weight, r.status,
  ]);
  await clearAndWriteSheet(SHEET_NAMES.TransferOrders, SHEET_HEADERS.TransferOrders, data);
}

// ─── OrderLineItems ───────────────────────────────────────────────────────────
export async function getOrderLineItems(orderId?: string): Promise<OrderLineItem[]> {
  const rows = await readSheet(SHEET_NAMES.OrderLineItems);
  if (rows.length <= 1) return [];
  const all = rows.slice(1).map((r) => ({
    id: str(r[0]),
    orderId: str(r[1]),
    skuId: str(r[2]),
    skuName: str(r[3]),
    units: num(r[4]) ?? 0,
    cogs: num(r[5]) ?? 0,
    expiryDate: nullStr(r[6]),
  }));
  return orderId ? all.filter((li) => li.orderId === orderId) : all;
}

export async function saveOrderLineItems(rows: OrderLineItem[]): Promise<void> {
  const data = rows.map((r) => [
    r.id, r.orderId, r.skuId, r.skuName,
    r.units, r.cogs, r.expiryDate ?? "",
  ]);
  await clearAndWriteSheet(SHEET_NAMES.OrderLineItems, SHEET_HEADERS.OrderLineItems, data);
}

// ─── PendingChanges ───────────────────────────────────────────────────────────
export async function getPendingChanges(): Promise<PendingChange[]> {
  const rows = await readSheet(SHEET_NAMES.PendingChanges);
  if (rows.length <= 1) return [];
  return rows.slice(1).map((r) => ({
    id: str(r[0]),
    module: str(r[1]),
    entity: str(r[2]),
    op: str(r[3]) as PendingChange["op"],
    targetId: nullStr(r[4]),
    payload: (() => {
      try {
        return JSON.parse(r[5]) as Record<string, unknown>;
      } catch {
        return {};
      }
    })(),
    createdAt: str(r[6]),
  }));
}

export async function stageChange(change: PendingChange): Promise<void> {
  const existing = await getPendingChanges();

  let filtered = existing.filter((c) => {
    const sameKey =
      c.module === change.module &&
      c.entity === change.entity &&
      c.targetId === change.targetId;
    return !sameKey;
  });

  if (change.entity === "master_sink") {
    filtered = filtered.filter((c) => c.entity !== "master_sink");
  }

  filtered.push(change);

  const data = filtered.map((c) => [
    c.id, c.module, c.entity, c.op,
    c.targetId ?? "", JSON.stringify(c.payload), c.createdAt,
  ]);
  await clearAndWriteSheet(SHEET_NAMES.PendingChanges, SHEET_HEADERS.PendingChanges, data);
}

export async function discardPendingChanges(): Promise<void> {
  await clearAndWriteSheet(SHEET_NAMES.PendingChanges, SHEET_HEADERS.PendingChanges, []);
}

// ─── AuditLog ─────────────────────────────────────────────────────────────────
// Columns: id(0) event_dt(1) module(2) action(3) entity(4) entity_id(5) summary(6)
//          user_id(7) session_id(8) before_json(9) after_json(10) created_by(11) create_dt(12)
export async function clearAuditLog(): Promise<void> {
  await clearAndWriteSheet(SHEET_NAMES.AuditLog, SHEET_HEADERS.AuditLog, []);
}

export async function appendAuditLog(entry: AuditEntry): Promise<void> {
  const rows = await readSheet(SHEET_NAMES.AuditLog);
  if (rows.length === 0) {
    await writeSheet(SHEET_NAMES.AuditLog, [SHEET_HEADERS.AuditLog]);
  }
  await appendToSheet(SHEET_NAMES.AuditLog, [[
    entry.id,
    entry.eventDt,
    entry.module,
    entry.action,
    entry.entity,
    entry.entityId ?? "",
    entry.summary,
    entry.userId,
    entry.sessionId,
    entry.beforeJson,
    entry.afterJson,
    entry.createdBy,
    entry.createDt,
  ]]);
}

export async function getAuditLog(): Promise<AuditEntry[]> {
  const rows = await readSheet(SHEET_NAMES.AuditLog);
  if (rows.length <= 1) return [];
  return rows.slice(1).map((r) => ({
    id: str(r[0]),
    eventDt: str(r[1]),
    module: str(r[2]),
    action: str(r[3]),
    entity: str(r[4]),
    entityId: nullStr(r[5]),
    summary: str(r[6]),
    userId: str(r[7]),
    sessionId: str(r[8]),
    beforeJson: str(r[9]),
    afterJson: str(r[10]),
    createdBy: str(r[11]),
    createDt: str(r[12]),
  }));
}
