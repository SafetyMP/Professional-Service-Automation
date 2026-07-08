import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { getProject, listOrgUsers } from "@/lib/projects/service";
import { getProjectBillingStatus } from "@/lib/billing/service";
import { listProjectMilestones } from "@/lib/milestones/service";
import { validateMilestoneTotals } from "@/lib/milestones/validation";
import { getProjectProfitabilityDetail } from "@/lib/reporting/service";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input, Select, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
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
  addProjectMemberAction,
  createMilestoneAction,
  createTaskAction,
  deleteMilestoneAction,
  reorderMilestoneAction,
  toggleTaskAction,
  updateMilestoneStatusAction,
  updateProjectAction,
} from "@/app/actions";
import { hasMinRole } from "@/lib/auth/rbac";
import { formatBillingModel, formatCurrency, formatPercent } from "@/lib/utils/format";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
  });
  const project = await getProject(session.user.organizationId, id);
  if (!project) notFound();

  const profitability = await getProjectProfitabilityDetail(session.user.organizationId, id);
  const billingStatus = await getProjectBillingStatus(session.user.organizationId, id);
  const projectMilestones =
    project.billingModel === "MILESTONE"
      ? await listProjectMilestones(session.user.organizationId, id)
      : [];
  const orgUsers = await listOrgUsers(session.user.organizationId);
  const canManage = hasMinRole(session.user.role, "MANAGER");
  const memberIds = new Set(project.members.map((m) => m.userId));
  const milestoneValidation =
    project.billingModel === "MILESTONE"
      ? validateMilestoneTotals(projectMilestones, project.contractAmount)
      : null;

  return (
    <AppShell orgName={org?.name ?? ""} userName={session.user.name} userRole={session.user.role}>
      <PageHeader
        title={project.name}
        description={`${project.client.name} · ${formatBillingModel(project.billingModel)}`}
        actions={
          <Badge variant={project.status === "ACTIVE" ? "success" : "default"}>
            {project.status}
          </Badge>
        }
      />

      {error && <Alert variant="destructive" className="mb-6">{error}</Alert>}

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
          <div className="mb-6">
            <h2 className="mb-4 text-base font-semibold">Contract Billing</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Contract Value"
                value={
                  billingStatus.contractAmount != null
                    ? `$${formatCurrency(billingStatus.contractAmount)}`
                    : "—"
                }
                accent="primary"
              />
              <StatCard
                label="Invoiced"
                value={`$${formatCurrency(billingStatus.invoicedTotal)}`}
                accent="info"
              />
              <StatCard
                label="Remaining"
                value={
                  billingStatus.remaining != null
                    ? `$${formatCurrency(billingStatus.remaining)}`
                    : "—"
                }
                accent="warning"
              />
            </div>
          </div>
        )}

      {project.billingModel === "MILESTONE" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            {milestoneValidation && milestoneValidation.contractAmount != null && (
              <div className="mb-4 grid gap-4 sm:grid-cols-3">
                <StatCard
                  label="Contract Value"
                  value={`$${formatCurrency(milestoneValidation.contractAmount)}`}
                  accent="primary"
                />
                <StatCard
                  label="Milestone Total"
                  value={`$${formatCurrency(milestoneValidation.total)}`}
                  accent="info"
                />
                <StatCard
                  label="Remaining"
                  value={
                    milestoneValidation.remaining != null
                      ? `$${formatCurrency(milestoneValidation.remaining)}`
                      : "—"
                  }
                  accent={milestoneValidation.exceedsContract ? "warning" : "default"}
                />
              </div>
            )}
            {milestoneValidation?.exceedsContract && (
              <Alert variant="destructive" className="mb-4">
                Milestone total exceeds contract amount. Adjust milestones or contract value before invoicing.
              </Alert>
            )}
            {canManage && (
              <form action={createMilestoneAction} className="mb-4 grid gap-3 sm:grid-cols-4">
                <input type="hidden" name="projectId" value={project.id} />
                <div>
                  <Label htmlFor="milestoneName">Name</Label>
                  <Input id="milestoneName" name="name" required placeholder="Phase 1 delivery" />
                </div>
                <div>
                  <Label htmlFor="milestoneAmount">Amount</Label>
                  <Input id="milestoneAmount" name="amount" type="number" step="0.01" min="0.01" required />
                </div>
                <div>
                  <Label htmlFor="milestoneDue">Due Date</Label>
                  <Input id="milestoneDue" name="dueDate" type="date" />
                </div>
                <div className="flex items-end">
                  <Button type="submit">Add Milestone</Button>
                </div>
              </form>
            )}
            {projectMilestones.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                No milestones yet. Add milestones, mark them Ready, then invoice from the Invoices page.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Due</TableHead>
                    {canManage && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectMilestones.map((milestone, index) => (
                    <TableRow key={milestone.id}>
                      <TableCell className="font-medium">{milestone.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            milestone.status === "INVOICED"
                              ? "success"
                              : milestone.status === "READY"
                                ? "default"
                                : "warning"
                          }
                        >
                          {milestone.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums text-right">
                        ${formatCurrency(Number(milestone.amount))}
                      </TableCell>
                      <TableCell>
                        {milestone.dueDate
                          ? milestone.dueDate.toISOString().slice(0, 10)
                          : "—"}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {milestone.status !== "INVOICED" && (
                              <>
                                <form
                                  action={reorderMilestoneAction.bind(
                                    null,
                                    milestone.id,
                                    project.id,
                                    "up",
                                  )}
                                >
                                  <Button
                                    type="submit"
                                    size="sm"
                                    variant="ghost"
                                    disabled={index === 0}
                                  >
                                    ↑
                                  </Button>
                                </form>
                                <form
                                  action={reorderMilestoneAction.bind(
                                    null,
                                    milestone.id,
                                    project.id,
                                    "down",
                                  )}
                                >
                                  <Button
                                    type="submit"
                                    size="sm"
                                    variant="ghost"
                                    disabled={index === projectMilestones.length - 1}
                                  >
                                    ↓
                                  </Button>
                                </form>
                              </>
                            )}
                            {milestone.status === "PLANNED" && (
                              <>
                                <form
                                  action={updateMilestoneStatusAction.bind(
                                    null,
                                    milestone.id,
                                    project.id,
                                    "READY",
                                  )}
                                >
                                  <Button type="submit" size="sm" variant="outline">
                                    Mark Ready
                                  </Button>
                                </form>
                                <form
                                  action={deleteMilestoneAction.bind(null, milestone.id, project.id)}
                                >
                                  <Button type="submit" size="sm" variant="ghost">
                                    Delete
                                  </Button>
                                </form>
                              </>
                            )}
                            {milestone.status === "READY" && (
                              <form
                                action={updateMilestoneStatusAction.bind(
                                  null,
                                  milestone.id,
                                  project.id,
                                  "PLANNED",
                                )}
                              >
                                <Button type="submit" size="sm" variant="ghost">
                                  Revert
                                </Button>
                              </form>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
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
                  ${formatCurrency(profitability.summary.margin)} ({formatPercent(profitability.summary.marginPct)})
                </p>
              </div>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border border-[var(--color-border)] p-3 text-sm">
                <p className="font-medium">
                  {project.billingModel === "FIXED_FEE" ||
                  project.billingModel === "RETAINER" ||
                  project.billingModel === "MILESTONE"
                    ? "Contract revenue"
                    : "Time revenue"}
                </p>
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

            {profitability.expenseByCategory.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold">Expenses by Category</h3>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Billed</TableHead>
                      <TableHead className="text-right">Unbilled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profitability.expenseByCategory.map((row) => (
                      <TableRow key={row.categoryId ?? "uncategorized"}>
                        <TableCell className="font-medium">
                          {row.categoryName}
                          {row.categoryCode ? ` (${row.categoryCode})` : ""}
                        </TableCell>
                        <TableCell className="tabular-nums text-right">
                          ${formatCurrency(row.total)}
                        </TableCell>
                        <TableCell className="tabular-nums text-right">
                          ${formatCurrency(row.billed)}
                        </TableCell>
                        <TableCell className="tabular-nums text-right">
                          ${formatCurrency(row.unbilled)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {profitability.byPerson.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Person</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Billed</TableHead>
                    <TableHead className="text-right">Unbilled</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitability.byPerson.map((row) => (
                    <TableRow key={row.userId}>
                      <TableCell className="font-medium">{row.userName}</TableCell>
                      <TableCell className="tabular-nums text-right">{row.hours}</TableCell>
                      <TableCell className="tabular-nums text-right">${formatCurrency(row.billedRevenue)}</TableCell>
                      <TableCell className="tabular-nums text-right">${formatCurrency(row.unbilledRevenue)}</TableCell>
                      <TableCell className="tabular-nums text-right">${formatCurrency(row.revenue)}</TableCell>
                      <TableCell className="tabular-nums text-right">${formatCurrency(row.cost)}</TableCell>
                      <TableCell className="tabular-nums text-right">${formatCurrency(row.margin)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.timeEntries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.entryDate.toISOString().slice(0, 10)}</TableCell>
                    <TableCell>{e.user.name}</TableCell>
                    <TableCell className="text-[var(--color-muted-foreground)]">
                      {e.task?.name ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums text-right">{e.hours.toString()}</TableCell>
                    <TableCell>
                      <Badge variant={e.status === "APPROVED" ? "success" : "warning"}>
                        {e.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
