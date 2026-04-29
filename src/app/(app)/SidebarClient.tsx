"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition, useCallback } from "react";
import { useTheme } from "@/components/ThemeProvider";

const NAV = [
  {
    href: "/product",
    label: "Products",
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
      </svg>
    ),
  },
  {
    href: "/warehouse",
    label: "Warehouse",
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H3.75A.75.75 0 013 21V9.75z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    href: "/thresholds",
    label: "Transfer Thresholds",
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 9h12M6 15h12M4 6h.01M4 12h.01M4 18h.01M20 6h.01M20 12h.01M20 18h.01" />
      </svg>
    ),
  },
  {
    href: "/approval",
    label: "Transfer Approval",
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: "/audit",
    label: "Audit Log",
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
];

interface SidebarClientProps {
  pendingCount: number;
  lastSaved: string | null;
  isCollapsed: boolean;
  onToggle: () => void;
}

export function SidebarClient({ pendingCount, lastSaved, isCollapsed, onToggle }: SidebarClientProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-card border-r border-border flex flex-col overflow-y-auto overflow-x-hidden transition-[width] duration-200 ${
        isCollapsed ? "w-14" : "w-60"
      }`}
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-5 z-10 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted hover:text-primary hover:bg-row transition-colors"
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          {isCollapsed ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          )}
        </svg>
      </button>

      {/* Top */}
      <div className={`border-b border-border flex-shrink-0 ${isCollapsed ? "p-3.5" : "p-5"}`}>
        {isCollapsed ? (
          <p className="text-lg font-bold tracking-tight text-primary text-center">L</p>
        ) : (
          <>
            <p className="text-lg font-bold tracking-tight text-primary">LCC</p>
            <p className="text-xs text-muted mt-0.5">Liquidation Control Center</p>
            <p className="text-xs text-muted-dark mt-0.5">Brightlife Care</p>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 flex flex-col gap-0.5 mt-2">
        {NAV.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                isCollapsed ? "justify-center" : ""
              } ${
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:text-primary hover:bg-row"
              }`}
            >
              {item.icon}
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className={`border-t border-border flex flex-col gap-2 flex-shrink-0 ${isCollapsed ? "p-2" : "p-3"}`}>
        {pendingCount > 0 && !isCollapsed && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-amber-900/30 border border-amber-700/30">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
            <span className="text-xs text-amber-300 font-medium">Draft Mode</span>
            <span className="ml-auto text-xs bg-amber-700/50 text-amber-200 px-1.5 py-0.5 rounded-full">
              {pendingCount}
            </span>
          </div>
        )}
        {pendingCount > 0 && isCollapsed && (
          <div className="flex justify-center">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </div>
        )}

        <CommitButton pendingCount={pendingCount} isCollapsed={isCollapsed} />
        {pendingCount > 0 && <DiscardButton isCollapsed={isCollapsed} />}

        {!isCollapsed && (
          lastSaved ? (
            <p className="text-xs text-muted-dark text-center">Last change: {lastSaved}</p>
          ) : (
            <p className="text-xs text-muted-dark text-center">No pending changes</p>
          )
        )}

        <div className="border-t border-border pt-2 mt-1">
          <ThemeToggle isCollapsed={isCollapsed} />
        </div>
      </div>
    </aside>
  );
}

function CommitButton({ pendingCount, isCollapsed }: { pendingCount: number; isCollapsed: boolean }) {
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
        title={isCollapsed ? "Commit Configuration" : undefined}
        className={`py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 ${
          isCollapsed ? "px-2" : "w-full px-3"
        }`}
      >
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {!isCollapsed && "Commit Configuration"}
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
                  <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-primary font-semibold">Committed</h3>
                <p className="text-muted text-sm mt-1">
                  {result.applied} change{result.applied !== 1 ? "s" : ""} applied to live configuration.
                </p>
                <button
                  onClick={() => { setOpen(false); window.location.reload(); }}
                  className="mt-4 w-full py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm"
                >
                  Done
                </button>
              </div>
            ) : error ? (
              <div className="text-center">
                <p className="text-red-400 text-sm">{error}</p>
                <button onClick={() => setOpen(false)} className="mt-3 text-muted text-sm underline">
                  Close
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-primary font-semibold mb-2">
                  Commit {pendingCount} change{pendingCount !== 1 ? "s" : ""}?
                </h3>
                <p className="text-muted text-sm mb-5">
                  This will apply all staged changes to the live configuration and write an audit entry.
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

function DiscardButton({ isCollapsed }: { isCollapsed: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const doDiscard = useCallback(() => {
    startTransition(async () => {
      const { discardAllAction } = await import("@/server/actions/draft");
      await discardAllAction();
      window.location.reload();
    });
  }, []);

  if (isCollapsed) {
    return (
      <button
        onClick={doDiscard}
        disabled={pending}
        title="Discard all changes"
        className="w-full py-1.5 rounded-lg border border-border text-muted hover:text-red-400 hover:border-red-900/50 text-xs transition-colors flex items-center justify-center"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    );
  }

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

function ThemeToggle({ isCollapsed }: { isCollapsed: boolean }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-muted hover:text-primary hover:bg-row text-sm transition-colors ${
        isCollapsed ? "justify-center" : ""
      }`}
      title={isCollapsed ? (isDark ? "Switch to light mode" : "Switch to dark mode") : undefined}
    >
      {isDark ? (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <circle cx="12" cy="12" r="4" />
          <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
        </svg>
      )}
      {!isCollapsed && <span>{isDark ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}
