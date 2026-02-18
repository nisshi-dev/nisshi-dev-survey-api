import type { MiddlewareHandler } from "hono";
import type { HonoEnv } from "../index.js";

export const adminAuth: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const auth = c.get("auth");
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", { id: session.user.id, email: session.user.email });
  await next();
};
