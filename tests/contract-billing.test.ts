import { describe, expect, it } from "vitest";
import {
  computeProgressBillAmount,
  contractLineDescription,
  resolveContractInvoiceAmount,
} from "@/lib/billing/contract-billing";

describe("computeProgressBillAmount", () => {
  it("bills incremental progress on a fixed fee", () => {
    expect(computeProgressBillAmount(100000, 0, 25)).toBe(25000);
    expect(computeProgressBillAmount(100000, 25000, 50)).toBe(25000);
    expect(computeProgressBillAmount(100000, 50000, 50)).toBe(0);
  });
});

describe("resolveContractInvoiceAmount", () => {
  it("uses explicit amount when provided", () => {
    expect(
      resolveContractInvoiceAmount({
        contractAmount: 50000,
        invoicedTotal: 10000,
        amount: 5000,
      }),
    ).toBe(5000);
  });

  it("defaults retainer to contract amount", () => {
    expect(
      resolveContractInvoiceAmount({
        contractAmount: 12000,
        invoicedTotal: 0,
        defaultAmount: 12000,
      }),
    ).toBe(12000);
  });

  it("rejects amounts over remaining contract balance", () => {
    expect(() =>
      resolveContractInvoiceAmount({
        contractAmount: 50000,
        invoicedTotal: 48000,
        amount: 5000,
      }),
    ).toThrow(/remaining contract balance/i);
  });
});

describe("contractLineDescription", () => {
  it("labels retainer and fixed-fee lines", () => {
    expect(contractLineDescription("RETAINER", "Security Audit")).toBe(
      "Retainer — Security Audit",
    );
    expect(contractLineDescription("FIXED_FEE", "ERP Integration", 25)).toBe(
      "Fixed fee — ERP Integration (25% complete)",
    );
  });
});
