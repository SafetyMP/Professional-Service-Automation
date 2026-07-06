"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/projects", label: "Projects" },
  { href: "/time", label: "Time" },
  { href: "/expenses", label: "Expenses" },
  { href: "/resources", label: "Resources" },
  { href: "/resources/utilization", label: "Utilization" },
  { href: "/invoices", label: "Invoices" },
];

export function Sidebar({
  orgName,
  userName,
}: {
  orgName: string;
  userName: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-card)]">
      <div className="border-b border-[var(--color-border)] p-4">
        <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
          PSA Platform
        </p>
        <p className="font-semibold">{orgName}</p>
        <p className="text-sm text-[var(--color-muted-foreground)]">{userName}</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm transition-colors",
              pathname === link.href || pathname.startsWith(`${link.href}/`)
                ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                : "hover:bg-[var(--color-muted)]",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <form action="/api/auth/signout" method="POST" className="border-t border-[var(--color-border)] p-3">
        <button
          type="submit"
          className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--color-muted)]"
        >
          Sign out
        </button>
      </form>
    </aside>
  );
}
