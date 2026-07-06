import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { getProjectProfitabilityReport } from "@/lib/reporting/service";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/card";

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMarginPct(value: number | null): string {
  return value == null ? "—" : `${value}%`;
}

function marginVariant(marginPct: number | null): "success" | "warning" | "default" {
  if (marginPct == null) return "default";
  if (marginPct >= 30) return "success";
  if (marginPct >= 10) return "default";
  return "warning";
}

export default async function ProfitabilityPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
  });
  const report = await getProjectProfitabilityReport(session.user.organizationId);

  return (
    <AppShell orgName={org?.name ?? ""} userName={session.user.name}>
      <h1 className="mb-2 text-2xl font-bold">Project Profitability</h1>
      <p className="mb-6 text-sm text-[var(--color-muted-foreground)]">
        Revenue from approved billable time and expenses. Billed revenue is on invoices;
        unbilled revenue is approved work not yet invoiced. Cost from approved labor at cost
        rates plus all approved expenses.
      </p>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Billed Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${formatCurrency(report.summary.billedRevenue)}</p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              On invoices
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Unbilled Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${formatCurrency(report.summary.unbilledRevenue)}</p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Approved, not yet invoiced
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${formatCurrency(report.summary.revenue)}</p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Billed + unbilled
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Total Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${formatCurrency(report.summary.cost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Total Margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${formatCurrency(report.summary.margin)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Overall Margin %
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatMarginPct(report.summary.marginPct)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By Project</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2">Project</th>
                  <th className="pb-2">Client</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Billed</th>
                  <th className="pb-2 text-right">Unbilled</th>
                  <th className="pb-2 text-right">Revenue</th>
                  <th className="pb-2 text-right">Cost</th>
                  <th className="pb-2 text-right">Margin</th>
                  <th className="pb-2 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody>
                {report.projects.map((row) => (
                  <tr key={row.projectId} className="border-b">
                    <td className="py-2 font-medium">
                      <Link href={`/projects/${row.projectId}`} className="hover:underline">
                        {row.projectName}
                      </Link>
                    </td>
                    <td className="py-2">{row.clientName}</td>
                    <td className="py-2">
                      <Badge variant="default">{row.status}</Badge>
                    </td>
                    <td className="py-2 text-right">${formatCurrency(row.billedRevenue)}</td>
                    <td className="py-2 text-right">${formatCurrency(row.unbilledRevenue)}</td>
                    <td className="py-2 text-right">${formatCurrency(row.revenue)}</td>
                    <td className="py-2 text-right">${formatCurrency(row.cost)}</td>
                    <td className="py-2 text-right">${formatCurrency(row.margin)}</td>
                    <td className="py-2 text-right">
                      <Badge variant={marginVariant(row.marginPct)}>
                        {formatMarginPct(row.marginPct)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {report.projects.length === 0 && (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No projects found for this organization.
            </p>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
