import type { AccountingProvider } from "@prisma/client";
import { withOrgContext } from "@/lib/tenancy/with-org-context";

export type AccountingConnectionView = {
  id: string;
  provider: AccountingProvider;
  tenantId: string;
  tenantName: string | null;
  tokenExpiresAt: Date;
};

export async function getAccountingConnection(
  organizationId: string,
  provider: AccountingProvider = "XERO",
): Promise<AccountingConnectionView | null> {
  return withOrgContext(organizationId, (tx) =>
    tx.accountingConnection.findUnique({
      where: { organizationId_provider: { organizationId, provider } },
      select: {
        id: true,
        provider: true,
        tenantId: true,
        tenantName: true,
        tokenExpiresAt: true,
      },
    }),
  );
}

export async function upsertAccountingConnection(
  organizationId: string,
  data: {
    provider?: AccountingProvider;
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: Date;
    tenantId: string;
    tenantName?: string | null;
  },
) {
  const provider = data.provider ?? "XERO";
  return withOrgContext(organizationId, (tx) =>
    tx.accountingConnection.upsert({
      where: { organizationId_provider: { organizationId, provider } },
      create: {
        organizationId,
        provider,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
        tenantId: data.tenantId,
        tenantName: data.tenantName ?? null,
      },
      update: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
        tenantId: data.tenantId,
        tenantName: data.tenantName ?? null,
      },
    }),
  );
}

export async function deleteAccountingConnection(
  organizationId: string,
  provider: AccountingProvider = "XERO",
) {
  return withOrgContext(organizationId, (tx) =>
    tx.accountingConnection.deleteMany({
      where: { organizationId, provider },
    }),
  );
}

export async function getAccountingConnectionSecrets(
  organizationId: string,
  provider: AccountingProvider = "XERO",
) {
  return withOrgContext(organizationId, (tx) =>
    tx.accountingConnection.findUnique({
      where: { organizationId_provider: { organizationId, provider } },
    }),
  );
}

export async function updateAccountingConnectionTokens(
  organizationId: string,
  provider: AccountingProvider,
  data: {
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: Date;
  },
) {
  return withOrgContext(organizationId, (tx) =>
    tx.accountingConnection.update({
      where: { organizationId_provider: { organizationId, provider } },
      data,
    }),
  );
}
