import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import type { HonoEnv } from "../../index.js";
import { MeResponseSchema } from "../../schema/auth.js";
import { ErrorResponseSchema } from "../../schema/common.js";

const app = new Hono<HonoEnv>();

// /me — セッション確認（後方互換）
app.get(
  "/me",
  describeRoute({
    tags: ["Auth"],
    summary: "セッション確認",
    responses: {
      200: {
        description: "成功",
        content: {
          "application/json": {
            schema: resolver(MeResponseSchema),
          },
        },
      },
      401: {
        description: "未認証",
        content: {
          "application/json": {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
    },
  }),
  async (c) => {
    const auth = c.get("auth");
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    return c.json({ id: session.user.id, email: session.user.email });
  }
);

// better-auth の全認証エンドポイントを委譲
app.on(["GET", "POST"], "/*", (c) => {
  const auth = c.get("auth");
  return auth.handler(c.req.raw);
});

export default app;
