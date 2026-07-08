export const QUICKBOOKS_AUTHORIZE_URL =
  "https://appcenter.intuit.com/connect/oauth2";
export const QUICKBOOKS_TOKEN_URL =
  "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
export const QUICKBOOKS_SCOPES = "com.intuit.quickbooks.accounting";

export function getQuickBooksRedirectUri(): string {
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/integrations/quickbooks/callback`;
}

export function getQuickBooksApiBase(): string {
  const env = process.env.QUICKBOOKS_ENV ?? "sandbox";
  return env === "production"
    ? "https://quickbooks.api.intuit.com/v3/company"
    : "https://sandbox-quickbooks.api.intuit.com/v3/company";
}

export function isQuickBooksConfigured(): boolean {
  return Boolean(process.env.QUICKBOOKS_CLIENT_ID && process.env.QUICKBOOKS_CLIENT_SECRET);
}

export function requireQuickBooksConfig() {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "QuickBooks OAuth is not configured. Set QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET.",
    );
  }
  return { clientId, clientSecret };
}
