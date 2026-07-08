import type { BillingModel, MilestoneStatus } from "@prisma/client";

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function isInvoiceBasedRevenueModel(billingModel: BillingModel): boolean {
  return (
    billingModel === "FIXED_FEE" ||
    billingModel === "RETAINER" ||
    billingModel === "MILESTONE"
  );
}

/** @deprecated Use isInvoiceBasedRevenueModel */
export function isContractRevenueModel(billingModel: BillingModel): boolean {
  return isInvoiceBasedRevenueModel(billingModel);
}

export type ContractRevenue = {
  billedRevenue: number;
  unbilledRevenue: number;
};

export type MilestoneRevenueInput = {
  amount: number;
  status: MilestoneStatus;
};

/**
 * Contract projects recognize revenue from invoices, not hours × rate.
 * Unbilled contract revenue is the remaining contract balance not yet invoiced.
 */
export function computeContractRevenue(
  contractAmount: number | null,
  invoicedTotal: number,
): ContractRevenue {
  const billedRevenue = roundCurrency(invoicedTotal);
  const unbilledRevenue =
    contractAmount != null && contractAmount > 0
      ? roundCurrency(Math.max(0, contractAmount - invoicedTotal))
      : 0;

  return { billedRevenue, unbilledRevenue };
}

export function computeMilestoneRevenue(
  milestones: MilestoneRevenueInput[],
  invoicedTotal: number,
  contractAmount: number | null,
): ContractRevenue {
  if (milestones.length > 0) {
    const unbilledRevenue = roundCurrency(
      milestones
        .filter((milestone) => milestone.status !== "INVOICED")
        .reduce((sum, milestone) => sum + milestone.amount, 0),
    );
    return {
      billedRevenue: roundCurrency(invoicedTotal),
      unbilledRevenue,
    };
  }

  return computeContractRevenue(contractAmount, invoicedTotal);
}

export function computeInvoiceBasedRevenue(params: {
  billingModel: BillingModel;
  contractAmount: number | null;
  invoicedTotal: number;
  milestones?: MilestoneRevenueInput[];
}): ContractRevenue {
  if (params.billingModel === "MILESTONE") {
    return computeMilestoneRevenue(
      params.milestones ?? [],
      params.invoicedTotal,
      params.contractAmount,
    );
  }

  return computeContractRevenue(params.contractAmount, params.invoicedTotal);
}
