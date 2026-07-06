import { describe, expect, it } from "vitest";
import { buildInvoicePdf } from "@/lib/billing/invoice-pdf";

describe("buildInvoicePdf", () => {
  it("returns a valid PDF document", async () => {
    const pdf = await buildInvoicePdf({
      invoiceNumber: "INV-00001",
      issueDate: new Date("2026-07-01T12:00:00Z"),
      dueDate: new Date("2026-07-31T12:00:00Z"),
      status: "SENT",
      orgName: "Demo Consulting Firm",
      projectName: "Digital Transformation",
      clientName: "Acme Corp",
      clientEmail: "acme@example.com",
      subtotal: 300,
      lines: [
        {
          description: "Consulting — Discovery",
          quantity: 2,
          unitRate: 100,
          amount: 200,
        },
        {
          description: "Expense — rideshare",
          quantity: 1,
          unitRate: 100,
          amount: 100,
        },
      ],
    });

    expect(pdf.byteLength).toBeGreaterThan(500);
    expect(Buffer.from(pdf).subarray(0, 4).toString()).toBe("%PDF");
  });
});
