import { describe, expect, it } from "vitest";
import { invoiceToQuickBooksJournalEntry } from "@/lib/accounting/quickbooks/journals";
import { DEFAULT_CHART_OF_ACCOUNTS } from "@/lib/settings/accounting";

describe("quickbooks journal mapping", () => {
  it("builds debit AR and credit revenue lines", () => {
    const entry = invoiceToQuickBooksJournalEntry(
      {
        invoiceNumber: "INV-200",
        issueDate: new Date("2026-07-01"),
        clientName: "Acme",
        subtotal: { toString: () => "1500" },
        lines: [
          { amount: { toString: () => "1200" }, timeEntryId: "t1" },
          { amount: { toString: () => "300" }, expenseEntryId: "e1" },
        ],
      },
      {
        ...DEFAULT_CHART_OF_ACCOUNTS,
        arAccountCode: "33",
        serviceRevenueAccountCode: "79",
        expenseRevenueAccountCode: "80",
      },
    );

    expect(entry.DocNumber).toBe("INV-200");
    expect(entry.Line).toHaveLength(3);
    expect(entry.Line[0]?.JournalEntryLineDetail.PostingType).toBe("Debit");
    expect(entry.Line[1]?.JournalEntryLineDetail.PostingType).toBe("Credit");
    expect(entry.Line[0]?.JournalEntryLineDetail.AccountRef.value).toBe("33");
  });
});
