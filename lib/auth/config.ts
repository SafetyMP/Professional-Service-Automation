import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import type { SessionUser } from "@/lib/auth/rbac";

declare module "next-auth" {
  interface Session {
    user: SessionUser;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        orgSlug: { label: "Organization", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const orgSlug = (credentials?.orgSlug as string | undefined) ?? "demo-firm";

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
        if (!org) return null;

        const membership = await prisma.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: org.id,
              userId: user.id,
            },
          },
        });
        if (!membership) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: org.id,
          organizationSlug: org.slug,
          role: membership.role,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as SessionUser & { id: string };
        token.userId = u.id;
        token.email = u.email;
        token.name = u.name;
        token.organizationId = u.organizationId;
        token.organizationSlug = u.organizationSlug;
        token.role = u.role;
      }
      return token;
    },
    async session({ session, token }) {
      const user: SessionUser = {
        id: token.userId as string,
        email: token.email as string,
        name: token.name as string,
        organizationId: token.organizationId as string,
        organizationSlug: token.organizationSlug as string,
        role: token.role as SessionUser["role"],
      };
      return { ...session, user };
    },
  },
});
