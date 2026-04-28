import { getBatches, getTransferOrders, getOrderLineItems, getWarehouses } from "@/lib/gsheets";
import { ApprovalTabs } from "./ApprovalTabs";

export default async function ApprovalPage() {
  const [batches, orders, lineItems, warehouses] = await Promise.all([
    getBatches(), getTransferOrders(), getOrderLineItems(), getWarehouses()
  ]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-primary">Transfer Approval</h1>
        <p className="text-muted text-sm mt-1">Review engine-generated batches · Authorize or reject · Manage in-flight orders</p>
      </div>
      <ApprovalTabs batches={batches} orders={orders} lineItems={lineItems} warehouses={warehouses} />
    </div>
  );
}
