import type { ExpenseStatus, Prisma } from "@prisma/client";
import { withOrgContext } from "@/lib/tenancy/with-org-context";
import { writeAuditLog } from "@/lib/audit/write-audit-log";

export async function listMyExpenseEntries(
  organizationId: string,
  userId: string,
) {
  return withOrgContext(organizationId, (tx) =>
    tx.expenseEntry.findMany({
      where: { organizationId, userId },
      include: { project: true },
      orderBy: { expenseDate: "desc" },
    }),
  );
}

export async function listPendingExpenseApprovals(organizationId: string) {
  return withOrgContext(organizationId, (tx) =>
    tx.expenseEntry.findMany({
      where: { organizationId, status: "SUBMITTED" },
      include: { user: true, project: true },
      orderBy: { expenseDate: "desc" },
    }),
  );
}

export async function listApprovedBillableExpenses(
  organizationId: string,
  projectId?: string,
) {
  return withOrgContext(organizationId, (tx) =>
    tx.expenseEntry.findMany({
      where: {
        organizationId,
        projectId,
        status: "APPROVED",
        billingStatus: "UNBILLED",
        billable: true,
      },
      include: { user: true, project: true },
      orderBy: { expenseDate: "desc" },
    }),
  );
}

export async function createExpenseEntry(
  organizationId: string,
  userId: string,
  data: {
    projectId: string;
    expenseDate: Date;
    amount: number;
    description?: string;
    billable?: boolean;
  },
) {
  return withOrgContext(organizationId, (tx) =>
    tx.expenseEntry.create({
      data: {
        organizationId,
        userId,
        projectId: data.projectId,
        expenseDate: data.expenseDate,
        amount: data.amount,
        description: data.description,
        billable: data.billable ?? true,
        status: "DRAFT",
      },
    }),
  );
}

export async function submitExpenseEntry(
  organizationId: string,
  id: string,
  userId: string,
) {
  return withOrgContext(organizationId, async (tx) => {
    const entry = await tx.expenseEntry.findFirst({
      where: { id, userId, organizationId },
    });
    if (!entry) throw new Error("Expense entry not found");
    return tx.expenseEntry.update({
      where: { id },
      data: { status: "SUBMITTED" },
    });
  });
}

export async function approveExpenseEntry(
  organizationId: string,
  id: string,
  approverId: string,
) {
  return withOrgContext(organizationId, async (tx) => {
    const entry = await tx.expenseEntry.update({
      where: { id },
      data: { status: "APPROVED" },
    });
    await writeAuditLog(tx, {
      organizationId,
      userId: approverId,
      action: "EXPENSE_APPROVED",
      entityType: "ExpenseEntry",
      entityId: id,
      metadata: { amount: entry.amount.toString(), projectId: entry.projectId },
    });
    return entry;
  });
}

export async function rejectExpenseEntry(
  organizationId: string,
  id: string,
  approverId: string,
) {
  return withOrgContext(organizationId, async (tx) => {
    const entry = await tx.expenseEntry.update({
      where: { id },
      data: { status: "REJECTED" },
    });
    await writeAuditLog(tx, {
      organizationId,
      userId: approverId,
      action: "EXPENSE_REJECTED",
      entityType: "ExpenseEntry",
      entityId: id,
      metadata: { amount: entry.amount.toString(), projectId: entry.projectId },
    });
    return entry;
  });
}

export type ExpenseEntryRow = Prisma.ExpenseEntryGetPayload<{
  include: { project: true; user: true };
}>;

export type ExpenseStatusType = ExpenseStatus;
