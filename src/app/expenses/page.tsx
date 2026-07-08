import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { listProjects } from "@/lib/projects/service";
import {
  ensureDefaultExpenseCategories,
  listExpenseCategories,
  listMyExpenseEntries,
  listPendingExpenseApprovals,
} from "@/lib/expenses/service";
import { getExpenseSummaryByCategory } from "@/lib/expenses/summary";
import { formatCurrency } from "@/lib/utils/format";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input, Select, FormField } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  approveExpenseAction,
  bulkApproveExpensesAction,
  createExpenseAction,
  createExpenseCategoryAction,
  rejectExpenseAction,
  submitExpenseAction,
} from "@/app/actions";
import { hasMinRole } from "@/lib/auth/rbac";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
  });

  await ensureDefaultExpenseCategories(session.user.organizationId);

  const [entries, projects, pending, categories, categorySummary] = await Promise.all([
    listMyExpenseEntries(session.user.organizationId, session.user.id),
    listProjects(session.user.organizationId),
    hasMinRole(session.user.role, "MANAGER")
      ? listPendingExpenseApprovals(session.user.organizationId)
      : Promise.resolve([]),
    listExpenseCategories(session.user.organizationId),
    hasMinRole(session.user.role, "MANAGER")
      ? getExpenseSummaryByCategory(session.user.organizationId)
      : Promise.resolve([]),
  ]);

  const activeProjects = projects.filter((p) => p.status === "ACTIVE");
  const canManage = hasMinRole(session.user.role, "MANAGER");

  return (
    <AppShell orgName={org?.name ?? ""} userName={session.user.name}>
      <PageHeader
        title="Expenses"
        description="Submit reimbursable costs with categories and receipts. Managers can bulk-approve submitted expenses."
      />

      {error && <Alert variant="destructive" className="mb-6">{error}</Alert>}

      {canManage && categorySummary.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Approved</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categorySummary.map((row) => (
                  <TableRow key={row.categoryId ?? "uncategorized"}>
                    <TableCell className="font-medium">
                      {row.categoryName}
                      {row.categoryCode ? ` (${row.categoryCode})` : ""}
                    </TableCell>
                    <TableCell className="tabular-nums text-right">{row.count}</TableCell>
                    <TableCell className="tabular-nums text-right">
                      ${formatCurrency(row.approvedTotal)}
                    </TableCell>
                    <TableCell className="tabular-nums text-right">
                      ${formatCurrency(row.pendingTotal)}
                    </TableCell>
                    <TableCell className="tabular-nums text-right">
                      ${formatCurrency(row.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Expense Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createExpenseCategoryAction} className="mb-4 grid gap-3 sm:grid-cols-3">
              <FormField label="Name" htmlFor="categoryName">
                <Input id="categoryName" name="name" required placeholder="Client entertainment" />
              </FormField>
              <FormField label="Code (optional)" htmlFor="categoryCode">
                <Input id="categoryCode" name="code" placeholder="ENTERTAIN" />
              </FormField>
              <div className="flex items-end">
                <Button type="submit">Add Category</Button>
              </div>
            </form>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge key={category.id} variant="default">
                  {category.name}
                  {category.code ? ` (${category.code})` : ""}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Submit Expense</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={createExpenseAction}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <FormField label="Project" htmlFor="projectId">
              <Select id="projectId" name="projectId" required>
                {activeProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Category" htmlFor="categoryId">
              <Select id="categoryId" name="categoryId">
                <option value="">Uncategorized</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Date" htmlFor="expenseDate">
              <Input
                id="expenseDate"
                name="expenseDate"
                type="date"
                defaultValue={format(new Date(), "yyyy-MM-dd")}
                required
              />
            </FormField>
            <FormField label="Amount" htmlFor="amount">
              <Input id="amount" name="amount" type="number" min="0.01" step="0.01" required />
            </FormField>
            <FormField label="Description" htmlFor="description" className="sm:col-span-2">
              <Input id="description" name="description" placeholder="Travel, meal, software, etc." />
            </FormField>
            <FormField label="Receipt (JPG, PNG, WebP, PDF — max 5 MB)" htmlFor="receipt">
              <Input id="receipt" name="receipt" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,image/*,application/pdf" />
            </FormField>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox name="billable" defaultChecked />
                Billable
              </label>
              <Button type="submit">Add Expense</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>My Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead>Billable</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{format(entry.expenseDate, "MMM d")}</TableCell>
                  <TableCell className="font-medium">{entry.project.name}</TableCell>
                  <TableCell>{entry.category?.name ?? "—"}</TableCell>
                  <TableCell className="text-[var(--color-muted-foreground)]">
                    {entry.description ?? "—"}
                  </TableCell>
                  <TableCell className="tabular-nums text-right">${entry.amount.toString()}</TableCell>
                  <TableCell>
                    {entry.receiptFileName ? (
                      <Link
                        href={`/api/expenses/${entry.id}/receipt`}
                        className="text-sm text-[var(--color-primary)] hover:underline"
                        target="_blank"
                      >
                        View
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{entry.billable ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    <Badge variant={entry.status === "APPROVED" ? "success" : "warning"}>
                      {entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.status === "DRAFT" && (
                      <form action={submitExpenseAction.bind(null, entry.id)} className="inline">
                        <Button type="submit" size="sm" variant="outline">
                          Submit
                        </Button>
                      </form>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {entries.length === 0 && (
            <p className="py-6 text-center text-sm text-[var(--color-muted-foreground)]">
              No expenses yet.
            </p>
          )}
        </CardContent>
      </Card>

      {pending.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>Pending Expense Approvals</CardTitle>
            <form action={bulkApproveExpensesAction}>
              {pending.map((entry) => (
                <input key={entry.id} type="hidden" name="expenseIds" value={entry.id} />
              ))}
              <Button type="submit" size="sm">
                Approve All ({pending.length})
              </Button>
            </form>
          </CardHeader>
          <CardContent>
            <form id="bulk-approve-expenses" action={bulkApproveExpensesAction} />
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10">Select</TableHead>
                  <TableHead>Consultant</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Checkbox
                        form="bulk-approve-expenses"
                        name="expenseIds"
                        value={entry.id}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{entry.user.name}</TableCell>
                    <TableCell>{entry.project.name}</TableCell>
                    <TableCell>{entry.category?.name ?? "—"}</TableCell>
                    <TableCell className="text-[var(--color-muted-foreground)]">
                      {entry.description ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums text-right">
                      ${entry.amount.toString()}
                    </TableCell>
                    <TableCell>
                      {entry.receiptFileName ? (
                        <Link
                          href={`/api/expenses/${entry.id}/receipt`}
                          className="text-sm text-[var(--color-primary)] hover:underline"
                          target="_blank"
                        >
                          View
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <form action={approveExpenseAction.bind(null, entry.id)} className="inline">
                          <Button type="submit" size="sm" variant="outline">
                            Approve
                          </Button>
                        </form>
                        <form action={rejectExpenseAction.bind(null, entry.id)} className="inline">
                          <Button type="submit" size="sm" variant="destructive">
                            Reject
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex justify-end">
              <Button type="submit" form="bulk-approve-expenses">
                Approve Selected
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
