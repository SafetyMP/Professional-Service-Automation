import { redirect } from "next/navigation";
import { UserCog } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { getUtilizationReport } from "@/lib/resources/service";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function UtilizationPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
  });
  const report = await getUtilizationReport(session.user.organizationId, new Date());

  return (
    <AppShell orgName={org?.name ?? ""} userName={session.user.name}>
      <PageHeader
        title="Utilization"
        description="Weekly capacity vs. allocation and actual hours across the team."
      />

      <Card>
        <CardHeader>
          <CardTitle>This Week</CardTitle>
        </CardHeader>
        <CardContent>
          {report.length === 0 ? (
            <EmptyState
              icon={UserCog}
              title="No utilization data"
              description="Add resource profiles on the Resources page to see utilization."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Person</TableHead>
                  <TableHead className="text-right">Capacity</TableHead>
                  <TableHead className="text-right">Allocated</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Utilization</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.map((row) => (
                  <TableRow key={row.userId}>
                    <TableCell className="font-medium">{row.userName}</TableCell>
                    <TableCell className="tabular-nums text-right">{row.capacityHours}h</TableCell>
                    <TableCell className="tabular-nums text-right">{row.allocatedHours}h</TableCell>
                    <TableCell className="tabular-nums text-right">{row.actualHours}h</TableCell>
                    <TableCell className="tabular-nums text-right font-medium">
                      {row.utilizationPct}%
                    </TableCell>
                    <TableCell>
                      {row.overAllocated ? (
                        <Badge variant="warning">Over-allocated</Badge>
                      ) : (
                        <Badge variant="success">OK</Badge>
                      )}
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
