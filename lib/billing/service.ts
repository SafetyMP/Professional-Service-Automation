import { Decimal } from "@prisma/client/runtime/client";
import type { BillingModel, Prisma } from "@prisma/client";
import { formatExpenseInvoiceDescription } from "@/lib/expenses/service";
import { withOrgContext } from "@/lib/tenancy/with-org-context";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { emitDomainEvent } from "@/lib/events/bus";
import {
  contractLineDescription,
  resolveContractInvoiceAmount,
  roundCurrency,
} from "@/lib/billing/contract-billing";
import {
  assertMilestoneInvoiceable,
  milestoneLineDescription,
} from "@/lib/billing/milestone-billing";
import {
  sourceStatusesFor,
  sumCommittedInvoiceSubtotals,
  sumRealizedInvoiceSubtotals,
  type InvoiceLifecycleStatus,
  type RealizationStep,
} from "@/lib/billing/realization";
import {
  exportInvoiceJournalCsv,
  exportInvoicesJournalCsv,
  invoiceToJournalCsv,
  invoicesToJournalCsv,
  type AccountingExportFormat,
  type JournalInvoice,
} from "@/lib/billing/accounting-export";

export {
  exportInvoiceJournalCsv,
  exportInvoicesJournalCsv,
  invoiceToJournalCsv,
  invoicesToJournalCsv,
  type AccountingExportFormat,
  type JournalInvoice,
};

/**
 * Source time and expenses stay UNBILLED while an invoice is DRAFT.
 * Issuing the invoice (SENT or PAID) is what consumes WIP.
 */
export function sourceBillingStatusForInvoiceStatus(
  invoiceStatus: InvoiceLifecycleStatus,
): "UNBILLED" | "INVOICED" {
  switch (invoiceStatus) {
    case "DRAFT":
      return "UNBILLED";
    case "SENT":
    case "PAID":
      return "INVOICED";
    default: {
      const exhaustive: never = invoiceStatus;
      return exhaustive;
    }
  }
}

type SourceLineRef = {
  timeEntryId?: string | null;
  expenseEntryId?: string | null;
};

async function setSourceBillingStatus(
  tx: Prisma.TransactionClient,
  organizationId: string,
  lines: SourceLineRef[],
  billingStatus: "UNBILLED" | "INVOICED",
) {
  const timeEntryIds = lines.flatMap((line) => (line.timeEntryId ? [line.timeEntryId] : []));
  const expenseEntryIds = lines.flatMap((line) =>
    line.expenseEntryId ? [line.expenseEntryId] : [],
  );

  if (timeEntryIds.length > 0) {
    await tx.timeEntry.updateMany({
      where: { organizationId, id: { in: timeEntryIds } },
      data: { billingStatus },
    });
  }

  if (expenseEntryIds.length > 0) {
    await tx.expenseEntry.updateMany({
      where: { organizationId, id: { in: expenseEntryIds } },
      data: { billingStatus },
    });
  }
}

type BillRateProject = { billRateOverride?: Decimal | number | null };
type BillRateProfile = { billRate: Decimal | number };
type CostRateProfile = { costRate: Decimal | number };

/**
 * ASC 606-10-32-2: the transaction price is the consideration the firm expects
 * to be entitled to. A missing project rate and a missing resource profile are
 * not a price, so the entry stays unpriced.
 */
export function resolveEntryBillRate(
  project: BillRateProject,
  profile: BillRateProfile | null | undefined,
): number | null {
  if (project.billRateOverride != null) {
    return Number(project.billRateOverride);
  }
  if (profile) {
    return Number(profile.billRate);
  }
  return null;
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
): Promise<number | null> {
  return withOrgContext(organizationId, async (tx) => {
    const project = await tx.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (project?.billRateOverride != null) {
      return Number(project.billRateOverride);
    }
    const profile = await tx.resourceProfile.findFirst({
      where: { userId, organizationId },
    });
    return profile ? Number(profile.billRate) : null;
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

export async function getProjectBillingStatus(organizationId: string, projectId: string) {
  return withOrgContext(organizationId, async (tx) => {
    const project = await tx.project.findFirst({
      where: { id: projectId, organizationId },
      select: { billingModel: true, contractAmount: true },
    });
    if (!project) return null;

    const invoices = await tx.invoice.findMany({
      where: { organizationId, projectId },
      select: { status: true, subtotal: true },
    });

    const contractAmount =
      project.contractAmount != null ? Number(project.contractAmount) : null;
    const invoicedTotal = sumRealizedInvoiceSubtotals(invoiceSubtotalRows(invoices));

    return {
      billingModel: project.billingModel,
      contractAmount,
      invoicedTotal: roundCurrency(invoicedTotal),
      remaining:
        contractAmount != null ? roundCurrency(Math.max(0, contractAmount - invoicedTotal)) : null,
    };
  });
}

type InvoiceLineInput = {
  timeEntryId?: string;
  expenseEntryId?: string;
  milestoneId?: string;
  description: string;
  quantity: Decimal;
  unitRate: Decimal;
  amount: Decimal;
};

type RealizationLine = {
  timeEntryId?: string | null;
  expenseEntryId?: string | null;
  milestoneId?: string | null;
};

function invoiceSubtotalRows(
  invoices: Array<{ status: InvoiceLifecycleStatus; subtotal: Decimal | number }>,
) {
  return invoices.map((invoice) => ({
    status: invoice.status,
    subtotal: Number(invoice.subtotal),
  }));
}

async function applyLineRealization(
  tx: Prisma.TransactionClient,
  organizationId: string,
  lines: RealizationLine[],
  step: RealizationStep,
  invoiceStatus: InvoiceLifecycleStatus,
) {
  const statuses = sourceStatusesFor(step, invoiceStatus);
  const timeIds = lines.flatMap((line) => (line.timeEntryId ? [line.timeEntryId] : []));
  const expenseIds = lines.flatMap((line) => (line.expenseEntryId ? [line.expenseEntryId] : []));
  const milestoneIds = lines.flatMap((line) => (line.milestoneId ? [line.milestoneId] : []));

  if (timeIds.length > 0) {
    await tx.timeEntry.updateMany({
      where: { organizationId, id: { in: timeIds } },
      data: { billingStatus: statuses.time },
    });
  }

  if (expenseIds.length > 0) {
    await tx.expenseEntry.updateMany({
      where: { organizationId, id: { in: expenseIds } },
      data: { billingStatus: statuses.expense },
    });
  }

  if (milestoneIds.length > 0) {
    await tx.milestone.updateMany({
      where: { organizationId, id: { in: milestoneIds } },
      data: { status: statuses.milestone },
    });
  }
}

/** Per-firm document number. The sequence only increases, including after a void. */
export function formatInvoiceNumber(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error("invoice sequence must be a positive integer");
  }
  return `INV-${String(sequence).padStart(5, "0")}`;
}

async function createDraftInvoiceRecord(
  tx: Prisma.TransactionClient,
  params: {
    organizationId: string;
    userId: string;
    project: { id: string; clientId: string; name: string };
    lines: InvoiceLineInput[];
    metadata: Record<string, string>;
  },
) {
  const issued = await tx.organization.update({
    where: { id: params.organizationId },
    data: { nextInvoiceNumber: { increment: 1 } },
    select: { nextInvoiceNumber: true },
  });
  const invoiceNumber = formatInvoiceNumber(issued.nextInvoiceNumber);
  const subtotal = params.lines.reduce(
    (sum, line) => sum.add(line.amount),
    new Decimal(0),
  );

  const issueDate = new Date();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const invoice = await tx.invoice.create({
    data: {
      organizationId: params.organizationId,
      projectId: params.project.id,
      clientId: params.project.clientId,
      invoiceNumber,
      status: "DRAFT",
      issueDate,
      dueDate,
      subtotal,
      lines: {
        create: params.lines.map((line) => ({
          organizationId: params.organizationId,
          timeEntryId: line.timeEntryId,
          expenseEntryId: line.expenseEntryId,
          milestoneId: line.milestoneId,
          description: line.description,
          quantity: line.quantity,
          unitRate: line.unitRate,
          amount: line.amount,
        })),
      },
    },
    include: { lines: true },
  });

  await applyLineRealization(tx, params.organizationId, invoice.lines, "draft", "DRAFT");

  await writeAuditLog(tx, {
    organizationId: params.organizationId,
    userId: params.userId,
    action: "INVOICE_CREATED",
    entityType: "Invoice",
    entityId: invoice.id,
    metadata: { invoiceNumber, subtotal: subtotal.toString(), ...params.metadata } as Record<
      string,
      string
    >,
  });

  await emitDomainEvent({
    type: "InvoiceCreated",
    organizationId: params.organizationId,
    invoiceId: invoice.id,
  });

  return invoice;
}

export async function getProjectBillingModel(organizationId: string, projectId: string) {
  const project = await withOrgContext(organizationId, async (tx) =>
    tx.project.findFirst({
      where: { id: projectId, organizationId },
      select: { billingModel: true },
    }),
  );
  if (!project) throw new Error("Project not found");
  return project.billingModel;
}

export async function generateDraftInvoice(
  organizationId: string,
  userId: string,
  params:
    | { projectId: string; startDate: Date; endDate: Date }
    | {
        projectId: string;
        amount?: number;
        percentComplete?: number;
        description?: string;
      }
    | {
        projectId: string;
        milestoneId: string;
      },
) {
  const project = await withOrgContext(organizationId, async (tx) =>
    tx.project.findFirst({
      where: { id: params.projectId, organizationId },
      select: { billingModel: true },
    }),
  );
  if (!project) throw new Error("Project not found");

  if (project.billingModel === "FIXED_FEE" || project.billingModel === "RETAINER") {
    return generateContractDraftInvoice(organizationId, userId, {
      projectId: params.projectId,
      billingModel: project.billingModel,
      amount: "amount" in params ? params.amount : undefined,
      percentComplete: "percentComplete" in params ? params.percentComplete : undefined,
      description: "description" in params ? params.description : undefined,
    });
  }

  if (project.billingModel === "MILESTONE") {
    if (!("milestoneId" in params) || !params.milestoneId) {
      throw new Error("Select a milestone to invoice");
    }
    return generateMilestoneDraftInvoice(organizationId, userId, {
      projectId: params.projectId,
      milestoneId: params.milestoneId,
    });
  }

  if (!("startDate" in params) || !("endDate" in params)) {
    throw new Error("Date range is required for time and materials billing");
  }

  return generateTimeAndMaterialsDraftInvoice(organizationId, userId, params);
}

export async function generateContractDraftInvoice(
  organizationId: string,
  userId: string,
  params: {
    projectId: string;
    billingModel: Extract<BillingModel, "FIXED_FEE" | "RETAINER">;
    amount?: number;
    percentComplete?: number;
    description?: string;
  },
) {
  return withOrgContext(organizationId, async (tx) => {
    const project = await tx.project.findFirst({
      where: { id: params.projectId, organizationId },
      include: { client: true },
    });
    if (!project) throw new Error("Project not found");

    const invoices = await tx.invoice.findMany({
      where: { organizationId, projectId: project.id },
      select: { status: true, subtotal: true },
    });
    const committedTotal = sumCommittedInvoiceSubtotals(invoiceSubtotalRows(invoices));
    const contractAmount =
      project.contractAmount != null ? Number(project.contractAmount) : null;

    const amount = resolveContractInvoiceAmount({
      contractAmount,
      invoicedTotal: committedTotal,
      amount: params.amount,
      percentComplete: params.percentComplete,
      defaultAmount:
        params.billingModel === "RETAINER" && contractAmount != null
          ? contractAmount
          : undefined,
    });

    if (amount <= 0) {
      throw new Error("No billable contract amount for this invoice");
    }

    const description =
      params.description ??
      contractLineDescription(
        params.billingModel,
        project.name,
        params.percentComplete,
      );

    return createDraftInvoiceRecord(tx, {
      organizationId,
      userId,
      project: { id: project.id, clientId: project.clientId, name: project.name },
      lines: [
        {
          description,
          quantity: new Decimal(1),
          unitRate: new Decimal(amount),
          amount: new Decimal(amount),
        },
      ],
      metadata: {
        billingModel: params.billingModel,
        contractAmount: String(contractAmount ?? 0),
        percentComplete: String(params.percentComplete ?? 0),
      },
    });
  });
}

export async function generateMilestoneDraftInvoice(
  organizationId: string,
  userId: string,
  params: { projectId: string; milestoneId: string },
) {
  return withOrgContext(organizationId, async (tx) => {
    const project = await tx.project.findFirst({
      where: { id: params.projectId, organizationId },
      include: { client: true },
    });
    if (!project) throw new Error("Project not found");
    if (project.billingModel !== "MILESTONE") {
      throw new Error("Project is not configured for milestone billing");
    }

    const milestone = await tx.milestone.findFirst({
      where: { id: params.milestoneId, organizationId, projectId: project.id },
      include: { invoiceLine: true },
    });
    if (!milestone) throw new Error("Milestone not found");
    assertMilestoneInvoiceable(milestone.status);
    if (milestone.invoiceLine) {
      throw new Error("Milestone is already on an invoice");
    }

    const amount = Number(milestone.amount);
    const description = milestoneLineDescription(milestone.name, project.name);

    return createDraftInvoiceRecord(tx, {
      organizationId,
      userId,
      project: { id: project.id, clientId: project.clientId, name: project.name },
      lines: [
        {
          milestoneId: milestone.id,
          description,
          quantity: new Decimal(1),
          unitRate: new Decimal(amount),
          amount: new Decimal(amount),
        },
      ],
      metadata: {
        billingModel: "MILESTONE",
        milestoneId: milestone.id,
        milestoneName: milestone.name,
      },
    });
  });
}

export async function generateTimeAndMaterialsDraftInvoice(
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
          invoiceLine: { is: null },
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
          invoiceLine: { is: null },
          expenseDate: { gte: params.startDate, lte: params.endDate },
        },
        include: { user: true, category: true },
      }),
    ]);

    if (entries.length === 0 && expenses.length === 0) {
      throw new Error("No approved billable time or expenses in date range");
    }

    const lines: InvoiceLineInput[] = [];

    for (const entry of entries) {
      const profile = await tx.resourceProfile.findFirst({
        where: { userId: entry.userId, organizationId },
      });
      const rate = resolveEntryBillRate(project, profile);
      if (rate == null) {
        throw new Error(
          `No agreed bill rate for ${entry.user.name}. Set a project override or a resource profile before drafting an invoice.`,
        );
      }
      const unitRate = new Decimal(rate);
      const quantity = new Decimal(entry.hours);
      const amount = quantity.mul(unitRate);
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
      lines.push({
        expenseEntryId: expense.id,
        description: formatExpenseInvoiceDescription(expense),
        quantity: new Decimal(1),
        unitRate: amount,
        amount,
      });
    }

    return createDraftInvoiceRecord(tx, {
      organizationId,
      userId,
      project: { id: project.id, clientId: project.clientId, name: project.name },
      lines,
      metadata: {
        billingModel: "TIME_AND_MATERIALS",
        timeLineCount: String(entries.length),
        expenseLineCount: String(expenses.length),
      },
    });
  });
}

async function loadInvoiceForRealization(
  tx: Prisma.TransactionClient,
  organizationId: string,
  id: string,
) {
  const invoice = await tx.invoice.findFirst({
    where: { id, organizationId },
    include: { lines: true },
  });
  if (!invoice) throw new Error("Invoice not found");
  return invoice;
}

async function issueInvoiceTx(
  tx: Prisma.TransactionClient,
  organizationId: string,
  id: string,
  userId: string,
) {
  const invoice = await loadInvoiceForRealization(tx, organizationId, id);
  await applyLineRealization(tx, organizationId, invoice.lines, "issue", invoice.status);
  const issued = await tx.invoice.update({
    where: { id: invoice.id },
    data: { status: "SENT" },
  });
  await writeAuditLog(tx, {
    organizationId,
    userId,
    action: "INVOICE_SENT",
    entityType: "Invoice",
    entityId: invoice.id,
  });
  await emitDomainEvent({ type: "InvoiceApproved", organizationId, invoiceId: invoice.id });
  return issued;
}

export async function issueInvoice(organizationId: string, id: string, userId: string) {
  return withOrgContext(organizationId, (tx) => issueInvoiceTx(tx, organizationId, id, userId));
}

export async function voidDraftInvoice(organizationId: string, id: string, userId: string) {
  if (!userId) throw new Error("User is required to void a draft invoice");
  return withOrgContext(organizationId, async (tx) => {
    const invoice = await loadInvoiceForRealization(tx, organizationId, id);
    await applyLineRealization(tx, organizationId, invoice.lines, "void", invoice.status);
    await tx.invoice.delete({ where: { id: invoice.id } });
    // nextInvoiceNumber stays where it is, so this number is not issued again.
    return { id: invoice.id, invoiceNumber: invoice.invoiceNumber };
  });
}

export async function updateInvoiceStatus(
  organizationId: string,
  id: string,
  status: InvoiceLifecycleStatus,
  userId: string,
) {
  return withOrgContext(organizationId, async (tx) => {
    if (status === "SENT") {
      return issueInvoiceTx(tx, organizationId, id, userId);
    }

    const existing = await loadInvoiceForRealization(tx, organizationId, id);
    const realizeOnPay = status === "PAID" && existing.status === "DRAFT";
    if (realizeOnPay) {
      await applyLineRealization(tx, organizationId, existing.lines, "issue", existing.status);
    }

    const invoice = await tx.invoice.update({
      where: { id, organizationId },
      data: { status },
    });
    if (status === "DRAFT") {
      await setSourceBillingStatus(
        tx,
        organizationId,
        existing.lines,
        sourceBillingStatusForInvoiceStatus("DRAFT"),
      );
    }
    const action = status === "PAID" ? "INVOICE_PAID" : "INVOICE_CREATED";
    if (status !== "DRAFT") {
      await writeAuditLog(tx, {
        organizationId,
        userId,
        action,
        entityType: "Invoice",
        entityId: id,
      });
    }
    if (realizeOnPay) {
      await emitDomainEvent({ type: "InvoiceApproved", organizationId, invoiceId: id });
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
