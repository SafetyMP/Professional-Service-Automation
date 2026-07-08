import { describe, expect, it } from "vitest";
import {
  assertMilestoneInvoiceable,
  milestoneLineDescription,
} from "@/lib/billing/milestone-billing";

describe("milestoneLineDescription", () => {
  it("formats milestone invoice line text", () => {
    expect(milestoneLineDescription("Phase 1", "Website Redesign")).toBe(
      "Milestone — Phase 1 (Website Redesign)",
    );
  });
});

describe("assertMilestoneInvoiceable", () => {
  it("allows ready milestones", () => {
    expect(() => assertMilestoneInvoiceable("READY")).not.toThrow();
  });

  it("rejects planned milestones", () => {
    expect(() => assertMilestoneInvoiceable("PLANNED")).toThrow(
      "Only milestones marked Ready can be invoiced",
    );
  });
});
