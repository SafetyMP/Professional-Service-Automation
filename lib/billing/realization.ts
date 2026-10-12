import { roundCurrency } from "@/lib/billing/contract-billing";

export type InvoiceLifecycleStatus = "DRAFT" | "SENT" | "PAID";

export type RealizationStep = "draft" | "issue" | "void";

export type TimeExpenseSource = {
  kind: "time" | "expense";
  billingStatus: "UNBILLED" | "INVOICED";
};

export type MilestoneSource = {
  kind: "milestone";
  status: "PLANNED" | "READY" | "INVOICED";
};

export type BillableSource = TimeExpenseSource | MilestoneSource;

/**
 * A draft holds WIP. Dollars stay unbilled until the invoice is issued,
 * so dashboard WIP (billingStatus UNBILLED, milestone not INVOICED) still includes them.
 */
export function countsAsUnbilledWip(source: BillableSource): boolean {
  if (source.kind === "milestone") {
    return source.status !== "INVOICED";
  }
  return source.billingStatus !== "INVOICED";
}

export function isRealizedInvoiceStatus(status: InvoiceLifecycleStatus): boolean {
  return status === "SENT" || status === "PAID";
}

export function sumRealizedInvoiceSubtotals(
  invoices: Array<{ status: InvoiceLifecycleStatus; subtotal: number }>,
): number {
  return roundCurrency(
    invoices
      .filter((invoice) => isRealizedInvoiceStatus(invoice.status))
      .reduce((sum, invoice) => sum + invoice.subtotal, 0),
  );
}

/** Issued invoices plus open drafts. Drafts reserve contract capacity without realizing it. */
export function sumCommittedInvoiceSubtotals(
  invoices: Array<{ status: InvoiceLifecycleStatus; subtotal: number }>,
): number {
  return roundCurrency(invoices.reduce((sum, invoice) => sum + invoice.subtotal, 0));
}

function holdSourceOnDraft(source: BillableSource): BillableSource {
  if (source.kind === "milestone") {
    if (source.status !== "READY") {
      throw new Error("Only milestones marked Ready can be invoiced");
    }
    return { kind: "milestone", status: "READY" };
  }
  if (source.billingStatus === "INVOICED") {
    throw new Error("Invoiced time and expenses cannot be placed on a draft");
  }
  return { kind: source.kind, billingStatus: "UNBILLED" };
}

function realizeSourceOnIssue(source: BillableSource): BillableSource {
  if (source.kind === "milestone") {
    return { kind: "milestone", status: "INVOICED" };
  }
  return { kind: source.kind, billingStatus: "INVOICED" };
}

function releaseSourceOnVoid(source: BillableSource): BillableSource {
  if (source.kind === "milestone") {
    return { kind: "milestone", status: "READY" };
  }
  return { kind: source.kind, billingStatus: "UNBILLED" };
}

export function transitionSource(
  step: RealizationStep,
  invoiceStatus: InvoiceLifecycleStatus,
  source: BillableSource,
): BillableSource {
  switch (step) {
    case "draft":
      if (invoiceStatus !== "DRAFT") {
        throw new Error("Only draft invoices can hold unbilled WIP");
      }
      return holdSourceOnDraft(source);
    case "issue":
      if (invoiceStatus !== "DRAFT") {
        throw new Error("Only draft invoices can be issued");
      }
      return realizeSourceOnIssue(source);
    case "void":
      if (invoiceStatus !== "DRAFT") {
        throw new Error("Only draft invoices can be voided");
      }
      return releaseSourceOnVoid(source);
    default: {
      const exhaustive: never = step;
      throw new Error(`Unknown realization step: ${String(exhaustive)}`);
    }
  }
}

export function timeExpenseBillingStatus(source: BillableSource): "UNBILLED" | "INVOICED" {
  if (source.kind === "milestone") {
    throw new Error("Expected a time or expense source");
  }
  return source.billingStatus;
}

export function milestoneStatusAfter(source: BillableSource): "PLANNED" | "READY" | "INVOICED" {
  if (source.kind !== "milestone") {
    throw new Error("Expected a milestone source");
  }
  return source.status;
}

export function sourceStatusesFor(
  step: RealizationStep,
  invoiceStatus: InvoiceLifecycleStatus,
): {
  time: "UNBILLED" | "INVOICED";
  expense: "UNBILLED" | "INVOICED";
  milestone: "PLANNED" | "READY" | "INVOICED";
} {
  return {
    time: timeExpenseBillingStatus(
      transitionSource(step, invoiceStatus, { kind: "time", billingStatus: "UNBILLED" }),
    ),
    expense: timeExpenseBillingStatus(
      transitionSource(step, invoiceStatus, { kind: "expense", billingStatus: "UNBILLED" }),
    ),
    milestone: milestoneStatusAfter(
      transitionSource(step, invoiceStatus, { kind: "milestone", status: "READY" }),
    ),
  };
}
