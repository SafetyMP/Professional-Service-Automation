import {
  DEFAULT_CHART_OF_ACCOUNTS,
  type ChartOfAccounts,
} from "@/lib/settings/accounting";

export type JournalInvoice = {
  invoiceNumber: string;
  issueDate: Date;
  clientName: string;
  subtotal: { toString(): string };
  lines: Array<{
    amount: { toString(): string };
    timeEntryId?: string | null;
    expenseEntryId?: string | null;
    milestoneId?: string | null;
  }>;
};

export type AccountingExportFormat = "generic" | "xero" | "quickbooks";

function formatJournalAmount(value: number): string {
  return value.toFixed(2);
}

function escapeJournalField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatXeroDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function formatQuickBooksDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${month}/${day}/${year}`;
}

function splitInvoiceRevenue(lines: JournalInvoice["lines"]): {
  timeRevenue: number;
  expenseRevenue: number;
} {
  let timeRevenue = 0;
  let expenseRevenue = 0;

  for (const line of lines) {
    const amount = Number(line.amount.toString());
    if (line.expenseEntryId) {
      expenseRevenue += amount;
    } else {
      timeRevenue += amount;
    }
  }

  return { timeRevenue, expenseRevenue };
}

export function invoiceToJournalRows(
  invoice: JournalInvoice,
  accounts: ChartOfAccounts = DEFAULT_CHART_OF_ACCOUNTS,
): string[] {
  const date = formatIsoDate(invoice.issueDate);
  const reference = invoice.invoiceNumber;
  const subtotal = Number(invoice.subtotal.toString());
  const { timeRevenue, expenseRevenue } = splitInvoiceRevenue(invoice.lines);
  const clientLabel = escapeJournalField(`${reference} ${invoice.clientName}`);

  const rows = [
    `${date},${escapeJournalField(accounts.arAccountName)},${clientLabel},${formatJournalAmount(subtotal)},,${reference}`,
  ];

  if (timeRevenue > 0) {
    rows.push(
      `${date},${escapeJournalField(accounts.serviceRevenueAccount)},${escapeJournalField(`${reference} professional services`)},,${formatJournalAmount(timeRevenue)},${reference}`,
    );
  }

  if (expenseRevenue > 0) {
    rows.push(
      `${date},${escapeJournalField(accounts.expenseRevenueAccount)},${escapeJournalField(`${reference} reimbursable expenses`)},,${formatJournalAmount(expenseRevenue)},${reference}`,
    );
  }

  return rows;
}

export function invoiceToJournalCsv(
  invoice: JournalInvoice,
  accounts?: ChartOfAccounts,
): string {
  const header = "Date,Account,Description,Debit,Credit,Reference";
  return [header, ...invoiceToJournalRows(invoice, accounts)].join("\n");
}

export function invoicesToJournalCsv(
  invoices: JournalInvoice[],
  accounts?: ChartOfAccounts,
): string {
  const header = "Date,Account,Description,Debit,Credit,Reference";
  const rows = invoices.flatMap((invoice) => invoiceToJournalRows(invoice, accounts));
  return [header, ...rows].join("\n");
}

export function invoiceToXeroJournalCsv(
  invoice: JournalInvoice,
  accounts?: ChartOfAccounts,
): string {
  const chart = accounts ?? DEFAULT_CHART_OF_ACCOUNTS;
  const narration = invoice.invoiceNumber;
  const date = formatXeroDate(invoice.issueDate);
  const subtotal = Number(invoice.subtotal.toString());
  const { timeRevenue, expenseRevenue } = splitInvoiceRevenue(invoice.lines);
  const header = "*Narration,*Date,*Description,*Account,*TaxType,Debit,Credit";

  const rows = [
    `${escapeJournalField(narration)},${date},${escapeJournalField(`${invoice.clientName} receivable`)},${escapeJournalField(chart.arAccountName)},Tax Exempt,${formatJournalAmount(subtotal)},`,
  ];

  if (timeRevenue > 0) {
    rows.push(
      `${escapeJournalField(narration)},${date},${escapeJournalField("Professional services")},${escapeJournalField(chart.serviceRevenueAccount)},Tax Exempt,,${formatJournalAmount(timeRevenue)}`,
    );
  }

  if (expenseRevenue > 0) {
    rows.push(
      `${escapeJournalField(narration)},${date},${escapeJournalField("Reimbursable expenses")},${escapeJournalField(chart.expenseRevenueAccount)},Tax Exempt,,${formatJournalAmount(expenseRevenue)}`,
    );
  }

  return [header, ...rows].join("\n");
}

export function invoicesToXeroJournalCsv(
  invoices: JournalInvoice[],
  accounts?: ChartOfAccounts,
): string {
  const header = "*Narration,*Date,*Description,*Account,*TaxType,Debit,Credit";
  const rows = invoices.flatMap((invoice) =>
    invoiceToXeroJournalCsv(invoice, accounts).split("\n").slice(1),
  );
  return [header, ...rows].join("\n");
}

export function invoiceToQuickBooksJournalCsv(
  invoice: JournalInvoice,
  accounts?: ChartOfAccounts,
): string {
  const chart = accounts ?? DEFAULT_CHART_OF_ACCOUNTS;
  const journalNo = invoice.invoiceNumber;
  const date = formatQuickBooksDate(invoice.issueDate);
  const subtotal = Number(invoice.subtotal.toString());
  const { timeRevenue, expenseRevenue } = splitInvoiceRevenue(invoice.lines);
  const header = "Journal No,Journal Date,Account Name,Debits,Credits,Description,Name";

  const rows = [
    `${journalNo},${date},${escapeJournalField(chart.arAccountName)},${formatJournalAmount(subtotal)},,${escapeJournalField(`Invoice ${journalNo}`)},${escapeJournalField(invoice.clientName)}`,
  ];

  if (timeRevenue > 0) {
    rows.push(
      `${journalNo},${date},${escapeJournalField(chart.serviceRevenueAccount)},,${formatJournalAmount(timeRevenue)},${escapeJournalField("Professional services")},${escapeJournalField(invoice.clientName)}`,
    );
  }

  if (expenseRevenue > 0) {
    rows.push(
      `${journalNo},${date},${escapeJournalField(chart.expenseRevenueAccount)},,${formatJournalAmount(expenseRevenue)},${escapeJournalField("Reimbursable expenses")},${escapeJournalField(invoice.clientName)}`,
    );
  }

  return [header, ...rows].join("\n");
}

export function invoicesToQuickBooksJournalCsv(
  invoices: JournalInvoice[],
  accounts?: ChartOfAccounts,
): string {
  const header = "Journal No,Journal Date,Account Name,Debits,Credits,Description,Name";
  const rows = invoices.flatMap((invoice) =>
    invoiceToQuickBooksJournalCsv(invoice, accounts).split("\n").slice(1),
  );
  return [header, ...rows].join("\n");
}

export function exportInvoicesJournalCsv(
  invoices: JournalInvoice[],
  format: AccountingExportFormat,
  accounts?: ChartOfAccounts,
): string {
  switch (format) {
    case "generic":
      return invoicesToJournalCsv(invoices, accounts);
    case "xero":
      return invoicesToXeroJournalCsv(invoices, accounts);
    case "quickbooks":
      return invoicesToQuickBooksJournalCsv(invoices, accounts);
    default: {
      const exhaustive: never = format;
      return exhaustive;
    }
  }
}

export function exportInvoiceJournalCsv(
  invoice: JournalInvoice,
  format: AccountingExportFormat,
  accounts?: ChartOfAccounts,
): string {
  switch (format) {
    case "generic":
      return invoiceToJournalCsv(invoice, accounts);
    case "xero":
      return invoiceToXeroJournalCsv(invoice, accounts);
    case "quickbooks":
      return invoiceToQuickBooksJournalCsv(invoice, accounts);
    default: {
      const exhaustive: never = format;
      return exhaustive;
    }
  }
}
