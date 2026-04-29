import {
  getWarehouses,
  getMasterSinkId,
  getDonorSettings,
  getRoutePairOverrides,
  getPendingChanges,
} from "@/lib/gsheets";
import { WarehouseTabs } from "./WarehouseTabs";

export default async function WarehousePage() {
  const [warehouses, masterSinkId, donorSettings, overrides, pending] =
    await Promise.all([
      getWarehouses(),
      getMasterSinkId(),
      getDonorSettings(),
      getRoutePairOverrides(),
      getPendingChanges(),
    ]);

  // Compute effective state factoring in pending changes
  const pendingSink = pending.find((c) => c.entity === "master_sink");
  const effectiveSinkId = pendingSink
    ? pendingSink.op === "set"
      ? pendingSink.targetId
      : null
    : masterSinkId;

  const pendingDonor = new Map<string, boolean>();
  const pendingOverride = new Map<string, string | null>();
  for (const c of pending) {
    if (c.entity === "donor_participation" && c.targetId)
      pendingDonor.set(
        c.targetId,
        (c.payload as { isParticipating: boolean }).isParticipating
      );
    if (c.entity === "pair_override" && c.targetId)
      pendingOverride.set(
        c.targetId,
        c.op === "set" ? (c.payload as { sinkId: string }).sinkId : null
      );
  }

  const activeWarehouses = warehouses.filter((w) => w.isActive);
  const participating = activeWarehouses.filter((w) => {
    if (w.id === effectiveSinkId) return false;
    const staged = pendingDonor.get(w.id);
    const live =
      donorSettings.find((d) => d.warehouseId === w.id)?.isParticipating ??
      true;
    return staged !== undefined ? staged : live;
  }).length;

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-primary">Warehouse Setup</h1>
            <p className="text-muted text-sm mt-1">
              Configure routing destinations and donor participation
            </p>
          </div>
          {effectiveSinkId && (
            <span className="flex items-center gap-1.5 text-xs text-accent bg-accent/10 px-3 py-1.5 rounded-full border border-accent/20 whitespace-nowrap flex-shrink-0">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              Master Sink:{" "}
              {activeWarehouses.find((w) => w.id === effectiveSinkId)?.name ?? effectiveSinkId}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <span className="text-xs text-muted bg-row px-3 py-1.5 rounded-full border border-border">
            {activeWarehouses.length} warehouses
          </span>
          <span className="text-xs text-green-400 bg-green-900/20 px-3 py-1.5 rounded-full border border-green-800/30">
            {participating} participating
          </span>
          <span className="text-xs text-red-400 bg-red-900/20 px-3 py-1.5 rounded-full border border-red-800/30">
            {activeWarehouses.filter((w) => w.id !== effectiveSinkId).length -
              participating}{" "}
            bypassed
          </span>
        </div>
      </div>
      <WarehouseTabs
        warehouses={activeWarehouses}
        effectiveSinkId={effectiveSinkId}
        donorSettings={donorSettings}
        overrides={overrides}
        pendingDonor={Object.fromEntries(pendingDonor)}
        pendingOverride={Object.fromEntries(pendingOverride)}
      />
    </div>
  );
}
