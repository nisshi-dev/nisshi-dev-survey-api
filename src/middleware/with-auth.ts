import type { MiddlewareHandler } from "hono";
import type { HonoEnv } from "../index.js";
import { createAuth } from "../lib/auth.js";

export const withAuth: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const prisma = c.get("prisma");
  const auth = createAuth(prisma, c.env);
  c.set("auth", auth);
  await next();
};
