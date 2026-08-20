import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const login = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!login || !password) return null;

        const user = await prisma.user.findFirst({
          where: {
            OR: [{ email: login }, { username: login }],
          },
        });

        if (!user || user.banned) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          tier: user.tier,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.username = user.username;
        token.role = user.role;
        token.tier = user.tier;
      } else if (trigger === "update" && token.id) {
        const fresh = await prisma.user.findUnique({ where: { id: token.id } });
        if (fresh) {
          token.username = fresh.username;
          token.role = fresh.role;
          token.tier = fresh.tier;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        username: token.username,
        email: token.email ?? "",
        role: token.role,
        tier: token.tier,
      };
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
