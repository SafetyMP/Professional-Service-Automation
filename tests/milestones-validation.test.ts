import { describe, expect, it } from "vitest";
import { validateMilestoneTotals, sumMilestoneAmounts } from "@/lib/milestones/validation";
import { invoiceToXeroManualJournal } from "@/lib/accounting/xero/journals";
import { DEFAULT_CHART_OF_ACCOUNTS } from "@/lib/settings/accounting";

describe("milestone validation", () => {
  it("allows milestones within contract amount", () => {
    const result = validateMilestoneTotals(
      [{ amount: 5000 }, { amount: 3000 }],
      10000,
    );
    expect(result.valid).toBe(true);
    expect(result.total).toBe(8000);
    expect(result.remaining).toBe(2000);
  });

  it("rejects milestones exceeding contract amount", () => {
    const result = validateMilestoneTotals([{ amount: 6000 }, { amount: 5000 }], 10000);
    expect(result.valid).toBe(false);
    expect(result.exceedsContract).toBe(true);
  });

  it("sums milestone amounts", () => {
    expect(sumMilestoneAmounts([{ amount: 100 }, { amount: 50.5 }])).toBe(150.5);
  });
});

describe("xero manual journal mapping", () => {
  it("builds balanced journal lines with account codes", () => {
    const journal = invoiceToXeroManualJournal(
      {
        invoiceNumber: "INV-100",
        issueDate: new Date("2026-07-01"),
        clientName: "Acme",
        subtotal: { toString: () => "1500" },
        lines: [
          { amount: { toString: () => "1000" }, timeEntryId: "t1" },
          { amount: { toString: () => "500" }, expenseEntryId: "e1" },
        ],
      },
      {
        ...DEFAULT_CHART_OF_ACCOUNTS,
        arAccountCode: "1200",
        serviceRevenueAccountCode: "4000",
        expenseRevenueAccountCode: "4100",
      },
    );

    expect(journal.Narration).toBe("INV-100");
    expect(journal.JournalLines).toHaveLength(3);
    expect(journal.JournalLines[0]).toMatchObject({
      AccountCode: "1200",
      LineAmount: 1500,
    });
    expect(journal.JournalLines[1]?.LineAmount).toBe(-1000);
    expect(journal.JournalLines[2]?.LineAmount).toBe(-500);
  });
});
