import type { AuditAction, Prisma } from "@prisma/client";

export async function writeAuditLog(
  tx: Prisma.TransactionClient,
  params: {
    organizationId: string;
    userId?: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
    metadata?: Prisma.InputJsonValue;
  },
): Promise<void> {
  await tx.auditLog.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata ?? undefined,
    },
  });
}
