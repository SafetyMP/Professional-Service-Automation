import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import {
  listAllocations,
  listResourceProfiles,
} from "@/lib/resources/service";
import { listProjects, listOrgUsers } from "@/lib/projects/service";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input, Select, FormField } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <AppShell orgName={org?.name ?? ""} userName={session.user.name} userRole={session.user.role}>
      <PageHeader
        title="Resources"
        description="Manage capacity profiles, rates, and project allocations."
      />

      {isAdmin && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Resource Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={upsertResourceProfileAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <FormField label="Person" htmlFor="userId">
                <Select id="userId" name="userId" required>
                  {orgUsers.map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.user.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Capacity (hrs/wk)" htmlFor="weeklyCapacityHrs">
                <Input id="weeklyCapacityHrs" name="weeklyCapacityHrs" type="number" defaultValue="40" />
              </FormField>
              <FormField label="Cost Rate" htmlFor="costRate">
                <Input id="costRate" name="costRate" type="number" step="0.01" defaultValue="75" />
              </FormField>
              <FormField label="Bill Rate" htmlFor="billRate">
                <Input id="billRate" name="billRate" type="number" step="0.01" defaultValue="150" />
              </FormField>
              <FormField label="Skills (comma-sep)" htmlFor="skills">
                <Input id="skills" name="skills" placeholder="React, PM" />
              </FormField>
              <div className="lg:col-span-5">
                <Button type="submit">Save Profile</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Capacity Profiles</CardTitle>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No profiles yet"
              description={`Admins can create profiles for: ${orgUsers
                .filter((u) => !profileUserIds.has(u.userId))
                .map((u) => u.user.name)
                .join(", ") || "team members"}`}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Capacity</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Bill</TableHead>
                  <TableHead>Skills</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.user.name}</TableCell>
                    <TableCell className="tabular-nums text-right">
                      {p.weeklyCapacityHrs.toString()}h
                    </TableCell>
                    <TableCell className="tabular-nums text-right">${p.costRate.toString()}</TableCell>
                    <TableCell className="tabular-nums text-right">${p.billRate.toString()}</TableCell>
                    <TableCell className="text-[var(--color-muted-foreground)]">
                      {p.skills.join(", ") || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {canAllocate && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createAllocationAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label="Project" htmlFor="projectId">
                <Select id="projectId" name="projectId" required>
                  {projects.filter((p) => p.status === "ACTIVE").map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Resource" htmlFor="userId">
                <Select id="userId" name="userId" required>
                  {profiles.map((p) => (
                    <option key={p.userId} value={p.userId}>
                      {p.user.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Planned Hours" htmlFor="plannedHours">
                <Input id="plannedHours" name="plannedHours" type="number" required />
              </FormField>
              <FormField label="Start" htmlFor="startDate">
                <Input id="startDate" name="startDate" type="date" required />
              </FormField>
              <FormField label="End" htmlFor="endDate">
                <Input id="endDate" name="endDate" type="date" required />
              </FormField>
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
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Project</TableHead>
                <TableHead>Person</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead>Period</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocations.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.project.name}</TableCell>
                  <TableCell>{a.user.name}</TableCell>
                  <TableCell className="tabular-nums text-right">{a.plannedHours.toString()}</TableCell>
                  <TableCell className="text-[var(--color-muted-foreground)]">
                    {a.startDate.toISOString().slice(0, 10)} — {a.endDate.toISOString().slice(0, 10)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
