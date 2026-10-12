import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hasMinRole, requireRole, type SessionUser } from "@/lib/auth/rbac";

function user(role: SessionUser["role"]): SessionUser {
  return {
    id: "u",
    email: "a@example.com",
    name: "A",
    organizationId: "org",
    organizationSlug: "firm",
    role,
  };
}

describe("QuickBooks deny cases", () => {
  it("denies a consultant or manager the admin connect and invoice push", () => {
    expect(hasMinRole("CONSULTANT", "ADMIN")).toBe(false);
    expect(hasMinRole("MANAGER", "ADMIN")).toBe(false);
    expect(() => requireRole(user("CONSULTANT"), "ADMIN")).toThrow(/Insufficient permissions/);
    expect(() => requireRole(user("MANAGER"), "ADMIN")).toThrow(/Insufficient permissions/);
    expect(() => requireRole(user("ADMIN"), "ADMIN")).not.toThrow();
  });

  it("keeps anonymous connect, consultant connect, manager connect, and consultant push closed", () => {
    const connect = readFileSync(
      "src/app/api/integrations/quickbooks/connect/route.ts",
      "utf8",
    );
    expect(connect).toContain("Unauthorized");
    expect(connect).toContain('hasMinRole(session.user.role, "ADMIN")');

    const actions = readFileSync("src/app/actions.ts", "utf8");
    const start = actions.indexOf("export async function pushInvoiceToQuickBooksAction");
    const body = actions.slice(start, start + 500);
    expect(body).toContain('requireRole(user, "ADMIN")');
    expect(body.indexOf('requireRole(user, "ADMIN")')).toBeLessThan(
      body.indexOf("pushInvoiceToQuickBooks("),
    );
  });
});
