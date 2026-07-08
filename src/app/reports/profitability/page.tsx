import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { getProjectProfitabilityReport } from "@/lib/reporting/service";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/utils/format";

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
      <PageHeader
        title="Project Profitability"
        description="Revenue from approved billable time and expenses. Billed revenue is on invoices; unbilled is approved work not yet invoiced."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Billed Revenue"
          value={`$${formatCurrency(report.summary.billedRevenue)}`}
          hint="On invoices"
          accent="primary"
        />
        <StatCard
          label="Unbilled Revenue"
          value={`$${formatCurrency(report.summary.unbilledRevenue)}`}
          hint="Approved, not yet invoiced"
          accent="warning"
        />
        <StatCard
          label="Total Revenue"
          value={`$${formatCurrency(report.summary.revenue)}`}
          hint="Billed + unbilled"
          accent="info"
        />
        <StatCard
          label="Total Cost"
          value={`$${formatCurrency(report.summary.cost)}`}
          accent="default"
        />
        <StatCard
          label="Total Margin"
          value={`$${formatCurrency(report.summary.margin)}`}
          accent="success"
        />
        <StatCard
          label="Overall Margin %"
          value={formatPercent(report.summary.marginPct)}
          accent="primary"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By Project</CardTitle>
        </CardHeader>
        <CardContent>
          {report.projects.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No project data"
              description="Create projects and log approved time to see profitability."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Billed</TableHead>
                  <TableHead className="text-right">Unbilled</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.projects.map((row) => (
                  <TableRow key={row.projectId}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/projects/${row.projectId}`}
                        className="hover:text-[var(--color-primary)]"
                      >
                        {row.projectName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-[var(--color-muted-foreground)]">
                      {row.clientName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.status}</Badge>
                    </TableCell>
                    <TableCell className="tabular-nums text-right">
                      ${formatCurrency(row.billedRevenue)}
                    </TableCell>
                    <TableCell className="tabular-nums text-right">
                      ${formatCurrency(row.unbilledRevenue)}
                    </TableCell>
                    <TableCell className="tabular-nums text-right font-medium">
                      ${formatCurrency(row.revenue)}
                    </TableCell>
                    <TableCell className="tabular-nums text-right">
                      ${formatCurrency(row.cost)}
                    </TableCell>
                    <TableCell className="tabular-nums text-right">
                      ${formatCurrency(row.margin)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={marginVariant(row.marginPct)}>
                        {formatPercent(row.marginPct)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
