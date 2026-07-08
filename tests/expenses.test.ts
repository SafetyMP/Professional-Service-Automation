import { describe, expect, it } from "vitest";
import {
  ALLOWED_RECEIPT_MIME_TYPES,
  MAX_RECEIPT_BYTES,
  receiptExtension,
  validateReceiptUpload,
} from "@/lib/expenses/receipt-storage";
import { formatExpenseInvoiceDescription } from "@/lib/expenses/service";

describe("validateReceiptUpload", () => {
  it("accepts supported receipt types under the size limit", () => {
    expect(() =>
      validateReceiptUpload({ size: 1024, type: "image/jpeg" }),
    ).not.toThrow();
  });

  it("rejects unsupported mime types", () => {
    expect(() =>
      validateReceiptUpload({ size: 1024, type: "text/plain" }),
    ).toThrow("Receipt must be JPG, PNG, WebP, or PDF");
  });

  it("rejects files over 5 MB", () => {
    expect(() =>
      validateReceiptUpload({ size: MAX_RECEIPT_BYTES + 1, type: "application/pdf" }),
    ).toThrow("Receipt must be 5 MB or smaller");
  });
});

describe("receiptExtension", () => {
  it("maps mime types to file extensions", () => {
    for (const mimeType of ALLOWED_RECEIPT_MIME_TYPES) {
      expect(receiptExtension(mimeType)).not.toBe("bin");
    }
  });
});

describe("formatExpenseInvoiceDescription", () => {
  it("includes category name in invoice line text", () => {
    const description = formatExpenseInvoiceDescription({
      description: "Client workshop rideshare",
      category: { name: "Travel" },
      user: { name: "Casey Consultant" },
      expenseDate: new Date("2026-07-01T12:00:00Z"),
    });

    expect(description).toContain("Travel");
    expect(description).toContain("Client workshop rideshare");
    expect(description).toContain("Casey Consultant");
  });
});
