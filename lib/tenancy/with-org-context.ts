import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function withOrgContext<T>(
  organizationId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_org_id', ${organizationId}, true)`;
    return fn(tx);
  });
}

export async function setOrgContext(
  tx: Prisma.TransactionClient,
  organizationId: string,
): Promise<void> {
  await tx.$executeRaw`SELECT set_config('app.current_org_id', ${organizationId}, true)`;
}
