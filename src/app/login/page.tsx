import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth/config";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in to PSA Platform</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={login} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="orgSlug">Organization</Label>
              <Input id="orgSlug" name="orgSlug" defaultValue="demo-firm" required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <Button type="submit">Sign in</Button>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Demo: admin@demo.com / password123
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
