import {
  getQuickBooksRedirectUri,
  QUICKBOOKS_AUTHORIZE_URL,
  QUICKBOOKS_SCOPES,
  QUICKBOOKS_TOKEN_URL,
  requireQuickBooksConfig,
} from "@/lib/accounting/quickbooks/config";

type QuickBooksTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  x_refresh_token_expires_in?: number;
};

function basicAuthHeader(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export function buildQuickBooksAuthorizeUrl(state: string): string {
  const { clientId } = requireQuickBooksConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: QUICKBOOKS_SCOPES,
    redirect_uri: getQuickBooksRedirectUri(),
    state,
  });
  return `${QUICKBOOKS_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeQuickBooksAuthorizationCode(
  code: string,
): Promise<QuickBooksTokenResponse> {
  const { clientId, clientSecret } = requireQuickBooksConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getQuickBooksRedirectUri(),
  });

  const response = await fetch(QUICKBOOKS_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`QuickBooks token exchange failed: ${detail}`);
  }

  return response.json() as Promise<QuickBooksTokenResponse>;
}

export async function refreshQuickBooksAccessToken(
  refreshToken: string,
): Promise<QuickBooksTokenResponse> {
  const { clientId, clientSecret } = requireQuickBooksConfig();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(QUICKBOOKS_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`QuickBooks token refresh failed: ${detail}`);
  }

  return response.json() as Promise<QuickBooksTokenResponse>;
}

export function tokenExpiresAt(expiresInSeconds: number): Date {
  return new Date(Date.now() + expiresInSeconds * 1000 - 60_000);
}
