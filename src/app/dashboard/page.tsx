import { redirect } from "next/navigation";
import {
  AlertTriangle,
  Briefcase,
  Clock,
  DollarSign,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { AppShell } from "@/components/layout/app-shell";
import { getDashboardMetrics } from "@/lib/dashboard/service";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/format";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
  });
  const metrics = await getDashboardMetrics(session.user.organizationId);

  return (
    <AppShell orgName={org?.name ?? "Organization"} userName={session.user.name}>
      <PageHeader
        title="Dashboard"
        description="Firm-wide KPIs — utilization, WIP, and project burn at a glance."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Active Projects"
          value={metrics.activeProjects}
          icon={Briefcase}
          accent="primary"
        />
        <StatCard
          label="Avg Utilization"
          value={`${metrics.avgUtilization}%`}
          icon={TrendingUp}
          accent="success"
        />
        <StatCard
          label="Total Unbilled WIP"
          value={`$${formatCurrency(metrics.unbilledTotalWip)}`}
          hint="Time + expenses ready to bill"
          icon={DollarSign}
          accent="warning"
        />
        <StatCard
          label="Unbilled Time WIP"
          value={`$${formatCurrency(metrics.unbilledTimeWip)}`}
          hint={`${metrics.unbilledWipHours} hrs approved`}
          icon={Clock}
          accent="info"
        />
        <StatCard
          label="Unbilled Expenses"
          value={`$${formatCurrency(metrics.unbilledExpenseWip)}`}
          icon={Receipt}
          accent="default"
        />
        <StatCard
          label="Over-allocated"
          value={metrics.overAllocated}
          icon={AlertTriangle}
          accent={metrics.overAllocated > 0 ? "warning" : "default"}
        />
      </div>

      {metrics.projectBurn.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Project Burn</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Logged</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Burn %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.projectBurn.map((p) => (
                  <TableRow key={p.projectId}>
                    <TableCell className="font-medium">{p.projectName}</TableCell>
                    <TableCell className="tabular-nums text-right">{p.loggedHours}h</TableCell>
                    <TableCell className="tabular-nums text-right">{p.budgetHours}h</TableCell>
                    <TableCell className="tabular-nums text-right">{p.burnPct}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
