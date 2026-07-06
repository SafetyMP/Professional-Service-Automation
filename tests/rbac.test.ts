import { describe, expect, it } from "vitest";
import { hasMinRole } from "../lib/auth/rbac";

describe("rbac", () => {
  it("admin satisfies manager requirement", () => {
    expect(hasMinRole("ADMIN", "MANAGER")).toBe(true);
  });

  it("consultant does not satisfy manager requirement", () => {
    expect(hasMinRole("CONSULTANT", "MANAGER")).toBe(false);
  });

  it("manager satisfies consultant requirement", () => {
    expect(hasMinRole("MANAGER", "CONSULTANT")).toBe(true);
  });
});
