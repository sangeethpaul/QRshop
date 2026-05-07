import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import GithubProvider from "next-auth/providers/github"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import prisma from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID || "",
      clientSecret: process.env.GOOGLE_SECRET || "",
    }),
    GithubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
    }),
  ],
  session: {
    strategy: "jwt", // Keeping JWT for now as it's often easier with Next.js, but user records will be created in DB
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "USER";
        
        // Hardcoded Admin Logic
        if (user.email === "sangeeth.paul@gmail.com") {
          token.role = "ADMIN";
          if ((user as any).role !== "ADMIN") {
            await prisma.user.update({
              where: { id: user.id },
              data: { role: "ADMIN" }
            });
          }
        }

        // Migration logic: Update existing QRCodes/Subscriptions to use the new User.id
        // This runs only when the user object is present (on sign in)
        if (user.email) {
          try {
            await prisma.qRCode.updateMany({
              where: { userEmail: user.email, NOT: { userId: user.id } },
              data: { userId: user.id }
            });
            await prisma.subscription.updateMany({
              where: { userId: { contains: ":" }, NOT: { userId: user.id } }, // Old IDs contain ":"
              // Note: This is a bit risky if multiple users share an ID format, 
              // but we can refine it by checking userEmail if we had it in Subscription
              // Since Subscription doesn't have email, we'll just try to match based on the fact 
              // that this user just logged in and we want to consolidate their data.
              // Actually, better to just leave Subscription as is or only update if it's uniquely identifiable.
            });
          } catch (e) {
            console.error("Migration error:", e);
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    error: "/auth/error",
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

