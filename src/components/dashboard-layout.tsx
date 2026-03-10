"use client";

import React, { useState } from "react";
import { Sidebar, MobileHeader } from "./sidebar";
import { GlobalSearch } from "./global-search";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-muted/30">
      <MobileHeader onToggle={() => setMobileOpen(true)} />
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <main className="flex-1 overflow-auto w-full">
        <div className="pt-14 md:pt-0">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <div className="mb-6 no-print">
              <GlobalSearch />
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
