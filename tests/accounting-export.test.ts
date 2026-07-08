import { describe, expect, it } from "vitest";
import {
  exportInvoiceJournalCsv,
  invoiceToJournalCsv,
  invoiceToQuickBooksJournalCsv,
  invoiceToXeroJournalCsv,
} from "@/lib/billing/accounting-export";
import type { ChartOfAccounts } from "@/lib/settings/accounting";

const customAccounts: ChartOfAccounts = {
  arAccountName: "1200 Accounts Receivable",
  serviceRevenueAccount: "4000 Consulting Revenue",
  expenseRevenueAccount: "4100 Reimbursable Revenue",
  arAccountCode: null,
  serviceRevenueAccountCode: null,
  expenseRevenueAccountCode: null,
};

const sampleInvoice = {
  invoiceNumber: "INV-00002",
  issueDate: new Date("2026-07-01T12:00:00Z"),
  clientName: "Acme Corp",
  subtotal: { toString: () => "2795.02" },
  lines: [
    {
      amount: { toString: () => "2709.60" },
      timeEntryId: "t1",
      expenseEntryId: null,
      milestoneId: null,
    },
    {
      amount: { toString: () => "85.42" },
      timeEntryId: null,
      expenseEntryId: "e1",
      milestoneId: null,
    },
  ],
};

describe("invoiceToJournalCsv with chart of accounts", () => {
  it("uses configured account names", () => {
    const csv = invoiceToJournalCsv(sampleInvoice, customAccounts);
    expect(csv).toContain("1200 Accounts Receivable");
    expect(csv).toContain("4000 Consulting Revenue");
    expect(csv).toContain("4100 Reimbursable Revenue");
  });
});

describe("invoiceToXeroJournalCsv", () => {
  it("creates xero manual journal rows", () => {
    const csv = invoiceToXeroJournalCsv(sampleInvoice, customAccounts);
    expect(csv.split("\n")[0]).toBe("*Narration,*Date,*Description,*Account,*TaxType,Debit,Credit");
    expect(csv).toContain("01/07/2026");
    expect(csv).toContain("1200 Accounts Receivable");
    expect(csv).toContain("4000 Consulting Revenue");
  });
});

describe("invoiceToQuickBooksJournalCsv", () => {
  it("creates quickbooks journal rows", () => {
    const csv = invoiceToQuickBooksJournalCsv(sampleInvoice, customAccounts);
    expect(csv.split("\n")[0]).toBe(
      "Journal No,Journal Date,Account Name,Debits,Credits,Description,Name",
    );
    expect(csv).toContain("07/01/2026");
    expect(csv).toContain("1200 Accounts Receivable");
    expect(csv).toContain("4000 Consulting Revenue");
  });
});

describe("exportInvoiceJournalCsv", () => {
  it("routes to the selected format", () => {
    const generic = exportInvoiceJournalCsv(sampleInvoice, "generic", customAccounts);
    const xero = exportInvoiceJournalCsv(sampleInvoice, "xero", customAccounts);
    expect(generic).toContain("Date,Account,Description,Debit,Credit,Reference");
    expect(xero).toContain("*Narration,*Date,*Description,*Account,*TaxType,Debit,Credit");
  });
});
