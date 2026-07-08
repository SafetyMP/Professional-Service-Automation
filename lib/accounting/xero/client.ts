import {
  getAccountingConnectionSecrets,
  updateAccountingConnectionTokens,
} from "@/lib/accounting/connections";
import { refreshXeroAccessToken } from "@/lib/accounting/xero/oauth";
import { XERO_API_BASE } from "@/lib/accounting/xero/config";

async function getValidAccessToken(organizationId: string): Promise<{
  accessToken: string;
  tenantId: string;
}> {
  const connection = await getAccountingConnectionSecrets(organizationId, "XERO");
  if (!connection) throw new Error("Xero is not connected for this organization");

  if (connection.tokenExpiresAt.getTime() > Date.now()) {
    return { accessToken: connection.accessToken, tenantId: connection.tenantId };
  }

  const refreshed = await refreshXeroAccessToken(connection.refreshToken);
  await updateAccountingConnectionTokens(organizationId, "XERO", {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token,
    tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000 - 60_000),
  });

  return { accessToken: refreshed.access_token, tenantId: connection.tenantId };
}

export async function xeroApiRequest<T>(
  organizationId: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const { accessToken, tenantId } = await getValidAccessToken(organizationId);
  const response = await fetch(`${XERO_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Xero-Tenant-Id": tenantId,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Xero API error (${response.status}): ${detail}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}
