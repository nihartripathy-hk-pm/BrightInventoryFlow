import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  // Dynamic imports so env is set before gsheets module loads
  const {
    ensureSheetsExist,
    saveCategories,
    saveBrands,
    upsertWarehouses,
    setMasterSinkId,
    saveDonorSettings,
    saveRoutePairOverrides,
    saveThresholdsGlobal,
    saveThresholdsCategory,
    saveThresholdsBrand,
    saveProductConfigGlobal,
    saveBrandShelfLife,
    saveSKUs,
    saveBatches,
    saveTransferOrders,
    saveOrderLineItems,
    appendAuditLog,
    clearAuditLog,
  } = await import("../src/lib/gsheets");

  console.log("Ensuring all 17 sheet tabs exist...");
  await ensureSheetsExist();
  console.log("  done.");

  // ─── Categories ─────────────────────────────────────────────────────────────
  console.log("Seeding Categories...");
  await saveCategories([
    { id: "CAT-01", name: "Vitamins & Supplements", skuCount: 6 },
    { id: "CAT-02", name: "Personal Care", skuCount: 6 },
    { id: "CAT-03", name: "OTC Pharma", skuCount: 6 },
    { id: "CAT-04", name: "Baby & Mother", skuCount: 6 },
    { id: "CAT-05", name: "Sports Nutrition", skuCount: 6 },
  ]);
  console.log("  5 categories written.");

  // ─── Brands ─────────────────────────────────────────────────────────────────
  console.log("Seeding Brands...");
  await saveBrands([
    { id: "BRD-01", name: "LifeEssentials", categoryId: "CAT-01", categoryName: "Vitamins & Supplements", skuCount: 3 },
    { id: "BRD-02", name: "VitaCore", categoryId: "CAT-01", categoryName: "Vitamins & Supplements", skuCount: 3 },
    { id: "BRD-03", name: "PureSkin", categoryId: "CAT-02", categoryName: "Personal Care", skuCount: 3 },
    { id: "BRD-04", name: "DermaCare", categoryId: "CAT-02", categoryName: "Personal Care", skuCount: 3 },
    { id: "BRD-05", name: "HealFast", categoryId: "CAT-03", categoryName: "OTC Pharma", skuCount: 3 },
    { id: "BRD-06", name: "MediRelief", categoryId: "CAT-03", categoryName: "OTC Pharma", skuCount: 3 },
    { id: "BRD-07", name: "TinySteps", categoryId: "CAT-04", categoryName: "Baby & Mother", skuCount: 3 },
    { id: "BRD-08", name: "MamaBond", categoryId: "CAT-04", categoryName: "Baby & Mother", skuCount: 3 },
    { id: "BRD-09", name: "ProFuel", categoryId: "CAT-05", categoryName: "Sports Nutrition", skuCount: 3 },
    { id: "BRD-10", name: "EliteSport", categoryId: "CAT-05", categoryName: "Sports Nutrition", skuCount: 3 },
  ]);
  console.log("  10 brands written.");

  // ─── Warehouses ─────────────────────────────────────────────────────────────
  console.log("Seeding Warehouses...");
  await upsertWarehouses([
    { id: "WH-MUM-01", name: "Mumbai DC", locationCode: "MUM01", city: "Mumbai", region: "West", pincode: "400001", stockUnits: 45000, capacityPct: 72, isActive: true },
    { id: "WH-DEL-01", name: "Delhi FC", locationCode: "DEL01", city: "Delhi", region: "North", pincode: "110001", stockUnits: 38000, capacityPct: 55, isActive: true },
    { id: "WH-BLR-01", name: "Bengaluru Hub", locationCode: "BLR01", city: "Bengaluru", region: "South", pincode: "560001", stockUnits: 52000, capacityPct: 81, isActive: true },
    { id: "WH-CCU-01", name: "Kolkata FC", locationCode: "CCU01", city: "Kolkata", region: "East", pincode: "700001", stockUnits: 29000, capacityPct: 48, isActive: true },
    { id: "WH-HYD-01", name: "Hyderabad FC", locationCode: "HYD01", city: "Hyderabad", region: "South", pincode: "500001", stockUnits: 33000, capacityPct: 61, isActive: true },
    { id: "WH-LIQ-01", name: "Pune Liquidation", locationCode: "LIQ01", city: "Pune", region: "West", pincode: "411001", stockUnits: 12000, capacityPct: 35, isActive: true },
  ]);
  console.log("  6 warehouses written.");

  // ─── MasterSinkConfig ────────────────────────────────────────────────────────
  console.log("Seeding MasterSinkConfig...");
  await setMasterSinkId("WH-LIQ-01");
  console.log("  masterSinkWarehouseId = WH-LIQ-01.");

  // ─── DonorSettings ───────────────────────────────────────────────────────────
  console.log("Seeding DonorSettings...");
  await saveDonorSettings([
    { warehouseId: "WH-MUM-01", isParticipating: true },
    { warehouseId: "WH-DEL-01", isParticipating: true },
    { warehouseId: "WH-BLR-01", isParticipating: true },
    { warehouseId: "WH-CCU-01", isParticipating: true },
    { warehouseId: "WH-HYD-01", isParticipating: true },
    { warehouseId: "WH-LIQ-01", isParticipating: false },
  ]);
  console.log("  6 donor settings written.");

  // ─── RoutePairOverrides ──────────────────────────────────────────────────────
  console.log("Seeding RoutePairOverrides...");
  await saveRoutePairOverrides([
    { donorWarehouseId: "WH-MUM-01", sinkWarehouseId: "WH-CCU-01", isActive: true },
    { donorWarehouseId: "WH-DEL-01", sinkWarehouseId: "WH-LIQ-01", isActive: false },
    { donorWarehouseId: "WH-BLR-01", sinkWarehouseId: "WH-LIQ-01", isActive: false },
  ]);
  console.log("  3 route pair overrides written.");

  // ─── ThresholdsGlobal ────────────────────────────────────────────────────────
  console.log("Seeding ThresholdsGlobal...");
  await saveThresholdsGlobal({
    cogsMin: 50000,
    cogsMax: 500000,
    unitsMin: 100,
    unitsMax: 10000,
    weightMin: 50,
    weightMax: 5000,
    updatedAt: new Date().toISOString(),
  });
  console.log("  global thresholds written.");

  // ─── ThresholdsCategory ──────────────────────────────────────────────────────
  console.log("Seeding ThresholdsCategory...");
  await saveThresholdsCategory([
    {
      categoryId: "CAT-01",
      categoryName: "Vitamins & Supplements",
      cogsMin: 30000,
      cogsMax: 300000,
      unitsMin: 50,
      unitsMax: 5000,
      weightMin: 20,
      weightMax: 2000,
    },
    {
      categoryId: "CAT-03",
      categoryName: "OTC Pharma",
      cogsMin: 75000,
      cogsMax: 750000,
      unitsMin: 200,
      unitsMax: 15000,
      weightMin: 100,
      weightMax: 8000,
    },
  ]);
  console.log("  2 category thresholds written.");

  // ─── ThresholdsBrand ─────────────────────────────────────────────────────────
  console.log("Seeding ThresholdsBrand...");
  await saveThresholdsBrand([
    {
      brandId: "BRD-05",
      brandName: "HealFast",
      categoryName: "OTC Pharma",
      cogsMin: 100000,
      cogsMax: 1000000,
      unitsMin: 500,
      unitsMax: 20000,
      weightMin: 200,
      weightMax: 10000,
    },
  ]);
  console.log("  1 brand threshold written.");

  // ─── ProductConfigGlobal ─────────────────────────────────────────────────────
  console.log("Seeding ProductConfigGlobal...");
  await saveProductConfigGlobal({
    standardShelfLifePct: 30,
    opShelfLifePct: 50,
    standardEnabled: true,
    opEnabled: true,
    updatedAt: new Date().toISOString(),
  });
  console.log("  product config written.");

  // ─── BrandShelfLife ──────────────────────────────────────────────────────────
  console.log("Seeding BrandShelfLife...");
  await saveBrandShelfLife([
    { brandId: "BRD-01", brandName: "LifeEssentials", categoryId: "CAT-01", categoryName: "Vitamins & Supplements", shelfLifeOverridePct: 40, isActive: true },
    { brandId: "BRD-03", brandName: "PureSkin", categoryId: "CAT-02", categoryName: "Personal Care", shelfLifeOverridePct: 25, isActive: true },
    { brandId: "BRD-07", brandName: "TinySteps", categoryId: "CAT-04", categoryName: "Baby & Mother", shelfLifeOverridePct: 60, isActive: true },
  ]);
  console.log("  3 brand shelf life overrides written.");

  // ─── SKUs ────────────────────────────────────────────────────────────────────
  console.log("Seeding SKUs (30)...");
  await saveSKUs([
    { id: "SKU-001", name: "VitaD3 2000IU", brandId: "BRD-01", brandName: "LifeEssentials", categoryId: "CAT-01", categoryName: "Vitamins & Supplements", type: "standard", shelfLifeOverridePct: null, isIgnored: false, stockUnits: 2400 },
    { id: "SKU-002", name: "Omega-3 Fish Oil", brandId: "BRD-01", brandName: "LifeEssentials", categoryId: "CAT-01", categoryName: "Vitamins & Supplements", type: "standard", shelfLifeOverridePct: 45, isIgnored: false, stockUnits: 1800 },
    { id: "SKU-003", name: "Vitamin C 1000mg", brandId: "BRD-01", brandName: "LifeEssentials", categoryId: "CAT-01", categoryName: "Vitamins & Supplements", type: "op", shelfLifeOverridePct: null, isIgnored: false, stockUnits: 950 },
    { id: "SKU-004", name: "B-Complex Max", brandId: "BRD-02", brandName: "VitaCore", categoryId: "CAT-01", categoryName: "Vitamins & Supplements", type: "standard", shelfLifeOverridePct: null, isIgnored: true, stockUnits: 320 },
    { id: "SKU-005", name: "Zinc Picolinate", brandId: "BRD-02", brandName: "VitaCore", categoryId: "CAT-01", categoryName: "Vitamins & Supplements", type: "standard", shelfLifeOverridePct: null, isIgnored: false, stockUnits: 1200 },
    { id: "SKU-006", name: "Magnesium Citrate", brandId: "BRD-02", brandName: "VitaCore", categoryId: "CAT-01", categoryName: "Vitamins & Supplements", type: "op", shelfLifeOverridePct: 35, isIgnored: false, stockUnits: 780 },
    { id: "SKU-007", name: "Daily Moisturiser SPF30", brandId: "BRD-03", brandName: "PureSkin", categoryId: "CAT-02", categoryName: "Personal Care", type: "standard", shelfLifeOverridePct: null, isIgnored: false, stockUnits: 3100 },
    { id: "SKU-008", name: "Gentle Foam Cleanser", brandId: "BRD-03", brandName: "PureSkin", categoryId: "CAT-02", categoryName: "Personal Care", type: "op", shelfLifeOverridePct: null, isIgnored: false, stockUnits: 780 },
    { id: "SKU-009", name: "Vitamin C Serum", brandId: "BRD-03", brandName: "PureSkin", categoryId: "CAT-02", categoryName: "Personal Care", type: "standard", shelfLifeOverridePct: 20, isIgnored: false, stockUnits: 1450 },
    { id: "SKU-010", name: "Retinol Night Cream", brandId: "BRD-04", brandName: "DermaCare", categoryId: "CAT-02", categoryName: "Personal Care", type: "standard", shelfLifeOverridePct: null, isIgnored: false, stockUnits: 890 },
    { id: "SKU-011", name: "Hyaluronic Acid Serum", brandId: "BRD-04", brandName: "DermaCare", categoryId: "CAT-02", categoryName: "Personal Care", type: "op", shelfLifeOverridePct: null, isIgnored: true, stockUnits: 230 },
    { id: "SKU-012", name: "Sunscreen SPF50", brandId: "BRD-04", brandName: "DermaCare", categoryId: "CAT-02", categoryName: "Personal Care", type: "standard", shelfLifeOverridePct: null, isIgnored: false, stockUnits: 2200 },
    { id: "SKU-013", name: "Ibuprofen 400mg", brandId: "BRD-05", brandName: "HealFast", categoryId: "CAT-03", categoryName: "OTC Pharma", type: "standard", shelfLifeOverridePct: null, isIgnored: false, stockUnits: 5000 },
    { id: "SKU-014", name: "Paracetamol 500mg", brandId: "BRD-05", brandName: "HealFast", categoryId: "CAT-03", categoryName: "OTC Pharma", type: "standard", shelfLifeOverridePct: null, isIgnored: false, stockUnits: 4200 },
    { id: "SKU-015", name: "Antacid Tablets", brandId: "BRD-05", brandName: "HealFast", categoryId: "CAT-03", categoryName: "OTC Pharma", type: "op", shelfLifeOverridePct: null, isIgnored: false, stockUnits: 1600 },
    { id: "SKU-016", name: "Antihistamine 10mg", brandId: "BRD-06", brandName: "MediRelief", categoryId: "CAT-03", categoryName: "OTC Pharma", type: "standard", shelfLifeOverridePct: null, isIgnored: false, stockUnits: 2800 },
    { id: "SKU-017", name: "Cough Syrup 100ml", brandId: "BRD-06", brandName: "MediRelief", categoryId: "CAT-03", categoryName: "OTC Pharma", type: "op", shelfLifeOverridePct: null, isIgnored: false, stockUnits: 1100 },
    { id: "SKU-018", name: "Eye Drops 10ml", brandId: "BRD-06", brandName: "MediRelief", categoryId: "CAT-03", categoryName: "OTC Pharma", type: "standard", shelfLifeOverridePct: null, isIgnored: false, stockUnits: 670 },
    { id: "SKU-019", name: "Baby Shampoo 200ml", brandId: "BRD-07", brandName: "TinySteps", categoryId: "CAT-04", categoryName: "Baby & Mother", type: "standard", shelfLifeOverridePct: null, isIgnored: false, stockUnits: 2900 },
    { id: "SKU-020", name: "Baby Lotion 150ml", brandId: "BRD-07", brandName: "TinySteps", categoryId: "CAT-04", categoryName: "Baby & Mother", type: "standard", shelfLifeOverridePct: 55, isIgnored: false, stockUnits: 3400 },
    { id: "SKU-021", name: "Baby Wipes 80pcs", brandId: "BRD-07", brandName: "TinySteps", categoryId: "CAT-04", categoryName: "Baby & Mother", type: "op", shelfLifeOverridePct: null, isIgnored: false, stockUnits: 4800 },
    { id: "SKU-022", name: "Prenatal Vitamins", brandId: "BRD-08", brandName: "MamaBond", categoryId: "CAT-04", categoryName: "Baby & Mother", type: "standard", shelfLifeOverridePct: null, isIgnored: false, stockUnits: 1300 },
    { id: "SKU-023", name: "Nursing Pads 60pcs", brandId: "BRD-08", brandName: "MamaBond", categoryId: "CAT-04", categoryName: "Baby & Mother", type: "op", shelfLifeOverridePct: null, isIgnored: false, stockUnits: 980 },
    { id: "SKU-024", name: "Stretch Mark Cream", brandId: "BRD-08", brandName: "MamaBond", categoryId: "CAT-04", categoryName: "Baby & Mother", type: "standard", shelfLifeOverridePct: null, isIgnored: false, stockUnits: 740 },
    { id: "SKU-025", name: "Whey Protein 1kg", brandId: "BRD-09", brandName: "ProFuel", categoryId: "CAT-05", categoryName: "Sports Nutrition", type: "standard", shelfLifeOverridePct: null, isIgnored: false, stockUnits: 1900 },
    { id: "SKU-026", name: "BCAA Powder 300g", brandId: "BRD-09", brandName: "ProFuel", categoryId: "CAT-05", categoryName: "Sports Nutrition", type: "standard", shelfLifeOverridePct: null, isIgnored: false, stockUnits: 1400 },
    { id: "SKU-027", name: "Creatine Monohydrate", brandId: "BRD-09", brandName: "ProFuel", categoryId: "CAT-05", categoryName: "Sports Nutrition", type: "op", shelfLifeOverridePct: null, isIgnored: false, stockUnits: 860 },
    { id: "SKU-028", name: "Pre-Workout 250g", brandId: "BRD-10", brandName: "EliteSport", categoryId: "CAT-05", categoryName: "Sports Nutrition", type: "standard", shelfLifeOverridePct: null, isIgnored: false, stockUnits: 1150 },
    { id: "SKU-029", name: "Electrolyte Tabs 20s", brandId: "BRD-10", brandName: "EliteSport", categoryId: "CAT-05", categoryName: "Sports Nutrition", type: "standard", shelfLifeOverridePct: null, isIgnored: false, stockUnits: 2600 },
    { id: "SKU-030", name: "Protein Bar 12-pack", brandId: "BRD-10", brandName: "EliteSport", categoryId: "CAT-05", categoryName: "Sports Nutrition", type: "op", shelfLifeOverridePct: null, isIgnored: true, stockUnits: 440 },
  ]);
  console.log("  30 SKUs written.");

  // ─── Batches ─────────────────────────────────────────────────────────────────
  console.log("Seeding Batches...");
  await saveBatches([
    {
      id: "LIQ-2024-0047",
      engineVersion: "v2.1",
      masterSinkName: "Pune Liquidation",
      status: "pending_approval",
      generatedAt: new Date().toISOString(),
      committedAt: null,
      totalOrders: 3,
      totalSkus: 8,
      totalUnits: 2450,
      totalCogs: 187500,
      totalWeight: 1240,
    },
  ]);
  console.log("  1 batch written.");

  // ─── TransferOrders ──────────────────────────────────────────────────────────
  console.log("Seeding TransferOrders...");
  await saveTransferOrders([
    {
      id: "TXN-0047-001",
      batchId: "LIQ-2024-0047",
      type: "wh_transfer",
      sourceWarehouseId: "WH-MUM-01",
      sourceName: "Mumbai DC",
      destinationWarehouseId: "WH-LIQ-01",
      destinationName: "Pune Liquidation",
      units: 1200,
      cogs: 95000,
      weight: 620,
      status: "pending",
    },
    {
      id: "TXN-0047-002",
      batchId: "LIQ-2024-0047",
      type: "wh_transfer",
      sourceWarehouseId: "WH-DEL-01",
      sourceName: "Delhi FC",
      destinationWarehouseId: "WH-LIQ-01",
      destinationName: "Pune Liquidation",
      units: 850,
      cogs: 67500,
      weight: 410,
      status: "pending",
    },
    {
      id: "TXN-0047-003",
      batchId: "LIQ-2024-0047",
      type: "b2b",
      sourceWarehouseId: "WH-BLR-01",
      sourceName: "Bengaluru Hub",
      destinationWarehouseId: "WH-LIQ-01",
      destinationName: "Pune Liquidation",
      units: 400,
      cogs: 25000,
      weight: 210,
      status: "pending",
    },
  ]);
  console.log("  3 transfer orders written.");

  // ─── OrderLineItems ──────────────────────────────────────────────────────────
  console.log("Seeding OrderLineItems...");
  await saveOrderLineItems([
    { id: "LI-001", orderId: "TXN-0047-001", skuId: "SKU-013", skuName: "Ibuprofen 400mg", units: 400, cogs: 38000, expiryDate: "2024-07-15" },
    { id: "LI-002", orderId: "TXN-0047-001", skuId: "SKU-014", skuName: "Paracetamol 500mg", units: 350, cogs: 28000, expiryDate: "2024-09-30" },
    { id: "LI-003", orderId: "TXN-0047-001", skuId: "SKU-015", skuName: "Antacid Tablets", units: 450, cogs: 29000, expiryDate: "2024-06-20" },
    { id: "LI-004", orderId: "TXN-0047-002", skuId: "SKU-002", skuName: "Omega-3 Fish Oil", units: 200, cogs: 18000, expiryDate: "2024-10-15" },
    { id: "LI-005", orderId: "TXN-0047-002", skuId: "SKU-006", skuName: "Magnesium Citrate", units: 250, cogs: 20500, expiryDate: "2024-07-31" },
    { id: "LI-006", orderId: "TXN-0047-002", skuId: "SKU-003", skuName: "Vitamin C 1000mg", units: 400, cogs: 29000, expiryDate: "2025-01-10" },
    { id: "LI-007", orderId: "TXN-0047-003", skuId: "SKU-007", skuName: "Daily Moisturiser SPF30", units: 150, cogs: 12000, expiryDate: "2024-08-05" },
    { id: "LI-008", orderId: "TXN-0047-003", skuId: "SKU-008", skuName: "Gentle Foam Cleanser", units: 100, cogs: 6500, expiryDate: null },
    { id: "LI-009", orderId: "TXN-0047-003", skuId: "SKU-009", skuName: "Vitamin C Serum", units: 80, cogs: 4500, expiryDate: "2024-07-28" },
    { id: "LI-010", orderId: "TXN-0047-003", skuId: "SKU-016", skuName: "Antihistamine 10mg", units: 70, cogs: 2000, expiryDate: "2024-12-31" },
  ]);
  console.log("  10 order line items written.");

  // ─── AuditLog ────────────────────────────────────────────────────────────────
  console.log("Seeding AuditLog...");
  await clearAuditLog(); // reset so re-seeding doesn't append duplicates
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000).toISOString();

  await appendAuditLog({
    id: "AUD-0001",
    timestamp: hoursAgo(24),
    module: "warehouse_setup",
    action: "donor_participation_updated",
    entity: "WH-MUM-01",
    summary: "Participation enabled for Mumbai DC",
    userId: "system",
    beforeJson: JSON.stringify({ isParticipating: false }),
    afterJson: JSON.stringify({ isParticipating: true }),
    sessionId: "seed-session-001",
  });

  await appendAuditLog({
    id: "AUD-0002",
    timestamp: hoursAgo(20),
    module: "product_config",
    action: "sku_ignored",
    entity: "SKU-004",
    summary: "B-Complex Max marked as ignored",
    userId: "system",
    beforeJson: JSON.stringify({ isIgnored: false }),
    afterJson: JSON.stringify({ isIgnored: true }),
    sessionId: "seed-session-001",
  });

  await appendAuditLog({
    id: "AUD-0003",
    timestamp: hoursAgo(16),
    module: "transfer_thresholds",
    action: "global_threshold_updated",
    entity: "ThresholdsGlobal",
    summary: "COGS min updated from ₹40,000 to ₹50,000",
    userId: "system",
    beforeJson: JSON.stringify({ cogsMin: 40000 }),
    afterJson: JSON.stringify({ cogsMin: 50000 }),
    sessionId: "seed-session-001",
  });

  await appendAuditLog({
    id: "AUD-0004",
    timestamp: hoursAgo(12),
    module: "product_config",
    action: "brand_override_set",
    entity: "BRD-01",
    summary: "Shelf life override set to 40% for LifeEssentials",
    userId: "system",
    beforeJson: JSON.stringify({ shelfLifeOverridePct: null }),
    afterJson: JSON.stringify({ shelfLifeOverridePct: 40 }),
    sessionId: "seed-session-001",
  });

  await appendAuditLog({
    id: "AUD-0005",
    timestamp: hoursAgo(8),
    module: "warehouse_setup",
    action: "route_pair_override",
    entity: "WH-MUM-01",
    summary: "Custom sink assigned: Kolkata FC",
    userId: "system",
    beforeJson: JSON.stringify({ customSink: null }),
    afterJson: JSON.stringify({ customSink: "WH-CCU-01" }),
    sessionId: "seed-session-001",
  });

  await appendAuditLog({
    id: "AUD-0006",
    timestamp: hoursAgo(2),
    module: "transfer_approval",
    action: "batch_reviewed",
    entity: "LIQ-2024-0047",
    summary: "Batch generated — 3 orders, ₹1,87,500 COGS pending approval",
    userId: "system",
    beforeJson: JSON.stringify({}),
    afterJson: JSON.stringify({ status: "pending_approval" }),
    sessionId: "seed-session-001",
  });

  console.log("  6 audit log entries written.");

  // ─── Summary ─────────────────────────────────────────────────────────────────
  console.log("");
  console.log("=== Seed complete ===");
  console.log("  Spreadsheet ID : 1U-T91N__ouV1EmnaCDcJPq_0Ta3OlutI7chizUMgRTc");
  console.log("  Tabs seeded    : 17");
  console.log("  Categories     : 5");
  console.log("  Brands         : 10");
  console.log("  Warehouses     : 6");
  console.log("  SKUs           : 30  (3 ignored: SKU-004, SKU-011, SKU-030)");
  console.log("  Batches        : 1   (LIQ-2024-0047, pending_approval)");
  console.log("  TransferOrders : 3   (all pending)");
  console.log("  LineItems      : 10  (spread across 3 orders)");
  console.log("  AuditLog       : 6   (entries over past 24h)");
  console.log("  ThreshCat      : 2   (CAT-01, CAT-03)");
  console.log("  ThreshBrand    : 1   (BRD-05)");
  console.log("  BrandShelfLife : 3   (BRD-01, BRD-03, BRD-07)");
  console.log("  RouteOverrides : 3   (1 active, 2 inactive)");
  console.log("  DonorSettings  : 6   (WH-LIQ-01 excluded)");
  console.log("  PendingChanges : 0   (empty on fresh seed)");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
