import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { UserRole } from "@/generated/prisma/client";
import { credentialsSchema } from "@/lib/auth/validation";
import { prisma } from "@/lib/prisma";

const prismaAdapter = PrismaAdapter(prisma);

// Keep authenticated users signed in across browser restarts for 30 days.
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: {
    ...prismaAdapter,
    async createUser(user) {
      // Google is intentionally exposed only to administrators in this first release.
      const createdUser = await prisma.user.create({
        data: {
          ...user,
          role: UserRole.ADMIN,
        },
      });

      return {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email ?? user.email,
        emailVerified: createdUser.emailVerified,
        image: createdUser.image,
        role: createdUser.role,
      };
    },
  },
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  pages: {
    signIn: "/",
  },
  providers: [
    Google,
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        role: { label: "Account type", type: "text" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);

        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { username: parsed.data.username },
        });

        if (!user?.passwordHash || !user.isActive || user.role !== parsed.data.role) {
          return null;
        }

        const passwordMatches = await compare(parsed.data.password, user.passwordHash);

        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          name: user.name ?? user.username,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as UserRole;
      return session;
    },
  },
});
