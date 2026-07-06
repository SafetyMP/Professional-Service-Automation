import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { AppShell } from "@/components/layout/app-shell";
import { getDashboardMetrics } from "@/lib/dashboard/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
  });
  const metrics = await getDashboardMetrics(session.user.organizationId);

  return (
    <AppShell orgName={org?.name ?? "Organization"} userName={session.user.name}>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics.activeProjects}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Avg Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics.avgUtilization}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Unbilled WIP (hrs)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics.unbilledWipHours}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-[var(--color-muted-foreground)]">
              Over-allocated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics.overAllocated}</p>
          </CardContent>
        </Card>
      </div>
      {metrics.projectBurn.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Project Burn</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2">Project</th>
                    <th className="pb-2">Logged</th>
                    <th className="pb-2">Budget</th>
                    <th className="pb-2">Burn %</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.projectBurn.map((p) => (
                    <tr key={p.projectId} className="border-b">
                      <td className="py-2">{p.projectName}</td>
                      <td className="py-2">{p.loggedHours}h</td>
                      <td className="py-2">{p.budgetHours}h</td>
                      <td className="py-2">{p.burnPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
