import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { listInvoices, invoicesToJournalCsv, getProjectBillingStatus } from "@/lib/billing/service";
import { listProjects } from "@/lib/projects/service";
import { AppShell } from "@/components/layout/app-shell";
import { InvoiceGenerateForm } from "@/components/billing/invoice-generate-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/card";
import { generateInvoiceAction } from "@/app/actions";
import { hasMinRole } from "@/lib/auth/rbac";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
  });
  const [invoices, projects] = await Promise.all([
    listInvoices(session.user.organizationId),
    listProjects(session.user.organizationId),
  ]);
  const isAdmin = hasMinRole(session.user.role, "ADMIN");
  const activeProjects = projects.filter((project) => project.status === "ACTIVE");
  const invoiceProjects = await Promise.all(
    activeProjects.map(async (project) => {
      const billing = await getProjectBillingStatus(session.user.organizationId, project.id);
      return {
        id: project.id,
        name: project.name,
        billingModel: project.billingModel,
        contractAmount: billing?.contractAmount ?? null,
        invoicedTotal: billing?.invoicedTotal ?? 0,
        remaining: billing?.remaining ?? null,
      };
    }),
  );
  const exportableInvoices = invoices.filter((inv) => inv.status !== "DRAFT");
  const journalCsv =
    exportableInvoices.length > 0
      ? invoicesToJournalCsv(
          exportableInvoices.map((inv) => ({
            invoiceNumber: inv.invoiceNumber,
            issueDate: inv.issueDate,
            clientName: inv.project.client.name,
            subtotal: inv.subtotal,
            lines: inv.lines,
          })),
        )
      : null;

  return (
    <AppShell orgName={org?.name ?? ""} userName={session.user.name}>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Invoices</h1>
        {isAdmin && journalCsv && (
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(journalCsv)}`}
            download="invoices-journal.csv"
          >
            <Button type="button" variant="secondary">
              Export Journal CSV
            </Button>
          </a>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {isAdmin && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Generate Draft Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <InvoiceGenerateForm projects={invoiceProjects} action={generateInvoiceAction} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {invoices.map((inv) => (
          <Card key={inv.id}>
            <CardContent className="flex items-center justify-between pt-6">
              <div>
                <Link href={`/invoices/${inv.id}`} className="font-semibold hover:underline">
                  {inv.invoiceNumber}
                </Link>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {inv.project.name} — {inv.project.client.name}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">${inv.subtotal.toString()}</p>
                <Badge variant={inv.status === "PAID" ? "success" : "default"}>{inv.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
