"use client";

import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({
  orgName,
  userName,
  children,
}: {
  orgName: string;
  userName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar orgName={orgName} userName={userName} />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
