import type { Prisma, TimeEntryStatus } from "@prisma/client";
import { startOfWeek, endOfWeek } from "date-fns";
import { withOrgContext } from "@/lib/tenancy/with-org-context";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { emitDomainEvent } from "@/lib/events/bus";

export async function listMyTimeEntries(
  organizationId: string,
  userId: string,
  weekDate: Date,
) {
  const start = startOfWeek(weekDate, { weekStartsOn: 1 });
  const end = endOfWeek(weekDate, { weekStartsOn: 1 });
  return withOrgContext(organizationId, (tx) =>
    tx.timeEntry.findMany({
      where: {
        organizationId,
        userId,
        entryDate: { gte: start, lte: end },
      },
      include: { project: true, task: true },
      orderBy: { entryDate: "asc" },
    }),
  );
}

export async function createTimeEntry(
  organizationId: string,
  userId: string,
  data: {
    projectId: string;
    taskId?: string;
    entryDate: Date;
    hours: number;
    notes?: string;
    billable?: boolean;
  },
) {
  return withOrgContext(organizationId, (tx) =>
    tx.timeEntry.create({
      data: {
        organizationId,
        userId,
        projectId: data.projectId,
        taskId: data.taskId,
        entryDate: data.entryDate,
        hours: data.hours,
        notes: data.notes,
        billable: data.billable ?? true,
        status: "DRAFT",
      },
    }),
  );
}

export async function submitTimeEntry(organizationId: string, id: string, userId: string) {
  return withOrgContext(organizationId, async (tx) => {
    const entry = await tx.timeEntry.findFirst({ where: { id, userId, organizationId } });
    if (!entry) throw new Error("Time entry not found");
    return tx.timeEntry.update({
      where: { id },
      data: { status: "SUBMITTED" },
    });
  });
}

export async function listPendingApprovals(organizationId: string) {
  return withOrgContext(organizationId, (tx) =>
    tx.timeEntry.findMany({
      where: { organizationId, status: "SUBMITTED" },
      include: { user: true, project: true, task: true },
      orderBy: { entryDate: "desc" },
    }),
  );
}

export async function approveTimeEntry(
  organizationId: string,
  id: string,
  approverId: string,
) {
  return withOrgContext(organizationId, async (tx) => {
    const entry = await tx.timeEntry.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedById: approverId,
        approvedAt: new Date(),
      },
    });
    await writeAuditLog(tx, {
      organizationId,
      userId: approverId,
      action: "TIME_APPROVED",
      entityType: "TimeEntry",
      entityId: id,
    });
    await emitDomainEvent({
      type: "TimeEntryApproved",
      organizationId,
      timeEntryId: id,
    });
    return entry;
  });
}

export async function rejectTimeEntry(
  organizationId: string,
  id: string,
  approverId: string,
) {
  return withOrgContext(organizationId, async (tx) => {
    const entry = await tx.timeEntry.update({
      where: { id },
      data: { status: "REJECTED", approvedById: approverId, approvedAt: new Date() },
    });
    await writeAuditLog(tx, {
      organizationId,
      userId: approverId,
      action: "TIME_REJECTED",
      entityType: "TimeEntry",
      entityId: id,
    });
    return entry;
  });
}

export type TimeEntryRow = Prisma.TimeEntryGetPayload<{
  include: { project: true; task: true; user: true };
}>;

export type TimeEntryStatusType = TimeEntryStatus;
