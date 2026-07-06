import type { OrgRole } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  organizationSlug: string;
  role: OrgRole;
};

export function hasMinRole(userRole: OrgRole, required: OrgRole): boolean {
  const order: Record<OrgRole, number> = {
    CONSULTANT: 1,
    MANAGER: 2,
    ADMIN: 3,
  };
  return order[userRole] >= order[required];
}

export function requireRole(user: SessionUser, required: OrgRole): void {
  if (!hasMinRole(user.role, required)) {
    throw new Error("Insufficient permissions");
  }
}
