"use client";

import React, { useState } from "react";
import { AuditEntry, PendingChange } from "@/lib/gsheets";

interface Props {
  logs: AuditEntry[];
  pendingChanges: PendingChange[];
}

type Tab = "pending" | "committed";
type ActionFilter = "all" | "commits" | "config" | "csv";

/* ─────────────────────── helpers ─────────────────────── */

const MODULE_LABELS: Record<string, string> = {
  warehouse_setup: "Warehouse Setup",
  product_config: "Product Config",
  transfer_thresholds: "Transfer Thresholds",
  transfer_approval: "Transfer Approval",
  draft: "Draft",
};

function getModuleBadge(module: string) {
  const colorMap: Record<string, string> = {
    warehouse_setup: "bg-teal-900/30 text-teal-400 border-teal-800/30",
    product_config: "bg-violet-900/30 text-violet-400 border-violet-800/30",
    transfer_thresholds: "bg-cyan-900/30 text-cyan-400 border-cyan-800/30",
    transfer_approval: "bg-orange-900/30 text-orange-400 border-orange-800/30",
    draft: "bg-green-900/30 text-green-400 border-green-800/30",
  };
  const cls = colorMap[module] ?? "bg-row text-muted border-border";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cls}`}>
      {MODULE_LABELS[module] ?? module}
    </span>
  );
}

type ActionDisplay = { label: string; color: string; dot: string };

function getCommittedActionDisplay(action: string, afterJson: string): ActionDisplay {
  let after: Record<string, unknown> = {};
  try { after = JSON.parse(afterJson || "{}"); } catch { /* ignore */ }

  switch (action) {
    case "configuration_committed":
      return { label: "Committed", color: "text-green-400", dot: "bg-green-400 shadow-[0_0_6px_2px_rgba(74,222,128,0.5)]" };
    case "donor_participation_updated":
      return after.isParticipating === false
        ? { label: "Donor Disabled", color: "text-red-400", dot: "bg-red-400" }
        : { label: "Donor Enabled", color: "text-teal-400", dot: "bg-teal-400" };
    case "master_sink_updated":
      return { label: "Sink Updated", color: "text-teal-400", dot: "bg-teal-400" };
    case "master_sink_cleared":
      return { label: "Sink Cleared", color: "text-muted", dot: "bg-border" };
    case "route_pair_override_set":
      return { label: "Route Override", color: "text-teal-400", dot: "bg-teal-400" };
    case "route_pair_override_cleared":
      return { label: "Route Cleared", color: "text-muted", dot: "bg-border" };
    case "global_threshold_updated":
      return { label: "Global Updated", color: "text-amber-400", dot: "bg-amber-400" };
    case "category_threshold_updated":
      return { label: "Category Override", color: "text-amber-400", dot: "bg-amber-400" };
    case "category_threshold_cleared":
      return { label: "Threshold Cleared", color: "text-muted", dot: "bg-border" };
    case "brand_threshold_updated":
      return { label: "Brand Override", color: "text-blue-400", dot: "bg-blue-400" };
    case "brand_threshold_cleared":
      return { label: "Threshold Cleared", color: "text-muted", dot: "bg-border" };
    case "product_config_updated":
      return { label: "Config Updated", color: "text-violet-400", dot: "bg-violet-400" };
    case "brand_shelf_life_updated":
      return { label: "Brand Override", color: "text-blue-400", dot: "bg-blue-400" };
    case "sku_ignored":
      return { label: "SKU Ignored", color: "text-red-400", dot: "bg-red-400" };
    case "sku_unignored":
      return { label: "SKU Unignored", color: "text-green-400", dot: "bg-green-400" };
    case "sku_shelf_life_override_set":
      return { label: "SKU Override", color: "text-violet-400", dot: "bg-violet-400" };
    case "inventory_condition_updated":
      return { label: "Condition Updated", color: "text-teal-400", dot: "bg-teal-400" };
    case "batch_reviewed":
      return { label: "Batch Reviewed", color: "text-orange-400", dot: "bg-orange-400" };
    default:
      return {
        label: action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        color: "text-muted",
        dot: "bg-border",
      };
  }
}

function getPendingActionDisplay(c: PendingChange): ActionDisplay {
  switch (c.entity) {
    case "donor_participation":
      return c.payload.isParticipating === false
        ? { label: "Donor Disabled", color: "text-red-400", dot: "bg-red-400" }
        : { label: "Donor Enabled", color: "text-teal-400", dot: "bg-teal-400" };
    case "master_sink":
      return c.op === "set"
        ? { label: "Sink Updated", color: "text-teal-400", dot: "bg-teal-400" }
        : { label: "Sink Cleared", color: "text-muted", dot: "bg-border" };
    case "pair_override":
      return c.op === "set"
        ? { label: "Route Override", color: "text-teal-400", dot: "bg-teal-400" }
        : { label: "Route Cleared", color: "text-muted", dot: "bg-border" };
    case "global_threshold":
      return { label: "Global Updated", color: "text-amber-400", dot: "bg-amber-400" };
    case "category_threshold":
      return { label: "Category Override", color: "text-amber-400", dot: "bg-amber-400" };
    case "category_threshold_clear":
      return { label: "Threshold Cleared", color: "text-muted", dot: "bg-border" };
    case "brand_threshold":
      return { label: "Brand Override", color: "text-blue-400", dot: "bg-blue-400" };
    case "brand_threshold_clear":
      return { label: "Threshold Cleared", color: "text-muted", dot: "bg-border" };
    case "global_product_config":
      return { label: "Config Updated", color: "text-violet-400", dot: "bg-violet-400" };
    case "brand_shelf_life":
      return { label: "Brand Override", color: "text-blue-400", dot: "bg-blue-400" };
    case "sku_config":
      if (c.payload.isIgnored === true) return { label: "SKU Ignored", color: "text-red-400", dot: "bg-red-400" };
      if (c.payload.isIgnored === false) return { label: "SKU Unignored", color: "text-green-400", dot: "bg-green-400" };
      return { label: "SKU Override", color: "text-violet-400", dot: "bg-violet-400" };
    case "inventory_condition":
      return { label: "Condition Updated", color: "text-teal-400", dot: "bg-teal-400" };
    default:
      return { label: c.entity.replace(/_/g, " "), color: "text-muted", dot: "bg-border" };
  }
}

function getPendingEntityDisplay(c: PendingChange): string {
  switch (c.entity) {
    case "global_threshold":
    case "global_product_config":
      return "Global Default";
    case "category_threshold":
      return (c.payload.categoryName as string) ?? (c.payload.categoryId as string) ?? c.targetId ?? "—";
    case "brand_threshold":
    case "brand_shelf_life": {
      const name = c.payload.brandName as string;
      const id = (c.payload.brandId as string) ?? c.targetId;
      return name && id ? `${id} (${name})` : (id ?? "—");
    }
    default:
      return c.targetId ?? c.entity;
  }
}

function getPendingSummary(c: PendingChange): string {
  switch (c.entity) {
    case "donor_participation":
      return `${c.payload.isParticipating ? "Enabled" : "Disabled"} donor for ${c.targetId}`;
    case "master_sink":
      return c.op === "set" ? `Master sink → ${c.payload.warehouseId}` : "Master sink cleared";
    case "pair_override":
      return c.op === "set"
        ? `Route override: ${c.targetId} → ${c.payload.sinkId}`
        : `Route cleared for ${c.targetId}`;
    case "global_threshold":
      return `${c.payload.field} updated to ${c.payload.value}`;
    case "category_threshold":
      return `${c.payload.field} set for ${c.payload.categoryName ?? c.payload.categoryId}`;
    case "category_threshold_clear":
      return `Threshold cleared for ${c.targetId}`;
    case "brand_threshold":
      return `${c.payload.field} set for ${c.payload.brandName ?? c.payload.brandId}`;
    case "brand_threshold_clear":
      return `Threshold cleared for ${c.targetId}`;
    case "global_product_config":
      return `${c.payload.field} updated to ${c.payload.value}`;
    case "brand_shelf_life":
      return `Shelf life override for ${c.payload.brandName ?? c.payload.brandId}`;
    case "sku_config":
      if (c.payload.isIgnored === true) return `${c.targetId} marked as ignored`;
      if (c.payload.isIgnored === false) return `${c.targetId} unignored`;
      return `${c.targetId} shelf life → ${c.payload.shelfLifeOverridePct}%`;
    case "inventory_condition":
      return `Condition ${c.targetId} ${c.payload.enabled ? "enabled" : "disabled"}`;
    default:
      return `${c.entity} ${c.op}`;
  }
}

const AVATAR_COLORS = [
  { bg: "bg-violet-900/40", border: "border-violet-700/40", text: "text-violet-300" },
  { bg: "bg-teal-900/40", border: "border-teal-700/40", text: "text-teal-300" },
  { bg: "bg-blue-900/40", border: "border-blue-700/40", text: "text-blue-300" },
  { bg: "bg-orange-900/40", border: "border-orange-700/40", text: "text-orange-300" },
  { bg: "bg-pink-900/40", border: "border-pink-700/40", text: "text-pink-300" },
  { bg: "bg-green-900/40", border: "border-green-700/40", text: "text-green-300" },
];

function getUserColor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash + userId.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

function getInitials(userId: string): string {
  return userId.slice(0, 2).toUpperCase();
}

function exportCSV(logs: AuditEntry[]) {
  const headers = ["ID", "Event DT", "Module", "Action", "Entity", "Entity ID", "Summary", "User ID"];
  const rows = logs.map((l) => [
    l.id, l.eventDt, l.module, l.action, l.entity, l.entityId ?? "",
    `"${l.summary.replace(/"/g, '""')}"`,
    l.userId,
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─────────────────────── Main Component ─────────────────────── */

export function AuditLogView({ logs, pendingChanges }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [userFilter, setUserFilter] = useState("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const commitCount = logs.filter((l) => l.action === "configuration_committed").length;
  const configCount = logs.length - commitCount;
  const uniqueUsers = Array.from(new Set(logs.map((l) => l.userId)));

  const filteredLogs = logs.filter((l) => {
    if (searchQuery && !l.summary.toLowerCase().includes(searchQuery.toLowerCase()) && !l.entity.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (moduleFilter !== "all" && l.module !== moduleFilter) return false;
    if (actionFilter === "commits" && l.action !== "configuration_committed") return false;
    if (actionFilter === "csv" && !l.action.includes("csv")) return false;
    if (actionFilter === "config" && l.action === "configuration_committed") return false;
    if (userFilter !== "all" && l.userId !== userFilter) return false;
    return true;
  });

  const filteredPending = pendingChanges.filter((c) => {
    if (searchQuery) {
      const summary = getPendingSummary(c);
      const entity = getPendingEntityDisplay(c);
      if (!summary.toLowerCase().includes(searchQuery.toLowerCase()) && !entity.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    }
    if (moduleFilter !== "all" && c.module !== moduleFilter) return false;
    return true;
  });

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const pillBase = "text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-colors select-none";
  const pillActive = "bg-accent/20 border-accent/40 text-accent";
  const pillInactive = "bg-row border-border text-muted hover:text-primary";

  const TABLE_COLS = ["TIME", "EVENT ID", "MODULE", "ACTION", "ENTITY", "SUMMARY", "USER"];

  return (
    <div>
      {/* Header stats + Export */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <span className="text-xs bg-row border border-border text-muted px-3 py-1.5 rounded-full">
          Total Events: <span className="text-primary font-medium">{logs.length}</span>
        </span>
        <span className="text-xs bg-green-900/20 border border-green-800/30 text-green-400 px-3 py-1.5 rounded-full">
          Commits: <span className="font-medium">{commitCount}</span>
        </span>
        <span className="text-xs bg-teal-900/20 border border-teal-800/30 text-teal-400 px-3 py-1.5 rounded-full">
          Config Changes: <span className="font-medium">{configCount}</span>
        </span>
        <span className="flex-1" />
        <button
          onClick={() => exportCSV(logs)}
          className="border border-border text-muted hover:text-primary text-sm px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Tabs + "not yet live" banner */}
      <div className="flex items-center justify-between border-b border-border mb-5">
        <div className="flex items-center">
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "pending"
                ? "border-amber-400 text-primary"
                : "border-transparent text-muted hover:text-primary"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeTab === "pending" ? "bg-amber-400" : "bg-muted"}`} />
            Pending Changes
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
              activeTab === "pending" ? "bg-amber-400/20 text-amber-400" : "bg-row text-muted"
            }`}>
              {pendingChanges.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("committed")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "committed"
                ? "border-green-400 text-primary"
                : "border-transparent text-muted hover:text-primary"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeTab === "committed" ? "bg-green-400" : "bg-muted"}`} />
            Committed
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
              activeTab === "committed" ? "bg-green-900/30 text-green-400" : "bg-row text-muted"
            }`}>
              {commitCount}
            </span>
          </button>
        </div>

        {activeTab === "pending" && pendingChanges.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400 pb-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            {pendingChanges.length} changes pending — not yet live
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search events, entities, IDs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-sm bg-row border border-border rounded-lg pl-9 pr-3 py-2 text-primary placeholder-muted focus:outline-none focus:border-accent w-64"
          />
        </div>

        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="bg-row border border-border rounded-lg px-3 py-2 text-sm text-muted focus:outline-none focus:border-accent"
        >
          <option value="all">All Modules</option>
          <option value="warehouse_setup">warehouse_setup</option>
          <option value="product_config">product_config</option>
          <option value="transfer_thresholds">transfer_thresholds</option>
          <option value="transfer_approval">transfer_approval</option>
        </select>

        {activeTab === "committed" && (
          <>
            <div className="flex items-center gap-1">
              {(["all", "commits", "config", "csv"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setActionFilter(f)}
                  className={`${pillBase} ${actionFilter === f ? pillActive : pillInactive}`}
                >
                  {f === "all" ? "All" : f === "commits" ? "Commits" : f === "config" ? "Config" : "CSV"}
                </button>
              ))}
            </div>

            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="bg-row border border-border rounded-lg px-3 py-2 text-sm text-muted focus:outline-none focus:border-accent"
            >
              <option value="all">All Users</option>
              {uniqueUsers.map((uid) => (
                <option key={uid} value={uid}>{uid}</option>
              ))}
            </select>
          </>
        )}

        <span className="ml-auto text-xs text-muted">
          {activeTab === "pending"
            ? `${filteredPending.length} / ${pendingChanges.length} events`
            : `${filteredLogs.length} / ${logs.length} events`}
        </span>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-row">
              {TABLE_COLS.map((col) => (
                <th key={col} className="text-left text-xs font-medium text-muted uppercase tracking-wide px-4 py-3">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeTab === "pending" ? (
              <>
                {filteredPending.map((c) => {
                  const action = getPendingActionDisplay(c);
                  const entity = getPendingEntityDisplay(c);
                  const summary = getPendingSummary(c);
                  const expanded = expandedRows.has(c.id);
                  const userColor = getUserColor("prototype_user");
                  return (
                    <React.Fragment key={c.id}>
                      <tr
                        onClick={() => toggleRow(c.id)}
                        className="border-b border-border hover:bg-row/50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${action.dot}`} />
                            <span className="text-xs font-mono text-muted">
                              {new Date(c.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted">{c.id.slice(0, 8).toUpperCase()}</td>
                        <td className="px-4 py-3">{getModuleBadge(c.module)}</td>
                        <td className={`px-4 py-3 text-sm font-medium ${action.color}`}>{action.label}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted">{entity}</td>
                        <td className="px-4 py-3 text-sm text-primary/80 max-w-xs truncate">{summary}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 ${userColor.bg} ${userColor.border}`}>
                              <span className={`text-[10px] font-medium ${userColor.text}`}>PR</span>
                            </div>
                            <span className="text-xs text-muted">prototype_user</span>
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr key={`${c.id}-exp`} className="border-b border-border">
                          <td colSpan={7} className="bg-row border-t border-border px-6 py-4">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-xs text-amber-400 font-medium uppercase tracking-wide">Staged — not yet committed</span>
                            </div>
                            <div className="bg-card border border-border rounded-lg p-3 inline-block min-w-48">
                              <div className="text-xs text-muted font-medium mb-2 uppercase tracking-wide">Payload</div>
                              <pre className="text-xs text-primary/70 whitespace-pre-wrap">
                                {JSON.stringify(c.payload, null, 2)}
                              </pre>
                            </div>
                            <p className="text-xs text-muted mt-3">
                              Staged: {new Date(c.createdAt).toLocaleString("en-GB")}
                              {c.targetId && ` · Target: ${c.targetId}`}
                            </p>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filteredPending.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted text-sm">
                      {pendingChanges.length === 0 ? "No pending changes." : "No events match the current filters."}
                    </td>
                  </tr>
                )}
              </>
            ) : (
              <>
                {filteredLogs.map((log) => {
                  const action = getCommittedActionDisplay(log.action, log.afterJson);
                  const expanded = expandedRows.has(log.id);
                  const userColor = getUserColor(log.userId);
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => toggleRow(log.id)}
                        className="border-b border-border hover:bg-row/50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${action.dot}`} />
                            <span className="text-xs font-mono text-muted">
                              {new Date(log.eventDt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted">{log.id}</td>
                        <td className="px-4 py-3">{getModuleBadge(log.module)}</td>
                        <td className={`px-4 py-3 text-sm font-medium ${action.color}`}>{action.label}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted">{log.entity}</td>
                        <td className="px-4 py-3 text-sm text-primary/80 max-w-xs truncate">{log.summary}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 ${userColor.bg} ${userColor.border}`}>
                              <span className={`text-[10px] font-medium ${userColor.text}`}>
                                {getInitials(log.userId)}
                              </span>
                            </div>
                            <span className="text-xs text-muted">{log.userId}</span>
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr key={`${log.id}-exp`} className="border-b border-border">
                          <td colSpan={7} className="bg-row border-t border-border px-6 py-4">
                            {log.action === "configuration_committed" ? (
                              <div className="flex items-center gap-2">
                                <span className="text-green-400 font-semibold">✓ Committed</span>
                                <span className="text-sm text-muted">{log.summary}</span>
                              </div>
                            ) : (
                              <div className="flex items-start gap-3">
                                <div className="flex-1 bg-red-900/20 border border-red-800/30 rounded-lg p-3">
                                  <div className="text-xs text-red-400 font-medium mb-2">BEFORE</div>
                                  <pre className="text-xs text-red-300/80 whitespace-pre-wrap">
                                    {JSON.stringify(JSON.parse(log.beforeJson || "{}"), null, 2)}
                                  </pre>
                                </div>
                                <span className="text-muted mt-2">→</span>
                                <div className="flex-1 bg-green-900/20 border border-green-800/30 rounded-lg p-3">
                                  <div className="text-xs text-green-400 font-medium mb-2">AFTER</div>
                                  <pre className="text-xs text-green-300/80 whitespace-pre-wrap">
                                    {JSON.stringify(JSON.parse(log.afterJson || "{}"), null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}
                            <p className="text-xs text-muted mt-2">
                              {new Date(log.eventDt).toLocaleString("en-GB")} · Session: {log.sessionId}
                            </p>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted text-sm">
                      No events match the current filters.
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
