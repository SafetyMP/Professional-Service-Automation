import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Download, Eye } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { getInvoice, invoiceToCsv, invoiceToJournalCsv } from "@/lib/billing/service";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableFoot,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { updateInvoiceStatusAction } from "@/app/actions";
import { hasMinRole } from "@/lib/auth/rbac";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
  });
  const invoice = await getInvoice(session.user.organizationId, id);
  if (!invoice) notFound();

  const isAdmin = hasMinRole(session.user.role, "ADMIN");
  const csv = invoiceToCsv(invoice);
  const journalCsv = invoiceToJournalCsv({
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    clientName: invoice.project.client.name,
    subtotal: invoice.subtotal,
    lines: invoice.lines,
  });

  return (
    <AppShell orgName={org?.name ?? ""} userName={session.user.name}>
      <PageHeader
        title={invoice.invoiceNumber}
        description={`${invoice.project.name} — ${invoice.project.client.name}`}
        actions={
          <Badge
            variant={
              invoice.status === "PAID" ? "success" : invoice.status === "DRAFT" ? "warning" : "default"
            }
          >
            {invoice.status}
          </Badge>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.description}</TableCell>
                  <TableCell className="tabular-nums text-right">{l.quantity.toString()}</TableCell>
                  <TableCell className="tabular-nums text-right">${l.unitRate.toString()}</TableCell>
                  <TableCell className="tabular-nums text-right">${l.amount.toString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFoot>
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={3} className="text-right font-semibold">
                  Subtotal
                </TableCell>
                <TableCell className="tabular-nums text-right text-base font-semibold">
                  ${invoice.subtotal.toString()}
                </TableCell>
              </TableRow>
            </TableFoot>
          </Table>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <a href={`/api/invoices/${invoice.id}/pdf`}>
          <Button type="button">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </a>
        <Link href={`/invoices/${invoice.id}/print`}>
          <Button type="button" variant="outline">
            <Eye className="h-4 w-4" />
            Preview Invoice
          </Button>
        </Link>
        {isAdmin && invoice.status === "DRAFT" && (
          <form action={updateInvoiceStatusAction.bind(null, invoice.id, "SENT")}>
            <Button type="submit">Mark Sent</Button>
          </form>
        )}
        {isAdmin && invoice.status === "SENT" && (
          <form action={updateInvoiceStatusAction.bind(null, invoice.id, "PAID")}>
            <Button type="submit">Mark Paid</Button>
          </form>
        )}
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
          download={`${invoice.invoiceNumber}.csv`}
        >
          <Button type="button" variant="outline">
            Export Lines CSV
          </Button>
        </a>
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(journalCsv)}`}
          download={`${invoice.invoiceNumber}-journal.csv`}
        >
          <Button type="button" variant="outline">
            Export Journal CSV
          </Button>
        </a>
      </div>
    </AppShell>
  );
}
