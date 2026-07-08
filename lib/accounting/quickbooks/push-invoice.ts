import { withOrgContext } from "@/lib/tenancy/with-org-context";
import { getInvoice } from "@/lib/billing/service";
import { getChartOfAccounts } from "@/lib/settings/accounting";
import { getAccountingConnection } from "@/lib/accounting/connections";
import { quickBooksApiRequest } from "@/lib/accounting/quickbooks/client";
import { invoiceToQuickBooksJournalEntry } from "@/lib/accounting/quickbooks/journals";

type QuickBooksJournalResponse = {
  JournalEntry?: {
    Id?: string;
    DocNumber?: string;
  };
};

export async function pushInvoiceToQuickBooks(organizationId: string, invoiceId: string) {
  const connection = await getAccountingConnection(organizationId, "QUICKBOOKS");
  if (!connection) {
    throw new Error("Connect QuickBooks in Settings → Accounting before pushing journals");
  }

  const [invoice, accounts] = await Promise.all([
    getInvoice(organizationId, invoiceId),
    getChartOfAccounts(organizationId),
  ]);
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.quickbooksJournalId) {
    throw new Error(
      `Invoice already pushed to QuickBooks (journal ${invoice.quickbooksJournalId})`,
    );
  }

  const journal = invoiceToQuickBooksJournalEntry(
    {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      clientName: invoice.project.client.name,
      subtotal: invoice.subtotal,
      lines: invoice.lines,
    },
    accounts,
  );

  const response = await quickBooksApiRequest<QuickBooksJournalResponse>(
    organizationId,
    "/journalentry?minorversion=65",
    {
      method: "POST",
      body: JSON.stringify(journal),
    },
  );

  const journalId = response.JournalEntry?.Id;
  if (!journalId) {
    throw new Error("QuickBooks did not return a journal entry ID");
  }

  await withOrgContext(organizationId, (tx) =>
    tx.invoice.update({
      where: { id: invoiceId },
      data: { quickbooksJournalId: journalId },
    }),
  );

  return { journalId, docNumber: journal.DocNumber };
}
