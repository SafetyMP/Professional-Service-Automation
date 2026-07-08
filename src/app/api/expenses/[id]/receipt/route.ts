import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getExpenseEntry } from "@/lib/expenses/service";
import { getReceiptAbsolutePath, getReceiptRelativePath } from "@/lib/expenses/receipt-storage";
import { hasMinRole } from "@/lib/auth/rbac";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const expense = await getExpenseEntry(session.user.organizationId, id);
  if (!expense) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  const isOwner = expense.userId === session.user.id;
  const canManage = hasMinRole(session.user.role, "MANAGER");
  if (!isOwner && !canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!expense.receiptFileName || !expense.receiptMimeType) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  const relativePath = getReceiptRelativePath(
    session.user.organizationId,
    expense.id,
    expense.receiptFileName,
  );
  const absolutePath = getReceiptAbsolutePath(relativePath);

  try {
    const file = await readFile(absolutePath);
    return new NextResponse(file, {
      headers: {
        "Content-Type": expense.receiptMimeType,
        "Content-Disposition": `inline; filename="${expense.receiptFileName}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Receipt file missing" }, { status: 404 });
  }
}
