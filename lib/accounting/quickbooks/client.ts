import {
  getAccountingConnectionSecrets,
  updateAccountingConnectionTokens,
} from "@/lib/accounting/connections";
import { refreshQuickBooksAccessToken } from "@/lib/accounting/quickbooks/oauth";
import { getQuickBooksApiBase } from "@/lib/accounting/quickbooks/config";

async function getValidAccessToken(organizationId: string): Promise<{
  accessToken: string;
  realmId: string;
}> {
  const connection = await getAccountingConnectionSecrets(organizationId, "QUICKBOOKS");
  if (!connection) {
    throw new Error("QuickBooks is not connected for this organization");
  }

  if (connection.tokenExpiresAt.getTime() > Date.now()) {
    return { accessToken: connection.accessToken, realmId: connection.tenantId };
  }

  const refreshed = await refreshQuickBooksAccessToken(connection.refreshToken);
  await updateAccountingConnectionTokens(organizationId, "QUICKBOOKS", {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token,
    tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000 - 60_000),
  });

  return { accessToken: refreshed.access_token, realmId: connection.tenantId };
}

export async function quickBooksApiRequest<T>(
  organizationId: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const { accessToken, realmId } = await getValidAccessToken(organizationId);
  const response = await fetch(`${getQuickBooksApiBase()}/${realmId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`QuickBooks API error (${response.status}): ${detail}`);
  }

  return response.json() as Promise<T>;
}
