export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeProgressBillAmount(
  contractAmount: number,
  invoicedTotal: number,
  percentComplete: number,
): number {
  if (contractAmount <= 0) {
    throw new Error("Contract amount is required for progress billing");
  }
  if (percentComplete < 0 || percentComplete > 100) {
    throw new Error("Percent complete must be between 0 and 100");
  }

  const earned = roundCurrency((contractAmount * percentComplete) / 100);
  return roundCurrency(Math.max(0, earned - invoicedTotal));
}

export function resolveContractInvoiceAmount(params: {
  contractAmount: number | null;
  invoicedTotal: number;
  amount?: number;
  percentComplete?: number;
  defaultAmount?: number;
}): number {
  if (params.percentComplete != null && !Number.isNaN(params.percentComplete)) {
    return computeProgressBillAmount(
      params.contractAmount ?? 0,
      params.invoicedTotal,
      params.percentComplete,
    );
  }

  const amount = params.amount ?? params.defaultAmount;
  if (amount == null || Number.isNaN(amount) || amount <= 0) {
    throw new Error("Invoice amount must be greater than zero");
  }

  if (params.contractAmount != null && params.contractAmount > 0) {
    const remaining = roundCurrency(params.contractAmount - params.invoicedTotal);
    if (amount > remaining) {
      throw new Error(`Invoice amount exceeds remaining contract balance ($${remaining.toFixed(2)})`);
    }
  }

  return roundCurrency(amount);
}

export function contractLineDescription(
  billingModel: "FIXED_FEE" | "RETAINER",
  projectName: string,
  percentComplete?: number,
): string {
  if (billingModel === "RETAINER") {
    return `Retainer — ${projectName}`;
  }
  if (percentComplete != null && !Number.isNaN(percentComplete)) {
    return `Fixed fee — ${projectName} (${percentComplete}% complete)`;
  }
  return `Fixed fee — ${projectName}`;
}
