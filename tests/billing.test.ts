import { describe, expect, it } from "vitest";
import { Decimal } from "@prisma/client/runtime/client";
import { invoiceToCsv, invoiceToJournalCsv, resolveEntryBillRate, resolveEntryCostRate } from "@/lib/billing/service";

describe("resolveEntryBillRate", () => {
  it("uses project override when set", () => {
    expect(
      resolveEntryBillRate({ billRateOverride: new Decimal(200) }, { billRate: new Decimal(150) }),
    ).toBe(200);
  });

  it("falls back to resource profile bill rate", () => {
    expect(resolveEntryBillRate({ billRateOverride: null }, { billRate: new Decimal(175) })).toBe(
      175,
    );
  });

  it("defaults to 150 when no override or profile", () => {
    expect(resolveEntryBillRate({ billRateOverride: null }, null)).toBe(150);
  });
});

describe("resolveEntryCostRate", () => {
  it("uses resource profile cost rate", () => {
    expect(resolveEntryCostRate({ costRate: new Decimal(75) })).toBe(75);
  });

  it("defaults to 0 when no profile", () => {
    expect(resolveEntryCostRate(null)).toBe(0);
  });
});

describe("invoiceToCsv", () => {
  const invoice = {
    invoiceNumber: "INV-00001",
    issueDate: new Date("2026-07-01T12:00:00Z"),
    dueDate: new Date("2026-07-31T12:00:00Z"),
    status: "DRAFT",
    subtotal: { toString: () => "300" },
    lines: [
      {
        description: 'Consulting — "Phase 1"',
        quantity: { toString: () => "2" },
        unitRate: { toString: () => "100" },
        amount: { toString: () => "200" },
      },
      {
        description: "Support",
        quantity: { toString: () => "1" },
        unitRate: { toString: () => "100" },
        amount: { toString: () => "100" },
      },
    ],
  };

  it("includes header and subtotal row", () => {
    const csv = invoiceToCsv(invoice);
    expect(csv.split("\n")[0]).toBe(
      "Invoice,Issue Date,Due Date,Status,Line,Qty,Rate,Amount",
    );
    expect(csv).toContain(",,,,Subtotal,,,300");
  });

  it("escapes quotes in line descriptions", () => {
    const csv = invoiceToCsv(invoice);
    expect(csv).toContain('"Consulting — ""Phase 1"""');
  });

  it("subtotal matches sum of line amounts", () => {
    const lineSum = invoice.lines.reduce(
      (sum, line) => sum + Number(line.amount.toString()),
      0,
    );
    expect(Number(invoice.subtotal.toString())).toBe(lineSum);
  });
});

describe("invoiceToJournalCsv", () => {
  const baseInvoice = {
    invoiceNumber: "INV-00002",
    issueDate: new Date("2026-07-01T12:00:00Z"),
    clientName: "Acme Corp",
    subtotal: { toString: () => "2795.02" },
    lines: [
      {
        amount: { toString: () => "2709.60" },
        timeEntryId: "t1",
        expenseEntryId: null,
      },
      {
        amount: { toString: () => "85.42" },
        timeEntryId: null,
        expenseEntryId: "e1",
      },
    ],
  };

  it("creates balanced journal entries", () => {
    const csv = invoiceToJournalCsv(baseInvoice);
    expect(csv.split("\n")[0]).toBe("Date,Account,Description,Debit,Credit,Reference");

    const debitTotal = 2795.02;
    const creditTotal = 2709.6 + 85.42;
    expect(debitTotal).toBeCloseTo(creditTotal, 2);

    expect(csv).toContain("Accounts Receivable");
    expect(csv).toContain("Service Revenue");
    expect(csv).toContain("Expense Revenue");
    expect(csv).toContain("2709.60");
    expect(csv).toContain("85.42");
  });

  it("supports time-only invoices", () => {
    const csv = invoiceToJournalCsv({
      ...baseInvoice,
      subtotal: { toString: () => "500" },
      lines: [{ amount: { toString: () => "500" }, timeEntryId: "t1", expenseEntryId: null }],
    });
    expect(csv).toContain("Service Revenue");
    expect(csv).not.toContain("Expense Revenue");
  });
});
