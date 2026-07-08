export type MilestoneAmountInput = {
  amount: number | { toString(): string };
  status?: string;
};

export type MilestoneTotalsValidation = {
  total: number;
  contractAmount: number | null;
  remaining: number | null;
  exceedsContract: boolean;
  valid: boolean;
};

export function sumMilestoneAmounts(milestones: MilestoneAmountInput[]): number {
  return milestones.reduce((sum, milestone) => sum + Number(milestone.amount.toString()), 0);
}

export function validateMilestoneTotals(
  milestones: MilestoneAmountInput[],
  contractAmount: number | null | { toString(): string } | undefined,
): MilestoneTotalsValidation {
  const total = sumMilestoneAmounts(milestones);
  const contract =
    contractAmount == null || contractAmount === ""
      ? null
      : Number(contractAmount.toString());

  if (contract == null || contract <= 0) {
    return {
      total,
      contractAmount: contract,
      remaining: null,
      exceedsContract: false,
      valid: true,
    };
  }

  const remaining = contract - total;
  const exceedsContract = total > contract + 0.001;

  return {
    total,
    contractAmount: contract,
    remaining,
    exceedsContract,
    valid: !exceedsContract,
  };
}
