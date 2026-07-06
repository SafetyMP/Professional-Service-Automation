import { describe, expect, it } from "vitest";
import { invoiceToCsv } from "@/lib/billing/service";

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
