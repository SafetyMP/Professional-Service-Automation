import { withOrgContext } from "@/lib/tenancy/with-org-context";
import { getUtilizationReport } from "@/lib/resources/service";
import { resolveEntryBillRate } from "@/lib/billing/service";

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function getDashboardMetrics(organizationId: string) {
  const utilization = await getUtilizationReport(organizationId, new Date());

  return withOrgContext(organizationId, async (tx) => {
    const [
      activeProjects,
      unbilledWip,
      unbilledExpenseWip,
      unbilledTimeEntries,
      resourceProfiles,
      totalApprovedHours,
      budgetProjects,
    ] = await Promise.all([
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
      tx.expenseEntry.aggregate({
        where: {
          organizationId,
          status: "APPROVED",
          billingStatus: "UNBILLED",
          billable: true,
        },
        _sum: { amount: true },
      }),
      tx.timeEntry.findMany({
        where: {
          organizationId,
          status: "APPROVED",
          billingStatus: "UNBILLED",
          billable: true,
        },
        select: {
          userId: true,
          hours: true,
          project: { select: { billRateOverride: true } },
        },
      }),
      tx.resourceProfile.findMany({
        where: { organizationId },
        select: { userId: true, billRate: true },
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

    const profileByUser = new Map(
      resourceProfiles.map((profile) => [profile.userId, profile]),
    );

    const unbilledTimeWip = roundCurrency(
      unbilledTimeEntries.reduce((sum, entry) => {
        const rate = resolveEntryBillRate(
          entry.project,
          profileByUser.get(entry.userId),
        );
        return sum + Number(entry.hours) * rate;
      }, 0),
    );

    const unbilledExpenseAmount = Number(unbilledExpenseWip._sum.amount ?? 0);

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
      unbilledTimeWip,
      unbilledExpenseWip: unbilledExpenseAmount,
      unbilledTotalWip: roundCurrency(unbilledTimeWip + unbilledExpenseAmount),
      totalApprovedHours: Number(totalApprovedHours._sum.hours ?? 0),
      avgUtilization,
      overAllocated,
      projectBurn,
    };
  });
}
