import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { getInvoice, invoiceToCsv } from "@/lib/billing/service";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/card";
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

  return (
    <AppShell orgName={org?.name ?? ""} userName={session.user.name}>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{invoice.invoiceNumber}</h1>
          <p className="text-[var(--color-muted-foreground)]">
            {invoice.project.name} — {invoice.project.client.name}
          </p>
        </div>
        <Badge variant={invoice.status === "PAID" ? "success" : "default"}>
          {invoice.status}
        </Badge>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2">Description</th>
                <th className="pb-2">Qty</th>
                <th className="pb-2">Rate</th>
                <th className="pb-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((l) => (
                <tr key={l.id} className="border-b">
                  <td className="py-2">{l.description}</td>
                  <td className="py-2">{l.quantity.toString()}</td>
                  <td className="py-2">${l.unitRate.toString()}</td>
                  <td className="py-2">${l.amount.toString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="pt-4 text-right font-semibold">
                  Subtotal
                </td>
                <td className="pt-4 font-semibold">${invoice.subtotal.toString()}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
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
          <Button type="button" variant="secondary">
            Export CSV
          </Button>
        </a>
      </div>
    </AppShell>
  );
}
