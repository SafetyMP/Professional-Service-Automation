import { withOrgContext } from "@/lib/tenancy/with-org-context";

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Travel", code: "TRAVEL" },
  { name: "Meals & Entertainment", code: "MEALS" },
  { name: "Software & Subscriptions", code: "SOFTWARE" },
  { name: "Office Supplies", code: "SUPPLIES" },
  { name: "Other", code: "OTHER" },
] as const;

export async function listExpenseCategories(organizationId: string) {
  return withOrgContext(organizationId, (tx) =>
    tx.expenseCategory.findMany({
      where: { organizationId, archived: false },
      orderBy: { name: "asc" },
    }),
  );
}

export async function createExpenseCategory(
  organizationId: string,
  data: { name: string; code?: string },
) {
  const name = data.name.trim();
  if (!name) throw new Error("Category name is required");

  return withOrgContext(organizationId, (tx) =>
    tx.expenseCategory.create({
      data: {
        organizationId,
        name,
        code: data.code?.trim() || null,
      },
    }),
  );
}

export async function ensureDefaultExpenseCategories(organizationId: string) {
  return withOrgContext(organizationId, async (tx) => {
    const count = await tx.expenseCategory.count({ where: { organizationId } });
    if (count > 0) return;

    await tx.expenseCategory.createMany({
      data: DEFAULT_EXPENSE_CATEGORIES.map((category) => ({
        organizationId,
        name: category.name,
        code: category.code,
      })),
    });
  });
}
