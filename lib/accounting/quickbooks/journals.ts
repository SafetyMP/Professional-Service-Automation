import type { ChartOfAccounts } from "@/lib/settings/accounting";
import { splitInvoiceRevenue, type JournalInvoice } from "@/lib/billing/accounting-export";

type QuickBooksJournalLine = {
  DetailType: "JournalEntryLineDetail";
  Amount: number;
  Description: string;
  JournalEntryLineDetail: {
    PostingType: "Debit" | "Credit";
    AccountRef: { value: string; name?: string };
  };
};

export type QuickBooksJournalEntry = {
  DocNumber: string;
  TxnDate: string;
  PrivateNote: string;
  Line: QuickBooksJournalLine[];
};

function accountRef(accounts: ChartOfAccounts, name: string, code: string | null) {
  const value = code?.trim() || name;
  return { value, name };
}

function formatTxnDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function invoiceToQuickBooksJournalEntry(
  invoice: JournalInvoice,
  accounts: ChartOfAccounts,
): QuickBooksJournalEntry {
  const subtotal = Number(invoice.subtotal.toString());
  const { timeRevenue, expenseRevenue } = splitInvoiceRevenue(invoice.lines);
  const lines: QuickBooksJournalLine[] = [
    {
      DetailType: "JournalEntryLineDetail",
      Amount: subtotal,
      Description: `${invoice.clientName} receivable`,
      JournalEntryLineDetail: {
        PostingType: "Debit",
        AccountRef: accountRef(accounts, accounts.arAccountName, accounts.arAccountCode),
      },
    },
  ];

  if (timeRevenue > 0) {
    lines.push({
      DetailType: "JournalEntryLineDetail",
      Amount: timeRevenue,
      Description: "Professional services",
      JournalEntryLineDetail: {
        PostingType: "Credit",
        AccountRef: accountRef(
          accounts,
          accounts.serviceRevenueAccount,
          accounts.serviceRevenueAccountCode,
        ),
      },
    });
  }

  if (expenseRevenue > 0) {
    lines.push({
      DetailType: "JournalEntryLineDetail",
      Amount: expenseRevenue,
      Description: "Reimbursable expenses",
      JournalEntryLineDetail: {
        PostingType: "Credit",
        AccountRef: accountRef(
          accounts,
          accounts.expenseRevenueAccount,
          accounts.expenseRevenueAccountCode,
        ),
      },
    });
  }

  return {
    DocNumber: invoice.invoiceNumber,
    TxnDate: formatTxnDate(invoice.issueDate),
    PrivateNote: `PSA invoice ${invoice.invoiceNumber}`,
    Line: lines,
  };
}
