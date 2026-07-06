import { auth } from "@/lib/auth/config";
import type { SessionUser } from "@/lib/auth/rbac";

export async function requireSession(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user;
}
