import { describe, expect, it } from "vitest";
import {
  computeProgressBillAmount,
  contractLineDescription,
  resolveContractInvoiceAmount,
} from "@/lib/billing/contract-billing";
import {
  countsAsUnbilledWip,
  milestoneStatusAfter,
  sourceStatusesFor,
  sumCommittedInvoiceSubtotals,
  sumRealizedInvoiceSubtotals,
  timeExpenseBillingStatus,
  transitionSource,
} from "@/lib/billing/realization";

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

describe("invoice realization", () => {
  it("does not realize WIP on a draft and restores UNBILLED when the draft is voided", () => {
    const draftedTime = transitionSource("draft", "DRAFT", {
      kind: "time",
      billingStatus: "UNBILLED",
    });
    const draftedExpense = transitionSource("draft", "DRAFT", {
      kind: "expense",
      billingStatus: "UNBILLED",
    });
    const draftedMilestone = transitionSource("draft", "DRAFT", {
      kind: "milestone",
      status: "READY",
    });

    expect(timeExpenseBillingStatus(draftedTime)).toBe("UNBILLED");
    expect(timeExpenseBillingStatus(draftedExpense)).toBe("UNBILLED");
    expect(milestoneStatusAfter(draftedMilestone)).toBe("READY");
    expect(countsAsUnbilledWip(draftedTime)).toBe(true);
    expect(countsAsUnbilledWip(draftedExpense)).toBe(true);
    expect(countsAsUnbilledWip(draftedMilestone)).toBe(true);
    expect(sourceStatusesFor("draft", "DRAFT")).toEqual({
      time: "UNBILLED",
      expense: "UNBILLED",
      milestone: "READY",
    });

    const issuedTime = transitionSource("issue", "DRAFT", draftedTime);
    const issuedMilestone = transitionSource("issue", "DRAFT", draftedMilestone);
    expect(timeExpenseBillingStatus(issuedTime)).toBe("INVOICED");
    expect(milestoneStatusAfter(issuedMilestone)).toBe("INVOICED");
    expect(countsAsUnbilledWip(issuedTime)).toBe(false);
    expect(sourceStatusesFor("issue", "DRAFT")).toEqual({
      time: "INVOICED",
      expense: "INVOICED",
      milestone: "INVOICED",
    });

    const restoredTime = transitionSource("void", "DRAFT", issuedTime);
    const restoredExpense = transitionSource("void", "DRAFT", {
      kind: "expense",
      billingStatus: "INVOICED",
    });
    const restoredMilestone = transitionSource("void", "DRAFT", issuedMilestone);
    expect(timeExpenseBillingStatus(restoredTime)).toBe("UNBILLED");
    expect(timeExpenseBillingStatus(restoredExpense)).toBe("UNBILLED");
    expect(milestoneStatusAfter(restoredMilestone)).toBe("READY");
    expect(countsAsUnbilledWip(restoredTime)).toBe(true);
    expect(sourceStatusesFor("void", "DRAFT")).toEqual({
      time: "UNBILLED",
      expense: "UNBILLED",
      milestone: "READY",
    });

    expect(() => transitionSource("void", "SENT", draftedTime)).toThrow(
      /only draft invoices can be voided/i,
    );
    expect(() => transitionSource("void", "PAID", draftedTime)).toThrow(
      /only draft invoices can be voided/i,
    );
    expect(() => sourceStatusesFor("void", "SENT")).toThrow(/only draft invoices can be voided/i);
    expect(() => transitionSource("issue", "PAID", draftedTime)).toThrow(
      /only draft invoices can be issued/i,
    );

    expect(
      sumRealizedInvoiceSubtotals([
        { status: "DRAFT", subtotal: 4000 },
        { status: "SENT", subtotal: 1500 },
        { status: "PAID", subtotal: 500 },
      ]),
    ).toBe(2000);
    expect(
      sumCommittedInvoiceSubtotals([
        { status: "DRAFT", subtotal: 4000 },
        { status: "SENT", subtotal: 1500 },
      ]),
    ).toBe(5500);
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
