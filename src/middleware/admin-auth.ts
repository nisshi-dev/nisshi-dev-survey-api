import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { prisma } from "../lib/db.js";
import type { HonoEnv } from "../index.js";

export const adminAuth: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const sessionId = getCookie(c, "session");
  if (!sessionId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", { id: session.user.id, email: session.user.email });
  await next();
};
