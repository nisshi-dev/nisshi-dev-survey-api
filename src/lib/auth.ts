import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import type { PrismaClient } from "../generated/prisma/client.js";

export interface AuthEnv {
  ALLOWED_ORIGINS: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

export function createAuth(prisma: PrismaClient, env: AuthEnv) {
  const isHttps = env.BETTER_AUTH_URL.startsWith("https");
  return betterAuth({
    basePath: "/admin/auth",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: prismaAdapter(prisma as never, { provider: "postgresql" }),
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    trustedOrigins: env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()),
    advanced: {
      crossSubDomainCookies: {
        enabled: true,
      },
      defaultCookieAttributes: {
        sameSite: isHttps ? "none" : "lax",
        secure: isHttps,
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const allowed = await prisma.allowedEmail.findUnique({
              where: { email: user.email },
            });
            if (!allowed) {
              return false;
            }
            return { data: user };
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
