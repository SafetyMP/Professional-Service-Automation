export function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCurrencyCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${formatCurrency(value)}`;
}

export function formatPercent(value: number | null): string {
  return value == null ? "—" : `${value}%`;
}

export function formatBillingModel(model: string): string {
  switch (model) {
    case "FIXED_FEE":
      return "Fixed Fee";
    case "RETAINER":
      return "Retainer";
    case "MILESTONE":
      return "Milestone";
    default:
      return "T&M";
  }
}
