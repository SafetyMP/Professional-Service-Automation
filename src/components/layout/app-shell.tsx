"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import type { OrgRole } from "@prisma/client";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function AppShell({
  orgName,
  userName,
  userRole,
  children,
}: {
  orgName: string;
  userName: string;
  userRole: OrgRole;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 bg-[var(--color-sidebar)] lg:block">
        <SidebarNav orgName={orgName} userName={userName} userRole={userRole} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-[var(--color-sidebar)] shadow-xl transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarNav
          orgName={orgName}
          userName={userName}
          userRole={userRole}
          onNavigate={() => setMobileOpen(false)}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-card)]/95 px-4 backdrop-blur lg:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <span className="truncate text-sm font-semibold">{orgName}</span>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
