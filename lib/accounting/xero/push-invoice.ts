import { withOrgContext } from "@/lib/tenancy/with-org-context";
import { getInvoice } from "@/lib/billing/service";
import { getChartOfAccounts } from "@/lib/settings/accounting";
import { getAccountingConnection } from "@/lib/accounting/connections";
import { xeroApiRequest } from "@/lib/accounting/xero/client";
import { invoiceToXeroManualJournal } from "@/lib/accounting/xero/journals";

type XeroManualJournalResponse = {
  ManualJournals?: Array<{
    ManualJournalID?: string;
    Narration?: string;
  }>;
};

export async function pushInvoiceToXero(organizationId: string, invoiceId: string) {
  const connection = await getAccountingConnection(organizationId, "XERO");
  if (!connection) {
    throw new Error("Connect Xero in Settings → Accounting before pushing journals");
  }

  const [invoice, accounts] = await Promise.all([
    getInvoice(organizationId, invoiceId),
    getChartOfAccounts(organizationId),
  ]);
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.xeroJournalId) {
    throw new Error(`Invoice already pushed to Xero (journal ${invoice.xeroJournalId})`);
  }

  const journal = invoiceToXeroManualJournal(
    {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      clientName: invoice.project.client.name,
      subtotal: invoice.subtotal,
      lines: invoice.lines,
    },
    accounts,
    "POSTED",
  );

  const response = await xeroApiRequest<XeroManualJournalResponse>(organizationId, "/ManualJournals", {
    method: "POST",
    body: JSON.stringify({ ManualJournals: [journal] }),
  });

  const journalId = response.ManualJournals?.[0]?.ManualJournalID;
  if (!journalId) {
    throw new Error("Xero did not return a manual journal ID");
  }

  await withOrgContext(organizationId, (tx) =>
    tx.invoice.update({
      where: { id: invoiceId },
      data: { xeroJournalId: journalId },
    }),
  );

  return { journalId, narration: journal.Narration };
}
