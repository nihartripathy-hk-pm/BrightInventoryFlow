"use client";

import { useState, useTransition } from "react";
import type { Warehouse, DonorSetting, RoutePairOverride } from "@/lib/gsheets";
import { TabBar } from "@/components/ui/TabBar";
import { Toggle } from "@/components/ui/Toggle";
import { CsvUploadPanel } from "@/components/ui/CsvUploadPanel";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { PendingBadge } from "@/components/ui/PendingBadge";
import {
  setMasterSinkAction,
  toggleDonorAction,
  setPairOverrideAction,
  clearPairOverrideAction,
} from "@/server/actions/warehouse";

type Props = {
  warehouses: Warehouse[];
  effectiveSinkId: string | null;
  donorSettings: DonorSetting[];
  overrides: RoutePairOverride[];
  pendingDonor: Record<string, boolean>;
  pendingOverride: Record<string, string | null>;
  pendingDonorIds: Set<string>;
  pendingOverrideIds: Set<string>;
  pendingMasterSink: boolean;
};

// ─── Tab 1: Warehouse Network ─────────────────────────────────────────────────

function WarehouseCard({
  w,
  effectiveSinkId,
}: {
  w: Warehouse;
  effectiveSinkId: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const isSink = w.id === effectiveSinkId;

  const capacityColor =
    w.capacityPct >= 80
      ? "bg-red-500"
      : w.capacityPct >= 60
      ? "bg-amber-500"
      : "bg-green-500";

  return (
    <div
      className={`bg-card border rounded-xl p-4 transition-all ${
        isSink
          ? "border-accent ring-1 ring-accent/20"
          : "border-border hover:border-border/80"
      }`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-primary truncate">{w.name}</div>
          <div className="text-xs text-muted font-mono mt-0.5">
            {w.id} · {w.city}
          </div>
        </div>
        {isSink ? (
          <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30 whitespace-nowrap">
            Master Sink
          </span>
        ) : (
          <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-row text-muted border border-border whitespace-nowrap">
            Donor
          </span>
        )}
      </div>

      {/* Stock */}
      <div className="text-xs text-muted mt-2">
        {w.stockUnits.toLocaleString()} units
      </div>

      {/* Capacity bar */}
      <div className="h-1.5 rounded-full bg-[#1e2333] mt-2">
        <div
          className={`h-1.5 rounded-full transition-all ${capacityColor}`}
          style={{ width: `${Math.min(100, w.capacityPct)}%` }}
        />
      </div>
      <div className="text-xs text-muted mt-1">{w.capacityPct}% capacity</div>

      {/* Sink / Set as sink */}
      {isSink ? (
        <p className="text-xs text-muted mt-3 bg-accent/5 rounded p-2">
          📍 All liquidated inventory routes here
        </p>
      ) : (
        <button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await setMasterSinkAction(w.id);
            })
          }
          className="w-full mt-3 py-1.5 text-xs border border-border hover:border-accent hover:text-accent text-muted rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {isPending ? "Setting…" : "Set as Master Sink"}
        </button>
      )}
    </div>
  );
}

function NetworkTab({
  warehouses,
  effectiveSinkId,
  pendingMasterSink,
}: {
  warehouses: Warehouse[];
  effectiveSinkId: string | null;
  pendingMasterSink: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = query
    ? warehouses.filter((w) => {
        const q = query.toLowerCase();
        return (
          w.name.toLowerCase().includes(q) ||
          w.id.toLowerCase().includes(q) ||
          w.city.toLowerCase().includes(q) ||
          w.locationCode.toLowerCase().includes(q)
        );
      })
    : warehouses.filter((w) => w.id === effectiveSinkId);

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search warehouses to change master sink…"
          className="flex-1 max-w-sm bg-row border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted-dark focus:outline-none focus:border-accent transition-colors"
        />
        {pendingMasterSink && <PendingBadge />}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((w) => (
          <WarehouseCard key={w.id} w={w} effectiveSinkId={effectiveSinkId} />
        ))}
        {filtered.length === 0 && !query && (
          <div className="col-span-full text-center text-sm text-muted py-12 border border-dashed border-border rounded-xl">
            No master sink configured. Search a warehouse above to set one.
          </div>
        )}
        {filtered.length === 0 && query && (
          <div className="col-span-full text-center text-sm text-muted py-12 border border-dashed border-border rounded-xl">
            No warehouses match &ldquo;{query}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 2: Donor Network ─────────────────────────────────────────────────────

type DonorFilter = "all" | "enabled" | "disabled";

function DonorNetworkTab({
  warehouses,
  effectiveSinkId,
  donorSettings,
  pendingDonor,
  pendingDonorIds,
}: {
  warehouses: Warehouse[];
  effectiveSinkId: string | null;
  donorSettings: DonorSetting[];
  pendingDonor: Record<string, boolean>;
  pendingDonorIds: Set<string>;
}) {
  const [activeFilter, setActiveFilter] = useState<DonorFilter>("all");
  const [query, setQuery] = useState("");

  function effectiveParticipating(warehouseId: string): boolean {
    if (warehouseId === effectiveSinkId) return false;
    if (pendingDonor[warehouseId] !== undefined) return pendingDonor[warehouseId];
    return donorSettings.find((d) => d.warehouseId === warehouseId)?.isParticipating ?? true;
  }

  const filtered = warehouses.filter((w) => {
    if (query) {
      const q = query.toLowerCase();
      if (
        !w.name.toLowerCase().includes(q) &&
        !w.id.toLowerCase().includes(q) &&
        !w.city.toLowerCase().includes(q)
      )
        return false;
    }
    if (activeFilter === "all") return true;
    const p = effectiveParticipating(w.id);
    if (w.id === effectiveSinkId) return activeFilter === "disabled";
    return activeFilter === "enabled" ? p : !p;
  });

  const filterLabels: { key: DonorFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "enabled", label: "Enabled" },
    { key: "disabled", label: "Disabled" },
  ];

  return (
    <div>
      {/* Info banner */}
      <div className="flex gap-3 bg-violet-900/15 border border-violet-800/30 rounded-xl px-4 py-3 mb-4">
        <svg className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" d="M12 8h.01M12 12v4" />
        </svg>
        <p className="text-xs text-muted leading-relaxed">
          <span className="text-violet-400 font-semibold">Bypassed donors</span> are invisible to the
          liquidation engine — no transfers will be suggested or executed from them. The Master Sink is
          automatically protected from donor participation.
        </p>
      </div>

      {/* CSV Upload Panel */}
      <CsvUploadPanel
        title="Donor Network Bulk Upload"
        columns={["warehouse_id", "participation"]}
        onUpload={async (rows) => {
          for (const row of rows) {
            const id = row["warehouse_id"];
            const raw = (row["participation"] ?? "").toLowerCase().trim();
            const participating = raw === "true" || raw === "1" || raw === "enabled" || raw === "yes";
            if (id) await toggleDonorAction(id, participating);
          }
        }}
      />

      {/* Search + filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search warehouse name, ID, city..."
            className="w-full bg-row border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-primary placeholder:text-muted-dark focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <div className="flex items-center rounded-lg border border-border overflow-hidden">
          {filterLabels.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                activeFilter === f.key
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:text-primary"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-dark whitespace-nowrap">
          {filtered.length} / {warehouses.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted uppercase tracking-wider border-b border-border">
              <th className="text-left pb-2 font-medium">Warehouse</th>
              <th className="text-left pb-2 font-medium">Location</th>
              <th className="text-right pb-2 font-medium">Stock</th>
              <th className="text-center pb-2 font-medium">Status</th>
              <th className="text-center pb-2 font-medium">Participation</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((w) => (
              <DonorRow
                key={w.id}
                w={w}
                isSink={w.id === effectiveSinkId}
                isParticipating={effectiveParticipating(w.id)}
                hasPendingChange={pendingDonorIds.has(w.id)}
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted py-10 text-sm">
                  No warehouses match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DonorRow({
  w,
  isSink,
  isParticipating,
  hasPendingChange,
}: {
  w: Warehouse;
  isSink: boolean;
  isParticipating: boolean;
  hasPendingChange: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <tr
      className={`border-b border-border transition-opacity ${
        isPending ? "opacity-50 pointer-events-none" : ""
      } ${isSink ? "opacity-50" : ""}`}
    >
      <td className="py-3 pr-4">
        <div className="font-medium text-primary">{w.name}</div>
        <div className="text-xs text-muted font-mono mt-0.5">{w.id}</div>
      </td>
      <td className="py-3 pr-4">
        <div className="text-sm text-muted">{w.city}</div>
        <div className="text-xs text-muted-dark">{w.locationCode}</div>
      </td>
      <td className="py-3 pr-4 text-right text-sm text-muted">
        {w.stockUnits.toLocaleString()}
      </td>
      <td className="py-3 pr-4 text-center">
        <div className="flex items-center justify-center gap-1.5">
          {isSink ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
              Master Sink
            </span>
          ) : isParticipating ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/20 text-green-400 border border-green-800/30">
              Participating
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/20 text-red-400 border border-red-800/30">
              Bypassed
            </span>
          )}
          {hasPendingChange && <PendingBadge />}
        </div>
      </td>
      <td className="py-3 text-center">
        <Toggle
          checked={isParticipating}
          disabled={isSink}
          onChange={(val) => {
            startTransition(async () => {
              await toggleDonorAction(w.id, val);
            });
          }}
        />
      </td>
    </tr>
  );
}

// ─── Tab 3: Route Pair Overrides ──────────────────────────────────────────────

function RoutePairTab({
  warehouses,
  effectiveSinkId,
  overrides,
  pendingOverride,
  pendingOverrideIds,
}: {
  warehouses: Warehouse[];
  effectiveSinkId: string | null;
  overrides: RoutePairOverride[];
  pendingOverride: Record<string, string | null>;
  pendingOverrideIds: Set<string>;
}) {
  const [sourceQuery, setSourceQuery] = useState("");
  const [destQuery, setDestQuery] = useState("");
  const [, startTransition] = useTransition();
  const [addDonorId, setAddDonorId] = useState<string>("");
  const [addSinkId, setAddSinkId] = useState<string>("");
  const [showAdd, setShowAdd] = useState(false);

  const masterSinkName =
    warehouses.find((w) => w.id === effectiveSinkId)?.name ?? "master sink";

  // Donors: all active warehouses that are not the sink
  const donors = warehouses.filter((w) => w.id !== effectiveSinkId);

  function effectiveOverrideSinkId(donorId: string): string | null {
    if (pendingOverride[donorId] !== undefined) return pendingOverride[donorId];
    const existing = overrides.find(
      (o) => o.donorWarehouseId === donorId && o.isActive
    );
    return existing ? existing.sinkWarehouseId : null;
  }

  const donorsWithOverride = donors.filter(
    (w) => effectiveOverrideSinkId(w.id) !== null
  );

  const filtered = donorsWithOverride.filter((w) => {
    if (sourceQuery) {
      const q = sourceQuery.toLowerCase();
      if (!w.name.toLowerCase().includes(q) && !w.id.toLowerCase().includes(q) && !w.city.toLowerCase().includes(q))
        return false;
    }
    if (destQuery) {
      const q = destQuery.toLowerCase();
      const overrideSinkId = effectiveOverrideSinkId(w.id);
      const destName = overrideSinkId
        ? warehouses.find((wh) => wh.id === overrideSinkId)?.name ?? overrideSinkId
        : masterSinkName;
      if (!destName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const donorPickerOptions = donors
    .filter((w) => effectiveOverrideSinkId(w.id) === null)
    .map((w) => ({ id: w.id, name: w.name }));
  const sinkPickerOptions = warehouses
    .filter((w) => w.id !== addDonorId)
    .map((w) => ({ id: w.id, name: w.name }));

  function handleAdd() {
    if (!addDonorId || !addSinkId) return;
    const donorId = addDonorId;
    const sinkId = addSinkId;
    setAddDonorId("");
    setAddSinkId("");
    setShowAdd(false);
    startTransition(async () => {
      await setPairOverrideAction(donorId, sinkId);
    });
  }

  return (
    <div>
      {/* Info banner */}
      <div className="flex gap-3 bg-teal-900/15 border border-teal-800/30 rounded-xl px-4 py-3 mb-4">
        <svg className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
        </svg>
        <p className="text-xs text-muted leading-relaxed">
          This list shows only donor warehouses with an active Route Pair Override.
          All other donors route to the <strong className="text-primary">{masterSinkName}</strong> by
          default. Use <span className="text-accent font-medium">+ Add override</span> or
          the CSV upload to create new overrides.
        </p>
      </div>

      {/* CSV Upload Panel */}
      <CsvUploadPanel
        title="Route Pair Overrides Bulk Upload"
        columns={["donor_id", "sink_id", "override_active"]}
        onUpload={async (rows) => {
          for (const row of rows) {
            const donorId = row["donor_id"];
            const sinkId = row["sink_id"];
            const raw = (row["override_active"] ?? "").toLowerCase().trim();
            const active = raw === "true" || raw === "1" || raw === "yes";
            if (!donorId) continue;
            if (active && sinkId) {
              await setPairOverrideAction(donorId, sinkId);
            } else {
              await clearPairOverrideAction(donorId);
            }
          }
        }}
      />

      {/* Search + filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={sourceQuery}
            onChange={(e) => setSourceQuery(e.target.value)}
            placeholder="Search source..."
            className="w-full bg-row border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-primary placeholder:text-muted-dark focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <div className="relative flex-1 min-w-[160px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={destQuery}
            onChange={(e) => setDestQuery(e.target.value)}
            placeholder="Search destination..."
            className="w-full bg-row border border-border rounded-lg pl-8 pr-3 py-2 text-sm text-primary placeholder:text-muted-dark focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="px-3 py-2 text-xs font-medium bg-accent/10 text-accent border border-accent/30 rounded-lg hover:bg-accent/20 transition-colors whitespace-nowrap"
        >
          {showAdd ? "Cancel" : "+ Add override"}
        </button>
        <span className="text-xs text-muted-dark whitespace-nowrap">
          {filtered.length} override{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {showAdd && (
        <div className="bg-card border border-accent/30 rounded-xl p-4 mb-4 flex flex-wrap items-end gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted mb-1">Donor</p>
            <SearchableSelect
              options={donorPickerOptions}
              value={addDonorId}
              onChange={setAddDonorId}
              placeholder="Pick donor…"
              searchPlaceholder="Search donor…"
            />
          </div>
          <svg className="w-4 h-4 text-muted mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted mb-1">Sink</p>
            <SearchableSelect
              options={sinkPickerOptions}
              value={addSinkId}
              onChange={setAddSinkId}
              placeholder="Pick sink…"
              searchPlaceholder="Search sink…"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!addDonorId || !addSinkId}
            className="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-md hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add override
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted uppercase tracking-wider border-b border-border">
              <th className="text-left pb-2 font-medium">Source (Donor)</th>
              <th className="text-center pb-2 font-medium w-6"></th>
              <th className="text-left pb-2 font-medium">Destination (Sink)</th>
              <th className="text-center pb-2 font-medium">Override</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((w) => (
              <OverrideRow
                key={w.id}
                donor={w}
                effectiveSinkId={effectiveSinkId}
                overrideSinkId={effectiveOverrideSinkId(w.id)}
                allWarehouses={warehouses}
                hasPendingChange={pendingOverrideIds.has(w.id)}
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-muted py-10 text-sm">
                  {donorsWithOverride.length === 0
                    ? "No route pair overrides yet. Use + Add override or the CSV upload above."
                    : "No overrides match the current search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OverrideRow({
  donor,
  effectiveSinkId,
  overrideSinkId,
  allWarehouses,
  hasPendingChange,
}: {
  donor: Warehouse;
  effectiveSinkId: string | null;
  overrideSinkId: string | null;
  allWarehouses: Warehouse[];
  hasPendingChange: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  const sinkOptions = allWarehouses.filter((w) => w.id !== donor.id);
  const overrideSinkName = overrideSinkId
    ? allWarehouses.find((w) => w.id === overrideSinkId)?.name ?? overrideSinkId
    : null;

  return (
    <tr
      className={`border-b border-border transition-opacity ${
        isPending ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      {/* Source */}
      <td className="py-3 pr-4">
        <div className="font-medium text-primary">{donor.name}</div>
        <div className="text-xs text-muted font-mono mt-0.5">
          {donor.id} · {donor.city}
        </div>
      </td>

      {/* Arrow */}
      <td className="py-3 text-center">
        <svg className="w-4 h-4 inline text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </td>

      {/* Destination */}
      <td className="py-3 pr-4">
        {editing ? (
          <div className="flex items-center gap-2">
            <SearchableSelect
              options={sinkOptions}
              value={overrideSinkId ?? ""}
              onChange={(sinkId) => {
                setEditing(false);
                startTransition(async () => {
                  await setPairOverrideAction(donor.id, sinkId);
                });
              }}
            />
            <button
              onClick={() => setEditing(false)}
              className="text-xs text-muted hover:text-primary px-1"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group">
            <div>
              <div className="text-sm text-primary">{overrideSinkName}</div>
              <div className="text-xs text-muted font-mono">{overrideSinkId}</div>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-accent"
              title="Change destination"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828A2 2 0 0110 16.414H8v-2a2 2 0 01.586-1.414z" />
              </svg>
            </button>
            {hasPendingChange && <PendingBadge />}
          </div>
        )}
      </td>

      {/* Override toggle — toggling off removes the row */}
      <td className="py-3 text-center">
        <Toggle
          checked={true}
          onChange={() => {
            startTransition(async () => {
              await clearPairOverrideAction(donor.id);
            });
          }}
        />
      </td>
    </tr>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

const TABS = [
  { key: "network", label: "Warehouse Network" },
  { key: "donor", label: "Donor Network" },
  { key: "routes", label: "Route Pair Overrides" },
];

export function WarehouseTabs({
  warehouses,
  effectiveSinkId,
  donorSettings,
  overrides,
  pendingDonor,
  pendingOverride,
  pendingDonorIds,
  pendingOverrideIds,
  pendingMasterSink,
}: Props) {
  const [activeTab, setActiveTab] = useState("network");

  return (
    <div>
      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />
      <div className="mt-6">
        {activeTab === "network" && (
          <NetworkTab
            warehouses={warehouses}
            effectiveSinkId={effectiveSinkId}
            pendingMasterSink={pendingMasterSink}
          />
        )}
        {activeTab === "donor" && (
          <DonorNetworkTab
            warehouses={warehouses}
            effectiveSinkId={effectiveSinkId}
            donorSettings={donorSettings}
            pendingDonor={pendingDonor}
            pendingDonorIds={pendingDonorIds}
          />
        )}
        {activeTab === "routes" && (
          <RoutePairTab
            warehouses={warehouses}
            effectiveSinkId={effectiveSinkId}
            overrides={overrides}
            pendingOverride={pendingOverride}
            pendingOverrideIds={pendingOverrideIds}
          />
        )}
      </div>
    </div>
  );
}
