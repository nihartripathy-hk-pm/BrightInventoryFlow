"use client";

import { useState, useEffect } from "react";
import { SidebarClient } from "./SidebarClient";

interface AppShellProps {
  pendingCount: number;
  lastSaved: string | null;
  children: React.ReactNode;
}

export function AppShell({ pendingCount, lastSaved, children }: AppShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") setIsCollapsed(true);
  }, []);

  const handleToggle = () => {
    setIsCollapsed((prev) => {
      localStorage.setItem("sidebar-collapsed", String(!prev));
      return !prev;
    });
  };

  return (
    <div className="flex min-h-screen bg-app">
      <SidebarClient
        pendingCount={pendingCount}
        lastSaved={lastSaved}
        isCollapsed={isCollapsed}
        onToggle={handleToggle}
      />
      <main
        className={`flex-1 min-h-screen transition-[margin] duration-200 ${
          isCollapsed ? "ml-14" : "ml-60"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
