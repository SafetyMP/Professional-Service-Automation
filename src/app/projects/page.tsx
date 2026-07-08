import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderKanban } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { listProjects } from "@/lib/projects/service";
import { listClients } from "@/lib/clients/service";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input, Select, FormField } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { createProjectAction } from "@/app/actions";
import { hasMinRole } from "@/lib/auth/rbac";
import { formatBillingModel } from "@/lib/utils/format";

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
    <AppShell orgName={org?.name ?? ""} userName={session.user.name} userRole={session.user.role}>
      <PageHeader
        title="Projects"
        description="Track engagements, billing models, and team assignments."
      />

      {canManage && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New Project</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createProjectAction} className="grid gap-4 sm:grid-cols-2">
              <FormField label="Name" htmlFor="name">
                <Input id="name" name="name" required />
              </FormField>
              <FormField label="Client" htmlFor="clientId">
                <Select id="clientId" name="clientId" required>
                  {clientList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Status" htmlFor="status">
                <Select id="status" name="status" defaultValue="ACTIVE">
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                </Select>
              </FormField>
              <FormField label="Billing Model" htmlFor="billingModel">
                <Select id="billingModel" name="billingModel" defaultValue="TIME_AND_MATERIALS">
                  <option value="TIME_AND_MATERIALS">Time & Materials</option>
                  <option value="FIXED_FEE">Fixed Fee</option>
                  <option value="RETAINER">Retainer</option>
                </Select>
              </FormField>
              <FormField label="Contract / Retainer Amount" htmlFor="contractAmount">
                <Input id="contractAmount" name="contractAmount" type="number" step="0.01" />
              </FormField>
              <FormField label="Budget Hours" htmlFor="budgetHours">
                <Input id="budgetHours" name="budgetHours" type="number" step="0.5" />
              </FormField>
              <FormField label="Description" htmlFor="description" className="sm:col-span-2">
                <Input id="description" name="description" />
              </FormField>
              <div className="sm:col-span-2">
                <Button type="submit">Create Project</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {projectList.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create a project to start tracking time and billing."
        />
      ) : (
        <div className="grid gap-3">
          {projectList.map((p) => (
            <Card key={p.id} className="transition-shadow hover:shadow-[var(--shadow-elevated)]">
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <Link
                    href={`/projects/${p.id}`}
                    className="font-semibold hover:text-[var(--color-primary)]"
                  >
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
      )}
    </AppShell>
  );
}
