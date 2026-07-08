import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { hasMinRole } from "@/lib/auth/rbac";
import { createOAuthState } from "@/lib/accounting/oauth-state";
import { buildXeroAuthorizeUrl } from "@/lib/accounting/xero/oauth";
import { isXeroConfigured } from "@/lib/accounting/xero/config";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasMinRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!isXeroConfigured()) {
    return NextResponse.redirect(
      new URL("/settings/accounting?error=xero_not_configured", process.env.AUTH_URL ?? "http://localhost:3000"),
    );
  }

  const state = createOAuthState(session.user.organizationId, session.user.id);
  const url = buildXeroAuthorizeUrl(state);
  return NextResponse.redirect(url);
}
