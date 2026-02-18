import { Hono } from "hono";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { HonoEnv } from "../types";
import { adminAuth } from "./admin-auth";

vi.mock("@/lib/db", () => ({
  prisma: {
    session: {
      findUnique: vi.fn(),
    },
  },
}));

// モック後にインポート
const { prisma } = await import("@/lib/db");
const mockFindUnique = vi.mocked(prisma.session.findUnique);

function createApp() {
  const app = new Hono<HonoEnv>();
  app.use("/*", adminAuth);
  app.get("/test", (c) => {
    const user = c.get("user");
    return c.json({ user });
  });
  return app;
}

describe("adminAuth middleware", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
  });

  test("Cookie なしで 401 を返す", async () => {
    const app = createApp();
    const res = await app.request("/test");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  test("存在しないセッションで 401 を返す", async () => {
    mockFindUnique.mockResolvedValue(null);
    const app = createApp();
    const res = await app.request("/test", {
      headers: { Cookie: "session=invalid-id" },
    });
    expect(res.status).toBe(401);
  });

  test("期限切れセッションで 401 を返す", async () => {
    mockFindUnique.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() - 1000),
      createdAt: new Date(),
      user: { id: "user-1", email: "admin@example.com" },
    } as never);
    const app = createApp();
    const res = await app.request("/test", {
      headers: { Cookie: "session=session-1" },
    });
    expect(res.status).toBe(401);
  });

  test("有効なセッションで next() を呼びユーザー情報をセットする", async () => {
    mockFindUnique.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 86_400_000),
      createdAt: new Date(),
      user: { id: "user-1", email: "admin@example.com" },
    } as never);
    const app = createApp();
    const res = await app.request("/test", {
      headers: { Cookie: "session=session-1" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      user: { id: "user-1", email: "admin@example.com" },
    });
  });
});
