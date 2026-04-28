"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition, useCallback } from "react";
import { useTheme } from "@/components/ThemeProvider";

const NAV = [
  { href: "/warehouse",  label: "Warehouse Setup",     dotColor: "bg-teal-500" },
  { href: "/thresholds", label: "Transfer Thresholds", dotColor: "bg-cyan-500" },
  { href: "/product",    label: "Product Config",       dotColor: "bg-violet-500" },
  { href: "/approval",   label: "Transfer Approval",   dotColor: "bg-orange-500" },
  { href: "/audit",      label: "Audit Log",            dotColor: "bg-green-500" },
];

interface SidebarClientProps {
  pendingCount: number;
  lastSaved: string | null;
}

export function SidebarClient({ pendingCount, lastSaved }: SidebarClientProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 w-60 h-screen bg-card border-r border-border flex flex-col overflow-y-auto">
      {/* Top */}
      <div className="p-5 border-b border-border">
        <p className="text-lg font-bold tracking-tight text-primary">LCC</p>
        <p className="text-xs text-muted mt-0.5">Liquidation Control Center</p>
        <p className="text-xs text-muted-dark mt-0.5">Brightlife Care</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 flex flex-col gap-0.5 mt-2">
        {NAV.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:text-primary hover:bg-row"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${item.dotColor} ${
                  isActive ? "opacity-100" : "opacity-40"
                }`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-border flex flex-col gap-2">
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-amber-900/30 border border-amber-700/30">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs text-amber-300 font-medium">Draft Mode</span>
            <span className="ml-auto text-xs bg-amber-700/50 text-amber-200 px-1.5 py-0.5 rounded-full">
              {pendingCount}
            </span>
          </div>
        )}

        <CommitButton pendingCount={pendingCount} />
        {pendingCount > 0 && <DiscardButton />}

        {lastSaved ? (
          <p className="text-xs text-muted-dark text-center">Last change: {lastSaved}</p>
        ) : (
          <p className="text-xs text-muted-dark text-center">No pending changes</p>
        )}

        <div className="border-t border-border pt-2 mt-1">
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

function CommitButton({ pendingCount }: { pendingCount: number }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{ applied: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleCommit = () => {
    startTransition(async () => {
      try {
        const { commitAllAction } = await import("@/server/actions/draft");
        const res = await commitAllAction();
        setResult(res);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    });
  };

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setResult(null);
          setError(null);
        }}
        disabled={pendingCount === 0}
        className="w-full py-2 px-3 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Commit Configuration
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {result ? (
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
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
                <h3 className="text-primary font-semibold">Committed</h3>
                <p className="text-muted text-sm mt-1">
                  {result.applied} change{result.applied !== 1 ? "s" : ""} applied to live
                  configuration.
                </p>
                <button
                  onClick={() => {
                    setOpen(false);
                    window.location.reload();
                  }}
                  className="mt-4 w-full py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm"
                >
                  Done
                </button>
              </div>
            ) : error ? (
              <div className="text-center">
                <p className="text-red-400 text-sm">{error}</p>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-3 text-muted text-sm underline"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-primary font-semibold mb-2">
                  Commit {pendingCount} change{pendingCount !== 1 ? "s" : ""}?
                </h3>
                <p className="text-muted text-sm mb-5">
                  This will apply all staged changes to the live configuration and write an audit
                  entry.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOpen(false)}
                    disabled={pending}
                    className="flex-1 py-2 rounded-lg border border-border text-muted hover:text-primary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCommit}
                    disabled={pending}
                    className="flex-1 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium"
                  >
                    {pending ? "Committing…" : "Commit"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function DiscardButton() {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const doDiscard = useCallback(() => {
    startTransition(async () => {
      const { discardAllAction } = await import("@/server/actions/draft");
      await discardAllAction();
      window.location.reload();
    });
  }, []);

  if (confirming) {
    return (
      <div className="flex gap-1.5">
        <button
          onClick={() => setConfirming(false)}
          className="flex-1 py-1.5 rounded-lg border border-border text-muted text-xs hover:text-primary transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={doDiscard}
          disabled={pending}
          className="flex-1 py-1.5 rounded-lg bg-red-900/40 border border-red-800/40 text-red-400 text-xs hover:bg-red-900/60 transition-colors disabled:opacity-40"
        >
          {pending ? "…" : "Confirm"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="w-full py-1.5 rounded-lg border border-border text-muted hover:text-red-400 hover:border-red-900/50 text-xs transition-colors"
    >
      Discard all changes
    </button>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-muted hover:text-primary hover:bg-row text-sm transition-colors"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        /* Sun icon */
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <circle cx="12" cy="12" r="4" />
          <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        /* Moon icon */
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
        </svg>
      )}
      <span>{isDark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
