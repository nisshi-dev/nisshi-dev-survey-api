import { Hono } from "hono";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { HonoEnv } from "../../index";
import authApp from "./auth";

vi.mock("@/lib/password", () => ({
  verifyPassword: vi.fn(),
}));

const { verifyPassword } = await import("@/lib/password");
const mockVerifyPassword = vi.mocked(verifyPassword);

const mockFindUser = vi.fn();
const mockCreateSession = vi.fn();
const mockDeleteSession = vi.fn();
const mockFindSession = vi.fn();

const mockPrisma = {
  adminUser: { findUnique: mockFindUser },
  session: {
    create: mockCreateSession,
    delete: mockDeleteSession,
    findUnique: mockFindSession,
  },
};

function createApp() {
  const app = new Hono<HonoEnv>();
  app.use("/*", async (c, next) => {
    c.set("prisma", mockPrisma as never);
    await next();
  });
  app.route("/admin/auth", authApp);
  return app;
}

describe("POST /admin/auth/login", () => {
  beforeEach(() => {
    mockFindUser.mockReset();
    mockCreateSession.mockReset();
    mockVerifyPassword.mockReset();
  });

  test("正しい認証情報でログイン成功し Cookie がセットされる", async () => {
    mockFindUser.mockResolvedValue({
      id: "user-1",
      email: "admin@example.com",
      passwordHash: "salt:hash",
      createdAt: new Date(),
    });
    mockVerifyPassword.mockResolvedValue(true);
    mockCreateSession.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      expiresAt: new Date(),
      createdAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@example.com",
        password: "secret",
      }),
    });

    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.message).toBe("Login successful");
    const cookie = res.headers.get("set-cookie");
    expect(cookie).toContain("session=session-1");
    expect(cookie).toContain("HttpOnly");
  });

  test("存在しないユーザーで 401 を返す", async () => {
    mockFindUser.mockResolvedValue(null);

    const app = createApp();
    const res = await app.request("/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "nobody@example.com",
        password: "secret",
      }),
    });

    expect(res.status).toBe(401);
    const body: any = await res.json();
    expect(body.error).toBe("Invalid email or password");
  });

  test("パスワード不一致で 401 を返す", async () => {
    mockFindUser.mockResolvedValue({
      id: "user-1",
      email: "admin@example.com",
      passwordHash: "salt:hash",
      createdAt: new Date(),
    });
    mockVerifyPassword.mockResolvedValue(false);

    const app = createApp();
    const res = await app.request("/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@example.com",
        password: "wrong",
      }),
    });

    expect(res.status).toBe(401);
    const body: any = await res.json();
    expect(body.error).toBe("Invalid email or password");
  });
});

describe("POST /admin/auth/logout", () => {
  beforeEach(() => {
    mockDeleteSession.mockReset();
  });

  test("Cookie のセッションを削除しログアウトする", async () => {
    mockDeleteSession.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      expiresAt: new Date(),
      createdAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/admin/auth/logout", {
      method: "POST",
      headers: { Cookie: "session=session-1" },
    });

    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.message).toBe("Logged out");
    expect(mockDeleteSession).toHaveBeenCalledWith({
      where: { id: "session-1" },
    });
  });
});

describe("GET /admin/auth/me", () => {
  beforeEach(() => {
    mockFindSession.mockReset();
  });

  test("有効なセッションでユーザー情報を返す", async () => {
    mockFindSession.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 86_400_000),
      createdAt: new Date(),
      user: {
        id: "user-1",
        email: "admin@example.com",
      },
    });

    const app = createApp();
    const res = await app.request("/admin/auth/me", {
      headers: { Cookie: "session=session-1" },
    });

    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body).toEqual({
      id: "user-1",
      email: "admin@example.com",
    });
  });

  test("Cookie なしで 401 を返す", async () => {
    const app = createApp();
    const res = await app.request("/admin/auth/me");

    expect(res.status).toBe(401);
    const body: any = await res.json();
    expect(body.error).toBe("Unauthorized");
  });
});
