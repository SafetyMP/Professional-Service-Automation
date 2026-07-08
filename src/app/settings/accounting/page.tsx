import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { getChartOfAccounts } from "@/lib/settings/accounting";
import { getAccountingConnection } from "@/lib/accounting/connections";
import { isXeroConfigured } from "@/lib/accounting/xero/config";
import { isQuickBooksConfigured } from "@/lib/accounting/quickbooks/config";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import {
  disconnectQuickBooksAction,
  disconnectXeroAction,
  updateAccountingSettingsAction,
} from "@/app/actions";
import { hasMinRole } from "@/lib/auth/rbac";

export default async function AccountingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  const { error, connected } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasMinRole(session.user.role, "MANAGER")) redirect("/dashboard");

  const isAdmin = hasMinRole(session.user.role, "ADMIN");
  const authUrl = process.env.AUTH_URL ?? "http://localhost:3000";

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
  });
  const [accounts, xeroConnection, quickbooksConnection] = await Promise.all([
    getChartOfAccounts(session.user.organizationId),
    getAccountingConnection(session.user.organizationId, "XERO"),
    getAccountingConnection(session.user.organizationId, "QUICKBOOKS"),
  ]);
  const xeroReady = isXeroConfigured();
  const quickbooksReady = isQuickBooksConfigured();

  return (
    <AppShell orgName={org?.name ?? ""} userName={session.user.name} userRole={session.user.role}>
      <PageHeader
        title="Accounting Settings"
        description="Chart of accounts for journal exports and accounting system integrations."
      />

      {error && <Alert variant="destructive" className="mb-6">{error}</Alert>}
      {connected === "xero" && <Alert className="mb-6">Xero connected successfully.</Alert>}
      {connected === "quickbooks" && (
        <Alert className="mb-6">QuickBooks connected successfully.</Alert>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Xero Integration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!xeroReady && (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Set <code>XERO_CLIENT_ID</code> and <code>XERO_CLIENT_SECRET</code> in your
                environment. Redirect URI:{" "}
                <code>{authUrl}/api/integrations/xero/callback</code>
              </p>
            )}
            {xeroConnection ? (
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="success">Connected</Badge>
                <span className="text-sm">
                  {xeroConnection.tenantName ?? xeroConnection.tenantId}
                </span>
                {isAdmin && (
                  <form action={disconnectXeroAction}>
                    <Button type="submit" variant="outline" size="sm">
                      Disconnect
                    </Button>
                  </form>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="warning">Not connected</Badge>
                {isAdmin && xeroReady && (
                  <a href="/api/integrations/xero/connect">
                    <Button type="button" size="sm">
                      Connect Xero
                    </Button>
                  </a>
                )}
                {!isAdmin && (
                  <span className="text-sm text-[var(--color-muted-foreground)]">
                    Ask an admin to connect Xero.
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>QuickBooks Integration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!quickbooksReady && (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Set <code>QUICKBOOKS_CLIENT_ID</code> and <code>QUICKBOOKS_CLIENT_SECRET</code> in
                your environment. Redirect URI:{" "}
                <code>{authUrl}/api/integrations/quickbooks/callback</code>
              </p>
            )}
            {quickbooksConnection ? (
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="success">Connected</Badge>
                <span className="text-sm">
                  {quickbooksConnection.tenantName ?? quickbooksConnection.tenantId}
                </span>
                {isAdmin && (
                  <form action={disconnectQuickBooksAction}>
                    <Button type="submit" variant="outline" size="sm">
                      Disconnect
                    </Button>
                  </form>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="warning">Not connected</Badge>
                {isAdmin && quickbooksReady && (
                  <a href="/api/integrations/quickbooks/connect">
                    <Button type="button" size="sm">
                      Connect QuickBooks
                    </Button>
                  </a>
                )}
                {!isAdmin && (
                  <span className="text-sm text-[var(--color-muted-foreground)]">
                    Ask an admin to connect QuickBooks.
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Chart of Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-[var(--color-muted-foreground)]">
            Account names are used in CSV exports. Optional codes map to Xero / QuickBooks account
            IDs when pushing journals via API.
          </p>
          <form action={updateAccountingSettingsAction} className="grid gap-4">
            <div>
              <Label htmlFor="arAccountName">Accounts Receivable (name)</Label>
              <Input
                id="arAccountName"
                name="arAccountName"
                defaultValue={accounts.arAccountName}
                required
              />
            </div>
            <div>
              <Label htmlFor="arAccountCode">Accounts Receivable (integration code)</Label>
              <Input
                id="arAccountCode"
                name="arAccountCode"
                defaultValue={accounts.arAccountCode ?? ""}
                placeholder="e.g. 1200"
              />
            </div>
            <div>
              <Label htmlFor="serviceRevenueAccount">Service Revenue (name)</Label>
              <Input
                id="serviceRevenueAccount"
                name="serviceRevenueAccount"
                defaultValue={accounts.serviceRevenueAccount}
                required
              />
            </div>
            <div>
              <Label htmlFor="serviceRevenueAccountCode">Service Revenue (integration code)</Label>
              <Input
                id="serviceRevenueAccountCode"
                name="serviceRevenueAccountCode"
                defaultValue={accounts.serviceRevenueAccountCode ?? ""}
                placeholder="e.g. 4000"
              />
            </div>
            <div>
              <Label htmlFor="expenseRevenueAccount">Expense / Reimbursable Revenue (name)</Label>
              <Input
                id="expenseRevenueAccount"
                name="expenseRevenueAccount"
                defaultValue={accounts.expenseRevenueAccount}
                required
              />
            </div>
            <div>
              <Label htmlFor="expenseRevenueAccountCode">
                Expense Revenue (integration code)
              </Label>
              <Input
                id="expenseRevenueAccountCode"
                name="expenseRevenueAccountCode"
                defaultValue={accounts.expenseRevenueAccountCode ?? ""}
                placeholder="e.g. 4100"
              />
            </div>
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}
