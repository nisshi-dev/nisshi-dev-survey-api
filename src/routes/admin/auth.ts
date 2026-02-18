import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { describeRoute, resolver, validator } from "hono-openapi";
import {
  LoginRequestSchema,
  LoginResponseSchema,
  LogoutResponseSchema,
  MeResponseSchema,
} from "../../schema/auth.js";
import { ErrorResponseSchema } from "../../schema/common.js";
import { prisma } from "../../lib/db.js";
import { verifyPassword } from "../../lib/password.js";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const app = new Hono();

app.post(
  "/login",
  describeRoute({
    tags: ["Auth"],
    summary: "ログイン",
    responses: {
      200: {
        description: "成功",
        content: {
          "application/json": {
            schema: resolver(LoginResponseSchema),
          },
        },
      },
      401: {
        description: "認証失敗",
        content: {
          "application/json": {
            schema: resolver(ErrorResponseSchema),
          },
        },
      },
    },
  }),
  validator("json", LoginRequestSchema),
  async (c) => {
    const { email, password } = c.req.valid("json");

    const user = await prisma.adminUser.findUnique({
      where: { email },
    });
    if (!user) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000),
      },
    });

    setCookie(c, "session", session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return c.json({ message: "Login successful" });
  }
);

app.post(
  "/logout",
  describeRoute({
    tags: ["Auth"],
    summary: "ログアウト",
    responses: {
      200: {
        description: "成功",
        content: {
          "application/json": {
            schema: resolver(LogoutResponseSchema),
          },
        },
      },
    },
  }),
  async (c) => {
    const sessionId = getCookie(c, "session");
    if (sessionId) {
      try {
        await prisma.session.delete({ where: { id: sessionId } });
      } catch {
        // セッションが既に削除されている場合は無視
      }
    }
    deleteCookie(c, "session", { path: "/" });
    return c.json({ message: "Logged out" });
  }
);

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

    return c.json({ id: session.user.id, email: session.user.email });
  }
);

export default app;
