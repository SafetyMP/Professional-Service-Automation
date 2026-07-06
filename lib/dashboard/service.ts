import { withOrgContext } from "@/lib/tenancy/with-org-context";
import { getUtilizationReport } from "@/lib/resources/service";

export async function getDashboardMetrics(organizationId: string) {
  const utilization = await getUtilizationReport(organizationId, new Date());

  return withOrgContext(organizationId, async (tx) => {
    const [activeProjects, unbilledWip, totalApprovedHours, budgetProjects] =
      await Promise.all([
        tx.project.count({ where: { organizationId, status: "ACTIVE" } }),
        tx.timeEntry.aggregate({
          where: {
            organizationId,
            status: "APPROVED",
            billingStatus: "UNBILLED",
            billable: true,
          },
          _sum: { hours: true },
        }),
        tx.timeEntry.aggregate({
          where: { organizationId, status: "APPROVED" },
          _sum: { hours: true },
        }),
        tx.project.findMany({
          where: { organizationId, status: "ACTIVE", budgetHours: { not: null } },
          include: {
            timeEntries: {
              where: { status: { in: ["APPROVED", "SUBMITTED"] } },
            },
          },
        }),
      ]);

    const avgUtilization =
      utilization.length > 0
        ? Math.round(
            utilization.reduce((s, u) => s + u.utilizationPct, 0) / utilization.length,
          )
        : 0;

    const overAllocated = utilization.filter((u) => u.overAllocated).length;

    const projectBurn = budgetProjects.map((p) => {
      const logged = p.timeEntries.reduce((s, t) => s + Number(t.hours), 0);
      const budget = Number(p.budgetHours ?? 0);
      return {
        projectId: p.id,
        projectName: p.name,
        loggedHours: logged,
        budgetHours: budget,
        burnPct: budget > 0 ? Math.round((logged / budget) * 100) : 0,
      };
    });

    return {
      activeProjects,
      unbilledWipHours: Number(unbilledWip._sum.hours ?? 0),
      totalApprovedHours: Number(totalApprovedHours._sum.hours ?? 0),
      avgUtilization,
      overAllocated,
      projectBurn,
    };
  });
}
