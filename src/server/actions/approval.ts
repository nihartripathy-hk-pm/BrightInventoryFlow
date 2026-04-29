"use server";

import { revalidatePath } from "next/cache";
import {
  getBatches,
  saveBatches,
  getTransferOrders,
  saveTransferOrders,
  appendAuditLog,
} from "@/lib/gsheets";
import { randomUUID } from "crypto";

export async function commitBatchAction(
  batchId: string
): Promise<{ success: true; orderIds: string[] }> {
  const now = new Date().toISOString();

  const batches = await getBatches();
  const batch = batches.find((b) => b.id === batchId);
  if (!batch) throw new Error(`Batch ${batchId} not found`);

  batch.status = "committed";
  batch.committedAt = now;
  batch.committedBy = "prototype_user";
  batch.updatedBy = "prototype_user";
  batch.updateDt = now;
  await saveBatches(batches);

  const orders = await getTransferOrders(batchId);
  for (const order of orders) {
    order.status = "in_transit";
  }
  const allOrders = await getTransferOrders();
  const updatedOrders = allOrders.map((o) =>
    o.batchId === batchId ? { ...o, status: "in_transit" as const } : o
  );
  await saveTransferOrders(updatedOrders);

  const orderIds = orders.map((o) => o.id);

  await appendAuditLog({
    id: randomUUID(),
    eventDt: now,
    module: "transfer_approval",
    action: "batch_committed",
    entity: "batch_runs",
    entityId: batchId,
    summary: `Batch ${batchId} authorized and committed. Orders now in transit.`,
    userId: "prototype_user",
    sessionId: "sess_prototype",
    beforeJson: JSON.stringify({ status: "pending_approval" }),
    afterJson: JSON.stringify({ status: "committed" }),
    createdBy: "prototype_user",
    createDt: now,
  });

  revalidatePath("/approval");
  revalidatePath("/audit");

  return { success: true, orderIds };
}

export async function rejectBatchAction(batchId: string): Promise<void> {
  const now = new Date().toISOString();

  const batches = await getBatches();
  const batch = batches.find((b) => b.id === batchId);
  if (!batch) throw new Error(`Batch ${batchId} not found`);

  batch.status = "rejected";
  await saveBatches(batches);

  await appendAuditLog({
    id: randomUUID(),
    eventDt: now,
    module: "transfer_approval",
    action: "batch_rejected",
    entity: "batch_runs",
    entityId: batchId,
    summary: `Batch ${batchId} rejected.`,
    userId: "prototype_user",
    sessionId: "sess_prototype",
    beforeJson: JSON.stringify({ status: "pending_approval" }),
    afterJson: JSON.stringify({ status: "rejected" }),
    createdBy: "prototype_user",
    createDt: now,
  });

  revalidatePath("/approval");
  revalidatePath("/audit");
}

export async function cancelTransactionAction(txnId: string): Promise<void> {
  const allOrders = await getTransferOrders();
  const order = allOrders.find((o) => o.id === txnId);
  if (!order) throw new Error(`Order ${txnId} not found`);

  if (order.status === "pending") {
    order.status = "cancelled";
    await saveTransferOrders(allOrders);
  }

  revalidatePath("/approval");
}

export async function cancelTransactionsAction(
  batchId?: string,
  sourceWarehouseId?: string
): Promise<{ cancelled: number }> {
  const allOrders = await getTransferOrders();

  let cancelled = 0;
  const updated = allOrders.map((o) => {
    const matchesBatch = batchId ? o.batchId === batchId : true;
    const matchesSource = sourceWarehouseId
      ? o.sourceName === sourceWarehouseId || o.sourceWarehouseId === sourceWarehouseId
      : true;

    if (matchesBatch && matchesSource && o.status === "pending") {
      cancelled++;
      return { ...o, status: "cancelled" as const };
    }
    return o;
  });

  await saveTransferOrders(updated);

  revalidatePath("/approval");

  return { cancelled };
}
