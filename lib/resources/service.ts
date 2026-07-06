import type { Prisma } from "@prisma/client";
import { differenceInCalendarDays, startOfWeek, endOfWeek } from "date-fns";
import { withOrgContext } from "@/lib/tenancy/with-org-context";

export async function listResourceProfiles(organizationId: string) {
  return withOrgContext(organizationId, (tx) =>
    tx.resourceProfile.findMany({
      where: { organizationId },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
  );
}

export async function upsertResourceProfile(
  organizationId: string,
  userId: string,
  data: {
    weeklyCapacityHrs: number;
    costRate: number;
    billRate: number;
    skills?: string[];
  },
) {
  return withOrgContext(organizationId, (tx) =>
    tx.resourceProfile.upsert({
      where: { userId },
      create: { organizationId, userId, ...data, skills: data.skills ?? [] },
      update: data,
    }),
  );
}

export async function listAllocations(organizationId: string) {
  return withOrgContext(organizationId, (tx) =>
    tx.allocation.findMany({
      where: { organizationId },
      include: { user: true, project: true },
      orderBy: { startDate: "desc" },
    }),
  );
}

export async function createAllocation(
  organizationId: string,
  data: {
    projectId: string;
    userId: string;
    plannedHours: number;
    startDate: Date;
    endDate: Date;
  },
) {
  return withOrgContext(organizationId, (tx) =>
    tx.allocation.create({
      data: { organizationId, ...data },
    }),
  );
}

function weeksInRange(start: Date, end: Date): number {
  const days = differenceInCalendarDays(end, start) + 1;
  return Math.max(days / 7, 1 / 7);
}

export type UtilizationRow = {
  userId: string;
  userName: string;
  capacityHours: number;
  allocatedHours: number;
  actualHours: number;
  utilizationPct: number;
  overAllocated: boolean;
};

export async function getUtilizationReport(
  organizationId: string,
  weekDate: Date,
): Promise<UtilizationRow[]> {
  const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });

  return withOrgContext(organizationId, async (tx) => {
    const profiles = await tx.resourceProfile.findMany({
      where: { organizationId },
      include: { user: true },
    });

    const allocations = await tx.allocation.findMany({
      where: {
        organizationId,
        startDate: { lte: weekEnd },
        endDate: { gte: weekStart },
      },
    });

    const timeEntries = await tx.timeEntry.findMany({
      where: {
        organizationId,
        entryDate: { gte: weekStart, lte: weekEnd },
        status: { in: ["APPROVED", "SUBMITTED"] },
      },
    });

    return profiles.map((profile) => {
      const userAllocations = allocations.filter((a) => a.userId === profile.userId);
      const allocatedHours = userAllocations.reduce((sum, a) => {
        const overlapStart = a.startDate > weekStart ? a.startDate : weekStart;
        const overlapEnd = a.endDate < weekEnd ? a.endDate : weekEnd;
        const weeks = weeksInRange(overlapStart, overlapEnd);
        const totalWeeks = weeksInRange(a.startDate, a.endDate);
        const prorated = (Number(a.plannedHours) / totalWeeks) * weeks;
        return sum + prorated;
      }, 0);

      const actualHours = timeEntries
        .filter((t) => t.userId === profile.userId)
        .reduce((sum, t) => sum + Number(t.hours), 0);

      const capacityHours = Number(profile.weeklyCapacityHrs);
      const utilizationPct =
        capacityHours > 0 ? Math.round((actualHours / capacityHours) * 100) : 0;

      return {
        userId: profile.userId,
        userName: profile.user.name,
        capacityHours,
        allocatedHours: Math.round(allocatedHours * 100) / 100,
        actualHours,
        utilizationPct,
        overAllocated: allocatedHours > capacityHours,
      };
    });
  });
}

export type ResourceProfileRow = Prisma.ResourceProfileGetPayload<{ include: { user: true } }>;
