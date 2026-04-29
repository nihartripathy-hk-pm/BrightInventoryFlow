"use client";

import { useState, useTransition } from "react";
import { Batch, TransferOrder, OrderLineItem, Warehouse } from "@/lib/gsheets";
import { commitBatchAction, rejectBatchAction, cancelTransactionAction, cancelTransactionsAction } from "@/server/actions/approval";

interface Props {
  batches: Batch[];
  orders: TransferOrder[];
  lineItems: OrderLineItem[];
  warehouses: Warehouse[];
}

const TABS = ["Pending Approval", "Manage Transactions"] as const;
type Tab = (typeof TABS)[number];

type OrderType = "wh_transfer" | "b2b" | "liq_stock";
type OrderStatus = "pending" | "in_transit" | "cancelled";

/* ─────────────────────── helpers ─────────────────────── */

function OrderTypeBadge({ type }: { type: string }) {
  if (type === "wh_transfer")
    return (
      <span className="text-xs bg-blue-900/30 text-blue-400 border border-blue-800/30 px-2 py-0.5 rounded-full">
        WH Transfer
      </span>
    );
  if (type === "b2b")
    return (
      <span className="text-xs bg-violet-900/30 text-violet-400 border border-violet-800/30 px-2 py-0.5 rounded-full">
        B2B Order
      </span>
    );
  return (
    <span className="text-xs bg-orange-900/30 text-orange-400 border border-orange-800/30 px-2 py-0.5 rounded-full">
      Liq. Stock
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending")
    return (
      <span className="text-xs bg-amber-900/30 text-amber-400 border border-amber-700/30 px-2 py-0.5 rounded-full">
        Pending
      </span>
    );
  if (status === "in_transit")
    return (
      <span className="text-xs bg-blue-900/30 text-blue-400 border border-blue-800/30 px-2 py-0.5 rounded-full">
        In Transit
      </span>
    );
  return (
    <span className="text-xs bg-row text-muted border border-border px-2 py-0.5 rounded-full">
      Cancelled
    </span>
  );
}

/* ─────────────────────── Tab 1: Pending Approval ─────────────────────── */

function PendingApprovalTab({
  batches,
  orders,
  lineItems,
}: {
  batches: Batch[];
  orders: TransferOrder[];
  lineItems: OrderLineItem[];
}) {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [authInput, setAuthInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [commitResult, setCommitResult] = useState<{ orderIds: string[] } | null>(null);

  const pendingBatch = batches.find((b) => b.status === "pending_approval");

  if (!pendingBatch) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <p className="text-muted">No batches pending approval.</p>
      </div>
    );
  }

  const batchOrders = orders.filter((o) => o.batchId === pendingBatch.id);
  const isVerified = authInput === pendingBatch.id;

  function toggleExpand(orderId: string) {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }

  function handleCommit() {
    startTransition(async () => {
      await commitBatchAction(pendingBatch!.id);
      setCommitResult({ orderIds: batchOrders.map((o) => o.id) });
    });
  }

  function handleReject() {
    startTransition(() => {
      rejectBatchAction(pendingBatch!.id);
    });
  }

  return (
    <div>
      {/* Test mode banner */}
      <div className="flex items-center gap-3 bg-amber-900/20 border border-amber-700/30 rounded-xl p-3 mb-4">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0" />
        <span className="text-sm text-amber-300 font-medium">Test Mode — Engine Simulation</span>
        <span className="ml-auto text-xs border border-amber-600/50 text-amber-400 px-2 py-0.5 rounded-full">
          TEST
        </span>
      </div>

      {/* Batch header */}
      <div className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="font-mono text-xl font-bold text-primary">{pendingBatch.id}</span>
          <span className="text-xs bg-amber-900/30 text-amber-400 border border-amber-700/30 px-2 py-0.5 rounded-full">
            Awaiting Approval
          </span>
        </div>
        <p className="text-xs text-muted">
          Generated {new Date(pendingBatch.generatedAt).toLocaleDateString('en-GB')} &middot; Sink: {pendingBatch.masterSinkName}
        </p>
      </div>

      {/* Stats grid — computed from orders/line items */}
      {(() => {
        const batchLineItems = lineItems.filter((li) =>
          batchOrders.some((o) => o.id === li.orderId)
        );
        const totalOrders = batchOrders.length;
        const totalSkus = new Set(batchLineItems.map((li) => li.skuId)).size;
        const totalUnits = batchLineItems.reduce((s, li) => s + li.units, 0);
        const totalCogs = batchOrders.reduce((s, o) => s + o.cogs, 0);
        const totalWeight = batchOrders.reduce((s, o) => s + o.weight, 0);
        return (
      <div className="grid grid-cols-5 gap-2 mb-4">
        {[
          { label: "Total Orders", value: totalOrders },
          { label: "Total SKUs", value: totalSkus },
          { label: "Total Units", value: totalUnits },
          { label: "Total COGS", value: `₹${(totalCogs / 1000).toFixed(0)}K` },
          { label: "Total Weight", value: `${totalWeight} kg` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-row rounded-lg p-3 text-center">
            <p className="text-xs text-muted uppercase tracking-wide">{label}</p>
            <p className="text-base font-semibold text-primary mt-1">{value}</p>
          </div>
        ))}
      </div>
        );
      })()}

      {/* Two-column layout */}
      <div className="flex gap-4">
        {/* Left: order list */}
        <div className="flex-1">
          {batchOrders.map((order) => {
            const expanded = expandedOrders.has(order.id);
            const orderLines = lineItems.filter((li) => li.orderId === order.id);
            return (
              <div
                key={order.id}
                className="bg-card border border-border rounded-xl mb-2 overflow-hidden"
              >
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer"
                  onClick={() => toggleExpand(order.id)}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                  <span className="text-sm font-mono font-medium text-primary">{order.id}</span>
                  <OrderTypeBadge type={order.type} />
                  <span className="text-xs text-muted">
                    {order.sourceName} → {order.destinationName}
                  </span>
                  <span className="flex-1" />
                  <span className="text-xs text-muted gap-3 flex items-center">
                    <span>{order.units} units</span>
                    <span>₹{(order.cogs / 1000).toFixed(1)}K</span>
                    <span>{order.weight} kg</span>
                  </span>
                  <svg
                    className={`w-4 h-4 text-muted transition-transform ${expanded ? "rotate-90" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                {expanded && (
                  <div className="bg-row border-t border-border p-4">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          {["SKU ID", "Name", "Units", "COGS (₹)", "Expiry"].map((col) => (
                            <th
                              key={col}
                              className="text-left text-muted font-medium pb-2 pr-4"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {orderLines.map((li) => {
                          const expiryDate = li.expiryDate ? new Date(li.expiryDate) : null;
                          const isExpired =
                            expiryDate !== null && expiryDate < new Date("2024-08-01");
                          return (
                            <tr key={li.id} className="border-b border-border/50">
                              <td className="py-2 pr-4 font-mono text-muted">{li.skuId}</td>
                              <td className="py-2 pr-4 text-primary">{li.skuName}</td>
                              <td className="py-2 pr-4 text-primary">{li.units}</td>
                              <td className="py-2 pr-4 text-primary">
                                ₹{li.cogs.toLocaleString()}
                              </td>
                              <td className="py-2 pr-4">
                                {expiryDate === null ? (
                                  <span className="text-muted">No expiry</span>
                                ) : isExpired ? (
                                  <span className="text-red-400 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path
                                        fillRule="evenodd"
                                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                    {expiryDate.toLocaleDateString('en-GB')}
                                  </span>
                                ) : (
                                  <span className="text-primary">
                                    {expiryDate.toLocaleDateString('en-GB')}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Auth Gate */}
        <div className="w-72 sticky top-8 self-start">
          <div className="bg-card border border-border rounded-xl p-5">
            {commitResult ? (
              /* Success state */
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-green-900/30 border border-green-800/30 flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <p className="text-primary font-semibold mb-3">Batch Committed</p>
                <div className="flex flex-col gap-1">
                  {commitResult.orderIds.map((id) => (
                    <p key={id} className="text-xs font-mono text-muted">
                      {id}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <p className="text-base font-semibold text-primary flex items-center gap-2">
                  🔑 Authorization Gate
                </p>
                <p className="text-sm text-muted mt-1 mb-4">
                  Enter the Liquidation Identifier to authorize this batch.
                </p>

                <input
                  type="text"
                  value={authInput}
                  onChange={(e) => setAuthInput(e.target.value)}
                  placeholder="e.g. LIQ-2024-0047"
                  className="w-full bg-row border border-border rounded-lg px-3 py-2 text-sm font-mono text-primary focus:outline-none focus:border-accent"
                />

                {/* Validation */}
                {authInput !== "" && (
                  <p
                    className={`mt-2 text-xs ${
                      isVerified ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {isVerified
                      ? "✓ Batch ID verified"
                      : "✗ ID does not match pending batch"}
                  </p>
                )}

                {/* Authorize */}
                <button
                  onClick={handleCommit}
                  disabled={!isVerified || isPending}
                  className={`mt-4 w-full bg-accent text-white rounded-lg py-2 text-sm font-medium transition-opacity ${
                    !isVerified || isPending ? "opacity-40 cursor-not-allowed" : "hover:opacity-90"
                  }`}
                >
                  {isPending ? "Authorizing…" : "Authorize Batch"}
                </button>

                {/* Reject */}
                <button
                  onClick={handleReject}
                  disabled={isPending}
                  className="mt-2 w-full border border-border text-red-400 hover:border-red-700 rounded-lg py-2 text-sm transition-colors"
                >
                  Reject Batch
                </button>

                {/* Warning */}
                <div className="mt-4 bg-amber-900/10 border border-amber-800/20 rounded-lg p-3 text-xs text-amber-400/80">
                  Committing will mark all transfer orders as active.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Tab 2: Manage Transactions ─────────────────────── */

type StatusFilter = "all" | "pending" | "in_transit" | "cancelled";

interface Toast {
  type: "success" | "warning";
  message: string;
}

function ManageTransactionsTab({ orders }: { orders: TransferOrder[] }) {
  const [, startTransition] = useTransition();
  const [batchIdInput, setBatchIdInput] = useState("");
  const [sourceInput, setSourceInput] = useState("");
  const [bulkBatchInput, setBulkBatchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  const filtered = orders.filter((o) => {
    if (
      searchInput &&
      !o.id.toLowerCase().includes(searchInput.toLowerCase()) &&
      !o.batchId.toLowerCase().includes(searchInput.toLowerCase())
    )
      return false;
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    return true;
  });

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const inTransitCount = orders.filter((o) => o.status === "in_transit").length;

  function handleCancelByBatch() {
    startTransition(async () => {
      await cancelTransactionsAction(batchIdInput, undefined);
      setToast({ type: "success", message: `Cancelled orders for batch ${batchIdInput}` });
      setBatchIdInput("");
    });
  }

  function handleCancelBySource() {
    startTransition(async () => {
      await cancelTransactionsAction(bulkBatchInput || undefined, sourceInput);
      setToast({
        type: "success",
        message: `Cancelled orders from source warehouse ${sourceInput}`,
      });
      setSourceInput("");
      setBulkBatchInput("");
    });
  }

  function handleCancelSingle(id: string) {
    startTransition(() => {
      cancelTransactionAction(id);
    });
  }

  const pillBase =
    "text-xs px-3 py-1.5 rounded-full border cursor-pointer transition-colors select-none";
  const pillActive = "bg-accent/20 border-accent/40 text-accent";
  const pillInactive = "bg-row border-border text-muted hover:text-primary";

  return (
    <div>
      {/* Bulk cancel cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Cancel by Batch ID */}
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-medium text-primary mb-3">Cancel by Batch ID</p>
          <input
            type="text"
            value={batchIdInput}
            onChange={(e) => setBatchIdInput(e.target.value)}
            placeholder="e.g. BATCH-2024-001"
            className="bg-row border border-border rounded-lg px-3 py-2 text-sm font-mono text-primary w-full mb-2 focus:outline-none focus:border-accent"
          />
          <button
            onClick={handleCancelByBatch}
            disabled={!batchIdInput}
            className="bg-red-900/30 border border-red-800/30 text-red-400 text-sm rounded-lg py-1.5 px-3 hover:bg-red-900/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancel All
          </button>
        </div>

        {/* Cancel by Source Warehouse */}
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-medium text-primary mb-3">Cancel by Source Warehouse</p>
          <input
            type="text"
            value={bulkBatchInput}
            onChange={(e) => setBulkBatchInput(e.target.value)}
            placeholder="Batch ID (optional)"
            className="bg-row border border-border rounded-lg px-3 py-2 text-sm font-mono text-primary w-full mb-2 focus:outline-none focus:border-accent"
          />
          <p className="text-xs text-muted mb-2">Batch ID is optional</p>
          <input
            type="text"
            value={sourceInput}
            onChange={(e) => setSourceInput(e.target.value)}
            placeholder="Source warehouse name"
            className="bg-row border border-border rounded-lg px-3 py-2 text-sm text-primary w-full mb-2 focus:outline-none focus:border-accent"
          />
          <button
            onClick={handleCancelBySource}
            disabled={!sourceInput}
            className="bg-red-900/30 border border-red-800/30 text-red-400 text-sm rounded-lg py-1.5 px-3 hover:bg-red-900/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancel All
          </button>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by TXN ID or Batch…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="text-sm bg-row border border-border rounded-lg px-3 py-2 text-primary placeholder-muted focus:outline-none focus:border-accent w-56"
        />
        <div className="flex items-center gap-1">
          {(["all", "pending", "in_transit", "cancelled"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`${pillBase} ${statusFilter === f ? pillActive : pillInactive}`}
            >
              {f === "all"
                ? "All"
                : f === "in_transit"
                ? "In Transit"
                : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs bg-amber-900/20 text-amber-400 border border-amber-700/30 px-2 py-0.5 rounded-full">
            {pendingCount} pending
          </span>
          <span className="text-xs bg-blue-900/20 text-blue-400 border border-blue-800/30 px-2 py-0.5 rounded-full">
            {inTransitCount} in transit
          </span>
        </div>
      </div>

      {/* Orders table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-row">
              {["TXN ID", "Batch ID", "Type", "Source → Dest", "SKUs / Units / COGS", "Status", "Action"].map(
                (col) => (
                  <th
                    key={col}
                    className="text-left text-xs font-medium text-muted uppercase tracking-wide px-4 py-3"
                  >
                    {col}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <tr key={order.id} className="border-b border-border hover:bg-row/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-primary">{order.id}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted">{order.batchId}</td>
                <td className="px-4 py-3">
                  <OrderTypeBadge type={order.type} />
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {order.sourceName} → {order.destinationName}
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {order.units} SKUs · {order.units} units · ₹
                  {(order.cogs / 1000).toFixed(1)}K
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-4 py-3">
                  {order.status === "pending" ? (
                    <button
                      onClick={() => handleCancelSingle(order.id)}
                      className="text-red-400 hover:text-red-300 transition-colors text-lg leading-none"
                      title="Cancel"
                    >
                      ×
                    </button>
                  ) : order.status === "in_transit" ? (
                    <svg
                      className="w-4 h-4 text-muted"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-label="Locked"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted text-sm">
                  No transactions match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium ${
            toast.type === "success"
              ? "bg-green-900/80 border-green-700/50 text-green-300"
              : "bg-orange-900/80 border-orange-700/50 text-orange-300"
          }`}
        >
          {toast.message}
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-current opacity-70 hover:opacity-100 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Root Component ─────────────────────── */

export function ApprovalTabs({ batches, orders, lineItems, warehouses }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("Pending Approval");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border mb-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-primary"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Pending Approval" && (
        <PendingApprovalTab batches={batches} orders={orders} lineItems={lineItems} />
      )}
      {activeTab === "Manage Transactions" && <ManageTransactionsTab orders={orders} />}
    </div>
  );
}
