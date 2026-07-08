import { redirect } from "next/navigation";
import { format } from "date-fns";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { listProjects } from "@/lib/projects/service";
import {
  listMyExpenseEntries,
  listPendingExpenseApprovals,
} from "@/lib/expenses/service";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input, Select, FormField } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
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
  createExpenseAction,
  rejectExpenseAction,
  submitExpenseAction,
} from "@/app/actions";
import { hasMinRole } from "@/lib/auth/rbac";

export default async function ExpensesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
  });

  const [entries, projects, pending] = await Promise.all([
    listMyExpenseEntries(session.user.organizationId, session.user.id),
    listProjects(session.user.organizationId),
    hasMinRole(session.user.role, "MANAGER")
      ? listPendingExpenseApprovals(session.user.organizationId)
      : Promise.resolve([]),
  ]);

  const activeProjects = projects.filter((p) => p.status === "ACTIVE");

  return (
    <AppShell orgName={org?.name ?? ""} userName={session.user.name}>
      <PageHeader
        title="Expenses"
        description="Submit reimbursable or billable project costs for approval."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Submit Expense</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createExpenseAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Project" htmlFor="projectId">
              <Select id="projectId" name="projectId" required>
                {activeProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
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
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
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
                  <TableCell className="text-[var(--color-muted-foreground)]">
                    {entry.description ?? "—"}
                  </TableCell>
                  <TableCell className="tabular-nums text-right">${entry.amount.toString()}</TableCell>
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
          <CardHeader>
            <CardTitle>Pending Expense Approvals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-4 py-3 text-sm"
              >
                <span>
                  <span className="font-medium">{entry.user.name}</span>
                  <span className="text-[var(--color-muted-foreground)]">
                    {" "}— {entry.project.name} — ${entry.amount.toString()} on{" "}
                    {format(entry.expenseDate, "MMM d")}
                    {entry.description ? ` — ${entry.description}` : ""}
                  </span>
                </span>
                <div className="flex gap-2">
                  <form action={approveExpenseAction.bind(null, entry.id)}>
                    <Button type="submit" size="sm">
                      Approve
                    </Button>
                  </form>
                  <form action={rejectExpenseAction.bind(null, entry.id)}>
                    <Button type="submit" size="sm" variant="destructive">
                      Reject
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
