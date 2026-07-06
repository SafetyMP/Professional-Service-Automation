import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { listProjects } from "@/lib/projects/service";
import { listClients } from "@/lib/clients/service";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/card";
import { createProjectAction } from "@/app/actions";
import { hasMinRole } from "@/lib/auth/rbac";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
  });
  const [projectList, clientList] = await Promise.all([
    listProjects(session.user.organizationId),
    listClients(session.user.organizationId),
  ]);
  const canManage = hasMinRole(session.user.role, "MANAGER");

  return (
    <AppShell orgName={org?.name ?? ""} userName={session.user.name}>
      <h1 className="mb-6 text-2xl font-bold">Projects</h1>
      {canManage && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New Project</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createProjectAction} className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <Label htmlFor="clientId">Client</Label>
                <Select id="clientId" name="clientId" required>
                  {clientList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select id="status" name="status" defaultValue="ACTIVE">
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="billingModel">Billing Model</Label>
                <Select id="billingModel" name="billingModel" defaultValue="TIME_AND_MATERIALS">
                  <option value="TIME_AND_MATERIALS">Time & Materials</option>
                  <option value="FIXED_FEE">Fixed Fee</option>
                  <option value="RETAINER">Retainer</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="contractAmount">Contract / Retainer Amount</Label>
                <Input id="contractAmount" name="contractAmount" type="number" step="0.01" />
              </div>
              <div>
                <Label htmlFor="budgetHours">Budget Hours</Label>
                <Input id="budgetHours" name="budgetHours" type="number" step="0.5" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" />
              </div>
              <Button type="submit">Create Project</Button>
            </form>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4">
        {projectList.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex items-center justify-between pt-6">
              <div>
                <Link href={`/projects/${p.id}`} className="font-semibold hover:underline">
                  {p.name}
                </Link>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {p.client.name} · {formatBillingModel(p.billingModel)}
                </p>
              </div>
              <Badge variant={p.status === "ACTIVE" ? "success" : "default"}>{p.status}</Badge>
            </CardContent>
          </Card>
        ))}
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
