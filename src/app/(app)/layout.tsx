import { getPendingChanges } from "@/lib/gsheets";
import { SidebarClient } from "./SidebarClient";

const hasCredentials = () => !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const pending = await getPendingChanges();
  const pendingCount = pending.length;
  const lastSaved =
    pending.length > 0
      ? new Date(pending[pending.length - 1].createdAt).toLocaleTimeString('en-GB')
      : null;

  return (
    <div className="flex min-h-screen bg-app">
      <SidebarClient pendingCount={pendingCount} lastSaved={lastSaved} />
      <main className="flex-1 ml-60 min-h-screen">
        {!hasCredentials() && (
          <div className="bg-amber-900/40 border-b border-amber-600/40 text-amber-300 text-sm px-6 py-2.5 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span>
              <strong>No credentials configured.</strong> Add{" "}
              <code className="bg-amber-900/60 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_KEY</code> to{" "}
              <code className="bg-amber-900/60 px-1 rounded">.env.local</code> then run{" "}
              <code className="bg-amber-900/60 px-1 rounded">npm run seed</code>. Data will be empty until then.
            </span>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
