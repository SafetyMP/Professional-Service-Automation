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
import { Input, Label, Select } from "@/components/ui/input";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <h1 className="mb-6 text-2xl font-bold">Expenses</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Submit Expense</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createExpenseAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label htmlFor="projectId">Project</Label>
              <Select id="projectId" name="projectId" required>
                {activeProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="expenseDate">Date</Label>
              <Input
                id="expenseDate"
                name="expenseDate"
                type="date"
                defaultValue={format(new Date(), "yyyy-MM-dd")}
                required
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" name="amount" type="number" min="0.01" step="0.01" required />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" placeholder="Travel, meal, software, etc." />
            </div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="billable" defaultChecked />
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Project</th>
                  <th className="pb-2">Description</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Billable</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b">
                    <td className="py-2">{format(entry.expenseDate, "MMM d")}</td>
                    <td className="py-2">{entry.project.name}</td>
                    <td className="py-2">{entry.description ?? "—"}</td>
                    <td className="py-2">${entry.amount.toString()}</td>
                    <td className="py-2">{entry.billable ? "Yes" : "No"}</td>
                    <td className="py-2">
                      <Badge variant={entry.status === "APPROVED" ? "success" : "default"}>
                        {entry.status}
                      </Badge>
                    </td>
                    <td className="py-2">
                      {entry.status === "DRAFT" && (
                        <form action={submitExpenseAction.bind(null, entry.id)}>
                          <Button type="submit" size="sm" variant="secondary">
                            Submit
                          </Button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {entries.length === 0 && (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No expenses yet. Submit reimbursable or billable project costs above.
            </p>
          )}
        </CardContent>
      </Card>

      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Expense Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pending.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 text-sm"
                >
                  <span>
                    {entry.user.name} — {entry.project.name} — ${entry.amount.toString()} on{" "}
                    {format(entry.expenseDate, "MMM d")}
                    {entry.description ? ` — ${entry.description}` : ""}
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
            </div>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
