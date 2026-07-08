import type { MilestoneStatus } from "@prisma/client";
import { withOrgContext } from "@/lib/tenancy/with-org-context";

export async function listProjectMilestones(organizationId: string, projectId: string) {
  return withOrgContext(organizationId, (tx) =>
    tx.milestone.findMany({
      where: { organizationId, projectId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  );
}

export async function listReadyMilestones(organizationId: string, projectId: string) {
  return withOrgContext(organizationId, (tx) =>
    tx.milestone.findMany({
      where: { organizationId, projectId, status: "READY" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  );
}

export async function createMilestone(
  organizationId: string,
  data: {
    projectId: string;
    name: string;
    description?: string;
    amount: number;
    dueDate?: Date;
    sortOrder?: number;
  },
) {
  return withOrgContext(organizationId, async (tx) => {
    const project = await tx.project.findFirst({
      where: { id: data.projectId, organizationId },
      select: { billingModel: true },
    });
    if (!project) throw new Error("Project not found");
    if (project.billingModel !== "MILESTONE") {
      throw new Error("Milestones can only be added to milestone-billing projects");
    }
    if (data.amount <= 0) throw new Error("Milestone amount must be greater than zero");

    const count = await tx.milestone.count({ where: { organizationId, projectId: data.projectId } });
    return tx.milestone.create({
      data: {
        organizationId,
        projectId: data.projectId,
        name: data.name,
        description: data.description,
        amount: data.amount,
        dueDate: data.dueDate,
        sortOrder: data.sortOrder ?? count,
      },
    });
  });
}

export async function updateMilestoneStatus(
  organizationId: string,
  milestoneId: string,
  status: MilestoneStatus,
) {
  return withOrgContext(organizationId, async (tx) => {
    const milestone = await tx.milestone.findFirst({
      where: { id: milestoneId, organizationId },
    });
    if (!milestone) throw new Error("Milestone not found");
    if (milestone.status === "INVOICED") {
      throw new Error("Invoiced milestones cannot be changed");
    }
    if (status === "INVOICED") {
      throw new Error("Use invoice generation to mark a milestone as invoiced");
    }

    return tx.milestone.update({
      where: { id: milestoneId },
      data: { status },
    });
  });
}

export async function deleteMilestone(organizationId: string, milestoneId: string) {
  return withOrgContext(organizationId, async (tx) => {
    const milestone = await tx.milestone.findFirst({
      where: { id: milestoneId, organizationId },
    });
    if (!milestone) throw new Error("Milestone not found");
    if (milestone.status !== "PLANNED") {
      throw new Error("Only planned milestones can be deleted");
    }
    return tx.milestone.delete({ where: { id: milestoneId } });
  });
}
