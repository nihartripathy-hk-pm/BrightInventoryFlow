"use client";

import { useState, useTransition } from "react";
import type { Warehouse, DonorSetting, RoutePairOverride } from "@/lib/gsheets";
import { TabBar } from "@/components/ui/TabBar";
import { Toggle } from "@/components/ui/Toggle";
import { CsvUploadPanel } from "@/components/ui/CsvUploadPanel";
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
}: {
  warehouses: Warehouse[];
  effectiveSinkId: string | null;
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
    : warehouses;

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search warehouses…"
        className="mb-4 w-full max-w-sm bg-row border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder:text-muted-dark focus:outline-none focus:border-accent transition-colors"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((w) => (
          <WarehouseCard key={w.id} w={w} effectiveSinkId={effectiveSinkId} />
        ))}
        {filtered.length === 0 && (
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
}: {
  warehouses: Warehouse[];
  effectiveSinkId: string | null;
  donorSettings: DonorSetting[];
  pendingDonor: Record<string, boolean>;
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
}: {
  w: Warehouse;
  isSink: boolean;
  isParticipating: boolean;
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

type OverrideFilter = "all" | "global" | "override";

function RoutePairTab({
  warehouses,
  effectiveSinkId,
  overrides,
  pendingOverride,
}: {
  warehouses: Warehouse[];
  effectiveSinkId: string | null;
  overrides: RoutePairOverride[];
  pendingOverride: Record<string, string | null>;
}) {
  const [activeFilter, setActiveFilter] = useState<OverrideFilter>("all");
  const [sourceQuery, setSourceQuery] = useState("");
  const [destQuery, setDestQuery] = useState("");

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

  const filtered = donors.filter((w) => {
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
    if (activeFilter === "all") return true;
    const hasOverride = effectiveOverrideSinkId(w.id) !== null;
    return activeFilter === "override" ? hasOverride : !hasOverride;
  });

  const filterLabels: { key: OverrideFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "global", label: "Global" },
    { key: "override", label: "Override" },
  ];

  return (
    <div>
      {/* Info banner */}
      <div className="flex gap-3 bg-teal-900/15 border border-teal-800/30 rounded-xl px-4 py-3 mb-4">
        <svg className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
        </svg>
        <p className="text-xs text-muted leading-relaxed">
          By default all donors route to the{" "}
          <strong className="text-primary">{masterSinkName}</strong>. A Route Pair
          Override redirects a specific donor to a custom sink, bypassing the global
          default. The system badges each route as{" "}
          <span className="text-muted font-medium">Global</span> or{" "}
          <span className="text-violet-400 font-medium">Override</span>.
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
          {filtered.length} / {donors.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted uppercase tracking-wider border-b border-border">
              <th className="text-left pb-2 font-medium">Source (Donor)</th>
              <th className="text-center pb-2 font-medium w-6"></th>
              <th className="text-left pb-2 font-medium">Destination (Sink)</th>
              <th className="text-center pb-2 font-medium">Route Type</th>
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
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted py-10 text-sm">
                  No routes match this filter.
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
}: {
  donor: Warehouse;
  effectiveSinkId: string | null;
  overrideSinkId: string | null;
  allWarehouses: Warehouse[];
}) {
  const [isPending, startTransition] = useTransition();
  const hasOverride = overrideSinkId !== null;

  const sinkOptions = allWarehouses.filter((w) => w.id !== donor.id);
  const overrideSinkName = overrideSinkId
    ? allWarehouses.find((w) => w.id === overrideSinkId)?.name ?? overrideSinkId
    : null;
  const masterSinkName = effectiveSinkId
    ? allWarehouses.find((w) => w.id === effectiveSinkId)?.name ?? effectiveSinkId
    : "Master Sink";

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
        <svg
          className={`w-4 h-4 inline ${hasOverride ? "text-violet-400" : "text-muted-dark"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </td>

      {/* Destination */}
      <td className="py-3 pr-4">
        {hasOverride ? (
          <select
            value={overrideSinkId ?? ""}
            onChange={(e) => {
              const sinkId = e.target.value;
              startTransition(async () => {
                await setPairOverrideAction(donor.id, sinkId);
              });
            }}
            className="bg-row border border-border rounded-md px-2 py-1.5 text-sm text-primary focus:outline-none focus:border-accent transition-colors"
          >
            {sinkOptions.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.id})
              </option>
            ))}
          </select>
        ) : (
          <div>
            <div className="text-sm text-muted">{masterSinkName}</div>
            <div className="text-xs text-muted-dark font-mono">{effectiveSinkId}</div>
          </div>
        )}
      </td>

      {/* Route Type badge */}
      <td className="py-3 pr-4 text-center">
        {hasOverride ? (
          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-900/20 text-violet-400 border border-violet-800/30">
            Override
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded-full bg-row text-muted border border-border">
            Global
          </span>
        )}
      </td>

      {/* Override toggle */}
      <td className="py-3 text-center">
        <Toggle
          checked={hasOverride}
          onChange={(val) => {
            if (!val) {
              startTransition(async () => {
                await clearPairOverrideAction(donor.id);
              });
            } else {
              const defaultSink = sinkOptions[0];
              if (defaultSink) {
                startTransition(async () => {
                  await setPairOverrideAction(donor.id, defaultSink.id);
                });
              }
            }
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
}: Props) {
  const [activeTab, setActiveTab] = useState("network");

  return (
    <div>
      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />
      <div className="mt-6">
        {activeTab === "network" && (
          <NetworkTab warehouses={warehouses} effectiveSinkId={effectiveSinkId} />
        )}
        {activeTab === "donor" && (
          <DonorNetworkTab
            warehouses={warehouses}
            effectiveSinkId={effectiveSinkId}
            donorSettings={donorSettings}
            pendingDonor={pendingDonor}
          />
        )}
        {activeTab === "routes" && (
          <RoutePairTab
            warehouses={warehouses}
            effectiveSinkId={effectiveSinkId}
            overrides={overrides}
            pendingOverride={pendingOverride}
          />
        )}
      </div>
    </div>
  );
}
