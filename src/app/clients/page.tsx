import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { listClients } from "@/lib/clients/service";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <h1 className="mb-6 text-2xl font-bold">Clients</h1>
      {canManage && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add Client</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createClientAction} className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" />
              </div>
              <div className="sm:col-span-3">
                <Button type="submit">Create Client</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="pt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2">Name</th>
                <th className="pb-2">Email</th>
                <th className="pb-2">Phone</th>
                {canManage && <th className="pb-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b">
                  <td className="py-2 font-medium">{c.name}</td>
                  <td className="py-2">{c.email ?? "—"}</td>
                  <td className="py-2">{c.phone ?? "—"}</td>
                  {canManage && (
                    <td className="py-2">
                      <form action={archiveClientAction.bind(null, c.id)}>
                        <Button type="submit" variant="ghost" size="sm">
                          Archive
                        </Button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
