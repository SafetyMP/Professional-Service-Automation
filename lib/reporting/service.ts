import type { ProjectStatus } from "@prisma/client";
import { resolveEntryBillRate, resolveEntryCostRate } from "@/lib/billing/service";
import { withOrgContext } from "@/lib/tenancy/with-org-context";

export type ProjectProfitabilityRow = {
  projectId: string;
  projectName: string;
  clientName: string;
  status: ProjectStatus;
  revenue: number;
  billedRevenue: number;
  unbilledRevenue: number;
  cost: number;
  margin: number;
  marginPct: number | null;
};

export type ProfitabilitySummary = {
  revenue: number;
  billedRevenue: number;
  unbilledRevenue: number;
  cost: number;
  margin: number;
  marginPct: number | null;
};

export type ProjectProfitabilityReport = {
  projects: ProjectProfitabilityRow[];
  summary: ProfitabilitySummary;
};

export type RevenueBreakdown = {
  billed: number;
  unbilled: number;
  total: number;
};

export type PersonProfitabilityRow = {
  userId: string;
  userName: string;
  hours: number;
  revenue: number;
  billedRevenue: number;
  unbilledRevenue: number;
  cost: number;
  margin: number;
};

export type ProjectProfitabilityDetail = {
  summary: ProfitabilitySummary;
  timeRevenue: RevenueBreakdown;
  expenseRevenue: RevenueBreakdown;
  byPerson: PersonProfitabilityRow[];
};

type ResourceProfileRates = {
  billRate: number;
  costRate: number;
};

type ProfitabilityTimeEntry = {
  projectId: string;
  userId: string;
  hours: number;
  billable: boolean;
  billingStatus: "UNBILLED" | "INVOICED";
  billRateOverride: number | null;
};

type ProfitabilityExpenseEntry = {
  projectId: string;
  amount: number;
  billable: boolean;
  billingStatus: "UNBILLED" | "INVOICED";
};

type DetailTimeEntry = ProfitabilityTimeEntry & { userName: string };
type DetailExpenseEntry = ProfitabilityExpenseEntry & { userId: string };

type ProfitabilityProject = {
  id: string;
  name: string;
  clientName: string;
  status: ProjectStatus;
};

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildSummary(rows: ProjectProfitabilityRow[]): ProfitabilitySummary {
  const billedRevenue = roundCurrency(rows.reduce((sum, row) => sum + row.billedRevenue, 0));
  const unbilledRevenue = roundCurrency(rows.reduce((sum, row) => sum + row.unbilledRevenue, 0));
  const revenue = roundCurrency(billedRevenue + unbilledRevenue);
  const cost = roundCurrency(rows.reduce((sum, row) => sum + row.cost, 0));
  const margin = roundCurrency(revenue - cost);
  return {
    revenue,
    billedRevenue,
    unbilledRevenue,
    cost,
    margin,
    marginPct: revenue > 0 ? Math.round((margin / revenue) * 100) : null,
  };
}

function addBillableRevenue(
  billedByProject: Map<string, number>,
  unbilledByProject: Map<string, number>,
  projectId: string,
  amount: number,
  billingStatus: "UNBILLED" | "INVOICED",
) {
  const target = billingStatus === "INVOICED" ? billedByProject : unbilledByProject;
  target.set(projectId, (target.get(projectId) ?? 0) + amount);
}

function buildRevenueBreakdown(billed: number, unbilled: number): RevenueBreakdown {
  return {
    billed: roundCurrency(billed),
    unbilled: roundCurrency(unbilled),
    total: roundCurrency(billed + unbilled),
  };
}

function buildDetailSummary(
  billedRevenue: number,
  unbilledRevenue: number,
  cost: number,
): ProfitabilitySummary {
  const revenue = roundCurrency(billedRevenue + unbilledRevenue);
  const margin = roundCurrency(revenue - cost);
  return {
    revenue,
    billedRevenue: roundCurrency(billedRevenue),
    unbilledRevenue: roundCurrency(unbilledRevenue),
    cost: roundCurrency(cost),
    margin,
    marginPct: revenue > 0 ? Math.round((margin / revenue) * 100) : null,
  };
}

export function computeProjectProfitabilityDetail(
  projectId: string,
  billRateOverride: number | null,
  timeEntries: DetailTimeEntry[],
  expenses: DetailExpenseEntry[],
  profilesByUser: Map<string, ResourceProfileRates>,
  userNames: Map<string, string>,
): ProjectProfitabilityDetail {
  const projectTime = timeEntries.filter((entry) => entry.projectId === projectId);
  const projectExpenses = expenses.filter((expense) => expense.projectId === projectId);

  let billedRevenue = 0;
  let unbilledRevenue = 0;
  let totalCost = 0;
  let timeBilled = 0;
  let timeUnbilled = 0;
  let expenseBilled = 0;
  let expenseUnbilled = 0;

  const personStats = new Map<
    string,
    {
      hours: number;
      billedRevenue: number;
      unbilledRevenue: number;
      cost: number;
    }
  >();

  function ensurePerson(userId: string) {
    if (!personStats.has(userId)) {
      personStats.set(userId, {
        hours: 0,
        billedRevenue: 0,
        unbilledRevenue: 0,
        cost: 0,
      });
    }
    return personStats.get(userId)!;
  }

  for (const entry of projectTime) {
    const profile = profilesByUser.get(entry.userId);
    const person = ensurePerson(entry.userId);
    const laborCost = entry.hours * resolveEntryCostRate(
      profile ? { costRate: profile.costRate } : null,
    );

    person.hours += entry.hours;
    person.cost += laborCost;
    totalCost += laborCost;

    if (entry.billable) {
      const billRate = resolveEntryBillRate(
        { billRateOverride: billRateOverride ?? entry.billRateOverride },
        profile ? { billRate: profile.billRate } : null,
      );
      const amount = entry.hours * billRate;
      if (entry.billingStatus === "INVOICED") {
        billedRevenue += amount;
        timeBilled += amount;
        person.billedRevenue += amount;
      } else {
        unbilledRevenue += amount;
        timeUnbilled += amount;
        person.unbilledRevenue += amount;
      }
    }
  }

  for (const expense of projectExpenses) {
    const person = ensurePerson(expense.userId);
    person.cost += expense.amount;
    totalCost += expense.amount;

    if (expense.billable) {
      if (expense.billingStatus === "INVOICED") {
        billedRevenue += expense.amount;
        expenseBilled += expense.amount;
        person.billedRevenue += expense.amount;
      } else {
        unbilledRevenue += expense.amount;
        expenseUnbilled += expense.amount;
        person.unbilledRevenue += expense.amount;
      }
    }
  }

  const byPerson = [...personStats.entries()]
    .map(([userId, stats]) => {
      const revenue = roundCurrency(stats.billedRevenue + stats.unbilledRevenue);
      const cost = roundCurrency(stats.cost);
      return {
        userId,
        userName: userNames.get(userId) ?? "Unknown",
        hours: roundCurrency(stats.hours),
        revenue,
        billedRevenue: roundCurrency(stats.billedRevenue),
        unbilledRevenue: roundCurrency(stats.unbilledRevenue),
        cost,
        margin: roundCurrency(revenue - cost),
      };
    })
    .sort((a, b) => b.revenue - a.revenue || a.userName.localeCompare(b.userName));

  return {
    summary: buildDetailSummary(billedRevenue, unbilledRevenue, totalCost),
    timeRevenue: buildRevenueBreakdown(timeBilled, timeUnbilled),
    expenseRevenue: buildRevenueBreakdown(expenseBilled, expenseUnbilled),
    byPerson,
  };
}

export function computeProjectProfitability(
  projects: ProfitabilityProject[],
  timeEntries: ProfitabilityTimeEntry[],
  expenses: ProfitabilityExpenseEntry[],
  profilesByUser: Map<string, ResourceProfileRates>,
): ProjectProfitabilityReport {
  const billedRevenueByProject = new Map<string, number>();
  const unbilledRevenueByProject = new Map<string, number>();
  const costByProject = new Map<string, number>();

  for (const entry of timeEntries) {
    const profile = profilesByUser.get(entry.userId);
    const laborCost = entry.hours * resolveEntryCostRate(
      profile ? { costRate: profile.costRate } : null,
    );
    costByProject.set(
      entry.projectId,
      (costByProject.get(entry.projectId) ?? 0) + laborCost,
    );

    if (entry.billable) {
      const billRate = resolveEntryBillRate(
        { billRateOverride: entry.billRateOverride },
        profile ? { billRate: profile.billRate } : null,
      );
      addBillableRevenue(
        billedRevenueByProject,
        unbilledRevenueByProject,
        entry.projectId,
        entry.hours * billRate,
        entry.billingStatus,
      );
    }
  }

  for (const expense of expenses) {
    costByProject.set(
      expense.projectId,
      (costByProject.get(expense.projectId) ?? 0) + expense.amount,
    );

    if (expense.billable) {
      addBillableRevenue(
        billedRevenueByProject,
        unbilledRevenueByProject,
        expense.projectId,
        expense.amount,
        expense.billingStatus,
      );
    }
  }

  const rows = projects.map((project) => {
    const billedRevenue = roundCurrency(billedRevenueByProject.get(project.id) ?? 0);
    const unbilledRevenue = roundCurrency(unbilledRevenueByProject.get(project.id) ?? 0);
    const revenue = roundCurrency(billedRevenue + unbilledRevenue);
    const cost = roundCurrency(costByProject.get(project.id) ?? 0);
    const margin = roundCurrency(revenue - cost);
    return {
      projectId: project.id,
      projectName: project.name,
      clientName: project.clientName,
      status: project.status,
      revenue,
      billedRevenue,
      unbilledRevenue,
      cost,
      margin,
      marginPct: revenue > 0 ? Math.round((margin / revenue) * 100) : null,
    };
  });

  rows.sort((a, b) => b.revenue - a.revenue || a.projectName.localeCompare(b.projectName));

  return {
    projects: rows,
    summary: buildSummary(rows),
  };
}

export async function getProjectProfitabilityReport(
  organizationId: string,
): Promise<ProjectProfitabilityReport> {
  return withOrgContext(organizationId, async (tx) => {
    const [projects, timeEntries, expenses, profiles] = await Promise.all([
      tx.project.findMany({
        where: { organizationId },
        include: { client: true },
        orderBy: { name: "asc" },
      }),
      tx.timeEntry.findMany({
        where: { organizationId, status: "APPROVED" },
        select: {
          projectId: true,
          userId: true,
          hours: true,
          billable: true,
          billingStatus: true,
          project: { select: { billRateOverride: true } },
        },
      }),
      tx.expenseEntry.findMany({
        where: { organizationId, status: "APPROVED" },
        select: { projectId: true, amount: true, billable: true, billingStatus: true },
      }),
      tx.resourceProfile.findMany({
        where: { organizationId },
        select: { userId: true, billRate: true, costRate: true },
      }),
    ]);

    const profilesByUser = new Map(
      profiles.map((profile) => [
        profile.userId,
        {
          billRate: Number(profile.billRate),
          costRate: Number(profile.costRate),
        },
      ]),
    );

    return computeProjectProfitability(
      projects.map((project) => ({
        id: project.id,
        name: project.name,
        clientName: project.client.name,
        status: project.status,
      })),
      timeEntries.map((entry) => ({
        projectId: entry.projectId,
        userId: entry.userId,
        hours: Number(entry.hours),
        billable: entry.billable,
        billingStatus: entry.billingStatus,
        billRateOverride:
          entry.project.billRateOverride != null
            ? Number(entry.project.billRateOverride)
            : null,
      })),
      expenses.map((expense) => ({
        projectId: expense.projectId,
        amount: Number(expense.amount),
        billable: expense.billable,
        billingStatus: expense.billingStatus,
      })),
      profilesByUser,
    );
  });
}

export async function getProjectProfitabilityDetail(
  organizationId: string,
  projectId: string,
): Promise<ProjectProfitabilityDetail | null> {
  return withOrgContext(organizationId, async (tx) => {
    const project = await tx.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true, billRateOverride: true },
    });
    if (!project) return null;

    const [timeEntries, expenses, profiles] = await Promise.all([
      tx.timeEntry.findMany({
        where: { organizationId, projectId, status: "APPROVED" },
        select: {
          projectId: true,
          userId: true,
          hours: true,
          billable: true,
          billingStatus: true,
          user: { select: { name: true } },
        },
      }),
      tx.expenseEntry.findMany({
        where: { organizationId, projectId, status: "APPROVED" },
        select: {
          projectId: true,
          userId: true,
          amount: true,
          billable: true,
          billingStatus: true,
        },
      }),
      tx.resourceProfile.findMany({
        where: { organizationId },
        select: { userId: true, billRate: true, costRate: true },
      }),
    ]);

    const expenseUserIds = [...new Set(expenses.map((expense) => expense.userId))];
    const expenseUsers =
      expenseUserIds.length > 0
        ? await tx.user.findMany({
            where: { id: { in: expenseUserIds } },
            select: { id: true, name: true },
          })
        : [];

    const profilesByUser = new Map(
      profiles.map((profile) => [
        profile.userId,
        {
          billRate: Number(profile.billRate),
          costRate: Number(profile.costRate),
        },
      ]),
    );

    const userNames = new Map<string, string>([
      ...timeEntries.map((entry) => [entry.userId, entry.user.name] as const),
      ...expenseUsers.map((user) => [user.id, user.name] as const),
    ]);

    return computeProjectProfitabilityDetail(
      projectId,
      project.billRateOverride != null ? Number(project.billRateOverride) : null,
      timeEntries.map((entry) => ({
        projectId: entry.projectId,
        userId: entry.userId,
        userName: entry.user.name,
        hours: Number(entry.hours),
        billable: entry.billable,
        billingStatus: entry.billingStatus,
        billRateOverride: null,
      })),
      expenses.map((expense) => ({
        projectId: expense.projectId,
        userId: expense.userId,
        amount: Number(expense.amount),
        billable: expense.billable,
        billingStatus: expense.billingStatus,
      })),
      profilesByUser,
      userNames,
    );
  });
}
