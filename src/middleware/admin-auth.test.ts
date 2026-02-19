import { Hono } from "hono";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mockGetSession = vi.fn();

interface TestEnv {
  Variables: {
    auth: {
      api: { getSession: typeof mockGetSession };
    };
    user: { id: string; email: string };
  };
}

function createApp() {
  const app = new Hono<TestEnv>();
  app.use("/*", async (c, next) => {
    c.set("auth", { api: { getSession: mockGetSession } } as never);
    await next();
  });
  app.use("/*", adminAuth as never);
  app.get("/test", (c) => {
    const user = c.get("user");
    return c.json({ user });
  });
  return app;
}

// adminAuth を遅延インポート（vi.mock の後）
const { adminAuth } = await import("./admin-auth");

describe("adminAuth middleware", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
  });

  test("セッションなしで 401 を返す", async () => {
    mockGetSession.mockResolvedValue(null);
    const app = createApp();
    const res = await app.request("/test");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  test("有効なセッションで next() を呼びユーザー情報をセットする", async () => {
    mockGetSession.mockResolvedValue({
      session: { id: "session-1", userId: "user-1" },
      user: { id: "user-1", email: "admin@example.com", name: "Admin" },
    });
    const app = createApp();
    const res = await app.request("/test");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      user: { id: "user-1", email: "admin@example.com" },
    });
  });

  test("auth.api.getSession にリクエストヘッダーを渡す", async () => {
    mockGetSession.mockResolvedValue({
      session: { id: "s1", userId: "u1" },
      user: { id: "u1", email: "a@b.com", name: "A" },
    });
    const app = createApp();
    await app.request("/test", {
      headers: { Cookie: "better-auth.session_token=abc123" },
    });
    expect(mockGetSession).toHaveBeenCalledTimes(1);
    const callArg = mockGetSession.mock.calls[0]?.[0];
    expect(callArg).toHaveProperty("headers");
  });
});
