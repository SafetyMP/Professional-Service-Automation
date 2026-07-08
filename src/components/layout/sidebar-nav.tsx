"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { isNavActive, navItems } from "@/lib/navigation";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

export function SidebarNav({
  orgName,
  userName,
  onNavigate,
  className,
}: {
  orgName: string;
  userName: string;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-sidebar-active)] text-sm font-bold text-white">
            P
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--color-sidebar-foreground)]">
              {orgName}
            </p>
            <p className="truncate text-xs text-[var(--color-sidebar-muted)]">{userName}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4" aria-label="Main">
        {navItems.map((link) => {
          const active = isNavActive(pathname, link.href, link.exact);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--color-sidebar-active)] text-white shadow-sm"
                  : "text-[var(--color-sidebar-muted)] hover:bg-[var(--color-sidebar-accent)] hover:text-[var(--color-sidebar-foreground)]",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <form action="/api/auth/signout" method="POST">
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-3 text-[var(--color-sidebar-muted)] hover:bg-[var(--color-sidebar-accent)] hover:text-[var(--color-sidebar-foreground)]"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
