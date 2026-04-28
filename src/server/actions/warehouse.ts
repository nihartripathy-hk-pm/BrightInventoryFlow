"use server";

import { revalidatePath } from "next/cache";
import { stageChange, getWarehouses, getMasterSinkId } from "@/lib/gsheets";
import { randomUUID } from "crypto";

export async function setMasterSinkAction(warehouseId: string): Promise<void> {
  const now = new Date().toISOString();

  await stageChange({
    id: randomUUID(),
    module: "warehouse_setup",
    entity: "master_sink",
    op: "set",
    targetId: warehouseId,
    payload: { warehouseId },
    createdAt: now,
  });

  await stageChange({
    id: randomUUID(),
    module: "warehouse_setup",
    entity: "donor_participation",
    op: "set",
    targetId: warehouseId,
    payload: { isParticipating: false },
    createdAt: now,
  });

  revalidatePath("/warehouse");
  revalidatePath("/audit");
}

export async function clearMasterSinkAction(): Promise<void> {
  const now = new Date().toISOString();

  await stageChange({
    id: randomUUID(),
    module: "warehouse_setup",
    entity: "master_sink",
    op: "clear",
    targetId: null,
    payload: {},
    createdAt: now,
  });

  revalidatePath("/warehouse");
}

export async function toggleDonorAction(
  warehouseId: string,
  isParticipating: boolean
): Promise<void> {
  const now = new Date().toISOString();

  await stageChange({
    id: randomUUID(),
    module: "warehouse_setup",
    entity: "donor_participation",
    op: "set",
    targetId: warehouseId,
    payload: { isParticipating },
    createdAt: now,
  });

  revalidatePath("/warehouse");
}

export async function setPairOverrideAction(
  donorId: string,
  sinkId: string
): Promise<void> {
  const now = new Date().toISOString();

  await stageChange({
    id: randomUUID(),
    module: "warehouse_setup",
    entity: "pair_override",
    op: "set",
    targetId: donorId,
    payload: { sinkId },
    createdAt: now,
  });

  revalidatePath("/warehouse");
}

export async function clearPairOverrideAction(donorId: string): Promise<void> {
  const now = new Date().toISOString();

  await stageChange({
    id: randomUUID(),
    module: "warehouse_setup",
    entity: "pair_override",
    op: "clear",
    targetId: donorId,
    payload: {},
    createdAt: now,
  });

  revalidatePath("/warehouse");
}
