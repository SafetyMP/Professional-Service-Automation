import { Decimal } from "@prisma/client/runtime/library";
import { withOrgContext } from "@/lib/tenancy/with-org-context";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { emitDomainEvent } from "@/lib/events/bus";

const DEFAULT_BILL_RATE = 150;

type BillRateProject = { billRateOverride?: Decimal | number | null };
type BillRateProfile = { billRate: Decimal | number };
type CostRateProfile = { costRate: Decimal | number };

export function resolveEntryBillRate(
  project: BillRateProject,
  profile: BillRateProfile | null | undefined,
): number {
  if (project.billRateOverride != null) {
    return Number(project.billRateOverride);
  }
  if (profile) {
    return Number(profile.billRate);
  }
  return DEFAULT_BILL_RATE;
}

export function resolveEntryCostRate(profile: CostRateProfile | null | undefined): number {
  if (profile) {
    return Number(profile.costRate);
  }
  return 0;
}

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

    const [entries, expenses] = await Promise.all([
      tx.timeEntry.findMany({
        where: {
          organizationId,
          projectId: params.projectId,
          status: "APPROVED",
          billingStatus: "UNBILLED",
          billable: true,
          entryDate: { gte: params.startDate, lte: params.endDate },
        },
        include: { user: true, task: true },
      }),
      tx.expenseEntry.findMany({
        where: {
          organizationId,
          projectId: params.projectId,
          status: "APPROVED",
          billingStatus: "UNBILLED",
          billable: true,
          expenseDate: { gte: params.startDate, lte: params.endDate },
        },
        include: { user: true },
      }),
    ]);

    if (entries.length === 0 && expenses.length === 0) {
      throw new Error("No approved billable time or expenses in date range");
    }

    const count = await tx.invoice.count({ where: { organizationId } });
    const invoiceNumber = `INV-${String(count + 1).padStart(5, "0")}`;

    let subtotal = new Decimal(0);
    const lines: {
      timeEntryId?: string;
      expenseEntryId?: string;
      description: string;
      quantity: Decimal;
      unitRate: Decimal;
      amount: Decimal;
    }[] = [];

    for (const entry of entries) {
      const profile = await tx.resourceProfile.findFirst({
        where: { userId: entry.userId, organizationId },
      });
      const unitRate = new Decimal(resolveEntryBillRate(project, profile));
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

    for (const expense of expenses) {
      const amount = new Decimal(expense.amount);
      subtotal = subtotal.add(amount);
      lines.push({
        expenseEntryId: expense.id,
        description: `Expense — ${expense.description ?? "Reimbursable"} (${expense.user.name}, ${expense.expenseDate.toISOString().slice(0, 10)})`,
        quantity: new Decimal(1),
        unitRate: amount,
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
            expenseEntryId: l.expenseEntryId,
            description: l.description,
            quantity: l.quantity,
            unitRate: l.unitRate,
            amount: l.amount,
          })),
        },
      },
      include: { lines: true },
    });

    if (entries.length > 0) {
      await tx.timeEntry.updateMany({
        where: { id: { in: entries.map((e) => e.id) } },
        data: { billingStatus: "INVOICED" },
      });
    }

    if (expenses.length > 0) {
      await tx.expenseEntry.updateMany({
        where: { id: { in: expenses.map((e) => e.id) } },
        data: { billingStatus: "INVOICED" },
      });
    }

    await writeAuditLog(tx, {
      organizationId,
      userId,
      action: "INVOICE_CREATED",
      entityType: "Invoice",
      entityId: invoice.id,
      metadata: {
        invoiceNumber,
        subtotal: subtotal.toString(),
        timeLineCount: entries.length,
        expenseLineCount: expenses.length,
      },
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

export type JournalInvoice = {
  invoiceNumber: string;
  issueDate: Date;
  clientName: string;
  subtotal: { toString(): string };
  lines: Array<{
    amount: { toString(): string };
    timeEntryId?: string | null;
    expenseEntryId?: string | null;
  }>;
};

function formatJournalAmount(value: number): string {
  return value.toFixed(2);
}

function escapeJournalField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function splitInvoiceRevenue(lines: JournalInvoice["lines"]): {
  timeRevenue: number;
  expenseRevenue: number;
} {
  let timeRevenue = 0;
  let expenseRevenue = 0;

  for (const line of lines) {
    const amount = Number(line.amount.toString());
    if (line.expenseEntryId) {
      expenseRevenue += amount;
    } else {
      timeRevenue += amount;
    }
  }

  return { timeRevenue, expenseRevenue };
}

export function invoiceToJournalRows(invoice: JournalInvoice): string[] {
  const date = invoice.issueDate.toISOString().slice(0, 10);
  const reference = invoice.invoiceNumber;
  const subtotal = Number(invoice.subtotal.toString());
  const { timeRevenue, expenseRevenue } = splitInvoiceRevenue(invoice.lines);
  const clientLabel = escapeJournalField(`${reference} ${invoice.clientName}`);

  const rows = [
    `${date},Accounts Receivable,${clientLabel},${formatJournalAmount(subtotal)},,${reference}`,
  ];

  if (timeRevenue > 0) {
    rows.push(
      `${date},Service Revenue,${escapeJournalField(`${reference} professional services`)},,${formatJournalAmount(timeRevenue)},${reference}`,
    );
  }

  if (expenseRevenue > 0) {
    rows.push(
      `${date},Expense Revenue,${escapeJournalField(`${reference} reimbursable expenses`)},,${formatJournalAmount(expenseRevenue)},${reference}`,
    );
  }

  return rows;
}

export function invoiceToJournalCsv(invoice: JournalInvoice): string {
  const header = "Date,Account,Description,Debit,Credit,Reference";
  return [header, ...invoiceToJournalRows(invoice)].join("\n");
}

export function invoicesToJournalCsv(invoices: JournalInvoice[]): string {
  const header = "Date,Account,Description,Debit,Credit,Reference";
  const rows = invoices.flatMap((invoice) => invoiceToJournalRows(invoice));
  return [header, ...rows].join("\n");
}
