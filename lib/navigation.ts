import type { LucideIcon } from "lucide-react";
import type { OrgRole } from "@prisma/client";
import { hasMinRole } from "@/lib/auth/rbac";
import {
  BarChart3,
  Building2,
  Clock,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
  UserCog,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Exact match only — prevents /resources matching /resources/utilization */
  exact?: boolean;
  /** Minimum org role required to see this link */
  minRole?: OrgRole;
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Building2 },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/time", label: "Time", icon: Clock },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/resources", label: "Resources", icon: Users, exact: true },
  { href: "/resources/utilization", label: "Utilization", icon: UserCog },
  { href: "/reports/profitability", label: "Profitability", icon: BarChart3 },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/settings/accounting", label: "Accounting", icon: Settings, minRole: "MANAGER" },
];

export function navItemsForRole(role: OrgRole): NavItem[] {
  return navItems.filter((item) => !item.minRole || hasMinRole(role, item.minRole));
}

export function isNavActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
