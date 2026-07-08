import { withOrgContext } from "@/lib/tenancy/with-org-context";

export type ChartOfAccounts = {
  arAccountName: string;
  serviceRevenueAccount: string;
  expenseRevenueAccount: string;
};

export const DEFAULT_CHART_OF_ACCOUNTS: ChartOfAccounts = {
  arAccountName: "Accounts Receivable",
  serviceRevenueAccount: "Service Revenue",
  expenseRevenueAccount: "Expense Revenue",
};

export async function getChartOfAccounts(organizationId: string): Promise<ChartOfAccounts> {
  return withOrgContext(organizationId, async (tx) => {
    const org = await tx.organization.findUnique({
      where: { id: organizationId },
      select: {
        arAccountName: true,
        serviceRevenueAccount: true,
        expenseRevenueAccount: true,
      },
    });
    if (!org) throw new Error("Organization not found");
    return {
      arAccountName: org.arAccountName,
      serviceRevenueAccount: org.serviceRevenueAccount,
      expenseRevenueAccount: org.expenseRevenueAccount,
    };
  });
}

export async function updateChartOfAccounts(
  organizationId: string,
  data: ChartOfAccounts,
) {
  const trim = (value: string) => value.trim();
  const accounts = {
    arAccountName: trim(data.arAccountName),
    serviceRevenueAccount: trim(data.serviceRevenueAccount),
    expenseRevenueAccount: trim(data.expenseRevenueAccount),
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
