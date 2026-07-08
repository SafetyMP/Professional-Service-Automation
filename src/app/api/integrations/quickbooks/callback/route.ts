import { NextResponse } from "next/server";
import { verifyOAuthState } from "@/lib/accounting/oauth-state";
import {
  exchangeQuickBooksAuthorizationCode,
  tokenExpiresAt,
} from "@/lib/accounting/quickbooks/oauth";
import { upsertAccountingConnection } from "@/lib/accounting/connections";
import { isQuickBooksConfigured } from "@/lib/accounting/quickbooks/config";

export async function GET(request: Request) {
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const settingsUrl = new URL("/settings/accounting", baseUrl);

  if (!isQuickBooksConfigured()) {
    settingsUrl.searchParams.set("error", "quickbooks_not_configured");
    return NextResponse.redirect(settingsUrl);
  }

  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");
  if (error) {
    settingsUrl.searchParams.set("error", error);
    return NextResponse.redirect(settingsUrl);
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const realmId = searchParams.get("realmId");
  if (!code || !state || !realmId) {
    settingsUrl.searchParams.set("error", "missing_oauth_params");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const payload = verifyOAuthState(state);
    const tokens = await exchangeQuickBooksAuthorizationCode(code);

    await upsertAccountingConnection(payload.organizationId, {
      provider: "QUICKBOOKS",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: tokenExpiresAt(tokens.expires_in),
      tenantId: realmId,
      tenantName: `QuickBooks ${realmId}`,
    });

    settingsUrl.searchParams.set("connected", "quickbooks");
    return NextResponse.redirect(settingsUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "quickbooks_connect_failed";
    settingsUrl.searchParams.set("error", message);
    return NextResponse.redirect(settingsUrl);
  }
}
