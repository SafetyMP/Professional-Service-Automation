import { withOrgContext } from "@/lib/tenancy/with-org-context";

export type ChartOfAccounts = {
  arAccountName: string;
  serviceRevenueAccount: string;
  expenseRevenueAccount: string;
  arAccountCode: string | null;
  serviceRevenueAccountCode: string | null;
  expenseRevenueAccountCode: string | null;
};

export const DEFAULT_CHART_OF_ACCOUNTS: ChartOfAccounts = {
  arAccountName: "Accounts Receivable",
  serviceRevenueAccount: "Service Revenue",
  expenseRevenueAccount: "Expense Revenue",
  arAccountCode: null,
  serviceRevenueAccountCode: null,
  expenseRevenueAccountCode: null,
};

export async function getChartOfAccounts(organizationId: string): Promise<ChartOfAccounts> {
  return withOrgContext(organizationId, async (tx) => {
    const org = await tx.organization.findUnique({
      where: { id: organizationId },
      select: {
        arAccountName: true,
        serviceRevenueAccount: true,
        expenseRevenueAccount: true,
        arAccountCode: true,
        serviceRevenueAccountCode: true,
        expenseRevenueAccountCode: true,
      },
    });
    if (!org) throw new Error("Organization not found");
    return {
      arAccountName: org.arAccountName,
      serviceRevenueAccount: org.serviceRevenueAccount,
      expenseRevenueAccount: org.expenseRevenueAccount,
      arAccountCode: org.arAccountCode,
      serviceRevenueAccountCode: org.serviceRevenueAccountCode,
      expenseRevenueAccountCode: org.expenseRevenueAccountCode,
    };
  });
}

export async function updateChartOfAccounts(
  organizationId: string,
  data: ChartOfAccounts,
) {
  const trim = (value: string) => value.trim();
  const optionalCode = (value: string | null) => {
    const trimmed = value?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : null;
  };
  const accounts = {
    arAccountName: trim(data.arAccountName),
    serviceRevenueAccount: trim(data.serviceRevenueAccount),
    expenseRevenueAccount: trim(data.expenseRevenueAccount),
    arAccountCode: optionalCode(data.arAccountCode),
    serviceRevenueAccountCode: optionalCode(data.serviceRevenueAccountCode),
    expenseRevenueAccountCode: optionalCode(data.expenseRevenueAccountCode),
  };

  for (const value of Object.values(accounts)) {
    if (!value) throw new Error("Account names cannot be empty");
  }

  return withOrgContext(organizationId, (tx) =>
    tx.organization.update({
      where: { id: organizationId },
      data: accounts,
    }),
  );
}
