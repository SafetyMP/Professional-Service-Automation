import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { hasMinRole } from "@/lib/auth/rbac";
import { deleteAccountingConnection } from "@/lib/accounting/connections";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasMinRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteAccountingConnection(session.user.organizationId, "XERO");
  return NextResponse.json({ ok: true });
}
