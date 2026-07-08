import { redirect } from "next/navigation";
import { format, startOfWeek } from "date-fns";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { listMyTimeEntries, listPendingApprovals } from "@/lib/time/service";
import { listProjects } from "@/lib/projects/service";
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
  approveTimeAction,
  createTimeEntryAction,
  rejectTimeAction,
  submitTimeEntryAction,
} from "@/app/actions";
import { hasMinRole } from "@/lib/auth/rbac";

export default async function TimePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const weekDate = sp.week ? new Date(sp.week) : new Date();
  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
  });

  const [entries, projects, pending] = await Promise.all([
    listMyTimeEntries(session.user.organizationId, session.user.id, weekDate),
    listProjects(session.user.organizationId),
    hasMinRole(session.user.role, "MANAGER")
      ? listPendingApprovals(session.user.organizationId)
      : Promise.resolve([]),
  ]);

  const activeProjects = projects.filter((p) => p.status === "ACTIVE");
  const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });

  return (
    <AppShell orgName={org?.name ?? ""} userName={session.user.name}>
      <PageHeader
        title="Time"
        description="Log hours, submit for approval, and review team timesheets."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Log Time</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTimeEntryAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Project" htmlFor="projectId">
              <Select id="projectId" name="projectId" required>
                {activeProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Date" htmlFor="entryDate">
              <Input
                id="entryDate"
                name="entryDate"
                type="date"
                defaultValue={format(new Date(), "yyyy-MM-dd")}
                required
              />
            </FormField>
            <FormField label="Hours" htmlFor="hours">
              <Input id="hours" name="hours" type="number" step="0.25" min="0.25" required />
            </FormField>
            <FormField label="Notes" htmlFor="notes" className="sm:col-span-2">
              <Input id="notes" name="notes" />
            </FormField>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox name="billable" defaultChecked />
                Billable
              </label>
              <Button type="submit">Add Entry</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>My Timesheet — week of {format(weekStart, "MMM d, yyyy")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Date</TableHead>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{format(e.entryDate, "EEE M/d")}</TableCell>
                  <TableCell className="font-medium">{e.project.name}</TableCell>
                  <TableCell className="tabular-nums text-right">{e.hours.toString()}</TableCell>
                  <TableCell>
                    <Badge variant={e.status === "APPROVED" ? "success" : "warning"}>
                      {e.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {e.status === "DRAFT" && (
                      <form action={submitTimeEntryAction.bind(null, e.id)} className="inline">
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
              No entries this week.
            </p>
          )}
        </CardContent>
      </Card>

      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-4 py-3 text-sm"
              >
                <span>
                  <span className="font-medium">{e.user.name}</span>
                  <span className="text-[var(--color-muted-foreground)]">
                    {" "}— {e.project.name} — {e.hours.toString()}h on {format(e.entryDate, "MMM d")}
                  </span>
                </span>
                <div className="flex gap-2">
                  <form action={approveTimeAction.bind(null, e.id)}>
                    <Button type="submit" size="sm">
                      Approve
                    </Button>
                  </form>
                  <form action={rejectTimeAction.bind(null, e.id)}>
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
