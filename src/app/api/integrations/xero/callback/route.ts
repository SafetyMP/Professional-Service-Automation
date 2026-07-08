import { NextResponse } from "next/server";
import { verifyOAuthState } from "@/lib/accounting/oauth-state";
import {
  exchangeXeroAuthorizationCode,
  fetchXeroConnections,
  tokenExpiresAt,
} from "@/lib/accounting/xero/oauth";
import { upsertAccountingConnection } from "@/lib/accounting/connections";
import { isXeroConfigured } from "@/lib/accounting/xero/config";

export async function GET(request: Request) {
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const settingsUrl = new URL("/settings/accounting", baseUrl);

  if (!isXeroConfigured()) {
    settingsUrl.searchParams.set("error", "xero_not_configured");
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
  if (!code || !state) {
    settingsUrl.searchParams.set("error", "missing_oauth_params");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const payload = await verifyOAuthState(state);
    const tokens = await exchangeXeroAuthorizationCode(code);
    const connections = await fetchXeroConnections(tokens.access_token);
    const tenant = connections[0];
    if (!tenant) {
      throw new Error("No Xero organizations found for this account");
    }

    await upsertAccountingConnection(payload.organizationId, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: tokenExpiresAt(tokens.expires_in),
      tenantId: tenant.tenantId,
      tenantName: tenant.tenantName,
    });

    settingsUrl.searchParams.set("connected", "xero");
    return NextResponse.redirect(settingsUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "xero_connect_failed";
    settingsUrl.searchParams.set("error", message);
    return NextResponse.redirect(settingsUrl);
  }
}
