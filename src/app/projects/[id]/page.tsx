import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { getProject, listOrgUsers } from "@/lib/projects/service";
import { getProjectBillingStatus } from "@/lib/billing/service";
import { getProjectProfitabilityDetail } from "@/lib/reporting/service";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/card";
import {
  addProjectMemberAction,
  createTaskAction,
  toggleTaskAction,
  updateProjectAction,
} from "@/app/actions";
import { hasMinRole } from "@/lib/auth/rbac";

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMarginPct(value: number | null): string {
  return value == null ? "—" : `${value}%`;
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
  });
  const project = await getProject(session.user.organizationId, id);
  if (!project) notFound();

  const profitability = await getProjectProfitabilityDetail(session.user.organizationId, id);
  const billingStatus = await getProjectBillingStatus(session.user.organizationId, id);
  const orgUsers = await listOrgUsers(session.user.organizationId);
  const canManage = hasMinRole(session.user.role, "MANAGER");
  const memberIds = new Set(project.members.map((m) => m.userId));

  return (
    <AppShell orgName={org?.name ?? ""} userName={session.user.name}>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-[var(--color-muted-foreground)]">
            {project.client.name} · {formatBillingModel(project.billingModel)}
          </p>
        </div>
        <Badge variant={project.status === "ACTIVE" ? "success" : "default"}>
          {project.status}
        </Badge>
      </div>

      {canManage && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Edit Project</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateProjectAction} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={project.id} />
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={project.name} required />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select id="status" name="status" defaultValue={project.status}>
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="billingModel">Billing Model</Label>
                <Select id="billingModel" name="billingModel" defaultValue={project.billingModel}>
                  <option value="TIME_AND_MATERIALS">Time & Materials</option>
                  <option value="FIXED_FEE">Fixed Fee</option>
                  <option value="RETAINER">Retainer</option>
                  <option value="MILESTONE">Milestone</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="contractAmount">Contract / Retainer Amount</Label>
                <Input
                  id="contractAmount"
                  name="contractAmount"
                  type="number"
                  step="0.01"
                  defaultValue={project.contractAmount?.toString() ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="budgetHours">Budget Hours</Label>
                <Input
                  id="budgetHours"
                  name="budgetHours"
                  type="number"
                  defaultValue={project.budgetHours?.toString() ?? ""}
                />
              </div>
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {billingStatus &&
        (billingStatus.billingModel === "FIXED_FEE" ||
          billingStatus.billingModel === "RETAINER") && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Contract Billing</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-[var(--color-muted-foreground)]">Contract Value</p>
                <p className="text-xl font-bold">
                  {billingStatus.contractAmount != null
                    ? `$${formatCurrency(billingStatus.contractAmount)}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-muted-foreground)]">Invoiced</p>
                <p className="text-xl font-bold">${formatCurrency(billingStatus.invoicedTotal)}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-muted-foreground)]">Remaining</p>
                <p className="text-xl font-bold">
                  {billingStatus.remaining != null
                    ? `$${formatCurrency(billingStatus.remaining)}`
                    : "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

      {profitability && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Profitability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <p className="text-sm text-[var(--color-muted-foreground)]">Billed</p>
                <p className="text-xl font-bold">${formatCurrency(profitability.summary.billedRevenue)}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-muted-foreground)]">Unbilled</p>
                <p className="text-xl font-bold">${formatCurrency(profitability.summary.unbilledRevenue)}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-muted-foreground)]">Revenue</p>
                <p className="text-xl font-bold">${formatCurrency(profitability.summary.revenue)}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-muted-foreground)]">Cost</p>
                <p className="text-xl font-bold">${formatCurrency(profitability.summary.cost)}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-muted-foreground)]">Margin</p>
                <p className="text-xl font-bold">
                  ${formatCurrency(profitability.summary.margin)} ({formatMarginPct(profitability.summary.marginPct)})
                </p>
              </div>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border border-[var(--color-border)] p-3 text-sm">
                <p className="font-medium">Time revenue</p>
                <p className="text-[var(--color-muted-foreground)]">
                  Billed ${formatCurrency(profitability.timeRevenue.billed)} · Unbilled $
                  {formatCurrency(profitability.timeRevenue.unbilled)}
                </p>
              </div>
              <div className="rounded-md border border-[var(--color-border)] p-3 text-sm">
                <p className="font-medium">Expense revenue</p>
                <p className="text-[var(--color-muted-foreground)]">
                  Billed ${formatCurrency(profitability.expenseRevenue.billed)} · Unbilled $
                  {formatCurrency(profitability.expenseRevenue.unbilled)}
                </p>
              </div>
            </div>

            {profitability.byPerson.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2">Person</th>
                      <th className="pb-2 text-right">Hours</th>
                      <th className="pb-2 text-right">Billed</th>
                      <th className="pb-2 text-right">Unbilled</th>
                      <th className="pb-2 text-right">Revenue</th>
                      <th className="pb-2 text-right">Cost</th>
                      <th className="pb-2 text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profitability.byPerson.map((row) => (
                      <tr key={row.userId} className="border-b">
                        <td className="py-2 font-medium">{row.userName}</td>
                        <td className="py-2 text-right">{row.hours}</td>
                        <td className="py-2 text-right">${formatCurrency(row.billedRevenue)}</td>
                        <td className="py-2 text-right">${formatCurrency(row.unbilledRevenue)}</td>
                        <td className="py-2 text-right">${formatCurrency(row.revenue)}</td>
                        <td className="py-2 text-right">${formatCurrency(row.cost)}</td>
                        <td className="py-2 text-right">${formatCurrency(row.margin)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {canManage && (
              <form action={createTaskAction} className="mb-4 flex gap-2">
                <input type="hidden" name="projectId" value={project.id} />
                <Input name="name" placeholder="New task" required className="flex-1" />
                <Button type="submit" size="sm">
                  Add
                </Button>
              </form>
            )}
            <ul className="space-y-2">
              {project.tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between text-sm">
                  <span className={t.completed ? "line-through opacity-60" : ""}>{t.name}</span>
                  {canManage && (
                    <form action={toggleTaskAction.bind(null, t.id, project.id, !t.completed)}>
                      <Button type="submit" variant="ghost" size="sm">
                        {t.completed ? "Undo" : "Done"}
                      </Button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="mb-4 space-y-1 text-sm">
              {project.members.map((m) => (
                <li key={m.id}>{m.user.name}</li>
              ))}
            </ul>
            {canManage && (
              <form action={addProjectMemberAction} className="flex gap-2">
                <input type="hidden" name="projectId" value={project.id} />
                <Select name="userId" className="flex-1">
                  {orgUsers
                    .filter((u) => !memberIds.has(u.userId))
                    .map((u) => (
                      <option key={u.userId} value={u.userId}>
                        {u.user.name}
                      </option>
                    ))}
                </Select>
                <Button type="submit" size="sm">
                  Add
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Time</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">User</th>
                  <th className="pb-2">Task</th>
                  <th className="pb-2">Hours</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {project.timeEntries.map((e) => (
                  <tr key={e.id} className="border-b">
                    <td className="py-2">{e.entryDate.toISOString().slice(0, 10)}</td>
                    <td className="py-2">{e.user.name}</td>
                    <td className="py-2">{e.task?.name ?? "—"}</td>
                    <td className="py-2">{e.hours.toString()}</td>
                    <td className="py-2">{e.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function formatBillingModel(model: string): string {
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
