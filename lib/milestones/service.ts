import type { MilestoneStatus } from "@prisma/client";
import { withOrgContext } from "@/lib/tenancy/with-org-context";
import { validateMilestoneTotals } from "@/lib/milestones/validation";

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
      select: { billingModel: true, contractAmount: true },
    });
    if (!project) throw new Error("Project not found");
    if (project.billingModel !== "MILESTONE") {
      throw new Error("Milestones can only be added to milestone-billing projects");
    }
    if (data.amount <= 0) throw new Error("Milestone amount must be greater than zero");

    const existing = await tx.milestone.findMany({
      where: { organizationId, projectId: data.projectId },
      select: { amount: true },
    });
    const validation = validateMilestoneTotals(
      [...existing, { amount: data.amount }],
      project.contractAmount,
    );
    if (!validation.valid) {
      throw new Error(
        `Milestone total ($${validation.total.toFixed(2)}) would exceed contract amount ($${validation.contractAmount?.toFixed(2)})`,
      );
    }

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

export async function reorderMilestone(
  organizationId: string,
  milestoneId: string,
  direction: "up" | "down",
) {
  return withOrgContext(organizationId, async (tx) => {
    const milestone = await tx.milestone.findFirst({
      where: { id: milestoneId, organizationId },
    });
    if (!milestone) throw new Error("Milestone not found");
    if (milestone.status === "INVOICED") {
      throw new Error("Invoiced milestones cannot be reordered");
    }

    const siblings = await tx.milestone.findMany({
      where: { organizationId, projectId: milestone.projectId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    const index = siblings.findIndex((item) => item.id === milestoneId);
    if (index < 0) throw new Error("Milestone not found");

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) {
      return milestone;
    }

    const other = siblings[swapIndex];
    await tx.milestone.update({
      where: { id: milestone.id },
      data: { sortOrder: other.sortOrder },
    });
    await tx.milestone.update({
      where: { id: other.id },
      data: { sortOrder: milestone.sortOrder },
    });

    return tx.milestone.findFirst({ where: { id: milestoneId } });
  });
}
