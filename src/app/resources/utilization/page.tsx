import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { getUtilizationReport } from "@/lib/resources/service";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/card";

export default async function UtilizationPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
  });
  const report = await getUtilizationReport(session.user.organizationId, new Date());

  return (
    <AppShell orgName={org?.name ?? ""} userName={session.user.name}>
      <h1 className="mb-6 text-2xl font-bold">Utilization</h1>
      <Card>
        <CardHeader>
          <CardTitle>This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2">Person</th>
                  <th className="pb-2">Capacity</th>
                  <th className="pb-2">Allocated</th>
                  <th className="pb-2">Actual</th>
                  <th className="pb-2">Utilization</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.map((row) => (
                  <tr key={row.userId} className="border-b">
                    <td className="py-2 font-medium">{row.userName}</td>
                    <td className="py-2">{row.capacityHours}h</td>
                    <td className="py-2">{row.allocatedHours}h</td>
                    <td className="py-2">{row.actualHours}h</td>
                    <td className="py-2">{row.utilizationPct}%</td>
                    <td className="py-2">
                      {row.overAllocated ? (
                        <Badge variant="warning">Over-allocated</Badge>
                      ) : (
                        <Badge variant="success">OK</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {report.length === 0 && (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No resource profiles configured. Add profiles on the Resources page.
            </p>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
