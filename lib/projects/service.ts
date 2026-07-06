import type { BillingModel, ProjectStatus, Prisma } from "@prisma/client";
import { withOrgContext } from "@/lib/tenancy/with-org-context";

export async function listProjects(organizationId: string) {
  return withOrgContext(organizationId, (tx) =>
    tx.project.findMany({
      where: { organizationId },
      include: { client: true },
      orderBy: { updatedAt: "desc" },
    }),
  );
}

export async function getProject(organizationId: string, id: string) {
  return withOrgContext(organizationId, (tx) =>
    tx.project.findFirst({
      where: { id, organizationId },
      include: {
        client: true,
        tasks: { orderBy: { createdAt: "asc" } },
        members: { include: { user: true } },
        timeEntries: {
          include: { user: true, task: true },
          orderBy: { entryDate: "desc" },
          take: 20,
        },
        allocations: { include: { user: true } },
      },
    }),
  );
}

export async function createProject(
  organizationId: string,
  data: {
    clientId: string;
    name: string;
    description?: string;
    status?: ProjectStatus;
    billingModel?: BillingModel;
    budgetHours?: number;
    startDate?: Date;
    endDate?: Date;
  },
) {
  return withOrgContext(organizationId, (tx) =>
    tx.project.create({
      data: {
        organizationId,
        clientId: data.clientId,
        name: data.name,
        description: data.description,
        status: data.status ?? "DRAFT",
        billingModel: data.billingModel ?? "TIME_AND_MATERIALS",
        budgetHours: data.budgetHours,
        startDate: data.startDate,
        endDate: data.endDate,
      },
    }),
  );
}

export async function updateProject(
  organizationId: string,
  id: string,
  data: Partial<{
    name: string;
    description: string;
    status: ProjectStatus;
    billingModel: BillingModel;
    budgetHours: number;
    billRateOverride: number;
    startDate: Date | null;
    endDate: Date | null;
  }>,
) {
  return withOrgContext(organizationId, (tx) =>
    tx.project.update({ where: { id }, data }),
  );
}

export async function addProjectMember(
  organizationId: string,
  projectId: string,
  userId: string,
) {
  return withOrgContext(organizationId, (tx) =>
    tx.projectMember.create({
      data: { organizationId, projectId, userId },
    }),
  );
}

export async function createTask(
  organizationId: string,
  data: { projectId: string; name: string; description?: string },
) {
  return withOrgContext(organizationId, (tx) =>
    tx.task.create({
      data: { organizationId, ...data },
    }),
  );
}

export async function updateTask(
  organizationId: string,
  id: string,
  data: { name?: string; description?: string; completed?: boolean },
) {
  return withOrgContext(organizationId, (tx) =>
    tx.task.update({ where: { id }, data }),
  );
}

export async function deleteTask(organizationId: string, id: string) {
  return withOrgContext(organizationId, (tx) => tx.task.delete({ where: { id } }));
}

export async function listOrgUsers(organizationId: string) {
  return withOrgContext(organizationId, (tx) =>
    tx.organizationMember.findMany({
      where: { organizationId },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
  );
}

export type ProjectRow = Prisma.ProjectGetPayload<{ include: { client: true } }>;
