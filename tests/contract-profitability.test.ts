import { describe, expect, it } from "vitest";
import {
  computeContractRevenue,
  computeMilestoneRevenue,
  isContractRevenueModel,
} from "@/lib/reporting/contract-profitability";

describe("isContractRevenueModel", () => {
  it("returns true for fixed fee, retainer, and milestone", () => {
    expect(isContractRevenueModel("FIXED_FEE")).toBe(true);
    expect(isContractRevenueModel("RETAINER")).toBe(true);
    expect(isContractRevenueModel("MILESTONE")).toBe(true);
  });

  it("returns false for time and materials", () => {
    expect(isContractRevenueModel("TIME_AND_MATERIALS")).toBe(false);
  });
});

describe("computeContractRevenue", () => {
  it("splits billed and remaining contract balance", () => {
    expect(computeContractRevenue(48_000, 24_000)).toEqual({
      billedRevenue: 24_000,
      unbilledRevenue: 24_000,
    });
  });

  it("treats invoiced amount as billed when contract amount is unset", () => {
    expect(computeContractRevenue(null, 5_000)).toEqual({
      billedRevenue: 5_000,
      unbilledRevenue: 0,
    });
  });

  it("does not report negative unbilled when over-invoiced", () => {
    expect(computeContractRevenue(10_000, 12_000)).toEqual({
      billedRevenue: 12_000,
      unbilledRevenue: 0,
    });
  });
});

describe("computeMilestoneRevenue", () => {
  it("sums non-invoiced milestone amounts as unbilled", () => {
    expect(
      computeMilestoneRevenue(
        [
          { amount: 10_000, status: "INVOICED" },
          { amount: 5_000, status: "READY" },
          { amount: 3_000, status: "PLANNED" },
        ],
        10_000,
        null,
      ),
    ).toEqual({
      billedRevenue: 10_000,
      unbilledRevenue: 8_000,
    });
  });
});
