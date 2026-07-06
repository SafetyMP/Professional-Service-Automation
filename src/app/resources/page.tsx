import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import {
  listAllocations,
  listResourceProfiles,
} from "@/lib/resources/service";
import { listProjects, listOrgUsers } from "@/lib/projects/service";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createAllocationAction, upsertResourceProfileAction } from "@/app/actions";
import { hasMinRole } from "@/lib/auth/rbac";

export default async function ResourcesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
  });
  const [profiles, allocations, projects, orgUsers] = await Promise.all([
    listResourceProfiles(session.user.organizationId),
    listAllocations(session.user.organizationId),
    listProjects(session.user.organizationId),
    listOrgUsers(session.user.organizationId),
  ]);
  const isAdmin = hasMinRole(session.user.role, "ADMIN");
  const canAllocate = hasMinRole(session.user.role, "MANAGER");
  const profileUserIds = new Set(profiles.map((p) => p.userId));

  return (
    <AppShell orgName={org?.name ?? ""} userName={session.user.name}>
      <h1 className="mb-6 text-2xl font-bold">Resources</h1>

      {isAdmin && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Resource Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={upsertResourceProfileAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <Label htmlFor="userId">Person</Label>
                <Select id="userId" name="userId" required>
                  {orgUsers.map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.user.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="weeklyCapacityHrs">Capacity (hrs/wk)</Label>
                <Input id="weeklyCapacityHrs" name="weeklyCapacityHrs" type="number" defaultValue="40" />
              </div>
              <div>
                <Label htmlFor="costRate">Cost Rate</Label>
                <Input id="costRate" name="costRate" type="number" step="0.01" defaultValue="75" />
              </div>
              <div>
                <Label htmlFor="billRate">Bill Rate</Label>
                <Input id="billRate" name="billRate" type="number" step="0.01" defaultValue="150" />
              </div>
              <div>
                <Label htmlFor="skills">Skills (comma-sep)</Label>
                <Input id="skills" name="skills" placeholder="React, PM" />
              </div>
              <Button type="submit">Save Profile</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Capacity Profiles</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2">Name</th>
                <th className="pb-2">Capacity</th>
                <th className="pb-2">Cost</th>
                <th className="pb-2">Bill</th>
                <th className="pb-2">Skills</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2">{p.user.name}</td>
                  <td className="py-2">{p.weeklyCapacityHrs.toString()}h</td>
                  <td className="py-2">${p.costRate.toString()}</td>
                  <td className="py-2">${p.billRate.toString()}</td>
                  <td className="py-2">{p.skills.join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {profiles.length === 0 && (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No profiles yet. Admins can create profiles for:{" "}
              {orgUsers.filter((u) => !profileUserIds.has(u.userId)).map((u) => u.user.name).join(", ")}
            </p>
          )}
        </CardContent>
      </Card>

      {canAllocate && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createAllocationAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label htmlFor="projectId">Project</Label>
                <Select id="projectId" name="projectId" required>
                  {projects.filter((p) => p.status === "ACTIVE").map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="userId">Resource</Label>
                <Select id="userId" name="userId" required>
                  {profiles.map((p) => (
                    <option key={p.userId} value={p.userId}>
                      {p.user.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="plannedHours">Planned Hours</Label>
                <Input id="plannedHours" name="plannedHours" type="number" required />
              </div>
              <div>
                <Label htmlFor="startDate">Start</Label>
                <Input id="startDate" name="startDate" type="date" required />
              </div>
              <div>
                <Label htmlFor="endDate">End</Label>
                <Input id="endDate" name="endDate" type="date" required />
              </div>
              <div className="flex items-end">
                <Button type="submit">Allocate</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Allocations</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2">Project</th>
                <th className="pb-2">Person</th>
                <th className="pb-2">Hours</th>
                <th className="pb-2">Period</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((a) => (
                <tr key={a.id} className="border-b">
                  <td className="py-2">{a.project.name}</td>
                  <td className="py-2">{a.user.name}</td>
                  <td className="py-2">{a.plannedHours.toString()}</td>
                  <td className="py-2">
                    {a.startDate.toISOString().slice(0, 10)} — {a.endDate.toISOString().slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
