import { Decimal } from "@prisma/client/runtime/library";
import { withOrgContext } from "@/lib/tenancy/with-org-context";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { emitDomainEvent } from "@/lib/events/bus";

export async function resolveBillRate(
  organizationId: string,
  userId: string,
  projectId: string,
): Promise<number> {
  return withOrgContext(organizationId, async (tx) => {
    const project = await tx.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (project?.billRateOverride) {
      return Number(project.billRateOverride);
    }
    const profile = await tx.resourceProfile.findFirst({
      where: { userId, organizationId },
    });
    return profile ? Number(profile.billRate) : 150;
  });
}

export async function listInvoices(organizationId: string) {
  return withOrgContext(organizationId, (tx) =>
    tx.invoice.findMany({
      where: { organizationId },
      include: { project: { include: { client: true } }, lines: true },
      orderBy: { createdAt: "desc" },
    }),
  );
}

export async function getInvoice(organizationId: string, id: string) {
  return withOrgContext(organizationId, (tx) =>
    tx.invoice.findFirst({
      where: { id, organizationId },
      include: { project: { include: { client: true } }, lines: true },
    }),
  );
}

export async function generateDraftInvoice(
  organizationId: string,
  userId: string,
  params: { projectId: string; startDate: Date; endDate: Date },
) {
  return withOrgContext(organizationId, async (tx) => {
    const project = await tx.project.findFirst({
      where: { id: params.projectId, organizationId },
      include: { client: true },
    });
    if (!project) throw new Error("Project not found");

    const entries = await tx.timeEntry.findMany({
      where: {
        organizationId,
        projectId: params.projectId,
        status: "APPROVED",
        billingStatus: "UNBILLED",
        billable: true,
        entryDate: { gte: params.startDate, lte: params.endDate },
      },
      include: { user: true, task: true },
    });

    if (entries.length === 0) {
      throw new Error("No approved billable time in date range");
    }

    const count = await tx.invoice.count({ where: { organizationId } });
    const invoiceNumber = `INV-${String(count + 1).padStart(5, "0")}`;

    let subtotal = new Decimal(0);
    const lines: {
      timeEntryId: string;
      description: string;
      quantity: Decimal;
      unitRate: Decimal;
      amount: Decimal;
    }[] = [];

    for (const entry of entries) {
      const profile = await tx.resourceProfile.findFirst({
        where: { userId: entry.userId, organizationId },
      });
      const unitRate = project.billRateOverride
        ? new Decimal(project.billRateOverride)
        : new Decimal(profile?.billRate ?? 150);
      const quantity = new Decimal(entry.hours);
      const amount = quantity.mul(unitRate);
      subtotal = subtotal.add(amount);
      lines.push({
        timeEntryId: entry.id,
        description: `${entry.user.name} — ${entry.task?.name ?? "General"} (${entry.entryDate.toISOString().slice(0, 10)})`,
        quantity,
        unitRate,
        amount,
      });
    }

    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = await tx.invoice.create({
      data: {
        organizationId,
        projectId: project.id,
        clientId: project.clientId,
        invoiceNumber,
        status: "DRAFT",
        issueDate,
        dueDate,
        subtotal,
        lines: {
          create: lines.map((l) => ({
            organizationId,
            timeEntryId: l.timeEntryId,
            description: l.description,
            quantity: l.quantity,
            unitRate: l.unitRate,
            amount: l.amount,
          })),
        },
      },
      include: { lines: true },
    });

    await tx.timeEntry.updateMany({
      where: { id: { in: entries.map((e) => e.id) } },
      data: { billingStatus: "INVOICED" },
    });

    await writeAuditLog(tx, {
      organizationId,
      userId,
      action: "INVOICE_CREATED",
      entityType: "Invoice",
      entityId: invoice.id,
      metadata: { invoiceNumber, subtotal: subtotal.toString() },
    });

    await emitDomainEvent({
      type: "InvoiceCreated",
      organizationId,
      invoiceId: invoice.id,
    });

    return invoice;
  });
}

export async function updateInvoiceStatus(
  organizationId: string,
  id: string,
  status: "DRAFT" | "SENT" | "PAID",
  userId: string,
) {
  return withOrgContext(organizationId, async (tx) => {
    const invoice = await tx.invoice.update({
      where: { id },
      data: { status },
    });
    const action = status === "SENT" ? "INVOICE_SENT" : status === "PAID" ? "INVOICE_PAID" : "INVOICE_CREATED";
    if (status !== "DRAFT") {
      await writeAuditLog(tx, {
        organizationId,
        userId,
        action,
        entityType: "Invoice",
        entityId: id,
      });
      if (status === "SENT") {
        await emitDomainEvent({ type: "InvoiceApproved", organizationId, invoiceId: id });
      }
    }
    return invoice;
  });
}

export function invoiceToCsv(invoice: {
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  status: string;
  subtotal: { toString(): string };
  lines: Array<{
    description: string;
    quantity: { toString(): string };
    unitRate: { toString(): string };
    amount: { toString(): string };
  }>;
}): string {
  const header = "Invoice,Issue Date,Due Date,Status,Line,Qty,Rate,Amount";
  const rows = invoice.lines.map(
    (l) =>
      `${invoice.invoiceNumber},${invoice.issueDate.toISOString().slice(0, 10)},${invoice.dueDate.toISOString().slice(0, 10)},${invoice.status},"${l.description.replace(/"/g, '""')}",${l.quantity},${l.unitRate},${l.amount}`,
  );
  return [header, ...rows, `,,,,Subtotal,,,${invoice.subtotal}`].join("\n");
}
