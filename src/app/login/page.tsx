import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth/config";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  async function login(formData: FormData) {
    "use server";
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      orgSlug: formData.get("orgSlug") ?? "demo-firm",
      redirectTo: "/dashboard",
    });
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="hidden flex-1 flex-col justify-between bg-[var(--color-sidebar)] p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-lg font-bold">
            P
          </div>
          <span className="text-lg font-semibold">PSA Platform</span>
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Professional services,
            <br />
            <span className="text-[var(--color-primary-muted)]">fully automated.</span>
          </h2>
          <p className="max-w-md text-sm text-[var(--color-sidebar-muted)]">
            Time, billing, utilization, and profitability — unified for consulting and
            professional services firms.
          </p>
        </div>
        <p className="text-xs text-[var(--color-sidebar-muted)]">
          Multi-tenant · RBAC · PostgreSQL RLS
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-[var(--color-background)] p-6">
        <Card className="w-full max-w-md border-0 shadow-[var(--shadow-elevated)]">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>Enter your organization and credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={login} className="flex flex-col gap-4">
              <div>
                <Label htmlFor="orgSlug">Organization</Label>
                <Input id="orgSlug" name="orgSlug" defaultValue="demo-firm" required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button type="submit" className="mt-2 w-full" size="lg">
                Sign in
              </Button>
              <p className="text-center text-xs text-[var(--color-muted-foreground)]">
                Demo: <span className="font-mono">admin@demo.com</span> /{" "}
                <span className="font-mono">password123</span>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
