import { signOut } from "@/lib/auth/config";

export async function POST() {
  await signOut({ redirectTo: "/login" });
}
