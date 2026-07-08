import type { ChartOfAccounts } from "@/lib/settings/accounting";
import { splitInvoiceRevenue, type JournalInvoice } from "@/lib/billing/accounting-export";

export type XeroManualJournalLine = {
  Description: string;
  LineAmount: number;
  AccountCode: string;
};

export type XeroManualJournal = {
  Narration: string;
  Date: string;
  Status: "DRAFT" | "POSTED";
  JournalLines: XeroManualJournalLine[];
};

function accountCode(accounts: ChartOfAccounts, name: string, code: string | null): string {
  if (code?.trim()) return code.trim();
  return name;
}

function formatXeroApiDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function invoiceToXeroManualJournal(
  invoice: JournalInvoice,
  accounts: ChartOfAccounts,
  status: "DRAFT" | "POSTED" = "POSTED",
): XeroManualJournal {
  const subtotal = Number(invoice.subtotal.toString());
  const { timeRevenue, expenseRevenue } = splitInvoiceRevenue(invoice.lines);
  const lines: XeroManualJournalLine[] = [
    {
      Description: `${invoice.clientName} receivable`,
      LineAmount: subtotal,
      AccountCode: accountCode(accounts, accounts.arAccountName, accounts.arAccountCode),
    },
  ];

  if (timeRevenue > 0) {
    lines.push({
      Description: "Professional services",
      LineAmount: -timeRevenue,
      AccountCode: accountCode(
        accounts,
        accounts.serviceRevenueAccount,
        accounts.serviceRevenueAccountCode,
      ),
    });
  }

  if (expenseRevenue > 0) {
    lines.push({
      Description: "Reimbursable expenses",
      LineAmount: -expenseRevenue,
      AccountCode: accountCode(
        accounts,
        accounts.expenseRevenueAccount,
        accounts.expenseRevenueAccountCode,
      ),
    });
  }

  return {
    Narration: invoice.invoiceNumber,
    Date: formatXeroApiDate(invoice.issueDate),
    Status: status,
    JournalLines: lines,
  };
}
