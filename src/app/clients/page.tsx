import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { listClients } from "@/lib/clients/service";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { FormField } from "@/components/ui/input";
import { createClientAction, archiveClientAction } from "@/app/actions";
import { hasMinRole } from "@/lib/auth/rbac";

export default async function ClientsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
  });
  const clients = await listClients(session.user.organizationId);
  const canManage = hasMinRole(session.user.role, "MANAGER");

  return (
    <AppShell orgName={org?.name ?? ""} userName={session.user.name}>
      <PageHeader
        title="Clients"
        description="Manage client accounts and contact information."
      />

      {canManage && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add Client</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createClientAction} className="grid gap-4 sm:grid-cols-3">
              <FormField label="Name" htmlFor="name">
                <Input id="name" name="name" required />
              </FormField>
              <FormField label="Email" htmlFor="email">
                <Input id="email" name="email" type="email" />
              </FormField>
              <FormField label="Phone" htmlFor="phone">
                <Input id="phone" name="phone" />
              </FormField>
              <div className="sm:col-span-3">
                <Button type="submit">Create Client</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          {clients.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No clients yet"
              description="Add your first client to start creating projects."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-[var(--color-muted-foreground)]">
                      {c.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-[var(--color-muted-foreground)]">
                      {c.phone ?? "—"}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <form action={archiveClientAction.bind(null, c.id)}>
                          <Button type="submit" variant="ghost" size="sm">
                            Archive
                          </Button>
                        </form>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
