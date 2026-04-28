"use client";

import React, { useState } from "react";
import { AuditEntry } from "@/lib/gsheets";

interface Props {
  logs: AuditEntry[];
}

type ActionFilter = "all" | "commits" | "config" | "csv";

/* ─────────────────────── helpers ─────────────────────── */

function getModuleBadge(module: string) {
  const map: Record<string, string> = {
    warehouse_setup: "bg-teal-900/30 text-teal-400 border-teal-800/30",
    product_config: "bg-violet-900/30 text-violet-400 border-violet-800/30",
    transfer_thresholds: "bg-cyan-900/30 text-cyan-400 border-cyan-800/30",
    transfer_approval: "bg-orange-900/30 text-orange-400 border-orange-800/30",
    draft: "bg-green-900/30 text-green-400 border-green-800/30",
  };
  const cls = map[module] ?? "bg-row text-muted border-border";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>{module}</span>
  );
}

function getTimelineDotColor(action: string): string {
  if (action === "configuration_committed") return "bg-green-400 shadow-[0_0_6px_2px_rgba(74,222,128,0.5)]";
  if (action.includes("sku_config")) return "bg-violet-400";
  if (action.includes("brand_override")) return "bg-blue-400";
  if (action.includes("donor_disabled")) return "bg-red-400";
  if (action.includes("threshold_updated")) return "bg-orange-400";
  return "bg-border";
}

function getInitials(name: string | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function exportCSV(logs: AuditEntry[]) {
  const headers = ["ID", "Timestamp", "Module", "Action", "Entity", "Summary", "User ID", "User Name"];
  const rows = logs.map((l) => [
    l.id,
    l.timestamp,
    l.module,
    l.action,
    l.entity,
    `"${l.summary.replace(/"/g, '""')}"`,
    l.userId,
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

export function AuditLogView({ logs }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [userFilter, setUserFilter] = useState("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const uniqueUsers = Array.from(new Set(logs.map((l) => l.userId))).map((uid) => ({
    id: uid,
    name: logs.find((l) => l.userId === uid)?.userName ?? uid,
  }));

  const filtered = logs.filter((l) => {
    if (
      searchQuery &&
      !l.summary.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !l.entity.includes(searchQuery)
    )
      return false;
    if (moduleFilter && moduleFilter !== "all" && l.module !== moduleFilter) return false;
    if (actionFilter === "commits" && l.action !== "configuration_committed") return false;
    if (actionFilter === "csv" && !l.action.includes("csv")) return false;
    if (actionFilter === "config" && l.action === "configuration_committed") return false;
    if (userFilter && userFilter !== "all" && l.userId !== userFilter) return false;
    return true;
  });

  const commitCount = logs.filter((l) => l.action === "configuration_committed").length;
  const configCount = logs.length - commitCount;

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const pillBase =
    "text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-colors select-none";
  const pillActive = "bg-accent/20 border-accent/40 text-accent";
  const pillInactive = "bg-row border-border text-muted hover:text-primary";

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <span className="text-xs bg-row border border-border text-muted px-3 py-1.5 rounded-full">
          Total Events: {logs.length}
        </span>
        <span className="text-xs bg-green-900/20 border border-green-800/30 text-green-400 px-3 py-1.5 rounded-full">
          Commits: {commitCount}
        </span>
        <span className="text-xs bg-teal-900/20 border border-teal-800/30 text-teal-400 px-3 py-1.5 rounded-full">
          Config Changes: {configCount}
        </span>
        <span className="flex-1" />
        <button
          onClick={() => exportCSV(logs)}
          className="border border-border text-muted hover:text-primary text-sm px-3 py-1.5 rounded-lg transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Search summary or entity…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-sm bg-row border border-border rounded-lg px-3 py-2 text-primary placeholder-muted focus:outline-none focus:border-accent w-56"
        />

        {/* Module select */}
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

        {/* Action type pills */}
        <div className="flex items-center gap-1">
          {(["all", "commits", "config", "csv"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setActionFilter(f)}
              className={`${pillBase} ${actionFilter === f ? pillActive : pillInactive}`}
            >
              {f === "all"
                ? "All"
                : f === "commits"
                ? "Commits"
                : f === "config"
                ? "Config"
                : "CSV"}
            </button>
          ))}
        </div>

        {/* User select */}
        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="bg-row border border-border rounded-lg px-3 py-2 text-sm text-muted focus:outline-none focus:border-accent"
        >
          <option value="all">All Users</option>
          {uniqueUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      {/* Counter */}
      <p className="text-xs text-muted mb-3">
        {filtered.length} / {logs.length} events
      </p>

      {/* Timeline table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden relative">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-row">
              {["Time", "Event ID", "Module", "Action", "Entity", "Summary", "User"].map((col) => (
                <th
                  key={col}
                  className="text-left text-xs font-medium text-muted uppercase tracking-wide px-4 py-3"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((log) => {
              const expanded = expandedRows.has(log.id);
              return (
                <React.Fragment key={log.id}>
                  <tr
                    onClick={() => toggleRow(log.id)}
                    className="border-b border-border hover:bg-row/50 transition-colors cursor-pointer"
                  >
                    {/* Time */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${getTimelineDotColor(log.action)}`}
                        />
                        <span className="text-xs font-mono text-muted">
                          {new Date(log.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      </div>
                    </td>

                    {/* Event ID */}
                    <td className="px-4 py-3 font-mono text-xs text-muted">{log.id}</td>

                    {/* Module */}
                    <td className="px-4 py-3">{getModuleBadge(log.module)}</td>

                    {/* Action */}
                    <td className="px-4 py-3 text-sm text-primary">{log.action}</td>

                    {/* Entity */}
                    <td className="px-4 py-3 font-mono text-xs text-muted">{log.entity}</td>

                    {/* Summary */}
                    <td className="px-4 py-3 text-sm text-primary/80 max-w-xs truncate">
                      {log.summary}
                    </td>

                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] text-accent font-medium">
                            {getInitials(log.userId)}
                          </span>
                        </div>
                        <span className="text-xs text-muted">{log.userId}</span>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded row */}
                  {expanded && (
                    <tr key={`${log.id}-expanded`} className="border-b border-border">
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
                                {JSON.stringify(
                                  JSON.parse(log.beforeJson || "{}"),
                                  null,
                                  2
                                )}
                              </pre>
                            </div>
                            <span className="text-muted mt-2">→</span>
                            <div className="flex-1 bg-green-900/20 border border-green-800/30 rounded-lg p-3">
                              <div className="text-xs text-green-400 font-medium mb-2">AFTER</div>
                              <pre className="text-xs text-green-300/80 whitespace-pre-wrap">
                                {JSON.stringify(
                                  JSON.parse(log.afterJson || "{}"),
                                  null,
                                  2
                                )}
                              </pre>
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-muted mt-2">
                          {new Date(log.timestamp).toLocaleString("en-GB")} &middot; Session:{" "}
                          {log.sessionId}
                        </p>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted text-sm">
                  No events match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
