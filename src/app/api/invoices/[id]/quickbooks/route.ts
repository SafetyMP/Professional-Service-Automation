import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { hasMinRole } from "@/lib/auth/rbac";
import { pushInvoiceToQuickBooks } from "@/lib/accounting/quickbooks/push-invoice";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasMinRole(session.user.role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const result = await pushInvoiceToQuickBooks(session.user.organizationId, id);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to push invoice to QuickBooks";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
