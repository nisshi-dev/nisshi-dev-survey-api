import type { MiddlewareHandler } from "hono";
import type { HonoEnv } from "../index.js";

const encoder = new TextEncoder();

async function timingSafeCompare(a: string, b: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(a),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(a));
  return crypto.subtle.verify("HMAC", key, signature, encoder.encode(b));
}

export const apiKeyAuth: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const expected = c.env.NISSHI_DEV_SURVEY_API_KEY;
  if (!expected) {
    return c.json({ error: "API key not configured" }, 500);
  }

  const provided = c.req.header("X-API-Key");
  if (!provided) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (expected.length !== provided.length || !(await timingSafeCompare(expected, provided))) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
};
