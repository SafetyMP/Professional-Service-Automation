import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { getInvoice } from "@/lib/billing/service";
import { buildInvoicePdf } from "@/lib/billing/invoice-pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [org, invoice] = await Promise.all([
    prisma.organization.findUnique({ where: { id: session.user.organizationId } }),
    getInvoice(session.user.organizationId, id),
  ]);

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const pdf = await buildInvoicePdf({
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    status: invoice.status,
    orgName: org?.name ?? "Organization",
    projectName: invoice.project.name,
    clientName: invoice.project.client.name,
    clientEmail: invoice.project.client.email,
    clientPhone: invoice.project.client.phone,
    subtotal: Number(invoice.subtotal),
    lines: invoice.lines.map((line) => ({
      description: line.description,
      quantity: Number(line.quantity),
      unitRate: Number(line.unitRate),
      amount: Number(line.amount),
    })),
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
    },
  });
}
