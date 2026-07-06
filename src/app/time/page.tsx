import { redirect } from "next/navigation";
import { format, startOfWeek } from "date-fns";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { listMyTimeEntries, listPendingApprovals } from "@/lib/time/service";
import { listProjects } from "@/lib/projects/service";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/card";
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
      <h1 className="mb-6 text-2xl font-bold">Time</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Log Time</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTimeEntryAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
              <Label htmlFor="entryDate">Date</Label>
              <Input
                id="entryDate"
                name="entryDate"
                type="date"
                defaultValue={format(new Date(), "yyyy-MM-dd")}
                required
              />
            </div>
            <div>
              <Label htmlFor="hours">Hours</Label>
              <Input id="hours" name="hours" type="number" step="0.25" min="0.25" required />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="billable" defaultChecked />
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Project</th>
                  <th className="pb-2">Hours</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b">
                    <td className="py-2">{format(e.entryDate, "EEE M/d")}</td>
                    <td className="py-2">{e.project.name}</td>
                    <td className="py-2">{e.hours.toString()}</td>
                    <td className="py-2">
                      <Badge variant={e.status === "APPROVED" ? "success" : "default"}>
                        {e.status}
                      </Badge>
                    </td>
                    <td className="py-2">
                      {e.status === "DRAFT" && (
                        <form action={submitTimeEntryAction.bind(null, e.id)}>
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
        </CardContent>
      </Card>

      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pending.map((e) => (
                <div
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 text-sm"
                >
                  <span>
                    {e.user.name} — {e.project.name} — {e.hours.toString()}h on{" "}
                    {format(e.entryDate, "MMM d")}
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
            </div>
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
