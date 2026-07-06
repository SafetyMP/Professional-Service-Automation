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
    budgetHours: formData.get("budgetHours")
      ? Number(formData.get("budgetHours"))
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
    budgetHours: formData.get("budgetHours")
      ? Number(formData.get("budgetHours"))
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
  const invoice = await billing.generateDraftInvoice(user.organizationId, user.id, {
    projectId: String(formData.get("projectId")),
    startDate: new Date(String(formData.get("startDate"))),
    endDate: new Date(String(formData.get("endDate"))),
  });
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
  await expenses.createExpenseEntry(user.organizationId, user.id, {
    projectId: String(formData.get("projectId")),
    expenseDate: new Date(String(formData.get("expenseDate"))),
    amount: Number(formData.get("amount")),
    description: String(formData.get("description") || "") || undefined,
    billable: formData.get("billable") === "on",
  });
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
  await expenses.approveExpenseEntry(user.organizationId, id, user.id);
  revalidatePath("/expenses");
}

export async function rejectExpenseAction(id: string) {
  const user = await requireSession();
  requireRole(user, "MANAGER");
  await expenses.rejectExpenseEntry(user.organizationId, id, user.id);
  revalidatePath("/expenses");
}
