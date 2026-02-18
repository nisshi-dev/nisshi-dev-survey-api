import crypto from "node:crypto";
import type { MiddlewareHandler } from "hono";
import type { HonoEnv } from "../index.js";

export const apiKeyAuth: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const expected = c.env.NISSHI_DEV_SURVEY_API_KEY;
  if (!expected) {
    return c.json({ error: "API key not configured" }, 500);
  }

  const provided = c.req.header("X-API-Key");
  if (!provided) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);

  if (
    expectedBuf.length !== providedBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, providedBuf)
  ) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
};
