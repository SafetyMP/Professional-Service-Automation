import type { ExpenseStatus, Prisma } from "@prisma/client";
import { withOrgContext } from "@/lib/tenancy/with-org-context";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { saveExpenseReceipt } from "@/lib/expenses/receipt-storage";

export {
  createExpenseCategory,
  ensureDefaultExpenseCategories,
  listExpenseCategories,
  DEFAULT_EXPENSE_CATEGORIES,
} from "@/lib/expenses/categories";

export async function listMyExpenseEntries(
  organizationId: string,
  userId: string,
) {
  return withOrgContext(organizationId, (tx) =>
    tx.expenseEntry.findMany({
      where: { organizationId, userId },
      include: { project: true, category: true },
      orderBy: { expenseDate: "desc" },
    }),
  );
}

export async function listPendingExpenseApprovals(organizationId: string) {
  return withOrgContext(organizationId, (tx) =>
    tx.expenseEntry.findMany({
      where: { organizationId, status: "SUBMITTED" },
      include: { user: true, project: true, category: true },
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
      include: { user: true, project: true, category: true },
      orderBy: { expenseDate: "desc" },
    }),
  );
}

export async function getExpenseEntry(organizationId: string, id: string) {
  return withOrgContext(organizationId, (tx) =>
    tx.expenseEntry.findFirst({
      where: { id, organizationId },
      include: { category: true },
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
    categoryId?: string;
    receipt?: File;
  },
) {
  if (data.amount <= 0) throw new Error("Amount must be greater than zero");

  return withOrgContext(organizationId, async (tx) => {
    if (data.categoryId) {
      const category = await tx.expenseCategory.findFirst({
        where: { id: data.categoryId, organizationId, archived: false },
      });
      if (!category) throw new Error("Expense category not found");
    }

    const entry = await tx.expenseEntry.create({
      data: {
        organizationId,
        userId,
        projectId: data.projectId,
        categoryId: data.categoryId,
        expenseDate: data.expenseDate,
        amount: data.amount,
        description: data.description,
        billable: data.billable ?? true,
        status: "DRAFT",
      },
      include: { project: true, category: true },
    });

    if (!data.receipt || data.receipt.size === 0) {
      return entry;
    }

    const stored = await saveExpenseReceipt({
      organizationId,
      expenseId: entry.id,
      file: data.receipt,
    });

    return tx.expenseEntry.update({
      where: { id: entry.id },
      data: {
        receiptFileName: stored.fileName,
        receiptMimeType: stored.mimeType,
        receiptSize: stored.size,
      },
      include: { project: true, category: true },
    });
  });
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
    const existing = await tx.expenseEntry.findFirst({
      where: { id, organizationId, status: "SUBMITTED" },
    });
    if (!existing) throw new Error("Expense entry not found or not pending approval");

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

export async function approveExpenseEntries(
  organizationId: string,
  ids: string[],
  approverId: string,
) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) {
    throw new Error("Select at least one expense to approve");
  }

  const approved = [];
  for (const id of uniqueIds) {
    approved.push(await approveExpenseEntry(organizationId, id, approverId));
  }
  return approved;
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
  include: { project: true; user: true; category: true };
}>;

export type ExpenseStatusType = ExpenseStatus;

export function formatExpenseInvoiceDescription(expense: {
  description: string | null;
  category: { name: string } | null;
  user: { name: string };
  expenseDate: Date;
}): string {
  const categoryLabel = expense.category?.name ?? "General";
  const detail = expense.description ?? "Reimbursable";
  return `Expense — ${categoryLabel} — ${detail} (${expense.user.name}, ${expense.expenseDate.toISOString().slice(0, 10)})`;
}
