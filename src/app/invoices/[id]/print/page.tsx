import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { getInvoice } from "@/lib/billing/service";

function formatCurrency(value: { toString(): string }): string {
  return Number(value.toString()).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function InvoicePrintPage({
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

  const client = invoice.project.client;
  const pdfUrl = `/api/invoices/${invoice.id}/pdf`;

  return (
    <div className="min-h-screen bg-white p-8 text-[var(--color-foreground)]">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href={`/invoices/${invoice.id}`} className="text-sm hover:underline">
            &larr; Back to invoice
          </Link>
          <a
            href={pdfUrl}
            className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] transition-colors hover:opacity-90"
          >
            Download PDF
          </a>
        </div>

        <p className="mb-6 text-sm text-[var(--color-muted-foreground)]">
          Preview below. Use <strong>Download PDF</strong> for a file you can email or print in your
          system browser.
        </p>

        <div className="rounded-lg border border-[var(--color-border)] bg-white p-10">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold">INVOICE</h1>
              <p className="mt-1 text-[var(--color-muted-foreground)]">
                {invoice.invoiceNumber}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">{org?.name ?? "Organization"}</p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {invoice.project.name}
              </p>
            </div>
          </div>

          <div className="mb-8 grid grid-cols-2 gap-6">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Bill To
              </p>
              <p className="font-medium">{client.name}</p>
              {client.email && (
                <p className="text-sm text-[var(--color-muted-foreground)]">{client.email}</p>
              )}
              {client.phone && (
                <p className="text-sm text-[var(--color-muted-foreground)]">{client.phone}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm">
                <span className="text-[var(--color-muted-foreground)]">Issue Date: </span>
                {formatDate(invoice.issueDate)}
              </p>
              <p className="text-sm">
                <span className="text-[var(--color-muted-foreground)]">Due Date: </span>
                {formatDate(invoice.dueDate)}
              </p>
              <p className="text-sm">
                <span className="text-[var(--color-muted-foreground)]">Status: </span>
                {invoice.status}
              </p>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-[var(--color-border)] text-left">
                <th className="pb-2">Description</th>
                <th className="pb-2 text-right">Qty</th>
                <th className="pb-2 text-right">Rate</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((l) => (
                <tr key={l.id} className="border-b border-[var(--color-border)]">
                  <td className="py-2">{l.description}</td>
                  <td className="py-2 text-right">{l.quantity.toString()}</td>
                  <td className="py-2 text-right">${formatCurrency(l.unitRate)}</td>
                  <td className="py-2 text-right">${formatCurrency(l.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="pt-4 text-right font-semibold">
                  Total Due
                </td>
                <td className="pt-4 text-right text-lg font-bold">
                  ${formatCurrency(invoice.subtotal)}
                </td>
              </tr>
            </tfoot>
          </table>

          <p className="mt-10 text-xs text-[var(--color-muted-foreground)]">
            Payment due within 30 days of issue. Thank you for your business.
          </p>
        </div>
      </div>
    </div>
  );
}
