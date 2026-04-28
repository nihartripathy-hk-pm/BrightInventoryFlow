import { getAuditLog } from "@/lib/gsheets";
import { AuditLogView } from "./AuditLogView";

export default async function AuditPage() {
  const logs = await getAuditLog();
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-primary">Audit Log</h1>
        <p className="text-muted text-sm mt-1">Immutable record of all configuration changes and commitments</p>
      </div>
      <AuditLogView logs={logs} />
    </div>
  );
}
