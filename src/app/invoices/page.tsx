import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import { listInvoices } from "@/lib/billing/service";
import { listProjects } from "@/lib/projects/service";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/card";
import { generateInvoiceAction } from "@/app/actions";
import { hasMinRole } from "@/lib/auth/rbac";

export default async function InvoicesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
  });
  const [invoices, projects] = await Promise.all([
    listInvoices(session.user.organizationId),
    listProjects(session.user.organizationId),
  ]);
  const isAdmin = hasMinRole(session.user.role, "ADMIN");

  return (
    <AppShell orgName={org?.name ?? ""} userName={session.user.name}>
      <h1 className="mb-6 text-2xl font-bold">Invoices</h1>

      {isAdmin && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Generate Draft Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={generateInvoiceAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                <Label htmlFor="startDate">From</Label>
                <Input id="startDate" name="startDate" type="date" required />
              </div>
              <div>
                <Label htmlFor="endDate">To</Label>
                <Input id="endDate" name="endDate" type="date" required />
              </div>
              <div className="flex items-end">
                <Button type="submit">Generate</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {invoices.map((inv) => (
          <Card key={inv.id}>
            <CardContent className="flex items-center justify-between pt-6">
              <div>
                <Link href={`/invoices/${inv.id}`} className="font-semibold hover:underline">
                  {inv.invoiceNumber}
                </Link>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {inv.project.name} — {inv.project.client.name}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">${inv.subtotal.toString()}</p>
                <Badge variant={inv.status === "PAID" ? "success" : "default"}>{inv.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
