import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { getChartOfAccounts } from "@/lib/settings/accounting";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { updateAccountingSettingsAction } from "@/app/actions";
import { hasMinRole } from "@/lib/auth/rbac";

export default async function AccountingSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasMinRole(session.user.role, "ADMIN")) redirect("/dashboard");

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
  });
  const accounts = await getChartOfAccounts(session.user.organizationId);

  return (
    <AppShell orgName={org?.name ?? ""} userName={session.user.name}>
      <PageHeader
        title="Accounting Settings"
        description="Chart of accounts used in journal CSV exports for QuickBooks, Xero, and generic imports."
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Chart of Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateAccountingSettingsAction} className="grid gap-4">
            <div>
              <Label htmlFor="arAccountName">Accounts Receivable</Label>
              <Input
                id="arAccountName"
                name="arAccountName"
                defaultValue={accounts.arAccountName}
                required
              />
            </div>
            <div>
              <Label htmlFor="serviceRevenueAccount">Service Revenue</Label>
              <Input
                id="serviceRevenueAccount"
                name="serviceRevenueAccount"
                defaultValue={accounts.serviceRevenueAccount}
                required
              />
            </div>
            <div>
              <Label htmlFor="expenseRevenueAccount">Expense / Reimbursable Revenue</Label>
              <Input
                id="expenseRevenueAccount"
                name="expenseRevenueAccount"
                defaultValue={accounts.expenseRevenueAccount}
                required
              />
            </div>
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}
