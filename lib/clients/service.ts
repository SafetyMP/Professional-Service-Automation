import type { Prisma } from "@prisma/client";
import { withOrgContext } from "@/lib/tenancy/with-org-context";

export async function listClients(organizationId: string) {
  return withOrgContext(organizationId, (tx) =>
    tx.client.findMany({
      where: { organizationId, archived: false },
      orderBy: { name: "asc" },
    }),
  );
}

export async function getClient(organizationId: string, id: string) {
  return withOrgContext(organizationId, (tx) =>
    tx.client.findFirst({ where: { id, organizationId } }),
  );
}

export async function createClient(
  organizationId: string,
  data: { name: string; email?: string; phone?: string },
) {
  return withOrgContext(organizationId, (tx) =>
    tx.client.create({
      data: { organizationId, ...data },
    }),
  );
}

export async function updateClient(
  organizationId: string,
  id: string,
  data: { name?: string; email?: string; phone?: string },
) {
  return withOrgContext(organizationId, (tx) =>
    tx.client.update({
      where: { id },
      data,
    }),
  );
}

export async function archiveClient(organizationId: string, id: string) {
  return withOrgContext(organizationId, (tx) =>
    tx.client.update({
      where: { id },
      data: { archived: true },
    }),
  );
}

export type ClientRow = Prisma.ClientGetPayload<object>;
