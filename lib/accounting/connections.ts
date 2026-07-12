import type { AccountingProvider } from "@prisma/client";
import { maybeDecrypt, maybeEncrypt } from "@/lib/crypto/token-vault";
import { withOrgContext } from "@/lib/tenancy/with-org-context";

function tokenEncryptionKey(): string | undefined {
  const key = process.env.ACCOUNTING_TOKEN_ENCRYPTION_KEY?.trim();
  return key && key.length >= 32 ? key : undefined;
}

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
  const encKey = tokenEncryptionKey();
  return withOrgContext(organizationId, (tx) =>
    tx.accountingConnection.upsert({
      where: { organizationId_provider: { organizationId, provider } },
      create: {
        organizationId,
        provider,
        accessToken: maybeEncrypt(data.accessToken, encKey),
        refreshToken: maybeEncrypt(data.refreshToken, encKey),
        tokenExpiresAt: data.tokenExpiresAt,
        tenantId: data.tenantId,
        tenantName: data.tenantName ?? null,
      },
      update: {
        accessToken: maybeEncrypt(data.accessToken, encKey),
        refreshToken: maybeEncrypt(data.refreshToken, encKey),
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
  const encKey = tokenEncryptionKey();
  const row = await withOrgContext(organizationId, (tx) =>
    tx.accountingConnection.findUnique({
      where: { organizationId_provider: { organizationId, provider } },
    }),
  );
  if (!row || !encKey) {
    return row;
  }
  return {
    ...row,
    accessToken: maybeDecrypt(row.accessToken, encKey),
    refreshToken: maybeDecrypt(row.refreshToken, encKey),
  };
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
  const encKey = tokenEncryptionKey();
  return withOrgContext(organizationId, (tx) =>
    tx.accountingConnection.update({
      where: { organizationId_provider: { organizationId, provider } },
      data: {
        accessToken: maybeEncrypt(data.accessToken, encKey),
        refreshToken: maybeEncrypt(data.refreshToken, encKey),
        tokenExpiresAt: data.tokenExpiresAt,
      },
    }),
  );
}
