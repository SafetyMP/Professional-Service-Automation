"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/rbac";
import * as clients from "@/lib/clients/service";
import * as projects from "@/lib/projects/service";
import * as time from "@/lib/time/service";
import * as resources from "@/lib/resources/service";
import * as billing from "@/lib/billing/service";
import * as expenses from "@/lib/expenses/service";
import * as milestones from "@/lib/milestones/service";
import * as accountingSettings from "@/lib/settings/accounting";
import { deleteAccountingConnection } from "@/lib/accounting/connections";
import { pushInvoiceToXero } from "@/lib/accounting/xero/push-invoice";

export async function createClientAction(formData: FormData) {
  const user = await requireSession();
  requireRole(user, "MANAGER");
  await clients.createClient(user.organizationId, {
    name: String(formData.get("name")),
    email: String(formData.get("email") || "") || undefined,
    phone: String(formData.get("phone") || "") || undefined,
  });
  revalidatePath("/clients");
}

export async function updateClientAction(formData: FormData) {
  const user = await requireSession();
  requireRole(user, "MANAGER");
  await clients.updateClient(user.organizationId, String(formData.get("id")), {
    name: String(formData.get("name")),
    email: String(formData.get("email") || "") || undefined,
    phone: String(formData.get("phone") || "") || undefined,
  });
  revalidatePath("/clients");
}

export async function archiveClientAction(id: string) {
  const user = await requireSession();
  requireRole(user, "MANAGER");
  await clients.archiveClient(user.organizationId, id);
  revalidatePath("/clients");
}

export async function createProjectAction(formData: FormData) {
  const user = await requireSession();
  requireRole(user, "MANAGER");
  await projects.createProject(user.organizationId, {
    clientId: String(formData.get("clientId")),
    name: String(formData.get("name")),
    description: String(formData.get("description") || "") || undefined,
    status: String(formData.get("status") || "DRAFT") as "DRAFT" | "ACTIVE",
    billingModel: String(formData.get("billingModel") || "TIME_AND_MATERIALS") as
      | "TIME_AND_MATERIALS"
      | "FIXED_FEE"
      | "RETAINER"
      | "MILESTONE",
    budgetHours: formData.get("budgetHours")
      ? Number(formData.get("budgetHours"))
      : undefined,
    contractAmount: formData.get("contractAmount")
      ? Number(formData.get("contractAmount"))
      : undefined,
  });
  revalidatePath("/projects");
}

export async function updateProjectAction(formData: FormData) {
  const user = await requireSession();
  requireRole(user, "MANAGER");
  await projects.updateProject(user.organizationId, String(formData.get("id")), {
    name: String(formData.get("name")),
    description: String(formData.get("description") || "") || undefined,
    status: String(formData.get("status")) as "DRAFT" | "ACTIVE" | "ON_HOLD" | "COMPLETED",
    billingModel: String(formData.get("billingModel")) as
      | "TIME_AND_MATERIALS"
      | "FIXED_FEE"
      | "RETAINER"
      | "MILESTONE",
    budgetHours: formData.get("budgetHours")
      ? Number(formData.get("budgetHours"))
      : undefined,
    contractAmount: formData.get("contractAmount")
      ? Number(formData.get("contractAmount"))
      : undefined,
  });
  revalidatePath(`/projects/${formData.get("id")}`);
  revalidatePath("/projects");
}

export async function addProjectMemberAction(formData: FormData) {
  const user = await requireSession();
  requireRole(user, "MANAGER");
  await projects.addProjectMember(
    user.organizationId,
    String(formData.get("projectId")),
    String(formData.get("userId")),
  );
  revalidatePath(`/projects/${formData.get("projectId")}`);
}

export async function createTaskAction(formData: FormData) {
  const user = await requireSession();
  requireRole(user, "MANAGER");
  const projectId = String(formData.get("projectId"));
  await projects.createTask(user.organizationId, {
    projectId,
    name: String(formData.get("name")),
    description: String(formData.get("description") || "") || undefined,
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function toggleTaskAction(taskId: string, projectId: string, completed: boolean) {
  const user = await requireSession();
  requireRole(user, "MANAGER");
  await projects.updateTask(user.organizationId, taskId, { completed });
  revalidatePath(`/projects/${projectId}`);
}

export async function createTimeEntryAction(formData: FormData) {
  const user = await requireSession();
  await time.createTimeEntry(user.organizationId, user.id, {
    projectId: String(formData.get("projectId")),
    taskId: String(formData.get("taskId") || "") || undefined,
    entryDate: new Date(String(formData.get("entryDate"))),
    hours: Number(formData.get("hours")),
    notes: String(formData.get("notes") || "") || undefined,
    billable: formData.get("billable") === "on",
  });
  revalidatePath("/time");
}

export async function submitTimeEntryAction(id: string) {
  const user = await requireSession();
  await time.submitTimeEntry(user.organizationId, id, user.id);
  revalidatePath("/time");
}

export async function approveTimeAction(id: string) {
  const user = await requireSession();
  requireRole(user, "MANAGER");
  await time.approveTimeEntry(user.organizationId, id, user.id);
  revalidatePath("/time");
}

export async function rejectTimeAction(id: string) {
  const user = await requireSession();
  requireRole(user, "MANAGER");
  await time.rejectTimeEntry(user.organizationId, id, user.id);
  revalidatePath("/time");
}

export async function upsertResourceProfileAction(formData: FormData) {
  const user = await requireSession();
  requireRole(user, "ADMIN");
  await resources.upsertResourceProfile(user.organizationId, String(formData.get("userId")), {
    weeklyCapacityHrs: Number(formData.get("weeklyCapacityHrs")),
    costRate: Number(formData.get("costRate")),
    billRate: Number(formData.get("billRate")),
    skills: String(formData.get("skills") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  });
  revalidatePath("/resources");
}

export async function createAllocationAction(formData: FormData) {
  const user = await requireSession();
  requireRole(user, "MANAGER");
  await resources.createAllocation(user.organizationId, {
    projectId: String(formData.get("projectId")),
    userId: String(formData.get("userId")),
    plannedHours: Number(formData.get("plannedHours")),
    startDate: new Date(String(formData.get("startDate"))),
    endDate: new Date(String(formData.get("endDate"))),
  });
  revalidatePath("/resources");
  revalidatePath("/resources/utilization");
}

export async function generateInvoiceAction(formData: FormData) {
  const user = await requireSession();
  requireRole(user, "ADMIN");
  const projectId = String(formData.get("projectId"));

  let invoice;
  try {
    const billingModel = await billing.getProjectBillingModel(user.organizationId, projectId);

    if (billingModel === "FIXED_FEE" || billingModel === "RETAINER") {
      const amountRaw = formData.get("amount");
      const percentRaw = formData.get("percentComplete");
      invoice = await billing.generateDraftInvoice(user.organizationId, user.id, {
        projectId,
        amount: amountRaw ? Number(amountRaw) : undefined,
        percentComplete: percentRaw ? Number(percentRaw) : undefined,
      });
    } else if (billingModel === "MILESTONE") {
      const milestoneId = String(formData.get("milestoneId") || "");
      if (!milestoneId) {
        redirect(`/invoices?error=${encodeURIComponent("Select a milestone to invoice")}`);
      }
      invoice = await billing.generateDraftInvoice(user.organizationId, user.id, {
        projectId,
        milestoneId,
      });
    } else {
      const startDateRaw = formData.get("startDate");
      const endDateRaw = formData.get("endDate");
      if (!startDateRaw || !endDateRaw) {
        redirect(
          `/invoices?error=${encodeURIComponent("Select a from/to date range for time and materials billing")}`,
        );
      }
      invoice = await billing.generateDraftInvoice(user.organizationId, user.id, {
        projectId,
        startDate: new Date(String(startDateRaw)),
        endDate: new Date(String(endDateRaw)),
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate invoice";
    redirect(`/invoices?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

export async function updateInvoiceStatusAction(id: string, status: "SENT" | "PAID") {
  const user = await requireSession();
  requireRole(user, "ADMIN");
  await billing.updateInvoiceStatus(user.organizationId, id, status, user.id);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
}

export async function createExpenseAction(formData: FormData) {
  const user = await requireSession();
  const receipt = formData.get("receipt");
  const categoryIdRaw = String(formData.get("categoryId") || "");

  try {
    await expenses.createExpenseEntry(user.organizationId, user.id, {
      projectId: String(formData.get("projectId")),
      expenseDate: new Date(String(formData.get("expenseDate"))),
      amount: Number(formData.get("amount")),
      description: String(formData.get("description") || "") || undefined,
      billable: formData.get("billable") === "on",
      categoryId: categoryIdRaw || undefined,
      receipt: receipt instanceof File && receipt.size > 0 ? receipt : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create expense";
    redirect(`/expenses?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/expenses");
}

export async function createExpenseCategoryAction(formData: FormData) {
  const user = await requireSession();
  requireRole(user, "MANAGER");
  try {
    await expenses.createExpenseCategory(user.organizationId, {
      name: String(formData.get("name")),
      code: String(formData.get("code") || "") || undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create category";
    redirect(`/expenses?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/expenses");
}

export async function submitExpenseAction(id: string) {
  const user = await requireSession();
  await expenses.submitExpenseEntry(user.organizationId, id, user.id);
  revalidatePath("/expenses");
}

export async function approveExpenseAction(id: string) {
  const user = await requireSession();
  requireRole(user, "MANAGER");
  try {
    await expenses.approveExpenseEntry(user.organizationId, id, user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to approve expense";
    redirect(`/expenses?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/expenses");
}

export async function bulkApproveExpensesAction(formData: FormData) {
  const user = await requireSession();
  requireRole(user, "MANAGER");
  const ids = formData.getAll("expenseIds").map(String);
  try {
    await expenses.approveExpenseEntries(user.organizationId, ids, user.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to approve expenses";
    redirect(`/expenses?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/expenses");
}

export async function rejectExpenseAction(id: string) {
  const user = await requireSession();
  requireRole(user, "MANAGER");
  await expenses.rejectExpenseEntry(user.organizationId, id, user.id);
  revalidatePath("/expenses");
}

export async function createMilestoneAction(formData: FormData) {
  const user = await requireSession();
  requireRole(user, "MANAGER");
  const projectId = String(formData.get("projectId"));
  try {
    await milestones.createMilestone(user.organizationId, {
      projectId,
      name: String(formData.get("name")),
      description: String(formData.get("description") || "") || undefined,
      amount: Number(formData.get("amount")),
      dueDate: formData.get("dueDate")
        ? new Date(String(formData.get("dueDate")))
        : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create milestone";
    redirect(`/projects/${projectId}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/projects/${projectId}`);
}

export async function updateMilestoneStatusAction(
  milestoneId: string,
  projectId: string,
  status: "PLANNED" | "READY",
) {
  const user = await requireSession();
  requireRole(user, "MANAGER");
  try {
    await milestones.updateMilestoneStatus(user.organizationId, milestoneId, status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update milestone";
    redirect(`/projects/${projectId}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteMilestoneAction(milestoneId: string, projectId: string) {
  const user = await requireSession();
  requireRole(user, "MANAGER");
  try {
    await milestones.deleteMilestone(user.organizationId, milestoneId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete milestone";
    redirect(`/projects/${projectId}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/projects/${projectId}`);
}

export async function reorderMilestoneAction(
  milestoneId: string,
  projectId: string,
  direction: "up" | "down",
) {
  const user = await requireSession();
  requireRole(user, "MANAGER");
  try {
    await milestones.reorderMilestone(user.organizationId, milestoneId, direction);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reorder milestone";
    redirect(`/projects/${projectId}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/projects/${projectId}`);
}

export async function updateAccountingSettingsAction(formData: FormData) {
  const user = await requireSession();
  requireRole(user, "MANAGER");
  await accountingSettings.updateChartOfAccounts(user.organizationId, {
    arAccountName: String(formData.get("arAccountName")),
    serviceRevenueAccount: String(formData.get("serviceRevenueAccount")),
    expenseRevenueAccount: String(formData.get("expenseRevenueAccount")),
    arAccountCode: String(formData.get("arAccountCode") || "") || null,
    serviceRevenueAccountCode: String(formData.get("serviceRevenueAccountCode") || "") || null,
    expenseRevenueAccountCode: String(formData.get("expenseRevenueAccountCode") || "") || null,
  });
  revalidatePath("/settings/accounting");
}

export async function disconnectXeroAction() {
  const user = await requireSession();
  requireRole(user, "ADMIN");
  await deleteAccountingConnection(user.organizationId, "XERO");
  revalidatePath("/settings/accounting");
}

export async function pushInvoiceToXeroAction(invoiceId: string) {
  const user = await requireSession();
  requireRole(user, "ADMIN");
  try {
    await pushInvoiceToXero(user.organizationId, invoiceId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to push invoice to Xero";
    redirect(`/invoices/${invoiceId}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/invoices/${invoiceId}`);
}
