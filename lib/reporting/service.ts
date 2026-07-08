import type { BillingModel, ProjectStatus } from "@prisma/client";
import { resolveEntryBillRate, resolveEntryCostRate } from "@/lib/billing/service";
import type { ExpenseCategorySummary } from "@/lib/expenses/summary";
import { getExpenseSummaryByCategory } from "@/lib/expenses/summary";
import {
  sumMilestoneAmounts,
  validateMilestoneTotals,
} from "@/lib/milestones/validation";
import {
  computeInvoiceBasedRevenue,
  isInvoiceBasedRevenueModel,
} from "@/lib/reporting/contract-profitability";
import { withOrgContext } from "@/lib/tenancy/with-org-context";

export type ProjectProfitabilityRow = {
  projectId: string;
  projectName: string;
  clientName: string;
  status: ProjectStatus;
  billingModel: BillingModel;
  contractAmount: number | null;
  milestoneTotal: number | null;
  contractRemaining: number | null;
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
  expenseByCategory: ExpenseCategorySummary[];
};

export type ProjectExpenseCategoryRow = {
  categoryId: string | null;
  categoryName: string;
  categoryCode: string | null;
  total: number;
  billed: number;
  unbilled: number;
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
  expenseByCategory: ProjectExpenseCategoryRow[];
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
type DetailExpenseEntry = ProfitabilityExpenseEntry & {
  userId: string;
  categoryId: string | null;
  categoryName: string;
  categoryCode: string | null;
};

type ProfitabilityProject = {
  id: string;
  name: string;
  clientName: string;
  status: ProjectStatus;
  billingModel: BillingModel;
  contractAmount: number | null;
  invoicedTotal: number;
  milestones: Array<{ amount: number; status: "PLANNED" | "READY" | "INVOICED" }>;
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
  billingModel: BillingModel,
  contractAmount: number | null,
  invoicedTotal: number,
  milestones: Array<{ amount: number; status: "PLANNED" | "READY" | "INVOICED" }>,
  billRateOverride: number | null,
  timeEntries: DetailTimeEntry[],
  expenses: DetailExpenseEntry[],
  profilesByUser: Map<string, ResourceProfileRates>,
  userNames: Map<string, string>,
): ProjectProfitabilityDetail {
  const projectTime = timeEntries.filter((entry) => entry.projectId === projectId);
  const projectExpenses = expenses.filter((expense) => expense.projectId === projectId);
  const invoiceProject = isInvoiceBasedRevenueModel(billingModel);
  const invoiceRevenue = invoiceProject
    ? computeInvoiceBasedRevenue({
        billingModel,
        contractAmount,
        invoicedTotal,
        milestones,
      })
    : null;

  let billedRevenue = invoiceRevenue?.billedRevenue ?? 0;
  let unbilledRevenue = invoiceRevenue?.unbilledRevenue ?? 0;
  let totalCost = 0;
  let timeBilled = invoiceRevenue?.billedRevenue ?? 0;
  let timeUnbilled = invoiceRevenue?.unbilledRevenue ?? 0;
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

    if (entry.billable && !invoiceProject) {
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

  const expenseByCategoryMap = new Map<string, ProjectExpenseCategoryRow>();
  for (const expense of projectExpenses) {
    const key = expense.categoryId ?? "__uncategorized__";
    const row = expenseByCategoryMap.get(key) ?? {
      categoryId: expense.categoryId,
      categoryName: expense.categoryName,
      categoryCode: expense.categoryCode,
      total: 0,
      billed: 0,
      unbilled: 0,
    };
    row.total += expense.amount;
    if (expense.billable) {
      if (expense.billingStatus === "INVOICED") {
        row.billed += expense.amount;
      } else {
        row.unbilled += expense.amount;
      }
    }
    expenseByCategoryMap.set(key, row);
  }

  const expenseByCategory = [...expenseByCategoryMap.values()].sort((a, b) => b.total - a.total);

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
    expenseByCategory,
    byPerson,
  };
}

export function computeProjectProfitability(
  projects: ProfitabilityProject[],
  timeEntries: ProfitabilityTimeEntry[],
  expenses: ProfitabilityExpenseEntry[],
  profilesByUser: Map<string, ResourceProfileRates>,
): { projects: ProjectProfitabilityRow[]; summary: ProfitabilitySummary } {
  const billedRevenueByProject = new Map<string, number>();
  const unbilledRevenueByProject = new Map<string, number>();
  const costByProject = new Map<string, number>();
  const projectById = new Map(projects.map((project) => [project.id, project]));

  for (const entry of timeEntries) {
    const profile = profilesByUser.get(entry.userId);
    const laborCost = entry.hours * resolveEntryCostRate(
      profile ? { costRate: profile.costRate } : null,
    );
    costByProject.set(
      entry.projectId,
      (costByProject.get(entry.projectId) ?? 0) + laborCost,
    );

    const project = projectById.get(entry.projectId);
    if (entry.billable && (!project || !isInvoiceBasedRevenueModel(project.billingModel))) {
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
    const expenseBilled = billedRevenueByProject.get(project.id) ?? 0;
    const expenseUnbilled = unbilledRevenueByProject.get(project.id) ?? 0;

    let billedRevenue: number;
    let unbilledRevenue: number;

    if (isInvoiceBasedRevenueModel(project.billingModel)) {
      const invoiceBasedRevenue = computeInvoiceBasedRevenue({
        billingModel: project.billingModel,
        contractAmount: project.contractAmount,
        invoicedTotal: project.invoicedTotal,
        milestones: project.milestones,
      });
      billedRevenue = roundCurrency(invoiceBasedRevenue.billedRevenue + expenseBilled);
      unbilledRevenue = roundCurrency(invoiceBasedRevenue.unbilledRevenue + expenseUnbilled);
    } else {
      billedRevenue = roundCurrency(expenseBilled);
      unbilledRevenue = roundCurrency(expenseUnbilled);
    }

    const revenue = roundCurrency(billedRevenue + unbilledRevenue);
    const cost = roundCurrency(costByProject.get(project.id) ?? 0);
    const margin = roundCurrency(revenue - cost);
    const milestoneTotal =
      project.billingModel === "MILESTONE" ? sumMilestoneAmounts(project.milestones) : null;
    let contractRemaining: number | null = null;
    if (project.contractAmount != null && isInvoiceBasedRevenueModel(project.billingModel)) {
      if (project.billingModel === "MILESTONE") {
        contractRemaining = validateMilestoneTotals(
          project.milestones,
          project.contractAmount,
        ).remaining;
      } else {
        contractRemaining = roundCurrency(project.contractAmount - project.invoicedTotal);
      }
    }
    return {
      projectId: project.id,
      projectName: project.name,
      clientName: project.clientName,
      status: project.status,
      billingModel: project.billingModel,
      contractAmount: project.contractAmount,
      milestoneTotal,
      contractRemaining,
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
  const core = await withOrgContext(organizationId, async (tx) => {
    const [projects, timeEntries, expenses, profiles, invoiceTotals, allMilestones] =
      await Promise.all([
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
      tx.invoice.groupBy({
        by: ["projectId"],
        where: { organizationId },
        _sum: { subtotal: true },
      }),
      tx.milestone.findMany({
        where: { organizationId },
        select: { projectId: true, amount: true, status: true },
      }),
    ]);

    const invoicedByProject = new Map(
      invoiceTotals.map((row) => [row.projectId, Number(row._sum.subtotal ?? 0)]),
    );
    const milestonesByProject = new Map<
      string,
      Array<{ amount: number; status: "PLANNED" | "READY" | "INVOICED" }>
    >();
    for (const milestone of allMilestones) {
      const list = milestonesByProject.get(milestone.projectId) ?? [];
      list.push({
        amount: Number(milestone.amount),
        status: milestone.status,
      });
      milestonesByProject.set(milestone.projectId, list);
    }

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
        billingModel: project.billingModel,
        contractAmount:
          project.contractAmount != null ? Number(project.contractAmount) : null,
        invoicedTotal: invoicedByProject.get(project.id) ?? 0,
        milestones: milestonesByProject.get(project.id) ?? [],
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

  const expenseByCategory = await getExpenseSummaryByCategory(organizationId);
  return { ...core, expenseByCategory };
}

export async function getProjectProfitabilityDetail(
  organizationId: string,
  projectId: string,
): Promise<ProjectProfitabilityDetail | null> {
  return withOrgContext(organizationId, async (tx) => {
    const project = await tx.project.findFirst({
      where: { id: projectId, organizationId },
      select: {
        id: true,
        billRateOverride: true,
        billingModel: true,
        contractAmount: true,
      },
    });
    if (!project) return null;

    const [timeEntries, expenses, profiles, invoiced, milestones] = await Promise.all([
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
          categoryId: true,
          category: { select: { name: true, code: true } },
        },
      }),
      tx.resourceProfile.findMany({
        where: { organizationId },
        select: { userId: true, billRate: true, costRate: true },
      }),
      tx.invoice.aggregate({
        where: { organizationId, projectId },
        _sum: { subtotal: true },
      }),
      tx.milestone.findMany({
        where: { organizationId, projectId },
        select: { amount: true, status: true },
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
      project.billingModel,
      project.contractAmount != null ? Number(project.contractAmount) : null,
      Number(invoiced._sum.subtotal ?? 0),
      milestones.map((milestone) => ({
        amount: Number(milestone.amount),
        status: milestone.status,
      })),
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
        categoryId: expense.categoryId,
        categoryName: expense.category?.name ?? "Uncategorized",
        categoryCode: expense.category?.code ?? null,
      })),
      profilesByUser,
      userNames,
    );
  });
}
