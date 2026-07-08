import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { listInvoices, invoicesToJournalCsv, getProjectBillingStatus } from "@/lib/billing/service";
import { listProjects } from "@/lib/projects/service";
import { AppShell } from "@/components/layout/app-shell";
import { InvoiceGenerateForm } from "@/components/billing/invoice-generate-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { generateInvoiceAction } from "@/app/actions";
import { hasMinRole } from "@/lib/auth/rbac";
import { formatCurrency } from "@/lib/utils/format";

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
      <PageHeader
        title="Invoices"
        description="Generate draft invoices from WIP or contract billing."
        actions={
          isAdmin && journalCsv ? (
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(journalCsv)}`}
              download="invoices-journal.csv"
            >
              <Button type="button" variant="outline">
                Export Journal CSV
              </Button>
            </a>
          ) : undefined
        }
      />

      {error && <Alert variant="destructive" className="mb-6">{error}</Alert>}

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

      {invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices yet"
          description="Generate a draft invoice from approved time, expenses, or contract billing."
        />
      ) : (
        <div className="grid gap-3">
          {invoices.map((inv) => (
            <Card key={inv.id} className="transition-shadow hover:shadow-[var(--shadow-elevated)]">
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="font-semibold text-[var(--color-foreground)] hover:text-[var(--color-primary)]"
                  >
                    {inv.invoiceNumber}
                  </Link>
                  <p className="truncate text-sm text-[var(--color-muted-foreground)]">
                    {inv.project.name} — {inv.project.client.name}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-right">
                  <p className="tabular-nums font-semibold">${formatCurrency(Number(inv.subtotal))}</p>
                  <Badge variant={inv.status === "PAID" ? "success" : inv.status === "DRAFT" ? "warning" : "default"}>
                    {inv.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
