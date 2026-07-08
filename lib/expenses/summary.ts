import { withOrgContext } from "@/lib/tenancy/with-org-context";

export type ExpenseCategorySummary = {
  categoryId: string | null;
  categoryName: string;
  categoryCode: string | null;
  count: number;
  total: number;
  approvedTotal: number;
  pendingTotal: number;
};

export async function getExpenseSummaryByCategory(
  organizationId: string,
): Promise<ExpenseCategorySummary[]> {
  return withOrgContext(organizationId, async (tx) => {
    const entries = await tx.expenseEntry.findMany({
      where: { organizationId },
      select: {
        amount: true,
        status: true,
        categoryId: true,
        category: { select: { name: true, code: true } },
      },
    });

    const byKey = new Map<string, ExpenseCategorySummary>();

    for (const entry of entries) {
      const key = entry.categoryId ?? "__uncategorized__";
      const existing = byKey.get(key) ?? {
        categoryId: entry.categoryId,
        categoryName: entry.category?.name ?? "Uncategorized",
        categoryCode: entry.category?.code ?? null,
        count: 0,
        total: 0,
        approvedTotal: 0,
        pendingTotal: 0,
      };

      const amount = Number(entry.amount.toString());
      existing.count += 1;
      existing.total += amount;

      if (entry.status === "APPROVED") {
        existing.approvedTotal += amount;
      } else if (entry.status === "SUBMITTED") {
        existing.pendingTotal += amount;
      }

      byKey.set(key, existing);
    }

    return [...byKey.values()].sort((a, b) => b.total - a.total);
  });
}
