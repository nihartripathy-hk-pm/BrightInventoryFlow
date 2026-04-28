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
};

export type DonorSetting = {
  warehouseId: string;
  isParticipating: boolean;
};

export type RoutePairOverride = {
  donorWarehouseId: string;
  sinkWarehouseId: string;
  isActive: boolean;
};

export type ThresholdsGlobal = {
  cogsMin: number | null;
  cogsMax: number | null;
  unitsMin: number | null;
  unitsMax: number | null;
  weightMin: number | null;
  weightMax: number | null;
  updatedAt: string;
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
};

export type ThresholdsBrand = {
  brandId: string;
  brandName: string;
  categoryName: string;
  cogsMin: number | null;
  cogsMax: number | null;
  unitsMin: number | null;
  unitsMax: number | null;
  weightMin: number | null;
  weightMax: number | null;
};

export type ProductConfigGlobal = {
  standardShelfLifePct: number;
  opShelfLifePct: number;
  standardEnabled: boolean;
  opEnabled: boolean;
  updatedAt: string;
};

export type BrandShelfLife = {
  brandId: string;
  brandName: string;
  categoryId: string;
  categoryName: string;
  shelfLifeOverridePct: number | null;
  isActive: boolean;
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
  stockUnits: number;
};

export type Category = {
  id: string;
  name: string;
  skuCount: number;
};

export type Brand = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  skuCount: number;
};

export type Batch = {
  id: string;
  engineVersion: string;
  masterSinkName: string;
  status: "pending_approval" | "committed" | "rejected";
  generatedAt: string;
  committedAt: string | null;
  totalOrders: number;
  totalSkus: number;
  totalUnits: number;
  totalCogs: number;
  totalWeight: number;
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
  timestamp: string;
  module: string;
  action: string;
  entity: string;
  summary: string;
  userId: string;
  beforeJson: string;
  afterJson: string;
  sessionId: string;
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
  BrandShelfLife: "BrandShelfLife",
  SKUs: "SKUs",
  Categories: "Categories",
  Brands: "Brands",
  Batches: "Batches",
  TransferOrders: "TransferOrders",
  OrderLineItems: "OrderLineItems",
  PendingChanges: "PendingChanges",
  AuditLog: "AuditLog",
} as const;

const SHEET_HEADERS: Record<string, string[]> = {
  Warehouses: ["id", "name", "location_code", "city", "region", "pincode", "stock_units", "capacity_pct", "is_active"],
  MasterSinkConfig: ["key", "value"],
  DonorSettings: ["warehouse_id", "is_participating"],
  RoutePairOverrides: ["donor_warehouse_id", "sink_warehouse_id", "is_active"],
  ThresholdsGlobal: ["cogs_min", "cogs_max", "units_min", "units_max", "weight_min", "weight_max", "updated_at"],
  ThresholdsCategory: ["category_id", "category_name", "cogs_min", "cogs_max", "units_min", "units_max", "weight_min", "weight_max"],
  ThresholdsBrand: ["brand_id", "brand_name", "category_name", "cogs_min", "cogs_max", "units_min", "units_max", "weight_min", "weight_max"],
  ProductConfigGlobal: ["standard_shelf_life_pct", "op_shelf_life_pct", "standard_enabled", "op_enabled", "updated_at"],
  BrandShelfLife: ["brand_id", "brand_name", "category_id", "category_name", "shelf_life_override_pct", "is_active"],
  SKUs: ["id", "name", "brand_id", "brand_name", "category_id", "category_name", "type", "shelf_life_override_pct", "is_ignored", "stock_units"],
  Categories: ["id", "name", "sku_count"],
  Brands: ["id", "name", "category_id", "category_name", "sku_count"],
  Batches: ["id", "engine_version", "master_sink_name", "status", "generated_at", "committed_at", "total_orders", "total_skus", "total_units", "total_cogs", "total_weight"],
  TransferOrders: ["id", "batch_id", "type", "source_warehouse_id", "source_name", "destination_warehouse_id", "destination_name", "units", "cogs", "weight", "status"],
  OrderLineItems: ["id", "order_id", "sku_id", "sku_name", "units", "cogs", "expiry_date"],
  PendingChanges: ["id", "module", "entity", "op", "target_id", "payload", "created_at"],
  AuditLog: ["id", "timestamp", "module", "action", "entity", "summary", "user_id", "before_json", "after_json", "session_id"],
};

// ─── Parsing helpers ──────────────────────────────────────────────────────────
const num = (v: string): number | null => (v && v !== "" ? parseFloat(v) : null);
const bool = (v: string): boolean => v === "true" || v === "TRUE";
const str = (v: string | undefined): string => v ?? "";

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function getAuthClient() {
  // Priority 1: GOOGLE_SERVICE_ACCOUNT_KEY env var
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    return auth.getClient();
  }

  // Priority 2: .google-token.json + credentials.json files
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

  // Priority 3: Application Default Credentials
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
    // Sheet doesn't exist yet (pre-seed) or quota exceeded — return empty
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

async function clearAndWriteSheet(
  sheetName: string,
  headers: string[],
  rows: (string | number | boolean | null)[][]
): Promise<void> {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });
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

  // Write headers for any sheet that is empty
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
  }));
}

export async function upsertWarehouses(warehouses: Warehouse[]): Promise<void> {
  const rows = warehouses.map((w) => [
    w.id,
    w.name,
    w.locationCode,
    w.city,
    w.region,
    w.pincode,
    w.stockUnits,
    w.capacityPct,
    String(w.isActive),
  ]);
  await clearAndWriteSheet(SHEET_NAMES.Warehouses, SHEET_HEADERS.Warehouses, rows);
}

// ─── MasterSinkConfig ─────────────────────────────────────────────────────────
export async function getMasterSinkId(): Promise<string | null> {
  const rows = await readSheet(SHEET_NAMES.MasterSinkConfig);
  if (rows.length <= 1) return null;
  const row = rows.slice(1).find((r) => r[0] === "masterSinkWarehouseId");
  return row ? str(row[1]) : null;
}

export async function setMasterSinkId(id: string): Promise<void> {
  const rows = await readSheet(SHEET_NAMES.MasterSinkConfig);
  const dataRows: string[][] = rows.length > 1 ? (rows.slice(1) as string[][]) : [];
  const idx = dataRows.findIndex((r) => r[0] === "masterSinkWarehouseId");
  if (idx >= 0) {
    dataRows[idx] = ["masterSinkWarehouseId", id];
  } else {
    dataRows.push(["masterSinkWarehouseId", id]);
  }
  await clearAndWriteSheet(SHEET_NAMES.MasterSinkConfig, SHEET_HEADERS.MasterSinkConfig, dataRows);
}

// ─── DonorSettings ────────────────────────────────────────────────────────────
export async function getDonorSettings(): Promise<DonorSetting[]> {
  const rows = await readSheet(SHEET_NAMES.DonorSettings);
  if (rows.length <= 1) return [];
  return rows.slice(1).map((r) => ({
    warehouseId: str(r[0]),
    isParticipating: bool(r[1]),
  }));
}

export async function saveDonorSettings(settings: DonorSetting[]): Promise<void> {
  const rows = settings.map((s) => [s.warehouseId, String(s.isParticipating)]);
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
  }));
}

export async function saveRoutePairOverrides(overrides: RoutePairOverride[]): Promise<void> {
  const rows = overrides.map((o) => [o.donorWarehouseId, o.sinkWarehouseId, String(o.isActive)]);
  await clearAndWriteSheet(SHEET_NAMES.RoutePairOverrides, SHEET_HEADERS.RoutePairOverrides, rows);
}

// ─── ThresholdsGlobal ─────────────────────────────────────────────────────────
export async function getThresholdsGlobal(): Promise<ThresholdsGlobal> {
  const rows = await readSheet(SHEET_NAMES.ThresholdsGlobal);
  if (rows.length <= 1) {
    return {
      cogsMin: null,
      cogsMax: null,
      unitsMin: null,
      unitsMax: null,
      weightMin: null,
      weightMax: null,
      updatedAt: "",
    };
  }
  const r = rows[1];
  return {
    cogsMin: num(r[0]),
    cogsMax: num(r[1]),
    unitsMin: num(r[2]),
    unitsMax: num(r[3]),
    weightMin: num(r[4]),
    weightMax: num(r[5]),
    updatedAt: str(r[6]),
  };
}

export async function saveThresholdsGlobal(t: ThresholdsGlobal): Promise<void> {
  const rows = [
    [
      t.cogsMin ?? "",
      t.cogsMax ?? "",
      t.unitsMin ?? "",
      t.unitsMax ?? "",
      t.weightMin ?? "",
      t.weightMax ?? "",
      t.updatedAt,
    ],
  ];
  await clearAndWriteSheet(SHEET_NAMES.ThresholdsGlobal, SHEET_HEADERS.ThresholdsGlobal, rows);
}

// ─── ThresholdsCategory ───────────────────────────────────────────────────────
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
  }));
}

export async function saveThresholdsCategory(rows: ThresholdsCategory[]): Promise<void> {
  const data = rows.map((r) => [
    r.categoryId,
    r.categoryName,
    r.cogsMin ?? "",
    r.cogsMax ?? "",
    r.unitsMin ?? "",
    r.unitsMax ?? "",
    r.weightMin ?? "",
    r.weightMax ?? "",
  ]);
  await clearAndWriteSheet(SHEET_NAMES.ThresholdsCategory, SHEET_HEADERS.ThresholdsCategory, data);
}

// ─── ThresholdsBrand ──────────────────────────────────────────────────────────
export async function getThresholdsBrand(): Promise<ThresholdsBrand[]> {
  const rows = await readSheet(SHEET_NAMES.ThresholdsBrand);
  if (rows.length <= 1) return [];
  return rows.slice(1).map((r) => ({
    brandId: str(r[0]),
    brandName: str(r[1]),
    categoryName: str(r[2]),
    cogsMin: num(r[3]),
    cogsMax: num(r[4]),
    unitsMin: num(r[5]),
    unitsMax: num(r[6]),
    weightMin: num(r[7]),
    weightMax: num(r[8]),
  }));
}

export async function saveThresholdsBrand(rows: ThresholdsBrand[]): Promise<void> {
  const data = rows.map((r) => [
    r.brandId,
    r.brandName,
    r.categoryName,
    r.cogsMin ?? "",
    r.cogsMax ?? "",
    r.unitsMin ?? "",
    r.unitsMax ?? "",
    r.weightMin ?? "",
    r.weightMax ?? "",
  ]);
  await clearAndWriteSheet(SHEET_NAMES.ThresholdsBrand, SHEET_HEADERS.ThresholdsBrand, data);
}

// ─── ProductConfigGlobal ──────────────────────────────────────────────────────
export async function getProductConfigGlobal(): Promise<ProductConfigGlobal> {
  const rows = await readSheet(SHEET_NAMES.ProductConfigGlobal);
  if (rows.length <= 1) {
    return {
      standardShelfLifePct: 30,
      opShelfLifePct: 50,
      standardEnabled: true,
      opEnabled: true,
      updatedAt: "",
    };
  }
  const r = rows[1];
  return {
    standardShelfLifePct: num(r[0]) ?? 30,
    opShelfLifePct: num(r[1]) ?? 50,
    standardEnabled: bool(r[2]),
    opEnabled: bool(r[3]),
    updatedAt: str(r[4]),
  };
}

export async function saveProductConfigGlobal(config: ProductConfigGlobal): Promise<void> {
  const rows = [
    [
      config.standardShelfLifePct,
      config.opShelfLifePct,
      String(config.standardEnabled),
      String(config.opEnabled),
      config.updatedAt,
    ],
  ];
  await clearAndWriteSheet(SHEET_NAMES.ProductConfigGlobal, SHEET_HEADERS.ProductConfigGlobal, rows);
}

// ─── BrandShelfLife ───────────────────────────────────────────────────────────
export async function getBrandShelfLife(): Promise<BrandShelfLife[]> {
  const rows = await readSheet(SHEET_NAMES.BrandShelfLife);
  if (rows.length <= 1) return [];
  return rows.slice(1).map((r) => ({
    brandId: str(r[0]),
    brandName: str(r[1]),
    categoryId: str(r[2]),
    categoryName: str(r[3]),
    shelfLifeOverridePct: num(r[4]),
    isActive: bool(r[5]),
  }));
}

export async function saveBrandShelfLife(rows: BrandShelfLife[]): Promise<void> {
  const data = rows.map((r) => [
    r.brandId,
    r.brandName,
    r.categoryId,
    r.categoryName,
    r.shelfLifeOverridePct ?? "",
    String(r.isActive),
  ]);
  await clearAndWriteSheet(SHEET_NAMES.BrandShelfLife, SHEET_HEADERS.BrandShelfLife, data);
}

// ─── SKUs ─────────────────────────────────────────────────────────────────────
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
    stockUnits: num(r[9]) ?? 0,
  }));
}

export async function saveSKUs(rows: SKU[]): Promise<void> {
  const data = rows.map((r) => [
    r.id,
    r.name,
    r.brandId,
    r.brandName,
    r.categoryId,
    r.categoryName,
    r.type,
    r.shelfLifeOverridePct ?? "",
    String(r.isIgnored),
    r.stockUnits,
  ]);
  await clearAndWriteSheet(SHEET_NAMES.SKUs, SHEET_HEADERS.SKUs, data);
}

// ─── Categories ───────────────────────────────────────────────────────────────
export async function getCategories(): Promise<Category[]> {
  const rows = await readSheet(SHEET_NAMES.Categories);
  if (rows.length <= 1) return [];
  return rows.slice(1).map((r) => ({
    id: str(r[0]),
    name: str(r[1]),
    skuCount: num(r[2]) ?? 0,
  }));
}

export async function saveCategories(rows: Category[]): Promise<void> {
  const data = rows.map((r) => [r.id, r.name, r.skuCount]);
  await clearAndWriteSheet(SHEET_NAMES.Categories, SHEET_HEADERS.Categories, data);
}

// ─── Brands ───────────────────────────────────────────────────────────────────
export async function getBrands(): Promise<Brand[]> {
  const rows = await readSheet(SHEET_NAMES.Brands);
  if (rows.length <= 1) return [];
  return rows.slice(1).map((r) => ({
    id: str(r[0]),
    name: str(r[1]),
    categoryId: str(r[2]),
    categoryName: str(r[3]),
    skuCount: num(r[4]) ?? 0,
  }));
}

export async function saveBrands(rows: Brand[]): Promise<void> {
  const data = rows.map((r) => [r.id, r.name, r.categoryId, r.categoryName, r.skuCount]);
  await clearAndWriteSheet(SHEET_NAMES.Brands, SHEET_HEADERS.Brands, data);
}

// ─── Batches ──────────────────────────────────────────────────────────────────
export async function getBatches(): Promise<Batch[]> {
  const rows = await readSheet(SHEET_NAMES.Batches);
  if (rows.length <= 1) return [];
  return rows.slice(1).map((r) => ({
    id: str(r[0]),
    engineVersion: str(r[1]),
    masterSinkName: str(r[2]),
    status: str(r[3]) as Batch["status"],
    generatedAt: str(r[4]),
    committedAt: r[5] && r[5] !== "" ? str(r[5]) : null,
    totalOrders: num(r[6]) ?? 0,
    totalSkus: num(r[7]) ?? 0,
    totalUnits: num(r[8]) ?? 0,
    totalCogs: num(r[9]) ?? 0,
    totalWeight: num(r[10]) ?? 0,
  }));
}

export async function saveBatches(rows: Batch[]): Promise<void> {
  const data = rows.map((r) => [
    r.id,
    r.engineVersion,
    r.masterSinkName,
    r.status,
    r.generatedAt,
    r.committedAt ?? "",
    r.totalOrders,
    r.totalSkus,
    r.totalUnits,
    r.totalCogs,
    r.totalWeight,
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
    r.id,
    r.batchId,
    r.type,
    r.sourceWarehouseId,
    r.sourceName,
    r.destinationWarehouseId,
    r.destinationName,
    r.units,
    r.cogs,
    r.weight,
    r.status,
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
    expiryDate: r[6] && r[6] !== "" ? str(r[6]) : null,
  }));
  return orderId ? all.filter((li) => li.orderId === orderId) : all;
}

export async function saveOrderLineItems(rows: OrderLineItem[]): Promise<void> {
  const data = rows.map((r) => [
    r.id,
    r.orderId,
    r.skuId,
    r.skuName,
    r.units,
    r.cogs,
    r.expiryDate ?? "",
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
    targetId: r[4] && r[4] !== "" ? str(r[4]) : null,
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
    // Remove any row with same module+entity+targetId
    const sameKey =
      c.module === change.module &&
      c.entity === change.entity &&
      c.targetId === change.targetId;
    return !sameKey;
  });

  // For master_sink entity: only one staged change at a time — remove all prior
  if (change.entity === "master_sink") {
    filtered = filtered.filter((c) => c.entity !== "master_sink");
  }

  filtered.push(change);

  const data = filtered.map((c) => [
    c.id,
    c.module,
    c.entity,
    c.op,
    c.targetId ?? "",
    JSON.stringify(c.payload),
    c.createdAt,
  ]);
  await clearAndWriteSheet(SHEET_NAMES.PendingChanges, SHEET_HEADERS.PendingChanges, data);
}

export async function discardPendingChanges(): Promise<void> {
  await clearAndWriteSheet(SHEET_NAMES.PendingChanges, SHEET_HEADERS.PendingChanges, []);
}

// ─── AuditLog ─────────────────────────────────────────────────────────────────
export async function clearAuditLog(): Promise<void> {
  await clearAndWriteSheet(SHEET_NAMES.AuditLog, SHEET_HEADERS.AuditLog, []);
}

export async function appendAuditLog(entry: AuditEntry): Promise<void> {
  const rows = await readSheet(SHEET_NAMES.AuditLog);
  // If sheet is empty (no header row), write header first
  if (rows.length === 0) {
    await writeSheet(SHEET_NAMES.AuditLog, [SHEET_HEADERS.AuditLog]);
  }
  await appendToSheet(SHEET_NAMES.AuditLog, [
    [
      entry.id,
      entry.timestamp,
      entry.module,
      entry.action,
      entry.entity,
      entry.summary,
      entry.userId,
      entry.beforeJson,
      entry.afterJson,
      entry.sessionId,
    ],
  ]);
}

export async function getAuditLog(): Promise<AuditEntry[]> {
  const rows = await readSheet(SHEET_NAMES.AuditLog);
  if (rows.length <= 1) return [];
  return rows.slice(1).map((r) => ({
    id: str(r[0]),
    timestamp: str(r[1]),
    module: str(r[2]),
    action: str(r[3]),
    entity: str(r[4]),
    summary: str(r[5]),
    userId: str(r[6]),
    beforeJson: str(r[7]),
    afterJson: str(r[8]),
    sessionId: str(r[9]),
  }));
}
