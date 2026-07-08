import {
  getXeroRedirectUri,
  requireXeroConfig,
  XERO_AUTHORIZE_URL,
  XERO_CONNECTIONS_URL,
  XERO_SCOPES,
  XERO_TOKEN_URL,
} from "@/lib/accounting/xero/config";

type XeroTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};

type XeroConnection = {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantType: string;
};

function basicAuthHeader(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export function buildXeroAuthorizeUrl(state: string): string {
  const { clientId } = requireXeroConfig();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: getXeroRedirectUri(),
    scope: XERO_SCOPES,
    state,
  });
  return `${XERO_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeXeroAuthorizationCode(code: string): Promise<XeroTokenResponse> {
  const { clientId, clientSecret } = requireXeroConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getXeroRedirectUri(),
  });

  const response = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Xero token exchange failed: ${detail}`);
  }

  return response.json() as Promise<XeroTokenResponse>;
}

export async function refreshXeroAccessToken(refreshToken: string): Promise<XeroTokenResponse> {
  const { clientId, clientSecret } = requireXeroConfig();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Xero token refresh failed: ${detail}`);
  }

  return response.json() as Promise<XeroTokenResponse>;
}

export async function fetchXeroConnections(accessToken: string): Promise<XeroConnection[]> {
  const response = await fetch(XERO_CONNECTIONS_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to load Xero connections: ${detail}`);
  }

  return response.json() as Promise<XeroConnection[]>;
}

export function tokenExpiresAt(expiresInSeconds: number): Date {
  return new Date(Date.now() + expiresInSeconds * 1000 - 60_000);
}
